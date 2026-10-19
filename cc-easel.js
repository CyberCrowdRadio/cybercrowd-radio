/* CCEasel — the 2x2 draggable camera canvas (easel.html).
 * One file, one job: the easel.
 *
 * DOES: touch-hold-drag-let-go rearrange, double-tap enlarge,
 *       camera selector strip, PUT ME ON button.
 * DOES NOT: change the sound — layout only.
 */
(function () {
  "use strict";
  var easel = document.getElementById("easel");
  if (!easel) return;
  var cfg = window.STATION_CONFIG || {};
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var toast = document.getElementById("toast"), toastT = null;
  function say(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.hidden = false;
    requestAnimationFrame(function () { toast.classList.add("show"); });
    clearTimeout(toastT);
    toastT = setTimeout(function () {
      toast.classList.remove("show");
      setTimeout(function () { toast.hidden = true; }, 350);
    }, 3600);
  }

  var squares = Array.from(easel.querySelectorAll(".video-square"));
  var dragEl = null, dropTarget = null;

  function squareAtPoint(x, y, exclude) {
    return squares.find(function (sq) {
      if (sq === exclude) return false;
      var r = sq.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    }) || null;
  }

  function swapSquares(a, b) {
    if (!a || !b || a === b) return;
    var aNext = a.nextElementSibling;
    if (aNext === b) easel.insertBefore(b, a);
    else if (b.nextElementSibling === a) easel.insertBefore(a, b);
    else { easel.insertBefore(a, b.nextElementSibling); easel.insertBefore(b, aNext); }
  }

  function clearDrop() {
    squares.forEach(function (sq) { sq.classList.remove("drop-target"); });
    dropTarget = null;
  }

  squares.forEach(function (sq) {
    var startX = 0, startY = 0, moved = false, lastTap = 0;

    sq.addEventListener("pointerdown", function (e) {
      var t = Date.now();
      if (t - lastTap < 320 && !moved) {
        sq.classList.toggle("enlarged");
        lastTap = 0;
        return;
      }
      lastTap = t;
      moved = false;
      startX = e.clientX; startY = e.clientY;
      try { sq.setPointerCapture(e.pointerId); } catch (_) {}
    });

    sq.addEventListener("pointermove", function (e) {
      try { if (!sq.hasPointerCapture(e.pointerId)) return; } catch (_) { return; }
      var dx = e.clientX - startX, dy = e.clientY - startY;
      if (!moved && Math.hypot(dx, dy) > 12) {
        moved = true;
        dragEl = sq;
        sq.classList.add("dragging");
      }
      if (moved) {
        clearDrop();
        dropTarget = squareAtPoint(e.clientX, e.clientY, sq);
        if (dropTarget) dropTarget.classList.add("drop-target");
      }
    });

    var endDrag = function () {
      if (moved && dragEl) {
        if (dropTarget) swapSquares(dragEl, dropTarget);
        dragEl.classList.remove("dragging");
        clearDrop();
        dragEl = null;
        say("Canvas rearranged. The sound never changed.");
      }
      moved = false;
    };
    sq.addEventListener("pointerup", endDrag);
    sq.addEventListener("pointercancel", endDrag);

    sq.addEventListener("keydown", function (e) {
      var i = squares.indexOf(sq);
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        sq.classList.toggle("enlarged");
      } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        var j = e.key === "ArrowRight" ? (i + 1) % squares.length : (i - 1 + squares.length) % squares.length;
        swapSquares(sq, squares[j]);
      }
    });
  });

  /* ---------- camera selector strip ---------- */
  var camStrip = document.getElementById("camStrip");
  if (camStrip) {
    var camChips = Array.from(camStrip.querySelectorAll(".cam-chip"));
    var camMeta = {};
    (cfg.cameras || []).forEach(function (c) { camMeta[c.id] = c; });
    camChips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        camChips.forEach(function (c) {
          c.classList.remove("is-active");
          c.setAttribute("aria-selected", "false");
        });
        chip.classList.add("is-active");
        chip.setAttribute("aria-selected", "true");
        var id = chip.dataset.cam;
        var meta = camMeta[id] || {};
        var target = squares.find(function (sq) { return sq.dataset.cam === id; }) || squares[0];
        squares.forEach(function (sq) { sq.classList.remove("enlarged"); });
        if (target) {
          target.classList.add("enlarged");
          target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "nearest" });
        }
        say((meta.label || id) + " loaded full-easel. Feeds connect when the studio goes live.");
      });
    });
  }

  /* ---------- PUT ME ON ---------- */
  var putMeOnBtn = document.getElementById("putMeOnBtn");
  var putMeOnStatus = document.getElementById("putMeOnStatus");
  if (putMeOnBtn) putMeOnBtn.addEventListener("click", function () {
    if (putMeOnStatus) {
      putMeOnStatus.hidden = false;
      putMeOnStatus.textContent = "You're in the queue \u2014 Sonny Daze picks who's on.";
    }
    putMeOnBtn.disabled = true;
    putMeOnBtn.textContent = "IN THE QUEUE";
  });
})();
