// Cloudflare Pages Function — GET /api/logs
//
// Admin endpoint. Returns all stored log entries as JSON, gated by a bearer
// token set in Pages → Settings → Environment variables → ADMIN_TOKEN.
//
// Query params:
//   ?since=<timestamp ms>   only return entries with ts >= since
//   ?device=<deviceId>      filter to one device
//   ?metadataOnly=1         return KV metadata only (small, fast — useful for
//                           getting a high-level overview without fetching
//                           every payload)

export async function onRequestGet({ request, env }) {
  if (!env.LOGS_KV) {
    return json({ ok: false, error: "LOGS_KV binding missing" }, 500);
  }
  if (!env.ADMIN_TOKEN) {
    return json({ ok: false, error: "ADMIN_TOKEN env var not set" }, 500);
  }

  const auth = request.headers.get("authorization") || "";
  const provided = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!provided || provided !== env.ADMIN_TOKEN) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  const url = new URL(request.url);
  const since = parseInt(url.searchParams.get("since") || "0", 10) || 0;
  const device = url.searchParams.get("device");
  const metadataOnly = url.searchParams.get("metadataOnly") === "1";

  const prefix = device ? `log:${device}:` : "log:";

  // KV list pagination: cursor through up to 1000 keys per page.
  let cursor = undefined;
  const entries = [];
  for (let page = 0; page < 50; page++) {
    const list = await env.LOGS_KV.list({ prefix, cursor, limit: 1000 });
    for (const k of list.keys) {
      const md = k.metadata || {};
      if (since && (md.ts ?? 0) < since) continue;
      if (metadataOnly) {
        entries.push({ key: k.name, ...md });
      } else {
        const val = await env.LOGS_KV.get(k.name);
        if (!val) continue;
        try {
          entries.push({ key: k.name, metadata: md, payload: JSON.parse(val) });
        } catch {
          entries.push({ key: k.name, metadata: md, payload: null, parseError: true });
        }
      }
    }
    if (list.list_complete) break;
    cursor = list.cursor;
  }

  return json({ ok: true, count: entries.length, entries });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
