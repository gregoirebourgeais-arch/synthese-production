// === Synthèse Production - app.js (version complète) ===
// Fonctions principales : navigation, stockage local, pages, graphiques, export CSV, calculatrice.

// --- CONFIGURATION ---
const lignes = ["Râpé","T2","RT","OMORI","T1","Sticks","Emballage","Dés","Filets","Prédécoupé"];
const STORAGE_KEY = "syntheseData_v1";
const CURRENT_KEY = "syntheseCurrent_v1";

// Data structure:
// data = { "Râpé": [ {date, start, end, qty1, qty2, stopMin, stopCause, comment, remaining} ], ... }

let data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
let currentInputs = JSON.parse(localStorage.getItem(CURRENT_KEY)) || {}; // persistant tant qu'on n'enregistre pas

// Ensure arrays exist
lignes.forEach(l => { if(!Array.isArray(data[l])) data[l]=[]; if(!currentInputs[l]) currentInputs[l] = {}; });

// Auto-save interval
function saveAll(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  localStorage.setItem(CURRENT_KEY, JSON.stringify(currentInputs));
}
setInterval(saveAll, 10000);
window.addEventListener("beforeunload", saveAll);

// --- UTILITAIRE DATES / HEURES ---
function nowFormatted(){
  const d = new Date();
  return d.toLocaleString();
}
function timeHHMM(date = new Date()){
  return date.toTimeString().slice(0,5);
}
function dateYMD(){
  const d = new Date();
  return d.toLocaleDateString();
}
function weekNumber(d = new Date()){
  // ISO week number
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
  return Math.ceil((((date - yearStart) / 86400000) + 1)/7);
}

// --- TOP CLOCK ---
function updateTopClock(){
  const el = document.getElementById("topClock");
  if(!el) return;
  const d = new Date();
  el.textContent = `${d.toLocaleDateString(undefined,{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'})} — Semaine ${weekNumber(d)} — ${timeHHMM(d)}`;
}
setInterval(updateTopClock, 1000);
document.addEventListener("DOMContentLoaded", updateTopClock);

// --- MENU GENERATION ---
function buildMenu(){
  const menu = document.getElementById("menuButtons");
  menu.innerHTML = "";
  const atelierBtn = document.createElement("button");
  atelierBtn.textContent = "Atelier";
  atelierBtn.onclick = ()=> openPage("Atelier");
  menu.appendChild(atelierBtn);
  lignes.forEach(l => {
    const b = document.createElement("button");
    b.textContent = l;
    b.onclick = ()=> openPage(l);
    menu.appendChild(b);
  });
}
buildMenu();

// --- NAVIGATION ---
function openPage(page){
  if(page === "Atelier") pageAtelier();
  else pageLigne(page);
  localStorage.setItem("currentPage", page);
}

// --- PAGE ATELIER ---
let atelierChart = null;
function pageAtelier(){
  const zone = document.getElementById("content");
  zone.innerHTML = `
    <div class="card atelier-card">
      <h2>Atelier</h2>
      <div class="meta-line">${nowFormatted()}</div>
      <table class="atelier-table">
        <thead>
          <tr><th>Ligne</th><th>Total</th><th>Arrêts (min)</th><th>Cadence (colis/h)</th></tr>
        </thead>
        <tbody id="atelierBody"></tbody>
      </table>
      <canvas id="atelierChart"></canvas>
    </div>
  `;
  updateAtelier();
}

