/* radio-player.js — Cybercrowd Radio ONE BUTTON
 *
 * ONE JOB: one button. Play / pause. Like every other site.
 *
 * Hit PLAY → DJ talks → music plays → next track → DJ talks → music plays…
 * Hit PAUSE → everything stops.
 *
 * The browser is a dumb receiver. The Worker serves the audio.
 * The DJ sequencer handles voice-then-song. This file just wires the button.
 *
 * Does not: pick tracks, talk, touch billing, touch chat.
 */
(function () {
  'use strict';

  function init() {
    var btn = document.getElementById('cc-radio-btn');
    var status = document.getElementById('cc-radio-status');
    if (!btn) return;

    var playing = false;

    function setBtn() {
      btn.textContent = playing ? '⏸ Pause' : '▶ Play';
      btn.setAttribute('aria-pressed', playing ? 'true' : 'false');
    }

    btn.addEventListener('click', function () {
      if (!window.CCRadioDJ) {
        if (status) status.textContent = 'Player not loaded.';
        return;
      }
      if (playing) {
        window.CCRadioDJ.stop();
        playing = false;
        if (status) status.textContent = 'Paused.';
      } else {
        window.CCRadioDJ.start(status);
        playing = true;
      }
      setBtn();
    });

    setBtn();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
