/* Invite Codes — one file, one job: generate and track invite codes.
 * DOES NOT: send emails or messages. It makes the codes; James sends them.
 * ONLY: create codes, track who used them.
 */

(function () {
  "use strict";

  var KEY = "ccr-invites";
  var USED_KEY = "ccr-invites-used";

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
    catch (_) { return []; }
  }
  function save(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (_) {}
  }
  function loadUsed() {
    try { return JSON.parse(localStorage.getItem(USED_KEY) || "{}"); }
    catch (_) { return {}; }
  }
  function saveUsed(map) {
    try { localStorage.setItem(USED_KEY, JSON.stringify(map)); } catch (_) {}
  }

  function makeCode() {
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no confusing chars
    var code = "";
    for (var i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  var Invites = {
    /* Generate a new invite code */
    create: function (label) {
      var codes = load();
      var code = makeCode();
      // ensure unique
      while (codes.find(function (c) { return c.code === code; })) {
        code = makeCode();
      }
      var entry = {
        code: code,
        label: label || "",
        created: Date.now(),
        createdBy: "fatmon'lefthanded",
      };
      codes.push(entry);
      save(codes);
      return entry;
    },

    /* List all codes */
    list: function () {
      return load();
    },

    /* Validate a code (for signup/join flow) */
    validate: function (code) {
      code = (code || "").trim().toUpperCase();
      var codes = load();
      var found = codes.find(function (c) { return c.code === code; });
      if (!found) return null;
      var used = loadUsed();
      if (used[code]) return { valid: false, reason: "already used", entry: found };
      return { valid: true, entry: found };
    },

    /* Mark a code as used */
    redeem: function (code, handle) {
      code = (code || "").trim().toUpperCase();
      var v = this.validate(code);
      if (!v || !v.valid) return false;
      var used = loadUsed();
      used[code] = { handle: handle || "unknown", at: Date.now() };
      saveUsed(used);
      return true;
    },

    /* Delete a code */
    revoke: function (code) {
      code = (code || "").trim().toUpperCase();
      var codes = load().filter(function (c) { return c.code !== code; });
      save(codes);
    },

    /* Who used what */
    usage: function () {
      return loadUsed();
    },
  };

  window.CCInvites = Invites;
})();
