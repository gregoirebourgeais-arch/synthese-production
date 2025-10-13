// === Données globales ===
const lignes = ["Râpé","T2","RT","OMORI","T1","Sticks","Emballage","Dés","Filets","Prédécoupé"];
let prod = JSON.parse(localStorage.getItem("prod")) || {};
let arrets = JSON.parse(localStorage.getItem("arrets")) || [];
let personnel = JSON.parse(localStorage.getItem("personnel")) || [];
let consignes = JSON.parse(localStorage.getItem("consignes")) || [];

// === Date & équipe ===
function updateHeader(){
  const now=new Date();
  const week=getWeekNumber(now);
  document.getElementById("date-info").textContent=
    now.toLocaleDateString("fr-FR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"})+
    ` — Semaine ${week} — ${now.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}`;
  document.getElementById("equipe-info").innerHTML=`Équipe : <b>${getEquipe(now)}</b>`;
}
setInterval(updateHeader,1000);
updateHeader();
function getWeekNumber(d){
  d=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));
  const dayNum=d.getUTCDay()||7;
  d.setUTCDate(d.getUTCDate()+4-dayNum);
  const yearStart=new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil(((d-yearStart)/86400000+1)/7);
}
function getEquipe(dt){
  const h=dt.getHours();
  if(h>=5&&h<13) return "M (5h–13h)";
  if(h>=13&&h<21) return "AM (13h–21h)";
  return "N (21h–5h)";
}

// === Navigation ===
function openSection(id){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  if(id==="production") renderButtons();
  if(id==="arrets") renderArrets();
  if(id==="personnel") renderPersonnel();
  if(id==="organisation") renderConsignes();
  if(id==="atelier") renderAtelier();
}

// === Boutons lignes ===
function renderButtons(){
  const box=document.getElementById("buttons-lignes");
  box.innerHTML="";
  lignes.forEach(l=>{
    const b=document.createElement("button");
    b.textContent=l;
    b.onclick=()=>openLigne(l);
    box.appendChild(b);
  });
}
renderButtons();

// === Fiche ligne ===
function openLigne(ligne){
  const d=prod[ligne]||{};
  document.getElementById("ligne-content").innerHTML=`
  <div class="card">
    <h3>${ligne}</h3>

    <label>Heure début :</label>
    <input id="deb-${ligne}" type="time" value="${d.deb||""}">
    <label>Heure fin :</label>
    <input id="fin-${ligne}" type="time" value="${d.fin||""}">
    <label>Quantité :</label>
    <input id="qte-${ligne}" type="number" value="${d.qte||""}" placeholder="Colis réalisés">
    <label>Cadence manuelle (colis/h) :</label>
    <input id="cad-${ligne}" type="number" value="${d.cadMan||""}" placeholder="Optionnel">
    <label>Cadence calculée :</label>
    <input id="cadAuto-${ligne}" type="text" readonly value="${d.cadAuto||""}">
    <label>Quantité restante :</label>
    <input id="rest-${ligne}" type="number" value="${d.reste||""}" placeholder="À produire">
    <label>Estimation fin :</label>
    <input id="est-${ligne}" type="text" readonly value="${d.estimation||""}">
    <div style="display:flex;gap:8px;justify-content:center;margin-top:8px;">
      <button onclick="saveLigne('${ligne}')">💾 Enregistrer</button>
      <button onclick="retourMenu()">⬅️ Retour</button>
    </div>
  </div>`;
  ["deb","fin","qte","cad","rest"].forEach(k=>{
    document.getElementById(`${k}-${ligne}`).addEventListener("input",()=>majCalculs(ligne));
  });
}

function majCalculs(ligne){
  const deb=document.getElementById(`deb-${ligne}`).value;
  const fin=document.getElementById(`fin-${ligne}`).value;
  const qte=+document.getElementById(`qte-${ligne}`).value||0;
  const cadMan=+document.getElementById(`cad-${ligne}`).value||0;
  const rest=+document.getElementById(`rest-${ligne}`).value||0;

  let cadAuto=0;
  if(deb&&fin&&qte>0){
    const diff=hoursBetween(deb,fin);
    if(diff>0) cadAuto=(qte/diff).toFixed(1);
  }

  document.getElementById(`cadAuto-${ligne}`).value=cadAuto||"";
  let est="";
  const baseCad=cadMan||cadAuto;
  if(baseCad>0&&rest>0){
    const h=rest/baseCad;
    const t=new Date();
    t.setMinutes(t.getMinutes()+h*60);
    est=t.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
  }
  document.getElementById(`est-${ligne}`).value=est;
}

function saveLigne(ligne){
  const d={
    deb:document.getElementById(`deb-${ligne}`).value,
    fin:document.getElementById(`fin-${ligne}`).value,
    qte:+document.getElementById(`qte-${ligne}`).value||0,
    cadMan:+document.getElementById(`cad-${ligne}`).value||0,
    cadAuto:+document.getElementById(`cadAuto-${ligne}`).value||0,
    reste:+document.getElementById(`rest-${ligne}`).value||0,
    estimation:document.getElementById(`est-${ligne}`).value||"",
    date:new Date().toLocaleString("fr-FR")
  };
  prod[ligne]=d;
  localStorage.setItem("prod",JSON.stringify(prod));
  alert(`✅ ${ligne} sauvegardée`);
  openLigne(ligne); // reste sur la page avec les valeurs actualisées
  renderAtelier();
}

