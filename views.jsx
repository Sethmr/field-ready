// views.jsx — Home, Review, Done views.

const PACK_HUE = {
  septic: 28, wells: 200, foundations: 14, logs: 36, older: 220,
  hvac: 188, forms: 320, cma: 162, helene: 0, ego: 270,
};

const PACK_SHORT = {
  septic: "Septic", wells: "Wells", foundations: "Foundations",
  logs: "Log Homes", older: "Older Homes", hvac: "HVAC",
  forms: "NC Forms", cma: "CMA", helene: "Helene", ego: "Walkthroughs",
};

function useMediaQuery(query) {
  const [matches, setMatches] = React.useState(() =>
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia(query).matches : false
  );
  React.useEffect(() => {
    if (!window.matchMedia) return;
    const mql = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    mql.addEventListener?.("change", handler);
    setMatches(mql.matches);
    return () => mql.removeEventListener?.("change", handler);
  }, [query]);
  return matches;
}

// ════════════════════════════════════════════════════════════════════════
// HOME
// ════════════════════════════════════════════════════════════════════════

function HomeView({ palette, fr, onStart, onOpenSettings }) {
  const { state, counts } = fr;
  const isDesktop = useMediaQuery("(min-width: 880px)");
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric"
  });

  const softVoice = state.settings.softVoice;
  const name = state.settings.name || "you";
  const hour = today.getHours();
  const greetWord = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";

  const ready = counts.due;
  const newAvailable = counts.newCount;
  const totalToShow = ready > 0 ? ready : Math.min(newAvailable, state.settings.newPerSession);
  const mins = Math.max(1, Math.round(totalToShow * 0.8));

  const greet = softVoice
    ? `${greetWord}, ${name}.`
    : "Today's queue";

  const sub = softVoice
    ? (ready > 0
      ? `${ready} cards ready. About ${mins} minutes — no pressure.`
      : (newAvailable > 0
        ? `Nothing's due right now — but ${newAvailable} new ones are waiting whenever you want them.`
        : "Nothing's due. Brain off for the day."))
    : (ready > 0 ? `${ready} due · ~${mins} min` : "No reviews due");

  return (
    <div style={{
      maxWidth: isDesktop ? 980 : 560,
      margin: "0 auto",
      padding: isDesktop ? "48px 48px 80px" : "44px 22px 80px",
    }}>
      {/* Header */}
      <header style={{
        textAlign: isDesktop ? "center" : "left",
        marginBottom: isDesktop ? 32 : 22,
        position: "relative",
      }}>
        <button
          onClick={onOpenSettings}
          aria-label="Settings"
          style={{
            position: "absolute",
            right: 0, top: 0,
            background: "transparent",
            border: "none",
            color: palette.inkSoft,
            cursor: "pointer",
            padding: 8,
            fontSize: 18,
            lineHeight: 1,
          }}
        >
          <SettingsIcon color={palette.inkSoft} />
        </button>

        <div style={{
          fontFamily: "'Caveat', cursive",
          color: palette.inkSoft,
          fontSize: isDesktop ? 24 : 22,
          marginBottom: 2,
          letterSpacing: 0.2,
        }}>
          {dateStr}
        </div>
        <h1 style={{
          fontFamily: "'Newsreader', serif",
          fontWeight: 500,
          fontSize: isDesktop ? 48 : 34,
          lineHeight: 1.05,
          margin: 0,
          letterSpacing: -0.5,
          color: palette.ink,
        }}>
          {greet}
        </h1>
        <p style={{
          margin: "10px 0 0",
          color: palette.inkSoft,
          fontSize: isDesktop ? 17 : 15,
          lineHeight: 1.45,
          maxWidth: isDesktop ? 540 : "unset",
          marginLeft: isDesktop ? "auto" : 0,
          marginRight: isDesktop ? "auto" : 0,
        }}>
          {sub}
        </p>
      </header>

      {/* Primary CTA card */}
      <div
        onClick={() => onStart()}
        role="button"
        style={{
          background: palette.card,
          border: `1px solid ${palette.rule}`,
          borderRadius: isDesktop ? 28 : 24,
          padding: isDesktop ? "30px 32px 26px" : "22px 22px 18px",
          cursor: ready === 0 && newAvailable === 0 ? "default" : "pointer",
          position: "relative",
          overflow: "hidden",
          marginBottom: 14,
          boxShadow: "0 1px 0 rgba(0,0,0,0.04), 0 14px 30px -22px rgba(0,0,0,0.25)",
          opacity: ready === 0 && newAvailable === 0 ? 0.6 : 1,
        }}
      >
        <div style={{
          position: "absolute",
          right: isDesktop ? -20 : -10, top: isDesktop ? -24 : -14,
          opacity: 0.18,
          transform: "rotate(-10deg)",
          pointerEvents: "none",
        }}>
          <StampStar color={palette.rust} size={isDesktop ? 200 : 150} />
        </div>
        <div style={{
          fontFamily: "'Caveat', cursive",
          fontSize: isDesktop ? 26 : 22,
          color: palette.rust,
          transform: "rotate(-2deg)",
          marginBottom: 6,
          display: "inline-block",
          whiteSpace: "nowrap",
        }}>warm‑up</div>
        <div style={{
          fontFamily: "'Newsreader', serif",
          fontSize: isDesktop ? 38 : 28,
          lineHeight: 1.1,
          letterSpacing: -0.4,
          marginBottom: 18,
          color: palette.ink,
        }}>
          {ready > 0 ? "Run today's drills" : (newAvailable > 0 ? "Start something new" : "All caught up")}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {totalToShow > 0 && (
            <>
              <Pill palette={palette} active>{totalToShow} card{totalToShow === 1 ? "" : "s"}</Pill>
              <Pill palette={palette}>~{mins} min</Pill>
            </>
          )}
          <div style={{ flex: 1, minWidth: 8 }} />
          {(ready > 0 || newAvailable > 0) && (
            <button
              style={{
                background: palette.ink,
                color: palette.paper,
                border: "none",
                borderRadius: 999,
                padding: isDesktop ? "14px 24px" : "12px 18px",
                fontSize: isDesktop ? 15 : 14,
                fontWeight: 600,
                fontFamily: "inherit",
                cursor: "pointer",
                letterSpacing: 0.2,
                whiteSpace: "nowrap",
              }}
              onClick={(e) => { e.stopPropagation(); onStart(); }}
            >
              Start →
            </button>
          )}
        </div>
      </div>

      {/* Quick options */}
      {(ready > 0 || newAvailable > 0) && (
        <div style={{
          display: "flex", gap: 8, marginBottom: 28,
        }}>
          <SoftButton palette={palette} onClick={() => onStart({ sizeOverride: 1 })}>Just one</SoftButton>
          <SoftButton palette={palette} onClick={() => onStart({ sizeOverride: 3 })}>Quick 3</SoftButton>
          <SoftButton palette={palette} onClick={() => onStart({ sizeOverride: 10 })}>Long-ish</SoftButton>
        </div>
      )}

      {/* Wall preview */}
      {state.settings.showWall && state.wall.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <SectionHeader palette={palette}
            title="Your wall"
            kicker={`${state.wall.length} mark${state.wall.length === 1 ? "" : "s"}`}
          />
          <WallStrip marks={state.wall.slice(0, isDesktop ? 20 : 8)} palette={palette} />
        </section>
      )}

      {/* Stats row */}
      <section style={{ marginBottom: 28 }}>
        <SectionHeader palette={palette} title="The shape of your week" />
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 10,
        }}>
          <Stat palette={palette} value={state.streak} label="day streak"
                hand={state.streak >= 7 ? "on a roll" : (state.streak >= 3 ? "warming up" : "day one")}
                color={palette.rust}/>
          <Stat palette={palette} value={counts.mastered} label="locked in" hand="in your bones" color={palette.green}/>
          <Stat palette={palette} value={state.totalReviewed} label="total reps" hand="all-time" color={palette.blue}/>
        </div>
      </section>

      {/* Packs */}
      <section style={{ marginBottom: 28 }}>
        <SectionHeader palette={palette} title="Packs" />
        <PackList palette={palette} isDesktop={isDesktop} state={state} />
      </section>

      <footer style={{
        marginTop: 8,
        textAlign: "center",
        color: palette.inkFaint,
        fontSize: 11,
        letterSpacing: 0.4,
        textTransform: "uppercase",
      }}>
        for {state.settings.name || "you"} · made with love
      </footer>
    </div>
  );
}

