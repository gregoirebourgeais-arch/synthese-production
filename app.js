// === CONFIGURATION ===
const lignes = [
  "Râpé", "T2", "RT", "OMORI", "T1",
  "Sticks", "Emballage", "Dés", "Filets", "Prédécoupé"
];

let data = JSON.parse(localStorage.getItem("syntheseData")) || {};
let quantitesTemp = JSON.parse(localStorage.getItem("quantitesTemp")) || {};
let dernieresCadences = JSON.parse(localStorage.getItem("dernieresCadences")) || {};
let saisiesEnCours = JSON.parse(localStorage.getItem("saisiesEnCours")) || {}; // nouvelle mémoire pour champ actif

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
    </form>

    <canvas id="chart-${ligne}" height="120"></canvas>

    <div id="resume-${ligne}" class="resume-ligne">
      <h3>📊 Résumé</h3>
      <p><strong>Total produit :</strong> <span id="total-${ligne}">${qTemp}</span> unités</p>
      <p><strong>Dernière cadence :</strong> <span id="cadence-${ligne}">${lastCadence}</span> u/h</p>
    </div>
  `;

  // Sauvegarde saisie en direct
  document.getElementById("quantite").addEventListener("input", (e) => {
    saisiesEnCours[ligne] = e.target.value;
    sauvegarder();
  });

  dessinerGraphique(ligne);
}

// === CALCUL DE LA SEMAINE ===
function getSemaineISO(dateStr) {
  const date = new Date(dateStr.split('/').reverse().join('-'));
  const temp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = temp.getUTCDay() || 7;
  temp.setUTCDate(temp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((temp - yearStart) / 86400000) + 1) / 7);
  return weekNum;
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
  const semaine = getSemaineISO(dateStr);

  dernieresCadences[ligne] = cadence;

  data[ligne].push({
    date: dateStr,
    semaine,
    debut,
    fin,
    quantite: quantiteInput,
    total: quantiteTotale,
    arret,
    cause,
    cadence
  });

  // Efface la saisie du champ (mais conserve total)
  saisiesEnCours[ligne] = "";
  sauvegarder();

  // Mise à jour visuelle
  document.getElementById(`total-${ligne}`).textContent = quantiteTotale;
  document.getElementById(`cadence-${ligne}`).textContent = cadence;
  document.getElementById("quantite").value = "";

  alert(`✅ ${quantiteInput} ajoutée (total ${quantiteTotale}) — cadence ${cadence} u/h`);
  dessinerGraphique(ligne);
}

// === ANNULER DERNIER ENREGISTREMENT ===
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

// === HISTORIQUE ===
function voirHistorique(ligne) {
  const histo = data[ligne] || [];
  if (!histo.length) return alert("Aucun enregistrement pour cette ligne.");

  let html = `
    <h3>Historique ${ligne}</h3>
    <button onclick="exporterExcel('${ligne}')">Exporter Excel</button>
    <table border="1" class="table-histo">
      <tr>
        <th>Date</th><th>Début</th><th>Fin</th>
        <th>Quantité</th><th>Total</th><th>Arrêt</th><th>Cause</th><th>Cadence</th><th>❌</th>
      </tr>
  `;

  histo.forEach((r, i) => {
    html += `
      <tr>
        <td>${r.date}</td><td>${r.debut}</td><td>${r.fin}</td>
        <td>${r.quantite}</td><td>${r.total}</td>
        <td>${r.arret}</td><td>${r.cause}</td><td>${r.cadence}</td>
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

// === GRAPHIQUES ===
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
        { label: "Cadence (u/h)", data: cadence, borderColor: "blue", tension: 0.3 },
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
