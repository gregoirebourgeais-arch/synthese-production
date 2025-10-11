const lignes = ["Râpé","T2","RT","OMORI","T1","Sticks","Emballage","Dés","Filets","Prédécoupé"];
let data = JSON.parse(localStorage.getItem("syntheseData") || "[]");
let arrets = JSON.parse(localStorage.getItem("arretsData") || "[]");

function openPage(line) {
  const content = document.getElementById("content");
  if (line === "atelier") {
    renderAtelier(content);
    return;
  }
  renderLigne(line, content);
}

// --- Page Atelier ---
function renderAtelier(el) {
  const moyennes = lignes.map(l => {
    const filtres = data.filter(c => c.ligne === l);
    return filtres.length ? Math.round(filtres.reduce((a,b)=>a+b.cadence,0)/filtres.length) : 0;
  });

  el.innerHTML = `
    <h2>Vue Atelier</h2>
    <table>
      <thead><tr><th>Ligne</th><th>Cadence Moyenne (colis/h)</th></tr></thead>
      <tbody>${lignes.map((l,i)=>`<tr><td>${l}</td><td>${moyennes[i]}</td></tr>`).join("")}</tbody>
    </table>
    <canvas id="atelierChart" height="120"></canvas>
  `;

  const ctx = document.getElementById("atelierChart").getContext("2d");
  new Chart(ctx, {
    type: "bar",
    data: { labels: lignes, datasets: [{ label: "Cadence", data: moyennes, backgroundColor: "#007bff" }] },
    options: { scales: { y: { beginAtZero: true } } }
  });
}

// --- Page Ligne ---
function renderLigne(line, el) {
  el.innerHTML = `
    <h2>Ligne ${line}</h2>
    <form id="form-${line}">
      <label>Heure de début</label><input type="time" id="debut-${line}">
      <label>Heure de fin</label><input type="time" id="fin-${line}">
      <label>Colis réalisés</label><input type="number" id="colis-${line}">
      <label>Qualité</label><input type="text" id="qualite-${line}">
      <button type="button" class="save" onclick="saveProd('${line}')">💾 Enregistrer</button>
      <button type="button" class="export" onclick="exportExcel('${line}')">📤 Export Excel</button>
      <button type="button" class="delete" onclick="clearData('${line}')">🗑 Effacer les données</button>
    </form>

    <h3>Arrêts de ligne</h3>
    <form id="arret-${line}">
      <label>Motif d'arrêt</label><input type="text" id="motif-${line}">
      <label>Durée (min)</label><input type="number" id="duree-${line}">
      <button type="button" class="save" onclick="saveArret('${line}')">➕ Ajouter arrêt</button>
    </form>

    <table id="tab-${line}">
      <thead><tr><th>Début</th><th>Fin</th><th>Colis</th><th>Cadence</th><th>Qualité</th></tr></thead>
      <tbody></tbody>
    </table>

    <h4>Historique des arrêts</h4>
    <table id="arrets-${line}">
      <thead><tr><th>Motif</th><th>Durée (min)</th></tr></thead>
      <tbody></tbody>
    </table>

    <canvas id="chart-${line}" height="100"></canvas>
  `;
  updateTables(line);
}

// --- Sauvegarde Production ---
function saveProd(line) {
  const debut = document.getElementById(`debut-${line}`).value;
  const fin = document.getElementById(`fin-${line}`).value;
  const colis = Number(document.getElementById(`colis-${line}`).value);
  const qualite = document.getElementById(`qualite-${line}`).value;
  const t1 = new Date(`1970-01-01T${debut}`);
  const t2 = new Date(`1970-01-01T${fin}`);
  const h = (t2 - t1) / 3600000;
  const cadence = h > 0 ? Math.round(colis / h) : 0;

  data.push({ ligne: line, debut, fin, colis, cadence, qualite, date: new Date().toLocaleString() });
  localStorage.setItem("syntheseData", JSON.stringify(data));
  updateTables(line);
}

// --- Sauvegarde Arrêts ---
function saveArret(line) {
  const motif = document.getElementById(`motif-${line}`).value;
  const duree = Number(document.getElementById(`duree-${line}`).value);
  arrets.push({ ligne: line, motif, duree, date: new Date().toLocaleString() });
  localStorage.setItem("arretsData", JSON.stringify(arrets));
  updateTables(line);
}

// --- Effacement des données de la ligne ---
function clearData(line) {
  if (!confirm(`Effacer toutes les données de la ligne ${line} ?`)) return;
  data = data.filter(c => c.ligne !== line);
  arrets = arrets.filter(a => a.ligne !== line);
  localStorage.setItem("syntheseData", JSON.stringify(data));
  localStorage.setItem("arretsData", JSON.stringify(arrets));
  updateTables(line);
  alert(`🗑 Données effacées pour la ligne ${line}`);
}

// --- Mise à jour des tableaux et graphiques ---
function updateTables(line) {
  const filtres = data.filter(c => c.ligne === line);
  document.querySelector(`#tab-${line} tbody`).innerHTML =
    filtres.map(c => `<tr><td>${c.debut}</td><td>${c.fin}</td><td>${c.colis}</td><td>${c.cadence}</td><td>${c.qualite}</td></tr>`).join("");

  const arr = arrets.filter(a => a.ligne === line);
  document.querySelector(`#arrets-${line} tbody`).innerHTML =
    arr.map(a => `<tr><td>${a.motif}</td><td>${a.duree}</td></tr>`).join("");

  const ctx = document.getElementById(`chart-${line}`).getContext("2d");
  new Chart(ctx, {
    type: "line",
    data: { labels: filtres.map(c=>c.debut), datasets:[{label:"Cadence",data:filtres.map(c=>c.cadence),borderColor:"#007bff",fill:false}] },
    options: { scales: { y: { beginAtZero: true } } }
  });
}

// --- Export Excel ---
function exportExcel(line) {
  const filtres = data.filter(c => c.ligne === line);
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(filtres);
  XLSX.utils.book_append_sheet(wb, ws, "Production");
  XLSX.writeFile(wb, `Synthese_${line}.xlsx`);
}

// Sauvegarde auto locale toutes les 2h
setInterval(() => {
  localStorage.setItem("syntheseData", JSON.stringify(data));
  localStorage.setItem("arretsData", JSON.stringify(arrets));
  console.log("💾 Sauvegarde automatique effectuée");
}, 2 * 60 * 60 * 1000);
