/* ===============================
   SYNTHÈSE PRODUCTION — APP.JS V26
================================== */

// -------------------------
// VARIABLES GLOBALES
// -------------------------
let currentSection = "production";
let currentEquipe = "";
let productionData = JSON.parse(localStorage.getItem("productionData")) || {};
let atelierChart;

// -------------------------
// DÉTECTION AUTOMATIQUE DE L’ÉQUIPE
// -------------------------
function detectEquipe() {
  const now = new Date();
  const hour = now.getHours();

  if (hour >= 5 && hour < 13) currentEquipe = "M";
  else if (hour >= 13 && hour < 21) currentEquipe = "AM";
  else currentEquipe = "N";

  document.getElementById("equipe").innerText = "Équipe : " + currentEquipe;
  localStorage.setItem("currentEquipe", currentEquipe);
}

detectEquipe();

// -------------------------
// HEURE / DATE / SEMAINE
// -------------------------
function updateDateTime() {
  const now = new Date();
  const semaine = getWeekNumber(now);
  const dateStr = now.toLocaleDateString("fr-FR");
  const timeStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  document.getElementById("dateTime").innerText = `Semaine ${semaine} — ${dateStr} ${timeStr}`;
}
setInterval(updateDateTime, 1000);
updateDateTime();

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

// -------------------------
// NAVIGATION ENTRE LES SECTIONS
// -------------------------
function openSection(id) {
  document.querySelectorAll(".page").forEach(sec => sec.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  currentSection = id;
  if (id === "atelier") renderAtelierChart();
}

// -------------------------
// OUVRIR UNE LIGNE DE PRODUCTION
// -------------------------
function openLine(line) {
  const data = productionData[line] || {
    start: "",
    end: "",
    qty: 0,
    cadence: 0,
    remaining: 0,
    estimate: ""
  };

  const html = `
    <h2>Ligne ${line}</h2>
    <form id="lineForm">
      <label>Heure de début :</label>
      <input type="time" id="startTime" value="${data.start || ""}" />

      <label>Heure de fin :</label>
      <input type="time" id="endTime" value="${data.end || ""}" />

      <label>Quantité réalisée :</label>
      <input type="number" id="quantity" value="${data.qty || ""}" placeholder="Nombre de colis" />

      <label>Cadence manuelle (colis/h) :</label>
      <input type="number" id="manualCadence" value="${data.cadence || ""}" placeholder="Optionnel" />

      <label>Quantité restante :</label>
      <input type="number" id="remainingQty" value="${data.remaining || ""}" placeholder="Quantité à produire..." />

      <label>Estimation de fin :</label>
      <input type="text" id="estimatedEnd" value="${data.estimate || ""}" readonly />

      <button type="button" onclick="saveLine('${line}')">💾 Enregistrer</button>
      <button type="button" onclick="goBack()">⬅️ Retour</button>
    </form>

    <canvas id="lineChart"></canvas>
  `;
  document.getElementById("production").innerHTML = html;
}

// -------------------------
// SAUVEGARDE D’UNE LIGNE
// -------------------------
function saveLine(line) {
  const start = document.getElementById("startTime").value;
  const end = document.getElementById("endTime").value;
  const qty = parseFloat(document.getElementById("quantity").value) || 0;
  const cadenceManuelle = parseFloat(document.getElementById("manualCadence").value) || 0;
  const remaining = parseFloat(document.getElementById("remainingQty").value) || 0;
  const now = new Date();
  const timestamp = now.toLocaleTimeString("fr-FR");

  // Calcul automatique de cadence si pas manuelle
  let cadence = cadenceManuelle;
  if (!cadence) {
    const diff = getDurationHours(start, end);
    cadence = diff > 0 ? (qty / diff).toFixed(2) : 0;
  }

  // Estimation de fin si quantité restante
  let estimatedEnd = "";
  if (remaining > 0 && cadence > 0) {
    const hoursToFinish = remaining / cadence;
    const estimated = new Date();
    estimated.setHours(estimated.getHours() + hoursToFinish);
    estimatedEnd = estimated.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }

  productionData[line] = { start, end, qty, cadence, remaining, estimate: estimatedEnd, equipe: currentEquipe, time: timestamp };
  localStorage.setItem("productionData", JSON.stringify(productionData));

  alert(`✅ Ligne ${line} enregistrée (Cadence : ${cadence} colis/h)`);
  openSection("production");
}

// -------------------------
// CALCUL DURÉE EN HEURES
// -------------------------
function getDurationHours(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let diff = (eh + em / 60) - (sh + sm / 60);
  if (diff < 0) diff += 24; // passage minuit
  return diff;
}

// -------------------------
// RETOUR MENU
// -------------------------
function goBack() {
  openSection("production");
  renderAtelierChart();
}

// -------------------------
// GRAPHIQUE ATELIER
// -------------------------
function renderAtelierChart() {
  const ctx = document.getElementById("atelierChart");
  if (!ctx) return;

  const labels = Object.keys(productionData);
  const values = labels.map(l => parseFloat(productionData[l]?.cadence || 0));

  if (atelierChart) atelierChart.destroy();
  atelierChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Cadence (colis/h)",
          data: values,
          backgroundColor: "#007bff"
        }
      ]
    },
    options: {
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

// -------------------------
// EXPORT EXCEL
// -------------------------
function exportAtelier() {
  let csv = "Ligne;Début;Fin;Quantité;Cadence;Reste;Estimation;Équipe;Heure\n";
  for (const [line, d] of Object.entries(productionData)) {
    csv += `${line};${d.start};${d.end};${d.qty};${d.cadence};${d.remaining};${d.estimate};${d.equipe};${d.time}\n`;
  }

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const now = new Date();
  a.href = url;
  a.download = `atelier-export-${currentEquipe}-${now.toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// -------------------------
// REMISE À ZÉRO COMPLÈTE
// -------------------------
function resetApplication() {
  if (!confirm("Remettre à zéro toutes les données ?")) return;
  exportAtelier();
  productionData = {};
  localStorage.removeItem("productionData");
  renderAtelierChart();
  alert("🔄 Application réinitialisée (export enregistré).");
}

// -------------------------
// LISTENERS DE CHAMPS
// -------------------------
document.addEventListener("input", (e) => {
  if (e.target.id === "remainingQty" || e.target.id === "manualCadence") {
    const remaining = parseFloat(document.getElementById("remainingQty")?.value || 0);
    const cadence = parseFloat(document.getElementById("manualCadence")?.value || 0);
    if (remaining > 0 && cadence > 0) {
      const hoursToFinish = remaining / cadence;
      const est = new Date();
      est.setHours(est.getHours() + hoursToFinish);
      document.getElementById("estimatedEnd").value = est.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    }
  }
});

// -------------------------
// INITIALISATION
// -------------------------
window.addEventListener("load", () => {
  detectEquipe();
  renderAtelierChart();
});
