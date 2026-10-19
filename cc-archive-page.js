/* CCArchivePage — donor wall + donation form for archive.html.
 * One file, one job: the caretaker's desk.
 * Local until the archive backend lands (same as before, new address).
 */
(function () {
  "use strict";
  var cfg = window.STATION_CONFIG || {};
  var KEY = "cybercrowd-donors";
  function esc(s) { return String(s == null ? "" : s).replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
    catch (_) { return []; }
  }

  var wall = document.getElementById("donorWall");
  function render() {
    if (!wall) return;
    wall.innerHTML = "";
    var donors = load();
    if (!donors.length) {
      var li = document.createElement("li");
      li.className = "plaque plaque-empty";
      li.textContent = "The first plaque is waiting for a name.";
      wall.appendChild(li);
      return;
    }
    donors.forEach(function (d) {
      var li2 = document.createElement("li");
      li2.className = "plaque";
      li2.innerHTML = "<strong>" + esc(d.name) + "</strong><span>" + esc(d.record) + "</span>";
      wall.appendChild(li2);
    });
  }
  render();

  var form = document.getElementById("donorForm");
  if (form) form.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = document.getElementById("donorName").value.trim();
    var rec = document.getElementById("donorRecord").value.trim();
    if (!name || !rec) return;
    var donors = load();
    donors.unshift({ name: name, record: rec });
    try { localStorage.setItem(KEY, JSON.stringify(donors.slice(0, 60))); } catch (_) {}
    render();
    var msg = document.getElementById("donorMsg");
    if (msg) {
      msg.hidden = false;
      msg.textContent = "Logged, " + name + ' \u2014 "' + rec + "\" is on the caretaker's desk. Your plaque is on the wall.";
    }
    form.reset();
  });

  var mailTo = ((cfg.archive || {}).mailTo || "").trim();
  if (mailTo) {
    var ml = document.getElementById("mailLine");
    if (ml) ml.textContent = "Mail your LPs to: " + mailTo;
  }
})();
