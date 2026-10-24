/*
CYBERCROWD

REPO:
CyberCrowdRadio/cybercrowd-radio

LANE:
FACE - LISTENER LOCAL

FILE:
cc-eq-gate.js

BUILD LAW:
1 FILE
1 JOB
1 FUNCTION

JOB:
Guard who may move the equalizer.

FUNCTION:
Hold one access level for the equalizer seat: member, trial,
or locked. Locked is the default and the fallback for anything
unknown, failing closed. When locked, user attempts on any
input or button inside the seat are stopped in the capture
phase, before the control ever moves, and each stopped attempt
is handed to a registered join handler. When member or trial,
attempts pass untouched. The gate guards user attempts, not
code calls. It has no seat, no faders, no reset button, and no
trial clock. The trial step owns the clock and sets trial
access; the account wiring sets member access. This file does
not read membership itself and invents no member check; it
trusts the caller to set access. It has no timers, no network
calls, and no storage. Access lives in memory only: a reload
returns to locked until the account or trial restores it.

NO DIALS:
The access words are member, trial, locked.
*/

'use strict';

window.CCEQGate = (function () {
  var containerEl = null;
  var access = 'locked';
  var joinFn = null;

  var VALUE_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'];

  function isControl(t) {
    return !!t && (t.tagName === 'INPUT' || t.tagName === 'BUTTON');
  }

  function callJoin() {
    if (joinFn) {
      try { joinFn(); } catch (e) {}
    }
  }

  function apply() {
    if (!containerEl) return;
    if (access === 'locked') {
      containerEl.classList.add('cc-eq-gated');
    } else {
      containerEl.classList.remove('cc-eq-gated');
    }
  }

  function onPointerDown(ev) {
    if (access !== 'locked') return;
    if (!isControl(ev.target)) return;
    ev.preventDefault();
    ev.stopPropagation();
    callJoin();
  }

  function onKeyDown(ev) {
    if (access !== 'locked') return;
    if (!isControl(ev.target)) return;
    if (ev.target.tagName === 'INPUT' && VALUE_KEYS.indexOf(ev.key) !== -1) {
      ev.preventDefault();
      ev.stopPropagation();
      callJoin();
      return;
    }
    if (ev.target.tagName === 'BUTTON' && (ev.key === 'Enter' || ev.key === ' ')) {
      ev.preventDefault();
      ev.stopPropagation();
      callJoin();
    }
  }

  function onKeyUp(ev) {
    if (access !== 'locked') return;
    if (!isControl(ev.target)) return;
    if (ev.target.tagName === 'BUTTON' && ev.key === ' ') {
      ev.preventDefault();
      ev.stopPropagation();
      callJoin();
    }
  }

  function mount(container) {
    if (!container) return false;
    if (containerEl === container) return true;
    unmount();
    containerEl = container;
    containerEl.addEventListener('pointerdown', onPointerDown, true);
    containerEl.addEventListener('keydown', onKeyDown, true);
    containerEl.addEventListener('keyup', onKeyUp, true);
    apply();
    return true;
  }

  function unmount() {
    if (containerEl) {
      containerEl.removeEventListener('pointerdown', onPointerDown, true);
      containerEl.removeEventListener('keydown', onKeyDown, true);
      containerEl.removeEventListener('keyup', onKeyUp, true);
      containerEl.classList.remove('cc-eq-gated');
    }
    containerEl = null;
    access = 'locked';
  }

  function setAccess(level) {
    if (level === 'member' || level === 'trial') {
      access = level;
    } else {
      access = 'locked';
    }
    apply();
    return access;
  }

  function getAccess() {
    return access;
  }

  function onJoinRequest(fn) {
    if (typeof fn === 'function') joinFn = fn;
  }

  function status() {
    return {
      access: access,
      locked: access === 'locked',
      joinHandler: !!joinFn,
      container: !!containerEl
    };
  }

  return {
    mount: mount,
    unmount: unmount,
    setAccess: setAccess,
    getAccess: getAccess,
    onJoinRequest: onJoinRequest,
    status: status
  };
})();
