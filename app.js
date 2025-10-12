// ===============================
// 🌟 SYNTHÈSE PRODUCTION — V14 UX+
// ===============================

// --- Configuration ---
const lignes = ["Râpé", "T2", "RT", "OMORI", "T1", "Sticks", "Emballage", "Dés", "Filets", "Prédécoupé"];
let currentLine = null;
let data = JSON.parse(localStorage.getItem("productionData")) || {};
let graph = null;

// --- ⏰ Horloge ---
function updateClock() {
  const now = new Date();
  const week = getWeekNumber(now);
  const date = now.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" });
  const time = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  document.getElementById("topClock").textContent = `${date} — Semaine ${week} — ${time}`;
}
setInterval(updateClock, 1000); updateClock();

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

// --- 🧭 Menu principal ---
function renderMenu() {
  const menu = document.getElementById("menuButtons");
  menu.innerHTML = "";
  lignes.forEach(l => {
    const b = document.createElement("button");
    b.textContent = l;
    b.onclick = () => openLine(l);
    menu.appendChild(b);
  });
  const atelierBtn = document.createElement("button");
  atelierBtn.textContent = "Atelier";
  atelierBtn.onclick = showAtelier;
  menu.prepend(atelierBtn);
}
renderMenu();

// --- 📄 Page Ligne ---
function openLine(line) {
  currentLine = line;
  const unsaved = JSON.parse(localStorage.getItem(`unsaved_${line}`)) || {};
  const d = data[line] || [];
  const total = d.reduce((s, x) => s + Number(x.quantite || 0), 0);
  const cadence = d.length ? (total / d.length).toFixed(1) : 0;

  const html = `
  <div class="page fade">
    <h2>${line}</h2>
    <button class="secondary" onclick="showAtelier()">🏭 Retour Atelier</button>
    <label>Heure début :</label><input id="debut" type="time" value="${unsaved.debut || getTimeNow()}">
    <label>Heure fin :</label><input id="fin" type="time" value="${unsaved.fin || getTimeNow()}">
    <label>Quantité initiale :</label><input id="q1" type="number" value="${unsaved.q1 || ""}" placeholder="Entrer quantité...">
    <label>Quantité ajoutée :</label><input id="q2" type="number" value="${unsaved.q2 || ""}" placeholder="Ajouter quantité...">
    <label>Quantité restante :</label><input id="reste" type="number" value="${unsaved.reste || ""}" placeholder="Quantité restante...">
    <label>Temps d'arrêt (min):</label><input id="arret" type="number" value="${unsaved.arret || ""}">
    <label>Cause d'arrêt :</label><input id="cause" type="text" value="${unsaved.cause || ""}">
    <label>Commentaire :</label><input id="commentaire" type="text" value="${unsaved.commentaire || ""}">
    <div class="stats">
      <p><b>Total :</b> <span id="total">${total}</span> colis</p>
      <p><b>Cadence moyenne :</b> <span id="cadence">${cadence}</span> colis/h</p>
    </div>
    <div class="boutons">
      <button onclick="enregistrer()">💾 Enregistrer</button>
      <button onclick="annulerDernier()">↩ Annuler dernier</button>
      <button onclick="afficherHistorique()">📜 Historique</button>
      <button onclick="exportExcel('${line}')">📦 Export Excel</button>
      <button onclick="remiseAffichage()">♻ Remise affichage</button>
    </div>
    <canvas id="chartLine"></canvas>
  </div>`;
  document.getElementById("content").innerHTML = html;
  renderGraph(line);

  // Sauvegarde temporaire
  document.querySelectorAll("input").forEach(input => {
    input.addEventListener("input", () => {
      const tmp = {
        debut: document.getElementById("debut").value,
        fin: document.getElementById("fin").value,
        q1: document.getElementById("q1").value,
        q2: document.getElementById("q2").value,
        reste: document.getElementById("reste").value,
        arret: document.getElementById("arret").value,
        cause: document.getElementById("cause").value,
        commentaire: document.getElementById("commentaire").value
      };
      localStorage.setItem(`unsaved_${line}`, JSON.stringify(tmp));
    });
  });
}

// --- 🕐 Heure actuelle ---
function getTimeNow() {
  const n = new Date();
  return n.toLocaleTimeString("fr-FR", { hour12: false, hour: "2-digit", minute: "2-digit" });
}

// --- 📈 Graphique ligne ---
function renderGraph(line) {
  const ctx = document.getElementById("chartLine");
  const d = data[line] || [];
  const labels = d.map(x => x.heure);
  const q = d.map(x => x.quantite);
  const a = d.map(x => x.arret);
  if (graph) graph.destroy();
  graph = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Quantité", data: q, backgroundColor: "rgba(54,162,235,0.7)" },
        { label: "Arrêts (min)", data: a, backgroundColor: "rgba(255,99,132,0.7)" }
      ]
    },
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
  });
}

// --- 💾 Enregistrement ---
function enregistrer() {
  const q1 = +document.getElementById("q1").value || 0;
  const q2 = +document.getElementById("q2").value || 0;
  const quantite = q1 + q2;
  const arret = +document.getElementById("arret").value || 0;
  const cause = document.getElementById("cause").value;
  const commentaire = document.getElementById("commentaire").value;
  const debut = document.getElementById("debut").value;
  const fin = document.getElementById("fin").value;
  const reste = +document.getElementById("reste").value || 0;
  const entry = { quantite, arret, cause, commentaire, debut, fin, reste, heure: getTimeNow() };
  if (!data[currentLine]) data[currentLine] = [];
  data[currentLine].push(entry);
  localStorage.setItem("productionData", JSON.stringify(data));
  localStorage.removeItem(`unsaved_${currentLine}`);
  showToast("✅ Données enregistrées");
  openLine(currentLine);
}

