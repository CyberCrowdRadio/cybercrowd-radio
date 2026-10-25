/* CYBERCROWD RADIO — equalizer popup fader, swipe only, ONE window.
   One job: one popup window for one fader at a time, with swipe to the
   next fader. Not five windows, not five files. Five buttons pick which
   band is inside the one window, swipe moves the band inside the same
   window, close closes the one window.
   Buttons, generic only, in order, left to right: Bass, 250, Voice, 4000, Top.
   James will design the button differently later. Generic button now is
   placeholder only, tap whichever one of the five, that one pops up.
   Tap a button, that fader pops up, big, in the popup, with its label
   and its dB number, and you control that one fader.
   SWIPE, CONTINUOUS, straight line, NOT a full circle:
   Swipe left to right, right to left, again and again, inside one box.
   Five things in a swipe box, straight line, left to right, right to left.
   Tap any of the five buttons, that fader pops up, then swipe repeatedly
   to any other fader, from one to all other four, from center to outer
   to center back to outer, fun by choosing direction each time.
   Bass, leftmost: swipe right repeatedly, Bass to 250 to Voice to 4000 to Top.
   Swipe left at Bass does nothing, because there is no fader to the left.
   Top, rightmost: swipe left repeatedly, Top to 4000 to Voice to 250 to Bass.
   Swipe right at Top does nothing, because there is no fader to the right.
   Center three, 250, Voice, 4000: swipe left OR swipe right, both, repeatedly.
   250: left to Bass, right to Voice, then on to 4000, Top, or back.
   Voice: left to 250, right to 4000, then on to either end, or back.
   4000: left to Voice, right to Top, then on to either end, or back.
   Bass and Top are NOT attached. NO full circle, NO wrap, NO Bass to Top jump.
   A full circle would cause a problem with what James wants, so it is out.
   Swipe meaning in this file, plain, so there is no inversion:
   swipe right = move right in the button list, index + 1.
   swipe left = move left in the button list, index - 1.
   Finger swipe right is a finger move to the right, more than 50 pixels.
   Finger swipe left is a finger move to the left, more than 50 pixels.
   If your ear / hand says that direction feels backwards on the phone,
   flip one sign in the swipe code, one line, and it is the other way.
   That is a dial, not a rebuild.
   Arrows do the same job for laptop / mouse, no swipe needed:
   left arrow = move left in the list, right arrow = move right.
   Arrows at the edges are disabled, same edge rule as swipe.
   Close: tap X, or tap the same button again, popup pops down.
   Values stay where you left them, close does not reset.
   Sound: popup talks to the working faders first, then to the engine.
   It does NOT touch faders, engine, rail, gate, trial, or display files.
   Working faders row stays standing, popup and row stay in sync,
   because popup sets the same value the row sets, and reads the same
   value the row reads. Display above still shows the fader move,
   because display reads fader values live.
   Gate / trial: popup mounts inside the EQ seat, so a mounted gate
   blocks it for visitors exactly as it blocks the row, and owner
   bypass, no gate mounted, leaves it free for owner. No gate change here.
   Mount: buttons row and popup panel insert into the EQ seat,
   before the faders row, so you can test popup without removing the
   working row. If no EQ seat is found, this file builds nothing.
   This file alone does nothing visible until station.html loads it
   after mount, same wiring rule as display.
*/
"use strict";
window.CCEQPopup = (function () {
  var LABELS = ["Bass", "250", "Voice", "4000", "Top"];
  var index = -1;
  var open = false;
  var root = null;
  var buttons = [];
  var popup = null;
  var labelEl = null;
  var valueEl = null;
  var sliderEl = null;
  var leftBtn = null;
  var rightBtn = null;
  var touchX = null;

  function getValue(i) {
    try {
      if (window.CCEQFaders && window.CCEQFaders.values) {
        var v = window.CCEQFaders.values();
        if (v && v.length > i) return v[i];
      }
    } catch (e) {}
    try {
      if (window.CCEQEngine && window.CCEQEngine.bands) {
        var b = window.CCEQEngine.bands();
        if (b && b.length > i) return b[i];
      }
    } catch (e) {}
    return 0;
  }

  function setValue(i, val) {
    try {
      if (window.CCEQFaders && window.CCEQFaders.setValue) {
        window.CCEQFaders.setValue(i, val);
        return;
      }
    } catch (e) {}
    try {
      if (window.CCEQEngine && window.CCEQEngine.setBand) window.CCEQEngine.setBand(i, val);
    } catch (e) {}
  }

  function fmt(val) {
    if (val > 0) return "+" + val;
    return "" + val;
  }

  function render() {
    var i, val;
    if (!popup) return;
    for (i = 0; i < buttons.length; i++) {
      buttons[i].className = "cc-eq-popup-btn" + (i === index && open ? " cc-eq-popup-btn-on" : "");
    }
    if (!open || index < 0) {
      popup.style.display = "none";
      return;
    }
    popup.style.display = "block";
    val = getValue(index);
    labelEl.textContent = LABELS[index];
    valueEl.textContent = fmt(val);
    sliderEl.value = val;
    leftBtn.disabled = index <= 0;
    rightBtn.disabled = index >= LABELS.length - 1;
  }

  function openBand(i) {
    if (i < 0 || i >= LABELS.length) return;
    index = i;
    open = true;
    render();
  }

  function closePopup() {
    open = false;
    render();
  }

  function moveLeft() {
    if (index <= 0) return;
    index = index - 1;
    render();
  }

  function moveRight() {
    if (index >= LABELS.length - 1) return;
    index = index + 1;
    render();
  }

  function onTouchStart(e) {
    if (!e.touches || !e.touches.length) return;
    touchX = e.touches[0].clientX;
  }

  function onTouchEnd(e) {
    var dx, endX;
    if (touchX === null) return;
    if (!e.changedTouches || !e.changedTouches.length) { touchX = null; return; }
    endX = e.changedTouches[0].clientX;
    dx = endX - touchX;
    touchX = null;
    if (dx > 50) moveRight();
    else if (dx < -50) moveLeft();
  }

  function mount() {
    var seat, styleEl, row, i, btn;
    seat = document.querySelector(".cc-eq-seat");
    if (!seat) return false;
    if (root) return true;
    styleEl = document.createElement("style");
    styleEl.setAttribute("data-cc-eq-popup", "1");
    styleEl.textContent =
      ".cc-eq-popup-root{display:flex;flex-direction:column;gap:10px;align-items:center;width:100%}" +
      ".cc-eq-popup-row{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}" +
      ".cc-eq-popup-btn{font:inherit;color:#aebbb2;background:#ffffff04;border:1px solid #ffffff16;padding:11px 15px;cursor:pointer}" +
      ".cc-eq-popup-btn-on{color:#a6ff35;border-color:#a6ff3540;background:#a6ff3509}" +
      ".cc-eq-popup-panel{display:none;background:linear-gradient(135deg,#151d17b0,#0a100dc9 55%,#0c120fe6);border:1px solid #ffffff12;padding:19px 21px;color:#e4ece6;font-family:'IBM Plex Mono',monospace;width:100%;max-width:420px;touch-action:pan-y}" +
      ".cc-eq-popup-head{display:flex;justify-content:space-between;align-items:center}" +
      ".cc-eq-popup-label{font:600 28px 'Barlow Condensed',sans-serif;letter-spacing:2px;color:#a6ff35}" +
      ".cc-eq-popup-value{font:600 28px 'Barlow Condensed',sans-serif}" +
      ".cc-eq-popup-close{font:inherit;color:#aebbb2;background:#ffffff04;border:1px solid #ffffff16;padding:11px 15px;cursor:pointer}" +
      ".cc-eq-popup-body{display:flex;gap:16px;align-items:center;justify-content:center;margin-top:12px}" +
      ".cc-eq-popup-arrow{font:inherit;font-size:28px;color:#e4ece6;background:#ffffff04;border:1px solid #ffffff16;padding:11px 18px;cursor:pointer}" +
      ".cc-eq-popup-arrow:disabled{opacity:.3;cursor:default}" +
      ".cc-eq-popup-slider{writing-mode:vertical-lr;direction:rtl;height:180px;width:44px;accent-color:#a6ff35}";
    document.head.appendChild(styleEl);
    root = document.createElement("div");
    root.className = "cc-eq-popup-root";
    row = document.createElement("div");
    row.className = "cc-eq-popup-row";
    for (i = 0; i < LABELS.length; i++) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cc-eq-popup-btn";
      btn.textContent = LABELS[i];
      (function (n, b) {
        b.addEventListener("click", function () {
          if (open && index === n) closePopup();
          else openBand(n);
        });
      })(i, btn);
      buttons.push(btn);
      row.appendChild(btn);
    }
    popup = document.createElement("div");
    popup.className = "cc-eq-popup-panel";
    popup.innerHTML =
      '<div class="cc-eq-popup-head"><span class="cc-eq-popup-label" id="ccEqPopupLabel">Voice</span><span class="cc-eq-popup-value" id="ccEqPopupValue">0</span><button type="button" class="cc-eq-popup-close" id="ccEqPopupClose">X</button></div>' +
      '<div class="cc-eq-popup-body"><button type="button" class="cc-eq-popup-arrow" id="ccEqPopupLeft">&lt;</button><input type="range" min="-12" max="12" step="1" value="0" class="cc-eq-popup-slider" id="ccEqPopupSlider" orient="vertical"><button type="button" class="cc-eq-popup-arrow" id="ccEqPopupRight">&gt;</button></div>' +
      '<div style="text-align:center;color:#67746e;font-size:9px;margin-top:12px">Swipe left or right, again and again, straight line, no circle. Bass to Top by going through all five, not by jumping.</div>';
    labelEl = popup.querySelector("#ccEqPopupLabel");
    valueEl = popup.querySelector("#ccEqPopupValue");
    sliderEl = popup.querySelector("#ccEqPopupSlider");
    leftBtn = popup.querySelector("#ccEqPopupLeft");
    rightBtn = popup.querySelector("#ccEqPopupRight");
    popup.querySelector("#ccEqPopupClose").addEventListener("click", closePopup);
    leftBtn.addEventListener("click", moveLeft);
    rightBtn.addEventListener("click", moveRight);
    sliderEl.addEventListener("input", function () {
      var v = parseInt(sliderEl.value, 10) || 0;
      if (index >= 0) {
        setValue(index, v);
        valueEl.textContent = fmt(v);
      }
    });
    popup.addEventListener("touchstart", onTouchStart, { passive: true });
    popup.addEventListener("touchend", onTouchEnd);
    root.appendChild(row);
    root.appendChild(popup);
    seat.insertBefore(root, seat.firstChild);
    render();
    return true;
  }

  function autoMount() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", mount);
    } else {
      mount();
    }
  }

  autoMount();

  return {
    mount: mount,
    open: openBand,
    close: closePopup,
    left: moveLeft,
    right: moveRight,
    status: function () {
      return { open: open, index: index, label: index >= 0 ? LABELS[index] : null };
    }
  };
})();
