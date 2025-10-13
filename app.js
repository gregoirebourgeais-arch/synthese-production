// === Variables globales ===
let currentLine = null;
let data = JSON.parse(localStorage.getItem("syntheseData")) || {};
let arrets = JSON.parse(localStorage.getItem("arretsData")) || [];
const content = document.getElementById("content");

// === Fonction d'initialisation ===
window.addEventListener("load", () => {
  renderMenu();
  updateDateHeure();
  setInterval(updateDateHeure, 1000);
  registerServiceWorker();
  setupFAB();
  setupCalculator();
});

// === Affichage de la date / heure ===
function updateDateHeure() {
  const el = document.getElementById("dateHeure");
  if (!el) return;
  const now = new Date();
  const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  const semaine = `Semaine ${getWeekNumber(now)}`;
  const heure = now.toLocaleTimeString("fr-FR", { hour12: false });
  el.textContent = `${now.toLocaleDateString("fr-FR", options)} — ${semaine} — ${heure}`;
}

function getWeekNumber(date) {
  const oneJan = new Date(date.getFullYear(), 0, 1);
  const numberOfDays = Math.floor((date - oneJan) / (24 * 60 * 60 * 1000));
  return Math.ceil((numberOfDays + oneJan.getDay() + 1) / 7);
}

// === Menu principal ===
function renderMenu() {
  pageTransition();
  const lignes = ["Râpé", "T2", "RT", "OMORI", "T1", "Sticks", "Emballage", "Dés", "Filets", "Prédécoupé"];
  content.innerHTML = `
    <div class="page fade">
      <h2>Choisir une ligne de production</h2>
      ${lignes.map(l => `<button class="ligne" onclick="openLine('${l}')">${l}</button>`).join("")}
    </div>`;
}

// === Transition de page ===
function pageTransition() {
  content.style.opacity = 0;
  setTimeout(() => (content.style.opacity = 1), 200);
}

// === Ouvrir une ligne ===
function openLine(line) {
  currentLine = line;
  const d = data[line] || [];
  const total = d.reduce((s, x) => s + (x.produits || 0), 0);
  const cadence = d.length ? total / d.length : 0;
  const estimation = cadence > 0 && d.length > 0 ? (1000 / cadence).toFixed(1) : "_";

  content.innerHTML = `
    <div class="page fade">
      <h2>${line}</h2>
      <button class="btn primary" onclick="renderMenu()">⬅️ Retour menu</button>

      <div class="form">
        <label>Heure début :</label>
        <input id="debut" type="time" />
        <label>Heure fin :</label>
        <input id="fin" type="time" />
        <label>Quantité initiale :</label>
        <input id="initiale" type="number" />
        <label>Quantité ajoutée :</label>
        <input id="ajoutee" type="number" />
        <label>Quantité restante :</label>
        <input id="restante" type="number" />
        <label>Minutes d'arrêt :</label>
        <input id="arret" type="number" />

        <label>Cadence manuelle :</label>
        <input id="cadenceManuelle" type="number" placeholder="Saisir cadence manuelle..." />

        <button class="btn primary" onclick="saveData('${line}')">💾 Enregistrer</button>
        <button class="btn ghost" onclick="remiseZero()">🧹 Remise à zéro</button>

        <p id="estimation">⏱️ Estimation fin : ${estimation}</p>
      </div>
    </div>`;
}

