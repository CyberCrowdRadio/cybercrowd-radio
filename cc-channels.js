/* CYBERCROWD RADIO — channels only.
   One job: the channels wall.
   What it is: the channel cards, each card with a channel name and its kind.
   If no channel feed is connected, the wall shows the empty message that the
   channels go live when the studio does. Tapping a card says that channel
   opens here when the feed connects.
   Authority: channels only. Owns channels grid rendering, nothing else.
   Uses $ and cfg from cc-base.js, stone 1, loaded before this file.
   Calls say() from cc-toast.js, stone 5, loaded before this file, only on
   a tap, after all stones load.
   Source: app.js lines 174-195, cut out whole.
   Guard: if the channels grid is not on this page, do nothing.
   This file alone does nothing visible until the loader switch after stone 29.
   Stone 10 of 29. Station still runs on app.js until that switch.
*/
"use strict";
const channelsGrid = $("channelsGrid");
if (channelsGrid) {
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
} // end if (channelsGrid) — channels live on channels.html now
window.CC_CHANNELS_LOADED = true;
