// === Synthèse Production Lactalis — V37 Finale ===
// Historique complet + calculatrice + corrections cadence + estimation + export Excel pro

//////////////////////////////
// (1) Horloge + équipe
//////////////////////////////
function majDateHeureEquipe() {
  const now = new Date();
  const jour = now.toLocaleDateString("fr-FR");
  const heureStr = now.toTimeString().slice(0, 8);
  document.getElementById("dateHeure").innerText = `${jour} — ${heureStr}`;

  const h = now.getHours();
  let equipe = (h >= 5 && h < 13) ? "M (5h–13h)" :
               (h >= 13 && h < 21) ? "AM (13h–21h)" : "N (21h–5h)";
  document.getElementById("equipe").innerText = `Équipe : ${equipe}`;

  const last = localStorage.getItem("derniereEquipe");
  if (last && last !== equipe) genererExportAutomatique(equipe);
  localStorage.setItem("derniereEquipe", equipe);
}
setInterval(majDateHeureEquipe, 10_000);
majDateHeureEquipe();

//////////////////////////////
// (2) Données & persistance
//////////////////////////////
let ligneActive = null;
let historique = JSON.parse(localStorage.getItem("historique")) || {
  production: [], arrets: [], personnel: [], organisation: []
};
let formState = JSON.parse(localStorage.getItem("formState")) || {};
const save = () => localStorage.setItem("historique", JSON.stringify(historique));
const saveForm = () => localStorage.setItem("formState", JSON.stringify(formState));

//////////////////////////////
// (3) Navigation & affichage
//////////////////////////////
function afficherSection(section) {
  document.querySelectorAll(".section").forEach(s => s.style.display = "none");
  document.getElementById(section).style.display = "block";
  if (section === "atelier") window.scrollTo({ top: 0, behavior: "smooth" });
}
afficherSection("atelier");

function choisirLigne(ligne) {
  ligneActive = ligne;
  document.querySelectorAll(".ligne-form").forEach(f => f.style.display = "none");
  const form = document.getElementById(`form-${ligne}`);
  if (form) form.style.display = "block";
  window.scrollTo({ top: form.offsetTop - 50, behavior: "smooth" });
}

//////////////////////////////
// (4) Enregistrement production
//////////////////////////////
function enregistrerProduction() {
  if (!ligneActive) return alert("Choisis une ligne avant d’enregistrer !");
  const heureDebut = document.getElementById(`debut-${ligneActive}`).value;
  const heureFin = document.getElementById(`fin-${ligneActive}`).value;
  const qte = parseFloat(document.getElementById(`qte-${ligneActive}`).value || 0);
  const qteRestante = parseFloat(document.getElementById(`reste-${ligneActive}`).value || 0);
  const cadenceManuelle = parseFloat(document.getElementById(`cadence-${ligneActive}`).value || 0);

  if (!heureDebut || !heureFin || (!qte && !cadenceManuelle))
    return alert("Merci de remplir au minimum les heures et la quantité ou cadence.");

  const [h1, m1] = heureDebut.split(":").map(Number);
  const [h2, m2] = heureFin.split(":").map(Number);
  let diffH = (h2 + m2/60) - (h1 + m1/60);
  if (diffH < 0) diffH += 24;

  const cadence = cadenceManuelle || (qte / diffH);
  const estimation = qteRestante ? (qteRestante / cadence) : 0;

  const enregistrement = {
    ligne: ligneActive,
    heureDebut, heureFin,
    qte, qteRestante,
    cadence: cadence.toFixed(1),
    estimation: estimation ? estimation.toFixed(2) + " h" : "",
    horodatage: new Date().toLocaleString("fr-FR")
  };

  historique.production.push(enregistrement);
  save();
  afficherHistoriqueProduction();
  alert(`✅ Enregistré sur ${ligneActive} (${cadence.toFixed(1)} colis/h)`);

  // reset du formulaire
  document.getElementById(`qte-${ligneActive}`).value = "";
  document.getElementById(`reste-${ligneActive}`).value = "";
  document.getElementById(`cadence-${ligneActive}`).value = "";
}

//////////////////////////////
// (5) Historique production
//////////////////////////////
function afficherHistoriqueProduction() {
  const zone = document.getElementById("historiqueProduction");
  zone.innerHTML = "";
  historique.production.forEach((r, i) => {
    const div = document.createElement("div");
    div.className = "ligneHistorique";
    div.innerHTML = `
      <b>${r.ligne}</b> — ${r.heureDebut} → ${r.heureFin} :
      ${r.qte || "-"} colis (${r.cadence} c/h) | Fin estimée : ${r.estimation}
      <button class="supprimer" onclick="supprimerLigne('production', ${i})">🗑️</button>`;
    zone.appendChild(div);
  });
}
afficherHistoriqueProduction();

