/* === SYNTHÈSE PRODUCTION V13 PRO+ === */

// --- CONFIGURATION DES LIGNES ---
const lignes = [
  "Râpé", "T2", "RT", "OMORI", "T1",
  "Sticks", "Emballage", "Dés", "Filets", "Prédécoupé"
];

// --- VARIABLES ---
let data = JSON.parse(localStorage.getItem("syntheseData")) || {};
let quantitesTemp = JSON.parse(localStorage.getItem("quantitesTemp")) || {};
let dernieresCadences = JSON.parse(localStorage.getItem("dernieresCadences")) || {};
let cadenceMoyenne = JSON.parse(localStorage.getItem("cadenceMoyenne")) || {};
let saisiesEnCours = JSON.parse(localStorage.getItem("saisiesEnCours")) || {};
let quantiteRestante = JSON.parse(localStorage.getItem("quantiteRestante")) || {};

lignes.forEach(l => {
  if (!Array.isArray(data[l])) data[l] = [];
  if (!quantitesTemp[l]) quantitesTemp[l] = 0;
  if (!dernieresCadences[l]) dernieresCadences[l] = 0;
  if (!cadenceMoyenne[l]) cadenceMoyenne[l] = 0;
  if (!saisiesEnCours[l]) saisiesEnCours[l] = "";
  if (!quantiteRestante[l]) quantiteRestante[l] = 0;
});

// --- SAUVEGARDE PÉRIODIQUE ---
function sauvegarder() {
  localStorage.setItem("syntheseData", JSON.stringify(data));
  localStorage.setItem("quantitesTemp", JSON.stringify(quantitesTemp));
  localStorage.setItem("dernieresCadences", JSON.stringify(dernieresCadences));
  localStorage.setItem("cadenceMoyenne", JSON.stringify(cadenceMoyenne));
  localStorage.setItem("saisiesEnCours", JSON.stringify(saisiesEnCours));
  localStorage.setItem("quantiteRestante", JSON.stringify(quantiteRestante));
}
setInterval(sauvegarder, 120000);
window.addEventListener("beforeunload", sauvegarder);

// --- MISE À JOUR DU PANNEAU FLOTTANT ---
function updatePanneau() {
  const now = new Date();
  const options = { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' };
  const jourDate = now.toLocaleDateString('fr-FR', options);
  const heure = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  // Semaine ISO
  const temp = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = temp.getUTCDay() || 7;
  temp.setUTCDate(temp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((temp - yearStart) / 86400000) + 1) / 7);

  document.getElementById("panneau-info").innerHTML = `
    <strong>Semaine ${weekNum}</strong><br>
    ${jourDate}<br>
    🕒 ${heure}
  `;
}
setInterval(updatePanneau, 1000);

// --- NAVIGATION ENTRE LES PAGES ---
function openPage(page) {
  const content = document.getElementById("content");
  content.style.opacity = "0";
  setTimeout(() => {
    if (page === "atelier") pageAtelier(content);
    else if (page === "historiqueGlobal") pageHistoriqueGlobal(content);
    else pageLigne(page, content);
    localStorage.setItem("currentPage", page);
    setTimeout(() => (content.style.opacity = "1"), 100);
  }, 150);
}

// --- PAGE ATELIER ---
function pageAtelier(zone) {
  let html = `<h2>🏭 Synthèse Atelier</h2><div class="atelier-grid">`;

  lignes.forEach(ligne => {
    const total = quantitesTemp[ligne] || 0;
    const histo = data[ligne] || [];
    const moy = histo.length > 0
      ? (histo.reduce((s, r) => s + parseFloat(r.cadence || 0), 0) / histo.length).toFixed(1)
      : 0;

    let perf = "🔴";
    if (moy >= 80) perf = "🟢";
    else if (moy >= 50) perf = "🟡";

    html += `
      <div class="card-ligne" onclick="openPage('${ligne}')">
        <h4>${ligne}</h4>
        <p><strong>Total :</strong> ${total} u</p>
        <p><strong>Cadence moy. :</strong> ${moy} u/h</p>
        <p><strong>Perf :</strong> ${perf}</p>
      </div>
    `;
  });

  html += `
    </div>
    <div style="text-align:center;margin-top:20px;">
      <button onclick="openPage('historiqueGlobal')">📊 Historique global</button>
      <button onclick="exportGlobal()">📦 Fin d’équipe – Export global</button>
    </div>`;
  zone.innerHTML = html;
}

