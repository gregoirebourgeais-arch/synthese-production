/* === app.js — V30.3 complète === */

// === MISE À JOUR DATE / HEURE ===
function updateDateTime() {
  const now = new Date();
  const jours = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
  const mois = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  const jour = jours[now.getDay()];
  const date = `${jour} ${now.getDate()} ${mois[now.getMonth()]} ${now.getFullYear()}`;
  const semaine = `Semaine ${getWeekNumber(now)}`;
  const heure = now.toLocaleTimeString('fr-FR', {hour12:false});
  document.getElementById("dateTime").innerText = `${date} — ${semaine} — ${heure}`;
}
setInterval(updateDateTime, 1000);

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
  return weekNo;
}

// === DÉTERMINATION AUTOMATIQUE DE L’ÉQUIPE ===
function setEquipe() {
  const now = new Date();
  const hour = now.getHours();
  let equipe = "—";

  if (hour >= 5 && hour < 13) equipe = "M (5h–13h)";
  else if (hour >= 13 && hour < 21) equipe = "AM (13h–21h)";
  else equipe = "N (21h–5h)";

  document.getElementById("equipeDisplay").innerText = `Équipe : ${equipe}`;
  return equipe;
}
setEquipe();
setInterval(setEquipe, 60000);

// === NAVIGATION ENTRE LES PAGES ===
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// === SELECTION D'UNE LIGNE DE PRODUCTION ===
let currentLine = null;
function selectLine(lineName) {
  currentLine = lineName;
  document.getElementById("lineTitle").innerText = lineName;
  document.getElementById("lineForm").classList.remove("hidden");
  document.getElementById("lineForm").scrollIntoView({ behavior: "smooth" });
}

// === ENREGISTREMENT DES DONNÉES PRODUCTION ===
function enregistrer() {
  const line = currentLine;
  if (!line) return alert("Sélectionnez d'abord une ligne !");
  const start = document.getElementById("startTime").value;
  const end = document.getElementById("endTime").value;
  const qte = parseInt(document.getElementById("quantite").value || 0);
  const cadenceM = parseInt(document.getElementById("cadenceManuelle").value || 0);
  const reste = parseInt(document.getElementById("reste").value || 0);

  // Calcul de cadence et estimation
  const cadenceCalculee = calcCadence(start, end, qte);
  const estFin = estimerFin(reste, cadenceM || cadenceCalculee);

  document.getElementById("cadenceCalculee").value = cadenceCalculee + " colis/h";
  document.getElementById("estimationFin").value = estFin;

  const data = {
    ligne: line,
    debut: start,
    fin: end,
    quantite: qte,
    cadenceManuelle: cadenceM,
    cadenceCalculee,
    reste,
    estimation: estFin,
    date: new Date().toLocaleString()
  };

  saveToLocal("productionData", data);

  // Effacement après enregistrement
  document.getElementById("startTime").value = "";
  document.getElementById("endTime").value = "";
  document.getElementById("quantite").value = "";
  document.getElementById("cadenceManuelle").value = "";
  document.getElementById("reste").value = "";
  alert("✅ Données enregistrées avec succès !");
}

