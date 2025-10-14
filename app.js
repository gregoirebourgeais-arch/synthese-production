/* ======================================================
   SYNTHÈSE PRODUCTION - VERSION 28 INTÉGRALE
   Lactalis © 2025
   ====================================================== */

// --- Définition des lignes ---
const lignes = ["Râpé","T2","RT","OMORI","T1","Sticks","Emballage","Dés","Filets","Prédécoupé"];

// --- Stockage local ---
let prod = JSON.parse(localStorage.getItem("prod")) || {};
let prodHistory = JSON.parse(localStorage.getItem("prodHistory")) || {};
let arrets = JSON.parse(localStorage.getItem("arrets")) || [];
let personnel = JSON.parse(localStorage.getItem("personnel")) || [];

/* ======================================================
   HORLOGE / SEMAINE / ÉQUIPE
   ====================================================== */
function updateHeader(){
  const now = new Date();
  const week = getWeekNumber(now);
  const dateInfo = document.getElementById("date-info");
  const eqInfo = document.getElementById("equipe-info");
  if (dateInfo)
    dateInfo.textContent = now.toLocaleDateString("fr-FR", {weekday:"long", day:"2-digit", month:"long", year:"numeric"}) +
      ` — Semaine ${week} — ` +
      now.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
  if (eqInfo)
    eqInfo.innerHTML = `Équipe : <b>${getEquipe(now)}</b>`;
}
setInterval(updateHeader,1000);
updateHeader();

function getWeekNumber(d){
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil(((d - yearStart)/86400000 + 1)/7);
}
function getEquipe(dt){
  const h = dt.getHours();
  if (h>=5 && h<13) return "M (5h–13h)";
  if (h>=13 && h<21) return "AM (13h–21h)";
  return "N (21h–5h)";
}

/* ======================================================
   NAVIGATION
   ====================================================== */
function openSection(id){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  const el=document.getElementById(id);
  if(el){el.classList.add("active");window.scrollTo({top:0,behavior:"smooth"});}
  if(id==="production") renderButtons();
  if(id==="page-arrets") renderArretsTable();
  if(id==="personnel") renderPersonnel();
  if(id==="page-organisation") renderOrgTable();
  if(id==="atelier") renderAtelier();
}

/* ======================================================
   PRODUCTION
   ====================================================== */
function renderButtons(){
  const box=document.getElementById("buttons-lignes");
  if(!box)return;
  box.innerHTML="";
  lignes.forEach(l=>{
    const b=document.createElement("button");
    b.className="line-btn";
    b.textContent=l;
    b.onclick=()=>openLigne(l);
    box.appendChild(b);
  });
}
renderButtons();

