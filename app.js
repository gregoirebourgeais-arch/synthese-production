// === 📦 Données locales ===
let data = JSON.parse(localStorage.getItem("syntheseData")) || {};
let currentLine = null;

// === ⏰ Horloge + semaine ===
function updateClock() {
  const now = new Date();
  const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  const dateStr = now.toLocaleDateString("fr-FR", options);
  const timeStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const week = Math.ceil((now.getDate() - now.getDay() + 1) / 7);
  document.getElementById("topClock").innerText = `${dateStr} — Semaine ${week} — ${timeStr}`;
}
setInterval(updateClock, 1000);
updateClock();

// === ✨ Transition visuelle ===
function pageTransition() {
  const content = document.getElementById("content");
  content.classList.remove("fade");
  void content.offsetWidth;
  content.classList.add("fade");
}

// === 🏠 Menu principal ===
function renderMenu() {
  pageTransition();
  document.getElementById("content").innerHTML = `
    <div class="page fade">
      <h2>Accueil</h2>
      <p>Choisissez une ligne :</p>
      <div class="menu-lignes">
        ${["Atelier", "Râpé", "T2", "RT", "OMORI", "T1", "Sticks", "Emballage", "Dés", "Filets", "Prédécoupé"]
          .map(l => `<button onclick="openLine('${l}')">${l}</button>`)
          .join("")}
      </div>
    </div>
  `;
}

// === 🔙 Retour menu ===
function returnToMenu() {
  currentLine = null;
  renderMenu();
}

// === 📉 Calcul estimation temps restant ===
function calculEstimation(reste, cadence) {
  if (cadence > 0 && reste > 0) {
    const heures = reste / cadence;
    const fin = new Date(Date.now() + heures * 3600000);
    return fin.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }
  return "-";
}

// === 📊 Ouvrir une ligne ===
function openLine(line) {
  pageTransition();
  currentLine = line;
  const d = data[line] || [];
  const total = d.reduce((s, x) => s + (Number(x.quantite) || 0), 0);
  const cadence = d.length ? (total / d.length).toFixed(1) : 0;

  const unsaved = JSON.parse(localStorage.getItem("syntheseData") || "{}");
  const reste = unsaved.reste ? +unsaved.reste : 0;
  const estimation = calculEstimation(reste, cadence);

  const html = `
    <div class="page fade">
      <h2>${line}</h2>
      <button class="retour-menu" onclick="returnToMenu()">⬅ Retour menu</button>

      <div class="stats">
        <p><b>Total :</b> <span id="total">${total}</span> colis</p>
        <p><b>Cadence moyenne :</b> <span id="cadence">${cadence}</span> colis/h</p>
        <p><b>Estimation fin :</b> <span id="estimation">${estimation}</span></p>
      </div>

      <label>Cadence manuelle :</label>
      <input id="cadenceManuelle" type="number" placeholder="Saisir cadence manuelle..." />
      <button onclick="remiseCadence()">🔄 Remise à zéro cadence</button>

      <label>Quantité :</label>
      <input id="quantite" type="number" placeholder="Colis produits..." />
      <label>Arrêts :</label>
      <input id="arrets" type="number" placeholder="Nombre d'arrêts..." />
      <label>Commentaires :</label>
      <textarea id="commentaires" placeholder="Ajouter un commentaire..."></textarea>

      <div class="boutons">
        <button onclick="saveData()">💾 Enregistrer</button>
        <button onclick="exportExcel()">📤 Exporter</button>
      </div>

      <div id="graphique"></div>
    </div>
  `;
  document.getElementById("content").innerHTML = html;
  renderChart(line, d);
}

// === 💾 Enregistrer les données ===
function saveData() {
  if (!currentLine) return;
  const quantite = +document.getElementById("quantite").value || 0;
  const arrets = +document.getElementById("arrets").value || 0;
  const commentaires = document.getElementById("commentaires").value || "";
  const cadenceManuelle = +document.getElementById("cadenceManuelle").value || 0;

  if (!data[currentLine]) data[currentLine] = [];

  const date = new Date().toLocaleDateString("fr-FR");
  const heure = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  const tmp = {
    date,
    heure,
    quantite,
    arrets,
    commentaires,
    cadenceManuelle
  };

  data[currentLine].push(tmp);
  localStorage.setItem("syntheseData", JSON.stringify(data));

  openLine(currentLine);
}

// === 🔁 Remise à zéro cadence ===
function remiseCadence() {
  const input = document.getElementById("cadenceManuelle");
  if (input) input.value = "";
  alert("Cadence manuelle remise à zéro !");
}

// === 📈 Graphique ===
function renderChart(line, d) {
  const ctxId = "chartCanvas";
  document.getElementById("graphique").innerHTML = `<canvas id="${ctxId}"></canvas>`;
  const ctx = document.getElementById(ctxId).getContext("2d");

  const quantites = d.map(x => x.quantite);
  const labels = d.map((_, i) => i + 1);

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: "Quantité",
        data: quantites,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

// === 📤 Export Excel ===
function exportExcel() {
  const wsData = [["Ligne", "Date", "Heure", "Quantité", "Arrêts", "Commentaires", "Cadence manuelle"]];
  for (const [line, entries] of Object.entries(data)) {
    entries.forEach(e =>
      wsData.push([line, e.date, e.heure, e.quantite, e.arrets, e.commentaires, e.cadenceManuelle || ""])
    );
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Synthèse");

  const now = new Date();
  const heure = now.toTimeString().split(" ")[0].replace(/:/g, "-");
  XLSX.writeFile(wb, `Synthese_${now.toLocaleDateString("fr-FR")}_${heure}.xlsx`);
}

// === 🧮 Calculatrice flottante ===
const calcDiv = document.getElementById("calculator");
let calcValue = "";
function calcPress(val) {
  calcValue += val;
  document.getElementById("calcDisplay").value = calcValue;
}
function calcEqual() {
  try {
    calcValue = eval(calcValue).toString();
    document.getElementById("calcDisplay").value = calcValue;
  } catch {
    calcValue = "";
    document.getElementById("calcDisplay").value = "Erreur";
  }
}
function calcClear() {
  calcValue = "";
  document.getElementById("calcDisplay").value = "";
}
function toggleCalc() {
  calcDiv.classList.toggle("hidden");
}

// === 🚀 Initialisation ===
renderMenu();
