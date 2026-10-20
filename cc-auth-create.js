/*
CYBERCROWD

REPO:
CyberCrowdRadio/cybercrowd-radio

LANE:
PUBLIC NET

FILE:
cc-auth-create.js

BUILD LAW:
1 FILE
1 JOB
1 FUNCTION

JOB:
Create the account — and nothing else.

FUNCTION:
Validate the handle, claim the name, create the Firebase user, write the
profile and the handle claim. Attach createAccount() to the sequence base.
*/
(function () {
  'use strict';

  /* Create the account: {email, password, handle, project} */
  function createAccount(opts) {
    var base = window.CCAuthBase;
    return base.init().then(function () {
      var services = base.services();
      var auth = services.auth;
      var db = services.db;
      var email = ((opts && opts.email) || '').trim().toLowerCase();
      var password = (opts && opts.password) || '';
      var handle = ((opts && opts.handle) || '').trim();
      var project = ((opts && opts.project) || '').trim();
      if (!email) throw new Error('Email is missing — verify your email first.');
      var herr = base.validHandle(handle);
      if (herr) throw new Error(herr);
      if (password.length < 8 || password.length > 29)
        throw new Error('Password must be 8 to 29 characters.');
      var key = base.handleKey(handle);
      /* Handle must be unique. Case-sensitive: "FastEddy" != "fastEddy". */
      return db.ref('handles/' + key).get().then(function (snap) {
        if (snap.exists()) throw new Error('That handle is taken — pick another.');
        return auth.createUserWithEmailAndPassword(email, password);
      }).then(function (cred) {
        var uid = cred.user.uid;
        var profile = {
          handle: handle,
          email: email,
          createdAt: window.firebase.database.ServerValue.TIMESTAMP
        };
        if (project) profile.project = project;
        return db.ref('users/' + uid).set(profile).then(function () {
          return db.ref('handles/' + key).set(uid);
        }).then(function () {
          return { uid: uid, handle: handle, email: email };
        });
      });
    }).catch(function (e) {
      throw new Error(window.CCAuthBase.cleanError(e));
    });
  }

  window.CCAuthBase.createAccount = createAccount;
})();
