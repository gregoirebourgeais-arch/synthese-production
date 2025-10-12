// === CONFIGURATION ===
const lignes = [
  "Râpé", "T2", "RT", "OMORI", "T1",
  "Sticks", "Emballage", "Dés", "Filets", "Prédécoupé"
];

let data = JSON.parse(localStorage.getItem("syntheseData")) || {};
let quantitesTemp = JSON.parse(localStorage.getItem("quantitesTemp")) || {};
let dernieresCadences = JSON.parse(localStorage.getItem("dernieresCadences")) || {};
let saisiesEnCours = JSON.parse(localStorage.getItem("saisiesEnCours")) || {};

lignes.forEach(l => {
  if (!Array.isArray(data[l])) data[l] = [];
  if (!quantitesTemp[l]) quantitesTemp[l] = 0;
  if (!dernieresCadences[l]) dernieresCadences[l] = 0;
  if (!saisiesEnCours[l]) saisiesEnCours[l] = "";
});

function sauvegarder() {
  localStorage.setItem("syntheseData", JSON.stringify(data));
  localStorage.setItem("quantitesTemp", JSON.stringify(quantitesTemp));
  localStorage.setItem("dernieresCadences", JSON.stringify(dernieresCadences));
  localStorage.setItem("saisiesEnCours", JSON.stringify(saisiesEnCours));
}
setInterval(sauvegarder, 120000);
window.addEventListener("beforeunload", sauvegarder);

// === NAVIGATION ===
function openPage(page) {
  const content = document.getElementById("content");
  if (page === "atelier") pageAtelier(content);
  else if (page === "historiqueGlobal") pageHistoriqueGlobal(content);
  else pageLigne(page, content);
  localStorage.setItem("currentPage", page);
}

// === PAGE ATELIER ===
function pageAtelier(zone) {
  let html = `
    <h2>🏭 Synthèse Atelier</h2>
    <div class="atelier-grid">
  `;

  lignes.forEach(ligne => {
    const total = quantitesTemp[ligne] || 0;
    const histo = data[ligne] || [];
    const moy =
      histo.length > 0
        ? (
            histo.reduce((sum, r) => sum + parseFloat(r.cadence || 0), 0) /
            histo.length
          ).toFixed(1)
        : 0;

    let perfColor = "🔴";
    if (moy >= 80) perfColor = "🟢";
    else if (moy >= 50) perfColor = "🟡";

    html += `
      <div class="card-ligne" onclick="openPage('${ligne}')">
        <h4>${ligne}</h4>
        <p><strong>Total :</strong> ${total} u</p>
        <p><strong>Cadence moy. :</strong> ${moy} u/h</p>
        <p><strong>Perf :</strong> ${perfColor}</p>
      </div>
    `;
  });

  html += `
    </div>
    <div style="text-align:center; margin-top:20px;">
      <button onclick="openPage('historiqueGlobal')">📊 Historique global</button>
      <button class="btn-export" onclick="exportGlobal()">📦 Fin d’équipe – Export global</button>
    </div>
  `;

  zone.innerHTML = html;
}

// === PAGE HISTORIQUE GLOBAL ===
function pageHistoriqueGlobal(zone) {
  let allRecords = [];
  lignes.forEach(l => {
    (data[l] || []).forEach(r => allRecords.push({ ...r, ligne: l }));
  });

  if (!allRecords.length) {
    zone.innerHTML = `<p class="alert">Aucune donnée enregistrée pour l'instant.</p>
    <button onclick="openPage('atelier')">⬅ Retour Atelier</button>`;
    return;
  }

  allRecords.sort((a, b) => {
    const dA = new Date(a.date.split('/').reverse().join('-'));
    const dB = new Date(b.date.split('/').reverse().join('-'));
    return dB - dA;
  });

  let html = `
    <h2>📋 Historique Global</h2>
    <button onclick="exportGlobal()">📦 Export global (Fin d’équipe)</button>
    <table border="1" class="table-histo">
      <tr>
        <th>Ligne</th><th>Date</th><th>Début</th><th>Fin</th>
        <th>Quantité</th><th>Total</th><th>Arrêt</th><th>Cause</th><th>Cadence</th>
      </tr>
  `;

  allRecords.forEach(r => {
    html += `
      <tr>
        <td>${r.ligne}</td>
        <td>${r.date}</td>
        <td>${r.debut}</td>
        <td>${r.fin}</td>
        <td>${r.quantite}</td>
        <td>${r.total}</td>
        <td>${r.arret}</td>
        <td>${r.cause}</td>
        <td>${r.cadence}</td>
      </tr>
    `;
  });

  html += `
    </table>
    <canvas id="chart-global" height="200"></canvas>
    <div style="text-align:center; margin-top:15px;">
      <button onclick="openPage('atelier')">⬅ Retour Atelier</button>
    </div>
  `;

  zone.innerHTML = html;
  dessinerGraphiqueGlobal();
}

