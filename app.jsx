// app.jsx — top-level shell, palette, routing, settings sheet, mount.

const PALETTES = {
  cream: {
    name: "Cream",
    paper:    "#F4ECDD",
    paperDeep:"#E8DEC8",
    card:     "#FBF6EA",
    ink:      "#22201D",
    inkSoft:  "#5C544A",
    inkFaint: "#9A9082",
    rule:     "#D9CFB8",
    rust:     "#C45A2A",
    green:    "#3E6B4B",
    blue:     "#3D6E85",
    gold:     "#B68A2B",
    bodyBg:   "radial-gradient(circle at 30% 20%, #E9DDC4 0%, #D6C8AC 45%, #BFAE8F 100%)",
  },
  dusk: {
    name: "Dusk",
    paper:    "#1F2326",
    paperDeep:"#16191B",
    card:     "#262B2F",
    ink:      "#F0EBDE",
    inkSoft:  "#B6AE9D",
    inkFaint: "#7B7468",
    rule:     "#34393D",
    rust:     "#E08856",
    green:    "#7DAE82",
    blue:     "#7CB0CC",
    gold:     "#D9B662",
    bodyBg:   "radial-gradient(circle at 30% 20%, #2A2F33 0%, #1A1D1F 60%, #0F1112 100%)",
  },
  meadow: {
    name: "Meadow",
    paper:    "#EDEEDF",
    paperDeep:"#DDDFC8",
    card:     "#F7F8EE",
    ink:      "#1F2A22",
    inkSoft:  "#566058",
    inkFaint: "#909788",
    rule:     "#CFD2BC",
    rust:     "#9C5B2A",
    green:    "#37623F",
    blue:     "#3A6D7D",
    gold:     "#9B7C28",
    bodyBg:   "radial-gradient(circle at 30% 20%, #E0E2C9 0%, #C7C9AC 50%, #A2A78A 100%)",
  },
};

// Apply body background based on palette.
function PaletteBackground({ palette }) {
  React.useEffect(() => {
    document.body.style.background = palette.bodyBg;
    document.body.style.color = palette.ink;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", palette.paper);
  }, [palette]);
  return null;
}

// ════════════════════════════════════════════════════════════════════════
// Main app
// ════════════════════════════════════════════════════════════════════════

