// -------------------------------
// ⚙️ Données globales
// -------------------------------
const lignes = ["Râpé", "T2", "RT", "OMORI", "T1", "Sticks", "Emballage", "Dés", "Filets", "Prédécoupé"];
let currentLine = null;
let startTimes = JSON.parse(localStorage.getItem("startTimes")) || {};
let data = JSON.parse(localStorage.getItem("productionData")) || {};
let graph = null;

// -------------------------------
// 🕐 Horloge
// -------------------------------
function updateClock() {
  const now = new Date();
  const day = now.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  const week = getWeekNumber(now);
  const time = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  document.getElementById("topClock").textContent = `${day} — Semaine ${week} — ${time}`;
}
setInterval(updateClock, 1000);
updateClock();

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

// -------------------------------
// 🧭 Menu principal
// -------------------------------
function renderMenu() {
  const menu = document.getElementById("menuButtons");
  menu.innerHTML = "";
  lignes.forEach(line => {
    const btn = document.createElement("button");
    btn.textContent = line;
    btn.onclick = () => openLine(line);
    menu.appendChild(btn);
  });
  const atelierBtn = document.createElement("button");
  atelierBtn.textContent = "Atelier";
  atelierBtn.onclick = showAtelier;
  menu.prepend(atelierBtn);
}
renderMenu();

// -------------------------------
// 📄 Page d’une ligne
// -------------------------------
function openLine(line) {
  currentLine = line;
  const c = document.getElementById("content");
  const d = data[line] || [];
  const total = d.reduce((sum, x) => sum + Number(x.quantite || 0), 0);
  const cadenceMoy = d.length ? (total / (d.length || 1)).toFixed(1) : 0;

  const html = `
  <div class="page">
    <h2>${line}</h2>
    <label>Heure début :</label><input id="debut" type="time" value="${getHeureDebut(line)}">
    <label>Heure fin :</label><input id="fin" type="time" value="${getHeureActuelle()}">
    <label>Quantité 1 :</label><input id="q1" type="number" placeholder="Entrer quantité..." />
    <label>Quantité 2 :</label><input id="q2" type="number" placeholder="Ajouter quantité..." />
    <label>Temps d'arrêt (min):</label><input id="arret" type="number" />
    <label>Cause d'arrêt :</label><input id="cause" type="text" placeholder="Cause d'arrêt..." />
    <label>Commentaire :</label><input id="commentaire" type="text" placeholder="Commentaire..." />
    <label>Quantité restante :</label><input id="reste" type="number" placeholder="Quantité restante..." />
    <div class="stats">
      <p><b>Total :</b> <span id="total">${total}</span> colis</p>
      <p><b>Cadence moyenne :</b> <span id="cadence">${cadenceMoy}</span> colis/h</p>
    </div>
    <div class="boutons">
      <button onclick="enregistrer()">💾 Enregistrer</button>
      <button onclick="annulerDernier()">↩️ Annuler dernier</button>
      <button onclick="afficherHistorique()">📜 Historique</button>
      <button onclick="exportExcel('${line}')">📦 Export Excel</button>
      <button onclick="remiseAffichage()">♻️ Remise à zéro (affichage)</button>
      <button onclick="showAtelier()">🏭 Retour Atelier</button>
    </div>
    <canvas id="chartLine"></canvas>
  </div>`;
  c.innerHTML = html;
  renderGraph(line);
}

function getHeureDebut(line) {
  if (!startTimes[line]) startTimes[line] = new Date().toISOString();
  return new Date(startTimes[line]).toLocaleTimeString("fr-FR", { hour12: false, hour: "2-digit", minute: "2-digit" });
}
function getHeureActuelle() {
  const now = new Date();
  return now.toLocaleTimeString("fr-FR", { hour12: false, hour: "2-digit", minute: "2-digit" });
}

// -------------------------------
// 📈 Graphique de ligne
// -------------------------------
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

// -------------------------------
// 💾 Enregistrer / Annuler
// -------------------------------
function enregistrer() {
  const q1 = Number(document.getElementById("q1").value) || 0;
  const q2 = Number(document.getElementById("q2").value) || 0;
  const quantite = q1 + q2;
  const arret = Number(document.getElementById("arret").value) || 0;
  const cause = document.getElementById("cause").value;
  const commentaire = document.getElementById("commentaire").value;
  const debut = document.getElementById("debut").value;
  const fin = document.getElementById("fin").value;

  const entry = {
    quantite, arret, cause, commentaire, debut, fin,
    heure: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  };

  if (!data[currentLine]) data[currentLine] = [];
  data[currentLine].push(entry);
  localStorage.setItem("productionData", JSON.stringify(data));
  localStorage.setItem("startTimes", JSON.stringify(startTimes));

  document.getElementById("q2").value = "";
  document.getElementById("arret").value = "";
  renderGraph(currentLine);
  openLine(currentLine);
}

