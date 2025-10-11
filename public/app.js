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
  zone.innerHTML = `
    <h2>Atelier</h2>
    <p>Sélectionnez une ligne pour consulter ou saisir les données de production.</p>
  `;
}

// === PAGE LIGNE ===
function pageLigne(nom, zone) {
  const historique = data[nom];
  zone.innerHTML = `
    <h2>${nom}</h2>
    <label>Colis réalisés : <input id="colis" type="number"></label>
    <label>Heure début : <input id="debut" type="time"></label>
    <label>Heure fin : <input id="fin" type="time"></label>
    <label>Qualité : <input id="qualite" type="text"></label>
    <label>Arrêt (min) : <input id="arret" type="number" value="0"></label>
    <button onclick="enregistrer('${nom}')">Enregistrer</button>
    <h3>Historique</h3>
    <table id="table-${nom}">
      <tr><th>Date</th><th>Colis</th><th>Début</th><th>Fin</th><th>Cadence</th><th>Qualité</th><th>Arrêt</th></tr>
      ${historique.map(e => `
        <tr>
          <td>${e.date}</td><td>${e.colis}</td><td>${e.debut}</td>
          <td>${e.fin}</td><td>${e.cadence}</td><td>${e.qualite}</td><td>${e.arret}</td>
        </tr>`).join("")}
    </table>
  `;
}

// === ENREGISTREMENT ===
function enregistrer(nom) {
  const colis = parseInt(document.getElementById("colis").value || 0);
  const debut = document.getElementById("debut").value;
  const fin = document.getElementById("fin").value;
  const qualite = document.getElementById("qualite").value;
  const arret = parseInt(document.getElementById("arret").value || 0);

  // Calcul cadence
  const d1 = new Date(`1970-01-01T${debut}:00`);
  let d2 = new Date(`1970-01-01T${fin}:00`);
  if (d2 < d1) d2.setDate(d2.getDate() + 1);
  const heures = (d2 - d1) / 3600000;
  const cadence = heures > 0 ? (colis / heures).toFixed(1) : 0;

  data[nom].push({
    date: new Date().toLocaleString(),
    colis, debut, fin, cadence, qualite, arret
  });

  sauvegarder();
  openPage(nom);
}ate);
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

// === CALCUL DUREE (passage minuit géré) ===
function calculDuree(debut, fin, arret) {
  const [h1, m1] = debut.split(":").map(Number);
  const [h2, m2] = fin.split(":").map(Number);
  let debutMin = h1 * 60 + m1;
  let finMin = h2 * 60 + m2;
  if (finMin < debutMin) finMin += 24 * 60;
  let duree = (finMin - debutMin - (arret || 0)) / 60;
  return duree > 0 ? duree : 0;
          }                          }
