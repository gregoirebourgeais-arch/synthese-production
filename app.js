// ==============================
// 🔹 INIT GÉNÉRALE
// ==============================
const lignes = [
  "Râpé", "T2", "RT", "OMORI", "T1",
  "Sticks", "Emballage", "Dés", "Filets", "Prédécoupé"
];

let currentEquipe = "M"; // Valeur par défaut
let currentSection = "menu";
const dateDisplay = document.getElementById("dateDisplay");
const equipeSelect = document.getElementById("equipe");
const teamDisplay = document.getElementById("teamDisplay");

// ==============================
// 🔹 DETECTION AUTOMATIQUE DE L’ÉQUIPE
// ==============================
function detectEquipeAuto() {
  const now = new Date();
  const heure = now.getHours();

  if (heure >= 5 && heure < 13) currentEquipe = "M";
  else if (heure >= 13 && heure < 21) currentEquipe = "AM";
  else currentEquipe = "N";

  // Persistance locale
  const saved = localStorage.getItem("currentEquipe");
  currentEquipe = saved || currentEquipe;
  equipeSelect.value = currentEquipe;
  teamDisplay.textContent = currentEquipe;
}

function changeEquipe(equipe) {
  currentEquipe = equipe;
  localStorage.setItem("currentEquipe", equipe);
  teamDisplay.textContent = equipe;
}

// ==============================
// 🔹 DATE + HEURE + SEMAINE
// ==============================
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
// 🔹 NAVIGATION ENTRE SECTIONS
// ==============================
function showSection(id) {
  document.querySelectorAll(".section").forEach((s) => s.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
  document.getElementById(id).classList.add("active");
  currentSection = id;

  if (lignes.includes(id)) setupLineForm(id);
  if (id === "Atelier") updateDashboard();
  if (id === "Arrets") refreshArrets();
  if (id === "Personnel") refreshPersonnel();
  if (id === "Organisation") refreshOrganisation();
}

// ==============================
// 🔹 INITIALISATION DES LIGNES
// ==============================
window.onload = () => {
  detectEquipeAuto();
  lignes.forEach((line) => {
    const section = document.getElementById(line);
    section.innerHTML = `
      <h2>Ligne ${line}</h2>
      <form id="form-${line}">
        <label>Heure début :</label><input type="time" id="hD-${line}" />
        <label>Heure fin :</label><input type="time" id="hF-${line}" />
        <label>Quantité initiale :</label><input type="number" id="qI-${line}" placeholder="Quantité au démarrage" />
        <label>Quantité ajoutée :</label><input type="number" id="qA-${line}" placeholder="Nouvelle quantité" />
        <label>Quantité restante :</label><input type="number" id="qR-${line}" placeholder="Colis restants" />
        <label>Minutes d'arrêt :</label><input type="number" id="aR-${line}" placeholder="Durée totale d'arrêt" />
        <label>Cadence manuelle :</label><input type="number" id="cM-${line}" placeholder="Saisir cadence manuelle" />

        <button type="button" onclick="saveData('${line}')">💾 Enregistrer</button>
        <button type="button" onclick="resetLine('${line}')">🧹 Remise à zéro</button>
        <button type="button" onclick="exportLine('${line}')">📤 Export Excel</button>
      </form>

      <p>📊 Cadence actuelle : <span id="cad-${line}">0</span> colis/h</p>
      <p>⏱️ Estimation fin : <span id="est-${line}">_</span></p>
      <canvas id="chart-${line}" width="350" height="200"></canvas>
      <button class="btn" onclick="showSection('menu')">⬅️ Retour menu</button>
    `;

    // Écouteur de changement pour persistance automatique
    document.querySelectorAll(`#form-${line} input`).forEach((input) => {
      input.addEventListener("input", () => saveTempData(line));
    });
  });

  restoreLocalData();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("service-worker.js");
};

// ==============================
// 🔹 PERSISTANCE AUTOMATIQUE DES SAISIES
// ==============================
function saveTempData(line) {
  let tmpData = JSON.parse(localStorage.getItem("tempData") || "{}");
  tmpData[line] = {
    hD: document.getElementById(`hD-${line}`).value,
    hF: document.getElementById(`hF-${line}`).value,
    qI: document.getElementById(`qI-${line}`).value,
    qA: document.getElementById(`qA-${line}`).value,
    qR: document.getElementById(`qR-${line}`).value,
    aR: document.getElementById(`aR-${line}`).value,
    cM: document.getElementById(`cM-${line}`).value,
  };
  localStorage.setItem("tempData", JSON.stringify(tmpData));
}

function restoreLocalData() {
  const d = JSON.parse(localStorage.getItem("lignesData") || "{}");
  const tmp = JSON.parse(localStorage.getItem("tempData") || "{}");
  Object.entries(d).forEach(([line, v]) => {
    if (document.getElementById(`form-${line}`)) {
      document.getElementById(`cad-${line}`).textContent = v.cadence?.toFixed(2) || "0";
      document.getElementById(`est-${line}`).textContent = v.estimation || "_";
      updateLineChart(line, v.cadence || 0);
    }
  });
  Object.entries(tmp).forEach(([line, v]) => {
    for (let k in v) {
      const el = document.getElementById(`${k}-${line}`);
      if (el) el.value = v[k];
    }
  });
}

// ==============================
// 🔹 SAUVEGARDE VALIDÉE
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

  let data = JSON.parse(localStorage.getItem("lignesData") || "{}");
  data[line] = { hD, hF, qI, qA, qR, aR, cM, cadence, estimation, equipe: currentEquipe, time: new Date().toLocaleString() };
  localStorage.setItem("lignesData", JSON.stringify(data));

  // Nettoyage des temporaires
  let tmp = JSON.parse(localStorage.getItem("tempData") || "{}");
  delete tmp[line];
  localStorage.setItem("tempData", JSON.stringify(tmp));

  document.getElementById(`cad-${line}`).textContent = cadence.toFixed(2);
  document.getElementById(`est-${line}`).textContent = estimation;
  updateLineChart(line, cadence);
}

