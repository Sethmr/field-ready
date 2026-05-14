// Graffiti-style marker stamps. These render with stroke-dasharray draw-on
// animation when their `play` prop flips true. Slight rotation jitter and
// rough-marker SVG filter make them feel hand-drawn rather than vector-perfect.

const { useEffect, useRef, useState, useMemo } = React;

// A reusable rough-marker filter (turbulence + slight displacement).
function MarkerDefs() {
  return (
    <svg width="0" height="0" style={{position:"absolute"}} aria-hidden>
      <defs>
        <filter id="marker-rough" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" />
          <feDisplacementMap in="SourceGraphic" scale="1.2" />
        </filter>
        <filter id="marker-bleed" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.4" />
        </filter>
      </defs>
    </svg>
  );
}

// Internal: draw an SVG path on-mount with a stroke-dasharray transition.
function DrawnPath({ d, color, width = 9, duration = 420, delay = 0, cap = "round" }) {
  const ref = useRef(null);
  const [len, setLen] = useState(0);
  useEffect(() => {
    const path = ref.current;
    if (!path) return;
    const L = path.getTotalLength();
    setLen(L);
    path.style.strokeDasharray = String(L);
    path.style.strokeDashoffset = String(L);
    // force layout
    void path.getBoundingClientRect();
    path.style.transition = `stroke-dashoffset ${duration}ms cubic-bezier(.55,.1,.35,1) ${delay}ms`;
    path.style.strokeDashoffset = "0";
  }, [d]);
  return (
    <path
      ref={ref}
      d={d}
      stroke={color}
      strokeWidth={width}
      strokeLinecap={cap}
      strokeLinejoin="round"
      fill="none"
      filter="url(#marker-rough)"
    />
  );
}

// ───── Individual stamps ─────────────────────────────────────────────────

// Big handwritten checkmark for "Got it" — drawn in two strokes.
function StampCheck({ color = "#2F6B4A", size = 220 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200">
      <DrawnPath
        d="M 28 110 Q 50 122 75 152 Q 78 158 84 154 Q 110 110 175 50"
        color={color}
        width={18}
        duration={520}
      />
    </svg>
  );
}

// Star scribble for "Easy" + tiny "easy!" caveat tag.
function StampStar({ color = "#C45A2A", size = 220 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 220 220">
      <DrawnPath
        d="M 110 28 L 138 92 L 206 100 L 154 144 L 168 210 L 110 176 L 52 210 L 66 144 L 14 100 L 82 92 Z"
        color={color}
        width={11}
        duration={620}
      />
    </svg>
  );
}

// Sweeping double-underline for "Tough" — a "got there" tag.
function StampUnderline({ color = "#7A6A2F", size = 220 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 220 80">
      <DrawnPath
        d="M 14 36 Q 80 18 200 32 Q 210 34 206 42"
        color={color}
        width={12}
        delay={0}
        duration={500}
      />
      <DrawnPath
        d="M 22 58 Q 100 50 198 60"
        color={color}
        width={8}
        delay={260}
        duration={420}
      />
    </svg>
  );
}

// Soft circle stamp for "Not yet" — round and forgiving, not red.
function StampCircle({ color = "#4A6A86", size = 220 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 220 220">
      <DrawnPath
        d="M 60 28 C 18 50 6 130 50 178 C 100 218 178 200 198 152 C 220 90 178 22 122 18 C 96 16 76 22 60 30"
        color={color}
        width={11}
        duration={620}
      />
    </svg>
  );
}

// ───── Wrapper that picks stamp by rating + animates in ──────────────────

const STAMP_THEME = {
  1: { Component: StampCircle,    color: "#4A6A86", label: "again in a sec",  rotate: -8,  scribble: "again ↻" },
  2: { Component: StampUnderline, color: "#7A6A2F", label: "tough one",       rotate: -3,  scribble: "tough" },
  3: { Component: StampCheck,     color: "#2F6B4A", label: "got it",          rotate: -6,  scribble: "got it" },
  4: { Component: StampStar,      color: "#C45A2A", label: "easy",            rotate: 4,   scribble: "easy!" },
};

