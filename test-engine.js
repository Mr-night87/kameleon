// Lance : node test-engine.js   (vérifie les 6 méthodes avec leurs exemples)
const fs = require("fs");
const E = require("./engine.js");
const rd = p => JSON.parse(fs.readFileSync("lib/knowledge/" + p, "utf8"));
const index = rd("index.json");
const ctx = { levels: rd("levels.json"), tones: rd("tones.json") };
let bad = 0;
for (const it of index.categories.methods.items) {
  const m = rd("methods/" + it.file);
  const ex = m.examples[0]; ex.answers = ex.answers || ex.steps;
  const prompt = E.buildPrompt(m, ex.answers || {}, ctx, false);
  const hole = /\[[^\]]+\]/.test(E.buildPrompt(m, {}, ctx, true));
  const steps = E.getSteps(m);
  const errs = steps.flatMap(s => E.validateStep(s, (ex.answers || {})[s.id], ctx).errors.map(e => s.id + ": " + e));
  console.log("\n=== " + m.label + " (" + steps.length + " étapes) trous visibles: " + hole);
  console.log(prompt);
  if (errs.length) { console.log("  ⚠ validation:", errs.join(" | ")); }
  if (!prompt.trim()) { bad++; console.log("  ❌ prompt vide"); }
}
for (const it of index.categories.techniques.items) {
  const t = rd("techniques/" + it.file);
  console.log("technique " + t.id + ": " + t.triggerPhrases.length + " déclencheurs, " + t.examplePrompts.length + " exemples");
}
console.log(bad ? "\n❌ " + bad + " problème(s)" : "\n✅ Moteur OK");
if (bad) process.exit(1);

// ---- Questionnaire de départ : scénarios ----
{
  const guide = rd("guide.json");
  const cases = [
    [{ goal: "quick", clarity: "clear", constraints: "none" }, "rtf"],
    [{ goal: "text", clarity: "roughly", constraints: "audience" }, "craft"],
    [{ goal: "big", clarity: "clear", constraints: "strict" }, "contexte-v"],
    [{ goal: "unsure", clarity: "vague", constraints: "none" }, "qq"],
    [{ goal: "unsure", clarity: "vague", constraints: "missed" }, "reverse"],
    [{ goal: "learn", clarity: "roughly", constraints: "none" }, "rtf"],
    [{}, "rtf"],
  ];
  let g = 0;
  for (const [ans, want] of cases) {
    const r = E.recommend(guide, ans);
    const ok = r[0].id === want;
    if (!ok) g++;
    console.log((ok ? "✅" : "❌") + " guide " + JSON.stringify(ans) + " -> " + r[0].id + " (attendu " + want + ")");
  }
  console.log(g ? "❌ " + g + " scénario(s) du guide en échec" : "✅ Guide OK");
  if (g) process.exit(1);
}

