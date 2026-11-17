// modal.js — fenêtre de confirmation de Kameleon Prompter (remplace alert/confirm)
(function (root) {
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let closeCurrent = null;

  // Modal.ask({ title, text, preview, yes, no }) -> Promise<boolean>
  function ask(o) {
    if (closeCurrent) closeCurrent(false);
    return new Promise(resolve => {
      const wrap = document.createElement("div");
      wrap.className = "modal";
      wrap.innerHTML =
        '<div class="mbox" role="dialog" aria-modal="true" aria-label="' + esc(o.title) + '">' +
        "<h3>" + esc(o.title) + "</h3>" +
        (o.text ? '<p class="mq">' + esc(o.text) + "</p>" : "") +
        (o.preview ? '<pre class="mpre">' + esc(o.preview) + "</pre>" : "") +
        '<div class="mbtns"><button class="btn" data-m="no">' + esc(o.no || "Non") + "</button>" +
        '<button class="btn go" data-m="yes">' + esc(o.yes || "Oui") + "</button></div></div>";
      let finished = false;
      function done(v) {
        if (finished) return;
        finished = true; closeCurrent = null;
        document.removeEventListener("keydown", onKey);
        wrap.classList.remove("show");
        setTimeout(() => wrap.remove(), 250);
        resolve(v);
      }
      function onKey(e) {
        if (e.key === "Escape") done(false);
        else if (e.key === "Tab") {
          const btns = Array.from(wrap.querySelectorAll("[data-m]"));
          if (!btns.length) return;
          const i = btns.indexOf(document.activeElement);
          e.preventDefault();
          btns[(i + (e.shiftKey ? btns.length - 1 : 1)) % btns.length].focus();
        }
      }
      wrap.addEventListener("click", e => {
        const b = e.target && e.target.closest ? e.target.closest("[data-m]") : null;
        if (b) done(b.dataset.m === "yes");
        else if (e.target === wrap) done(false);
      });
      document.addEventListener("keydown", onKey);
      document.body.appendChild(wrap);
      closeCurrent = done;
      requestAnimationFrame(() => {
        wrap.classList.add("show");
        const y = wrap.querySelector('[data-m="yes"]');
        if (y && y.focus) y.focus();
      });
    });
  }

  root.Modal = { ask };
})(typeof window !== "undefined" ? window : globalThis);
