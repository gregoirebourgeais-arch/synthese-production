// === CONFIGURATION ===
const lignes = ["Râpé","T2","RT","OMORI","T1","Sticks","Emballage","Dés","Filets","Prédécoupé"];
let data = JSON.parse(localStorage.getItem("syntheseData")) || {};

// === DATE ET SEMAINE ===
function updateHeaderInfo(){
  const now = new Date();
  const week = Math.ceil(((now - new Date(now.getFullYear(),0,1))/86400000 + new Date(now.getFullYear(),0,1).getDay()+1)/7);
  document.getElementById("metaTop").textContent =
    `${now.toLocaleDateString("fr-FR",{weekday:"long",year:"numeric",month:"2-digit",day:"2-digit"})} — Semaine ${week} — ${now.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}`;
}
setInterval(updateHeaderInfo, 60000);
document.addEventListener("DOMContentLoaded", updateHeaderInfo);

// === NAVIGATION ===
function openPage(page){
  if(page==="Atelier"){ pageAtelier(); return; }
  pageLigne(page);
}

// === PAGE LIGNE ===
function pageLigne(ligne){
  const zone=document.getElementById("content");
  zone.innerHTML=`
  <div class="card">
    <h2>${ligne}</h2>

    <div class="grid-two">
      <div><label>Heure début</label><input id="hDebut" type="time"></div>
      <div><label>Heure fin</label><input id="hFin" type="time"></div>
    </div>

    <input id="q1" type="number" placeholder="Quantité 1...">
    <input id="q2" type="number" placeholder="Quantité 2...">
    <input id="tArret" type="number" placeholder="Temps d'arrêt (min)...">
    <input id="cArret" type="text" placeholder="Cause d'arrêt...">
    <textarea id="comment" placeholder="Commentaire..."></textarea>
    <input id="qRestante" type="number" placeholder="Quantité restante...">

    <div class="buttons">
      <button onclick="saveRecord('${ligne}')">💾 Enregistrer</button>
      <button onclick="undoRecord('${ligne}')">↩️ Annuler</button>
      <button onclick="showHistory('${ligne}')">📜 Historique</button>
      <button onclick="exportExcel('${ligne}')">📦 Export</button>
      <button onclick="resetDisplay('${ligne}')">♻️ Remise à zéro</button>
      <button onclick="toggleCalc()">🧮 Calculatrice</button>
    </div>

    <h3 id="cadenceTxt">Cadence moyenne : 0 colis/h</h3>
    <canvas id="chartLine" height="200"></canvas>
  </div>`;
  initLine(ligne);
}

// === INITIALISATION LIGNE ===
function initLine(ligne){
  const key="draft_"+ligne;
  const e=id=>document.getElementById(id);
  let draft=JSON.parse(localStorage.getItem(key))||{};

  ["hDebut","hFin","q1","q2","tArret","cArret","comment","qRestante"].forEach(i=>{
    if(draft[i]) e(i).value = draft[i];
    e(i).addEventListener("input",()=>{
      draft["hDebut"]=e("hDebut").value;
      draft["hFin"]=e("hFin").value;
      draft[i]=e(i).value;
      localStorage.setItem(key,JSON.stringify(draft));
    });
  });
  renderLineChart(ligne);
}

// === ENREGISTREMENT ===
function saveRecord(ligne){
  const e=id=>document.getElementById(id);
  const rec={
    date:new Date().toLocaleString(),
    hDebut:e("hDebut").value||"",
    hFin:e("hFin").value||new Date().toLocaleTimeString(),
    q1:+e("q1").value||0,
    q2:+e("q2").value||0,
    quantite:(+e("q1").value||0)+(+e("q2").value||0),
    arret:+e("tArret").value||0,
    cause:e("cArret").value,
    comment:e("comment").value,
    qRestante:+e("qRestante").value||0
  };

  if(!Array.isArray(data[ligne])) data[ligne]=[];
  data[ligne].push(rec);
  localStorage.setItem("syntheseData",JSON.stringify(data));

  e("hDebut").value = rec.hFin;
  e("hFin").value = "";
  e("q1").value = e("q2").value = e("tArret").value = e("cArret").value = e("comment").value = "";
  localStorage.removeItem("draft_"+ligne);
  renderLineChart(ligne);
}

