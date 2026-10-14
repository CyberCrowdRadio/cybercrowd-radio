/* announcer.js — Cybercrowd Radio DJ bot
 * ONE JOB: talk like Sonny Daze when Sonny isn't live.
 * Warm, professional, sponsor-friendly. The voice advertisers want to hear.
 * Does not: touch the playlist, the stream, or the request queue.
 * Only: speak between songs via the browser's speech synthesis.
 */
(function () {
  'use strict';

  var lastIntro = -1;

  var INTROS = [
    'Coming up next, {title} on Cybercrowd Radio.',
    'Here\'s {title} — glad you\'re listening.',
    'This is {title} on your Cybercrowd Radio.',
    'Up next: {title}. Thanks for tuning in.',
    '{title} — only on Cybercrowd Radio.',
    'We\'ve got {title} for you right now.',
    '{title}. Sit back and enjoy.',
    'Now playing {title} on Cybercrowd Radio.',
    'Here comes {title}. Thanks for being here.',
    'Support this station with CyberCrowd Coin. Here\'s {title}.',
    '{title} — and if you love what you hear, support us with CyberCrowd Coin.'
  ];

  var WELCOMES = [
    'Welcome to Cybercrowd Radio. I\'m holding it down until Sonny Daze goes live.',
    'You\'re listening to Cybercrowd Radio. Thanks for tuning in.'
  ];

  function pick(arr, avoidLast) {
    var i;
    do { i = Math.floor(Math.random() * arr.length); }
    while (arr.length > 1 && i === avoidLast);
    return { text: arr[i], idx: i };
  }

  function speak(text) {
    try {
      if (!('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.rate = 1.0;
      u.pitch = 0.9;
      // Male voice, warm and professional.
      var voices = window.speechSynthesis.getVoices();
      var best = null;
      for (var i = 0; i < voices.length; i++) {
        var v = voices[i];
        var n = (v.name + ' ' + v.lang).toLowerCase();
        if (/female|samantha|zira|jenny|aria|michelle/.test(n)) continue;
        if (/male|david|daniel|james|mike|tom|alex|fred|victor|george/.test(n)) { best = v; break; }
        if (!best) best = v;
      }
      if (best) u.voice = best;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }

  window.CCRadioAnnouncer = {
    welcome: function () {
      var w = pick(WELCOMES, -1);
      speak(w.text);
    },
    trackStarted: function () {},
    sayTitle: function (title) {
      var r = pick(INTROS, lastIntro);
      lastIntro = r.idx;
      speak(r.text.replace('{title}', title));
    },
    shoutout: function (name) {
      speak('A big shout out to ' + name + '! Thanks for the request on Cybercrowd Radio.');
    },
    tipThanks: function (name) {
      speak('Thank you to ' + name + ' for the tip. You keep this station on the air.');
    }
  };
})();
