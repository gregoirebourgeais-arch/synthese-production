// ==============================
// APP.JS — SYNTHÈSE PRODUCTION V29.1
// ==============================

// === VARIABLES GLOBALES ===
let prodHistory = JSON.parse(localStorage.getItem("prodHistory")) || {};
let currentLigne = null;
let currentEquipe = "";
let arretsHistory = JSON.parse(localStorage.getItem("arretsHistory")) || [];
let orgHistory = JSON.parse(localStorage.getItem("orgHistory")) || [];
let personnel = JSON.parse(localStorage.getItem("personnel")) || [];
let activePage = "production";

// === INITIALISATION ===
window.onload = () => {
  updateDateEquipe();
  openSection("production");
  renderArrets();
  renderOrganisation();
  renderPersonnel();
  setupButtonsLignes();
  setInterval(updateDateEquipe, 60000);
};

// === MISE À JOUR DATE ET ÉQUIPE ===
function updateDateEquipe() {
  const now = new Date();
  const heure = now.getHours();
  let equipe = "Inconnue";
  if (heure >= 5 && heure < 13) equipe = "M";
  else if (heure >= 13 && heure < 21) equipe = "AM";
  else equipe = "N";
  currentEquipe = equipe;
  document.getElementById("date-info").innerText = now.toLocaleString("fr-FR");
  document.getElementById("equipe-info").innerText = `Équipe : ${equipe}`;
}

// === NAVIGATION ===
function openSection(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  activePage = id;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// === PRODUCTION ===
function setupButtonsLignes() {
  const lignes = ["Râpé", "T2", "RT", "OMORI", "T1", "Sticks", "Emballage", "Dés", "Filets", "Prédécoupé"];
  const container = document.getElementById("buttons-lignes");
  container.innerHTML = "";
  lignes.forEach(ligne => {
    const btn = document.createElement("button");
    btn.className = "ligne-btn";
    btn.textContent = ligne;
    btn.onclick = () => openLigne(ligne);
    container.appendChild(btn);
  });
}

function openLigne(ligne) {
  currentLigne = ligne;
  const zone = document.getElementById("ligne-content");
  zone.innerHTML = `
    <div class="card">
      <h3>${ligne}</h3>
      <label>Heure début :</label>
      <input type="time" id="deb-${ligne}">
      <label>Heure fin :</label>
      <input type="time" id="fin-${ligne}">
      <label>Quantité réalisée :</label>
      <input type="number" id="qte-${ligne}" placeholder="Nb colis...">
      <label>Quantité restante :</label>
      <input type="number" id="reste-${ligne}" placeholder="Nb colis restants...">
      <label>Cadence manuelle :</label>
      <input type="number" id="cadMan-${ligne}" placeholder="Colis/heure...">
      <div class="actions">
        <button onclick="saveLigne('${ligne}')" class="primary">💾 Enregistrer</button>
        <button onclick="resetCadence('${ligne}')">🔄 Réinit. cadence</button>
      </div>
      <div class="stats" id="stat-${ligne}"></div>
      <canvas id="chart-${ligne}" height="100"></canvas>
    </div>
  `;
  setTimeout(() => zone.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
  renderChart(ligne);
}

function saveLigne(ligne) {
  const deb = document.getElementById(`deb-${ligne}`).value;
  const fin = document.getElementById(`fin-${ligne}`).value;
  const qte = parseFloat(document.getElementById(`qte-${ligne}`).value) || 0;
  const reste = parseFloat(document.getElementById(`reste-${ligne}`).value) || 0;
  const cadMan = parseFloat(document.getElementById(`cadMan-${ligne}`).value) || null;

  if (!deb || !fin || qte === 0) return alert("⚠️ Veuillez renseigner heure début, fin et quantité.");

  const hDeb = new Date(`1970-01-01T${deb}:00`);
  const hFin = new Date(`1970-01-01T${fin}:00`);
  let duree = (hFin - hDeb) / 3600000;
  if (duree <= 0) duree += 24;
  const cadenceAuto = qte / duree;

  const now = new Date();
  const record = {
    date: now.toLocaleDateString("fr-FR"),
    heure: now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    deb,
    fin,
    qte,
    reste,
    cadAuto: cadenceAuto.toFixed(1),
    cadMan,
    equipe: currentEquipe
  };

  if (!prodHistory[ligne]) prodHistory[ligne] = [];
  prodHistory[ligne].push(record);
  localStorage.setItem("prodHistory", JSON.stringify(prodHistory));

  alert(`✅ Enregistré sur ${ligne} (${cadMan ? cadMan : cadenceAuto.toFixed(1)} colis/h)`);

  document.getElementById(`stat-${ligne}`).innerText = `
    Cadence automatique : ${cadenceAuto.toFixed(1)} colis/h
    ${cadMan ? ` | Cadence manuelle : ${cadMan} colis/h` : ""}
    ${reste ? ` | Estim. fin : ${estimFin(reste, cadMan || cadenceAuto)}` : ""}
  `;

  document.getElementById(`qte-${ligne}`).value = "";
  document.getElementById(`reste-${ligne}`).value = "";
  renderChart(ligne);
}

function estimFin(reste, cadence) {
  const heuresRestantes = reste / cadence;
  const finEstimee = new Date(Date.now() + heuresRestantes * 3600000);
  return finEstimee.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function resetCadence(ligne) {
  document.getElementById(`cadMan-${ligne}`).value = "";
  document.getElementById(`stat-${ligne}`).innerText = "Cadence réinitialisée.";
}

function renderChart(ligne) {
  const ctx = document.getElementById(`chart-${ligne}`);
  if (!ctx) return;
  const data = (prodHistory[ligne] || []).slice(-10);
  const labels = data.map(e => e.heure);
  const valeurs = data.map(e => parseFloat(e.cadAuto));
  new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Cadence (colis/h)",
        data: valeurs,
        borderWidth: 2,
        fill: false
      }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });
}

