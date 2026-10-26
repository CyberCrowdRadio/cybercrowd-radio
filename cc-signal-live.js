/* cc-signal-live.js — PUBLIC FACE only, not authority
 * ONE JOB: show LIVE on the page, because the station is always live.
 * The station seesaws between live AI and live Sonny, both live,
 * never standby, never offline, one river, always live.
 * This file changes no stream, no engine, no sound, no account.
 * It only sets the page labels that were stuck on defaults:
 * nowPlaying, streamState, and onairText, from Standby and
 * SIGNAL OFFLINE, to LIVE, on load, so listeners see LIVE
 * when the box is live, not offline when the box is live.
 * If the page audio later fails, the receiver can change these
 * labels again, but the default is LIVE, not offline, because
 * the station is always live, not sometimes live.
 * This file alone does nothing visible until station.html loads it
 * after the receiver, same wiring rule as display.
 */
(function () {
  'use strict';
  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }
  function mount() {
    setText('nowPlaying', 'LIVE — Cybercrowd Radio, on air now');
    setText('streamState', 'LIVE');
    setText('onairText', 'LIVE');
    window.CC_SIGNAL_LIVE_LOADED = true;
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
