/* ================================
   APP V19 - Synthèse Production
   ================================ */

// === Données globales ===
let productionData = JSON.parse(localStorage.getItem("productionData")) || {};
let arretsData = JSON.parse(localStorage.getItem("arretsData")) || {};
let currentLine = null;

// === Initialisation ===
document.addEventListener("DOMContentLoaded", () => {
  showMenu();
  updateClock();
  setInterval(updateClock, 1000);
});

// === Horloge ===
function updateClock() {
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const week = getWeekNumber(now);
  document.getElementById("topClock").innerHTML =
    `${now.toLocaleDateString('fr-FR', options)} — Semaine ${week} — ${now.toLocaleTimeString()}`;
}
function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
}

// === Navigation ===
function showMenu() {
  const content = document.getElementById("content");
  content.innerHTML = `
    <h2>Choisir une ligne de production</h2>
    ${["Râpé","T2","RT","OMORI","T1","Sticks","Emballage","Dés","Filets","Prédécoupé"]
      .map(line => `<button class="bouton-principal" onclick="openLine('${line}')">${line}</button>`)
      .join('')}
    <button class="bouton-principal" onclick="showAtelier()">🏭 Vue Atelier</button>
    <button class="bouton-principal danger" onclick="remiseTotale()">🧹 Remise totale (export + reset)</button>
  `;
}

function openLine(line) {
  currentLine = line;
  const data = productionData[line] || [];
  document.getElementById("content").innerHTML = `
    <h2>Ligne ${line}</h2>
    <label>Heure début :</label>
    <input id="startTime" type="time" />
    <label>Heure fin :</label>
    <input id="endTime" type="time" />
    <label>Quantité (colis) :</label>
    <input id="quantity" type="number" placeholder="Quantité réalisée..." />
    <label>Cadence manuelle (colis/h) :</label>
    <input id="cadenceManuelle" type="number" placeholder="Saisir cadence manuelle..." />
    <label>Arrêts (min) :</label>
    <input id="arrets" type="number" placeholder="Temps d'arrêt (min)..." />
    <label>Commentaires :</label>
    <textarea id="commentaire" placeholder="Observation / remarque..."></textarea>

    <button class="bouton-principal" onclick="saveProduction('${line}')">💾 Enregistrer</button>
    <button class="bouton-principal" onclick="undoLast('${line}')">↩️ Annuler dernier enregistrement</button>
    <button class="bouton-principal" onclick="showHistory('${line}')">📜 Historique</button>
    <button class="bouton-principal" onclick="ouvrirArrets('${line}')">⏸️ Enregistrer un arrêt</button>
    <button class="retour-menu" onclick="showMenu()">⬅️ Retour menu</button>

    <div class="stats">
      <p><b>Cadence moyenne :</b> <span id="avgCadence">0</span> colis/h</p>
      <p><b>Quantité totale :</b> <span id="totalQty">0</span> colis</p>
    </div>
    <canvas id="chartLine" height="120"></canvas>
  `;

  updateChart(line);
  refreshStats(line);
}

function showAtelier() {
  const content = document.getElementById("content");
  content.innerHTML = `<h2>Vue Atelier</h2>
    <div id="atelierTable"></div>
    <button class="bouton-principal" onclick="exportAll()">📦 Export global Excel</button>
    <button class="bouton-principal danger" onclick="remiseTotale()">🧹 Remise totale</button>
    <button class="retour-menu" onclick="showMenu()">⬅️ Retour menu</button>
  `;
  updateAtelierTable();
}

function updateAtelierTable() {
  let html = `<table><tr><th>Ligne</th><th>Quantité</th><th>Cadence</th></tr>`;
  for (let line in productionData) {
    const data = productionData[line];
    const total = data.reduce((s, r) => s + r.qty, 0);
    const avg = data.length ? (data.reduce((s, r) => s + r.cadence, 0) / data.length).toFixed(1) : 0;
    html += `<tr><td>${line}</td><td>${total}</td><td>${avg}</td></tr>`;
  }
  html += `</table>`;
  document.getElementById("atelierTable").innerHTML = html;
}

