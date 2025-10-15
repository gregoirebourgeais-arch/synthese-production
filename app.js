// === Synthèse Production Lactalis – V38 améliorée ===

// Données
let ligneActive = "";
let historique = JSON.parse(localStorage.getItem("historique")) || {
  production: [],
  arrets: [],
  personnel: [],
  organisation: []
};

// Sauvegarde locale
function save() {
  localStorage.setItem("historique", JSON.stringify(historique));
}

// --- DATE / HEURE / ÉQUIPE ---
function majDateHeureEquipe() {
  const now = new Date();
  const heure = now.getHours();
  const dateStr = now.toLocaleDateString("fr-FR");
  const heureStr = now.toTimeString().slice(0, 5);
  let equipe = "";

  if (heure >= 5 && heure < 13) equipe = "Matin (5h–13h)";
  else if (heure >= 13 && heure < 21) equipe = "Après-midi (13h–21h)";
  else equipe = "Nuit (21h–5h)";

  document.getElementById("dateHeure").innerText = `${dateStr} ${heureStr}`;
  document.getElementById("equipeActuelle").innerText = `Équipe : ${equipe}`;
}
setInterval(majDateHeureEquipe, 10000);
majDateHeureEquipe();

// --- NAVIGATION ENTRE LES PAGES ---
function showSection(id) {
  document.querySelectorAll(".section").forEach(sec => sec.classList.remove("active"));
  document.getElementById(id).classList.add("active");

  document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.remove("active"));
  const navButton = [...document.querySelectorAll(".nav-btn")].find(b => b.textContent.includes(id.charAt(0).toUpperCase()));
  if (navButton) navButton.classList.add("active");
}

// --- SELECTION DE LIGNE ---
function selectLine(ligne) {
  ligneActive = ligne;
  document.getElementById("selectedLine").innerText = `Ligne : ${ligne}`;
  document.getElementById("productionForm").scrollIntoView({ behavior: "smooth" });
}

// --- ENREGISTREMENT DE PRODUCTION ---
function enregistrerProduction() {
  if (!ligneActive) return alert("Choisissez une ligne avant d’enregistrer !");
  const debut = document.getElementById("heureDebut").value;
  const fin = document.getElementById("heureFin").value;
  const qte = parseFloat(document.getElementById("quantiteProduite").value || 0);
  const qteRestante = parseFloat(document.getElementById("quantiteRestante").value || 0);
  const cadenceManuelle = parseFloat(document.getElementById("cadenceManuelle").value || 0);

  if (!debut || !fin) return alert("Veuillez saisir les heures de début et de fin.");

  const [h1, m1] = debut.split(":").map(Number);
  const [h2, m2] = fin.split(":").map(Number);
  let diffHeure = (h2 + m2 / 60) - (h1 + m1 / 60);
  if (diffHeure < 0) diffHeure += 24;

  let cadence = cadenceManuelle || (diffHeure > 0 ? qte / diffHeure : 0);
  let tempsRestant = cadence > 0 ? qteRestante / cadence : 0;

  const finEstimee = new Date();
  finEstimee.setMinutes(finEstimee.getMinutes() + tempsRestant * 60);
  const finEstimeeStr = finEstimee.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  document.getElementById("estimationFin").value = finEstimeeStr;

  const record = {
    ligne: ligneActive,
    debut,
    fin,
    qte,
    qteRestante,
    cadence: cadence.toFixed(1),
    finEstimee: finEstimeeStr,
    date: new Date().toLocaleString("fr-FR")
  };

  historique.production.push(record);
  save();
  afficherHistoriqueProduction();
  resetForm();
}

// --- ESTIMATION AUTOMATIQUE ---
function updateEstimation() {
  const qte = parseFloat(document.getElementById("quantiteProduite").value || 0);
  const reste = parseFloat(document.getElementById("quantiteRestante").value || 0);
  const cadenceManuelle = parseFloat(document.getElementById("cadenceManuelle").value || 0);
  const cadence = cadenceManuelle || (qte > 0 ? qte / 1 : 0);
  const heures = (reste && cadence) ? reste / cadence : 0;

  if (heures > 0) {
    const finEstimee = new Date();
    finEstimee.setMinutes(finEstimee.getMinutes() + heures * 60);
    document.getElementById("estimationFin").value = finEstimee.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  } else {
    document.getElementById("estimationFin").value = "";
  }
}

