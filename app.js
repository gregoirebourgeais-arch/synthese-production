// === Variables globales ===
let data = JSON.parse(localStorage.getItem("productionData") || "{}");
let currentLine = null;
let calcValue = "";
let chart = null;

// === Horloge ===
function updateClock() {
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const semaine = `Semaine ${Math.ceil(now.getDate() / 7)}`;
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  document.getElementById("topClock").innerText = `${now.toLocaleDateString('fr-FR', options)} — ${semaine} — ${time}`;
}
setInterval(updateClock, 1000);
updateClock();

// === Fonctions utilitaires ===
function hoursBetween(startHHMM, endHHMM) {
  if (!startHHMM || !endHHMM) return 0;
  const [sh, sm] = startHHMM.split(":").map(Number);
  const [eh, em] = endHHMM.split(":").map(Number);
  let start = sh * 60 + sm;
  let end = eh * 60 + em;
  if (end < start) end += 24 * 60; // passage minuit
  return (end - start) / 60;
}

function getInstantCadenceFromInputs() {
  const debut = (document.getElementById("debut") || {}).value || "";
  const fin   = (document.getElementById("fin")   || {}).value || "";
  const init  = +((document.getElementById("init")  || {}).value || 0);
  const ajout = +((document.getElementById("ajout") || {}).value || 0);
  const reste = +((document.getElementById("reste") || {}).value || 0);
  const total = init + ajout - reste;
  const h = hoursBetween(debut, fin);
  if (h <= 0 || total <= 0) return 0;
  return +(total / h).toFixed(2);
}

// === Transition ===
function pageTransition() {
  const c = document.getElementById("content");
  c.classList.remove("fade");
  void c.offsetWidth;
  c.classList.add("fade");
}

// === Menu principal ===
function renderMenu() {
  pageTransition();
  const lignes = ["Atelier","Râpé","T2","RT","OMORI","T1","Sticks","Emballage","Dés","Filets","Prédécoupé"];
  const c = document.getElementById("content");
  c.innerHTML = `
    <div class="menu-lignes page">
      <h2>Choisis une ligne</h2>
      ${lignes.map(l => `<button onclick="openLine('${l}')">${l}</button>`).join("")}
    </div>`;
}

// === Ouvrir une ligne ===
function openLine(line) {
  pageTransition();
  currentLine = line;

  const d = data[line] || [];
  const total = d.reduce((s,x)=>s+(parseFloat(x.total)||0),0);
  const cadences = d.map(x=>+x.cadence||0).filter(c=>c>0);
  const cadenceMoy = cadences.length ? (cadences.reduce((a,b)=>a+b,0)/cadences.length).toFixed(2) : 0;

  const unsaved = JSON.parse(localStorage.getItem("unsaved_"+line)||"{}");
  const reste = unsaved.reste ? +unsaved.reste : 0;
  const instant = getInstantCadenceFromInputs();
  const cadenceActive = (unsaved.cadenceManuelle && unsaved.cadenceManuelle>0)
    ? +unsaved.cadenceManuelle
    : (instant>0 ? instant : +cadenceMoy);

  const estimation = calcEstimationFin(reste, cadenceActive);

  const html = `
  <div class="page fade">
    <h2>${line}</h2>
    <button class="retour-menu" onclick="renderMenu()">⬅️ Retour menu</button>

    <label>Heure début :</label>
    <input id="debut" type="time" value="${unsaved.debut||""}" />
    <label>Heure fin :</label>
    <input id="fin" type="time" value="${unsaved.fin||""}" />
    <label>Quantité initiale :</label>
    <input id="init" type="number" value="${unsaved.init||""}" />
    <label>Quantité ajoutée :</label>
    <input id="ajout" type="number" value="${unsaved.ajout||""}" />
    <label>Quantité restante :</label>
    <input id="reste" type="number" value="${reste}" oninput="majEstimation()" />
    <label>Temps d'arrêt (min) :</label>
    <input id="arret" type="number" value="${unsaved.arret||""}" />
    <label>Cause d'arrêt :</label>
    <input id="cause" type="text" value="${unsaved.cause||""}" />
    <label>Cadence manuelle :</label>
    <input id="cadenceManuelle" type="number" value="${unsaved.cadenceManuelle||""}" oninput="majEstimation()" />
    <button class="bouton-principal" onclick="appliquerCadence()">⚙️ Appliquer cadence</button>

    <button class="bouton-principal" onclick="enregistrer()">💾 Enregistrer</button>
    <button class="bouton-principal" onclick="remiseAffichage()">🔄 Remise affichage</button>
    <button class="bouton-principal" onclick="exportExcel('${line}')">📦 Export Excel</button>
    <button class="bouton-principal" onclick="showAtelier()">🏭 Vue Atelier</button>

    <div class="stats" id="statsBloc">
      <p><b>Total :</b> ${total}</p>
      <p><b>Cadence moyenne (historique) :</b> ${cadenceMoy} colis/h</p>
      <p><b>Cadence active :</b> <span id="cadenceActive">${cadenceActive||0}</span> colis/h</p>
      <p id="estimationBloc">${estimation}</p>
    </div>
  </div>`;

  const c = document.getElementById("content");
  c.innerHTML = html;

  ["debut","fin","init","ajout","reste","cadenceManuelle"].forEach(id=>{
    const el=document.getElementById(id);
    if(el)el.addEventListener("input",majEstimation);
  });
}