/* === Production === */
function saveProduction(line) {
  const start = document.getElementById("startTime").value;
  const end = document.getElementById("endTime").value;
  const qty = parseInt(document.getElementById("quantity").value || 0);
  const cadenceManuelle = parseFloat(document.getElementById("cadenceManuelle").value || 0);
  const arrets = parseFloat(document.getElementById("arrets").value || 0);
  const commentaire = document.getElementById("commentaire").value || "";

  if (!start || !end || qty <= 0) return alert("Merci de compléter les champs obligatoires.");

  const startDate = new Date(`1970-01-01T${start}:00`);
  const endDate = new Date(`1970-01-01T${end}:00`);
  let diff = (endDate - startDate) / 3600000;
  if (diff <= 0) diff += 24;

  const autoCadence = qty / diff;
  const cadence = cadenceManuelle > 0 ? cadenceManuelle : autoCadence;

  const record = {
    date: new Date().toLocaleDateString("fr-FR"),
    heure: new Date().toLocaleTimeString("fr-FR"),
    start, end, qty, cadence, arrets, commentaire
  };

  if (!productionData[line]) productionData[line] = [];
  productionData[line].push(record);
  localStorage.setItem("productionData", JSON.stringify(productionData));

  alert(`✅ Enregistrement effectué pour ${line}`);
  openLine(line);
}

function undoLast(line) {
  if (!productionData[line] || productionData[line].length === 0) return;
  productionData[line].pop();
  localStorage.setItem("productionData", JSON.stringify(productionData));
  alert("Dernier enregistrement supprimé.");
  openLine(line);
}

/* === Historique === */
function showHistory(line) {
  const data = productionData[line] || [];
  if (!data.length) return alert("Aucun enregistrement trouvé.");
  const content = document.getElementById("content");
  content.innerHTML = `
    <h2>Historique - ${line}</h2>
    <table><tr><th>Date</th><th>Début</th><th>Fin</th><th>Qty</th><th>Cadence</th><th>Arrêts</th><th>Commentaire</th></tr>
      ${data.map(d => `<tr><td>${d.date}</td><td>${d.start}</td><td>${d.end}</td><td>${d.qty}</td><td>${d.cadence.toFixed(1)}</td><td>${d.arrets}</td><td>${d.commentaire}</td></tr>`).join("")}
    </table>
    <button class="bouton-principal" onclick="exportLine('${line}')">📦 Export ${line}</button>
    <button class="retour-menu" onclick="openLine('${line}')">⬅️ Retour ligne</button>
  `;
}

function refreshStats(line) {
  const data = productionData[line] || [];
  const total = data.reduce((sum, r) => sum + r.qty, 0);
  const avg = data.length ? (data.reduce((s, r) => s + r.cadence, 0) / data.length).toFixed(1) : 0;
  document.getElementById("avgCadence").textContent = avg;
  document.getElementById("totalQty").textContent = total;
}

/* === Graphiques === */
function updateChart(line) {
  const ctx = document.getElementById("chartLine");
  const data = productionData[line] || [];
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: data.map(d => d.start),
      datasets: [{
        label: "Cadence (colis/h)",
        data: data.map(d => d.cadence),
        borderWidth: 1
      }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });
}

/* === Exports === */
function exportLine(line) {
  const ws = XLSX.utils.json_to_sheet(productionData[line] || []);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, line);
  XLSX.writeFile(wb, `${line}_Production_${new Date().toLocaleString("fr-FR").replace(/[/: ]/g, "_")}.xlsx`);
}

function exportAll() {
  const wb = XLSX.utils.book_new();
  for (let line in productionData) {
    const ws = XLSX.utils.json_to_sheet(productionData[line]);
    XLSX.utils.book_append_sheet(wb, ws, line);
  }
  XLSX.writeFile(wb, `Synthese_Atelier_${new Date().toLocaleString("fr-FR").replace(/[/: ]/g, "_")}.xlsx`);
}

/* === Module Arrêts === */
function ouvrirArrets(line) {
  currentLine = line;
  const content = document.getElementById("content");
  content.innerHTML = `
    <h2>⏸️ Arrêts - ${line}</h2>
    <label>Durée (min) :</label>
    <input id="dureeArret" type="number" placeholder="Durée de l'arrêt..." />
    <label>Cause :</label>
    <select id="causeArret">
      <option value="Maintenance">Maintenance</option>
      <option value="Changement format">Changement format</option>
      <option value="Panne">Panne</option>
      <option value="Autre">Autre</option>
    </select>
    <label>Commentaire :</label>
    <textarea id="commentaireArret" placeholder="Détails..."></textarea>
    <button class="bouton-principal" onclick="saveArret('${line}')">💾 Enregistrer l'arrêt</button>
    <button class="bouton-principal" onclick="showArrets('${line}')">📜 Historique des arrêts</button>
    <button class="retour-menu" onclick="openLine('${line}')">⬅️ Retour ligne</button>
  `;
}

