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

  /* ---------- day-aware hero ---------- */
  function standbyText() {
    if (todayShow) return `Today is ${DAY_NAMES[day]} — ${todayShow.name} · ${todayShow.time}`;
    return "Standby — the needle drops when we go live";
  }
  const heroNowPlaying = $("nowPlaying");
  if (heroNowPlaying) heroNowPlaying.textContent = standbyText();

  /* ---------- retired segments ---------- */
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

  /* ---------- donor wall ---------- */
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
     THE RECEIVER — one-button player
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
    const streamUrl = (cfg.streamUrl || "").trim();
    if (!streamUrl) {
      if (!window.CCRadioDJ) {
        say("Player not loaded yet — try again in a moment.");
        return;
      }
      if (window.CCRadioDJ.isStopped()) {
        window.CCRadioDJ.start(nowPlaying);
        setLive(true);
        say("Cybercrowd Radio is on the air!");
      } else {
        window.CCRadioDJ.stop();
        setLive(false);
        say("Radio paused.");
      }
      playBtn.setAttribute("aria-label", window.CCRadioDJ.isStopped() ? "Play the radio" : "Pause the radio");
      return;
    }
    const url = streamUrl;
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
      }
    } catch (_) {
      setLive(false);
      say("Couldn't reach the stream — it may be offline. Try again in a bit.");
    }
  });

  /* ============================================================
     3 BROADCAST MODES
     ============================================================ */
  const modeAIDJ = $("modeAIDJ");
  const modeStraight = $("modeStraight");
  const modeLive = $("modeLive");
  let bcastMode = "aidj";
  let straightAudio = null;
  let liveAudio = null;

  function stopAllModes() {
    if (window.CCRadioDJ && !window.CCRadioDJ.isStopped()) window.CCRadioDJ.stop();
    if (straightAudio) { try { straightAudio.pause(); } catch (e) {} straightAudio = null; }
    if (liveAudio) { try { liveAudio.pause(); } catch (e) {} liveAudio = null; }
    if (audio) { try { audio.pause(); } catch (e) {} audio = null; }
  }
  function setModeButtons(mode) {
    bcastMode = mode;
    [[modeAIDJ, "aidj"], [modeStraight, "straight"], [modeLive, "live"]].forEach(([btn, m]) => {
      if (!btn) return;
      const on = m === mode;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }
  async function playStraight() {
    try {
      const r = await fetch("/now");
      const now = await r.json();
      if (!now.id) { nowPlaying.textContent = "No tracks in the bucket."; return; }
      nowPlaying.textContent = now.title;
      straightAudio = new Audio("/t/" + now.id);
      straightAudio.addEventListener("ended", () => { if (bcastMode === "straight" && playing) playStraight(); });
      straightAudio.addEventListener("error", () => { if (bcastMode === "straight" && playing) setTimeout(playStraight, 3000); });
      await straightAudio.play();
    } catch (e) {
      nowPlaying.textContent = "Couldn't reach the station — retrying…";
      setTimeout(() => { if (bcastMode === "straight" && playing) playStraight(); }, 5000);
    }
  }
  async function playLiveStandby() {
    try {
      const r = await fetch("/station-id");
      const sid = await r.json();
      if (!sid.id) { nowPlaying.textContent = "No station ID found."; return; }
      nowPlaying.textContent = "STANDBY — " + sid.title + " (on repeat)";
      liveAudio = new Audio("/t/" + sid.id);
      liveAudio.loop = true;
      await liveAudio.play();
    } catch (e) {
      nowPlaying.textContent = "Standby…";
    }
  }
  function switchMode(mode) {
    const wasPlaying = playing;
    stopAllModes();
    setLive(false);
    setModeButtons(mode);
    if (!wasPlaying) return;
    if (mode === "aidj" && window.CCRadioDJ) {
      window.CCRadioDJ.start(nowPlaying);
      setLive(true);
    } else if (mode === "straight") {
      setLive(true);
      playStraight();
    } else if (mode === "live") {
      const url = (cfg.streamUrl || "").trim();
      if (url) {
        audio = new Audio(url);
        audio.play().then(() => setLive(true)).catch(() => setLive(false));
      } else {
        setLive(true);
        playLiveStandby();
      }
    }
  }
  if (modeAIDJ) modeAIDJ.addEventListener("click", () => switchMode("aidj"));
  if (modeStraight) modeStraight.addEventListener("click", () => switchMode("straight"));
  if (modeLive) modeLive.addEventListener("click", () => switchMode("live"));

  /* Crowd Cam queue */
  const putMeOnBtn = $("putMeOnBtn");
  const putMeOnStatus = $("putMeOnStatus");
  if (putMeOnBtn) putMeOnBtn.addEventListener("click", () => {
    if (putMeOnStatus) {
      putMeOnStatus.hidden = false;
      putMeOnStatus.textContent = "You're in the queue — Sonny Daze picks who's on.";
    }
    putMeOnBtn.disabled = true;
    putMeOnBtn.textContent = "IN THE QUEUE";
  });

  /* Kinetic talk break */
  const kineticSay = $("kineticSay");
  const kineticSayBtn = $("kineticSayBtn");
  if (kineticSayBtn) kineticSayBtn.addEventListener("click", () => {
    const text = (kineticSay.value || "").trim();
    if (!text) return;
    stopAllModes();
    setLive(false);
    const done = () => {
      if (kineticSay) kineticSay.value = "";
      if (bcastMode === "aidj" && window.CCRadioDJ) {
        window.CCRadioDJ.start(nowPlaying);
        setLive(true);
      } else if (bcastMode === "straight") {
        setLive(true);
        playStraight();
      }
    };
    if (!('speechSynthesis' in window)) { done(); return; }
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.onend = done;
      u.onerror = done;
      setTimeout(() => { try { window.speechSynthesis.cancel(); } catch (e) {} done(); }, 30000);
      window.speechSynthesis.speak(u);
    } catch (e) { done(); }
  });

  /* GONG IT */
  const gongBtn = $("gongBtn");
  function speakAsKinetic(text, done) {
    if (!('speechSynthesis' in window)) { done(); return; }
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.onend = done;
      u.onerror = done;
      setTimeout(() => { try { window.speechSynthesis.cancel(); } catch (e) {} done(); }, 30000);
      window.speechSynthesis.speak(u);
    } catch (e) { done(); }
  }
  if (gongBtn) gongBtn.addEventListener("click", () => {
    const text = (kineticSay.value || "").trim();
    stopAllModes();
    setLive(false);
    const resume = () => {
      if (kineticSay) kineticSay.value = "";
      if (bcastMode === "aidj" && window.CCRadioDJ) {
        window.CCRadioDJ.next();
        if (window.CCRadioDJ.isStopped()) window.CCRadioDJ.start(nowPlaying);
        setLive(true);
      } else if (bcastMode === "straight") {
        setLive(true);
        playStraight();
      }
    };
    if (text) { speakAsKinetic(text, resume); }
    else { setTimeout(resume, 800); }
  });

  /* ============================================================
     STUDIO BROADCAST
     ============================================================ */
  const studioUrl = $("studioStreamUrl");
  const goLiveBtn = $("goLiveBtn");
  const goOffAirBtn = $("goOffAirBtn");
  const studioStatus = $("studioStatus");
  try {
    const saved = localStorage.getItem("cc-studio-url") || "";
    if (saved && studioUrl) studioUrl.value = saved;
    if (saved) cfg.streamUrl = saved;
  } catch (e) {}
  function setStudioLive(on) {
    if (goLiveBtn) goLiveBtn.hidden = on;
    if (goOffAirBtn) goOffAirBtn.hidden = !on;
    if (studioStatus) {
      studioStatus.textContent = on
        ? "ON AIR — you're broadcasting live from the studio."
        : "Standby — paste your stream URL and hit GO LIVE.";
      studioStatus.classList.toggle("live", on);
    }
  }
  if (goLiveBtn) goLiveBtn.addEventListener("click", () => {
    const url = (studioUrl.value || "").trim();
    if (!url) {
      if (studioStatus) studioStatus.textContent = "Paste your stream URL first.";
      return;
    }
    cfg.streamUrl = url;
    try { localStorage.setItem("cc-studio-url", url); } catch (e) {}
    if (window.CCRadioDJ && !window.CCRadioDJ.isStopped()) window.CCRadioDJ.stop();
    setLive(true);
    setStudioLive(true);
    say("You're live from the studio!");
  });
  if (goOffAirBtn) goOffAirBtn.addEventListener("click", () => {
    cfg.streamUrl = "";
    try { localStorage.removeItem("cc-studio-url"); } catch (e) {}
    if (studioUrl) studioUrl.value = "";
    setLive(false);
    setStudioLive(false);
    say("Off air — Sonny Daze is back on the bucket.");
  });
  setStudioLive(!!(cfg.streamUrl || "").trim());

  /* ---------- share ---------- */
  function getRefCode() {
    try {
      var code = localStorage.getItem("ccr_ref");
      if (!code) {
        code = "r" + Math.random().toString(36).slice(2, 8);
        localStorage.setItem("ccr_ref", code);
      }
      return code;
    } catch (_) { return "rshare"; }
  }
  var shareBtn = $("shareBtn");
  if (shareBtn) {
    shareBtn.addEventListener("click", async () => {
      var url = location.origin + location.pathname + "?ref=" + getRefCode();
      var data = { title: "Cybercrowd Radio", text: "Cybercrowd Radio is live.", url: url };
      try {
        if (navigator.share) { await navigator.share(data); say("Shared!"); }
        else { await navigator.clipboard.writeText(url); say("Link copied — share it!"); }
      } catch (_) {
        try { await navigator.clipboard.writeText(url); say("Link copied — share it!"); } catch (_) {}
      }
    });
  }
})();
