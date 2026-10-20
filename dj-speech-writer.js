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
    opening: "Awwwooooo! Heyyyy, my friends! This is your main man, comin' at ya from cyberrrCrrowooood rayyyyyy deeeee ooohooooo, where the music never sleeps and the night never ends! Turn it UP, ya hear me? I said TURN IT UP!",
    songIntro: "Alright now, hold on to your hats, 'cause this next one is a real AI number! It's [SONG TITLE] by [ARTIST]. Ooooh, yeah! Awwwooooo!",
    stationId: "You're locked in tight on cyberrrCrrowooood rayyyyyy deeeee ooohooooo, my friends! The only station that's full throttle, hot, and just a bit wild! Don't touch that dial, now. I'll know if you do!",
    betweenSongs: "Ooooh, wasn't that somethin'? Gimme a shout out! Stay right there, 'cause your Cybercrowd family has a whole lotta goodies comin' up!",
    signOff: "Well, that's all for now, children of the night. Be good, be groovy, and if you can't be good, be good at it! This is your friend, signin' off from cyberrrCrrowooood rayyyyyy deeeee ooohooooo. Next upcoming show is The Sonny Daze Show. Awwwooooo! Good night, everybody!"
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
