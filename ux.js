// ux.js — petites règles d'interface PURES (testables en Node)
(function (root) {
  // phase d'édition : l'écran est vivant au début, plus calme vers la fin
  function phaseOf(step, n) {
    if (!(n > 1)) return "early";
    const r = step / (n - 1);
    return r < 0.34 ? "early" : r < 0.8 ? "mid" : "end";
  }
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  // "glisser pour confirmer" : validé à 85 % de la course
  const swipeDone = (x, max) => max > 0 && x >= max * 0.85;
  const progress = (step, n) => (n > 1 ? step / (n - 1) : 1);
  // effort = quantité de texte à l'écran (le nombre de questions ne change jamais)
  const EFFORTS = ["min", "mid", "max"];
  const effortOf = v => (EFFORTS.indexOf(v) >= 0 ? v : "mid");
  const nextEffort = e => EFFORTS[(EFFORTS.indexOf(effortOf(e)) + 1) % 3];
  const effortDeg = e => ({ min: -60, mid: 0, max: 60 })[effortOf(e)];
  const effortPos = e => ({ min: 0, mid: 0.5, max: 1 })[effortOf(e)];
  // tags : Entrée ajoute, doublons et mots vides refusés
  function addTag(list, text, max) {
    const t = String(text || "").trim().replace(/\s+/g, " ").slice(0, 40), l = Array.isArray(list) ? list : [];
    if (!t || l.length >= (max || 12) || l.some(x => x.toLowerCase() === t.toLowerCase())) return l;
    return l.concat([t]);
  }
  const removeTag = (list, i) => (Array.isArray(list) ? list.filter((_, k) => k !== i) : []);
  const shortHint = (s, n) => { s = String(s || ""); return s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…"; };
  const api = { phaseOf, clamp, swipeDone, progress, EFFORTS, effortOf, nextEffort, effortDeg, effortPos, addTag, removeTag, shortHint };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.UX = api;
})(typeof window !== "undefined" ? window : globalThis);
