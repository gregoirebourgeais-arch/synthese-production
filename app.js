/* ---------------------- CONFIG GLOBALE ---------------------- */
const LIGNES = ["Râpé","T2","RT","OMORI","T1","Sticks","Emballage","Dés","Filets","Prédécoupé"];
let ligneActive = LIGNES[0];

/* Sélecteurs – adapte les IDs si besoin */
const ids = {
  titreLigne: "titreLigne",           // <span id="titreLigne"></span>
  hDebut: "heureDebut",               // <select id="heureDebut">
  hFin: "heureFin",                   // <select id="heureFin">
  qte: "quantiteRealisee",            // <input id="quantiteRealisee">
  qteRest: "quantiteRestante",        // <input id="quantiteRestante">
  cadMan: "cadenceManuelle",          // <input id="cadenceManuelle">
  cadCalc: "cadenceCalculee",         // <input id="cadenceCalculee" readonly>
  estim: "estimationFin",             // <input id="estimationFin" readonly>
  btnSave: "btnEnregistrer",          // <button id="btnEnregistrer">
  btnReset: "btnReset",               // <button id="btnReset">
  histo: "historiqueProduction"       // <div id="historiqueProduction">
};

/* ---------------------- OUTILS ---------------------- */
const $ = (id) => document.getElementById(id);
const pad2 = (n) => String(n).padStart(2,"0");

/** construit une clé locale namespacée par ligne */
const kDraft   = (ligne) => `draft:${ligne}`;
const kHist    = (ligne) => `history:${ligne}`;
const kStops   = (ligne) => `stops:${ligne}:${cleEquipeDuJour()}`;

/** équipe et date-clef (M 5–13 / AM 13–21 / N 21–5) */
function equipeCourante(date=new Date()) {
  const h = date.getHours();
  if (h >= 5 && h < 13) return "M";
  if (h >= 13 && h < 21) return "AM";
  return "N";
}
function cleEquipeDuJour(d=new Date()){
  // On “repousse” la nuit au jour suivant pour avoir une clé unique
  const e = equipeCourante(d);
  const jour = new Date(d);
  if (e === "N" && d.getHours() < 5) jour.setDate(jour.getDate()-1);
  return `${jour.getFullYear()}-${pad2(jour.getMonth()+1)}-${pad2(jour.getDate())}-${e}`;
}

/** parse “HH:MM” en minutes depuis 00:00 */
const hmToMin = (s) => {
  if (!s || !s.includes(":")) return null;
  const [H,M] = s.split(":").map(Number);
  return H*60 + M;
};
/** durée nette (en heures) entre hDebut et hFin, avec passage minuit + retraits arrêts (minutes) */
function dureeNetteHeures(hDeb, hFin, minutesArret=0){
  let d = hmToMin(hDeb);
  let f = hmToMin(hFin);
  if (d==null || f==null) return 0;
  if (f < d) f += 24*60;                 // passage minuit
  let minutes = (f - d) - (minutesArret||0);
  if (minutes < 0) minutes = 0;
  return minutes / 60;
}

/** récup/maj minutes d’arrêt de la ligne active pour l’équipe courante */
function getMinutesArret(ligne){
  return Number(localStorage.getItem(kStops(ligne))) || 0;
}
function setMinutesArret(ligne, totalMinutes){
  localStorage.setItem(kStops(ligne), String(Math.max(0, Math.floor(totalMinutes||0))));
}

