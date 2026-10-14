/* announcer.js — Cybercrowd Radio DJ bot
 * ONE JOB: talk like Sonny Daze when Sonny isn't live.
 * Wolfman Jack energy. Varied lines — never the same intro twice in a row.
 * Does not: touch the playlist, the stream, or the request queue.
 * Only: speak between songs via the browser's speech synthesis.
 */
(function () {
  'use strict';

  var lastIntro = -1;

  var INTROS = [
    '{title}. Turn it up or get out.',
    'Yeah. {title}. Deal with it.',
    '{title} — straight outta the vault. No mercy.',
    'You want {title}? You got {title}. Don\'t waste it.',
    '{title}. Crank it till your ears bleed.',
    'This is {title}. Shut up and listen.',
    '{title} on Cybercrowd Radio. That\'s it. That\'s the announcement.',
    'Here\'s {title}. You\'re welcome.',
    '{title}. Play it loud. I don\'t care about your neighbors.',
    'Support this station with CyberCrowd Coin. Now here\'s {title}.',
    '{title} — and yeah, support this station with CyberCrowd Coin or don\'t. Your call.'
  ];

  var WELCOMES = [
    'Cybercrowd Radio. I\'m the AI. Sonny\'ll be here when he\'s here.',
    'You\'re on Cybercrowd Radio. Music\'s playing. That\'s what matters.'
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
      u.rate = 0.92;
      u.pitch = 0.2;
      // Pick the deepest male voice — grunge, mad, pissed.
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
      speak('Shout out to ' + name + '! Thanks for the request on Cybercrowd Radio!');
    },
    tipThanks: function (name) {
      speak('Big thanks to ' + name + ' for the tip! You keep the signal alive!');
    }
  };
})();
