/* CYBERCROWD RADIO — request queue only.
   One job: the request queue.
   What it is: requests grouped by song, one entry per song,
   names stacked under it, numbered in order, with a
   Don't own it button that removes the entry and says so.
   The queue lives in memory for the session, no server yet.
   Authority: request queue only. Owns the queue list and
   its rendering, nothing else.
   Uses $ from cc-base.js, stone 1. Calls say() from
   cc-toast.js, stone 5, loaded before this file, only on
   a Don't own it tap.
   NOTE: original lines 954-965, the donor and email form
   calls, and 967-969, the advertise button, sit after this
   queue in file order but are NOT in this stone. They are
   forms, stone 25, and advertise, stone 28, by job.
   Source: app.js lines 887-953, cut out whole, IIFE indent removed.
   Local file is 995 lines; the plan lists 1001 lines, so local line
   numbers run about 6 lines lower than the plan after the early
   sections. The cut follows section content, not the plan numbers
   blindly, and no line is used in two stones.
   This file alone does nothing visible until the loader switch after stone 29.
   Stone 27 of 29. Station still runs on app.js until that switch.
*/
"use strict";
/* ============================================================
   REQUEST QUEUE — grouped by song, numbered in order.
   One entry per song. Names stack under it.
   "Don't own it" lets the booth answer back: sorry, don't own that one.
   Queue lives in memory for this session — no server yet.
   ============================================================ */
const requestQueue = [];
const queueList = $("queueList"), queueEmpty = $("queueEmpty");
const esc = (s) => s.replace(/</g, "&lt;").replace(/>/g, "&gt;");

function renderQueue() {
  if (!queueList) return;
  queueList.innerHTML = "";
  if (!requestQueue.length) {
    if (queueEmpty) queueEmpty.hidden = false;
    return;
  }
  if (queueEmpty) queueEmpty.hidden = true;
  requestQueue.forEach((entry, i) => {
    const li = document.createElement("li");
    li.className = "queue-item";
    li.innerHTML =
      `<span class="queue-num">${i + 1}.</span> ` +
      `<span class="queue-song">${esc(entry.song)}</span> ` +
      `<span class="queue-names">— ${entry.names.map(esc).join(", ")}</span> ` +
      (entry.shout ? `<span class="queue-shout">(${esc(entry.shout)})</span> ` : "") +
      `<button class="queue-nope" type="button" data-idx="${i}">Don't own it</button>`;
    queueList.appendChild(li);
  });
  queueList.querySelectorAll(".queue-nope").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.idx);
      const entry = requestQueue[idx];
      if (!entry) return;
      requestQueue.splice(idx, 1);
      renderQueue();
      say(`Sorry ${entry.names.join(", ")} — I don't own "${entry.song}".`);
    });
  });
}

const requestForm = $("requestForm"), formMsg = $("formMsg");
if (requestForm) {
  requestForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const song = requestForm.querySelector("#reqSong").value.trim();
    const name = requestForm.querySelector("#reqName").value.trim() || "Midnight caller";
    const shout = requestForm.querySelector("#reqShout").value.trim();
    if (!song) return;
    // Group by song (case-insensitive) — one entry, names stack.
    const key = song.toLowerCase();
    const existing = requestQueue.find((en) => en.song.toLowerCase() === key);
    if (existing) {
      if (!existing.names.includes(name)) existing.names.push(name);
      if (shout && !existing.shout) existing.shout = shout;
    } else {
      requestQueue.push({ song, names: [name], shout });
    }
    renderQueue();
    if (formMsg) {
      formMsg.hidden = false;
      formMsg.textContent = `Got it, ${name} — "${song}" is in the queue. The booth answers back on the air.`;
    }
    requestForm.reset();
  });
}
renderQueue();
window.CC_REQUEST_QUEUE_LOADED = true;