// === Sauvegarde des données ===
function saveData(line) {
  const debut = document.getElementById("debut").value;
  const fin = document.getElementById("fin").value;
  const initiale = +document.getElementById("initiale").value || 0;
  const ajoutee = +document.getElementById("ajoutee").value || 0;
  const restante = +document.getElementById("restante").value || 0;
  const arret = +document.getElementById("arret").value || 0;
  const cadenceManuelle = +document.getElementById("cadenceManuelle").value || null;

  const produits = initiale + ajoutee - restante;
  const temps = (new Date(`1970-01-01T${fin}:00`) - new Date(`1970-01-01T${debut}:00`)) / 60000 - arret;
  const cadence = temps > 0 ? produits / (temps / 60) : 0;
  const cadenceFinale = cadenceManuelle || cadence;

  const entry = { date: new Date().toLocaleString(), debut, fin, produits, cadence: cadenceFinale };
  if (!data[line]) data[line] = [];
  data[line].push(entry);
  localStorage.setItem("syntheseData", JSON.stringify(data));
  showToast("✅ Données enregistrées !");
}

// === Remise à zéro ===
function remiseZero() {
  if (!confirm("Voulez-vous vraiment tout remettre à zéro ?")) return;
  const excel = exportExcel();
  localStorage.clear();
  showToast("♻️ Données remises à zéro !");
}

// === Export Excel ===
function exportExcel() {
  const rows = [];
  rows.push(["Ligne", "Date", "Début", "Fin", "Produits", "Cadence"]);
  Object.keys(data).forEach(line => {
    data[line].forEach(d => {
      rows.push([line, d.date, d.debut, d.fin, d.produits, d.cadence]);
    });
  });
  const csv = rows.map(r => r.join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Synthese_${new Date().toLocaleString("fr-FR").replace(/[/:]/g, "-")}.csv`;
  a.click();
  showToast("📊 Export Excel généré !");
}

// === FAB Setup ===
function setupFAB() {
  document.getElementById("fabCalc").addEventListener("click", toggleCalculator);
  document.getElementById("fabExportAll").addEventListener("click", exportExcel);
  document.getElementById("fabArret").addEventListener("click", showArretSheet);
}

// === Calculatrice ===
function setupCalculator() {
  const calc = document.getElementById("calculator");
  const display = document.getElementById("calcDisplay");
  calc.addEventListener("click", e => {
    if (e.target.tagName !== "BUTTON") return;
    const val = e.target.textContent;
    if (val === "=") display.value = eval(display.value || "0");
    else if (val === "C") display.value = "";
    else display.value += val;
  });
}
function toggleCalculator() {
  const calc = document.getElementById("calculator");
  calc.classList.toggle("hidden");
}

// === Module Arrêts ===
function showArretSheet() {
  const line = currentLine || "Atelier";
  const html = `
    <div class="sheet-backdrop" id="sheetBack"></div>
    <div class="sheet show" id="sheetArret">
      <div class="sheet-handle"></div>
      <h3>Nouvel arrêt - ${line}</h3>
      <label>Durée (min):</label>
      <input id="arretDuree" type="number" />
      <label>Cause :</label>
      <input id="arretCause" type="text" />
      <label>Commentaire :</label>
      <textarea id="arretComment"></textarea>
      <div class="sheet-actions">
        <button class="btn ghost" onclick="closeSheet()">Annuler</button>
        <button class="btn primary" onclick="saveArret('${line}')">💾 Sauver</button>
      </div>
    </div>`;
  document.body.insertAdjacentHTML("beforeend", html);
  document.getElementById("sheetBack").addEventListener("click", closeSheet);
}

function closeSheet() {
  document.querySelectorAll(".sheet, .sheet-backdrop").forEach(e => e.remove());
}

function saveArret(line) {
  const duree = +document.getElementById("arretDuree").value || 0;
  const cause = document.getElementById("arretCause").value;
  const commentaire = document.getElementById("arretComment").value;
  arrets.push({
    ligne: line,
    duree,
    cause,
    commentaire,
    date: new Date().toLocaleString("fr-FR")
  });
  localStorage.setItem("arretsData", JSON.stringify(arrets));
  closeSheet();
  showToast("🟠 Arrêt enregistré !");
}

// === Toast ===
function showToast(msg) {
  const t = document.createElement("div");
  t.className = "toast show";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

// === Service Worker ===
function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js");
  }
}
