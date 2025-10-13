// ===== Données globales =====
const lignes = ["Râpé","T2","RT","OMORI","T1","Sticks","Emballage","Dés","Filets","Prédécoupé"];

let prod = JSON.parse(localStorage.getItem("prod")) || {};        // données validées par ligne
let prodTemp = JSON.parse(localStorage.getItem("prodTemp")) || {}; // saisies en cours (persistantes avant validation)
let arrets = JSON.parse(localStorage.getItem("arrets")) || [];
let personnel = JSON.parse(localStorage.getItem("personnel")) || [];
let consignes = JSON.parse(localStorage.getItem("consignes")) || [];

let atelierChart = null;

// ===== Date / heure / équipe auto =====
function updateHeader() {
  const now = new Date();
  const week = getWeekNumber(now);
  const dateStr = now.toLocaleDateString("fr-FR",{weekday:"long", day:"2-digit", month:"long", year:"numeric"});
  const timeStr = now.toLocaleTimeString("fr-FR",{hour:"2-digit", minute:"2-digit"});
  document.getElementById("date-info").textContent = `${dateStr} — Semaine ${week} — ${timeStr}`;
  document.getElementById("equipe-info").innerHTML = `Équipe : <b>${getEquipe(now)}</b>`;
}
setInterval(updateHeader, 1000);
updateHeader();

function getWeekNumber(d){
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil(((d - yearStart)/86400000 + 1)/7);
}
function getEquipe(date){
  const h = date.getHours();
  if (h>=5 && h<13) return "M (5h–13h)";
  if (h>=13 && h<21) return "AM (13h–21h)";
  return "N (21h–5h)";
}

// ===== Navigation =====
function openSection(id){
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(id).classList.add("active");

  if (id==="production"){ renderButtonsLignes(); if (!document.getElementById("ligne-content").innerHTML) { /* rien */ } }
  if (id==="arrets"){ renderArrets(); }
  if (id==="personnel"){ renderPersonnel(); }
  if (id==="organisation"){ renderConsignes(); }
  if (id==="atelier"){ renderAtelierChart(); }
}

// ===== Production : boutons lignes =====
function renderButtonsLignes(){
  const wrap = document.getElementById("buttons-lignes");
  wrap.innerHTML = "";
  lignes.forEach(l => {
    const b = document.createElement("button");
    b.textContent = l;
    b.onclick = ()=> openLigne(l);
    wrap.appendChild(b);
  });
}
renderButtonsLignes();

// ===== Ouvrir une ligne (form complet + persistance provisoire) =====
function openLigne(ligne){
  const c = document.getElementById("ligne-content");
  const t = prodTemp[ligne] || {};
  const v = prod[ligne] || {};

  c.innerHTML = `
    <div class="card">
      <h3>${ligne}</h3>

      <label>Heure de début :</label>
      <input id="deb-${ligne}" type="time" value="${t.deb ?? v.deb ?? ""}" />

      <label>Heure de fin :</label>
      <input id="fin-${ligne}" type="time" value="${t.fin ?? v.fin ?? ""}" />

      <label>Quantité réalisée :</label>
      <input id="qte-${ligne}" type="number" value="${t.qte ?? v.qte ?? ""}" placeholder="Nombre de colis" />

      <label>Cadence manuelle (colis/h) :</label>
      <input id="cadm-${ligne}" type="number" value="${t.cadm ?? v.cadm ?? ""}" placeholder="Optionnel" />

      <label>Quantité restante :</label>
      <input id="rest-${ligne}" type="number" value="${t.rest ?? v.rest ?? ""}" placeholder="Quantité à produire..." />

      <label>Estimation de fin :</label>
      <input id="est-${ligne}" type="text" value="${t.est ?? v.est ?? ""}" readonly />

      <div style="display:flex; gap:8px; justify-content:center; margin-top:8px;">
        <button onclick="saveLigne('${ligne}')">💾 Enregistrer</button>
        <button onclick="retourProduction()">⬅️ Retour</button>
      </div>
    </div>
  `;

  // écouteurs: persistance provisoire + estimation auto sur 'rest' / 'cadm'
  ["deb","fin","qte","cadm","rest"].forEach(k=>{
    const el = document.getElementById(`${k}-${ligne}`);
    el.addEventListener("input", ()=>{
      // mettre à jour temp
      prodTemp[ligne] = {
        deb: document.getElementById(`deb-${ligne}`).value,
        fin: document.getElementById(`fin-${ligne}`).value,
        qte: document.getElementById(`qte-${ligne}`).value,
        cadm: document.getElementById(`cadm-${ligne}`).value,
        rest: document.getElementById(`rest-${ligne}`).value,
        est: document.getElementById(`est-${ligne}`).value
      };
      localStorage.setItem("prodTemp", JSON.stringify(prodTemp));

      // estimation : dès que rest/cadm change
      if (k==="rest" || k==="cadm") {
        majEstimation(ligne);
      }
    });
  });

  // graphique mini-ligne (optionnel : on utilise atelier pour global)
}

