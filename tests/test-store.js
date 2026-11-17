// node tests/test-store.js
const S = require("../store.js"), fs = require("fs"), path = require("path"); let n = 0;
const ok = (c, m) => { if (!c) { console.error("ÉCHEC:", m); process.exit(1); } n++; };
const mk = () => { const d = {}; return { getItem: k => (k in d ? d[k] : null), setItem: (k, v) => (d[k] = String(v)), removeItem: k => delete d[k], d }; };
let ls = mk();
const a = S.create(ls, { methodId: "rtf", label: "RTF", answers: { role: "x" }, prompt: "Tu es x." });
const b = S.create(ls, { methodId: "craft", label: "CRAFT", prompt: "Autre" });
ok(a.id !== b.id, "ids uniques");
ok(S.list(ls).length === 2 && S.list(ls)[0].id === b.id, "liste : récent d'abord");
ok(S.get(ls, a.id).prompt === "Tu es x.", "get");
S.update(ls, a.id, { prompt: "Tu es y." });
ok(S.get(ls, a.id).prompt === "Tu es y." && S.list(ls).length === 2, "update sans doublon");
const ex = S.exportAll(ls);
ok(ex.app === "kameleon-prompter" && ex.projects.length === 2, "export");
S.remove(ls, a.id);
ok(S.list(ls).length === 1 && S.get(ls, a.id) === null, "suppression");
const ls2 = mk();
let r = S.importAll(ls2, JSON.parse(JSON.stringify(ex)));
ok(r.ok && r.added === 2 && S.list(ls2).length === 2, "import dans un navigateur vide");
r = S.importAll(ls2, ex);
ok(r.added === 0 && r.skipped === 2 && S.list(ls2).length === 2, "import 2x : aucun doublon");
ok(!S.importAll(ls2, { app: "autre" }).ok && !S.importAll(ls2, null).ok, "fichier invalide refusé");
ls2.d["kameleon:project:zzz"] = "{pas du json";
ok(S.get(ls2, "zzz") === null, "JSON cassé -> null, pas de plantage");
// RÈGLE ABSOLUE : jamais de mention Kameleon dans un prompt copié / exporté
const dir = path.join(__dirname, "../lib/knowledge"), bad = /kameleon|morfy/i; let c = 0;
fs.readdirSync(dir + "/methods").forEach(f => (JSON.parse(fs.readFileSync(dir + "/methods/" + f)).examples || []).forEach(e => { if (e.finalPrompt !== undefined) { c++; ok(!bad.test(S.toText({ prompt: e.finalPrompt })), "mention dans " + f); } }));
JSON.parse(fs.readFileSync(dir + "/library.json")).prompts.forEach(p => { c++; ok(!bad.test(p.prompt || p.text || ""), "mention dans bibliothèque " + p.id); });
ok(c > 40, "assez de prompts vérifiés (" + c + ")");
console.log("store OK :", n, "contrôles,", c, "prompts sans mention Kameleon");
// restauration après suppression (bouton Annuler)
{ const l = mk(), p = S.create(l, { methodId: "rtf", label: "RTF", prompt: "x" }), q = S.create(l, { methodId: "qq", label: "QQ", prompt: "y" });
  S.remove(l, p.id); ok(S.list(l).length === 1, "supprimé");
  S.restore(l, p); ok(S.list(l).length === 2 && S.get(l, p.id).prompt === "x", "Annuler : projet restauré");
  S.restore(l, p); ok(S.list(l).length === 2, "restaurer 2x : pas de doublon"); console.log("restauration OK"); }