function openLigne(ligne){
  const d=prod[ligne]||{};
  const cont=document.getElementById("ligne-content");
  if(!cont)return;
  cont.innerHTML=`
  <div class="card fade-in">
    <h3>${ligne}</h3>
    <label>Heure début :</label><input id="deb-${ligne}" type="time" value="${d.deb||""}">
    <label>Heure fin :</label><input id="fin-${ligne}" type="time" value="${d.fin||""}">
    <label>Quantité :</label><input id="qte-${ligne}" type="number" value="${d.qte||""}" placeholder="Colis réalisés">
    <label>Cadence manuelle (colis/h) :</label><input id="cad-${ligne}" type="number" value="${d.cadMan||""}">
    <label>Cadence calculée :</label><input id="cadAuto-${ligne}" type="text" readonly value="${d.cadAuto||""}">
    <label>Quantité restante :</label><input id="rest-${ligne}" type="number" value="${d.reste||""}">
    <label>Estimation de fin :</label><input id="est-${ligne}" type="text" readonly value="${d.estimation||""}">
    <div class="row-actions">
      <button class="primary" onclick="saveLigne('${ligne}')">💾 Enregistrer</button>
      <button onclick="retourMenu()">⬅️ Retour</button>
    </div>
  </div>
  <div class="card fade-in" id="hist-${ligne}">
    <h4>Historique — ${ligne}</h4>
    <div class="tablewrap">
      <table class="mini">
        <thead><tr><th>Date</th><th>Déb</th><th>Fin</th><th>Qte</th><th>Cad.</th><th>Rest.</th><th>Est.</th></tr></thead>
        <tbody id="hist-body-${ligne}"></tbody>
      </table>
    </div>
  </div>`;
  ["deb","fin","qte","cad","rest"].forEach(k=>{
    const el=document.getElementById(`${k}-${ligne}`);
    if(el)el.addEventListener("input",()=>majCalculs(ligne));
  });
  renderLineHistory(ligne);
  window.scrollTo({top:0,behavior:"smooth"});
}
function majCalculs(ligne){
  const deb=document.getElementById(`deb-${ligne}`).value;
  const fin=document.getElementById(`fin-${ligne}`).value;
  const qte=+document.getElementById(`qte-${ligne}`).value||0;
  const cadM=+document.getElementById(`cad-${ligne}`).value||0;
  const rest=+document.getElementById(`rest-${ligne}`).value||0;
  let cadAuto=0;
  if(deb&&fin&&qte>0){const diff=hoursBetween(deb,fin);if(diff>0)cadAuto=+(qte/diff).toFixed(1);}
  document.getElementById(`cadAuto-${ligne}`).value=cadAuto||"";
  const baseCad=cadM||cadAuto;
  let est="";
  if(baseCad>0&&rest>0){
    const minutes=(rest/baseCad)*60;
    const t=new Date();t.setMinutes(t.getMinutes()+minutes);
    est=t.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
  }
  document.getElementById(`est-${ligne}`).value=est;
}
function saveLigne(ligne){
  const d={
    deb:document.getElementById(`deb-${ligne}`).value||"",
    fin:document.getElementById(`fin-${ligne}`).value||"",
    qte:+document.getElementById(`qte-${ligne}`).value||0,
    cadMan:+document.getElementById(`cad-${ligne}`).value||0,
    cadAuto:+document.getElementById(`cadAuto-${ligne}`).value||0,
    reste:+document.getElementById(`rest-${ligne}`).value||0,
    estimation:document.getElementById(`est-${ligne}`).value||"",
    date:new Date().toLocaleString("fr-FR")
  };
  prod[ligne]=d;
  localStorage.setItem("prod",JSON.stringify(prod));
  if(!prodHistory[ligne])prodHistory[ligne]=[];
  prodHistory[ligne].unshift(d);
  localStorage.setItem("prodHistory",JSON.stringify(prodHistory));
  document.getElementById(`qte-${ligne}`).value="";
  document.getElementById(`cad-${ligne}`).value="";
  document.getElementById(`rest-${ligne}`).value="";
  renderLineHistory(ligne);
  renderAtelier();
  alert("✅ Enregistré");
}
function renderLineHistory(ligne){
  const body=document.getElementById(`hist-body-${ligne}`);
  if(!body)return;
  const list=prodHistory[ligne]||[];
  body.innerHTML=list.map(e=>`
  <tr><td>${e.date}</td><td>${e.deb}</td><td>${e.fin}</td><td>${e.qte}</td>
  <td>${e.cadMan||e.cadAuto}</td><td>${e.reste}</td><td>${e.estimation}</td></tr>`).join("")||
  `<tr><td colspan="7">Aucun enregistrement.</td></tr>`;
}
function hoursBetween(a,b){
  if(!a||!b)return 0;
  const [h1,m1]=a.split(":").map(Number);
  const [h2,m2]=b.split(":").map(Number);
  let d=(h2+m2/60)-(h1+m1/60);
  if(d<0)d+=24;
  return d;
}
function retourMenu(){document.getElementById("ligne-content").innerHTML="";openSection("production");}

