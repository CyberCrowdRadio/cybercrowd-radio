/*
CYBERCROWD

REPO:
CyberCrowdRadio/cybercrowd-radio

LANE:
PUBLIC NET

FILE:
cc-auth-signout.js

BUILD LAW:
1 FILE
1 JOB
1 FUNCTION

JOB:
Sign out — and nothing else.

FUNCTION:
End the Firebase session. Attach signOut() to the account sequence base.
*/
(function () {
  'use strict';

  function signOut() {
    var base = window.CCAuthBase;
    return base.init().then(function () {
      return base.services().auth.signOut();
    });
  }

  window.CCAuthBase.signOut = signOut;
})();
