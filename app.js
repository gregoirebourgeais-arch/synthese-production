// === VARIABLES GLOBALES ===
let currentLine = "";
let historique = JSON.parse(localStorage.getItem("historique")) || {};
let chart;

// === DATE ET ÉQUIPE ===
function updateDateHeure() {
  const now = new Date();
  document.getElementById("dateHeure").textContent =
    now.toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "medium" });

  const heure = now.getHours();
  let equipe = "N";
  if (heure >= 5 && heure < 13) equipe = "M";
  else if (heure >= 13 && heure < 21) equipe = "AM";
  document.getElementById("equipeActuelle").textContent = `Équipe actuelle : ${equipe} (${equipe === "M" ? "5h–13h" : equipe === "AM" ? "13h–21h" : "21h–5h"})`;
}
setInterval(updateDateHeure, 1000);
updateDateHeure();

// === NAVIGATION ===
function showSection(id) {
  document.querySelectorAll(".page").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// === SÉLECTION DE LIGNE ===
function selectLine(line) {
  currentLine = line;
  document.getElementById("ligneTitre").textContent = "Ligne : " + line;
  restoreInputs(line);
  updateChart();
}

// === RESTAURATION DES CHAMPS ===
function restoreInputs(line) {
  const data = JSON.parse(localStorage.getItem(`data_${line}`)) || {};
  document.getElementById("heureDebut").value = data.heureDebut || "";
  document.getElementById("heureFin").value = data.heureFin || "";
  document.getElementById("qteRealisee").value = data.qteRealisee || "";
  document.getElementById("qteRestante").value = data.qteRestante || "";
  document.getElementById("cadenceManuelle").value = data.cadenceManuelle || "";
  document.getElementById("cadenceCalculee").value = data.cadenceCalculee || "";
  document.getElementById("estimationFin").value = data.estimationFin || "";
}

// === SAUVEGARDE LOCALE TEMPORAIRE ===
document.querySelectorAll("#heureDebut, #heureFin, #qteRealisee, #qteRestante, #cadenceManuelle").forEach(el => {
  el.addEventListener("input", () => {
    if (!currentLine) return;
    const data = {
      heureDebut: document.getElementById("heureDebut").value,
      heureFin: document.getElementById("heureFin").value,
      qteRealisee: document.getElementById("qteRealisee").value,
      qteRestante: document.getElementById("qteRestante").value,
      cadenceManuelle: document.getElementById("cadenceManuelle").value,
      cadenceCalculee: document.getElementById("cadenceCalculee").value,
      estimationFin: document.getElementById("estimationFin").value
    };
    localStorage.setItem(`data_${currentLine}`, JSON.stringify(data));
    updateEstimation();
  });
});

// === CALCUL AUTOMATIQUE ===
function updateEstimation() {
  const debut = document.getElementById("heureDebut").value;
  const fin = document.getElementById("heureFin").value;
  const qte = parseFloat(document.getElementById("qteRealisee").value);
  const rest = parseFloat(document.getElementById("qteRestante").value);
  const cadMan = parseFloat(document.getElementById("cadenceManuelle").value);

  let cadence = 0;
  if (debut && fin && qte) {
    const [h1, m1] = debut.split(":").map(Number);
    const [h2, m2] = fin.split(":").map(Number);
    let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (diff <= 0) diff += 24 * 60;
    cadence = qte / (diff / 60);
    document.getElementById("cadenceCalculee").value = cadence.toFixed(2);
  }

  if (rest && (cadMan || cadence)) {
    const rate = cadMan || cadence;
    const hoursNeeded = rest / rate;
    const now = new Date();
    const finEstimee = new Date(now.getTime() + hoursNeeded * 3600000);
    document.getElementById("estimationFin").value =
      finEstimee.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) +
      ` (~${hoursNeeded.toFixed(2)}h)`;
  }
}

