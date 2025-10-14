/* === HORLOGE + ÉQUIPE === */
function updateDateTime() {
  const now = new Date();
  const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const semaine = Math.ceil(((now - new Date(now.getFullYear(), 0, 1)) / 86400000 + now.getDay() + 1) / 7);
  document.getElementById("date").textContent =
    `${jours[now.getDay()]} ${now.getDate()} ${mois[now.getMonth()]} ${now.getFullYear()} — Semaine ${semaine} — ${now.toLocaleTimeString('fr-FR')}`;

  const h = now.getHours();
  let equipe = "";
  if (h >= 5 && h < 13) equipe = "M (5h–13h)";
  else if (h >= 13 && h < 21) equipe = "AM (13h–21h)";
  else equipe = "N (21h–5h)";
  document.getElementById("equipe").textContent = `Équipe : ${equipe}`;
}
setInterval(updateDateTime, 1000);
updateDateTime();

/* === NAVIGATION ENTRE LES PAGES === */
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const section = btn.dataset.section;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(section).classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

/* === UTILITAIRES TEMPS === */
function convertirHeureEnMinutes(h) {
  const [hh, mm] = h.split(":").map(Number);
  return hh * 60 + mm;
}
function ajouterMinutes(heure, minutes) {
  const [hh, mm] = heure.split(":").map(Number);
  const total = hh * 60 + mm + parseInt(minutes);
  const hFin = Math.floor(total / 60) % 24;
  const mFin = total % 60;
  return `${hFin.toString().padStart(2, "0")}:${mFin.toString().padStart(2, "0")}`;
}

/* === AFFICHAGE DU FORMULAIRE D'UNE LIGNE === */
function afficherFormulaireLigne(ligne) {
  const div = document.getElementById("formulaireLigne");
  div.innerHTML = `
    <h3>${ligne}</h3>
    <label>Heure début :</label><input type="time" id="debut${ligne}">
    <label>Heure fin :</label><input type="time" id="fin${ligne}">
    <label>Quantité réalisée :</label><input type="number" id="quantite${ligne}" placeholder="Colis réalisés">
    <label>Quantité restante :</label><input type="number" id="reste${ligne}" placeholder="À produire">
    <label>Cadence manuelle (colis/h) :</label><input type="number" id="cadenceMan${ligne}" placeholder="Optionnel">
    <p id="cadenceCalculee${ligne}" class="info"></p>
    <p id="estimation${ligne}" class="info"></p>
    <button onclick="enregistrerLigne('${ligne}')">💾 Enregistrer</button>
    <button onclick="effacerDernier('${ligne}')">❌ Annuler dernier</button>
  `;
  div.scrollIntoView({ behavior: "smooth" });
}

/* === ENREGISTREMENT DES DONNÉES === */
function enregistrerLigne(ligne) {
  const debut = document.getElementById(`debut${ligne}`).value;
  const fin = document.getElementById(`fin${ligne}`).value;
  const quantite = parseFloat(document.getElementById(`quantite${ligne}`).value);
  const reste = parseFloat(document.getElementById(`reste${ligne}`).value || 0);
  const cadenceMan = parseFloat(document.getElementById(`cadenceMan${ligne}`).value || 0);

  if (!debut || !fin || isNaN(quantite)) {
    alert("Veuillez remplir les champs requis (heures et quantité).");
    return;
  }

  const h1 = convertirHeureEnMinutes(debut);
  const h2 = convertirHeureEnMinutes(fin);
  const duree = h2 > h1 ? h2 - h1 : (24 * 60 - h1 + h2);
  const cadence = cadenceMan > 0 ? cadenceMan : (quantite / (duree / 60)).toFixed(1);
  const estimation = cadence > 0 && reste > 0 ? (reste / cadence * 60).toFixed(0) : 0;

  document.getElementById(`cadenceCalculee${ligne}`).textContent = `Cadence : ${cadence} colis/h`;
  document.getElementById(`estimation${ligne}`).textContent =
    estimation > 0 ? `Estimation de fin : ${ajouterMinutes(fin, estimation)}` : `Estimation de fin : —`;

  const allData = JSON.parse(localStorage.getItem("productionData") || "{}");
  if (!allData[ligne]) allData[ligne] = [];
  allData[ligne].push({
    debut,
    fin,
    quantite,
    reste,
    cadence,
    estimation: estimation > 0 ? ajouterMinutes(fin, estimation) : "-",
    date: new Date().toLocaleString()
  });
  localStorage.setItem("productionData", JSON.stringify(allData));
  alert(`✅ Données enregistrées pour ${ligne}`);
}

