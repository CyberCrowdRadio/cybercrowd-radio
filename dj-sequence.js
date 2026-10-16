/* dj-sequence.js — Cybercrowd Radio DJ voice-then-song sequencer
 *
 * ONE JOB: bot reads the script, THEN the song plays. Serial. Never overlapping.
 *
 * Sequence per track:
 *   1. Play pre-rendered DJ audio: "Welcome to cybercrowdradio AI. You got '[title]' upcoming."
 *   2. Wait for the audio to FINISH.
 *   3. Play the song through the Worker stream.
 *   4. Song ends → next track → back to step 1.
 *
 * DJ VOICE: pre-rendered MP3s in /audio/dj/ take priority over browser speech.
 * Drop files here:
 *   /audio/dj/welcome.mp3          — "Welcome to cybercrowdradio AI"
 *   /audio/dj/upcoming-[slug].mp3  — per-track "You got '[title]' upcoming"
 *   /audio/dj/sonny-daze.mp3       — "Sonny Daze will be on at [time]"
 * If a file is missing, falls back to browser speechSynthesis (temporary).
 *
 * Does not: touch the play/pause button, the Worker, billing, or chat.
 * Does not: speak over music. Ever.
 */
(function () {
  'use strict';

  var STREAM_BASE = '';
  var DJ_AUDIO_BASE = '/audio/dj';

  var audio = null;
  var djAudio = null;
  var speaking = false;
  var stopped = true;
  var statusEl = null;

  function setStatus(t) {
    if (statusEl) statusEl.textContent = t;
  }

  // Try pre-rendered DJ audio first. Fall back to browser speech if missing.
  function botSay(text, audioFile, done) {
    // Attempt 1: pre-rendered MP3
    if (audioFile) {
      try {
        djAudio = new Audio(DJ_AUDIO_BASE + '/' + audioFile);
        djAudio.addEventListener('ended', function () {
          speaking = false;
          djAudio = null;
          done();
        });
        djAudio.addEventListener('error', function () {
          // File missing — fall through to speech synthesis
          djAudio = null;
          botSpeak(text, done);
        });
        speaking = true;
        var p = djAudio.play();
        if (p && p.catch) p.catch(function () { djAudio = null; botSpeak(text, done); });
        return;
      } catch (e) { /* fall through */ }
    }
    botSpeak(text, done);
  }

  // Fallback: browser speech synthesis (temporary until all DJ lines are pre-rendered)
  function botSpeak(text, done) {
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
    // Pre-rendered: welcome.mp3 plays first, then per-track file if it exists.
    botSay(script, 'welcome.mp3', function () {
      if (stopped) return;
      // Try per-track upcoming announcement
      var slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      botSay("You got '" + title + "' upcoming.", 'upcoming-' + slug + '.mp3', function () {
        if (!stopped) playTrack(id, title, offset);
      });
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
      if (djAudio) { try { djAudio.pause(); } catch (e) {} djAudio = null; }
      if (audio) { try { audio.pause(); } catch (e) {} audio = null; }
      setStatus('Ready.');
    },
    isStopped: function () { return stopped; },
  };
})();
