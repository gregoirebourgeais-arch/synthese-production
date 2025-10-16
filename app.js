/* =====================================================
   APP SYNTHÈSE PRODUCTION LACTALIS - VERSION COMPLÈTE
   ===================================================== */

const LIGNES = ["Râpé","T2","RT","OMORI","T1","Sticks","Emballage","Dés","Filets","Prédécoupé"];
let ligneActive = LIGNES[0];
let chartQuantites = null;

/* ------------------- OUTILS ------------------- */
const $ = id => document.getElementById(id);
const pad2 = n => String(n).padStart(2, "0");

function heureCourante() {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function equipeActuelle() {
  const h = new Date().getHours();
  if (h >= 5 && h < 13) return "M (5h-13h)";
  if (h >= 13 && h < 21) return "AM (13h-21h)";
  return "N (21h-5h)";
}

function updateHorloge() {
  $("horloge").textContent = `Heure : ${heureCourante()}`;
  $("equipeActuelle").textContent = `Équipe : ${equipeActuelle()}`;
  setTimeout(updateHorloge, 1000 * 60);
}

/* ------------------- PERSISTANCE ------------------- */
function kDraft(l) { return `draft:${l}`; }
function kHist(l) { return `history:${l}`; }
function kArrets() { return "arrets"; }
function kPerso() { return "personnel"; }
function kOrg() { return "organisation"; }

function loadJSON(key, def=[]) {
  try { return JSON.parse(localStorage.getItem(key)) || def; }
  catch { return def; }
}
function saveJSON(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

/* ------------------- FONCTIONS LIGNE ------------------- */
function selectLigne(ligne) {
  ligneActive = ligne;
  document.querySelectorAll(".btn-ligne").forEach(b=>{
    b.classList.toggle("active", b.dataset.line===ligne);
  });
  $("titreLigne").textContent = ligne;
  chargerBrouillon(ligne);
  afficherHistorique(ligne);
  recalculer();
}

function chargerBrouillon(ligne) {
  const d = loadJSON(kDraft(ligne), {});
  $("heureDebut").value = d.hDebut || "";
  $("heureFin").value = d.hFin || "";
  $("quantiteRealisee").value = d.qte || "";
  $("quantiteRestante").value = d.qteRest || "";
  $("cadenceManuelle").value = d.cadMan || "";
  $("cadenceCalculee").value = d.cadCalc || "";
  $("estimationFin").value = d.estim || "";
}

function sauverBrouillon() {
  const d = {
    hDebut: $("heureDebut").value,
    hFin: $("heureFin").value,
    qte: $("quantiteRealisee").value,
    qteRest: $("quantiteRestante").value,
    cadMan: $("cadenceManuelle").value,
    cadCalc: $("cadenceCalculee").value,
    estim: $("estimationFin").value
  };
  saveJSON(kDraft(ligneActive), d);
}

/* ------------------- CALCULS ------------------- */
function recalculer() {
  const hDeb = $("heureDebut").value;
  const hFin = $("heureFin").value;
  const qte = Number($("quantiteRealisee").value);
  const rest = Number($("quantiteRestante").value);
  const cadMan = Number($("cadenceManuelle").value);

  let d = parseHeure(hDeb);
  let f = parseHeure(hFin);
  if (!d || !f) return;
  if (f < d) f += 24 * 60;
  const dureeHeures = (f - d) / 60;

  let cadCalc = "";
  if (qte > 0 && dureeHeures > 0) cadCalc = (qte / dureeHeures).toFixed(2);
  $("cadenceCalculee").value = cadCalc;

  const cadence = cadMan || Number(cadCalc);
  if (rest > 0 && cadence > 0) {
    const minutes = Math.round((rest / cadence) * 60);
    const now = new Date();
    const fin = new Date(now.getTime() + minutes * 60000);
    $("estimationFin").value = `${pad2(fin.getHours())}:${pad2(fin.getMinutes())} (${Math.floor(minutes/60)}h${pad2(minutes%60)})`;
  }

  sauverBrouillon();
}

function parseHeure(h) {
  if (!h || !h.includes(":")) return null;
  const [H, M] = h.split(":").map(Number);
  return H * 60 + M;
}

/* ------------------- ENREGISTREMENT ------------------- */
function enregistrer() {
  const hDeb = $("heureDebut").value;
  const hFin = $("heureFin").value;
  const qte = Number($("quantiteRealisee").value);
  const rest = Number($("quantiteRestante").value);
  const cadMan = Number($("cadenceManuelle").value);
  const cadCalc = $("cadenceCalculee").value;
  const estim = $("estimationFin").value;

  if (!hDeb || !hFin || (!qte && !rest)) return alert("Saisir heures et quantités.");

  const hist = loadJSON(kHist(ligneActive));
  hist.unshift({
    date: new Date().toLocaleString("fr-FR"),
    hDeb, hFin, qte, rest,
    cadence: cadMan || cadCalc,
    estim
  });
  saveJSON(kHist(ligneActive), hist);

  localStorage.removeItem(kDraft(ligneActive));
  $("quantiteRealisee").value = "";
  $("quantiteRestante").value = "";
  $("cadenceManuelle").value = "";
  $("cadenceCalculee").value = "";
  $("estimationFin").value = "";
  afficherHistorique(ligneActive);
  majGraphique();
}

/* ------------------- HISTORIQUE ------------------- */
function afficherHistorique(ligne) {
  const zone = $("historiqueProduction");
  const hist = loadJSON(kHist(ligne));
  if (!hist.length) {
    zone.innerHTML = `<div class='empty'>Aucun enregistrement</div>`;
    return;
  }
  zone.innerHTML = hist.map((r,i)=>`
    <div class="hrow">
      <div><b>${r.date}</b> — ${r.hDeb} → ${r.hFin} | Q=${r.qte} | Rest=${r.rest} | Cad=${r.cadence} | Fin ~ ${r.estim}</div>
      <button onclick="supprHist('${ligne}',${i})">🗑</button>
    </div>
  `).join("");
}

function supprHist(ligne,i){
  const hist = loadJSON(kHist(ligne));
  hist.splice(i,1);
  saveJSON(kHist(ligne),hist);
  afficherHistorique(ligne);
  majGraphique();
}

/* ------------------- GRAPHIQUE ------------------- */
function majGraphique(){
  const data = LIGNES.map(l=>{
    const hist = loadJSON(kHist(l));
    return hist.reduce((t,r)=>t+(Number(r.qte)||0),0);
  });
  const ctx = $("graphQuantites").getContext("2d");
  if (chartQuantites) chartQuantites.destroy();
  chartQuantites = new Chart(ctx, {
    type: "bar",
    data: {
      labels: LIGNES,
      datasets: [{
        label: "Quantité réalisée (colis)",
        data,
        backgroundColor: "#007bff",
        borderRadius: 6
      }]
    },
    options: {
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

/* ------------------- EXPORT ------------------- */
function exportGlobal(){
  const rows = [["Date","Type","Ligne","Infos","Quantité","Cadence","Estimation"]];
  // production
  LIGNES.forEach(l=>{
    loadJSON(kHist(l)).forEach(r=>{
      rows.push([r.date,"Production",l,`${r.hDeb}-${r.hFin}`,r.qte,r.cadence,r.estim]);
    });
  });
  // arrêts
  loadJSON(kArrets()).forEach(a=>{
    rows.push([a.date,"Arrêt",a.ligne,`Durée: ${a.duree}min`, "", "", a.comment]);
  });
  // personnel
  loadJSON(kPerso()).forEach(p=>{
    rows.push([p.date,"Personnel",p.nom,p.motif,"","",p.comment]);
  });
  // organisation
  loadJSON(kOrg()).forEach(o=>{
    rows.push([o.date,"Organisation","",o.text,"","",""]);
  });

  const csv = rows.map(r=>r.map(x=>`"${(x||"").replace(/"/g,'""')}"`).join(";")).join("\n");
  const blob = new Blob([csv],{type:"text/csv"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `Synthese_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}

/* ------------------- ARRÊTS / PERSONNEL / ORG ------------------- */
function ajouterArret(){
  const ligne = $("ligneArret").value;
  const duree = $("dureeArret").value;
  const comment = $("commentArret").value;
  if (!ligne || !duree) return alert("Sélectionner une ligne et durée.");
  const list = loadJSON(kArrets());
  list.unshift({date:new Date().toLocaleString("fr-FR"),ligne,duree,comment});
  saveJSON(kArrets(),list);
  afficherArrets();
}

function afficherArrets(){
  const zone = $("listeArrets");
  const list = loadJSON(kArrets());
  zone.innerHTML = list.map((a,i)=>`
    <div class="hrow"><div>${a.date} — ${a.ligne} — ${a.duree}min — ${a.comment}</div>
    <button onclick="supprArret(${i})">🗑</button></div>
  `).join("") || "<div class='empty'>Aucun arrêt</div>";
}

function supprArret(i){
  const list = loadJSON(kArrets());
  list.splice(i,1);
  saveJSON(kArrets(),list);
  afficherArrets();
}

function ajouterPersonnel(){
  const nom=$("nomPersonnel").value, motif=$("motifPersonnel").value, comment=$("commentPersonnel").value;
  if(!nom||!motif) return alert("Nom et motif obligatoires");
  const list=loadJSON(kPerso());
  list.unshift({date:new Date().toLocaleString("fr-FR"),nom,motif,comment});
  saveJSON(kPerso(),list);
  afficherPersonnel();
}

function afficherPersonnel(){
  const zone=$("listePersonnel");
  const list=loadJSON(kPerso());
  zone.innerHTML=list.map((p,i)=>`
  <div class="hrow"><div>${p.date} — ${p.nom} — ${p.motif} — ${p.comment}</div>
  <button onclick="supprPerso(${i})">🗑</button></div>
  `).join("")||"<div class='empty'>Aucun enregistrement</div>";
}

function supprPerso(i){
  const list=loadJSON(kPerso());
  list.splice(i,1);saveJSON(kPerso(),list);afficherPersonnel();
}

function ajouterOrganisation(){
  const text=$("texteOrganisation").value;
  if(!text) return;
  const list=loadJSON(kOrg());
  list.unshift({date:new Date().toLocaleString("fr-FR"),text});
  saveJSON(kOrg(),list);
  afficherOrganisation();
}

function afficherOrganisation(){
  const zone=$("listeOrganisation");
  const list=loadJSON(kOrg());
  zone.innerHTML=list.map((o,i)=>`
  <div class="hrow"><div>${o.date} — ${o.text}</div>
  <button onclick="supprOrg(${i})">🗑</button></div>
  `).join("")||"<div class='empty'>Aucune consigne</div>";
}

function supprOrg(i){
  const list=loadJSON(kOrg());
  list.splice(i,1);saveJSON(kOrg(),list);afficherOrganisation();
}

/* ------------------- NAVIGATION ------------------- */
function showSection(id){
  document.querySelectorAll(".section").forEach(s=>s.classList.remove("active"));
  $(id).classList.add("active");
}

/* ------------------- INIT ------------------- */
function initHeures(){
  const opts=[];
  for(let h=0;h<24;h++){
    for(let m=0;m<60;m+=5){
      opts.push(`${pad2(h)}:${pad2(m)}`);
    }
  }
  ["heureDebut","heureFin"].forEach(id=>{
    $(id).innerHTML="<option value=''></option>"+opts.map(o=>`<option value='${o}'>${o}</option>`).join("");
  });
}

document.addEventListener("click",e=>{
  const btn=e.target.closest("[data-line]");
  if(btn){selectLigne(btn.dataset.line);return;}
  if(e.target.id==="btnEnregistrer"){enregistrer();}
  if(e.target.id==="btnReset"){
    ["quantiteRealisee","quantiteRestante","cadenceManuelle","cadenceCalculee","estimationFin"].forEach(id=>$(id).value="");
    sauverBrouillon();
  }
});

document.addEventListener("DOMContentLoaded",()=>{
  initHeures();
  updateHorloge();
  afficherArrets();
  afficherPersonnel();
  afficherOrganisation();
  selectLigne(ligneActive);
  majGraphique();
  document.querySelectorAll("input,select").forEach(el=>{
    el.addEventListener("input",recalculer);
  });
});
