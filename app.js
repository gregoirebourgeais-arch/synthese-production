// === Synthèse Production Lactalis - app.js V39 ===

// (1) Date, heure et équipe automatique
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
setInterval(majDateHeureEquipe, 10000);
majDateHeureEquipe();

// (2) Données et persistance
let ligneActive = null;
let historique = JSON.parse(localStorage.getItem("historique")) || {
  production: [], arrets: [], personnel: [], organisation: []
};
const save = () => localStorage.setItem("historique", JSON.stringify(historique));

// (3) Navigation
function afficherSection(section) {
  document.querySelectorAll(".section").forEach(s => s.style.display = "none");
  document.getElementById(section).style.display = "block";
  window.scrollTo({ top: 0, behavior: "smooth" });
}
afficherSection("atelier");

function choisirLigne(ligne) {
  ligneActive = ligne;
  document.querySelectorAll(".ligne-form").forEach(f => f.style.display = "none");
  const form = document.getElementById(`form-${ligne}`);
  if (form) {
    form.style.display = "block";
    form.scrollIntoView({ behavior: "smooth" });
  }
}

// (4) Production + estimation en direct
function calculerEstimationDirecte(ligne) {
  const qte = parseFloat(document.getElementById(`qte-${ligne}`).value || 0);
  const qteRestante = parseFloat(document.getElementById(`reste-${ligne}`).value || 0);
  const cadenceManuelle = parseFloat(document.getElementById(`cadence-${ligne}`).value || 0);

  let cadence = cadenceManuelle || (qte > 0 ? qte / 1 : 0);
  const estimationHeures = qteRestante > 0 && cadence > 0 ? qteRestante / cadence : 0;

  if (estimationHeures > 0) {
    const finEstimee = new Date();
    finEstimee.setMinutes(finEstimee.getMinutes() + estimationHeures * 60);
    document.getElementById(`finEstimee-${ligne}`).innerText = "Fin estimée : " + finEstimee.toLocaleTimeString("fr-FR").slice(0,5);
  } else {
    document.getElementById(`finEstimee-${ligne}`).innerText = "";
  }
}

function enregistrerProduction() {
  if (!ligneActive) return alert("Choisis une ligne avant d’enregistrer !");
  const heureDebut = document.getElementById(`debut-${ligneActive}`).value;
  const heureFin = document.getElementById(`fin-${ligneActive}`).value;
  const qte = parseFloat(document.getElementById(`qte-${ligneActive}`).value || 0);
  const qteRestante = parseFloat(document.getElementById(`reste-${ligneActive}`).value || 0);
  const cadenceManuelle = parseFloat(document.getElementById(`cadence-${ligneActive}`).value || 0);

  if (!heureDebut || !heureFin) return alert("Merci de renseigner les heures.");

  const [h1, m1] = heureDebut.split(":").map(Number);
  const [h2, m2] = heureFin.split(":").map(Number);
  let diffH = (h2 + m2/60) - (h1 + m1/60);
  if (diffH < 0) diffH += 24;

  let cadence = cadenceManuelle || (qte > 0 && diffH > 0 ? qte / diffH : 0);
  const estimation = qteRestante > 0 && cadence > 0 ? qteRestante / cadence : 0;

  const finEstimee = new Date();
  finEstimee.setMinutes(finEstimee.getMinutes() + estimation * 60);

  const enregistrement = {
    ligne: ligneActive,
    heureDebut, heureFin,
    qte, qteRestante,
    cadence: cadence.toFixed(1),
    estimation: cadence > 0 ? finEstimee.toLocaleTimeString("fr-FR").slice(0,5) : "",
    horodatage: new Date().toLocaleString("fr-FR")
  };

  historique.production.push(enregistrement);
  save();
  afficherHistoriqueProduction();
  alert(`✅ Enregistré sur ${ligneActive} (${cadence.toFixed(1)} colis/h)`);

  document.getElementById(`qte-${ligneActive}`).value = "";
  document.getElementById(`reste-${ligneActive}`).value = "";
  document.getElementById(`cadence-${ligneActive}`).value = "";
  document.getElementById(`finEstimee-${ligneActive}`).innerText = "";
}

