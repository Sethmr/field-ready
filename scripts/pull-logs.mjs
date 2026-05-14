#!/usr/bin/env node
/**
 * FieldReady — pull-logs.mjs
 *
 * Pulls every captured session-end snapshot from the live /api/logs endpoint
 * and writes them locally for analysis. Auth via the ADMIN_TOKEN you set in
 * Pages → Settings → Environment variables.
 *
 * Usage:
 *   export ADMIN_TOKEN="$(security find-generic-password -a "$USER" -s 'FIELDREADY_ADMIN_TOKEN' -w)"
 *   node pull-logs.mjs                       # full JSON dump to ./logs.json
 *   node pull-logs.mjs --jsonl > logs.jsonl  # one entry per line
 *   node pull-logs.mjs --metadata            # metadata only (fast)
 *   node pull-logs.mjs --since 1700000000000 # entries newer than this ts(ms)
 *   node pull-logs.mjs --device <uuid>       # filter to one device
 *   node pull-logs.mjs --host http://localhost:8788   # local wrangler dev
 *
 * Pair with summarize-logs.mjs to turn the dump into a Claude-ready report.
 */

import { writeFile } from "node:fs/promises";

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {
    host: "https://getfieldready.app",
    jsonl: false,
    metadata: false,
    since: 0,
    device: null,
    output: "logs.json",
    stdout: false,
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--host") out.host = args[++i];
    else if (a === "--jsonl") { out.jsonl = true; out.stdout = true; }
    else if (a === "--metadata") out.metadata = true;
    else if (a === "--since") out.since = parseInt(args[++i], 10) || 0;
    else if (a === "--device") out.device = args[++i];
    else if (a === "-o" || a === "--output") out.output = args[++i];
    else if (a === "--stdout") out.stdout = true;
    else if (a === "-h" || a === "--help") {
      console.log(`Usage: node pull-logs.mjs [--host URL] [--jsonl] [--metadata] [--since TS] [--device ID] [-o FILE] [--stdout]`);
      process.exit(0);
    } else {
      console.error(`Unknown arg: ${a}`);
      process.exit(1);
    }
  }
  return out;
}

async function main() {
  const args = parseArgs();
  const token = process.env.ADMIN_TOKEN;
  if (!token) {
    console.error("ADMIN_TOKEN not set. Stash one in Keychain and source it:");
    console.error(`  export ADMIN_TOKEN="$(security find-generic-password -a "$USER" -s 'FIELDREADY_ADMIN_TOKEN' -w)"`);
    process.exit(1);
  }

  const url = new URL("/api/logs", args.host);
  if (args.since) url.searchParams.set("since", String(args.since));
  if (args.device) url.searchParams.set("device", args.device);
  if (args.metadata) url.searchParams.set("metadataOnly", "1");

  const res = await fetch(url.toString(), {
    headers: { authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Pull failed: ${res.status} ${res.statusText}\n${text}`);
    process.exit(1);
  }

  const data = await res.json();
  if (!data.ok) {
    console.error(`API error:`, data);
    process.exit(1);
  }

  console.error(`Got ${data.count} entries from ${args.host}`);

  if (args.jsonl) {
    for (const entry of data.entries) {
      process.stdout.write(JSON.stringify(entry) + "\n");
    }
    return;
  }

  if (args.stdout) {
    process.stdout.write(JSON.stringify(data.entries, null, 2));
    return;
  }

  await writeFile(args.output, JSON.stringify(data.entries, null, 2));
  console.error(`Wrote ${args.output}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