/* ---------------------- PERSISTENCE PAR LIGNE ---------------------- */
function chargerBrouillon(ligne){
  const raw = localStorage.getItem(kDraft(ligne));
  const d = raw ? JSON.parse(raw) : {};
  $(ids.hDebut).value   = d.hDebut   ?? "";
  $(ids.hFin).value     = d.hFin     ?? "";
  $(ids.qte).value      = d.qte      ?? "";
  $(ids.qteRest).value  = d.qteRest  ?? "";
  $(ids.cadMan).value   = d.cadMan   ?? "";
  // champs calculés
  $(ids.cadCalc).value  = d.cadCalc  ?? "";
  $(ids.estim).value    = d.estim    ?? "";
  // titre
  $(ids.titreLigne).textContent = ligne;
  // historique
  rafraichirHistorique(ligne);
}
function sauverBrouillon(ligne){
  const data = {
    hDebut:  $(ids.hDebut).value,
    hFin:    $(ids.hFin).value,
    qte:     $(ids.qte).value,
    qteRest: $(ids.qteRest).value,
    cadMan:  $(ids.cadMan).value,
    cadCalc: $(ids.cadCalc).value,
    estim:   $(ids.estim).value
  };
  localStorage.setItem(kDraft(ligne), JSON.stringify(data));
}
function viderBrouillon(ligne){
  localStorage.removeItem(kDraft(ligne));
}

/* ---------------------- HISTORIQUE PAR LIGNE ---------------------- */
function rafraichirHistorique(ligne){
  const zone = $(ids.histo);
  const raw = localStorage.getItem(kHist(ligne));
  const list = raw ? JSON.parse(raw) : [];
  if (!list.length){
    zone.innerHTML = `<div class="empty">Aucun enregistrement pour ${ligne}.</div>`;
    return;
  }
  zone.innerHTML = list.map((r,i)=>`
    <div class="hrow">
      <div>
        <strong>${r.date}</strong> — ${r.hDebut} → ${r.hFin} —
        Q=${r.qte} — Rest=${r.qteRest} — Cad=${r.cadenceAff}
        ${r.estim ? ` — Fin ~ ${r.estim}` : ""}
      </div>
      <button class="hdel" aria-label="Supprimer" onclick="supprLigneHistorique('${ligne}', ${i})">🗑</button>
    </div>
  `).join("");
}
function supprLigneHistorique(ligne, index){
  const raw = localStorage.getItem(kHist(ligne));
  const list = raw ? JSON.parse(raw) : [];
  list.splice(index,1);
  localStorage.setItem(kHist(ligne), JSON.stringify(list));
  rafraichirHistorique(ligne);
}

/* ---------------------- CALCULS ---------------------- */
function recalculerCadenceEtEstim(){
  const hDeb   = $(ids.hDebut).value;
  const hFin   = $(ids.hFin).value;
  const qte    = Number($(ids.qte).value);
  const rest   = Number($(ids.qteRest).value);
  const cadMan = Number($(ids.cadMan).value);

  const minutesArret = getMinutesArret(ligneActive);
  const heures = dureeNetteHeures(hDeb, hFin, minutesArret);

  // cadence calculée
  let cadCalc = "";
  if (qte>0 && heures>0){
    cadCalc = (qte / heures).toFixed(2);
  }
  $(ids.cadCalc).value = cadCalc;

  // cadence utilisée pour l'estimation
  const cadence = cadMan>0 ? cadMan : (cadCalc ? Number(cadCalc) : 0);

  // estimation
  let estimTxt = "";
  if (rest>0 && cadence>0){
    const minutes = Math.round((rest / cadence) * 60);
    const now = new Date();
    const fin = new Date(now.getTime() + minutes*60000);
    estimTxt = `${pad2(fin.getHours())}:${pad2(fin.getMinutes())} (${Math.floor(minutes/60)}h${pad2(minutes%60)})`;
  }
  $(ids.estim).value = estimTxt;

  // on sauve le brouillon de la ligne courante
  sauverBrouillon(ligneActive);
}