function RewardStamp({ rating, intensity = "playful" }) {
  const theme = STAMP_THEME[rating];
  if (!theme) return null;
  const { Component, color, rotate, scribble } = theme;
  // The little surrounding marker doodles — scaled by intensity.
  const doodleCount = intensity === "subtle" ? 0 : intensity === "loud" ? 6 : 3;
  const doodles = useMemo(() => makeDoodles(doodleCount), [doodleCount, rating]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 5,
      }}
    >
      {/* Doodles around the stamp */}
      {doodles.map((d, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${d.x}%`,
            top: `${d.y}%`,
            transform: `translate(-50%, -50%) rotate(${d.rot}deg)`,
            animation: `stamp-pop 500ms ${120 + i * 80}ms cubic-bezier(.2,1.5,.4,1) both`,
          }}
        >
          <Doodle kind={d.kind} color={color} size={d.size} />
        </div>
      ))}

      {/* Main stamp */}
      <div
        style={{
          transform: `rotate(${rotate}deg) scale(1)`,
          animation: "stamp-pop 380ms cubic-bezier(.2,1.5,.4,1) both",
          filter: "drop-shadow(0 1px 0 rgba(0,0,0,0.04))",
        }}
      >
        <Component color={color} />
      </div>

      {/* Caveat tag underneath */}
      <div
        style={{
          position: "absolute",
          bottom: "22%",
          fontFamily: "'Caveat', cursive",
          fontSize: 44,
          color,
          transform: `rotate(${rotate - 2}deg)`,
          animation: "stamp-pop 380ms 240ms cubic-bezier(.2,1.5,.4,1) both",
          opacity: 0,
          animationFillMode: "forwards",
        }}
      >
        {scribble}
      </div>
    </div>
  );
}

function makeDoodles(n) {
  // Deterministic-ish: spread around the periphery.
  const kinds = ["spark", "dot", "scribble", "tick", "swoosh"];
  const arr = [];
  for (let i = 0; i < n; i++) {
    const angle = (i / Math.max(n,1)) * Math.PI * 2 + Math.random() * 0.4;
    const r = 28 + Math.random() * 12; // pct radius from center
    arr.push({
      x: 50 + Math.cos(angle) * r,
      y: 50 + Math.sin(angle) * r,
      rot: Math.random() * 80 - 40,
      kind: kinds[i % kinds.length],
      size: 28 + Math.random() * 18,
    });
  }
  return arr;
}

function Doodle({ kind, color, size = 36 }) {
  const s = size;
  if (kind === "spark") {
    return (
      <svg width={s} height={s} viewBox="0 0 40 40">
        <DrawnPath d="M 20 4 L 20 16" color={color} width={4} duration={220} />
        <DrawnPath d="M 4 20 L 16 20" color={color} width={4} duration={220} delay={60} />
        <DrawnPath d="M 36 20 L 24 20" color={color} width={4} duration={220} delay={120} />
        <DrawnPath d="M 20 36 L 20 24" color={color} width={4} duration={220} delay={180} />
      </svg>
    );
  }
  if (kind === "dot") {
    return (
      <svg width={s/2} height={s/2} viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="5" fill={color} filter="url(#marker-rough)" />
      </svg>
    );
  }
  if (kind === "scribble") {
    return (
      <svg width={s} height={s/2} viewBox="0 0 40 20">
        <DrawnPath d="M 4 10 Q 12 2 20 10 T 36 10" color={color} width={3} duration={320} />
      </svg>
    );
  }
  if (kind === "tick") {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24">
        <DrawnPath d="M 4 12 L 10 18 L 20 6" color={color} width={3.5} duration={260} />
      </svg>
    );
  }
  if (kind === "swoosh") {
    return (
      <svg width={s} height={s/2} viewBox="0 0 40 20">
        <DrawnPath d="M 4 14 Q 14 2 36 6" color={color} width={3.5} duration={300} />
      </svg>
    );
  }
  return null;
}

// ───── A small static "mark" for the wall ───────────────────────────────

function WallMark({ rating, color, label, rot = 0, scale = 1 }) {
  const Component = STAMP_THEME[rating]?.Component || StampCheck;
  return (
    <div
      style={{
        transform: `rotate(${rot}deg) scale(${scale})`,
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0,
      }}
    >
      <Component color={color} size={60} />
      {label && (
        <span style={{
          fontFamily: "'Caveat', cursive",
          fontSize: 14,
          color,
          marginTop: -8,
        }}>
          {label}
        </span>
      )}
    </div>
  );
}

// ───── Animated "in your bones" tally (counts up) ───────────────────────

function CountUp({ to, duration = 700, suffix = "" }) {
  const [v, setV] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (typeof to !== "number") { setV(to); return; }
    let cancelled = false;
    const from = startedRef.current ? v : 0;
    startedRef.current = true;
    const start = Date.now();
    function step() {
      if (cancelled) return;
      const p = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const next = Math.round(from + (to - from) * eased);
      setV(next);
      if (p < 1) setTimeout(step, 16);
      else setV(to);
    }
    // Kick first frame immediately so background-throttled tabs still settle
    // to the right value via the setTimeout chain even if RAF stalls.
    step();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to, duration]);

  return <>{v}{suffix}</>;
}

Object.assign(window, {
  MarkerDefs, RewardStamp, WallMark, CountUp,
  StampCheck, StampStar, StampUnderline, StampCircle,
  STAMP_THEME,
});
