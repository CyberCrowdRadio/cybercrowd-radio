/*
CYBERCROWD

REPO:
CyberCrowdRadio/cybercrowd-radio

LANE:
LIVE STREAM - OCEAN DROPLET

FILE:
dj-speech-writer.js

BUILD LAW:
1 FILE
1 JOB
1 FUNCTION

JOB:
Hold the DJ's scripts and hand out the exact words for each moment.

FUNCTION:
Given a moment, return the words for it - the song intro gets the
song title and artist filled into their places. Words only:
no voice, no sound, no timing, no audio.
*/
(function () {
  'use strict';

  var SCRIPTS = {
    opening: "You're locked in to C-R-W-D, the Crowd! Bring your friends, and join the Crowd!",
    songIntro: "Alright now, hold on to your hats, It's [SONG TITLE] by [ARTIST].!",,
    stationId: "You're locked in tight on Cybercrowd Radio, my friends! A station full throttled, hot, and wild! Don't touch that dial.",
    betweenSongs: " THAT's somethin'? Gimme a shout out! Stay right there[SONG TITLE]
    signOff: "Well, that's all for now, children of the night. Be good, be groovy, and if you can't be good, be good at it! This is your friend, signin' off from Cybercrowd Radio. Next upcoming show is The Sonny Daze Show. Awoo! Good night, everybody!"
  };

  function words(moment, title, artist) {
    if (moment === 'songIntro') {
      return SCRIPTS.songIntro
        .replace('[SONG TITLE]', title || '')
        .replace('[ARTIST]', artist || '');
    }
    return SCRIPTS[moment] || '';
  }

  globalThis.DJSpeech = { words: words };
})();
