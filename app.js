// === Synthèse Production Lactalis — V35 ===
// Suppression dans historiques + Export Excel professionnel

///////////////////////////
// (1) Horloge + équipe
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
  if (last && last !== equipe) genererExportAutomatique(equipe);
  localStorage.setItem("derniereEquipe", equipe);
}
setInterval(majDateHeureEquipe, 15_000);
majDateHeureEquipe();

///////////////////////////
// (2) Données & persistance
///////////////////////////
let ligneActive = null;
let historique = JSON.parse(localStorage.getItem("historique")) || { production: [], arrets: [], personnel: [], organisation: [] };
let formState = JSON.parse(localStorage.getItem("formState")) || {};
const save = () => localStorage.setItem("historique", JSON.stringify(historique));
const saveForm = () => localStorage.setItem("formState", JSON.stringify(formState));

///////////////////////////
// (3) Navigation
///////////////////////////
function changerPage(nom) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll("footer button").forEach(b => b.classList.remove("active"));
  document.getElementById(`page${nom}`).classList.add("active");
  const btn = [...document.querySelectorAll("footer button")].find(b => (b.getAttribute("onclick") || "").includes(nom));
  if (btn) btn.classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

///////////////////////////
// (4) Sélection de ligne
///////////////////////////
function selectLine(ligne) {
  ligneActive = ligne;
  document.getElementById("titreLigne").innerText = `Ligne : ${ligne}`;
  const f = formState[ligne] || {};
  for (const [id, key] of [
    ["heureDebut", "heureDebut"],
    ["heureFin", "heureFin"],
    ["quantiteRealisee", "qte"],
    ["quantiteRestante", "reste"],
    ["cadenceManuelle", "cadMan"],
    ["estimationFin", "estim"]
  ]) document.getElementById(id).value = f[key] || "";
  document.getElementById("formulaireProduction").scrollIntoView({ behavior: "smooth" });
}