function saveArret(line) {
  const duree = parseInt(document.getElementById("dureeArret").value || 0);
  const cause = document.getElementById("causeArret").value;
  const commentaire = document.getElementById("commentaireArret").value;
  if (duree <= 0) return alert("Durée obligatoire.");
  const arret = {
    date: new Date().toLocaleDateString("fr-FR"),
    heure: new Date().toLocaleTimeString("fr-FR"),
    ligne: line,
    duree, cause, commentaire
  };
  if (!arretsData[line]) arretsData[line] = [];
  arretsData[line].push(arret);
  localStorage.setItem("arretsData", JSON.stringify(arretsData));
  alert("✅ Arrêt enregistré !");
  ouvrirArrets(line);
}

function showArrets(line) {
  const data = arretsData[line] || [];
  if (!data.length) return alert("Aucun arrêt enregistré.");
  const content = document.getElementById("content");
  content.innerHTML = `
    <h2>Historique Arrêts - ${line}</h2>
    <table><tr><th>Date</th><th>Heure</th><th>Durée</th><th>Cause</th><th>Commentaire</th></tr>
    ${data.map(d => `<tr><td>${d.date}</td><td>${d.heure}</td><td>${d.duree}</td><td>${d.cause}</td><td>${d.commentaire}</td></tr>`).join("")}
    </table>
    <button class="bouton-principal" onclick="exportArrets('${line}')">📦 Export arrêts ${line}</button>
    <button class="retour-menu" onclick="ouvrirArrets('${line}')">⬅️ Retour</button>
  `;
}

function exportArrets(line) {
  const ws = XLSX.utils.json_to_sheet(arretsData[line] || []);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Arrets_" + line);
  XLSX.writeFile(wb, `Arrets_${line}_${new Date().toLocaleString("fr-FR").replace(/[/: ]/g, "_")}.xlsx`);
}

/* === Remise totale === */
function remiseTotale() {
  if (!confirm("⚠️ Confirmer la remise à zéro complète ? Les données seront exportées avant suppression.")) return;
  const wb = XLSX.utils.book_new();
  // Production
  for (let line in productionData) {
    const ws = XLSX.utils.json_to_sheet(productionData[line]);
    XLSX.utils.book_append_sheet(wb, ws, line);
  }
  // Arrêts
  for (let line in arretsData) {
    const ws = XLSX.utils.json_to_sheet(arretsData[line]);
    XLSX.utils.book_append_sheet(wb, ws, "Arrets_" + line);
  }
  XLSX.writeFile(wb, `Synthese_Complet_${new Date().toLocaleString("fr-FR").replace(/[/: ]/g, "_")}.xlsx`);
  localStorage.removeItem("productionData");
  localStorage.removeItem("arretsData");
  alert("✅ Données exportées et application remise à zéro.");
  productionData = {};
  arretsData = {};
  showMenu();
}

/* === Calculatrice === */
let calcValue = "";
function toggleCalc() {
  const calc = document.getElementById("calculator");
  calc.style.display = calc.style.display === "none" || !calc.style.display ? "block" : "none";
}
function calcPress(val) {
  calcValue += val;
  document.getElementById("calcDisplay").value = calcValue;
}
function calcEqual() {
  try {
    calcValue = eval(calcValue).toString();
    document.getElementById("calcDisplay").value = calcValue;
  } catch { alert("Erreur"); }
}
function calcClear() {
  calcValue = "";
  document.getElementById("calcDisplay").value = "";
/* === Bouton flottant Arrêt global === */
document.addEventListener("DOMContentLoaded", () => {
  const fabArret = document.getElementById("fabArret");
  if (fabArret) {
    fabArret.addEventListener("click", () => {
      if (!currentLine) {
        alert("📋 Choisissez d'abord une ligne pour enregistrer un arrêt.");
      } else {
        ouvrirArrets(currentLine);
      }
    });
  }
});
    }
