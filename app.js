// === VARIABLES GLOBALES ===
let currentLine = "";
let historique = JSON.parse(localStorage.getItem("historique")) || {};
let chart;

// === DATE ET ÉQUIPE ===
function updateDateHeure() {
  const now = new Date();
  document.getElementById("dateHeure").textContent =
    now.toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "medium" });

  const heure = now.getHours();
  let equipe = "N";
  if (heure >= 5 && heure < 13) equipe = "M";
  else if (heure >= 13 && heure < 21) equipe = "AM";
  document.getElementById("equipeActuelle").textContent = `Équipe actuelle : ${equipe} (${equipe === "M" ? "5h–13h" : equipe === "AM" ? "13h–21h" : "21h–5h"})`;
}
setInterval(updateDateHeure, 1000);
updateDateHeure();

// === NAVIGATION ===
function showSection(id) {
  document.querySelectorAll(".page").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// === SÉLECTION DE LIGNE ===
function selectLine(line) {
  currentLine = line;
  document.getElementById("ligneTitre").textContent = "Ligne : " + line;
  restoreInputs(line);
  updateChart();
}

// === RESTAURATION DES CHAMPS ===
function restoreInputs(line) {
  const data = JSON.parse(localStorage.getItem(`data_${line}`)) || {};
  document.getElementById("heureDebut").value = data.heureDebut || "";
  document.getElementById("heureFin").value = data.heureFin || "";
  document.getElementById("qteRealisee").value = data.qteRealisee || "";
  document.getElementById("qteRestante").value = data.qteRestante || "";
  document.getElementById("cadenceManuelle").value = data.cadenceManuelle || "";
  document.getElementById("cadenceCalculee").value = data.cadenceCalculee || "";
  document.getElementById("estimationFin").value = data.estimationFin || "";
}

// === SAUVEGARDE LOCALE TEMPORAIRE ===
document.querySelectorAll("#heureDebut, #heureFin, #qteRealisee, #qteRestante, #cadenceManuelle").forEach(el => {
  el.addEventListener("input", () => {
    if (!currentLine) return;
    const data = {
      heureDebut: document.getElementById("heureDebut").value,
      heureFin: document.getElementById("heureFin").value,
      qteRealisee: document.getElementById("qteRealisee").value,
      qteRestante: document.getElementById("qteRestante").value,
      cadenceManuelle: document.getElementById("cadenceManuelle").value,
      cadenceCalculee: document.getElementById("cadenceCalculee").value,
      estimationFin: document.getElementById("estimationFin").value
    };
    localStorage.setItem(`data_${currentLine}`, JSON.stringify(data));
    updateEstimation();
  });
});

// === CALCUL AUTOMATIQUE ===
function updateEstimation() {
  const debut = document.getElementById("heureDebut").value;
  const fin = document.getElementById("heureFin").value;
  const qte = parseFloat(document.getElementById("qteRealisee").value);
  const rest = parseFloat(document.getElementById("qteRestante").value);
  const cadMan = parseFloat(document.getElementById("cadenceManuelle").value);

  let cadence = 0;
  if (debut && fin && qte) {
    const [h1, m1] = debut.split(":").map(Number);
    const [h2, m2] = fin.split(":").map(Number);
    let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (diff <= 0) diff += 24 * 60;
    cadence = qte / (diff / 60);
    document.getElementById("cadenceCalculee").value = cadence.toFixed(2);
  }

  if (rest && (cadMan || cadence)) {
    const rate = cadMan || cadence;
    const hoursNeeded = rest / rate;
    const now = new Date();
    const finEstimee = new Date(now.getTime() + hoursNeeded * 3600000);
    document.getElementById("estimationFin").value =
      finEstimee.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) +
      ` (~${hoursNeeded.toFixed(2)}h)`;
  }
}

// === ENREGISTRER ===
function enregistrer() {
  if (!currentLine) return alert("Sélectionne d'abord une ligne.");
  const date = new Date().toLocaleString("fr-FR");
  const hD = document.getElementById("heureDebut").value;
  const hF = document.getElementById("heureFin").value;
  const qR = document.getElementById("qteRealisee").value;
  const qRest = document.getElementById("qteRestante").value;
  const cad = document.getElementById("cadenceCalculee").value;
  const estFin = document.getElementById("estimationFin").value;

  const lineData = historique[currentLine] || [];
  lineData.push({ date, hD, hF, qR, qRest, cad, estFin });
  historique[currentLine] = lineData;
  localStorage.setItem("historique", JSON.stringify(historique));
  localStorage.removeItem(`data_${currentLine}`);
  afficherHistorique();
  resetForm();
  updateChart();
}