// === ANNULER ===
function undoRecord(ligne){
  if(data[ligne]?.length>0){
    data[ligne].pop();
    localStorage.setItem("syntheseData",JSON.stringify(data));
    renderLineChart(ligne);
  }
}

// === HISTORIQUE ===
function showHistory(ligne){
  const arr=data[ligne]||[];
  if(arr.length===0){ alert("Aucun enregistrement pour "+ligne); return; }
  let txt=arr.map(r=>`${r.date} | ${r.hDebut}→${r.hFin} | ${r.quantite} colis | ${r.arret} min | ${r.cause} | ${r.comment}`).join("\n");
  alert("Historique "+ligne+" :\n\n"+txt);
}

// === EXPORT CSV ===
function exportExcel(ligne){
  const arr=data[ligne]||[];
  let csv="Date;Début;Fin;Quantité;Arrêt;Cause;Commentaire;Restant\n";
  arr.forEach(r=>{
    csv+=`${r.date};${r.hDebut};${r.hFin};${r.quantite};${r.arret};${r.cause};${r.comment};${r.qRestante}\n`;
  });
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download=`${ligne}_${new Date().toLocaleString('fr-FR').replace(/[/:]/g,'-')}.csv`;
  a.click();
}

// === REMISE À ZÉRO (affichage uniquement) ===
function resetDisplay(ligne){
  renderLineChart(ligne);
}

// === GRAPHIQUE PAR LIGNE ===
function renderLineChart(ligne){
  const ctx=document.getElementById("chartLine");
  const arr=data[ligne]||[];
  if(!ctx) return;
  new Chart(ctx,{
    type:"line",
    data:{
      labels:arr.map(r=>r.hFin),
      datasets:[
        {label:"Quantité",data:arr.map(r=>r.quantite),borderColor:"#0d6efd",fill:false},
        {label:"Arrêts (min)",data:arr.map(r=>r.arret),borderColor:"#ff6384",fill:false}
      ]
    },
    options:{responsive:true,scales:{y:{beginAtZero:true}}}
  });
  const total=arr.reduce((a,b)=>a+b.quantite,0);
  const heures=arr.length||1;
  document.getElementById("cadenceTxt").textContent=`Cadence moyenne : ${(total/heures).toFixed(1)} colis/h`;
}

// === PAGE ATELIER ===
function pageAtelier(){
  const zone=document.getElementById("content");
  let html="<div class='card'><h2>Atelier</h2><table style='width:100%;text-align:center'><tr><th>Ligne</th><th>Total</th><th>Arrêts</th><th>Cadence</th></tr>";
  lignes.forEach(l=>{
    const arr=data[l]||[];
    const tot=arr.reduce((a,b)=>a+b.quantite,0);
    const arrs=arr.reduce((a,b)=>a+b.arret,0);
    const cad=tot && arr.length ? (tot/arr.length).toFixed(1):0;
    html+=`<tr><td>${l}</td><td>${tot}</td><td>${arrs}</td><td>${cad}</td></tr>`;
  });
  html+="</table><canvas id='chartAtelier' height='220'></canvas></div>";
  zone.innerHTML=html;
  renderAtelierChart();
}

// === GRAPHIQUE ATELIER HORIZONTAL ===
function renderAtelierChart(){
  const ctx=document.getElementById("chartAtelier");
  if(!ctx) return;
  new Chart(ctx,{
    type:"bar",
    data:{
      labels:lignes,
      datasets:[{
        label:"Total colis",
        data:lignes.map(l=>(data[l]||[]).reduce((a,b)=>a+b.quantite,0)),
        backgroundColor:"#0d6efd"
      }]
    },
    options:{
      indexAxis:"y",
      responsive:true,
      scales:{x:{beginAtZero:true}}
    }
  });
}

// === CALCULATRICE ===
function toggleCalc(){
  document.getElementById("calcPanel").classList.toggle("hidden");
}
function calcPress(v){document.getElementById("calcInput").value+=v;}
function calcEqual(){
  const inp=document.getElementById("calcInput");
  try{inp.value=eval(inp.value);}catch{inp.value="Erreur";}
}
function calcClear(){document.getElementById("calcInput").value="";}
