// ====== VARIABLES GLOBALES ======
let dataProduction = JSON.parse(localStorage.getItem("dataProduction")) || [];
let arrets = JSON.parse(localStorage.getItem("arretsData")) || [];
let personnels = JSON.parse(localStorage.getItem("personnelData")) || [];
let consignes = JSON.parse(localStorage.getItem("consignesData")) || [];
let chart;

// ====== INITIALISATION ======
document.addEventListener("DOMContentLoaded", () => {
  setupMenu();
  setupFAB();
  afficherDateHeure();
  renderProduction();
  setInterval(afficherDateHeure, 1000);
});

// ====== DATE / HEURE ======
function afficherDateHeure() {
  const d = new Date();
  const semaine = getWeekNumber(d);
  document.getElementById("dateTime").textContent =
    d.toLocaleString("fr-FR") + ` — Semaine ${semaine}`;
}

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

// ====== MENU ======
function setupMenu() {
  document.querySelectorAll(".menu-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".menu-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
      document.getElementById(btn.dataset.section).classList.add("active");
      if (btn.dataset.section === "dashboard") renderDashboard();
    });
  });
}

// ====== PAGE PRODUCTION ======
function renderProduction() {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById("production").classList.add("active");
}

function openLine(line) {
  const qty = prompt(`Quantité produite sur la ligne ${line} :`, "0");
  const start = prompt("Heure de début (HH:MM)", "08:00");
  const end = prompt("Heure de fin (HH:MM)", "16:00");
  const q = parseFloat(qty) || 0;

  if (!q) return;
  const t1 = parseHeure(start);
  const t2 = parseHeure(end);
  const diffHeure = (t2 - t1) / 3600000;
  const cadence = diffHeure > 0 ? q / diffHeure : 0;

  const record = {
    ligne: line,
    debut: start,
    fin: end,
    quantite: q,
    cadence: cadence.toFixed(2),
    date: new Date().toLocaleString()
  };

  dataProduction.push(record);
  localStorage.setItem("dataProduction", JSON.stringify(dataProduction));
  alert(`✅ Données enregistrées pour ${line}\nCadence : ${record.cadence} colis/h`);
}

