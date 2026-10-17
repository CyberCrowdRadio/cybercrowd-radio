/* Go Live Countdown — one file, one job: 5-4-3-2-1-YOU'RE LIVE.
 * DOES NOT: start the stream. It counts down, then signals.
 * ONLY: show the box, count, hand off.
 */

(function () {
  "use strict";

  var COUNT_FROM = 5;
  var boxEl = null;

  function buildBox() {
    if (boxEl) return;
    boxEl = document.createElement("div");
    boxEl.id = "golive-countdown";
    boxEl.style.display = "none";
    document.body.appendChild(boxEl);

    var css = [
      "#golive-countdown{",
      " position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);",
      " z-index:99999; background:#05050a; border:2px solid #f5c518;",
      " border-radius:16px; padding:40px 60px; text-align:center;",
      " font-family:monospace; color:#f5c518;",
      "}",
      "#golive-countdown .count-num{ font-size:5rem; font-weight:bold; line-height:1; }",
      "#golive-countdown .count-label{ font-size:1rem; margin-top:10px; color:#c8c8e0; }",
      "#golive-countdown.live{ border-color:#00ff9d; }",
      "#golive-countdown.live .count-num{ color:#00ff9d; font-size:2.5rem; }",
    ].join("\n");
    var s = document.createElement("style");
    s.textContent = css;
    document.head.appendChild(s);
  }

  function show(num, label) {
    buildBox();
    boxEl.style.display = "block";
    boxEl.classList.remove("live");
    boxEl.innerHTML =
      '<div class="count-num">' + num + "</div>" +
      '<div class="count-label">' + (label || "going live...") + "</div>";
  }

  function showLive() {
    buildBox();
    boxEl.style.display = "block";
    boxEl.classList.add("live");
    boxEl.innerHTML =
      '<div class="count-num">YOU\'RE LIVE</div>' +
      '<div class="count-label">see you out there</div>';
    // Auto-hide after 3 seconds
    setTimeout(hide, 3000);
  }

  function hide() {
    if (boxEl) boxEl.style.display = "none";
  }

  var GoLive = {
    /* Start the 5-second countdown. onLive fires when countdown completes. */
    start: function (onLive) {
      buildBox();
      var n = COUNT_FROM;
      show(n);
      var timer = setInterval(function () {
        n--;
        if (n > 0) {
          show(n);
        } else {
          clearInterval(timer);
          showLive();
          if (typeof onLive === "function") onLive();
          // Notify the station
          try {
            if (window.CCRadioJacks) {
              // Plug in all jacks when live
              ["mic", "turntable", "aux"].forEach(function (j) {
                window.CCRadioJacks.plug(j).catch(function () {});
              });
            }
          } catch (_) {}
        }
      }, 1000);
    },

    cancel: function () {
      hide();
    },
  };

  window.CCGoLive = GoLive;
})();
