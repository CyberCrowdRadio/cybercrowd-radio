/* Cybercrowd Radio — edge worker.
   Serves the static station site, validates Turnstile tokens server-side,
   and sends signup verification emails through Postmark. */

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; /* verification links live 24h */

/* ---- Signed verification tokens (HMAC, no KV needed) ---- */
function b64urlEncode(str) {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return atob(s);
}
async function hmacKey(secret) {
  return crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
}
function hex(bytes) {
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, "0")).join("");
}
async function makeVerifyToken(email, secret) {
  const expiry = Date.now() + TOKEN_TTL_MS;
  const data = email + "." + expiry;
  const sig = hex(await crypto.subtle.sign("HMAC", await hmacKey(secret), new TextEncoder().encode(data)));
  return b64urlEncode(data + "." + sig);
}
async function checkVerifyToken(token, secret) {
  try {
    const raw = b64urlDecode(token);
    const parts = raw.split(".");
    const sig = parts.pop();
    const expiry = parts.pop();
    const email = parts.join(".");
    if (!email || !expiry || !sig) return null;
    if (Date.now() > parseInt(expiry, 10)) return null;
    const data = email + "." + expiry;
    const expected = hex(await crypto.subtle.sign("HMAC", await hmacKey(secret), new TextEncoder().encode(data)));
    if (expected !== sig.toLowerCase()) return null;
    return email;
  } catch (e) {
    return null;
  }
}

/* ---- Turnstile server-side check ---- */
async function turnstileCheck(token, secret, ip) {
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST", body: form,
    });
    const data = await res.json();
    return { ok: !!data.success, codes: data["error-codes"] || [] };
  } catch (e) {
    return { ok: false, codes: ["fetch-failed"] };
  }
}

/* ---- Postmark send ---- */
async function sendVerificationEmail(serverToken, to, link, handle) {
  const res = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": serverToken,
    },
    body: JSON.stringify({
      From: "welcome@cybercrowdradio.com",
      To: to,
      Subject: "Confirm your Cybercrowd Radio signup",
      HtmlBody:
        "<p>Welcome" + (handle ? ", " + handle : "") + ".</p>" +
        "<p>One tap and you're on the list:</p>" +
        "<p><a href=\"" + link + "\">Confirm my email</a></p>" +
        "<p>This link expires in 24 hours.</p>" +
        "<p>— Cybercrowd Radio</p>",
      TextBody:
        "Welcome" + (handle ? ", " + handle : "") + ".\n\n" +
        "Confirm your email:\n" + link + "\n\n" +
        "This link expires in 24 hours.\n\n— Cybercrowd Radio",
      MessageStream: "outbound",
    }),
  });
  let detail = "";
  try { detail = await res.text(); } catch (e) {}
  return { ok: res.ok, status: res.status, detail: detail.slice(0, 200) };
}

/* ---- Sonny Daze stream: serve audio from R2. Bucket IS the playlist. ---- */
const MUSIC_PREFIX = 'full/';
const STATION_EPOCH = new Date('2026-10-14T00:00:00-05:00').getTime();

