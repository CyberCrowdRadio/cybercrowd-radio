/* CCRequestPage — request line for request.html.
 * One file, one job: the request queue.
 * Grouped by song, numbered in order. Names stack under each song.
 * "Don't own it" lets the booth answer back. Session-only, no server yet.
 */
(function () {
  "use strict";
  function esc(s) { return String(s == null ? "" : s).replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  var toast = document.getElementById("toast"), toastT = null;
  function say(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.hidden = false;
    requestAnimationFrame(function () { toast.classList.add("show"); });
    clearTimeout(toastT);
    toastT = setTimeout(function () {
      toast.classList.remove("show");
      setTimeout(function () { toast.hidden = true; }, 350);
    }, 3600);
  }

  // Request line is subscriber-only: gate behind signup (cybercrowd-list).
  try {
    var list = JSON.parse(localStorage.getItem("cybercrowd-list") || "[]");
    if (!list.length) {
      var form0 = document.getElementById("requestForm"),
          gate = document.getElementById("requestGate");
      if (form0) form0.hidden = true;
      if (gate) gate.hidden = false;
    }
  } catch (_) {}

  var queue = [];
  var queueList = document.getElementById("queueList"),
      queueEmpty = document.getElementById("queueEmpty");

  function render() {
    if (!queueList) return;
    queueList.innerHTML = "";
    if (!queue.length) {
      if (queueEmpty) queueEmpty.hidden = false;
      return;
    }
    if (queueEmpty) queueEmpty.hidden = true;
    queue.forEach(function (entry, i) {
      var li = document.createElement("li");
      li.className = "queue-item";
      li.innerHTML =
        '<span class="queue-num">' + (i + 1) + ".</span> " +
        '<span class="queue-song">' + esc(entry.song) + "</span> " +
        '<span class="queue-names">\u2014 ' + entry.names.map(esc).join(", ") + "</span> " +
        (entry.shout ? '<span class="queue-shout">(' + esc(entry.shout) + ")</span> " : "") +
        '<button class="queue-nope" type="button" data-idx="' + i + '">Don\'t own it</button>';
      queueList.appendChild(li);
    });
    queueList.querySelectorAll(".queue-nope").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var idx = Number(btn.dataset.idx);
        var entry = queue[idx];
        if (!entry) return;
        queue.splice(idx, 1);
        render();
        say("Sorry " + entry.names.join(", ") + ' \u2014 I don\'t own "' + entry.song + '".');
      });
    });
  }

  var form = document.getElementById("requestForm");
  if (form) form.addEventListener("submit", function (e) {
    e.preventDefault();
    var song = document.getElementById("reqSong").value.trim();
    var name = document.getElementById("reqName").value.trim() || "Midnight caller";
    var shout = document.getElementById("reqShout").value.trim();
    if (!song) return;
    var key = song.toLowerCase(), existing = null;
    queue.forEach(function (en) { if (en.song.toLowerCase() === key) existing = en; });
    if (existing) {
      if (existing.names.indexOf(name) === -1) existing.names.push(name);
      if (shout && !existing.shout) existing.shout = shout;
    } else {
      queue.push({ song: song, names: [name], shout: shout });
    }
    render();
    var fm = document.getElementById("formMsg");
    if (fm) {
      fm.hidden = false;
      fm.textContent = 'Got it, ' + name + ' \u2014 "' + song + '" is in the queue. The booth answers back on the air.';
    }
    form.reset();
  });
  render();
})();