// ─── Home sub-components ─────────────────────────────────────────────────

function SettingsIcon({ color }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
}

function Pill({ children, palette, active }) {
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "6px 12px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 600,
      letterSpacing: 0.2,
      whiteSpace: "nowrap",
      background: active ? palette.ink : "transparent",
      color: active ? palette.paper : palette.inkSoft,
      border: active ? "none" : `1px solid ${palette.rule}`,
    }}>{children}</span>
  );
}

function SoftButton({ palette, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        background: "transparent",
        border: `1px dashed ${palette.rule}`,
        color: palette.inkSoft,
        padding: "12px 10px",
        borderRadius: 14,
        fontFamily: "inherit",
        fontSize: 13,
        fontWeight: 500,
        cursor: "pointer",
      }}
    >{children}</button>
  );
}

function SectionHeader({ palette, title, kicker }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "baseline",
      justifyContent: "space-between",
      marginBottom: 10,
    }}>
      <h2 style={{
        margin: 0,
        fontFamily: "'Newsreader', serif",
        fontSize: 20,
        fontWeight: 500,
        letterSpacing: -0.2,
        color: palette.ink,
      }}>{title}</h2>
      {kicker && (
        <span style={{
          fontFamily: "'Caveat', cursive",
          fontSize: 18,
          color: palette.inkSoft,
        }}>{kicker}</span>
      )}
    </div>
  );
}

