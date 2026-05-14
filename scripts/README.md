# scripts/

Offline tooling for FieldReady. Nothing in this directory ships into the app — the app stays pure static. Run these from your machine when you want to regenerate data.

## generate-variants.mjs

Generates pre-baked wording variants for every card in `../cards.js`. The app picks a random variant each time it shows a card, so the user can't memorize surface form.

**Why pre-generate?** Decided 2026-05-13: runtime AI calls are expensive, slow, and unreviewable. Pre-generation lets you diff variants before they ship and pay $0 per session forever.

### One-time setup

```bash
cd scripts
npm install
```

### Run

```bash
export ANTHROPIC_API_KEY=sk-ant-...
node generate-variants.mjs                          # all 78 cards × 10 variants
node generate-variants.mjs --n 15                   # 15 variants per card
node generate-variants.mjs --pack septic            # only the septic pack
node generate-variants.mjs --card septic-001 --n 5  # single card, useful while tuning
node generate-variants.mjs --dry-run                # print to stdout, no write
```

### Output

Rewrites `../cards.js` in place. Each card moves from the flat `{front, back}` shape to the `{variants: [...]}` shape, with `v0` preserved as the original wording.

Review the diff before committing:

```bash
git -C .. diff cards.js
```

If a variant is wrong (technical inaccuracy, drifted tone, hallucinated stat), hand-edit it directly in `cards.js` — that's the human-review pass.

### Cost

Sonnet 4.6 is ~$3 per 1M input tokens and ~$15 per 1M output. A full 78-card × 10-variant run is roughly $1–2 in API spend. Scope down with `--pack` or `--card` while iterating on the prompt.

### Prompt iteration

The system prompt lives at the top of `generate-variants.mjs`. If variants come out too similar to the original, push harder on "Reframe the question" and "Reorder facts." If variants drift technically, push harder on "PRESERVE all technical correctness."

Don't lower temperature unless variants stop varying — defaults work fine.
