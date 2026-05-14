// state.jsx — FieldReady production state.
// Loads ts-fsrs, persists to localStorage, exposes a useFieldReady() hook.

const { useState, useEffect, useRef, useCallback, useMemo } = React;

const STORAGE_KEY = "fieldready.v1";
const TS_FSRS_URL = "https://esm.sh/ts-fsrs@4.6.1";
const MASTERY_STABILITY_DAYS = 60;
const WALL_MAX = 400; // cap wall history so localStorage stays reasonable

// ─── Default settings ───────────────────────────────────────────────────

const DEFAULT_SETTINGS = {
  name: "Brandi",
  newPerSession: 5,
  maxReviews: 40,
  palette: "cream",
  rewardIntensity: "playful",
  softVoice: true,
  showWall: true,
};

function defaultState() {
  return {
    cards: {},
    streak: 0,
    lastSessionDate: null,
    totalReviewed: 0,
    answerLog: [],
    wall: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return {
      ...defaultState(),
      ...parsed,
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
      wall: Array.isArray(parsed.wall) ? parsed.wall : [],
    };
  } catch {
    return defaultState();
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Couldn't persist state:", e);
  }
}

// ─── FSRS card (de)serialization ────────────────────────────────────────

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

// ─── Variants / card pickers ────────────────────────────────────────────

function getVariants(card) {
  if (Array.isArray(card.variants) && card.variants.length > 0) return card.variants;
  return [{ id: "v0", front: card.front, back: card.back }];
}

function pickVariant(card) {
  const variants = getVariants(card);
  return variants[Math.floor(Math.random() * variants.length)];
}

