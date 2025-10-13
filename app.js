// ==============================
//  INITIALISATION GLOBALE
// ==============================
const lignes = [
  "Râpé", "T2", "RT", "OMORI", "T1",
  "Sticks", "Emballage", "Dés", "Filets", "Prédécoupé"
];

let currentSection = "menu";

// ==============================
//  AFFICHAGE DATE / HEURE / SEMAINE
// ==============================
const dateDisplay = document.getElementById("dateDisplay");
setInterval(() => {
  const now = new Date();
  const semaine = Math.ceil(
    ((now - new Date(now.getFullYear(), 0, 1)) / 86400000 +
      new Date(now.getFullYear(), 0, 1).getDay() + 1) / 7
  );
  dateDisplay.textContent =
    now.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }) +
    " — Semaine " +
    semaine +
    " — " +
    now.toLocaleTimeString();
}, 1000);

// ==============================
//  NAVIGATION ENTRE LES SECTIONS
// ==============================
function showSection(id) {
  document.querySelectorAll(".section").forEach((s) => s.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
  document.getElementById(id).classList.add("active");
  currentSection = id;
  if (id !== "menu" && id !== "dashboard") setupLineForm(id);
  if (id === "dashboard") updateDashboard();
}

// ==============================
//  CRÉATION AUTOMATIQUE DES LIGNES
// ==============================
window.onload = () => {
  lignes.forEach((line) => {
    const section = document.getElementById(line);
    section.innerHTML = `
      <h2>Ligne ${line}</h2>
      <form id="form-${line}">
        <label>Heure début :</label>
        <input type="time" id="hD-${line}" />

        <label>Heure fin :</label>
        <input type="time" id="hF-${line}" />

        <label>Quantité initiale :</label>
        <input type="number" id="qI-${line}" placeholder="Quantité au démarrage" />

        <label>Quantité ajoutée :</label>
        <input type="number" id="qA-${line}" placeholder="Nouvelle quantité" />

        <label>Quantité restante :</label>
        <input type="number" id="qR-${line}" placeholder="Colis restants" />

        <label>Minutes d'arrêt :</label>
        <input type="number" id="aR-${line}" placeholder="Durée totale d'arrêt" />

        <label>Cadence manuelle :</label>
        <input type="number" id="cM-${line}" placeholder="Saisir cadence manuelle" />

        <button type="button" onclick="saveData('${line}')">💾 Enregistrer</button>
        <button type="button" onclick="resetLine('${line}')">🧹 Remise à zéro</button>
        <button type="button" onclick="exportLine('${line}')">📤 Export Excel</button>
      </form>

      <p>📊 Cadence actuelle : <span id="cad-${line}">0</span> colis/h</p>
      <p>⏱️ Estimation fin : <span id="est-${line}">_</span></p>
      <canvas id="chart-${line}" width="350" height="200"></canvas>
      <button class="btn" onclick="showSection('menu')">⬅️ Retour menu</button>
    `;
  });

  // Charger les données locales
  restoreLocalData();

  // Initialiser service worker
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("service-worker.js");
};

// ==============================
//  ENREGISTREMENT & CALCULS
// ==============================
function saveData(line) {
  const hD = document.getElementById(`hD-${line}`).value;
  const hF = document.getElementById(`hF-${line}`).value;
  const qI = +document.getElementById(`qI-${line}`).value || 0;
  const qA = +document.getElementById(`qA-${line}`).value || 0;
  const qR = +document.getElementById(`qR-${line}`).value || 0;
  const aR = +document.getElementById(`aR-${line}`).value || 0;
  const cM = +document.getElementById(`cM-${line}`).value || 0;

  const total = qI + qA - qR;
  const temps = (new Date(`1970-01-01T${hF}`) - new Date(`1970-01-01T${hD}`)) / 60000 - aR;
  const cadence = cM || (temps > 0 ? (total / temps) * 60 : 0);
  const estimation = cadence > 0 ? (qR / cadence).toFixed(2) + " h" : "_";

  // Sauvegarde dans localStorage
  let data = JSON.parse(localStorage.getItem("lignesData") || "{}");
  data[line] = {
    hD, hF, qI, qA, qR, aR, cM, cadence, estimation, time: new Date().toLocaleString()
  };
  localStorage.setItem("lignesData", JSON.stringify(data));

  // Mise à jour visuelle
  document.getElementById(`cad-${line}`).textContent = cadence.toFixed(2);
  document.getElementById(`est-${line}`).textContent = estimation;

  // Graphique
  updateLineChart(line, cadence);

  alert(`✅ Données enregistrées pour ${line} (${cadence.toFixed(2)} u/h)`);
}

// ==============================
//  GRAPHIQUE PAR LIGNE
// ==============================
function updateLineChart(line, cadence) {
  const ctx = document.getElementById(`chart-${line}`).getContext("2d");
  if (!window.lineCharts) window.lineCharts = {};
  if (!window.lineCharts[line]) {
    window.lineCharts[line] = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Cadence actuelle"],
        datasets: [{
          label: "Cadence (colis/h)",
          data: [cadence],
          backgroundColor: "#007bff"
        }]
      },
      options: { scales: { y: { beginAtZero: true } } }
    });
  } else {
    window.lineCharts[line].data.datasets[0].data = [cadence];
    window.lineCharts[line].update();
  }
}

