// boot.js — thème Clair/Sombre/Auto + migration des clés "morfy:" -> "kameleon:"
// Chargé dans <head> (avant le CSS visible) pour éviter le flash de thème.
(function (root) {
  const PREF = "kameleon:theme", OLD = "morfy:", NEW = "kameleon:";
  const COLORS = { dark: "#0f1115", light: "#f6f5f3" };
  const ORDER = ["auto", "light", "dark"], LABEL = { auto: "◐ Auto", light: "☀ Clair", dark: "☾ Sombre" };

  // migration : copie sans écraser, puis supprime l'ancienne clé ; peut être relancée sans risque
  function migrate(ls) {
    const moved = [];
    try {
      Object.keys(ls).filter(k => k.indexOf(OLD) === 0).forEach(k => {
        const nk = NEW + k.slice(OLD.length);
        if (ls.getItem(nk) === null) ls.setItem(nk, ls.getItem(k));
        ls.removeItem(k); moved.push(nk);
      });
    } catch (e) {}
    return moved;
  }
  const resolve = (pref, sysDark) => (pref === "light" || pref === "dark" ? pref : sysDark ? "dark" : "light");
  const getPref = ls => { try { const p = ls.getItem(PREF); return ORDER.includes(p) ? p : "auto"; } catch (e) { return "auto"; } };
  const nextPref = p => ORDER[(ORDER.indexOf(p) + 1) % ORDER.length];

  function apply(doc, ls, mq) {
    const theme = resolve(getPref(ls), !!(mq && mq.matches));
    doc.documentElement.setAttribute("data-theme", theme);
    const meta = doc.querySelector && doc.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", COLORS[theme]);
    return theme;
  }
  function cycle(doc, ls, mq) {
    const p = nextPref(getPref(ls));
    try { ls.setItem(PREF, p); } catch (e) {}
    apply(doc, ls, mq);
    return p;
  }
  // mode économique : moins d'animations (utile sur téléphone lent)
  const ECO = "kameleon:eco";
  const lowEnd = nav => !!(nav && ((nav.hardwareConcurrency && nav.hardwareConcurrency <= 4) || (nav.deviceMemory && nav.deviceMemory <= 2)));
  function ecoOn(ls, nav) {
    let p = null; try { p = ls.getItem(ECO); } catch (e) {}
    return p === "on" ? true : p === "off" ? false : lowEnd(nav);
  }
  function applyEco(doc, ls, nav) {
    const on = ecoOn(ls, nav), h = doc.documentElement;
    if (on) h.setAttribute("data-eco", ""); else h.removeAttribute("data-eco");
    return on;
  }
  function toggleEco(doc, ls, nav) {
    try { ls.setItem(ECO, ecoOn(ls, nav) ? "off" : "on"); } catch (e) {}
    return applyEco(doc, ls, nav);
  }
  const resolved = (ls, mq) => resolve(getPref(ls), !!(mq && mq.matches));
  function setPref(doc, ls, mq, p) {
    try { ls.setItem(PREF, ORDER.includes(p) ? p : "auto"); } catch (e) {}
    return apply(doc, ls, mq);
  }
  // bouton rond du haut : bascule entre les deux thèmes VISIBLES (un seul clic change l'écran)
  function toggle(doc, ls, mq) {
    return setPref(doc, ls, mq, resolved(ls, mq) === "dark" ? "light" : "dark");
  }
  const api = { resolved, setPref, toggle, ecoOn, applyEco, toggleEco, migrate, resolve, getPref, nextPref, apply, cycle, LABEL, ORDER };

  if (typeof module !== "undefined" && module.exports) { module.exports = api; return; }
  root.Kameleon = api;
  try {
    migrate(root.localStorage);
    const mq = root.matchMedia ? root.matchMedia("(prefers-color-scheme: dark)") : null;
    apply(root.document, root.localStorage, mq);
    applyEco(root.document, root.localStorage, root.navigator);
    if (mq && mq.addEventListener) mq.addEventListener("change", () => apply(root.document, root.localStorage, mq));
  } catch (e) {}
})(typeof window !== "undefined" ? window : globalThis);