// ==============================
// 🔹 GRAPHIQUES
// ==============================
function updateLineChart(line, cadence) {
  const ctx = document.getElementById(`chart-${line}`).getContext("2d");
  if (!window.lineCharts) window.lineCharts = {};
  if (!window.lineCharts[line]) {
    window.lineCharts[line] = new Chart(ctx, {
      type: "bar",
      data: { labels: ["Cadence actuelle"], datasets: [{ label: "Cadence (colis/h)", data: [cadence], backgroundColor: "#007bff" }] },
      options: { scales: { y: { beginAtZero: true } } }
    });
  } else {
    window.lineCharts[line].data.datasets[0].data = [cadence];
    window.lineCharts[line].update();
  }
}

// ==============================
// 🔹 EXPORT ET RESET
// ==============================
function exportLine(line) {
  const d = JSON.parse(localStorage.getItem("lignesData") || "{}")[line];
  if (!d) return alert("Aucune donnée à exporter !");
  let csv = "Champ;Valeur\n";
  for (let [k, v] of Object.entries(d)) csv += `${k};${v}\n`;
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${line}-${d.equipe}-export-${new Date().toISOString().slice(0, 19)}.csv`;
  a.click();
}

function exportAllData() {
  const d = JSON.parse(localStorage.getItem("lignesData") || "{}");
  if (!Object.keys(d).length) return alert("Aucune donnée à exporter !");
  let csv = "Ligne;Équipe;HeureDébut;HeureFin;QuantitéInitiale;QuantitéAjoutée;QuantitéRestante;Arrêts;Cadence;Estimation;Date\n";
  for (const [line, v] of Object.entries(d)) {
    csv += `${line};${v.equipe};${v.hD};${v.hF};${v.qI};${v.qA};${v.qR};${v.aR};${v.cadence.toFixed(2)};${v.estimation};${v.time}\n`;
  }
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `atelier-export-${currentEquipe}-${new Date().toISOString().slice(0, 19)}.csv`;
  a.click();
}

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

function resetAllData() {
  if (confirm("Remise à zéro complète de l'application ?")) {
    localStorage.clear();
    location.reload();
  }
}

// ==============================
// 🔹 ARRÊTS, PERSONNEL, ORGANISATION
// ==============================
function saveArret() {
  const ligne = document.getElementById("ligneArret").value;
  const temps = document.getElementById("tempsArret").value;
  const cause = document.getElementById("causeArret").value;
  const date = new Date().toLocaleString();

  let arr = JSON.parse(localStorage.getItem("arretsData") || "[]");
  arr.push({ ligne, temps, cause, equipe: currentEquipe, date });
  localStorage.setItem("arretsData", JSON.stringify(arr));
  refreshArrets();
}

function refreshArrets() {
  const tbody = document.querySelector("#tableArrets tbody");
  const arr = JSON.parse(localStorage.getItem("arretsData") || "[]").filter(a => a.equipe === currentEquipe);
  tbody.innerHTML = arr.map(a => `<tr><td>${a.date}</td><td>${a.ligne}</td><td>${a.temps}</td><td>${a.cause}</td></tr>`).join("");
}

function savePersonnel() {
  const type = document.getElementById("type").value;
  const com = document.getElementById("commentaire").value;
  const date = new Date().toLocaleString();

  let pers = JSON.parse(localStorage.getItem("personnelData") || "[]");
  pers.push({ date, type, com, equipe: currentEquipe });
  localStorage.setItem("personnelData", JSON.stringify(pers));
  refreshPersonnel();
}

function refreshPersonnel() {
  const tbody = document.querySelector("#personnelTable tbody");
  const pers = JSON.parse(localStorage.getItem("personnelData") || "[]").filter(p => p.equipe === currentEquipe);
  tbody.innerHTML = pers.map(p => `<tr><td>${p.date}</td><td>${p.type}</td><td>${p.com}</td></tr>`).join("");
}

function saveOrganisation() {
  const note = document.getElementById("noteOrg").value;
  const date = new Date().toLocaleString();
  let org = JSON.parse(localStorage.getItem("orgData") || "[]");
  org.push({ date, note, equipe: currentEquipe });
  localStorage.setItem("orgData", JSON.stringify(org));
  refreshOrganisation();
}

function refreshOrganisation() {
  const tbody = document.querySelector("#orgTable tbody");
  const org = JSON.parse(localStorage.getItem("orgData") || "[]").filter(o => o.equipe === currentEquipe);
  tbody.innerHTML = org.map(o => `<tr><td>${o.date}</td><td>${o.note}</td></tr>`).join("");
}

// ==============================
// 🔹 DASHBOARD ATELIER
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
      datasets: [{ label: `Cadence moyenne ${currentEquipe} (colis/h)`, data: values, backgroundColor: "#007bff" }],
    },
    options: { scales: { y: { beginAtZero: true } } },
  });
}
