// app.js — interface du banc d'essai Kameleon Prompter
(function () {
  const E = window.Engine;
  const $app = document.getElementById("app");
  let D = null; // données chargées
  const S = { tab: "methods", method: null, step: 0, answers: {}, done: false, tech: null, picked: [], base: "", g: { i: 0, answers: {} }, libCat: "all", lib: null, exKey: "", pid: null, pop: null, lastP: null, proj: null, screen: "", back: false };

  // ---------- utilitaires ----------
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const li = arr => (arr || []).map(x => "<li>" + esc(x) + "</li>").join("");
  const byId = (list, id) => list.find(x => x.id === id);

  function store(id, val) {
    try {
      if (val === undefined) localStorage.removeItem("kameleon:" + id);
      else if (val === null) return JSON.parse(localStorage.getItem("kameleon:" + id));
      else localStorage.setItem("kameleon:" + id, JSON.stringify(val));
    } catch (e) {}
    return null;
  }
  const save = () => S.method && store(S.method.id, { answers: S.answers, step: S.step, done: S.done, pid: S.pid });

  async function getJSON(p) {
    const r = await fetch(E.KB + p);
    if (!r.ok) throw new Error(p + " → " + r.status);
    return r.json();
  }

  async function copyText(text, btn) {
    try { await navigator.clipboard.writeText(text); }
    catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch (_) {}
      ta.remove();
    }
    if (btn && btn.classList && btn.classList.add) {
      btn.classList.add("done");
      const lb = btn.querySelector && btn.querySelector(".lb");
      if (lb) lb.textContent = "Copié";
      setTimeout(() => { btn.classList.remove("done"); if (lb) lb.textContent = "Copier"; }, 1600);
    }
    toast("Copié");
  }
  const copyBtn = (target, primary) => '<button class="copybtn' + (primary ? " go" : "") + '" data-a="copy" data-target="' + target + '"><span class="ic"><svg class="cp" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg><svg class="ok" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12l5 5 9-10"/></svg></span><span class="lb">Copier</span></button>';
  const fold = (title, inner, open) => '<div class="fold' + (open ? " open" : "") + '"><button class="fh" data-a="fold">' + title + '<span class="chev">⌄</span></button><div class="fb"><div class="fi"><div class="fc">' + inner + "</div></div></div></div>";

  // message qui monte avec ressort, avec bouton "Annuler" optionnel
  let toastEl = null, toastT = null;
  function toast(msg, label, fn) {
    try {
      if (toastEl && toastEl.remove) toastEl.remove();
      const t = document.createElement("div");
      t.className = "tst"; t.textContent = msg;
      if (label && fn) {
        const b = document.createElement("button");
        b.textContent = label;
        b.addEventListener("click", () => { clearTimeout(toastT); if (t.remove) t.remove(); fn(); });
        t.appendChild && t.appendChild(b);
      }
      document.body.appendChild(t); toastEl = t;
      requestAnimationFrame(() => t.classList.add("show"));
      clearTimeout(toastT);
      toastT = setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove && t.remove(), 600); }, label ? 5000 : 1800);
    } catch (e) {}
  }

  // barre du bas : une seule pastille qui glisse ; cachée dans l'assistant, les fiches et le résultat
  const NAVI = ["home", "projects", "settings"];
  function setDock(on) {
    const d = document.getElementById("dock");
    if (!d) return;
    d.classList.toggle("hide", !on);
    if (on) {
      if (d.style && d.style.setProperty) d.style.setProperty("--i", NAVI.indexOf(on));
      if (d.children) Array.from(d.children).forEach(b => b.dataset && b.classList.toggle("on", b.dataset.id === on));
    }
  }

  // ---------- thème ----------
  const K = window.Kameleon, mq = () => (window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null);
  const themeLabel = () => (K ? K.LABEL[K.getPref(localStorage)] : "");
  // erreur sans rouge : message + tremblement
  function showErr(html) {
    const el = document.getElementById("err");
    if (!el) return;
    el.innerHTML = html;
    if (el.classList) { el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); }
  }

  // ---------- accueil ----------
  const TABS = [["methods", "Méthodes"], ["techniques", "Techniques"], ["library", "Bibliothèque"]];
  const homeBody = () => (S.tab === "methods" ? guideCard() + '<p class="label">Ou choisis toi-même</p>' + methodCards() : S.tab === "techniques" ? techCards() : libraryList()) + '<p class="foot">Kameleon Prompter</p>';
  function home() {
    S.method = null; S.tech = null; S.lib = null; S.screen = "home";
    const idx = Math.max(0, TABS.findIndex(t => t[0] === S.tab)), eff = getEffort(), np = Store.list(localStorage).length;
    const avImg = D.images && D.images.avatar ? '<img data-img alt="" src="' + esc(D.images.avatar) + '">' : "";
    $app.innerHTML =
      '<header class="pillbar"><span class="av">K' + avImg + '</span><span class="wm">KAMELEON</span><span class="tp">Prompter</span><button class="themebtn" data-a="theme" aria-label="Changer de thème">' + themeIcon() + "</button></header>" +
      '<section class="hero"><div class="coins"><i class="coin">R</i><i class="coin">C</i><i class="coin">Q</i></div>' +
      '<span class="badge">Guide pas à pas</span><h2>Écris des prompts qui marchent.</h2>' +
      '<p class="lead">Une question à la fois. Un prompt prêt à copier.</p>' +
      '<button class="cta" data-a="guide">Commencer</button></section>' +
      '<div class="tiles"><div class="tile w"><small>Quantité d\'aide</small><b class="efl">' + EL[eff] + "</b>" + knobHTML("sm") + '<div class="rule fx" style="--p:' + UX.effortPos(eff) + '"><u></u></div></div>' +
      '<button class="tile d" data-a="go" data-id="projects"><small>Mes prompts</small><b>' + np + '</b><div class="rule" style="--p:' + Math.min(1, np / 20) + '"><u></u></div></button></div>' +
      '<nav class="seg stick" style="--i:' + idx + '"><i class="pill"></i>' + TABS.map(t => '<button data-a="tab" data-id="' + t[0] + '" class="' + (S.tab === t[0] ? "on" : "") + '">' + t[1] + "</button>").join("") + "</nav>" +
      '<main id="homebody">' + homeBody() + "</main>";
    setDock("home");
  }

  // ---------- outils des vues ----------
  function fdate(iso) { try { return new Date(iso).toLocaleDateString("fr-FR"); } catch (e) { return ""; } }
  function download(name, text, type) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: type || "text/plain" }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  const slug = s => String(s || "prompt").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "prompt";

  // ---------- vue Projets ----------
  function projectsView() {
    const l = Store.list(localStorage);
    $app.innerHTML =
      '<header class="top"><h1>Projets</h1><p>' + l.length + " prompt" + (l.length > 1 ? "s" : "") + " sauvegardé" + (l.length > 1 ? "s" : "") + "</p></header>" +
      '<main><button class="btn go" data-a="newProj">+ Nouveau prompt</button>' +
      (l.length ? l.map(p => '<button class="card" data-a="openProj" data-id="' + esc(p.id) + '"><b>' + esc(p.label) + '</b> <span class="muted">· ' + esc(fdate(p.created)) + '</span><br><span class="muted">' + esc(p.prompt.slice(0, 110)) + (p.prompt.length > 110 ? "…" : "") + "</span></button>").join("")
        : '<p class="muted">Aucun prompt pour l\'instant. Termine un assistant : le prompt se sauvegarde ici tout seul.</p>') +
      '<p class="foot">Kameleon Prompter</p></main>';
    setDock("projects");
  }
  function projectDetail(id) {
    const p = Store.get(localStorage, id);
    if (!p) return projectsView();
    S.proj = id;
    setDock(false);
    $app.innerHTML =
      '<div class="bar"><button data-a="go" data-id="projects">←</button><b>' + esc(p.label) + ' · ' + esc(fdate(p.created)) + "</b></div>" +
      '<div class="wrap"><pre id="final">' + esc(Store.toText(p)) + "</pre>" +
      copyBtn("final", true) + '<button class="btn" data-a="exportProj">⬇ Exporter .txt</button>' +
      '<p class="label">Supprimer</p><div class="slide" id="sw"><div class="fill"></div><div class="lbl">Glisse pour supprimer →</div><div class="thumb">›</div></div>' +
      '<p id="err" class="msg err"></p></div>';
  }
  // suppression : la pastille glisse, puis message avec "Annuler"
  function deleteProject(id, delay) {
    const p = Store.get(localStorage, id);
    if (!p) return;
    Store.remove(localStorage, id); S.proj = null;
    const after = () => { projectsView(); toast("Prompt supprimé", "Annuler", () => { Store.restore(localStorage, p); projectsView(); }); };
    if (delay) setTimeout(after, delay); else after();
  }

  // ---------- vue Réglages ----------
  function settingsView() {
    S.screen = "settings";
    const n = Store.list(localStorage).length, eco = K ? K.ecoOn(localStorage, navigator) : false, pref = K ? K.getPref(localStorage) : "auto";
    const pi = ["auto", "light", "dark"].indexOf(pref);
    $app.innerHTML =
      '<header class="top"><h1>Réglages</h1></header><main>' +
      '<p class="label">Thème</p><div class="seg" style="--i:' + pi + '"><i class="pill"></i>' + [["auto", "Auto"], ["light", "Clair"], ["dark", "Sombre"]].map(t => '<button data-a="themeSet" data-v="' + t[0] + '" class="' + (pref === t[0] ? "on" : "") + '">' + t[1] + "</button>").join("") + "</div>" +
      '<p class="label">Quantité de texte</p>' + knobHTML("lg") +
      '<p class="label">Animations</p><div class="setrow"><b>Mode économique</b>' +
      '<button class="tgl' + (eco ? " on" : "") + '" data-a="eco" role="switch" aria-checked="' + eco + '" aria-label="Mode économique"><i></i></button></div>' +
      '<p class="label">Sauvegarde · ' + n + " prompt" + (n > 1 ? "s" : "") + '</p><div class="row2"><button class="btn" data-a="exportAll">⬇ Exporter</button>' +
      '<label class="btn">⬆ Importer<input type="file" accept=".json,application/json" data-import hidden></label></div>' +
      '<p id="setmsg" class="muted"></p><p id="err" class="msg err"></p>' +
      '<p class="foot">Kameleon Prompter · tout reste sur ton téléphone</p></main>';
    setDock("settings");
  }

  // ---------- bibliothèque ----------
  function libraryList() {
    const L = D.library, cat = S.libCat;
    const chips = '<div class="chips"><button class="chip ' + (cat === "all" ? "on" : "") + '" data-a="libcat" data-id="all">Tous (' + L.prompts.length + ")</button>" +
      L.categories.map(c => '<button class="chip ' + (cat === c.id ? "on" : "") + '" data-a="libcat" data-id="' + esc(c.id) + '">' + esc(c.icon) + " " + esc(c.label) + "</button>").join("") + "</div>";
    const cards = L.prompts.filter(p => cat === "all" || p.category === cat).map(p => {
      const me = byId(D.methods, p.method);
      return '<button class="card" data-a="openLib" data-id="' + esc(p.id) + '"><h3>' + esc(p.title) + "</h3>" +
        '<p class="clamp">' + esc(p.prompt) + "</p><p>" + (p.kind ? '<span class="badge">' + esc(p.kind) + "</span>" : "") +
        (me ? '<span class="badge run">' + esc(me.label) + "</span>" : "") +
        (p.missing.length ? '<span class="badge">il manque : ' + esc(p.missing.join(", ")) + "</span>" : '<span class="badge ok">complet</span>') + "</p></button>";
    }).join("");
    return '<p class="muted">' + esc(L.intro) + "</p>" + chips + cards;
  }

  function hl(p) {
    let h = esc(p.prompt).replace(/\[[^\]]+\]/g, m => "<mark>" + m + "</mark>");
    (p.placeholders || []).filter(x => x.charAt(0) !== "[").forEach(tok => { h = h.replace(new RegExp("\\b" + tok + "\\b", "g"), "<mark>" + tok + "</mark>"); });
    return h;
  }

  function openLib(id) { S.lib = byId(D.library.prompts, id); libDetail(); window.scrollTo(0, 0); }

  function libDetail() {
    setDock(false);
    const p = S.lib, L = D.library, me = byId(D.methods, p.method), cat = byId(L.categories, p.category);
    const have = p.elements.map(e => '<span class="badge ok" title="' + esc(L.elementsLegend[e] || "") + '">✓ ' + esc(e) + "</span>").join("");
    const miss = p.missing.map(e => '<span class="badge">✗ ' + esc(e) + "</span>").join("");
    $app.innerHTML =
      '<div class="bar"><button data-a="home">←</button><b>' + esc((cat ? cat.icon + " " : "") + p.title) + "</b></div>" +
      '<div class="wrap"><p class="muted">' + esc((L.sources[p.source] || p.source)) + "</p>" +
      '<pre id="libp">' + hl(p) + "</pre>" +
      '<button class="btn go" data-a="libUse">📋 Utiliser ce prompt</button>' +
      (me ? '<button class="btn" data-a="openMethod" data-id="' + esc(me.id) + '">✨ L\'améliorer avec ' + esc(me.label) + "</button>" : "") +
      '<p class="label">Ce qu\'il contient</p><p>' + have + miss + "</p>" +
      (p.improve.length ? '<p class="label">Pour l\'améliorer</p><ul>' + li(p.improve) + "</ul>" : "") +
      (p.tip ? '<p class="label">Astuce</p><p>' + esc(p.tip) + "</p>" : "") +
      (p.placeholders.length ? '<p class="muted">Remplace les passages en orange par tes propres informations.</p>' : "") +
      "</div>";
  }

  function methodCards() {
    return D.methods.map(me => {
      const n = stepsOf(me).length;
      const sv = store(me.id, null);
      let st = "";
      if (sv && sv.done) st = '<span class="badge ok">✅ Terminé</span>';
      else if (sv && sv.step > 0) st = '<span class="badge run">En cours : étape ' + (sv.step + 1) + "/" + n + "</span>";
      const img = D.images && D.images[me.id] ? '<img loading="lazy" alt="" src="' + esc(D.images[me.id]) + '">' : "";
      return '<button class="card mc" data-a="openMethod" data-id="' + esc(me.id) + '"><span class="mth"><em>' + esc(String(me.label).charAt(0)) + "</em>" + img + '</span><span class="mtx"><h3>' + esc(me.label) + " — " + esc(me.fullName) + "</h3>" +
        "<p>" + esc(me.shortDescription) + "</p><p>" + st + '<span class="badge">' + n + " étapes</span>" +
        '<span class="badge">' + esc(me.estimatedTime) + "</span></p></span></button>";
    }).join("");
  }

  function techCards() {
    return D.techniques.map(t =>
      '<button class="card" data-a="openTech" data-id="' + esc(t.id) + '"><h3>' + esc(t.label) + (t.shortName && !t.label.toLowerCase().includes(t.shortName.toLowerCase()) ? " (" + esc(t.shortName) + ")" : "") + "</h3>" +
      "<p>" + esc(t.shortDescription) + '</p><p><span class="badge">Niveau ' + esc(t.difficulty) + '</span><span class="badge">' + esc(t.estimatedTime) + "</span></p></button>"
    ).join("");
  }

  // ---------- méthode : assistant pas à pas ----------
  function openMethod(id) {
    S.method = byId(D.methods, id);
    const sv = store(id, null);
    const n = stepsOf(S.method).length;
    S.answers = sv ? sv.answers || {} : {}; S.back = false;
    S.step = sv ? Math.min(sv.step || 0, n - 1) : 0;
    S.done = !!(sv && sv.done);
    S.pid = (sv && sv.pid) || null; S.lastP = null;
    S.done ? result() : wizard();
  }

  // dernière étape facultative : tags (Entrée ajoute). Le moteur et les 194 exemples ne changent pas.
  const EXTRA = { id: "__extras", label: "Précisions", type: "tags", question: "Veux-tu ajouter des précisions ?", hint: "Facultatif. Tape un mot puis Entrée.", required: false };
  const stepsOf = m => E.getSteps(m).concat([EXTRA]);
  const curBlock = () => stepsOf(S.method)[S.step];
  function buildFinal(m, answers, preview) {
    const base = E.buildPrompt(m, answers, D.ctx, preview), c = answers.__ctx || [], w = answers.__inc || [], x = [];
    if (c.length) x.push("Éléments de contexte à prendre en compte : " + E.joinFr(c) + ".");
    if (w.length) x.push("Inclure les mots suivants dans la réponse : " + w.join(", ") + ".");
    return x.length ? base + "\n" + x.join("\n") : base;
  }
  const tagsHTML = k => (S.answers[k] || []).map((t, i) => '<span class="tg">' + esc(t) + '<button data-a="tagdel" data-k="' + k + '" data-i="' + i + '" aria-label="Retirer">×</button></span>').join("");
  const tagsField = (k, label) => '<p class="label">' + label + '</p><div class="tgs" id="tgs-' + k + '">' + tagsHTML(k) + '</div><div class="tagrow"><input class="in" id="tin-' + k + '" data-tagin="' + k + '" type="text" enterkeyhint="done" maxlength="40" placeholder="Tape puis Entrée"><button data-a="tagadd" data-k="' + k + '" aria-label="Ajouter">+</button></div>';
  function renderTags(k) {
    const c = document.getElementById("tgs-" + k); if (c) c.innerHTML = tagsHTML(k);
    const p = document.getElementById("preview"); if (p) p.innerHTML = previewHTML();
  }
  function addTagTo(k, text) {
    const cur = S.answers[k] || [], nl = UX.addTag(cur, text);
    if (nl === cur) return;
    S.answers[k] = nl; save(); renderTags(k);
  }

  // ---------- effort : la quantité de texte (3 crans) ----------
  const EL = { min: "Moins", mid: "Moyen", max: "Explicatif" };
  const getEffort = () => { try { return UX.effortOf(localStorage.getItem("kameleon:effort")); } catch (e) { return "mid"; } };
  const knobHTML = cls => { const e = getEffort(); return '<div class="kn ' + cls + '"><button class="knob" data-a="effort" data-v="next" aria-label="Quantité de texte"><i style="--rot:' + UX.effortDeg(e) + 'deg"></i></button><div class="kls">' + UX.EFFORTS.map(k => '<button data-a="effort" data-v="' + k + '" data-k="1" class="' + (k === e ? "on" : "") + '">' + EL[k] + "</button>").join("") + "</div></div>"; };
  const rerender = () => { const f = { wizard: () => wizard(false), result, settings: settingsView, home }[S.screen]; if (f) f(); };
  function setEffort(v) {
    const e = v === "next" ? UX.nextEffort(getEffort()) : UX.effortOf(v);
    try { localStorage.setItem("kameleon:effort", e); } catch (_) {}
    if (document.querySelectorAll) { // en place : le texte se replie avec animation
      const w = document.querySelector(".wrap[data-effort]"); if (w) w.setAttribute("data-effort", e);
      document.querySelectorAll(".knob i").forEach(i => i.style.setProperty("--rot", UX.effortDeg(e) + "deg"));
      document.querySelectorAll(".kls button").forEach(b => b.classList.toggle("on", b.dataset.v === e));
      document.querySelectorAll(".rule.fx").forEach(r => r.style.setProperty("--p", UX.effortPos(e)));
      document.querySelectorAll(".efl").forEach(x => (x.textContent = EL[e]));
    } else rerender();
  }
  const SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/></svg>';
  const MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/></svg>';
  const themeIcon = () => (K && K.resolved(localStorage, mq()) === "dark" ? SUN : MOON);

  function previewHTML() {
    const p = buildFinal(S.method, S.answers, true);
    return esc(p).replace(/\[([^\]]+)\]/g, "<mark>[$1]</mark>");
  }

  const popc = id => { if (S.pop === id) { S.pop = null; return " pop12"; } return ""; };
  function fieldHTML(b) {
    const v = S.answers[b.id];
    if (b.type === "text")
      return '<input class="in" data-f type="text" placeholder="' + esc(b.placeholder) + '" value="' + esc(v) + '">';
    if (b.type === "textarea")
      return '<textarea class="in" data-f rows="5" placeholder="' + esc(b.placeholder) + '">' + esc(v) + "</textarea>";
    if (b.type === "select")
      return '<div class="opts">' + E.optionsFor(b, D.ctx).map(o =>
        '<button class="opt ' + (v === o.id ? "on" : "") + popc(o.id) + '" data-a="pick" data-id="' + esc(o.id) + '">' + esc(o.label) +
        (o.when ? "<small>" + esc(o.when) + "</small>" : "") + "</button>").join("") + "</div>";
    if (b.type === "select-multi") {
      const sel = v || [];
      return '<div class="chips">' + E.optionsFor(b, D.ctx).map(o =>
        '<button class="chip ' + (sel.includes(o.id) ? "on" : "") + popc(o.id) + '" data-a="multi" data-id="' + esc(o.id) + '">' + esc(o.label) + "</button>").join("") + "</div>";
    }
    if (b.type === "tags") return tagsField("__ctx", "Éléments du contexte") + tagsField("__inc", "Mots à inclure");
    if (b.type === "toggle")
      return '<div class="opts"><button class="opt ' + (v ? "on" : "") + '" data-a="toggle">' + (v ? "✅ Oui" : "⬜ Non") + "<small>" + esc(b.formula || "") + "</small></button></div>";
    return "";
  }

  function exButtons(exs, all) {
    const list = all ? exs : exs.slice(0, 4);
    return list.map((x, i) => '<button class="ex" data-a="useEx" data-i="' + i + '">' + esc(x) + "</button>").join("") +
      (!all && exs.length > 4 ? '<button class="btn" data-a="moreEx">Voir tous les exemples (' + exs.length + ")</button>" : "");
  }

  function wizard(anim) {
    setDock(false); S.screen = "wizard";
    if (anim === undefined) anim = true;
    const m = S.method, steps = stepsOf(m), b = curBlock(), n = steps.length, eff = getEffort();
    if (b.type === "toggle" && S.answers[b.id] === undefined) S.answers[b.id] = b.default === true;
    const target = UX.progress(S.step, n), from = anim && S.lastP !== null ? S.lastP : target;
    S.lastP = target;
    const dots = '<div class="stline"></div><div class="stfill" style="--p:' + from + '"></div>' +
      steps.map((s, i) => '<div class="stn' + (i <= S.step ? " on" : "") + (i === S.step && anim ? " popn" : "") + '">' + (i < S.step ? "✓" : i + 1) + "</div>").join("");
    const exs = (b.type === "text" || b.type === "textarea") ? (b.examples || []) : [];
    const warn = b.type === "select-multi" ? E.validateStep(b, S.answers[b.id], D.ctx).warnings : [];
    const hint = b.hint || b.helper || "", tips = (m.tips || []).slice(0, 3);
    $app.innerHTML =
      '<div class="bar"><button data-a="home">←</button><b>' + esc(m.label) + '</b><span class="muted">' + (S.step + 1) + "/" + n + "</span>" + knobHTML("sm") + "</div>" +
      '<div class="wrap" data-phase="' + UX.phaseOf(S.step, n) + '" data-effort="' + eff + '"><div class="prog steps">' + dots + "</div>" +
      '<div class="q' + (anim ? "" : " still") + '"><p class="amorce">' + esc((b.letter ? b.letter + " · " : "") + b.label + (b.amorce ? " — " + b.amorce : "")) + "</p>" +
      "<h2>" + esc(b.question) + "</h2>" +
      (hint ? '<div class="cl h"><div class="cli"><p class="muted">💡 <span class="hs">' + esc(UX.shortHint(hint, 100)) + '</span><span class="hl">' + esc(hint) + "</span></p></div></div>" : "") +
      fieldHTML(b) + "</div>" +
      '<div class="muted" id="count"></div><div class="msg warn" id="warn">' + warn.map(esc).join("<br>") + '</div><div class="msg err" id="err"></div>' +
      (exs.length ? '<div class="cl exs"><div class="cli">' + fold("Exemples · touche pour utiliser", '<div id="exlist">' + exButtons(exs, S.exKey === m.id + ":" + S.step) + "</div>", false) + "</div></div>" : "") +
      (tips.length ? '<div class="cl tips"><div class="cli">' + fold("Astuces de la méthode", "<ul>" + li(tips) + "</ul>") + "</div></div>" : "") +
      '<div class="cl pv"><div class="cli"><p class="label">Aperçu du prompt</p><pre id="preview">' + previewHTML() + "</pre></div></div></div>" +
      '<div class="nav"><button data-a="prev">Précédent</button><button class="go" data-a="next">' + (S.back ? "Valider ✓" : S.step === n - 1 ? "Terminer ✓" : "Suivant →") + "</button></div>";
    refreshCount();
    if (anim && document.querySelector && S.lastP !== from) {
      const f = document.querySelector(".stfill");
      if (f && f.style) requestAnimationFrame(() => requestAnimationFrame(() => f.style.setProperty("--p", target)));
    }
  }

  function refreshCount() {
    const b = curBlock(), el = document.getElementById("count");
    if (!el || !(b.type === "text" || b.type === "textarea")) return;
    const len = String(S.answers[b.id] || "").trim().length, v = b.validation || {};
    el.textContent = len + " caractère(s)" + (v.minLength ? " · min " + v.minLength : "") + (v.maxLength ? " · max " + v.maxLength : "");
  }

  function next() {
    const b = curBlock(), r = b.type === "tags" ? { ok: true, errors: [] } : E.validateStep(b, S.answers[b.id], D.ctx);
    if (!r.ok) { showErr(r.errors.map(esc).join("<br>")); return; }
    save();
    if (S.back || S.step === stepsOf(S.method).length - 1) { S.back = false; S.done = true; save(); result(); }
    else { S.step++; save(); wizard(); window.scrollTo(0, 0); }
  }

  function result() {
    setDock(false); S.screen = "result";
    const m = S.method, p = buildFinal(m, S.answers, false), nf = m.nextStepIfFail, eff = getEffort();
    const nfm = nf && nf.method ? byId(D.methods, nf.method) : null;
    // sauvegarde auto dans Projets (met à jour le même projet si on modifie)
    const pr = { methodId: m.id, label: m.label, answers: S.answers, prompt: p };
    const sp = S.pid && Store.get(localStorage, S.pid) ? Store.update(localStorage, S.pid, pr) : Store.create(localStorage, pr);
    if (sp) { S.pid = sp.id; save(); }
    const steps = stepsOf(m), A = S.answers;
    const rowVal = b => b.type === "tags"
      ? [(A.__ctx || []).length ? "Contexte : " + A.__ctx.join(", ") : "", (A.__inc || []).length ? "Mots : " + A.__inc.join(", ") : ""].filter(Boolean).join(" · ")
      : E.valueToText(b, A[b.id], D.ctx);
    const rows = steps.map((b, i) => { const v = rowVal(b); return v ? '<div class="rw"><span class="ri">' + esc(String(b.letter || b.label).charAt(0).toUpperCase()) + '</span><div class="rt"><small>' + esc(b.label) + "</small><div>" + esc(v) + '</div></div><button class="rb" data-a="editBlock" data-i="' + i + '" aria-label="Modifier ' + esc(b.label) + '">✎</button></div>' : ""; }).join("");
    $app.innerHTML =
      '<div class="bar"><button data-a="home">←</button><b>' + esc(m.label) + " — résultat</b>" + knobHTML("sm") + "</div>" +
      '<div class="wrap" data-phase="end" data-effort="' + eff + '"><div class="q"><h2>Ton prompt est prêt ✅</h2><div class="tgs"><span class="tg ro">' + esc(m.label) + '</span><span class="tg ro">' + (steps.length - 1) + " étapes</span></div></div>" +
      copyBtn("final", true) +
      '<div class="row2"><button class="btn" data-a="edit">✏️ Modifier</button><button class="btn" data-a="restart">🔄 Recommencer</button></div>' +
      '<section class="sheet" id="sheet"><svg class="wave" viewBox="0 0 400 22" preserveAspectRatio="none" aria-hidden="true"><path d="M0 22V14C70 14 96 1 200 1S330 14 400 14V22Z" fill="currentColor"/></svg>' +
      '<div class="sb"><button class="grab" data-a="sheet" aria-label="Réduire ou ouvrir"></button><h3>Ton prompt en blocs</h3><div class="cl rws"><div class="cli">' + rows + "</div></div>" +
      fold("Prompt complet", '<pre id="final">' + esc(p) + "</pre>", false) + "</div></section>" +
      '<div class="cl efx"><div class="cli">' +
      (nf ? '<p class="label">Si le résultat ne convient pas</p><p>' + esc(nf.reason || "") + "</p>" +
        (nfm ? '<button class="btn" data-a="openMethod" data-id="' + esc(nfm.id) + '">Essayer ' + esc(nfm.label) + " →</button>" : "") : "") +
      fold("✅ Checklist avant d\'envoyer", D.coaching.checklist.map(c => '<label class="ck"><input type="checkbox"><span>' + esc(c.question) + "</span></label>").join("") + "<ul>" + li(D.coaching.ethics.map(e => e.action)) + "</ul>") +
      ((m.tips || []).length ? fold("Astuces", "<ul>" + li(m.tips.slice(0, 5)) + "</ul>") : "") +
      ((m.limitations || []).length ? fold("Limites", "<ul>" + li(m.limitations) + "</ul>") : "") +
      "</div></div></div>";
  }

  // ---------- technique : fiche + testeur ----------
  function openTech(id) {
    S.tech = byId(D.techniques, id); S.picked = []; S.base = "";
    techDetail(); window.scrollTo(0, 0);
  }

  function techResult() {
    const phr = S.tech.triggerPhrases || [];
    return E.applyTechnique(S.base, S.picked.map(i => phr[i]));
  }

  function techDetail() {
    setDock(false);
    const t = S.tech, phr = t.triggerPhrases || [], cw = t.combinableWith || {};
    const chipM = (cw.methods || []).map(id => byId(D.methods, id)).filter(Boolean)
      .map(x => '<button class="chip" data-a="openMethod" data-id="' + esc(x.id) + '">' + esc(x.label) + "</button>").join("");
    const chipT = (cw.techniques || []).map(id => byId(D.techniques, id)).filter(Boolean)
      .map(x => '<button class="chip" data-a="openTech" data-id="' + esc(x.id) + '">' + esc(x.label) + "</button>").join("");
    const exs = (t.examplePrompts || []).map((e, i) =>
      '<div class="sub"><b>' + esc(e.title) + '</b><pre id="ex-' + i + '">' + esc(e.prompt) + "</pre>" + (e.note ? '<p class="muted">' + esc(e.note) + "</p>" : "") +
      '<button class="btn" data-a="copy" data-target="ex-' + i + '">📋 Copier</button><button class="btn" data-a="loadEx" data-i="' + i + '">🧪 Mettre dans le testeur</button></div>').join("");
    const vars = (Array.isArray(t.variants) ? t.variants : []).map(v =>
      '<div class="sub"><b>' + esc(v.label || v.id) + "</b>" + (v.description ? "<span>" + esc(v.description) + "</span>" : "") +
      (v.when ? '<p class="muted">Quand : ' + esc(v.when) + "</p>" : "") + "</div>").join("");
    const uc = (t.realWorldUseCases || []).map(u =>
      '<div class="sub"><b>' + esc(u.useCase) + "</b><span>" + esc(u.example) + '</span><p class="muted">' + esc(u.why) + "</p></div>").join("");
    $app.innerHTML =
      '<div class="bar"><button data-a="home">←</button><b>' + esc(t.label) + '</b><span class="muted">Niveau ' + esc(t.difficulty) + "</span></div>" +
      '<div class="wrap"><p>' + esc(t.description) + '</p><p class="amorce">' + esc(t.principle) + "</p>" +
      '<p class="label">🧪 Testeur</p><textarea class="in" id="tbase" data-b rows="4" placeholder="Écris ton prompt de base ici…">' + esc(S.base) + "</textarea>" +
      (phr.length
        ? '<p class="muted">Touche une ou plusieurs phrases à ajouter :</p><div class="chips">' +
          phr.map((p, i) => '<button class="chip ' + (S.picked.includes(i) ? "on" : "") + '" data-a="tpick" data-i="' + i + '">' + esc(p) + "</button>").join("") + "</div>"
        : '<p class="muted">' + esc(t.triggerPhraseNote || "Pas de phrase à ajouter : cette technique est le prompt de base.") + "</p>") +
      '<pre id="tres">' + esc(techResult()) + '</pre><button class="btn go" data-a="copy" data-target="tres">📋 Copier le résultat</button>' +
      '<details open><summary>Quand l\'utiliser</summary><ul>' + li(t.whenToUse) + "</ul></details>" +
      '<details><summary>Quand l\'éviter</summary><ul>' + li(t.whenNotToUse) + "</ul></details>" +
      '<details><summary>Exemples (' + (t.examplePrompts || []).length + ")</summary>" + exs + "</details>" +
      (vars ? "<details><summary>Variantes</summary>" + vars + "</details>" : "") +
      (uc ? "<details><summary>Cas réels</summary>" + uc + "</details>" : "") +
      (chipM || chipT ? '<details><summary>Se combine avec</summary><p class="label">Méthodes</p><div class="chips">' + chipM + '</div><p class="label">Techniques</p><div class="chips">' + chipT + "</div></details>" : "") +
      '<details><summary>Limites</summary><ul>' + li(t.limitations) + "</ul></details>" +
      '<details><summary>Astuces</summary><ul>' + li(t.tips) + "</ul></details></div>";
  }

  // ---------- questionnaire de départ ----------
  function guideCard() {
    return '<button class="card guide" data-a="guide"><h3>🧭 Je ne sais pas par où commencer</h3>' +
      "<p>Réponds à " + D.guide.questions.length + " questions simples : Kameleon choisit la bonne méthode pour toi.</p>" +
      '<p><span class="badge run">Recommandé pour débuter</span></p></button>';
  }

  function guideStart() { S.g = { i: 0, answers: {}, result: false }; guideQuestion(); window.scrollTo(0, 0); }

  function guideQuestion() {
    setDock(false);
    const qs = D.guide.questions, q = qs[S.g.i], cur = S.g.answers[q.id];
    const dots = qs.map((x, i) => '<i class="' + (i < S.g.i ? "done" : i === S.g.i ? "cur" : "") + '"></i>').join("");
    $app.innerHTML =
      '<div class="bar"><button data-a="gback">←</button><b>Trouver ma méthode</b><span class="muted">' + (S.g.i + 1) + "/" + qs.length + "</span></div>" +
      '<div class="wrap"><div class="prog">' + dots + "</div><h2>" + esc(q.question) + "</h2>" +
      (q.hint ? '<p class="muted">' + esc(q.hint) + "</p>" : "") +
      '<div class="opts">' + q.options.map(o =>
        '<button class="opt ' + (cur === o.id ? "on" : "") + '" data-a="gpick" data-id="' + esc(o.id) + '">' + esc(o.label) +
        (o.hint ? "<small>" + esc(o.hint) + "</small>" : "") + "</button>").join("") + "</div></div>";
  }

  function guideResult() {
    setDock(false);
    const ranked = E.recommend(D.guide, S.g.answers), top = ranked[0], alt = ranked[1];
    const m = byId(D.methods, top.id), n = E.getSteps(m).length;
    const altM = alt && alt.score > 0 && alt.score >= top.score - 2 ? byId(D.methods, alt.id) : null;
    const why = top.reasons.length ? E.joinFr(top.reasons) : "c'est la méthode la plus simple pour commencer";
    $app.innerHTML =
      '<div class="bar"><button data-a="gback">←</button><b>Ma recommandation</b></div>' +
      '<div class="wrap"><p class="label">Je te recommande</p><h2>' + esc(m.label) + " — " + esc(m.fullName) + "</h2>" +
      '<p><span class="badge run">' + esc(m.estimatedTime) + '</span><span class="badge">' + n + ' étapes</span><span class="badge">' + esc(m.level) + "</span></p>" +
      "<p><b>Pourquoi :</b> " + esc(why) + ".</p><p class=\"muted\">" + esc(m.shortDescription) + "</p>" +
      '<button class="btn go" data-a="openMethod" data-id="' + esc(m.id) + '">Commencer →</button>' +
      (altM ? '<p class="label">Autre option possible</p><button class="btn" data-a="openMethod" data-id="' + esc(altM.id) + '">' + esc(altM.label) + " (" + esc(altM.estimatedTime) + ")</button>" : "") +
      '<p class="label">Pas convaincu ?</p><button class="btn" data-a="guide">🔄 Refaire le test</button><button class="btn" data-a="home">Choisir moi-même</button></div>';
  }

  // ---------- événements (délégation) ----------
  const actions = {
    tab: (d, el) => {
      S.tab = d.id;
      const seg = el.parentElement, body = document.getElementById("homebody");
      if (seg && seg.style && seg.children && body) { // en place : la pastille glisse
        seg.style.setProperty("--i", TABS.findIndex(t => t[0] === d.id));
        Array.from(seg.children).forEach(b => b.dataset && b.classList.toggle("on", b.dataset.id === d.id));
        body.innerHTML = homeBody();
      } else home();
    },
    fold: (d, el) => { const f = el.parentElement; if (f && f.classList) f.classList.toggle("open"); },
    eco: (d, el) => { if (!K) return; const on = K.toggleEco(document, localStorage, navigator); if (el.classList) el.classList.toggle("on", on); if (el.setAttribute) el.setAttribute("aria-checked", String(on)); },
    go: (d) => { (d.id === "projects" ? projectsView : d.id === "settings" ? settingsView : home)(); window.scrollTo(0, 0); },
    newProj: () => { S.tab = "methods"; home(); },
    openProj: (d) => projectDetail(d.id),
    exportProj: () => { const p = Store.get(localStorage, S.proj); if (p) download("prompt-" + slug(p.label) + "-" + p.created.slice(0, 10) + ".txt", Store.toText(p)); },
    delProj: () => deleteProject(S.proj, 0),
    exportAll: () => download("kameleon-sauvegarde-" + new Date().toISOString().slice(0, 10) + ".json", JSON.stringify(Store.exportAll(localStorage), null, 1), "application/json"),
    theme: (d, el) => { if (K) { K.toggle(document, localStorage, mq()); el.innerHTML = themeIcon(); } },
    themeSet: (d, el) => {
      if (!K) return;
      K.setPref(document, localStorage, mq(), d.v);
      const seg = el.parentElement;
      if (seg && seg.style && seg.children) {
        seg.style.setProperty("--i", ["auto", "light", "dark"].indexOf(d.v));
        Array.from(seg.children).forEach(b => b.dataset && b.classList.toggle("on", b.dataset.v === d.v));
      } else settingsView();
    },
    effort: (d) => setEffort(d.v),
    tagadd: (d) => { const inp = document.getElementById("tin-" + d.k); addTagTo(d.k, d.v !== undefined ? d.v : inp && inp.value); if (inp) { inp.value = ""; if (inp.focus) inp.focus(); } },
    tagdel: (d) => { S.answers[d.k] = UX.removeTag(S.answers[d.k], +d.i); save(); renderTags(d.k); },
    sheet: (d, el) => { let s = el; for (let k = 0; k < 4 && s; k++, s = s.parentElement) { if (s.classList && s.classList.contains && s.classList.contains("sheet")) { s.classList.toggle("col"); break; } } },
    libcat: (d) => { S.libCat = d.id; home(); },
    openLib: (d) => openLib(d.id),
    libUse: async (d, el) => {
      const p = S.lib;
      const ok = await Modal.ask({
        title: "Utiliser ce prompt ?",
        text: "Veux-tu utiliser ce prompt ? Il sera copié, prêt à coller dans ton IA." + (p.placeholders.length ? " Pense à remplacer les passages entre crochets." : ""),
        preview: p.prompt, yes: "Oui, le copier", no: "Non",
      });
      if (ok) await copyText(p.prompt, el);
    },
    moreEx: (d, el) => {
      const b = curBlock();
      S.exKey = S.method.id + ":" + S.step;
      document.getElementById("exlist").innerHTML = exButtons(b.examples, true);
    },
    home: () => home(),
    guide: () => guideStart(),
    gpick: (d) => {
      const qs = D.guide.questions;
      S.g.answers[qs[S.g.i].id] = d.id;
      if (S.g.i < qs.length - 1) { S.g.i++; guideQuestion(); window.scrollTo(0, 0); }
      else { S.g.result = true; guideResult(); window.scrollTo(0, 0); }
    },
    gback: () => {
      if (S.g.result) { S.g.result = false; guideQuestion(); return; }
      if (S.g.i === 0) return home();
      S.g.i--; guideQuestion();
    },
    openMethod: (d) => openMethod(d.id),
    openTech: (d) => openTech(d.id),
    prev: () => { if (S.step === 0) return home(); S.step--; save(); wizard(); window.scrollTo(0, 0); },
    next: () => next(),
    pick: (d) => { S.answers[curBlock().id] = d.id; S.pop = d.id; wizard(false); },
    multi: (d) => {
      const b = curBlock(), sel = (S.answers[b.id] || []).slice();
      const i = sel.indexOf(d.id);
      if (i >= 0) sel.splice(i, 1); else if (!b.max || sel.length < b.max) sel.push(d.id);
      S.answers[b.id] = sel; S.pop = d.id; wizard(false);
    },
    toggle: () => { const b = curBlock(); S.answers[b.id] = !S.answers[b.id]; wizard(false); },
    useEx: async (d) => {
      const b = curBlock(), txt = b.examples[+d.i], has = String(S.answers[b.id] || "").trim();
      const ok = await Modal.ask({
        title: "Utiliser cet exemple ?",
        text: "Veux-tu utiliser cet exemple de prompt ?" + (has ? " Il remplacera ce que tu as déjà écrit." : ""),
        preview: txt, yes: "Oui, l'utiliser", no: "Non",
      });
      if (!ok || !S.method || curBlock() !== b) return;
      S.answers[b.id] = txt; wizard();
    },
    copy: (d, el) => copyText(document.getElementById(d.target).textContent, el),
    edit: () => { S.done = false; S.back = false; S.step = stepsOf(S.method).length - 1; wizard(); },
    editBlock: (d) => { S.done = false; S.back = true; S.step = +d.i; save(); wizard(); window.scrollTo(0, 0); },
    restart: () => { store(S.method.id, undefined); S.pid = null; S.back = false; S.answers = {}; S.step = 0; S.done = false; wizard(); },
    tpick: (d, el) => {
      const i = +d.i, k = S.picked.indexOf(i);
      if (k >= 0) S.picked.splice(k, 1); else S.picked.push(i);
      el.classList.toggle("on");
      document.getElementById("tres").textContent = techResult();
    },
    loadEx: async (d) => {
      const t = S.tech, e = t.examplePrompts[+d.i];
      const ok = await Modal.ask({
        title: "Utiliser cet exemple ?",
        text: "Veux-tu mettre cet exemple de prompt dans le testeur ?" + (S.base.trim() ? " Il remplacera ton texte actuel." : ""),
        preview: e.prompt, yes: "Oui, l'utiliser", no: "Non",
      });
      if (!ok || S.tech !== t) return;
      S.base = e.prompt;
      document.getElementById("tbase").value = S.base;
      document.getElementById("tres").textContent = techResult();
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
  };

  const onClick = e => {
    const el = e.target.closest("[data-a]");
    if (!el || !D) return;
    const fn = actions[el.dataset.a];
    if (fn) fn(el.dataset, el);
  };
  $app.addEventListener("click", onClick);
  const dockEl = document.getElementById("dock");
  if (dockEl) dockEl.addEventListener("click", onClick);

  // glisser pour supprimer (pointer events : un doigt, une souris)
  let sw = null;
  const paintSw = px => { sw.x = px; sw.th.style.transform = "translateX(" + px + "px)"; sw.fill.style.width = (px > 0 ? px + 50 : 0) + "px"; };
  $app.addEventListener("pointerdown", e => {
    const th = e.target.closest && e.target.closest(".thumb");
    if (!th) return;
    const track = th.parentElement;
    if (track.classList.contains("ok")) return;
    sw = { th, track, fill: track.querySelector(".fill"), lbl: track.querySelector(".lbl"), sx: e.clientX, x: 0, max: track.getBoundingClientRect().width - th.offsetWidth - 8 };
    track.classList.add("drag");
    try { th.setPointerCapture(e.pointerId); } catch (_) {}
  });
  $app.addEventListener("pointermove", e => { if (sw) paintSw(UX.clamp(e.clientX - sw.sx, 0, sw.max)); });
  const endSw = () => {
    if (!sw) return;
    const s = sw; sw = null; s.track.classList.remove("drag");
    if (UX.swipeDone(s.x, s.max)) { sw = s; paintSw(s.max); sw = null; s.track.classList.add("ok"); s.lbl.textContent = "Supprimé"; deleteProject(S.proj, 380); }
    else { sw = s; paintSw(0); sw = null; }
  };
  $app.addEventListener("pointerup", endSw);
  $app.addEventListener("pointercancel", endSw);

  $app.addEventListener("change", async e => {
    const t = e.target;
    if (!t.matches || !t.matches("[data-import]")) return;
    const f = t.files && t.files[0];
    if (!f) return;
    let r;
    try { r = Store.importAll(localStorage, JSON.parse(await f.text())); } catch (err) { r = { ok: false, error: "fichier illisible" }; }
    if (r.ok) { document.getElementById("setmsg").textContent = "✓ " + r.added + " ajouté(s), " + r.skipped + " ignoré(s)"; }
    else showErr(esc(r.error));
    t.value = "";
  });

  $app.addEventListener("keydown", e => {
    const t = e.target;
    if (!t.matches || !t.matches("[data-tagin]")) return;
    const k = t.dataset.tagin;
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTagTo(k, t.value); t.value = ""; }
    else if (e.key === "Backspace" && !t.value && (S.answers[k] || []).length) { S.answers[k] = UX.removeTag(S.answers[k], S.answers[k].length - 1); save(); renderTags(k); }
  });
  $app.addEventListener("error", e => { const t = e.target; if (t && t.tagName === "IMG" && t.classList) t.classList.add("bad"); }, true);

  $app.addEventListener("input", e => {
    const t = e.target;
    if (t.matches && t.matches("[data-f]")) {
      S.answers[curBlock().id] = t.value;
      document.getElementById("preview").innerHTML = previewHTML();
      document.getElementById("err").textContent = "";
      refreshCount();
    } else if (t.matches && t.matches("[data-b]")) {
      S.base = t.value;
      document.getElementById("tres").textContent = techResult();
    }
  });

  // ---------- démarrage ----------
  (async function init() {
    try {
      const index = await getJSON("index.json");
      const [levels, tones, guide, library, coaching] = await Promise.all([getJSON("levels.json"), getJSON("tones.json"), getJSON("guide.json"), getJSON("library.json"), getJSON("coaching.json")]);
      const methods = await Promise.all(index.categories.methods.items.map(i => getJSON("methods/" + i.file)));
      const techniques = await Promise.all(index.categories.techniques.items.map(i => getJSON("techniques/" + i.file)));
      let images = {};
      try { const r = await fetch("images.json"); if (r && r.ok) images = await r.json(); } catch (_) {}
      D = { index, ctx: { levels, tones }, guide, library, coaching, methods, techniques, images };
      home();
    } catch (err) {
      $app.innerHTML = '<div class="pad"><h2>Erreur de chargement</h2><p>' + esc(err.message) +
        "</p><p class=\"muted\">Ouvre la page via un serveur (pas en double-clic) :<br><code>python -m http.server 8000</code><br>puis va sur http://localhost:8000</p></div>";
    }
  })();
})();
