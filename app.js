// === Synthèse Production Lactalis V16 ===

const lignes = ["Râpé", "T2", "RT", "OMORI", "T1", "Sticks", "Emballage", "Dés", "Filets", "Prédécoupé"];
let data = JSON.parse(localStorage.getItem("syntheseData")) || {};
let currentLine = null;

// 🕒 Horloge
function updateClock() {
  const d = new Date();
  const semaine = getWeekNumber(d);
  const date = d.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  const heure = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  document.getElementById("topClock").textContent = `${date} — Semaine ${semaine} — ${heure}`;
}
function getWeekNumber(d = new Date()) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
}
setInterval(updateClock, 1000);
updateClock();

// 🏠 Menu principal
function renderMenu() {
  const buttons = lignes.map(l => `<button onclick="openLine('${l}')">${l}</button>`).join("");
  document.getElementById("content").innerHTML = `
    <div class="page fade">
      <h2>Sélectionne une ligne</h2>
      <div class="menu-lignes">${buttons}</div>
    </div>`;
}

// 📈 Ouvrir une ligne
function openLine(line) {
  currentLine = line;
  const d = data[line] || [];
  const total = d.reduce((s, x) => s + (Number(x.quantite) || 0), 0);
  const cadenceMoy = d.length ? (total / d.length).toFixed(1) : 0;

  const html = `
  <div class="page fade">
    <h2>${line}</h2>
    <button class="retour-menu" onclick="renderMenu()">⬅ Retour menu</button>

    <label>Heure début :</label><input id="debut" type="time" value="${getTimeNow()}">
    <label>Heure fin :</label><input id="fin" type="time" value="${getTimeNow()}">
    <label>Quantité initiale :</label><input id="q1" type="number">
    <label>Quantité ajoutée :</label><input id="q2" type="number">
    <label>Quantité restante :</label><input id="reste" type="number">
    <label>Temps d'arrêt (min) :</label><input id="arret" type="number">
    <label>Cause d'arrêt :</label><input id="cause" type="text">
    <label>Commentaire :</label><input id="commentaire" type="text">

    <div class="stats">
      <p><b>Total :</b> <span id="total">${total}</span> colis</p>
      <p><b>Cadence moyenne :</b> <span id="cadence">${cadenceMoy}</span> colis/h</p>
      <p><b>Estimation fin :</b> <span id="estimation">—</span></p>
    </div>

    <label>Cadence manuelle :</label><input id="cadenceManuelle" type="number" placeholder="Saisir cadence manuelle..." />
    <button onclick="remiseAffichage()">♻ Remise affichage</button>

    <div class="boutons">
      <button onclick="enregistrer()">💾 Enregistrer</button>
      <button onclick="annulerDernier()">↩ Annuler dernier</button>
      <button onclick="afficherHistorique()">📜 Historique</button>
      <button onclick="exportExcel('${line}')">📦 Export Excel</button>
    </div>

    <canvas id="chartLine"></canvas>
  </div>`;
  document.getElementById("content").innerHTML = html;
  renderGraph(line);
}

// Heure actuelle
function getTimeNow() {
  const d = new Date();
  return d.toTimeString().slice(0,5);
}

// 💾 Enregistrer
function enregistrer() {
  const l = currentLine;
  if (!l) return;
  const q1 = +document.getElementById("q1").value || 0;
  const q2 = +document.getElementById("q2").value || 0;
  const total = q1 + q2;
  const debut = document.getElementById("debut").value;
  const fin = document.getElementById("fin").value;
  const durée = calcHeures(debut, fin);
  const cadence = durée > 0 ? (total / durée).toFixed(1) : 0;

  const obj = {
    date: new Date().toLocaleDateString(),
    heure: getTimeNow(),
    debut, fin, quantite: total,
    cadence,
    arret: +document.getElementById("arret").value || 0,
    cause: document.getElementById("cause").value,
    commentaire: document.getElementById("commentaire").value
  };
  if (!data[l]) data[l] = [];
  data[l].push(obj);
  saveData();
  openLine(l);
}