// === ARRÊTS ===
document.getElementById("arSaveBtn").onclick = () => {
  const ligne = document.getElementById("arLigne").value;
  const duree = document.getElementById("arDuree").value;
  const cause = document.getElementById("arCause").value;
  const comment = document.getElementById("arComment").value;
  if (!ligne || !duree || !cause) return alert("⚠️ Complétez tous les champs.");
  const now = new Date();
  arretsHistory.push({
    ligne, duree, cause, comment,
    date: now.toLocaleDateString("fr-FR"),
    heure: now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  });
  localStorage.setItem("arretsHistory", JSON.stringify(arretsHistory));
  renderArrets();
};

function renderArrets() {
  const tbody = document.querySelector("#arTable tbody");
  tbody.innerHTML = "";
  arretsHistory.forEach(a => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${a.date}</td><td>${a.heure}</td><td>${a.ligne}</td><td>${a.duree}</td><td>${a.cause}</td><td>${a.comment}</td>`;
    tbody.appendChild(tr);
  });
}

// === PERSONNEL ===
function savePersonnel() {
  const type = document.getElementById("typePersonnel").value;
  const com = document.getElementById("commentairePersonnel").value;
  const now = new Date();
  personnel.push({
    type, com,
    date: now.toLocaleDateString("fr-FR") + " " + now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  });
  localStorage.setItem("personnel", JSON.stringify(personnel));
  renderPersonnel();
}

function renderPersonnel() {
  const zone = document.getElementById("historiquePersonnel");
  zone.innerHTML = "";
  personnel.slice(-20).reverse().forEach(p => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `<strong>${p.type}</strong> — ${p.com} <br><small>${p.date}</small>`;
    zone.appendChild(div);
  });
}

// === ORGANISATION ===
document.getElementById("orgSaveBtn").onclick = () => {
  const ligne = document.getElementById("orgLigne").value;
  const texte = document.getElementById("orgTexte").value;
  const now = new Date();
  orgHistory.push({
    ligne, texte,
    date: now.toLocaleDateString("fr-FR"),
    heure: now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  });
  localStorage.setItem("orgHistory", JSON.stringify(orgHistory));
  renderOrganisation();
};

function renderOrganisation() {
  const tbody = document.querySelector("#orgTable tbody");
  tbody.innerHTML = "";
  orgHistory.slice(-30).reverse().forEach(o => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${o.date}</td><td>${o.heure}</td><td>${o.ligne}</td><td>${o.texte}</td>`;
    tbody.appendChild(tr);
  });
}
// === EXPORT ATELIER ===
function exportAtelier() {
  const wb = XLSX.utils.book_new();
  const rows = [["Ligne", "Date", "Heure", "Quantité", "Cadence Auto", "Cadence Manuelle", "Équipe"]];
  Object.entries(prodHistory).forEach(([ligne, list]) => {
    list.forEach(e => rows.push([ligne, e.date, e.heure, e.qte, e.cadAuto, e.cadMan, e.equipe]));
  });
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Atelier");
  XLSX.writeFile(wb, `Synthese_Atelier_${new Date().toISOString().slice(0,10)}.xlsx`);
}