function majEstimation(ligne){
  const rest = +document.getElementById(`rest-${ligne}`).value || 0;
  const cadm = +document.getElementById(`cadm-${ligne}`).value || 0;

  if (rest>0 && cadm>0) {
    const h = rest / cadm;
    const d = new Date();
    d.setMinutes(d.getMinutes() + h*60);
    document.getElementById(`est-${ligne}`).value = d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
  } else {
    document.getElementById(`est-${ligne}`).value = "";
  }

  // maj temp
  prodTemp[ligne] = {
    deb: document.getElementById(`deb-${ligne}`).value,
    fin: document.getElementById(`fin-${ligne}`).value,
    qte: document.getElementById(`qte-${ligne}`).value,
    cadm: document.getElementById(`cadm-${ligne}`).value,
    rest: document.getElementById(`rest-${ligne}`).value,
    est: document.getElementById(`est-${ligne}`).value
  };
  localStorage.setItem("prodTemp", JSON.stringify(prodTemp));
}

function saveLigne(ligne){
  const deb = document.getElementById(`deb-${ligne}`).value;
  const fin = document.getElementById(`fin-${ligne}`).value;
  const qte = +document.getElementById(`qte-${ligne}`).value || 0;
  const cadm = +document.getElementById(`cadm-${ligne}`).value || 0;
  const rest = +document.getElementById(`rest-${ligne}`).value || 0;
  const est = document.getElementById(`est-${ligne}`).value || "";

  // cadence auto si pas de manuelle
  let cadence = cadm;
  if (!cadence && deb && fin && qte) {
    const diff = durationHours(deb, fin);
    cadence = diff>0 ? +(qte/diff).toFixed(2) : 0;
  }

  prod[ligne] = { deb, fin, qte, cadm: cadence, rest, est, time: new Date().toLocaleString("fr-FR") };
  localStorage.setItem("prod", JSON.stringify(prod));

  // nettoyer les champs (reset de la fiche) ET purger la saisie provisoire
  delete prodTemp[ligne];
  localStorage.setItem("prodTemp", JSON.stringify(prodTemp));

  alert(`✅ ${ligne} enregistrée (cadence: ${cadence || 0} u/h)`);
  // revenir à la liste des lignes
  retourProduction();
  renderAtelierChart();
}

function durationHours(start,end){
  if (!start || !end) return 0;
  const [sh,sm]=start.split(":").map(Number);
  const [eh,em]=end.split(":").map(Number);
  let d=(eh+em/60)-(sh+sm/60);
  if (d<0) d+=24;
  return d;
}
function retourProduction(){
  document.getElementById("ligne-content").innerHTML = "";
}

// ===== Arrêts =====
function saveArret(){
  const ligne = document.getElementById("arret-ligne").value;
  const duree = +document.getElementById("arret-duree").value || 0;
  const cause = document.getElementById("arret-cause").value.trim();
  const com = document.getElementById("arret-com").value.trim();
  if (!ligne) return alert("Choisir une ligne.");
  if (!duree) return alert("Durée obligatoire.");
  if (!cause) return alert("Cause obligatoire.");

  arrets.unshift({ ligne, duree, cause, com, date: new Date().toLocaleString("fr-FR") });
  localStorage.setItem("arrets", JSON.stringify(arrets));

  // reset formulaire
  document.getElementById("form-arret").reset();
  renderArrets();
}
function renderArrets(){
  const wrap = document.getElementById("liste-arrets");
  wrap.innerHTML = arrets.length ? "" : "<p>Aucun arrêt pour l’instant.</p>";
  arrets.forEach(a=>{
    const d=document.createElement("div");
    d.className="card";
    d.innerHTML = `<p><b>${a.ligne}</b> — ${a.date}</p>
                   <p>${a.duree} min — ${a.cause}</p>
                   ${a.com ? `<p>${a.com}</p>` : ""}`;
    wrap.appendChild(d);
  });
}