///////////////////////////
// (5) Utils temps
///////////////////////////
const minutesDepuisMinuit = t => { const [h, m] = (t || "00:00").split(":").map(Number); return (h * 60 + m) % (24 * 60); };
const dureeHeures = (d, f) => { if (!d || !f) return 0; let t1 = minutesDepuisMinuit(d), t2 = minutesDepuisMinuit(f); if (t2 < t1) t2 += 1440; return (t2 - t1) / 60; };
const addMinutesToTime = (base, add) => { let t = minutesDepuisMinuit(base) + Math.round(add); t = ((t % 1440) + 1440) % 1440; const h = Math.floor(t / 60), m = t % 60; return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`; };

///////////////////////////
// (6) Cadence + estimation
///////////////////////////
function calculCadenceEtEstimation() {
  if (!ligneActive) return;
  const d = document.getElementById("heureDebut").value;
  const f = document.getElementById("heureFin").value;
  const q = +document.getElementById("quantiteRealisee").value || 0;
  const r = +document.getElementById("quantiteRestante").value || 0;
  const cm = +document.getElementById("cadenceManuelle").value || 0;
  let cad = cm > 0 ? cm : (dureeHeures(d, f) ? q / dureeHeures(d, f) : 0);
  if (cad > 0) document.getElementById("cadenceManuelle").value = cad.toFixed(1);
  const base = f || new Date().toTimeString().slice(0,5);
  const est = (cad > 0 && r > 0) ? addMinutesToTime(base, (r / cad) * 60) : "";
  document.getElementById("estimationFin").value = est;
  formState[ligneActive] = { heureDebut: d, heureFin: f, qte: q, reste: r, cadMan: cm || cad, estim: est };
  saveForm();
}
["heureDebut","heureFin","quantiteRealisee","quantiteRestante","cadenceManuelle"].forEach(id => {
  const e = document.getElementById(id); if (e) e.addEventListener("input", calculCadenceEtEstimation);
});

///////////////////////////
// (7) Production CRUD
///////////////////////////
function enregistrerProduction() {
  if (!ligneActive) return alert("Choisir une ligne d'abord.");
  const p = {
    date: new Date().toLocaleDateString("fr-FR"),
    heure: new Date().toLocaleTimeString("fr-FR",{hour12:false}).slice(0,5),
    ligne: ligneActive,
    heureDebut: heureDebut.value,
    heureFin: heureFin.value,
    quantiteRealisee: +quantiteRealisee.value || 0,
    quantiteRestante: +quantiteRestante.value || 0,
    cadence: +cadenceManuelle.value || 0,
    estimationFin: estimationFin.value || ""
  };
  historique.production.push(p); save(); afficherHistoriqueProduction();
  quantiteRealisee.value = ""; quantiteRestante.value = "";
  alert("✅ Enregistré !");
}
function supprimerProduction(i){ if(confirm("Supprimer cet enregistrement ?")){historique.production.splice(i,1);save();afficherHistoriqueProduction();}}
function afficherHistoriqueProduction(){
  const cont=document.getElementById("historiqueProduction");if(!cont)return;
  cont.innerHTML=""; historique.production.slice().reverse().forEach((p,idx)=>{
    const i=historique.production.length-1-idx;
    cont.innerHTML+=`<div class="bloc-histo"><strong>${p.ligne}</strong> ${p.date} ${p.heureDebut}-${p.heureFin} :
    ${p.quantiteRealisee} colis • ${p.cadence||0} c/h • Fin ${p.estimationFin||"—"}
    <button class='delBtn' onclick='supprimerProduction(${i})'>🗑️</button></div>`;
  });
} afficherHistoriqueProduction();

///////////////////////////
// (8) Arrêts CRUD
///////////////////////////
function ajouterArret(){
  const l=selectLigneArret.value||ligneActive;if(!l)return alert("Choisissez une ligne.");
  const motif=prompt("Motif de l'arrêt :"); const d=parseInt(prompt("Durée (min):"),10);
  if(!motif||!d)return; historique.arrets.push({date:new Date().toLocaleDateString("fr-FR"),heure:new Date().toTimeString().slice(0,5),ligne:l,duree:d,motif});
  save(); afficherArrets();
}
function supprimerArret(i){if(confirm("Supprimer cet arrêt ?")){historique.arrets.splice(i,1);save();afficherArrets();}}
function afficherArrets(){
  const tb=document.querySelector("#tableArrets tbody"); if(!tb)return; tb.innerHTML="";
  historique.arrets.forEach((a,i)=>{
    tb.innerHTML+=`<tr><td>${a.date}</td><td>${a.heure}</td><td>${a.ligne}</td><td>${a.duree}</td><td>${a.motif}</td>
    <td><button class='delBtn' onclick='supprimerArret(${i})'>🗑️</button></td></tr>`;
  });
} afficherArrets();

///////////////////////////
// (9) Personnel + Organisation CRUD
///////////////////////////
function ajouterPersonnel(){
  const t=typePersonnel.value,c=commentairePersonnel.value.trim();if(!c)return;
  historique.personnel.push({date:new Date().toLocaleString("fr-FR"),type:t,commentaire:c});save();afficherPersonnel();commentairePersonnel.value="";
}
function supprimerPersonnel(i){if(confirm("Supprimer ?")){historique.personnel.splice(i,1);save();afficherPersonnel();}}
function afficherPersonnel(){
  const c=listePersonnel;if(!c)return;c.innerHTML="";
  historique.personnel.forEach((p,i)=>c.innerHTML+=`<div class='bloc-histo'>${p.date} — <strong>${p.type}</strong> : ${p.commentaire}<button class='delBtn' onclick='supprimerPersonnel(${i})'>🗑️</button></div>`);
} afficherPersonnel();

function ajouterOrganisation(){
  const n=noteOrganisation.value.trim();if(!n)return;
  historique.organisation.push({date:new Date().toLocaleString("fr-FR"),note:n});save();afficherOrganisation();noteOrganisation.value="";
}
function supprimerOrganisation(i){if(confirm("Supprimer ?")){historique.organisation.splice(i,1);save();afficherOrganisation();}}
function afficherOrganisation(){
  const c=historiqueOrganisation;if(!c)return;c.innerHTML="";
  historique.organisation.forEach((o,i)=>c.innerHTML+=`<div class='bloc-histo'>${o.date} — ${o.note}<button class='delBtn' onclick='supprimerOrganisation(${i})'>🗑️</button></div>`);
} afficherOrganisation();

///////////////////////////
// (10) Export Excel Pro
///////////////////////////
function exportGlobal(equipe){
  const wb=XLSX.utils.book_new();
  const all=[["Type","Date","Heure/Durée","Ligne","Quantité","Cadence","Commentaire / Motif / Note"]];
  historique.production.forEach(p=>all.push(["Production",p.date,`${p.heureDebut}-${p.heureFin}`,p.ligne,p.quantiteRealisee,p.cadence,p.estimationFin]));
  historique.arrets.forEach(a=>all.push(["Arrêt",a.date,`${a.heure}/${a.duree} min`,a.ligne,"","",a.motif]));
  historique.personnel.forEach(p=>all.push(["Personnel",p.date,"","","","",`${p.type}: ${p.commentaire}`]));
  historique.organisation.forEach(o=>all.push(["Organisation",o.date,"","","","",o.note]));
  // Totaux
  const totalColis=historique.production.reduce((s,p)=>s+(+p.quantiteRealisee||0),0);
  const totalArrets=historique.arrets.reduce((s,a)=>s+(+a.duree||0),0);
  all.push([]);all.push(["Totaux","","","",`${totalColis} colis produits`,"",`${totalArrets} min d'arrêts`]);
  const ws=XLSX.utils.aoa_to_sheet(all);

  // Style
  const range=XLSX.utils.decode_range(ws['!ref']);
  for(let C=0;C<=range.e.c;C++){const cell=XLSX.utils.encode_cell({r:0,c:C});if(!ws[cell])continue;ws[cell].s={fill:{fgColor:{rgb:"009FE3"}},font:{bold:true,color:{rgb:"FFFFFF"}}};}
  ws['!cols']=Array(7).fill({wch:22});
  XLSX.utils.book_append_sheet(wb,ws,"Synthèse");
  XLSX.writeFile(wb,`Synthese_${new Date().toLocaleDateString("fr-FR")}_${equipe}.xlsx`);
}
document.getElementById("exportAllBtn").addEventListener("click",()=>{const eq=(equipe.innerText.split(":")[1]||"").trim();exportGlobal(eq||"NA");});

///////////////////////////
// (11) Auto-export + notif
///////////////////////////
function genererExportAutomatique(eq){exportGlobal(eq);afficherNotification(`✅ Rapport automatique exporté (Équipe ${eq})`);}
function afficherNotification(msg){const n=document.createElement("div");n.className="notification-export";n.textContent=msg;document.body.appendChild(n);setTimeout(()=>n.classList.add("visible"),50);setTimeout(()=>{n.classList.remove("visible");setTimeout(()=>n.remove(),400);},4000);}

///////////////////////////
// (12) Service worker
///////////////////////////
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("service-worker.js").then(()=>console.log("SW OK")));