// --- HISTORIQUE DE PRODUCTION ---
function afficherHistoriqueProduction() {
  const ul = document.getElementById("historiqueProduction");
  ul.innerHTML = "";
  historique.production.forEach((r, i) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span><b>${r.ligne}</b> — ${r.qte} colis (${r.cadence} c/h) | Fin estimée : ${r.finEstimee}</span>
      <button onclick="supprimer('production', ${i})">🗑️</button>
    `;
    ul.appendChild(li);
  });
}
afficherHistoriqueProduction();

// --- SUPPRESSION D’ENTRÉE ---
function supprimer(type, index) {
  historique[type].splice(index, 1);
  save();
  if (type === "production") afficherHistoriqueProduction();
  if (type === "arrets") afficherHistoriqueArrets();
  if (type === "organisation") afficherHistoriqueConsignes();
  if (type === "personnel") afficherHistoriquePersonnel();
}

// --- ANNULER DERNIER ---
function annulerDernier() {
  if (historique.production.length === 0) return;
  historique.production.pop();
  save();
  afficherHistoriqueProduction();
}

// --- RESET FORMULAIRE ---
function resetForm() {
  ["heureDebut", "heureFin", "quantiteProduite", "quantiteRestante", "cadenceManuelle", "estimationFin"]
    .forEach(id => document.getElementById(id).value = "");
}

// --- ARRÊTS ---
function enregistrerArret() {
  const ligne = document.getElementById("ligneArret").value;
  const motif = document.getElementById("motifArret").value;
  const duree = parseInt(document.getElementById("dureeArret").value || 0);

  if (!ligne || !motif || !duree) return alert("Merci de compléter tous les champs.");

  historique.arrets.push({ ligne, motif, duree, date: new Date().toLocaleString("fr-FR") });
  save();
  afficherHistoriqueArrets();
}

function afficherHistoriqueArrets() {
  const ul = document.getElementById("historiqueArrets");
  ul.innerHTML = "";
  historique.arrets.forEach((a, i) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span>${a.ligne} — ${a.motif} (${a.duree} min)</span>
      <button onclick="supprimer('arrets', ${i})">🗑️</button>`;
    ul.appendChild(li);
  });
}
afficherHistoriqueArrets();

// --- PERSONNEL ---
function enregistrerPersonnel() {
  const nom = document.getElementById("nomPersonnel").value;
  const poste = document.getElementById("postePersonnel").value;
  if (!nom) return alert("Nom obligatoire !");
  historique.personnel.push({ nom, poste, date: new Date().toLocaleString("fr-FR") });
  save();
  afficherHistoriquePersonnel();
}

function afficherHistoriquePersonnel() {
  const ul = document.getElementById("listePersonnel");
  ul.innerHTML = "";
  historique.personnel.forEach((p, i) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${p.nom} (${p.poste || ""})</span>
    <button onclick="supprimer('personnel', ${i})">🗑️</button>`;
    ul.appendChild(li);
  });
}
afficherHistoriquePersonnel();

// --- CONSIGNES ---
function enregistrerConsigne() {
  const txt = document.getElementById("consigne").value.trim();
  if (!txt) return alert("Écrire une consigne avant d’enregistrer !");
  historique.organisation.push({ texte: txt, date: new Date().toLocaleString("fr-FR") });
  save();
  afficherHistoriqueConsignes();
  document.getElementById("consigne").value = "";
}

function afficherHistoriqueConsignes() {
  const ul = document.getElementById("historiqueConsignes");
  ul.innerHTML = "";
  historique.organisation.forEach((c, i) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${c.texte}</span>
    <button onclick="supprimer('organisation', ${i})">🗑️</button>`;
    ul.appendChild(li);
  });
}
afficherHistoriqueConsignes();

// --- EXPORT GLOBAL XLSX ---
function exportGlobal() {
  const wb = XLSX.utils.book_new();
  const data = [["Type", "Ligne", "Début", "Fin", "Quantité", "Restant", "Cadence", "Estimation fin", "Motif / Poste / Consigne", "Date"]];

  historique.production.forEach(r =>
    data.push(["Production", r.ligne, r.debut, r.fin, r.qte, r.qteRestante, r.cadence, r.finEstimee, "", r.date])
  );
  historique.arrets.forEach(a =>
    data.push(["Arrêt", a.ligne, "", "", "", "", "", "", `${a.motif} (${a.duree} min)`, a.date])
  );
  historique.personnel.forEach(p =>
    data.push(["Personnel", "", "", "", "", "", "", "", `${p.nom} (${p.poste})`, p.date])
  );
  historique.organisation.forEach(c =>
    data.push(["Organisation", "", "", "", "", "", "", "", c.texte, c.date])
  );

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Mise en page Excel
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const addr = XLSX.utils.encode_col(C) + "1";
    if (!ws[addr]) continue;
    ws[addr].s = {
      fill: { fgColor: { rgb: "007BFF" } },
      font: { bold: true, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: "center" }
    };
  }
  ws["!cols"] = Array(10).fill({ wch: 18 });

  XLSX.utils.book_append_sheet(wb, ws, "Synthèse");
  const fileName = `Synthese_Lactalis_${new Date().toLocaleDateString("fr-FR").replace(/\//g, "-")}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

// --- CALCULATRICE ---
function press(val) {
  document.getElementById("calc-display").value += val;
}

function calculate() {
  try {
    const result = eval(document.getElementById("calc-display").value);
    document.getElementById("calc-display").value = result;
  } catch {
    document.getElementById("calc-display").value = "Erreur";
  }
}

function clearCalc() {
  document.getElementById("calc-display").value = "";
}
