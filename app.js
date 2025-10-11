// === CONFIGURATION ===
const lignes = [
  "Râpé", "T2", "RT", "OMORI", "T1",
  "Sticks", "Emballage", "Dés", "Filets", "Prédécoupé"
];

let data = JSON.parse(localStorage.getItem("syntheseData")) || {};
lignes.forEach(l => { if (!Array.isArray(data[l])) data[l] = []; });

function sauvegarder() {
  localStorage.setItem("syntheseData", JSON.stringify(data));
}
setInterval(sauvegarder, 120000);
window.addEventListener("beforeunload", sauvegarder);

// === NAVIGATION ===
function openPage(page) {
  const content = document.getElementById("content");
  if (page === "atelier") pageAtelier(content);
  else pageLigne(page, content);
  localStorage.setItem("currentPage", page);
}

// === PAGE ATELIER ===
function pageAtelier(zone) {
  zone.innerHTML = `
    <h2>Tableau de Synthèse</h2>
    <p>Choisissez une ligne pour consulter ou saisir les données.</p>
  `;
}

// === PAGE LIGNE ===
function pageLigne(ligne, zone) {
  zone.innerHTML = `
    <h2>Ligne ${ligne}</h2>
    <form id="form-${ligne}" class="form-ligne">
      <label>Heure début :</label>
      <input type="time" id="debut"><br>

      <label>Heure fin :</label>
      <input type="time" id="fin"><br>

      <label>Quantité produite :</label>
      <input type="number" id="quantite" min="0"><br>

      <label>Arrêt (minutes) :</label>
      <input type="number" id="arret" min="0"><br>

      <label>Cause de l'arrêt :</label>
      <input type="text" id="cause" placeholder="Ex : panne, nettoyage..."><br>

      <button type="button" onclick="ajouter('${ligne}')">Enregistrer</button>
      <button type="button" onclick="voirHistorique('${ligne}')">Historique</button>
    </form>

    <canvas id="chart-${ligne}" height="120"></canvas>
    <div id="result-${ligne}"></div>
  `;

  dessinerGraphique(ligne);
}

// === AJOUT DONNÉE ===
function ajouter(ligne) {
  const debut = document.getElementById("debut").value;
  const fin = document.getElementById("fin").value;
  const quantite = parseFloat(document.getElementById("quantite").value);
  const arret = parseFloat(document.getElementById("arret").value) || 0;
  const cause = document.getElementById("cause").value || "";
  if (!debut || !fin || isNaN(quantite)) return alert("Champs incomplets !");

  const d1 = new Date(`1970-01-01T${debut}:00`);
  const d2 = new Date(`1970-01-01T${fin}:00`);
  let duree = (d2 - d1) / 60000;
  if (duree <= 0) duree += 1440; // passage minuit

  const cadence = duree > 0 ? (quantite / (duree / 60)).toFixed(1) : 0;

  data[ligne].push({
    date: new Date().toLocaleDateString(),
    debut, fin, quantite, arret, cause, cadence
  });

  sauvegarder();
  alert(`Enregistré ✅ (Cadence : ${cadence} u/h)`);
  dessinerGraphique(ligne);
}

// === HISTORIQUE ===
function voirHistorique(ligne) {
  const histo = data[ligne] || [];
  if (!histo.length) return alert("Aucun enregistrement pour cette ligne.");

  let html = `
    <h3>Historique ${ligne}</h3>
    <button onclick="exporterExcel('${ligne}')">Exporter Excel</button>
    <table border="1" class="table-histo">
      <tr>
        <th>Date</th><th>Début</th><th>Fin</th><th>Quantité</th>
        <th>Arrêt (min)</th><th>Cause</th><th>Cadence</th><th>❌</th>
      </tr>
  `;

  histo.forEach((r, i) => {
    html += `
      <tr>
        <td>${r.date}</td><td>${r.debut}</td><td>${r.fin}</td>
        <td>${r.quantite}</td><td>${r.arret}</td>
        <td>${r.cause}</td><td>${r.cadence}</td>
        <td><button onclick="supprimer('${ligne}',${i})">🗑️</button></td>
      </tr>
    `;
  });

  html += "</table>";
  document.getElementById("content").innerHTML = html;
}

// === SUPPRESSION D’UNE LIGNE ===
function supprimer(ligne, index) {
  if (confirm("Supprimer cet enregistrement ?")) {
    data[ligne].splice(index, 1);
    sauvegarder();
    voirHistorique(ligne);
  }
}

// === EXPORT EXCEL ===
function exporterExcel(ligne) {
  const rows = data[ligne] || [];
  if (!rows.length) return alert("Aucune donnée à exporter !");
  const header = Object.keys(rows[0]);
  const csv = [
    header.join(","),
    ...rows.map(r => header.map(h => `"${r[h] || ""}"`).join(","))
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `Historique_${ligne}.csv`;
  a.click();
}

// === GRAPHIQUE ===
function dessinerGraphique(ligne) {
  const ctx = document.getElementById(`chart-${ligne}`);
  if (!ctx) return;
  const histo = data[ligne];
  if (!histo.length) return;

  const labels = histo.map(r => r.date);
  const cadence = histo.map(r => parseFloat(r.cadence));
  const arrets = histo.map(r => parseFloat(r.arret));

  new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Cadence (u/h)",
          data: cadence,
          borderColor: "blue",
          tension: 0.3,
          yAxisID: "y1"
        },
        {
          label: "Arrêts (min)",
          data: arrets,
          borderColor: "red",
          tension: 0.3,
          yAxisID: "y2"
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y1: { position: "left", beginAtZero: true },
        y2: { position: "right", beginAtZero: true }
      }
    }
  });
}

// === INITIALISATION ===
document.addEventListener("DOMContentLoaded", () => {
  const savedPage = localStorage.getItem("currentPage") || "atelier";
  openPage(savedPage);
});
