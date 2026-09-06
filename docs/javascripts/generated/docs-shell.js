// GENERATED FILE: edit src/fertigation_pipeline/web/docs-shell.js
// Bridge the shared search form to Material's existing search worker and UI.
(function () {
  "use strict";
  function initialize() {
    const form = document.querySelector(".site-search");
    const query = document.querySelector('[data-md-component="search-query"]');
    const toggle = document.getElementById("__search");
    if (!form || !query || !toggle || form.dataset.connected) return;
    form.dataset.connected = "true";
    toggle.addEventListener("change", function () {
      if (!toggle.checked) requestAnimationFrame(function () { form.elements.q.focus(); });
    });
    query.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        event.preventDefault();
        toggle.checked = false;
        toggle.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
    function openSearch(value) {
      toggle.checked = true;
      toggle.dispatchEvent(new Event("change", { bubbles: true }));
      query.focus();
      query.value = value;
      query.dispatchEvent(new Event("input", { bubbles: true }));
    }
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      openSearch(form.elements.q.value.trim());
    });
    const value = new URLSearchParams(location.search).get("q");
    if (value) { form.elements.q.value = value; openSearch(value); }
    const drawer = document.getElementById("__drawer");
    const button = document.querySelector("[data-doc-menu]");
    if (drawer && button) {
      button.addEventListener("click", function () {
        drawer.checked = !drawer.checked;
        drawer.dispatchEvent(new Event("change", { bubbles: true }));
      });
      drawer.addEventListener("change", function () {
        button.setAttribute("aria-expanded", String(drawer.checked));
      });
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true });
  else initialize();
})();
