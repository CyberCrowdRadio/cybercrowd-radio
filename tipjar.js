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

  // Buy CRWD to fill the jar (one-time or refill)
  function buyCoins() {
    var amount = prompt('How much CRWD to add? (e.g. 10)', '10');
    if (!amount || isNaN(parseFloat(amount))) return;
    setStatus('Processing...');
    api('/api/tipjar/buy', 'POST', { amount: parseFloat(amount) })
      .then(function (d) {
        if (d.ok) {
          balance = d.newBalance;
          updateUI();
          setStatus('Added ' + amount + ' CRWD to your jar.');
        } else if (d.needPayment) {
          // Redirect to payment (Stripe/Moonshot)
          window.location.href = d.paymentUrl;
        } else {
          setStatus(d.error || 'Purchase failed.');
        }
      })
      .catch(function () { setStatus('Purchase failed — try again.'); });
  }

  function build() {
    jarEl = document.getElementById('tipjar');
    if (!jarEl) return;
    balEl = document.getElementById('tipjarBalance');
    tipBtn = document.getElementById('tipjarBtn');

    if (tipBtn) {
      tipBtn.addEventListener('click', function () { tip(1, 'sonny-daze'); });
    }
    var buyBtn = document.getElementById('tipjarBuy');
    if (buyBtn) buyBtn.addEventListener('click', buyCoins);

    // Set API URL from config if available
    try {
      if (window.CCRadioConfig && window.CCRadioConfig.apiUrl) API = window.CCRadioConfig.apiUrl;
    } catch (e) {}

    refreshBalance();
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
