/* POST /api/signup
 * Receives { email, turnstileToken, handle }, verifies human, sends confirmation via Postmark.
 * Env vars (set in Cloudflare dashboard): POSTMARK_API_KEY, POSTMARK_FROM_EMAIL, TURNSTILE_SECRET_KEY
 */
export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ success: false, error: 'bad request' }, 400);
  }

  const email = (body.email || '').trim().toLowerCase();
  const handle = (body.handle || '').trim();
  const turnstileToken = body.turnstileToken || '';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ success: false, error: 'invalid email' }, 400);
  }

  // Verify Turnstile (if secret is configured)
  const turnstileSecret = env.TURNSTILE_SECRET_KEY;
  if (turnstileSecret && turnstileToken) {
    try {
      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${encodeURIComponent(turnstileSecret)}&response=${encodeURIComponent(turnstileToken)}`,
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        return json({ success: false, error: 'not human', codes: verifyData['error-codes'] || [] }, 403);
      }
    } catch (e) {
      // If verification fails, continue anyway (don't block signup on verify error)
    }
  }

  const apiKey = env.POSTMARK_API_KEY;
  const fromEmail = env.POSTMARK_FROM_EMAIL || 'noreply@cybercrowdradio.com';

  if (!apiKey) {
    return json({ success: false, error: 'email service not configured', pmStatus: 'no-key' }, 500);
  }

  const token = crypto.randomUUID();
  const verifyUrl = `https://cybercrowdradio.com/verify.html?token=${token}&email=${encodeURIComponent(email)}`;

  try {
    const res = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': apiKey,
      },
      body: JSON.stringify({
        From: fromEmail,
        To: email,
        Subject: 'Confirm your Cybercrowd Radio signup',
        HtmlBody: `
          <h1>You're almost in!</h1>
          <p>Hey ${handle || 'friend'}, confirm your email to join Cybercrowd Radio.</p>
          <p><a href="${verifyUrl}" style="background:#e9c979;color:#2a1b0b;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:bold;">Confirm My Email</a></p>
          <p>Or paste this link: ${verifyUrl}</p>
          <p>— Sonny Daze</p>
        `,
        TextBody: `Confirm your Cybercrowd Radio signup: ${verifyUrl} — Sonny Daze`,
        MessageStream: 'outbound',
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return json({ success: false, error: 'email failed', pmStatus: res.status, pmDetail: data.Message || '' }, 500);
    }

    return json({ success: true });
  } catch (e) {
    return json({ success: false, error: 'email failed', pmStatus: 'fetch-error', pmDetail: e.message }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