// Annuler dernier
function annulerDernier() {
  if (data[currentLine]?.length) {
    data[currentLine].pop();
    saveData();
    openLine(currentLine);
  }
}

// Remise affichage (cycle remis à zéro)
function remiseAffichage() {
  document.querySelectorAll("input").forEach(i => i.value = "");
  document.getElementById("debut").value = getTimeNow();
  document.getElementById("cadence").textContent = "0";
  document.getElementById("estimation").textContent = "—";
}

// Sauvegarde
function saveData() {
  localStorage.setItem("syntheseData", JSON.stringify(data));
}

// Calcul durée en heures
function calcHeures(debut, fin) {
  const [hd, md] = debut.split(":").map(Number);
  const [hf, mf] = fin.split(":").map(Number);
  let d = hf + mf/60 - hd - md/60;
  if (d < 0) d += 24;
  return d;
}

// Graphique par ligne
function renderGraph(line) {
  const d = data[line] || [];
  const ctx = document.getElementById("chartLine");
  if (!ctx) return;
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: d.map(x => x.heure),
      datasets: [
        { label: "Quantité", data: d.map(x => x.quantite), backgroundColor: "rgba(0,123,255,0.6)" },
        { label: "Arrêts", data: d.map(x => x.arret), backgroundColor: "rgba(255,99,132,0.6)" }
      ]
    },
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
  });
}

// Historique
function afficherHistorique() {
  const l = currentLine;
  const d = data[l] || [];
  if (!d.length) return alert("Aucun enregistrement pour cette ligne.");
  const hist = d.map((x,i)=>`${i+1}. ${x.date} ${x.heure} - ${x.quantite} colis (${x.cause||"—"})`).join("\n");
  alert(hist);
}

// Export Excel (CSV)
function exportExcel(line) {
  const d = data[line] || [];
  const csv = ["Date;Heure;Début;Fin;Quantité;Cadence;Arrêts;Cause;Commentaire"];
  d.forEach(x => csv.push(`${x.date};${x.heure};${x.debut};${x.fin};${x.quantite};${x.cadence};${x.arret};${x.cause};${x.commentaire}`));
  const blob = new Blob(["\uFEFF" + csv.join("\n")], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `Synthese_${line}_${new Date().toISOString().slice(0,19).replace(/[:T]/g,"-")}.csv`;
  a.click();
}

// Vue Atelier
function showAtelier() {
  const rows = lignes.map(l => {
    const d = data[l] || [];
    const tot = d.reduce((s,x)=>s+(+x.quantite||0),0);
    const arr = d.reduce((s,x)=>s+(+x.arret||0),0);
    const cad = d.length ? (tot/d.length).toFixed(1) : 0;
    return `<tr><td>${l}</td><td>${tot}</td><td>${arr}</td><td>${cad}</td></tr>`;
  }).join("");
  document.getElementById("content").innerHTML = `
    <div class="page fade">
      <h2>Atelier global</h2>
      <table><tr><th>Ligne</th><th>Total</th><th>Arrêts</th><th>Cadence moy.</th></tr>${rows}</table>
      <canvas id="atelierChart"></canvas>
      <div class="boutons"><button onclick="renderMenu()">⬅ Retour menu</button></div>
    </div>`;
  const ctx = document.getElementById("atelierChart");
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: lignes,
      datasets: [{ label:"Total colis", data: lignes.map(l=>(data[l]||[]).reduce((s,x)=>s+(+x.quantite||0),0)), backgroundColor:"rgba(0,123,255,0.6)" }]
    },
    options:{responsive:true, indexAxis:"y"}
  });
}

// Calculatrice
let calcValue="";
function calcPress(v){calcValue+=v;document.getElementById("calcDisplay").value=calcValue;}
function calcEqual(){try{calcValue=eval(calcValue).toString();document.getElementById("calcDisplay").value=calcValue;}catch{calcClear();document.getElementById("calcDisplay").value="Erreur";}}
function calcClear(){calcValue="";document.getElementById("calcDisplay").value="";}
function toggleCalc(){document.getElementById("calculator").classList.toggle("hidden");}

// 🚀 Init
renderMenu();
updateClock();