/* ---------------------- ENREGISTREMENT ---------------------- */
function enregistrerCourant(){
  const hDeb   = $(ids.hDebut).value;
  const hFin   = $(ids.hFin).value;
  const qte    = Number($(ids.qte).value||0);
  const rest   = Number($(ids.qteRest).value||0);
  const cadMan = Number($(ids.cadMan).value||0);
  const cadCalc= $(ids.cadCalc).value;
  const estim  = $(ids.estim).value;

  if (!hDeb || !hFin || (!qte && !rest)){
    alert("Veuillez saisir au moins les heures et une quantité (réalisée ou restante).");
    return;
  }

  const raw = localStorage.getItem(kHist(ligneActive));
  const list = raw ? JSON.parse(raw) : [];
  const dateStr = new Date().toLocaleString("fr-FR");

  list.unshift({
    date: dateStr,
    hDebut: hDeb,
    hFin: hFin,
    qte: qte,
    qteRest: rest,
    cadenceAff: cadMan>0 ? `${cadMan} (man.)` : (cadCalc || "-"),
    estim: estim
  });
  localStorage.setItem(kHist(ligneActive), JSON.stringify(list));

  // après enregistrement : on efface le brouillon de cette ligne et on nettoie les champs
  viderBrouillon(ligneActive);
  $(ids.qte).value = "";
  $(ids.qteRest).value = "";
  $(ids.cadMan).value = "";
  $(ids.cadCalc).value = "";
  $(ids.estim).value = "";
  // (on laisse les heures sélectionnées, pratique en cours d’équipe)
  rafraichirHistorique(ligneActive);
}

/* ---------------------- LIGNE ACTIVE ---------------------- */
function selectLigne(ligne){
  if (!LIGNES.includes(ligne)) return;
  ligneActive = ligne;
  // visuel bouton actif
  document.querySelectorAll(".ligne-buttons button").forEach(b=>{
    if (b.textContent.trim()===ligne) b.classList.add("active");
    else b.classList.remove("active");
  });
  // titre + données
  chargerBrouillon(ligneActive);
}

/* ---------------------- ARRÊTS (minutes) ---------------------- */
/* Si tu as un champ “minutes d’arrêt” dans un autre onglet,
   appelle juste setMinutesArret(ligne, totalMinutes) quand ça change.
   Ici on expose une fonction globale au besoin. */
function majArretsPourLigne(ligne, totalMinutes){
  setMinutesArret(ligne, totalMinutes);
  if (ligne === ligneActive){
    recalculerCadenceEtEstim();
  }
}
window.majArretsPourLigne = majArretsPourLigne;

/* ---------------------- INIT ---------------------- */
function remplirSelectHeures(){
  // Remplissage HH:MM (toutes les 5 minutes)
  const opts = [];
  for (let h=0; h<24; h++){
    for (let m=0; m<60; m+=5){
      opts.push(`${pad2(h)}:${pad2(m)}`);
    }
  }
  [ids.hDebut, ids.hFin].forEach(id=>{
    const sel = $(id);
    if (!sel || sel.options?.length > 10) return;
    sel.innerHTML = `<option value="">—</option>` + 
      opts.map(v=>`<option value="${v}">${v}</option>`).join("");
  });
}

function lierEvenements(){
  [ids.hDebut, ids.hFin, ids.qte, ids.qteRest, ids.cadMan].forEach(id=>{
    const el = $(id);
    if (!el) return;
    el.addEventListener("input", recalculerCadenceEtEstim);
    el.addEventListener("change", recalculerCadenceEtEstim);
  });
  $(ids.btnSave)?.addEventListener("click", enregistrerCourant);
  $(ids.btnReset)?.addEventListener("click", ()=>{
    $(ids.qte).value = "";
    $(ids.qteRest).value = "";
    $(ids.cadMan).value = "";
    $(ids.cadCalc).value = "";
    $(ids.estim).value = "";
    sauverBrouillon(ligneActive);
  });
  // boutons lignes (si présents)
  document.querySelectorAll(".ligne-buttons button").forEach(btn=>{
    btn.addEventListener("click", ()=> selectLigne(btn.textContent.trim()));
  });
}

document.addEventListener("DOMContentLoaded", ()=>{
  remplirSelectHeures();
  lierEvenements();
  // ligne par défaut + brouillon
  selectLigne(ligneActive);
  recalculerCadenceEtEstim();
});

/* Expose quelques helpers si besoin dans HTML inline */
window.selectLigne = selectLigne;
window.supprLigneHistorique = supprLigneHistorique;
