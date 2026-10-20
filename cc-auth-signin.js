/*
CYBERCROWD

REPO:
CyberCrowdRadio/cybercrowd-radio

LANE:
PUBLIC NET

FILE:
cc-auth-signin.js

BUILD LAW:
1 FILE
1 JOB
1 FUNCTION

JOB:
Sign in — and nothing else.

FUNCTION:
Set the stay-signed-in mode, sign in with email and password.
Attach signIn() to the account sequence base.
*/
(function () {
  'use strict';

  /* Sign in. keepSignedIn=true: stays (2 weeks style). false: this visit only. */
  function signIn(email, password, keepSignedIn) {
    var base = window.CCAuthBase;
    return base.init().then(function () {
      var auth = base.services().auth;
      var mode = keepSignedIn
        ? window.firebase.auth.Auth.Persistence.LOCAL
        : window.firebase.auth.Auth.Persistence.SESSION;
      return auth.setPersistence(mode);
    }).then(function () {
      var auth = base.services().auth;
      return auth.signInWithEmailAndPassword(
        ((email || '').trim().toLowerCase()), (password || ''));
    }).then(function (cred) {
      return { uid: cred.user.uid, email: cred.user.email };
    }).catch(function (e) {
      throw new Error(base.cleanError(e));
    });
  }

  window.CCAuthBase.signIn = signIn;
})();
