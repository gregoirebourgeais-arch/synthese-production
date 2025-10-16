/********* Horloge *********/
function tick(){
  const n=new Date();
  document.getElementById('horloge').textContent =
    n.toLocaleDateString('fr-FR',{weekday:'long',day:'2-digit',month:'2-digit'})+' '+
    n.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
}
tick(); setInterval(tick,1000);

/********* Navigation pages *********/
function showPage(id){
  document.querySelectorAll('.page-section').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if(id==='atelier'){renderAtelier();}
}
window.showPage=showPage;

/********* Données *********/
const LIGNES=["Râpé","T2","RT","OMORI","T1","Sticks","Emballage","Dés","Filets","Prédécoupé"];
let prod=JSON.parse(localStorage.getItem('prod'))||{};   // {ligne:[{date,debut,fin,qte,reste,cadence}]}
let arrets=JSON.parse(localStorage.getItem('arrets'))||[]; // [{date,heure,ligne,duree,cause}]
let org=JSON.parse(localStorage.getItem('org'))||[];       // [{date,ligne,texte}]
let pers=JSON.parse(localStorage.getItem('pers'))||[];     // [{date,nom,motif,com}]

/********* Utilitaires *********/
const nowStr=()=>new Date().toLocaleString('fr-FR');
const timeDiffH=(d,f)=> {
  const a=new Date(`1970-01-01T${d}:00`), b=new Date(`1970-01-01T${f}:00`);
  let diff=(b-a)/3600000; if(diff<=0) diff+=24; return diff;
};
function calcCadence(ligne){
  const d=document.getElementById(`debut-${ligne}`).value;
  const f=document.getElementById(`fin-${ligne}`).value;
  const q=+document.getElementById(`qte-${ligne}`).value||0;
  if(!d||!f||!q) return 0;
  const h=timeDiffH(d,f);
  return h>0? Math.round(q/h) : 0;
}
function estimateFinish(ligne){
  const rest=+document.getElementById(`reste-${ligne}`).value||0;
  const cadEl=document.getElementById(`cad-${ligne}`);
  const cad=+cadEl.textContent||0;
  const out=document.getElementById(`finEst-${ligne}`);
  if(rest>0 && cad>0){
    const min=Math.round((rest/cad)*60);
    const dt=new Date(Date.now()+min*60000);
    out.textContent=dt.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
  } else out.textContent='—';
}
window.liveEstimate=estimateFinish;

/********* Affichage d'une ligne *********/
function showLine(nom){
  document.querySelectorAll('.line-card').forEach(c=>c.classList.add('hidden'));
  const sec=document.getElementById(`line-${nom}`);
  if(sec){sec.classList.remove('hidden'); sec.scrollIntoView({behavior:'smooth'});}
}
window.showLine=showLine;

/********* Enregistrer production *********/
function saveProd(e,ligne){
  e.preventDefault();
  const d=document.getElementById(`debut-${ligne}`).value;
  const f=document.getElementById(`fin-${ligne}`).value;
  const q=+document.getElementById(`qte-${ligne}`).value||0;
  const r=+document.getElementById(`reste-${ligne}`).value||0;
  const cadMan=+document.getElementById(`cadenceManuelle-${ligne}`).value||null;
  const cadAuto=calcCadence(ligne);
  const cad=cadMan || cadAuto;

  if(!prod[ligne]) prod[ligne]=[];
  prod[ligne].push({
    date: nowStr(),
    debut:d, fin:f, qte:q, reste:r, cadence: cad
  });
  localStorage.setItem('prod',JSON.stringify(prod));

  // maj affichage
  document.getElementById(`cad-${ligne}`).textContent=cad||0;
  estimateFinish(ligne);
  renderHist(ligne);
  renderLineChart(ligne);
  // vider champs quantité/reste/manuelle après enregistrement (persistance tant que non validé)
  ['qte','reste','cadenceManuelle'].forEach(k=>document.getElementById(`${k}-${ligne}`).value='');
}
window.saveProd=saveProd;

