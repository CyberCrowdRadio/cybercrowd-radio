/*
CYBERCROWD

REPO:
CyberCrowdRadio/cybercrowd-radio

LANE:
PUBLIC NET

FILE:
cc-auth-watch.js

BUILD LAW:
1 FILE
1 JOB
1 FUNCTION

JOB:
Watch who is signed in, and publish the public CCAuth surface.

FUNCTION:
onUser(cb) fires now and on every sign-in change. Assembles window.CCAuth
from the sequence pieces — the one face the pages ever touch.
*/
(function () {
  'use strict';

  /* cb(user|null) — fires now and on every change. */
  function onUser(cb) {
    var base = window.CCAuthBase;
    base.init().then(function () {
      base.services().auth.onAuthStateChanged(cb);
    }).catch(function () { cb(null); });
  }

  window.CCAuth = {
    init: window.CCAuthBase.init,
    createAccount: window.CCAuthBase.createAccount,
    signIn: window.CCAuthBase.signIn,
    signOut: window.CCAuthBase.signOut,
    onUser: onUser
  };
})();
