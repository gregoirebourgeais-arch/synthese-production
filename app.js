/* === SYNTHÈSE PRODUCTION – V13.3 PRO STABLE === */

/* ---- CONFIGURATION ---- */
const lignes = ["Râpé", "T2", "RT", "OMORI", "T1", "Sticks", "Emballage", "Dés", "Filets", "Prédécoupé"];

let data = JSON.parse(localStorage.getItem("syntheseData")) || {};
let quantitesTemp = JSON.parse(localStorage.getItem("quantitesTemp")) || {};
let dernieresCadences = JSON.parse(localStorage.getItem("dernieresCadences")) || {};
let cadenceMoyenne = JSON.parse(localStorage.getItem("cadenceMoyenne")) || {};
let saisiesEnCours = JSON.parse(localStorage.getItem("saisiesEnCours")) || {};
let quantiteRestante = JSON.parse(localStorage.getItem("quantiteRestante")) || {};

lignes.forEach(l => {
  data[l] = data[l] || [];
  quantitesTemp[l] = quantitesTemp[l] || 0;
  dernieresCadences[l] = dernieresCadences[l] || 0;
  cadenceMoyenne[l] = cadenceMoyenne[l] || 0;
  saisiesEnCours[l] = saisiesEnCours[l] || "";
  quantiteRestante[l] = quantiteRestante[l] || 0;
});

/* ---- SAUVEGARDE ---- */
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

/* ---- PANNEAU FLOTTANT ---- */
function updatePanneau() {
  const now = new Date();
  const options = { weekday: "long", day: "2-digit", month: "long", year: "numeric" };
  const jourDate = now.toLocaleDateString("fr-FR", options);
  const heure = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  const temp = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = temp.getUTCDay() || 7;
  temp.setUTCDate(temp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((temp - yearStart) / 86400000) + 1) / 7);

  document.getElementById("panneau-info").innerHTML =
    `<strong>Semaine ${weekNum}</strong><br>${jourDate}<br>🕒 ${heure}`;
}
setInterval(updatePanneau, 1000);

/* ---- NAVIGATION ---- */
function openPage(page) {
  const zone = document.getElementById("content");
  zone.style.opacity = "0";
  setTimeout(() => {
    if (page === "atelier") pageAtelier(zone);
    else if (page === "historiqueGlobal") pageHistoriqueGlobal(zone);
    else pageLigne(page, zone);
    localStorage.setItem("currentPage", page);
    setTimeout(() => zone.style.opacity = "1", 100);
  }, 150);
}

/* ---- PAGE ATELIER ---- */
function pageAtelier(zone) {
  let html = `<h2>🏭 Synthèse Atelier</h2><div class="atelier-grid">`;

  lignes.forEach(ligne => {
    const total = quantitesTemp[ligne] || 0;
    const histo = data[ligne];
    const moy = histo.length
      ? (histo.reduce((s, r) => s + parseFloat(r.cadence || 0), 0) / histo.length).toFixed(1)
      : 0;
    const perf = moy >= 80 ? "🟢" : moy >= 50 ? "🟡" : "🔴";
    const id = `spark-${ligne}`;

    html += `
      <div class="card-ligne" onclick="openPage('${ligne}')">
        <h4>${ligne}</h4>
        <canvas id="${id}" height="40"></canvas>
        <p><strong>Total :</strong> ${total} u</p>
        <p><strong>Cadence moy. :</strong> ${moy} u/h ${perf}</p>
      </div>`;
  });

  html += `</div>
  <div style="text-align:center;margin-top:20px;">
    <button onclick="openPage('historiqueGlobal')" class="blue">📊 Historique global</button>
    <button onclick="exportGlobal()" class="green">📦 Fin d’équipe – Export global</button>
  </div>`;

  zone.innerHTML = html;

  // Dessin mini-graphiques
  lignes.forEach(ligne => {
    const histo = data[ligne];
    if (!histo.length) return;
    const ctx = document.getElementById(`spark-${ligne}`);
    new Chart(ctx, {
      type: "line",
      data: {
        labels: histo.map((_, i) => i + 1),
        datasets: [{
          data: histo.map(r => r.cadence),
          borderColor: "#0074e8",
          borderWidth: 2,
          tension: 0.3,
          fill: false,
          pointRadius: 0
        }]
      },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } }
    });
  });
}