function Stat({ palette, value, label, hand, color }) {
  return (
    <div style={{
      background: palette.card,
      border: `1px solid ${palette.rule}`,
      borderRadius: 18,
      padding: "16px 14px 14px",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        fontFamily: "'Newsreader', serif",
        fontSize: 36,
        lineHeight: 1,
        letterSpacing: -0.5,
        color: palette.ink,
      }}>{value}</div>
      <div style={{
        fontSize: 10,
        letterSpacing: 0.6,
        textTransform: "uppercase",
        color: palette.inkFaint,
        marginTop: 6,
      }}>{label}</div>
      <div style={{
        fontFamily: "'Caveat', cursive",
        color,
        fontSize: 17,
        transform: "rotate(-3deg)",
        marginTop: 2,
        lineHeight: 1,
      }}>{hand}</div>
    </div>
  );
}

function PackList({ palette, isDesktop, state }) {
  const entries = Object.entries(window.PACKS);
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: isDesktop ? "repeat(3, 1fr)" : "repeat(2, 1fr)",
      gap: 10,
    }}>
      {entries.map(([id, p]) => {
        const packCards = window.SEED_CARDS.filter(c => c.pack === id);
        const total = packCards.length;
        const mastered = packCards.filter(c => {
          const raw = state.cards[c.id];
          return raw && raw.state === 2 && raw.stability >= 60;
        }).length;
        const seen = packCards.filter(c => !!state.cards[c.id]).length;
        const pct = total ? (seen/total) : 0;
        const hue = PACK_HUE[id] ?? 200;
        return (
          <div key={id} style={{
            background: palette.card,
            border: `1px solid ${palette.rule}`,
            borderRadius: 14,
            padding: "12px 14px 12px",
          }}>
            <div style={{
              fontSize: 13,
              fontWeight: 600,
              color: palette.ink,
              marginBottom: 6,
              lineHeight: 1.25,
            }}>{p.name}</div>
            <div style={{
              height: 6, borderRadius: 999,
              background: palette.paperDeep,
              overflow: "hidden",
              marginBottom: 4,
            }}>
              <div style={{
                height: "100%",
                width: `${pct*100}%`,
                background: `hsl(${hue} 35% 45%)`,
                transition: "width 400ms ease",
              }} />
            </div>
            <div style={{
              fontSize: 11,
              color: palette.inkFaint,
              fontVariantNumeric: "tabular-nums",
            }}>{mastered} locked in / {seen} seen / {total}</div>
          </div>
        );
      })}
    </div>
  );
}

