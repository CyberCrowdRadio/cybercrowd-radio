# Cybercrowd Radio

**A museum with a transmitter.** Caretaker. Archive. Receiver of lost LPs.

Live internet radio station site — zero build step. Deploys straight to
**Cloudflare Pages** from this repo.

## Rule #3: flat files, plug and play

No nested folders. One file, one authority, one function:

| File          | Authority              | Function                                        |
|---------------|------------------------|-------------------------------------------------|
| `index.html`  | Page structure         | Markup only — no styling, no logic              |
| `style.css`   | All visual design      | Every color, font, layout, animation            |
| `config.js`   | All station content    | Name, stream, cameras, shows, tiers, adWorm     |
| `app.js`      | All behavior           | Receiver, easel, chat dock, forms, adWorm       |
| `README.md`   | Docs                   | This file                                       |
| `station-doctrine.md` | Station law      | James's vision, in his words — dated prior art  |

**To change content without touching the code:** edit `config.js`.
Station name, stream URL, cameras, ticker, shows, retired segments,
memberships, archive info, and adWorm pricing all live there.

## The station's organs

- **The receiver** — 1950s-style tuner. Honest offline state until `streamUrl` is set.
- **The easel** — 2×2 draggable video canvas + camera selector strip. Touch-hold-drag-let-go.
- **The chat dock** — open / closed / undocked-and-draggable. Mobile `>` opens full-screen chat.
- **The archive** — mail-in LP donor logging. Every play credits the donor by name.
- **Request line** — requests + dedications. Two-way, always.
- **Join** — membership tiers + email capture. Stripe not wired yet (see below).
- **adWorm** — 8 blocks (4 corners + 4 banners). No flashing, ever.

## Honest backend status (2026-10-10)

Nothing here pretends to be live. Each of these is a real surface waiting
for its backend:

| Surface            | Status | What's needed |
|--------------------|--------|---------------|
| Live stream player | Offline (honest) | Audio streaming server undecided — paste the Icecast/Shoutcast mount into `streamUrl` in `config.js` when ready |
| Video cameras      | Placeholder labels | Camera feed sources not established — wire into the easel squares when live |
| Live channels      | Empty | Channel/playlist sources not established — add entries to `channels` in `config.js` |
| Request line       | Front-end only | POST target undecided — Cloudflare Worker + D1/KV, or a form service |
| Donor log          | Front-end only | Same as request line |
| Email capture      | Front-end only | Email service undecided |
| Memberships/Stripe | Email-only | `stripePublishableKey` is empty — paste the key when Stripe is configured |
| Chat               | Local echo | Live chat backend not built — messages stay on the page |
| CybercrowdCoin tipping | Disabled | Planned, not live |
| 15-sec teaser      | Noted in UI | Teaser clip not produced — "one 15 secs is the teaser and the live is the show" |

## Going live: setting the stream URL

In `config.js`:

```js
streamUrl: "https://stream.example.com:8000/live",
```

Leave it empty (`""`) and the receiver shows an honest offline state.

## Deploy (GitHub → Cloudflare Pages)

1. Push this repo to GitHub.
2. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
3. Select this repo. Build settings: **no build command**, **output directory: `/`**.
4. **Custom domains** → add `cybercrowdradio.com` (already in this Cloudflare account).

Every `git push` redeploys automatically.

## Backup rule

Never let a platform hold the only copy. This directory is the local backup —
`~/workspace/cybercrowd-radio/`. The GitHub account `cybercrowd99` was
suspended 2026-09-25 (ticket 4837502); until it lifts, this folder is the
source of truth.

## Prior art

`station-doctrine.md` is dated 2026-10-09 and holds James's vision in his
words. It is not rewritten by builds — builds serve it.
