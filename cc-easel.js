/* CYBERCROWD RADIO — easel only.
   One job: the easel.
   What it is: the draggable 2x2 video canvas, drag to swap
   squares, double-tap to enlarge, arrows to reorder, plus the
   camera selector strip that loads a camera full-easel.
   Sound never changes, layout only.
   Authority: easel only. Owns easel layout. The camera selector
   calls easel enlarge, it does not own layout.
   Uses $, cfg and reduced from cc-base.js, stone 1. Calls say()
   from cc-toast.js, stone 5, loaded before this file, only on
   a drag or a camera tap.
   Source: app.js lines 624-736, cut out whole, IIFE indent removed.
   Local file is 995 lines; the plan lists 1001 lines, so local line
   numbers run about 6 lines lower than the plan after the early
   sections. The cut follows section content, not the plan numbers
   blindly, and no line is used in two stones.
   Guard added for the cut: camera chips fall back to an empty
   list if the camera strip is not on this page. Original line
   assumed camStrip exists. When it exists, effect is identical.
   This file alone does nothing visible until the loader switch after stone 29.
   Stone 22 of 29. Station still runs on app.js until that switch.
*/
"use strict";
/* ============================================================
   THE EASEL — draggable 2x2 video canvas
   Touch-hold-drag-let-go. Double-tap enlarges.
   Sound never changes — layout only.
   ============================================================ */
const easel = $("easel");
if (easel) { // the easel lives on easel.html now
const squares = Array.from(easel.querySelectorAll(".video-square"));
let dragEl = null, dropTarget = null;

function squareAtPoint(x, y, exclude) {
  return squares.find((sq) => {
    if (sq === exclude) return false;
    const r = sq.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }) || null;
}

function swapSquares(a, b) {
  if (!a || !b || a === b) return;
  const aNext = a.nextElementSibling;
  if (aNext === b) easel.insertBefore(b, a);
  else if (b.nextElementSibling === a) easel.insertBefore(a, b);
  else { easel.insertBefore(a, b.nextElementSibling); easel.insertBefore(b, aNext); }
}

function clearDrop() {
  squares.forEach((sq) => sq.classList.remove("drop-target"));
  dropTarget = null;
}

squares.forEach((sq) => {
  let startX = 0, startY = 0, moved = false, lastTap = 0;

  sq.addEventListener("pointerdown", (e) => {
    // double-tap enlarges; single quick tap does nothing
    const t = Date.now();
    if (t - lastTap < 320 && !moved) {
      sq.classList.toggle("enlarged");
      lastTap = 0;
      return;
    }
    lastTap = t;
    moved = false;
    startX = e.clientX; startY = e.clientY;
    sq.setPointerCapture(e.pointerId);
  });

  sq.addEventListener("pointermove", (e) => {
    if (!sq.hasPointerCapture(e.pointerId)) return;
    const dx = e.clientX - startX, dy = e.clientY - startY;
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

  const endDrag = (e) => {
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

  // keyboard: arrows reorder, Enter enlarges
  sq.addEventListener("keydown", (e) => {
    const i = squares.indexOf(sq);
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      sq.classList.toggle("enlarged");
    } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const j = e.key === "ArrowRight" ? (i + 1) % squares.length : (i - 1 + squares.length) % squares.length;
      swapSquares(sq, squares[j]);
    }
  });
});

/* ---------- camera selector strip ---------- */
const camStrip = $("camStrip");
const camChips = camStrip ? Array.from(camStrip.querySelectorAll(".cam-chip")) : [];
const camMeta = {};
(cfg.cameras || []).forEach((c) => { camMeta[c.id] = c; });
camChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    camChips.forEach((c) => {
      c.classList.remove("is-active");
      c.setAttribute("aria-selected", "false");
    });
    chip.classList.add("is-active");
    chip.setAttribute("aria-selected", "true");
    const id = chip.dataset.cam;
    const meta = camMeta[id] || {};
    const target = squares.find((sq) => sq.dataset.cam === id) || squares[0];
    squares.forEach((sq) => sq.classList.remove("enlarged"));
    target.classList.add("enlarged");
    say(`${meta.label || id} loaded full-easel. Feeds connect when the studio goes live.`);
    target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "nearest" });
  });
});
} // end if (easel)
window.CC_EASEL_LOADED = true;
