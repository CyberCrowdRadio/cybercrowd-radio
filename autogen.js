/* autogen.js — Cybercrowd Radio auto-generator
 * ONE JOB: play James's songs automatically, DJ talks between them.
 * Uses his script, his songs. No clicking through tracks.
 * Does not: touch the Suno playlist embed, the stream, or the request queue.
 */
(function () {
  'use strict';

  // James's script (set 2026-10-14, his words)
  var SCRIPT = {
    welcome: "Welcome to cybercrowdradio AI",
    upcoming: "You got '{title}' upcoming",
    sonny: "Sonny Daze will be on at {time}",
    tipThanks: "Shout out to {name}, thanks for the tip"
  };
  var SONNY_TIME = ""; // James never gave a time — leave blank until he does

  var queue = [];
  var qi = 0;
  var playing = false;
  var audio = null;
  var playerEl, nowEl, statusEl;

  var DONNA_TRACKS = [{"title": "Firmament Prison", "audio_url": "audio/01-Firmament-Prison.m4a"}, {"title": "Raising Demons", "audio_url": "audio/02-Raising-Demons.m4a"}, {"title": "Flat Earth NASA writes the script", "audio_url": "audio/03-Flat-Earth-NASA-writes-the-script.m4a"}, {"title": "Liquid Sunshine Sonata", "audio_url": "audio/04-Liquid-Sunshine-Sonata.m4a"}, {"title": "the pick of braille", "audio_url": "audio/05-the-pick-of-braille.m4a"}, {"title": "Blue Ice Illusions", "audio_url": "audio/06-Blue-Ice-Illusions.m4a"}, {"title": "alligator alcatraz", "audio_url": "audio/07-alligator-alcatraz.m4a"}, {"title": "Brother", "audio_url": "audio/08-Brother.m4a"}, {"title": "hillbilly heavy metal", "audio_url": "audio/09-hillbilly-heavy-metal.m4a"}, {"title": "twinkle twinkle", "audio_url": "audio/10-twinkle-twinkle.m4a"}, {"title": "Funky Animal Party", "audio_url": "audio/11-Funky-Animal-Party.m4a"}, {"title": "ABC Funk Dance", "audio_url": "audio/12-ABC-Funk-Dance.m4a"}, {"title": "Back and Forth", "audio_url": "audio/13-Back-and-Forth.m4a"}, {"title": "A Genius in Bloom", "audio_url": "audio/14-A-Genius-in-Bloom.m4a"}, {"title": "Dont look over there", "audio_url": "audio/15-Dont-look-over-there.m4a"}, {"title": "Heavenly Battles", "audio_url": "audio/16-Heavenly-Battles.m4a"}, {"title": "Uncover the Truth", "audio_url": "audio/17-Uncover-the-Truth.m4a"}, {"title": "Whispers of Truth", "audio_url": "audio/18-Whispers-of-Truth.m4a"}, {"title": "Cybercrowd Anthem", "audio_url": "audio/19-Cybercrowd-Anthem.m4a"}, {"title": "Freedoms Anthem Unleashed", "audio_url": "audio/20-Freedoms-Anthem-Unleashed.m4a"}];
  // Build from Donna tracks (direct audio). Suno tracks need MP3s.
  function buildQueue() {
    queue = [];
    for (var i = 0; i < DONNA_TRACKS.length; i++) {
      queue.push(DONNA_TRACKS[i]);
    }
    // Shuffle
    for (var j = queue.length - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var t = queue[j]; queue[j] = queue[k]; queue[k] = t;
    }
    qi = 0;
  }

  function speak(text, cb) {
    try {
      if (!('speechSynthesis' in window)) { if (cb) cb(); return; }
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.rate = 1.0;
      u.pitch = 0.8;
      // Male voice — wait for voices to load, pick male
      function pickVoice() {
        var voices = window.speechSynthesis.getVoices();
        for (var i = 0; i < voices.length; i++) {
          var n = (voices[i].name + ' ' + voices[i].lang).toLowerCase();
          if (/female|samantha|zira|jenny|aria|michelle|google uk english female/.test(n)) continue;
          if (/male|david|daniel|james|daniel|george|fred/.test(n)) { u.voice = voices[i]; break; }
        }
        if (!u.voice && voices.length) {
          // Fallback: pick the lowest-pitched available
          u.voice = voices[0];
        }
      }
      pickVoice();
      if (!window.speechSynthesis.getVoices().length) {
        window.speechSynthesis.onvoiceschanged = function () { pickVoice(); };
      }
      u.onend = function () { if (cb) cb(); };
      u.onerror = function () { if (cb) cb(); };
      window.speechSynthesis.speak(u);
      // Safety: if speech hangs, move on after 10s
      setTimeout(function () { if (cb) { var f = cb; cb = null; f(); } }, 10000);
    } catch (e) { if (cb) cb(); }
  }

  function setNow(t) { if (nowEl) nowEl.textContent = t; }
  function setStatus(t) { if (statusEl) statusEl.textContent = t; }

  function playNext() {
    if (!playing) return;
    if (qi >= queue.length) buildQueue();
    if (!queue.length) { setNow('No tracks loaded.'); return; }

    var track = queue[qi];
    qi++;

    // DJ intro using James's script
    var intro = SCRIPT.welcome + ". " + SCRIPT.upcoming.replace('{title}', track.title) + ".";
    if (SONNY_TIME) intro += " " + SCRIPT.sonny.replace('{time}', SONNY_TIME) + ".";

    setNow('Up next: ' + track.title);
    setStatus('DJ is talking...');

    speak(intro, function () {
      if (!playing) return;
      try {
        if (audio) { try { audio.pause(); } catch (e) {} }
        audio = new Audio(track.audio_url);
        audio.addEventListener('ended', playNext);
        audio.addEventListener('error', playNext);
        setNow('Now playing: ' + track.title);
        setStatus('Playing...');
        audio.play().catch(function () { playNext(); });
      } catch (e) { playNext(); }
    });
  }

  function start() {
    if (!queue.length) buildQueue();
    playing = true;
    setStatus('Starting...');
    speak(SCRIPT.welcome, playNext);
  }

  function stop() {
    playing = false;
    if (audio) { try { audio.pause(); } catch (e) {} }
    try { window.speechSynthesis.cancel(); } catch (e) {}
    setNow('Stopped.');
    setStatus('Ready.');
  }

  function build() {
    playerEl = document.getElementById('autogenPlayer');
    nowEl = document.getElementById('autogenNow');
    statusEl = document.getElementById('autogenStatus');
    var startBtn = document.getElementById('autogenStart');
    var stopBtn = document.getElementById('autogenStop');
    if (!playerEl) return;

    buildQueue();
    setStatus('Ready — ' + queue.length + ' tracks.');

    if (startBtn) startBtn.addEventListener('click', start);
    if (stopBtn) stopBtn.addEventListener('click', stop);

    // ONE STREAM: if ENTER was tapped, autostart the live stream.
    // No buttons. Tap ENTER and that's it.
    try {
      if (sessionStorage.getItem('ccr-autostart') === '1') {
        sessionStorage.removeItem('ccr-autostart');
        // Hide the start button — it's already starting
        if (startBtn) startBtn.style.display = 'none';
        setTimeout(start, 500);
      }
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else { build(); }

  window.CCRadioAutoGen = { start: start, stop: stop };
})();
