/*
File repo: CyberCrowdRadio/cybercrowd-radio
File name: recovery-panel.js
Movements: New root file.
Purpose: Run the account recovery panel through Radio-authority.
Does NOT: create accounts, store passwords, or implement backup email/SMS.
*/
(function() {
  "use strict";
  var human = "", token = "", busy = false;
  var get = function(id) { return document.getElementById(id); };
  var status = get("recoveryStatus");
  window.onRecoveryHuman = function(value) {
    human = value || ""; get("requestButton").disabled = !human || busy;
  };
  window.onRecoveryExpired = function() { human = ""; get("requestButton").disabled = true; };
  try {
    token = new URLSearchParams(window.location.hash.slice(1)).get("token") || "";
    if (token) {
      // Keep the secret in memory only; remove it from the address bar.
      window.history.replaceState({}, "", window.location.pathname);
      get("requestSection").hidden = true;
      get("resetSection").hidden = false;
    }
  } catch (_) {}
  get("recoveryRequest").addEventListener("submit", async function(e) {
    e.preventDefault();
    if (busy || !human) return;
    busy = true; get("requestButton").disabled = true;
    status.textContent = "Requesting your recovery email…";
    try {
      var result = await window.CCAuthority.ask("/api/recovery/request", {
        email: get("recoveryEmail").value.trim(), turnstileToken: human
      });
      status.textContent = result && result.success
        ? result.message
        : ((result && result.error && result.error.indexOf("authority-") !== 0)
          ? result.error : "Could not reach the station. Please try again.");
    } catch (_) { status.textContent = "Could not request recovery. Please try again."; }
    finally {
      busy = false; window.onRecoveryExpired();
      if (window.turnstile) { try { window.turnstile.reset(); } catch (_) {} }
    }
  });
  get("recoveryReset").addEventListener("submit", async function(e) {
    e.preventDefault();
    if (busy) return;
    var password = get("newPassword").value;
    if (password.length < 8 || password.length > 29) { status.textContent = "Use 8 to 29 characters."; return; }
    if (password !== get("confirmNewPassword").value) {
      status.textContent = "Your passwords do not match."; get("confirmNewPassword").focus(); return;
    }
    if (!token) { status.textContent = "Open the link in your recovery email."; return; }
    busy = true; get("resetButton").disabled = true;
    status.textContent = "Saving your new password…";
    try {
      var result = await window.CCAuthority.ask("/api/recovery/reset", { token: token, password: password });
      if (result && result.success) {
        token = "";
        get("newPassword").value = ""; get("confirmNewPassword").value = "";
        get("resetSection").hidden = true;
        status.textContent = "Password updated. Your existing account is ready. Sign in with your new password.";
        get("recoverySignin").textContent = "Sign in with new password";
      } else {
        status.textContent = (result && result.error && result.error.indexOf("authority-") !== 0)
          ? result.error : "Could not reset your password. Try again.";
      }
    } catch (_) { status.textContent = "Could not reset your password. Try again."; }
    finally { busy = false; get("resetButton").disabled = false; }
  });
})();
