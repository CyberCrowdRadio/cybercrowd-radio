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
    return { title: title, artist: 'Cybercrowd' };
  }

  /* Kinetic personality: Chris Rock energy meets Wolfman Jack hype.
   * Fast-talking, funny, big DJ energy. Never the same line twice. */
  var kineticLines = [
    function (t, a) { return "Whooo! Sonny Daze stepped out, so YOU got me — Kinetic! Let me tell you somethin', '" + t + "' by " + a + " is about to tear this place UP!"; },
    function (t, a) { return "Aight aight aight! Sonny's on a break, I'm Kinetic holdin' it down! Comin' atcha — '" + t + "' by " + a + "! Turn it UP!"; },
    function (t, a) { return "Y'all ain't ready! Sonny Daze is out, Kinetic is IN! Next up — '" + t + "' by " + a + "! Whooo!"; },
    function (t, a) { return "Listen here! While Sonny's away, the Kinetic's gonna play! '" + t + "' by " + a + " — let's GOOO!"; },
    function (t, a) { return "Ohhh baby! Sonny Daze took five, so I'm drivin' this thing! Buckle up — '" + t + "' by " + a + " comin' atcha RIGHT NOW!"; },
  ];
  var lineIndex = 0;
  function kineticScript(title, artist) {
    var fn = kineticLines[lineIndex % kineticLines.length];
    lineIndex++;
    return fn(title, artist);
  }

  function djSay(text, done) {
    if (!('speechSynthesis' in window)) { done(); return; }
    var finished = false;
    function once() {
      if (finished) return;
      finished = true;
      clearTimeout(fallback);
      done();
    }
    var fallback = setTimeout(function () {
      try { window.speechSynthesis.cancel(); } catch (e) {}
      once();
    }, 8000);
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.rate = 1.09;   // 5% slower than 1.15 — James 2026-10-17
      u.pitch = 0.9;   // slightly lower — Wolfman grit
      // Male voice — James 2026-10-17
      try {
        var voices = window.speechSynthesis.getVoices();
        var male = null;
        for (var i = 0; i < voices.length; i++) {
          var n = (voices[i].name || '').toLowerCase();
          if (/male|david|daniel|james|alex|fred|george|aaron|matthew|michael|john|robert|william|thomas/.test(n) && !/female|samantha|victoria|zira|aria|jenny|michelle/.test(n)) {
            male = voices[i];
            break;
          }
        }
        if (male) u.voice = male;
      } catch (e) {}
      u.onend = once;
      u.onerror = once;
      window.speechSynthesis.speak(u);
    } catch (e) { once(); }
  }

  var playWatchdog = null;

  function playCurrent() {
    if (stopped || !tracks.length) return;
    var t = tracks[trackIndex % tracks.length];
    var p = parseTrack(t.title);
    setStatus('Now playing: ' + t.title);
    try {
      // Reuse single audio element — mobile browsers choke on many Audio objects
      if (!audio) {
        audio = new Audio();
        audio.preload = 'auto';
        audio.addEventListener('ended', onSongEnd);
        audio.addEventListener('error', skipDead);
        // If the stream stalls with no error, don't hang — skip.
        audio.addEventListener('stalled', function () {
          clearTimeout(playWatchdog);
          playWatchdog = setTimeout(function () {
            if (audio && audio.paused) onSongEnd();
          }, 5000);
        });
        audio.addEventListener('playing', function () {
          clearTimeout(playWatchdog);
          // This track works — remember it
          if (tracks[trackIndex]) markWorking(tracks[trackIndex].id);
        });
      } else {
        try { audio.pause(); } catch (e) {}
      }
      clearTimeout(playWatchdog);
      audio.src = '/t/' + t.id;
      audio.load();
      var pr = audio.play();
      // Watchdog: if it's not actually playing after 5s, skip SILENTLY (dead track).
      playWatchdog = setTimeout(function () {
        if (audio && audio.paused && !stopped) {
          skipDead();
        }
      }, 5000);
      if (pr && pr.catch) pr.catch(function () {
        clearTimeout(playWatchdog);
        skipDead();
      });
    } catch (e) { skipDead(); }
  }

  // Track health: learn which tracks work, avoid the dead ones.
  // Persisted in localStorage so it remembers across sessions.
  var trackHealth = {
    working: {},  // trackId -> true (played successfully)
    dead: {},     // trackId -> timestamp (failed)
  };
  try {
    var saved = localStorage.getItem('cc-track-health');
    if (saved) trackHealth = JSON.parse(saved);
  } catch (_) {}

  function saveHealth() {
    try { localStorage.setItem('cc-track-health', JSON.stringify(trackHealth)); }
    catch (_) {}
  }

  function markWorking(id) {
    trackHealth.working[id] = true;
    delete trackHealth.dead[id];
    saveHealth();
  }

  function markDead(id) {
    trackHealth.dead[id] = Date.now();
    delete trackHealth.working[id];
    saveHealth();
  }

  function pickNextTrack() {
    var ids = tracks.map(function (t) { return t.id; });
    // Prefer known-working tracks
    var working = ids.filter(function (id) { return trackHealth.working[id]; });
    if (working.length > 0) {
      var wid = working[Math.floor(Math.random() * working.length)];
      return tracks.findIndex(function (t) { return t.id === wid; });
    }
    // Avoid known-dead (unless everything is dead)
    var alive = ids.filter(function (id) { return !trackHealth.dead[id]; });
    if (alive.length > 0) {
      var aid = alive[Math.floor(Math.random() * alive.length)];
      return tracks.findIndex(function (t) { return t.id === aid; });
    }
    // Everything is dead — try anything, maybe something came back
    return Math.floor(Math.random() * tracks.length);
  }

  var deadStreak = 0;

  function skipDead() {
    if (stopped) return;
    // Mark this track as dead
    if (tracks[trackIndex]) markDead(tracks[trackIndex].id);
    setTimeout(function () {
      if (stopped) return;
      deadStreak++;
      if (deadStreak >= tracks.length) {
        // All tracks are dead. Don't spin forever — wait 30s and retry.
        deadStreak = 0;
        setStatus('Signal lost — retrying…');
        setTimeout(function () {
          if (!stopped) {
            trackIndex = pickNextTrack();
            playCurrent();
          }
        }, 30000);
        return;
      }
      // Smart pick: prefer working tracks, avoid dead ones
      trackIndex = pickNextTrack();
      playCurrent();
    }, 100); // tiny delay breaks the recursion chain
  }

  function onSongEnd() {
    if (stopped) return;
    deadStreak = 0; // a song actually played — reset the streak
    // Song ENDED (actually played). DJ talks about the NEXT song, then it plays.
    // Random next — the station never plays the same order twice.
    trackIndex = Math.floor(Math.random() * tracks.length);
    var next = tracks[trackIndex];
    var p = parseTrack(next.title);
    var script = kineticScript(p.title, p.artist);
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
        // Shuffle so it doesn't start with the same songs every time
        for (var i = tracks.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var tmp = tracks[i];
          tracks[i] = tracks[j];
          tracks[j] = tmp;
        }
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
      // Skip to next track immediately.
      if (!tracks.length) return;
      trackIndex = (trackIndex + 1) % tracks.length;
      if (!stopped) playCurrent();
    },
  };
})();
