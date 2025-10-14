// === INITIALISATION ===
const pages = document.querySelectorAll('.page');
const navBtns = document.querySelectorAll('.nav-btn');
const dateInfo = document.getElementById('dateInfo');
const equipeDisplay = document.getElementById('equipe');
const ligneButtons = document.getElementById('ligneButtons');
const formContainer = document.getElementById('formContainer');
const exportAllBtn = document.querySelector('.export-all');

// === LIGNES DE PRODUCTION ===
const lignes = ["Râpé", "T2", "RT", "OMORI", "T1", "Sticks", "Emballage", "Dés", "Filets", "Prédécoupé"];

// === MISE À JOUR DATE ET ÉQUIPE ===
function updateDateAndEquipe() {
  const now = new Date();
  const heures = now.getHours();
  const jours = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  const mois = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  const semaine = Math.ceil(((now - new Date(now.getFullYear(), 0, 1)) / 86400000 + new Date(now.getFullYear(), 0, 1).getDay() + 1) / 7);

  dateInfo.textContent = `${jours[now.getDay()]} ${now.getDate()} ${mois[now.getMonth()]} ${now.getFullYear()} — Semaine ${semaine} — ${now.toLocaleTimeString()}`;

  let equipe = "";
  if (heures >= 5 && heures < 13) equipe = "M (5h–13h)";
  else if (heures >= 13 && heures < 21) equipe = "AM (13h–21h)";
  else equipe = "N (21h–5h)";
  equipeDisplay.textContent = `Équipe : ${equipe}`;
}
setInterval(updateDateAndEquipe, 1000);
updateDateAndEquipe();

// === NAVIGATION ENTRE PAGES ===
navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const section = btn.dataset.section;
    pages.forEach(p => p.classList.remove('active'));
    navBtns.forEach(b => b.classList.remove('active'));
    document.getElementById(section).classList.add('active');
    btn.classList.add('active');
  });
});

// === GÉNÉRATION DES BOUTONS LIGNES ===
lignes.forEach(ligne => {
  const btn = document.createElement('button');
  btn.textContent = ligne;
  btn.addEventListener('click', () => afficherFormulaireLigne(ligne));
  ligneButtons.appendChild(btn);
});

// === FORMULAIRE PAR LIGNE ===
function afficherFormulaireLigne(ligne) {
  formContainer.innerHTML = `
    <h3>${ligne}</h3>
    <label>Heure début :</label>
    <input type="time" id="start_${ligne}">
    <label>Heure fin :</label>
    <input type="time" id="end_${ligne}">
    <label>Quantité réalisée :</label>
    <input type="number" id="qty_${ligne}" placeholder="Colis réalisés">
    <label>Cadence manuelle (colis/h) :</label>
    <input type="number" id="cadMan_${ligne}" placeholder="Optionnel">
    <label>Cadence calculée :</label>
    <input type="text" id="cadCalc_${ligne}" disabled>
    <label>Quantité restante :</label>
    <input type="number" id="rest_${ligne}" placeholder="À produire">
    <label>Estimation de fin :</label>
    <input type="text" id="estim_${ligne}" disabled>
    <button id="save_${ligne}" class="save-btn">💾 Enregistrer</button>
    <button id="reset_${ligne}" class="reset-btn">🧹 Remise à zéro</button>
  `;

  // Scroll automatique vers le formulaire
  formContainer.scrollIntoView({ behavior: "smooth" });

  // Charger les données sauvegardées
  chargerDonneesLigne(ligne);

  // Événements
  document.getElementById(`save_${ligne}`).addEventListener('click', () => enregistrerDonneesLigne(ligne));
  document.getElementById(`reset_${ligne}`).addEventListener('click', () => resetLigne(ligne));
  document.getElementById(`rest_${ligne}`).addEventListener('input', () => calculerEstimationFin(ligne));
}
// === CALCUL CADENCE + ESTIMATION ===
function calculerEstimationFin(ligne) {
  const qty = parseFloat(document.getElementById(`qty_${ligne}`).value) || 0;
  const reste = parseFloat(document.getElementById(`rest_${ligne}`).value) || 0;
  const debut = document.getElementById(`start_${ligne}`).value;
  const fin = document.getElementById(`end_${ligne}`).value;
  const cadMan = parseFloat(document.getElementById(`cadMan_${ligne}`).value) || 0;

  let cadence = 0;

  if (cadMan > 0) cadence = cadMan;
  else if (debut && fin && qty > 0) {
    const [h1, m1] = debut.split(':').map(Number);
    const [h2, m2] = fin.split(':').map(Number);
    const diffHeure = ((h2 + m2/60) - (h1 + m1/60));
    if (diffHeure > 0) cadence = qty / diffHeure;
  }

  document.getElementById(`cadCalc_${ligne}`).value = cadence > 0 ? cadence.toFixed(1) : '';

  // Estimation
  if (cadence > 0 && reste > 0) {
    const heuresRest = reste / cadence;
    const now = new Date();
    const finEstimee = new Date(now.getTime() + heuresRest * 60 * 60 * 1000);
    document.getElementById(`estim_${ligne}`).value = finEstimee.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
  }
}

