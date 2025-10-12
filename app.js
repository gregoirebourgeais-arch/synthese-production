// === CONFIGURATION ===
const lignes = ["Râpé", "T2", "RT", "OMORI", "T1", "Sticks", "Emballage", "Dés", "Filets", "Prédécoupé"];
let data = JSON.parse(localStorage.getItem("syntheseData")) || {};
lignes.forEach(l => { if (!Array.isArray(data[l])) data[l] = []; });

// === UTILITAIRES ===
function sauvegarder() { localStorage.setItem("syntheseData", JSON.stringify(data)); }
setInterval(sauvegarder, 120000);

// === DATE / HEURE ===
function majDate() {
  const now = new Date();
  const semaine = Math.ceil(((now - new Date(now.getFullYear(), 0, 1)) / 86400000 + now.getDay() + 1) / 7);
  document.getElementById("dateInfo").innerText =
    now.toLocaleDateString("fr-FR", { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ` — Semaine ${semaine} — ${now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`;
}
setInterval(majDate, 60000);
window.onload = majDate;

// === NAVIGATION ===
function openPage(page) {
  const content = document.getElementById("content");
  if (page === "atelier") pageAtelier(content);
  else pageLigne(page, content);
  localStorage.setItem("currentPage", page);
}

// === PAGE LIGNE ===
function pageLigne(nom, zone) {
  const entries = data[nom];
  zone.innerHTML = `
    <div class="card">
      <h2>${nom}</h2>
      <p><b>Total :</b> ${entries.reduce((a,b)=>a+Number(b.qte||0),0)} colis</p>
      <p><b>Cadence moyenne :</b> ${calcCadence(nom)} colis/h</p>

      <input id="qte1" type="number" placeholder="Entrer quantité...">
      <input id="qte2" type="number" placeholder="Ajouter quantité...">
      <input id="arret" type="number" placeholder="Temps d'arrêt (min)...">
      <input id="cause" type="text" placeholder="Cause d'arrêt...">
      <textarea id="comment" placeholder="Commentaire..."></textarea>
      <input id="restante" type="number" placeholder="Quantité restante...">
      <p id="finEstimee"></p>

      <button onclick="enregistrer('${nom}')">💾 Enregistrer</button>
      <button onclick="annuler('${nom}')">↩️ Annuler dernier</button>
      <button onclick="afficherHistorique('${nom}')">📜 Historique</button>
      <button onclick="exporterExcel('${nom}')">📦 Export Excel</button>
      <button onclick="remiseZero('${nom}')">♻️ Remise à zéro</button>
      <canvas id="chart${nom}" height="150"></canvas>
    </div>
  `;

  // maj heure de fin
  document.getElementById("restante").addEventListener("input", () => majFin(nom));

  afficherGraphique(nom);
}

function enregistrer(ligne) {
  const qte1 = Number(document.getElementById("qte1").value)||0;
  const qte2 = Number(document.getElementById("qte2").value)||0;
  const arret = Number(document.getElementById("arret").value)||0;
  const cause = document.getElementById("cause").value;
  const comment = document.getElementById("comment").value;
  const date = new Date();

  data[ligne].push({date: date.toLocaleString(), qte: qte1+qte2, arret, cause, comment});
  sauvegarder();
  openPage(ligne);
}

function annuler(ligne){ data[ligne].pop(); sauvegarder(); openPage(ligne); }
function remiseZero(ligne){ data[ligne]=[]; sauvegarder(); openPage(ligne); }

function calcCadence(ligne){
  const arr=data[ligne];
  if(arr.length<2)return 0;
  const t1=new Date(arr[0].date),t2=new Date(arr[arr.length-1].date);
  const total=arr.reduce((a,b)=>a+Number(b.qte||0),0);
  const heures=(t2-t1)/3600000||1;
  return Math.round(total/heures);
}

function majFin(ligne){
  const restante = Number(document.getElementById("restante").value)||0;
  const cadence = calcCadence(ligne);
  if(!cadence)return;
  const heures = restante/cadence;
  const fin = new Date(Date.now()+heures*3600000);
  document.getElementById("finEstimee").innerText = `⏰ Fin estimée : ${fin.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`;
}

// === HISTORIQUE ===
function afficherHistorique(ligne){
  const h=data[ligne].map(e=>`${e.date} — ${e.qte} colis, ${e.arret}min, ${e.cause||''} ${e.comment||''}`).join("<br>");
  alert("Historique " + ligne + " :\n\n" + h);
}

// === GRAPH ===
function afficherGraphique(ligne){
  const ctx=document.getElementById("chart"+ligne);
  if(!ctx)return;
  const labels=data[ligne].map(e=>e.date.split(" ")[1]);
  const qtes=data[ligne].map(e=>e.qte);
  const arrets=data[ligne].map(e=>e.arret);
  new Chart(ctx,{type:"bar",data:{
    labels, datasets:[
      {label:"Quantité",data:qtes,borderWidth:1},
      {label:"Arrêts (min)",data:arrets,borderWidth:1}
    ]}});
}

// === EXPORT EXCEL ===
function exporterExcel(ligne){
  const rows = [["Date","Quantité","Arrêt (min)","Cause","Commentaire"]];
  data[ligne].forEach(e=>rows.push([e.date,e.qte,e.arret,e.cause,e.comment]));
  const csv=rows.map(r=>r.join(";")).join("\n");
  const blob=new Blob([csv],{type:"text/csv"});
  const now=new Date();
  const fname=`Synthese_Lactalis_${ligne}_${now.toLocaleDateString('fr-FR').replaceAll('/','-')}_${now.getHours()}h${now.getMinutes()}.csv`;
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob); a.download=fname; a.click();
}

// === PAGE ATELIER ===
function pageAtelier(zone){
  let html="<div class='card'><h2>Atelier</h2><table style='width:100%'><tr><th>Ligne</th><th>Total</th><th>Arrêts</th><th>Cadence</th></tr>";
  lignes.forEach(l=>{
    const tot=data[l].reduce((a,b)=>a+Number(b.qte||0),0);
    const arr=data[l].reduce((a,b)=>a+Number(b.arret||0),0);
    const cad=calcCadence(l);
    html+=`<tr><td>${l}</td><td>${tot}</td><td>${arr}</td><td>${cad}</td></tr>`;
  });
  html+="</table><canvas id='chartGlobal' height='150'></canvas></div>";
  zone.innerHTML=html;
  setTimeout(()=>graphiqueGlobal(),200);
}

function graphiqueGlobal(){
  const ctx=document.getElementById("chartGlobal");
  new Chart(ctx,{type:"bar",data:{
    labels:lignes,
    datasets:[{label:"Total colis",data:lignes.map(l=>data[l].reduce((a,b)=>a+Number(b.qte||0),0))}]
  }});
    }