// ==============================
//  EXPORT EXCEL / CSV
// ==============================
function exportLine(line) {
  const d = JSON.parse(localStorage.getItem("lignesData") || "{}")[line];
  if (!d) return alert("Aucune donnée à exporter !");
  let csv = "Champ;Valeur\n";
  for (let [k, v] of Object.entries(d)) csv += `${k};${v}\n`;
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${line}-export-${new Date().toISOString().slice(0, 19)}.csv`;
  a.click();
}

function exportAllData() {
  const d = JSON.parse(localStorage.getItem("lignesData") || "{}");
  if (!Object.keys(d).length) return alert("Aucune donnée à exporter !");
  let csv = "Ligne;HeureDébut;HeureFin;QuantitéInitiale;QuantitéAjoutée;QuantitéRestante;Arrêts;Cadence;Estimation;Date\n";
  for (const [line, v] of Object.entries(d)) {
    csv += `${line};${v.hD};${v.hF};${v.qI};${v.qA};${v.qR};${v.aR};${v.cadence.toFixed(2)};${v.estimation};${v.time}\n`;
  }
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `atelier-export-${new Date().toISOString().slice(0, 19)}.csv`;
  a.click();
}

// ==============================
//  REMISE À ZÉRO
// ==============================
function resetLine(line) {
  if (confirm("Remise à zéro de cette ligne ?")) {
    let d = JSON.parse(localStorage.getItem("lignesData") || "{}");
    delete d[line];
    localStorage.setItem("lignesData", JSON.stringify(d));
    document.getElementById(`form-${line}`).reset();
    document.getElementById(`cad-${line}`).textContent = "0";
    document.getElementById(`est-${line}`).textContent = "_";
    if (window.lineCharts && window.lineCharts[line]) window.lineCharts[line].destroy();
  }
}

// ==============================
//  RESTAURATION DES DONNÉES
// ==============================
function restoreLocalData() {
  const d = JSON.parse(localStorage.getItem("lignesData") || "{}");
  Object.entries(d).forEach(([line, v]) => {
    if (document.getElementById(`form-${line}`)) {
      document.getElementById(`hD-${line}`).value = v.hD || "";
      document.getElementById(`hF-${line}`).value = v.hF || "";
      document.getElementById(`qI-${line}`).value = v.qI || "";
      document.getElementById(`qA-${line}`).value = v.qA || "";
      document.getElementById(`qR-${line}`).value = v.qR || "";
      document.getElementById(`aR-${line}`).value = v.aR || "";
      document.getElementById(`cM-${line}`).value = v.cM || "";
      document.getElementById(`cad-${line}`).textContent = v.cadence?.toFixed(2) || "0";
      document.getElementById(`est-${line}`).textContent = v.estimation || "_";
      updateLineChart(line, v.cadence || 0);
    }
  });
}

// ==============================
//  TABLEAU DE BORD GLOBAL
// ==============================
function updateDashboard() {
  const d = JSON.parse(localStorage.getItem("lignesData") || "{}");
  const ctx = document.getElementById("atelierChart").getContext("2d");
  const labels = Object.keys(d);
  const values = labels.map((l) => d[l].cadence || 0);

  if (window.globalChart) window.globalChart.destroy();
  window.globalChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Cadence moyenne (colis/h)",
          data: values,
          backgroundColor: "#007bff",
        },
      ],
    },
    options: { scales: { y: { beginAtZero: true } } },
  });
}
