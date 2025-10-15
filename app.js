// === INITIALISATION ===
let ligneActuelle = null;
let productions = JSON.parse(localStorage.getItem("productions")) || {};
let arrets = JSON.parse(localStorage.getItem("arrets")) || [];
let personnel = JSON.parse(localStorage.getItem("personnel")) || [];
let organisations = JSON.parse(localStorage.getItem("organisations")) || [];

// === HORLOGE ===
function majHeure() {
  const date = new Date();
  const options = { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' };
  const jour = date.toLocaleDateString('fr-FR', options);
  const heure = date.toLocaleTimeString('fr-FR');
  document.getElementById('dateHeure').textContent = `${jour} — ${heure}`;
  definirEquipe(date);
}
setInterval(majHeure, 1000);
majHeure();

// === ÉQUIPE AUTOMATIQUE ===
function definirEquipe(date) {
  const h = date.getHours();
  let equipe = "N";
  if (h >= 5 && h < 13) equipe = "M";
  else if (h >= 13 && h < 21) equipe = "AM";
  document.getElementById('equipeActuelle').textContent = `Équipe actuelle : ${equipe}`;
}

// === AFFICHAGE DES PAGES ===
function showSection(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (id === "atelier") majGraphiques();
}

// === SIDEBAR ===
function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("active");
}

// === SÉLECTION LIGNE ===
function selectLine(nom) {
  ligneActuelle = nom;
  document.getElementById("nomLigne").textContent = `Ligne : ${nom}`;
  showSection("production");
  restaurerTemporaire();
}

// === SAUVEGARDE TEMPORAIRE ===
function sauvegarderTemporaire() {
  if (!ligneActuelle) return;
  const temp = {
    debut: document.getElementById("heureDebut").value,
    fin: document.getElementById("heureFin").value,
    realisee: document.getElementById("quantiteRealisee").value,
    restante: document.getElementById("quantiteRestante").value,
    cadence: document.getElementById("cadenceManuelle").value
  };
  localStorage.setItem(`temp_${ligneActuelle}`, JSON.stringify(temp));
}

// === RESTAURATION TEMPORAIRE ===
function restaurerTemporaire() {
  const data = JSON.parse(localStorage.getItem(`temp_${ligneActuelle}`));
  if (data) {
    document.getElementById("heureDebut").value = data.debut || "";
    document.getElementById("heureFin").value = data.fin || "";
    document.getElementById("quantiteRealisee").value = data.realisee || "";
    document.getElementById("quantiteRestante").value = data.restante || "";
    document.getElementById("cadenceManuelle").value = data.cadence || "";
  } else {
    document.querySelectorAll("#formProduction input").forEach(i => i.value = "");
  }
}

// === CALCUL AUTOMATIQUE FIN ===
function calculerEstimation() {
  const qRestante = parseFloat(document.getElementById("quantiteRestante").value);
  const cadence = parseFloat(document.getElementById("cadenceManuelle").value);
  if (isNaN(qRestante) || isNaN(cadence) || cadence <= 0) {
    document.getElementById("estimationFin").value = "";
    return;
  }
  const heures = qRestante / cadence;
  const dateFin = new Date();
  dateFin.setHours(dateFin.getHours() + Math.floor(heures));
  dateFin.setMinutes(dateFin.getMinutes() + Math.round((heures % 1) * 60));
  document.getElementById("estimationFin").value = dateFin.toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'});
}

// === ENREGISTREMENT PRODUCTION ===
function enregistrerProduction() {
  if (!ligneActuelle) return alert("Sélectionnez une ligne !");
  const hDebut = document.getElementById("heureDebut").value;
  const hFin = document.getElementById("heureFin").value;
  const qRealisee = document.getElementById("quantiteRealisee").value;
  const qRestante = document.getElementById("quantiteRestante").value;
  const cadence = document.getElementById("cadenceManuelle").value;
  const estimation = document.getElementById("estimationFin").value;

  const enreg = {
    ligne: ligneActuelle,
    hDebut, hFin, qRealisee, qRestante, cadence, estimation,
    date: new Date().toLocaleString('fr-FR')
  };

  if (!productions[ligneActuelle]) productions[ligneActuelle] = [];
  productions[ligneActuelle].push(enreg);
  localStorage.setItem("productions", JSON.stringify(productions));

  document.querySelectorAll("#formProduction input").forEach(i => i.value = "");
  localStorage.removeItem(`temp_${ligneActuelle}`);
  afficherHistoriqueProduction();
  alert("Production enregistrée !");
}

