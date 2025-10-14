// === app.js (partie 1/2) ===

// --- MISE À JOUR DATE & HEURE + ÉQUIPE ---
function updateDateTime() {
  const now = new Date();
  const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
                'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

  const jour = jours[now.getDay()];
  const date = `${jour} ${now.getDate()} ${mois[now.getMonth()]} ${now.getFullYear()}`;
  const semaine = Math.ceil(((now - new Date(now.getFullYear(), 0, 1)) / 86400000 + new Date(now.getFullYear(), 0, 1).getDay() + 1) / 7);
  const heure = now.toTimeString().slice(0, 8);

  document.getElementById("dateTime").textContent = `${date} — Semaine ${semaine} — ${heure}`;

  const h = now.getHours();
  let equipe = "";
  if (h >= 5 && h < 13) equipe = "M (5h–13h)";
  else if (h >= 13 && h < 21) equipe = "AM (13h–21h)";
  else equipe = "N (21h–5h)";
  document.getElementById("equipeDisplay").textContent = "Équipe : " + equipe;

  setTimeout(updateDateTime, 1000);
}
updateDateTime();

// --- GESTION NAVIGATION ENTRE SECTIONS ---
function showSection(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (id === 'atelier') afficherHistoriqueAtelier();
  if (id === 'arrets') afficherArrets();
  if (id === 'organisation') afficherConsignes();
  if (id === 'personnel') afficherPersonnel();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- GESTION DES LIGNES ---
function openLigne(nom) {
  document.getElementById('nomLigne').textContent = nom;
  document.getElementById('formulaireLigne').classList.remove('hidden');
  document.getElementById('formulaireLigne').scrollIntoView({ behavior: 'smooth' });
  localStorage.setItem('ligneActuelle', nom);

  const data = JSON.parse(localStorage.getItem(nom)) || {};
  document.getElementById('heureDebut').value = data.heureDebut || "";
  document.getElementById('heureFin').value = data.heureFin || "";
  document.getElementById('quantite').value = data.quantite || "";
  document.getElementById('cadenceManuelle').value = data.cadenceManuelle || "";
  document.getElementById('quantiteRestante').value = data.quantiteRestante || "";
  document.getElementById('cadenceCalculee').value = data.cadenceCalculee || "";
  document.getElementById('estimationFin').value = data.estimationFin || "";
}

// --- ENREGISTREMENT DES DONNÉES DE LIGNE ---
function enregistrerLigne() {
  const ligne = document.getElementById('nomLigne').textContent;
  const heureDebut = document.getElementById('heureDebut').value;
  const heureFin = document.getElementById('heureFin').value;
  const quantite = parseFloat(document.getElementById('quantite').value) || 0;
  const cadenceManuelle = parseFloat(document.getElementById('cadenceManuelle').value) || 0;
  const quantiteRestante = parseFloat(document.getElementById('quantiteRestante').value) || 0;

  let cadenceCalculee = 0;
  if (heureDebut && heureFin && quantite > 0) {
    const [hD, mD] = heureDebut.split(':').map(Number);
    const [hF, mF] = heureFin.split(':').map(Number);
    let diff = (hF * 60 + mF) - (hD * 60 + mD);
    if (diff <= 0) diff += 24 * 60;
    cadenceCalculee = (quantite / (diff / 60)).toFixed(1);
  } else if (cadenceManuelle > 0) {
    cadenceCalculee = cadenceManuelle.toFixed(1);
  }

  const estimationFin = (cadenceCalculee > 0 && quantiteRestante > 0)
    ? calculerEstimationFin(cadenceCalculee, quantiteRestante)
    : "";

  const data = {
    heureDebut, heureFin, quantite, cadenceManuelle,
    quantiteRestante, cadenceCalculee, estimationFin
  };
  localStorage.setItem(ligne, JSON.stringify(data));
  alert(`✅ Données enregistrées pour ${ligne}`);
  resetForm(false);
}

// --- CALCUL ESTIMATION DE FIN ---
function calculerEstimationFin(cadence, reste) {
  const now = new Date();
  const minutes = (reste / cadence) * 60;
  now.setMinutes(now.getMinutes() + minutes);
  return now.toTimeString().slice(0, 5);
}

// --- REMISE À ZÉRO D'UNE LIGNE ---
function resetLigne() {
  if (!confirm("Remettre à zéro cette ligne ?")) return;
  const ligne = document.getElementById('nomLigne').textContent;
  localStorage.removeItem(ligne);
  resetForm(true);
}

function resetForm(clearNom) {
  if (clearNom) document.getElementById('nomLigne').textContent = "";
  ['heureDebut','heureFin','quantite','cadenceManuelle','quantiteRestante','cadenceCalculee','estimationFin']
    .forEach(id => document.getElementById(id).value = "");
}

// --- ÉCOUTE SUR QUANTITÉ RESTANTE POUR CALCUL AUTO ---
document.getElementById('quantiteRestante').addEventListener('input', () => {
  const cadence = parseFloat(document.getElementById('cadenceCalculee').value) || parseFloat(document.getElementById('cadenceManuelle').value);
  const reste = parseFloat(document.getElementById('quantiteRestante').value);
  if (cadence && reste) {
    document.getElementById('estimationFin').value = calculerEstimationFin(cadence, reste);
  }
});

// --- ARRÊTS ---
function ajouterArret() {
  const ligne = document.getElementById('ligneArret').value;
  const duree = document.getElementById('dureeArret').value;
  const cause = document.getElementById('causeArret').value;
  const com = document.getElementById('commentaireArret').value;
  if (!ligne || !duree) return alert("⚠️ Veuillez sélectionner la ligne et la durée.");

  const arrets = JSON.parse(localStorage.getItem('arrets')) || [];
  arrets.push({ ligne, duree, cause, com, date: new Date().toLocaleString() });
  localStorage.setItem('arrets', JSON.stringify(arrets));

  document.getElementById('dureeArret').value = "";
  document.getElementById('causeArret').value = "";
  document.getElementById('commentaireArret').value = "";
  afficherArrets();
}

function afficherArrets() {
  const cont = document.getElementById('historiqueArrets');
  cont.innerHTML = "";
  const arrets = JSON.parse(localStorage.getItem('arrets')) || [];
  if (arrets.length === 0) return cont.textContent = "Aucun arrêt enregistré.";

  arrets.slice().reverse().forEach(a => {
    const d = document.createElement('div');
    d.className = "card";
    d.textContent = `[${a.date}] ${a.ligne} - ${a.duree}min (${a.cause}) ${a.com}`;
    cont.appendChild(d);
  });
}

// --- PERSONNEL ---
function ajouterPersonnel() {
  const type = document.getElementById('typePersonnel').value;
  const com = document.getElementById('commentairePersonnel').value;
  if (!com) return alert("Ajoutez un commentaire.");
  const pers = JSON.parse(localStorage.getItem('personnel')) || [];
  pers.push({ type, com, date: new Date().toLocaleString() });
  localStorage.setItem('personnel', JSON.stringify(pers));
  document.getElementById('commentairePersonnel').value = "";
  afficherPersonnel();
}

function afficherPersonnel() {
  const cont = document.getElementById('historiquePersonnel');
  cont.innerHTML = "";
  const pers = JSON.parse(localStorage.getItem('personnel')) || [];
  if (pers.length === 0) return cont.textContent = "Aucun enregistrement.";

  pers.slice().reverse().forEach(p => {
    const d = document.createElement('div');
    d.className = "card";
    d.textContent = `[${p.date}] ${p.type} : ${p.com}`;
    cont.appendChild(d);
  });

  // Archivage auto au-delà de 7 jours
  const maintenant = Date.now();
  const filtrés = pers.filter(p => (maintenant - new Date(p.date)) < 7 * 24 * 60 * 60 * 1000);
  if (filtrés.length !== pers.length) {
    localStorage.setItem('personnel', JSON.stringify(filtrés));
  }
}

// --- ORGANISATION ---
function ajouterConsigne() {
  const txt = document.getElementById('consigneTexte').value;
  if (!txt) return alert("Renseignez une consigne.");
  const cons = JSON.parse(localStorage.getItem('consignes')) || [];
  cons.push({ txt, date: new Date().toLocaleString() });
  localStorage.setItem('consignes', JSON.stringify(cons));
  document.getElementById('consigneTexte').value = "";
  afficherConsignes();
}

function afficherConsignes() {
  const cont = document.getElementById('historiqueConsignes');
  cont.innerHTML = "";
  const cons = JSON.parse(localStorage.getItem('consignes')) || [];
  if (cons.length === 0) return cont.textContent = "Aucune consigne.";

  cons.slice().reverse().forEach(c => {
    const d = document.createElement('div');
    d.className = "card";
    d.textContent = `[${c.date}] ${c.txt}`;
    cont.appendChild(d);
  });

  // Archivage auto 7 jours
  const maintenant = Date.now();
  const filtrés = cons.filter(c => (maintenant - new Date(c.date)) < 7 * 24 * 60 * 60 * 1000);
  if (filtrés.length !== cons.length) {
    localStorage.setItem('consignes', JSON.stringify(filtrés));
  }
}

// --- ATELIER : HISTORIQUE GLOBAL ---
function afficherHistoriqueAtelier() {
  const cont = document.getElementById('historiqueAtelier');
  cont.innerHTML = "";
  const lignes = ['Râpé','T2','RT','OMORI','T1','Sticks','Emballage','Dés','Filets','Prédécoupé'];
  lignes.forEach(l => {
    const data = JSON.parse(localStorage.getItem(l));
    if (data) {
      const d = document.createElement('div');
      d.className = "card";
      d.innerHTML = `<strong>${l}</strong> : ${data.quantite || 0} colis, cadence ${data.cadenceCalculee || "—"} col/h, fin estimée ${data.estimationFin || "—"}`;
      cont.appendChild(d);
    }
  });
  cont.innerHTML += "<hr>";
  cont.innerHTML += `<h3>Arrêts</h3>`;
  const arrets = JSON.parse(localStorage.getItem('arrets')) || [];
  arrets.forEach(a => {
    const d = document.createElement('div');
    d.className = "card";
    d.textContent = `[${a.date}] ${a.ligne} - ${a.duree}min (${a.cause})`;
    cont.appendChild(d);
  });
  cont.innerHTML += "<hr><h3>Personnel</h3>";
  const pers = JSON.parse(localStorage.getItem('personnel')) || [];
  pers.forEach(p => {
    const d = document.createElement('div');
    d.className = "card";
    d.textContent = `[${p.date}] ${p.type}: ${p.com}`;
    cont.appendChild(d);
  });
  cont.innerHTML += "<hr><h3>Consignes</h3>";
  const cons = JSON.parse(localStorage.getItem('consignes')) || [];
  cons.forEach(c => {
    const d = document.createElement('div');
    d.className = "card";
    d.textContent = `[${c.date}] ${c.txt}`;
    cont.appendChild(d);
  });
}

// --- EXPORT EXCEL GLOBAL ---
function exportGlobal() {
  if (!confirm("Exporter toutes les données vers Excel ?")) return;

  const lignes = ['Râpé','T2','RT','OMORI','T1','Sticks','Emballage','Dés','Filets','Prédécoupé'];
  let csv = "Catégorie;Détails\n";

  lignes.forEach(l => {
    const d = JSON.parse(localStorage.getItem(l));
    if (d) csv += `Ligne ${l};Quantité=${d.quantite || 0}, Cadence=${d.cadenceCalculee || ""}, Estimation=${d.estimationFin || ""}\n`;
  });

  const arrets = JSON.parse(localStorage.getItem('arrets')) || [];
  arrets.forEach(a => csv += `Arrêt;${a.date} ${a.ligne} ${a.duree}min ${a.cause} ${a.com}\n`);

  const pers = JSON.parse(localStorage.getItem('personnel')) || [];
  pers.forEach(p => csv += `Personnel;${p.date} ${p.type} ${p.com}\n`);

  const cons = JSON.parse(localStorage.getItem('consignes')) || [];
  cons.forEach(c => csv += `Organisation;${c.date} ${c.txt}\n`);

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Synthese_Atelier.csv";
  a.click();
  URL.revokeObjectURL(url);
}
