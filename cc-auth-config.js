/*
CYBERCROWD

REPO:
CyberCrowdRadio/cybercrowd-radio

LANE:
PUBLIC NET

FILE:
cc-auth-config.js

BUILD LAW:
1 FILE
1 JOB
1 FUNCTION

JOB:
Initialize the Firebase app, auth, and database exactly once.

FUNCTION:
Expose init() and the live services to the account sequence. No account logic.
*/
(function () {
  'use strict';

  var app = null, auth = null, db = null;
  var readyPromise = null;

  function init() {
    if (readyPromise) return readyPromise;
    readyPromise = new Promise(function (resolve, reject) {
      try {
        if (!window.firebase) { reject(new Error('Firebase SDK not loaded.')); return; }
        var cfg = window.STATION_CONFIG && window.STATION_CONFIG.firebaseConfig;
        if (!cfg) { reject(new Error('Firebase config missing.')); return; }
        if (window.firebase.apps && window.firebase.apps.length) {
          app = window.firebase.app();
        } else {
          app = window.firebase.initializeApp(cfg);
        }
        auth = window.firebase.auth();
        db = window.firebase.database();
        resolve(true);
      } catch (e) { reject(e); }
    });
    return readyPromise;
  }

  function services() {
    return { auth: auth, db: db };
  }

  window.CCAuthBase = { init: init, services: services };
})();