// === SAUVEGARDE LOCALE ===
function enregistrerDonneesLigne(ligne) {
  const data = {
    debut: document.getElementById(`start_${ligne}`).value,
    fin: document.getElementById(`end_${ligne}`).value,
    qty: document.getElementById(`qty_${ligne}`).value,
    cadMan: document.getElementById(`cadMan_${ligne}`).value,
    cadCalc: document.getElementById(`cadCalc_${ligne}`).value,
    reste: document.getElementById(`rest_${ligne}`).value,
    estim: document.getElementById(`estim_${ligne}`).value,
    date: new Date().toLocaleString()
  };
  localStorage.setItem(`ligne_${ligne}`, JSON.stringify(data));
  alert(`✅ Données enregistrées pour ${ligne}`);
}

function chargerDonneesLigne(ligne) {
  const saved = JSON.parse(localStorage.getItem(`ligne_${ligne}`));
  if (!saved) return;
  document.getElementById(`start_${ligne}`).value = saved.debut || '';
  document.getElementById(`end_${ligne}`).value = saved.fin || '';
  document.getElementById(`qty_${ligne}`).value = saved.qty || '';
  document.getElementById(`cadMan_${ligne}`).value = saved.cadMan || '';
  document.getElementById(`cadCalc_${ligne}`).value = saved.cadCalc || '';
  document.getElementById(`rest_${ligne}`).value = saved.reste || '';
  document.getElementById(`estim_${ligne}`).value = saved.estim || '';
}

function resetLigne(ligne) {
  localStorage.removeItem(`ligne_${ligne}`);
  afficherFormulaireLigne(ligne);
}

// === EXPORT GLOBAL EXCEL ===
exportAllBtn.addEventListener('click', () => {
  const wb = XLSX.utils.book_new();
  const allData = [];

  lignes.forEach(ligne => {
    const saved = JSON.parse(localStorage.getItem(`ligne_${ligne}`));
    if (saved) {
      allData.push({
        Ligne: ligne,
        "Heure début": saved.debut,
        "Heure fin": saved.fin,
        "Quantité réalisée": saved.qty,
        "Cadence calculée": saved.cadCalc,
        "Quantité restante": saved.reste,
        "Estimation fin": saved.estim,
        "Date enregistrement": saved.date
      });
    }
  });

  // + Arrêts
  const tableArrets = document.querySelector("#tableArrets tbody");
  if (tableArrets && tableArrets.rows.length > 0) {
    [...tableArrets.rows].forEach(r => {
      allData.push({
        Ligne: r.cells[1].innerText,
        "Heure début": "",
        "Heure fin": "",
        "Quantité réalisée": "",
        "Cadence calculée": "",
        "Quantité restante": "",
        "Estimation fin": "",
        "Date enregistrement": r.cells[0].innerText + " (Arrêt)"
      });
    });
  }

  if (allData.length === 0) {
    alert("Aucune donnée à exporter !");
    return;
  }

  const ws = XLSX.utils.json_to_sheet(allData);
  XLSX.utils.book_append_sheet(wb, ws, "Synthèse");
  XLSX.writeFile(wb, `Synthese_Equipe_${equipeDisplay.textContent.replace(/[^A-Za-z0-9]/g, "_")}.xlsx`);
});

// === ARCHIVAGE AUTO À CHANGEMENT D'ÉQUIPE ===
let derniereEquipe = "";
function verifierChangementEquipe() {
  const currentEquipe = equipeDisplay.textContent;
  if (derniereEquipe && currentEquipe !== derniereEquipe) {
    if (confirm(`Nouvelle équipe détectée (${currentEquipe}). Voulez-vous exporter les données précédentes ?`)) {
      exportAllBtn.click();
      localStorage.clear();
    }
  }
  derniereEquipe = currentEquipe;
}
setInterval(verifierChangementEquipe, 60000);

// === LIB XLSX ===
const script = document.createElement('script');
script.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
document.body.appendChild(script);
