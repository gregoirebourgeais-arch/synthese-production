// === Synthèse Production Lactalis — V34 ===
// Persistance par ligne, cadence auto/manuelle, estimation correcte, exports (manuel+auto), arrêts (select), notifications, PWA-ready.

///////////////////////////
// Horloge + équipe
///////////////////////////
function majDateHeureEquipe() {
  const now = new Date();
  const jour = now.toLocaleDateString("fr-FR");
  const heureStr = now.toTimeString().slice(0, 8);
  document.getElementById("dateHeure").innerText = `${jour} - ${heureStr}`;

  const h = now.getHours();
  let equipe = (h >= 5 && h < 13) ? "M" : (h >= 13 && h < 21) ? "AM" : "N";
  document.getElementById("equipe").innerText = `Équipe : ${equipe}`;

  const last = localStorage.getItem("derniereEquipe");
  if (last && last !== equipe) {
    genererExportAutomatique(equipe); // export + bannière
  }
  localStorage.setItem("derniereEquipe", equipe);
}
setInterval(majDateHeureEquipe, 15_000);
majDateHeureEquipe();

///////////////////////////
// État & persistance
///////////////////////////
let ligneActive = null;

// Historique global (ce qui est enregistré)
let historique = JSON.parse(localStorage.getItem("historique")) || {
  production: [],
  arrets: [],
  personnel: [],
  organisation: []
};

// État de formulaire par ligne (ce qui est en cours de saisie)
let formState = JSON.parse(localStorage.getItem("formState")) || {}; // { [ligne]: {heureDebut, heureFin, qte, reste, cadMan, estim} }

function sauvegarder() {
  localStorage.setItem("historique", JSON.stringify(historique));
}
function saveFormState() {
  localStorage.setItem("formState", JSON.stringify(formState));
}

///////////////////////////
// Navigation
///////////////////////////
function changerPage(nom) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll("footer button").forEach(b => b.classList.remove("active"));
  document.getElementById(`page${nom}`).classList.add("active");
  const btn = Array.from(document.querySelectorAll("footer button")).find(b => (b.getAttribute("onclick") || "").includes(nom));
  if (btn) btn.classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

///////////////////////////
// Sélection de ligne
///////////////////////////
function selectLine(ligne) {
  ligneActive = ligne;
  document.getElementById("titreLigne").innerText = `Ligne : ${ligne}`;
  // Charger l'état de formulaire pour cette ligne
  const f = formState[ligneActive] || {};
  document.getElementById("heureDebut").value = f.heureDebut || "";
  document.getElementById("heureFin").value = f.heureFin || "";
  document.getElementById("quantiteRealisee").value = f.qte || "";
  document.getElementById("quantiteRestante").value = f.reste || "";
  document.getElementById("cadenceManuelle").value = f.cadMan || "";
  document.getElementById("estimationFin").value = f.estim || "";
  document.getElementById("formulaireProduction").scrollIntoView({ behavior: "smooth" });
}

///////////////////////////
// Utils temps
///////////////////////////
function minutesDepuisMinuit(hhmm) {
  const [h, m] = (hhmm || "00:00").split(":").map(Number);
  return (h * 60 + (m || 0)) % (24 * 60);
}
function dureeHeures(deb, fin) {
  if (!deb || !fin) return 0;
  let t1 = minutesDepuisMinuit(deb);
  let t2 = minutesDepuisMinuit(fin);
  if (t2 < t1) t2 += 24 * 60; // passage minuit
  return (t2 - t1) / 60;
}
function addMinutesToTime(baseHHMM, minutesToAdd) {
  let t = minutesDepuisMinuit(baseHHMM) + Math.round(minutesToAdd);
  t = ((t % (24 * 60)) + (24 * 60)) % (24 * 60);
  const h = Math.floor(t / 60);
  const m = t % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

///////////////////////////
// Calcul cadence + estimation (Correctif)
///////////////////////////
function calculCadenceEtEstimation() {
  if (!ligneActive) return;

  const heureDebut = document.getElementById("heureDebut").value;
  const heureFin = document.getElementById("heureFin").value;
  const qte = parseFloat(document.getElementById("quantiteRealisee").value) || 0;
  const reste = parseFloat(document.getElementById("quantiteRestante").value) || 0;
  const cadMan = parseFloat(document.getElementById("cadenceManuelle").value) || 0;

  // Cadence effective = manuelle si >0, sinon calculée = qte / durée
  let cad = 0;
  if (cadMan > 0) {
    cad = cadMan;
  } else {
    const dh = dureeHeures(heureDebut, heureFin);
    cad = dh > 0 ? (qte / dh) : 0;
    // On affiche la cadence calculée pour information (non bloquant si 0)
    if (cad > 0) document.getElementById("cadenceManuelle").value = cad.toFixed(1);
  }

  // Estimation : prise sur l'HEURE DE FIN (si vide, on prend l'heure actuelle)
  const baseFin = heureFin || new Date().toTimeString().slice(0, 5);

  if (cad > 0 && reste > 0) {
    const heuresRestantes = reste / cad;                // <<<< FORMULE CORRECTE
    const minutesRestantes = heuresRestantes * 60;
    const est = addMinutesToTime(baseFin, minutesRestantes);
    document.getElementById("estimationFin").value = est;
    // Maj formState
    formState[ligneActive] = {
      ...(formState[ligneActive] || {}),
      heureDebut, heureFin, qte, reste, cadMan: (cadMan || ""), estim: est
    };
    saveFormState();
  } else {
    // Pas d'estimation possible
    document.getElementById("estimationFin").value = "";
    formState[ligneActive] = {
      ...(formState[ligneActive] || {}),
      heureDebut, heureFin, qte, reste, cadMan: (cadMan || ""), estim: ""
    };
    saveFormState();
  }
}

// Recalcul live sur saisies
["heureDebut", "heureFin", "quantiteRealisee", "quantiteRestante", "cadenceManuelle"].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener("input", () => {
      // Persiste par ligne les champs en cours (même si pas d'estimation possible)
      if (ligneActive) {
        formState[ligneActive] = {
          ...(formState[ligneActive] || {}),
          heureDebut: document.getElementById("heureDebut").value,
          heureFin: document.getElementById("heureFin").value,
          qte: document.getElementById("quantiteRealisee").value,
          reste: document.getElementById("quantiteRestante").value,
          cadMan: document.getElementById("cadenceManuelle").value,
          estim: document.getElementById("estimationFin").value
        };
        saveFormState();
      }
      calculCadenceEtEstimation();
    });
  }
});

