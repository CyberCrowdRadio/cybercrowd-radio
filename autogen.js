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

  var DONNA_TRACKS = [{"title": "Firmament Prison", "audio_url": "https://origin.media.musicdonna.com/audios/6d41b629-e932-47bc-bff4-03ee4a65f660-1751573608454.m4a"}, {"title": "Raising Demons", "audio_url": "https://origin.media.musicdonna.com/audios/d3ec329a-93dc-40e6-a8ef-5b2c25813b8a-1751598239095.m4a"}, {"title": "Flat Earth NASA writes the script", "audio_url": "https://media.musicdonna.com/audios/27b7c1cd-dfab-46f3-b22f-c948b906986f-1751595899072.m4a"}, {"title": "Liquid Sunshine Sonata", "audio_url": "https://origin.media.musicdonna.com/audios/fb763ae2-b06e-48e1-9dcb-d694d4bc5c1c-1751597189088.m4a"}, {"title": "the pick of braille", "audio_url": "https://media.musicdonna.com/audios/822389b5-1a04-4437-98da-f92e63dcb0c5-1751599021372.m4a"}, {"title": "Blue Ice Illusions", "audio_url": "https://origin.media.musicdonna.com/audios/2d2a44d9-97f6-4d49-b83d-c3b3accb82fc-1751609639337.m4a"}, {"title": "alligator alcatraz", "audio_url": "https://content.media.musicdonna.com/audios/073d7940-9153-4ed0-820b-3b3b926e8b0b-1751611019331.m4a"}, {"title": "Brother", "audio_url": "https://media.musicdonna.com/audios/7039e26b-ec68-4136-9a01-887afdc4013d-1751657042543.m4a"}, {"title": "hillbilly heavy metal", "audio_url": "https://media.musicdonna.com/audios/2689b391-3f0f-4ff5-8c55-d29a124db655-1751903735262.m4a"}, {"title": "twinkle twinkle", "audio_url": "https://content.media.musicdonna.com/audios/301f1750-ae84-4441-affc-9516b14a3413-1751927918771.m4a"}, {"title": "Funky Animal Party", "audio_url": "https://media.musicdonna.com/audios/fffc2f6d-2973-4cbb-b8d1-ce2fe2b86801-1751930195681.m4a"}, {"title": "ABC Funk Dance", "audio_url": "https://media.musicdonna.com/audios/fc327046-ec38-41c2-bf42-773d05b85ff4-1753064796123.m4a"}, {"title": "Back and Forth", "audio_url": "https://origin.media.musicdonna.com/audios/d425edb2-f22f-49c8-a4ee-4296546141e1-1753837079322.m4a"}, {"title": "A Genius in Bloom", "audio_url": "https://content.media.musicdonna.com/audios/097a4848-a904-4215-8184-a456635c9b23-1753312716820.m4a"}, {"title": "Dont look over there", "audio_url": "https://content.media.musicdonna.com/audios/315d6ca0-633e-4773-b6a3-0f8f83e1357d-1751605679243.m4a"}, {"title": "Heavenly Battles", "audio_url": "https://content.media.musicdonna.com/audios/6e6104f6-d3fb-42b4-bb0d-eb79dd53bb9e-1751868064575.m4a"}, {"title": "Uncover the Truth", "audio_url": "https://origin.media.musicdonna.com/audios/27b7c1cd-dfab-46f3-b22f-c948b906986f-1751595901293.m4a"}, {"title": "Whispers of Truth", "audio_url": "https://content.media.musicdonna.com/audios/ab96408a-e888-4e7f-bce2-4c1a55015ffe-1751599949090.m4a"}, {"title": "Cybercrowd Anthem", "audio_url": "https://content.media.musicdonna.com/audios/88391282-6fcf-4959-86eb-fd552ecf310a-1751601509186.m4a"}, {"title": "Freedoms Anthem Unleashed", "audio_url": "https://origin.media.musicdonna.com/audios/da6af3d1-1316-4bbf-9eb5-9f126a4473bf-1751658452566.m4a"}];
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else { build(); }

  window.CCRadioAutoGen = { start: start, stop: stop };
})();
