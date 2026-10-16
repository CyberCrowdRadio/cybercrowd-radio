/* dj-sequence.js — Cybercrowd Radio player
 *
 * RADIO MEANS MUSIC PLAYS.
 * 1 song plays fully. At the end, DJ talks. Next song plays. Repeat.
 * No searching. No seeking. No theater.
 *
 * DJ script (James's words):
 * "Alright, Sonny Daze is on a break! While he is away, I am Kinetic.
 *  Next up is '[title]' by '[artist]'."
 */
(function () {
  'use strict';

  var audio = null;
  var stopped = true;
  var statusEl = null;
  var tracks = [];
  var trackIndex = 0;

  function setStatus(t) {
    if (statusEl) statusEl.textContent = t;
  }

  // Split "Title - Artist" or just use the title for both.
  function parseTrack(title) {
    var parts = title.split(' - ');
    if (parts.length >= 2) {
      return { title: parts[0].trim(), artist: parts.slice(1).join(' - ').trim() };
    }
    return { title: title, artist: title };
  }

  function djSay(text, done) {
    if (!('speechSynthesis' in window)) { done(); return; }
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.onend = function () { done(); };
      u.onerror = function () { done(); };
      var fallback = setTimeout(function () {
        try { window.speechSynthesis.cancel(); } catch (e) {}
        done();
      }, 20000);
      var origDone = done;
      done = function () { clearTimeout(fallback); origDone(); };
      u.onend = function () { done(); };
      u.onerror = function () { done(); };
      window.speechSynthesis.speak(u);
    } catch (e) { done(); }
  }

  function playCurrent() {
    if (stopped || !tracks.length) return;
    var t = tracks[trackIndex % tracks.length];
    var p = parseTrack(t.title);
    setStatus('Now playing: ' + t.title);
    try {
      if (audio) { try { audio.pause(); } catch (e) {} audio = null; }
      audio = new Audio('/t/' + t.id);
      audio.preload = 'auto';
      audio.addEventListener('ended', onSongEnd);
      audio.addEventListener('error', onSongEnd);
      var pr = audio.play();
      if (pr && pr.catch) pr.catch(function () { onSongEnd(); });
    } catch (e) { onSongEnd(); }
  }

  function onSongEnd() {
    if (stopped) return;
    trackIndex = (trackIndex + 1) % tracks.length;
    var next = tracks[trackIndex];
    var p = parseTrack(next.title);
    var script = "Alright, Sonny Daze is on a break! While he is away, I am Kinetic. " +
      "Next up is '" + p.title + "' by '" + p.artist + "'.";
    setStatus('DJ is talking…');
    djSay(script, function () {
      if (!stopped) playCurrent();
    });
  }

  function loadAndStart() {
    fetch('/tracks')
      .then(function (r) { return r.json(); })
      .then(function (list) {
        if (stopped) return;
        if (!list || !list.length) {
          setStatus('No songs in the bucket.');
          return;
        }
        tracks = list;
        trackIndex = 0;
        playCurrent();
      })
      .catch(function () {
        if (!stopped) {
          setStatus('Retrying…');
          setTimeout(loadAndStart, 5000);
        }
      });
  }

  window.CCRadioDJ = {
    start: function (statusElement) {
      statusEl = statusElement || null;
      stopped = false;
      tracks = [];
      trackIndex = 0;
      loadAndStart();
    },
    stop: function () {
      stopped = true;
      try { window.speechSynthesis.cancel(); } catch (e) {}
      if (audio) { try { audio.pause(); } catch (e) {} audio = null; }
      setStatus('Ready.');
    },
    isStopped: function () { return stopped; },
    next: function () {
      if (!tracks.length) return;
      trackIndex = (trackIndex + 1) % tracks.length;
      if (!stopped) playCurrent();
    },
  };
})();
