// === PANNEAU FLOTTANT (Semaine + Date + Heure) ===
function updateDateTime() {
  const now = new Date();
  const jour = now.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
  const heure = now.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit"
  });

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

// === STOCKAGE LOCAL ===
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
        <button onclick="enregistrer('${page}')">💾 Enregistrer</button>
        <button onclick="annuler('${page}')">↩️ Annuler dernier</button>
        <button onclick="afficherHistorique('${page}')">📜 Historique</button>
        <button onclick="exporterExcel('${page}')">📦 Export Excel</button>
        <button onclick="remiseZero('${page}')">♻️ Remise à zéro</button>
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
    date: now.toLocaleDateString("fr-FR"),
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

// === AFFICHAGE INFOS ===
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

  renderGraph(page, lignes);
}

// === GRAPHIQUE ===
function renderGraph(page, lignes) {
  const ctx = document.getElementById("graphLigne").getContext("2d");
  new Chart(ctx, {
    type: "line",
    data: {
      labels: lignes.map(l => l.heure),
      datasets: [
        {
          label: "Quantité (colis)",
          data: lignes.map(l => l.quantite),
          borderColor: "#007bff",
          backgroundColor: "#007bff33",
          fill: true
        },
        {
          label: "Arrêts (min)",
          data: lignes.map(l => l.arret),
          borderColor: "#ff4747",
          backgroundColor: "#ff474755",
          fill: true
        }
      ]
    },
    options: {
      scales: { y: { beginAtZero: true } },
      plugins: { legend: { position: "bottom" } }
    }
  });
}

// === HISTORIQUE ===
function afficherHistorique(page) {
  const lignes = data[page] || [];
  if (lignes.length === 0) return alert("Aucune donnée enregistrée.");

  const content = document.getElementById("content");
  let table = `
    <div class="card">
      <h3>Historique ${page}</h3>
      <table border="1" style="width:100%;border-collapse:collapse;">
        <tr><th>Date</th><th>Heure</th><th>Quantité</th><th>Arrêt</th></tr>
  `;
  lignes.forEach(l => {
    table += `<tr><td>${l.date}</td><td>${l.heure}</td><td>${l.quantite}</td><td>${l.arret}</td></tr>`;
  });
  table += `</table>
    <button onclick="openPage('${page}')">⬅️ Retour</button>
    </div>`;
  content.innerHTML = table;
}

// === EXPORT EXCEL ===
function exporterExcel(page) {
  const lignes = data[page] || [];
  if (lignes.length === 0) return alert("Aucune donnée à exporter.");

  let csv = "Date;Heure;Quantité;Arrêt (min)\n";
  lignes.forEach(l => csv += `${l.date};${l.heure};${l.quantite};${l.arret}\n`);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `Synthese_${page}_${new Date().toLocaleDateString("fr-FR")}.csv`;
  link.click();
}

// === REMISE À ZÉRO D'ÉQUIPE ===
function remiseZero(page) {
  if (!confirm("♻️ Remettre à zéro les données visibles (historique conservé) ?")) return;
  data[page] = [];
  saveData();
  afficherInfos(page);
  alert("✅ Données effacées pour une nouvelle équipe.");
}

// === PAGE PAR DÉFAUT ===
document.addEventListener("DOMContentLoaded", () => openPage("Râpé"));
