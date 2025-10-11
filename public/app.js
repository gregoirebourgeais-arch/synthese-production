const lignes = ["Râpé", "T2", "RT", "OMORI", "T1", "Sticks", "Emballage", "Dés", "Filets", "Prédécoupé"];
const API_URL = "/api/consignes";
const app = document.getElementById("app");
const menu = document.getElementById("menu");

// --- Menu principal ---
menu.innerHTML = `
  <button onclick="renderAtelier()">🏭 Atelier</button>
  ${lignes.map(l => `<button onclick="openLigne('${l}')">${l}</button>`).join("")}
`;

// --- Page Atelier ---
async function renderAtelier() {
  const res = await fetch(API_URL);
  const data = await res.json();
  app.innerHTML = `
    <h2>Vue d'ensemble Atelier</h2>
    <table>
      <thead><tr><th>Ligne</th><th>Cadence Moyenne</th></tr></thead>
      <tbody>${lignes.map(l => {
        const filtres = data.filter(c => c.ligne === l);
        const moy = filtres.length
          ? Math.round(filtres.reduce((a, b) => a + (b.cadence || 0), 0) / filtres.length)
          : 0;
        return `<tr><td>${l}</td><td>${moy}</td></tr>`;
      }).join("")}</tbody>
    </table>
    <canvas id="atelierChart" height="100"></canvas>
  `;

  const ctx = document.getElementById("atelierChart").getContext("2d");
  const moyennes = lignes.map(l => {
    const filtres = data.filter(c => c.ligne === l);
    return filtres.length
      ? Math.round(filtres.reduce((a, b) => a + (b.cadence || 0), 0) / filtres.length)
      : 0;
  });

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: lignes,
      datasets: [{ label: "Cadence (colis/h)", data: moyennes, backgroundColor: "#007bff" }]
    },
    options: { scales: { y: { beginAtZero: true } } }
  });
}

// --- Page Ligne ---
function openLigne(ligne) {
  app.innerHTML = `
    <h2>Ligne ${ligne}</h2>
    <form id="form">
      <label>Heure début</label><input type="time" id="debut" required>
      <label>Heure fin</label><input type="time" id="fin" required>
      <label>Colis réalisés</label><input type="number" id="colis" min="0" required>
      <label>Qualité</label><input type="text" id="qualite">
      <label>Arrêts</label><input type="text" id="arrets">
      <label>Durée d'arrêt (min)</label><input type="number" id="duree" min="0">
      <button type="submit">💾 Enregistrer</button>
    </form>

    <div class="actions">
      <button onclick="sauvegarderLocalement()">💾 Sauvegarde locale</button>
      <button onclick="importerDonnees()">📂 Importer</button>
    </div>

    <h3>Historique</h3>
    <table><thead><tr><th>Début</th><th>Fin</th><th>Colis</th><th>Cadence</th><th>Qualité</th><th>Arrêts</th><th>Durée</th></tr></thead><tbody id="historique"></tbody></table>
    <canvas id="chart" height="100"></canvas>
  `;

  const form = document.getElementById("form");
  const historique = document.getElementById("historique");
  const ctx = document.getElementById("chart").getContext("2d");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const debut = form.debut.value;
    const fin = form.fin.value;
    const colis = Number(form.colis.value);
    const t1 = new Date(`1970-01-01T${debut}`);
    const t2 = new Date(`1970-01-01T${fin}`);
    const heures = (t2 - t1) / 3600000;
    const cadence = heures > 0 ? Math.round(colis / heures) : 0;

    const item = {
      ligne, debut, fin, colis, cadence,
      qualite: form.qualite.value,
      arrets: form.arrets.value,
      duree: Number(form.duree.value)
    };

    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item)
    });

    loadHistorique(ligne, historique, ctx);
    form.reset();
  });

  loadHistorique(ligne, historique, ctx);
  setInterval(sauvegarderLocalement, 2 * 60 * 60 * 1000);
}

// --- Historique ---
async function loadHistorique(ligne, table, ctx) {
  const res = await fetch(API_URL);
  const data = await res.json();
  const filtres = data.filter(c => c.ligne === ligne);

  table.innerHTML = filtres.map(c => `
    <tr><td>${c.debut}</td><td>${c.fin}</td><td>${c.colis}</td>
    <td>${c.cadence}</td><td>${c.qualite}</td><td>${c.arrets}</td><td>${c.duree}</td></tr>
  `).join("");

  new Chart(ctx, {
    type: "line",
    data: {
      labels: filtres.map(c => c.debut),
      datasets: [{ label: "Cadence", data: filtres.map(c => c.cadence), borderColor: "#007bff", fill: false }]
    },
    options: { scales: { y: { beginAtZero: true } } }
  });
}

// --- Sauvegarde locale ---
async function sauvegarderLocalement() {
  const res = await fetch(API_URL);
  const data = await res.json();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "synthese_backup.json";
  a.click();
}

// --- Importation ---
function importerDonnees() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const data = JSON.parse(text);
    for (const d of data) {
      await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(d)
      });
    }
    alert("Import réussi !");
  };
  input.click();
}

renderAtelier();