// === RESET ===
function resetForm() {
  document.querySelectorAll("#heureDebut, #heureFin, #qteRealisee, #qteRestante, #cadenceManuelle, #cadenceCalculee, #estimationFin")
    .forEach(i => i.value = "");
}

// === HISTORIQUE ===
function afficherHistorique() {
  const histDiv = document.getElementById("historique");
  histDiv.innerHTML = "";
  if (!historique[currentLine]) return;
  historique[currentLine].forEach((e, i) => {
    const div = document.createElement("div");
    div.innerHTML = `${e.date} — ${e.hD} ➜ ${e.hF} | Q=${e.qR} | Rest=${e.qRest} | Cad=${e.cad} | Fin=${e.estFin}
      <button onclick="supprEntry(${i})">🗑️</button>`;
    histDiv.appendChild(div);
  });
}
function supprEntry(i) {
  historique[currentLine].splice(i, 1);
  localStorage.setItem("historique", JSON.stringify(historique));
  afficherHistorique();
  updateChart();
}

// === CHART ===
function updateChart() {
  const ctx = document.getElementById("chartQuantites").getContext("2d");
  const labels = Object.keys(historique);
  const data = labels.map(l => {
    const arr = historique[l] || [];
    return arr.reduce((sum, e) => sum + Number(e.qR || 0), 0);
  });

  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Quantité réalisée (colis)",
        data,
        backgroundColor: "#007bff88",
        borderColor: "#005fc4",
        borderWidth: 1.5
      }]
    },
    options: {
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

// === EXPORT EXCEL ===
function exportGlobal() {
  const rows = [["Ligne", "Date", "Heure Début", "Heure Fin", "Quantité", "Restante", "Cadence", "Fin estimée"]];
  Object.entries(historique).forEach(([ligne, entries]) => {
    entries.forEach(e => {
      rows.push([ligne, e.date, e.hD, e.hF, e.qR, e.qRest, e.cad, e.estFin]);
    });
  });
  const csv = rows.map(r => r.join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "Synthese_Production_Lactalis.csv";
  link.click();
}

// === ARRÊTS ===
function enregistrerArret() {
  const ligne = document.getElementById("arretLigne").value;
  const duree = document.getElementById("dureeArret").value;
  const motif = document.getElementById("motifArret").value;
  if (!ligne || !duree) return alert("Complète les champs arrêt.");
  const date = new Date().toLocaleString("fr-FR");
  const entry = `[${date}] ${ligne} — ${duree}min — ${motif}`;
  const div = document.createElement("div");
  div.textContent = entry;
  document.getElementById("historiqueArrets").appendChild(div);
  document.getElementById("dureeArret").value = "";
  document.getElementById("motifArret").value = "";
  document.getElementById("arretLigne").value = "";
}

// === PERSONNEL ===
function enregistrerPersonnel() {
  const n = document.getElementById("nomPers").value;
  const m = document.getElementById("motifPers").value;
  const c = document.getElementById("comPers").value;
  if (!n) return;
  const date = new Date().toLocaleString("fr-FR");
  const div = document.createElement("div");
  div.textContent = `[${date}] ${n} — ${m} — ${c}`;
  document.getElementById("historiquePersonnel").appendChild(div);
  document.getElementById("nomPers").value = "";
  document.getElementById("motifPers").value = "";
  document.getElementById("comPers").value = "";
}

// === ORGANISATION ===
function enregistrerOrganisation() {
  const txt = document.getElementById("noteOrganisation").value;
  if (!txt) return;
  const date = new Date().toLocaleString("fr-FR");
  const div = document.createElement("div");
  div.textContent = `[${date}] ${txt}`;
  document.getElementById("historiqueOrganisation").appendChild(div);
  document.getElementById("noteOrganisation").value = "";
}

// === CALCULATRICE ===
function toggleCalc() {
  document.querySelector(".calc-content").classList.toggle("active");
}
function calcAdd(val) {
  document.getElementById("calcScreen").value += val;
}
function calcCompute() {
  const input = document.getElementById("calcScreen");
  try { input.value = eval(input.value); }
  catch { input.value = "Erreur"; }
}
function calcClear() {
  document.getElementById("calcScreen").value = "";
}