function parseRange(header, size) {
  var m = header.match(/bytes=(\d*)-(\d*)/);
  if (!m) return null;
  var start = m[1] === '' ? null : parseInt(m[1], 10);
  var end = m[2] === '' ? null : parseInt(m[2], 10);
  if (start === null && end === null) return null;
  if (start === null) { start = size - end; end = size - 1; }
  if (end === null || end >= size) end = size - 1;
  if (start >= size || start > end) return null;
  return { start: start, end: end };
}
function contentTypeFor(key) {
  var k = key.toLowerCase();
  if (k.endsWith('.m4a')) return 'audio/mp4';
  if (k.endsWith('.mp3')) return 'audio/mpeg';
  if (k.endsWith('.wav')) return 'audio/wav';
  if (k.endsWith('.ogg')) return 'audio/ogg';
  if (k.endsWith('.mp4')) return 'video/mp4';
  return 'application/octet-stream';
}
function isAudioKey(key) {
  var k = key.toLowerCase();
  return k.endsWith('.mp3') || k.endsWith('.m4a') || k.endsWith('.wav') || k.endsWith('.ogg') || k.endsWith('.mp4');
}
function estimateDuration(size) {
  var s = Math.round(size / 16000);
  if (s < 30) s = 30;
  if (s > 1200) s = 1200;
  return s;
}
function titleFromKey(key) {
  var name = key.slice(MUSIC_PREFIX.length);
  var dot = name.lastIndexOf('.');
  if (dot > 0) name = name.slice(0, dot);
  return name.replace(/[_-]+/g, ' ').trim() || name;
}
let _rotation = null, _rotationAt = 0;
async function getRotation(env) {
  var now = Date.now();
  if (_rotation && (now - _rotationAt) < 60000) return _rotation;
  var tracks = [], cursor = undefined, n = 0;
  while (true) {
    var res = await env.MEDIA.list({ prefix: MUSIC_PREFIX, cursor: cursor, limit: 1000 });
    for (var i = 0; i < res.objects.length; i++) {
      var o = res.objects[i];
      if (!isAudioKey(o.key)) continue;
      tracks.push({ id: String(n++), title: titleFromKey(o.key), duration: estimateDuration(o.size), key: o.key });
    }
    if (res.truncated) { cursor = res.cursor; } else { break; }
  }
  tracks.sort(function (a, b) { return a.key < b.key ? -1 : a.key > b.key ? 1 : 0; });
  for (var j = 0; j < tracks.length; j++) tracks[j].id = String(j);
  _rotation = tracks; _rotationAt = now;
  return tracks;
}
function jsonResp(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*' },
  });
}
async function nowPlaying(env) {
  var tracks = await getRotation(env);
  if (!tracks.length) return jsonResp({ error: 'no tracks in bucket' }, 503);
  var elapsed = Math.floor((Date.now() - STATION_EPOCH) / 1000);
  var total = 0, i;
  for (i = 0; i < tracks.length; i++) total += tracks[i].duration;
  if (total <= 0) total = 1;
  var pos = ((elapsed % total) + total) % total;
  for (i = 0; i < tracks.length; i++) {
    var d = tracks[i].duration;
    if (pos < d) return jsonResp({ id: tracks[i].id, title: tracks[i].title, offset: pos, duration: d });
    pos -= d;
  }
  return jsonResp({ id: tracks[0].id, title: tracks[0].title, offset: 0, duration: tracks[0].duration });
}
async function streamTrack(request, env, id) {
  var tracks = await getRotation(env);
  var track = tracks[parseInt(id, 10)];
  if (!track) return new Response('Not found', { status: 404 });
  var key = track.key;
  var head = await env.MEDIA.head(key);
  if (!head) return new Response('Not found', { status: 404 });
  var size = head.size, rangeHeader = request.headers.get('range');
  if (rangeHeader) {
    var r = parseRange(rangeHeader, size);
    if (!r) return new Response('Range not satisfiable', { status: 416, headers: { 'Content-Range': 'bytes */' + size } });
    var obj = await env.MEDIA.get(key, { range: { offset: r.start, length: r.end - r.start + 1 } });
    var s = obj.range.offset, e = obj.range.offset + obj.range.length - 1;
    var headers = new Headers();
    headers.set('Content-Type', contentTypeFor(key));
    headers.set('Content-Range', 'bytes ' + s + '-' + e + '/' + obj.size);
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Content-Length', String(obj.range.length));
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('Access-Control-Allow-Origin', '*');
    return new Response(obj.body, { status: 206, headers: headers });
  }
  var full = await env.MEDIA.get(key);
  var fullHeaders = new Headers();
  fullHeaders.set('Content-Type', contentTypeFor(key));
  fullHeaders.set('Accept-Ranges', 'bytes');
  fullHeaders.set('Content-Length', String(full.size));
  fullHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
  fullHeaders.set('Access-Control-Allow-Origin', '*');
  return new Response(full.body, { status: 200, headers: fullHeaders });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    /* Sonny Daze stream routes — served from the R2 bucket, no manifest. */
    if (url.pathname === '/now') {
      return nowPlaying(env);
    }
    if (url.pathname === '/station-id') {
      var tracks = await getRotation(env);
      for (var si = 0; si < tracks.length; si++) {
        if (tracks[si].title.toLowerCase().indexOf('cybercrowd radio') >= 0) {
          return jsonResp({ id: tracks[si].id, title: tracks[si].title, duration: tracks[si].duration });
        }
      }
      return jsonResp({ error: 'no station id found' }, 404);
    }
    if (url.pathname === '/tracks') {
      var allTracks = await getRotation(env);
      return jsonResp(allTracks.map(function (t) {
        return { id: t.id, title: t.title, duration: t.duration };
      }));
    }
    var tm = url.pathname.match(/^\/t\/(\d+)$/);
    if (tm) {
      return streamTrack(request, env, tm[1]);
    }

    /* Standalone Turnstile check (kept for diagnostics). */
    if (url.pathname === "/api/verify-turnstile" && request.method === "POST") {
      try {
        const body = await request.json();
        const check = body && body.token
          ? await turnstileCheck(body.token, env.TURNSTILE_SECRET_KEY, request.headers.get("CF-Connecting-IP"))
          : { ok: false, codes: ["no-token"] };
        return Response.json({ success: check.ok, codes: check.codes });
      } catch (e) {
        return Response.json({ success: false, codes: ["exception"] }, { status: 500 });
      }
    }

    /* Signup: verify human, then send the verification email. */
    if (url.pathname === "/api/signup" && request.method === "POST") {
      try {
        const body = await request.json();
        const email = (body && body.email || "").trim().toLowerCase();
        const handle = (body && body.handle || "").trim();
        if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
          return Response.json({ success: false, error: "bad email" }, { status: 400 });
        }
        const human = body && body.turnstileToken
          ? await turnstileCheck(body.turnstileToken, env.TURNSTILE_SECRET_KEY, request.headers.get("CF-Connecting-IP"))
          : { ok: false, codes: ["no-token"] };
        if (!human.ok) {
          return Response.json({ success: false, error: "not human", codes: human.codes }, { status: 403 });
        }
        const token = await makeVerifyToken(email, env.EMAIL_SIGNING_SECRET);
        const link = url.origin + "/verify.html?token=" + encodeURIComponent(token);
        const sent = await sendVerificationEmail(env.POSTMARK_SERVER_TOKEN, email, link, handle);
        if (!sent.ok) {
          return Response.json({ success: false, error: "email failed", pmStatus: sent.status, pmDetail: sent.detail }, { status: 502 });
        }
        return Response.json({ success: true });
      } catch (e) {
        return Response.json({ success: false }, { status: 500 });
      }
    }

    /* Email link confirmation. */
    if (url.pathname === "/api/verify-email" && request.method === "GET") {
      const email = await checkVerifyToken(url.searchParams.get("token") || "", env.EMAIL_SIGNING_SECRET || "");
      return Response.json(email ? { success: true, email } : { success: false });
    }

    /* Everything else: the static station site. */
    return env.ASSETS.fetch(request);
  },
};
