// === PANNEAU FLOTTANT ===
function updateDateTime() {
  const now = new Date();
  const jour = now.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
  const heure = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  const tempDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const jourNum = tempDate.getUTCDay() || 7;
  tempDate.setUTCDate(tempDate.getUTCDate() + 4 - jourNum);
  const anneeDebut = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
  const semaine = Math.ceil(((tempDate - anneeDebut) / 86400000 + 1) / 7);

  document.getElementById("date-jour").textContent = jour;
  document.getElementById("heure-actuelle").textContent = heure;
  document.getElementById("semaine-num").textContent = semaine;
}
setInterval(updateDateTime, 1000);
updateDateTime();

// === DONNÉES LOCALES ===
let data = JSON.parse(localStorage.getItem("syntheseData")) || {};
function saveData() {
  localStorage.setItem("syntheseData", JSON.stringify(data));
}

// === PAGE DE LIGNE ===
function openPage(page) {
  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="card">
      <h2>${page}</h2>
      <label>Quantité 1 :</label>
      <input type="number" id="qte1" placeholder="Entrer quantité..." />
      <label>Quantité 2 :</label>
      <input type="number" id="qte2" placeholder="Ajouter quantité..." />
      <label>Temps d’arrêt (min) :</label>
      <input type="number" id="arret" placeholder="0" />
      <div id="infos"></div>
      <div class="btns">
        <button onclick="enregistrer('${page}')">Enregistrer</button>
        <button onclick="annuler('${page}')">Annuler dernier</button>
        <button onclick="afficherHistorique('${page}')">Historique</button>
      </div>
      <canvas id="graphLigne"></canvas>
    </div>
  `;

  if (!data[page]) data[page] = [];
  afficherInfos(page);
}

// === ENREGISTREMENT ===
function enregistrer(page) {
  const q1 = parseFloat(document.getElementById("qte1").value) || 0;
  const q2 = parseFloat(document.getElementById("qte2").value) || 0;
  const arret = parseFloat(document.getElementById("arret").value) || 0;
  const total = q1 + q2;

  const now = new Date();
  data[page].push({
    heure: now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    quantite: total,
    arret
  });

  saveData();
  document.getElementById("qte1").value = "";
  document.getElementById("qte2").value = "";
  document.getElementById("arret").value = "";
  afficherInfos(page);
}

// === ANNULER DERNIER ===
function annuler(page) {
  if (data[page] && data[page].length > 0) {
    data[page].pop();
    saveData();
    afficherInfos(page);
    alert("Dernier enregistrement annulé.");
  }
}

// === AFFICHAGE DES INFOS ===
function afficherInfos(page) {
  const zone = document.getElementById("infos");
  const lignes = data[page] || [];
  if (lignes.length === 0) {
    zone.innerHTML = "<p>Aucune donnée enregistrée.</p>";
    return;
  }

  const total = lignes.reduce((a, b) => a + b.quantite, 0);
  const moyenne = total / lignes.length;
  const cadence = Math.round(moyenne * 60 / 60);

  zone.innerHTML = `
    <p><strong>Total :</strong> ${total} colis</p>
    <p><strong>Cadence moyenne :</strong> ${cadence} colis/h</p>
  `;
}

// === HISTORIQUE + GRAPHIQUE ===
function afficherHistorique(page) {
  const lignes = data[page] || [];
  if (lignes.length === 0) return alert("Aucune donnée enregistrée.");

  const labels = lignes.map(l => l.heure);
  const valeurs = lignes.map(l => l.quantite);
  const arrets = lignes.map(l => l.arret);

  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="card">
      <h3>Historique ${page}</h3>
      <canvas id="graphHisto"></canvas>
      <button onclick="openPage('${page}')">Retour</button>
    </div>
  `;

  const ctx = document.getElementById("graphHisto").getContext("2d");
  new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Quantité (colis)",
          data: valeurs,
          borderColor: "#007bff",
          backgroundColor: "#007bff33",
          fill: true,
          yAxisID: "y1"
        },
        {
          label: "Arrêts (min)",
          data: arrets,
          borderColor: "#ff4747",
          backgroundColor: "#ff474755",
          fill: true,
          yAxisID: "y2"
        }
      ]
    },
    options: {
      scales: {
        y1: { type: "linear", position: "left", beginAtZero: true },
        y2: { type: "linear", position: "right", beginAtZero: true }
      }
    }
  });
}

// === PAGE PAR DÉFAUT ===
document.addEventListener("DOMContentLoaded", () => openPage("Râpé"));
