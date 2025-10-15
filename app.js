// ==================== VARIABLES GLOBALES ====================
let ligneSelectionnee = null;
let data = JSON.parse(localStorage.getItem("syntheseData")) || {
  production: {},
  arrets: [],
  personnel: [],
  organisation: []
};

// ==================== AFFICHAGE SECTIONS ====================
function showSection(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ==================== LIGNE SELECTIONNEE ====================
function selectLine(ligne) {
  ligneSelectionnee = ligne;
  document.getElementById("nomLigne").innerText = "Ligne : " + ligne;
  const temp = JSON.parse(localStorage.getItem(`temp_${ligne}`)) || {};
  document.getElementById("quantiteRealisee").value = temp.quantiteRealisee || "";
  document.getElementById("quantiteRestante").value = temp.quantiteRestante || "";
  document.getElementById("cadenceManuelle").value = temp.cadenceManuelle || "";
  document.getElementById("heureDebut").value = temp.heureDebut || "";
  document.getElementById("heureFin").value = temp.heureFin || "";
  chargerHistoriqueProduction();
}

// ==================== PERSISTANCE TEMPORAIRE PAR LIGNE ====================
function sauvegarderTemporaire() {
  if (!ligneSelectionnee) return;
  const temp = {
    quantiteRealisee: document.getElementById("quantiteRealisee").value,
    quantiteRestante: document.getElementById("quantiteRestante").value,
    cadenceManuelle: document.getElementById("cadenceManuelle").value,
    heureDebut: document.getElementById("heureDebut").value,
    heureFin: document.getElementById("heureFin").value
  };
  localStorage.setItem(`temp_${ligneSelectionnee}`, JSON.stringify(temp));
}

// ==================== ENREGISTREMENT PRODUCTION ====================
function enregistrerProduction() {
  if (!ligneSelectionnee) return alert("Sélectionnez une ligne !");
  const hD = document.getElementById("heureDebut").value;
  const hF = document.getElementById("heureFin").value;
  const qR = Number(document.getElementById("quantiteRealisee").value);
  const qRest = Number(document.getElementById("quantiteRestante").value);
  const cadenceM = Number(document.getElementById("cadenceManuelle").value);

  const duree = calculerDuree(hD, hF);
  const cadence = cadenceM || (duree > 0 ? (qR / duree).toFixed(1) : 0);
  const estimationFin = calculerEstimation();

  if (!data.production[ligneSelectionnee]) data.production[ligneSelectionnee] = [];
  data.production[ligneSelectionnee].push({
    date: new Date().toLocaleString(),
    heureDebut: hD,
    heureFin: hF,
    quantite: qR,
    cadence: cadence,
    estimationFin: estimationFin
  });

  localStorage.setItem("syntheseData", JSON.stringify(data));
  localStorage.removeItem(`temp_${ligneSelectionnee}`);
  chargerHistoriqueProduction();

  document.querySelectorAll("#formProduction input").forEach(el => el.value = "");
  alert("Production enregistrée !");
}

// ==================== CALCUL DUREE ====================
function calculerDuree(debut, fin) {
  if (!debut || !fin) return 0;
  const d = new Date(`2024-01-01T${debut}`);
  const f = new Date(`2024-01-01T${fin}`);
  let diff = (f - d) / 3600000;
  if (diff < 0) diff += 24;
  return diff;
}

// ==================== CALCUL ESTIMATION FIN ====================
function calculerEstimation() {
  const qRest = Number(document.getElementById("quantiteRestante").value);
  const cadenceM = Number(document.getElementById("cadenceManuelle").value);
  if (!qRest || !cadenceM) {
    document.getElementById("estimationFin").value = "";
    return "";
  }
  const heuresRestantes = qRest / cadenceM;
  const finEstimee = new Date(Date.now() + heuresRestantes * 3600000);
  const heureStr = finEstimee.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  document.getElementById("estimationFin").value = heureStr;
  return heureStr;
}

// ==================== HISTORIQUE PRODUCTION ====================
function chargerHistoriqueProduction() {
  const zone = document.getElementById("historiqueProduction");
  zone.innerHTML = "";
  if (!ligneSelectionnee || !data.production[ligneSelectionnee]) return;
  data.production[ligneSelectionnee].forEach((p, i) => {
    const div = document.createElement("div");
    div.textContent = `${p.date} — ${p.quantite} colis — ${p.cadence} colis/h — Fin estimée ${p.estimationFin}`;
    const btn = document.createElement("button");
    btn.textContent = "🗑️";
    btn.onclick = () => supprimerEnregistrement(ligneSelectionnee, i);
    div.appendChild(btn);
    zone.appendChild(div);
  });
}

function supprimerEnregistrement(ligne, index) {
  if (!confirm("Supprimer cet enregistrement ?")) return;
  data.production[ligne].splice(index, 1);
  localStorage.setItem("syntheseData", JSON.stringify(data));
  chargerHistoriqueProduction();
}

// ==================== ARRETS ====================
function enregistrerArret() {
  const ligne = document.getElementById("ligneArret").value;
  const duree = Number(document.getElementById("dureeArret").value);
  const motif = document.getElementById("motifArret").value;
  if (!ligne || !duree || !motif) return alert("Complétez tous les champs !");
  data.arrets.push({
    date: new Date().toLocaleString(),
    ligne,
    duree,
    motif
  });
  localStorage.setItem("syntheseData", JSON.stringify(data));
  document.getElementById("dureeArret").value = "";
  document.getElementById("motifArret").value = "";
  chargerHistoriqueArrets();
}

function chargerHistoriqueArrets() {
  const zone = document.getElementById("historiqueArrets");
  zone.innerHTML = "";
  data.arrets.forEach(a => {
    const div = document.createElement("div");
    div.textContent = `${a.date} — ${a.ligne} : ${a.duree} min (${a.motif})`;
    zone.appendChild(div);
  });
}

// ==================== PERSONNEL ====================
function enregistrerPersonnel() {
  const nom = document.getElementById("nomEmploye").value;
  const statut = document.getElementById("statutEmploye").value;
  if (!nom) return alert("Entrez un nom !");
  data.personnel.push({
    date: new Date().toLocaleString(),
    nom,
    statut
  });
  localStorage.setItem("syntheseData", JSON.stringify(data));
  document.getElementById("nomEmploye").value = "";
  chargerHistoriquePersonnel();
}

function chargerHistoriquePersonnel() {
  const zone = document.getElementById("historiquePersonnel");
  zone.innerHTML = "";
  data.personnel.forEach(p => {
    const div = document.createElement("div");
    div.textContent = `${p.date} — ${p.nom} : ${p.statut}`;
    zone.appendChild(div);
  });
}

// ==================== ORGANISATION ====================
function enregistrerOrganisation() {
  const texte = document.getElementById("consigneOrganisation").value;
  if (!texte) return;
  data.organisation.push({
    date: new Date().toLocaleString(),
    texte
  });
  localStorage.setItem("syntheseData", JSON.stringify(data));
  document.getElementById("consigneOrganisation").value = "";
  chargerHistoriqueOrganisation();
}

function chargerHistoriqueOrganisation() {
  const zone = document.getElementById("historiqueOrganisation");
  zone.innerHTML = "";
  data.organisation.forEach(c => {
    const div = document.createElement("div");
    div.textContent = `${c.date} — ${c.texte}`;
    zone.appendChild(div);
  });
}

// ==================== CALCULATRICE ====================
function ouvrirCalculatrice() {
  let calc = document.getElementById("calculatrice");
  if (!calc) {
    calc = document.createElement("div");
    calc.id = "calculatrice";
    calc.className = "calculatrice";
    calc.innerHTML = `
      <div class="close-btn" onclick="fermerCalculatrice()">❌</div>
      <input id="calcDisplay" readonly style="width:100%;margin-bottom:5px;" />
      <div id="calcButtons"></div>`;
    document.body.appendChild(calc);
    const keys = ["7","8","9","/","4","5","6","*","1","2","3","-","0",".","=","+"];
    keys.forEach(k => {
      const b = document.createElement("button");
      b.textContent = k;
      b.onclick = () => appuyerTouche(k);
      document.getElementById("calcButtons").appendChild(b);
    });
  }
  calc.style.display = "block";
}

function fermerCalculatrice() {
  document.getElementById("calculatrice").style.display = "none";
}

function appuyerTouche(k) {
  const disp = document.getElementById("calcDisplay");
  if (k === "=") {
    try { disp.value = eval(disp.value); } catch { disp.value = "Err"; }
  } else disp.value += k;
}

// ==================== EXPORT EXCEL ====================
function exportGlobal() {
  const wsData = [["Date", "Ligne", "Quantité", "Cadence", "Fin estimée"]];
  Object.keys(data.production).forEach(ligne => {
    data.production[ligne].forEach(p => {
      wsData.push([p.date, ligne, p.quantite, p.cadence, p.estimationFin]);
    });
  });
  wsData.push([""]);
  wsData.push(["=== ARRÊTS ==="]);
  wsData.push(["Date", "Ligne", "Durée (min)", "Motif"]);
  data.arrets.forEach(a => wsData.push([a.date, a.ligne, a.duree, a.motif]));

  wsData.push([""]);
  wsData.push(["=== PERSONNEL ==="]);
  wsData.push(["Date", "Nom", "Statut"]);
  data.personnel.forEach(p => wsData.push([p.date, p.nom, p.statut]));

  wsData.push([""]);
  wsData.push(["=== ORGANISATION ==="]);
  wsData.push(["Date", "Consigne"]);
  data.organisation.forEach(c => wsData.push([c.date, c.texte]));

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Synthèse");
  const nom = `Synthese_Lactalis_${new Date().toISOString().slice(0,10)}.xlsx`;
  XLSX.writeFile(wb, nom);
}

// ==================== HORLOGE + EQUIPE ====================
function majHeure() {
  const now = new Date();
  document.getElementById("dateHeure").textContent = now.toLocaleString();
  const h = now.getHours();
  const equipe = h >= 5 && h < 13 ? "M" : h >= 13 && h < 21 ? "AM" : "N";
  document.getElementById("equipeActuelle").textContent = "Équipe actuelle : " + equipe;
}
setInterval(majHeure, 1000);

// ==================== INITIALISATION ====================
window.onload = () => {
  majHeure();
  chargerHistoriqueArrets();
  chargerHistoriquePersonnel();
  chargerHistoriqueOrganisation();
};
