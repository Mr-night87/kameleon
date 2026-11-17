// Test du thème et de la migration des clés : node tests/test-boot.js
const B = require("../boot.js"); let n = 0;
const ok = (c, m) => { if (!c) { console.error("ÉCHEC:", m); process.exit(1); } n++; };
const mkLS = init => { const d = Object.assign({}, init); return Object.assign(d, {}) && new Proxy(d, { get: (t, k) => k === "getItem" ? x => (x in t ? t[x] : null) : k === "setItem" ? (x, v) => (t[x] = String(v)) : k === "removeItem" ? x => delete t[x] : t[k], ownKeys: t => Reflect.ownKeys(t), getOwnPropertyDescriptor: (t, k) => ({ value: t[k], enumerable: true, configurable: true }) }); };
// migration
let ls = mkLS({ "morfy:rtf": '{"a":1}', "morfy:craft": '{"b":2}', autre: "x" });
let moved = B.migrate(ls);
ok(moved.length === 2, "2 clés migrées");
ok(ls.getItem("kameleon:rtf") === '{"a":1}' && ls.getItem("kameleon:craft") === '{"b":2}', "valeurs identiques");
ok(ls.getItem("morfy:rtf") === null, "ancienne clé supprimée");
ok(ls.getItem("autre") === "x", "clé étrangère intacte");
ok(B.migrate(ls).length === 0, "2e passage = rien");
// pas d'écrasement
ls = mkLS({ "morfy:rtf": "vieux", "kameleon:rtf": "neuf" }); B.migrate(ls);
ok(ls.getItem("kameleon:rtf") === "neuf", "le neuf n'est pas écrasé");
// thème
ok(B.resolve("auto", true) === "dark" && B.resolve("auto", false) === "light", "auto suit le téléphone");
ok(B.resolve("light", true) === "light" && B.resolve("dark", false) === "dark", "forcé prime");
ok(B.nextPref("auto") === "light" && B.nextPref("light") === "dark" && B.nextPref("dark") === "auto", "cycle");
ok(B.getPref(mkLS({})) === "auto", "défaut auto");
ok(B.getPref(mkLS({ "kameleon:theme": "bidon" })) === "auto", "valeur invalide -> auto");
const attrs = {}, meta = { c: "", setAttribute(k, v) { this.c = v; } };
const doc = { documentElement: { setAttribute: (k, v) => (attrs[k] = v) }, querySelector: () => meta };
ls = mkLS({ "kameleon:theme": "light" });
ok(B.apply(doc, ls, { matches: true }) === "light" && attrs["data-theme"] === "light" && meta.c === "#f6f5f3", "clair + theme-color");
B.cycle(doc, ls, { matches: true });
ok(ls.getItem("kameleon:theme") === "dark" && attrs["data-theme"] === "dark" && meta.c === "#0f1115", "cycle -> sombre");
console.log("boot OK :", n, "contrôles");
// mode économique
const E2 = require("../boot.js"); let n2 = 0;
const ok2 = (c, m) => { if (!c) { console.error("ÉCHEC:", m); process.exit(1); } n2++; };
const lsE = (() => { const d = {}; return { getItem: k => (k in d ? d[k] : null), setItem: (k, v) => (d[k] = String(v)) }; })();
const docE = { documentElement: { on: false, setAttribute() { this.on = true; }, removeAttribute() { this.on = false; } } };
ok2(E2.ecoOn(lsE, { hardwareConcurrency: 8 }) === false, "8 cœurs : éco coupé par défaut");
ok2(E2.ecoOn(lsE, { hardwareConcurrency: 4 }) === true && E2.ecoOn(lsE, { deviceMemory: 2 }) === true, "téléphone modeste : éco par défaut");
ok2(E2.toggleEco(docE, lsE, { hardwareConcurrency: 8 }) === true && docE.documentElement.on === true, "bascule -> éco actif");
ok2(E2.toggleEco(docE, lsE, { hardwareConcurrency: 8 }) === false && docE.documentElement.on === false, "bascule -> éco coupé");
ok2(E2.ecoOn(lsE, { hardwareConcurrency: 2 }) === false, "le choix de l'utilisateur prime sur la détection");
console.log("éco OK :", n2, "contrôles");
{ let n3 = 0; const ok3 = (c, m) => { if (!c) { console.error("ÉCHEC:", m); process.exit(1); } n3++; };
  const mk3 = i => { const d = Object.assign({}, i); return { getItem: k => (k in d ? d[k] : null), setItem: (k, v) => (d[k] = String(v)) }; };
  const doc3 = { documentElement: { setAttribute() {} }, querySelector: () => null };
  let l3 = mk3({});
  ok3(E2.toggle(doc3, l3, { matches: true }) === "light", "téléphone sombre : 1 seul clic -> clair");
  ok3(E2.toggle(doc3, l3, { matches: true }) === "dark", "2e clic -> sombre");
  l3 = mk3({});
  ok3(E2.toggle(doc3, l3, { matches: false }) === "dark", "téléphone clair : 1 seul clic -> sombre");
  ok3(E2.setPref(doc3, l3, { matches: true }, "auto") === "dark" && E2.resolved(l3, { matches: false }) === "light", "Auto suit le téléphone");
  console.log("thème 2 états OK :", n3, "contrôles"); }