/* ---- PAGE LIGNE ---- */
function pageLigne(ligne, zone) {
  const qTemp = quantitesTemp[ligne] || 0;
  const lastCadence = dernieresCadences[ligne] || 0;
  const moy = cadenceMoyenne[ligne] || 0;
  const saisie = saisiesEnCours[ligne] || "";
  const restant = quantiteRestante[ligne] || "";

  zone.innerHTML = `
    <h2>Ligne ${ligne}</h2>
    <form class="form-ligne">
      <label>Heure début :</label><input type="time" id="debut">
      <label>Heure fin :</label><input type="time" id="fin">
      <label>Quantité produite (total actuel : ${qTemp}) :</label>
      <input type="number" id="quantite" min="0" value="${saisie}">
      <label>Arrêt (minutes) :</label><input type="number" id="arret" min="0">
      <label>Cause de l'arrêt :</label><input type="text" id="cause" placeholder="Ex : panne, nettoyage...">
      <label>Quantité restante (objectif) :</label>
      <input type="number" id="restante" value="${restant}" placeholder="ex: 2000" onchange="majRestante('${ligne}')">
      <div id="heure-fin-${ligne}" class="alert">⏰ Heure estimée de fin : -</div>
      <label>Cadence moyenne (corrigeable) :</label>
      <input type="number" id="cadenceMoy" value="${moy}" onchange="majCadenceMoy('${ligne}')">
      <div style="text-align:center;margin-top:10px;">
        <button type="button" onclick="resetCadence('${ligne}')" class="gray">♻ Réinitialiser moyenne</button>
      </div>
      <div style="text-align:center;margin-top:15px;">
        <button type="button" onclick="ajouter('${ligne}')" class="green">💾 Enregistrer</button>
        <button type="button" onclick="annulerDernier('${ligne}')" class="red">↩️ Annuler dernier</button>
        <button type="button" onclick="voirHistorique('${ligne}')" class="blue">📜 Historique</button>
        <button type="button" onclick="openPage('atelier')" class="gray">⬅ Retour Atelier</button>
      </div>
    </form>
    <div class="resume-ligne">
      <h3>📊 Résumé</h3>
      <p><strong>Total produit :</strong> <span id="total-${ligne}">${qTemp}</span> u</p>
      <p><strong>Cadence instantanée :</strong> <span id="cadence-${ligne}">${lastCadence}</span> u/h</p>
      <p><strong>Cadence moyenne :</strong> <span id="moy-${ligne}">${moy}</span> u/h</p>
    </div>
    <div class="resume-ligne">
      <h3>📈 Évolution des cadences</h3>
      <canvas id="chart-${ligne}" height="120"></canvas>
    </div>
  `;

  document.getElementById("quantite").addEventListener("input", e => {
    saisiesEnCours[ligne] = e.target.value;
    sauvegarder();
  });

  updateHeureFin(ligne);
  dessinerGraphique(ligne);
}

