// --- Initialisation ---
const lignes = ['Râpé','T2','RT','OMORI','T1','Sticks','Emballage','Dés','Filets','Prédécoupé'];
const stockageCle = "syntheseData";

// Charger les données si elles existent déjà
function chargerDonnees() {
  let saved = localStorage.getItem(stockageCle);
  let parsed = {};
  try {
    parsed = saved ? JSON.parse(saved) : {};
  } catch {
    parsed = {};
  }
  lignes.forEach(l => { if (!Array.isArray(parsed[l])) parsed[l] = []; });
  return parsed;
}

// Sauvegarder les données
function sauvegarderDonnees(d) {
  localStorage.setItem(stockageCle, JSON.stringify(d));
}

// Données globales
let data = chargerDonnees();

// --- Charger page par défaut ---
document.addEventListener("DOMContentLoaded", () => {
  openPage("atelier");
});

// --- Navigation ---
function openPage(page) {
  const contenu = document.getElementById("content");
  data = chargerDonnees(); // recharge les données à chaque changement
  if (page === "atelier") afficherAtelier(contenu);
  else afficherLigne(page, contenu);
}

// --- PAGE ATELIER ---
function afficherAtelier(zone) {
  let html = `<h2>Vue d'ensemble Atelier</h2>
              <table><tr><th>Ligne</th><th>Cadence Moyenne</th></tr>`;
  let moyennes = [];

  lignes.forEach(l => {
    const items = data[l];
    const moy = items.length ? (items.reduce((a,b)=>a+b.cadence,0)/items.length).toFixed(1) : 0;
    moyennes.push({ligne:l, cadence:moy});
    html += `<tr><td>${l}</td><td>${moy}</td></tr>`;
  });

  html += `</table><canvas id="graphAtelier"></canvas>`;
  zone.innerHTML = html;
  dessinerGraphique('graphAtelier', moyennes.map(m=>m.ligne), moyennes.map(m=>m.cadence), "Cadence Moyenne (colis/h)", "bar");
}

// --- PAGE LIGNE ---
function afficherLigne(nom, zone) {
  const historiques = data[nom];

  let html = `
    <h2>${nom}</h2>
    <form id="form-${nom}">
      <label>Colis réalisés :</label><input type="number" id="colis-${nom}" required><br>
      <label>Heure début :</label><input type="time" id="debut-${nom}" required><br>
      <label>Heure fin :</label><input type="time" id="fin-${nom}" required><br>
      <label>Qualité :</label><input type="text" id="qualite-${nom}"><br>
      <label>Arrêt (min) :</label><input type="number" id="arret-${nom}" value="0"><br>
      <button type="submit">Enregistrer</button>
      <button type="button" onclick="exporterExcel('${nom}')">Exporter Excel</button>
    </form>
    <h3>Historique</h3>
    <table id="table-${nom}">
      <tr><th>Date</th><th>Colis</th><th>Début</th><th>Fin</th><th>Cadence</th><th>Qualité</th><th>Arrêt</th><th>Suppr.</th></tr>
    </table>
    <canvas id="graph-${nom}"></canvas>
  `;

  zone.innerHTML = html;
  const form = document.getElementById(`form-${nom}`);
  const table = document.getElementById(`table-${nom}`);

  form.addEventListener("submit", e => {
    e.preventDefault();
    const colis = +document.getElementById(`colis-${nom}`).value;
    const debut = document.getElementById(`debut-${nom}`).value;
    const fin = document.getElementById(`fin-${nom}`).value;
    const qualite = document.getElementById(`qualite-${nom}`).value;
    const arret = +document.getElementById(`arret-${nom}`).value;

    const hDebut = convertirHeure(debut);
    const hFin = convertirHeure(fin);
    const duree = (hFin - hDebut - arret/60);
    const cadence = duree>0 ? (colis / duree).toFixed(1) : 0;

    const enregistrement = { date:new Date().toLocaleString(), colis, debut, fin, cadence:+cadence, qualite, arret };
    data[nom].push(enregistrement);

    sauvegarderDonnees(data);
    form.reset();

    afficherHistorique(nom, table, data[nom]);
    dessinerGraphique(`graph-${nom}`, data[nom].map(i=>i.date), data[nom].map(i=>i.cadence), "Cadence (colis/h)", "line");
  });

  afficherHistorique(nom, table, historiques);
  dessinerGraphique(`graph-${nom}`, historiques.map(i=>i.date), historiques.map(i=>i.cadence), "Cadence (colis/h)", "line");
}

// --- AFFICHAGE HISTORIQUE ---
function afficherHistorique(nom, table, liste) {
  table.innerHTML = `<tr><th>Date</th><th>Colis</th><th>Début</th><th>Fin</th><th>Cadence</th><th>Qualité</th><th>Arrêt</th><th>Suppr.</th></tr>`;
  liste.forEach((item, index) => {
    table.innerHTML += `<tr>
      <td>${item.date}</td>
      <td>${item.colis}</td>
      <td>${item.debut}</td>
      <td>${item.fin}</td>
      <td>${item.cadence}</td>
      <td>${item.qualite}</td>
      <td>${item.arret}</td>
      <td><button class="suppr" onclick="supprimerLigne('${nom}',${index})">❌</button></td>
    </tr>`;
  });
}

// --- SUPPRIMER UNE LIGNE ---
function supprimerLigne(nom, index) {
  if (!confirm("Supprimer cette ligne ?")) return;
  data[nom].splice(index,1);
  sauvegarderDonnees(data);
  openPage(nom);
}

// --- EXPORT EXCEL ---
function exporterExcel(nom) {
  const items = data[nom];
  if (!items.length) return alert("Aucune donnée à exporter !");
  const csv = [
    ["Date","Colis","Début","Fin","Cadence","Qualité","Arrêt"],
    ...items.map(d=>[d.date,d.colis,d.debut,d.fin,d.cadence,d.qualite,d.arret])
  ].map(e=>e.join(",")).join("\n");
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nom}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// --- GRAPHIQUE ---
function dessinerGraphique(id, labels, data, label, type="line") {
  const ctx = document.getElementById(id);
  if (!ctx) return;
  new Chart(ctx, {
    type,
    data: { labels, datasets: [{ label, data, borderWidth:2, backgroundColor:"rgba(0,100,255,0.4)", borderColor:"#007bff" }] },
    options: { responsive:true, scales:{ y:{ beginAtZero:true } } }
  });
}

function convertirHeure(h) {
  const [H,M] = h.split(":").map(Number);
  return H + M/60;
}
