// 1️⃣ Défilement fluide vers le haut à chaque changement de page
document.addEventListener("click", e=>{
  if(e.target.tagName==="BUTTON" && e.target.closest(".menu,.boutons")){
    window.scrollTo({top:0,behavior:"smooth"});
  }
});

// 2️⃣ Animation de glissement horizontal
function pageTransition(){
  const content=document.getElementById("content");
  content.style.transition="transform 0.3s ease";
  content.style.transform="translateX(20px)";
  setTimeout(()=>content.style.transform="translateX(0)",200);
}

// Appelle la transition à chaque affichage de page
function openLine(line){ pageTransition(); /* puis ton code openLine complet */ }
function showAtelier(){ pageTransition(); /* ton code atelier complet */ }
function afficherHistorique(){ pageTransition(); /* ton code historique complet */ }

// 3️⃣ Scroll automatique vers le haut quand on enregistre
function enregistrer(){
  /* ton code d'enregistrement existant */
  window.scrollTo({top:0,behavior:"smooth"});
}
