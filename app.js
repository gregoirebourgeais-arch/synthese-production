// === Synthèse Production Lactalis V33 ===
// Gestion production, arrêts, personnel, organisation, export global

let ligneActive = null;
let historique = JSON.parse(localStorage.getItem("historique")) || {
  production: [],
  arrets: [],
  personnel: [],
  organisation: []
};

// === Fonction utilitaire ===
function sauvegarder() {
  localStorage.setItem("historique", JSON.stringify(historique));
}

// === Mise à jour de la date / heure et équipe ===
function majDateHeureEquipe() {
  const now = new Date();
  const heure = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const jour = now.toLocaleDateString("fr-FR");
  const heureAffichee = `${heure}:${minutes}`;
  document.getElementById("dateHeure").innerText = `${jour} - ${heureAffichee}`;

  let equipe = "";
  if (heure >= 5 && heure < 13) equipe = "M";
  else if (heure >= 13 && heure < 21) equipe = "AM";
  else equipe = "N";

  document.getElementById("equipe").innerText = `Équipe : ${equipe}`;

  // Vérifie si on vient de passer un changement d’équipe
  const derniereEquipe = localStorage.getItem("derniereEquipe");
  if (derniereEquipe && derniereEquipe !== equipe) {
    genererExportAutomatique(equipe);
  }
  localStorage.setItem("derniereEquipe", equipe);
}
setInterval(majDateHeureEquipe, 30000);
majDateHeureEquipe();

// === Navigation ===
function changerPage(nom) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll("footer button").forEach(b => b.classList.remove("active"));
  document.getElementById(`page${nom}`).classList.add("active");
  document.querySelector(`footer button[onclick*='${nom}']`).classList.add("active");
}

// === Sélection ligne ===
function selectLine(ligne) {
  ligneActive = ligne;
  document.getElementById("titreLigne").innerText = `Ligne : ${ligne}`;
  document.getElementById("formulaireProduction").scrollIntoView({ behavior: "smooth" });
}

// === Calcul estimation de fin ===
function calculEstimation() {
  const heureDebut = document.getElementById("heureDebut").value;
  const quantiteRealisee = parseFloat(document.getElementById("quantiteRealisee").value) || 0;
  const quantiteRestante = parseFloat(document.getElementById("quantiteRestante").value) || 0;
  const cadence = parseFloat(document.getElementById("cadenceManuelle").value) || 0;
  if (!heureDebut || cadence === 0) return;

  const totalRestantHeures = quantiteRestante / cadence;
  const [h, m] = heureDebut.split(":").map(Number);
  const dateDebut = new Date();
  dateDebut.setHours(h, m);
  const dateFin = new Date(dateDebut.getTime() + totalRestantHeures * 3600000);
  const finHeure = dateFin.toTimeString().slice(0, 5);
  document.getElementById("estimationFin").value = finHeure;
}
document.getElementById("quantiteRestante").addEventListener("input", calculEstimation);
document.getElementById("cadenceManuelle").addEventListener("input", calculEstimation);

// === Calcul automatique de cadence et estimation de fin ===
function calculCadenceEtEstimation() {
  const debut = document.getElementById("heureDebut").value;
  const fin = document.getElementById("heureFin").value;
  const qte = parseFloat(document.getElementById("quantiteRealisee").value) || 0;
  const restante = parseFloat(document.getElementById("quantiteRestante").value) || 0;

  if (!debut || !fin) return;

  const [h1, m1] = debut.split(":").map(Number);
  const [h2, m2] = fin.split(":").map(Number);
  let t1 = h1 * 60 + m1;
  let t2 = h2 * 60 + m2;
  if (t2 < t1) t2 += 24 * 60; // traverse minuit

  const dureeHeures = (t2 - t1) / 60;
  const cadence = dureeHeures > 0 ? qte / dureeHeures : 0;

  document.getElementById("cadenceManuelle").value = cadence.toFixed(1);

  // Estimation heure de fin en fonction de la cadence
  if (cadence > 0 && restante > 0) {
    const heuresRestantes = restante / cadence;
    const estimation = new Date();
    estimation.setHours(h2, m2);
    estimation.setTime(estimation.getTime() + heuresRestantes * 3600000);
    const heureEstimee = estimation.toTimeString().slice(0, 5);
    document.getElementById("estimationFin").value = heureEstimee;
  }
}

