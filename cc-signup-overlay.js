/* cc-signup-overlay.js — Listener signup sequence.
   Email → confirm email → finish account → automatic sign-in.
   The translucent blocker stays up until the authority confirms sign-in.
   Numbered steps resume after refresh. Validation stays
   beside the form. Radio-authority verifies and creates accounts.
   This face never pauses audio or creates an account locally. */
(function() {
  var turnstileToken = '';
  var els = {};
  var currentStep = 'email';
  var sending = false;
  var creating = false;
  var sessionVerified = false;

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
    return sessionVerified;
  }

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

    var background = [];
    var previousOverflow = document.body.style.overflow;
    Array.prototype.forEach.call(document.body.children, function(el) {
      if (el !== els.overlay && el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE') {
        background.push({ element: el, inert: el.inert });
      }
    });
    function lockPage() {
      background.forEach(function(item) { item.element.inert = true; });
      document.body.style.overflow = 'hidden';
    }
    function unlockPage() {
      background.forEach(function(item) { item.element.inert = item.inert; });
      document.body.style.overflow = previousOverflow;
    }
    lockPage();
    els.overlay.style.display = 'grid';
    document.addEventListener('keydown', function(e) {
      if (els.overlay.style.display === 'none') return;
      if (e.key === 'Escape') { e.preventDefault(); return; }
      if (e.key !== 'Tab') return;
      var controls = Array.prototype.filter.call(
        els.overlay.querySelectorAll('button, input, a[href], [tabindex="0"]'),
        function(el) { return !el.disabled && el.getClientRects().length > 0; }
      );
      if (!controls.length) { e.preventDefault(); return; }
      var first = controls[0], last = controls[controls.length - 1];
      if (e.shiftKey && (document.activeElement === first || !els.overlay.contains(document.activeElement))) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !els.overlay.contains(document.activeElement))) {
        e.preventDefault(); first.focus();
      }
    });

    // The widget may have passed before init ran — honor the token.
    if (turnstileToken) {
      els.sendBtn.disabled = false;
      els.sendBtn.style.opacity = '1';
    }

    function showStep(name) {
      currentStep = name;
      try { sessionStorage.setItem('ccr-signup-step', name); } catch (_) {}
      var progress = document.getElementById('signupProgress');
      if (progress) progress.textContent = name === 'signin' ? 'Welcome back'
        : (name === 'email' ? 'Step 1 of 3 — Your email'
          : (name === 'check' ? 'Step 2 of 3 — Tap the link in your email'
            : 'Step 3 of 3 — Finish your account'));
      els.stepEmail.style.display = name === 'email' ? 'block' : 'none';
      els.stepCheck.style.display = name === 'check' ? 'block' : 'none';
      els.stepCreate.style.display = name === 'create' ? 'block' : 'none';
      if (els.stepSignin) els.stepSignin.style.display = name === 'signin' ? 'block' : 'none';
    }

    function openOverlay(step) {
      showStep(step === 'signin' ? 'signin' : (currentStep === 'signin' ? 'email' : currentStep));
      lockPage();
      els.overlay.style.display = 'grid';
      els.overlay.scrollTop = 0;

    }

    function closeOverlay() {
      if (!hasSession()) return false;
      els.overlay.style.display = 'none';
      unlockPage();
      return true;
    }

    async function verifyStoredSession() {
      var stored = '';
      try { stored = localStorage.getItem('ccr-session') || ''; } catch (_) {}
      sessionVerified = false;
      if (!stored) return false;
      var result = null;
      try { result = await window.CCAuthority.ask('/api/session', { session: stored }); } catch (_) {}
      var latest = '';
      try { latest = localStorage.getItem('ccr-session') || ''; } catch (_) {}
      if (stored !== latest) return false;
      if (!result || result.success !== true || !result.stageName) return false;
      sessionVerified = true;
      try { localStorage.setItem('ccr-handle', result.stageName); } catch (_) {}
      closeOverlay();
      publishAccount();
      return true;
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
      if (sending) return;
      var email = els.emailInput.value.trim();
      if (!isValidEmail(email)) {
        els.statusText.textContent = 'Please enter a valid email.';
        return;
      }
      if (!turnstileToken) {
        els.statusText.textContent = 'Please complete the security check.';
        return;
      }
      sending = true;
      els.emailInput.disabled = true;
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
      sending = false;
      els.emailInput.disabled = false;
      if (!res || res.success !== true) {
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
      els.sendBtn.textContent = sendLabel;
      showStep('check');
    });

    var changeEmail = document.getElementById('signupChangeEmail');
    if (changeEmail) changeEmail.addEventListener('click', function() {
      resetTurnstile();
      showStep('email');
      els.statusText.textContent = 'Check your address, complete the security check, then send a new link.';
      els.emailInput.focus();
    });

    // Inside-the-plaque switches between the door's two faces.
    var toSignin = document.getElementById('plaqueToSignin');
    if (toSignin) toSignin.addEventListener('click', function(e) {
      e.preventDefault();
      if (els.signinEmail) els.signinEmail.value = els.emailInput.value.trim();
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
      if (creating) return;
      var createStatus = document.getElementById('signupCreateStatus');
      function problem(message, field) {
        if (createStatus) createStatus.textContent = message;
        var input = field && document.getElementById(field);
        if (input) input.focus();
      }
      if (createStatus) createStatus.textContent = '';
      var handle = document.getElementById('overlayHandle').value.trim();
      var project = document.getElementById('overlayProject').value.trim();
      var zipEl = document.getElementById('overlayZip');
      var zip = zipEl ? zipEl.value.trim() : '';
      var pw = pwInput.value;
      var cpw = confirmInput.value;
      var email = document.getElementById('overlayEmailDisplay').textContent;
      if (!handle || !pw) { problem('Enter your stage name and password.', !handle ? 'overlayHandle' : 'overlayPassword'); return; }
      if (pw.length < 8 || pw.length > 29) { problem('Password must be 8 to 29 characters.', 'overlayPassword'); return; }
      if (pw !== cpw) { problem('Your passwords do not match.', 'overlayConfirm'); return; }
      if (!zip) { problem('Enter your ZIP code. It stays private.', 'overlayZip'); return; }
      var token = '';
      try { token = sessionStorage.getItem('ccr-verify-token') || ''; } catch (_) {}
      if (!token) { problem('Open the link in your verification email to continue.'); return; }
      creating = true;
      createBtn.disabled = true;
      createBtn.textContent = 'Finishing…';
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
      creating = false;
      createBtn.disabled = false;
      createBtn.textContent = 'Finish & listen';
      if (!res || !res.success) {
        var why = (res && res.error) ? String(res.error) : '';
        problem((why === 'authority-unreachable' || why === 'authority-bad-answer')
          ? 'The station could not be reached. Please try again.'
          : (why || 'That did not go through. Please try again.'));
        return;
      }
      // The account exists; sign in using the password just submitted.
      if (els.signinEmail) els.signinEmail.value = email;
      if (els.signinStatus) {
        els.signinStatus.style.color = '#8bc34a';
        els.signinStatus.textContent = 'Your account is created. Sign in to enter.';
      }
      els.signinPassword.value = pw;
      await doSignin();
      if (!hasSession()) showStep('signin');
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
      if (!res || !res.success || !res.session || !res.stageName) {
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
      sessionVerified = true;
      closeOverlay();
      publishAccount();
      try { sessionStorage.removeItem('ccr-signup-step'); } catch (_) {}
      currentStep = 'email';
      try { sessionStorage.removeItem('ccr-verify-token'); } catch (_) {}
      pwInput.value = '';
      confirmInput.value = '';
      els.signinPassword.value = '';
    }
    if (els.signinBtn) els.signinBtn.addEventListener('click', doSignin);
    if (els.signinPassword) els.signinPassword.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); doSignin(); }
    });

    // No dismissal: only a verified sign-in releases the blocker.

    // Music: ENTER's tap set the autostart flag. If the browser still
    // held the sound, the visitor's first touch anywhere is the
    // gesture that starts it — once, and only if the player shows
    // its play face (never a toggle-off).
    document.addEventListener('pointerdown', function() {
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

    function publishAccount() {
      var name = '';
      try { name = localStorage.getItem('ccr-handle') || ''; } catch (_) {}
      window.CCAccount = window.CCAccount || {};
      window.CCAccount.stageName = name;
      var label = document.getElementById('handleText');
      if (label) label.textContent = name || 'guest';
      if (window.CCPresence) window.CCPresence.init();
      if (window.CCWelcomeWindow) window.CCWelcomeWindow.refresh();
    }
    window.addEventListener('storage', async function(e) {
      if (e.key !== 'ccr-session' && e.key !== 'ccr-email') return;
      sessionVerified = false;
      openOverlay('signin');
      await verifyStoredSession();
    });

    // Fifteen minutes to settle in. Expiry is a reminder, never an audio stop.
    var started = Date.now();
    try {
      started = Number(sessionStorage.getItem('ccr-entry-start')) || started;
      sessionStorage.setItem('ccr-entry-start', String(started));
    } catch (_) {}
    var reminder = document.getElementById('signupTimeNote');
    function updateTimeNote() {
      if (!reminder) return;
      var remaining = Math.max(0, Math.ceil((started + 15 * 60000 - Date.now()) / 60000));
      reminder.textContent = hasSession() ? 'Welcome. Enjoy the radio.'
        : (remaining ? 'The radio keeps playing. You have ' + remaining + ' minutes to finish signup.'
          : 'Finish signing up to enter the room. The radio keeps playing.');
    }
    updateTimeNote();
    setInterval(updateTimeNote, 30000);

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
      if (entered) {
        var play = document.getElementById('playBtn');
        var icon = document.getElementById('iconPlay');
        if (play && icon && window.getComputedStyle(icon).display !== 'none') play.click();
      }
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
          showStep('create');
          openOverlay('create');
        } else {
          showStep('email');
          openOverlay('email');
          els.statusText.textContent = 'That verify link did not check out — it may have expired. Send a fresh one.';
        }
        return;
      }
      if (await verifyStoredSession()) return;
      var savedStep = '';
      var savedToken = '';
      try {
        savedStep = sessionStorage.getItem('ccr-signup-step') || '';
        savedToken = sessionStorage.getItem('ccr-verify-token') || '';
        els.emailInput.value = sessionStorage.getItem('cybercrowd_entry_email') || '';
      } catch (_) {}
      if (!hasSession() && savedToken) {
        var checked = await window.CCAuthority.ask('/api/verify-email', { token: savedToken });
        if (checked && checked.success && checked.email) {
          document.getElementById('overlayEmailDisplay').textContent = checked.email;
          showStep('create');
          openOverlay('create');
          return;
        }
      }
      if (!hasSession() && savedStep === 'check') {
        showStep('check');
        openOverlay('check');
        return;
      }
      if (params && params.get('signup') === '1' && entered) {
        cleanUrl();
      
        openOverlay('email');

        return;
      }
      if (!hasSession()) openOverlay('email');
    })();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
