// === SYNTHÈSE PRODUCTION V32 ===
// Toutes options : persistance, estimation, exports, arrêts, historique, PWA

/* ==== HORLOGE + ÉQUIPE ==== */
function majDateHeure() {
  const now = new Date();
  const jours = ["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];
  const mois = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
  const semaine = Math.ceil((((now - new Date(now.getFullYear(),0,1)) / 86400000) + now.getDay() + 1) / 7);
  document.getElementById("dateHeure").textContent =
    `${jours[now.getDay()]} ${now.getDate()} ${mois[now.getMonth()]} ${now.getFullYear()} — Semaine ${semaine} — ${now.toLocaleTimeString("fr-FR")}`;

  const h = now.getHours();
  let eq = "";
  if (h >= 5 && h < 13) eq = "M (5h–13h)";
  else if (h >= 13 && h < 21) eq = "AM (13h–21h)";
  else eq = "N (21h–5h)";
  document.getElementById("equipe").textContent = `Équipe : ${eq}`;
}
setInterval(majDateHeure, 1000);
majDateHeure();

/* ==== STOCKAGE LOCAL ==== */
let data = JSON.parse(localStorage.getItem("syntheseData")) || {
  production:{}, arrets:[], personnel:[], organisation:[]
};
function save(){ localStorage.setItem("syntheseData", JSON.stringify(data)); }

/* ==== NAVIGATION ==== */
function changerPage(page){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  document.querySelector(`#page${page}`).classList.add("active");
  document.querySelectorAll("footer button").forEach(b=>b.classList.remove("active"));
  event.target.classList.add("active");
  window.scrollTo({top:0,behavior:"smooth"});
}

/* ==== LIGNES ==== */
let ligne="";
function selectLine(l){
  ligne=l;
  document.getElementById("titreLigne").textContent=l;
  loadForm(l);
  document.getElementById("formulaireProduction").scrollIntoView({behavior:"smooth"});
}

/* ==== CHARGEMENT FORM ==== */
function loadForm(l){
  const f=data.production[l]||{};
  ["heureDebut","heureFin","quantiteRealisee","quantiteRestante","cadenceManuelle","estimationFin"].forEach(id=>{
    document.getElementById(id).value=f[id]||"";
  });
}

/* ==== SAUVEGARDE AUTO ==== */
["heureDebut","heureFin","quantiteRealisee","quantiteRestante","cadenceManuelle"].forEach(id=>{
  document.getElementById(id).addEventListener("input",()=>{
    if(!ligne) return;
    const f={
      heureDebut:document.getElementById("heureDebut").value,
      heureFin:document.getElementById("heureFin").value,
      quantiteRealisee:document.getElementById("quantiteRealisee").value,
      quantiteRestante:document.getElementById("quantiteRestante").value,
      cadenceManuelle:document.getElementById("cadenceManuelle").value,
      estimationFin:document.getElementById("estimationFin").value
    };
    data.production[ligne]={...(data.production[ligne]||{}),...f};
    save();
  });
});

/* ==== CALCUL AUTOMATIQUE ESTIMATION ==== */
["quantiteRestante","cadenceManuelle"].forEach(id=>{
  document.getElementById(id).addEventListener("input",calcEstimation);
});
function calcEstimation(){
  if(!ligne) return;
  const reste=parseFloat(document.getElementById("quantiteRestante").value)||0;
  const cadMan=parseFloat(document.getElementById("cadenceManuelle").value)||0;
  const fin=document.getElementById("heureFin").value;
  if(!reste||!fin) return;
  const cad=cadMan>0?cadMan:(data.production[ligne]?.cad||0);
  if(!cad) return;
  const minRest=(reste/cad)*60;
  const [h,m]=fin.split(":").map(Number);
  const finCalc=new Date(); finCalc.setHours(h||0,m||0);
  finCalc.setMinutes(finCalc.getMinutes()+minRest);
  const hFin=finCalc.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
  document.getElementById("estimationFin").value=hFin;
  data.production[ligne]={...(data.production[ligne]||{}),reste,cadMan,estimationFin:hFin};
  save();
}

/* ==== ENREGISTREMENT ==== */
function enregistrerProduction(){
  if(!ligne){alert("Sélectionnez une ligne.");return;}
  const deb=document.getElementById("heureDebut").value;
  const fin=document.getElementById("heureFin").value;
  const qte=parseFloat(document.getElementById("quantiteRealisee").value)||0;
  const reste=parseFloat(document.getElementById("quantiteRestante").value)||0;
  const cadMan=parseFloat(document.getElementById("cadenceManuelle").value)||0;
  const duree=dureeHeures(deb,fin);
  const cad=cadMan>0?cadMan:(qte/duree)||0;
  const estim=document.getElementById("estimationFin").value||"";
  if(!data.production[ligne]) data.production[ligne]={list:[]};
  if(!Array.isArray(data.production[ligne].list)) data.production[ligne].list=[];
  data.production[ligne].list.push({
    date:new Date().toLocaleString("fr-FR"),
    debut:deb, fin:fin, qte, reste, cad:cad.toFixed(1), estim
  });
  data.production[ligne]={...data.production[ligne],heureDebut:deb,heureFin:fin,quantiteRealisee:qte,quantiteRestante:reste,cadenceManuelle:cadMan,cad,estimationFin:estim};
  save();
  alert(`✅ Données enregistrées pour ${ligne}`);
  afficherHistorique();
  document.getElementById("quantiteRealisee").value="";
  document.getElementById("quantiteRestante").value="";
}
function dureeHeures(d,f){
  const [h1,m1]=d.split(":").map(Number);
  const [h2,m2]=f.split(":").map(Number);
  let diff=(h2+m2/60)-(h1+m1/60);
  if(diff<0) diff+=24;
  return diff||1;
}

/* ==== ANNULER DERNIER ==== */
function annulerDernier(){
  if(!ligne) return;
  const l=data.production[ligne];
  if(l&&l.list&&l.list.length>0){
    l.list.pop(); save(); afficherHistorique();
    alert(`Dernier enregistrement supprimé pour ${ligne}`);
  }
}

/* ==== HISTORIQUE ==== */
function afficherHistorique(){
  const zone=document.getElementById("historiqueProduction");
  if(!zone) return;
  zone.innerHTML="";
  for(let l in data.production){
    const hist=data.production[l].list||[];
    hist.forEach(e=>{
      zone.innerHTML+=`<div class="bloc-histo"><strong>${l}</strong> — ${e.date}<br>${e.qte} colis • ${e.cad} c/h • Fin estimée : ${e.estim}</div>`;
    });
  }
}
afficherHistorique();

/* ==== ARRÊTS ==== */
function ajouterArret(){
  const l=ligne||prompt("Ligne concernée ?");
  if(!l) return;
  const motif=prompt("Motif de l’arrêt ?");
  const d=parseInt(prompt("Durée (en minutes) ?"))||0;
  if(!motif||d<=0) return alert("⛔ Motif ou durée invalide");
  data.arrets.push({
    date:new Date().toLocaleDateString("fr-FR"),
    heure:new Date().toLocaleTimeString("fr-FR",{hour12:false}),
    ligne:l,duree:d,motif
  });
  save(); afficherArrets();
}
function afficherArrets(){
  const tb=document.querySelector("#tableArrets tbody");
  if(!tb) return;
  tb.innerHTML=data.arrets.map(a=>`<tr><td>${a.date}</td><td>${a.heure}</td><td>${a.ligne}</td><td>${a.duree}</td><td>${a.motif}</td></tr>`).join("")||
  "<tr><td colspan='5'><em>Aucun arrêt enregistré</em></td></tr>";
}
afficherArrets();

/* ==== PERSONNEL ==== */
function ajouterPersonnel(){
  const t=document.getElementById("typePersonnel").value;
  const c=document.getElementById("commentairePersonnel").value.trim();
  if(!c)return;
  data.personnel.push({date:new Date().toLocaleString("fr-FR"),type:t,commentaire:c});
  save(); afficherPersonnel(); document.getElementById("commentairePersonnel").value="";
}
function afficherPersonnel(){
  const z=document.getElementById("listePersonnel");
  if(!z)return;
  z.innerHTML=data.personnel.map(p=>`<div class="bloc-histo"><strong>${p.type}</strong> — ${p.date}<br>${p.commentaire}</div>`).join("")||
  "<em>Aucun enregistrement.</em>";
}
afficherPersonnel();

/* ==== ORGANISATION ==== */
function ajouterOrganisation(){
  const n=document.getElementById("noteOrganisation").value.trim();
  if(!n)return;
  data.organisation.push({date:new Date().toLocaleString("fr-FR"),note:n});
  save(); afficherOrganisation(); document.getElementById("noteOrganisation").value="";
}
function afficherOrganisation(){
  const z=document.getElementById("historiqueOrganisation");
  if(!z)return;
  z.innerHTML=data.organisation.map(o=>`<div class="bloc-histo">[${o.date}] ${o.note}</div>`).join("")||
  "<em>Aucune consigne.</em>";
}
afficherOrganisation();

/* ==== EXPORT EXCEL ==== */
function exportExcel(nom,tab){
  if(!tab||tab.length===0){alert("Aucune donnée à exporter.");return;}
  const ws=XLSX.utils.json_to_sheet(tab);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,"Données");
  XLSX.writeFile(wb,`${nom}_${new Date().toLocaleDateString("fr-FR")}.xlsx`);
}
function exporterArrets(){exportExcel("Arrets",data.arrets);}
function exporterPersonnel(){exportExcel("Personnel",data.personnel);}
function exporterOrganisation(){exportExcel("Organisation",data.organisation);}
document.getElementById("exportAllBtn").addEventListener("click",()=>{
  const all=[].concat(
    ...Object.values(data.production).map(p=>p.list||[]),
    data.arrets,data.personnel,data.organisation
  );
  exportExcel("SyntheseComplete",all);
});

/* ==== REMISE À ZÉRO ==== */
function remiseZero(){
  if(confirm("Exporter avant de tout effacer ?")){
    const all=[].concat(
      ...Object.values(data.production).map(p=>p.list||[]),
      data.arrets,data.personnel,data.organisation
    );
    exportExcel("Backup",all);
  }
  data={production:{},arrets:[],personnel:[],organisation:[]};
  save(); afficherHistorique(); afficherArrets(); afficherPersonnel(); afficherOrganisation();
  alert("Base vidée après sauvegarde.");
  }