// === Écouteurs automatiques ===
["heureDebut", "heureFin", "quantiteRealisee", "quantiteRestante"].forEach(id => {
  document.getElementById(id).addEventListener("input", calculCadenceEtEstimation);
});

// === Enregistrer production ===
function enregistrerProduction() {
  if (!ligneActive) return alert("Veuillez sélectionner une ligne");
  const data = {
    date: new Date().toLocaleDateString(),
    heureDebut: document.getElementById("heureDebut").value,
    heureFin: document.getElementById("heureFin").value,
    quantiteRealisee: document.getElementById("quantiteRealisee").value,
    quantiteRestante: document.getElementById("quantiteRestante").value,
    cadence: document.getElementById("cadenceManuelle").value,
    estimationFin: document.getElementById("estimationFin").value,
    ligne: ligneActive
  };
  historique.production.push(data);
  sauvegarder();
  afficherHistoriqueProduction();
  alert("✅ Enregistrement effectué !");
  document.getElementById("quantiteRealisee").value = "";
  document.getElementById("quantiteRestante").value = "";
}

// === Historique Production ===
function afficherHistoriqueProduction() {
  const cont = document.getElementById("historiqueProduction");
  cont.innerHTML = "";
  historique.production.slice().reverse().forEach((p) => {
    const bloc = document.createElement("div");
    bloc.className = "bloc-histo";
    bloc.innerHTML = `<strong>${p.ligne}</strong> — ${p.date} ${p.heureDebut}–${p.heureFin} :
      ${p.quantiteRealisee} colis (${p.cadence} c/h)`;
    cont.appendChild(bloc);
  });
}
afficherHistoriqueProduction();

// === Annuler dernier ===
function annulerDernier() {
  historique.production.pop();
  sauvegarder();
  afficherHistoriqueProduction();
}

// === Remise à zéro ===
function remiseZero() {
  if (confirm("Confirmer la remise à zéro de la session ?")) {
    historique.production = [];
    sauvegarder();
    afficherHistoriqueProduction();
  }
}

// === PAGE ARRETS ===
function ajouterArret() {
  const ligne = document.getElementById("selectLigneArret").value;
  const motif = prompt("Motif de l'arrêt :");
  const duree = prompt("Durée (en minutes) :");
  if (!ligne || !motif || !duree) return;
  const now = new Date();
  historique.arrets.push({
    date: now.toLocaleDateString(),
    heure: now.toTimeString().slice(0, 5),
    ligne,
    duree,
    motif
  });
  sauvegarder();
  afficherArrets();
}

