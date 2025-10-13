// === 📦 Données globales ===
let data = JSON.parse(localStorage.getItem("data")) || {};
let arrets = JSON.parse(localStorage.getItem("arrets")) || [];
let personnel = JSON.parse(localStorage.getItem("personnel")) || [];
let consignes = JSON.parse(localStorage.getItem("consignes")) || [];

// === 📅 Informations date + équipe ===
function updateDateInfo() {
  const now = new Date();
  const semaine = getWeekNumber(now);
  const options = { weekday: "long", day: "numeric", month: "long", year: "numeric" };
  document.getElementById("date-info").textContent =
    now.toLocaleDateString("fr-FR", options) + ` — Semaine ${semaine} — ${now.toLocaleTimeString("fr-FR")}`;
  document.getElementById("equipe-info").innerHTML = `Équipe : <b>${getEquipe(now)}</b>`;
}
setInterval(updateDateInfo, 1000);

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function getEquipe(date) {
  const heure = date.getHours();
  if (heure >= 5 && heure < 13) return "M (5h–13h)";
  if (heure >= 13 && heure < 21) return "AM (13h–21h)";
  return "N (21h–5h)";
}

// === 🌐 Navigation entre pages ===
function openSection(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  if (id === "production") renderLignes();
  if (id === "arrets") renderArrets();
  if (id === "personnel") renderPersonnel();
  if (id === "organisation") renderConsignes();
  if (id === "tableau") renderChart();
}

// === 🏭 Lignes de production ===
const lignes = ["Râpé", "T2", "RT", "OMORI", "T1", "Sticks", "Emballage", "Dés", "Filets", "Prédécoupé"];

function renderLignes() {
  const container = document.getElementById("buttons-lignes");
  container.innerHTML = "";
  lignes.forEach(ligne => {
    const btn = document.createElement("button");
    btn.textContent = ligne;
    btn.onclick = () => openLigne(ligne);
    container.appendChild(btn);
  });
}

function openLigne(ligne) {
  const container = document.getElementById("ligne-content");
  const d = data[ligne] || {};
  container.innerHTML = `
    <div class="card">
      <h3>${ligne}</h3>
      <label>Heure de début :</label>
      <input id="debut_${ligne}" type="time" value="${d.debut || ""}" />
      
      <label>Heure de fin :</label>
      <input id="fin_${ligne}" type="time" value="${d.fin || ""}" />
      
      <label>Quantité réalisée :</label>
      <input id="qte_${ligne}" type="number" value="${d.qte || ""}" placeholder="Nombre de colis" />
      
      <label>Cadence manuelle (colis/h) :</label>
      <input id="cadenceMan_${ligne}" type="number" placeholder="Optionnel" value="${d.cadenceMan || ""}" />
      
      <label>Quantité restante :</label>
      <input id="reste_${ligne}" type="number" value="${d.reste || ""}" placeholder="Quantité à produire..." oninput="majEstimation('${ligne}')" />
      
      <label>Estimation de fin :</label>
      <input id="estimation_${ligne}" type="text" readonly value="${d.estimation || ""}" />

      <button onclick="enregistrer('${ligne}')">💾 Enregistrer</button>
      <button onclick="retourMenu()">⬅️ Retour</button>
    </div>
  `;
}

function majEstimation(ligne) {
  const qte = +document.getElementById(`qte_${ligne}`).value || 0;
  const reste = +document.getElementById(`reste_${ligne}`).value || 0;
  const cadMan = +document.getElementById(`cadenceMan_${ligne}`).value || 0;

  if (!cadMan || reste <= 0) {
    document.getElementById(`estimation_${ligne}`).value = "";
    return;
  }

  const heuresRestantes = reste / cadMan;
  const dateFin = new Date();
  dateFin.setHours(dateFin.getHours() + heuresRestantes);
  document.getElementById(`estimation_${ligne}`).value = dateFin.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function enregistrer(ligne) {
  const obj = {
    debut: document.getElementById(`debut_${ligne}`).value,
    fin: document.getElementById(`fin_${ligne}`).value,
    qte: document.getElementById(`qte_${ligne}`).value,
    cadenceMan: document.getElementById(`cadenceMan_${ligne}`).value,
    reste: document.getElementById(`reste_${ligne}`).value,
    estimation: document.getElementById(`estimation_${ligne}`).value,
  };
  data[ligne] = obj;
  localStorage.setItem("data", JSON.stringify(data));
  alert("✅ Données enregistrées pour " + ligne);
}

function retourMenu() {
  document.getElementById("ligne-content").innerHTML = "";
}

// === ⏸️ Arrêts ===
function ajouterArret() {
  const ligne = prompt("Ligne concernée ?");
  const duree = prompt("Durée de l'arrêt (min) ?");
  const cause = prompt("Cause ?");
  const commentaire = prompt("Commentaire ?");
  const arret = { ligne, duree, cause, commentaire, date: new Date().toLocaleString("fr-FR") };
  arrets.push(arret);
  localStorage.setItem("arrets", JSON.stringify(arrets));
  renderArrets();
}

function renderArrets() {
  const container = document.getElementById("liste-arrets");
  container.innerHTML = "";
  arrets.forEach(a => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `<p><b>${a.ligne}</b> — ${a.date}</p>
                     <p>${a.duree} min — ${a.cause}</p>
                     <p>${a.commentaire}</p>`;
    container.appendChild(div);
  });
}

// === 👥 Personnel ===
function ajouterPersonnel() {
  const type = document.getElementById("typePersonnel").value;
  const commentaire = document.getElementById("commentairePersonnel").value;
  const entree = { type, commentaire, date: new Date().toLocaleString("fr-FR") };
  personnel.push(entree);
  localStorage.setItem("personnel", JSON.stringify(personnel));
  renderPersonnel();
}

function renderPersonnel() {
  const histo = document.getElementById("historiquePersonnel");
  histo.innerHTML = "";
  personnel.forEach(p => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `<p><b>${p.type}</b> — ${p.date}</p><p>${p.commentaire}</p>`;
    histo.appendChild(div);
  });
}

// === 🗒️ Organisation ===
function ajouterConsigne() {
  const auteur = document.getElementById("auteurConsigne").value;
  const texte = document.getElementById("texteConsigne").value;
  if (!texte) return alert("Veuillez saisir une consigne.");
  const c = { auteur, texte, date: new Date().toLocaleString("fr-FR") };
  consignes.push(c);
  localStorage.setItem("consignes", JSON.stringify(consignes));
  renderConsignes();
}

function renderConsignes() {
  const histo = document.getElementById("historiqueConsignes");
  histo.innerHTML = "";
  const now = Date.now();
  consignes = consignes.filter(c => now - new Date(c.date).getTime() < 7 * 24 * 3600 * 1000);
  localStorage.setItem("consignes", JSON.stringify(consignes));
  consignes.forEach(c => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `<p><b>${c.auteur || "Anonyme"}</b> — ${c.date}</p><p>${c.texte}</p>`;
    histo.appendChild(div);
  });
}

// === 📊 Tableau de bord ===
function renderChart() {
  const ctx = document.getElementById("chartCadence");
  const labels = Object.keys(data);
  const values = labels.map(l => +(data[l]?.cadenceMan || 0));

  new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Cadence manuelle (colis/h)",
        data: values,
        backgroundColor: "#007bff",
      }],
    },
    options: { responsive: true, scales: { y: { beginAtZero: true } } },
  });
}

// === 🚀 Initialisation ===
renderLignes();
updateDateInfo();