///////////////////////////
// Enregistrement Production
///////////////////////////
function enregistrerProduction() {
  if (!ligneActive) return alert("Veuillez sélectionner une ligne.");

  const p = {
    date: new Date().toLocaleDateString("fr-FR"),
    heure: new Date().toLocaleTimeString("fr-FR", { hour12: false }).slice(0, 5),
    heureDebut: document.getElementById("heureDebut").value,
    heureFin: document.getElementById("heureFin").value,
    quantiteRealisee: parseFloat(document.getElementById("quantiteRealisee").value) || 0,
    quantiteRestante: parseFloat(document.getElementById("quantiteRestante").value) || 0,
    cadence: parseFloat(document.getElementById("cadenceManuelle").value) || 0,
    estimationFin: document.getElementById("estimationFin").value || "",
    ligne: ligneActive
  };

  // Si cadence 0, tenter un calcul (au cas où)
  if (!p.cadence) {
    const dh = dureeHeures(p.heureDebut, p.heureFin);
    if (dh > 0 && p.quantiteRealisee > 0) p.cadence = +(p.quantiteRealisee / dh).toFixed(1);
  }

  historique.production.push(p);
  sauvegarder();
  afficherHistoriqueProduction();

  // On vide uniquement les quantités (comme demandé)
  document.getElementById("quantiteRealisee").value = "";
  document.getElementById("quantiteRestante").value = "";
  // On garde heures et cadence manuelle dans formState
  if (ligneActive) {
    formState[ligneActive] = {
      ...(formState[ligneActive] || {}),
      qte: "", reste: "",
      heureDebut: p.heureDebut,
      heureFin: p.heureFin,
      cadMan: (p.cadence ? String(p.cadence) : document.getElementById("cadenceManuelle").value),
      estim: document.getElementById("estimationFin").value
    };
    saveFormState();
  }

  alert("✅ Enregistrement effectué !");
}

function annulerDernier() {
  if (!historique.production.length) return;
  historique.production.pop();
  sauvegarder();
  afficherHistoriqueProduction();
  alert("↩️ Dernier enregistrement supprimé.");
}

function remiseZero() {
  if (!confirm("Confirmer la remise à zéro (formulaires) ?")) return;
  // On réinitialise uniquement les formulaires (pas l'historique)
  if (ligneActive) {
    formState[ligneActive] = { heureDebut: "", heureFin: "", qte: "", reste: "", cadMan: "", estim: "" };
    saveFormState();
    selectLine(ligneActive); // recharge
  }
}

///////////////////////////
// Historique Production
///////////////////////////
function afficherHistoriqueProduction() {
  const cont = document.getElementById("historiqueProduction");
  if (!cont) return;
  cont.innerHTML = "";
  // Affiche du + récent au + ancien
  historique.production.slice().reverse().forEach(p => {
    const div = document.createElement("div");
    div.className = "bloc-histo";
    div.innerHTML = `<strong>${p.ligne}</strong> — ${p.date} ${p.heureDebut}–${p.heureFin} :
      ${p.quantiteRealisee} colis • ${p.cadence || 0} c/h • Fin estimée : ${p.estimationFin || "—"}`;
    cont.appendChild(div);
  });
}
afficherHistoriqueProduction();

