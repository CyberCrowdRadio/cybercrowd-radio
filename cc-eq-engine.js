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
  var masterGain = null;
  var programGain = null;
  var overlay = null;
  var lastVolume = 0.8;

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
    masterGain = ctx.createGain();
    masterGain.gain.value = lastVolume;
    filters[filters.length - 1].connect(masterGain);
    masterGain.connect(ctx.destination);
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
      programGain = ctx.createGain();
      source.connect(programGain);
      programGain.connect(filters[0]);
      return true;
    } catch (e) {
      return false;
    }
  }

  // Weather is mixed through the listener's existing EQ and volume path.
  // Its stop is scheduled on the audio clock, not a throttled UI timer.
  function playOverlay(buffer, offset, seconds) {
    if (!ctx || !filters.length || !programGain || !element || ctx.state !== 'running') return null;
    if (overlay) overlay.stop();
    var node = ctx.createBufferSource();
    var fade = ctx.createGain();
    var level = ctx.createGain();
    var now = ctx.currentTime;
    var length = Math.min(seconds, buffer.duration - offset);
    if (!(length > 0)) return null;
    node.buffer = buffer;
    node.connect(fade); fade.connect(level); level.connect(filters[0]);
    var media = element;
    function volume() { level.gain.value = media.volume; }
    volume(); media.addEventListener('volumechange', volume);
    fade.gain.setValueAtTime(0, now);
    fade.gain.linearRampToValueAtTime(1, now + Math.min(0.18, length / 2));
    fade.gain.setValueAtTime(1, now + Math.max(0, length - 0.25));
    fade.gain.linearRampToValueAtTime(0, now + length);
    programGain.gain.cancelScheduledValues(now);
    programGain.gain.setTargetAtTime(0.22, now, 0.04);
    programGain.gain.setTargetAtTime(1, now + length, 0.08);
    var handle = { stop: function () {
      try { node.stop(); } catch (_) {}
      if (overlay === handle) {
        overlay = null;
        programGain.gain.cancelScheduledValues(ctx.currentTime);
        programGain.gain.setTargetAtTime(1, ctx.currentTime, 0.015);
      }
    }};
    overlay = handle;
    node.onended = function () {
      media.removeEventListener('volumechange', volume);
      node.disconnect(); fade.disconnect(); level.disconnect();
      if (overlay === handle) overlay = null;
    };
    node.start(now, offset, length);
    node.stop(now + length);
    return handle;
  }

  function audioContext() { return ctx; }

  function setBand(index, db) {
    if (!filters[index]) return false;
    if (db > GAIN_DB) db = GAIN_DB;
    if (db < -GAIN_DB) db = -GAIN_DB;
    filters[index].gain.value = db;
    return true;
  }
  function setVolume(v) {
    v = Number(v);
    if (isNaN(v)) return false;
    if (v < 0) v = 0;
    if (v > 1) v = 1;
    lastVolume = v;
    if (masterGain) {
      if (masterGain.gain.setTargetAtTime && ctx) {
        masterGain.gain.setTargetAtTime(v, ctx.currentTime, 0.01);
      } else {
        masterGain.gain.value = v;
      }
    }
    return true;
  }

  function reset() {
    var i;
    for (i = 0; i < filters.length; i++) {
      filters[i].gain.value = 0;
    }
  }

  function detach() {
    if (overlay) overlay.stop();
    if (programGain) { try { programGain.disconnect(); } catch (_) {} programGain = null; }
    if (source && ctx) {
      try {
        source.disconnect();
        source.connect(ctx.destination);
      } catch (e) {}
    }
    filters = [];
    element = null;
    if (masterGain) {
      try { masterGain.disconnect(); } catch (e) {}
      masterGain = null;
    }
  }

  function bands() {
    return BAND_FREQS.slice();
  }

  return {
    attach: attach,
    playOverlay: playOverlay,
    audioContext: audioContext,
    setBand: setBand,
    setVolume: setVolume,
    reset: reset,
    detach: detach,
    bands: bands
  };
})();

