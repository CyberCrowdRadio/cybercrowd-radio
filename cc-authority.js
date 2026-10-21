/* CC-AUTHORITY — the adapter between the face and Radio-authority.
 *
 * REPO: cybercrowd-radio (public — the face)
 * LANE: FACE - ADAPTER
 * FILE: cc-authority.js
 *
 * BUILD LAW: 1 FILE, 1 JOB, 1 FUNCTION.
 *
 * JOB: Adapt the face to Radio-authority.
 *
 * FUNCTION: Carry a question from the browser to
 * Radio-authority and bring its answer back. It decides
 * nothing, stores nothing, and holds no secrets — the
 * authority's address is public. If the authority cannot be
 * reached, it says so; it never invents an answer.
 */

(function () {
  "use strict";

  var AUTHORITY_URL = "https://radio-authority.cybercrowdradio.workers.dev";

  function ask(path, data) {
    return fetch(AUTHORITY_URL + path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data || {}),
    })
      .then(function (res) {
        return res.json().catch(function () {
          return { ok: false, error: "authority-bad-answer" };
        });
      })
      .catch(function () {
        return { ok: false, error: "authority-unreachable" };
      });
  }

  window.CCAuthority = { ask: ask };
})();
