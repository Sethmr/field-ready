#!/usr/bin/env node
/**
 * FieldReady — summarize-logs.mjs
 *
 * Reads logs.json (output of pull-logs.mjs) and the current cards-data.js,
 * then produces a markdown report you paste straight into a Claude
 * conversation to ask for new cards / removals / topic gaps.
 *
 * Usage:
 *   node pull-logs.mjs                     # produces logs.json
 *   node summarize-logs.mjs                # reads ./logs.json, prints markdown
 *   node summarize-logs.mjs --json         # machine-readable variant
 *   node summarize-logs.mjs --device <id>  # restrict to one device
 *
 * What it reports per card:
 *   - total attempts
 *   - rating histogram (Again/Hard/Good/Easy)
 *   - variants_seen / variants_with_good_5plus (the "mastery via repetition"
 *     bucket Seth asked about)
 *   - current FSRS stability and state (the FSRS-native mastery signal)
 *   - mastery verdict: "mastered" / "in progress" / "struggling" / "new"
 *
 * "Mastered" = either ALL variants answered Good or Easy ≥5 times each
 *              OR FSRS stability ≥ 60 days (long-term-memory threshold).
 * "Struggling" = ≥3 Again ratings in the last 10 attempts on that card.
 */

import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CARDS_PATH = resolve(__dirname, "..", "cards-data.js");
const DEFAULT_LOGS = resolve(process.cwd(), "logs.json");

const MASTERY_STABILITY_DAYS = 60;
const GOOD_OR_EASY = new Set([3, 4]);

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { logs: DEFAULT_LOGS, asJson: false, device: null };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--logs") out.logs = args[++i];
    else if (a === "--json") out.asJson = true;
    else if (a === "--device") out.device = args[++i];
    else if (a === "-h" || a === "--help") {
      console.error(`Usage: node summarize-logs.mjs [--logs logs.json] [--json] [--device ID]`);
      process.exit(0);
    } else {
      console.error(`Unknown arg: ${a}`);
      process.exit(1);
    }
  }
  return out;
}

async function loadCards() {
  const text = await readFile(CARDS_PATH, "utf8");
  const fakeWindow = {};
  new Function("window", text)(fakeWindow);
  return { cards: fakeWindow.SEED_CARDS, packs: fakeWindow.PACKS || {} };
}

async function loadLogs(path) {
  const text = await readFile(path, "utf8");
  return JSON.parse(text);
}

// Pick the most recent entry per device. The answerLog inside is cumulative,
// so older snapshots are subsumed.
function latestPerDevice(entries) {
  const byDevice = new Map();
  for (const e of entries) {
    const payload = e.payload || e;            // pull-logs.mjs wraps; raw entries may not
    const deviceId = payload.deviceId || e.metadata?.deviceId;
    const ts = payload.ts || e.metadata?.ts || 0;
    if (!deviceId) continue;
    const existing = byDevice.get(deviceId);
    if (!existing || ts > existing.ts) {
      byDevice.set(deviceId, { ts, payload });
    }
  }
  return byDevice;
}