/********* Reset visuel d'une ligne *********/
function resetLine(ligne){
  ['qte','reste','cadenceManuelle'].forEach(k=>document.getElementById(`${k}-${ligne}`).value='');
  document.getElementById(`cad-${ligne}`).textContent='0';
  document.getElementById(`finEst-${ligne}`).textContent='—';
}
window.resetLine=resetLine;

/********* Historique par ligne *********/
function renderHist(ligne){
  const wrap=document.getElementById(`hist-${ligne}`);
  const list=prod[ligne]||[];
  if(!list.length){wrap.innerHTML='<p>Aucun enregistrement</p>'; return;}
  wrap.innerHTML=list.map((r,i)=>
    `<div class="hist-row">
      <span>${r.date} — ${r.debut}-${r.fin} • ${r.qte} colis • ${r.cadence} c/h</span>
      <button onclick="delHist('${ligne}',${i})">🗑</button>
    </div>`
  ).join('');
}
function delHist(ligne,i){
  prod[ligne].splice(i,1);
  localStorage.setItem('prod',JSON.stringify(prod));
  renderHist(ligne); renderAtelier(); renderLineChart(ligne);
}
window.delHist=delHist;

// initialiser les historiques + listeners estimation
LIGNES.forEach(l=>{
  renderHist(l);
  const reste=document.getElementById(`reste-${l}`);
  if(reste) reste.addEventListener('input',()=>estimateFinish(l));
});

/********* Graphiques *********/
let chartsLine={};
function renderLineChart(ligne){
  const ctx=document.getElementById(`graph-${ligne}`);
  if(!ctx) return;
  if(chartsLine[ligne]) chartsLine[ligne].destroy();
  const data=prod[ligne]||[];
  const labels=data.map(d=>d.date.split(' ')[1]||d.date);
  const vals=data.map(d=>d.cadence||0);
  chartsLine[ligne]=new Chart(ctx,{type:'line',data:{
    labels, datasets:[{label:'Cadence (colis/h)', data:vals, borderColor:'#007ac3', tension:.25}]},
    options:{responsive:true, maintainAspectRatio:false, scales:{y:{beginAtZero:true}}}
  });
}
let chartAtelier=null;
function renderAtelier(){
  // quantités totales par ligne
  const labels=[...LIGNES];
  const data=labels.map(l=> (prod[l]||[]).reduce((a,x)=>a+(+x.qte||0),0) );
  // graphique
  const c=document.getElementById('chartQuantites');
  if(!c) return;
  if(chartAtelier) chartAtelier.destroy();
  chartAtelier=new Chart(c,{type:'bar',data:{labels,datasets:[{label:'Quantités (colis)',data,backgroundColor:'#007ac3'}]},
    options:{responsive:true,scales:{y:{beginAtZero:true}}}});
  // classement arrêts
  const byLigne={};
  arrets.forEach(a=>{byLigne[a.ligne]=(byLigne[a.ligne]||0)+(+a.duree||0)});
  const list=Object.entries(byLigne).sort((a,b)=>b[1]-a[1]);
  document.getElementById('atelierArrets').innerHTML =
    list.length? list.map(([l,t])=>`<div class="hist-row"><span>${l}</span><b>${t} min</b></div>`).join('') : '<p>Aucun arrêt</p>';
}
renderAtelier();

/********* Arrêts *********/
function saveArret(e){
  e.preventDefault();
  const ligne=document.getElementById('arretLigne').value;
  const duree=+document.getElementById('arretDuree').value||0;
  const cause=document.getElementById('arretCause').value.trim();
  arrets.push({date: new Date().toLocaleDateString('fr-FR'),
               heure: new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}),
               ligne,duree,cause});
  localStorage.setItem('arrets',JSON.stringify(arrets));
  e.target.reset();
  renderArrets(); renderAtelier();
}
window.saveArret=saveArret;

function renderArrets(){
  const wrap=document.getElementById('histArrets');
  if(!arrets.length){wrap.innerHTML='<p>Aucun arrêt</p>'; return;}
  wrap.innerHTML=arrets.map(a=>
    `<div class="hist-row"><span>${a.date} ${a.heure} — ${a.ligne}</span><span>${a.duree} min • ${a.cause}</span></div>`
  ).join('');
}
renderArrets();