function parseHeure(str) {
  const [h, m] = str.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

// ====== ARRÊTS ======
function setupFAB() {
  document.getElementById("fabArret").addEventListener("click", renderArrets);
  document.getElementById("fabGraph").addEventListener("click", renderDashboard);
  document.getElementById("fabCalc").addEventListener("click", toggleCalculator);
}

function renderArrets() {
  const main = document.getElementById("content");
  main.innerHTML = `
  <section class="page fade active">
    <h2>Arrêts de lignes</h2>
    <form id="formArret">
      <label>Ligne :</label>
      <select id="arretLigne">
        <option>Râpé</option><option>T2</option><option>RT</option><option>OMORI</option>
        <option>T1</option><option>Sticks</option><option>Emballage</option>
        <option>Dés</option><option>Filets</option><option>Prédécoupé</option>
      </select>
      <label>Durée (minutes) :</label>
      <input id="arretDuree" type="number" min="0" />
      <label>Cause :</label>
      <textarea id="arretCause" placeholder="Détail de la cause..."></textarea>
      <button type="button" onclick="saveArret()">💾 Enregistrer</button>
    </form>
    <div class="card">
      <h3>Historique</h3>
      <table><thead><tr><th>Date</th><th>Ligne</th><th>Durée</th><th>Cause</th></tr></thead>
      <tbody>${arrets.map(a=>`<tr><td>${a.date}</td><td>${a.ligne}</td><td>${a.duree}</td><td>${a.cause}</td></tr>`).join("")}</tbody>
      </table>
    </div>
  </section>`;
}

function saveArret() {
  const rec = {
    date: new Date().toLocaleString(),
    ligne: document.getElementById("arretLigne").value,
    duree: +document.getElementById("arretDuree").value || 0,
    cause: document.getElementById("arretCause").value
  };
  arrets.push(rec);
  localStorage.setItem("arretsData", JSON.stringify(arrets));
  alert("⏸️ Arrêt enregistré !");
  renderArrets();
}

// ====== PERSONNEL ======
function ajouterPersonnel() {
  const type = document.getElementById("typePersonnel").value;
  const com = document.getElementById("commentPersonnel").value;
  const rec = { date: new Date().toLocaleString(), type, commentaire: com };
  personnels.push(rec);
  localStorage.setItem("personnelData", JSON.stringify(personnels));
  document.getElementById("commentPersonnel").value = "";
  renderPersonnel();
}

function renderPersonnel() {
  const zone = document.getElementById("historiquePersonnel");
  zone.innerHTML = `<h3>Historique</h3><table><thead><tr><th>Date</th><th>Type</th><th>Commentaire</th></tr></thead>
  <tbody>${personnels.map(p=>`<tr><td>${p.date}</td><td>${p.type}</td><td>${p.commentaire}</td></tr>`).join("")}</tbody></table>`;
}

// ====== CONSIGNES ======
function ajouterConsigne() {
  const texte = document.getElementById("texteConsigne").value.trim();
  if (!texte) return;
  const rec = { date: new Date().toLocaleString(), texte };
  consignes.push(rec);
  localStorage.setItem("consignesData", JSON.stringify(consignes));
  document.getElementById("texteConsigne").value = "";
  renderConsignes();
}

function renderConsignes() {
  const zone = document.getElementById("listeConsignes");
  zone.innerHTML = `<h3>Historique des consignes</h3>
  ${consignes.map(c=>`<div class="card"><b>${c.date}</b><br>${c.texte}</div>`).join("")}`;
}
setInterval(()=>{
  const now=Date.now();
  consignes=consignes.filter(c=>now - new Date(c.date).getTime() < 7*24*3600*1000);
  localStorage.setItem("consignesData", JSON.stringify(consignes));
},3600000);

// ====== TABLEAU DE BORD ======
function renderDashboard() {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById("dashboard").classList.add("active");

  const ctx = document.getElementById("globalChart");
  if (!ctx) return;

  const labels = dataProduction.map(d=>d.ligne);
  const valeurs = dataProduction.map(d=>+d.cadence);

  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets: [{ label:"Cadence (colis/h)", data: valeurs }] },
    options: { responsive:true, scales:{ y:{ beginAtZero:true } } }
  });
}

// ====== EXPORT EXCEL + REMISE À ZÉRO ======
function exportAll() {
  let csv = "Section;Date;Ligne;Quantité;Cadence;Durée;Cause;Type;Commentaire;Consigne\n";
  dataProduction.forEach(d=> csv += `Production;${d.date};${d.ligne};${d.quantite};${d.cadence};;;;;\n`);
  arrets.forEach(a=> csv += `Arrêt;${a.date};${a.ligne};;;${a.duree};${a.cause};;;;\n`);
  personnels.forEach(p=> csv += `Personnel;${p.date};;;;;;${p.type};${p.commentaire};\n`);
  consignes.forEach(c=> csv += `Consigne;${c.date};;;;;;;;;${c.texte}\n`);
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `Synthese_Lactalis_${new Date().toISOString().replace(/[:.]/g,"-")}.csv`;
  a.click();
}

function resetAll() {
  exportAll();
  localStorage.clear();
  dataProduction = [];
  arrets = [];
  personnels = [];
  consignes = [];
  alert("🔄 Données exportées et base réinitialisée !");
  location.reload();
}

// ====== CALCULATRICE ======
function toggleCalculator() {
  document.getElementById("calculator").classList.toggle("hidden");
}

document.querySelectorAll(".calc-buttons button").forEach(btn => {
  btn.addEventListener("click", () => {
    const disp = document.getElementById("calc-display");
    if (btn.textContent === "=") {
      try { disp.value = eval(disp.value) } catch { disp.value = "Erreur" }
    } else if (btn.textContent === "C") disp.value = "";
    else disp.value += btn.textContent;
  });
});