// Distribute across packs so we don't see 10 septic cards in a row.
function pickInterleaved(cards, limit) {
  if (cards.length <= limit) return shuffle([...cards]);
  const byPack = {};
  for (const c of cards) (byPack[c.pack] ||= []).push(c);
  for (const k in byPack) shuffle(byPack[k]);
  const out = [];
  const keys = Object.keys(byPack);
  let i = 0;
  while (out.length < limit && keys.some(k => byPack[k].length > 0)) {
    const k = keys[i % keys.length];
    if (byPack[k].length > 0) out.push(byPack[k].shift());
    i++;
  }
  return out;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ─── Date helpers ──────────────────────────────────────────────────────

function ymd(d) { return d.toISOString().slice(0, 10); }
function yesterdayYmd() {
  const d = new Date(); d.setDate(d.getDate() - 1); return ymd(d);
}

// ─── Interval previews ─────────────────────────────────────────────────

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

// ─── The big hook ──────────────────────────────────────────────────────

function useFieldReady() {
  const [state, setState] = useState(loadState);
  const stateRef = useRef(state);
  stateRef.current = state;

  // FSRS loaded async
  const [fsrs, setFsrs] = useState(null);
  const [fsrsError, setFsrsError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // window.__fsrsPromise is started by a <script type="module"> in the
        // HTML host before Babel runs — we can't call import() from a Babel-
        // transformed script because Babel rewrites it.
        const lib = await (window.__fsrsPromise || Promise.reject(new Error("FSRS not bootstrapped")));
        if (cancelled) return;
        const params = lib.generatorParameters({
          enable_fuzz: true,
          enable_short_term: false,
        });
        setFsrs({ lib, scheduler: lib.fsrs(params) });
      } catch (err) {
        if (cancelled) return;
        console.error("FSRS load failed", err);
        setFsrsError(err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Persist whenever state changes.
  useEffect(() => { saveState(state); }, [state]);

  // ─── Card state helpers ───────────────────────────────────────────────

  const getCardState = useCallback((cardId) => {
    const raw = stateRef.current.cards[cardId];
    if (raw) return deserializeCard(raw);
    return null;
  }, []);

  const ensureCardState = useCallback((cardId) => {
    if (!fsrs) return null;
    const existing = stateRef.current.cards[cardId];
    if (existing) return deserializeCard(existing);
    const empty = fsrs.lib.createEmptyCard(new Date());
    setState(s => ({ ...s, cards: { ...s.cards, [cardId]: serializeCard(empty) } }));
    return empty;
  }, [fsrs]);

  const isDue = useCallback((cardId, now) => {
    const raw = stateRef.current.cards[cardId];
    if (!raw) return false;
    return new Date(raw.due) <= now;
  }, []);

  const isNew = useCallback((cardId) => !stateRef.current.cards[cardId], []);

  const isMastered = useCallback((cardId) => {
    const raw = stateRef.current.cards[cardId];
    if (!raw) return false;
    return raw.state === 2 && raw.stability >= MASTERY_STABILITY_DAYS;
  }, []);

  // ─── Counts ────────────────────────────────────────────────────────────

  const counts = useMemo(() => {
    const now = new Date();
    let due = 0, mastered = 0, newCount = 0;
    for (const c of window.SEED_CARDS) {
      const raw = state.cards[c.id];
      if (!raw) { newCount++; continue; }
      if (new Date(raw.due) <= now) due++;
      if (raw.state === 2 && raw.stability >= MASTERY_STABILITY_DAYS) mastered++;
    }
    return { due, mastered, newCount, total: window.SEED_CARDS.length };
  }, [state.cards]);

  // ─── Build a session ───────────────────────────────────────────────────

  const buildSession = useCallback((opts = {}) => {
    const { sizeOverride } = opts;
    const { newPerSession, maxReviews } = state.settings;
    const now = new Date();

    const due = window.SEED_CARDS.filter(c => {
      const raw = state.cards[c.id];
      return raw && new Date(raw.due) <= now;
    });
    const newCards = window.SEED_CARDS.filter(c => !state.cards[c.id]);

    // If user picked a fixed size (Just one / Quick 3 / Long-ish), use that
    // as the cap; otherwise the default is "all due + N new" up to maxReviews.
    const targetSize = sizeOverride ?? maxReviews;
    const newSlice = pickInterleaved(newCards, sizeOverride ? sizeOverride : newPerSession);
    const queue = pickInterleaved([...due, ...newSlice], targetSize);
    return queue.map(c => {
      const v = pickVariant(c);
      return { cardId: c.id, variantId: v.id, front: v.front, back: v.back, image: c.image, pack: c.pack };
    });
  }, [state.cards, state.settings]);

  // ─── Preview intervals for a card (used by rate buttons) ──────────────

  const previewIntervals = useCallback((cardId) => {
    if (!fsrs) return { 1:"", 2:"", 3:"", 4:"" };
    let cardState = getCardState(cardId);
    if (!cardState) {
      cardState = fsrs.lib.createEmptyCard(new Date());
    }
    const now = new Date();
    const all = fsrs.scheduler.repeat(cardState, now);
    const get = (r) => (Array.isArray(all) ? all[r] : all[r]);
    return {
      1: humanInterval(get(1)?.card),
      2: humanInterval(get(2)?.card),
      3: humanInterval(get(3)?.card),
      4: humanInterval(get(4)?.card),
    };
  }, [fsrs, getCardState]);

  // ─── Rate a card ───────────────────────────────────────────────────────

  const rateCard = useCallback((cardId, variantId, rating) => {
    if (!fsrs) return;
    const now = new Date();
    let cardState = getCardState(cardId);
    if (!cardState) cardState = fsrs.lib.createEmptyCard(now);
    const result = fsrs.scheduler.next(cardState, now, rating);
    const serialized = serializeCard(result.card);

    setState(s => ({
      ...s,
      cards: { ...s.cards, [cardId]: serialized },
      answerLog: [
        ...s.answerLog,
        { cardId, variantId, rating, ts: now.toISOString() },
      ],
    }));
  }, [fsrs, getCardState]);

  // ─── Add a mark to the wall ──────────────────────────────────────────

  const pushWallMark = useCallback((mark) => {
    setState(s => ({
      ...s,
      wall: [{ ...mark, ts: new Date().toISOString() }, ...s.wall].slice(0, WALL_MAX),
    }));
  }, []);

  // ─── Finish a session (streak + total bump) ──────────────────────────

  const finishSession = useCallback((reviewed) => {
    setState(s => {
      const today = ymd(new Date());
      let streak = s.streak;
      let lastSessionDate = s.lastSessionDate;
      if (lastSessionDate !== today) {
        if (lastSessionDate === yesterdayYmd()) {
          streak += 1;
        } else {
          streak = 1;
        }
        lastSessionDate = today;
      }
      return {
        ...s,
        streak,
        lastSessionDate,
        totalReviewed: s.totalReviewed + reviewed,
      };
    });
  }, []);

  // ─── Settings ────────────────────────────────────────────────────────

  const setSetting = useCallback((key, value) => {
    setState(s => ({ ...s, settings: { ...s.settings, [key]: value } }));
  }, []);

  // ─── Reset ───────────────────────────────────────────────────────────

  const resetAll = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    setState(defaultState());
  }, []);

  return {
    state,
    fsrs,
    fsrsError,
    counts,
    isDue, isNew, isMastered,
    buildSession,
    previewIntervals,
    rateCard,
    pushWallMark,
    finishSession,
    setSetting,
    resetAll,
  };
}

Object.assign(window, {
  useFieldReady, DEFAULT_SETTINGS,
});
