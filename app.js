// === Variables globales ===
let data = JSON.parse(localStorage.getItem("productionData") || "{}");
let currentLine = null;
let calcValue = "";
let chart = null;

// === Horloge ===
function updateClock() {
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const semaine = `Semaine ${Math.ceil(now.getDate() / 7)}`;
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  document.getElementById("topClock").innerText = `${now.toLocaleDateString('fr-FR', options)} — ${semaine} — ${time}`;
}
setInterval(updateClock, 1000);
updateClock();

// === Transition de page ===
function pageTransition() {
  const content = document.getElementById("content");
  content.classList.remove("fade");
  void content.offsetWidth;
  content.classList.add("fade");
}

// === Menu principal ===
function renderMenu() {
  pageTransition();
  const lignes = ["Atelier", "Râpé", "T2", "RT", "OMORI", "T1", "Sticks", "Emballage", "Dés", "Filets", "Prédécoupé"];
  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="menu-lignes page">
      <h2>Atelier</h2>
      ${lignes.map(l => `<button onclick="openLine('${l}')">${l}</button>`).join("")}
    </div>
  `;
}

// === Ouvrir une ligne ===
function openLine(line) {
  pageTransition();
  currentLine = line;
  const d = data[line] || [];

  const total = d.reduce((s, x) => s + (parseFloat(x.total) || 0), 0);
  const cadence = d.length ? (total / d.length).toFixed(1) : 0;
  const unsaved = JSON.parse(localStorage.getItem("unsaved_" + line) || "{}");
  const reste = unsaved.reste ? +unsaved.reste : 0;
  const estimation = cadence > 0 && reste > 0 ? `${(reste / cadence).toFixed(1)} h` : "-";

  const html = `
    <div class="page fade">
      <h2>${line}</h2>
      <button class="retour-menu" onclick="renderMenu()">⬅️ Retour menu</button>

      <label>Heure début :</label>
      <input id="debut" type="time" />

      <label>Heure fin :</label>
      <input id="fin" type="time" />

      <label>Quantité initiale :</label>
      <input id="init" type="number" placeholder="Saisir quantité initiale" />

      <label>Quantité ajoutée :</label>
      <input id="ajout" type="number" placeholder="Saisir quantité ajoutée" />

      <label>Quantité restante :</label>
      <input id="reste" type="number" placeholder="Saisir quantité restante" value="${reste}" />

      <label>Temps d'arrêt (min) :</label>
      <input id="arret" type="number" placeholder="Durée arrêt" />

      <label>Cause d'arrêt :</label>
      <input id="cause" type="text" placeholder="Commentaire..." />

      <label>Cadence manuelle :</label>
      <input id="cadenceManuelle" type="number" placeholder="Saisir cadence manuelle..." />

      <button class="bouton-principal" onclick="enregistrer()">💾 Enregistrer</button>
      <button class="bouton-principal" onclick="remiseCadence()">🔄 Remise à zéro cadence</button>
      <button class="bouton-principal" onclick="exportExcel('${line}')">📦 Export Excel</button>
      <button class="bouton-principal" onclick="showAtelier()">🏭 Vue Atelier</button>

      <div class="stats">
        <p><b>Total :</b> ${total}</p>
        <p><b>Cadence :</b> ${cadence} colis/h</p>
        <p><b>Estimation fin :</b> ${estimation}</p>
      </div>
    </div>
  `;
  document.getElementById("content").innerHTML = html;
}

// === Enregistrer une ligne ===
function enregistrer() {
  const line = currentLine;
  if (!line) return;

  const debut = document.getElementById("debut").value;
  const fin = document.getElementById("fin").value;
  const init = +document.getElementById("init").value || 0;
  const ajout = +document.getElementById("ajout").value || 0;
  const reste = +document.getElementById("reste").value || 0;
  const arret = +document.getElementById("arret").value || 0;
  const cause = document.getElementById("cause").value || "";
  const cadenceManuelle = +document.getElementById("cadenceManuelle").value || null;

  const total = init + ajout - reste;
  const record = { debut, fin, init, ajout, reste, arret, cause, total, cadence: cadenceManuelle || 0 };

  if (!data[line]) data[line] = [];
  data[line].push(record);
  localStorage.setItem("productionData", JSON.stringify(data));
  localStorage.setItem("unsaved_" + line, JSON.stringify({ reste }));

  alert(`✅ Enregistrement effectué sur ${line}`);
  openLine(line);
}

// === Remise à zéro cadence ===
function remiseCadence() {
  if (!currentLine) return;
  if (confirm("Remettre la cadence à zéro ?")) {
    data[currentLine] = [];
    localStorage.setItem("productionData", JSON.stringify(data));
    openLine(currentLine);
  }
}

// === Vue Atelier ===
function showAtelier() {
  pageTransition();
  const content = document.getElementById("content");
  const lignes = Object.keys(data);
  if (lignes.length === 0) {
    content.innerHTML = "<h2>Atelier</h2><p>Aucune donnée enregistrée</p>";
    return;
  }

  const lignesHTML = lignes.map(l => {
    const d = data[l] || [];
    const total = d.reduce((s, x) => s + (parseFloat(x.total) || 0), 0);
    const cadence = d.length ? (total / d.length).toFixed(1) : 0;
    return `<tr><td>${l}</td><td>${total}</td><td>${cadence}</td></tr>`;
  }).join("");

  const globalCadence = (
    lignes.reduce((sum, l) => {
      const d = data[l] || [];
      const total = d.reduce((s, x) => s + (parseFloat(x.total) || 0), 0);
      return sum + (d.length ? total / d.length : 0);
    }, 0) / lignes.length
  ).toFixed(1);

  content.innerHTML = `
    <div class="page fade">
      <h2>Atelier</h2>
      <button class="retour-menu" onclick="renderMenu()">⬅️ Retour menu</button>
      <table>
        <tr><th>Ligne</th><th>Total</th><th>Cadence</th></tr>
        ${lignesHTML}
      </table>
      <div class="stats"><b>Cadence moyenne globale :</b> ${globalCadence} colis/h</div>
      <canvas id="atelierChart" height="250"></canvas>
    </div>
  `;

  const ctx = document.getElementById("atelierChart").getContext("2d");
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: lignes,
      datasets: [{
        label: "Cadence moyenne",
        data: lignes.map(l => {
          const d = data[l] || [];
          const total = d.reduce((s, x) => s + (parseFloat(x.total) || 0), 0);
          return d.length ? (total / d.length).toFixed(1) : 0;
        }),
        backgroundColor: "#007bff"
      }]
    },
    options: {
      scales: { y: { beginAtZero: true } }
    }
  });
}

// === Export Excel ===
function exportExcel(line) {
  const d = data[line];
  if (!d || d.length === 0) {
    alert("Aucune donnée à exporter !");
    return;
  }
  const ws = XLSX.utils.json_to_sheet(d);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, line);
  const now = new Date();
  const fileName = `${line}_${now.toLocaleTimeString().replace(/:/g, '-')}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

// === Calculatrice ===
function toggleCalc() {
  const calc = document.getElementById("calculator");
  calc.style.display = calc.style.display === "block" ? "none" : "block";
}
function calcPress(val) { calcValue += val; document.getElementById("calcDisplay").value = calcValue; }
function calcEqual() { calcValue = eval(calcValue || "0").toString(); document.getElementById("calcDisplay").value = calcValue; }
function calcClear() { calcValue = ""; document.getElementById("calcDisplay").value = ""; }

// === Lancer au chargement ===
renderMenu();
