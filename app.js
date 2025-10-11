// === CONFIGURATION ===
const lignes = [
  "Râpé", "T2", "RT", "OMORI", "T1",
  "Sticks", "Emballage", "Dés", "Filets", "Prédécoupé"
];

let data = JSON.parse(localStorage.getItem("syntheseData")) || {};
lignes.forEach(l => { if (!Array.isArray(data[l])) data[l] = []; });

// Sauvegarde automatique
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
    <form id="form-${ligne}">
      <label>Heure début :</label>
      <input type="time" id="debut"><br>
      <label>Heure fin :</label>
      <input type="time" id="fin"><br>
      <label>Quantité :</label>
      <input type="number" id="quantite" min="0"><br>
      <label>Arrêt (min) :</label>
      <input type="number" id="arret" min="0"><br>
      <button type="button" onclick="ajouter('${ligne}')">Enregistrer</button>
      <button type="button" onclick="voirHistorique('${ligne}')">Historique</button>
    </form>
    <div id="result-${ligne}"></div>
  `;
}

// === AJOUT DONNÉE ===
function ajouter(ligne) {
  const debut = document.getElementById("debut").value;
  const fin = document.getElementById("fin").value;
  const quantite = parseFloat(document.getElementById("quantite").value);
  const arret = parseFloat(document.getElementById("arret").value);
  if (!debut || !fin || isNaN(quantite)) return alert("Champs incomplets !");
  data[ligne].push({ debut, fin, quantite, arret, date: new Date().toLocaleDateString() });
  sauvegarder();
  alert("Donnée enregistrée !");
}

// === HISTORIQUE ===
function voirHistorique(ligne) {
  const histo = data[ligne] || [];
  let html = `<h3>Historique ${ligne}</h3><table border="1"><tr><th>Date</th><th>Début</th><th>Fin</th><th>Quantité</th><th>Arrêt</th></tr>`;
  histo.forEach(r => {
    html += `<tr><td>${r.date}</td><td>${r.debut}</td><td>${r.fin}</td><td>${r.quantite}</td><td>${r.arret || 0}</td></tr>`;
  });
  html += "</table>";
  document.getElementById("content").innerHTML = html;
}

// === INITIALISATION ===
document.addEventListener("DOMContentLoaded", () => {
  const savedPage = localStorage.getItem("currentPage") || "atelier";
  openPage(savedPage);
});