/********* Organisation *********/
function saveOrg(e){
  e.preventDefault();
  const ligne=document.getElementById('orgLigne').value;
  const texte=document.getElementById('orgTexte').value.trim();
  org.push({date: nowStr(), ligne, texte});
  localStorage.setItem('org',JSON.stringify(org));
  e.target.reset(); renderOrg();
}
window.saveOrg=saveOrg;

function renderOrg(){
  const wrap=document.getElementById('histOrg');
  if(!org.length){wrap.innerHTML='<p>Aucune consigne</p>'; return;}
  wrap.innerHTML=org.map(o=>`<div class="hist-row"><span>${o.date} — ${o.ligne}</span><span>${o.texte}</span></div>`).join('');
}
renderOrg();

/********* Personnel *********/
function savePers(e){
  e.preventDefault();
  const nom=document.getElementById('persNom').value.trim();
  const motif=document.getElementById('persMotif').value;
  const com=document.getElementById('persCom').value.trim();
  pers.push({date: nowStr(), nom, motif, com});
  localStorage.setItem('pers',JSON.stringify(pers));
  e.target.reset(); renderPers();
}
window.savePers=savePers;

function renderPers(){
  const wrap=document.getElementById('histPers');
  if(!pers.length){wrap.innerHTML='<p>Aucun enregistrement</p>'; return;}
  wrap.innerHTML=pers.map(p=>`<div class="hist-row"><span>${p.date} — ${p.nom} (${p.motif})</span><span>${p.com||''}</span></div>`).join('');
}
renderPers();

/********* Export Excel (tout-en-un) *********/
function exportAll(){
  const wb=XLSX.utils.book_new();
  const rows=[];
  // production
  LIGNES.forEach(l=>{
    (prod[l]||[]).forEach(r=>rows.push({Type:'Production',Ligne:l,Date:r.date,Debut:r.debut,Fin:r.fin,Quantite:r.qte,Restant:r.reste,Cadence:r.cadence}));
  });
  // arrêts
  arrets.forEach(a=>rows.push({Type:'Arrêt',Ligne:a.ligne,Date:a.date,Heure:a.heure,Durée_min:a.duree,Cause:a.cause}));
  // org
  org.forEach(o=>rows.push({Type:'Organisation',Date:o.date,Ligne:o.ligne,Consigne:o.texte}));
  // personnel
  pers.forEach(p=>rows.push({Type:'Personnel',Date:p.date,Nom:p.nom,Motif:p.motif,Commentaire:p.com}));
  const ws=XLSX.utils.json_to_sheet(rows);
  // largeur colonnes
  ws['!cols']=[{wch:12},{wch:12},{wch:20},{wch:10},{wch:10},{wch:10},{wch:10},{wch:10},{wch:40}];
  XLSX.utils.book_append_sheet(wb,ws,'Synthèse Atelier');
  const d=new Date().toISOString().slice(0,10);
  XLSX.writeFile(wb,`Synthese_Atelier_${d}.xlsx`);
}
window.exportAll=exportAll;

/********* Calculatrice *********/
(function initCalc(){
  const keys=["7","8","9","/","4","5","6","*","1","2","3","-","0",".","=","+","C"];
  const zone=document.getElementById('calcKeys');
  zone.innerHTML=keys.map(k=>`<button type="button">${k}</button>`).join('');
  zone.addEventListener('click',e=>{
    if(e.target.tagName!=='BUTTON')return;
    const v=e.target.textContent;
    const screen=document.getElementById('calcScreen');
    if(v==='C'){screen.value=''; buf=''; return;}
    if(v==='='){ try{ screen.value=eval(buf||'0') }catch{ screen.value='Err' } buf=screen.value; return; }
    buf+=v; screen.value=buf;
  });
})();
let buf='';
function toggleCalc(){ document.getElementById('calculator').classList.toggle('hidden'); }
window.toggleCalc=toggleCalc;

/********* Init graphiques par ligne (si données) *********/
LIGNES.forEach(l=>renderLineChart(l));
