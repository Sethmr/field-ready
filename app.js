// FieldReady v0.1 — main app logic
// FSRS scheduling via ts-fsrs (esm.sh CDN); state in localStorage.

import { SEED_CARDS, PACKS } from "./cards.js";

const STORAGE_KEY = "fieldready.v1";
const TS_FSRS_URL = "https://esm.sh/ts-fsrs@4.6.1";

// ─── State ─────────────────────────────────────────────────────────────────

let fsrsLib = null;       // loaded ts-fsrs module
let scheduler = null;     // fsrs() instance
let state = null;         // persisted state
let session = null;       // active session: { queue: [{cardId, scheduling}], idx, reviewed }

// ─── Storage ───────────────────────────────────────────────────────────────

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return { ...defaultState(), ...parsed };
  } catch {
    return defaultState();
  }
}

function defaultState() {
  return {
    cards: {},               // cardId -> serialized FSRS card
    streak: 0,
    lastSessionDate: null,   // YYYY-MM-DD of last completed session
    totalReviewed: 0,
    // Append-only log of every rating ever given. Source of truth for the
    // user's weakness profile and feeds the future AI-reword round system.
    // Schema: { cardId, variantId, rating, ts } where variantId is the
    // wording variant shown ("v0" = original).
    answerLog: [],
    settings: {
      newPerSession: 5,
      maxReviews: 40,
    },
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ─── Card helpers ──────────────────────────────────────────────────────────

function getOrCreateCardState(cardId) {
  let raw = state.cards[cardId];
  if (!raw) {
    const empty = fsrsLib.createEmptyCard(new Date());
    raw = serializeCard(empty);
    state.cards[cardId] = raw;
  }
  return deserializeCard(raw);
}

function serializeCard(card) {
  return {
    due: card.due instanceof Date ? card.due.toISOString() : card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.last_review
      ? (card.last_review instanceof Date ? card.last_review.toISOString() : card.last_review)
      : undefined,
  };
}

function deserializeCard(raw) {
  return {
    due: new Date(raw.due),
    stability: raw.stability,
    difficulty: raw.difficulty,
    elapsed_days: raw.elapsed_days,
    scheduled_days: raw.scheduled_days,
    reps: raw.reps,
    lapses: raw.lapses,
    state: raw.state,
    last_review: raw.last_review ? new Date(raw.last_review) : undefined,
  };
}

function isDue(cardId, now) {
  const raw = state.cards[cardId];
  if (!raw) return false;
  return new Date(raw.due) <= now;
}

// Mastery threshold (days of FSRS stability). Set at 60d to roughly align
// with the consolidation window where spaced-repetition research treats
// material as durably encoded into long-term memory (multiple successful
// recalls across at least a month, FSRS stability ≥ 60 ⇒ 90% expected
// recall after 60 days). Tunable.
const MASTERY_STABILITY_DAYS = 60;

function isMastered(cardId) {
  const raw = state.cards[cardId];
  if (!raw) return false;
  // FSRS State: 0=New, 1=Learning, 2=Review, 3=Relearning
  return raw.state === 2 && raw.stability >= MASTERY_STABILITY_DAYS;
}

function isNew(cardId) {
  return !state.cards[cardId];
}

// ─── Counts for home view ──────────────────────────────────────────────────

// ─── Variants ──────────────────────────────────────────────────────────────
// Cards may be flat ({front,back}) or carry a variants array. Normalize both
// to a list of {id, front, back}. Flat cards become a single "v0" variant.

function getVariants(card) {
  if (Array.isArray(card.variants) && card.variants.length > 0) {
    return card.variants;
  }
  return [{ id: "v0", front: card.front, back: card.back }];
}

function pickVariant(card) {
  const variants = getVariants(card);
  return variants[Math.floor(Math.random() * variants.length)];
}

function countDue() {
  const now = new Date();
  return SEED_CARDS.filter(c => isDue(c.id, now)).length;
}

function countMastered() {
  return SEED_CARDS.filter(c => isMastered(c.id)).length;
}

function countNew() {
  return SEED_CARDS.filter(c => isNew(c.id)).length;
}

// ─── Session building ──────────────────────────────────────────────────────

function buildSession({ pullNewIfEmpty = false } = {}) {
  const now = new Date();
  const { newPerSession, maxReviews } = state.settings;

  // 1. Due cards (interleaved across packs).
  const due = SEED_CARDS.filter(c => isDue(c.id, now));

  // 2. Up to N new cards (interleaved across packs).
  const newCards = SEED_CARDS.filter(c => isNew(c.id));
  const newSlice = pickInterleaved(newCards, newPerSession);

  // If nothing due AND we're in "pull anyway" mode, also include some.
  let queue;
  if (due.length === 0 && pullNewIfEmpty) {
    queue = pickInterleaved(newCards, newPerSession);
  } else {
    queue = pickInterleaved([...due, ...newSlice], maxReviews);
  }

  return {
    queue: queue.map(c => {
      const v = pickVariant(c);
      return { cardId: c.id, variantId: v.id, front: v.front, back: v.back };
    }),
    idx: 0,
    reviewed: 0,
  };
}

// Distribute cards across packs so the user doesn't see 10 septic cards in a row.
function pickInterleaved(cards, limit) {
  if (cards.length <= limit) return shuffle(cards);
  const byPack = {};
  for (const c of cards) {
    (byPack[c.pack] ||= []).push(c);
  }
  for (const pack in byPack) shuffle(byPack[pack]);
  const result = [];
  const packKeys = Object.keys(byPack);
  let i = 0;
  while (result.length < limit && packKeys.some(k => byPack[k].length > 0)) {
    const k = packKeys[i % packKeys.length];
    if (byPack[k].length > 0) result.push(byPack[k].shift());
    i++;
  }
  return result;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ─── Rating → FSRS update ──────────────────────────────────────────────────

function rateCurrent(rating) {
  if (!session) return;
  const entry = session.queue[session.idx];
  const cardId = entry.cardId;
  const card = getOrCreateCardState(cardId);
  const now = new Date();

  // Use ts-fsrs Rating enum: 1=Again, 2=Hard, 3=Good, 4=Easy
  const result = scheduler.next(card, now, rating);
  state.cards[cardId] = serializeCard(result.card);
  session.reviewed += 1;

  // Append-only log of this answer. Drives the future AI-reword round system.
  state.answerLog.push({
    cardId,
    variantId: entry.variantId || "v0",
    rating,
    ts: now.toISOString(),
  });

  // If "Again" — push back into the queue ~3 cards later for re-attempt this
  // session. Reuses the same variant the user just failed on.
  if (rating === 1) {
    const reinsertIdx = Math.min(session.queue.length, session.idx + 3);
    session.queue.splice(reinsertIdx, 0, {
      cardId,
      variantId: entry.variantId,
      front: entry.front,
      back: entry.back,
    });
  }

  session.idx += 1;

  if (session.idx >= session.queue.length) {
    finishSession();
  } else {
    saveState();
    renderReview();
  }
}

function finishSession() {
  // Streak update — only on first session of a calendar day.
  const today = ymd(new Date());
  if (state.lastSessionDate !== today) {
    if (state.lastSessionDate === ymd(yesterday())) {
      state.streak += 1;
    } else {
      state.streak = 1;
    }
    state.lastSessionDate = today;
  }
  state.totalReviewed += session.reviewed;
  saveState();
  showView("done");
  document.getElementById("done-count").textContent = String(session.reviewed);
  document.getElementById("done-streak").textContent = String(state.streak);
  session = null;
}

function ymd(d) {
  return d.toISOString().slice(0, 10);
}

function yesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d;
}

// ─── Interval previews on rate buttons ─────────────────────────────────────

function previewIntervals(card) {
  const now = new Date();
  const all = scheduler.repeat(card, now);
  // ts-fsrs returns a Record keyed by Rating (1-4) or an array; handle both.
  const get = (r) => (Array.isArray(all) ? all[r] : all[r]);
  return {
    1: humanInterval(get(1)?.card),
    2: humanInterval(get(2)?.card),
    3: humanInterval(get(3)?.card),
    4: humanInterval(get(4)?.card),
  };
}

function humanInterval(card) {
  if (!card) return "";
  const now = new Date();
  const ms = card.due.getTime() - now.getTime();
  const mins = Math.round(ms / 60000);
  if (mins < 1) return "<1m";
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo`;
  return `${Math.round(months / 12)}y`;
}

// ─── Views ─────────────────────────────────────────────────────────────────

const VIEWS = ["home", "review", "done", "loading"];

function showView(name) {
  for (const v of VIEWS) {
    document.getElementById(`view-${v}`).hidden = v !== name;
  }
}

function renderHome() {
  document.getElementById("stat-due").textContent = String(countDue());
  document.getElementById("stat-streak").textContent = String(state.streak);
  document.getElementById("stat-mastered").textContent = String(countMastered());

  const due = countDue();
  const isEmpty = due === 0;
  document.getElementById("start-btn").hidden = isEmpty;
  document.getElementById("empty-msg").hidden = !isEmpty;
  document.getElementById("start-anyway-btn").hidden = !isEmpty || countNew() === 0;

  // Pack list.
  const packList = document.getElementById("pack-list");
  packList.innerHTML = "";
  for (const [packId, packMeta] of Object.entries(PACKS)) {
    const total = SEED_CARDS.filter(c => c.pack === packId).length;
    const mastered = SEED_CARDS.filter(c => c.pack === packId && isMastered(c.id)).length;
    const li = document.createElement("li");
    li.innerHTML = `<span>${packMeta.name}</span><span class="pack-count">${mastered} / ${total}</span>`;
    packList.appendChild(li);
  }

  // Settings inputs.
  document.getElementById("new-per-session").value = state.settings.newPerSession;
  document.getElementById("max-reviews").value = state.settings.maxReviews;
  document.getElementById("log-count").textContent = String(state.answerLog?.length || 0);
}

function renderReview() {
  if (!session || !session.queue[session.idx]) return;
  const entry = session.queue[session.idx];
  const card = SEED_CARDS.find(c => c.id === entry.cardId);
  if (!card) return;

  document.getElementById("progress-current").textContent = String(session.idx + 1);
  document.getElementById("progress-total").textContent = String(session.queue.length);
  document.getElementById("pack-pill").textContent = PACKS[card.pack]?.name || card.pack;

  document.getElementById("card-front").textContent = entry.front;
  document.getElementById("card-back").textContent = entry.back;
  document.getElementById("card-back").hidden = true;
  document.getElementById("reveal-btn").hidden = false;
  document.getElementById("rate-row").hidden = true;
}

function revealAnswer() {
  if (!session || !session.queue[session.idx]) return;
  document.getElementById("card-back").hidden = false;
  document.getElementById("reveal-btn").hidden = true;
  document.getElementById("rate-row").hidden = false;

  // Populate interval previews.
  const cardState = getOrCreateCardState(session.queue[session.idx].cardId);
  const intervals = previewIntervals(cardState);
  for (const btn of document.querySelectorAll(".btn--rate")) {
    const rating = Number(btn.dataset.rating);
    btn.querySelector(".rate-interval").textContent = intervals[rating] || "";
  }
}

// ─── Event wiring ──────────────────────────────────────────────────────────

function wire() {
  document.getElementById("start-btn").addEventListener("click", () => {
    session = buildSession();
    if (session.queue.length === 0) {
      session = null;
      return;
    }
    showView("review");
    renderReview();
  });

  document.getElementById("start-anyway-btn").addEventListener("click", () => {
    session = buildSession({ pullNewIfEmpty: true });
    if (session.queue.length === 0) {
      session = null;
      return;
    }
    showView("review");
    renderReview();
  });

  document.getElementById("back-btn").addEventListener("click", () => {
    if (session && session.reviewed > 0) {
      finishSession();
    } else {
      session = null;
      showView("home");
      renderHome();
    }
  });

  document.getElementById("home-btn").addEventListener("click", () => {
    showView("home");
    renderHome();
  });

  document.getElementById("reveal-btn").addEventListener("click", revealAnswer);

  for (const btn of document.querySelectorAll(".btn--rate")) {
    btn.addEventListener("click", () => {
      const rating = Number(btn.dataset.rating);
      rateCurrent(rating);
    });
  }

  document.getElementById("new-per-session").addEventListener("change", (e) => {
    state.settings.newPerSession = Math.max(1, Math.min(20, Number(e.target.value) || 5));
    saveState();
  });

  document.getElementById("max-reviews").addEventListener("change", (e) => {
    state.settings.maxReviews = Math.max(5, Math.min(200, Number(e.target.value) || 40));
    saveState();
  });

  document.getElementById("reset-btn").addEventListener("click", () => {
    const typed = prompt(
      "This wipes every answer logged on this device — your weakness profile, scheduling, the works. Can't be undone.\n\nType RESET to confirm:"
    );
    if (typed !== "RESET") return;
    localStorage.removeItem(STORAGE_KEY);
    state = loadState();
    renderHome();
  });

  // Keyboard shortcuts.
  document.addEventListener("keydown", (e) => {
    if (document.getElementById("view-review").hidden) return;
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    if (e.code === "Space" || e.code === "Enter") {
      const revealVisible = !document.getElementById("reveal-btn").hidden;
      if (revealVisible) {
        e.preventDefault();
        revealAnswer();
      }
      return;
    }
    if (document.getElementById("rate-row").hidden) return;
    const key = e.key;
    if (["1", "2", "3", "4"].includes(key)) {
      e.preventDefault();
      rateCurrent(Number(key));
    }
  });
}

// ─── Bootstrap ─────────────────────────────────────────────────────────────

async function init() {
  showView("loading");
  state = loadState();
  try {
    fsrsLib = await import(TS_FSRS_URL);
  } catch (err) {
    document.getElementById("view-loading").innerHTML =
      `<p style="color:var(--again)">Couldn't load FSRS scheduler.<br/>Check internet and reload.</p>`;
    console.error(err);
    return;
  }
  const params = fsrsLib.generatorParameters({
    enable_fuzz: true,
    enable_short_term: false,
  });
  scheduler = fsrsLib.fsrs(params);

  wire();
  showView("home");
  renderHome();
}

init();