///////////////////////////
// Arrêts (avec select de ligne)
///////////////////////////
function ajouterArret() {
  const select = document.getElementById("selectLigneArret");
  const ligne = select ? select.value : (ligneActive || "");
  if (!ligne) return alert("Choisissez une ligne d'abord.");
  const motif = prompt("Motif de l'arrêt :");
  const duree = parseInt(prompt("Durée (en minutes) :"), 10);
  if (!motif || !duree || duree <= 0) return;

  const now = new Date();
  historique.arrets.push({
    date: now.toLocaleDateString("fr-FR"),
    heure: now.toTimeString().slice(0, 5),
    ligne,
    duree,
    motif
  });
  sauvegarder();
  afficherArrets();
  alert(`✅ Arrêt ajouté sur ${ligne}`);
}

function afficherArrets() {
  const tbody = document.querySelector("#tableArrets tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  historique.arrets.slice().reverse().forEach(a => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${a.date}</td><td>${a.heure}</td><td>${a.ligne}</td><td>${a.duree}</td><td>${a.motif}</td>`;
    tbody.appendChild(tr);
  });
}
afficherArrets();

///////////////////////////
// Personnel
///////////////////////////
function ajouterPersonnel() {
  const type = document.getElementById("typePersonnel").value;
  const commentaire = (document.getElementById("commentairePersonnel").value || "").trim();
  if (!commentaire) return;
  historique.personnel.push({ date: new Date().toLocaleString("fr-FR"), type, commentaire });
  sauvegarder();
  afficherPersonnel();
  document.getElementById("commentairePersonnel").value = "";
}
function afficherPersonnel() {
  const cont = document.getElementById("listePersonnel");
  if (!cont) return;
  cont.innerHTML = "";
  historique.personnel.slice().reverse().forEach(p => {
    const div = document.createElement("div");
    div.className = "bloc-histo";
    div.innerHTML = `${p.date} — <strong>${p.type}</strong> : ${p.commentaire}`;
    cont.appendChild(div);
  });
}
afficherPersonnel();

///////////////////////////
// Organisation
///////////////////////////
function ajouterOrganisation() {
  const note = (document.getElementById("noteOrganisation").value || "").trim();
  if (!note) return;
  historique.organisation.push({ date: new Date().toLocaleString("fr-FR"), note });
  sauvegarder();
  afficherOrganisation();
  document.getElementById("noteOrganisation").value = "";
}
function afficherOrganisation() {
  const cont = document.getElementById("historiqueOrganisation");
  if (!cont) return;
  cont.innerHTML = "";
  historique.organisation.slice().reverse().forEach(o => {
    const div = document.createElement("div");
    div.className = "bloc-histo";
    div.innerHTML = `${o.date} — ${o.note}`;
    cont.appendChild(div);
  });
}
afficherOrganisation();

///////////////////////////
// Export global (manuel & auto)
///////////////////////////
function exportGlobal(equipeLabel) {
  const wb = XLSX.utils.book_new();
  const all = [
    ["Type", "Date", "Heure/Durée", "Ligne", "Quantité", "Cadence", "Commentaire / Motif / Note"]
  ];

  historique.production.forEach(p => {
    all.push(["Production", p.date, `${p.heureDebut}-${p.heureFin}`, p.ligne, p.quantiteRealisee, p.cadence || "", ""]);
  });
  historique.arrets.forEach(a => {
    all.push(["Arrêt", a.date, `${a.heure} / ${a.duree} min`, a.ligne, "", "", a.motif]);
  });
  historique.personnel.forEach(p => {
    all.push(["Personnel", p.date, "", "", "", "", `${p.type} : ${p.commentaire}`]);
  });
  historique.organisation.forEach(o => {
    all.push(["Organisation", o.date, "", "", "", "", o.note]);
  });

  const ws = XLSX.utils.aoa_to_sheet(all);
  XLSX.utils.book_append_sheet(wb, ws, "Synthèse");
  const nom = `Synthese_${new Date().toLocaleDateString("fr-FR")}_${equipeLabel}.xlsx`;
  XLSX.writeFile(wb, nom);
}

function genererExportAutomatique(equipe) {
  exportGlobal(equipe);
  afficherNotification(`✅ Rapport automatique exporté (Équipe ${equipe})`);
}

document.getElementById("exportAllBtn").addEventListener("click", () => {
  const equipe = (document.getElementById("equipe").innerText.split(":")[1] || "").trim();
  exportGlobal(equipe || "NA");
});

///////////////////////////
// Notification visuelle
///////////////////////////
function afficherNotification(message) {
  let notif = document.createElement("div");
  notif.className = "notification-export";
  notif.textContent = message;
  document.body.appendChild(notif);
  setTimeout(() => notif.classList.add("visible"), 50);
  setTimeout(() => {
    notif.classList.remove("visible");
    setTimeout(() => notif.remove(), 400);
  }, 5000);
}

///////////////////////////
// Service Worker (PWA)
///////////////////////////
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("service-worker.js")
      .then(() => console.log("✅ Service Worker actif"))
      .catch(err => console.error("❌ Erreur SW :", err));
  });
    }
