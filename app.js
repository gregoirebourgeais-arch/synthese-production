/* === CONFIGURATION === */
const lignes = ["Râpé", "T2", "RT", "OMORI", "T1", "Sticks", "Emballage", "Dés", "Filets", "Prédécoupé"];
let data = JSON.parse(localStorage.getItem("syntheseData")) || {};

/* === DATE HEADER === */
function updateDateInfo(){
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' };
  const week = Math.ceil((now.getDate() + new Date(now.getFullYear(), now.getMonth(), 1).getDay()) / 7);
  document.getElementById('dateInfo').textContent =
    now.toLocaleDateString('fr-FR', options) + ` — Semaine ${week} — ` + now.toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'});
}
setInterval(updateDateInfo, 60000);
document.addEventListener("DOMContentLoaded", updateDateInfo);

/* === PAGE LOADER === */
function openPage(ligne){
  if(ligne === 'Atelier'){ pageAtelier(); return; }
  pageLigne(ligne);
}

/* === PAGE LIGNE === */
function pageLigne(ligne){
  const zone = document.getElementById('content');
  zone.innerHTML = `
  <div class="card">
    <h2>${ligne}</h2>
    <div class="grid-two">
      <div><label>Heure début</label><input id="hDebut" type="time"></div>
      <div><label>Heure fin</label><input id="hFin" type="time"></div>
    </div>
    <input id="q1" type="number" placeholder="Entrer quantité...">
    <input id="q2" type="number" placeholder="Ajouter quantité...">
    <input id="tArret" type="number" placeholder="Temps d'arrêt (min)...">
    <input id="cArret" type="text" placeholder="Cause d'arrêt...">
    <textarea id="comment" placeholder="Commentaire..."></textarea>
    <input id="qRestante" type="number" placeholder="Quantité restante...">
    <div class="buttons">
      <button id="btnSave">💾 Enregistrer</button>
      <button id="btnUndo">↩️ Annuler dernier</button>
      <button id="btnHist">📜 Historique</button>
      <button id="btnExport">📦 Export Excel</button>
      <button id="btnReset">♻️ Remise à zéro (affichage)</button>
    </div>
    <canvas id="chartLine" height="200"></canvas>
  </div>`;
  initLineForm(ligne);
}

/* === PAGE ATELIER === */
function pageAtelier(){
  const zone = document.getElementById('content');
  let html = `
  <div class="card"><h2>Atelier</h2>
  <table style="width:100%;text-align:center;">
  <tr><th>Ligne</th><th>Total</th><th>Arrêts</th><th>Cadence</th></tr>`;
  lignes.forEach(l=>{
    const arr = data[l] || [];
    const total = arr.reduce((a,b)=>a+(b.quantite||0),0);
    const arrets = arr.reduce((a,b)=>a+(b.arretMin||0),0);
    const cad = total && arr.length ? (total/arr.length).toFixed(0):0;
    html += `<tr><td>${l}</td><td>${total}</td><td>${arrets}</td><td>${cad}</td></tr>`;
  });
  html += `</table><canvas id="chartAtelier" height="220"></canvas></div>`;
  zone.innerHTML = html;
  renderAtelierChart();
}

/* === GRAPHIQUES === */
function renderAtelierChart(){
  const ctx = document.getElementById('chartAtelier');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: lignes,
      datasets: [{
        label: 'Total colis',
        data: lignes.map(l => (data[l]||[]).reduce((a,b)=>a+(b.quantite||0),0)),
        backgroundColor: '#0d6efd'
      }]
    },
    options: {responsive:true, scales:{y:{beginAtZero:true}}}
  });
}

