// engine.js — logique pure (sans écran). Testable avec Node.
(function (root) {
  const KB = "lib/knowledge/";

  function getSteps(method) {
    return method.blocks || method.steps || [];
  }

  // Options d'un champ "select" / "select-multi"
  function optionsFor(block, ctx) {
    if (block.options) return block.options.map(o => ({ id: o.id, label: o.label, when: o.when }));
    if (block.source === "levels.json") return ctx.levels.scale.map(l => ({ id: String(l.id), label: l.label, when: l.description }));
    if (block.source === "tones.json") return ctx.tones.tones.map(t => ({ id: t.id, label: t.label, when: t.effect }));
    return [];
  }

  // Valeur d'une réponse -> texte inséré dans le prompt
  function valueToText(block, value, ctx) {
    if (block.type === "toggle") return value ? (block.formula || "") : "";
    if (value === undefined || value === null) return "";
    if (block.type === "select" || block.type === "select-multi") {
      const opts = optionsFor(block, ctx);
      const ids = Array.isArray(value) ? value : [value];
      return joinFr(ids
        .map(id => (opts.find(o => o.id === id) || {}).label || id)
        .map(l => (block.id === "tone" || block.type === "select-multi" ? l.toLowerCase() : l)));
    }
    return String(value).trim();
  }

  // Assemble le prompt. preview=true : les trous restent visibles [Rôle]
  function buildPrompt(method, answers, ctx, preview) {
    const steps = getSteps(method);
    const byId = {};
    steps.forEach(s => (byId[s.id] = s));
    const lines = method.template.pattern.split("\n");
    const out = [];
    for (const line of lines) {
      const ids = [...line.matchAll(/\{(\w+)\}/g)].map(m => m[1]);
      let filled = 0;
      const text = line.replace(/\{(\w+)\}/g, (m, id) => {
        const b = byId[id];
        const v = b ? valueToText(b, answers[id], ctx) : "";
        if (v) { filled++; return v; }
        return preview ? "[" + (b ? b.label : id) + "]" : "";
      });
      if (!preview && ids.length && filled === 0) continue; // ligne vide -> on la retire
      out.push(text);
    }
    return out.join("\n");
  }

  // Validation d'une étape -> { ok, errors[], warnings[] }
  function validateStep(block, value, ctx) {
    const errors = [], warnings = [];
    const v = block.validation || {};
    const empty = block.type === "select-multi" ? !(value && value.length) :
      block.type === "toggle" ? false : !value || !String(value).trim();
    if (empty) {
      if (block.required) errors.push("Ce champ est obligatoire.");
      return { ok: errors.length === 0, errors, warnings };
    }
    if (block.type === "text" || block.type === "textarea") {
      const s = String(value).trim();
      if (v.minLength && s.length < v.minLength) errors.push("Trop court : " + s.length + "/" + v.minLength + " caractères minimum.");
      if (v.maxLength && s.length > v.maxLength) errors.push("Trop long : " + s.length + "/" + v.maxLength + " caractères maximum.");
      (v.forbiddenPatterns || []).forEach(p => {
        try { if (new RegExp(p, "i").test(s)) errors.push("Trop vague : sois plus précis."); } catch (e) {}
      });
    }
    if (block.type === "select-multi") {
      if (block.max && value.length > block.max) errors.push("Maximum " + block.max + " choix.");
      (ctx.tones.incompatibilities || []).forEach(inc => {
        if (inc.pair.every(p => value.includes(p))) warnings.push(inc.reason);
      });
    }
    return { ok: errors.length === 0, errors, warnings };
  }

  // Technique appliquée à un prompt de base
  function applyTechnique(basePrompt, phrases) {
    const base = (basePrompt || "").trim();
    if (!phrases.length) return base;
    return base + (base ? "\n\n" : "") + phrases.join("\n");
  }

  // Phrase "a, b et c"
  function joinFr(list) {
    const a = (list || []).filter(Boolean);
    if (a.length <= 1) return a.join("");
    return a.slice(0, -1).join(", ") + " et " + a[a.length - 1];
  }

  // Questionnaire de départ : réponses -> méthodes classées
  function recommend(guide, answers) {
    const score = {}, reasons = {};
    (guide.questions || []).forEach(q => {
      const o = (q.options || []).find(x => x.id === answers[q.id]);
      if (!o) return;
      Object.entries(o.weights || {}).forEach(([id, w]) => {
        score[id] = (score[id] || 0) + w;
        if (w > 0 && o.reason) {
          reasons[id] = reasons[id] || [];
          if (!reasons[id].includes(o.reason)) reasons[id].push(o.reason);
        }
      });
    });
    const order = guide.tieBreak || [];
    const rank = id => (order.indexOf(id) === -1 ? 99 : order.indexOf(id));
    let ids = Object.keys(score);
    if (!ids.length) { ids = [guide.fallback || "rtf"]; score[ids[0]] = 0; }
    ids.sort((a, b) => score[b] - score[a] || rank(a) - rank(b));
    return ids.map(id => ({ id, score: score[id] || 0, reasons: reasons[id] || [] }));
  }

  const api = { KB, recommend, joinFr, getSteps, optionsFor, valueToText, buildPrompt, validateStep, applyTechnique };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Engine = api;
})(typeof window !== "undefined" ? window : globalThis);