// === GRAPHIQUE GLOBAL DES ARRÊTS ===
function dessinerGraphiqueGlobal() {
  const canvas = document.getElementById("chart-global");
  if (!canvas) return;

  const arretsLignes = lignes.map(l => ({
    ligne: l,
    totalArrets: (data[l] || []).reduce((sum, r) => sum + (parseFloat(r.arret) || 0), 0)
  }));

  arretsLignes.sort((a, b) => b.totalArrets - a.totalArrets);

  new Chart(canvas, {
    type: "bar",
    data: {
      labels: arretsLignes.map(a => a.ligne),
      datasets: [{
        label: "Arrêts cumulés (min)",
        data: arretsLignes.map(a => a.totalArrets),
        backgroundColor: "rgba(0, 75, 155, 0.8)"
      }]
    },
    options: {
      indexAxis: "y",
      plugins: {
        legend: { display: false },
        title: { display: true, text: "Arrêts cumulés par ligne" }
      },
      scales: { x: { beginAtZero: true } }
    }
  });
}

// === EXPORT GLOBAL (CSV + GRAPHIQUE) ===
function exportGlobal() {
  const date = new Date();
  const dateStr = date.toLocaleDateString().replace(/\//g, "-");

  let arretsLignes = lignes.map(ligne => {
    const totalArrets = (data[ligne] || []).reduce((sum, r) => sum + (parseFloat(r.arret) || 0), 0);
    return { ligne, totalArrets };
  });

  arretsLignes.sort((a, b) => b.totalArrets - a.totalArrets);

  let csv = "=== RÉSUMÉ DES ARRÊTS (Trié) ===\nLigne,Total Arrêts (min)\n";
  arretsLignes.forEach(a => csv += `${a.ligne},${a.totalArrets}\n`);

  csv += "\n=== DÉTAIL DES ENREGISTREMENTS ===\n";
  csv += "Ligne,Date,Début,Fin,Quantité,Total,Arrêt (min),Cause,Cadence (u/h)\n";

  lignes.forEach(ligne => {
    (data[ligne] || []).forEach(r => {
      csv += `${ligne},${r.date},${r.debut},${r.fin},${r.quantite},${r.total},${r.arret},${r.cause},${r.cadence}\n`;
    });
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `Synthese_Equipe_${dateStr}.csv`;
  a.click();

  // Graphique arrêts image
  const labels = arretsLignes.map(a => a.ligne);
  const values = arretsLignes.map(a => a.totalArrets);
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 400;
  document.body.appendChild(canvas);

  new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [{ label: "Arrêts cumulés (min)", data: values, backgroundColor: "rgba(0, 75, 155, 0.8)" }]
    },
    options: { indexAxis: "y", plugins: { legend: { display: false } } }
  });

  setTimeout(() => {
    const image = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = image;
    link.download = `Graphique_Arrets_Equipe_${dateStr}.png`;
    link.click();
    document.body.removeChild(canvas);
  }, 1000);

  lignes.forEach(l => {
    quantitesTemp[l] = 0;
    dernieresCadences[l] = 0;
    saisiesEnCours[l] = "";
  });

  sauvegarder();
  alert("✅ Données exportées avec graphique des arrêts. Totaux remis à zéro visuellement.");
  openPage("atelier");
}

// === PAGE LIGNE ===
function pageLigne(ligne, zone) {
  const qTemp = quantitesTemp[ligne] || 0;
  const lastCadence = dernieresCadences[ligne] || 0;
  const saisie = saisiesEnCours[ligne] || "";

  zone.innerHTML = `
    <h2>Ligne ${ligne}</h2>
    <form id="form-${ligne}" class="form-ligne">
      <label>Heure début :</label>
      <input type="time" id="debut"><br>
      <label>Heure fin :</label>
      <input type="time" id="fin"><br>
      <label>Quantité produite (total actuel : ${qTemp}) :</label>
      <input type="number" id="quantite" min="0" value="${saisie}"><br>
      <label>Arrêt (minutes) :</label>
      <input type="number" id="arret" min="0"><br>
      <label>Cause de l'arrêt :</label>
      <input type="text" id="cause" placeholder="Ex : panne, nettoyage..."><br>
      <button type="button" onclick="ajouter('${ligne}')">Enregistrer</button>
      <button type="button" onclick="annulerDernier('${ligne}')">Annuler dernier</button>
      <button type="button" onclick="voirHistorique('${ligne}')">Historique</button>
      <button type="button" onclick="openPage('atelier')">⬅ Retour Atelier</button>
    </form>
    <canvas id="chart-${ligne}" height="120"></canvas>
    <div id="resume-${ligne}" class="resume-ligne">
      <h3>📊 Résumé</h3>
      <p><strong>Total produit :</strong> <span id="total-${ligne}">${qTemp}</span> unités</p>
      <p><strong>Dernière cadence :</strong> <span id="cadence-${ligne}">${lastCadence}</span> u/h</p>
    </div>
  `;

  document.getElementById("quantite").addEventListener("input", e => {
    saisiesEnCours[ligne] = e.target.value;
    sauvegarder();
  });

  dessinerGraphique(ligne);
}

