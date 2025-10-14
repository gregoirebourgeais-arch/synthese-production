function updateDateTime() {
  const now = new Date();
  const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const semaine = Math.ceil(((now - new Date(now.getFullYear(), 0, 1)) / 86400000 + now.getDay() + 1) / 7);
  document.getElementById("date").textContent = `${jours[now.getDay()]} ${now.getDate()} ${mois[now.getMonth()]} ${now.getFullYear()} — Semaine ${semaine} — ${now.toLocaleTimeString('fr-FR')}`;

  const h = now.getHours();
  let equipe = "";
  if (h >= 5 && h < 13) equipe = "M (5h–13h)";
  else if (h >= 13 && h < 21) equipe = "AM (13h–21h)";
  else equipe = "N (21h–5h)";
  document.getElementById("equipe").textContent = `Équipe : ${equipe}`;
}
setInterval(updateDateTime, 1000);
updateDateTime();

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const target = btn.dataset.section;
    document.querySelectorAll('.page').forEach(sec => sec.classList.remove('active'));
    document.getElementById(target).classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

function afficherFormulaireLigne(ligne) {
  const form = document.getElementById("formulaireLigne");
  form.innerHTML = `
    <h3>${ligne}</h3>
    <label>Heure début :</label><input type="time" id="debut${ligne}">
    <label>Heure fin :</label><input type="time" id="fin${ligne}">
    <label>Quantité réalisée :</label><input type="number" id="qte${ligne}">
    <label>Quantité restante :</label><input type="number" id="reste${ligne}">
    <button onclick="enregistrer('${ligne}')">💾 Enregistrer</button>
  `;
  form.scrollIntoView({ behavior: 'smooth' });
}

function enregistrer(ligne) {
  const debut = document.getElementById(`debut${ligne}`).value;
  const fin = document.getElementById(`fin${ligne}`).value;
  const qte = parseFloat(document.getElementById(`qte${ligne}`).value || 0);
  const reste = parseFloat(document.getElementById(`reste${ligne}`).value || 0);
  if (!debut || !fin) return alert("Champs incomplets !");
  const data = JSON.parse(localStorage.getItem("production") || "{}");
  if (!data[ligne]) data[ligne] = [];
  data[ligne].push({ debut, fin, qte, reste, date: new Date().toLocaleString() });
  localStorage.setItem("production", JSON.stringify(data));
  alert(`✅ Données enregistrées pour ${ligne}`);
}

function ajouterArret() {
  const ligne = prompt("Ligne concernée :");
  const duree = prompt("Durée (min) :");
  const motif = prompt("Motif :");
  if (!ligne || !duree) return;
  const table = document.querySelector("#tableArrets tbody");
  const heure = new Date().toLocaleTimeString("fr-FR");
  const row = document.createElement("tr");
  row.innerHTML = `<td>${heure}</td><td>${ligne}</td><td>${duree}</td><td>${motif}</td>`;
  table.appendChild(row);
}

function ajouterPersonnel() {
  const type = document.getElementById("typePersonnel").value;
  const commentaire = document.getElementById("commentairePersonnel").value;
  if (!commentaire) return alert("Ajoutez un commentaire !");
  const div = document.getElementById("listePersonnel");
  const p = document.createElement("p");
  p.textContent = `${type} : ${commentaire}`;
  div.appendChild(p);
  document.getElementById("commentairePersonnel").value = "";
}

// === EXPORT COMPLET EN EXCEL ===
document.getElementById("exportAllBtn").addEventListener("click", () => {
  const prod = JSON.parse(localStorage.getItem("production") || "{}");
  const arrets = [];
  document.querySelectorAll("#tableArrets tbody tr").forEach(tr => {
    const tds = tr.querySelectorAll("td");
    arrets.push({
      Heure: tds[0].textContent,
      Ligne: tds[1].textContent,
      Durée: tds[2].textContent,
      Motif: tds[3].textContent
    });
  });

  const wb = XLSX.utils.book_new();
  for (let ligne in prod) {
    const ws = XLSX.utils.json_to_sheet(prod[ligne]);
    XLSX.utils.book_append_sheet(wb, ws, ligne);
  }
  const wsArrets = XLSX.utils.json_to_sheet(arrets);
  XLSX.utils.book_append_sheet(wb, wsArrets, "Arrêts");

  const wsPers = XLSX.utils.json_to_sheet(
    Array.from(document.querySelectorAll("#listePersonnel p")).map(p => ({ Commentaire: p.textContent }))
  );
  XLSX.utils.book_append_sheet(wb, wsPers, "Personnel");

  XLSX.writeFile(wb, `Synthese_Production_${new Date().toLocaleDateString("fr-FR")}.xlsx`);
});
