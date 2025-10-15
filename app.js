// -----------------------------
// Gestion de l'heure et équipe
// -----------------------------
function majDateHeure() {
  const now = new Date();
  const jour = now.toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const heure = now.toLocaleTimeString("fr-FR");
  document.getElementById("dateHeure").innerText = `${jour} — ${heure}`;

  const h = now.getHours();
  let equipe =
    h >= 5 && h < 13
      ? "AM (5h–13h)"
      : h >= 13 && h < 21
      ? "PM (13h–21h)"
      : "N (21h–5h)";
  document.getElementById("equipeActuelle").innerText = `Équipe actuelle : ${equipe}`;
}
setInterval(majDateHeure, 1000);
majDateHeure();

// -----------------------------
// Navigation entre sections
// -----------------------------
function showSection(id) {
  document.querySelectorAll(".page-section").forEach((s) => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  if (id === "atelier") majGraphiques();
}

// -----------------------------
// Gestion des lignes
// -----------------------------
let ligneActuelle = "Râpé";
function selectLigne(nom) {
  ligneActuelle = nom;
  alert(`Ligne sélectionnée : ${nom}`);
}

// -----------------------------
// Gestion de la production
// -----------------------------
const lignes = ["Râpé","T2","RT","OMORI","T1","Sticks","Emballage","Dés","Filets","Prédécoupé"];
let donneesProduction = JSON.parse(localStorage.getItem("donneesProduction")) || {};

function enregistrerProduction(ligne, debut, fin, qte, reste, cadence) {
  if (!donneesProduction[ligne]) donneesProduction[ligne] = [];

  const estimation =
    cadence > 0 && reste > 0 ? new Date(Date.now() + (reste / cadence) * 3600000) : null;

  donneesProduction[ligne].push({
    debut,
    fin,
    qte,
    reste,
    cadence,
    estimation: estimation ? estimation.toLocaleTimeString("fr-FR") : "—",
    date: new Date().toLocaleString("fr-FR"),
  });

  localStorage.setItem("donneesProduction", JSON.stringify(donneesProduction));
  majGraphiques();
}

// -----------------------------
// Calcul automatique de fin
// -----------------------------
document.addEventListener("input", (e) => {
  if (e.target.id === "quantiteRestante") {
    const qteR = parseFloat(e.target.value);
    const cadence = parseFloat(document.getElementById("cadenceManuelle").value);
    if (qteR > 0 && cadence > 0) {
      const h = new Date(Date.now() + (qteR / cadence) * 3600000);
      document.getElementById("estimationFin").value = h.toLocaleTimeString("fr-FR");
    }
  }
});

// -----------------------------
// Gestion des arrêts
// -----------------------------
let arrets = JSON.parse(localStorage.getItem("arrets")) || [];

function enregistrerArret() {
  const duree = document.getElementById("dureeArret").value;
  const motif = document.getElementById("motifArret").value;
  if (!duree || !motif) return alert("Complétez tous les champs !");
  arrets.push({ duree, motif, date: new Date().toLocaleString("fr-FR") });
  localStorage.setItem("arrets", JSON.stringify(arrets));
  afficherArrets();
}

function afficherArrets() {
  const ul = document.getElementById("historiqueArrets");
  ul.innerHTML = "";
  arrets.forEach((a) => {
    const li = document.createElement("li");
    li.textContent = `[${a.date}] ${a.motif} — ${a.duree} min`;
    ul.appendChild(li);
  });
}
afficherArrets();

// -----------------------------
// Gestion du personnel
// -----------------------------
let personnel = JSON.parse(localStorage.getItem("personnel")) || [];

function enregistrerPersonnel() {
  const nom = document.getElementById("nomPersonnel").value;
  const poste = document.getElementById("postePersonnel").value;
  if (!nom || !poste) return alert("Complétez tous les champs !");
  personnel.push({ nom, poste, date: new Date().toLocaleString("fr-FR") });
  localStorage.setItem("personnel", JSON.stringify(personnel));
  afficherPersonnel();
}

function afficherPersonnel() {
  const ul = document.getElementById("historiquePersonnel");
  ul.innerHTML = "";
  personnel.forEach((p) => {
    const li = document.createElement("li");
    li.textContent = `[${p.date}] ${p.nom} — ${p.poste}`;
    ul.appendChild(li);
  });
}
afficherPersonnel();

// -----------------------------
// Gestion des consignes
// -----------------------------
let consignes = JSON.parse(localStorage.getItem("consignes")) || [];

function enregistrerConsigne() {
  const txt = document.getElementById("consigneTexte").value;
  if (!txt) return alert("Écris une consigne !");
  consignes.push({ txt, date: new Date().toLocaleString("fr-FR") });
  localStorage.setItem("consignes", JSON.stringify(consignes));
  afficherConsignes();
}

function afficherConsignes() {
  const ul = document.getElementById("historiqueConsignes");
  ul.innerHTML = "";
  consignes.forEach((c) => {
    const li = document.createElement("li");
    li.textContent = `[${c.date}] ${c.txt}`;
    ul.appendChild(li);
  });
}
afficherConsignes();

// -----------------------------
// GRAPHIQUES ATELIER
// -----------------------------
let chart;
function majGraphiques() {
  const ctx = document.getElementById("chartQuantites").getContext("2d");

  const labels = lignes;
  const data = labels.map((l) => {
    if (!donneesProduction[l]) return 0;
    return donneesProduction[l].reduce((a, b) => a + parseFloat(b.qte || 0), 0);
  });

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Quantités produites (colis)",
          data,
          backgroundColor: "#007bff",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: { display: true, text: "Production totale par ligne" },
      },
    },
  });
}

// -----------------------------
// EXPORT GLOBAL EXCEL
// -----------------------------
function exportGlobal() {
  let lignesCSV = [
    ["Section", "Date", "Ligne", "Donnée 1", "Donnée 2", "Donnée 3", "Donnée 4"],
  ];

  Object.entries(donneesProduction).forEach(([ligne, data]) => {
    data.forEach((r) =>
      lignesCSV.push(["Production", r.date, ligne, r.qte, r.reste, r.cadence, r.estimation])
    );
  });

  arrets.forEach((a) =>
    lignesCSV.push(["Arrêt", a.date, "-", a.motif, `${a.duree} min`, "-", "-"])
  );

  personnel.forEach((p) =>
    lignesCSV.push(["Personnel", p.date, "-", p.nom, p.poste, "-", "-"])
  );

  consignes.forEach((c) =>
    lignesCSV.push(["Organisation", c.date, "-", c.txt, "-", "-", "-"])
  );

  const csvContent = lignesCSV.map((e) => e.join(";")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Synthese_Production_${new Date()
    .toLocaleDateString("fr-FR")
    .replace(/\//g, "-")}.csv`;
  a.click();
                }
