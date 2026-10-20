/*
CYBERCROWD

REPO:
CyberCrowdRadio/cybercrowd-radio

LANE:
PUBLIC NET

FILE:
cc-auth.js

BUILD LAW:
1 FILE
1 JOB
1 FUNCTION

JOB:
Import the account engine sequence in exact deterministic order.

FUNCTION:
Load each one-job file, in order, synchronously. No logic.
Requires (loaded before this file on the page): firebase-app-compat.js,
firebase-auth-compat.js, firebase-database-compat.js, config.js.
*/
(function () {
  'use strict';

  var SEQUENCE = [
    'cc-auth-config.js',
    'cc-auth-errors.js',
    'cc-auth-handles.js',
    'cc-auth-create.js',
    'cc-auth-signin.js',
    'cc-auth-signout.js',
    'cc-auth-watch.js'
  ];

  for (var i = 0; i < SEQUENCE.length; i++) {
    document.write('<script src="' + SEQUENCE[i] + '"><\/script>');
  }
})();
