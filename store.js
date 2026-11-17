// store.js — projets sauvegardés (logique PURE, testable en Node)
// Clés : kameleon:projects (liste d'id, récent d'abord) et kameleon:project:<id>
(function (root) {
  const IDX = "kameleon:projects", PRE = "kameleon:project:";
  const rd = (ls, k) => { try { const v = ls.getItem(k); return v === null || v === undefined ? null : JSON.parse(v); } catch (e) { return null; } };
  const wr = (ls, k, v) => { try { ls.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const ids = ls => { const l = rd(ls, IDX); return Array.isArray(l) ? l : []; };
  const newId = () => "p_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const now = () => new Date().toISOString();

  function create(ls, d) {
    const t = now(), p = { version: 1, id: newId(), methodId: d.methodId || "", label: d.label || "Prompt", answers: d.answers || {}, prompt: d.prompt || "", created: t, updated: t };
    if (!wr(ls, PRE + p.id, p)) return null;
    wr(ls, IDX, [p.id].concat(ids(ls)));
    return p;
  }
  const get = (ls, id) => rd(ls, PRE + id);
  function update(ls, id, patch) {
    const p = get(ls, id); if (!p) return null;
    ["answers", "prompt", "label"].forEach(k => { if (patch[k] !== undefined) p[k] = patch[k]; });
    p.updated = now();
    return wr(ls, PRE + id, p) ? p : null;
  }
  function remove(ls, id) {
    try { ls.removeItem(PRE + id); } catch (e) {}
    wr(ls, IDX, ids(ls).filter(x => x !== id));
  }
  // remet un projet supprimé (même id) en tête de liste
  function restore(ls, p) {
    if (!p || typeof p.id !== "string") return null;
    if (!wr(ls, PRE + p.id, p)) return null;
    if (!ids(ls).includes(p.id)) wr(ls, IDX, [p.id].concat(ids(ls)));
    return p;
  }
  const list = ls => ids(ls).map(i => get(ls, i)).filter(Boolean);
  const exportAll = ls => ({ app: "kameleon-prompter", version: 1, exported: now(), projects: list(ls) });
  // ajoute sans écraser : un id déjà présent est ignoré
  function importAll(ls, data) {
    if (!data || data.app !== "kameleon-prompter" || !Array.isArray(data.projects)) return { ok: false, error: "fichier non reconnu" };
    let added = 0, skipped = 0;
    const have = new Set(ids(ls)), add = [];
    data.projects.forEach(p => {
      if (!p || typeof p.id !== "string" || typeof p.prompt !== "string" || have.has(p.id)) { skipped++; return; }
      if (wr(ls, PRE + p.id, p)) { have.add(p.id); add.push(p.id); added++; } else skipped++;
    });
    wr(ls, IDX, ids(ls).concat(add));
    return { ok: true, added, skipped };
  }
  // texte exporté / copié = le prompt SEUL, jamais de mention Kameleon
  const toText = p => p.prompt;
  const api = { create, get, update, remove, restore, list, exportAll, importAll, toText };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Store = api;
})(typeof window !== "undefined" ? window : globalThis);
