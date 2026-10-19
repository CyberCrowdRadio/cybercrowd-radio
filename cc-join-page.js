/* CCJoinPage — keeper tiers + email capture for join.html.
 * One file, one job: the join page.
 * Payments aren't wired yet — paid tiers point at the email capture.
 */
(function () {
  "use strict";
  var cfg = window.STATION_CONFIG || {};
  function esc(s) { return String(s == null ? "" : s).replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  var grid = document.getElementById("tiersGrid");
  if (grid) {
    (cfg.memberships || []).forEach(function (m, i) {
      var el = document.createElement("div");
      el.className = "tier" + (i === 1 ? " featured" : "");
      el.innerHTML =
        '<p class="tier-name">' + esc(m.name) + "</p>" +
        '<p class="tier-price">' + esc(m.price) + "</p>" +
        '<p class="tier-blurb">' + esc(m.blurb) + "</p>" +
        "<ul>" + (m.perks || []).map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ul>";
      var btn = document.createElement("button");
      btn.className = "btn-brass";
      btn.type = "button";
      btn.textContent = m.price === "Free" ? "Start listening" : "Become " + m.name;
      btn.addEventListener("click", function () {
        if (m.price === "Free") {
          window.location.href = "station.html";
          return;
        }
        var em = document.getElementById("emailAddr");
        if (em) {
          em.focus();
          em.scrollIntoView({ block: "center" });
        }
      });
      el.appendChild(btn);
      grid.appendChild(el);
    });
  }

  var ef = document.getElementById("emailForm");
  if (ef) ef.addEventListener("submit", function (e) {
    e.preventDefault();
    var msg = document.getElementById("emailMsg");
    if (msg) {
      msg.hidden = false;
      msg.textContent = "You're on the list \u2014 the Sunday caretaker letter lands weekly.";
    }
    try {
      var list = JSON.parse(localStorage.getItem("cybercrowd-list") || "[]");
      var em = document.getElementById("emailAddr").value.trim();
      if (em && list.indexOf(em) === -1) {
        list.push(em);
        localStorage.setItem("cybercrowd-list", JSON.stringify(list));
      }
    } catch (_) {}
    ef.reset();
  });
})();