//////////////////////////////
// (6) Suppression d’une ligne
//////////////////////////////
function supprimerLigne(type, index) {
  if (!confirm("Supprimer cette entrée ?")) return;
  historique[type].splice(index, 1);
  save();
  if (type === "production") afficherHistoriqueProduction();
  if (type === "organisation") afficherHistoriqueOrganisation();
  if (type === "arrets") afficherHistoriqueArrets();
}

//////////////////////////////
// (7) Organisation + Arrêts
//////////////////////////////
function enregistrerConsigne() {
  const texte = document.getElementById("consigneTexte").value.trim();
  if (!texte) return alert("Aucune consigne à enregistrer !");
  historique.organisation.push({
    texte, horodatage: new Date().toLocaleString("fr-FR")
  });
  document.getElementById("consigneTexte").value = "";
  save(); afficherHistoriqueOrganisation();
}

function afficherHistoriqueOrganisation() {
  const zone = document.getElementById("historiqueOrganisation");
  zone.innerHTML = "";
  historique.organisation.forEach((c, i) => {
    const div = document.createElement("div");
    div.innerHTML = `[${c.horodatage}] ${c.texte}
    <button class="supprimer" onclick="supprimerLigne('organisation', ${i})">🗑️</button>`;
    zone.appendChild(div);
  });
}
afficherHistoriqueOrganisation();

function enregistrerArret() {
  const ligne = document.getElementById("ligneArret").value;
  const duree = document.getElementById("dureeArret").value;
  const cause = document.getElementById("causeArret").value;
  if (!ligne || !duree) return alert("Merci de renseigner la ligne et la durée !");
  historique.arrets.push({ ligne, duree, cause, horodatage: new Date().toLocaleString("fr-FR") });
  save(); afficherHistoriqueArrets();
}

function afficherHistoriqueArrets() {
  const zone = document.getElementById("historiqueArrets");
  zone.innerHTML = "";
  historique.arrets.forEach((a, i) => {
    const div = document.createElement("div");
    div.innerHTML = `[${a.horodatage}] ${a.ligne} — ${a.duree} min (${a.cause || "-"}) 
    <button class="supprimer" onclick="supprimerLigne('arrets', ${i})">🗑️</button>`;
    zone.appendChild(div);
  });
}
afficherHistoriqueArrets();

//////////////////////////////
// (8) Export Excel Pro
//////////////////////////////
function exportExcelGlobal() {
  let csv = "Type;Ligne;Heure début;Heure fin;Quantité;Restant;Cadence;Estimation;Horodatage\n";
  historique.production.forEach(r =>
    csv += `Production;${r.ligne};${r.heureDebut};${r.heureFin};${r.qte};${r.qteRestante};${r.cadence};${r.estimation};${r.horodatage}\n`);
  historique.arrets.forEach(a =>
    csv += `Arrêt;${a.ligne};;;${a.duree};;;${a.cause};${a.horodatage}\n`);
  historique.organisation.forEach(c =>
    csv += `Organisation;;;;;;;${c.texte};${c.horodatage}\n`);

  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `Synthese_Equipe_${new Date().toLocaleDateString("fr-FR")}.csv`;
  link.click();
}

function genererExportAutomatique(equipe) {
  alert(`📦 Rapport exporté automatiquement pour l’équipe ${equipe}`);
  exportExcelGlobal();
}

//////////////////////////////
// (9) Calculatrice flottante
//////////////////////////////
const calcBtn = document.createElement("button");
calcBtn.innerText = "🧮";
calcBtn.id = "calcBtn";
calcBtn.style = `
  position: fixed; bottom: 90px; right: 15px; 
  background: #007bff; color: white; border-radius: 50%;
  width: 60px; height: 60px; font-size: 24px; border: none;
  box-shadow: 0 4px 8px rgba(0,0,0,0.3); z-index: 9999;`;
calcBtn.onclick = () => toggleCalc();
document.body.appendChild(calcBtn);

const calcDiv = document.createElement("div");
calcDiv.id = "calc";
calcDiv.style = `
  display:none; position: fixed; bottom:160px; right:15px; background:white;
  border-radius:12px; box-shadow:0 4px 8px rgba(0,0,0,0.3);
  padding:10px; width:220px; z-index:9999;`;
calcDiv.innerHTML = `
  <input id="calcScreen" style="width:100%;font-size:18px;margin-bottom:5px;text-align:right">
  <div id="calcKeys">
    ${["7","8","9","/","4","5","6","*","1","2","3","-","0",".","=","+"].map(k=>`<button>${k}</button>`).join("")}
    <button>C</button>
  </div>`;
document.body.appendChild(calcDiv);

function toggleCalc(){ calcDiv.style.display = (calcDiv.style.display === "none") ? "block" : "none"; }
document.getElementById("calcKeys").addEventListener("click", e=>{
  if(e.target.tagName!=="BUTTON")return;
  const val=e.target.innerText, screen=document.getElementById("calcScreen");
  if(val==="C")screen.value="";
  else if(val==="=")try{screen.value=eval(screen.value);}catch{screen.value="Err";}
  else screen.value+=val;
});