// === ENREGISTRER ===
function enregistrer() {
  if (!currentLine) return alert("Sélectionne d'abord une ligne.");
  const date = new Date().toLocaleString("fr-FR");
  const hD = document.getElementById("heureDebut").value;
  const hF = document.getElementById("heureFin").value;
  const qR = document.getElementById("qteRealisee").value;
  const qRest = document.getElementById("qteRestante").value;
  const cad = document.getElementById("cadenceCalculee").value;
  const estFin = document.getElementById("estimationFin").value;

  const lineData = historique[currentLine] || [];
  lineData.push({ date, hD, hF, qR, qRest, cad, estFin });
  historique[currentLine] = lineData;
  localStorage.setItem("historique", JSON.stringify(historique));
  localStorage.removeItem(`data_${currentLine}`);
  afficherHistorique();
  resetForm();
  updateChart();
}

// === RESET ===
function resetForm() {
  document.querySelectorAll("#heureDebut, #heureFin, #qteRealisee, #qteRestante, #cadenceManuelle, #cadenceCalculee, #estimationFin")
    .forEach(i => i.value = "");
}

// === HISTORIQUE ===
function afficherHistorique() {
  const histDiv = document.getElementById("historique");
  histDiv.innerHTML = "";
  if (!historique[currentLine]) return;
  historique[currentLine].forEach((e, i) => {
    const div = document.createElement("div");
    div.innerHTML = `${e.date} — ${e.hD} ➜ ${e.hF} | Q=${e.qR} | Rest=${e.qRest} | Cad=${e.cad} | Fin=${e.estFin}
      <button onclick="supprEntry(${i})">🗑️</button>`;
    histDiv.appendChild(div);
  });
}
function supprEntry(i) {
  historique[currentLine].splice(i, 1);
  localStorage.setItem("historique", JSON.stringify(historique));
  afficherHistorique();
  updateChart();
}

// === CHART ===
function updateChart() {
  const ctx = document.getElementById("chartQuantites").getContext("2d");
  const labels = Object.keys(historique);
  const data = labels.map(l => {
    const arr = historique[l] || [];
    return arr.reduce((sum, e) => sum + Number(e.qR || 0), 0);
  });

  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Quantité réalisée (colis)",
        data,
        backgroundColor: "#007bff88",
        borderColor: "#005fc4",
        borderWidth: 1.5
      }]
    },
    options: {
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

// === EXPORT EXCEL ===
// === EXPORT EXCEL (.xlsx) AVEC STYLE ===
function exportGlobal() {
  if (!Object.keys(historique).length) {
    alert("Aucune donnée à exporter !");
    return;
  }

  // Création des données
  const rows = [
    ["Ligne", "Date", "Heure Début", "Heure Fin", "Quantité Réalisée", "Quantité Restante", "Cadence (colis/h)", "Fin estimée"]
  ];

  Object.entries(historique).forEach(([ligne, entries]) => {
    entries.forEach(e => {
      rows.push([ligne, e.date, e.hD, e.hF, e.qR, e.qRest, e.cad, e.estFin]);
    });
  });

  // Création du workbook et worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Mise en forme automatique
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const address = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!ws[address]) continue;
    ws[address].s = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "007BFF" } },
      alignment: { horizontal: "center" }
    };
  }

  // Ajustement de largeur automatique
  const colWidths = rows[0].map((_, i) =>
    ({ wch: Math.max(...rows.map(r => (r[i] ? r[i].toString().length : 0))) + 2 })
  );
  ws['!cols'] = colWidths;

  // Ajout du style “bande alternée”
  for (let R = 1; R <= range.e.r; ++R) {
    const bg = R % 2 === 0 ? "E8F0FE" : "FFFFFF"; // alternance bleu clair / blanc
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[addr]) continue;
      ws[addr].s = { fill: { fgColor: { rgb: bg } } };
    }
  }

  // Ajout au classeur
  XLSX.utils.book_append_sheet(wb, ws, "Synthèse");

  // Export
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], { type: "application/octet-stream" });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `Synthese_Production_Lactalis_${new Date().toLocaleDateString("fr-FR")}.xlsx`;
  link.click();
}

