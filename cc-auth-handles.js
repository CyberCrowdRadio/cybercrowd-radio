/*
CYBERCROWD

REPO:
CyberCrowdRadio/cybercrowd-radio

LANE:
PUBLIC NET

FILE:
cc-auth-handles.js

BUILD LAW:
1 FILE
1 JOB
1 FUNCTION

JOB:
Guard the handle rules — encoding, the "cybercrowd" reserve, uniqueness claims.

FUNCTION:
Attach handleKey() and validHandle() to the account sequence base. No Firebase calls.
*/
(function () {
  'use strict';

  /* Firebase keys can't contain . $ # [ ] / — url-safe base64 of the handle. */
  function handleKey(handle) {
    var b64 = btoa(unescape(encodeURIComponent(handle)));
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function validHandle(handle) {
    if (!handle) return 'Pick a handle.';
    if (handle.toLowerCase().indexOf('cybercrowd') !== -1) return 'That handle is reserved.';
    return null;
  }

  window.CCAuthBase.handleKey = handleKey;
  window.CCAuthBase.validHandle = validHandle;
})();
