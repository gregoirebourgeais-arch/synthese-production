/*****************************************************
 * APP.JS — Synthèse Atelier Lactalis (Version Marbre+ complète)
 *****************************************************/

// --- Initialisation ---
document.addEventListener("DOMContentLoaded", () => {
  updateDateTime();
  initCalculator();
  renderHistoriqueGlobal();
  initCharts();
  setInterval(updateDateTime, 60000);
});

function updateDateTime() {
  const now = new Date();
  const semaine = getWeekNumber(now);
  document.getElementById("datetime").textContent =
    `Semaine ${semaine} — ${now.toLocaleDateString()} ${now.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}`;
}

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// --- Navigation entre pages ---
function showSection(id) {
  document.querySelectorAll(".page-section").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  window.scrollTo({top:0, behavior:"smooth"});
}
window.showSection = showSection;

// --- Lignes de production ---
const lignes = ["Râpé","T2","RT","OMORI","T1","Sticks","Emballage","Dés","Filets","Prédécoupé"];
const ligneContainer = document.getElementById("ligneContainer");

lignes.forEach(ligne => {
  const div = document.createElement("div");
  div.id = `ligne-${ligne}`;
  div.className = "card hidden";
  div.innerHTML = `
    <h3>${ligne}</h3>
    <form onsubmit="enregistrerProduction(event, '${ligne}')">
      <label>Heure début :</label>
      <input type="time" id="debut-${ligne}" required>

      <label>Heure fin :</label>
      <input type="time" id="fin-${ligne}" required>

      <label>Quantité réalisée :</label>
      <input type="number" id="quantite-${ligne}" placeholder="Colis produits" required>

      <label>Quantité restante :</label>
      <input type="number" id="reste-${ligne}" placeholder="Colis restants">

      <label>Cadence manuelle (colis/h) :</label>
      <input type="number" id="cadenceManuelle-${ligne}" placeholder="Saisir si besoin">

      <div class="stats">
        <p>Cadence calculée : <b id="cadence-${ligne}">0</b> colis/h</p>
        <p>Fin estimée : <b id="estimation-${ligne}">—</b></p>
      </div>

      <button type="submit">💾 Enregistrer</button>
      <button type="button" onclick="resetLigne('${ligne}')">🔄 Remise à zéro</button>
    </form>

    <div id="historique-${ligne}" class="card"></div>
  `;
  ligneContainer.appendChild(div);
});

// --- Navigation dans les lignes ---
function showLigne(nom) {
  document.querySelectorAll("#ligneContainer .card").forEach(c => c.classList.add("hidden"));
  document.getElementById(`ligne-${nom}`).classList.remove("hidden");
  window.scrollTo({top:0, behavior:"smooth"});
}
window.showLigne = showLigne;

// --- Enregistrement Production ---
function enregistrerProduction(e, ligne) {
  e.preventDefault();

  const debut = document.getElementById(`debut-${ligne}`).value;
  const fin = document.getElementById(`fin-${ligne}`).value;
  const quantite = parseFloat(document.getElementById(`quantite-${ligne}`).value) || 0;
  const reste = parseFloat(document.getElementById(`reste-${ligne}`).value) || 0;
  const cadenceManuelle = parseFloat(document.getElementById(`cadenceManuelle-${ligne}`).value) || null;

  const date = new Date();
  const heure = date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});

  const diffH = (new Date(`1970-01-01T${fin}:00`) - new Date(`1970-01-01T${debut}:00`)) / 3600000;
  const cadenceAuto = diffH > 0 ? quantite / diffH : 0;
  const cadence = cadenceManuelle || cadenceAuto;
  const finEstimee = cadence > 0 && reste > 0 ? (reste / cadence) : 0;

  const record = {
    date: date.toLocaleDateString(),
    heure,
    debut, fin,
    quantite,
    reste,
    cadence: cadence.toFixed(1),
    finEstimee: finEstimee ? `${Math.floor(finEstimee)}h${Math.round((finEstimee % 1)*60)}min` : "—"
  };

  const data = JSON.parse(localStorage.getItem(`prod-${ligne}`)) || [];
  data.push(record);
  localStorage.setItem(`prod-${ligne}`, JSON.stringify(data));

  afficherHistorique(ligne);
  e.target.reset();
}