// === ARRÊTS ===
function enregistrerArret() {
  const ligne = document.getElementById("arretLigne").value;
  const duree = document.getElementById("dureeArret").value;
  const motif = document.getElementById("motifArret").value;
  if (!ligne || !duree) return alert("Complète les champs arrêt.");
  const date = new Date().toLocaleString("fr-FR");
  const entry = `[${date}] ${ligne} — ${duree}min — ${motif}`;
  const div = document.createElement("div");
  div.textContent = entry;
  document.getElementById("historiqueArrets").appendChild(div);
  document.getElementById("dureeArret").value = "";
  document.getElementById("motifArret").value = "";
  document.getElementById("arretLigne").value = "";
}

// === PERSONNEL ===
function enregistrerPersonnel() {
  const n = document.getElementById("nomPers").value;
  const m = document.getElementById("motifPers").value;
  const c = document.getElementById("comPers").value;
  if (!n) return;
  const date = new Date().toLocaleString("fr-FR");
  const div = document.createElement("div");
  div.textContent = `[${date}] ${n} — ${m} — ${c}`;
  document.getElementById("historiquePersonnel").appendChild(div);
  document.getElementById("nomPers").value = "";
  document.getElementById("motifPers").value = "";
  document.getElementById("comPers").value = "";
}

// === ORGANISATION ===
function enregistrerOrganisation() {
  const txt = document.getElementById("noteOrganisation").value;
  if (!txt) return;
  const date = new Date().toLocaleString("fr-FR");
  const div = document.createElement("div");
  div.textContent = `[${date}] ${txt}`;
  document.getElementById("historiqueOrganisation").appendChild(div);
  document.getElementById("noteOrganisation").value = "";
}

// === CALCULATRICE FLOTTANTE ===
const calc = document.getElementById("calculator");
const openCalc = document.getElementById("openCalc");
const closeCalc = document.getElementById("closeCalc");
const display = document.getElementById("calcDisplay");
let calcExpression = "";

openCalc.addEventListener("click", () => {
  calc.classList.toggle("hidden");
});

closeCalc.addEventListener("click", () => {
  calc.classList.add("hidden");
});

document.querySelectorAll(".calc-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    display.value += btn.textContent;
  });
});

document.getElementById("calcEqual").addEventListener("click", () => {
  try {
    display.value = eval(display.value);
  } catch {
    display.value = "Erreur";
  }
});

// === PAGE ATELIER ===

// 🔹 Initialisation des graphiques Chart.js
let chartQuantites, chartCadences;