function WallStrip({ marks, palette }) {
  return (
    <div style={{
      background: palette.card,
      border: `1px solid ${palette.rule}`,
      borderRadius: 18,
      padding: "10px 8px",
      display: "flex",
      gap: 4,
      overflowX: "auto",
      backgroundImage: `repeating-linear-gradient(90deg, transparent 0 22px, ${palette.rule}33 22px 23px)`,
    }}>
      {marks.map((m, i) => (
        <div key={i} style={{
          flex: "0 0 auto",
          padding: "4px 2px",
        }}>
          <WallMark rating={m.rating} color={m.color} label={m.label} rot={m.rot} scale={0.8} />
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// REVIEW
// ════════════════════════════════════════════════════════════════════════

function ReviewView({ palette, fr, session, setSession, onExit, onFinish }) {
  const isDesktop = useMediaQuery("(min-width: 880px)");
  const softVoice = fr.state.settings.softVoice;
  const intensity = fr.state.settings.rewardIntensity;
  const card = session.queue[session.idx];
  const [revealed, setRevealed] = React.useState(false);
  const [lastRating, setLastRating] = React.useState(null);

  // Reset reveal/stamp on card change
  React.useEffect(() => {
    setRevealed(false);
    setLastRating(null);
  }, [session.idx]);

  // Keyboard shortcuts
  React.useEffect(() => {
    function handle(e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (lastRating) return;
      if (!revealed) {
        if (e.code === "Space" || e.code === "Enter") {
          e.preventDefault();
          setRevealed(true);
        }
        return;
      }
      if (["1","2","3","4"].includes(e.key)) {
        e.preventDefault();
        handleRate(Number(e.key));
      }
      if (e.key === "Escape") onExit();
    }
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [revealed, lastRating, session.idx]);

  if (!card) return null;
  const intervals = revealed ? fr.previewIntervals(card.cardId) : { 1:"", 2:"", 3:"", 4:"" };

  function handleRate(rating) {
    if (lastRating) return;
    setLastRating(rating);

    // Record FSRS + log
    fr.rateCard(card.cardId, card.variantId, rating);

    // Wall mark
    const color = rating === 1 ? palette.blue
                : rating === 2 ? palette.gold
                : rating === 3 ? palette.green
                : palette.rust;
    const labelMap = { 1: "again", 2: "tough", 3: "got it", 4: "easy!" };
    const mark = {
      rating, pack: card.pack, color, label: labelMap[rating],
      rot: (Math.random() * 20 - 10),
      cardId: card.cardId,
    };
    fr.pushWallMark(mark);

    // Advance after the reward animation
    setTimeout(() => {
      let nextQueue = session.queue;
      let nextIdx = session.idx + 1;
      const nextMarks = [...(session.marks || []), mark];
      // If "Again" — push the card back ~3 cards later this session
      if (rating === 1) {
        const reinsertIdx = Math.min(session.queue.length, session.idx + 3);
        nextQueue = [...session.queue];
        nextQueue.splice(reinsertIdx, 0, { ...card });
      }
      if (nextIdx >= nextQueue.length) {
        onFinish({ ...session, queue: nextQueue, idx: nextIdx, reviewed: session.reviewed + 1, marks: nextMarks });
      } else {
        setSession({ ...session, queue: nextQueue, idx: nextIdx, reviewed: session.reviewed + 1, marks: nextMarks });
      }
    }, 950);
  }

  return (
    <div style={{
      maxWidth: isDesktop ? 920 : 600,
      margin: "0 auto",
      padding: isDesktop ? "32px 48px 48px" : "44px 22px 30px",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Top bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 18,
      }}>
        <button
          onClick={onExit}
          style={{
            background: "transparent",
            border: "none",
            color: palette.inkSoft,
            fontFamily: "inherit",
            fontSize: 14,
            cursor: "pointer",
            padding: 4,
          }}
        >← Done for now</button>

        <ProgressDots total={session.queue.length} idx={session.idx} palette={palette} />

        <span style={{
          fontFamily: "'Caveat', cursive",
          fontSize: 18,
          color: palette.inkSoft,
          transform: "rotate(-3deg)",
          display: "inline-block",
          whiteSpace: "nowrap",
          textAlign: "right",
        }}>{PACK_SHORT[card.pack] || card.pack}</span>
      </div>

      {/* Card */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <article style={{
          background: palette.card,
          border: `1px solid ${palette.rule}`,
          borderRadius: isDesktop ? 32 : 26,
          flex: 1,
          display: "flex",
          flexDirection: isDesktop && card.image ? "row" : "column",
          overflow: "hidden",
          position: "relative",
          boxShadow: "0 1px 0 rgba(0,0,0,0.04), 0 18px 40px -28px rgba(0,0,0,0.3)",
          minHeight: isDesktop ? 420 : 360,
        }}>
          {/* Image */}
          {card.image && (
            <div style={{
              flex: isDesktop ? "0 0 44%" : "0 0 auto",
              aspectRatio: isDesktop ? "auto" : "16/10",
              background: palette.paperDeep,
              overflow: "hidden",
              borderRight: isDesktop ? `1px solid ${palette.rule}` : "none",
              borderBottom: !isDesktop ? `1px solid ${palette.rule}` : "none",
              minHeight: isDesktop ? "100%" : "auto",
            }}>
              <img
                src={card.image}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </div>
          )}

          <div style={{
            padding: isDesktop ? "32px 36px 32px" : "22px 24px 24px",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            minHeight: 0,
          }}>
            <div style={{
              fontFamily: "'Newsreader', serif",
              fontWeight: 500,
              fontSize: isDesktop ? 26 : 22,
              lineHeight: 1.3,
              color: palette.ink,
              letterSpacing: -0.2,
              textWrap: "pretty",
            }}>
              {card.front}
            </div>

            {revealed && (
              <div style={{
                marginTop: 22,
                paddingTop: 18,
                borderTop: `1px dashed ${palette.rule}`,
                color: palette.inkSoft,
                fontSize: isDesktop ? 18 : 16,
                lineHeight: 1.6,
                textWrap: "pretty",
                animation: "fade-up 360ms cubic-bezier(.2,.7,.2,1) both",
              }}>
                {card.back}
              </div>
            )}
          </div>

          {/* Reward stamp overlay */}
          {lastRating && (
            <RewardStamp rating={lastRating} intensity={intensity} />
          )}
        </article>
      </div>

      {/* Bottom actions */}
      <div style={{ marginTop: 18 }}>
        {!revealed && (
          <button
            onClick={() => setRevealed(true)}
            style={{
              width: "100%",
              background: palette.ink,
              color: palette.paper,
              border: "none",
              borderRadius: 18,
              padding: "16px",
              fontFamily: "inherit",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              letterSpacing: 0.2,
            }}
          >
            {softVoice ? "Let me see" : "Show answer"}
            <KbdHint palette={palette}>space</KbdHint>
          </button>
        )}

        {revealed && !lastRating && (
          <RateRow palette={palette} softVoice={softVoice} intervals={intervals} onRate={handleRate} />
        )}

        {lastRating && (
          <div style={{
            height: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'Caveat', cursive",
            color: palette.inkSoft,
            fontSize: 22,
            opacity: 0.7,
          }}>
            on to the next one…
          </div>
        )}
      </div>
    </div>
  );
}

function KbdHint({ children, palette }) {
  return (
    <span style={{
      marginLeft: 8,
      opacity: 0.6,
      fontSize: 11,
      fontFamily: "ui-monospace, SF Mono, Menlo, monospace",
      fontWeight: 400,
      letterSpacing: 0.5,
      textTransform: "uppercase",
    }}>{children}</span>
  );
}

function ProgressDots({ total, idx, palette }) {
  if (total <= 12) {
    return (
      <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{
            width: i === idx ? 22 : 7,
            height: 7,
            borderRadius: 999,
            background: i < idx ? palette.green
                      : i === idx ? palette.ink
                      : `${palette.ink}33`,
            transition: "width 240ms ease, background 240ms ease",
          }} />
        ))}
      </div>
    );
  }
  // Compact: just a fraction for long sessions
  return (
    <span style={{
      fontFamily: "ui-monospace, SF Mono, Menlo, monospace",
      fontSize: 13,
      color: palette.inkSoft,
      fontVariantNumeric: "tabular-nums",
    }}>{idx + 1} / {total}</span>
  );
}

const RATE_OPTIONS_SOFT = [
  { rating: 1, label: "Not yet",  colorKey: "blue" },
  { rating: 2, label: "Tough",    colorKey: "gold" },
  { rating: 3, label: "Got it",   colorKey: "green" },
  { rating: 4, label: "Easy",     colorKey: "rust" },
];

const RATE_OPTIONS_PLAIN = [
  { rating: 1, label: "Again",  colorKey: "blue" },
  { rating: 2, label: "Hard",   colorKey: "gold" },
  { rating: 3, label: "Good",   colorKey: "green" },
  { rating: 4, label: "Easy",   colorKey: "rust" },
];

function RateRow({ palette, softVoice, intervals, onRate }) {
  const opts = softVoice ? RATE_OPTIONS_SOFT : RATE_OPTIONS_PLAIN;
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 6,
    }}>
      {opts.map(o => {
        const c = palette[o.colorKey];
        const interval = intervals[o.rating];
        return (
          <button
            key={o.rating}
            onClick={() => onRate(o.rating)}
            style={{
              background: palette.card,
              border: `1.5px solid ${palette.rule}`,
              borderRadius: 16,
              padding: "12px 6px 10px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "transform 80ms ease, border-color 120ms ease, background 120ms ease",
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.97)"}
            onMouseUp={(e) => e.currentTarget.style.transform = ""}
            onMouseLeave={(e) => e.currentTarget.style.transform = ""}
          >
            <span style={{
              fontSize: 10,
              color: palette.inkFaint,
              fontFamily: "ui-monospace, SF Mono, Menlo, monospace",
              letterSpacing: 0.5,
            }}>{o.rating}</span>
            <span style={{
              fontWeight: 600,
              fontSize: 14,
              color: c,
              letterSpacing: 0.1,
            }}>{o.label}</span>
            <span style={{
              fontFamily: "'Caveat', cursive",
              fontSize: 14,
              color: palette.inkFaint,
              lineHeight: 1,
              minHeight: 14,
            }}>{interval}</span>
          </button>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// DONE
// ════════════════════════════════════════════════════════════════════════

function DoneView({ palette, fr, sessionMarks, onHome }) {
  const isDesktop = useMediaQuery("(min-width: 880px)");
  const reviewed = sessionMarks.length;
  const gotIt = sessionMarks.filter(m => m.rating >= 3).length;
  const streak = fr.state.streak;
  const name = fr.state.settings.name || "you";

  return (
    <div style={{
      maxWidth: isDesktop ? 820 : 600,
      margin: "0 auto",
      padding: isDesktop ? "60px 48px 80px" : "60px 22px 60px",
    }}>
      {/* Header celebration */}
      <header style={{ textAlign: "center", marginBottom: 26, position: "relative" }}>
        <div style={{
          position: "absolute", top: -10, left: "30%", transform: "rotate(-18deg)", opacity: 0.85,
        }}>
          <StampStar color={palette.rust} size={isDesktop ? 70 : 50} />
        </div>
        <div style={{
          position: "absolute", top: -6, right: "30%", transform: "rotate(12deg)", opacity: 0.85,
        }}>
          <StampCheck color={palette.green} size={isDesktop ? 80 : 56} />
        </div>

        <div style={{
          fontFamily: "'Caveat', cursive",
          fontSize: 26,
          color: palette.rust,
          transform: "rotate(-2deg)",
          marginBottom: 4,
        }}>that's a wrap</div>
        <h1 style={{
          fontFamily: "'Newsreader', serif",
          fontWeight: 500,
          fontSize: isDesktop ? 48 : 34,
          lineHeight: 1.05,
          margin: 0,
          letterSpacing: -0.5,
        }}>
          You made a mark.
        </h1>
        <p style={{
          margin: "12px 0 0",
          color: palette.inkSoft,
          fontSize: isDesktop ? 17 : 15,
          lineHeight: 1.45,
        }}>
          <CountUp to={reviewed} /> card{reviewed === 1 ? "" : "s"} reviewed · <CountUp to={gotIt} /> got on the first pass.
        </p>
      </header>

      {/* Streak ribbon */}
      <div style={{
        background: palette.card,
        border: `1px solid ${palette.rule}`,
        borderRadius: 20,
        padding: "20px 24px",
        display: "flex",
        alignItems: "center",
        gap: 18,
        position: "relative",
        overflow: "hidden",
        marginBottom: 24,
      }}>
        <div style={{ position: "absolute", right: -10, top: -14, opacity: 0.15, transform: "rotate(8deg)", pointerEvents: "none" }}>
          <StampStar color={palette.rust} size={130} />
        </div>
        <div>
          <div style={{
            fontFamily: "'Newsreader', serif",
            fontSize: 46,
            lineHeight: 1,
            color: palette.ink,
            letterSpacing: -1,
          }}>
            <CountUp to={streak} />
          </div>
          <div style={{
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: 0.6,
            color: palette.inkFaint,
            marginTop: 4,
          }}>day streak</div>
        </div>
        <div style={{ flex: 1, paddingLeft: 8 }}>
          <div style={{
            fontFamily: "'Caveat', cursive",
            fontSize: 24,
            color: palette.rust,
            transform: "rotate(-2deg)",
            lineHeight: 1.1,
            display: "inline-block",
          }}>
            {streak >= 14 ? `${name}, you are a force.`
             : streak >= 7 ? `${name}, you are on a roll.`
             : streak >= 3 ? `that's ${streak} in a row.`
             : "first one down."}
          </div>
          <div style={{ fontSize: 13, color: palette.inkSoft, marginTop: 4 }}>
            {streak >= 7 ? "Keep going. See you tomorrow."
             : streak >= 3 ? "A few more days and that's two solid weeks."
             : "Come back tomorrow. Five minutes is plenty."}
          </div>
        </div>
      </div>

      {/* Session wall */}
      <section style={{ marginBottom: 26 }}>
        <SectionHeader palette={palette}
          title="Today's marks"
          kicker={`+${reviewed}`}
        />
        <div style={{
          background: palette.card,
          border: `1px solid ${palette.rule}`,
          borderRadius: 18,
          padding: "18px 16px",
          display: "grid",
          gridTemplateColumns: `repeat(auto-fill, minmax(${isDesktop ? 90 : 70}px, 1fr))`,
          gap: 14,
          backgroundImage: `repeating-linear-gradient(90deg, transparent 0 22px, ${palette.rule}33 22px 23px), repeating-linear-gradient(0deg, transparent 0 22px, ${palette.rule}22 22px 23px)`,
        }}>
          {sessionMarks.map((m, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "center",
              animation: `fade-up 400ms ${60 * i}ms cubic-bezier(.2,1.5,.4,1) both`,
            }}>
              <WallMark rating={m.rating} color={m.color} label={m.label} rot={m.rot} scale={isDesktop ? 1.1 : 0.95} />
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <button
        onClick={onHome}
        style={{
          width: "100%",
          background: palette.ink,
          color: palette.paper,
          border: "none",
          borderRadius: 18,
          padding: "16px",
          fontFamily: "inherit",
          fontSize: 15,
          fontWeight: 600,
          cursor: "pointer",
          letterSpacing: 0.2,
        }}
      >Back home</button>

      <div style={{
        textAlign: "center",
        marginTop: 20,
        fontFamily: "'Caveat', cursive",
        color: palette.inkSoft,
        fontSize: 22,
        transform: "rotate(-1deg)",
      }}>
        see you tomorrow ♡
      </div>
    </div>
  );
}

Object.assign(window, {
  HomeView, ReviewView, DoneView, useMediaQuery,
  PACK_SHORT, PACK_HUE,
});