// --- ↩ Annuler dernier ---
function annulerDernier() {
  if (data[currentLine]?.length) {
    data[currentLine].pop();
    localStorage.setItem("productionData", JSON.stringify(data));
    showToast("🗑 Dernier enregistrement annulé");
    openLine(currentLine);
  }
}

// --- 📜 Historique ---
function afficherHistorique() {
  const d = data[currentLine] || [];
  let html = `<h3>Historique — ${currentLine}</h3>`;
  if (!d.length) html += "<p>Aucune donnée.</p>";
  else {
    html += "<table><tr><th>Heure</th><th>Quantité</th><th>Reste</th><th>Arrêt</th><th>Cause</th><th>Commentaire</th><th>Début</th><th>Fin</th></tr>";
    d.forEach(r => {
      html += `<tr><td>${r.heure}</td><td>${r.quantite}</td><td>${r.reste}</td><td>${r.arret}</td><td>${r.cause || "-"}</td><td>${r.commentaire || "-"}</td><td>${r.debut}</td><td>${r.fin}</td></tr>`;
    });
    html += "</table>";
  }
  html += `<button onclick="openLine('${currentLine}')">⬅ Retour</button>`;
  document.getElementById("content").innerHTML = html;
}

// --- ♻ Remise affichage ---
function remiseAffichage() {
  document.querySelectorAll("input").forEach(e => e.value = "");
  localStorage.removeItem(`unsaved_${currentLine}`);
}

// --- 📦 Export CSV (Excel) ---
function exportExcel(line) {
  const d = data[line] || [];
  if (!d.length) return alert("Aucune donnée !");
  const csv = [
    "Heure,Quantité,Reste,Arrêt,Cause,Commentaire,Début,Fin",
    ...d.map(r => `${r.heure},${r.quantite},${r.reste},${r.arret},"${r.cause}","${r.commentaire}",${r.debut},${r.fin}`)
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  const t = new Date().toISOString().replace(/[:T]/g, "-").split(".")[0];
  a.href = URL.createObjectURL(blob);
  a.download = `Synthese_${line}_${t}.csv`;
  a.click();
  showToast("📊 Export Excel créé");
}

// --- 🏭 Atelier ---
function showAtelier() {
  const rows = lignes.map(l => {
    const d = data[l] || [];
    const tot = d.reduce((s, x) => s + Number(x.quantite || 0), 0);
    const arr = d.reduce((s, x) => s + Number(x.arret || 0), 0);
    const cad = d.length ? (tot / d.length).toFixed(1) : 0;
    return `<tr><td>${l}</td><td>${tot}</td><td>${arr}</td><td>${cad}</td></tr>`;
  }).join("");
  const html = `
    <div class="page fade">
      <h2>Atelier</h2>
      <table><tr><th>Ligne</th><th>Total</th><th>Arrêts</th><th>Cadence</th></tr>${rows}</table>
      <canvas id="atelierChart"></canvas>
      <div class="boutons">
        <button onclick="exportAtelier()">📊 Export global</button>
        <button onclick="renderMenu()">⬅ Retour menu</button>
      </div>
    </div>`;
  document.getElementById("content").innerHTML = html;
  renderAtelierGraph();
}

// --- 📊 Graphique Atelier ---
function renderAtelierGraph() {
  const ctx = document.getElementById("atelierChart");
  const totals = lignes.map(l => (data[l] || []).reduce((s, x) => s + Number(x.quantite || 0), 0));
  if (graph) graph.destroy();
  graph = new Chart(ctx, {
    type: "bar",
    data: {
      labels: lignes,
      datasets: [{ label: "Total colis", data: totals, backgroundColor: "rgba(54,162,235,0.7)" }]
    },
    options: { indexAxis: "y", responsive: true }
  });
}

// --- 📊 Export global ---
function exportAtelier() {
  const rows = lignes.map(l => {
    const d = data[l] || [];
    const tot = d.reduce((s, x) => s + Number(x.quantite || 0), 0);
    const arr = d.reduce((s, x) => s + Number(x.arret || 0), 0);
    const cad = d.length ? (tot / d.length).toFixed(1) : 0;
    return `${l},${tot},${arr},${cad}`;
  });
  const csv = ["Ligne,Total,Arrêts,Cadence", ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `Synthese_Atelier_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  showToast("📦 Export global créé");
}

// --- 🧮 Calculatrice ---
function toggleCalc() { document.getElementById("calculator").classList.toggle("hidden"); }
function calcPress(v) { document.getElementById("calcDisplay").value += v; }
function calcEqual() {
  try { document.getElementById("calcDisplay").value = eval(document.getElementById("calcDisplay").value); }
  catch { document.getElementById("calcDisplay").value = "Erreur"; }
}
function calcClear() { document.getElementById("calcDisplay").value = ""; }

// --- ✅ Toast Notification ---
function showToast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add("show"), 10);
  setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 500); }, 2500);
}

// --- 🧩 PWA Service Worker ---
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
  navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload());
}

// --- 🌫 Effet fondu ---
document.addEventListener("click", (e) => {
  if (e.target.tagName === "BUTTON" && e.target.closest(".menu, .boutons")) {
    const section = document.getElementById("content");
    section.style.opacity = 0;
    setTimeout(() => { section.style.opacity = 1; }, 200);
  }
});
