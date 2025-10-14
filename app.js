/* =========================
   Synthèse Production – V27.3
   ========================= */

// --- Lignes gérées ---
const lignes = ["Râpé","T2","RT","OMORI","T1","Sticks","Emballage","Dés","Filets","Prédécoupé"];

// --- Stockage ---
let prod = JSON.parse(localStorage.getItem("prod")) || {};                // dernier état par ligne
let prodHistory = JSON.parse(localStorage.getItem("prodHistory")) || {};  // historique par ligne
let arrets = JSON.parse(localStorage.getItem("arrets")) || [];
let personnel = JSON.parse(localStorage.getItem("personnel")) || [];
let consignes = JSON.parse(localStorage.getItem("consignes")) || [];

/* =========================
   Horloge / Semaine / Équipe
   ========================= */
function updateHeader(){
  const now = new Date();
  const week = getWeekNumber(now);
  const span = document.getElementById("date-info");
  if (span) {
    span.textContent =
      now.toLocaleDateString("fr-FR",{weekday:"long", day:"2-digit", month:"long", year:"numeric"}) +
      ` — Semaine ${week} — ` +
      now.toLocaleTimeString("fr-FR",{hour:"2-digit", minute:"2-digit", second:"2-digit"});
  }
  const eq = document.getElementById("equipe-info");
  if (eq) eq.innerHTML = `Équipe : <b>${getEquipe(now)}</b>`;
}
setInterval(updateHeader, 1000);
updateHeader();

function getWeekNumber(d){
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}
function getEquipe(dt){
  const h = dt.getHours();
  if (h >= 5 && h < 13)  return "M (5h–13h)";
  if (h >= 13 && h < 21) return "AM (13h–21h)";
  return "N (21h–5h)";
}

/* =========================
   Navigation
   ========================= */
function openSection(id){
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const el = document.getElementById(id);
  if (el) el.classList.add("active");

  if (id === "production") renderButtons();
  if (id === "arrets")     renderArrets();
  if (id === "personnel")  renderPersonnel();
  if (id === "organisation") renderConsignes();
  if (id === "atelier")    renderAtelier();
}

function renderButtons(){
  const box = document.getElementById("buttons-lignes");
  if (!box) return;
  box.innerHTML = "";
  lignes.forEach(l => {
    const b = document.createElement("button");
    b.className = "line-btn";
    b.textContent = l;
    b.onclick = () => openLigne(l);
    box.appendChild(b);
  });
}
renderButtons();
/* ===============================
   Historique Organisation + Arrêts
   =============================== */

const ORG_KEY = "orgHistory";
const ARRETS_KEY = "arretsHistory";

