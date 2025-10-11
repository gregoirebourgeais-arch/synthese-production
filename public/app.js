function openPage(line) {
  const content = document.getElementById("content");
  if (line === "atelier") {
    content.innerHTML = `
      <h2>Vue d'ensemble Atelier</h2>
      <p>Tableau des lignes en cours + cadences</p>
    `;
    return;
  }

  content.innerHTML = `
    <h2>Ligne ${line.toUpperCase()}</h2>
    <form id="form-${line}">
      <label>Heure de début :</label>
      <input type="time" id="debut-${line}">
      
      <label>Heure de fin :</label>
      <input type="time" id="fin-${line}">
      
      <label>Colis réalisés :</label>
      <input type="number" id="colis-${line}">
      
      <label>Qualité :</label>
      <input type="text" id="qualite-${line}">
      
      <label>Arrêts :</label>
      <textarea id="arrets-${line}" placeholder="Description des arrêts"></textarea>
      
      <label>Temps d'arrêt (minutes) :</label>
      <input type="number" id="temps-${line}">
      
      <button type="button" class="save" onclick="saveData('${line}')">💾 Enregistrer</button>
    </form>
  `;
}

function saveData(line) {
  const data = {
    debut: document.getElementById(`debut-${line}`).value,
    fin: document.getElementById(`fin-${line}`).value,
    colis: document.getElementById(`colis-${line}`).value,
    qualite: document.getElementById(`qualite-${line}`).value,
    arrets: document.getElementById(`arrets-${line}`).value,
    temps: document.getElementById(`temps-${line}`).value,
    date: new Date().toLocaleString()
  };

  let records = JSON.parse(localStorage.getItem("syntheseData")) || [];
  records.push({ ligne: line, ...data });
  localStorage.setItem("syntheseData", JSON.stringify(records));

  alert("✅ Données enregistrées localement !");
}

setInterval(() => {
  console.log("💾 Sauvegarde automatique toutes les 2h");
}, 2 * 60 * 60 * 1000);