// === HISTORIQUE PRODUCTION ===
function afficherHistoriqueProduction() {
  const div = document.getElementById("historiqueProduction");
  div.innerHTML = "";
  if (!ligneActuelle || !productions[ligneActuelle]) return;
  productions[ligneActuelle].forEach((p, i) => {
    const item = document.createElement("div");
    item.className = "ligneEnreg";
    item.innerHTML = `
      <b>${p.date}</b> — ${p.qRealisee} colis (reste ${p.qRestante}) 
      <button onclick="supprimerProduction(${i})">❌</button>`;
    div.appendChild(item);
  });
}

function supprimerProduction(index) {
  productions[ligneActuelle].splice(index, 1);
  localStorage.setItem("productions", JSON.stringify(productions));
  afficherHistoriqueProduction();
}

// === ARRÊTS ===
function enregistrerArret() {
  const ligne = document.getElementById("ligneArret").value;
  const duree = document.getElementById("dureeArret").value;
  const motif = document.getElementById("motifArret").value;
  if (!ligne || !duree || !motif) return alert("Complétez tous les champs !");
  arrets.push({ ligne, duree, motif, date: new Date().toLocaleString('fr-FR') });
  localStorage.setItem("arrets", JSON.stringify(arrets));
  afficherHistoriqueArrets();
}

function afficherHistoriqueArrets() {
  const div = document.getElementById("historiqueArrets");
  div.innerHTML = "";
  arrets.forEach((a, i) => {
    const el = document.createElement("div");
    el.innerHTML = `${a.date} — ${a.ligne} : ${a.duree} min (${a.motif})`;
    div.appendChild(el);
  });
}

// === PERSONNEL ===
function enregistrerPersonnel() {
  const nom = document.getElementById("nomEmploye").value;
  const statut = document.getElementById("statutEmploye").value;
  if (!nom) return alert("Nom manquant !");
  personnel.push({ nom, statut, date: new Date().toLocaleString('fr-FR') });
  localStorage.setItem("personnel", JSON.stringify(personnel));
  afficherHistoriquePersonnel();
}

function afficherHistoriquePersonnel() {
  const div = document.getElementById("historiquePersonnel");
  div.innerHTML = personnel.map(p => `${p.date} — ${p.nom} : ${p.statut}`).join("<br>");
}

// === ORGANISATION ===
function enregistrerOrganisation() {
  const texte = document.getElementById("consigneOrganisation").value;
  if (!texte) return;
  organisations.push({ texte, date: new Date().toLocaleString('fr-FR') });
  localStorage.setItem("organisations", JSON.stringify(organisations));
  afficherHistoriqueOrganisation();
  document.getElementById("consigneOrganisation").value = "";
}

function afficherHistoriqueOrganisation() {
  const div = document.getElementById("historiqueOrganisation");
  div.innerHTML = organisations.map(c => `[${c.date}] ${c.texte}`).join("<br>");
}

// === GRAPHIQUE ATELIER ===
function majGraphiques() {
  const ctx = document.getElementById("chartProduction");
  const labels = Object.keys(productions);
  const data = labels.map(l => productions[l].reduce((s, e) => s + parseFloat(e.qRealisee || 0), 0));
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Production totale (colis)',
        data,
        backgroundColor: '#007bff'
      }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });
}

// === EXPORT EXCEL ===
function exportGlobal() {
  const lignes = [];
  Object.keys(productions).forEach(ligne => {
    productions[ligne].forEach(p => lignes.push({
      Ligne: ligne,
      "Heure début": p.hDebut,
      "Heure fin": p.hFin,
      "Quantité réalisée": p.qRealisee,
      "Quantité restante": p.qRestante,
      "Cadence (colis/h)": p.cadence,
      "Estimation fin": p.estimation,
      "Date": p.date
    }));
  });

  const ws = XLSX.utils.json_to_sheet(lignes);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Synthèse");
  const now = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  XLSX.writeFile(wb, `Synthese_Production_${now}.xlsx`);
}

// === CALCULATRICE SIMPLE ===
function ouvrirCalculatrice() {
  const res = prompt("Entrer une opération (ex: 240/3 ou 10*5)");
  if (!res) return;
  try {
    alert(`Résultat : ${eval(res)}`);
  } catch {
    alert("Erreur de calcul !");
  }
}

// === CHARGEMENT INITIAL ===
afficherHistoriqueArrets();
afficherHistoriqueOrganisation();
afficherHistoriquePersonnel();
