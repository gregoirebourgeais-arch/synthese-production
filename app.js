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
      <h2>Choisis une ligne</h2>
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
  const cadenceMoy = d.length ? (total / d.length).toFixed(1) : 0;
  const unsaved = JSON.parse(localStorage.getItem("unsaved_" + line) || "{}");

  const reste = unsaved.reste ? +unsaved.reste : 0;
  const cadenceActive = unsaved.cadenceManuelle || cadenceMoy;
  const estimation = calcEstimationFin(reste, cadenceActive);

  const html = `
    <div class="page fade">
      <h2>${line}</h2>
      <button class="retour-menu" onclick="renderMenu()">⬅️ Retour menu</button>

      <label>Heure début :</label>
      <input id="debut" type="time" value="${unsaved.debut || ""}" />

      <label>Heure fin :</label>
      <input id="fin" type="time" value="${unsaved.fin || ""}" />

      <label>Quantité initiale :</label>
      <input id="init" type="number" placeholder="Saisir quantité initiale" value="${unsaved.init || ""}" />

      <label>Quantité ajoutée :</label>
      <input id="ajout" type="number" placeholder="Saisir quantité ajoutée" value="${unsaved.ajout || ""}" />

      <label>Quantité restante :</label>
      <input id="reste" type="number" placeholder="Saisir quantité restante" value="${reste}" oninput="majEstimation()" />

      <label>Temps d'arrêt (min) :</label>
      <input id="arret" type="number" placeholder="Durée arrêt" value="${unsaved.arret || ""}" />

      <label>Cause d'arrêt :</label>
      <input id="cause" type="text" placeholder="Commentaire..." value="${unsaved.cause || ""}" />

      <label>Cadence manuelle :</label>
      <input id="cadenceManuelle" type="number" placeholder="Saisir cadence manuelle..." value="${unsaved.cadenceManuelle || ""}" oninput="majEstimation()" />
      <button class="bouton-principal" onclick="appliquerCadence()">⚙️ Appliquer cadence</button>

      <button class="bouton-principal" onclick="enregistrer()">💾 Enregistrer</button>
      <button class="bouton-principal" onclick="remiseAffichage()">🔄 Remise affichage</button>
      <button class="bouton-principal" onclick="exportExcel('${line}')">📦 Export Excel</button>
      <button class="bouton-principal" onclick="showAtelier()">🏭 Vue Atelier</button>

      <div class="stats" id="statsBloc">
        <p><b>Total :</b> ${total}</p>
        <p><b>Cadence moyenne :</b> ${cadenceMoy} colis/h</p>
        <p id="estimationBloc">${estimation}</p>
      </div>
    </div>
  `;
  document.getElementById("content").innerHTML = html;
}

// === Calcul estimation fin ===
function calcEstimationFin(reste, cadence) {
  if (!reste || !cadence || cadence <= 0) return "Estimation : -";
  const heures = reste / cadence;
  const minutes = Math.round(heures * 60);
  const now = new Date();
  const fin = new Date(now.getTime() + minutes * 60000);
  return `Estimation : ≈ ${Math.floor(heures)}h${(minutes % 60).toString().padStart(2, "0")} → ${fin.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
}

// === Met à jour estimation ===
function majEstimation() {
  const reste = +document.getElementById("reste").value || 0;
  const cadence = +document.getElementById("cadenceManuelle").value || 0;
  document.getElementById("estimationBloc").innerText = calcEstimationFin(reste, cadence);
}

// === Appliquer cadence manuelle ===
function appliquerCadence() {
  const cadence = +document.getElementById("cadenceManuelle").value || 0;
  const reste = +document.getElementById("reste").value || 0;
  localStorage.setItem("unsaved_" + currentLine, JSON.stringify({ reste, cadenceManuelle: cadence }));
  majEstimation();
  alert("✅ Cadence appliquée");
}

// === Enregistrer ===
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
  localStorage.setItem("unsaved_" + line, JSON.stringify({ reste, cadenceManuelle }));

  alert(`✅ Données enregistrées sur ${line}`);
  openLine(line);
}

// === Remise affichage ===
function remiseAffichage() {
  if (!currentLine) return;
  if (confirm("Remettre l'affichage à zéro ?")) {
    const now = new Date();
    localStorage.removeItem("unsaved_" + currentLine);
    openLine(currentLine);
    document.getElementById("debut").value = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
      <h2>Vue Atelier</h2>
      <button class="retour-menu" onclick="renderMenu()">⬅️ Retour menu</button>
      <button class="bouton-principal" onclick="exportAtelier()">📊 Export global</button>
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
    options: { scales: { y: { beginAtZero: true } } }
  });
}

// === Export Excel individuel ===
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
  const fileName = `${line}_${now.toLocaleDateString('fr-CA')}_${now.toLocaleTimeString().replace(/:/g, '-')}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

// === Export Excel global ===
function exportAtelier() {
  const wb = XLSX.utils.book_new();
  for (let line in data) {
    const ws = XLSX.utils.json_to_sheet(data[line]);
    XLSX.utils.book_append_sheet(wb, ws, line);
  }
  const now = new Date();
  const fileName = `Synthese_Atelier_${now.toLocaleDateString('fr-CA')}_${now.toLocaleTimeString().replace(/:/g, '-')}.xlsx`;
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

// === Démarrage ===
renderMenu();