/* ---- CALCULS & ACTIONS ---- */
function majRestante(ligne) {
  quantiteRestante[ligne] = parseFloat(document.getElementById("restante").value) || 0;
  sauvegarder();
  updateHeureFin(ligne);
}
function updateHeureFin(ligne) {
  const r = quantiteRestante[ligne], c = cadenceMoyenne[ligne];
  const alertBox = document.getElementById(`heure-fin-${ligne}`);
  if (!r || !c) return alertBox.innerText = "⏰ Heure estimée de fin : -";
  const fin = new Date(Date.now() + (r / c) * 3600000);
  alertBox.innerText = `⏰ Heure estimée de fin : ${fin.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
}
function majCadenceMoy(ligne) {
  cadenceMoyenne[ligne] = parseFloat(document.getElementById("cadenceMoy").value) || 0;
  sauvegarder(); updateHeureFin(ligne);
}
function resetCadence(ligne) {
  cadenceMoyenne[ligne] = 0; sauvegarder();
  document.getElementById(`moy-${ligne}`).textContent = 0;
  alert("♻ Cadence moyenne remise à zéro.");
}

/* ---- ENREGISTREMENTS ---- */
function ajouter(ligne) {
  const debut = document.getElementById("debut").value;
  const fin = document.getElementById("fin").value;
  const q = parseFloat(document.getElementById("quantite").value) || 0;
  const arret = parseFloat(document.getElementById("arret").value) || 0;
  const cause = document.getElementById("cause").value || "";
  if (!debut || !fin || isNaN(q)) return alert("Champs incomplets !");
  quantitesTemp[ligne] += q;
  const d1 = new Date(`1970-01-01T${debut}:00`);
  const d2 = new Date(`1970-01-01T${fin}:00`);
  let duree = (d2 - d1) / 60000; if (duree <= 0) duree += 1440;
  const cadence = (q / (duree / 60)).toFixed(1);
  dernieresCadences[ligne] = parseFloat(cadence);
  const histo = data[ligne];
  const nouvelleMoy = ((cadenceMoyenne[ligne] * histo.length) + parseFloat(cadence)) / (histo.length + 1);
  cadenceMoyenne[ligne] = parseFloat(nouvelleMoy.toFixed(1));
  data[ligne].push({ date: new Date().toLocaleDateString(), debut, fin, quantite: q, total: quantitesTemp[ligne], arret, cause, cadence });
  saisiesEnCours[ligne] = ""; sauvegarder();
  document.getElementById(`total-${ligne}`).textContent = quantitesTemp[ligne];
  document.getElementById(`cadence-${ligne}`).textContent = cadence;
  document.getElementById(`moy-${ligne}`).textContent = cadenceMoyenne[ligne];
  document.getElementById("quantite").value = "";
  alert(`✅ ${q} ajoutée — cadence ${cadence} u/h`);
  updateHeureFin(ligne); dessinerGraphique(ligne);
}
function annulerDernier(ligne) {
  if (!data[ligne].length) return alert("Aucun enregistrement à annuler !");
  const d = data[ligne].pop();
  quantitesTemp[ligne] -= d.quantite; if (quantitesTemp[ligne] < 0) quantitesTemp[ligne] = 0;
  sauvegarder(); alert(`↩️ ${d.quantite} retirée.`); pageLigne(ligne, document.getElementById("content"));
}
function voirHistorique(ligne) {
  const histo = data[ligne];
  if (!histo.length) return alert("Aucun enregistrement !");
  let html = `<h3>Historique ${ligne}</h3><table class="table-histo"><tr>
  <th>Date</th><th>Début</th><th>Fin</th><th>Quantité</th><th>Total</th><th>Arrêt</th><th>Cause</th><th>Cadence</th></tr>`;
  histo.forEach(r => html += `<tr><td>${r.date}</td><td>${r.debut}</td><td>${r.fin}</td><td>${r.quantite}</td><td>${r.total}</td><td>${r.arret}</td><td>${r.cause}</td><td>${r.cadence}</td></tr>`);
  html += `</table><div style="text-align:center;margin-top:10px;">
  <button onclick="openPage('${ligne}')" class="gray">⬅ Retour Ligne</button></div>`;
  document.getElementById("content").innerHTML = html;
}

/* ---- GRAPHIQUE ---- */
function dessinerGraphique(ligne) {
  const ctx = document.getElementById(`chart-${ligne}`); if (!ctx) return;
  const histo = data[ligne]; if (!histo.length) return;
  const labels = histo.map(r => r.date);
  const cadence = histo.map(r => parseFloat(r.cadence));
  new Chart(ctx, {
    type: "line",
    data: { labels, datasets: [{ label: "Cadence (u/h)", data: cadence, borderColor: "#004b9b", tension: 0.3, fill: false }] },
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
  });
}

/* ---- CALCULATRICE ---- */
function toggleCalc() {
  const c = document.getElementById("calculatrice");
  c.style.display = c.style.display === "block" ? "none" : "block";
}
function pressCalc(v) {
  const i = document.getElementById("calcInput");
  if (v === "=") { try { i.value = eval(i.value); } catch { i.value = "Erreur"; } }
  else if (v === "C") i.value = ""; else i.value += v;
}

/* ---- INITIALISATION ---- */
document.addEventListener("DOMContentLoaded", () => {
  document.body.insertAdjacentHTML("beforeend", `
    <div id="panneau-info"></div>
    <div id="btn-calc" onclick="toggleCalc()">🧮</div>
    <div id="calculatrice"><input id="calcInput" readonly>
      <div class="calc-btns">
        ${["7","8","9","/","4","5","6","*","1","2","3","-","0",".","=","C"]
          .map(b => `<button onclick="pressCalc('${b}')">${b}</button>`).join("")}
      </div>
    </div>`);
  updatePanneau();
  openPage(localStorage.getItem("currentPage") || "atelier");
});