// === EXPORT GLOBAL D’ÉQUIPE (TOUT-EN-UN) ===
function exportEquipeExcel() {
  try {
    const equipe = document.getElementById("equipe-info")?.textContent || "Inconnue";
    const today = new Date();
    const dateStr = today.toLocaleDateString('fr-FR');
    const heureStr = today.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const rows = [["Type", "Ligne", "Date", "Heure", "Détail 1", "Détail 2", "Commentaire", "Équipe"]];

    // --- Production ---
    Object.entries(prodHistory).forEach(([ligne, list]) => {
      list.forEach(e => rows.push([
        "Production",
        ligne,
        e.date || dateStr,
        e.heure || heureStr,
        e.qte || "",
        e.cadAuto || e.cadMan || "",
        "",
        e.equipe || equipe
      ]));
    });

    // --- Arrêts ---
    arretsHistory.forEach(a => rows.push([
      "Arrêt",
      a.ligne || "",
      a.date || dateStr,
      a.heure || heureStr,
      a.duree || "",
      a.cause || "",
      a.comment || "",
      equipe
    ]));

    // --- Organisation ---
    orgHistory.forEach(o => rows.push([
      "Organisation",
      o.ligne || "",
      o.date || dateStr,
      o.heure || heureStr,
      "",
      o.texte || "",
      "",
      equipe
    ]));

    // --- Personnel ---
    personnel.forEach(p => rows.push([
      "Personnel",
      "",
      p.date?.split(" ")[0] || dateStr,
      p.date?.split(" ")[1] || heureStr,
      p.type || "",
      "",
      p.com || "",
      equipe
    ]));

    // --- Création du fichier Excel ---
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Synthèse Équipe");
    const fileName = `Synthese_Equipe_${equipe.replace(/\s/g, "_")}_${today.toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    alert("✅ Export Excel complet généré !");
  } catch (err) {
    console.error("Erreur export équipe :", err);
    alert("❌ Erreur lors de l'export Excel global.");
  }
}

// === RESET GLOBAL ===
function resetAll() {
  if (!confirm("🧹 Voulez-vous tout réinitialiser (Production, Arrêts, Personnel, Organisation) ?")) return;
  exportEquipeExcel(); // sauvegarde avant purge
  localStorage.clear();
  prodHistory = {};
  arretsHistory = [];
  orgHistory = [];
  personnel = [];
  alert("✅ Données exportées et réinitialisées !");
  location.reload();
}

// === CHART ATELIER ===
setTimeout(() => {
  const ctx = document.getElementById("atelierChart");
  if (!ctx) return;
  const lignes = Object.keys(prodHistory);
  const moyennes = lignes.map(l => {
    const list = prodHistory[l] || [];
    if (list.length === 0) return 0;
    const total = list.reduce((a,b)=>a+parseFloat(b.cadAuto||0),0);
    return (total/list.length).toFixed(1);
  });
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: lignes,
      datasets: [{ label: "Cadence moyenne", data: moyennes, borderWidth: 1 }]
    },
    options: { plugins: { legend: { display: false } }, responsive: true }
  });
}, 1000);

// === CALCULATRICE ===
let calcBuffer = "";
function toggleCalc() {
  const calc = document.getElementById("calculator");
  calc.style.display = calc.style.display === "none" ? "block" : "none";
}
function calcPress(val) {
  calcBuffer += val;
  document.getElementById("calcDisplay").value = calcBuffer;
}
function calcClear() {
  calcBuffer = "";
  document.getElementById("calcDisplay").value = "";
}
function calcEqual() {
  try {
    const res = eval(calcBuffer);
    calcBuffer = res.toString();
    document.getElementById("calcDisplay").value = calcBuffer;
  } catch {
    document.getElementById("calcDisplay").value = "Erreur";
  }
}