// === Estimation ===
function calcEstimationFin(reste,cadence){
  if(!reste||!cadence||cadence<=0)return"Estimation : -";
  const heures=reste/cadence;
  const minutes=Math.round(heures*60);
  const now=new Date();
  const fin=new Date(now.getTime()+minutes*60000);
  return `Estimation : ≈ ${Math.floor(heures)}h${(minutes%60).toString().padStart(2,"0")} → ${fin.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`;
}

function majEstimation(){
  const reste=+((document.getElementById("reste")||{}).value||0);
  const cadMan=+((document.getElementById("cadenceManuelle")||{}).value||0);
  const instant=getInstantCadenceFromInputs();
  const elCad=document.getElementById("cadenceActive");
  const current=elCad?+elCad.textContent||0:0;
  const cadenceActive=cadMan>0?cadMan:(instant>0?instant:current);
  const est=calcEstimationFin(reste,cadenceActive);
  if(document.getElementById("estimationBloc"))document.getElementById("estimationBloc").textContent=est;
  if(elCad)elCad.textContent=cadenceActive.toString();
}

// === Cadence manuelle ===
function appliquerCadence(){
  const cadence=+((document.getElementById("cadenceManuelle")||{}).value||0);
  const reste=+((document.getElementById("reste")||{}).value||0);
  localStorage.setItem("unsaved_"+currentLine,JSON.stringify({
    ...(JSON.parse(localStorage.getItem("unsaved_"+currentLine)||"{}")),
    reste,cadenceManuelle:cadence
  }));
  majEstimation();
  alert("✅ Cadence manuelle appliquée");
}

// === Enregistrement ===
function enregistrer(){
  const line=currentLine;if(!line)return;
  const debut=(document.getElementById("debut")||{}).value||"";
  const fin=(document.getElementById("fin")||{}).value||"";
  const init=+((document.getElementById("init")||{}).value||0);
  const ajout=+((document.getElementById("ajout")||{}).value||0);
  const reste=+((document.getElementById("reste")||{}).value||0);
  const arret=+((document.getElementById("arret")||{}).value||0);
  const cause=(document.getElementById("cause")||{}).value||"";
  const cadMan=+((document.getElementById("cadenceManuelle")||{}).value||0);
  const total=init+ajout-reste;
  const h=hoursBetween(debut,fin);
  const cadAuto=(h>0&&total>0)?+(total/h).toFixed(2):0;
  const cadenceUsed=cadMan>0?cadMan:cadAuto;
  const record={
    date:new Date().toLocaleDateString('fr-FR'),
    heure:new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),
    debut,fin,init,ajout,reste,total,
    duree_h:+h.toFixed(2),cadence:cadenceUsed,arret,cause
  };
  if(!data[line])data[line]=[];
  data[line].push(record);
  localStorage.setItem("productionData",JSON.stringify(data));
  localStorage.setItem("unsaved_"+line,JSON.stringify({reste,cadenceManuelle:cadMan||""}));
  alert(`✅ Données enregistrées sur ${line}`);
  openLine(line);
}

