const fs=require("fs"),path=require("path");
process.chdir("/home/claude/m");
global.window=global; global.Engine=require("/home/claude/m/engine.js");
const handlers={}; const ls={};
const mk=()=>{const cls=new Set(),l={};const el={innerHTML:"",textContent:"",value:"",className:"",_l:l,_cls:cls,children:{},
  classList:{add:c=>cls.add(c),remove:c=>cls.delete(c),contains:c=>cls.has(c),toggle(c,f){const on=f===undefined?!cls.has(c):!!f;on?cls.add(c):cls.delete(c);return on}},
  matches:()=>false,addEventListener:(k,f)=>{(l[k]=l[k]||[]).push(f)},remove(){el._removed=true},setAttribute(){},focus(){},select(){},
  querySelector(s){return el.children[s]=el.children[s]||mk()},querySelectorAll(){return []}};return el;};
const appEl=Object.assign(mk(),{addEventListener:(t,f)=>handlers[t]=f});
const modals=[],docL={};
const els={};
global.document={getElementById:id=>id==="app"?appEl:(els[id]=els[id]||mk()),createElement:()=>mk(),body:{appendChild(el){modals.push(el)}},addEventListener:(k,f)=>{docL[k]=f},removeEventListener:(k)=>{delete docL[k]}};
global.localStorage={getItem:k=>ls[k]??null,setItem:(k,v)=>ls[k]=v,removeItem:k=>delete ls[k]};
const copied=[]; Object.defineProperty(globalThis,'navigator',{value:{clipboard:{writeText:async(x)=>{copied.push(x)}}},configurable:true,writable:true});
global.requestAnimationFrame=f=>f();
global.scrollTo=()=>{};
global.fetch=async p=>{ if(!fs.existsSync(p)) return {ok:false,status:404}; return {ok:true,json:async()=>JSON.parse(fs.readFileSync(p,"utf8"))}};
global.Store=require("/home/claude/m/store.js"); global.UX=require("/home/claude/m/ux.js");
require("/home/claude/m/modal.js");
require("/home/claude/m/app.js");
const click=(a,data={})=>handlers.click({target:{closest:()=>({dataset:{a,...data},classList:{toggle(){}},textContent:""})}});
const type=(v)=>handlers.input({target:{value:v,matches:s=>s==="[data-f]"}});
const html=()=>appEl.innerHTML;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  await sleep(300);
  if(!html().includes("Méthodes")) throw new Error("accueil KO: "+html().slice(0,200));
  console.log("accueil OK, cartes méthodes:", (html().match(/data-a="openMethod"/g)||[]).length);
  const idx=JSON.parse(fs.readFileSync("lib/knowledge/index.json","utf8"));
  const lv=JSON.parse(fs.readFileSync("lib/knowledge/levels.json","utf8"));
  const tn=JSON.parse(fs.readFileSync("lib/knowledge/tones.json","utf8"));
  // parcourt chaque méthode avec ses exemples
  for(const it of idx.categories.methods.items){
    const m=JSON.parse(fs.readFileSync("lib/knowledge/methods/"+it.file,"utf8"));
    const ex=m.examples[0], ans=ex.answers||ex.steps;
    click("openMethod",{id:m.id});
    const steps=Engine.getSteps(m);
    for(let i=0;i<steps.length;i++){
      const b=steps[i];
      if(!html().includes("class=\"prog steps\"")) throw new Error(m.id+" étape "+i+" non rendue");
      const v=ans[b.id];
      if(b.type==="text"||b.type==="textarea"){ if(v!==undefined) type(v); else if(b.required) type("x".repeat(30)); }
      else if(b.type==="select"){ const o=Engine.optionsFor(b,{levels:lv,tones:tn})[0]; click("pick",{id:o.id}); }
      else if(b.type==="select-multi"){ click("multi",{id:Engine.optionsFor(b,{levels:lv,tones:tn})[0].id}); }
      click("next");
    }
    if(!html().includes('data-tagin="__ctx"')) throw new Error(m.id+" : étape Précisions absente");
    click("tagadd",{k:"__ctx",v:"musique"}); click("tagadd",{k:"__inc",v:"alpha"}); click("tagadd",{k:"__inc",v:"Alpha"}); click("tagadd",{k:"__inc",v:"  "}); click("tagadd",{k:"__inc",v:"beta"});
    click("next");
    const ok=html().includes("Ton prompt est prêt")&&html().includes("Éléments de contexte à prendre en compte : musique.")&&html().includes("Inclure les mots suivants dans la réponse : alpha, beta.")&&html().includes('data-a="editBlock"');
    console.log((ok?"✅":"❌")+" "+m.label+" → résultat affiché");
    if(!ok) console.log(html().slice(0,300), els.err&&els.err.innerHTML);
  }
  // techniques
  for(const it of idx.categories.techniques.items){
    click("tab",{id:"techniques"}); click("openTech",{id:it.id});
    if(!html().includes("Testeur")) throw new Error("fiche "+it.id+" KO");
    click("tpick",{i:"0"}); click("loadEx",{i:"0"});
  }
  console.log("✅ 10 fiches techniques rendues");
  // questionnaire de départ
  click("tab",{id:"methods"});
  if(!html().includes("Je ne sais pas par où commencer")) throw new Error("carte guide absente");
  const scen=[
    [["quick","clear","none"],"RTF"],
    [["text","roughly","audience"],"CRAFT"],
    [["big","clear","strict"],"CONTEXTE-V"],
    [["unsure","vague","missed"],"Ingénierie inversée"],
  ];
  for(const [ids,want] of scen){
    click("guide");
    if(!html().includes("Trouver ma méthode")) throw new Error("question 1 absente");
    ids.forEach(id=>click("gpick",{id}));
    const h=html();
    const ok=h.includes("Je te recommande")&&h.includes("<h2>"+want)&&h.includes("Pourquoi");
    console.log((ok?"✅":"❌")+" guide "+ids.join("/")+" -> "+want);
    if(!ok) {console.log(h.slice(0,400)); process.exit(1);}
  }
  // retour depuis le résultat, puis démarrage de la méthode recommandée
  click("gback"); if(!html().includes("3/3")) throw new Error("retour question 3 KO");
  click("gpick",{id:"missed"}); click("openMethod",{id:"reverse"});
  console.log((html().includes("class=\"prog steps\"")||html().includes("Ton prompt est prêt"))?"✅ Commencer ouvre la méthode (reprise ou résultat déjà sauvegardé)":"❌ Commencer");
  // validation : champ vide bloque
  click("tab",{id:"methods"}); click("openMethod",{id:"rtf"}); click("restart");
  click("next");
  console.log(els.err.innerHTML.includes("obligatoire")?"✅ champ vide bloqué":"❌ validation");
  type("court"); click("next");
  console.log(els.err.innerHTML.includes("Trop court")?"✅ texte trop court bloqué":"❌ minLength");
  type("expert"); click("next");
  console.log(els.err.innerHTML.length?"✅ réponse vague bloquée":"❌ vague");

  // ===== MODALE + BIBLIOTHÈQUE =====
  const ok=(c,m)=>{console.log((c?"✅":"❌")+" "+m); if(!c) process.exitCode=1;};
  const tick=()=>new Promise(r=>setTimeout(r,5));
  const clickModal=(which,idx)=>{const m=modals[idx===undefined?modals.length-1:idx]; (m._l.click||[]).forEach(f=>f({target:{closest:()=>({dataset:{m:which}})}}));};
  // wizard RTF : étape 1 (rôle)
  click("tab",{id:"methods"});
  click("openMethod",{id:"rtf"}); click("restart");
  ok(html().includes("Voir tous les exemples (13)"),"wizard : bouton 'Voir tous les exemples (13)'");
  click("moreEx"); ok((els.exlist.innerHTML.match(/data-a="useEx"/g)||[]).length===13,"moreEx : les 13 exemples s'affichent");
  const n0=modals.length;
  click("useEx",{i:"0"}); await tick();
  ok(modals.length===n0+1&&modals[n0].innerHTML.includes("Utiliser cet exemple ?")&&modals[n0].innerHTML.includes("enseignant spécialisé")&&modals[n0].innerHTML.includes("Non")&&modals[n0].innerHTML.includes("Oui, l&#39;utiliser"),"modale : titre, aperçu de l'exemple, boutons Non / Oui");
  ok(!modals[n0].innerHTML.includes("remplacera"),"modale : pas de mention 'remplacera' quand le champ est vide");
  clickModal("no"); await tick();
  click("next"); ok(html().includes("obligatoire")||els.err.innerHTML.includes("obligatoire"),"Non => rien n'est rempli (le champ reste obligatoire)");
  click("useEx",{i:"0"}); await tick(); clickModal("yes"); await tick();
  ok(html().includes("enseignant sp"),"Oui => l'exemple est inséré dans l'aperçu");
  // champ déjà rempli : message de remplacement
  const n1=modals.length; click("useEx",{i:"1"}); await tick();
  ok(modals[n1].innerHTML.includes("remplacera"),"modale : prévient que l'exemple remplacera le texte déjà écrit");
  docL.keydown({key:"Escape"}); await tick(); ok(modals[n1]._cls.has("show")===false,"Échap ferme la modale (équivaut à Non)");
  // clic sur le fond = Non
  click("useEx",{i:"2"}); await tick(); const wrapM=modals[modals.length-1]; (wrapM._l.click||[]).forEach(f=>f({target:wrapM}));
  ok(wrapM._cls.has("show")===false,"clic sur le fond ferme la modale");
  // Tab = piège de focus (ne plante pas)
  click("useEx",{i:"2"}); await tick(); docL.keydown({key:"Tab",preventDefault(){}}); clickModal("no"); await tick();
  // bibliothèque
  click("tab",{id:"library"});
  ok(html().includes("Tous (38)")&&(html().match(/data-a="openLib"/g)||[]).length===38,"bibliothèque : 38 cartes");
  click("libcat",{id:"finance"}); ok((html().match(/data-a="openLib"/g)||[]).length===10,"filtre finance : 10 cartes");
  click("openLib",{id:"fin-7"}); ok(html().includes("<mark>[sujet]</mark>")&&html().includes("Utiliser ce prompt"),"détail : [sujet] surligné, bouton Utiliser");
  ok(html().includes("L&#39;améliorer avec RTF")||html().includes("améliorer avec RTF"),"détail : bouton 'L'améliorer avec RTF'");
  const n2=modals.length; click("libUse",{},); await tick();
  ok(modals.length===n2+1&&modals[n2].innerHTML.includes("Utiliser ce prompt ?")&&modals[n2].innerHTML.includes("crochets"),"libUse : modale avec rappel des crochets");
  const c0=copied.length; clickModal("no"); await tick(); ok(copied.length===c0,"Non => rien n'est copié");
  click("libUse"); await tick(); clickModal("yes"); await tick();
  ok(copied.length===c0+1&&copied[copied.length-1].startsWith("Créer un tableau présentant"),"Oui => le prompt est copié");
  click("openLib",{id:"adm-3"}); ok(html().includes("<mark>xx</mark>"),"détail adm-3 : « xx » surligné");
  click("openLib",{id:"prod-1"}); ok(html().includes("✓ rôle")&&html().includes("✓ format")&&!html().includes("✗"),"détail prod-1 : éléments présents listés, aucun manquant");
  // technique : charger un exemple
  click("tab",{id:"techniques"}); click("openTech",{id:"prompt-chaining"});
  ok(html().includes("Chaînage de prompts")&&html().includes("Testeur"),"nouvelle technique : fiche Chaînage affichée");
  click("openTech",{id:"metaprompting"}); ok(html().includes("Métaprompting"),"nouvelle technique : fiche Métaprompting affichée");
  click("openTech",{id:"zero-shot"}); click("loadEx",{i:"0"}); await tick(); const m3=modals[modals.length-1];
  ok(m3.innerHTML.includes("dans le testeur"),"loadEx : modale de confirmation"); clickModal("yes"); await tick();
  ok(els.tbase.value.length>5,"loadEx Oui => testeur rempli");
  // résultat : checklist
  click("tab",{id:"methods"}); click("openMethod",{id:"qq"}); click("restart"); ok(html().includes('data-phase="early"')&&html().includes('class="stn'),"éditeur : phase début + barre d'étapes");
  const qqm=JSON.parse(require("fs").readFileSync("lib/knowledge/methods/qq.json","utf8")); const last=qqm.examples[qqm.examples.length-1];
  for(const b of qqm.blocks){ type(last.answers[b.id]); click("next"); }
  ok(html().includes('data-tagin="__inc"')&&html().includes("Facultatif"),"étape Précisions : deux champs à tags, facultatifs");
  click("next");
  ok(html().includes("Checklist avant d")&&(html().match(/class="ck"/g)||[]).length===8,"résultat : checklist de 8 points");
  ok(html().includes('data-phase="end"')&&html().includes('class="copybtn go"')&&html().includes('class="fold'),"résultat : calme (phase fin), copier animé, repliables");
  const qqN=()=>Store.list(localStorage).filter(p=>p.methodId==="qq").length;
  const q1=qqN(); ok(q1>=1,"résultat : prompt sauvegardé dans Projets");
  click("edit"); click("next"); ok(qqN()===q1,"Modifier puis revalider : pas de doublon");
  click("go",{id:"projects"}); ok(html().includes("Projets")&&html().includes('data-a="openProj"'),"vue Projets : liste");
  const pid=Store.list(localStorage).filter(p=>p.methodId==="qq")[0].id; click("openProj",{id:pid});
  const shown=html().split('<pre id="final">')[1].split("</pre>")[0];
  ok(shown.length>20&&!/kameleon|morfy/i.test(shown)&&html().includes("Exporter .txt"),"détail : prompt seul, sans mention Kameleon");
  ok(html().includes('class="slide"')&&html().includes("Glisse pour supprimer"),"détail : glisser pour supprimer");
  click("delProj"); await tick();
  ok(qqN()===q1-1&&html().includes("Projets"),"suppression avec confirmation");
  click("go",{id:"settings"}); ok(html().includes("Exporter")&&html().includes("Importer")&&html().includes("Thème")&&html().includes("Mode économique")&&html().includes('class="tgl'),"vue Réglages");
  click("go",{id:"home"}); ok(html().includes("Méthodes")&&html().includes('class="seg stick"')&&html().includes('class="coin"'),"retour Accueil : onglets glissants + pièces");
  ok(html().includes("Écris des prompts qui marchent")&&html().includes('class="tile w"')&&html().includes('class="tile d"'),"accueil : accroche courte + cartes blanche et sombre");
  ok(html().includes('class="mth"')&&html().includes("<em>R</em>"),"cartes des méthodes : pastille image + lettre de secours");
  // effort : 3 crans, texte seulement (même nombre d'étapes)
  click("openMethod",{id:"rtf"}); click("restart");
  const nSteps=(html().match(/class="stn/g)||[]).length;
  ok(html().includes('data-effort="mid"')&&html().includes('class="cl exs"')&&html().includes('class="cl pv"'),"effort Moyen par défaut : aide, exemples repliés, aperçu");
  click("effort",{v:"min"}); ok(html().includes('data-effort="min"')&&(html().match(/class="stn/g)||[]).length===nSteps,"effort Moins : même nombre d'étapes");
  click("effort",{v:"max"}); ok(html().includes('data-effort="max"')&&html().includes('class="cl tips"'),"effort Explicatif : astuces présentes");
  click("effort",{v:"next"}); ok(html().includes('data-effort="min"'),"le bouton rotatif passe de cran en cran");
  click("effort",{v:"mid"});
  click("go",{id:"home"});
  process.exit(process.exitCode||0);
})().catch(e=>{console.error("ÉCHEC:",e.message);process.exit(1)});