// (5) Historique Production
function afficherHistoriqueProduction() {
  const zone = document.getElementById("historiqueProduction");
  zone.innerHTML = "";
  historique.production.forEach((r, i) => {
    const div = document.createElement("div");
    div.className = "ligneHistorique";
    div.innerHTML = `
      <b>${r.ligne}</b> — ${r.heureDebut}→${r.heureFin} :
      ${r.qte || "-"} colis (${r.cadence} c/h) 
      | Fin estimée : ${r.estimation}
      <button class="supprimer" onclick="supprimerLigne('production', ${i})">🗑️</button>`;
    zone.appendChild(div);
  });
}
afficherHistoriqueProduction();

// (6) Suppression
function supprimerLigne(type, index) {
  if (!confirm("Supprimer cette entrée ?")) return;
  historique[type].splice(index, 1);
  save();
  if (type === "production") afficherHistoriqueProduction();
  if (type === "organisation") afficherHistoriqueOrganisation();
  if (type === "arrets") afficherHistoriqueArrets();
  if (type === "personnel") afficherHistoriquePersonnel();
}

// (7) Arrêts
function enregistrerArret() {
  const ligne = document.getElementById("ligneArret").value;
  const duree = document.getElementById("dureeArret").value;
  const cause = document.getElementById("causeArret").value;
  if (!ligne || !duree) return alert("Merci de renseigner la ligne et la durée !");
  historique.arrets.push({
    ligne, duree, cause,
    horodatage: new Date().toLocaleString("fr-FR")
  });
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

// (8) Organisation
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

// (9) Personnel
function enregistrerPersonnel() {
  const type = document.getElementById("typePersonnel").value;
  const commentaire = document.getElementById("commentPersonnel").value.trim();
  if (!type) return alert("Choisis un type d'événement personnel !");
  historique.personnel.push({
    type, commentaire,
    horodatage: new Date().toLocaleString("fr-FR")
  });
  document.getElementById("typePersonnel").value = "";
  document.getElementById("commentPersonnel").value = "";
  save(); afficherHistoriquePersonnel();
}
function afficherHistoriquePersonnel() {
  const zone = document.getElementById("historiquePersonnel");
  zone.innerHTML = "";
  historique.personnel.forEach((p, i) => {
    const div = document.createElement("div");
    div.innerHTML = `[${p.horodatage}] ${p.type} — ${p.commentaire || ""}
    <button class="supprimer" onclick="supprimerLigne('personnel', ${i})">🗑️</button>`;
    zone.appendChild(div);
  });
}
afficherHistoriquePersonnel();

// (10) Export Excel pro (XLSX)
function exportExcelGlobal() {
  const wb = XLSX.utils.book_new();
  const data = [
    ["Type", "Ligne", "Début", "Fin", "Quantité", "Restant", "Cadence", "Estimation", "Commentaire/Cause", "Horodatage"]
  ];

  historique.production.forEach(r => data.push(["Production", r.ligne, r.heureDebut, r.heureFin, r.qte, r.qteRestante, r.cadence, r.estimation, "", r.horodatage]));
  historique.arrets.forEach(a => data.push(["Arrêt", a.ligne, "", "", "", "", "", "", `${a.cause} (${a.duree} min)`, a.horodatage]));
  historique.personnel.forEach(p => data.push(["Personnel", "", "", "", "", "", "", "", `${p.type} ${p.commentaire}`, p.horodatage]));
  historique.organisation.forEach(c => data.push(["Organisation", "", "", "", "", "", "", "", c.texte, c.horodatage]));

  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, "Synthèse");

  const date = new Date().toLocaleDateString("fr-FR").replace(/\//g, "-");
  XLSX.writeFile(wb, `Synthese_Equipe_${date}.xlsx`);
}
function genererExportAutomatique(equipe) {
  alert(`📦 Rapport exporté automatiquement pour l’équipe ${equipe}`);
  exportExcelGlobal();
}

// (11) Calculatrice flottante
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
