// --- Configuration globale ---
const lignes = [
  "Râpé", "T2", "RT", "OMORI", "T1", "Sticks",
  "Emballage", "Dés", "Filets", "Prédécoupé"
];
const data = JSON.parse(localStorage.getItem("syntheseData")) || {};
const app = document.getElementById("content");

// --- Affichage date / semaine ---
function updateDateTime() {
  const now = new Date();
  const week = getWeekNumber(now);
  const dateStr = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const time = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  document.getElementById("topClock").textContent = `${dateStr} — Semaine ${week} — ${time}`;
}
setInterval(updateDateTime, 1000);

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

// --- Page d'accueil ---
function showAccueil() {
  let html = `<div class="menu-buttons">`;
  html += `<button onclick="showAtelier()">Atelier</button>`;
  lignes.forEach(l => {
    html += `<button onclick="showLigne('${l}')">${l}</button>`;
  });
  html += `</div>`;
  app.innerHTML = html;
}
showAccueil();

// --- Page Atelier ---
function showAtelier() {
  let html = `
    <div class="page">
      <h2>Atelier</h2>
      <button class="retour" onclick="showAccueil()">⬅ Retour</button>
      <table>
        <thead><tr><th>Ligne</th><th>Total</th><th>Arrêts</th><th>Cadence</th></tr></thead>
        <tbody>`;
  lignes.forEach(l => {
    const ligneData = data[l] || { total: 0, arrets: 0, cadence: 0 };
    html += `<tr><td>${l}</td><td>${ligneData.total || 0}</td><td>${ligneData.arrets || 0}</td><td>${ligneData.cadence || 0}</td></tr>`;
  });
  html += `</tbody></table>
      <canvas id="atelierChart"></canvas>
    </div>`;
  app.innerHTML = html;
  renderAtelierChart();
}

function renderAtelierChart() {
  const ctx = document.getElementById("atelierChart");
  if (!ctx) return;
  const labels = lignes;
  const totals = lignes.map(l => (data[l] ? data[l].total || 0 : 0));
  new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Total colis",
        data: totals,
        backgroundColor: "rgba(12, 117, 255, 0.7)"
      }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });
}

// --- Page Ligne ---
function showLigne(ligne) {
  const ligneData = data[ligne] || { total: 0, cadence: 0 };
  let html = `
    <div class="page">
      <h2>${ligne}</h2>
      <button class="retour" onclick="showAccueil()">⬅ Retour</button>
      <p><strong>Total :</strong> ${ligneData.total} colis</p>
      <p><strong>Cadence moyenne :</strong> ${ligneData.cadence} colis/h</p>

      <input type="number" id="qte" placeholder="Entrer quantité...">
      <input type="number" id="arret" placeholder="Temps d'arrêt (min)...">
      <button onclick="saveLigne('${ligne}')">💾 Enregistrer</button>
      <button onclick="undoLigne('${ligne}')">↩ Annuler dernier</button>
      <button onclick="showAtelier()">📊 Atelier</button>
    </div>
  `;
  app.innerHTML = html;
}

// --- Sauvegarde ligne ---
function saveLigne(ligne) {
  const qte = parseInt(document.getElementById("qte").value) || 0;
  const arret = parseInt(document.getElementById("arret").value) || 0;
  if (!data[ligne]) data[ligne] = { total: 0, arrets: 0, cadence: 0 };
  data[ligne].total += qte;
  data[ligne].arrets += arret;
  data[ligne].cadence = Math.round(data[ligne].total / (data[ligne].arrets + 1));
  localStorage.setItem("syntheseData", JSON.stringify(data));
  showLigne(ligne);
}

// --- Annuler dernier enregistrement ---
function undoLigne(ligne) {
  if (data[ligne] && data[ligne].total > 0) {
    data[ligne].total = Math.max(0, data[ligne].total - 1);
    localStorage.setItem("syntheseData", JSON.stringify(data));
    showLigne(ligne);
  }
}

// --- Calculatrice flottante ---
const calc = {
  el: document.getElementById("calculator"),
  display: document.getElementById("calcDisplay"),
  hidden: true
};
function toggleCalc() {
  const calcDiv = document.getElementById("calculator");
  calcDiv.classList.toggle("hidden");
}
function calcPress(v) {
  calc.display.value += v;
}
function calcEqual() {
  try {
    calc.display.value = eval(calc.display.value);
  } catch {
    calc.display.value = "Erreur";
  }
}
function calcClear() {
  calc.display.value = "";
}

// --- PWA Service Worker ---
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    window.location.reload();
  });
}
