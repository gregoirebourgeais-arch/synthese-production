// ===========================
// VARIABLES & INITIALISATION
// ===========================
let ligneActuelle = "";
let historique = JSON.parse(localStorage.getItem("historique")) || {};
let historiqueArrets = JSON.parse(localStorage.getItem("historiqueArrets")) || [];
let historiquePersonnel = JSON.parse(localStorage.getItem("historiquePersonnel")) || [];
let historiqueOrganisation = JSON.parse(localStorage.getItem("historiqueOrganisation")) || [];
let derniereLigne = null;

function init() {
  afficherDateHeure();
  determinerEquipe();
  setInterval(afficherDateHeure, 60000);
  afficherHistoriqueGlobal();
}
window.onload = init;

// ===========================
// DATE, HEURE, ÉQUIPE
// ===========================
function afficherDateHeure() {
  const now = new Date();
  const dateLocale = now.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  const heureLocale = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  document.getElementById("dateHeure").textContent = `${dateLocale} — ${heureLocale}`;
}

function determinerEquipe() {
  const h = new Date().getHours();
  let equipe = "Nuit";
  if (h >= 5 && h < 13) equipe = "Matin";
  else if (h >= 13 && h < 21) equipe = "Après-midi";
  document.getElementById("equipeActuelle").textContent = `Équipe : ${equipe}`;
}

// ===========================
// NAVIGATION ENTRE PAGES
// ===========================
function showSection(sectionId) {
  document.querySelectorAll(".page-section").forEach(sec => sec.classList.remove("active"));
  document.getElementById(sectionId).classList.add("active");
}

// ===========================
// PRODUCTION
// ===========================
function selectLine(nomLigne) {
  ligneActuelle = nomLigne;
  document.getElementById("nomLigne").textContent = `Ligne : ${nomLigne}`;
  document.getElementById("formProduction").scrollIntoView({ behavior: "smooth" });
}

function enregistrerProduction() {
  if (!ligneActuelle) return alert("Sélectionne une ligne avant d’enregistrer.");

  const debut = document.getElementById("heureDebut").value;
  const fin = document.getElementById("heureFin").value;
  const quantite = parseFloat(document.getElementById("quantiteRealisee").value) || 0;
  const restante = parseFloat(document.getElementById("quantiteRestante").value) || 0;
  const cadenceManuelle = parseFloat(document.getElementById("cadenceManuelle").value) || null;

  if (!debut || !fin || quantite <= 0) return alert("Merci de remplir tous les champs essentiels.");

  const duree = (new Date(`1970-01-01T${fin}:00`) - new Date(`1970-01-01T${debut}:00`)) / 3600000;
  const cadence = cadenceManuelle ? cadenceManuelle : (quantite / (duree > 0 ? duree : 1));
  const estimationFin = calculerEstimationAuto(restante, cadence);

  const enregistrement = {
    date: new Date().toLocaleString(),
    debut, fin, quantite, restante, cadence, estimationFin
  };

  if (!historique[ligneActuelle]) historique[ligneActuelle] = [];
  historique[ligneActuelle].push(enregistrement);

  localStorage.setItem("historique", JSON.stringify(historique));
  afficherHistoriqueLigne(ligneActuelle);
  resetForm();
}

function afficherHistoriqueLigne(ligne) {
  const div = document.getElementById("historiqueProduction");
  div.innerHTML = "";
  if (!historique[ligne]) return;

  historique[ligne].forEach((item, i) => {
    const li = document.createElement("div");
    li.innerHTML = `
      <span>${item.date} — ${item.quantite} colis (${item.cadence.toFixed(1)} c/h)</span>
      <button onclick="supprimerLigne('${ligne}', ${i})">❌</button>
    `;
    div.appendChild(li);
  });
}

function supprimerLigne(ligne, index) {
  historique[ligne].splice(index, 1);
  localStorage.setItem("historique", JSON.stringify(historique));
  afficherHistoriqueLigne(ligne);
}

function resetForm() {
  document.getElementById("heureDebut").value = "";
  document.getElementById("heureFin").value = "";
  document.getElementById("quantiteRealisee").value = "";
  document.getElementById("quantiteRestante").value = "";
  document.getElementById("cadenceManuelle").value = "";
  document.getElementById("estimationFin").value = "";
}

// ===========================
// CALCUL ESTIMATION AUTOMATIQUE
// ===========================
function calculerEstimation() {
  const restante = parseFloat(document.getElementById("quantiteRestante").value);
  const cadence = parseFloat(document.getElementById("cadenceManuelle").value) ||
                  (ligneActuelle && historique[ligneActuelle]?.slice(-1)[0]?.cadence) || 0;

  if (restante && cadence > 0) {
    const estimation = calculerEstimationAuto(restante, cadence);
    document.getElementById("estimationFin").value = estimation;
  }
}

