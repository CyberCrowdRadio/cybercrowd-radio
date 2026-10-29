/* cc-signup-overlay.js — The plaque: the door of the station, floating
   over it as glass. The station plays behind it; the plaque keeps the
   visitor from doing anything but listening until the account says
   otherwise. Steps: email (with the human check) → check your email →
   create (when the blue link brings them back with the token) →
   sign in → the plaque lifts. The face only asks; Radio-authority
   judges. The pass has ONE source of truth — the token itself — and
   editing the email resets the widget and the button together, so
   the two can never disagree (the wedge that stranded the old door). */
(function() {
  var turnstileToken = '';
  var els = {};

  function isValidEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  function lockSend() {
    turnstileToken = '';
    if (els.sendBtn) {
      els.sendBtn.disabled = true;
      els.sendBtn.style.opacity = '0.5';
    }
  }

  function resetTurnstile() {
    lockSend();
    if (window.turnstile) { try { window.turnstile.reset(); } catch (_) {} }
  }

  // Turnstile callbacks — defined at once, before the widget can speak.
  window.onOverlayTurnstile = function(token) {
    turnstileToken = token || '';
    if (turnstileToken && els.sendBtn) {
      els.sendBtn.disabled = false;
      els.sendBtn.style.opacity = '1';
    } else if (!turnstileToken) {
      lockSend();
    }
  };
  window.onOverlayTurnstileExpired = function() { resetTurnstile(); };
  window.onOverlayTurnstileError = function() {
    resetTurnstile();
    if (els.statusText) els.statusText.textContent = 'The security check hit a snag and was reset. Complete it again.';
  };

  function hasSession() {
    try { return !!localStorage.getItem('ccr-session'); } catch (_) { return false; }
  }
   // Backing out is leaving the page for good: pagehide, not persisted.
   // Hidden, locked, or in the sign-in flow does not clear anything.
   function clearLocalSignin() {
      try { localStorage.removeItem('ccr-session'); localStorage.removeItem('ccr-handle'); localStorage.removeItem('ccr-email'); localStorage.removeItem('ccr-project'); } catch (_) {}
   }
   window.addEventListener('pagehide', function(e) {
      if (e.persisted) return;
      try { if (sessionStorage.getItem('ccr-verify-token')) return; } catch (_) {}
      clearLocalSignin();
   });
   

  function init() {
    els.overlay = document.getElementById('signupOverlay');
    els.stepEmail = document.getElementById('signupStepEmail');
    els.stepCheck = document.getElementById('signupStepCheck');
    els.stepCreate = document.getElementById('signupStepCreate');
    els.stepSignin = document.getElementById('signupStepSignin');
    els.emailInput = document.getElementById('overlayEmail');
    els.turnstileDiv = document.getElementById('overlayTurnstile');
    els.sendBtn = document.getElementById('overlaySend');
    els.statusText = document.getElementById('overlayStatus');
    els.signinEmail = document.getElementById('plaqueSigninEmail');
    els.signinPassword = document.getElementById('plaqueSigninPassword');
    els.signinBtn = document.getElementById('plaqueSigninBtn');
    els.signinStatus = document.getElementById('plaqueSigninStatus');
    if (!els.overlay || !els.emailInput || !els.sendBtn) return;

    // The widget may have passed before init ran — honor the token.
    if (turnstileToken) {
      els.sendBtn.disabled = false;
      els.sendBtn.style.opacity = '1';
    }

    function showStep(name) {
      els.stepEmail.style.display = name === 'email' ? 'block' : 'none';
      els.stepCheck.style.display = name === 'check' ? 'block' : 'none';
      els.stepCreate.style.display = name === 'create' ? 'block' : 'none';
      if (els.stepSignin) els.stepSignin.style.display = name === 'signin' ? 'block' : 'none';
    }

    function openOverlay(step) {
      showStep(step || 'email');
      els.overlay.style.display = 'block';
    }

    function closeOverlay() {
      els.overlay.style.display = 'none';
    }

    // Email edits and the human check are one machine: any edit after
    // a pass kills the pass AND resets the widget's face to match.
    els.emailInput.addEventListener('input', function() {
      if (turnstileToken) resetTurnstile();
      if (isValidEmail(els.emailInput.value.trim())) {
        els.turnstileDiv.style.display = 'block';
      } else {
        els.turnstileDiv.style.display = 'none';
        lockSend();
        if (window.turnstile) { try { window.turnstile.reset(); } catch (_) {} }
      }
    });

    // Send → ask Radio-authority; "check your email" only on its word.
    els.sendBtn.addEventListener('click', async function() {
      var email = els.emailInput.value.trim();
      if (!isValidEmail(email)) {
        els.statusText.textContent = 'Please enter a valid email.';
        return;
      }
      if (!turnstileToken) {
        els.statusText.textContent = 'Please complete the security check.';
        return;
      }
      els.sendBtn.disabled = true;
      var sendLabel = els.sendBtn.textContent;
      els.sendBtn.textContent = 'Sending...';
      var res = null;
      try {
        res = await window.CCAuthority.ask('/api/signup', {
          email: email,
          turnstileToken: turnstileToken
        });
      } catch (_) {}
      if (!res || !(res.success || res.ok)) {
        var why = (res && res.error) ? String(res.error) : '';
        if (why === 'email failed') {
          // Diagnostic window: show Postmark's own verdict, not a summary.
          els.statusText.textContent = 'Email failed - Postmark code ' +
            ((res && res.pmStatus) || '?') + ': ' + ((res && res.pmDetail) || 'no detail returned');
        } else els.statusText.textContent = (why === 'not human')
          ? 'The security check did not pass. Please complete it and try again.'
          : ((why === 'authority-unreachable' || why === 'authority-bad-answer')
            ? 'The station could not be reached. Please try again.'
            : (why || 'That did not go through. Please try again.'));
        els.sendBtn.textContent = sendLabel;
        resetTurnstile();
        return;
      }
      try { sessionStorage.setItem('cybercrowd_entry_email', email); } catch (_) {}
      resetTurnstile();
      showStep('check');
    });

    // Inside-the-plaque switches between the door's two faces.
    var toSignin = document.getElementById('plaqueToSignin');
    if (toSignin) toSignin.addEventListener('click', function(e) {
      e.preventDefault();
                 var email = els.emailInput.value.trim();
       if (!isValidEmail(email)) {
          els.statusText.textContent = 'Please enter a valid email.';
          return;
       }
       if (!turnstileToken) {
          els.statusText.textContent = 'Please complete the security check.';
          return;
       }
       if (els.signinEmail) els.signinEmail.value = email;
      openOverlay('signin');
    });
    var toSignup = document.getElementById('plaqueToSignup');
    if (toSignup) toSignup.addEventListener('click', function(e) {
      e.preventDefault();
      openOverlay('email');
    });

    // Help toggles
    document.querySelectorAll('.helpBtn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var help = document.getElementById(btn.getAttribute('data-help'));
        if (help) help.style.display = help.style.display === 'none' ? 'block' : 'none';
      });
    });

    // Password match — blue glow
    var pwInput = document.getElementById('overlayPassword');
    var confirmInput = document.getElementById('overlayConfirm');
    function checkMatch() {
      var pw = pwInput.value, cpw = confirmInput.value;
      if (!cpw) {
        confirmInput.style.borderColor = '';
        confirmInput.style.boxShadow = '';
        return;
      }
      if (pw === cpw && pw.length >= 8) {
        confirmInput.style.borderColor = '#2196F3';
        confirmInput.style.boxShadow = '0 0 15px #2196F3';
      } else {
        confirmInput.style.borderColor = '';
        confirmInput.style.boxShadow = '';
      }
    }
    if (pwInput && confirmInput) {
      pwInput.addEventListener('input', checkMatch);
      confirmInput.addEventListener('input', checkMatch);
    }

    // Create account — the authority builds it; this face only asks.
    var createBtn = document.getElementById('overlayCreate');
    if (createBtn) createBtn.addEventListener('click', async function() {
      var handle = document.getElementById('overlayHandle').value.trim();
      var project = document.getElementById('overlayProject').value.trim();
      var zipEl = document.getElementById('overlayZip');
      var zip = zipEl ? zipEl.value.trim() : '';
      var pw = pwInput.value;
      var cpw = confirmInput.value;
      var email = document.getElementById('overlayEmailDisplay').textContent;
      if (!handle || !pw) { alert('Fill in handle and password.'); return; }
      if (pw.length < 8 || pw.length > 29) { alert('Password must be 8 to 29 characters.'); return; }
      if (pw !== cpw) { alert('Passwords do not match.'); return; }
      if (!zip) { alert('Fill in your zip code.'); return; }
      var token = '';
      try { token = sessionStorage.getItem('ccr-verify-token') || ''; } catch (_) {}
      if (!token) { alert('Verify your email first — tap the link in the email we sent you.'); return; }
      var res = null;
      try {
        res = await window.CCAuthority.ask('/api/create-account', {
          token: token,
          stageName: handle,
          projectName: project,
          password: pw,
          zip: zip
        });
      } catch (_) {}
      if (!res || !res.success) {
        var why = (res && res.error) ? String(res.error) : '';
        alert((why === 'authority-unreachable' || why === 'authority-bad-answer')
          ? 'The station could not be reached. Please try again.'
          : (why || 'That did not go through. Please try again.'));
        return;
      }
      // Created. The plaque's other face takes it from here.
      if (els.signinEmail) els.signinEmail.value = email;
      if (els.signinStatus) {
        els.signinStatus.style.color = '#8bc34a';
        els.signinStatus.textContent = 'Your account is created. Sign in to enter.';
      }
      showStep('signin');
    });

    // Sign in — the authority judges the password and hands back the
    // session; only then does the plaque lift.
    async function doSignin() {
      var email = (els.signinEmail.value || '').trim();
      var pw = els.signinPassword.value || '';
      els.signinStatus.style.color = '#f44336';
      if (!isValidEmail(email)) { els.signinStatus.textContent = 'Please enter a valid email.'; return; }
      if (!pw) { els.signinStatus.textContent = 'Please enter your password.'; return; }
      els.signinBtn.disabled = true;
      var label = els.signinBtn.textContent;
      els.signinBtn.textContent = 'Signing in...';
      var res = null;
      try {
        res = await window.CCAuthority.ask('/api/sign-in', { email: email, password: pw });
      } catch (_) {}
      els.signinBtn.disabled = false;
      els.signinBtn.textContent = label;
      if (!res || !res.success) {
        var why = (res && res.error) ? String(res.error) : '';
        els.signinStatus.textContent = (why === 'no account for that email')
          ? 'No account for that email. Sign up first.'
          : ((why === 'wrong password')
            ? 'Wrong password.'
            : ((why === 'authority-unreachable' || why === 'authority-bad-answer')
              ? 'The station could not be reached. Please try again.'
              : (why || 'That did not go through. Please try again.')));
        return;
      }
      try {
        localStorage.setItem('ccr-session', res.session || '');
        localStorage.setItem('ccr-handle', res.stageName || '');
        localStorage.setItem('ccr-email', email);
        if (res.projectName) localStorage.setItem('ccr-project', res.projectName);
      } catch (_) {}
      closeOverlay();
      if (window.updateHandlePill) window.updateHandlePill();
    }
    if (els.signinBtn) els.signinBtn.addEventListener('click', doSignin);
    if (els.signinPassword) els.signinPassword.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); doSignin(); }
    });

    // The × is a courtesy for members, not a door for the unsigned:
    // without a session the plaque stands.
    var closeBtn = document.getElementById('closeSignup');
    if (closeBtn) closeBtn.addEventListener('click', function() {
      if (hasSession()) { closeOverlay(); return; }
      if (els.stepSignin && els.stepSignin.style.display === 'block') {
        els.signinStatus.style.color = '#f44336';
        els.signinStatus.textContent = 'Sign in to enter — the station keeps playing.';
      } else {
        els.statusText.textContent = 'Sign up or sign in to enter — the station keeps playing.';
      }
    });

    // Music: ENTER's tap set the autostart flag. If the browser still
    // held the sound, the visitor's first touch on the plaque is the
    // gesture that starts it — once, and only if the player shows
    // its play face (never a toggle-off).
    els.overlay.addEventListener('pointerdown', function() {
      var armed = false;
      try { armed = sessionStorage.getItem('ccr-autostart') === '1'; } catch (_) {}
      if (!armed) return;
      try { sessionStorage.removeItem('ccr-autostart'); } catch (_) {}
      var iconPlay = document.getElementById('iconPlay');
      var playBtn = document.getElementById('playBtn');
      if (iconPlay && playBtn && window.getComputedStyle(iconPlay).display !== 'none') {
        playBtn.click();
      }
    }, { once: true });

    // Public API
    window.CCSignup = {
      open: openOverlay,
      close: closeOverlay
    };

    // Arrival: the blue link (?token=), the old road (?verified=1),
    // ENTER's flag (?signup=1) — or no session at all, which raises
    // the plaque over the playing station on its own.
    (async function() {
      var params = null;
      try { params = new URLSearchParams(window.location.search); } catch (_) {}
       var entered = false;
       try { entered = sessionStorage.getItem('ccr-autostart') === '1'; } catch (_) {}
      var cleanUrl = function() {
        if (window.history && window.history.replaceState) {
          try { window.history.replaceState({}, '', window.location.pathname); } catch (_) {}
        }
      };
      if (params && params.get('token')) {
        var token = params.get('token');
        cleanUrl();
        var res = null;
        try { res = await window.CCAuthority.ask('/api/verify-email', { token: token }); } catch (_) {}
        if (res && res.success && res.email) {
          try { sessionStorage.setItem('ccr-verify-token', token); } catch (_) {}
          document.getElementById('overlayEmailDisplay').textContent = res.email;
          openOverlay('create');
        } else {
          openOverlay('email');
          els.statusText.textContent = 'That verify link did not check out — it may have expired. Send a fresh one.';
        }
        return;
      }
      if (params && params.get('verified') === '1') {
        var vemail = params.get('email') || '';
        try { vemail = vemail || sessionStorage.getItem('cybercrowd_entry_email') || ''; } catch (_) {}
        document.getElementById('overlayEmailDisplay').textContent = vemail;
        cleanUrl();
        openOverlay('create');
        return;
      }
      if (params && params.get('signup') === '1' && entered) {
        cleanUrl();
        openOverlay('email');
        return;
      }
      if (!hasSession() && entered) openOverlay('email');
    })();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
