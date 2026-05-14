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

---

## generate-images.mjs

Generates one cohesive illustration per card and writes it to `../images/{cardId}.png`. Each card gets an `image` field added in `../cards.js`. The app shows the image at the top of the review card.

**Why pre-generate?** Same reason as variants — the app stays static, costs $0 at runtime, and you can swap any image you don't like by replacing the file.

### One-time setup

```bash
cd scripts
npm install      # already done if you ran generate-variants.mjs
```

You'll need an OpenAI API key (the script uses Anthropic to distill the visual prompt, then OpenAI's gpt-image-1 to draw it). Stash in Keychain:

```bash
security add-generic-password -a "$USER" -s 'OPENAI_API_KEY' -w 'sk-proj-xxxxx'
```

### Run

```bash
export ANTHROPIC_API_KEY="$(security find-generic-password -a "$USER" -s 'ANTHROPIC_API_KEY' -w)"
export OPENAI_API_KEY="$(security find-generic-password -a "$USER" -s 'OPENAI_API_KEY' -w)"

node generate-images.mjs --card septic-001 --dry-run    # prints the distilled prompt, doesn't draw
node generate-images.mjs --card septic-001              # draws one image
node generate-images.mjs                                # full deck
node generate-images.mjs --skip-existing                # resume after a failure
node generate-images.mjs --quality medium               # default low; medium ~4x cost, high ~15x
```

### Cost

Default quality (`low`): ~$1 for 84 cards. Bumping to `medium` is ~$4; `high` is ~$15. Quality `low` is plenty for a personal-use flashcard image.

### Iterating on style

The shared style preamble is `STYLE_PREAMBLE` at the top of the script. If images come out off-tone, edit it and re-run with `--card <id>` on a few examples to dial it in before the full sweep.

If one specific image is wrong, regenerate just that one: `node generate-images.mjs --card septic-001` (omit `--skip-existing`).

---

## pull-logs.mjs

Pulls every captured session-end snapshot from the live `/api/logs` endpoint and writes them to `logs.json` for analysis.

### One-time setup

Cloudflare side (see top-level README "Data capture" section):
- Create the `fieldready-logs` KV namespace
- Bind it to the Pages project as `LOGS_KV`
- Set the `ADMIN_TOKEN` environment variable on the Pages project (Production)

Local side (Keychain stash so you don't have to retype the token):

```bash
security add-generic-password -a "$USER" -s 'FIELDREADY_ADMIN_TOKEN' -w '<paste the token you set in Pages>'
```

### Run

```bash
export ADMIN_TOKEN="$(security find-generic-password -a "$USER" -s 'FIELDREADY_ADMIN_TOKEN' -w)"

node pull-logs.mjs                       # writes ./logs.json (default)
node pull-logs.mjs --jsonl > logs.jsonl  # one JSON object per line
node pull-logs.mjs --metadata            # KV metadata only (small, fast)
node pull-logs.mjs --since 1750000000000 # entries newer than this ms timestamp
node pull-logs.mjs --device <uuid>       # one device only
```

Each entry is one session-end snapshot of Brandi's full state. The latest snapshot per device contains all prior history (the `answerLog` inside is monotonically growing).

---

## summarize-logs.mjs

Turns `logs.json` into a markdown report you paste straight into Claude. Per card it computes total attempts, the rating histogram, how many variants she's answered Good or Easy ≥5 times, and FSRS stability — then assigns one of four verdicts: **mastered** (FSRS stability ≥60d, or all variants past the 5× threshold), **in progress**, **struggling** (≥3 'Again' in last 10), or **new**.

```bash
node summarize-logs.mjs           # markdown report to stdout
node summarize-logs.mjs --json    # machine-readable variant
node summarize-logs.mjs --device <uuid>   # one device only
```

The report ends with suggested Claude prompts: *"suggest 5 new cards in the topic areas Brandi is struggling with"*, *"identify cards to retire"*, *"are there topic gaps in the deck?"*, etc.

Pipe into pbcopy on macOS to skip a step:

```bash
node pull-logs.mjs && node summarize-logs.mjs | pbcopy
# now paste into Claude
```