/* === FONCTIONS TEMPS ET DRAFT === */
function toTimeInputValue(date=new Date()){
  const h = String(date.getHours()).padStart(2,'0');
  const m = String(date.getMinutes()).padStart(2,'0');
  return `${h}:${m}`;
}
function draftKey(l){return 'draft_'+l;}
function loadDraft(l){try{return JSON.parse(localStorage.getItem(draftKey(l)))||{};}catch{return{};}}
function saveDraft(l,obj){localStorage.setItem(draftKey(l),JSON.stringify(obj||{}));}
function clearDraft(l){localStorage.removeItem(draftKey(l));}

/* === FORMULAIRE LIGNE === */
function initLineForm(ligne){
  const el = id=>document.getElementById(id);
  const dq = loadDraft(ligne);
  const hDebut=el('hDebut'), hFin=el('hFin'), q1=el('q1'), q2=el('q2'),
        tA=el('tArret'), cA=el('cArret'), com=el('comment'), qR=el('qRestante');

  hDebut.value = dq.hDebut ?? toTimeInputValue();
  hFin.value = dq.hFin ?? '';
  [q1,q2,tA,cA,com,qR].forEach(e=>e.value = dq[e.id] || '');

  [hDebut,hFin,q1,q2,tA,cA,com,qR].forEach(inp=>{
    inp.addEventListener('input', ()=>{
      saveDraft(ligne,{
        hDebut:hDebut.value,hFin:hFin.value,
        q1:q1.value,q2:q2.value,
        tArret:tA.value,cArret:cA.value,
        comment:com.value,qRestante:qR.value
      });
    });
  });

  el('btnSave').onclick = ()=>{
    const rec={
      date:new Date().toISOString(),
      hDebut:hDebut.value||toTimeInputValue(),
      hFin:hFin.value||toTimeInputValue(),
      quantite:(+q1.value||0)+(+q2.value||0),
      arretMin:+tA.value||0,
      cause:cA.value,comment:com.value,qRestante:+qR.value||0
    };
    if(!Array.isArray(data[ligne]))data[ligne]=[];
    data[ligne].push(rec);
    localStorage.setItem('syntheseData',JSON.stringify(data));

    hDebut.value = rec.hFin; hFin.value='';
    q1.value=q2.value=tA.value=cA.value=com.value='';
    saveDraft(ligne,{hDebut:hDebut.value,qRestante:qR.value});
    renderLineChart(ligne);
  };

  el('btnUndo').onclick=()=>{
    if(data[ligne]?.length){data[ligne].pop();localStorage.setItem('syntheseData',JSON.stringify(data));renderLineChart(ligne);}
  };
  el('btnReset').onclick=()=>{renderLineChart(ligne);}
  el('btnHist').onclick=()=>alert(JSON.stringify(data[ligne]||[],null,2));
  el('btnExport').onclick=()=>exportExcel(ligne);
  renderLineChart(ligne);
}

/* === GRAPHIQUE PAR LIGNE === */
function renderLineChart(ligne){
  const ctx=document.getElementById('chartLine');
  const arr=data[ligne]||[];
  new Chart(ctx,{type:'line',
    data:{labels:arr.map(r=>r.hFin||''),datasets:[
      {label:'Quantité',data:arr.map(r=>r.quantite),borderColor:'#0d6efd',fill:false},
      {label:'Arrêts (min)',data:arr.map(r=>r.arretMin),borderColor:'#ff6384',fill:false}
    ]},
    options:{responsive:true,scales:{y:{beginAtZero:true}}}});
}

/* === EXPORT EXCEL (simplifié CSV) === */
function exportExcel(ligne){
  const arr=data[ligne]||[];
  let csv="Heure début;Heure fin;Quantité;Arrêt;Cause;Commentaire;Quantité restante\n";
  arr.forEach(r=>{
    csv+=`${r.hDebut};${r.hFin};${r.quantite};${r.arretMin};${r.cause};${r.comment};${r.qRestante}\n`;
  });
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
  const a=document.createElement("a");
  const nom=`${ligne}_${new Date().toLocaleString('fr-FR').replace(/[/:]/g,'-')}.csv`;
  a.href=URL.createObjectURL(blob);a.download=nom;a.click();
      }
