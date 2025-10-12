/* ===== Config / State ===== */
const LIGNES = ["Râpé","T2","RT","OMORI","T1","Sticks","Emballage","Dés","Filets","Prédécoupé"];
const STORE_KEY = "syntheseDataV17";

let DATA = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
LIGNES.forEach(l => { if (!Array.isArray(DATA[l])) DATA[l] = []; });

/* Sauvegarde périodique & à la fermeture */
const save = () => localStorage.setItem(STORE_KEY, JSON.stringify(DATA));
setInterval(save, 15000);
addEventListener("beforeunload", save);

/* Meta (date/heure + semaine) */
function renderMetaTop(){
  const now = new Date();
  const week = getWeekNumber(now);
  document.getElementById("metaTop").textContent =
    now.toLocaleDateString("fr-FR", {weekday:"long", day:"2-digit", month:"2-digit", year:"numeric"}) +
    ` — Semaine ${week} — ` +
    now.toLocaleTimeString("fr-FR", {hour:"2-digit",minute:"2-digit"});
}
setInterval(renderMetaTop, 30_000);
addEventListener("DOMContentLoaded", renderMetaTop);

function getWeekNumber(d){
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7; // 1..7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

/* ===== Navigation ===== */
addEventListener("DOMContentLoaded", () => {
  openPage("atelier");
});

function openPage(page){
  const zone = document.getElementById("content");
  if (page === "atelier") renderAtelier(zone);
  else renderLigne(page, zone);
}

/* ===== Vue Atelier ===== */
function renderAtelier(zone){
  const totals = LIGNES.map(l => ({
    ligne: l,
    total: sum(DATA[l].map(r => r.qte || 0)),
    arrets: sum(DATA[l].map(r => r.arretMin || 0)),
    cadence: cadenceMoyenne(DATA[l])
  }));

  zone.innerHTML = `
    <section class="card">
      <h2 style="margin-top:0">Atelier</h2>
      <div class="meta">Vue d’ensemble — Total / Arrêts / Cadence</div>
      <div class="card" style="overflow:auto; margin-top:12px">
        <table class="table atelier-table">
          <thead><tr>
            <th>Ligne</th><th class="t-num">Total</th><th class="t-num">Arrêts (min)</th><th class="t-num">Cadence (colis/h)</th>
          </tr></thead>
          <tbody>
            ${totals.map(t => `
              <tr>
                <td>${t.ligne}</td>
                <td class="t-num">${t.total}</td>
                <td class="t-num">${t.arrets}</td>
                <td class="t-num">${fmt(t.cadence)}</td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>

      <div class="card">
        <canvas id="atelierChart" height="170"></canvas>
      </div>
    </section>
  `;

  const ctx = document.getElementById("atelierChart");
  const labels = totals.map(t => t.ligne);
  const dataVals = totals.map(t => t.total);

  // barres horizontales = indexAxis:'y'
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Total colis',
        data: dataVals
      }]
    },
    options: {
      indexAxis: 'y',
      animation: false,
      responsive: true,
      plugins:{legend:{position:'top'}}
    }
  });
}

/* ===== Vue Ligne ===== */
function renderLigne(ligne, zone){
  const history = DATA[ligne];
  const total = sum(history.map(r => r.qte || 0));
  const cad = cadenceMoyenne(history);

  zone.innerHTML = `
    <section class="card">
      <h2 style="margin-top:0">${ligne}</h2>
      <div class="meta" id="lineMeta"></div>

      <div class="grid" style="margin-top:6px">
        <div><input id="q1" type="number" class="input" placeholder="Entrer quantité…" /></div>
        <div><input id="q2" type="number" class="input" placeholder="Ajouter quantité…" /></div>
        <div><input id="arret" type="number" class="input" placeholder="Temps d'arrêt (min)…" /></div>
        <div><input id="cause" class="input" placeholder="Cause d'arrêt…" /></div>
        <div style="grid-column:1/-1"><textarea id="comment" class="input" rows="2" placeholder="Commentaire…"></textarea></div>
        <div style="grid-column:1/-1"><input id="reste" type="number" class="input" placeholder="Quantité restante…" /></div>
      </div>

      <div class="actions">
        <button class="btn" onclick="enregistrer('${ligne}')">💾 Enregistrer</button>
        <button class="btn secondary" onclick="annulerDernier('${ligne}')">↩️ Annuler dernier</button>
        <button class="btn secondary" onclick="ouvrirHistorique('${ligne}')">📜 Historique</button>
        <button class="btn secondary" onclick="exportExcel('${ligne}')">📦 Export Excel</button>
        <button class="btn warn" onclick="remiseZeroAffichage('${ligne}')">♻️ Remise à zéro (affichage)</button>
      </div>

      <p class="meta"><b>Total :</b> <span id="totalSpan">${total}</span> colis — 
      <b>Cadence moyenne :</b> <span id="cadSpan">${fmt(cad)}</span> colis/h</p>

      <div class="card">
        <canvas id="lineChart" height="170"></canvas>
      </div>
    </section>
  `;

  updateLineMeta();
  drawLineChart(ligne);
}

function updateLineMeta(){
  const now = new Date();
  const week = getWeekNumber(now);
  document.getElementById("lineMeta").textContent =
    now.toLocaleDateString("fr-FR",{weekday:"long",day:"2-digit",month:"2-digit",year:"numeric"})+
    ` — Semaine ${week} — `+
    now.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
}

function drawLineChart(ligne){
  const history = DATA[ligne];
  const ctx = document.getElementById("lineChart");
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: history.map(r => new Date(r.ts).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})),
      datasets: [
        {label:'Quantité', data: history.map(r => r.qte || 0), tension:.3},
        {label:'Arrêts (min)', data: history.map(r => r.arretMin || 0), tension:.3}
      ]
    },
    options: {animation:false,responsive:true}
  });
}

/* ===== Enregistrement / actions ===== */
function enregistrer(ligne){
  const q1 = +document.getElementById("q1").value || 0;
  const q2 = +document.getElementById("q2").value || 0;
  const arret = +document.getElementById("arret").value || 0;
  const cause = document.getElementById("cause").value.trim();
  const comment = document.getElementById("comment").value.trim();
  const reste = +document.getElementById("reste").value || 0;

  const now = new Date();
  // heure début = heure fin de la dernière saisie si dispo
  const last = DATA[ligne][DATA[ligne].length-1];
  const hDeb = last ? last.hFin : now.toTimeString().slice(0,5);
  const hFin = now.toTimeString().slice(0,5);

  const qte = q1 + q2;

  DATA[ligne].push({
    ts: now.toISOString(),
    date: now.toLocaleDateString('fr-FR'),
    hDeb, hFin,
    qte, arretMin: arret, cause, comment, reste
  });

  // Vider les champs de saisie sauf "q1" (comportement demandé : q1 reste tant qu'on n'enregistre pas)
  document.getElementById("q1").value = "";
  document.getElementById("q2").value = "";
  document.getElementById("arret").value = "";
  document.getElementById("cause").value = "";
  document.getElementById("comment").value = "";
  // "reste" est juste indicatif, on le laisse tel quel

  save();

  // MAJ total + cadence + graph
  document.getElementById("totalSpan").textContent = sum(DATA[ligne].map(r => r.qte||0));
  document.getElementById("cadSpan").textContent = fmt(cadenceMoyenne(DATA[ligne]));
  drawLineChart(ligne);
}

function annulerDernier(ligne){
  if(!DATA[ligne].length) return;
  DATA[ligne].pop();
  save();
  document.getElementById("totalSpan").textContent = sum(DATA[ligne].map(r => r.qte||0));
  document.getElementById("cadSpan").textContent = fmt(cadenceMoyenne(DATA[ligne]));
  drawLineChart(ligne);
}

function remiseZeroAffichage(ligne){
  // Ne touche pas à l'historique : on simule un "reset visuel"
  document.getElementById("totalSpan").textContent = "0";
  document.getElementById("cadSpan").textContent = "0";
}

/* Historique simple (lecture) */
function ouvrirHistorique(ligne){
  const rows = DATA[ligne].slice().reverse().map(r =>
    `${r.date} ${r.hDeb}-${r.hFin} | q=${r.qte} | arrêt=${r.arretMin}min ${r.cause?("("+r.cause+")"):""} ${r.comment?("— "+r.comment):""}`
  );
  alert(rows.join("\n") || "Aucune saisie.");
}

/* Export Excel (CSV) */
function exportExcel(ligne){
  const now = new Date();
  const week = getWeekNumber(now);
  const file = `Synthese_${ligne}_S${String(week).padStart(2,"0")}_${now.toLocaleDateString('fr-FR').replaceAll('/','-')}_${now.toTimeString().slice(0,5).replace(':','h')}.csv`;

  const header = ["Date","Heure début","Heure fin","Quantité","Arrêt(min)","Cause","Commentaire","Reste"];
  const body = DATA[ligne].map(r => [
    r.date, r.hDeb, r.hFin, r.qte, r.arretMin, safe(r.cause), safe(r.comment), r.reste ?? ""
  ]);

  const csv = [header].concat(body).map(row => row.map(v => `"${String(v??"").replaceAll('"','""')}"`).join(";")).join("\n");
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = file;
  a.click();
  URL.revokeObjectURL(a.href);
}

function safe(s){return (s||"").replaceAll("\n"," ").trim()}

/* ===== Helpers ===== */
function sum(a){return a.reduce((x,y)=>x+(+y||0),0)}
function fmt(n){return (isFinite(n)?Math.round(n*10)/10:0).toString()}

/* Cadence moyenne (colis/h) sur tout l’historique */
function cadenceMoyenne(rows){
  if(!rows.length) return 0;
  // somme quantités / durée totale (heures) en utilisant les heures début/fin
  let totalQ=0, totalMin=0;
  rows.forEach(r=>{
    totalQ += (r.qte||0);
    const dur = dureeMin(r.hDeb, r.hFin);
    totalMin += Math.max(1, dur); // évite division par 0
  });
  return totalQ / (totalMin/60);
}

/* Durée en minutes en gérant le passage minuit (23:10 -> 00:10) */
function dureeMin(hDeb, hFin){
  if(!hDeb || !hFin) return 0;
  const [dh,dm] = hDeb.split(":").map(Number);
  const [fh,fm] = hFin.split(":").map(Number);
  let d = (fh*60+fm) - (dh*60+dm);
  if (d < 0) d += 24*60; // passe minuit
  return d;
}

/* ===== Calculatrice ===== */
const fab = document.getElementById("fab-calc");
const backdrop = document.getElementById("calc-backdrop");
const modal = document.getElementById("calc-modal");
const closeBtn = document.getElementById("calc-close");
const display = document.getElementById("calc-display");
const grid = document.querySelector(".calc-grid");
const btnEq = document.getElementById("calc-eq");
const btnClr = document.getElementById("calc-clear");
const btnCopy = document.getElementById("calc-copy");

function openCalc(){backdrop.classList.remove("hidden");modal.classList.remove("hidden");display.focus();}
function closeCalc(){backdrop.classList.add("hidden");modal.classList.add("hidden");}
fab.addEventListener("click", openCalc);
closeBtn.addEventListener("click", closeCalc);
backdrop.addEventListener("click", closeCalc);

grid.addEventListener("click", e=>{
  const k = e.target.getAttribute?.("data-k");
  if(!k) return;
  display.value += k;
});
btnClr.addEventListener("click", ()=> display.value = "");
btnEq.addEventListener("click", ()=>{
  try{
    // évalue en sécurité basique
    const expr = display.value.replace(/[^0-9+\-*/().,]/g,"").replaceAll(",",".");
    const res = Function(`"use strict";return (${expr})`)();
    display.value = Number.isFinite(res)? String(res) : "Erreur";
  }catch{ display.value = "Erreur"; }
});
btnCopy.addEventListener("click", async ()=>{
  try{ await navigator.clipboard.writeText(display.value); btnCopy.textContent="Copié"; setTimeout(()=>btnCopy.textContent="Copier",900); }catch{}
});
