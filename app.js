// === PANNEAU FLOTTANT (Semaine + Date + Heure) ===
function updateDateTime() {
  const now = new Date();
  const jour = now.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
  const heure = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  // Calcul numéro de semaine ISO
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

// === NAVIGATION ENTRE PAGES ===
function openPage(page) {
  const content = document.getElementById("content");
  if (page === "Atelier") {
    content.innerHTML = `
      <div class="card"><h3>Ligne Râpé</h3><canvas id="graphRape"></canvas></div>
      <div class="card"><h3>Ligne T2</h3><canvas id="graphT2"></canvas></div>
      <div class="card"><h3>Ligne OMORI</h3><canvas id="graphOmori"></canvas></div>
      <div class="card"><h3>Ligne RT</h3><canvas id="graphRT"></canvas></div>
    `;
    renderGraph("graphRape");
    renderGraph("graphT2");
    renderGraph("graphOmori");
    renderGraph("graphRT");
  } else {
    content.innerHTML = `<div class="card"><h2>${page}</h2><p>Interface ligne en cours de chargement...</p></div>`;
  }
}

// === GRAPHIQUES DE TEST ===
function renderGraph(id) {
  const ctx = document.getElementById(id).getContext("2d");
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["08h", "10h", "12h", "14h", "16h"],
      datasets: [{
        label: "Cadence (colis/h)",
        data: [450, 470, 420, 460, 480],
        backgroundColor: "#007bff88",
        borderColor: "#007bff",
        borderWidth: 1
      }]
    },
    options: {
      scales: {
        y: { beginAtZero: true }
      },
      plugins: { legend: { display: false } }
    }
  });
}

// === PAGE PAR DÉFAUT ===
document.addEventListener("DOMContentLoaded", () => {
  openPage("Atelier");
});
