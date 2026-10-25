/*
CYBERCROWD

REPO:
CyberCrowdRadio/cybercrowd-radio

LANE:
FACE - LISTENER LOCAL

FILE:
cc-eq-engine.js

BUILD LAW:
1 FILE
1 JOB
1 FUNCTION

JOB:
Give one listener their own equalizer for the station player.

FUNCTION:
Take the station audio element in this browser only, run its
sound through a chain of filters, and hand back set and reset.
Flat at zero means the sound arrives exactly as the DJ sent it.
Nothing in this file touches the broadcast, the server, or any
other listener. It never sends audio anywhere. It never stores
anything. It has no timers and makes no network calls.

DIALS, NOT LAW (change these numbers and the job stays the same):
- BAND_FREQS: five filter frequencies. The faders step names them.
- GAIN_DB: how far a band moves the sound, plus or minus.
*/

'use strict';

window.CCEQEngine = (function () {
  var BAND_FREQS = [60, 250, 1000, 4000, 10000];
  var GAIN_DB = 12;

  var ctx = null;
  var source = null;
  var filters = [];
  var element = null;

  function buildChain() {
    var i;
    var node;
    filters = [];
    for (i = 0; i < BAND_FREQS.length; i++) {
      node = ctx.createBiquadFilter();
      node.type = 'peaking';
      node.frequency.value = BAND_FREQS[i];
      node.Q.value = 1;
      node.gain.value = 0;
      filters.push(node);
    }
    for (i = 0; i < filters.length - 1; i++) {
      filters[i].connect(filters[i + 1]);
    }
  }

  function attach(audioEl) {
    if (!audioEl) return false;
    if (element === audioEl && source) return true;
    detach();
    try {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.resume) {
        try { ctx.resume(); } catch (e) {}
      }
      if (audioEl._ccEqSource) {
        source = audioEl._ccEqSource;
      } else {
        source = ctx.createMediaElementSource(audioEl);
        audioEl._ccEqSource = source;
      }
      element = audioEl;
      buildChain();
      source.disconnect();
      source.connect(filters[0]);
      filters[filters.length - 1].connect(ctx.destination);
      return true;
    } catch (e) {
      return false;
    }
  }

  function setBand(index, db) {
    if (!filters[index]) return false;
    if (db > GAIN_DB) db = GAIN_DB;
    if (db < -GAIN_DB) db = -GAIN_DB;
    filters[index].gain.value = db;
    return true;
  }

  function reset() {
    var i;
    for (i = 0; i < filters.length; i++) {
      filters[i].gain.value = 0;
    }
  }

  function detach() {
    if (source && ctx) {
      try {
        source.disconnect();
        source.connect(ctx.destination);
      } catch (e) {}
    }
    filters = [];
    element = null;
  }

  function bands() {
    return BAND_FREQS.slice();
  }

  return {
    attach: attach,
    setBand: setBand,
    reset: reset,
    detach: detach,
    bands: bands
  };
})();
