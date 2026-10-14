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
    'Alright now, we got {title} comin at ya on Cybercrowd Radio! Turn it UP!',
    'Oh yeah! Here comes {title} — straight outta the vault, baby!',
    'Sonny Daze ain\'t here but the music don\'t stop! This is {title}!',
    'You asked for it, you got it — {title} on Cybercrowd Radio!',
    'Crank it! {title} is on the air right now!',
    'From the Cybercrowd vault — {title}! Let\'s go!',
    'This one\'s a heater! {title} — only on Cybercrowd Radio!',
    'Keep it locked! {title} comin up next!',
    'AI plays AI, baby! Here\'s {title}!',
    'The crowd wanted it — {title} on your radio!',
    'Straight fire! {title} is live on Cybercrowd Radio!',
    'No commercials, no mercy — {title}!'
  ];

  var WELCOMES = [
    'Welcome to Cybercrowd Radio AI! I\'m holdin it down till Sonny Daze goes live!',
    'You\'re listenin to Cybercrowd Radio! The AI\'s on the decks till Sonny shows up!',
    'Welcome in! Cybercrowd Radio AI is live — Sonny Daze will jack the vinyl rack soon!'
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
      u.rate = 1.05;
      u.pitch = 0.85;
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
