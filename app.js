/******************************************************
 *  SYNTHÈSE ATELIER LACTALIS - Version Marbre+
 *  Navigation + Cadence + Estimation + Persistance
 *  Graphiques + Arrêts + Personnel + Organisation
 *  Export Excel Global + Calculatrice Flottante
 ******************************************************/

// === VARIABLES GLOBALES ===
let historique = JSON.parse(localStorage.getItem("historique")) || {};
let arrets = JSON.parse(localStorage.getItem("arrets")) || {};
let personnel = JSON.parse(localStorage.getItem("personnel")) || [];
let organisation = JSON.parse(localStorage.getItem("organisation")) || [];

let chartQuantites, chartCadences;

// === NAVIGATION ===
function showSection(sectionId) {
  document.querySelectorAll(".page-section").forEach(sec => {
    sec.classList.add("hidden");
    sec.classList.remove("active");
  });
  const target = document.getElementById(sectionId);
  if (target) {
    target.classList.remove("hidden");
    target.classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}
window.showSection = showSection;

// === INITIALISATION DES FORMULAIRES DE LIGNES ===
const lignes = ["râpé","t2","rt","omori","t1","sticks","emballage","dés","filets","prédécoupé"];
lignes.forEach(ligne => {
  const section = document.getElementById(ligne);
  if (!section) return;
  section.innerHTML = `
    <h2>${ligne.toUpperCase()}</h2>
    <form onsubmit="event.preventDefault(); enregistrerLigne('${ligne}')">
      <label>Heure début :</label>
      <input type="time" id="${ligne}-hDebut" required />
      
      <label>Heure fin :</label>
      <input type="time" id="${ligne}-hFin" required />
      
      <label>Quantité réalisée :</label>
      <input type="number" id="${ligne}-quantite" placeholder="Colis produits" />
      
      <label>Quantité restante :</label>
      <input type="number" id="${ligne}-restante" placeholder="Colis restants" oninput="majEstimation('${ligne}')" />
      
      <label>Cadence (colis/heure) :</label>
      <input type="number" id="${ligne}-cadence" readonly />

      <label>Fin estimée :</label>
      <input type="text" id="${ligne}-finEstimee" readonly />

      <button type="submit">Enregistrer</button>
      <button type="button" onclick="remiseCadence('${ligne}')">🔄 Remise à zéro cadence</button>
    </form>

    <h3>Historique</h3>
    <div id="historique-${ligne}"></div>
  `;
  majHistorique(ligne);
});

// === ENREGISTREMENT D'UNE LIGNE ===
function enregistrerLigne(ligne) {
  const hD = document.getElementById(`${ligne}-hDebut`).value;
  const hF = document.getElementById(`${ligne}-hFin`).value;
  const qR = Number(document.getElementById(`${ligne}-quantite`).value) || 0;
  const qRest = Number(document.getElementById(`${ligne}-restante`).value) || 0;
  const cadence = calculerCadence(hD, hF, qR);
  const estFin = estimerFin(qRest, cadence);

  if (!historique[ligne]) historique[ligne] = [];
  historique[ligne].push({
    date: new Date().toLocaleDateString("fr-FR"),
    hD, hF, qR, qRest, cad: cadence, estFin
  });
  localStorage.setItem("historique", JSON.stringify(historique));

  document.getElementById(`${ligne}-cadence`).value = cadence;
  document.getElementById(`${ligne}-finEstimee`).value = estFin;

  document.getElementById(`${ligne}-quantite`).value = "";
  document.getElementById(`${ligne}-restante`).value = "";

  majHistorique(ligne);
  majGraphiques();
}

// === CALCUL CADENCE ===
function calculerCadence(hD, hF, qR) {
  if (!hD || !hF || !qR) return 0;
  const [h1, m1] = hD.split(":").map(Number);
  const [h2, m2] = hF.split(":").map(Number);
  let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (diff <= 0) diff += 24 * 60; // minuit
  return Math.round((qR / diff) * 60);
}

// === ESTIMATION FIN ===
function estimerFin(qRest, cadence) {
  if (!qRest || !cadence) return "";
  const minutes = Math.round((qRest / cadence) * 60);
  const fin = new Date(Date.now() + minutes * 60000);
  return fin.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

// === MISE À JOUR ESTIMATION ===
function majEstimation(ligne) {
  const qRest = Number(document.getElementById(`${ligne}-restante`).value);
  const cad = Number(document.getElementById(`${ligne}-cadence`).value);
  document.getElementById(`${ligne}-finEstimee`).value = estimerFin(qRest, cad);
}

// === REMISE À ZÉRO CADENCE ===
function remiseCadence(ligne) {
  document.getElementById(`${ligne}-cadence`).value = "";
  document.getElementById(`${ligne}-finEstimee`).value = "";
}

// === HISTORIQUE PAR LIGNE ===
function majHistorique(ligne) {
  const cont = document.getElementById(`historique-${ligne}`);
  if (!cont) return;
  const data = historique[ligne] || [];
  if (!data.length) {
    cont.innerHTML = "<p>Aucun enregistrement</p>";
    return;
  }
  cont.innerHTML = data.map((e,i)=>`
    <div class="hist-item">
      <b>${e.date}</b> ${e.hD}-${e.hF} | ${e.qR} colis (${e.cad} c/h)
      <button onclick="supprimerHistorique('${ligne}', ${i})">🗑</button>
    </div>
  `).join("");
}
function supprimerHistorique(ligne, index) {
  historique[ligne].splice(index,1);
  localStorage.setItem("historique", JSON.stringify(historique));
  majHistorique(ligne);
  majGraphiques();
}

// === PAGE ARRÊTS ===
function ajouterArret() {
  const ligne = document.getElementById("ligneSelect").value;
  const motif = document.getElementById("motifArret").value;
  const duree = document.getElementById("dureeArret").value;
  if (!ligne || !motif || !duree) return alert("Champs manquants !");
  if (!arrets[ligne]) arrets[ligne] = [];
  arrets[ligne].push({ motif, duree });
  localStorage.setItem("arrets", JSON.stringify(arrets));
  document.getElementById("motifArret").value = "";
  document.getElementById("dureeArret").value = "";
  majListeArrets();
}
function majListeArrets() {
  const div = document.getElementById("listeArretsPage");
  if (!div) return;
  div.innerHTML = "";
  Object.entries(arrets).forEach(([ligne, data]) => {
    data.forEach(a => {
      const el = document.createElement("div");
      el.textContent = `${ligne} : ${a.motif} (${a.duree} min)`;
      div.appendChild(el);
    });
  });
}

// === PAGE PERSONNEL ===
function ajouterPersonnel() {
  const nom = document.getElementById("nomPersonnel").value;
  const motif = document.getElementById("motifPersonnel").value;
  const com = document.getElementById("commentairePersonnel").value;
  if (!nom) return alert("Nom obligatoire");
  personnel.push({ nom, motif, commentaire: com });
  localStorage.setItem("personnel", JSON.stringify(personnel));
  document.getElementById("nomPersonnel").value = "";
  document.getElementById("commentairePersonnel").value = "";
  majListePersonnel();
}
function majListePersonnel() {
  const div = document.getElementById("listePersonnel");
  if (!div) return;
  div.innerHTML = personnel.map(p => `
    <div class="hist-item"><b>${p.nom}</b> — ${p.motif} (${p.commentaire})</div>
  `).join("");
}

// === PAGE ORGANISATION ===
function ajouterConsigne() {
  const txt = document.getElementById("consigneText").value;
  if (!txt) return alert("Consigne vide !");
  organisation.push({ date: new Date().toLocaleString("fr-FR"), consigne: txt });
  localStorage.setItem("organisation", JSON.stringify(organisation));
  document.getElementById("consigneText").value = "";
  majListeOrganisation();
}
function majListeOrganisation() {
  const div = document.getElementById("listeOrganisation");
  if (!div) return;
  div.innerHTML = organisation.map(c => `
    <div class="hist-item">${c.date} — ${c.consigne}</div>
  `).join("");
}

// === GRAPHIQUES CHART.JS ===
function majGraphiques() {
  const ctx1 = document.getElementById("chartQuantites");
  const ctx2 = document.getElementById("chartCadences");
  if (!ctx1 || !ctx2) return;
  const lignes = Object.keys(historique);
  const quantites = lignes.map(l => historique[l].reduce((a,x)=>a+Number(x.qR||0),0));
  const moyCad = lignes.map(l => {
    const data = historique[l];
    if (!data.length) return 0;
    const sum = data.reduce((a,x)=>a+Number(x.cad||0),0);
    return Math.round(sum/data.length);
  });

  if (chartQuantites) chartQuantites.destroy();
  chartQuantites = new Chart(ctx1,{type:"bar",data:{labels:lignes,datasets:[{label:"Quantités",data:quantites,backgroundColor:"#007bff"}]},options:{responsive:true,scales:{y:{beginAtZero:true}}}});

  if (chartCadences) chartCadences.destroy();
  chartCadences = new Chart(ctx2,{type:"line",data:{labels:lignes,datasets:[{label:"Cadence moyenne",data:moyCad,borderColor:"#007bff",tension:0.3,fill:false}]},options:{responsive:true}});
}
majGraphiques();

// === EXPORT EXCEL GLOBAL ===
document.getElementById("exportExcelGlobal").addEventListener("click", exportGlobalExcel);
function exportGlobalExcel() {
  const wb = XLSX.utils.book_new();
  let ws_data = [];
  ws_data.push(["Synthèse Atelier Lactalis"]);
  ws_data.push(["Date :", new Date().toLocaleString()]);
  ws_data.push([]);

  ws_data.push(["📦 Production"]);
  ws_data.push(["Ligne","Heure début","Heure fin","Quantité","Cadence","Fin estimée"]);
  Object.entries(historique).forEach(([l,entries])=>{
    entries.forEach(e=>{
      ws_data.push([l,e.hD,e.hF,e.qR,e.cad,e.estFin]);
    });
  });
  ws_data.push([]);

  ws_data.push(["⛔ Arrêts"]);
  ws_data.push(["Ligne","Motif","Durée (min)"]);
  Object.entries(arrets).forEach(([l,data])=>{
    data.forEach(a=>ws_data.push([l,a.motif,a.duree]));
  });
  ws_data.push([]);

  ws_data.push(["👷 Personnel"]);
  ws_data.push(["Nom","Motif","Commentaire"]);
  personnel.forEach(p=>ws_data.push([p.nom,p.motif,p.commentaire]));
  ws_data.push([]);

  ws_data.push(["🗒 Organisation"]);
  ws_data.push(["Date","Consigne"]);
  organisation.forEach(o=>ws_data.push([o.date,o.consigne]));

  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  ws["!cols"] = [{wch:20},{wch:20},{wch:20},{wch:15},{wch:15},{wch:25}];
  XLSX.utils.book_append_sheet(wb,ws,"Synthèse Atelier");
  XLSX.writeFile(wb,`Synthese_Atelier_${new Date().toISOString().slice(0,10)}.xlsx`);
}

// === CALCULATRICE FLOTTANTE ===
const calc = document.getElementById("calculator");
const calcScreen = document.getElementById("calcScreen");
document.getElementById("openCalc").addEventListener("click",()=>calc.classList.toggle("show"));
document.getElementById("calcKeys").addEventListener("click",e=>{
  if(!e.target.matches("button"))return;
  const val=e.target.textContent;
  if(val==="C")calcScreen.value="";
  else if(val==="="){try{calcScreen.value=eval(calcScreen.value);}catch{calcScreen.value="Erreur";}}
  else calcScreen.value+=val;
});