function analyzeDevice(deviceId, snapshot, cardsById) {
  const state = snapshot.payload.state || snapshot.payload;
  const log = Array.isArray(state.answerLog) ? state.answerLog : [];
  const cards = state.cards || {};

  // Per-card aggregates.
  const perCard = new Map();
  for (const cardId of Object.keys(cardsById)) {
    perCard.set(cardId, {
      cardId,
      pack: cardsById[cardId].pack,
      totalAttempts: 0,
      ratings: { 1: 0, 2: 0, 3: 0, 4: 0 },
      variantStats: new Map(),        // variantId -> { goodOrEasy, total }
      recentRatings: [],              // last 10
      fsrs: cards[cardId] || null,
    });
  }
  for (const entry of log) {
    const stats = perCard.get(entry.cardId);
    if (!stats) continue;
    stats.totalAttempts += 1;
    stats.ratings[entry.rating] = (stats.ratings[entry.rating] || 0) + 1;
    const vstat = stats.variantStats.get(entry.variantId) || { goodOrEasy: 0, total: 0 };
    vstat.total += 1;
    if (GOOD_OR_EASY.has(entry.rating)) vstat.goodOrEasy += 1;
    stats.variantStats.set(entry.variantId, vstat);
    stats.recentRatings.push(entry.rating);
    if (stats.recentRatings.length > 10) stats.recentRatings.shift();
  }

  // Mastery verdicts.
  for (const stats of perCard.values()) {
    const card = cardsById[stats.cardId];
    const variantIds = (card.variants || []).map(v => v.id);
    stats.variantsSeen = stats.variantStats.size;
    stats.variantsWithGood5Plus = variantIds.filter(vid => {
      const vs = stats.variantStats.get(vid);
      return vs && vs.goodOrEasy >= 5;
    }).length;
    stats.variantsTotal = variantIds.length;

    const fsrsMastered = stats.fsrs && stats.fsrs.state === 2 && stats.fsrs.stability >= MASTERY_STABILITY_DAYS;
    const reptMastered = stats.variantsTotal > 0 && stats.variantsWithGood5Plus === stats.variantsTotal;
    const recentAgains = stats.recentRatings.filter(r => r === 1).length;

    if (fsrsMastered || reptMastered) {
      stats.verdict = "mastered";
      stats.verdictReason = fsrsMastered && reptMastered
        ? "FSRS + repetition"
        : fsrsMastered
        ? `FSRS stability ${stats.fsrs.stability.toFixed(0)}d ≥ ${MASTERY_STABILITY_DAYS}d`
        : `all ${stats.variantsTotal} variants answered ≥5× Good/Easy`;
    } else if (stats.totalAttempts === 0) {
      stats.verdict = "new";
      stats.verdictReason = "never attempted";
    } else if (recentAgains >= 3) {
      stats.verdict = "struggling";
      stats.verdictReason = `${recentAgains} 'Again' ratings in last 10 attempts`;
    } else {
      stats.verdict = "in progress";
      stats.verdictReason = `${stats.totalAttempts} attempts, ${stats.variantsWithGood5Plus}/${stats.variantsTotal} variants past 5× Good/Easy`;
    }
  }

  // Per-pack rollups.
  const byPack = {};
  for (const stats of perCard.values()) {
    const p = byPack[stats.pack] || (byPack[stats.pack] = {
      pack: stats.pack, total: 0, mastered: 0, inProgress: 0, struggling: 0, new: 0,
    });
    p.total += 1;
    if (stats.verdict === "mastered") p.mastered += 1;
    else if (stats.verdict === "in progress") p.inProgress += 1;
    else if (stats.verdict === "struggling") p.struggling += 1;
    else p.new += 1;
  }

  return {
    deviceId,
    name: snapshot.payload.name,
    snapshotTs: snapshot.ts,
    streak: state.streak,
    totalReviewed: state.totalReviewed,
    answerLogLen: log.length,
    perCard: Array.from(perCard.values()),
    byPack: Object.values(byPack),
  };
}

function fmtTs(ms) {
  return new Date(ms).toISOString().replace("T", " ").slice(0, 16);
}

