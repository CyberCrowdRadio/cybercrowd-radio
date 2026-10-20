/*
CYBERCROWD

REPO:
CyberCrowdRadio/cybercrowd-radio

LANE:
PUBLIC NET

FILE:
cc-auth-errors.js

BUILD LAW:
1 FILE
1 JOB
1 FUNCTION

JOB:
Translate Firebase error codes into plain words.

FUNCTION:
Attach cleanError() to the account sequence base. No Firebase calls.
*/
(function () {
  'use strict';

  function cleanError(e) {
    var code = (e && e.code) || '';
    if (code === 'auth/email-already-in-use') return 'That email already has an account. Try signing in.';
    if (code === 'auth/weak-password') return 'That password is too weak — make it stronger.';
    if (code === 'auth/invalid-email') return 'That email address doesn\'t look right.';
    if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential')
      return 'Email or password didn\'t match. Try again.';
    if (code === 'auth/too-many-requests') return 'Too many tries — wait a bit and try again.';
    if (code === 'auth/operation-not-allowed')
      return 'Email sign-in isn\'t turned on yet — James is flipping that switch.';
    return (e && e.message) || 'Something went wrong. Try again.';
  }

  window.CCAuthBase.cleanError = cleanError;
})();
