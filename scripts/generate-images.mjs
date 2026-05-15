#!/usr/bin/env node
/**
 * ⚠️  HITS BOTH ANTHROPIC AND OPENAI APIs (metered against ANTHROPIC_API_KEY
 *     and OPENAI_API_KEY). The Anthropic call distills the visual prompt; the
 *     OpenAI call generates the actual image. Anthropic distillation could
 *     move to a subagent (subscription) but the OpenAI image call is
 *     unavoidable — Anthropic doesn't generate images.
 *
 * FieldReady — image generation script
 *
 * For each card in ../cards.js, generate one illustrative image and save to
 * ../images/{cardId}.png, then add an `image` field to the card in cards.js.
 *
 * Pipeline per card:
 *   1. Anthropic (Claude Sonnet 4.6) distills the card into a short visual
 *      subject description.
 *   2. OpenAI (gpt-image-1) generates a 1536×1024 illustration using a fixed
 *      style preamble for cohesive look-and-feel across the deck.
 *   3. PNG bytes saved to ../images/{cardId}.png; cards.js mutated to set
 *      card.image = "images/{cardId}.png".
 *
 * Usage:
 *   cd scripts
 *   export ANTHROPIC_API_KEY=sk-ant-...
 *   export OPENAI_API_KEY=sk-proj-...
 *   node generate-images.mjs                     # all cards
 *   node generate-images.mjs --pack septic       # one pack
 *   node generate-images.mjs --card septic-001   # one card
 *   node generate-images.mjs --skip-existing     # don't regenerate if image
 *                                                  already exists on disk
 *   node generate-images.mjs --quality medium    # default: low
 *   node generate-images.mjs --dry-run           # print prompts, no API call
 *
 * Cost (full deck of 84 cards):
 *   - Anthropic prompt distillation: ~$0.10
 *   - OpenAI gpt-image-1 (low): ~$1.00
 *   - Total: ~$1.10
 *
 * Resumability: use --skip-existing to pick up after a failure without
 * paying for already-generated images twice.
 */

import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { constants as fsConstants } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CARDS_PATH = resolve(__dirname, "..", "cards-data.js");
const IMAGES_DIR = resolve(__dirname, "..", "images");

// ─── Arg parsing ───────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {
    pack: null,
    card: null,
    skipExisting: false,
    quality: "low",
    dryRun: false,
    promptModel: "claude-sonnet-4-6",
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--pack") out.pack = args[++i];
    else if (a === "--card") out.card = args[++i];
    else if (a === "--skip-existing") out.skipExisting = true;
    else if (a === "--quality") out.quality = args[++i];
    else if (a === "--prompt-model") out.promptModel = args[++i];
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--help" || a === "-h") {
      console.log(`Usage: node generate-images.mjs [--pack septic] [--card septic-001] [--skip-existing] [--quality low|medium|high] [--dry-run]`);
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${a}`);
      process.exit(1);
    }
  }
  return out;
}

// ─── Style preamble (applied to every prompt) ──────────────────────────────

const STYLE_PREAMBLE = [
  "Editorial flat illustration in the style of a modern educational textbook.",
  "Muted earth-tone palette: warm tans, soft greys, deep forest green, with",
  "a single accent of warm orange (#d97757). Clean geometric shapes with",
  "subtle paper-grain texture. Off-white background (#f7f5f0). Single",
  "subject, centered, recognizable. Calm, professional, friendly mood — not",
  "corporate, not childish. NO text, NO labels, NO captions, NO watermarks,",
  "NO numbers, NO logos.",
].join(" ");

// ─── Anthropic prompt distillation ─────────────────────────────────────────

const DISTILL_SYSTEM = `You write image-generation prompts for a flashcard app teaching real estate agents about home systems (septic, wells, log homes, electrical panels, etc.).

Given a flashcard (front + back), produce ONE sentence describing the visual subject of an illustration that would help an agent remember the underlying concept. The illustration must be RECOGNIZABLE — focus on the THING being taught, not abstractions.

Rules:
- Output one sentence, 15–35 words, describing only the visual subject.
- Pick a concrete recognizable object/scene. Not a metaphor, not a calendar, not a "document".
- For an electrical panel question: describe the panel itself.
- For a "when did X take effect" question: describe a related physical scene (e.g., for septic regulation: a soil scientist examining a soil profile in a hand-dug pit).
- For "what does X look like": describe X.
- For a buyer-asks-question card: describe the physical scene the question is about, not the conversation.
- Do not mention text, words, labels, or signs.
- Do not include style notes — that's added separately.
- Plain English only. No markdown, no quotes, no preamble.

