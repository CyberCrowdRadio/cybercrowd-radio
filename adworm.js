/* adWorm — James's spec, 2026-10-16.
 * ONE square. Blank balcony. Paid spot SQUEEZES in, BLINKS for the click,
 * 15 seconds, pops out. Tap = "Would you like to create an ad?"
 * Yes → creator. No → nothing.
 *
 * DOES NOT: flash (seizure). DOES: slow squeeze + deliberate blink.
 * ONLY: one spot, top center, paid rotation on a timer.
 */

(function () {
  "use strict";

  var SPOT_SECONDS = 15;
  var ROTATE_MS = 60000; // check for next paid spot every 60s

  var wormEl = null;
  var currentAd = null;
  var spotTimer = null;

  // Paid spots queue. Real ads get pushed here after payment.
  // For now: house spots so the balcony isn't dead.
  var paidQueue = [
    { brand: "Cybercrowd Radio", msg: "Your ad here — tap the worm", url: "/adworm.html" },
    { brand: "Cybercade", msg: "Play PixelPrix — cybercade-game.com", url: "https://cybercade-game.com" },
  ];
  var queueIdx = 0;

  function css() {
    if (document.getElementById("adworm-css")) return;
    var s = document.createElement("style");
    s.id = "adworm-css";
    s.textContent = [
      "#cc-worm{",
      " position:fixed; top:8px; left:50%; transform:translateX(-50%);",
      " z-index:9000; min-width:280px; max-width:92vw;",
      " background:#0a0a0f; border:1px solid rgba(201,162,39,.4); border-radius:10px;",
      " padding:10px 16px; text-align:center; cursor:pointer;",
      " font-family:monospace; color:#f5edd8;",
      " display:none;", // balcony starts BLANK
      "}",
      "#cc-worm .worm-brand{ font-size:.7rem; color:#c9a227; letter-spacing:.1em; text-transform:uppercase; }",
      "#cc-worm .worm-msg{ font-size:.95rem; margin-top:4px; }",
      // SQUEEZE IN — grabs the eye
      "#cc-worm.squeeze-in{ display:block; animation:wormSqueeze .6s ease-out; }",
      "@keyframes wormSqueeze{",
      " 0%{ transform:translateX(-50%) scaleX(.1); opacity:0; }",
      " 60%{ transform:translateX(-50%) scaleX(1.15); opacity:1; }",
      " 100%{ transform:translateX(-50%) scaleX(1); opacity:1; }",
      "}",
      // BLINK — slow, deliberate, begging for the click. NOT a strobe.
      "#cc-worm.blinking{ animation:wormBlink 1.2s ease-in-out 3; }",
      "@keyframes wormBlink{",
      " 0%,100%{ opacity:1; }",
      " 50%{ opacity:.35; }",
      "}",
      // SQUEEZE OUT
      "#cc-worm.squeeze-out{ animation:wormSqueezeOut .4s ease-in forwards; }",
      "@keyframes wormSqueezeOut{",
      " 0%{ transform:translateX(-50%) scaleX(1); opacity:1; }",
      " 100%{ transform:translateX(-50%) scaleX(.1); opacity:0; }",
      "}",
    ].join("\n");
    document.head.appendChild(s);
  }

  function build() {
    if (wormEl) return;
    css();
    wormEl = document.createElement("div");
    wormEl.id = "cc-worm";
    wormEl.setAttribute("role", "button");
    wormEl.setAttribute("aria-label", "Advertisement");
    wormEl.addEventListener("click", onTap);
    document.body.appendChild(wormEl);
  }

  function onTap() {
    // James's flow: ask first.
    if (confirm("Would you like to create an ad?")) {
      window.location.href = "/adworm.html";
    }
    // No = nothing.
  }

  function showSpot(ad) {
    build();
    currentAd = ad;
    wormEl.classList.remove("squeeze-out", "blinking");
    wormEl.innerHTML =
      '<div class="worm-brand">' + esc(ad.brand) + "</div>" +
      '<div class="worm-msg">' + esc(ad.msg) + "</div>";
    // SQUEEZE IN
    wormEl.classList.add("squeeze-in");
    // Then BLINK for the click
    setTimeout(function () {
      wormEl.classList.add("blinking");
    }, 700);
    // 15 seconds, then out
    clearTimeout(spotTimer);
    spotTimer = setTimeout(hideSpot, SPOT_SECONDS * 1000);
  }

  function hideSpot() {
    if (!wormEl) return;
    wormEl.classList.remove("squeeze-in", "blinking");
    wormEl.classList.add("squeeze-out");
    setTimeout(function () {
      wormEl.style.display = "none";
      wormEl.classList.remove("squeeze-out");
      currentAd = null;
    }, 400);
  }

  function nextPaid() {
    if (paidQueue.length === 0) return; // balcony stays blank
    var ad = paidQueue[queueIdx % paidQueue.length];
    queueIdx++;
    showSpot(ad);
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // Public: push a real paid ad into rotation (after Stripe payment)
  function addPaidSpot(brand, msg, url) {
    paidQueue.push({ brand: brand, msg: msg, url: url });
  }

  // Start the rotation timer. Balcony stays blank until a spot pops in.
  function start() {
    build();
    // First spot pops in after 5 seconds so the page loads clean
    setTimeout(nextPaid, 5000);
    setInterval(function () {
      if (!currentAd) nextPaid();
    }, ROTATE_MS);
  }

  window.CCAdWorm = { start: start, addPaidSpot: addPaidSpot, next: nextPaid };

  // Auto-start when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
