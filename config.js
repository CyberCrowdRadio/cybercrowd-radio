/* ============================================================
   STATION CONFIG — edit this file, not the code.
   One file, one authority: every word the station says lives here.
   ============================================================ */
window.STATION_CONFIG = {

  /* ---------- identity ---------- */
  stationName: "Cybercrowd Radio",
  tagline: "A museum with a transmitter.",
  mission: "Caretaker. Archive. Receiver of lost LPs.",
  vaultCount: "5,500",
  dialLabel: "CYBERCROWD RADIO",

  /* ---------- Patreon (landing page money section) ----------
     Paste James's Patreon page URL here when he provides it.
     Empty ("") = the support button shows but is disabled/honest. */
  patreonUrl: "https://www.patreon.com/c/cybercrowd",

  /* ---------- CybercrowdCoin tip jar (landing page) ----------
     crwdMint: the CRWD token mint address (for the Jupiter buy link).
     crwdTipAddress: James's receive address (for the tip jar QR + copy). */
  crwdMint: "BsAPNnPmitdbVvpz3v5t9VxMbgD1pksb3Z2yDYSfmoon",
  crwdTipAddress: "D5Qg7PNgSChKxn7WQnqt8Se9qoQkXF5VcTqoWNT5ZjFR",

  /* ---------- live stream ----------
     Paste your Icecast/Shoutcast mount here when the broadcast is up,
     e.g. "https://stream.example.com:8000/live".
     Leave empty ("") and the player shows an honest offline state.
     The audio streaming server is still undecided — do not fake it. */
  streamUrl: "",

  /* ---------- Firebase (chat) ----------
     James set this up 2026-10-17 for real-time chat.
     Project: cybercrowd-radio. Enables Wade's phone and James's phone to chat. */
  firebaseConfig: {
    apiKey: "AIzaSyDimd9Ox1wfuuZGnySYaeBKz6ydiN3Ic4c",
    authDomain: "cybercrowd-radio.firebaseapp.com",
    databaseURL: "https://cybercrowd-radio-default-rtdb.firebaseio.com/",
    projectId: "cybercrowd-radio",
    storageBucket: "cybercrowd-radio.firebasestorage.app",
    messagingSenderId: "1000528907038",
    appId: "1:1000528907038:web:1d62c2a5006c2f1fc3970f",
    measurementId: "G-EXCBEMBS2L"
  },

  /* ---------- standby song ----------
     One song the play button plays when the live stream is offline.
     James's pick: the flat-earth track he uploaded 2026-10-14.
     File lives in the repo root. Change this path to swap the song. */
  standbySong: "flat-earth-nasa-writes-the-script.mp3",
  standbySongTitle: "NASA Writes the Script",

  /* ---------- live channels / playlists ----------
     YouTube-style live channel choices. Sources are not established yet —
     add channel entries here when they're real. Empty = section stays honest. */
  channels: [
    // { name: "Studio Live",  kind: "video", src: "" },
    // { name: "Vinyl Vault",  kind: "playlist", src: "" },
  ],

  /* ---------- the easel: four cameras ----------
     Labels for the 2x2 canvas. Feeds connect when the studio goes live. */
  cameras: [
    { id: "studio",    label: "Studio Cam",    desc: "The booth, live" },
    { id: "turntable", label: "Turntable Cam", desc: "Needle on wax" },
    { id: "vault",     label: "Vault Cam",     desc: "Inside the archive" },
    { id: "crowd",     label: "Crowd Cam",     desc: "The listeners" },
  ],

  /* ---------- weekly programming ----------
     day: 0=Sun … 6=Sat. start/end in 24h local time.
     Merged cycle per the station doctrine (2026-10-09).
     Times are defaults — change freely. */
  shows: [
    {
      name: "Monday Madness", days: "Monday", day: [1], start: 6, end: 10,
      time: "6AM – 10AM",
      blurb: "The week kicks the door in. Loud, loose, no setlist survives.",
    },
    {
      name: "2 for Tuesday", days: "Tuesday", day: [2], start: 18, end: 21,
      time: "6PM – 9PM",
      blurb: "4x2's — two-fers, four rounds. Two cuts, same artist, back to back.",
    },
    {
      name: "Broadside Wednesday", days: "Wednesday", day: [3], start: 20, end: 24,
      time: "8PM – 12AM",
      blurb: "B-sides only or deep cuts. No mainstream — the flipsides and the buried gold.",
    },
    {
      name: "Sonny Daze Show", days: "Thursday", day: [4], start: 20, end: 23,
      time: "8PM – 11PM",
      blurb: "James's 3-hour Sonny Daze show. Atomic Kricket rides along. \"Still Lethal\" kicks the door in.",
    },
    {
      name: "Double Barrel Fridays", days: "Friday", day: [5], start: 17, end: 19,
      time: "5PM – 7PM",
      blurb: "Double barrel: 2 songs, 2 different albums — one young, one old.",
    },
    {
      name: "Cleaning Lady Land", days: "Saturday", day: [6], start: 18, end: 19,
      time: "6PM – 7PM",
      blurb: "One-hour special. Fun songs — hips and tips.",
    },
    {
      name: "Mail-in LPs", days: "Sunday", day: [0], start: 9, end: 12,
      time: "9AM – 12PM",
      blurb: "The caretaker show. Your forgotten records, played on the air — every spin credits the donor by name. Plus Sunday gossip.",
    },
  ],

  /* ---------- retired originals — kept as segments ----------
     Never deleted. If James wants one back, it returns here. */
  retiredSegments: [
    { name: "Triple Play",        note: "Three cuts, same artist — folded into 2 for Tuesday's bloodline." },
    { name: "Atomic Kricket News", note: "The jester's news organ — returns as a segment when called." },
    { name: "Talk & Play",        note: "Loose talk, wild stories — the personality lane, resting." },
    { name: "Bible Verse & Rock", note: "Outlaw gospel — resting in the archive." },
  ],

  /* ---------- the archive: mail-in LPs ----------
     Followers mail forgotten records. Every play credits the donor
     like a museum curator: "thanks to Bobby Sue we have this for you." */
  archive: {
    headline: "Receiver of lost LPs",
    copy: "Got a forgotten record gathering dust? Mail it in. It joins the archive forever — and every time it spins on the air, your name gets the credit, like a museum plaque under the exhibit.",
    // Mailing address not set yet — add it here when ready.
    mailTo: "",
    creditFormat: "Thanks to {name}, we have this for you.",
  },

  /* ---------- memberships ----------
     Stripe is not configured yet. Tiers are real plans; the join button
     collects email until payments are wired (see README). */
  memberships: [
    {
      name: "Listener", price: "Free",
      blurb: "The signal, the shows, the request line. Always free.",
      perks: ["Live stream", "Request line", "Chat dock"],
    },
    {
      name: "Archivist", price: "$5/mo",
      blurb: "Keep the vault alive. Your name in the Hall of Donors.",
      perks: ["Everything in Listener", "Donor wall credit", "Sunday shout-out priority"],
    },
    {
      name: "Curator", price: "$15/mo",
      blurb: "A wing of the museum with your name on it.",
      perks: ["Everything in Archivist", "Dedicate a full hour", "Vote on vault pulls"],
    },
  ],
  stripePublishableKey: "", // paste when Stripe is configured — "" = join collects email only
  stripeMemberPriceId: "", // $3.99/mo membership — James creates in Stripe dashboard, pastes price ID here
  stripePortalUrl: "", // Stripe customer portal URL for cancellations

  /* ---------- station store ----------
     James makes it himself — DIY, not print-on-demand.
     Add entries here; they appear on store.html automatically.
     { name: "Shirt", blurb: "...", price: "$25", img: "merch/shirt.jpg" } */
  merch: [],

  /* ---------- Cloudflare Turnstile ----------
     Human verification on signup. Site key is public — safe to embed. */
  turnstileSiteKey: "0x4AAAAAAFT4WC4u5rb2Gr56",

  /* ---------- CybercrowdCoin tipping ----------
     Planned. Not live yet. */
  tipping: { enabled: false, coin: "CybercrowdCoin" },

  /* ---------- adWorm ----------
     James's design. 8 independent blocks: 4 corner squares + 4 long banners.
     One block/lane = a "Pop" ($5.99). Never "booster." No flashing, ever.
     Client dashboard reports per-block performance + aggregate demographics —
     never who clicked. */
  adworm: {
    popPrice: "$5.99",
    cornersPrice: "$20/mo",
    allEightPrice: "$300/mo",
    corners: [
      { id: "corner-nw", label: "Corner NW" },
      { id: "corner-ne", label: "Corner NE" },
      { id: "corner-sw", label: "Corner SW" },
      { id: "corner-se", label: "Corner SE" },
    ],
    banners: [
      { id: "banner-top",    label: "Banner — Top" },
      { id: "banner-mid",    label: "Banner — Mid" },
      { id: "banner-lower",  label: "Banner — Lower" },
      { id: "banner-foot",   label: "Banner — Foot" },
    ],
  },

  /* ---------- ticker ---------- */
  ticker: [
    "A museum with a transmitter",
    "5,500 LPs deep",
    "Caretaker of lost wax",
    "Every donor credited by name",
    "Two-way, always",
    "Real humans, real vinyl",
  ],
};