function retour() {
  document.getElementById("lineForm").classList.add("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// === CALCULS ===
function calcCadence(start, end, qte) {
  if (!start || !end || !qte) return 0;
  const startParts = start.split(":");
  const endParts = end.split(":");
  let diff = (parseInt(endParts[0]) * 60 + parseInt(endParts[1])) - (parseInt(startParts[0]) * 60 + parseInt(startParts[1]));
  if (diff <= 0) diff += 24 * 60;
  return Math.round(qte / (diff / 60));
}

function estimerFin(reste, cadence) {
  if (!reste || !cadence) return "";
  const heures = reste / cadence;
  const now = new Date();
  now.setMinutes(now.getMinutes() + heures * 60);
  return now.toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'});
    }
// === SAUVEGARDE LOCALE GÉNÉRIQUE ===
function saveToLocal(key, data) {
  const all = JSON.parse(localStorage.getItem(key)) || [];
  all.push(data);
  localStorage.setItem(key, JSON.stringify(all));
}

// === ARRÊTS ===
function ajouterArret() {
  const ligne = document.getElementById("ligneArret").value;
  const duree = document.getElementById("dureeArret").value;
  const motif = document.getElementById("motifArret").value;
  if (!ligne || !duree) return alert("⚠️ Sélectionnez une ligne et indiquez la durée.");
  const data = { ligne, duree, motif, date: new Date().toLocaleString() };
  saveToLocal("arretsData", data);
  document.getElementById("dureeArret").value = "";
  document.getElementById("motifArret").value = "";
  afficherArrets();
}

function afficherArrets() {
  const div = document.getElementById("historiqueArrets");
  const data = JSON.parse(localStorage.getItem("arretsData")) || [];
  if (data.length === 0) return div.innerHTML = "<p>Aucun arrêt enregistré.</p>";
  div.innerHTML = data.slice(-20).reverse().map(a =>
    `<div class="card">[${a.date}] ${a.ligne} – ${a.duree} min (${a.motif})</div>`
  ).join("");
}

// === PERSONNEL ===
function ajouterPersonnel() {
  const nom = document.getElementById("nomPersonnel").value;
  const type = document.getElementById("typePersonnel").value;
  const com = document.getElementById("commentairePersonnel").value;
  if (!nom || !com) return alert("⚠️ Nom et commentaire requis.");
  const data = { nom, type, com, date: new Date().toLocaleString() };
  saveToLocal("personnelData", data);
  document.getElementById("nomPersonnel").value = "";
  document.getElementById("commentairePersonnel").value = "";
  afficherPersonnel();
}

function afficherPersonnel() {
  const div = document.getElementById("historiquePersonnel");
  const data = JSON.parse(localStorage.getItem("personnelData")) || [];
  if (data.length === 0) return div.innerHTML = "<p>Aucun enregistrement.</p>";
  div.innerHTML = data.slice(-20).reverse().map(p =>
    `<div class="card">[${p.date}] ${p.nom} (${p.type}) : ${p.com}</div>`
  ).join("");
}

// === ORGANISATION ===
function afficherOrganisation() {
  const div = document.getElementById("historiqueOrganisation");
  const org = [];
  ["productionData","arretsData","personnelData"].forEach(k => {
    const arr = JSON.parse(localStorage.getItem(k)) || [];
    arr.forEach(a => org.push(a));
  });
  org.sort((a,b) => new Date(b.date) - new Date(a.date));
  if (org.length === 0) return div.innerHTML = "<p>Aucune donnée enregistrée.</p>";
  div.innerHTML = org.slice(0,30).map(o =>
    `<div class="card">${o.date ? "["+o.date+"] " : ""}${o.ligne || o.nom || "?"} – ${o.motif || o.com || o.cadenceCalculee || ""}</div>`
  ).join("");
}

// === ATELIER / HISTORIQUE GLOBAL ===
function remiseZero() {
  if (!confirm("⚠️ Voulez-vous vraiment tout remettre à zéro ? Un export sera fait avant suppression.")) return;
  exportAll(true);
}

function exportAll(thenReset=false) {
  const allKeys = ["productionData","arretsData","personnelData"];
  let csv = "Type;Date;Ligne/Nom;Détails\n";
  allKeys.forEach(k => {
    const arr = JSON.parse(localStorage.getItem(k)) || [];
    arr.forEach(a => {
      csv += `${k};${a.date || ""};${a.ligne || a.nom || ""};${a.motif || a.com || a.quantite || ""}\n`;
    });
  });
  const blob = new Blob([csv], {type:"text/csv"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Synthese_Atelier_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  if (thenReset) {
    localStorage.clear();
    alert("✅ Export terminé et base remise à zéro !");
  } else {
    alert("✅ Export complet réalisé !");
  }
}

// === EXPORTS PAR PAGE ===
function exportArrets() { exportOne("arretsData","Arrets"); }
function exportPersonnel() { exportOne("personnelData","Personnel"); }
function exportOrganisation() { exportAll(false); }

function exportOne(key,label) {
  const data = JSON.parse(localStorage.getItem(key)) || [];
  if (data.length === 0) return alert("Aucune donnée à exporter.");
  let csv = "Date;Ligne/Nom;Détails\n";
  data.forEach(a => {
    csv += `${a.date};${a.ligne || a.nom};${a.motif || a.com || a.quantite || ""}\n`;
  });
  const blob = new Blob([csv], {type:"text/csv"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${label}_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  alert("✅ Export " + label + " terminé !");
}

// === CHARGEMENT AUTOMATIQUE DE L’HISTORIQUE ===
window.addEventListener("load", () => {
  afficherArrets();
  afficherPersonnel();
  afficherOrganisation();
});
