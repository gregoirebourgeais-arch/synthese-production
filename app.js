/* ========= Variables globales ========= */
let currentSection = "production";
let currentLine = null;

// bases locales
let dataProd = JSON.parse(localStorage.getItem("syntheseData")) || {};
let dataPersonnel = JSON.parse(localStorage.getItem("personnelData")) || [];
let dataConsignes = JSON.parse(localStorage.getItem("consignesData")) || [];
let arrets = JSON.parse(localStorage.getItem("arretsData")) || [];

const content = document.getElementById("content");

/* ========= Initialisation ========= */
window.addEventListener("load", () => {
  setupMenu();
  renderProduction();
  setupFAB();
  setupCalculator();
  registerServiceWorker();
  updateConsignesAutoExport();
});

/* ========= Gestion du menu ========= */
function setupMenu() {
  document.querySelectorAll(".menu-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".menu-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const section = btn.dataset.section;

      // gestion de navigation
      switch (section) {
        case "production": renderProduction(); break;
        case "personnel": renderPersonnel(); break;
        case "organisation": renderOrganisation(); break;
        case "dashboard": renderDashboard(); break;
        default: renderProduction(); break;
      }
    });
  });
}
/* ========= Section PRODUCTION ========= */
function renderProduction() {
  const lignes = ["Râpé", "T2", "RT", "OMORI", "T1", "Sticks", "Emballage", "Dés", "Filets", "Prédécoupé"];
  let html = `<div class="page fade">
    <h2>Production</h2>
    <div class="card">
      <h3>Choisir une ligne</h3>
      ${lignes.map(l => `<button class="btn primary" onclick="openLine('${l}')">${l}</button>`).join("")}
    </div>
  </div>`;
  content.innerHTML = html;
}

function openLine(line) {
  currentLine = line;
  const d = dataProd[line] || [];
  const total = d.reduce((s, x) => s + (x.produits || 0), 0);
  const cadence = d.length ? total / d.length : 0;
  const estimation = cadence > 0 && d.length > 0 ? (1000 / cadence).toFixed(1) : "_";

  content.innerHTML = `
  <div class="page fade">
    <h2>${line}</h2>
    <div class="card">
      <label>Heure début :</label>
      <input id="debut" type="time">
      <label>Heure fin :</label>
      <input id="fin" type="time">
      <label>Quantité initiale :</label>
      <input id="initiale" type="number" placeholder="0">
      <label>Quantité ajoutée :</label>
      <input id="ajoutee" type="number" placeholder="0">
      <label>Quantité restante :</label>
      <input id="restante" type="number" placeholder="0">
      <label>Minutes d'arrêt :</label>
      <input id="arret" type="number" placeholder="0">
      <label>Cadence manuelle :</label>
      <input id="cadenceManuelle" type="number" placeholder="Saisir cadence manuelle...">
      <div style="text-align:center;margin-top:10px;">
        <button class="btn primary" onclick="saveProd('${line}')">💾 Enregistrer</button>
        <button class="btn ghost" onclick="renderProduction()">⬅️ Retour</button>
      </div>
      <p id="estimation" style="text-align:center;margin-top:10px;">⏱️ Estimation fin : ${estimation}</p>
    </div>
  </div>`;
}

function saveProd(line) {
  const debut = document.getElementById("debut").value;
  const fin = document.getElementById("fin").value;
  const initiale = +document.getElementById("initiale").value || 0;
  const ajoutee = +document.getElementById("ajoutee").value || 0;
  const restante = +document.getElementById("restante").value || 0;
  const arret = +document.getElementById("arret").value || 0;
  const manuelle = +document.getElementById("cadenceManuelle").value || null;
  const produits = initiale + ajoutee - restante;
  const temps = (new Date(`1970-01-01T${fin}:00`) - new Date(`1970-01-01T${debut}:00`)) / 60000 - arret;
  const cadence = temps > 0 ? produits / (temps / 60) : 0;
  const finalCadence = manuelle || cadence;
  const record = { date: new Date().toLocaleString(), debut, fin, produits, cadence: finalCadence };
  if (!dataProd[line]) dataProd[line] = [];
  dataProd[line].push(record);
  localStorage.setItem("syntheseData", JSON.stringify(dataProd));
  toast("✅ Données enregistrées !");
}

