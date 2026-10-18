/* CC Membership — $3.99/mo, 7-day free trial. 2026-10-17.
 * James: "62 songs for 3.99 a month is cheap. 8 songs in the old days 24.50."
 *
 * TIERS:
 * - FREE: signup, but audio has interruptions (the public pool)
 * - MEMBER ($3.99/mo, 7-day free trial, card upfront): clean audio, no interruptions
 *
 * STRIPE: Uses Stripe Checkout. Product IDs are set in config.js.
 * James creates the LIVE products in his Stripe dashboard and drops
 * the price IDs into config.js. This code handles the rest.
 *
 * GATING: free listeners get periodic audio interruptions.
 * Members get clean audio. adWorm stays on for everyone.
 *
 * DOES: membership signup, trial, gating, cancel.
 * DOES NOT: create Stripe products (James's dashboard). DOES NOT: store cards.
 */

(function () {
  "use strict";

  var MEMBER_KEY = 'cc-member';
  var TRIAL_KEY = 'cc-trial-start';

  function isMember() {
    try {
      return localStorage.getItem(MEMBER_KEY) === 'true';
    } catch (_) { return false; }
  }

  function setMember(v) {
    try { localStorage.setItem(MEMBER_KEY, v ? 'true' : 'false'); } catch (_) {}
  }

  function trialDaysLeft() {
    try {
      var start = parseInt(localStorage.getItem(TRIAL_KEY) || '0', 10);
      if (!start) return 0;
      var elapsed = (Date.now() - start) / (1000 * 60 * 60 * 24);
      return Math.max(0, Math.ceil(7 - elapsed));
    } catch (_) { return 0; }
  }

  function inTrial() {
    return trialDaysLeft() > 0;
  }

  function hasCleanAudio() {
    return isMember() || inTrial();
  }

  // ---- Stripe Checkout ----
  function startCheckout() {
    var priceId = (window.CCConfig && window.CCConfig.stripeMemberPriceId) || '';
    if (!priceId) {
      setStatus('Membership checkout is not connected yet.');
      return;
    }
    // Stripe.js must be loaded on the page
    if (!window.Stripe) {
      setStatus('Payment system loading — try again in a moment.');
      return;
    }
    var stripe = window.Stripe(window.CCConfig.stripePublishableKey || '');
    // Record trial start when they begin checkout
    try {
      if (!localStorage.getItem(TRIAL_KEY)) {
        localStorage.setItem(TRIAL_KEY, String(Date.now()));
      }
    } catch (_) {}
    stripe.redirectToCheckout({
      lineItems: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      successUrl: window.location.origin + window.location.pathname + '?member=1',
      cancelUrl: window.location.origin + window.location.pathname + '?member=0'
    }).then(function (result) {
      if (result.error) setStatus(result.error.message);
    });
  }

  function handleReturn() {
    try {
      var params = new URLSearchParams(window.location.search);
      if (params.get('member') === '1') {
        setMember(true);
        setStatus('Welcome! Your 7-day free trial is on. Clean audio, no interruptions.');
      } else if (params.get('member') === '0') {
        setStatus('No charge made. You can start your trial anytime.');
      }
    } catch (_) {}
  }

  function cancelMembership() {
    // Cancelling severs third-party links; access continues to end of billing period.
    // The actual Stripe cancellation happens via the customer portal.
    var portalUrl = (window.CCConfig && window.CCConfig.stripePortalUrl) || '';
    if (portalUrl) {
      window.location.href = portalUrl;
    } else {
      setStatus('To cancel, contact support. Access continues to end of your billing period.');
    }
  }

  // ---- Audio interruptions for free tier ----
  var interruptTimer = null;

  function startInterruptions() {
    if (hasCleanAudio()) return; // members and trial users get clean audio
    stopInterruptions();
    // Every ~3 songs (roughly 10 min), play a short membership message
    interruptTimer = setInterval(function () {
      if (hasCleanAudio() || !window.CCStationAI) return;
      playInterruption();
    }, 10 * 60 * 1000);
  }

  function stopInterruptions() {
    if (interruptTimer) { clearInterval(interruptTimer); interruptTimer = null; }
  }

  function playInterruption() {
    var msg = "You're listening to Cybercrowd Radio free. " +
      "Members get clean audio with no interruptions. " +
      "62 songs for $3.99 a month — start your 7-day free trial today.";
    try {
      if (!('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(msg);
      u.rate = 1.0;
      u.pitch = 1.0;
      window.speechSynthesis.speak(u);
    } catch (_) {}
  }

  // ---- UI ----
  function setStatus(t) {
    var el = document.getElementById('memberStatus');
    if (el) el.textContent = t;
  }

  function buildUI() {
    var section = document.getElementById('membership');
    if (!section) return;

    var head = section.querySelector('.section-head');
    if (head) {
      head.innerHTML =
        '<p class="eyebrow">Join the crowd</p>' +
        '<h2>$3.99 a month</h2>' +
        '<p class="section-sub">62 songs. 7-day free trial. In the old days 8 songs cost $24.50.</p>';
    }

    var body = section.querySelector('.section-body') || section;
    var existing = document.getElementById('memberUI');
    if (existing) existing.remove();

    var div = document.createElement('div');
    div.id = 'memberUI';
    div.style.cssText = 'text-align:center;padding:20px;';

    if (hasCleanAudio()) {
      var label = isMember() ? 'Member' : 'Free trial — ' + trialDaysLeft() + ' days left';
      div.innerHTML =
        '<p style="font-size:20px;">' + label + '</p>' +
        '<p>Clean audio. No interruptions.</p>' +
        '<p><button id="memberCancel" class="btn btn-secondary">Cancel membership</button></p>' +
        '<div id="memberStatus" style="margin-top:8px;font-size:14px;opacity:0.7;"></div>';
    } else {
      div.innerHTML =
        '<p style="font-size:18px;">Free listeners hear interruptions.</p>' +
        '<p>Members get clean audio. $3.99/mo after 7-day free trial.</p>' +
        '<p><button id="memberJoin" class="btn btn-primary btn-lg">START FREE TRIAL</button></p>' +
        '<div id="memberStatus" style="margin-top:8px;font-size:14px;opacity:0.7;"></div>';
    }

    body.appendChild(div);

    var joinBtn = document.getElementById('memberJoin');
    if (joinBtn) joinBtn.addEventListener('click', startCheckout);
    var cancelBtn = document.getElementById('memberCancel');
    if (cancelBtn) cancelBtn.addEventListener('click', cancelMembership);

    // Start or stop interruptions based on status
    if (hasCleanAudio()) {
      stopInterruptions();
    } else {
      startInterruptions();
    }
  }

  function refresh() {
    buildUI();
  }

  window.CCMembership = {
    isMember: isMember,
    inTrial: inTrial,
    hasCleanAudio: hasCleanAudio,
    startCheckout: startCheckout,
    cancelMembership: cancelMembership,
    refresh: refresh
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      handleReturn();
      buildUI();
    });
  } else {
    handleReturn();
    buildUI();
  }
})();