// === AJOUT DONNÉE ===
function ajouter(ligne) {
  const debut = document.getElementById("debut").value;
  const fin = document.getElementById("fin").value;
  const quantiteInput = parseFloat(document.getElementById("quantite").value) || 0;
  const arret = parseFloat(document.getElementById("arret").value) || 0;
  const cause = document.getElementById("cause").value || "";
  if (!debut || !fin || isNaN(quantiteInput)) return alert("Champs incomplets !");

  quantitesTemp[ligne] = (quantitesTemp[ligne] || 0) + quantiteInput;
  const quantiteTotale = quantitesTemp[ligne];

  const d1 = new Date(`1970-01-01T${debut}:00`);
  const d2 = new Date(`1970-01-01T${fin}:00`);
  let duree = (d2 - d1) / 60000;
  if (duree <= 0) duree += 1440;

  const cadence = duree > 0 ? (quantiteInput / (duree / 60)).toFixed(1) : 0;
  const date = new Date();
  const dateStr = date.toLocaleDateString();

  dernieresCadences[ligne] = cadence;

  data[ligne].push({
    date: dateStr,
    debut,
    fin,
    quantite: quantiteInput,
    total: quantiteTotale,
    arret,
    cause,
    cadence
  });

  saisiesEnCours[ligne] = "";
  sauvegarder();

  document.getElementById(`total-${ligne}`).textContent = quantiteTotale;
  document.getElementById(`cadence-${ligne}`).textContent = cadence;
  document.getElementById("quantite").value = "";

  alert(`✅ ${quantiteInput} ajoutée (total ${quantiteTotale}) — cadence ${cadence} u/h`);
  dessinerGraphique(ligne);
}

// === AUTRES FONCTIONS ===
function annulerDernier(ligne) {
  const histo = data[ligne];
  if (!histo.length) return alert("Aucun enregistrement à annuler.");
  const dernier = histo.pop();
  quantitesTemp[ligne] -= dernier.quantite;
  if (quantitesTemp[ligne] < 0) quantitesTemp[ligne] = 0;
  sauvegarder();
  alert(`⛔ Dernier enregistrement annulé (${dernier.quantite} retirée).`);
  pageLigne(ligne, document.getElementById("content"));
}

function voirHistorique(ligne) {
  const histo = data[ligne] || [];
  if (!histo.length) return alert("Aucun enregistrement pour cette ligne.");
  let html = `
    <h3>Historique ${ligne}</h3>
    <button onclick="exporterExcel('${ligne}')">Exporter Excel</button>
    <table border="1" class="table-histo">
      <tr><th>Date</th><th>Début</th><th>Fin</th>
      <th>Quantité</th><th>Total</th><th>Arrêt</th><th>Cause</th><th>Cadence</th><th>❌</th></tr>`;
  histo.forEach((r, i) => {
    html += `<tr><td>${r.date}</td><td>${r.debut}</td><td>${r.fin}</td>
    <td>${r.quantite}</td><td>${r.total}</td><td>${r.arret}</td><td>${r.cause}</td>
    <td>${r.cadence}</td><td><button onclick="supprimer('${ligne}',${i})">🗑️</button></td></tr>`;
  });
  html += "</table>";
  document.getElementById("content").innerHTML = html;
}

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

function supprimer(ligne, index) {
  if (confirm("Supprimer cet enregistrement ?")) {
    data[ligne].splice(index, 1);
    sauvegarder();
    voirHistorique(ligne);
  }
}

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
        { label: "Cadence (u/h)", data: cadence, borderColor: "#004b9b", tension: 0.3 },
        { label: "Arrêts (min)", data: arrets, borderColor: "red", tension: 0.3 }
      ]
    },
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
  });
}

// === INITIALISATION ===
document.addEventListener("DOMContentLoaded", () => {
  const savedPage = localStorage.getItem("currentPage") || "atelier";
  openPage(savedPage);
});
