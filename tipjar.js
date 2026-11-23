/*
File repo: CyberCrowdRadio/cybercrowd-radio
File name: tipjar.js
Movements: Validate Moonshot tip amounts in USD with a $0.40 minimum.
Purpose: Present dollar-denominated CRWD tips for manual approval in Moonshot and process Stripe checkout.
Does NOT: Hold private keys, sign token transfers, guarantee Moonshot supports Solana Pay, assert payment completion, or modify station playback.
*/
/* tipjar.js — Cybercrowd Radio tip jar
 * ONE JOB: one-tap tipping with CRWD. No wallets, no popups, no seed phrases.
 *
 * FLOW (set 2026-10-15, James's design):
 * - First tap: "Add coins to your tip jar?" → buy CRWD once
 * - Every tip after: one tap, deducts from jar, no questions
 * - Jar empty: "Refill your tip jar?" → buy more
 * - Money: card → CRWD in jar → creator on tip
 *
 * BACKEND: calls /api/tipjar/* on the Cloudflare Worker.
 * Balances live in D1, NOT in the browser.
 * Does not: touch the playlist, the DJ, or the stream.
 */
(function () {
  'use strict';

  var API = ''; // Set to Worker URL, e.g. 'https://api.cybercrowdradio.com'
  var balance = 0;
  var jarEl, balEl, tipBtn;

  function api(path, method, body) {
    return fetch(API + path, {
      method: method || 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) { return r.json(); });
  }

  function refreshBalance() {
    api('/api/tipjar/balance').then(function (d) {
      balance = d.balance || 0;
      updateUI();
    }).catch(function () {
      setStatus('Tip jar offline — check connection.');
    });
  }

  function updateUI() {
    if (balEl) balEl.textContent = balance.toFixed(2) + ' CRWD';
    if (tipBtn) tipBtn.disabled = false;
  }

  function setStatus(t) {
    var s = document.getElementById('tipjarStatus');
    if (s) s.textContent = t;
  }

  // One-tap tip. If jar is empty, ask to refill first.
  function tip(amount, toCreator) {
    amount = amount || 1;
    if (balance < amount) {
      askRefill();
      return;
    }
    api('/api/tipjar/tip', 'POST', { amount: amount, to: toCreator })
      .then(function (d) {
        if (d.ok) {
          balance = d.newBalance;
          updateUI();
          setStatus('Tipped ' + amount + ' CRWD. Thank you.');
          // DJ shout-out hook
          if (window.CCRadioAnnouncer && window.CCRadioAnnouncer.tipThanks) {
            try { window.CCRadioAnnouncer.tipThanks('a listener'); } catch (e) {}
          }
        } else {
          setStatus(d.error || 'Tip failed.');
        }
      })
      .catch(function () { setStatus('Tip failed — try again.'); });
  }

  // First-time or empty jar: prompt to add coins
  function askRefill() {
    var msg = balance <= 0
      ? 'Your tip jar is empty. Add coins to start tipping?'
      : 'Add more coins to your tip jar?';
    if (!confirm(msg)) return;
    buyCoins();
  }

  // Buy CRWD to fill the jar — opens Moonshot (James: "it needs to allow you open a Moonshot")
  // Deep link to Moonshot app, fallback to web. No fake backend.
  function buyCoins() {
    var amount = prompt('How much CRWD to add? (e.g. 10)', '10');
    if (!amount || isNaN(parseFloat(amount))) return;
    openMoonshot();
  }

  function openMoonshot() {
    // External browsing is not a payment receipt or an account-balance change.
    setStatus('Moonshot opens separately. Buying there does not refill this jar. Return to this tab when finished.');
    window.open('https://moonshot.money/', '_blank', 'noopener,noreferrer');
  }

  function build() {
    jarEl = document.getElementById('tipjar');
    if (!jarEl) return;
    balEl = document.getElementById('tipjarBalance');
    tipBtn = document.getElementById('tipjarBtn');

    if (tipBtn) {
      tipBtn.disabled = false;
      tipBtn.removeAttribute('aria-disabled');
      tipBtn.addEventListener('click', async function () {
        var custom = document.getElementById('tipCustomUsd');
        var checked = document.querySelector('input[name="tipAmount"]:checked');
        var isCrwd = checked && checked.dataset.currency === 'crwd';
        if (isCrwd) return;
        var amount = custom && custom.value.trim()
          ? Math.round(Number(custom.value) * 100)
          : checked ? Number(checked.value) : 0;
        if (!Number.isSafeInteger(amount) || amount < 100 || amount > 100000) {
          setStatus('Choose a dollar tip between $1 and $1,000.'); return;
        }
        tipBtn.disabled = true;
        setStatus('Connecting to secure Stripe Checkout...');
        try {
          var response = await fetch('https://radio-authority.cybercrowdradio.workers.dev/api/tipjar/checkout', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({kind:'radio',amountCents:amount})
          });
          var result = await response.json();
          if (!response.ok || !result.url || !result.url.startsWith('https://checkout.stripe.com/'))
            throw new Error(result.error || 'Checkout unavailable.');
          window.location.assign(result.url);
        } catch (error) {
          setStatus((error && error.message) || 'Checkout unavailable. No tip was recorded.');
          tipBtn.disabled = false;
        }
      });
    }
    // CRWD completes inside this same card; dollar checkout remains untouched.
    var crwdInline = document.getElementById('crwdInline');
    var crwdAddress = document.getElementById('crwdReceiveAddress');
    var crwdAmount = document.getElementById('crwdSelectedAmount');
    var copyAddress = document.getElementById('crwdCopyAddress');
    var cfg = window.STATION_CONFIG || {};
    var destination = String(cfg.crwdTipAddress || '').trim();
    if (crwdAddress) crwdAddress.value = destination;
    if (copyAddress) copyAddress.addEventListener('click', async function () {
      var status = document.getElementById('crwdManualStatus');
      if (!destination) {
        if (status) status.textContent = 'Receiving address unavailable. Do not send a transfer.';
        return;
      }
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(destination);
        } else {
          crwdAddress.focus();
          crwdAddress.select();
          if (!document.execCommand('copy')) throw new Error('Copy unavailable');
        }
        if (status) status.textContent = 'Receiving address copied. Open Moonshot, select CRWD and Send. Verify the address and amount before approving.';
      } catch (_) {
        crwdAddress.focus();
        crwdAddress.select();
        if (status) status.textContent = 'Select and copy the highlighted receiving address before opening Moonshot.';
      }
    });
    var usd = document.getElementById('moonshotUsd');
    var openLink = document.getElementById('crwdOpenMoonshot');
    function validMoonshotAmount() {
      return usd && usd.validity.valid && /^(?:\d+|\d*\.\d{1,2})$/.test(usd.value) && usd.valueAsNumber >= 0.40;
    }
    if (usd) usd.addEventListener('input', function () {
      document.querySelector('input[data-currency="crwd"]').checked = true;
      setStatus('Review your dollar tip in Moonshot.');
      displaySelectedCurrency();
    });
    function displaySelectedCurrency() {
      var selected = document.querySelector('input[name="tipAmount"]:checked');
      var crwd = selected && selected.dataset.currency === 'crwd';
      if (crwdInline) crwdInline.hidden = !crwd;
      if (tipBtn) tipBtn.hidden = !!crwd;
      if (crwd) {
        var valid = validMoonshotAmount();
        crwdAmount.textContent = valid ? '$' + usd.valueAsNumber.toFixed(2) + ' USD' : '($0.40 minimum, in whole cents)';
        openLink.hidden = !valid || !destination;
      }
      if (crwd && !destination) {
        var status = document.getElementById('crwdManualStatus');
        if (status) status.textContent = 'Receiving address unavailable. Do not send a transfer.';
        var open = document.getElementById('crwdOpenMoonshot');
        if (open) open.hidden = true;
      }
    }
    displaySelectedCurrency();
    // Keep the two currencies independent: a previous Stripe status must not
    // remain visible when the listener switches to a CRWD transfer.
    var choices = document.getElementById('tipChoices');
    if (choices) choices.addEventListener('change', function (event) {
      if (!event.target || event.target.name !== 'tipAmount') return;
      displaySelectedCurrency();
      if (event.target.dataset.currency === 'crwd') {
        var custom = document.getElementById('tipCustomUsd');
        if (custom) custom.value = '';
        setStatus('CRWD: copy the address, then open Moonshot and use Send. No transfer is automatic.');
      } else {
        setStatus('Dollar tip selected. ADD A TIP opens Stripe Checkout.');
      }
    });
    var query = new URLSearchParams(window.location.search);
    if (query.get('checkout') === 'return')
      setStatus('Returned from Stripe. Payment confirmation is verified separately; this page does not claim a completed tip.');
    else if (query.get('checkout') === 'cancel')
      setStatus('Checkout canceled. No tip was recorded by this page.');
    else setStatus('Choose dollars for Stripe Checkout or CRWD for manual Moonshot Send.');
    var buyBtn = document.getElementById('tipjarBuy');
    if (buyBtn) buyBtn.addEventListener('click', buyCoins);

    // Set API URL from config if available
    try {
      if (window.CCRadioConfig && window.CCRadioConfig.apiUrl) API = window.CCRadioConfig.apiUrl;
    } catch (e) {}


    // Do not query the legacy CRWD balance endpoint: it is not an authorized payment ledger.
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else { build(); }

  window.CCRadioTipJar = {
    tip: tip,
    buy: buyCoins,
    getBalance: function () { return balance; },
    refresh: refreshBalance
  };
})();

