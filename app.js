// === 📦 Synthèse Production Lactalis V15.4 ===

// Données locales
let data = JSON.parse(localStorage.getItem("syntheseData")) || {};
const lignes = ["Râpé", "T2", "RT", "OMORI", "T1", "Sticks", "Emballage", "Dés", "Filets", "Prédécoupé"];
let currentLine = null;

// === 🕒 Gestion horloge / date ===
function updateClock() {
  const d = new Date();
  const jours = ["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];
  const mois = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
  const semaine = getWeekNumber();
  const clock = document.getElementById("topClock");
  if (clock) {
    clock.innerHTML = `${jours[d.getDay()]} ${d.getDate()} ${mois[d.getMonth()]} ${d.getFullYear()} — Semaine ${semaine} — ${d.toTimeString().slice(0,5)}`;
  }
}
setInterval(updateClock, 1000);
updateClock();

function getWeekNumber() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

// === 💾 Sauvegarde globale ===
function saveData() {
  localStorage.setItem("syntheseData", JSON.stringify(data));
}

// === 🏠 Menu principal ===
function renderMenu() {
  pageTransition();
  const btns = lignes.map(l => `<button onclick="openLine('${l}')">${l}</button>`).join("");
  document.getElementById("content").innerHTML = `
    <div class="page fade">
      <h2>Sélectionne une ligne</h2>
      <div class="menu">${btns}</div>
    </div>`;
}

// === ✨ Transition visuelle ===
function pageTransition() {
  const content = document.getElementById("content");
  if (!content) return;
  content.style.transition = "opacity 0.3s ease, transform 0.3s ease";
  content.style.opacity = 0;
  content.style.transform = "translateX(15px)";
  setTimeout(() => {
    content.style.opacity = 1;
    content.style.transform = "translateX(0)";
  }, 200);
}

// === 🔙 Retour menu ===
function returnToMenu() {
  pageTransition();
  renderMenu();
}

// === 📈 Ouvrir une ligne ===
function openLine(line) {
  pageTransition();
  currentLine = line;
  const d = data[line] || [];
  const total = d.reduce((s, x) => s + Number(x.quantite || 0), 0);
  const cadence = d.length ? (total / d.length).toFixed(1) : 0;
  const unsaved = JSON.parse(localStorage.getItem(`unsaved_${line}`)) || {};
  const reste = unsaved.reste ? +unsaved.reste : 0;
  const estimation = cadence > 0 && reste > 0
    ? `${(reste / cadence).toFixed(2)} h restantes (~${Math.round((reste / cadence) * 60)} min)`
    : "—";

  const html = `
    <div class="page fade">
      <h2>${line}</h2>
      <button class="retour-menu" onclick="returnToMenu()">⬅ Retour menu</button>
      <label>Heure début :</label><input id="debut" type="time" value="${unsaved.debut || getTimeNow()}">
      <label>Heure fin :</label><input id="fin" type="time" value="${unsaved.fin || getTimeNow()}">
      <label>Quantité initiale :</label><input id="q1" type="number" value="${unsaved.q1 || ""}">
      <label>Quantité ajoutée :</label><input id="q2" type="number" value="${unsaved.q2 || ""}">
      <label>Quantité restante :</label><input id="reste" type="number" value="${unsaved.reste || ""}">
      <label>Temps d'arrêt (min):</label><input id="arret" type="number" value="${unsaved.arret || ""}">
      <label>Cause d'arrêt :</label><input id="cause" type="text" value="${unsaved.cause || ""}">
      <label>Commentaire :</label><input id="commentaire" type="text" value="${unsaved.commentaire || ""}">
      <div class="stats">
        <p><b>Total :</b> <span id="total">${total}</span> colis</p>
        <p><b>Cadence moyenne :</b> <span id="cadence">${cadence}</span> colis/h</p>
        <p><b>Estimation fin :</b> <span id="estimation">${estimation}</span></p>
      </div>
      <div class="stats">
  <p><b>Total :</b> <span id="total">${total}</span> colis</p>
  <p><b>Cadence moyenne :</b> <span id="cadence">${cadence}</span> colis/h</p>
  <p><b>Estimation fin :</b> <span id="estimation">${estimation}</span></p>
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

  // Sauvegarde automatique des champs
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
      tmp.cadenceManuelle = document.getElementById("cadenceManuelle").value;
      localStorage.setItem(`unsaved_${line}`, JSON.stringify(tmp));
      const resteLive = +tmp.reste || 0;
      const est = cadence > 0 && resteLive > 0
        ? `${(resteLive / cadence).toFixed(2)} h restantes (~${Math.round((resteLive / cadence) * 60)} min)`
        : "—";
      document.getElementById("estimation").textContent = est;
    });
  });
}

// === 🕒 Heure actuelle ===
function getTimeNow() {
  const d = new Date();
  return d.toTimeString().slice(0,5);
}

// === 💾 Enregistrer ===
function enregistrer() {
  const line = currentLine;
  const q1 = +document.getElementById("q1").value || 0;
  const q2 = +document.getElementById("q2").value || 0;
  const total = q1 + q2;
  const obj = {
    debut: document.getElementById("debut").value,
    fin: document.getElementById("fin").value,
    quantite: total,
    arret: +document.getElementById("arret").value || 0,
    cause: document.getElementById("cause").value,
    commentaire: document.getElementById("commentaire").value,
    date: new Date().toLocaleDateString(),
    heure: getTimeNow(),
    semaine: getWeekNumber()
  };
  if (!data[line]) data[line] = [];
  data[line].push(obj);
  saveData();
  localStorage.removeItem(`unsaved_${line}`);
  openLine(line);
}

// === ↩ Annuler dernier ===
function annulerDernier() {
  const line = currentLine;
  if (!data[line] || data[line].length === 0) return;
  data[line].pop();
  saveData();
  openLine(line);
}

// === ♻ Remise affichage ===
function remiseAffichage() {
  localStorage.removeItem(`unsaved_${currentLine}`);
  openLine(currentLine);
}

// === 📜 Historique ===
function afficherHistorique() {
  const line = currentLine;
  const d = data[line] || [];
  if (d.length === 0) {
    alert("Aucun enregistrement pour cette ligne.");
    return;
  }
  let txt = `Historique ${line} :\n`;
  d.forEach((x,i)=>{ txt += `${i+1}. ${x.date} ${x.heure} - ${x.quantite} colis (${x.cause || "ok"})\n`; });
  alert(txt);
}

// === 📈 Graphique individuel ===
function renderGraph(line) {
  const ctx = document.getElementById("chartLine");
  if (!ctx) return;
  const d = data[line] || [];
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: d.map(x => x.heure),
      datasets: [
        { label: "Quantité", data: d.map(x => x.quantite), backgroundColor: "rgba(0,122,255,0.6)" },
        { label: "Arrêts (min)", data: d.map(x => x.arret), backgroundColor: "rgba(255,99,132,0.6)" }
      ]
    },
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
  });
}

// === 🏭 Atelier global ===
function showAtelier() {
  pageTransition();

  const rows = lignes.map(l => {
    const d = data[l] || [];
    const tot = d.reduce((s, x) => s + Number(x.quantite || 0), 0);
    const arr = d.reduce((s, x) => s + Number(x.arret || 0), 0);
    const cad = d.length ? (tot / d.length).toFixed(1) : 0;
    return `<tr>
      <td>${l}</td>
      <td>${tot}</td>
      <td>${arr}</td>
      <td>${cad}</td>
    </tr>`;
  }).join("");

  const html = `
    <div class="page fade">
      <h2>Atelier global</h2>
      <table>
        <tr>
          <th>Ligne</th><th>Total colis</th><th>Temps d'arrêt (min)</th><th>Cadence moy. (colis/h)</th>
        </tr>
        ${rows}
      </table>

      <div class="stats">
        <p><b>Résumé global :</b> ${lignes.length} lignes analysées</p>
      </div>

      <canvas id="atelierChart"></canvas>

      <div class="boutons">
        <button onclick="exportAtelier()">📊 Export global</button>
        <button class="retour-menu" onclick="returnToMenu()">⬅ Retour menu</button>
      </div>
    </div>`;
  document.getElementById("content").innerHTML = html;
  renderAtelierGraph();
        }

// === 📊 Graphique global Atelier ===
function renderAtelierGraph() {
  const ctx = document.getElementById("atelierChart");
  if (!ctx) return;
  const labels = lignes;
  const totals = lignes.map(l => (data[l] || []).reduce((s, x) => s + Number(x.quantite || 0), 0));
  const stops = lignes.map(l => (data[l] || []).reduce((s, x) => s + Number(x.arret || 0), 0));

  new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Total colis", data: totals, backgroundColor: "rgba(0,122,255,0.6)" },
        { label: "Arrêts (min)", data: stops, backgroundColor: "rgba(255,99,132,0.6)" }
      ]
    },
    options: {
      responsive: true,
      indexAxis: "y",
      plugins: { legend: { position: "bottom" } },
      scales: { x: { beginAtZero: true } }
    }
  });
}

// === 📤 Export global Atelier (CSV + graphiques intégrés) ===
function exportAtelier() {
  const lignesCSV = [
    "Ligne;Total colis;Arrêts (min);Cadence moyenne (colis/h)"
  ];

  lignes.forEach(l => {
    const d = data[l] || [];
    const tot = d.reduce((s, x) => s + Number(x.quantite || 0), 0);
    const arr = d.reduce((s, x) => s + Number(x.arret || 0), 0);
    const cad = d.length ? (tot / d.length).toFixed(1) : 0;
    lignesCSV.push(`${l};${tot};${arr};${cad}`);
  });

  // Création du fichier CSV global
  const blob = new Blob(["\uFEFF" + lignesCSV.join("\n")], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `Synthese_Atelier_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();

  showToast("📦 Export global créé (CSV formaté pour Excel)");

  // Capture du graphique global en image PNG
  const chartCanvas = document.getElementById("atelierChart");
  if (chartCanvas) {
    const img = chartCanvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = img;
    link.download = `Graphique_Atelier_${new Date().toISOString().split("T")[0]}.png`;
    link.click();
  }
}
// === 📤 Export Excel (CSV propre et compatible Excel) ===
function exportExcel(line) {
  const d = data[line] || [];
  if (!d.length) {
    alert("Aucune donnée à exporter pour cette ligne !");
    return;
  }

  // Ajout d’un en-tête lisible
  const csv = [
    "Date;Heure;Début;Fin;Quantité;Arrêt (min);Cause;Commentaire;Semaine"
  ];
  d.forEach(x => {
    csv.push(`${x.date};${x.heure};${x.debut};${x.fin};${x.quantite};${x.arret};"${x.cause}";"${x.commentaire}";${x.semaine}`);
  });

  // Création du fichier CSV
  const blob = new Blob(["\uFEFF" + csv.join("\n")], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  const now = new Date().toISOString().replace(/[:T]/g, "-").split(".")[0];
  a.href = URL.createObjectURL(blob);
  a.download = `Synthese_${line}_${now}.csv`;
  a.click();

  showToast("📊 Export Excel créé avec succès !");
}

// === 🧮 Calculatrice flottante ===
const fabCalc = document.getElementById("fabCalc");
const calculator = document.getElementById("calculator");
if (fabCalc && calculator) {
  fabCalc.addEventListener("click", toggleCalculator);
  buildCalculatorButtons();
}

function toggleCalculator() {
  calculator.style.display = calculator.style.display === "block" ? "none" : "block";
}

function buildCalculatorButtons() {
  const buttons = [
    "7","8","9","/",
    "4","5","6","*",
    "1","2","3","-",
    "0",".","=","+",
    "C","X"
  ];
  const container = document.getElementById("calcButtons");
  container.innerHTML = "";
  buttons.forEach(b => {
    const btn = document.createElement("button");
    btn.textContent = b;
    btn.addEventListener("click", () => handleCalcInput(b));
    container.appendChild(btn);
  });
}

function handleCalcInput(val) {
  const display = document.getElementById("calcDisplay");
  if (val === "C") display.value = "";
  else if (val === "X") toggleCalculator();
  else if (val === "=") {
    try { display.value = eval(display.value) } catch { display.value = "Err" }
  } else display.value += val;
}

// === 🚀 Démarrage ===
renderMenu();
updateClock();