/* === ANNULER DERNIER ENREGISTREMENT === */
function effacerDernier(ligne) {
  const data = JSON.parse(localStorage.getItem("productionData") || "{}");
  if (data[ligne] && data[ligne].length > 0) {
    data[ligne].pop();
    localStorage.setItem("productionData", JSON.stringify(data));
    alert(`Dernier enregistrement supprimé pour ${ligne}`);
  } else alert("Aucun enregistrement à supprimer !");
}
/* === PAGE ARRETS === */
function ajouterArret() {
  const ligne = prompt("Ligne concernée :");
  const duree = prompt("Durée (minutes) :");
  const motif = prompt("Motif de l'arrêt :");
  if (!ligne || !duree) return;
  const table = document.querySelector("#tableArrets tbody");
  const now = new Date();
  const date = now.toLocaleDateString("fr-FR");
  const heure = now.toLocaleTimeString("fr-FR");
  const tr = document.createElement("tr");
  tr.innerHTML = `<td>${date}</td><td>${heure}</td><td>${ligne}</td><td>${duree}</td><td>${motif || ""}</td>`;
  table.appendChild(tr);

  const arrets = JSON.parse(localStorage.getItem("arretsData") || "[]");
  arrets.push({ date, heure, ligne, duree, motif });
  localStorage.setItem("arretsData", JSON.stringify(arrets));
}

function exporterArrets() {
  const arrets = JSON.parse(localStorage.getItem("arretsData") || "[]");
  if (arrets.length === 0) return alert("Aucun arrêt enregistré.");
  const ws = XLSX.utils.json_to_sheet(arrets);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Arrêts");
  XLSX.writeFile(wb, `Arrets_${new Date().toLocaleDateString("fr-FR")}.xlsx`);
}

/* === PAGE PERSONNEL === */
function ajouterPersonnel() {
  const type = document.getElementById("typePersonnel").value;
  const commentaire = document.getElementById("commentairePersonnel").value;
  if (!commentaire) return alert("Ajoutez un commentaire !");
  const div = document.getElementById("listePersonnel");
  const now = new Date().toLocaleString("fr-FR");
  const p = document.createElement("p");
  p.textContent = `[${now}] ${type} — ${commentaire}`;
  div.appendChild(p);

  const pers = JSON.parse(localStorage.getItem("personnelData") || "[]");
  pers.push({ date: now, type, commentaire });
  localStorage.setItem("personnelData", JSON.stringify(pers));
  document.getElementById("commentairePersonnel").value = "";
}

function exporterPersonnel() {
  const pers = JSON.parse(localStorage.getItem("personnelData") || "[]");
  if (pers.length === 0) return alert("Aucune donnée de personnel.");
  const ws = XLSX.utils.json_to_sheet(pers);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Personnel");
  XLSX.writeFile(wb, `Personnel_${new Date().toLocaleDateString("fr-FR")}.xlsx`);
}

/* === PAGE ORGANISATION === */
function ajouterOrganisation() {
  const note = document.getElementById("noteOrganisation").value.trim();
  if (!note) return alert("Consigne vide !");
  const now = new Date().toLocaleString("fr-FR");
  const div = document.getElementById("historiqueOrganisation");
  const p = document.createElement("p");
  p.textContent = `[${now}] ${note}`;
  div.prepend(p);
  const org = JSON.parse(localStorage.getItem("organisationData") || "[]");
  org.push({ date: now, note });
  localStorage.setItem("organisationData", JSON.stringify(org));
  document.getElementById("noteOrganisation").value = "";
}

