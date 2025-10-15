// === SYNTHÈSE PRODUCTION — Correctif persistance & heures libres ===

// === DATE / HEURE / ÉQUIPE ===
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

// === STOCKAGE LOCAL ===
let data = JSON.parse(localStorage.getItem("syntheseData")) || { production:{}, arrets:[], personnel:[], organisation:[] };
function save() { localStorage.setItem("syntheseData", JSON.stringify(data)); }

// === NAVIGATION ===
function changerPage(page) {
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  document.querySelector(`#page${page}`).classList.add("active");
  window.scrollTo({top:0,behavior:"smooth"});
}

// === LIGNE COURANTE ===
let ligne = "";
function selectLine(l) {
  ligne = l;
  document.getElementById("titreLigne").textContent = l;
  loadForm(l);
  document.getElementById("formulaireProduction").scrollIntoView({behavior:"smooth"});
}

// === CHARGEMENT / SAUVEGARDE DU FORMULAIRE ===
function loadForm(l) {
  const f = data.production[l] || {};
  document.getElementById("heureDebut").value = f.debut || "";
  document.getElementById("heureFin").value = f.fin || "";
  document.getElementById("quantiteRealisee").value = f.qte || "";
  document.getElementById("quantiteRestante").value = f.reste || "";
  document.getElementById("cadenceManuelle").value = f.cadMan || "";
  document.getElementById("estimationFin").value = f.estim || "";
}

["heureDebut","heureFin","quantiteRealisee","quantiteRestante","cadenceManuelle"].forEach(id=>{
  document.getElementById(id).addEventListener("input",()=>{
    if(!ligne) return;
    const f = {
      debut:document.getElementById("heureDebut").value,
      fin:document.getElementById("heureFin").value,
      qte:document.getElementById("quantiteRealisee").value,
      reste:document.getElementById("quantiteRestante").value,
      cadMan:document.getElementById("cadenceManuelle").value,
      estim:document.getElementById("estimationFin").value
    };
    data.production[ligne] = {...(data.production[ligne]||{}),...f};
    save();
  });
});

// === CALCUL AUTOMATIQUE ESTIMATION ===
document.getElementById("quantiteRestante").addEventListener("input", calcEstimation);
document.getElementById("cadenceManuelle").addEventListener("input", calcEstimation);
function calcEstimation(){
  if(!ligne) return;
  const reste = parseFloat(document.getElementById("quantiteRestante").value)||0;
  const cadMan = parseFloat(document.getElementById("cadenceManuelle").value)||0;
  const fin = document.getElementById("heureFin").value;
  if(!reste || !fin) return;
  const cad = cadMan>0?cadMan:(data.production[ligne]?.cad || 0);
  if(!cad) return;
  const minRest = (reste / cad) * 60;
  const [h,m]=fin.split(":").map(Number);
  const finCalc = new Date();
  finCalc.setHours(h||0,m||0);
  finCalc.setMinutes(finCalc.getMinutes() + minRest);
  const hFin = finCalc.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
  document.getElementById("estimationFin").value = hFin;
  data.production[ligne] = {...(data.production[ligne]||{}), reste, cadMan, estim:hFin};
  save();
}

// === ENREGISTREMENT ===
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
  data.production[ligne]={...data.production[ligne], debut:deb, fin:fin, qte, reste, cadMan, estim, cad};
  save();
  alert(`✅ Données enregistrées pour ${ligne}`);
  afficherHistorique();
  // reset des champs quantité
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

// === HISTORIQUE ===
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

// === ARRÊTS / PERSONNEL / ORGANISATION identiques à la version précédente ===