/* utilitaires date/heure courts */
function fmtDate(ts) {
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth()+1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
function fmtHeure(ts) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

/* ========= ORGANISATION ========= */
function loadOrg() {
  try { return JSON.parse(localStorage.getItem(ORG_KEY)) || []; }
  catch { return []; }
}
function saveOrg(list) {
  localStorage.setItem(ORG_KEY, JSON.stringify(list));
}
function addConsigne(ligne, texte) {
  if (!texte || !texte.trim()) return;
  const list = loadOrg();
  list.push({ ts: Date.now(), ligne, texte: texte.trim() });
  saveOrg(list);
}
function renderOrgTable() {
  const tbody = document.querySelector("#orgTable tbody");
  if (!tbody) return;
  const list = loadOrg().sort((a,b)=>b.ts-a.ts);
  tbody.innerHTML = list.map(e => `
    <tr>
      <td>${fmtDate(e.ts)}</td>
      <td>${fmtHeure(e.ts)}</td>
      <td>${e.ligne}</td>
      <td style="text-align:left">${escapeHTML(e.texte)}</td>
    </tr>
  `).join("") || `<tr><td colspan="4">Aucune consigne pour le moment.</td></tr>`;
}
function exportOrganisationCSV() {
  const list = loadOrg().sort((a,b)=>a.ts-b.ts);
  const rows = [
    ["Date","Heure","Ligne","Consigne"],
    ...list.map(e => [fmtDate(e.ts), fmtHeure(e.ts), e.ligne, e.texte.replace(/\r?\n/g," ")])
  ];
  downloadCSV(rows, `organisation_${todayForFile()}.csv`);
}

/* ========= ARRETS ========= */
function loadArrets() {
  try { return JSON.parse(localStorage.getItem(ARRETS_KEY)) || []; }
  catch { return []; }
}
function saveArrets(list) {
  localStorage.setItem(ARRETS_KEY, JSON.stringify(list));
}
function addArret(ligne, duree, cause, comment) {
  const d = Number(duree);
  if (isNaN(d) || d<=0) return;
  const list = loadArrets();
  list.push({ ts: Date.now(), ligne, duree: d, cause: (cause||"").trim(), comment: (comment||"").trim() });
  saveArrets(list);
}
function renderArretsTable() {
  const tbody = document.querySelector("#arTable tbody");
  if (!tbody) return;
  const list = loadArrets().sort((a,b)=>b.ts-a.ts);
  tbody.innerHTML = list.map(e => `
    <tr>
      <td>${fmtDate(e.ts)}</td>
      <td>${fmtHeure(e.ts)}</td>
      <td>${e.ligne}</td>
      <td>${e.duree}</td>
      <td>${escapeHTML(e.cause)}</td>
      <td>${escapeHTML(e.comment)}</td>
    </tr>
  `).join("") || `<tr><td colspan="6">Aucun arrêt enregistré.</td></tr>`;
}
function exportArretsCSV() {
  const list = loadArrets().sort((a,b)=>a.ts-b.ts);
  const rows = [
    ["Date","Heure","Ligne","Durée (min)","Cause","Commentaire"],
    ...list.map(e => [fmtDate(e.ts), fmtHeure(e.ts), e.ligne, String(e.duree), e.cause.replace(/\r?\n/g," "), e.comment.replace(/\r?\n/g," ")])
  ];
  downloadCSV(rows, `arrets_${todayForFile()}.csv`);
}

/* ========= UTIL CSV ========= */
function todayForFile() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2,"0");
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2,"0");
  const mi = String(d.getMinutes()).padStart(2,"0");
  return `${yyyy}-${mm}-${dd}_${hh}${mi}`;
}
function downloadCSV(rows, filename) {
  const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(";")).join("\r\n");
  const blob = new Blob([csv], {type: "text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 0);
}

/* petite protection XSS pour l’historique */
function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

/* ========= WIRING (listeners) ========= */
function bindOrganisationUI() {
  const saveBtn = document.getElementById("orgSaveBtn");
  const exportBtn = document.getElementById("orgExportBtn");
  if (saveBtn) saveBtn.onclick = () => {
    const ligne = document.getElementById("orgLigne").value;
    const txt = document.getElementById("orgTexte").value;
    addConsigne(ligne, txt);
    document.getElementById("orgTexte").value = "";
    renderOrgTable();
  };
  if (exportBtn) exportBtn.onclick = exportOrganisationCSV;
}
function bindArretsUI() {
  const saveBtn = document.getElementById("arSaveBtn");
  const exportBtn = document.getElementById("arExportBtn");
  if (saveBtn) saveBtn.onclick = () => {
    const l = document.getElementById("arLigne").value;
    const d = document.getElementById("arDuree").value;
    const c = document.getElementById("arCause").value;
    const m = document.getElementById("arComment").value;
    addArret(l, d, c, m);
    document.getElementById("arDuree").value = "";
    document.getElementById("arCause").value = "";
    document.getElementById("arComment").value = "";
    renderArretsTable();
  };
  if (exportBtn) exportBtn.onclick = exportArretsCSV;
}

/* appelle ces 4 fonctions à l’init ET à l’ouverture des pages */
function initOrganisationAndArrets() {
  bindOrganisationUI();
  bindArretsUI();
  renderOrgTable();
  renderArretsTable();
}

/* si tu as déjà un init() global, ajoute juste initOrganisationAndArrets() dedans */
document.addEventListener("DOMContentLoaded", initOrganisationAndArrets);

/* =========================
   Page d’une ligne
   ========================= */
function openLigne(ligne){
  const d = prod[ligne] || {};
  const cont = document.getElementById("ligne-content");
  if (!cont) return;

  cont.innerHTML = `
  <div class="card fade-in">
    <h3>${ligne}</h3>

    <label>Heure début :</label>
    <input id="deb-${ligne}" type="time" value="${d.deb || ""}">
    <label>Heure fin :</label>
    <input id="fin-${ligne}" type="time" value="${d.fin || ""}">
    <label>Quantité :</label>
    <input id="qte-${ligne}" type="number" value="${d.qte ?? ""}" placeholder="Colis réalisés">

    <label>Cadence manuelle (colis/h) :</label>
    <input id="cad-${ligne}" type="number" value="${d.cadMan ?? ""}" placeholder="Optionnel">

    <label>Cadence calculée :</label>
    <input id="cadAuto-${ligne}" type="text" readonly value="${d.cadAuto ?? ""}">

    <label>Quantité restante :</label>
    <input id="rest-${ligne}" type="number" value="${d.reste ?? ""}" placeholder="À produire">

    <label>Estimation de fin :</label>
    <input id="est-${ligne}" type="text" readonly value="${d.estimation || ""}">

    <div class="row-actions">
      <button class="primary" onclick="saveLigne('${ligne}')">💾 Enregistrer</button>
      <button onclick="retourMenu()">⬅️ Retour</button>
    </div>
  </div>

  <div class="card fade-in" id="hist-${ligne}">
    <h4>Historique — ${ligne}</h4>
    <div class="tablewrap">
      <table class="mini">
        <thead>
          <tr>
            <th>Date</th><th>Déb</th><th>Fin</th><th>Qte</th>
            <th>Cad.</th><th>Rest.</th><th>Est.</th>
          </tr>
        </thead>
        <tbody id="hist-body-${ligne}"></tbody>
      </table>
    </div>
  </div>
  `;

  // maj dynamique
  ["deb","fin","qte","cad","rest"].forEach(k => {
    document.getElementById(`${k}-${ligne}`).addEventListener("input", () => majCalculs(ligne));
  });

  renderLineHistory(ligne);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function majCalculs(ligne){
  const deb   = document.getElementById(`deb-${ligne}`).value;
  const fin   = document.getElementById(`fin-${ligne}`).value;
  const qte   = +document.getElementById(`qte-${ligne}`).value || 0;
  const cadM  = +document.getElementById(`cad-${ligne}`).value || 0;
  const rest  = +document.getElementById(`rest-${ligne}`).value || 0;

  // cadence auto si on a des heures + quantité
  let cadAuto = 0;
  if (deb && fin && qte > 0) {
    const diff = hoursBetween(deb, fin);
    if (diff > 0) cadAuto = +(qte / diff).toFixed(1);
  }
  document.getElementById(`cadAuto-${ligne}`).value = cadAuto || "";

  // estimation fin : priorité cadence manuelle sinon auto
  const baseCad = cadM || cadAuto;
  let est = "";
  if (baseCad > 0 && rest > 0) {
    const minutes = (rest / baseCad) * 60;
    const t = new Date();
    t.setMinutes(t.getMinutes() + minutes);
    est = t.toLocaleTimeString("fr-FR", {hour:"2-digit", minute:"2-digit"});
  }
  document.getElementById(`est-${ligne}`).value = est;
}

function saveLigne(ligne){
  const d = {
    deb:        document.getElementById(`deb-${ligne}`).value || "",
    fin:        document.getElementById(`fin-${ligne}`).value || "",
    qte:       +document.getElementById(`qte-${ligne}`).value || 0,
    cadMan:    +document.getElementById(`cad-${ligne}`).value || 0,
    cadAuto:   +document.getElementById(`cadAuto-${ligne}`).value || 0,
    reste:     +document.getElementById(`rest-${ligne}`).value || 0,
    estimation: document.getElementById(`est-${ligne}`).value || "",
    date:       new Date().toLocaleString("fr-FR")
  };

  // mise à jour dernier état
  prod[ligne] = d;
  localStorage.setItem("prod", JSON.stringify(prod));

  // historique
  if (!prodHistory[ligne]) prodHistory[ligne] = [];
  prodHistory[ligne].unshift(d);
  localStorage.setItem("prodHistory", JSON.stringify(prodHistory));

  // on laisse les valeurs affichées (visuel) mais on nettoie seulement les inputs de saisie utiles
  document.getElementById(`qte-${ligne}`).value  = "";
  document.getElementById(`cad-${ligne}`).value  = "";
  document.getElementById(`rest-${ligne}`).value = "";
  // les champs d’affichage gardent la dernière cadence/estimation calculée
  renderLineHistory(ligne);
  renderAtelier();
  alert("✅ Enregistré");
}

function renderLineHistory(ligne){
  const body = document.getElementById(`hist-body-${ligne}`);
  if (!body) return;
  const list = prodHistory[ligne] || [];
  body.innerHTML = list.map(e => `
    <tr>
      <td>${e.date}</td>
      <td>${e.deb||""}</td>
      <td>${e.fin||""}</td>
      <td>${e.qte||0}</td>
      <td>${e.cadMan || e.cadAuto || 0}</td>
      <td>${e.reste||0}</td>
      <td>${e.estimation||""}</td>
    </tr>
  `).join("") || `<tr><td colspan="7">Aucun enregistrement.</td></tr>`;
}

function hoursBetween(a,b){
  if (!a || !b) return 0;
  const [h1,m1] = a.split(":").map(Number);
  const [h2,m2] = b.split(":").map(Number);
  let d = (h2 + m2/60) - (h1 + m1/60);
  if (d < 0) d += 24; // passage minuit
  return d;
}
function retourMenu(){
  document.getElementById("ligne-content").innerHTML = "";
  openSection("production");
}

/* =========================
   Arrêts
   ========================= */
function saveArret(){
  const l = document.getElementById("arret-ligne").value;
  const d = +document.getElementById("arret-duree").value || 0;
  const c = document.getElementById("arret-cause").value.trim();
  const com= document.getElementById("arret-com").value.trim();
  if (!l || !d || !c) return alert("Complète la ligne, la durée et la cause.");

  arrets.unshift({ligne:l, duree:d, cause:c, com, date:new Date().toLocaleString("fr-FR")});
  localStorage.setItem("arrets", JSON.stringify(arrets));
  document.getElementById("form-arret").reset();
  renderArrets();
}
function renderArrets(){
  const zone = document.getElementById("liste-arrets");
  if (!zone) return;
  zone.innerHTML = arrets.length ? "" : "<p>Aucun arrêt.</p>";
  arrets.forEach(a=>{
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <p><b>${a.ligne}</b> — ${a.date}</p>
      <p>${a.duree} min — ${a.cause}</p>
      <p>${a.com||""}</p>`;
    zone.appendChild(div);
  });
}

/* =========================
   Personnel
   ========================= */
function savePersonnel(){
  const t = document.getElementById("typePersonnel").value;
  const com = document.getElementById("commentairePersonnel").value.trim();
  personnel.unshift({type:t, com, date:new Date().toLocaleString("fr-FR")});
  localStorage.setItem("personnel", JSON.stringify(personnel));
  document.getElementById("form-pers").reset();
  renderPersonnel();
}
function renderPersonnel(){
  const z = document.getElementById("historiquePersonnel");
  if (!z) return;
  z.innerHTML = personnel.length ? "" : "<p>Aucune donnée.</p>";
  personnel.forEach(p=>{
    const d = document.createElement("div");
    d.className = "card";
    d.innerHTML = `<p><b>${p.type}</b> — ${p.date}</p><p>${p.com||""}</p>`;
    z.appendChild(d);
  });
}

/* =========================
   Consignes (7 jours)
   ========================= */
function saveConsigne(){
  const a = document.getElementById("auteurConsigne").value.trim() || "Anonyme";
  const t = document.getElementById("texteConsigne").value.trim();
  if (!t) return alert("Saisis une consigne.");
  consignes.unshift({auteur:a, texte:t, date:new Date().toLocaleString("fr-FR")});
  localStorage.setItem("consignes", JSON.stringify(consignes));
  document.getElementById("form-consigne").reset();
  renderConsignes();
}
function renderConsignes(){
  const now = Date.now();
  consignes = consignes.filter(c => now - new Date(c.date).getTime() < 7*24*3600*1000);
  localStorage.setItem("consignes", JSON.stringify(consignes));
  const zone = document.getElementById("historiqueConsignes");
  if (!zone) return;
  zone.innerHTML = consignes.length ? "" : "<p>Aucune consigne récente.</p>";
  consignes.forEach(c=>{
    const d = document.createElement("div");
    d.className = "card";
    d.innerHTML = `<p><b>${c.auteur}</b> — ${c.date}</p><p>${c.texte}</p>`;
    zone.appendChild(d);
  });
}

/* =========================
   Atelier (graph cadences)
   ========================= */
let atelierChart = null;
function renderAtelier(){
  const ctx = document.getElementById("atelierChart");
  if (!ctx) return;
  const labels = lignes;
  const vals   = labels.map(l => +(prod[l]?.cadMan || prod[l]?.cadAuto || 0));
  if (atelierChart) atelierChart.destroy();
  // Chart.js requis via CDN dans le HTML
  atelierChart = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets: [{ label: "Cadence (colis/h)", data: vals }] },
    options: { responsive:true, scales:{ y:{ beginAtZero:true } } }
  });
}

/* =========================
   Export Atelier / Reset
   ========================= */
function exportAtelier(){
  let csv = "Ligne;Début;Fin;Quantité;CadenceAuto;CadenceMan;Reste;Estimation;Date\n";
  lignes.forEach(l=>{
    const d = prod[l];
    if (d) csv += `${l};${d.deb||""};${d.fin||""};${d.qte||0};${d.cadAuto||0};${d.cadMan||0};${d.reste||0};${d.estimation||""};${d.date||""}\n`;
  });
  const blob = new Blob([csv], {type:"text/csv"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `export-atelier-${new Date().toISOString().slice(0,19)}.csv`;
  a.click();
}

function resetAll(){
  if (!confirm("Exporter puis réinitialiser l'application ?")) return;
  exportAtelier();
  prod = {}; prodHistory = {}; arrets = []; personnel = []; consignes = [];
  localStorage.clear();
  renderArrets(); renderPersonnel(); renderConsignes(); renderAtelier();
  document.getElementById("ligne-content").innerHTML = "";
  alert("Données remises à zéro (export effectué).");
}

/* =========================
   Calculatrice flottante
   ========================= */
let calcOpen = false;
function toggleCalc(){
  const c = document.getElementById("calculator");
  if (!c) return;
  calcOpen = !calcOpen;
  c.style.display = calcOpen ? "block" : "none";
}
function calcPress(ch){
  const d = document.getElementById("calcDisplay");
  d.value += ch;
}
function calcClear(){
  document.getElementById("calcDisplay").value = "";
}
function calcEqual(){
  const d = document.getElementById("calcDisplay");
  try {
    // évalue seulement chiffres + opérateurs simples
    if (!/^[0-9+\-*/().\s]+$/.test(d.value)) throw 0;
    d.value = String(Function(`"use strict";return (${d.value})`)());
  } catch(e){ d.value = "Err"; }
}

/* =========================
   Init
   ========================= */
openSection("production");
renderArrets(); renderPersonnel(); renderConsignes(); renderAtelier();

// Expose au scope global pour les onclick inline (HTML)
window.openSection = openSection;
window.openLigne   = openLigne;
window.saveLigne   = saveLigne;
window.retourMenu  = retourMenu;
window.saveArret   = saveArret;
window.savePersonnel = savePersonnel;
window.saveConsigne  = saveConsigne;
window.exportAtelier = exportAtelier;
window.resetAll      = resetAll;
window.toggleCalc = toggleCalc;
window.calcPress  = calcPress;
window.calcClear  = calcClear;
window.calcEqual  = calcEqual;
