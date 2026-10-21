/* cc-signup-overlay.js — Signup as overlay on station.html (audio keeps playing) */
(function() {
  var overlay = document.getElementById('signupOverlay');
  var stepEmail = document.getElementById('signupStepEmail');
  var stepCheck = document.getElementById('signupStepCheck');
  var stepCreate = document.getElementById('signupStepCreate');
  var emailInput = document.getElementById('overlayEmail');
  var turnstileDiv = document.getElementById('overlayTurnstile');
  var sendBtn = document.getElementById('overlaySend');
  var statusText = document.getElementById('overlayStatus');
  var turnstilePassed = false;

  function isValidEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  // Turnstile callback (human must touch it)
  var turnstileToken = '';

  window.onOverlayTurnstile = function(token) {
    turnstileToken = token || '';
    turnstilePassed = !!turnstileToken;
    sendBtn.disabled = false;
    sendBtn.style.opacity = '1';
  };

  // Show Turnstile when valid email typed
  emailInput.addEventListener('input', function() {
    if (isValidEmail(emailInput.value.trim())) {
      turnstileDiv.style.display = 'block';
    } else {
      turnstileDiv.style.display = 'none';
      turnstilePassed = false;
      turnstileToken = '';
      sendBtn.disabled = true;
      sendBtn.style.opacity = '0.5';
    }
  });

  // Send → show "check your email"
  sendBtn.addEventListener('click', async function() {
    var email = emailInput.value.trim();
    if (!isValidEmail(email)) {
      statusText.textContent = 'Please enter a valid email.';
      return;
    }
    if (!turnstilePassed) {
      statusText.textContent = 'Please complete the security check.';
      return;
    }
    sendBtn.disabled = true;
    var sendLabel = sendBtn.textContent;
    sendBtn.textContent = 'Sending...';

    var res = null;
    try {
      var resp = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, turnstileToken: turnstileToken })
      });
      res = await resp.json().catch(function() { return null; });
    } catch (_) {}

    if (!res || !(res.success || res.ok)) {
      var why = (res && res.error) ? String(res.error) : '';
      statusText.textContent = (why === 'not human')
        ? 'The security check did not pass. Please complete it and try again.'
        : (why || 'That did not go through. Please try again.');
      sendBtn.disabled = false;
      sendBtn.textContent = sendLabel;
      if (window.turnstile) { try { window.turnstile.reset(); } catch (_) {} }
      turnstilePassed = false;
      turnstileToken = '';
      return;
    }

    try { sessionStorage.setItem('cybercrowd_entry_email', email); } catch (_) {}

    stepEmail.style.display = 'none';
    stepCheck.style.display = 'block';
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
  pwInput.addEventListener('input', checkMatch);
  confirmInput.addEventListener('input', checkMatch);

  // Create account
  document.getElementById('overlayCreate').addEventListener('click', function() {
    var handle = document.getElementById('overlayHandle').value.trim();
    var project = document.getElementById('overlayProject').value.trim();
    var pw = pwInput.value;
    var cpw = confirmInput.value;
    var email = document.getElementById('overlayEmailDisplay').textContent;
    if (!handle || !pw) { alert('Fill in handle and password.'); return; }
    if (pw.length < 8 || pw.length > 29) { alert('Password must be 8 to 29 characters.'); return; }
    if (pw !== cpw) { alert('Passwords do not match.'); return; }
    if (handle.toLowerCase().includes('cybercrowd')) { alert('That handle is reserved.'); return; }
    try {
      localStorage.setItem('ccr-handle', handle);
      localStorage.setItem('ccr-email', email);
      if (project) localStorage.setItem('ccr-project', project);
    } catch (_) {}
    closeOverlay();
    // Refresh handle pill if present
    if (window.updateHandlePill) window.updateHandlePill();
  });

  // Close button
  document.getElementById('closeSignup').addEventListener('click', closeOverlay);

  function closeOverlay() {
    overlay.style.display = 'none';
  }

  function openOverlay(step) {
    stepEmail.style.display = 'none';
    stepCheck.style.display = 'none';
    stepCreate.style.display = 'none';
    if (step === 'create') {
      stepCreate.style.display = 'block';
    } else if (step === 'check') {
      stepCheck.style.display = 'block';
    } else {
      stepEmail.style.display = 'block';
    }
    overlay.style.display = 'block';
  }

  // Public API
  window.CCSignup = {
    open: openOverlay,
    close: closeOverlay
  };

  // Auto-open: ?signup=1 (from ENTER) or ?verified=1 (from verify.html)
  (function() {
    try {
      var params = new URLSearchParams(window.location.search);
      if (params.get('verified') === '1') {
        var email = params.get('email') || sessionStorage.getItem('cybercrowd_entry_email') || '';
        document.getElementById('overlayEmailDisplay').textContent = email;
        openOverlay('create');
        // Clean URL
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, '', window.location.pathname);
        }
      } else if (params.get('signup') === '1') {
        openOverlay('email');
        // Clean URL
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, '', window.location.pathname);
        }
      }
    } catch (_) {}
  })();
})();
