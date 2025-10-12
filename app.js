// === PANNEAU FLOTTANT ===
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

// === CALCULATRICE SIMPLE ===
function ouvrirCalculatrice() {
  const res = prompt("Entrez une opération (ex: 1250/3 ou 250+420) :");
  try {
    const resultat = eval(res);
    alert("Résultat : " + resultat);
  } catch {
    alert("Opération invalide !");
  }
}

// === PAGE ATELIER AVEC GRAPHIQUES ===
function openPage(page) {
  const content = document.getElementById("content");
  if (page === "Atelier") {
    content.innerHTML = `
      <div class="card">
        <h3>Résumé Atelier</h3>
        <label>Quantité restante (colis) :</label>
        <input type="number" id="qteRestante" placeholder="ex : 1200" oninput="majFinPrevue()" />
        <p id="finPrevue"></p>
        <canvas id="graphGlobal"></canvas>
      </div>
    `;
    renderGraph("graphGlobal");
  } else {
    content.innerHTML = `
      <div class="card">
        <h2>${page}</h2>
        <label>Quantité restante :</label>
        <input type="number" id="qteRestante" placeholder="ex : 800" oninput="majFinPrevue()" />
        <p id="finPrevue"></p>
        <canvas id="graphLigne"></canvas>
      </div>
    `;
    renderGraph("graphLigne");
  }
}

// === CALCUL HEURE DE FIN ESTIMÉE ===
function majFinPrevue() {
  const qte = parseFloat(document.getElementById("qteRestante").value);
  const cadenceMoyenne = 450; // ex : moyenne de référence
  if (!qte) {
    document.getElementById("finPrevue").innerText = "";
    return;
  }
  const heures = qte / cadenceMoyenne;
  const fin = new Date(Date.now() + heures * 3600000);
  document.getElementById("finPrevue").innerText =
    "Fin estimée à " + fin.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

// === GRAPHIQUE DE TEST ===
function renderGraph(id) {
  const ctx = document.getElementById(id).getContext("2d");
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["08h", "10h", "12h", "14h", "16h"],
      datasets: [
        {
          label: "Cadence (colis/h)",
          data: [450, 470, 420, 460, 480],
          backgroundColor: "#007bff88",
          borderColor: "#007bff",
          borderWidth: 1
        }
      ]
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
document.addEventListener("DOMContentLoaded", () => openPage("Atelier"));