function calculerEstimationAuto(restante, cadence) {
  const heures = restante / cadence;
  const maintenant = new Date();
  const estimation = new Date(maintenant.getTime() + heures * 3600000);
  return estimation.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

// ===========================
// ARRÊTS
// ===========================
function enregistrerArret() {
  const ligne = document.getElementById("ligneArret").value;
  const motif = document.getElementById("motifArret").value;
  if (!ligne || !motif) return alert("Merci de renseigner la ligne et le motif.");

  const data = { date: new Date().toLocaleString(), ligne, motif };
  historiqueArrets.push(data);
  localStorage.setItem("historiqueArrets", JSON.stringify(historiqueArrets));
  afficherArrets();
}

function afficherArrets() {
  const div = document.getElementById("historiqueArrets");
  div.innerHTML = "";
  historiqueArrets.forEach((a, i) => {
    const d = document.createElement("div");
    d.innerHTML = `<span>${a.date} — ${a.ligne}: ${a.motif}</span>`;
    div.appendChild(d);
  });
}

// ===========================
// PERSONNEL
// ===========================
function enregistrerPersonnel() {
  const nom = document.getElementById("nomEmploye").value;
  const statut = document.getElementById("statutEmploye").value;
  if (!nom) return alert("Nom requis.");

  const enreg = { date: new Date().toLocaleString(), nom, statut };
  historiquePersonnel.push(enreg);
  localStorage.setItem("historiquePersonnel", JSON.stringify(historiquePersonnel));
  afficherPersonnel();
}

function afficherPersonnel() {
  const div = document.getElementById("historiquePersonnel");
  div.innerHTML = "";
  historiquePersonnel.forEach(p => {
    const d = document.createElement("div");
    d.textContent = `${p.date} — ${p.nom}: ${p.statut}`;
    div.appendChild(d);
  });
}

// ===========================
// ORGANISATION
// ===========================
function enregistrerOrganisation() {
  const texte = document.getElementById("consigneOrganisation").value.trim();
  if (!texte) return;
  const data = { date: new Date().toLocaleString(), texte };
  historiqueOrganisation.push(data);
  localStorage.setItem("historiqueOrganisation", JSON.stringify(historiqueOrganisation));
  afficherOrganisation();
  document.getElementById("consigneOrganisation").value = "";
}

function afficherOrganisation() {
  const div = document.getElementById("historiqueOrganisation");
  div.innerHTML = "";
  historiqueOrganisation.forEach(c => {
    const d = document.createElement("div");
    d.textContent = `${c.date} — ${c.texte}`;
    div.appendChild(d);
  });
}

// ===========================
// EXPORT GLOBAL EXCEL
// ===========================
function exportGlobal() {
  const wb = XLSX.utils.book_new();
  const allData = [];

  allData.push(["Section", "Date", "Ligne", "Données"]);

  // Production
  for (const [ligne, datas] of Object.entries(historique)) {
    datas.forEach(d =>
      allData.push(["Production", d.date, ligne,
        `Début: ${d.debut}, Fin: ${d.fin}, Qté: ${d.quantite}, Cadence: ${d.cadence.toFixed(1)} c/h, Fin estimée: ${d.estimationFin}`])
    );
  }

  // Arrêts
  historiqueArrets.forEach(a => allData.push(["Arrêts", a.date, a.ligne, a.motif]));

  // Personnel
  historiquePersonnel.forEach(p => allData.push(["Personnel", p.date, "-", `${p.nom}: ${p.statut}`]));

  // Organisation
  historiqueOrganisation.forEach(o => allData.push(["Organisation", o.date, "-", o.texte]));

  const ws = XLSX.utils.aoa_to_sheet(allData);
  XLSX.utils.book_append_sheet(wb, ws, "Synthèse complète");
  XLSX.writeFile(wb, `Synthese_Production_${new Date().toLocaleDateString("fr-FR")}.xlsx`);
}

// ===========================
// CALCULATRICE FLOTTANTE
// ===========================
function ouvrirCalculatrice() {
  const calc = document.querySelector(".calculatrice");
  if (!calc) {
    const div = document.createElement("div");
    div.className = "calculatrice";
    div.innerHTML = `
      <input type="text" id="calcDisplay" readonly />
      <div class="calc-buttons">
        ${[7,8,9,"/",4,5,6,"*",1,2,3,"-",0,".","=","+"].map(v => `<button onclick="calcPress('${v}')">${v}</button>`).join("")}
        <button class="clear" onclick="calcClear()">C</button>
      </div>`;
    document.body.appendChild(div);
  }
  document.querySelector(".calculatrice").style.display = "block";
}

function calcPress(val) {
  const disp = document.getElementById("calcDisplay");
  if (val === "=") disp.value = eval(disp.value);
  else disp.value += val;
}
function calcClear() {
  document.getElementById("calcDisplay").value = "";
}
