/* CCVolume — one volume slider controls EVERYTHING.
 * DJ player, straight R2, live standby, GO LIVE monitor — all respect it.
 * James: "volume slider fake does nothing" — fixed 2026-10-16.
 *
 * DOES NOT: touch mic input gain (that's the MOTU/interface).
 * ONLY: output volume for every audio element on the page.
 */

(function () {
  "use strict";

  var currentVol = 0.8; // default 80

  function applyToAll() {
    // Hit every <audio> on the page
    var els = document.querySelectorAll("audio");
    for (var i = 0; i < els.length; i++) {
      try { els[i].volume = currentVol; } catch (_) {}
    }
    // Also catch players that create Audio() dynamically —
    // they check CCVolume.get() on play
  }

  function init() {
    var slider = document.getElementById("volSlider");
    if (!slider) return;

    // Set initial from slider
    currentVol = (parseInt(slider.value, 10) || 80) / 100;
    applyToAll();
    try { if (window.CCEQEngine && window.CCEQEngine.setVolume) window.CCEQEngine.setVolume(currentVol); } catch (e) {}

    slider.addEventListener("input", function () {
      currentVol = (parseInt(slider.value, 10) || 0) / 100;
      applyToAll();
      try { if (window.CCEQEngine && window.CCEQEngine.setVolume) window.CCEQEngine.setVolume(currentVol); } catch (e) {}
    });

    // Re-apply when new audio elements appear (dynamic players)
    var observer = new MutationObserver(function () { applyToAll(); });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  window.CCVolume = {
    get: function () { return currentVol; },
    set: function (v) {
      currentVol = Math.max(0, Math.min(1, v));
      applyToAll();
      try { if (window.CCEQEngine && window.CCEQEngine.setVolume) window.CCEQEngine.setVolume(currentVol); } catch (e) {}
      var s = document.getElementById("volSlider");
      if (s) s.value = Math.round(currentVol * 100);
    },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
