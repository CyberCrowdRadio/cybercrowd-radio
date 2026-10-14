/* announcer.js — Cybercrowd Radio AI announcer
 * ONE JOB: speak between songs when Sonny Daze isn't live.
 * Uses the browser's built-in speech — no server, no cost.
 * Script (James's words, 2026-10-14):
 *   "Welcome to cybercrowdradio AI"
 *   "You got '[track]' upcoming"
 *   "Sonny Daze will be on at [time]"
 *   + shout-outs for requests + thanks for tips
 * Does not: play music, touch the stream, or run when Sonny is live.
 * Only: announce.
 */
(function () {
  'use strict';

  var SONNY_ON_AT = '8 PM Central'; // James sets the time; bot speaks it
  var enabled = true;
  var sonnyLive = false;

  function speak(text) {
    if (!enabled || sonnyLive) return;
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.rate = 1.0;
      u.pitch = 1.0;
      window.speechSynthesis.speak(u);
    } catch (e) { /* voice unavailable — stay silent */ }
  }

  function welcome() {
    speak('Welcome to Cybercrowd Radio A.I.');
  }

  function trackStarted(title) {
    if (!title) return;
    speak("You got '" + title + "' upcoming.");
  }

  function sonnyComing() {
    speak('Sonny Daze will be on at ' + SONNY_ON_AT + '.');
  }

  function shoutOut(name, track) {
    if (!name) return;
    var msg = 'Big shout to ' + name;
    if (track) msg += ' — you asked for it, here comes ' + track;
    speak(msg + '.');
  }

  function thankTipper(name) {
    if (!name) return;
    speak('Thank you ' + name + ' for the tip. The crowd keeps the signal alive.');
  }

  // Public surface — playlist.js and app.js call these.
  window.CCRadioAnnouncer = {
    welcome: welcome,
    trackStarted: trackStarted,
    sonnyComing: sonnyComing,
    shoutOut: shoutOut,
    thankTipper: thankTipper,
    setSonnyLive: function (live) { sonnyLive = !!live; },
    setEnabled: function (on) { enabled = !!on; },
    setSonnyTime: function (t) { if (t) SONNY_ON_AT = t; }
  };
})();
