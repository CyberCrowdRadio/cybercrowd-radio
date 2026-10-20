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
    opening: "Awoo! Hey, my friends! This is your main Lady of kentics , comin' at ya from Cybercrowd Radio, where the music never sleeps and the night never ends! Turn it UP, ya hear me? I said TURN IT UP!",
    songIntro: "Alright now, hold on to your hats, 'cause this next one is a real AI number! It's [SONG TITLE] by [ARTIST]. Ooh, yeah!",
    stationId: "You're locked in tight on Cybercrowd Radio, my friends! A station full throttled, hot, and just a bit wild! Don't touch that dial, now.",
    betweenSongs: "Ooh, wasn't that somethin'? Gimme a shout out! Stay right there, 'cause your Cybercrowd family has a whole lotta goodies comin' tip it up!",
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
