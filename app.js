// === SYNTHÈSE PRODUCTION - APP.JS ===

// ---- MISE À JOUR DATE/HEURE + ÉQUIPE ----
function majDateHeure() {
  const now = new Date();
  const jours = ["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];
  const mois = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
  const jour = jours[now.getDay()];
  const dateStr = `${jour} ${now.getDate()} ${mois[now.getMonth()]} ${now.getFullYear()} — Semaine ${getWeekNumber(now)} — ${now.toLocaleTimeString("fr-FR",{hour12:false})}`;
  document.getElementById("dateHeure").textContent = dateStr;

  const h = now.getHours();
  let equipe = "";
  if (h >= 5 && h < 13) equipe = "M (5h–13h)";
  else if (h >= 13 && h < 21) equipe = "AM (13h–21h)";
  else equipe = "N (21h–5h)";
  document.getElementById("equipe").textContent = "Équipe : " + equipe;
}
setInterval(majDateHeure, 1000);
majDateHeure();

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
}

// ---- NAVIGATION ENTRE PAGES ----
function changerPage(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll("footer button").forEach(b => b.classList.remove("active"));
  document.getElementById(`page${page}`).classList.add("active");
  event.target.classList.add("active");
  window.scrollTo(0,0);
}

// ---- GESTION DES LIGNES ----
let ligneSelectionnee = "";
function selectLine(line) {
  ligneSelectionnee = line;
  document.getElementById("titreLigne").textContent = line;
  document.getElementById("formulaireProduction").scrollIntoView({behavior:"smooth"});
}

// ---- HEURES DÉBUT / FIN ----
const heureDebut = document.getElementById("heureDebut");
const heureFin = document.getElementById("heureFin");
for (let h = 0; h < 24; h++) {
  const opt1 = document.createElement("option");
  const opt2 = document.createElement("option");
  opt1.text = opt2.text = `${String(h).padStart(2,"0")}:00`;
  heureDebut.add(opt1); heureFin.add(opt2);
}

// ---- PERSISTANCE LOCALE ----
let donnees = JSON.parse(localStorage.getItem("donneesSynthese")) || {production:[],arrets:[],personnel:[],organisation:[]};
function sauvegarder() { localStorage.setItem("donneesSynthese", JSON.stringify(donnees)); }

// ---- ENREGISTREMENT PRODUCTION ----
function enregistrerProduction() {
  if (!ligneSelectionnee) { alert("Sélectionnez une ligne."); return; }
  const debut = heureDebut.value;
  const fin = heureFin.value;
  const qte = parseFloat(document.getElementById("quantiteRealisee").value) || 0;
  const qteRest = parseFloat(document.getElementById("quantiteRestante").value) || 0;
  const cadMan = parseFloat(document.getElementById("cadenceManuelle").value) || 0;
  let duree = calcHeures(debut, fin);
  let cadence = cadMan || (qte / duree);
  let estim = "";
  if (cadence && qteRest) {
    const heuresRest = qteRest / cadence;
    const finEst = new Date();
    finEst.setHours(finEst.getHours() + heuresRest);
    estim = finEst.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
  }
  document.getElementById("estimationFin").value = estim;

  const entry = {date:new Date().toLocaleString("fr-FR"), ligne:ligneSelectionnee, debut, fin, qte, cadence:cadence.toFixed(1), qteRest, estim};
  donnees.production.push(entry);
  sauvegarder();
  afficherHistorique();
  reinitForm();
}

function calcHeures(deb, fin) {
  const [h1,m1] = deb.split(":").map(Number);
  const [h2,m2] = fin.split(":").map(Number);
  let diff = (h2 + m2/60) - (h1 + m1/60);
  if (diff < 0) diff += 24;
  return diff || 1;
}

function reinitForm() {
  document.getElementById("quantiteRealisee").value = "";
  document.getElementById("quantiteRestante").value = "";
  document.getElementById("cadenceManuelle").value = "";
}

// ---- ANNULER DERNIER ----
function annulerDernier() {
  if (donnees.production.length > 0) {
    donnees.production.pop();
    sauvegarder();
    afficherHistorique();
  }
}

