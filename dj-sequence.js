/* dj-sequence.js — Cybercrowd Radio DJ voice-then-song sequencer
 *
 * ONE JOB: bot reads the script, THEN the song plays. Serial. Never overlapping.
 *
 * Sequence per track:
 *   1. Speak: "Welcome to cybercrowdradio AI. You got '[title]' upcoming."
 *   2. Wait for the voice to FINISH (onend).
 *   3. Play the song through the Worker stream.
 *   4. Song ends → next track → back to step 1.
 *
 * Does not: touch the play/pause button, the Worker, billing, or chat.
 * Does not: speak over music. Ever.
 */
(function () {
  'use strict';

  var STREAM_BASE = 'https://media.cybercrowdradio.com';

  var audio = null;
  var speaking = false;
  var stopped = true;
  var statusEl = null;

  function setStatus(t) {
    if (statusEl) statusEl.textContent = t;
  }

  function botSay(text, done) {
    if (!('speechSynthesis' in window)) { done(); return; }
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.onend = function () { speaking = false; done(); };
      u.onerror = function () { speaking = false; done(); };
      // Safety: if onend never fires, move on after 15s
      var fallback = setTimeout(function () {
        if (speaking) {
          speaking = false;
          try { window.speechSynthesis.cancel(); } catch (e) {}
          done();
        }
      }, 15000);
      var origDone = done;
      done = function () { clearTimeout(fallback); origDone(); };
      u.onend = function () { speaking = false; done(); };
      u.onerror = function () { speaking = false; done(); };
      speaking = true;
      window.speechSynthesis.speak(u);
    } catch (e) { done(); }
  }

  function playTrack(id, title, offset) {
    if (stopped) return;
    setStatus('Now playing: ' + title);
    try {
      if (audio) { try { audio.pause(); } catch (e) {} audio = null; }
      audio = new Audio(STREAM_BASE + '/t/' + id);
      audio.preload = 'auto';
      audio.addEventListener('loadedmetadata', function h() {
        audio.removeEventListener('loadedmetadata', h);
        if (!stopped && offset > 0 && offset < audio.duration) {
          try { audio.currentTime = offset; } catch (e) {}
        }
      });
      audio.addEventListener('ended', function () {
        if (!stopped) next();
      });
      audio.addEventListener('error', function () {
        if (!stopped) next();
      });
      var p = audio.play();
      if (p && p.catch) p.catch(function () { if (!stopped) next(); });
    } catch (e) { if (!stopped) next(); }
  }

  function announceThenPlay(id, title, offset) {
    if (stopped) return;
    setStatus('DJ is talking…');
    var script = "Welcome to cybercrowdradio AI. You got '" + title + "' upcoming.";
    // Bot reads the script FIRST. Song starts only after the voice finishes.
    botSay(script, function () {
      if (!stopped) playTrack(id, title, offset);
    });
  }

  function next() {
    if (stopped) return;
    fetch(STREAM_BASE + '/now')
      .then(function (r) { return r.json(); })
      .then(function (now) {
        if (stopped || !now.id) return;
        announceThenPlay(now.id, now.title, now.offset || 0);
      })
      .catch(function () {
        // Retry in 5s if the Worker is unreachable
        if (!stopped) setTimeout(next, 5000);
      });
  }

  window.CCRadioDJ = {
    start: function (statusElement) {
      statusEl = statusElement || null;
      stopped = false;
      next();
    },
    stop: function () {
      stopped = true;
      speaking = false;
      try { window.speechSynthesis.cancel(); } catch (e) {}
      if (audio) { try { audio.pause(); } catch (e) {} audio = null; }
      setStatus('Ready.');
    },
    isStopped: function () { return stopped; },
  };
})();