function afficherArrets() {
  const tbody = document.querySelector("#tableArrets tbody");
  tbody.innerHTML = "";
  historique.arrets.slice().reverse().forEach(a => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${a.date}</td><td>${a.heure}</td><td>${a.ligne}</td><td>${a.duree}</td><td>${a.motif}</td>`;
    tbody.appendChild(tr);
  });
}
afficherArrets();

// === PAGE PERSONNEL ===
function ajouterPersonnel() {
  const type = document.getElementById("typePersonnel").value;
  const commentaire = document.getElementById("commentairePersonnel").value;
  if (!commentaire) return;
  historique.personnel.push({
    date: new Date().toLocaleString(),
    type,
    commentaire
  });
  sauvegarder();
  afficherPersonnel();
}
function afficherPersonnel() {
  const cont = document.getElementById("listePersonnel");
  cont.innerHTML = "";
  historique.personnel.slice().reverse().forEach(p => {
    const bloc = document.createElement("div");
    bloc.className = "bloc-histo";
    bloc.innerHTML = `${p.date} — <strong>${p.type}</strong> : ${p.commentaire}`;
    cont.appendChild(bloc);
  });
}
afficherPersonnel();

// === PAGE ORGANISATION ===
function ajouterOrganisation() {
  const note = document.getElementById("noteOrganisation").value.trim();
  if (!note) return;
  historique.organisation.push({
    date: new Date().toLocaleString(),
    note
  });
  sauvegarder();
  afficherOrganisation();
  document.getElementById("noteOrganisation").value = "";
}
function afficherOrganisation() {
  const cont = document.getElementById("historiqueOrganisation");
  cont.innerHTML = "";
  historique.organisation.slice().reverse().forEach(o => {
    const bloc = document.createElement("div");
    bloc.className = "bloc-histo";
    bloc.innerHTML = `${o.date} — ${o.note}`;
    cont.appendChild(bloc);
  });
}
afficherOrganisation();

// === EXPORT GLOBAL AUTOMATIQUE ===
function genererExportAutomatique(equipe) {
  const wb = XLSX.utils.book_new();
  const toutesDonnees = [
    ["Type", "Date", "Heure", "Ligne", "Durée", "Quantité", "Cadence", "Commentaire / Motif / Note"]
  ];

  historique.production.forEach(p => {
    toutesDonnees.push(["Production", p.date, `${p.heureDebut}-${p.heureFin}`, p.ligne, "", p.quantiteRealisee, p.cadence, ""]);
  });
  historique.arrets.forEach(a => {
    toutesDonnees.push(["Arrêt", a.date, a.heure, a.ligne, a.duree, "", "", a.motif]);
  });
  historique.personnel.forEach(p => {
    toutesDonnees.push(["Personnel", p.date, "", "", "", "", "", `${p.type}: ${p.commentaire}`]);
  });
  historique.organisation.forEach(o => {
    toutesDonnees.push(["Organisation", o.date, "", "", "", "", "", o.note]);
  });

  const ws = XLSX.utils.aoa_to_sheet(toutesDonnees);
  XLSX.utils.book_append_sheet(wb, ws, "Synthèse");
  const nomFichier = `Synthese_${new Date().toLocaleDateString()}_${equipe}.xlsx`;
  XLSX.writeFile(wb, nomFichier);
  alert("📊 Rapport automatique exporté !");
}

// === Export global manuel ===
document.getElementById("exportAllBtn").addEventListener("click", () => {
  const equipe = document.getElementById("equipe").innerText.split(": ")[1];
  genererExportAutomatique(equipe);
});

// === Notification visuelle de confirmation export automatique ===
function afficherNotification(message) {
  let notif = document.createElement("div");
  notif.className = "notification-export";
  notif.textContent = message;
  document.body.appendChild(notif);
  setTimeout(() => notif.classList.add("visible"), 100); // apparition fluide
  setTimeout(() => {
    notif.classList.remove("visible");
    setTimeout(() => notif.remove(), 500);
  }, 5000);
}

// Modification de la fonction genererExportAutomatique :
function genererExportAutomatique(equipe) {
  const wb = XLSX.utils.book_new();
  const toutesDonnees = [
    ["Type", "Date", "Heure", "Ligne", "Durée", "Quantité", "Cadence", "Commentaire / Motif / Note"]
  ];

  historique.production.forEach(p => {
    toutesDonnees.push(["Production", p.date, `${p.heureDebut}-${p.heureFin}`, p.ligne, "", p.quantiteRealisee, p.cadence, ""]);
  });
  historique.arrets.forEach(a => {
    toutesDonnees.push(["Arrêt", a.date, a.heure, a.ligne, a.duree, "", "", a.motif]);
  });
  historique.personnel.forEach(p => {
    toutesDonnees.push(["Personnel", p.date, "", "", "", "", "", `${p.type}: ${p.commentaire}`]);
  });
  historique.organisation.forEach(o => {
    toutesDonnees.push(["Organisation", o.date, "", "", "", "", "", o.note]);
  });

  const ws = XLSX.utils.aoa_to_sheet(toutesDonnees);
  XLSX.utils.book_append_sheet(wb, ws, "Synthèse");
  const nomFichier = `Synthese_${new Date().toLocaleDateString()}_${equipe}.xlsx`;
  XLSX.writeFile(wb, nomFichier);

  afficherNotification(`✅ Rapport automatique exporté (Équipe ${equipe})`);
}

// === Service Worker ===
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("service-worker.js")
      .then(() => console.log("✅ Service Worker actif"))
      .catch(err => console.error("❌ Erreur SW :", err));
  });
    }
