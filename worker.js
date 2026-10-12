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
async function turnstileOk(token, secret, ip) {
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST", body: form,
  });
  const data = await res.json();
  return !!data.success;
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
  return res.ok;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/verify-turnstile" && request.method === "POST") {
      try {
        const body = await request.json();
        const ok = body && body.token
          ? await turnstileOk(body.token, env.TURNSTILE_SECRET_KEY, request.headers.get("CF-Connecting-IP"))
          : false;
        return Response.json({ success: ok });
      } catch (e) {
        return Response.json({ success: false }, { status: 500 });
      }
    }

    if (url.pathname === "/api/signup" && request.method === "POST") {
      try {
        const body = await request.json();
        const email = (body && body.email || "").trim().toLowerCase();
        const handle = (body && body.handle || "").trim();
        if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
          return Response.json({ success: false, error: "bad email" }, { status: 400 });
        }
        const human = body && body.turnstileToken
          ? await turnstileOk(body.turnstileToken, env.TURNSTILE_SECRET_KEY, request.headers.get("CF-Connecting-IP"))
          : false;
        if (!human) {
          return Response.json({ success: false, error: "not human" }, { status: 403 });
        }
        const token = await makeVerifyToken(email, env.EMAIL_SIGNING_SECRET);
        const link = url.origin + "/verify.html?token=" + encodeURIComponent(token);
        const sent = await sendVerificationEmail(env.POSTMARK_SERVER_TOKEN, email, link, handle);
        if (!sent) {
          return Response.json({ success: false, error: "email failed" }, { status: 502 });
        }
        return Response.json({ success: true });
      } catch (e) {
        return Response.json({ success: false }, { status: 500 });
      }
    }

    if (url.pathname === "/api/verify-email" && request.method === "GET") {
      const email = await checkVerifyToken(url.searchParams.get("token") || "", env.EMAIL_SIGNING_SECRET || "");
      return Response.json(email ? { success: true, email } : { success: false });
    }

    return env.ASSETS.fetch(request);
  },
};
