// === SYNTHÈSE PRODUCTION V31 ===
// Toutes options incluses : estimation auto, persistance par ligne, cadence manuelle, historique, exports, PWA-ready

/* ==== DATE / HEURE / ÉQUIPE ==== */
function majDateHeure() {
  const now = new Date();
  const jours = ["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];
  const mois = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
  const semaine = Math.ceil((((now - new Date(now.getFullYear(),0,1)) / 86400000) + now.getDay() + 1) / 7);
  document.getElementById("dateHeure").textContent = `${jours[now.getDay()]} ${now.getDate()} ${mois[now.getMonth()]} ${now.getFullYear()} — Semaine ${semaine} — ${now.toLocaleTimeString("fr-FR")}`;
  const h = now.getHours();
  let eq = "";
  if (h >= 5 && h < 13) eq = "M (5h–13h)";
  else if (h >= 13 && h < 21) eq = "AM (13h–21h)";
  else eq = "N (21h–5h)";
  document.getElementById("equipe").textContent = `Équipe : ${eq}`;
}
setInterval(majDateHeure, 1000);
majDateHeure();

/* ==== CHANGEMENT DE PAGE ==== */
function changerPage(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.querySelector(`#page${page}`).classList.add("active");
  document.querySelectorAll("footer button").forEach(b => b.classList.remove("active"));
  event.target.classList.add("active");
  window.scrollTo(0,0);
}

/* ==== INITIALISATION ==== */
let data = JSON.parse(localStorage.getItem("syntheseData")) || {
  production:{}, arrets:[], personnel:[], organisation:[]
};
function save() { localStorage.setItem("syntheseData", JSON.stringify(data)); }

/* ==== LIGNES ==== */
let ligne = "";
function selectLine(l) {
  ligne = l;
  document.getElementById("titreLigne").textContent = l;
  initHeures();
  loadForm(l);
  document.getElementById("formulaireProduction").scrollIntoView({behavior:"smooth"});
}

/* ==== HEURES ==== */
function initHeures() {
  const deb = document.getElementById("heureDebut");
  const fin = document.getElementById("heureFin");
  deb.innerHTML = fin.innerHTML = "";
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const v = `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
      const opt1 = new Option(v,v);
      const opt2 = new Option(v,v);
      deb.add(opt1); fin.add(opt2);
    }
  }
}

/* ==== PERSISTANCE PAR LIGNE ==== */
function loadForm(l) {
  const f = data.production[l] || {};
  document.getElementById("quantiteRealisee").value = f.qte || "";
  document.getElementById("quantiteRestante").value = f.reste || "";
  document.getElementById("cadenceManuelle").value = f.cadMan || "";
  document.getElementById("estimationFin").value = f.estim || "";
}

/* ==== ESTIMATION AUTOMATIQUE ==== */
["quantiteRestante","cadenceManuelle","heureFin"].forEach(id=>{
  document.getElementById(id).addEventListener("input", calcEstimation);
});
function calcEstimation(){
  if(!ligne) return;
  const reste = parseFloat(document.getElementById("quantiteRestante").value)||0;
  const cadMan = parseFloat(document.getElementById("cadenceManuelle").value)||0;
  const fin = document.getElementById("heureFin").value;
  if(!reste || !fin) return;
  const cad = cadMan>0?cadMan: (data.production[ligne]?.cad || 0);
  if(!cad) return;
  const minRest = (reste / cad) * 60;
  const [h,m]=fin.split(":").map(Number);
  const finCalc = new Date(); finCalc.setHours(h,m);
  finCalc.setMinutes(finCalc.getMinutes() + minRest);
  const hFin = finCalc.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
  document.getElementById("estimationFin").value = hFin;
  data.production[ligne]={...(data.production[ligne]||{}), reste, cadMan, estim:hFin};
  save();
}

/* ==== ENREGISTREMENT PRODUCTION ==== */
function enregistrerProduction(){
  if(!ligne){alert("Sélectionnez une ligne.");return;}
  const deb=document.getElementById("heureDebut").value;
  const fin=document.getElementById("heureFin").value;
  const qte=parseFloat(document.getElementById("quantiteRealisee").value)||0;
  const reste=parseFloat(document.getElementById("quantiteRestante").value)||0;
  const cadMan=parseFloat(document.getElementById("cadenceManuelle").value)||0;
  const duree = dureeHeures(deb,fin);
  const cad = cadMan>0?cadMan:(qte/duree)||0;
  const estim = document.getElementById("estimationFin").value||"";
  if(!data.production[ligne]) data.production[ligne]={list:[]};
  if(!Array.isArray(data.production[ligne].list)) data.production[ligne].list=[];
  data.production[ligne].list.push({
    date:new Date().toLocaleString("fr-FR"),
    debut:deb, fin:fin, qte, reste, cad:cad.toFixed(1), estim
  });
  data.production[ligne]={...data.production[ligne], qte, reste, cadMan, estim, cad, fin};
  save(); alert(`✅ Données enregistrées pour ${ligne}`);
  afficherHistorique();
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
  }
}

/* ==== HISTORIQUE PRODUCTION ==== */
function afficherHistorique(){
  const zone=document.getElementById("historiqueProduction");
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
  const l=ligne||prompt("Ligne ?");
  const motif=prompt("Motif ?");
  const d=prompt("Durée (min) ?");
  if(!motif||!d)return;
  data.arrets.push({date:new Date().toLocaleDateString("fr-FR"), heure:new Date().toLocaleTimeString("fr-FR",{hour12:false}), ligne:l, duree:d, motif});
  save(); afficherArrets();
}
function afficherArrets(){
  const tb=document.querySelector("#tableArrets tbody");
  tb.innerHTML=data.arrets.map(a=>`<tr><td>${a.date}</td><td>${a.heure}</td><td>${a.ligne}</td><td>${a.duree}</td><td>${a.motif}</td></tr>`).join("");
}
afficherArrets();

/* ==== PERSONNEL ==== */
function ajouterPersonnel(){
  const t=document.getElementById("typePersonnel").value;
  const c=document.getElementById("commentairePersonnel").value.trim();
  if(!c)return;
  data.personnel.push({date:new Date().toLocaleString("fr-FR"), type:t, commentaire:c});
  save(); afficherPersonnel(); document.getElementById("commentairePersonnel").value="";
}
function afficherPersonnel(){
  const z=document.getElementById("listePersonnel");
  z.innerHTML=data.personnel.map(p=>`<div class="bloc-histo"><strong>${p.type}</strong> — ${p.date}<br>${p.commentaire}</div>`).join("")||"<em>Aucun enregistrement.</em>";
}
afficherPersonnel();

/* ==== ORGANISATION ==== */
function ajouterOrganisation(){
  const n=document.getElementById("noteOrganisation").value.trim();
  if(!n)return;
  data.organisation.push({date:new Date().toLocaleString("fr-FR"), note:n});
  save(); afficherOrganisation(); document.getElementById("noteOrganisation").value="";
}
function afficherOrganisation(){
  const z=document.getElementById("historiqueOrganisation");
  z.innerHTML=data.organisation.map(o=>`<div class="bloc-histo">[${o.date}] ${o.note}</div>`).join("")||"<em>Aucune consigne.</em>";
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