function annulerDernier() {
  if (data[currentLine]?.length) {
    data[currentLine].pop();
    localStorage.setItem("productionData", JSON.stringify(data));
    openLine(currentLine);
  }
}

// -------------------------------
// 🕓 Historique
// -------------------------------
function afficherHistorique() {
  const d = data[currentLine] || [];
  let html = `<h3>Historique — ${currentLine}</h3>`;
  if (!d.length) html += "<p>Aucune donnée enregistrée.</p>";
  else {
    html += "<table><tr><th>Heure</th><th>Quantité</th><th>Arrêt</th><th>Cause</th><th>Commentaire</th><th>Début</th><th>Fin</th></tr>";
    d.forEach(r => {
      html += `<tr><td>${r.heure}</td><td>${r.quantite}</td><td>${r.arret}</td><td>${r.cause || "-"}</td><td>${r.commentaire || "-"}</td><td>${r.debut || "-"}</td><td>${r.fin || "-"}</td></tr>`;
    });
    html += "</table>";
  }
  document.getElementById("content").innerHTML = html + `<button onclick="openLine('${currentLine}')">⬅️ Retour</button>`;
}

// -------------------------------
// ♻️ Remise affichage
// -------------------------------
function remiseAffichage() {
  document.querySelectorAll("input").forEach(el => el.value = "");
}

// -------------------------------
// 🧮 Calculatrice
// -------------------------------
function toggleCalc() {
  document.getElementById("calculator").classList.toggle("hidden");
}
function calcPress(v) {
  document.getElementById("calcDisplay").value += v;
}
function calcEqual() {
  try { document.getElementById("calcDisplay").value = eval(document.getElementById("calcDisplay").value); }
  catch { document.getElementById("calcDisplay").value = "Erreur"; }
}
function calcClear() { document.getElementById("calcDisplay").value = ""; }
document.getElementById("fabCalc").onclick = toggleCalc;

// -------------------------------
// 🏭 Page Atelier
// -------------------------------
function showAtelier() {
  const c = document.getElementById("content");
  const rows = lignes.map(line => {
    const d = data[line] || [];
    const total = d.reduce((s, x) => s + Number(x.quantite || 0), 0);
    const arrets = d.reduce((s, x) => s + Number(x.arret || 0), 0);
    const cadence = d.length ? (total / (d.length || 1)).toFixed(1) : 0;
    return `<tr><td>${line}</td><td>${total}</td><td>${arrets}</td><td>${cadence}</td></tr>`;
  }).join("");

  c.innerHTML = `
    <div class="page">
      <h2>Atelier</h2>
      <table><tr><th>Ligne</th><th>Total</th><th>Arrêts</th><th>Cadence</th></tr>${rows}</table>
      <canvas id="atelierChart"></canvas>
      <div class="boutons">
        <button onclick="exportAtelier()">📊 Export Global</button>
        <button onclick="renderMenu()">⬅️ Retour menu</button>
      </div>
    </div>`;
  renderAtelierGraph();
}

function renderAtelierGraph() {
  const ctx = document.getElementById("atelierChart");
  const labels = lignes;
  const totals = lignes.map(l => (data[l] || []).reduce((s, x) => s + Number(x.quantite || 0), 0));
  if (graph) graph.destroy();
  graph = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets: [{ label: "Total colis", data: totals, backgroundColor: "rgba(54,162,235,0.7)" }] },
    options: { indexAxis: "y", responsive: true }
  });
}

// -------------------------------
// 📦 Export
// -------------------------------
function exportExcel(line) {
  const d = data[line] || [];
  if (!d.length) return alert("Aucune donnée à exporter !");
  const csv = [
    "Heure,Quantité,Arrêt (min),Cause,Commentaire,Début,Fin",
    ...d.map(r => `${r.heure},${r.quantite},${r.arret},"${r.cause || ""}","${r.commentaire || ""}",${r.debut},${r.fin}`)
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const now = new Date();
  const timestamp = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}_${now.getHours()}h${now.getMinutes()}`
  a.href = url;
  a.download = `Synthese_${line}_${timestamp}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportAtelier() {
  const rows = lignes.map(line => {
    const d = data[line] || [];
    const total = d.reduce((s, x) => s + Number(x.quantite || 0), 0);
    const arrets = d.reduce((s, x) => s + Number(x.arret || 0), 0);
    const cadence = d.length ? (total / (d.length || 1)).toFixed(1) : 0;
    return `${line},${total},${arrets},${cadence}`;
  });
  const csv = ["Ligne,Total,Arrêts,Cadence", ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Synthese_Atelier_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// -------------------------------
// 💡 PWA : prompt d’installation forcé
// -------------------------------
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = document.createElement('button');
  btn.textContent = "📲 Installer Synthèse Production";
  btn.className = "install-btn";
  btn.onclick = async () => {
    btn.remove();
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") console.log("PWA installée ✅");
    deferredPrompt = null;
  };
  document.body.appendChild(btn);
});
