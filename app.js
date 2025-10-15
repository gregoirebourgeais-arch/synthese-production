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

// --- Export Excel basique (présentable) ---
function exportGlobal() {
  let contenu = "Synthèse Production Lactalis\n\n";
  contenu += "=== PRODUCTION ===\n";
  for (const [ligne, data] of Object.entries(donneesProduction))
    contenu += `${ligne}: ${data.quantiteRealisee || 0} (reste ${data.quantiteRestante || 0}) fin prévue ${data.estimationFin || ""}\n`;
  contenu += "\n=== ARRÊTS ===\n";
  donneesArrets.forEach(a => contenu += `[${a.date}] ${a.duree}min — ${a.motif}\n`);
  contenu += "\n=== PERSONNEL ===\n";
  donneesPersonnel.forEach(p => contenu += `[${p.date}] ${p.nom} — ${p.motif} — ${p.commentaire}\n`);
  contenu += "\n=== CONSIGNES ===\n";
  donneesConsignes.forEach(c => contenu += `[${c.date}] ${c.texte}\n`);

  const blob = new Blob([contenu], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "Synthese_Production_Lactalis.txt";
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
