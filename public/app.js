// === CONFIG ===
const lignes = ['Râpé', 'T2', 'RT', 'OMORI', 'T1', 'Sticks', 'Emballage', 'Dés', 'Filets', 'Prédécoupé'];
const API_URL = '/api/data';
let data = {};

// === FONCTIONS API ===
async function chargerData() {
  try {
    const res = await fetch(API_URL);
    const json = await res.json();
    data = json || {};
    lignes.forEach(l => { if (!Array.isArray(data[l])) data[l] = []; });
  } catch (err) {
    console.error("Erreur chargement données:", err);
    data = {};
    lignes.forEach(l => data[l] = []);
  }
}

async function sauvegarderData() {
  try {
    await fetch(API_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
  } catch (err) {
    console.error("Erreur sauvegarde:", err);
  }
}

// === INITIALISATION ===
document.addEventListener("DOMContentLoaded", async () => {
  await chargerData();
  openPage("atelier");
});

// === NAVIGATION ===
function openPage(page) {
  const content = document.getElementById("content");
  if (page === "atelier") pageAtelier(content);
  else pageLigne(page, content);
}

// === PAGE ATELIER ===
function pageAtelier(zone) {
  let html = `
    <h2>Vue Atelier</h2>
    <table>
      <tr><th>Ligne</th><th>Cadence moyenne</th><th>Nb Enregistrements</th></tr>
  `;
  const moyennes = [];

  lignes.forEach(l => {
    const list = data[l];
    const moyenne = list.length
      ? (list.reduce((a, b) => a + (b.cadence || 0), 0) / list.length).toFixed(1)
      : 0;
    moyennes.push({ ligne: l, cadence: moyenne });
    html += `<tr><td>${l}</td><td>${moyenne}</td><td>${list.length}</td></tr>`;
  });

  html += `</table><canvas id="gAtelier" height="100"></canvas>`;
  zone.innerHTML = html;

  // graphique horizontal
  const ctx = document.getElementById("gAtelier");
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: moyennes.map(m => m.ligne),
      datasets: [{
        label: "Cadence moyenne (colis/h)",
        data: moyennes.map(m => m.cadence),
        backgroundColor: "rgba(0,123,255,0.6)"
      }]
    },
    options: {
      indexAxis: "y",
      scales: { x: { beginAtZero: true } }
    }
  });
}

// === PAGE LIGNE ===
function pageLigne(nom, zone) {
  let html = `
    <h2>${nom}</h2>
    <form id="form-${nom}">
      <label>Colis réalisés :</label><input id="colis-${nom}" type="number" required><br>
      <label>Heure début :</label><input id="debut-${nom}" type="time" required><br>
      <label>Heure fin :</label><input id="fin-${nom}" type="time" required><br>
      <label>Qualité :</label><input id="qual-${nom}" type="text"><br>
      <label>Arrêt (min) :</label><input id="arret-${nom}" type="number" value="0"><br>
      <button>Enregistrer</button>
      <button type="button" onclick="exporterExcel('${nom}')">Exporter Excel</button>
    </form>

    <h3>Historique</h3>
    <table id="tab-${nom}">
      <tr>
        <th>Date</th><th>Colis</th><th>Début</th><th>Fin</th>
        <th>Cadence</th><th>Qualité</th><th>Arrêt</th><th>Suppr.</th>
      </tr>
    </table>
    <canvas id="g-${nom}" height="100"></canvas>
  `;
  zone.innerHTML = html;

  document.getElementById(`form-${nom}`).addEventListener("submit", e => {
    e.preventDefault();
    const colis = +document.getElementById(`colis-${nom}`).value;
    const debut = document.getElementById(`debut-${nom}`).value;
    const fin = document.getElementById(`fin-${nom}`).value;
    const qual = document.getElementById(`qual-${nom}`).value;
    const arret = +document.getElementById(`arret-${nom}`).value;

    const duree = calculDuree(debut, fin, arret);
    const cadence = duree > 0 ? (colis / duree).toFixed(1) : 0;
    const record = {
      date: new Date().toLocaleString(),
      colis, debut, fin, cadence: +cadence, qualite: qual, arret
    };
    data[nom].push(record);
    sauvegarderData();
    pageLigne(nom, zone);
  });

  remplirTableau(nom);
  drawGraphique(nom);
}

// === TABLEAU ===
function remplirTableau(nom) {
  const tab = document.getElementById(`tab-${nom}`);
  const lignesHTML = data[nom].map((r, i) => `
    <tr>
      <td>${r.date}</td><td>${r.colis}</td><td>${r.debut}</td><td>${r.fin}</td>
      <td>${r.cadence}</td><td>${r.qualite}</td><td>${r.arret}</td>
      <td><button onclick="suppr('${nom}', ${i})">❌</button></td>
    </tr>
  `).join('');
  tab.innerHTML = `
    <tr><th>Date</th><th>Colis</th><th>Début</th><th>Fin</th><th>Cadence</th><th>Qualité</th><th>Arrêt</th><th>Suppr.</th></tr>
    ${lignesHTML}
  `;
}

function suppr(nom, i) {
  data[nom].splice(i, 1);
  sauvegarderData();
  openPage(nom);
}

// === GRAPHIQUE ===
function drawGraphique(nom) {
  const ctx = document.getElementById(`g-${nom}`);
  const labels = data[nom].map(r => r.date);
  const valeurs = data[nom].map(r => r.cadence);
  new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Cadence (colis/h)",
        data: valeurs,
        borderColor: "#007bff",
        backgroundColor: "rgba(0,123,255,0.3)",
        fill: true
      }]
    },
    options: {
      responsive: true,
      scales: { y: { beginAtZero: true } }
    }
  });
}

// === OUTILS ===
function calculDuree(debut, fin, arret) {
  const [h1, m1] = debut.split(":").map(Number);
  const [h2, m2] = fin.split(":").map(Number);
  const duree = (h2 + m2 / 60) - (h1 + m1 / 60) - (arret / 60);
  return duree > 0 ? duree : 0;
}

function exporterExcel(nom) {
  const rows = data[nom];
  if (!rows.length) return alert("Aucune donnée à exporter.");
  const header = Object.keys(rows[0]);
  const csv = [header.join(";"), ...rows.map(r => header.map(h => r[h]).join(";"))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${nom}_historique.csv`;
  link.click();
}
