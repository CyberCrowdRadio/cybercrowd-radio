/*
CYBERCROWD

REPO:
CyberCrowdRadio/cybercrowd-radio

LANE:
FACE - LISTENER LOCAL

FILE:
cc-eq-rail.js

BUILD LAW:
1 FILE
1 JOB
1 FUNCTION

JOB:
Connect the equalizer engine to the station player.

FUNCTION:
Find the station audio element on this page and attach the
engine to it, so the listener's faders move their own sound.
If there is no audio element, wait for one and say so. If the
engine is missing, refuse and leave the music playing exactly
as it was. This file never changes volume, source, or playback.
It never touches the broadcast, the server, or any other
listener. It has no faders, no seat, no trial, and no gate.
Those are later steps.

HONEST LIMIT, READ THIS:
Today's receiver plays through a JS-only Audio object, not a
page audio tag, so a page rail cannot see it until the receiver
exposes its element. That is why connect() also offers
attachTo(el): hand it the element and it connects at once.
The receiver fix rides alongside, a parked piece, not an
equalizer file.
*/

'use strict';

window.CCEQRail = (function () {
  var current = null;
  var observer = null;
  var state = 'idle';

  function hasEngine() {
    return !!(window.CCEQEngine && window.CCEQEngine.attach);
  }

  function findElement() {
    var marked = document.querySelector('audio[data-cc-player]');
    if (marked) return marked;
    return document.querySelector('audio');
  }

  function stopWatching() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  function attachTo(el) {
    if (!el) return false;
    if (!hasEngine()) {
      state = 'no-engine';
      return false;
    }
    if (window.CCEQEngine.attach(el)) {
      current = el;
      state = 'attached';
      stopWatching();
      return true;
    }
    state = 'idle';
    return false;
  }

  function watch() {
    var found;
    if (typeof MutationObserver === 'undefined') return;
    if (observer) return;
    found = findElement();
    if (found) {
      attachTo(found);
      return;
    }
    observer = new MutationObserver(function () {
      var el = findElement();
      if (el) attachTo(el);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function connect() {
    var el;
    if (current && state === 'attached') return true;
    if (!hasEngine()) {
      state = 'no-engine';
      return false;
    }
    el = findElement();
    if (el) return attachTo(el);
    state = 'waiting';
    watch();
    return false;
  }

  function disconnect() {
    stopWatching();
    if (window.CCEQEngine && window.CCEQEngine.detach) {
      try { window.CCEQEngine.detach(); } catch (e) {}
    }
    current = null;
    state = 'idle';
  }

  function reconnect() {
    disconnect();
    return connect();
  }

  function status() {
    return {
      engine: hasEngine(),
      attached: state === 'attached',
      state: state,
      elementFound: !!current
    };
  }

  return {
    connect: connect,
    attachTo: attachTo,
    disconnect: disconnect,
    reconnect: reconnect,
    status: status
  };
})();
