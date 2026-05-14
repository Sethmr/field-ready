// Cloudflare Pages Function — POST /api/log
//
// Accepts a session-end state snapshot from the client and writes it to the
// LOGS_KV namespace, keyed by device + timestamp so multiple devices stay
// distinguishable and we keep a time-ordered history per device.
//
// Bindings required (Pages dashboard → Settings → Functions):
//   - LOGS_KV   KV namespace
//
// No auth on this endpoint by design — only Brandi's browser will hit it in
// practice, the site isn't advertised, and the data is non-sensitive
// flashcard ratings. If abuse becomes a problem, gate behind Cloudflare
// Turnstile or a rolling client-side token.

export async function onRequestPost({ request, env }) {
  if (!env.LOGS_KV) {
    return json({ ok: false, error: "LOGS_KV binding missing — set it in Pages → Settings → Functions" }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "invalid JSON body" }, 400);
  }

  if (!body || typeof body.deviceId !== "string" || body.deviceId.length < 8) {
    return json({ ok: false, error: "missing or invalid deviceId" }, 400);
  }

  // Defensive: cap stored payload at 256 KB. A normal payload is ~20-40 KB.
  const payloadStr = JSON.stringify(body);
  if (payloadStr.length > 256 * 1024) {
    return json({ ok: false, error: "payload too large" }, 413);
  }

  const ts = Number.isFinite(body.ts) ? body.ts : Date.now();
  const key = `log:${body.deviceId}:${String(ts).padStart(15, "0")}`;

  // Stash a few useful pointers in KV metadata so list() responses are richer
  // and we can drop the value-fetch in admin views if we ever care to.
  const metadata = {
    deviceId: body.deviceId,
    name: body.name || null,
    ts,
    answerLogLen: Array.isArray(body.state?.answerLog) ? body.state.answerLog.length : 0,
    streak: body.state?.streak ?? null,
  };

  try {
    await env.LOGS_KV.put(key, payloadStr, { metadata });
  } catch (err) {
    return json({ ok: false, error: `kv put failed: ${err.message}` }, 500);
  }

  return json({ ok: true, key });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