function App() {
  const fr = useFieldReady();
  const palette = PALETTES[fr.state.settings.palette] || PALETTES.cream;

  // Routing
  const [view, setView] = React.useState("home"); // home | review | done
  const [session, setSession] = React.useState(null);
  const [doneMarks, setDoneMarks] = React.useState([]);
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  function startSession(opts = {}) {
    if (!fr.fsrs) return; // not yet loaded
    const queue = fr.buildSession(opts);
    if (queue.length === 0) return;
    // Preload session images so the first card doesn't show a fetch flash
    // and subsequent cards feel instant. Browsers fetch in parallel.
    for (const entry of queue) {
      if (entry.image) {
        const img = new Image();
        img.src = entry.image;
      }
    }
    setSession({ queue, idx: 0, reviewed: 0, marks: [] });
    setView("review");
  }

  function handleFinish(finalSession) {
    fr.finishSession(finalSession.reviewed);
    setDoneMarks(finalSession.marks || []);
    setSession(null);
    setView("done");
  }

  function handleExit() {
    if (session && session.reviewed > 0) {
      handleFinish(session);
    } else {
      setSession(null);
      setView("home");
    }
  }

  // Loading state
  if (!fr.fsrs && !fr.fsrsError) {
    return (
      <>
        <PaletteBackground palette={palette} />
        <MarkerDefs />
        <PaperGrain />
        <LoadingState palette={palette} />
      </>
    );
  }
  if (fr.fsrsError) {
    return (
      <>
        <PaletteBackground palette={palette} />
        <MarkerDefs />
        <ErrorState palette={palette} />
      </>
    );
  }

  return (
    <>
      <PaletteBackground palette={palette} />
      <MarkerDefs />
      <PaperGrain />

      {view === "home" && (
        <HomeView
          palette={palette}
          fr={fr}
          onStart={startSession}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}
      {view === "review" && session && (
        <ReviewView
          palette={palette}
          fr={fr}
          session={session}
          setSession={setSession}
          onExit={handleExit}
          onFinish={handleFinish}
        />
      )}
      {view === "done" && (
        <DoneView
          palette={palette}
          fr={fr}
          sessionMarks={doneMarks}
          onHome={() => { setDoneMarks([]); setView("home"); }}
        />
      )}

      {settingsOpen && (
        <SettingsSheet
          palette={palette}
          fr={fr}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Loading / error
// ════════════════════════════════════════════════════════════════════════

function LoadingState({ palette }) {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 40,
    }}>
      <div style={{
        background: palette.card,
        border: `1px solid ${palette.rule}`,
        borderRadius: 24,
        padding: "32px 36px",
        textAlign: "center",
        maxWidth: 360,
      }}>
        <div style={{
          fontFamily: "'Caveat', cursive",
          fontSize: 26,
          color: palette.rust,
          transform: "rotate(-2deg)",
          marginBottom: 6,
          display: "inline-block",
        }}>warming up</div>
        <div style={{
          fontFamily: "'Newsreader', serif",
          fontSize: 22,
          color: palette.ink,
          lineHeight: 1.3,
        }}>Pulling your cards…</div>
      </div>
    </div>
  );
}

function ErrorState({ palette }) {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 40,
    }}>
      <div style={{
        background: palette.card,
        border: `1px solid ${palette.rule}`,
        borderRadius: 24,
        padding: "32px 36px",
        maxWidth: 420,
        textAlign: "center",
      }}>
        <div style={{
          fontFamily: "'Newsreader', serif",
          fontSize: 22,
          color: palette.ink,
          marginBottom: 8,
        }}>Couldn't load the scheduler.</div>
        <div style={{ color: palette.inkSoft, fontSize: 14, lineHeight: 1.5, marginBottom: 16 }}>
          FieldReady needs an internet connection the first time so it can fetch the FSRS library. After that it works offline.
        </div>
        <button onClick={() => location.reload()} style={{
          background: palette.ink,
          color: palette.paper,
          border: "none",
          borderRadius: 12,
          padding: "10px 18px",
          fontFamily: "inherit",
          fontSize: 14,
          cursor: "pointer",
        }}>Try again</button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Settings sheet (modal)
// ════════════════════════════════════════════════════════════════════════

function SettingsSheet({ palette, fr, onClose }) {
  const s = fr.state.settings;
  const [confirmReset, setConfirmReset] = React.useState(false);
  const isDesktop = useMediaQuery("(min-width: 720px)");

  React.useEffect(() => {
    function handle(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20, 18, 16, 0.55)",
        backdropFilter: "blur(4px)",
        zIndex: 200,
        display: "flex",
        alignItems: isDesktop ? "center" : "flex-end",
        justifyContent: "center",
        padding: isDesktop ? 40 : 0,
        animation: "fade-up 220ms cubic-bezier(.2,.7,.2,1) both",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: palette.paper,
          color: palette.ink,
          width: "100%",
          maxWidth: 540,
          maxHeight: isDesktop ? "85vh" : "90vh",
          overflowY: "auto",
          borderRadius: isDesktop ? 24 : "24px 24px 0 0",
          border: `1px solid ${palette.rule}`,
          padding: isDesktop ? "28px 30px 24px" : "22px 22px 32px",
          fontFamily: "'Manrope', system-ui, sans-serif",
          animation: isDesktop ? "fade-up 280ms cubic-bezier(.2,.7,.2,1) both" : "slide-up 320ms cubic-bezier(.2,.7,.2,1) both",
        }}
      >
        {/* Drag handle on mobile */}
        {!isDesktop && (
          <div style={{
            width: 44, height: 5, borderRadius: 999,
            background: palette.rule,
            margin: "-6px auto 14px",
          }} />
        )}

        <header style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 18,
        }}>
          <h2 style={{
            margin: 0,
            fontFamily: "'Newsreader', serif",
            fontWeight: 500,
            fontSize: 28,
            letterSpacing: -0.3,
          }}>Settings</h2>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: palette.inkSoft,
              cursor: "pointer",
              fontSize: 14,
              padding: 4,
            }}
          >Close</button>
        </header>

        {/* Name */}
        <SettingsRow palette={palette} label="Your name">
          <input
            type="text"
            value={s.name}
            onChange={(e) => fr.setSetting("name", e.target.value)}
            style={inputStyle(palette)}
          />
        </SettingsRow>

        {/* Palette */}
        <SettingsRow palette={palette} label="Palette">
          <Segmented palette={palette} value={s.palette}
            onChange={(v) => fr.setSetting("palette", v)}
            options={[
              { value: "cream",  label: "Cream" },
              { value: "meadow", label: "Meadow" },
              { value: "dusk",   label: "Dusk" },
            ]} />
        </SettingsRow>

        {/* Cards per session */}
        <SettingsRow palette={palette} label="New cards per session"
          value={s.newPerSession}>
          <input
            type="range"
            min="1" max="20"
            value={s.newPerSession}
            onChange={(e) => fr.setSetting("newPerSession", Number(e.target.value))}
            style={rangeStyle(palette)}
          />
        </SettingsRow>

        <SettingsRow palette={palette} label="Max reviews per session"
          value={s.maxReviews}>
          <input
            type="range"
            min="5" max="120" step="5"
            value={s.maxReviews}
            onChange={(e) => fr.setSetting("maxReviews", Number(e.target.value))}
            style={rangeStyle(palette)}
          />
        </SettingsRow>

        {/* Reward intensity */}
        <SettingsRow palette={palette} label="Rewards">
          <Segmented palette={palette} value={s.rewardIntensity}
            onChange={(v) => fr.setSetting("rewardIntensity", v)}
            options={[
              { value: "subtle",  label: "Subtle" },
              { value: "playful", label: "Playful" },
              { value: "loud",    label: "Loud" },
            ]} />
        </SettingsRow>

        {/* Soft voice toggle */}
        <SettingsRow palette={palette} label="Softer wording"
          sub={s.softVoice ? "“Got it / Not yet”" : "“Good / Again”"}>
          <Toggle palette={palette} value={s.softVoice}
            onChange={(v) => fr.setSetting("softVoice", v)} />
        </SettingsRow>

        {/* Wall toggle */}
        <SettingsRow palette={palette} label="Show the wall">
          <Toggle palette={palette} value={s.showWall}
            onChange={(v) => fr.setSetting("showWall", v)} />
        </SettingsRow>

        {/* Stats row */}
        <div style={{
          marginTop: 18,
          padding: "14px 16px",
          background: palette.card,
          border: `1px solid ${palette.rule}`,
          borderRadius: 14,
          fontSize: 13,
          color: palette.inkSoft,
          lineHeight: 1.5,
        }}>
          {fr.state.answerLog.length} answers logged on this device · {fr.state.totalReviewed} total cards reviewed.
        </div>

        {/* Reset */}
        <div style={{ marginTop: 22 }}>
          {!confirmReset ? (
            <button
              onClick={() => setConfirmReset(true)}
              style={{
                background: "transparent",
                color: palette.inkSoft,
                border: `1px solid ${palette.rule}`,
                borderRadius: 12,
                padding: "10px 14px",
                fontFamily: "inherit",
                fontSize: 13,
                cursor: "pointer",
              }}
            >Start fresh on this device…</button>
          ) : (
            <div style={{
              padding: 14,
              border: `1px dashed ${palette.rust}`,
              borderRadius: 12,
              background: `${palette.rust}11`,
            }}>
              <div style={{ fontSize: 14, marginBottom: 12, color: palette.ink }}>
                This erases your streak, your wall, and every card's spacing data on this device. Can't be undone.
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setConfirmReset(false)}
                  style={{
                    flex: 1,
                    background: "transparent",
                    color: palette.inkSoft,
                    border: `1px solid ${palette.rule}`,
                    borderRadius: 10,
                    padding: "10px 12px",
                    fontFamily: "inherit",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >Cancel</button>
                <button
                  onClick={() => {
                    fr.resetAll();
                    setConfirmReset(false);
                    onClose();
                  }}
                  style={{
                    flex: 1,
                    background: palette.rust,
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    padding: "10px 12px",
                    fontFamily: "inherit",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >Yes, erase</button>
              </div>
            </div>
          )}
        </div>

        <div style={{
          marginTop: 20,
          textAlign: "center",
          color: palette.inkFaint,
          fontSize: 10,
          letterSpacing: 0.4,
          textTransform: "uppercase",
        }}>
          for {s.name || "you"} · made with love
        </div>
      </div>
    </div>
  );
}

function SettingsRow({ palette, label, value, sub, children }) {
  return (
    <div style={{
      padding: "12px 0",
      borderBottom: `1px solid ${palette.rule}55`,
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        marginBottom: 8,
        gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: palette.ink }}>{label}</div>
          {sub && (
            <div style={{
              fontFamily: "'Caveat', cursive",
              color: palette.inkSoft,
              fontSize: 16,
              marginTop: -2,
            }}>{sub}</div>
          )}
        </div>
        {value !== undefined && (
          <span style={{
            fontFamily: "ui-monospace, SF Mono, Menlo, monospace",
            fontSize: 13,
            color: palette.inkSoft,
            fontVariantNumeric: "tabular-nums",
          }}>{value}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function Segmented({ palette, value, options, onChange }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(${options.length}, 1fr)`,
      background: palette.paperDeep,
      borderRadius: 12,
      padding: 3,
      gap: 2,
    }}>
      {options.map(o => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            style={{
              background: active ? palette.card : "transparent",
              color: active ? palette.ink : palette.inkSoft,
              border: "none",
              borderRadius: 9,
              padding: "9px 10px",
              fontFamily: "inherit",
              fontSize: 13,
              fontWeight: active ? 600 : 500,
              cursor: "pointer",
              boxShadow: active ? "0 1px 4px rgba(0,0,0,0.06)" : "none",
              transition: "background 160ms ease, color 160ms ease",
            }}
          >{o.label}</button>
        );
      })}
    </div>
  );
}

function Toggle({ palette, value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      role="switch"
      aria-checked={value}
      style={{
        width: 46,
        height: 28,
        borderRadius: 999,
        border: "none",
        background: value ? palette.green : palette.paperDeep,
        position: "relative",
        cursor: "pointer",
        transition: "background 180ms ease",
        padding: 0,
        marginLeft: "auto",
        display: "block",
      }}
    >
      <span style={{
        position: "absolute",
        top: 3, left: value ? 22 : 3,
        width: 22, height: 22,
        borderRadius: 999,
        background: "#fff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        transition: "left 200ms cubic-bezier(.2,1.2,.4,1)",
      }}/>
    </button>
  );
}

function inputStyle(palette) {
  return {
    width: "100%",
    background: palette.card,
    border: `1px solid ${palette.rule}`,
    borderRadius: 10,
    padding: "10px 12px",
    color: palette.ink,
    fontFamily: "inherit",
    fontSize: 14,
    outline: "none",
  };
}

function rangeStyle(palette) {
  return {
    width: "100%",
    accentColor: palette.rust,
    cursor: "pointer",
  };
}

// ════════════════════════════════════════════════════════════════════════
// Paper grain backdrop overlay
// ════════════════════════════════════════════════════════════════════════

function PaperGrain() {
  return (
    <div
      aria-hidden
      style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='4'/><feColorMatrix values='0 0 0 0 0.4  0 0 0 0 0.3  0 0 0 0 0.2  0 0 0 0.06 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`,
        opacity: 0.55,
        mixBlendMode: "multiply",
        zIndex: 0,
      }}
    />
  );
}

// ════════════════════════════════════════════════════════════════════════
// Mount
// ════════════════════════════════════════════════════════════════════════

const root = ReactDOM.createRoot(document.getElementById("app-root"));
root.render(<App />);