// ---- Qualité des données (exemples, bibliothèque, aide) ----
{
  const fs2 = require("fs");
  let bad2 = 0; const fail = m => { bad2++; console.log("❌ " + m); };
  const ctx2 = { levels: rd("levels.json"), tones: rd("tones.json") };
  const methods = index.categories.methods.items.map(i => rd("methods/" + i.file));
  // 1) chaque exemple proposé dans un champ doit passer la validation du champ
  let nEx = 0;
  for (const m of methods) for (const b of E.getSteps(m)) {
    if (b.type !== "text" && b.type !== "textarea") continue;
    for (const x of b.examples || []) { nEx++; const r = E.validateStep(b, x, ctx2); if (!r.ok) fail("exemple invalide " + m.id + "." + b.id + " : « " + x.slice(0, 50) + " » -> " + r.errors.join(" ")); }
  }
  console.log("✅ " + nEx + " exemples de champs vérifiés (longueur, mots interdits)");
  // 2) exemples complets : réponses valides + finalPrompt cohérent avec le moteur
  let nFull = 0, stale = 0;
  for (const m of methods) for (const ex of m.examples) {
    nFull++;
    const errs = E.getSteps(m).flatMap(s => E.validateStep(s, (ex.answers || ex.steps || {})[s.id], ctx2).errors);
    if (errs.length) fail("exemple complet invalide " + m.id + "/" + ex.id + " : " + errs.join(" "));
    if (ex.finalPrompt !== undefined && m.id !== "reverse" && ex.finalPrompt !== E.buildPrompt(m, ex.answers || {}, ctx2, false)) stale++;
  }
  if (stale) fail(stale + " finalPrompt différent(s) du moteur");
  console.log("✅ " + nFull + " exemples complets : réponses valides, finalPrompt identique à ce que génère l'appli");
  // 3) bibliothèque
  const lib = rd("library.json"), ids = new Set(), mids = new Set(methods.map(m => m.id));
  const tids = new Set(index.categories.techniques.items.map(t => t.id)), cids = new Set(lib.categories.map(c => c.id));
  for (const p of lib.prompts) {
    if (ids.has(p.id)) fail("id en double " + p.id); ids.add(p.id);
    if (!cids.has(p.category)) fail(p.id + " catégorie inconnue");
    if (!mids.has(p.method)) fail(p.id + " méthode inconnue " + p.method);
    if (!tids.has(p.technique)) fail(p.id + " technique inconnue " + p.technique);
    if (!lib.sources[p.source]) fail(p.id + " source inconnue");
    p.elements.forEach(e => { if (!lib.elementsLegend[e]) fail(p.id + " élément inconnu " + e); });
    const miss = ["rôle", "contexte", "format"].filter(e => !p.elements.includes(e));
    if (JSON.stringify(miss) !== JSON.stringify(p.missing) || p.improve.length !== miss.length) fail(p.id + " 'missing/improve' incohérent");
    p.placeholders.forEach(ph => { if (!p.prompt.includes(ph)) fail(p.id + " placeholder absent du prompt : " + ph); });
    if (p.prompt.length < 30) fail(p.id + " prompt trop court");
  }
  if (lib.prompts.length !== lib.metadata.total) fail("total bibliothèque incohérent");
  console.log("✅ Bibliothèque : " + lib.prompts.length + " prompts, références valides");
  // 4) index
  const md = index.metadata;
  if (md.totalTechniques !== index.categories.techniques.items.length) fail("totalTechniques");
  if (md.totalStandalone !== index.standalone.files.length) fail("totalStandalone");
  for (const t of index.categories.techniques.items) {
    const d = rd("techniques/" + t.file);
    for (const k of ["label", "shortName", "description", "principle", "difficulty", "estimatedTime", "shortDescription", "whenToUse", "whenNotToUse", "triggerPhrases", "examplePrompts", "combinableWith", "limitations", "tips"])
      if (d[k] === undefined) fail("technique " + t.id + " : champ manquant " + k);
  }
  for (const f of index.standalone.files) if (!fs2.existsSync("lib/knowledge/" + f.file)) fail("fichier manquant " + f.file);
  console.log("✅ Index : " + md.totalMethods + " méthodes, " + md.totalTechniques + " techniques, " + md.totalStandalone + " fichiers transverses");
  // 5) aide
  const co = rd("coaching.json");
  const sizes = { steps: co.frameworks.berne.steps.length, adobe: co.frameworks.adobe.elements.length, bonnes: co.goodPractices.length, erreurs: co.mistakes.length, checklist: co.checklist.length, ethique: co.ethics.length };
  const want = { steps: 6, adobe: 4, bonnes: 6, erreurs: 6, checklist: 8, ethique: 2 };
  for (const k in want) if (sizes[k] !== want[k]) fail("coaching." + k + " = " + sizes[k] + " (attendu " + want[k] + ")");
  co.glossary.forEach(g => { if (!tids.has(g.technique)) fail("glossaire : technique inconnue " + g.technique); });
  console.log("✅ Aide à comprendre : 6 étapes Berne, 4 éléments Adobe, 6 bonnes pratiques, 6 erreurs, checklist de 8, glossaire de " + co.glossary.length);
  // 6) plus aucun alert() dans le code de l'appli
  for (const f of ["app.js", "engine.js", "modal.js", "store.js", "ux.js", "boot.js"]) if (/\b(alert|confirm|prompt)\s*\(/.test(fs2.readFileSync(f, "utf8"))) fail("alert/confirm/prompt natif trouvé dans " + f);
  console.log("✅ Aucun alert()/confirm() natif dans le code");
  if (bad2) process.exit(1);
}