// Fonction pour mettre à jour les graphiques
function majGraphiques() {
  const lignes = Object.keys(historique);
  if (!lignes.length) return;

  // --- Quantités totales par ligne ---
  const quantites = lignes.map(l =>
    historique[l].reduce((acc, x) => acc + Number(x.qR || 0), 0)
  );

  const ctx1 = document.getElementById("chartQuantites").getContext("2d");
  if (chartQuantites) chartQuantites.destroy();
  chartQuantites = new Chart(ctx1, {
    type: "bar",
    data: {
      labels: lignes,
      datasets: [{
        label: "Quantité totale (colis)",
        data: quantites,
        backgroundColor: "#007bff"
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: { display: false }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });

  // --- Évolution de la cadence ---
  const ctx2 = document.getElementById("chartCadences").getContext("2d");
  if (chartCadences) chartCadences.destroy();

  const datasets = lignes.map(ligne => ({
    label: ligne,
    data: historique[ligne].map(x => Number(x.cad || 0)),
    fill: false,
    borderColor: "#" + Math.floor(Math.random()*16777215).toString(16),
    tension: 0.2
  }));

  chartCadences = new Chart(ctx2, {
    type: "line",
    data: { labels: lignes.map(l => l), datasets },
    options: { responsive: true }
  });
}

// === Liste des arrêts ===
function majListeArrets() {
  const liste = document.getElementById("listeArrets");
  if (!liste) return;

  liste.innerHTML = "";

  if (!Object.keys(arrets || {}).length) {
    liste.innerHTML = "<p>Aucun arrêt enregistré.</p>";
    return;
  }

  Object.entries(arrets).forEach(([ligne, data]) => {
    const bloc = document.createElement("div");
    bloc.classList.add("arret-item");
    bloc.innerHTML = `<b>${ligne}</b> — ${data.map(a => `${a.motif} (${a.duree} min)`).join(", ")}`;
    liste.appendChild(bloc);
  });
}

// === Rafraîchissement automatique ===
setInterval(() => {
  majGraphiques();
  majListeArrets();
}, 10000);

// --- NAVIGATION ENTRE PAGES ---
function showSection(sectionId) {
  // masquer toutes les pages
  document.querySelectorAll(".page-section").forEach(sec => {
    sec.classList.remove("active");
    sec.classList.add("hidden");
  });
  // afficher la cible
  const target = document.getElementById(sectionId);
  if (target) {
    target.classList.remove("hidden");
    target.classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}
// ✅ rendre accessible aux onclick du HTML
window.showSection = showSection;

  // Fermer les menus latéraux si ouverts (mobile friendly)
  const sideMenu = document.querySelector(".side-menu");
  if (sideMenu) sideMenu.classList.remove("open");
}

// === EXPORT GLOBAL EXCEL (TOUT EN UN ONGLET) ===
document.getElementById("exportExcelGlobal").addEventListener("click", exportGlobalExcel);

function exportGlobalExcel() {
  try {
    const wb = XLSX.utils.book_new();
    let ws_data = [];

    // ====== En-tête principale ======
    ws_data.push(["Synthèse Atelier Lactalis"]);
    ws_data.push(["Date :", new Date().toLocaleString()]);
    ws_data.push([]);

    // ====== SECTION 1 : PRODUCTION ======
    ws_data.push(["📦 Production"]);
    ws_data.push(["Ligne", "Heure début", "Heure fin", "Quantité", "Cadence", "Estimation fin"]);
    Object.entries(historique || {}).forEach(([ligne, enregistrements]) => {
      enregistrements.forEach(e => {
        ws_data.push([
          ligne,
          e.heureDebut || "",
          e.heureFin || "",
          e.quantite || "",
          e.cadence || "",
          e.estimationFin || ""
        ]);
      });
    });
    ws_data.push([]);

    // ====== SECTION 2 : ARRÊTS ======
    ws_data.push(["⛔ Arrêts"]);
    ws_data.push(["Ligne", "Motif", "Durée (min)"]);
    Object.entries(arrets || {}).forEach(([ligne, data]) => {
      data.forEach(a => {
        ws_data.push([ligne, a.motif || "", a.duree || ""]);
      });
    });
    ws_data.push([]);

    // ====== SECTION 3 : PERSONNEL ======
    ws_data.push(["👷‍♂️ Personnel"]);
    ws_data.push(["Nom", "Motif", "Commentaire"]);
    (personnel || []).forEach(p => {
      ws_data.push([p.nom || "", p.motif || "", p.commentaire || ""]);
    });
    ws_data.push([]);

    // ====== SECTION 4 : ORGANISATION ======
    ws_data.push(["🗒️ Organisation"]);
    ws_data.push(["Date", "Consigne"]);
    (organisation || []).forEach(o => {
      ws_data.push([o.date || "", o.consigne || ""]);
    });

    // Création de la feuille
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, "Synthèse Atelier");

    // Largeur des colonnes
    ws["!cols"] = [
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 25 }
    ];

    // Export
    XLSX.writeFile(wb, `Synthese_Atelier_${new Date().toISOString().slice(0,10)}.xlsx`);
  } catch (err) {
    console.error("Erreur export Excel :", err);
    alert("⚠️ Impossible d’exporter le fichier Excel.");
  }
}