// === Remise affichage ===
function remiseAffichage(){
  if(!currentLine)return;
  if(confirm("Remettre l'affichage à zéro (champs + cadence instantanée) ?")){
    localStorage.removeItem("unsaved_"+currentLine);
    openLine(currentLine);
    const nowHHMM=new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
    const d=document.getElementById("debut");if(d)d.value=nowHHMM;
    const cad=document.getElementById("cadenceActive");if(cad)cad.textContent="0";
    const est=document.getElementById("estimationBloc");if(est)est.textContent="Estimation : -";
  }
}

// === Vue Atelier ===
function showAtelier(){
  pageTransition();
  const c=document.getElementById("content");
  const lignes=Object.keys(data);
  if(lignes.length===0){c.innerHTML="<h2>Atelier</h2><p>Aucune donnée enregistrée</p>";return;}
  const lignesHTML=lignes.map(l=>{
    const d=data[l]||[];
    const total=d.reduce((s,x)=>s+(parseFloat(x.total)||0),0);
    const cadences=d.map(x=>+x.cadence||0).filter(c=>c>0);
    const cadence=cadences.length?(cadences.reduce((a,b)=>a+b,0)/cadences.length).toFixed(2):0;
    return `<tr><td>${l}</td><td>${total}</td><td>${cadence}</td></tr>`;
  }).join("");
  const globalCadence=(lignes.reduce((sum,l)=>{
    const d=data[l]||[];
    const cadences=d.map(x=>+x.cadence||0).filter(c=>c>0);
    const cm=cadences.length?(cadences.reduce((a,b)=>a+b,0)/cadences.length):0;
    return sum+cm;
  },0)/lignes.length).toFixed(2);
  c.innerHTML=`
  <div class="page fade">
    <h2>Vue Atelier</h2>
    <button class="retour-menu" onclick="renderMenu()">⬅️ Retour menu</button>
    <button class="bouton-principal" onclick="exportAtelier()">📊 Export global</button>
    <table><tr><th>Ligne</th><th>Total</th><th>Cadence</th></tr>${lignesHTML}</table>
    <div class="stats"><b>Cadence moyenne globale :</b> ${globalCadence} colis/h</div>
    <canvas id="atelierChart" height="250"></canvas>
  </div>`;
  const ctx=document.getElementById("atelierChart").getContext("2d");
  if(chart)chart.destroy();
  chart=new Chart(ctx,{
    type:"bar",
    data:{
      labels:lignes,
      datasets:[{label:"Cadence moyenne",data:lignes.map(l=>{
        const d=data[l]||[];
        const cadences=d.map(x=>+x.cadence||0).filter(c=>c>0);
        return cadences.length?(cadences.reduce((a,b)=>a+b,0)/cadences.length).toFixed(2):0;
      }),backgroundColor:"#007bff"}]
    },
    options:{scales:{y:{beginAtZero:true}}}
  });
}

// === Exports ===
function exportExcel(line){
  const d=data[line];
  if(!d||d.length===0){alert("Aucune donnée à exporter !");return;}
  const ws=XLSX.utils.json_to_sheet(d);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,line);
  const now=new Date();
  const f=`${line}_${now.toLocaleDateString('fr-CA')}_${now.toLocaleTimeString().replace(/:/g,'-')}.xlsx`;
  XLSX.writeFile(wb,f);
}
function exportAtelier(){
  const wb=XLSX.utils.book_new();
  for(let line in data){
    const ws=XLSX.utils.json_to_sheet(data[line]);
    XLSX.utils.book_append_sheet(wb,ws,line);
  }
  const now=new Date();
  const f=`Synthese_Atelier_${now.toLocaleDateString('fr-CA')}_${now.toLocaleTimeString().replace(/:/g,'-')}.xlsx`;
  XLSX.writeFile(wb,f);
}

// === Calculatrice ===
function toggleCalc(){
  const calc=document.getElementById("calculator");
  calc.style.display=calc.style.display==="block"?"none":"block";
}
function calcPress(v){calcValue+=v;document.getElementById("calcDisplay").value=calcValue;}
function calcEqual(){calcValue=eval(calcValue||"0").toString();document.getElementById("calcDisplay").value=calcValue;}
function calcClear(){calcValue="";document.getElementById("calcDisplay").value="";}

// === Lancement ===
renderMenu();
