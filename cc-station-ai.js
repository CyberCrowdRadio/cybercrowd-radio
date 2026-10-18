/* CC Station AI — Kinetic, the live station host. 2026-10-17.
 * James: "1 station = AI. Then Sonny goes live."
 * James: "It's like UHF channel, on air, one channel."
 * James: "It's a river, not a choice."
 *
 * KINETIC IS THE STATION. 24/7. One channel. Everybody tunes in,
 * everybody hears the same thing. No playlists, no picking.
 *
 * FLOW:
 * 1. Kinetic picks a song (random, all tracks, never stops)
 * 2. Kinetic ANNOUNCES it live (male voice, on air personality)
 * 3. Song plays for everyone (via broadcast sync)
 * 4. Next song. Forever.
 *
 * SONNY LIVE: When James hits GO LIVE, Kinetic goes silent.
 * Sonny is on air. When Sonny's done, Kinetic takes it back.
 *
 * VOICE: Male, rate 1.09 (5% slower), pitch 0.9. James 2026-10-17.
 *
 * DOES: run the station as one live broadcast.
 * DOES NOT: play local-only. DOES NOT: let listeners pick songs.
 */

(function () {
  "use strict";

  var SONNY_LIVE_REF = 'broadcast/sonnyLive';
  var AI_STATE_REF = 'broadcast/aiState';

  var isSonnyLive = false;
  var aiRunning = false;
  var tracks = [];
  var playedIndices = [];
  var currentAudio = null;
  var db = null;

  // ---- Voice ----
  function getMaleVoice() {
    try {
      var voices = window.speechSynthesis.getVoices();
      for (var i = 0; i < voices.length; i++) {
        var n = (voices[i].name || '').toLowerCase();
        if (/male|david|daniel|james|alex|fred|george|aaron|matthew|michael|john|robert|william|thomas/.test(n) &&
            !/female|samantha|victoria|zira|aria|jenny|michelle/.test(n)) {
          return voices[i];
        }
      }
    } catch (_) {}
    return null;
  }

  function kineticSay(text, done) {
    if (!('speechSynthesis' in window)) { if (done) done(); return; }
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.rate = 1.09;   // 5% slower — James 2026-10-17
      u.pitch = 0.9;   // Wolfman grit
      var male = getMaleVoice();
      if (male) u.voice = male;
      var finished = false;
      var fallback = setTimeout(function () {
        try { window.speechSynthesis.cancel(); } catch (e) {}
        if (!finished) { finished = true; if (done) done(); }
      }, 12000);
      u.onend = function () {
        if (!finished) { finished = true; clearTimeout(fallback); if (done) done(); }
      };
      u.onerror = function () {
        if (!finished) { finished = true; clearTimeout(fallback); if (done) done(); }
      };
      window.speechSynthesis.speak(u);
    } catch (e) { if (done) done(); }
  }

  // ---- Track selection: random, all tracks, never stops ----
  function pickNextTrack() {
    if (!tracks.length) return null;
    if (playedIndices.length >= tracks.length) {
      playedIndices = []; // all played — start over, 24/7 never stops
    }
    var available = [];
    for (var i = 0; i < tracks.length; i++) {
      if (playedIndices.indexOf(i) === -1) available.push(i);
    }
    if (!available.length) { playedIndices = []; return pickNextTrack(); }
    var idx = available[Math.floor(Math.random() * available.length)];
    playedIndices.push(idx);
    return tracks[idx];
  }

  function parseTrack(title) {
    var parts = (title || '').split(' - ');
    if (parts.length > 1) {
      return { title: parts[0].trim(), artist: parts.slice(1).join(' - ').trim() };
    }
    return { title: title, artist: 'Cybercrowd' }; // James owns all songs
  }

  // ---- Kinetic's on-air lines ----
  var KINETIC_LINES = [
    "Alright, this is Kinetic on Cybercrowd Radio. Up next, '{title}' by '{artist}'.",
    "You're locked in to the one channel. Here's '{title}' by '{artist}'.",
    "Kinetic here, keeping it live 24/7. Next up: '{title}' by '{artist}'.",
    "No playlists, no picking — just the river. '{title}' by '{artist}', right now.",
    "This is your station. I'm Kinetic. '{title}' by '{artist}' coming at you."
  ];

  function kineticIntro(title, artist) {
    var line = KINETIC_LINES[Math.floor(Math.random() * KINETIC_LINES.length)];
    return line.replace('{title}', title).replace('{artist}', artist);
  }

  // ---- The live cycle ----
  function playNext() {
    if (!aiRunning || isSonnyLive) return;

    var track = pickNextTrack();
    if (!track) {
      setTimeout(playNext, 5000);
      return;
    }

    var p = parseTrack(track.title || track);
    var trackUrl = track.url || track.src || track;

    // Kinetic announces LIVE, then the song plays for everyone
    var intro = kineticIntro(p.title, p.artist);
    kineticSay(intro, function () {
      if (!aiRunning || isSonnyLive) return;

      // Broadcast to all listeners via Firebase
      if (window.CCBroadcast && window.CCBroadcast.setNowPlaying) {
        window.CCBroadcast.setNowPlaying(trackUrl, p.title, p.artist);
      }

      // Play locally too (this client is also a listener)
      playTrackLocal(trackUrl, function () {
        // Song ended — next one. Never stops.
        setTimeout(playNext, 2000);
      });
    });

    // Write AI state so all clients know Kinetic is on air
    writeAiState({ status: 'onair', track: p.title, artist: p.artist });
  }

  function playTrackLocal(url, onEnded) {
    if (currentAudio) {
      try { currentAudio.pause(); } catch (_) {}
    }
    currentAudio = new Audio();
    currentAudio.src = url;
    currentAudio.preload = 'auto';
    currentAudio.addEventListener('ended', function () {
      if (onEnded) onEnded();
    });
    currentAudio.play().catch(function () {
      if (onEnded) onEnded();
    });
  }

  function writeAiState(state) {
    var d = getDb();
    if (!d) return;
    try {
      d.ref(AI_STATE_REF).set(Object.assign({ updatedAt: Date.now() }, state));
    } catch (_) {}
  }

  // ---- Sonny LIVE takeover ----
  function onSonnyLive(sonnyIsLive) {
    isSonnyLive = sonnyIsLive;
    if (sonnyIsLive) {
      // Sonny's on — Kinetic goes silent immediately
      try { window.speechSynthesis.cancel(); } catch (_) {}
      if (currentAudio) { try { currentAudio.pause(); } catch (_) {} }
      writeAiState({ status: 'standby', note: 'Sonny Daze is live' });
    } else {
      // Sonny's done — Kinetic takes it back
      writeAiState({ status: 'returning', note: 'Kinetic is back' });
      kineticSay("Thank you, Sonny Daze! Kinetic's got it from here.", function () {
        playNext();
      });
    }
  }

  function getDb() {
    if (db) return db;
    try {
      if (window.firebase && window.firebase.database) {
        db = window.firebase.database();
        return db;
      }
    } catch (_) {}
    return null;
  }

  // ---- Start the station ----
  function start(inputTracks) {
    if (inputTracks && inputTracks.length) tracks = inputTracks;
    var d = getDb();
    if (!d) { setTimeout(function () { start(inputTracks); }, 2000); return; }

    // Watch for Sonny going live
    d.ref(SONNY_LIVE_REF).on('value', function (snap) {
      var val = snap.val();
      onSonnyLive(!!(val && val.live));
    });

    // Load voices (async on some browsers)
    try {
      if (window.speechSynthesis) {
        window.speechSynthesis.getVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
          window.speechSynthesis.onvoiceschanged = function () {
            window.speechSynthesis.getVoices();
          };
        }
      }
    } catch (_) {}

    aiRunning = true;
    writeAiState({ status: 'starting', note: 'Kinetic is on the air' });
    playNext();
  }

  function stop() {
    aiRunning = false;
    try { window.speechSynthesis.cancel(); } catch (_) {}
    if (currentAudio) { try { currentAudio.pause(); } catch (_) {} }
    writeAiState({ status: 'stopped' });
  }

  // Sonny hits GO LIVE — this is what his button calls
  function sonnyGoLive() {
    var d = getDb();
    if (!d) return;
    try {
      d.ref(SONNY_LIVE_REF).set({ live: true, startedAt: Date.now(), by: 'sonny-daze' });
    } catch (_) {}
  }

  function sonnyEndLive() {
    var d = getDb();
    if (!d) return;
    try {
      d.ref(SONNY_LIVE_REF).set({ live: false, endedAt: Date.now() });
    } catch (_) {}
  }

  window.CCStationAI = {
    start: start,
    stop: stop,
    sonnyGoLive: sonnyGoLive,
    sonnyEndLive: sonnyEndLive,
    isSonnyLive: function () { return isSonnyLive; }
  };
})();