function markdownReport(analyses, cardsById, packs) {
  const out = [];
  out.push(`# FieldReady — usage summary`);
  out.push(`Generated ${new Date().toISOString().slice(0, 19).replace("T", " ")}`);
  out.push("");

  for (const a of analyses) {
    out.push(`## ${a.name || "Unknown"} — device \`${a.deviceId.slice(0, 8)}…\``);
    out.push(`Last sync: ${fmtTs(a.snapshotTs)} · streak: ${a.streak ?? 0} · total reviews: ${a.totalReviewed} · answer log: ${a.answerLogLen}`);
    out.push("");

    out.push(`### Pack breakdown`);
    out.push("");
    out.push("| Pack | Total | Mastered | In progress | Struggling | Untouched |");
    out.push("|---|---:|---:|---:|---:|---:|");
    for (const p of a.byPack) {
      const name = packs[p.pack]?.name || p.pack;
      out.push(`| ${name} | ${p.total} | ${p.mastered} | ${p.inProgress} | ${p.struggling} | ${p.new} |`);
    }
    out.push("");

    const struggling = a.perCard.filter(c => c.verdict === "struggling");
    if (struggling.length > 0) {
      out.push(`### Struggling (${struggling.length})`);
      out.push("");
      for (const c of struggling) {
        const card = cardsById[c.cardId];
        const v0 = (card.variants || [])[0];
        out.push(`- **${c.cardId}** _(${packs[c.pack]?.name || c.pack})_ — ${c.verdictReason}. ratings ${JSON.stringify(c.ratings)}. v0: "${v0?.front || ""}"`);
      }
      out.push("");
    }

    const mastered = a.perCard.filter(c => c.verdict === "mastered");
    if (mastered.length > 0) {
      out.push(`### Mastered (${mastered.length}) — candidates to retire or move to maintenance interval`);
      out.push("");
      for (const c of mastered) {
        const card = cardsById[c.cardId];
        const v0 = (card.variants || [])[0];
        out.push(`- **${c.cardId}** _(${packs[c.pack]?.name || c.pack})_ — ${c.verdictReason}. v0: "${v0?.front || ""}"`);
      }
      out.push("");
    }

    const inProg = a.perCard.filter(c => c.verdict === "in progress");
    if (inProg.length > 0) {
      out.push(`### In progress (${inProg.length})`);
      out.push("");
      out.push(`| Card | Pack | Attempts | A/H/G/E | Variants ≥5×Good | FSRS d |`);
      out.push(`|---|---|---:|---|---:|---:|`);
      for (const c of inProg) {
        const r = c.ratings;
        const stab = c.fsrs?.stability ? c.fsrs.stability.toFixed(0) : "—";
        out.push(`| ${c.cardId} | ${packs[c.pack]?.name || c.pack} | ${c.totalAttempts} | ${r[1]}/${r[2]}/${r[3]}/${r[4]} | ${c.variantsWithGood5Plus}/${c.variantsTotal} | ${stab} |`);
      }
      out.push("");
    }

    out.push("");
  }

  out.push("---");
  out.push("");
  out.push("## How to use this with Claude");
  out.push("");
  out.push("Paste this whole report into a Claude conversation, then ask things like:");
  out.push("- *Suggest 5 new cards in the topic areas Brandi is struggling with.*");
  out.push("- *Identify any cards that should be retired or moved to a slow-maintenance pack.*");
  out.push("- *Are there topic gaps in WNC listing-agent knowledge that aren't represented in the current deck?*");
  out.push("- *For the cards she keeps missing, suggest 5 fresh variants that approach the concept from different angles.*");

  return out.join("\n");
}

async function main() {
  const args = parseArgs();
  const { cards, packs } = await loadCards();
  const cardsById = Object.fromEntries(cards.map(c => [c.id, c]));

  const logEntries = await loadLogs(args.logs);
  let perDevice = latestPerDevice(logEntries);
  if (args.device) {
    const single = perDevice.get(args.device);
    perDevice = new Map(single ? [[args.device, single]] : []);
  }

  if (perDevice.size === 0) {
    console.error("No log entries found. Have you run pull-logs.mjs and has anyone used the app yet?");
    process.exit(1);
  }

  const analyses = [];
  for (const [deviceId, snapshot] of perDevice) {
    analyses.push(analyzeDevice(deviceId, snapshot, cardsById));
  }

  if (args.asJson) {
    process.stdout.write(JSON.stringify({ analyses, packs }, null, 2));
  } else {
    process.stdout.write(markdownReport(analyses, cardsById, packs));
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
