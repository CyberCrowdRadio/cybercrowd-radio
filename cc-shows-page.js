/* CCShowsPage — weekly shows grid for shows.html.
 * One file, one job: render the show cycle from STATION_CONFIG.
 * Day-aware: marks today's show and the one on right now.
 */
(function () {
  "use strict";
  var cfg = window.STATION_CONFIG || {};
  function esc(s) { return String(s == null ? "" : s).replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  var grid = document.getElementById("showsGrid");
  if (!grid) return;

  var now = new Date();
  var day = now.getDay();
  var hour = now.getHours() + now.getMinutes() / 60;
  var liveShow = null;

  (cfg.shows || []).forEach(function (s) {
    var days = s.day || [];
    var el = document.createElement("article");
    el.className = "show";
    if (days.indexOf(day) !== -1) el.classList.add("today");
    if (days.indexOf(day) !== -1 && hour >= s.start && hour < s.end) {
      el.classList.add("on-now");
      liveShow = s;
    }
    el.innerHTML =
      '<p class="show-time">' + esc(s.time) + '</p>' +
      "<h3>" + esc(s.name) + "</h3>" +
      "<p>" + esc(s.blurb) + "</p>" +
      '<span class="show-days">' + esc(s.days) + "</span>";
    grid.appendChild(el);
  });

  if (liveShow) {
    var ln = document.getElementById("liveNow");
    if (ln) ln.hidden = false;
    var lnn = document.getElementById("liveNowName");
    if (lnn) lnn.textContent = liveShow.name;
  }

  var rl = document.getElementById("retiredList");
  if (rl) {
    (cfg.retiredSegments || []).forEach(function (r) {
      var li = document.createElement("li");
      li.innerHTML = "<strong>" + esc(r.name) + "</strong> \u2014 " + esc(r.note);
      rl.appendChild(li);
    });
  }
})();