Output the sentence and nothing else.`;

async function distillVisualSubject(anthropic, model, card) {
  const front = card.front ?? card.variants?.[0]?.front;
  const back = card.back ?? card.variants?.[0]?.back;
  const response = await anthropic.messages.create({
    model,
    max_tokens: 200,
    system: DISTILL_SYSTEM,
    messages: [{
      role: "user",
      content: `Card front: ${front}\nCard back: ${back}\n\nWrite the visual subject sentence.`,
    }],
  });
  const text = response.content
    .filter(b => b.type === "text")
    .map(b => b.text)
    .join("")
    .trim()
    .replace(/^["']|["']$/g, "");
  return text;
}

// ─── OpenAI image generation ───────────────────────────────────────────────

async function generateImage(openaiKey, prompt, quality) {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      size: "1536x1024",
      quality,
      n: 1,
    }),
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`OpenAI ${res.status}: ${errorText.slice(0, 300)}`);
  }
  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error(`OpenAI response missing b64_json:\n${JSON.stringify(data).slice(0, 300)}`);
  return Buffer.from(b64, "base64");
}

async function fileExists(path) {
  try {
    await access(path, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

// ─── Card-file IO (shared shape with generate-variants.mjs) ────────────────
//
// cards-data.js is a classic browser script that assigns window.SEED_CARDS
// and window.PACKS. We read it as text and run it in a Function sandbox
// against a fake `window` to extract the data.

async function loadCards() {
  const text = await readFile(CARDS_PATH, "utf8");
  const fakeWindow = {};
  const fn = new Function("window", text);
  fn(fakeWindow);
  if (!Array.isArray(fakeWindow.SEED_CARDS)) {
    throw new Error(`${CARDS_PATH} did not assign window.SEED_CARDS to an array`);
  }
  return { cards: fakeWindow.SEED_CARDS, packs: fakeWindow.PACKS || {} };
}

function formatCard(card) {
  const variants = (card.variants || [{ id: "v0", front: card.front, back: card.back }])
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
    return `${header}\n${list.map(c => formatCard(c)).join(",\n")}`;
  }).join(",\n\n");

  const packsJson = JSON.stringify(packs, null, 2)
    .split("\n")
    .map((line, i) => i === 0 ? line : "  " + line)
    .join("\n");

  return `// FieldReady seed deck
//
// Card text extracted from the WNC listing-agent research dossier (May 2026).
// Variants and images generated by scripts/generate-{variants,images}.mjs.
// DO NOT hand-format the file structure (scripts regenerate it). Hand-edit
// individual variants or swap an image freely if you spot a problem.

window.SEED_CARDS = [
${sections}
];

window.PACKS = ${packsJson};
`;
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs();
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY not set."); process.exit(1);
  }
  if (!process.env.OPENAI_API_KEY && !args.dryRun) {
    console.error("OPENAI_API_KEY not set (required unless --dry-run)."); process.exit(1);
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { cards, packs } = await loadCards();

  // Filter targets.
  let targets = cards;
  if (args.pack) targets = targets.filter(c => c.pack === args.pack);
  if (args.card) targets = targets.filter(c => c.id === args.card);
  if (targets.length === 0) {
    console.error(`No cards match filter (pack=${args.pack}, card=${args.card}).`);
    process.exit(1);
  }

  await mkdir(IMAGES_DIR, { recursive: true });

  console.error(`Generating images for ${targets.length} card(s), quality=${args.quality}${args.dryRun ? " [dry-run]" : ""}...`);
  let okCount = 0, skipCount = 0, failCount = 0;
  for (const card of targets) {
    const imagePath = `images/${card.id}.png`;
    const absPath = resolve(IMAGES_DIR, `${card.id}.png`);

    if (args.skipExisting && await fileExists(absPath)) {
      card.image = imagePath;
      skipCount++;
      console.error(`  ${card.id}  skipped (exists)`);
      continue;
    }

    process.stderr.write(`  ${card.id}  distilling… `);
    let subject;
    try {
      subject = await distillVisualSubject(anthropic, args.promptModel, card);
    } catch (err) {
      console.error(`distill FAILED: ${err.message}`);
      failCount++;
      continue;
    }

    const fullPrompt = `${STYLE_PREAMBLE}\n\nSubject: ${subject}`;
    process.stderr.write(`generating… `);

    if (args.dryRun) {
      console.error("(dry-run)");
      console.error(`    subject: ${subject}`);
      continue;
    }

    try {
      const bytes = await generateImage(process.env.OPENAI_API_KEY, fullPrompt, args.quality);
      await writeFile(absPath, bytes);
      card.image = imagePath;
      okCount++;
      console.error(`ok (${(bytes.length / 1024).toFixed(0)} KB)`);
    } catch (err) {
      console.error(`gen FAILED: ${err.message}`);
      failCount++;
    }
  }

  if (!args.dryRun) {
    // Ensure all cards are in the variants shape (in case images run before variants).
    for (const card of cards) {
      if (!card.variants) {
        card.variants = [{ id: "v0", front: card.front, back: card.back }];
        delete card.front;
        delete card.back;
      }
    }
    const output = formatCardsFile(cards, packs);
    await writeFile(CARDS_PATH, output, "utf8");
    console.error(`\nWrote ${CARDS_PATH}`);
  }

  console.error(`\nSummary: ${okCount} generated, ${skipCount} skipped, ${failCount} failed.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