// ---- HISTORIQUE PRODUCTION ----
function afficherHistorique() {
  const zone = document.getElementById("historiqueProduction");
  if (donnees.production.length === 0) { zone.innerHTML = "<em>Aucune donnée enregistrée.</em>"; return; }
  zone.innerHTML = donnees.production.map(e=>`
    <div class="bloc-histo">
      <strong>${e.ligne}</strong> — ${e.date}<br>
      ${e.qte} colis • ${e.cadence} c/h • Fin estimée : ${e.estim}
    </div>`).join("");
}
afficherHistorique();

// ---- ARRÊTS ----
function ajouterArret() {
  const line = ligneSelectionnee || "Non défini";
  const motif = prompt("Motif de l'arrêt ?");
  const duree = prompt("Durée en minutes ?");
  if (!motif || !duree) return;
  donnees.arrets.push({date:new Date().toLocaleDateString("fr-FR"), heure:new Date().toLocaleTimeString("fr-FR",{hour12:false}), ligne:line, duree, motif});
  sauvegarder(); afficherArrets();
}
function afficherArrets() {
  const tbody = document.querySelector("#tableArrets tbody");
  tbody.innerHTML = donnees.arrets.map(a=>`<tr><td>${a.date}</td><td>${a.heure}</td><td>${a.ligne}</td><td>${a.duree}</td><td>${a.motif}</td></tr>`).join("");
}
afficherArrets();

// ---- PERSONNEL ----
function ajouterPersonnel() {
  const type = document.getElementById("typePersonnel").value;
  const com = document.getElementById("commentairePersonnel").value.trim();
  if (!com) return;
  donnees.personnel.push({date:new Date().toLocaleString("fr-FR"), type, com});
  sauvegarder(); afficherPersonnel();
  document.getElementById("commentairePersonnel").value = "";
}
function afficherPersonnel() {
  const zone = document.getElementById("listePersonnel");
  if (donnees.personnel.length===0){ zone.innerHTML="<em>Aucun enregistrement.</em>"; return; }
  zone.innerHTML = donnees.personnel.map(p=>`<div class="bloc-histo"><strong>${p.type}</strong> — ${p.date}<br>${p.com}</div>`).join("");
}
afficherPersonnel();

// ---- ORGANISATION ----
function ajouterOrganisation() {
  const note = document.getElementById("noteOrganisation").value.trim();
  if (!note) return;
  donnees.organisation.push({date:new Date().toLocaleString("fr-FR"), note});
  sauvegarder(); afficherOrganisation();
  document.getElementById("noteOrganisation").value = "";
}
function afficherOrganisation() {
  const zone = document.getElementById("historiqueOrganisation");
  if (donnees.organisation.length===0){ zone.innerHTML="<em>Aucune consigne.</em>"; return; }
  zone.innerHTML = donnees.organisation.map(o=>`<div class="bloc-histo">[${o.date}] ${o.note}</div>`).join("");
}
afficherOrganisation();

// ---- EXPORTS ----
function exporterArrets(){exportExcel("Arrets", donnees.arrets);}
function exporterPersonnel(){exportExcel("Personnel", donnees.personnel);}
function exporterOrganisation(){exportExcel("Organisation", donnees.organisation);}
document.getElementById("exportAllBtn").addEventListener("click", ()=>exportExcel("SyntheseComplete", donnees.production.concat(donnees.arrets,donnees.personnel,donnees.organisation)));

function exportExcel(nom, data){
  if(!data||data.length===0){alert("Aucune donnée à exporter.");return;}
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,"Données");
  XLSX.writeFile(wb,`${nom}_${new Date().toLocaleDateString("fr-FR")}.xlsx`);
}

// ---- REMISE À ZÉRO ----
function remiseZero(){
  if(confirm("Exporter avant de tout réinitialiser ?")){
    exportExcel("Backup", donnees.production.concat(donnees.arrets,donnees.personnel,donnees.organisation));
  }
  localStorage.removeItem("donneesSynthese");
  donnees={production:[],arrets:[],personnel:[],organisation:[]};
  afficherHistorique(); afficherArrets(); afficherPersonnel(); afficherOrganisation();
  alert("Données remises à zéro.");
}
