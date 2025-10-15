// --- Variables globales ---
let ligneActive = null;
let donneesProduction = JSON.parse(localStorage.getItem("donneesProduction")) || {};
let donneesArrets = JSON.parse(localStorage.getItem("donneesArrets")) || [];
let donneesPersonnel = JSON.parse(localStorage.getItem("donneesPersonnel")) || [];
let donneesConsignes = JSON.parse(localStorage.getItem("donneesConsignes")) || [];

// --- Mise à jour de la date/heure + équipe ---
function majDateHeure() {
  const maintenant = new Date();
  const jour = maintenant.toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const heure = maintenant.toLocaleTimeString("fr-FR");
  document.getElementById("dateHeure").textContent = `${jour} — ${heure}`;
  const h = maintenant.getHours();
  let equipe = h >= 5 && h < 13 ? "M (5h–13h)" : h >= 13 && h < 21 ? "AM (13h–21h)" : "N (21h–5h)";
  document.getElementById("equipeActuelle").textContent = `Équipe : ${equipe}`;
}
setInterval(majDateHeure, 1000);
majDateHeure();

// --- Navigation entre sections ---
function showSection(id) {
  document.querySelectorAll(".page-section").forEach(sec => sec.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// --- Sélection d'une ligne ---
function selectLigne(nomLigne) {
  ligneActive = nomLigne;
  document.getElementById("titreLigne").textContent = `Ligne : ${nomLigne}`;
  chargerChampsLigne();
}

// --- Charger valeurs ligne ---
function chargerChampsLigne() {
  const data = donneesProduction[ligneActive] || {};
  document.getElementById("heureDebut").value = data.heureDebut || "";
  document.getElementById("heureFin").value = data.heureFin || "";
  document.getElementById("quantiteRealisee").value = data.quantiteRealisee || "";
  document.getElementById("quantiteRestante").value = data.quantiteRestante || "";
  document.getElementById("cadenceManuelle").value = data.cadenceManuelle || "";
  document.getElementById("estimationFin").value = data.estimationFin || "";
  afficherHistoriqueProduction();
}

// --- Enregistrer production ---
function enregistrerProduction() {
  if (!ligneActive) return alert("Choisis une ligne avant d'enregistrer !");
  const heureDebut = document.getElementById("heureDebut").value;
  const heureFin = document.getElementById("heureFin").value;
  const quantiteRealisee = parseFloat(document.getElementById("quantiteRealisee").value) || 0;
  const quantiteRestante = parseFloat(document.getElementById("quantiteRestante").value) || 0;
  const cadence = parseFloat(document.getElementById("cadenceManuelle").value) || 0;

  // calcul de l'estimation de fin
  let estimation = "";
  if (cadence > 0 && quantiteRestante > 0) {
    const heuresRestantes = quantiteRestante / cadence;
    const fin = new Date();
    fin.setHours(fin.getHours() + heuresRestantes);
    estimation = fin.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }

  const data = { heureDebut, heureFin, quantiteRealisee, quantiteRestante, cadenceManuelle: cadence, estimationFin: estimation };
  donneesProduction[ligneActive] = data;
  localStorage.setItem("donneesProduction", JSON.stringify(donneesProduction));
  afficherHistoriqueProduction();
  genererGraphique();
}

// --- Calcul automatique de fin quand on tape la quantité restante ---
document.getElementById("quantiteRestante").addEventListener("input", () => {
  const qRest = parseFloat(document.getElementById("quantiteRestante").value) || 0;
  const cadence = parseFloat(document.getElementById("cadenceManuelle").value) || 0;
  if (cadence > 0 && qRest > 0) {
    const heuresRestantes = qRest / cadence;
    const fin = new Date();
    fin.setHours(fin.getHours() + heuresRestantes);
    document.getElementById("estimationFin").value = fin.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  } else {
    document.getElementById("estimationFin").value = "";
  }
});

// --- Historique production ---
function afficherHistoriqueProduction() {
  const hist = document.getElementById("historiqueProduction");
  hist.innerHTML = "";
  for (const [ligne, data] of Object.entries(donneesProduction)) {
    const li = document.createElement("li");
    li.textContent = `${ligne} — ${data.quantiteRealisee || 0} colis (${data.estimationFin || "—"})`;
    hist.appendChild(li);
  }
}

// --- Remise à zéro ---
function remiseAZero() {
  if (!ligneActive) return;
  delete donneesProduction[ligneActive];
  localStorage.setItem("donneesProduction", JSON.stringify(donneesProduction));
  chargerChampsLigne();
}

// --- Arrêts ---
function enregistrerArret() {
  const duree = parseFloat(document.getElementById("dureeArret").value);
  const motif = document.getElementById("motifArret").value.trim();
  if (!duree || !motif) return alert("Renseigne la durée et le motif !");
  donneesArrets.push({ date: new Date().toLocaleString("fr-FR"), duree, motif });
  localStorage.setItem("donneesArrets", JSON.stringify(donneesArrets));
  afficherHistoriqueArrets();
}

function afficherHistoriqueArrets() {
  const hist = document.getElementById("historiqueArrets");
  hist.innerHTML = "";
  donneesArrets.forEach(a => {
    const li = document.createElement("li");
    li.textContent = `[${a.date}] ${a.duree} min — ${a.motif}`;
    hist.appendChild(li);
  });
}

// --- Personnel ---
function enregistrerPersonnel() {
  const nom = document.getElementById("nomPersonnel").value.trim();
  const motif = document.getElementById("motifPersonnel").value.trim();
  const commentaire = document.getElementById("commentairePersonnel").value.trim();
  if (!nom || !motif) return alert("Renseigne au moins le nom et le motif !");
  donneesPersonnel.push({ date: new Date().toLocaleString("fr-FR"), nom, motif, commentaire });
  localStorage.setItem("donneesPersonnel", JSON.stringify(donneesPersonnel));
  afficherHistoriquePersonnel();
}

function afficherHistoriquePersonnel() {
  const hist = document.getElementById("historiquePersonnel");
  hist.innerHTML = "";
  donneesPersonnel.forEach(p => {
    const li = document.createElement("li");
    li.textContent = `[${p.date}] ${p.nom} — ${p.motif}${p.commentaire ? " — " + p.commentaire : ""}`;
    hist.appendChild(li);
  });
}

// --- Consignes ---
function enregistrerConsigne() {
  const texte = document.getElementById("consigneTexte").value.trim();
  if (!texte) return;
  donneesConsignes.push({ date: new Date().toLocaleString("fr-FR"), texte });
  localStorage.setItem("donneesConsignes", JSON.stringify(donneesConsignes));
  afficherHistoriqueConsignes();
}

function afficherHistoriqueConsignes() {
  const hist = document.getElementById("historiqueConsignes");
  hist.innerHTML = "";
  donneesConsignes.forEach(c => {
    const li = document.createElement("li");
    li.textContent = `[${c.date}] ${c.texte}`;
    hist.appendChild(li);
  });
}

// --- Export Excel coloré Lactalis ---
function exportGlobal() {
  const wb = XLSX.utils.book_new();
  const ws_data = [];

  ws_data.push(["Synthèse Production Lactalis"]);
  ws_data.push(["Date :", new Date().toLocaleString("fr-FR")]);
  ws_data.push([]);

  // --- PRODUCTION ---
  ws_data.push(["=== PRODUCTION ==="]);
  ws_data.push(["Ligne", "Début", "Fin", "Réalisée", "Restante", "Cadence", "Estimation fin"]);
  for (const [ligne, d] of Object.entries(donneesProduction)) {
    ws_data.push([
      ligne, d.heureDebut || "", d.heureFin || "", d.quantiteRealisee || "",
      d.quantiteRestante || "", d.cadenceManuelle || "", d.estimationFin || ""
    ]);
  }
  ws_data.push([]);

  // --- ARRÊTS ---
  ws_data.push(["=== ARRÊTS ==="]);
  ws_data.push(["Date", "Durée (min)", "Motif"]);
  donneesArrets.forEach(a => ws_data.push([a.date, a.duree, a.motif]));
  ws_data.push([]);

  // --- PERSONNEL ---
  ws_data.push(["=== PERSONNEL ==="]);
  ws_data.push(["Date", "Nom", "Motif", "Commentaire"]);
  donneesPersonnel.forEach(p => ws_data.push([p.date, p.nom, p.motif, p.commentaire]));
  ws_data.push([]);

  // --- CONSIGNES ---
  ws_data.push(["=== CONSIGNES ==="]);
  ws_data.push(["Date", "Texte"]);
  donneesConsignes.forEach(c => ws_data.push([c.date, c.texte]));

  const ws = XLSX.utils.aoa_to_sheet(ws_data);

  // Largeur colonnes + couleur en-têtes
  ws['!cols'] = Array(7).fill({ wch: 22 });
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = 0; R <= range.e.r; R++) {
    const row = ws_data[R];
    if (!row) continue;
    for (let C = 0; C < row.length; C++) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[cellRef];
      if (!cell) continue;
      cell.s = {
        font: { name: "Segoe UI", sz: 11, bold: row[0]?.includes("===") },
        fill: R === 5 ? { fgColor: { rgb: "DCE6F1" } } : undefined,
        alignment: { vertical: "center", horizontal: "center" }
      };
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, "Synthèse");
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], { type: "application/octet-stream" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `Synthese_Production_${new Date().toISOString().slice(0,10)}.xlsx`;
  a.click();
}

// --- Graphique Chart.js ---
let chart;
function genererGraphique() {
  const ctx = document.getElementById("chartQuantites").getContext("2d");
  const labels = Object.keys(donneesProduction);
  const data = Object.values(donneesProduction).map(d => d.quantiteRealisee || 0);

  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Quantités réalisées (colis)",
        data,
        backgroundColor: "#007bff88",
        borderColor: "#0056b3",
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

// --- Initialisation ---
afficherHistoriqueArrets();
afficherHistoriquePersonnel();
afficherHistoriqueConsignes();
afficherHistoriqueProduction();
genererGraphique();