// ===== Personnel =====
function savePersonnel(){
  const type = document.getElementById("typePersonnel").value;
  const com = document.getElementById("commentairePersonnel").value.trim();
  personnel.unshift({ type, com, date: new Date().toLocaleString("fr-FR") });
  localStorage.setItem("personnel", JSON.stringify(personnel));
  document.getElementById("form-pers").reset();
  renderPersonnel();
}
function renderPersonnel(){
  const wrap = document.getElementById("historiquePersonnel");
  wrap.innerHTML = personnel.length ? "" : "<p>Aucune entrée.</p>";
  personnel.forEach(p=>{
    const d=document.createElement("div");
    d.className="card";
    d.innerHTML = `<p><b>${p.type}</b> — ${p.date}</p>${p.com?`<p>${p.com}</p>`:""}`;
    wrap.appendChild(d);
  });
}

// ===== Organisation / Consignes =====
function saveConsigne(){
  const auteur = document.getElementById("auteurConsigne").value.trim() || "Anonyme";
  const texte = document.getElementById("texteConsigne").value.trim();
  if (!texte) return alert("Saisir une consigne.");
  consignes.unshift({ auteur, texte, date: new Date().toLocaleString("fr-FR") });
  localStorage.setItem("consignes", JSON.stringify(consignes));
  document.getElementById("form-consigne").reset();
  renderConsignes();
}
function renderConsignes(){
  // purge >7 jours seulement visuelle (on garde export possible en récupérant consignes avant purge si besoin)
  consignes = consignes.filter(c => (Date.now()-new Date(c.date).getTime()) < 7*24*3600*1000);
  localStorage.setItem("consignes", JSON.stringify(consignes));
  const wrap = document.getElementById("historiqueConsignes");
  wrap.innerHTML = consignes.length ? "" : "<p>Aucune consigne récente.</p>";
  consignes.forEach(c=>{
    const d=document.createElement("div");
    d.className="card";
    d.innerHTML = `<p><b>${c.auteur}</b> — ${c.date}</p><p>${c.texte}</p>`;
    wrap.appendChild(d);
  });
}

// ===== Atelier (graph cadences par ligne) =====
function renderAtelierChart(){
  const ctx = document.getElementById("atelierChart");
  if (!ctx) return;
  const labels = lignes;
  const values = labels.map(l => +(prod[l]?.cadm || 0));

  if (atelierChart) atelierChart.destroy();
  atelierChart = new Chart(ctx, {
    type:"bar",
    data:{
      labels,
      datasets:[{label:"Cadence (colis/h)", data: values, backgroundColor:"#007bff"}]
    },
    options:{responsive:true, scales:{y:{beginAtZero:true}}}
  });
}

// ===== Export & Reset global =====
function exportAtelier(){
  let csv="Ligne;HeureDébut;HeureFin;Quantité;Cadence;Reste;Estimation;Horodatage\n";
  lignes.forEach(l=>{
    const d=prod[l];
    if (d){
      csv += `${l};${d.deb||""};${d.fin||""};${d.qte||0};${d.cadm||0};${d.rest||0};${d.est||""};${d.time||""}\n`;
    }
  });
  const blob=new Blob([csv],{type:"text/csv"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download=`atelier-export-${new Date().toISOString().slice(0,19)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
function resetAll(){
  if (!confirm("Exporter puis remettre à zéro toute l’application ?")) return;
  exportAtelier();
  prod = {}; prodTemp = {}; arrets = []; personnel = []; consignes = [];
  localStorage.removeItem("prod"); localStorage.removeItem("prodTemp");
  localStorage.removeItem("arrets"); localStorage.removeItem("personnel"); localStorage.removeItem("consignes");
  document.getElementById("ligne-content").innerHTML = "";
  renderButtonsLignes(); renderArrets(); renderPersonnel(); renderConsignes(); renderAtelierChart();
  alert("🔄 Réinitialisation effectuée (export enregistré).");
}

// ===== Init =====
openSection("production");
renderArrets(); renderPersonnel(); renderConsignes(); renderAtelierChart();
