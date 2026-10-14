/* ============================================================
   CYBERCROWD RADIO — behavior.
   Vanilla JS. No dependencies. Touch-first: drag and drop
   everything practical. No flashing, ever.
   ============================================================ */
(() => {
  "use strict";
  const cfg = window.STATION_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- footer year ---------- */
  $("year").textContent = new Date().getFullYear();

  /* ---------- mobile nav ---------- */
  const menuBtn = $("menuBtn"), mobileNav = $("mobileNav");
  menuBtn.addEventListener("click", () => {
    const open = mobileNav.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", open);
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });
  mobileNav.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => mobileNav.classList.remove("open"))
  );

  /* ---------- toast ---------- */
  const toast = $("toast");
  let toastT = null;
  function say(msg, ms = 3600) {
    toast.textContent = msg;
    toast.hidden = false;
    requestAnimationFrame(() => toast.classList.add("show"));
    clearTimeout(toastT);
    toastT = setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => (toast.hidden = true), 350);
    }, ms);
  }

  /* ---------- ticker ---------- */
  const track = $("tickerTrack");
  const items = (cfg.ticker || []).map((t) => `<span>${t}</span><i>✦</i>`).join("");
  track.innerHTML = items + items;

  /* ---------- shows ---------- */
  const grid = $("showsGrid");
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours() + now.getMinutes() / 60;
  const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  let liveShow = null;
  let todayShow = null;
  (cfg.shows || []).forEach((s) => {
    const el = document.createElement("article");
    el.className = "show";
    if ((s.day || []).includes(day)) {
      el.classList.add("today");
      todayShow = s;
    }
    if ((s.day || []).includes(day) && hour >= s.start && hour < s.end) {
      el.classList.add("on-now");
      liveShow = s;
    }
    el.innerHTML = `
      <p class="show-time">${s.time}</p>
      <h3>${s.name}</h3>
      <p>${s.blurb}</p>
      <span class="show-days">${s.days}</span>`;
    grid.appendChild(el);
  });
  if (liveShow) {
    $("liveNow").hidden = false;
    $("liveNowName").textContent = liveShow.name;
  }

  /* ---------- day-aware hero: the station knows what day it is ---------- */
  function standbyText() {
    if (todayShow) return `Today is ${DAY_NAMES[day]} — ${todayShow.name} · ${todayShow.time}`;
    return "Standby — the needle drops when we go live";
  }
  const heroNowPlaying = $("nowPlaying");
  if (heroNowPlaying) heroNowPlaying.textContent = standbyText();

  /* ---------- retired segments (preserved, never deleted) ---------- */
  const retiredList = $("retiredList");
  (cfg.retiredSegments || []).forEach((r) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${r.name}</strong> — ${r.note}`;
    retiredList.appendChild(li);
  });

  /* ---------- channels ---------- */
  const channelsGrid = $("channelsGrid");
  const channels = (cfg.channels || []).filter((c) => (c.src || "").trim() !== "");
  if (!channels.length) {
    channelsGrid.innerHTML = `
      <div class="channel-empty">
        <p class="channel-empty-title">The channels go live when the studio does.</p>
        <p>Studio Live. Vinyl Vault. The booth decides the lineup — this wall fills in when the feeds connect.</p>
      </div>`;
  } else {
    channels.forEach((c) => {
      const el = document.createElement("button");
      el.className = "channel-card";
      el.type = "button";
      el.innerHTML = `<span class="channel-name">${c.name}</span><span class="channel-kind">${c.kind || "live"}</span>`;
      el.addEventListener("click", () => say(`${c.name} opens here when the feed connects.`));
      channelsGrid.appendChild(el);
    });
  }

  /* ---------- donor wall (local until the archive backend lands) ---------- */
  const donorWall = $("donorWall");
  const DONOR_KEY = "cybercrowd-donors";
  function loadDonors() {
    try { return JSON.parse(localStorage.getItem(DONOR_KEY) || "[]"); }
    catch (_) { return []; }
  }
  function renderDonors() {
    const donors = loadDonors();
    donorWall.innerHTML = "";
    if (!donors.length) {
      const li = document.createElement("li");
      li.className = "plaque plaque-empty";
      li.textContent = "The first plaque is waiting for a name.";
      donorWall.appendChild(li);
      return;
    }
    donors.forEach((d) => {
      const li = document.createElement("li");
      li.className = "plaque";
      li.innerHTML = `<strong>${d.name}</strong><span>${d.record}</span>`;
      donorWall.appendChild(li);
    });
  }
  renderDonors();

  /* ---------- archive mail line ---------- */
  const mailTo = (cfg.archive && cfg.archive.mailTo || "").trim();
  if (mailTo) $("mailLine").textContent = "Mail your LPs to: " + mailTo;

  /* ---------- membership tiers ---------- */
  const tiersGrid = $("tiersGrid");
  const stripeLive = (cfg.stripePublishableKey || "").trim() !== "";
  (cfg.memberships || []).forEach((m, i) => {
    const el = document.createElement("div");
    el.className = "tier" + (i === 1 ? " featured" : "");
    el.innerHTML = `
      <p class="tier-name">${m.name}</p>
      <p class="tier-price">${m.price}</p>
      <p class="tier-blurb">${m.blurb}</p>
      <ul>${(m.perks || []).map((p) => `<li>${p}</li>`).join("")}</ul>`;
    const btn = document.createElement("button");
    btn.className = "btn-brass";
    btn.type = "button";
    btn.textContent = m.price === "Free" ? "Start listening" : "Become " + m.name;
    btn.addEventListener("click", () => {
      if (m.price === "Free") {
        document.querySelector("#listen").scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
        return;
      }
      if (!stripeLive) {
        say("Keeper payments aren't wired yet — drop your email below and we'll hold your seat.");
        document.querySelector("#emailAddr").focus();
        return;
      }
      say("Checkout opens here when Stripe is connected.");
    });
    el.appendChild(btn);
    tiersGrid.appendChild(el);
  });

  /* ============================================================
     THE RECEIVER — honest live player
     ============================================================ */
  const playBtn = $("playBtn");
  const iconPlay = $("iconPlay"), iconPause = $("iconPause");
  const nowPlaying = $("nowPlaying");
  const streamState = $("streamState");
  const onairPill = $("onairPill"), onairText = $("onairText");
  const receiver = playBtn.closest(".receiver");
  const vol = $("volSlider");
  let audio = null, playing = false;

  function setLive(on) {
    playing = on;
    receiver.classList.toggle("playing", on);
    iconPlay.style.display = on ? "none" : "";
    iconPause.style.display = on ? "" : "none";
    playBtn.setAttribute("aria-label", on ? "Pause live stream" : "Play live stream");
    onairPill.classList.toggle("live", on);
    onairText.textContent = on ? "ON AIR" : "STANDBY";
    streamState.innerHTML = on ? "SIGNAL&nbsp;LIVE" : "SIGNAL&nbsp;OFFLINE";
    streamState.classList.toggle("live", on);
    nowPlaying.textContent = on
      ? (liveShow ? `${liveShow.name} — live now` : "You're listening live")
      : (typeof standbyText === "function" ? standbyText() : "Standby — the needle drops when we go live");
  }

  playBtn.addEventListener("click", async () => {
    // Live stream first. If offline, fall back to the standby song.
    const url = (cfg.streamUrl || "").trim() || (cfg.standbySong || "").trim();
    const isStandby = !(cfg.streamUrl || "").trim() && !!(cfg.standbySong || "").trim();
    if (!url) {
      say("The stream isn't live yet — the needle drops when we go on the air. Check back soon.");
      return;
    }
    try {
      if (!audio) {
        audio = new Audio(url);
        audio.preload = "none";
        audio.volume = vol.value / 100;
        vol.addEventListener("input", () => (audio.volume = vol.value / 100));
        audio.addEventListener("error", () => {
          setLive(false);
          say("Couldn't reach the stream — it may be offline. Try again in a bit.");
        });
      }
      if (playing) { audio.pause(); setLive(false); }
      else {
        await audio.play();
        setLive(true);
        // Standby song: show its title instead of "listening live".
        if (isStandby && cfg.standbySongTitle) {
          nowPlaying.textContent = `Standby song — ${cfg.standbySongTitle}`;
        }
      }
    } catch (_) {
      setLive(false);
      say("Couldn't reach the stream — it may be offline. Try again in a bit.");
    }
  });

  /* ============================================================
     THE EASEL — draggable 2x2 video canvas
     Touch-hold-drag-let-go. Double-tap enlarges.
     Sound never changes — layout only.
     ============================================================ */
  const easel = $("easel");
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
  const camChips = Array.from(camStrip.querySelectorAll(".cam-chip"));
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

  /* ============================================================
     CHAT DOCK — open / closed / undocked-and-draggable
     ============================================================ */
  const chatDock = $("chatDock");
  const chatHead = $("chatHead");
  const chatTab = $("chatTab");
  const chatMinBtn = $("chatMinBtn");
  const chatUndockBtn = $("chatUndockBtn");
  const chatMsgs = $("chatMsgs");
  const chatForm = $("chatForm");
  const chatInput = $("chatInput");
  const isMobile = () => window.matchMedia("(max-width: 860px)").matches;
  let dockedPos = null; // remembered {left, top} when undocked

  function chatSay(who, text, sys) {
    const li = document.createElement("li");
    if (sys) li.innerHTML = `<span class="sys">${text}</span>`;
    else li.innerHTML = `<span class="who">${who}</span>${text}`;
    chatMsgs.appendChild(li);
    chatMsgs.scrollTop = chatMsgs.scrollHeight;
  }
  chatSay(null, "The booth is quiet until we go live. Leave a message — the station answers back.", true);

  // Mobile starts with chat closed behind the ">" tab (full-screen when opened).
  // Desktop starts docked open.
  if (isMobile()) setChatState("closed");

  function setChatState(state) {
    chatDock.dataset.state = state;
    chatDock.classList.remove("fullscreen");
    if (state === "closed") {
      chatTab.hidden = false;
      chatTab.setAttribute("aria-label", "Open chat");
    } else {
      chatTab.hidden = true;
      if (state === "open") {
        chatDock.style.left = "";
        chatDock.style.top = "";
        if (isMobile()) chatDock.classList.add("fullscreen");
      }
      if (state === "undocked" && dockedPos) {
        chatDock.style.left = dockedPos.left + "px";
        chatDock.style.top = dockedPos.top + "px";
      }
      setTimeout(() => chatInput.focus({ preventScroll: true }), 380);
    }
  }

  chatMinBtn.addEventListener("click", () => setChatState("closed"));
  chatTab.addEventListener("click", () => setChatState("open"));
  chatUndockBtn.addEventListener("click", () => {
    if (chatDock.dataset.state === "undocked") setChatState("open");
    else {
      const r = chatDock.getBoundingClientRect();
      dockedPos = { left: r.left, top: r.top };
      chatDock.style.left = r.left + "px";
      chatDock.style.top = Math.min(r.top, window.innerHeight - 200) + "px";
      setChatState("undocked");
      say("Chat undocked — drag the header anywhere.");
    }
  });

  // drag the dock by its header (touch + mouse)
  let cDrag = null;
  chatHead.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button")) return;
    if (chatDock.dataset.state !== "undocked") {
      const r = chatDock.getBoundingClientRect();
      dockedPos = { left: r.left, top: r.top };
      chatDock.style.left = r.left + "px";
      chatDock.style.top = Math.min(r.top, window.innerHeight - 200) + "px";
      chatDock.dataset.state = "undocked";
    }
    cDrag = { x: e.clientX - chatDock.getBoundingClientRect().left, y: e.clientY - chatDock.getBoundingClientRect().top };
    chatHead.setPointerCapture(e.pointerId);
  });
  chatHead.addEventListener("pointermove", (e) => {
    if (!cDrag || !chatHead.hasPointerCapture(e.pointerId)) return;
    const x = Math.max(0, Math.min(window.innerWidth - 120, e.clientX - cDrag.x));
    const y = Math.max(0, Math.min(window.innerHeight - 60, e.clientY - cDrag.y));
    chatDock.style.left = x + "px";
    chatDock.style.top = y + "px";
  });
  ["pointerup", "pointercancel"].forEach((ev) =>
    chatHead.addEventListener(ev, () => {
      if (cDrag) {
        const r = chatDock.getBoundingClientRect();
        dockedPos = { left: r.left, top: r.top };
      }
      cDrag = null;
    })
  );

  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    chatSay("You", text.replace(/</g, "&lt;"));
    chatInput.value = "";
    // Local echo until the live backend lands — honest, never faked as live.
    setTimeout(() => chatSay(null, "Noted — the booth answers back when we're live.", true), 900);
  });

  /* ============================================================
     adWorm — 8 blocks, gentle circuit, NO flashing ever
     The traveler highlights one block at a time, slow fade only.
     ============================================================ */
  const adworm = cfg.adworm || {};
  const allBlocks = [];
  document.querySelectorAll("[data-adworm]").forEach((el) => {
    const id = el.dataset.adworm;
    const isCorner = id.startsWith("corner-");
    const list = isCorner ? (adworm.corners || []) : (adworm.banners || []);
    const meta = list.find((b) => b.id === id) || {};
    el.innerHTML = `<a href="#advertise"><span>AD — ${meta.label || id}<br />Your Pop here · ${adworm.popPrice || "$5.99"}</span></a>`;
    allBlocks.push(el);
  });
  if (!reduced && allBlocks.length > 1) {
    let traveler = 0;
    setInterval(() => {
      allBlocks.forEach((b) => b.classList.remove("traveling"));
      traveler = (traveler + 1) % allBlocks.length;
      allBlocks[traveler].classList.add("traveling");
    }, 6000); // slow circuit: side → top → bottom → back
  }

  /* ============================================================
     FORMS — front-end only until backends are wired (see README)
     ============================================================ */
  function wireForm(formId, msgId, okText) {
    const form = $(formId), msg = $(msgId);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      // TODO: POST to backend (Cloudflare Worker + D1/KV, or form service).
      msg.hidden = false;
      msg.textContent = okText(form);
      form.reset();
    });
  }
  /* Request line is subscriber-only: gate behind signup (cybercrowd-list). */
  try {
    const list = JSON.parse(localStorage.getItem("cybercrowd-list") || "[]");
    if (!list.length) {
      const form = $("requestForm"), gate = $("requestGate");
      if (form) form.hidden = true;
      if (gate) gate.hidden = false;
    }
  } catch (_) {}
  wireForm("requestForm", "formMsg", (f) => {
    const song = f.querySelector("#reqSong").value.trim();
    const name = f.querySelector("#reqName").value.trim() || "Midnight caller";
    return `Got it, ${name} — "${song}" is in the crate-digging queue. The booth answers back on the air.`;
  });
  wireForm("donorForm", "donorMsg", (f) => {
    const rec = f.querySelector("#donorRecord").value.trim();
    const name = f.querySelector("#donorName").value.trim();
    const donors = loadDonors();
    donors.unshift({ name: name.replace(/</g, "&lt;"), record: rec.replace(/</g, "&lt;") });
    try { localStorage.setItem(DONOR_KEY, JSON.stringify(donors.slice(0, 60))); } catch (_) {}
    renderDonors();
    return `Logged, ${name} — "${rec}" is on the caretaker's desk. Your plaque is on the wall.`;
  });
  wireForm("emailForm", "emailMsg", () =>
    "You're on the list — the Sunday caretaker letter lands weekly."
  );

  $("advertiseBtn").addEventListener("click", () =>
    say("Tell the booth which block you want — Pops start at $5.99.")
  );
})();
