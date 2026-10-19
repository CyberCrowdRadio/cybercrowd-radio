/* CCStudioPage — studio broadcast controls for studio.html.
 * One file, one job: the booth.
 *
 * DOES: GO LIVE / GO OFF AIR (remembers the stream URL),
 *       SAY IT + GONG IT via the booth's own voice.
 * DOES NOT: touch the player on station.html — the stream URL is
 *       shared through localStorage ("cc-studio-url"), which the
 *       player page picks up on its next visit.
 */
(function () {
  "use strict";
  var URL_KEY = "cc-studio-url";

  var url = document.getElementById("studioStreamUrl");
  var goBtn = document.getElementById("goLiveBtn");
  var offBtn = document.getElementById("goOffAirBtn");
  var status = document.getElementById("studioStatus");
  var sayInput = document.getElementById("kineticSay");
  var sayBtn = document.getElementById("kineticSayBtn");
  var gongBtn = document.getElementById("gongBtn");

  function setLive(on) {
    if (goBtn) goBtn.hidden = on;
    if (offBtn) offBtn.hidden = !on;
    if (status) {
      status.textContent = on
        ? "ON AIR \u2014 you're broadcasting live from the studio."
        : "Standby \u2014 paste your stream URL and hit GO LIVE.";
      status.classList.toggle("live", on);
    }
  }

  function saved() {
    try { return localStorage.getItem(URL_KEY) || ""; }
    catch (_) { return ""; }
  }

  if (url && saved()) url.value = saved();

  if (goBtn) goBtn.addEventListener("click", function () {
    var u = ((url && url.value) || "").trim();
    if (!u) {
      if (status) status.textContent = "Paste your stream URL first.";
      return;
    }
    try { localStorage.setItem(URL_KEY, u); } catch (_) {}
    setLive(true);
  });

  if (offBtn) offBtn.addEventListener("click", function () {
    try { localStorage.removeItem(URL_KEY); } catch (_) {}
    if (url) url.value = "";
    setLive(false);
  });

  setLive(!!saved());

  function speak(text, done) {
    if (!("speechSynthesis" in window)) { done(); return; }
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.onend = done;
      u.onerror = done;
      setTimeout(function () { try { window.speechSynthesis.cancel(); } catch (_) {} done(); }, 30000);
      window.speechSynthesis.speak(u);
    } catch (_) { done(); }
  }

  if (sayBtn) sayBtn.addEventListener("click", function () {
    var text = ((sayInput && sayInput.value) || "").trim();
    if (!text) return;
    if (status) status.textContent = "Kinetic is talking\u2026";
    speak(text, function () {
      if (sayInput) sayInput.value = "";
      if (status) status.textContent = "Back to the music.";
    });
  });

  if (gongBtn) gongBtn.addEventListener("click", function () {
    var text = ((sayInput && sayInput.value) || "").trim();
    if (status) status.textContent = "GONGED!";
    if (text) {
      speak(text, function () {
        if (sayInput) sayInput.value = "";
        if (status) status.textContent = "Kinetic takes back over.";
      });
    } else {
      setTimeout(function () {
        if (status) status.textContent = "Kinetic takes back over.";
      }, 800);
    }
  });
})();