/* ======================================================
   ARRÊTS
   ====================================================== */
function renderArretsTable(){
  const tbody=document.querySelector("#arTable tbody");
  if(!tbody)return;
  const list=JSON.parse(localStorage.getItem("arretsHistory"))||[];
  tbody.innerHTML=list.sort((a,b)=>b.ts-a.ts).map(e=>`
  <tr><td>${fmtDate(e.ts)}</td><td>${fmtHeure(e.ts)}</td><td>${e.ligne}</td><td>${e.duree}</td><td>${e.cause}</td><td>${e.comment}</td></tr>`).join("")||
  `<tr><td colspan="6">Aucun arrêt.</td></tr>`;
}
function addArret(ligne,duree,cause,comment){
  const d=Number(duree);if(isNaN(d)||d<=0)return;
  const list=JSON.parse(localStorage.getItem("arretsHistory"))||[];
  list.push({ts:Date.now(),ligne,duree:d,cause,comment});
  localStorage.setItem("arretsHistory",JSON.stringify(list));
  renderArretsTable();
}
document.addEventListener("DOMContentLoaded",()=>{
  const saveBtn=document.getElementById("arSaveBtn");
  const expBtn=document.getElementById("arExportBtn");
  if(saveBtn)saveBtn.onclick=()=>{
    addArret(document.getElementById("arLigne").value,
             document.getElementById("arDuree").value,
             document.getElementById("arCause").value,
             document.getElementById("arComment").value);
    document.getElementById("arDuree").value="";
    document.getElementById("arCause").value="";
    document.getElementById("arComment").value="";
  };
  if(expBtn)expBtn.onclick=exportArretsCSV;
  renderArretsTable();
});
function exportArretsCSV(){
  const list=JSON.parse(localStorage.getItem("arretsHistory"))||[];
  const rows=[["Date","Heure","Ligne","Durée","Cause","Commentaire"],...list.map(e=>[fmtDate(e.ts),fmtHeure(e.ts),e.ligne,e.duree,e.cause,e.comment])];
  downloadCSV(rows,"arrets_"+todayForFile()+".csv");
}

/* ======================================================
   PERSONNEL
   ====================================================== */
function savePersonnel(){
  const t=document.getElementById("typePersonnel").value;
  const c=document.getElementById("commentairePersonnel").value.trim();
  personnel.unshift({type:t,com:c,date:new Date().toLocaleString("fr-FR")});
  localStorage.setItem("personnel",JSON.stringify(personnel));
  document.getElementById("form-pers").reset();
  renderPersonnel();
}
function renderPersonnel(){
  const z=document.getElementById("historiquePersonnel");
  if(!z)return;
  z.innerHTML=personnel.map(p=>`<div class="card"><p><b>${p.type}</b> — ${p.date}</p><p>${p.com}</p></div>`).join("")||"<p>Aucune donnée.</p>";
}

/* ======================================================
   ORGANISATION (Historique + Archivage)
   ====================================================== */
const ORG_KEY="orgHistory";
function fmtDate(ts){const d=new Date(ts);return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;}
function fmtHeure(ts){const d=new Date(ts);return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;}
function loadOrg(){try{return JSON.parse(localStorage.getItem(ORG_KEY))||[]}catch{return[]}}
function saveOrg(l){localStorage.setItem(ORG_KEY,JSON.stringify(l));}
function addConsigne(ligne,texte){if(!texte||!texte.trim())return;const list=loadOrg();list.push({ts:Date.now(),ligne,texte:texte.trim()});saveOrg(list);renderOrgTable();}
function renderOrgTable(){const tbody=document.querySelector("#orgTable tbody");if(!tbody)return;const list=loadOrg().sort((a,b)=>b.ts-a.ts);
  tbody.innerHTML=list.map(e=>`<tr><td>${fmtDate(e.ts)}</td><td>${fmtHeure(e.ts)}</td><td>${e.ligne}</td><td>${e.texte}</td></tr>`).join("")||
  `<tr><td colspan="4">Aucune consigne.</td></tr>`;}
