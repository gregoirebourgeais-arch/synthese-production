/* === HORLOGE === */
function updateHorloge() {
  const now = new Date();
  const options = { weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' };
  document.getElementById('horloge').innerText = now.toLocaleString('fr-FR', options);
}
setInterval(updateHorloge, 1000);
updateHorloge();

/* === NAVIGATION === */
function showPage(pageId) {
  document.querySelectorAll('.page-section').forEach(sec => sec.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
  if (pageId === "atelier") majGraphAtelier();
}

/* === DONNÉES LOCALES === */
let productionData = JSON.parse(localStorage.getItem("productionData")) || {};
let arretsData = JSON.parse(localStorage.getItem("arretsData")) || [];
let organisationData = JSON.parse(localStorage.getItem("organisationData")) || [];
let personnelData = JSON.parse(localStorage.getItem("personnelData")) || [];

/* === LIGNES === */
const lignes = ["Râpé","T2","RT","T1","OMORI","Sticks","Emballage","Dés","Filets","Prédécoupés"];
const container = document.getElementById("ligneContainer");

lignes.forEach(ligne => {
  const card = document.createElement("div");
  card.className = "card hidden";
  card.id = `ligne-${ligne}`;
  card.innerHTML = `
    <h3>${ligne}</h3>
    <label>Heure début :</label><input type="time" id="debut-${ligne}">
    <label>Heure fin :</label><input type="time" id="fin-${ligne}">
    <label>Quantité produite :</label><input type="number" id="qte-${ligne}" placeholder="colis">
    <label>Quantité restante :</label><input type="number" id="reste-${ligne}" placeholder="colis">
    <label>Arrêts (min):</label><input type="number" id="arret-${ligne}" placeholder="minutes">
    <label>Commentaire :</label><textarea id="comment-${ligne}"></textarea>
    <div id="resultats-${ligne}">
      <p><strong>Cadence :</strong> <span id="cad-${ligne}">0</span> colis/h</p>
      <p><strong>Fin estimée :</strong> <span id="finEst-${ligne}">--:--</span></p>
    </div>
    <button onclick="enregistrerLigne('${ligne}')">💾 Enregistrer</button>
    <button onclick="resetLigne('${ligne}')">🔄 Remise à zéro</button>
    <button onclick="afficherHistorique('${ligne}')">📜 Historique</button>
    <canvas id="graph-${ligne}" height="100"></canvas>
  `;
  container.appendChild(card);
});

/* === AFFICHAGE LIGNE === */
function showLigne(nom) {
  document.querySelectorAll("#ligneContainer .card").forEach(c => c.classList.add("hidden"));
  document.getElementById(`ligne-${nom}`).classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* === CALCUL CADENCE + ESTIMATION === */
function calculerCadence(nom) {
  const debut = document.getElementById(`debut-${nom}`).value;
  const fin = document.getElementById(`fin-${nom}`).value;
  const qte = parseFloat(document.getElementById(`qte-${nom}`).value) || 0;
  if (!debut || !fin) return 0;
  const diff = (new Date(`1970-01-01T${fin}:00`) - new Date(`1970-01-01T${debut}:00`)) / 3600000;
  return diff > 0 ? Math.round(qte / diff) : 0;
}

function estimerFin(nom) {
  const reste = parseFloat(document.getElementById(`reste-${nom}`).value) || 0;
  const cad = parseFloat(document.getElementById(`cad-${nom}`).textContent) || 0;
  const now = new Date();
  if (cad > 0 && reste > 0) {
    const heures = reste / cad;
    now.setHours(now.getHours() + heures);
    document.getElementById(`finEst-${nom}`).textContent = now.toLocaleTimeString("fr-FR", {hour: "2-digit", minute: "2-digit"});
  }
}

lignes.forEach(ligne => {
  document.getElementById(`reste-${ligne}`).addEventListener("input", () => estimerFin(ligne));
});

/* === ENREGISTREMENT === */
function enregistrerLigne(nom) {
  const obj = {
    date: new Date().toLocaleString("fr-FR"),
    debut: document.getElementById(`debut-${nom}`).value,
    fin: document.getElementById(`fin-${nom}`).value,
    qte: parseFloat(document.getElementById(`qte-${nom}`).value) || 0,
    reste: parseFloat(document.getElementById(`reste-${nom}`).value) || 0,
    arret: parseFloat(document.getElementById(`arret-${nom}`).value) || 0,
    comment: document.getElementById(`comment-${nom}`).value,
    cadence: calculerCadence(nom)
  };
  if (!productionData[nom]) productionData[nom] = [];
  productionData[nom].push(obj);
  localStorage.setItem("productionData", JSON.stringify(productionData));
  document.getElementById(`cad-${nom}`).textContent = obj.cadence;
  estimerFin(nom);
  majGraphique(nom);
  resetInputs(nom);
}

function resetInputs(nom) {
  ["qte","reste","arret","comment"].forEach(id => document.getElementById(`${id}-${nom}`).value = "");
}

/* === HISTORIQUE === */
function afficherHistorique(nom) {
  const data = productionData[nom] || [];
  let html = `<h4>Historique ${nom}</h4><table><tr><th>Date</th><th>Début</th><th>Fin</th><th>Qte</th><th>Cadence</th></tr>`;
  data.forEach(d => html += `<tr><td>${d.date}</td><td>${d.debut}</td><td>${d.fin}</td><td>${d.qte}</td><td>${d.cadence}</td></tr>`);
  html += "</table>";
  document.getElementById(`ligne-${nom}`).insertAdjacentHTML("beforeend", html);
}

/* === GRAPHIQUES === */
function majGraphique(nom) {
  const ctx = document.getElementById(`graph-${nom}`).getContext("2d");
  const data = productionData[nom] || [];
  const labels = data.map(d => d.date.split(" ")[1]);
  const valeurs = data.map(d => d.cadence);
  new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Cadence (colis/h)",
        data: valeurs,
        borderColor: "#007ac3",
        fill: false
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

function majGraphAtelier() {
  const ctx = document.getElementById("graphAtelier").getContext("2d");
  const labels = lignes;
  const valeurs = lignes.map(l => {
    const arr = productionData[l] || [];
    return arr.length ? arr[arr.length-1].qte : 0;
  });
  new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Quantité par ligne",
        data: valeurs,
        backgroundColor: "#007ac3"
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

/* === ARRÊTS === */
function ajouterArret(e) {
  e.preventDefault();
  const ligne = document.getElementById("ligneArret").value;
  const duree = parseFloat(document.getElementById("dureeArret").value);
  const comment = document.getElementById("commentArret").value;
  arretsData.push({ date: new Date().toLocaleString("fr-FR"), ligne, duree, comment });
  localStorage.setItem("arretsData", JSON.stringify(arretsData));
  afficherArrets();
  e.target.reset();
}
function afficherArrets() {
  const div = document.getElementById("tableArrets");
  let html = "<table><tr><th>Date</th><th>Ligne</th><th>Durée (min)</th><th>Commentaire</th></tr>";
  arretsData.forEach(a => html += `<tr><td>${a.date}</td><td>${a.ligne}</td><td>${a.duree}</td><td>${a.comment}</td></tr>`);
  html += "</table>";
  div.innerHTML = html;
}
afficherArrets();

/* === ORGANISATION === */
function ajouterOrganisation(e) {
  e.preventDefault();
  const note = document.getElementById("noteOrganisation").value;
  organisationData.push({ date: new Date().toLocaleString("fr-FR"), note });
  localStorage.setItem("organisationData", JSON.stringify(organisationData));
  afficherOrganisation();
  e.target.reset();
}
function afficherOrganisation() {
  const div = document.getElementById("historiqueOrganisation");
  div.innerHTML = organisationData.map(o => `<p><strong>${o.date}</strong> — ${o.note}</p>`).join("");
}
afficherOrganisation();

/* === PERSONNEL === */
function ajouterPersonnel(e) {
  e.preventDefault();
  const nom = document.getElementById("nomPersonnel").value;
  const motif = document.getElementById("motifPersonnel").value;
  const com = document.getElementById("commentPersonnel").value;
  personnelData.push({ date: new Date().toLocaleString("fr-FR"), nom, motif, com });
  localStorage.setItem("personnelData", JSON.stringify(personnelData));
  afficherPersonnel();
  e.target.reset();
}
function afficherPersonnel() {
  const div = document.getElementById("historiquePersonnel");
  div.innerHTML = personnelData.map(p => `<p><strong>${p.date}</strong> — ${p.nom} (${p.motif}) : ${p.com}</p>`).join("");
}
afficherPersonnel();

/* === EXPORT EXCEL GLOBAL === */
function exportAllData() {
  const wb = XLSX.utils.book_new();
  const rows = [];
  lignes.forEach(l => (productionData[l] || []).forEach(d => rows.push({ Type:"Production", Ligne:l, ...d })));
  arretsData.forEach(a => rows.push({ Type:"Arrêt", Ligne:a.ligne, Date:a.date, Duree:a.duree, Commentaire:a.comment }));
  organisationData.forEach(o => rows.push({ Type:"Organisation", Date:o.date, Note:o.note }));
  personnelData.forEach(p => rows.push({ Type:"Personnel", Date:p.date, Nom:p.nom, Motif:p.motif, Commentaire:p.com }));
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Synthèse Atelier");
  XLSX.writeFile(wb, `Synthese_Lactalis_${new Date().toLocaleDateString("fr-FR")}.xlsx`);
}

/* === CALCULATRICE === */
const calcBtns = ["7","8","9","/","4","5","6","*","1","2","3","-","0",".","=","+"];
const calcContainer = document.querySelector(".calc-btns");
calcBtns.forEach(b => {
  const btn = document.createElement("button");
  btn.textContent = b;
  btn.onclick = () => handleCalc(b);
  calcContainer.appendChild(btn);
});
let calcBuffer = "";
function handleCalc(val) {
  const display = document.getElementById("calcDisplay");
  if (val === "=") {
    try { calcBuffer = eval(calcBuffer).toString(); } catch { calcBuffer = "Erreur"; }
  } else calcBuffer += val;
  display.value = calcBuffer;
}
function toggleCalc() {
  document.getElementById("calcPanel").classList.toggle("hidden");
}

/* === FIN === */
