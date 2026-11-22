/*
File repo: CyberCrowdRadio/cybercrowd-radio
File name: tipjar.js
Movements: Restore CRWD Solana Pay wallet handoff for selected token amounts while retaining the existing live Stripe checkout path.
Purpose: Route selected CRWD amounts to wallet approval and dollar amounts to Stripe Checkout without mixing payment rails.
Does NOT: Hold private keys, sign token transfers, assert payment completion, or modify station playback.
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
        var amount = isCrwd ? Number(checked.value) : custom && custom.value.trim()
          ? Math.round(Number(custom.value) * 100)
          : checked ? Number(checked.value) : 0;
        if (isCrwd) {
          var cfg = window.STATION_CONFIG || {};
          var address = String(cfg.crwdTipAddress || '').trim();
          var mint = String(cfg.crwdMint || '').trim();
          if (!address || !mint || !Number.isSafeInteger(amount) || amount <= 0) {
            setStatus('CRWD wallet transfer is not configured. No tip was sent.'); return;
          }
          var paymentUrl = 'solana:' + address + '?amount=' + encodeURIComponent(String(amount))
            + '&spl-token=' + encodeURIComponent(mint)
            + '&label=' + encodeURIComponent('Cybercrowd Radio')
            + '&message=' + encodeURIComponent('CRWD station tip');
          setStatus('Opening a compatible Solana wallet. Review the address, token, amount and network fee before approving. No transfer is confirmed here.');
          window.location.href = paymentUrl;
          return;
        }
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
    var query = new URLSearchParams(window.location.search);
    if (query.get('checkout') === 'return')
      setStatus('Returned from Stripe. Payment confirmation is verified separately; this page does not claim a completed tip.');
    else if (query.get('checkout') === 'cancel')
      setStatus('Checkout canceled. No tip was recorded by this page.');
    else setStatus('Choose dollars for Stripe Checkout or CRWD for Solana wallet approval.');
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