function exportOrganisationCSV(list=loadOrg(),suffix=""){const rows=[["Date","Heure","Ligne","Consigne"],...list.map(e=>[fmtDate(e.ts),fmtHeure(e.ts),e.ligne,e.texte.replace(/\r?\n/g," ")])];
  downloadCSV(rows,"organisation"+suffix+"_"+todayForFile()+".csv");}
function archiveOldConsignes(){
  const list=loadOrg();const now=Date.now(),seven=7*24*3600*1000;
  const old=list.filter(i=>now-i.ts>seven), recent=list.filter(i=>now-i.ts<=seven);
  if(old.length){exportOrganisationCSV(old,"_archive");saveOrg(recent);}
}
function initOrganisation(){
  const s=document.getElementById("orgSaveBtn"), e=document.getElementById("orgExportBtn");
  if(s)s.onclick=()=>{addConsigne(document.getElementById("orgLigne").value,document.getElementById("orgTexte").value);document.getElementById("orgTexte").value="";};
  if(e)e.onclick=()=>exportOrganisationCSV();
  archiveOldConsignes();renderOrgTable();
}
document.addEventListener("DOMContentLoaded",initOrganisation);

/* ======================================================
   ATELIER (Graphique + Export global)
   ====================================================== */
let atelierChart=null;
function renderAtelier(){
  const ctx=document.getElementById("atelierChart");if(!ctx)return;
  const labels=lignes, vals=labels.map(l=>+(prod[l]?.cadMan||prod[l]?.cadAuto||0));
  if(atelierChart)atelierChart.destroy();
  atelierChart=new Chart(ctx,{type:"bar",data:{labels,datasets:[{label:"Cadence (colis/h)",data:vals,backgroundColor:"#007bff"}]},options:{scales:{y:{beginAtZero:true}}}});
}
function exportAtelier(){
  let csv="Ligne;Début;Fin;Quantité;CadenceAuto;CadenceMan;Reste;Estimation;Date\n";
  lignes.forEach(l=>{const d=prod[l];if(d)csv+=`${l};${d.deb};${d.fin};${d.qte};${d.cadAuto};${d.cadMan};${d.reste};${d.estimation};${d.date}\n`;});
  const blob=new Blob([csv],{type:"text/csv"});const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);a.download=`export-atelier-${new Date().toISOString().slice(0,19)}.csv`;a.click();
}
function resetAll(){
  if(!confirm("Exporter puis réinitialiser l'application ?"))return;
  exportAtelier();
  prod={};prodHistory={};arrets=[];personnel=[];localStorage.clear();
  renderAtelier();renderPersonnel();renderOrgTable();renderArretsTable();
  alert("✅ Données exportées et application réinitialisée.");
}

/* ======================================================
   CALCULATRICE FLOTTANTE
   ====================================================== */
let calcOpen=false;
function toggleCalc(){const c=document.getElementById("calculator");if(!c)return;calcOpen=!calcOpen;c.style.display=calcOpen?"block":"none";}
function calcPress(ch){document.getElementById("calcDisplay").value+=ch;}
function calcClear(){document.getElementById("calcDisplay").value="";}
function calcEqual(){
  const d=document.getElementById("calcDisplay");
  try{if(!/^[0-9+\-*/().\s]+$/.test(d.value))throw 0;d.value=String(Function(`"use strict";return (${d.value})`)());}
  catch(e){d.value="Err";}
}

/* ======================================================
   OUTILS COMMUNS
   ====================================================== */
function todayForFile(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}_${String(d.getHours()).padStart(2,"0")}${String(d.getMinutes()).padStart(2,"0")}`;}
function downloadCSV(rows,filename){const csv=rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(";")).join("\r\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});const url=URL.createObjectURL(blob);
  const a=document.createElement