// --- Affichage de l’historique ---
function afficherHistorique(ligne) {
  const hist = document.getElementById(`historique-${ligne}`);
  const data = JSON.parse(localStorage.getItem(`prod-${ligne}`)) || [];
  hist.innerHTML = data.map((r, i) =>
    `<div class="hist-item">
      <span>${r.date} ${r.heure} — ${r.quantite} colis (${r.cadence} col/h)</span>
      <button onclick="supprimerLigne('${ligne}', ${i})">🗑</button>
    </div>`
  ).join("") || "<p>Aucun enregistrement</p>";

  updateStats(ligne, data);
}

function supprimerLigne(ligne, index) {
  const data = JSON.parse(localStorage.getItem(`prod-${ligne}`)) || [];
  data.splice(index,1);
  localStorage.setItem(`prod-${ligne}`, JSON.stringify(data));
  afficherHistorique(ligne);
}

function resetLigne(ligne) {
  document.getElementById(`quantite-${ligne}`).value = "";
  document.getElementById(`reste-${ligne}`).value = "";
  document.getElementById(`cadence-${ligne}`).textContent = "0";
  document.getElementById(`estimation-${ligne}`).textContent = "—";
}

// --- Calcul auto estimation quand on tape ---
lignes.forEach(ligne => {
  const inputReste = document.getElementById(`reste-${ligne}`);
  if (inputReste) {
    inputReste.addEventListener("input", () => {
      const reste = parseFloat(inputReste.value);
      const last = JSON.parse(localStorage.getItem(`prod-${ligne}`))?.slice(-1)[0];
      if (last && last.cadence > 0 && reste > 0) {
        const finEstimee = reste / last.cadence;
        document.getElementById(`estimation-${ligne}`).textContent =
          `${Math.floor(finEstimee)}h${Math.round((finEstimee % 1)*60)}min`;
      }
    });
  }
});

// --- Stats ---
function updateStats(ligne, data) {
  if (!data.length) return;
  const moy = data.reduce((a,b)=>a+parseFloat(b.cadence),0)/data.length;
  document.getElementById(`cadence-${ligne}`).textContent = moy.toFixed(1);
}

// --- Historique global pour Atelier ---
function renderHistoriqueGlobal() {
  const resume = {};
  lignes.forEach(ligne => {
    const data = JSON.parse(localStorage.getItem(`prod-${ligne}`)) || [];
    const total = data.reduce((a,b)=>a+b.quantite,0);
    resume[ligne] = total;
  });

  const ctx = document.getElementById("atelierChart");
  if (ctx) {
    new Chart(ctx, {
      type: "bar",
      data: {
        labels: Object.keys(resume),
        datasets: [{
          label: "Quantité totale (colis)",
          data: Object.values(resume),
          backgroundColor: "#007bff88",
          borderColor: "#0056b3",
          borderWidth: 1
        }]
      },
      options: { responsive: true, scales: { y: { beginAtZero: true } } }
    });
  }
}

// --- Enregistrement des arrêts ---
function enregistrerArret(e) {
  e.preventDefault();
  const ligne = document.getElementById("ligneArret").value;
  const temps = document.getElementById("tempsArret").value;
  const cause = document.getElementById("causeArret").value;

  const record = {
    date: new Date().toLocaleDateString(),
    heure: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
    ligne, temps, cause
  };

  const data = JSON.parse(localStorage.getItem("arrets")) || [];
  data.push(record);
  localStorage.setItem("arrets", JSON.stringify(data));

  afficherArrets();
  e.target.reset();
}