/* ========= Section PERSONNEL ========= */
function renderPersonnel() {
  let html = `
  <div class="page fade">
    <h2>Personnel</h2>
    <div class="card">
      <label>Ligne :</label>
      <select id="persLigne">
        <option>Râpé</option><option>T2</option><option>RT</option><option>OMORI</option>
        <option>T1</option><option>Sticks</option><option>Emballage</option><option>Dés</option>
        <option>Filets</option><option>Prédécoupé</option>
      </select>
      <label>Nom :</label>
      <input id="persNom" type="text" placeholder="Nom du salarié">
      <label>Motif :</label>
      <select id="persMotif">
        <option>Absence</option>
        <option>Retard</option>
        <option>Départ</option>
        <option>Autre</option>
      </select>
      <label>Commentaire :</label>
      <textarea id="persComment"></textarea>
      <button class="btn primary" onclick="savePersonnel()">💾 Enregistrer</button>
    </div>
    <div class="card">
      <h3>Historique</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Ligne</th><th>Nom</th><th>Motif</th><th>Commentaire</th></tr></thead>
          <tbody>
            ${dataPersonnel.map(p => `<tr><td>${p.date}</td><td>${p.ligne}</td><td>${p.nom}</td><td>${p.motif}</td><td>${p.comment}</td></tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>
  </div>`;
  content.innerHTML = html;
}

function savePersonnel() {
  const record = {
    date: new Date().toLocaleString(),
    ligne: document.getElementById("persLigne").value,
    nom: document.getElementById("persNom").value,
    motif: document.getElementById("persMotif").value,
    comment: document.getElementById("persComment").value
  };
  dataPersonnel.push(record);
  localStorage.setItem("personnelData", JSON.stringify(dataPersonnel));
  toast("👥 Enregistré !");
  renderPersonnel();
}

/* ========= Section ORGANISATION ========= */
function renderOrganisation() {
  let html = `
  <div class="page fade">
    <h2>Consignes / Organisation</h2>
    <div class="card">
      <label>Date :</label><input type="date" id="consDate" value="${new Date().toISOString().split("T")[0]}">
      <label>Équipe :</label>
      <select id="consEquipe">
        <option>Matin</option><option>Après-midi</option><option>Nuit</option>
      </select>
      <label>Priorité :</label>
      <select id="consPriorite">
        <option>Basse</option><option>Moyenne</option><option>Haute</option>
      </select>
      <label>Consigne :</label><textarea id="consTexte"></textarea>
      <button class="btn primary" onclick="saveConsigne()">💾 Enregistrer</button>
    </div>
    <div class="card">
      <h3>Historique</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Équipe</th><th>Priorité</th><th>Consigne</th></tr></thead>
          <tbody>
            ${dataConsignes.map(c => `<tr><td>${c.date}</td><td>${c.equipe}</td><td>${c.priorite}</td><td>${c.texte}</td></tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>
  </div>`;
  content.innerHTML = html;
}

function saveConsigne() {
  const record = {
    date: document.getElementById("consDate").value,
    equipe: document.getElementById("consEquipe").value,
    priorite: document.getElementById("consPriorite").value,
    texte: document.getElementById("consTexte").value
  };
  dataConsignes.push(record);
  localStorage.setItem("consignesData", JSON.stringify(dataConsignes));
  toast("🗒️ Consigne enregistrée !");
  renderOrganisation();
}

/* ========= Section TABLEAU DE BORD ========= */
function renderDashboard() {
  const totalProd = Object.values(dataProd).flat().reduce((s, x) => s + (x.produits || 0), 0);
  const totalArrets = arrets.reduce((s, x) => s + (x.duree || 0), 0);
  const absences = dataPersonnel.filter(p => p.motif === "Absence").length;
  const consignesJour = dataConsignes.filter(c => c.date === new Date().toISOString().split("T")[0]).length;
  const html = `
  <div class="page fade">
    <h2>Tableau de bord du jour</h2>
    <div class="card"><strong>Total colis :</strong> ${totalProd}</div>
    <div class="card"><strong>Temps d'arrêt total :</strong> ${totalArrets} min</div>
    <div class="card"><strong>Absences :</strong> ${absences}</div>
    <div class="card"><strong>Consignes du jour :</strong> ${consignesJour}</div>
    <div style="text-align:center;margin-top:10px;">
      <button class="btn primary" onclick="exportAll()">📊 Export global Excel</button>
    </div>
  </div>`;
  content.innerHTML = html;
}

/* ========= Export global ========= */
function exportAll() {
  const rows = [["Type","Date","Ligne","Détail","Valeur"]];
  Object.keys(dataProd).forEach(l => dataProd[l].forEach(d => rows.push(["Production", d.date, l, "Produits", d.produits])));
  dataPersonnel.forEach(p => rows.push(["Personnel", p.date, p.ligne, p.motif, p.comment]));
  dataConsignes.forEach(c => rows.push(["Consigne", c.date, c.equipe, c.priorite, c.texte]));
  const csv = rows.map(r => r.join(";")).join("\n");
  const blob = new Blob([csv], {type:"text/csv"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Synthese_Global_${new Date().toLocaleString("fr-FR").replace(/[/:]/g,"-")}.csv`;
  a.click();
  toast("📤 Export global généré !");
}

/* ========= Utilitaires ========= */
function toast(msg) {
  let t = document.createElement("div");
  t.className = "toast show";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(),2000);
}

/* ========= Calculatrice ========= */
function setupCalculator() {
  const calc = document.getElementById("calculator");
  const display = document.getElementById("calcDisplay");
  calc.addEventListener("click", e => {
    if (e.target.tagName !== "BUTTON") return;
    const val = e.target.textContent;
    if (val === "=") display.value = eval(display.value || "0");
    else if (val === "C") display.value = "";
    else display.value += val;
  });
}
function toggleCalculator() {
  const calc = document.getElementById("calculator");
  calc.classList.toggle("hidden");
}

/* ========= FAB ========= */
function setupFAB() {
  document.getElementById("fabCalc").addEventListener("click", toggleCalculator);
  document.getElementById("fabExportAll").addEventListener("click", exportAll);
  document.getElementById("fabArret").addEventListener("click", ()=>toast("🔧 Arrêts à venir (en développement)"));
}

/* ========= Auto-export des consignes ========= */
function updateConsignesAutoExport() {
  const now = new Date();
  const old = dataConsignes.filter(c => (now - new Date(c.date)) > 7*24*60*60*1000);
  if (old.length) {
    const csv = old.map(c => `${c.date};${c.equipe};${c.priorite};${c.texte}`).join("\n");
    const blob = new Blob([csv], {type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Consignes_export_auto_${new Date().toLocaleDateString("fr-FR")}.csv`;
    a.click();
    dataConsignes = dataConsignes.filter(c => (now - new Date(c.date)) <= 7*24*60*60*1000);
    localStorage.setItem("consignesData", JSON.stringify(dataConsignes));
    toast("📦 Consignes exportées (auto)");
  }
}

/* ========= Service Worker ========= */
function registerServiceWorker() {
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("service-worker.js");
    }