function exporterOrganisation() {
  const org = JSON.parse(localStorage.getItem("organisationData") || "[]");
  if (org.length === 0) return alert("Aucune consigne enregistrée.");
  const ws = XLSX.utils.json_to_sheet(org);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Organisation");
  XLSX.writeFile(wb, `Organisation_${new Date().toLocaleDateString("fr-FR")}.xlsx`);
}

/* === EXPORT GLOBAL (ATELIER) === */
document.getElementById("exportAllBtn").addEventListener("click", () => {
  const wb = XLSX.utils.book_new();

  // Production
  const prod = JSON.parse(localStorage.getItem("productionData") || "{}");
  for (let ligne in prod) {
    const ws = XLSX.utils.json_to_sheet(prod[ligne]);
    XLSX.utils.book_append_sheet(wb, ws, ligne);
  }

  // Arrêts
  const arrets = JSON.parse(localStorage.getItem("arretsData") || "[]");
  if (arrets.length > 0)
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(arrets), "Arrêts");

  // Personnel
  const pers = JSON.parse(localStorage.getItem("personnelData") || "[]");
  if (pers.length > 0)
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pers), "Personnel");

  // Organisation
  const org = JSON.parse(localStorage.getItem("organisationData") || "[]");
  if (org.length > 0)
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(org), "Organisation");

  const fileName = `Synthese_Complet_${new Date().toLocaleDateString("fr-FR")}.xlsx`;
  XLSX.writeFile(wb, fileName);
});

/* === REMISE À ZÉRO AVEC SAUVEGARDE === */
function remiseZero() {
  const confirmReset = confirm("Exporter les données puis remettre à zéro ?");
  if (!confirmReset) return;
  // Export d’abord
  const wb = XLSX.utils.book_new();
  const data = {
    production: JSON.parse(localStorage.getItem("productionData") || "{}"),
    arrets: JSON.parse(localStorage.getItem("arretsData") || "[]"),
    personnel: JSON.parse(localStorage.getItem("personnelData") || "[]"),
    organisation: JSON.parse(localStorage.getItem("organisationData") || "[]")
  };
  for (let key in data.production) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.production[key]), key);
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.arrets), "Arrêts");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.personnel), "Personnel");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.organisation), "Organisation");

  const fileName = `Backup_Synthese_${new Date().toLocaleDateString("fr-FR")}.xlsx`;
  XLSX.writeFile(wb, fileName);

  // Puis remise à zéro
  localStorage.removeItem("productionData");
  localStorage.removeItem("arretsData");
  localStorage.removeItem("personnelData");
  localStorage.removeItem("organisationData");
  alert("✅ Données sauvegardées et base remise à zéro !");
  window.location.reload();
}

/* === CHARGEMENT AUTOMATIQUE DES HISTORIQUES === */
window.addEventListener("load", () => {
  // Organisation
  const org = JSON.parse(localStorage.getItem("organisationData") || "[]");
  const hist = document.getElementById("historiqueOrganisation");
  org.slice(-20).reverse().forEach(o => {
    const p = document.createElement("p");
    p.textContent = `[${o.date}] ${o.note}`;
    hist.appendChild(p);
  });

  // Personnel
  const pers = JSON.parse(localStorage.getItem("personnelData") || "[]");
  const list = document.getElementById("listePersonnel");
  pers.slice(-20).forEach(p => {
    const el = document.createElement("p");
    el.textContent = `[${p.date}] ${p.type} — ${p.commentaire}`;
    list.appendChild(el);
  });

  // Arrêts
  const arrets = JSON.parse(localStorage.getItem("arretsData") || "[]");
  const tbody = document.querySelector("#tableArrets tbody");
  arrets.slice(-30).forEach(a => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${a.date}</td><td>${a.heure}</td><td>${a.ligne}</td><td>${a.duree}</td><td>${a.motif}</td>`;
    tbody.appendChild(tr);
  });
});