function updateAtelier(){
  // compute totals
  const tbody = document.getElementById("atelierBody");
  if(!tbody) return;
  tbody.innerHTML = "";
  const labels = [];
  const totals = [];
  const stops = [];
  const cadences = [];
  lignes.forEach(l => {
    const hist = data[l] || [];
    let total = 0, stopSum = 0, cadenceSum = 0, cadenceCount = 0;
    hist.forEach(e => {
      const q = Number(e.qty1 || 0) + Number(e.qty2 || 0);
      total += q;
      stopSum += Number(e.stopMin || 0);
      if(e.cadence) { cadenceSum += Number(e.cadence); cadenceCount++ }
    });
    const avgCadence = cadenceCount? (cadenceSum/cadenceCount).toFixed(1) : 0;
    labels.push(l);
    totals.push(total);
    stops.push(stopSum);
    cadences.push(Number(avgCadence));
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${l}</td><td>${total}</td><td>${stopSum}</td><td>${avgCadence}</td>`;
    tbody.appendChild(tr);
  });

  // Chart
  const ctx = document.getElementById("atelierChart").getContext("2d");
  if(atelierChart) atelierChart.destroy();
  atelierChart = new Chart(ctx, {
    type:'bar',
    data:{
      labels: labels,
      datasets:[
        { label: "Total colis", data: totals, backgroundColor: 'rgba(10,118,255,0.9)' }
      ]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      plugins:{ legend:{ display:true } },
      scales:{ y:{ beginAtZero:true } }
    }
  });
}

// --- PAGE LIGNE ---
let lineChart = null;
function pageLigne(ligne){
  const zone = document.getElementById("content");
  const cur = currentInputs[ligne] || {};
  zone.innerHTML = `
    <div class="card">
      <button class="retour" onclick="openPage('Atelier')">⬅️ Retour Atelier</button>
      <h2 class="ligne-title">${ligne}</h2>
      <div class="meta-line">${new Date().toLocaleDateString()} — Semaine ${weekNumber()} — ${timeHHMM()}</div>

      <div>
        <div><label>Quantité 1 :</label><input id="qty1" class="input" type="number" placeholder="Entrer quantité..." value="${cur.qty1 || ''}"></div>
        <div><label>Quantité 2 :</label><input id="qty2" class="input" type="number" placeholder="Ajouter quantité..." value="${cur.qty2 || ''}"></div>

        <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">
          <input id="startTime" class="input small-input" placeholder="Heure début (HH:MM)" value="${cur.start || ''}">
          <input id="endTime" class="input small-input" placeholder="Heure fin (HH:MM)" value="${cur.end || ''}">
          <input id="stopMin" class="input small-input" placeholder="Temps d'arrêt (min)..." value="${cur.stopMin || 0}">
        </div>

        <input id="stopCause" class="input" placeholder="Cause d'arrêt..." value="${cur.stopCause || ''}">
        <textarea id="comment" class="input" placeholder="Commentaire..." rows="3">${cur.comment || ''}</textarea>
        <input id="remaining" class="input" placeholder="Quantité restante..." value="${cur.remaining || ''}">
      </div>

      <div class="controls">
        <button class="btn" id="saveBtn">💾 Enregistrer</button>
        <button class="btn secondary" id="undoBtn">↩️ Annuler dernier</button>
        <button class="btn secondary" id="histBtn">📜 Historique</button>
        <button class="btn secondary" id="exportBtn">📦 Export CSV</button>
        <button class="btn small" id="resetDisplayBtn">♻️ Remise à zéro (affichage)</button>
        <button class="btn small warn" id="archiveResetBtn">♻️ Remise à zéro (archiver & vider)</button>
      </div>

      <div style="margin-top:12px; font-weight:700">Total : <span id="totalDisplay">0</span> colis</div>
      <div style="margin-top:6px; font-weight:700">Cadence moyenne : <span id="cadenceDisplay">0</span> colis/h</div>

      <canvas id="lineChart" style="margin-top:14px; height:210px"></canvas>
    </div>
  `;

  // set start time auto if empty
  const startEl = document.getElementById("startTime");
  if(!startEl.value) startEl.value = timeHHMM();

  // wire events
  ["qty1","qty2","stopMin","remaining","stopCause","comment","startTime","endTime"].forEach(id=>{
    document.getElementById(id).addEventListener("input", ()=> {
      // update currentInputs persistently
      currentInputs[ligne] = {
        qty1: document.getElementById("qty1").value,
        qty2: document.getElementById("qty2").value,
        stopMin: document.getElementById("stopMin").value,
        stopCause: document.getElementById("stopCause").value,
        comment: document.getElementById("comment").value,
        remaining: document.getElementById("remaining").value,
        start: document.getElementById("startTime").value,
        end: document.getElementById("endTime").value
      };
      saveAll();
      refreshLineSummary(ligne);
    });
  });

  document.getElementById("saveBtn").onclick = ()=> saveEntry(ligne);
  document.getElementById("undoBtn").onclick = ()=> undoLast(ligne);
  document.getElementById("histBtn").onclick = ()=> showHistoryModal(ligne);
  document.getElementById("exportBtn").onclick = ()=> exportLineCSV(ligne);
  document.getElementById("resetDisplayBtn").onclick = ()=> resetDisplay(ligne);
  document.getElementById("archiveResetBtn").onclick = ()=> archiveAndReset(ligne);

  refreshLineSummary(ligne);
}

// update totals & chart for line
function refreshLineSummary(ligne){
  const hist = data[ligne] || [];
  const total = hist.reduce((s,e)=> s + Number(e.qty1||0) + Number(e.qty2||0), 0);
  const totalStops = hist.reduce((s,e)=> s + Number(e.stopMin||0), 0);
  const cadenceList = hist.map(e => Number(e.cadence || 0)).filter(v=>v>0);
  const avgCadence = cadenceList.length ? (cadenceList.reduce((a,b)=>a+b,0)/cadenceList.length).toFixed(1) : 0;

  document.getElementById("totalDisplay").textContent = total;
  document.getElementById("cadenceDisplay").textContent = avgCadence;

  // build chart
  const ctx = document.getElementById("lineChart").getContext("2d");
  if(lineChart) lineChart.destroy();
  const labels = hist.map((e,i)=> `${i+1} ${e.date.split(',')[0] || e.date}`);
  const qtys = hist.map(e => Number(e.qty1||0)+Number(e.qty2||0));
  const stops = hist.map(e => Number(e.stopMin||0));
  lineChart = new Chart(ctx, {
    type:'bar',
    data:{
      labels,
      datasets:[
        { label:'Quantité', data:qtys, backgroundColor:'rgba(10,118,255,0.9)' },
        { label:'Arrêts (min)', data:stops, backgroundColor:'rgba(255,99,132,0.6)', type:'line', tension:0.35, yAxisID:'y1' }
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      scales:{
        y:{ beginAtZero:true, position:'left' },
        y1:{ beginAtZero:true, position:'right', grid:{ drawOnChartArea:false } }
      }
    }
  });
}

// --- SAVE ENTRY ---
function saveEntry(ligne){
  // collect inputs
  const qty1 = Number(document.getElementById("qty1").value || 0);
  const qty2 = Number(document.getElementById("qty2").value || 0);
  let start = document.getElementById("startTime").value;
  let end = document.getElementById("endTime").value;
  const stopMin = Number(document.getElementById("stopMin").value || 0);
  const stopCause = document.getElementById("stopCause").value || "";
  const comment = document.getElementById("comment").value || "";
  const remaining = document.getElementById("remaining").value || "";

  // if start empty set to now, if end empty set to now
  if(!start) start = timeHHMM();
  if(!end) end = timeHHMM();

  // calculate cadence (colis/h): total / durationHours (excluding stops)
  const totalQty = qty1 + qty2;
  let cadence = 0;
  try{
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    const now = new Date();
    const sDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), sh||0, sm||0);
    const eDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), eh||0, em||0);
    if(eDate < sDate) eDate.setDate(eDate.getDate()+1); // cross midnight
    let durationMs = eDate - sDate;
    // subtract stops minutes
    durationMs = Math.max(0, durationMs - (stopMin*60000));
    const durationHours = durationMs / (1000*60*60);
    cadence = durationHours > 0 ? (totalQty / durationHours) : 0;
  }catch(e){ cadence = 0; }

  const entry = {
    date: new Date().toLocaleString(),
    start, end, qty1, qty2, stopMin, stopCause, comment, remaining, cadence: Number(cadence.toFixed(1))
  };
  data[ligne].push(entry);

  // reset currentInputs for this line (quantity cleared on save)
  currentInputs[ligne] = { start: entry.end }; // keep start prefilled as last end if wanted
  saveAll();

  // refresh UI
  refreshLineSummary(ligne);
  updateAtelier();
  // clear visible inputs qty:
  document.getElementById("qty1").value = "";
  document.getElementById("qty2").value = "";
  document.getElementById("stopMin").value = 0;
  document.getElementById("stopCause").value = "";
  document.getElementById("comment").value = "";
  document.getElementById("remaining").value = "";
  document.getElementById("endTime").value = "";
  alert("Enregistré ✔️");
}

// --- UNDO LAST ---
function undoLast(ligne){
  if(!data[ligne] || data[ligne].length === 0){ alert("Aucun enregistrement à annuler"); return; }
  if(!confirm("Annuler le dernier enregistrement ?")) return;
  data[ligne].pop();
  saveAll();
  refreshLineSummary(ligne);
  updateAtelier();
}

// --- HISTORY Modal (simple) ---
function showHistoryModal(ligne){
  // build a printable modal: we'll open a new window/tab with the history and charts
  const hist = data[ligne] || [];
  let html = `<html><head><meta charset="utf-8"><title>Historique - ${ligne}</title>
  <style>body{font-family:Arial;padding:12px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:6px}</style></head><body>`;
  html += `<h1>Historique ${ligne}</h1><p>${nowFormatted()}</p>`;
  if(hist.length === 0) html += "<p>Aucun enregistrement</p>";
  else {
    html += `<table><thead><tr><th>#</th><th>Date</th><th>Début</th><th>Fin</th><th>Quantité</th><th>Arrêts</th><th>Cause</th><th>Commentaire</th><th>Cadence</th></tr></thead><tbody>`;
    hist.forEach((e,i)=>{
      html += `<tr><td>${i+1}</td><td>${e.date}</td><td>${e.start}</td><td>${e.end}</td><td>${Number(e.qty1||0)+Number(e.qty2||0)}</td><td>${e.stopMin}</td><td>${e.stopCause||''}</td><td>${e.comment||''}</td><td>${e.cadence||''}</td></tr>`;
    });
    html += "</tbody></table>";
  }
  html += `<p style="margin-top:12px"><button onclick="window.print()">Imprimer / Sauvegarder</button></p>`;
  html += "</body></html>";
  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
}

// --- EXPORT CSV (ligne) ---
function exportLineCSV(ligne){
  const hist = data[ligne] || [];
  if(hist.length === 0){ alert("Aucun historique à exporter pour " + ligne); return; }
  const header = ["num","date","start","end","qty1","qty2","totalQty","stopMin","stopCause","comment","remaining","cadence"];
  const rows = hist.map((e,i)=>{
    return [
      i+1,
      `"${e.date.replace(/"/g,'""')}"`,
      e.start,
      e.end,
      e.qty1,
      e.qty2,
      Number(e.qty1||0)+Number(e.qty2||0),
      e.stopMin,
      `"${(e.stopCause||'').replace(/"/g,'""')}"`,
      `"${(e.comment||'').replace(/"/g,'""')}"`,
      `"${(e.remaining||'').replace(/"/g,'""')}"`,
      e.cadence
    ].join(",");
  });
  const csv = [header.join(","), ...rows].join("\r\n");
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a');
  const ts = new Date().toISOString().replace(/[:.]/g,'-');
  a.href = URL.createObjectURL(blob);
  a.download = `${ligne}_history_${ts}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// --- RESET DISPLAY (affichage seulement) ---
function resetDisplay(ligne){
  // clear currentInputs and UI but keep data history
  if(!confirm("Remise à zéro de l'affichage pour cette ligne ? (l'historique restera conservé)")) return;
  currentInputs[ligne] = {};
  saveAll();
  pageLigne(ligne);
  updateAtelier();
}

// --- ARCHIVE & RESET (vider l'historique après export automatique) ---
function archiveAndReset(ligne){
  if(!confirm("Cette opération va exporter l'historique en CSV et vider l'historique pour cette ligne. Continuer ?")) return;
  // export first
  exportLineCSV(ligne);
  // then clear data
  data[ligne] = [];
  currentInputs[ligne] = {};
  saveAll();
  pageLigne(ligne);
  updateAtelier();
  alert("Historique archivé et historique local vidé (vous avez téléchargé le CSV).");
}

// --- GLOBAL EXPORT (atelier entire data) ---
function exportAllCSV(){
  const header = ["ligne","num","date","start","end","qty1","qty2","totalQty","stopMin","stopCause","comment","remaining","cadence"];
  const rows = [];
  lignes.forEach(l=>{
    const hist = data[l] || [];
    hist.forEach((e,i)=>{
      rows.push([l, i+1, `"${e.date.replace(/"/g,'""')}"`, e.start, e.end, e.qty1, e.qty2, Number(e.qty1||0)+Number(e.qty2||0), e.stopMin, `"${(e.stopCause||'').replace(/"/g,'""')}"`, `"${(e.comment||'').replace(/"/g,'""')}"`, `"${(e.remaining||'').replace(/"/g,'""')}"`, e.cadence].join(","));
    });
  });
  const csv = [header.join(","), ...rows].join("\r\n");
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a');
  const ts = new Date().toISOString().replace(/[:.]/g,'-');
  a.href = URL.createObjectURL(blob);
  a.download = `synthese_all_${ts}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// --- CALCULATRICE ---
let calcState = "";
let calcTargetInput = null;
function toggleCalculator(targetInput = null){
  const el = document.getElementById("calculator");
  el.classList.toggle("hidden");
  calcTargetInput = targetInput;
  if(!el.classList.contains("hidden")){
    document.getElementById("calcDisplay").value = calcState || "";
  }
}
function buildCalculator(){
  const keys = [
    '7','8','9','/',
    '4','5','6','*',
    '1','2','3','-',
    '0','.','=','+',
    'C','OK','←','Close'
  ];
  const container = document.getElementById("calcButtons");
  if(!container) return;
  container.innerHTML = "";
  keys.forEach(k=>{
    const b = document.createElement("button");
    b.textContent = k;
    b.onclick = ()=> {
      if(k === 'C'){ calcState=""; updateCalcDisplay(); return; }
      if(k === '←'){ calcState = calcState.slice(0,-1); updateCalcDisplay(); return; }
      if(k === 'Close'){ toggleCalculator(); return; }
      if(k === 'OK'){ // paste into target input
        if(calcTargetInput){
          const inp = document.getElementById(calcTargetInput);
          if(inp) inp.value = calcState;
          // also update currentInputs if a line page input
          const page = localStorage.getItem("currentPage");
          if(page && currentInputs[page]) { currentInputs[page][calcTargetInput] = calcState; saveAll(); }
        }
        toggleCalculator();
        return;
      }
      if(k === '='){
        try{ calcState = eval(calcState).toString(); }catch(e){ calcState="ERR"; }
        updateCalcDisplay(); return;
      }
      calcState += k;
      updateCalcDisplay();
    };
    container.appendChild(b);
  });
}
function updateCalcDisplay(){ document.getElementById("calcDisplay").value = calcState; }

// Attach FAB calculator to focused inputs
document.addEventListener("click", (ev)=>{
  if(ev.target.matches("input, textarea")) {
    // optional: clicking an input sets the calc target if user clicks FAB later
    // set attribute on the input to reference by id
  }
});

// FAB wiring and calc init
document.addEventListener("DOMContentLoaded", ()=>{
  buildCalculator();
  document.getElementById("fabCalc").onclick = ()=>{
    // determine focused input: choose qty2 if exists on page or remaining
    const page = localStorage.getItem("currentPage");
    let target = null;
    if(page && document.getElementById("qty2")) target = "qty2";
    else if(document.querySelector("input")) target = document.querySelector("input").id || null;
    toggleCalculator(target);
  };
  document.getElementById("fabAtelier").onclick = ()=> openPage("Atelier");

  // attach quick-click on any numeric input to open calc:
  document.addEventListener("focusin", (e)=>{
    if(e.target.tagName === 'INPUT' && e.target.type === 'number'){
      // when an input gets focus, set calcTargetInput for OK paste
      calcTargetInput = e.target.id;
    }
  });

  // restore last page
  const last = localStorage.getItem("currentPage") || "Atelier";
  openPage(last);
});

// --- INIT: expose some functions for buttons + debugging ---
window.openPage = openPage;
window.exportAllCSV = exportAllCSV;
window.resetDisplay = resetDisplay;
window.archiveAndReset = archiveAndReset;
