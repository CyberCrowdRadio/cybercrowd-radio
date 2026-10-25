/* CYBERCROWD RADIO — song ratings only.
   One job: song ratings.
   What it is: Like, Hate and Background votes for the song now
   playing, saved by song, with a percent-like readout, and the
   Kinetic announce script that reads those votes between songs.
   Authority: ratings only. Owns votes. Kinetic announce reads
   ratings, it does not own votes.
   Uses $ from cc-base.js, stone 1. Uses nowPlaying from
   cc-receiver.js, stone 14, loaded before this file. Calls say()
   from cc-toast.js, stone 5, loaded before this file, only on a tap.
   Source: app.js lines 424-473, cut out whole, IIFE indent removed.
   Local file is 995 lines; the plan lists 1001 lines, so local line
   numbers run about 6 lines lower than the plan after the early
   sections. The cut follows section content, not the plan numbers
   blindly, and no line is used in two stones.
   Guard added for the cut: the song id falls back to "current"
   if the now-playing element is not on this page. Original line
   assumed nowPlaying exists. When it exists, effect is identical.
   This file alone does nothing visible until the loader switch after stone 29.
   Stone 16 of 29. Station still runs on app.js until that switch.
*/
"use strict";
/* Song ratings: A=Like, B=Hate, C=Background. Kinetic announces results on air. */
const RATE_KEY = "ccr-ratings";
function loadRatings() {
  try { return JSON.parse(localStorage.getItem(RATE_KEY) || "{}"); }
  catch (_) { return {}; }
}
function saveRating(songId, vote) {
  try {
    const r = loadRatings();
    if (!r[songId]) r[songId] = { like: 0, hate: 0, bg: 0 };
    r[songId][vote]++;
    localStorage.setItem(RATE_KEY, JSON.stringify(r));
  } catch (_) {}
}
function getRatingPct(songId) {
  const r = loadRatings()[songId];
  if (!r) return null;
  const total = r.like + r.hate + r.bg;
  if (!total) return null;
  return Math.round((r.like / total) * 100);
}
["rateLike", "rateHate", "rateBg"].forEach((id, i) => {
  const btn = $(id);
  if (!btn) return;
  btn.addEventListener("click", () => {
    const songId = (nowPlaying ? nowPlaying.textContent : "") || "current";
    const votes = ["like", "hate", "bg"];
    saveRating(songId, votes[i]);
    const pct = getRatingPct(songId);
    say(pct !== null ? `${pct}% like this one.` : "Vote counted.");
    btn.disabled = true;
    setTimeout(() => { btn.disabled = false; }, 5000);
  });
});
// Kinetic announces rating + comment between songs.
window.CCKineticAnnounce = function (songTitle, comment) {
  const r = loadRatings()[songTitle];
  let script = "";
  if (r) {
    const total = r.like + r.hate + r.bg;
    if (total > 0) {
      // % who voted = has opinion (simplified: total votes vs baseline)
      script += `${total}% has opinion. `;
    }
  }
  if (comment) {
    script += `A listener says: ${comment}. `;
  }
  return script;
};
window.CC_RATINGS_LOADED = true;
