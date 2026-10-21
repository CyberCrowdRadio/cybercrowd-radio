/* CCPage — shared behavior for station sub-pages.
 * One file, one job: nav toggle, footer year, stage name display.
 *
 * DOES: mobile nav open/close, footer year, show the member's stage name.
 * DOES NOT: prompt for names (that lives on create-account.html).
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

  // Stage name pill: display the member's stage name, held in memory only.
  // The stage name is the letters the member picked and claimed — his ID.
  // Nothing here invents a name.
  var ht = $("handleText");
  if (ht) {
    var n = (window.CCAccount && window.CCAccount.stageName) || "";
    if (n) ht.textContent = n;
  }
})();