function afficherArrets() {
  const hist = document.getElementById("historiqueArrets");
  const data = JSON.parse(localStorage.getItem("arrets")) || [];
  hist.innerHTML = data.map(a =>
    `<div class="hist-item"><span>${a.date} ${a.heure} — ${a.ligne} (${a.temps} min) : ${a.cause}</span></div>`
  ).join("") || "<p>Aucun arrêt enregistré</p>";
}

// --- Organisation ---
function enregistrerOrganisation(e) {
  e.preventDefault();
  const ligne = document.getElementById("ligneOrg").value;
  const texte = document.getElementById("consigneTexte").value;

  const record = { date: new Date().toLocaleDateString(), ligne, texte };
  const data = JSON.parse(localStorage.getItem("org")) || [];
  data.push(record);
  localStorage.setItem("org", JSON.stringify(data));

  afficherOrganisation();
  e.target.reset();
}

function afficherOrganisation() {
  const hist = document.getElementById("historiqueOrganisation");
  const data = JSON.parse(localStorage.getItem("org")) || [];
  hist.innerHTML = data.map(o =>
    `<div class="hist-item"><span>${o.date} — ${o.ligne} : ${o.texte}</span></div>`
  ).join("") || "<p>Aucune consigne</p>";
}

// --- Personnel ---
function enregistrerPersonnel(e) {
  e.preventDefault();
  const nom = document.getElementById("nomPers").value;
  const motif = document.getElementById("motifPers").value;
  const comm = document.getElementById("commentairePers").value;

  const record = { date: new Date().toLocaleDateString(), nom, motif, comm };
  const data = JSON.parse(localStorage.getItem("pers")) || [];
  data.push(record);
  localStorage.setItem("pers", JSON.stringify(data));

  afficherPersonnel();
  e.target.reset();
}

function afficherPersonnel() {
  const hist = document.getElementById("historiquePersonnel");
  const data = JSON.parse(localStorage.getItem("pers")) || [];
  hist.innerHTML = data.map(p =>
    `<div class="hist-item"><span>${p.date} — ${p.nom} (${p.motif}) : ${p.comm}</span></div>`
  ).join("") || "<p>Aucun enregistrement</p>";
}

// --- Calculatrice ---
function initCalculator() {
  const calc = document.getElementById("calculator");
  const openBtn = document.getElementById("openCalc");
  const screen = document.getElementById("calcScreen");
  const keys = document.getElementById("calcKeys");

  const layout = [
    "7","8","9","/",
    "4","5","6","*",
    "1","2","3","-",
    "0",".","=","+",
    "C"
  ];

  keys.innerHTML = layout.map(k=>`<button>${k}</button>`).join("");
  keys.querySelectorAll("button").forEach(btn=>{
    btn.addEventListener("click",()=>{
      if(btn.textContent==="C") screen.value="";
      else if(btn.textContent==="=") {
        try{ screen.value = eval(screen.value); } catch { screen.value="Err"; }
      } else screen.value += btn.textContent;
    });
  });

  openBtn.addEventListener("click",()=>{
    calc.classList.toggle("show");
  });
}

// --- Export Excel (tout en un onglet) ---
function exportAllData() {
  const wb = XLSX.utils.book_new();
  const all = [];

  lignes.forEach(ligne=>{
    const prod = JSON.parse(localStorage.getItem(`prod-${ligne}`)) || [];
    prod.forEach(p=>all.push({Type:"Production", Ligne:ligne, ...p}));
  });

  const arr = JSON.parse(localStorage.getItem("arrets")) || [];
  arr.forEach(a=>all.push({Type:"Arrêt", ...a}));

  const org = JSON.parse(localStorage.getItem("org")) || [];
  org.forEach(o=>all.push({Type:"Organisation", ...o}));

  const pers = JSON.parse(localStorage.getItem("pers")) || [];
  pers.forEach(p=>all.push({Type:"Personnel", ...p}));

  const ws = XLSX.utils.json_to_sheet(all);
  XLSX.utils.book_append_sheet(wb, ws, "Synthèse Atelier");
  XLSX.writeFile(wb, `Synthese_Atelier_${new Date().toLocaleDateString()}.xlsx`);
                                                             }
