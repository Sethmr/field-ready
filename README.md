# FieldReady

**On-site fluency for WNC listing agents.** A spaced-repetition flashcard webapp built around the ~250 facts a Macon-County listing agent needs in muscle memory — septic permits, well GPM, log-home rot, FPE panels, NC forms, post-Helene insurance — so a buyer's husband can't catch her flat.

This is **v0.1** — the smallest thing that produces real habit value. Built deliberately tiny so it ships in hours, not weeks.

---

## What's here right now

- **78 hand-curated cards** across 10 packs (NC Septic, Wells, Mountain Foundations, Log Homes, Older Home Systems, HVAC, NC Listing Forms & MLS, CMA & Net Sheet, Post-Helene & Insurance, and Walkthrough Q&A Patterns). All extracted from the research dossier in `~/Downloads/compass_artifact_wf-...md`.
- **FSRS scheduling** via [`ts-fsrs`](https://github.com/open-spaced-repetition/ts-fsrs) loaded from esm.sh. Same algorithm Anki ships with by default.
- **Pack interleaving** so you don't see 12 septic cards in a row.
- **Streak counter**, daily session targets (5 new / 40 reviews by default — tunable in Settings).
- **localStorage** for progress. No account, no backend, no dependencies to install.
- **Keyboard:** <kbd>Space</kbd> to reveal, <kbd>1</kbd>–<kbd>4</kbd> to rate (Again / Hard / Good / Easy).
- **Mobile-first**, dark by default, light mode follows system preference.

## Run it

```bash
cd fieldready
python3 -m http.server 8765
# open http://localhost:8765
```

Or via the Claude Code preview config — `.claude/launch.json` has it wired as `fieldready` on port 8765.

That's it. No Node, no build, no install. Just static files and one esm.sh import for the FSRS library.

## File map

```
fieldready/
├── index.html         shell, three views (home / review / done)
├── styles.css         dark-by-default editorial styling
├── cards.js           SEED_CARDS + PACKS — the entire deck lives here
├── app.js             FSRS integration, view rendering, localStorage
└── README.md          you are here
```

## Why static, not Next.js?

The research dossier recommends Next.js + Supabase + Stripe for a sellable product. That's the right v1.0 stack. **This is v0.1** — built static so it can be running in 30 seconds, with zero install friction for Brandi. The data model (`cards` keyed by id, FSRS state per card) is portable: porting to Next + Supabase later is a one-day job when there's signal that she'll actually use it daily.

The dossier's verdict was explicit: don't ship the app until she's stuck with raw Anki for 3 weeks. This app exists because raw Anki on her phone is more friction than Brandi will tolerate (deck import, mobile UI, FSRS settings, etc.). FieldReady removes that friction. The stickiness experiment is the same — if she opens it ≥18 of the next 28 days, it earns a v1.0.

## Design choices worth knowing

- **`enable_short_term: false`** in FSRS params. Means a brand-new card answered "Good" goes to a 3-day interval, not a 10-minute one. Right call for an adult who reviews once daily; wrong call for cramming. Switch to `true` in `app.js:init()` if Brandi wants tighter early loops.
- **"Again" cards re-insert ~3 cards later** in the current session, so a missed card gets a same-session retry without immediately repeating.
- **Mastery threshold = Review state + stability ≥ 21 days.** Crude but readable. The "Mastered" stat on the home view uses this.
- **No images yet.** Text-only. The dossier explicitly calls out FPE panels and polybutylene as visual-recognition problems — those cards are weaker without photos. v0.1 ships text and we add an image library later (legal-clean source list in the dossier).

## Next moves (in order of leverage)

1. **Brandi-facing one-pager** — "open this URL on your phone, do 5 cards a day for 3 weeks, see what sticks" — written in the low-pressure voice from `seo/Drafts/Phone_Fix_for_Brandi.md`. **The single biggest unlock.**
2. **Domain.** Suggested order to check (probably-cheap to less-likely):
   - `fieldready.app` ← preferred
   - `fieldready.io`
   - `walkfluent.com`
   - `getfieldready.com`
   - `fieldready.co`
   The `.app` TLD is HSTS-only and reads as "tool" rather than "marketing site" — fits the use case.
3. **Hosting.** Drop on Vercel (`vercel deploy --prod` from this folder), Netlify, or push the `fieldready/` folder to a `gh-pages` branch on a fresh repo. All free for static. **Don't deploy onto `brandirininger.com`** — keep it on its own domain so the SEO indexation watch period on the main site isn't disturbed.
4. **Add 2–3 cards per week from real walkthrough fumbles.** The model in the dossier: she voice-messages a question she fumbled, you append a card to `cards.js` and push. The deck grows organically with her actual gaps, not synthetic ones.
5. **Image-anchored cards** — add an `image` field to the card schema and a small `<img>` slot in the front. Source legally: commission a Macon County home inspector for a 1-day annotated photo walk ($500–$1500 per the dossier) for FPE panels, distribution boxes, polybutylene, etc. This is the moat the dossier identifies as durable.
6. **Pack-pick mode** — let her drill *only* septic when she has a septic-heavy listing tomorrow. One-day add to `app.js`.
7. **The pre-walkthrough Claude pipeline** the dossier recommends (paste MLS + tax card → get 5 likely buyer questions in her voice). Live outside this app, in a Claude project Seth maintains. **Higher leverage than building features into FieldReady.**

## The honest scorecard (per the dossier)

- **Moat:** none yet. FSRS is open source. The cards are recoverable from the dossier in 20 minutes by anyone with Claude.
- **What becomes a moat:** WNC-specific image library (legally licensed from a Macon inspector), brokerage-licensable B2B distribution, white-label regional pack architecture (`/data/packs/wnc-mountain.json`, `/data/packs/outer-banks.json`, etc.). v0.1 doesn't attempt any of this.
- **Kill criteria for the consumer side** (per dossier): if 60 days post-launch can't get 10 paying users, pivot to brokerage-onboarding B2B or shelve.
- **Zeroth kill criterion** (this build's gate): **if Brandi doesn't open it ≥18 days in 28**, the whole product thesis was a husband's solution to a wife's problem. Stop. Keep the Claude pipeline; that's the permanent win.

## Provenance

- Research dossier: `~/Downloads/compass_artifact_wf-248a9b5e-0e17-483d-a95b-7d518bb9b986_text_markdown.md`
- All 78 seed cards trace to that dossier; verifiable line-by-line in `cards.js`.
- This folder is intentionally separate from the website (`/brandi/website/`) and the SEO planning (`/brandi/seo/`). The repo's deploy workflow is scoped to `website/**` paths, so changes here don't trigger any indexation on brandirininger.com.
