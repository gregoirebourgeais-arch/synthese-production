// ===============================
// VARIABLES GLOBALES
// ===============================
let ligneActuelle = "";
let donneesTemp = JSON.parse(localStorage.getItem("donneesTemp")) || {};
let historique = JSON.parse(localStorage.getItem("historique")) || {};
let historiqueArrets = JSON.parse(localStorage.getItem("historiqueArrets")) || [];
let historiquePersonnel = JSON.parse(localStorage.getItem("historiquePersonnel")) || [];
let historiqueOrganisation = JSON.parse(localStorage.getItem("historiqueOrganisation")) || [];

// ===============================
// INITIALISATION
// ===============================
window.onload = () => {
  afficherDateHeure();
  determinerEquipe();
  afficherTousLesHistoriques();
  setInterval(afficherDateHeure, 60000);
};

// ===============================
// DATE, HEURE, ÉQUIPE
// ===============================
function afficherDateHeure() {
  const now = new Date();
  const date = now.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  const heure = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  document.getElementById("dateHeure").textContent = `${date} — ${heure}`;
}

function determinerEquipe() {
  const h = new Date().getHours();
  let equipe = "Nuit";
  if (h >= 5 && h < 13) equipe = "Matin";
  else if (h >= 13 && h < 21) equipe = "Après-midi";
  document.getElementById("equipeActuelle").textContent = `Équipe : ${equipe}`;
}

