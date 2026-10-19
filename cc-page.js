/* CCPage — shared behavior for station sub-pages.
 * One file, one job: nav toggle, footer year, handle display.
 *
 * DOES: mobile nav open/close, footer year, show the saved handle.
 * DOES NOT: prompt for handles (that lives on create-account.html).
 * DOES NOT: touch the player, chat, or broadcast (station.html only).
 */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };

  // Footer year
  var y = $("year");
  if (y) y.textContent = new Date().getFullYear();

  // Mobile nav
  var btn = $("menuBtn"), nav = $("mobileNav");
  if (btn && nav) {
    btn.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      btn.setAttribute("aria-expanded", open);
      btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { nav.classList.remove("open"); });
    });
  }

  // Handle pill: display the saved handle. Tap goes to create-account.html.
  // No prompts — James: "not a fucking bullshit fake".
  var ht = $("handleText");
  if (ht) {
    try {
      var h = localStorage.getItem("ccr-handle");
      if (h) ht.textContent = h;
    } catch (_) {}
  }
})();