// --- PAGE LIGNE ---
function pageLigne(ligne, zone) {
  const qTemp = quantitesTemp[ligne] || 0;
  const lastCadence = dernieresCadences[ligne] || 0;
  const moy = cadenceMoyenne[ligne] || 0;
  const saisie = saisiesEnCours[ligne] || "";
  const restant = quantiteRestante[ligne] || "";

  zone.innerHTML = `
    <h2>Ligne ${ligne}</h2>
    <form class="form-ligne">
      <label>Heure début :</label>
      <input type="time" id="debut">
      <label>Heure fin :</label>
      <input type="time" id="fin">
      <label>Quantité produite (total actuel : ${qTemp}) :</label>
      <input type="number" id="quantite" min="0" value="${saisie}">
      <label>Arrêt (minutes) :</label>
      <input type="number" id="arret" min="0">
      <label>Cause de l'arrêt :</label>
      <input type="text" id="cause" placeholder="Ex : panne, nettoyage...">

      <label>Quantité restante (objectif) :</label>
      <input type="number" id="restante" value="${restant}" placeholder="ex: 2000" onchange="majRestante('${ligne}')">

      <div id="heure-fin-${ligne}" class="alert">⏰ Heure estimée de fin : -</div>

      <label>Cadence moyenne (corrigeable) :</label>
      <input type="number" id="cadenceMoy" value="${moy}" onchange="majCadenceMoy('${ligne}')">
      <button type="button" onclick="resetCadence('${ligne}')">♻ Réinitialiser moyenne</button>

      <button type="button" onclick="ajouter('${ligne}')">Enregistrer</button>
      <button type="button" onclick="openPage('atelier')">⬅ Retour Atelier</button>
    </form>

    <canvas id="chart-${ligne}" height="120"></canvas>
    <div class="resume-ligne">
      <h3>📊 Résumé</h3>
      <p><strong>Total produit :</strong> <span id="total-${ligne}">${qTemp}</span> u</p>
      <p><strong>Cadence instantanée :</strong> <span id="cadence-${ligne}">${lastCadence}</span> u/h</p>
      <p><strong>Cadence moyenne :</strong> <span id="moy-${ligne}">${moy}</span> u/h</p>
    </div>
  `;

  document.getElementById("quantite").addEventListener("input", e => {
    saisiesEnCours[ligne] = e.target.value;
    sauvegarder();
  });

  updateHeureFin(ligne);
  dessinerGraphique(ligne);
}

// --- MISE À JOUR QUANTITÉ RESTANTE ---
function majRestante(ligne) {
  const val = parseFloat(document.getElementById("restante").value) || 0;
  quantiteRestante[ligne] = val;
  sauvegarder();
  updateHeureFin(ligne);
}

// --- CALCUL HEURE DE FIN ESTIMÉE ---
function updateHeureFin(ligne) {
  const restante = quantiteRestante[ligne] || 0;
  const cadence = cadenceMoyenne[ligne] || 0;
  if (!restante || !cadence) {
    document.getElementById(`heure-fin-${ligne}`).innerText = "⏰ Heure estimée de fin : -";
    return;
  }

  const minutes = (restante / cadence) * 60;
  const fin = new Date(Date.now() + minutes * 60000);
  const heureStr = fin.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  document.getElementById(`heure-fin-${ligne}`).innerText = `⏰ Heure estimée de fin : ${heureStr}`;
}

// --- MISE À JOUR CADENCE MOYENNE ---
function majCadenceMoy(ligne) {
  const val = parseFloat(document.getElementById("cadenceMoy").value) || 0;
  cadenceMoyenne[ligne] = val;
  sauvegarder();
  updateHeureFin(ligne);
}