function hoursBetween(a,b){
  if(!a||!b)return 0;
  const [h1,m1]=a.split(":").map(Number);
  const [h2,m2]=b.split(":").map(Number);
  let d=(h2+m2/60)-(h1+m1/60);
  if(d<0)d+=24;
  return d;
}
function retourMenu(){
  document.getElementById("ligne-content").innerHTML="";
}

// === Arrêts ===
function saveArret(){
  const l=document.getElementById("arret-ligne").value;
  const d=+document.getElementById("arret-duree").value||0;
  const c=document.getElementById("arret-cause").value.trim();
  const com=document.getElementById("arret-com").value.trim();
  if(!l||!d||!c)return alert("Complète tous les champs obligatoires.");
  arrets.unshift({ligne:l,duree:d,cause:c,com,date:new Date().toLocaleString("fr-FR")});
  localStorage.setItem("arrets",JSON.stringify(arrets));
  document.getElementById("form-arret").reset();
  renderArrets();
}
function renderArrets(){
  const zone=document.getElementById("liste-arrets");
  zone.innerHTML=arrets.length?"":"<p>Aucun arrêt.</p>";
  arrets.forEach(a=>{
    const div=document.createElement("div");
    div.className="card";
    div.innerHTML=`<p><b>${a.ligne}</b> — ${a.date}</p><p>${a.duree} min — ${a.cause}</p><p>${a.com||""}</p>`;
    zone.appendChild(div);
  });
}

// === Personnel ===
function savePersonnel(){
  const t=document.getElementById("typePersonnel").value;
  const com=document.getElementById("commentairePersonnel").value.trim();
  personnel.unshift({type:t,com,date:new Date().toLocaleString("fr-FR")});
  localStorage.setItem("personnel",JSON.stringify(personnel));
  document.getElementById("form-pers").reset();
  renderPersonnel();
}
function renderPersonnel(){
  const z=document.getElementById("historiquePersonnel");
  z.innerHTML=personnel.length?"":"<p>Aucune donnée.</p>";
  personnel.forEach(p=>{
    const d=document.createElement("div");
    d.className="card";
    d.innerHTML=`<p><b>${p.type}</b> — ${p.date}</p><p>${p.com||""}</p>`;
    z.appendChild(d);
  });
}

// === Consignes ===
function saveConsigne(){
  const a=document.getElementById("auteurConsigne").value.trim()||"Anonyme";
  const t=document.getElementById("texteConsigne").value.trim();
  if(!t)return alert("Saisis une consigne.");
  consignes.unshift({auteur:a,texte:t,date:new Date().toLocaleString("fr-FR")});
  localStorage.setItem("consignes",JSON.stringify(consignes));
  document.getElementById("form-consigne").reset();
  renderConsignes();
}
function renderConsignes(){
  const now=Date.now();
  consignes=consignes.filter(c=>now-new Date(c.date).getTime()<7*24*3600*1000);
  localStorage.setItem("consignes",JSON.stringify(consignes));
  const zone=document.getElementById("historiqueConsignes");
  zone.innerHTML=consignes.length?"":"<p>Aucune consigne récente.</p>";
  consignes.forEach(c=>{
    const d=document.createElement("div");
    d.className="card";
    d.innerHTML=`<p><b>${c.auteur}</b> — ${c.date}</p><p>${c.texte}</p>`;
    zone.appendChild(d);
  });
}

// === Atelier ===
let atelierChart=null;
function renderAtelier(){
  const ctx=document.getElementById("atelierChart");
  if(!ctx)return;
  const labels=lignes;
  const vals=labels.map(l=>+(prod[l]?.cadAuto||prod[l]?.cadMan||0));
  if(atelierChart)atelierChart.destroy();
  atelierChart=new Chart(ctx,{
    type:"bar",
    data:{labels,datasets:[{label:"Cadence (colis/h)",data:vals,backgroundColor:"#007bff"}]},
    options:{responsive:true,scales:{y:{beginAtZero:true}}}
  });
}

// === Export / Reset ===
function exportAtelier(){
  let csv="Ligne;Début;Fin;Quantité;CadenceAuto;CadenceMan;Reste;Estimation;Date\n";
  lignes.forEach(l=>{
    const d=prod[l];
    if(d)csv+=`${l};${d.deb||""};${d.fin||""};${d.qte||0};${d.cadAuto||0};${d.cadMan||0};${d.reste||0};${d.estimation||""};${d.date||""}\n`;
  });
  const blob=new Blob([csv],{type:"text/csv"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download=`export-${new Date().toISOString().slice(0,19)}.csv`;
  a.click();
}
function resetAll(){
  if(!confirm("Exporter puis réinitialiser l'application ?"))return;
  exportAtelier();
  prod={};arrets=[];personnel=[];consignes=[];
  localStorage.clear();
  renderArrets();renderPersonnel();renderConsignes();renderAtelier();
  alert("Données remises à zéro (export sauvegardé).");
}

// === Init ===
openSection("production");
renderArrets();renderPersonnel();renderConsignes();renderAtelier();
