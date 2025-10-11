// === CONFIGURATION ===
const lignes = [
  "Râpé", "T2", "RT", "OMORI", "T1",
  "Sticks", "Emballage", "Dés", "Filets", "Prédécoupé"
];
let data = JSON.parse(localStorage.getItem("syntheseData")) || {};
lignes.forEach(l => { if (!Array.isArray(data[l])) data[l] = []; });

// Sauvegarde automatique toutes les 2 min + à la fermeture
function sauvegarder() {
  localStorage.setItem("syntheseData", JSON.stringify(data));
}
setInterval(sauvegarder, 120000);
window.addEventListener("beforeunload", sauvegarder);

// === INITIALISATION ===
document.addEventListener("DOMContentLoaded", () => {
  openPage("atelier");
});

// === NAVIGATION ===
function openPage(page) {
  const content = document.getElementById("content");
  if (page === "atelier") pageAtelier(content);
  else pageLigne(page, content);
  localStorage.setItem("currentPage", page);
}

// === PAGE ATELIER ===
function pageAtelier(zone) {
  let html = `
    <h2>Vue Atelier</h2>
    <table>
      <tr><th>Ligne</th><th>Cadence Moyenne</th><th>Nb Enregistrements</th></tr>
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
    options: { indexAxis: "y", scales: { x: { beginAtZero: true } } }
  });
}

// === PAGE LIGNE ===
function pageLigne(nom, zone) {
  let html = `
    <h2>${nom}</h2>
    <form id="form-${nom}">
      <label>📦 Colis réalisés :</label>
      <input id="colis-${nom}" type="number" required>

      <label>🕒 Heure début :</label>
      <input id="debut-${nom}" type="time" required>

      <label>⌛ Heure fin :</label>
      <input id="fin-${nom}" type="time" required>

      <label>✅ Qualité :</label>
      <input id="qual-${nom}" type="text" placeholder="ex : conforme, défaut visuel...">

      <label>⛔ Arrêt :</label>
      <div class="arret-group">
        <input type="number" id="arretDuree-${nom}" placeholder="Durée (min)" min="0">
        <input type="text" id="arretCause-${nom}" placeholder="Cause (panne, nettoyage...)">
      </div>

      <button>Enregistrer</button>
      <button type="button" onclick="exporterExcel('${nom}')">Exporter Excel</button>
      <button type="button" onclick="voirHistorique('${nom}')">📜 Historique complet</button>
    </form>

    <h3>Historique récent</h3>
    <table id="tab-${nom}">
      <tr>
        <th>Date</th><th>Colis</th><th>Début</th><th>Fin</th>
        <th>Cadence</th><th>Qualité</th><th>Durée arrêt</th><th>Cause</th><th>Suppr.</th>
      </tr>
    </table>
    <canvas id="g-${nom}" height="100"></canvas>
  `;
  zone.innerHTML = html;

  // 🔹 Récupération du champ colis temporaire
  const colisTemp = localStorage.getItem(`colisTemp-${nom}`);
  if (colisTemp) document.getElementById(`colis-${nom}`).value = colisTemp;

  // 🔹 Mémorisation automatique de la valeur saisie
  const colisInput = document.getElementById(`colis-${nom}`);
  colisInput.addEventListener("input", () => {
    localStorage.setItem(`colisTemp-${nom}`, colisInput.value);
  });

  // 🔹 Enregistrement
  document.getElementById(`form-${nom}`).addEventListener("submit", e => {
    e.preventDefault();

    const colis = +colisInput.value;
    const debut = document.getElementById(`debut-${nom}`).value;
    const fin = document.getElementById(`fin-${nom}`).value;
    const qual = document.getElementById(`qual-${nom}`).value;
    const arret = +document.getElementById(`arretDuree-${nom}`).value || 0;
    const cause = document.getElementById(`arretCause-${nom}`).value || "";

    const duree = calculDuree(debut, fin, arret);
    const cadence = duree > 0 ? (colis / duree).toFixed(1) : 0;

    const record = {
      date: new Date().toLocaleString(),
      colis,
      debut,
      fin,
      cadence: +cadence,
      qualite: qual,
      arret,
      cause
    };

    data[nom].push(record);
    sauvegarder();

    // 🔹 Une fois enregistré → on réinitialise la valeur temporaire
    localStorage.removeItem(`colisTemp-${nom}`);

    pageLigne(nom, zone);
  });

  remplirTableau(nom);
  drawGraphique(nom);
}

// === TABLEAU HISTORIQUE ===
function remplirTableau(nom) {
  const tab = document.getElementById(`tab-${nom}`);
  const lignesHTML = data[nom].slice(-10).map((r, i) => `
    <tr>
      <td>${r.date}</td><td>${r.colis}</td><td>${r.debut}</td><td>${r.fin}</td>
      <td>${r.cadence}</td><td>${r.qualite}</td><td>${r.arret}</td><td>${r.cause}</td>
      <td><button onclick="suppr('${nom}', ${i})">❌</button></td>
    </tr>
  `).join('');
  tab.innerHTML = `
    <tr>
      <th>Date</th><th>Colis</th><th>Début</th><th>Fin</th>
      <th>Cadence</th><th>Qualité</th><th>Durée arrêt</th><th>Cause</th><th>Suppr.</th>
    </tr>
    ${lignesHTML}
  `;
}

function suppr(nom, i) {
  data[nom].splice(i, 1);
  sauvegarder();
  openPage(nom);
}

// === HISTORIQUE COMPLET ===
function voirHistorique(nom) {
  const zone = document.getElementById("content");
  const all = data[nom];
  let html = `
    <h2>Historique complet — ${nom}</h2>
    <input id="filtre" placeholder="Filtrer par mot-clé ou date..." oninput="filtrerHistorique('${nom}')">
    <table id="tab-full-${nom}">
      <tr>
        <th>Date</th><th>Colis</th><th>Début</th><th>Fin</th>
        <th>Cadence</th><th>Qualité</th><th>Durée arrêt</th><th>Cause</th>
      </tr>
  `;
  all.forEach(r => {
    html += `<tr>
      <td>${r.date}</td><td>${r.colis}</td><td>${r.debut}</td><td>${r.fin}</td>
      <td>${r.cadence}</td><td>${r.qualite}</td><td>${r.arret}</td><td>${r.cause}</td>
    </tr>`;
  });
  html += `</table><button onclick="openPage('${nom}')">⬅️ Retour</button>`;
  zone.innerHTML = html;
}

function filtrerHistorique(nom) {
  const valeur = document.getElementById("filtre").value.toLowerCase();
  const tab = document.getElementById(`tab-full-${nom}`);
  const lignesTab = tab.getElementsByTagName("tr");
  for (let i = 1; i < lignesTab.length; i++) {
    const ligneTexte = lignesTab[i].textContent.toLowerCase();
    lignesTab[i].style.display = ligneTexte.includes(valeur) ? "" : "none";
  }
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
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
  });
}

// === CALCUL DE DUREE (corrigé passage minuit) ===
function calculDuree(debut, fin, arret) {
  const [h1, m1] = debut.split(":").map(Number);
  const [h2, m2] = fin.split(":").map(Number);

  let debutMin = h1 * 60 + m1;
  let finMin = h2 * 60 + m2;

  if (finMin < debutMin) finMin += 24 * 60;

  let duree = (finMin - debutMin - (arret || 0)) / 60;
  return duree > 0 ? duree : 0;
    }