// --- RESET CADENCE ---
function resetCadence(ligne) {
  cadenceMoyenne[ligne] = 0;
  sauvegarder();
  document.getElementById(`moy-${ligne}`).textContent = 0;
  alert("♻ Cadence moyenne remise à zéro.");
}

// --- AJOUT D’ENREGISTREMENT ---
function ajouter(ligne) {
  const debut = document.getElementById("debut").value;
  const fin = document.getElementById("fin").value;
  const quantiteInput = parseFloat(document.getElementById("quantite").value) || 0;
  const arret = parseFloat(document.getElementById("arret").value) || 0;
  const cause = document.getElementById("cause").value || "";

  if (!debut || !fin || isNaN(quantiteInput)) return alert("Champs incomplets !");

  quantitesTemp[ligne] += quantiteInput;
  const total = quantitesTemp[ligne];

  const d1 = new Date(`1970-01-01T${debut}:00`);
  const d2 = new Date(`1970-01-01T${fin}:00`);
  let duree = (d2 - d1) / 60000;
  if (duree <= 0) duree += 1440;

  const cadence = duree > 0 ? (quantiteInput / (duree / 60)).toFixed(1) : 0;
  dernieresCadences[ligne] = parseFloat(cadence);

  // Mise à jour cadence moyenne
  const histo = data[ligne];
  const nouvelleMoy = ((cadenceMoyenne[ligne] * histo.length) + parseFloat(cadence)) / (histo.length + 1);
  cadenceMoyenne[ligne] = parseFloat(nouvelleMoy.toFixed(1));

  const date = new Date().toLocaleDateString();
  data[ligne].push({ date, debut, fin, quantite: quantiteInput, total, arret, cause, cadence });
  saisiesEnCours[ligne] = "";
  sauvegarder();

  document.getElementById(`total-${ligne}`).textContent = total;
  document.getElementById(`cadence-${ligne}`).textContent = cadence;
  document.getElementById(`moy-${ligne}`).textContent = cadenceMoyenne[ligne];
  document.getElementById("quantite").value = "";
  alert(`✅ ${quantiteInput} ajoutée — cadence ${cadence} u/h`);
  updateHeureFin(ligne);
  dessinerGraphique(ligne);
}

// --- GRAPHIQUE SIMPLE ---
function dessinerGraphique(ligne) {
  const ctx = document.getElementById(`chart-${ligne}`);
  if (!ctx) return;
  const histo = data[ligne];
  if (!histo.length) return;
  const labels = histo.map(r => r.date);
  const cadence = histo.map(r => parseFloat(r.cadence));
  new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Cadence (u/h)",
        data: cadence,
        borderColor: "#004b9b",
        tension: 0.3
      }]
    },
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
  });
}

// --- CALCULATRICE FLOTTANTE ---
function toggleCalc() {
  const calc = document.getElementById("calculatrice");
  calc.style.display = calc.style.display === "block" ? "none" : "block";
}

function pressCalc(val) {
  const input = document.getElementById("calcInput");
  if (val === "=") {
    try { input.value = eval(input.value); } catch { input.value = "Erreur"; }
  } else if (val === "C") {
    input.value = "";
  } else {
    input.value += val;
  }
}

// --- INITIALISATION ---
document.addEventListener("DOMContentLoaded", () => {
  document.body.insertAdjacentHTML("beforeend", `
    <div id="panneau-info"></div>
    <div id="btn-calc" onclick="toggleCalc()">🧮</div>
    <div id="calculatrice">
      <input id="calcInput" readonly>
      <div class="calc-btns">
        ${["7","8","9","/","4","5","6","*","1","2","3","-","0",".","=","C"]
          .map(b => `<button onclick="pressCalc('${b}')">${b}</button>`).join("")}
      </div>
    </div>
  `);
  updatePanneau();
  openPage(localStorage.getItem("currentPage") || "atelier");
});
