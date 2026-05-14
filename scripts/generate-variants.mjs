#!/usr/bin/env node
/**
 * FieldReady — variant generation script
 *
 * Reads ../cards.js, calls Anthropic API to generate N reworded variants per
 * card, writes the upgraded file back to ../cards.js (in place). Each card
 * gains a `variants: [{id, front, back}]` array. Original wording becomes v0.
 *
 * Usage:
 *   cd scripts
 *   npm install            # one-time
 *   export ANTHROPIC_API_KEY=sk-ant-...
 *   node generate-variants.mjs                  # all cards, default N=10
 *   node generate-variants.mjs --n 15           # 15 variants per card
 *   node generate-variants.mjs --pack septic    # one pack only
 *   node generate-variants.mjs --card septic-001 --n 5   # single card
 *   node generate-variants.mjs --dry-run        # print to stdout, don't write
 *
 * Cost estimate: at ~$3 per 1M input + $15 per 1M output (Sonnet 4.6), 78
 * cards × 10 variants is ~$1–2 worth of API calls. Always cheaper if you
 * scope down with --pack or --card while iterating.
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import Anthropic from "@anthropic-ai/sdk";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CARDS_PATH = resolve(__dirname, "..", "cards-data.js");

// ─── Arg parsing ───────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { n: 10, pack: null, card: null, dryRun: false, model: "claude-sonnet-4-6" };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--n") out.n = parseInt(args[++i], 10);
    else if (a === "--pack") out.pack = args[++i];
    else if (a === "--card") out.card = args[++i];
    else if (a === "--model") out.model = args[++i];
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--help" || a === "-h") {
      console.log(`Usage: node generate-variants.mjs [--n 10] [--pack septic] [--card septic-001] [--dry-run] [--model claude-sonnet-4-6]`);
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${a}`);
      process.exit(1);
    }
  }
  return out;
}

// ─── Anthropic prompt ──────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are helping build a spaced-repetition flashcard app for real estate listing agents in Western North Carolina. Each card teaches one fact or one fluent response pattern (NC septic, wells, log homes, NC listing forms, post-Helene insurance, walkthrough Q&A patterns, etc.).

Your job: given an original card (front=question, back=answer), produce N reworded VARIANTS. Each variant must:

1. Test the SAME underlying knowledge — the user must need to know the same fact to answer.
2. Vary the SURFACE FORM significantly:
   - Reframe the question (different verb, different framing, different perspective — "What's X?" → "How would you explain X to a buyer?" → "A seller asks Y; what do you say?")
   - Reorder facts in the answer where the order isn't meaningful.
   - Substitute synonyms where they don't change technical meaning (e.g., "septic" ↔ "wastewater system", "GPM" ↔ "gallons per minute", "FPE" ↔ "Federal Pacific Electric").
   - Tighten or loosen wording. Keep tone confident, professional, voiceable in a real walkthrough.
3. PRESERVE all technical correctness — numbers, statutory references (e.g., "15A NCAC 18E"), brand names, dates. Do not invent.
4. PRESERVE the answer's calibrated confidence — e.g., "I'd treat as X until an engineer confirms" must stay calibrated, not become an unhedged claim.
5. AVOID near-duplicates of the original or other variants. Each variant should feel meaningfully different on first read.

Output STRICT JSON in this exact shape, nothing else:
{"variants":[{"front":"...","back":"..."}, ...]}

No markdown fences, no commentary, no preamble.`;

function userPrompt(card, n) {
  return `Original card:
Front: ${card.front}
Back: ${card.back}

Generate ${n} variants in JSON.`;
}

// ─── Card-file IO ──────────────────────────────────────────────────────────
//
// cards-data.js is a classic browser script that assigns window.SEED_CARDS
// and window.PACKS. We read it as text and run it in a sandboxed Function
// against a fake `window` to extract the data, then write back a
// programmatically-formatted version preserving the same shape.

async function loadCards() {
  const text = await readFile(CARDS_PATH, "utf8");
  const fakeWindow = {};
  // Wrap in a try block inside the Function so a malformed file gives a
  // helpful error rather than failing at function compile time.
  const fn = new Function("window", text);
  fn(fakeWindow);
  if (!Array.isArray(fakeWindow.SEED_CARDS)) {
    throw new Error(`${CARDS_PATH} did not assign window.SEED_CARDS to an array`);
  }
  return { cards: fakeWindow.SEED_CARDS, packs: fakeWindow.PACKS || {} };
}

function formatCard(card, packKey) {
  // Always use the variants shape after generation. Pretty-print conservatively.
  const variants = card.variants
    .map(v => `    { id: ${JSON.stringify(v.id)}, front: ${JSON.stringify(v.front)}, back: ${JSON.stringify(v.back)} }`)
    .join(",\n");
  const imageField = card.image ? `image: ${JSON.stringify(card.image)}, ` : "";
  return `  { id: ${JSON.stringify(card.id)}, pack: ${JSON.stringify(card.pack)}, ${imageField}variants: [\n${variants}\n  ] }`;
}

function formatCardsFile(cards, packs) {
  const grouped = {};
  for (const c of cards) (grouped[c.pack] ||= []).push(c);
  const sections = Object.entries(grouped).map(([pack, list]) => {
    const meta = packs[pack];
    const header = meta ? `  // ─── ${meta.name} (${list.length}) ─────────────────────────────────────` : `  // ─── ${pack} ───`;
    return `${header}\n${list.map(c => formatCard(c, pack)).join(",\n")}`;
  }).join(",\n\n");

  const packsJson = JSON.stringify(packs, null, 2)
    .split("\n")
    .map((line, i) => i === 0 ? line : "  " + line)
    .join("\n");

  return `// FieldReady seed deck
//
// Card text extracted from the WNC listing-agent research dossier (May 2026).
// Variants generated by scripts/generate-variants.mjs — DO NOT hand-format
// the file structure (script regenerates it). Hand-edit individual variants
// freely if you spot a technical inaccuracy.
//
// Loaded into the browser via a classic <script src="cards-data.js"></script>
// tag, which is why this file assigns to window globals rather than using
// ES module exports.

window.SEED_CARDS = [
${sections}
];

window.PACKS = ${packsJson};
`;
}

// ─── Anthropic call ────────────────────────────────────────────────────────

async function generateVariants(client, model, cardId, frontBack, n) {
  const response = await client.messages.create({
    model,
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt(frontBack, n) }],
  });
  const raw = response.content
    .filter(b => b.type === "text")
    .map(b => b.text)
    .join("");
  // Strip ```json fences if the model added them despite the instruction.
  const text = raw.replace(/^```(?:json)?\s*/m, "").replace(/\s*```\s*$/m, "").trim();
  const stop = response.stop_reason;
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    const head = raw.slice(0, 200);
    const tail = raw.length > 400 ? "…" + raw.slice(-200) : "";
    throw new Error(
      `Card ${cardId}: non-JSON (stop_reason=${stop}, len=${raw.length}):\nHEAD: ${head}\nTAIL: ${tail}\nParse error: ${e.message}`
    );
  }
  if (!Array.isArray(parsed.variants)) {
    throw new Error(`Card ${cardId}: response missing variants[]`);
  }
  return parsed.variants.map((v, i) => ({
    id: `v${i + 1}`,
    front: v.front,
    back: v.back,
  }));
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs();
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY not set. export ANTHROPIC_API_KEY=sk-ant-... and retry.");
    process.exit(1);
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const { cards, packs } = await loadCards();

  // Filter targets.
  let targets = cards;
  if (args.pack) targets = targets.filter(c => c.pack === args.pack);
  if (args.card) targets = targets.filter(c => c.id === args.card);
  if (targets.length === 0) {
    console.error(`No cards match filter (pack=${args.pack}, card=${args.card}).`);
    process.exit(1);
  }

  console.error(`Generating ${args.n} variants for ${targets.length} card(s) with ${args.model}...`);
  for (const card of targets) {
    const originalFront = card.front ?? card.variants?.[0]?.front;
    const originalBack = card.back ?? card.variants?.[0]?.back;
    if (!originalFront || !originalBack) {
      console.error(`Card ${card.id}: missing front/back, skipping.`);
      continue;
    }
    process.stderr.write(`  ${card.id} … `);
    let newVariants;
    try {
      newVariants = await generateVariants(
        client,
        args.model,
        card.id,
        { front: originalFront, back: originalBack },
        args.n,
      );
    } catch (err) {
      console.error(`\n  ${card.id} FAILED: ${err.message}`);
      continue;
    }
    // Upgrade card in-place to the variants shape. Keep v0 as the original.
    card.variants = [
      { id: "v0", front: originalFront, back: originalBack },
      ...newVariants,
    ];
    delete card.front;
    delete card.back;
    console.error(`ok (${newVariants.length})`);
  }

  // For cards NOT in the targets list, ensure they're at least in the variants
  // shape so the output file is consistent.
  for (const card of cards) {
    if (!card.variants) {
      card.variants = [{ id: "v0", front: card.front, back: card.back }];
      delete card.front;
      delete card.back;
    }
  }

  const output = formatCardsFile(cards, packs);
  if (args.dryRun) {
    process.stdout.write(output);
    console.error("\n(dry-run — file not written)");
    return;
  }
  await writeFile(CARDS_PATH, output, "utf8");
  console.error(`\nWrote ${CARDS_PATH}`);
  console.error(`Review diff before committing: git -C .. diff cards.js`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