// ===============================
// NAVIGATION ENTRE PAGES
// ===============================
function showSection(id) {
  document.querySelectorAll(".page").forEach(sec => sec.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// ===============================
// PRODUCTION
// ===============================
function selectLine(nomLigne) {
  ligneActuelle = nomLigne;
  document.getElementById("nomLigne").textContent = `Ligne : ${nomLigne}`;
  document.getElementById("formProduction").scrollIntoView({ behavior: "smooth" });

  // restaurer les données persistantes
  const data = donneesTemp[nomLigne] || {};
  document.getElementById("heureDebut").value = data.heureDebut || "";
  document.getElementById("heureFin").value = data.heureFin || "";
  document.getElementById("quantiteRealisee").value = data.quantiteRealisee || "";
  document.getElementById("quantiteRestante").value = data.quantiteRestante || "";
  document.getElementById("cadenceManuelle").value = data.cadenceManuelle || "";
  document.getElementById("estimationFin").value = data.estimationFin || "";

  afficherHistoriqueProduction();
}

function enregistrerProduction() {
  if (!ligneActuelle) return alert("Sélectionnez une ligne avant d’enregistrer.");
  const debut = document.getElementById("heureDebut").value;
  const fin = document.getElementById("heureFin").value;
  const qte = parseFloat(document.getElementById("quantiteRealisee").value) || 0;
  const restante = parseFloat(document.getElementById("quantiteRestante").value) || 0;
  const cadenceManuelle = parseFloat(document.getElementById("cadenceManuelle").value) || null;

  if (!debut || !fin || qte <= 0) return alert("Merci de remplir les champs essentiels.");

  const duree = (new Date(`1970-01-01T${fin}:00`) - new Date(`1970-01-01T${debut}:00`)) / 3600000;
  const cadence = cadenceManuelle || (qte / (duree > 0 ? duree : 1));
  const estimationFin = calculerEstimationAuto(restante, cadence);

  const enreg = {
    date: new Date().toLocaleString(),
    debut, fin, qte, restante, cadence, estimationFin
  };

  if (!historique[ligneActuelle]) historique[ligneActuelle] = [];
  historique[ligneActuelle].push(enreg);
  localStorage.setItem("historique", JSON.stringify(historique));

  // reset données temporaires
  donneesTemp[ligneActuelle] = {};
  localStorage.setItem("donneesTemp", JSON.stringify(donneesTemp));

  afficherHistoriqueProduction();
  resetForm();
}

function afficherHistoriqueProduction() {
  const div = document.getElementById("historiqueProduction");
  div.innerHTML = "";
  if (!ligneActuelle || !historique[ligneActuelle]) return;

  historique[ligneActuelle].forEach((r, i) => {
    const d = document.createElement("div");
    d.innerHTML = `
      <span>${r.date} — ${r.qte} colis (${r.cadence.toFixed(1)} c/h) — Fin estimée : ${r.estimationFin}</span>
      <button onclick="supprimerLigne('${ligneActuelle}', ${i})">❌</button>
    `;
    div.appendChild(d);
  });
}

function supprimerLigne(ligne, index) {
  historique[ligne].splice(index, 1);
  localStorage.setItem("historique", JSON.stringify(historique));
  afficherHistoriqueProduction();
}

function resetForm() {
  ["heureDebut", "heureFin", "quantiteRealisee", "quantiteRestante", "cadenceManuelle", "estimationFin"].forEach(id => {
    document.getElementById(id).value = "";
  });
}

function calculerEstimation() {
  const restante = parseFloat(document.getElementById("quantiteRestante").value);
  const cadence = parseFloat(document.getElementById("cadenceManuelle").value) ||
    (ligneActuelle && historique[ligneActuelle]?.slice(-1)[0]?.cadence) || 0;
  if (restante && cadence > 0) {
    const estimation = calculerEstimationAuto(restante, cadence);
    document.getElementById("estimationFin").value = estimation;
    sauvegarderTemporaire();
  }
}

function calculerEstimationAuto(restante, cadence) {
  const heures = restante / cadence;
  const maintenant = new Date();
  const estimation = new Date(maintenant.getTime() + heures * 3600000);
  return estimation.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function sauvegarderTemporaire() {
  if (!ligneActuelle) return;
  donneesTemp[ligneActuelle] = {
    heureDebut: document.getElementById("heureDebut").value,
    heureFin: document.getElementById("heureFin").value,
    quantiteRealisee: document.getElementById("quantiteRealisee").value,
    quantiteRestante: document.getElementById("quantiteRestante").value,
    cadenceManuelle: document.getElementById("cadenceManuelle").value,
    estimationFin: document.getElementById("estimationFin").value
  };
  localStorage.setItem("donneesTemp", JSON.stringify(donneesTemp));
}

// ===============================
// ARRÊTS
// ===============================
function enregistrerArret() {
  const ligne = document.getElementById("ligneArret").value;
  const debut = document.getElementById("debutArret").value;
  const fin = document.getElementById("finArret").value;
  const motif = document.getElementById("motifArret").value.trim();
  if (!ligne || !debut || !fin || !motif) return alert("Tous les champs sont requis.");

  const duree = (new Date(`1970-01-01T${fin}:00`) - new Date(`1970-01-01T${debut}:00`)) / 60000;
  const a = {
    date: new Date().toLocaleString(),
    ligne,
    debut,
    fin,
    duree: duree > 0 ? duree : 0,
    motif
  };
  historiqueArrets.push(a);
  localStorage.setItem("historiqueArrets", JSON.stringify(historiqueArrets));
  afficherArrets();
}

function afficherArrets() {
  const div = document.getElementById("historiqueArrets");
  div.innerHTML = "";
  historiqueArrets.forEach(a => {
    const d = document.createElement("div");
    d.textContent = `${a.date} — ${a.ligne} : ${a.motif} (${a.debut} → ${a.fin}, ${a.duree} min)`;
    div.appendChild(d);
  });
}

// ===============================
// PERSONNEL
// ===============================
function enregistrerPersonnel() {
  const nom = document.getElementById("nomEmploye").value.trim();
  const statut = document.getElementById("statutEmploye").value;
  if (!nom) return alert("Nom requis.");
  const p = { date: new Date().toLocaleString(), nom, statut };
  historiquePersonnel.push(p);
  localStorage.setItem("historiquePersonnel", JSON.stringify(historiquePersonnel));
  afficherPersonnel();
}

function afficherPersonnel() {
  const div = document.getElementById("historiquePersonnel");
  div.innerHTML = "";
  historiquePersonnel.forEach(p => {
    const d = document.createElement("div");
    d.textContent = `${p.date} — ${p.nom} : ${p.statut}`;
    div.appendChild(d);
  });
}

// ===============================
// ORGANISATION
// ===============================
function enregistrerOrganisation() {
  const texte = document.getElementById("consigneOrganisation").value.trim();
  if (!texte) return;
  const c = { date: new Date().toLocaleString(), texte };
  historiqueOrganisation.push(c);
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

// ===============================
// EXPORT EXCEL FORMATÉ
// ===============================
function exportGlobal() {
  const wb = XLSX.utils.book_new();
  const data = [["Section", "Date", "Ligne", "Détails"]];

  for (const [ligne, enregs] of Object.entries(historique)) {
    enregs.forEach(e => data.push(["Production", e.date, ligne, `Début ${e.debut} - Fin ${e.fin} | Qté ${e.qte} | Cadence ${e.cadence.toFixed(1)} c/h | Fin estimée ${e.estimationFin}`]));
  }
  historiqueArrets.forEach(a => data.push(["Arrêts", a.date, a.ligne, `${a.motif} (${a.debut} → ${a.fin}, ${a.duree} min)`]));
  historiquePersonnel.forEach(p => data.push(["Personnel", p.date, "-", `${p.nom} : ${p.statut}`]));
  historiqueOrganisation.forEach(o => data.push(["Organisation", o.date, "-", o.texte]));

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!cols"] = [{ wch: 16 }, { wch: 22 }, { wch: 16 }, { wch: 90 }];
  XLSX.utils.book_append_sheet(wb, ws, "Synthèse Atelier");

  // Style basique des titres (formaté)
  const header = ["A1", "B1", "C1", "D1"];
  header.forEach(cell => {
    if (!ws[cell]) return;
    ws[cell].s = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "007BFF" } },
      alignment: { horizontal: "center" }
    };
  });

  XLSX.writeFile(wb, `Synthese_Lactalis_${new Date().toLocaleDateString("fr-FR")}.xlsx`);
}

// ===============================
// CALCULATRICE
// ===============================
function ouvrirCalculatrice() {
  let calc = document.querySelector(".calculatrice");
  if (!calc) {
    calc = document.createElement("div");
    calc.className = "calculatrice";
    calc.innerHTML = `
      <input type="text" id="calcDisplay" readonly />
      <div class="calc-buttons">
        ${[7,8,9,"/",4,5,6,"*",1,2,3,"-",0,".","=","+"].map(v => `<button onclick="calcPress('${v}')">${v}</button>`).join("")}
        <button class="clear" onclick="calcClear()">C</button>
      </div>`;
    document.body.appendChild(calc);
  }
  calc.style.display = "block";
}

function calcPress(val) {
  const disp = document.getElementById("calcDisplay");
  if (val === "=") disp.value = eval(disp.value || "0");
  else disp.value += val;
}

function calcClear() {
  document.getElementById("calcDisplay").value = "";
}

// ===============================
// AFFICHAGE HISTORIQUES
// ===============================
function afficherTousLesHistoriques() {
  afficherArrets();
  afficherPersonnel();
  afficherOrganisation();
             }
