import { useState, useEffect, useCallback } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const DAYS_FULL  = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const DAYS_SHORT = ["M","T","W","T","F","S","S"];
const EMOJIS  = ["🌱","🔥","💧","📚","🧘","🏃","🎨","🎵","🥗","😴","🧠","💪","🌞","🎯","✍️"];
const PALETTE = ["#4a7c59","#7b6fa0","#c0784a","#4a8fa3","#a05c7b","#8fa04a","#a07840","#4a6ca0","#a04a4a","#4a9a8a"];

const QUOTES = [
  "Small steps. Big change.",
  "Every check is a promise kept.",
  "Growth is invisible until it isn't.",
  "You don't rise to goals — you fall to systems.",
  "The best time was yesterday. Now is second best.",
  "Consistency is the compound interest of effort.",
  "Build the life you keep meaning to start.",
];

const MOODS = [
  { icon: "😞", label: "Rough",   val: 1 },
  { icon: "😐", label: "Meh",     val: 2 },
  { icon: "🙂", label: "Okay",    val: 3 },
  { icon: "😊", label: "Good",    val: 4 },
  { icon: "🤩", label: "Amazing", val: 5 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const dateKey = (d = new Date()) =>
  `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

const getWeekKeys = () => {
  const today = new Date();
  const mon = new Date(today);
  mon.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return dateKey(d);
  });
};

const getStreak = (completions) => {
  let s = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    if (completions[dateKey(d)]) s++;
    else if (i > 0) break;
  }
  return s;
};

const getLongestStreak = (completions) => {
  const keys = Object.keys(completions).sort();
  let best = 0, cur = 0, prev = null;
  keys.forEach(k => {
    const [y, m, dd] = k.split("-").map(Number);
    const dt = new Date(y, m, dd);
    if (prev) {
      const diff = (dt - prev) / 86400000;
      cur = diff === 1 ? cur + 1 : 1;
    } else {
      cur = 1;
    }
    best = Math.max(best, cur);
    prev = dt;
  });
  return best;
};

const getTotalDone = (completions) => Object.keys(completions).length;

const useWindowWidth = () => {
  const [w, setW] = useState(
    typeof window !== "undefined" ? window.innerWidth : 800
  );
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return w;
};

// ─── Storage (localStorage — works everywhere including Azure) ────────────────
const STORE_KEY = "bloom-data-v2";

function loadData() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveData(data) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Storage save failed:", e);
  }
}

// ─── Default habits ───────────────────────────────────────────────────────────
const defaultHabits = [
  { id: 1, name: "Morning walk",  emoji: "🏃", color: "#4a7c59", completions: {}, notes: {} },
  { id: 2, name: "Read 20 min",   emoji: "📚", color: "#7b6fa0", completions: {}, notes: {} },
  { id: 3, name: "Drink water",   emoji: "💧", color: "#4a8fa3", completions: {}, notes: {} },
];

// ─── ConfettiPop ──────────────────────────────────────────────────────────────
function ConfettiPop({ x, y, color, onDone }) {
  const particles = Array.from({ length: 10 }, (_, i) => ({
    angle: (i / 10) * 360,
    dist: 30 + Math.random() * 30,
    size: 4 + Math.random() * 4,
  }));
  useEffect(() => {
    const t = setTimeout(onDone, 700);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div style={{ position: "fixed", left: x, top: y, pointerEvents: "none", zIndex: 9999 }}>
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background: color,
            animation: "confettiBurst 0.6s ease-out forwards",
            transformOrigin: "center",
            "--dx": `${Math.cos((p.angle * Math.PI) / 180) * p.dist}px`,
            "--dy": `${Math.sin((p.angle * Math.PI) / 180) * p.dist}px`,
          }}
        />
      ))}
    </div>
  );
}

// ─── MoodRing ─────────────────────────────────────────────────────────────────
function MoodRing({ moods, todayKey, onSet }) {
  const today = moods[todayKey];
  return (
    <div style={{
      background: "#faf6f0cc", borderRadius: 14, border: "1px solid #e0d8ce",
      padding: "12px 16px", marginBottom: 14,
    }}>
      <div style={{
        fontSize: 11, color: "#8a7a6a", letterSpacing: "0.08em",
        textTransform: "uppercase", marginBottom: 10,
      }}>
        How are you feeling today?
      </div>
      <div style={{ display: "flex", gap: 6, justifyContent: "space-between" }}>
        {MOODS.map(m => (
          <button
            key={m.val}
            onClick={() => onSet(m.val)}
            style={{
              flex: 1, padding: "8px 0", borderRadius: 12, border: "none",
              cursor: "pointer", touchAction: "manipulation",
              background: today === m.val ? "#2d2418" : "#f0e8de",
              transform: today === m.val ? "scale(1.1)" : "scale(1)",
              transition: "all 0.18s",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            }}
          >
            <span style={{ fontSize: 18 }}>{m.icon}</span>
            <span style={{
              fontSize: 9,
              color: today === m.val ? "#f5efe6" : "#8a7a6a",
              letterSpacing: "0.05em",
            }}>
              {m.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── StatsModal ───────────────────────────────────────────────────────────────
function StatsModal({ habits, onClose }) {
  const totalCompletions = habits.reduce((s, h) => s + getTotalDone(h.completions), 0);
  const bestStreak = habits.reduce((s, h) => Math.max(s, getLongestStreak(h.completions)), 0);

  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const k = dateKey(d);
    const done = habits.filter(h => h.completions[k]).length;
    return { done, total: habits.length, day: d.getDate() };
  });

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(45,36,24,0.55)",
        zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center",
        backdropFilter: "blur(3px)",
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#f5efe6", borderRadius: "20px 20px 0 0",
          width: "100%", maxWidth: 640, padding: 24, paddingBottom: 36,
          maxHeight: "80vh", overflowY: "auto",
          animation: "slideUp 0.3s ease",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, color: "#2d2418", margin: 0 }}>
            Your Garden 🌿
          </h2>
          <button onClick={onClose} style={{
            background: "transparent", border: "none", fontSize: 22,
            color: "#8a7a6a", cursor: "pointer",
          }}>×</button>
        </div>

        {/* Summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
          {[
            { label: "Total Done",  val: totalCompletions, icon: "✅" },
            { label: "Best Streak", val: `${bestStreak}d`,  icon: "🔥" },
            { label: "Habits",      val: habits.length,     icon: "🌱" },
          ].map(s => (
            <div key={s.label} style={{
              background: "#faf6f0", borderRadius: 12, padding: "12px 10px",
              textAlign: "center", border: "1px solid #e0d8ce",
            }}>
              <div style={{ fontSize: 20 }}>{s.icon}</div>
              <div style={{
                fontFamily: "'Playfair Display',serif", fontSize: 22,
                color: "#2d2418", fontWeight: 700,
              }}>{s.val}</div>
              <div style={{
                fontSize: 10, color: "#8a7a6a",
                letterSpacing: "0.06em", textTransform: "uppercase",
              }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* 30-day heatmap */}
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 11, color: "#8a7a6a", letterSpacing: "0.08em",
            textTransform: "uppercase", marginBottom: 8,
          }}>Last 30 Days</div>
          <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
            {last30.map((d, i) => {
              const ratio = d.total ? d.done / d.total : 0;
              return (
                <div key={i} style={{
                  width: 16, height: 16, borderRadius: 3,
                  background: ratio === 0 ? "#e0d8ce"
                    : ratio < 0.5 ? "#a8c9b0"
                    : ratio < 1   ? "#6aa87e"
                    : "#4a7c59",
                  transition: "background 0.2s",
                }} />
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>
            {[["#e0d8ce","None"],["#a8c9b0","Some"],["#6aa87e","Most"],["#4a7c59","All"]].map(([c, l]) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
                <span style={{ fontSize: 9, color: "#8a7a6a" }}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Per-habit breakdown */}
        <div style={{
          fontSize: 11, color: "#8a7a6a", letterSpacing: "0.08em",
          textTransform: "uppercase", marginBottom: 8,
        }}>Per Habit</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[...habits]
            .sort((a, b) => getTotalDone(b.completions) - getTotalDone(a.completions))
            .map(h => {
              const total = getTotalDone(h.completions);
              const streak = getStreak(h.completions);
              const longest = getLongestStreak(h.completions);
              return (
                <div key={h.id} style={{
                  background: "#faf6f0", borderRadius: 10, padding: "10px 14px",
                  border: "1px solid #e0d8ce", display: "flex", alignItems: "center", gap: 12,
                }}>
                  <span style={{ fontSize: 20 }}>{h.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: "#2d2418", marginBottom: 4 }}>{h.name}</div>
                    <div style={{ height: 4, background: "#e0d8ce", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: 2, background: h.color,
                        width: `${Math.min(100, (total / 90) * 100)}%`,
                        transition: "width 0.6s ease",
                      }} />
                    </div>
                  </div>
                  <div style={{ textAlign: "right", fontSize: 11, color: "#8a7a6a", lineHeight: 1.6 }}>
                    <div style={{ color: h.color, fontWeight: 700, fontSize: 14 }}>{total}×</div>
                    <div>🔥{streak} now</div>
                    <div>⭐{longest} best</div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

// ─── NoteModal ────────────────────────────────────────────────────────────────
function NoteModal({ habit, dayKey, onSave, onClose }) {
  const [text, setText] = useState(habit.notes?.[dayKey] || "");
  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(45,36,24,0.55)",
        zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
        backdropFilter: "blur(3px)", padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#f5efe6", borderRadius: 18, padding: 22,
          width: "100%", maxWidth: 400, animation: "fadeSlideIn 0.25s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 22 }}>{habit.emoji}</span>
          <h3 style={{
            fontFamily: "'Playfair Display',serif", fontSize: 17,
            color: "#2d2418", margin: 0, fontStyle: "italic",
          }}>{habit.name}</h3>
        </div>
        <textarea
          autoFocus
          placeholder="Add a note for today… how did it go?"
          value={text}
          onChange={e => setText(e.target.value)}
          style={{
            width: "100%", minHeight: 100, boxSizing: "border-box",
            background: "#f0e8de", border: "1px solid #d0c8be",
            borderRadius: 10, padding: "10px 14px",
            fontFamily: "'Lato',sans-serif", fontSize: 14,
            color: "#2d2418", outline: "none", resize: "vertical",
          }}
        />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
          <button onClick={onClose} style={{
            background: "transparent", border: "1px solid #c8bfb0",
            color: "#8a7a6a", padding: "8px 16px", borderRadius: 20,
            cursor: "pointer", fontSize: 13,
          }}>cancel</button>
          <button onClick={() => onSave(text)} style={{
            background: habit.color, border: "none", color: "#fff",
            padding: "8px 18px", borderRadius: 20, cursor: "pointer", fontSize: 13,
          }}>save note</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [habits,    setHabits]    = useState([]);
  const [moods,     setMoods]     = useState({});
  const [loaded,    setLoaded]    = useState(false);
  const [adding,    setAdding]    = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [noteModal, setNoteModal] = useState(null);
  const [confetti,  setConfetti]  = useState([]);
  const [newName,   setNewName]   = useState("");
  const [newEmoji,  setNewEmoji]  = useState("🌱");
  const [newColor,  setNewColor]  = useState(PALETTE[0]);
  const [saveStatus,setSaveStatus]= useState("");
  const [quoteIdx,  setQuoteIdx]  = useState(() => Math.floor(Math.random() * QUOTES.length));

  const width    = useWindowWidth();
  const isMobile = width < 480;
  const isTablet = width >= 480 && width < 768;
  const DAYS     = isMobile ? DAYS_SHORT : DAYS_FULL;

  const weekKeys = getWeekKeys();
  const todayKey = dateKey();
  const todayDow = (new Date().getDay() + 6) % 7;

  const dotSize    = isMobile ? 34 : isTablet ? 38 : 42;
  const labelWidth = isTablet ? 140 : 180;
  const streakW    = isMobile ? 36 : 52;
  const rowGap     = isMobile ? 4 : 6;
  const cPad       = isMobile ? "18px 12px" : isTablet ? "28px 20px" : "40px 28px";
  const titleSize  = isMobile ? 28 : isTablet ? 34 : 42;

  // ── Load from localStorage ──
  useEffect(() => {
    const data = loadData();
    if (data) {
      setHabits(data.habits || defaultHabits);
      setMoods(data.moods || {});
    } else {
      setHabits(defaultHabits);
    }
    setLoaded(true);
  }, []);

  // ── Rotating quote ──
  useEffect(() => {
    const t = setInterval(() => setQuoteIdx(i => (i + 1) % QUOTES.length), 8000);
    return () => clearInterval(t);
  }, []);

  // ── Persist to localStorage ──
  const persist = useCallback((h, m) => {
    saveData({ habits: h, moods: m });
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus(""), 1400);
  }, []);

  // ── Toggle ──
  const toggle = (habitId, key, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top  + rect.height / 2;

    const updated = habits.map(h => {
      if (h.id !== habitId) return h;
      const c = { ...h.completions };
      if (c[key]) {
        delete c[key];
      } else {
        c[key] = true;
        if (key === todayKey) {
          const id = Date.now() + Math.random();
          setConfetti(prev => [...prev, { id, x: cx, y: cy, color: h.color }]);
        }
      }
      return { ...h, completions: c };
    });
    setHabits(updated);
    persist(updated, moods);
  };

  const removeConfetti = useCallback((id) => {
    setConfetti(prev => prev.filter(c => c.id !== id));
  }, []);

  // ── Add / remove ──
  const addHabit = () => {
    if (!newName.trim()) return;
    const updated = [...habits, {
      id: Date.now(), name: newName.trim(),
      emoji: newEmoji, color: newColor,
      completions: {}, notes: {},
    }];
    setHabits(updated);
    persist(updated, moods);
    setNewName(""); setNewEmoji("🌱"); setNewColor(PALETTE[0]); setAdding(false);
  };

  const removeHabit = (id) => {
    const updated = habits.filter(h => h.id !== id);
    setHabits(updated);
    persist(updated, moods);
  };

  // ── Mood ──
  const setMood = (val) => {
    const updated = { ...moods, [todayKey]: val };
    setMoods(updated);
    persist(habits, updated);
  };

  // ── Notes ──
  const saveNote = (text) => {
    const { habit, dayKey: dk } = noteModal;
    const updated = habits.map(h =>
      h.id === habit.id
        ? { ...h, notes: { ...h.notes, [dk]: text } }
        : h
    );
    setHabits(updated);
    persist(updated, moods);
    setNoteModal(null);
  };

  if (!loaded) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: "100vh", fontSize: 48,
      }}>
        <span style={{ animation: "bounce 1s ease-in-out infinite", display: "inline-block" }}>🌱</span>
      </div>
    );
  }

  const doneToday = habits.filter(h => h.completions[todayKey]).length;
  const pct       = habits.length ? Math.round((doneToday / habits.length) * 100) : 0;
  const allDone   = habits.length > 0 && doneToday === habits.length;

  return (
    <div style={{
      minHeight: "100vh",
      background: allDone
        ? "linear-gradient(160deg,#d4edda 0%,#c3e6cb 50%,#b8dfc6 100%)"
        : "linear-gradient(160deg,#f5efe6 0%,#e8ddd0 50%,#ddd0c4 100%)",
      position: "relative",
      paddingBottom: 60,
      boxSizing: "border-box",
      overflowX: "hidden",
      transition: "background 1s ease",
    }}>

      {/* Grain texture */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
        backgroundRepeat: "repeat", backgroundSize: "200px",
      }} />

      {/* Confetti */}
      {confetti.map(c => (
        <ConfettiPop key={c.id} x={c.x} y={c.y} color={c.color} onDone={() => removeConfetti(c.id)} />
      ))}

      <div style={{
        maxWidth: 820, margin: "0 auto", padding: cPad,
        position: "relative", zIndex: 1, boxSizing: "border-box", width: "100%",
      }}>

        {/* ── Header ── */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          marginBottom: isMobile ? 16 : 24, flexWrap: "wrap", gap: 10,
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: isMobile ? 20 : 26 }}>{allDone ? "🌸" : "🌿"}</span>
              <h1 style={{
                fontFamily: "'Playfair Display',serif",
                fontSize: titleSize, fontWeight: 700,
                color: "#2d2418", margin: 0, letterSpacing: "-1px",
              }}>bloom</h1>
            </div>
            <p style={{
              fontWeight: 300, color: "#8a7a6a",
              margin: "3px 0 0 28px", fontSize: isMobile ? 11 : 13,
              letterSpacing: "0.05em",
            }}>
              {allDone ? "All done! You're blooming 🌸" : "tend your daily habits"}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 4 }}>
            {saveStatus === "saved" && (
              <span style={{
                background: "#4a7c5922", color: "#4a7c59",
                fontSize: 11, padding: "4px 10px", borderRadius: 20,
              }}>✓ saved</span>
            )}
            <button onClick={() => setShowStats(true)} style={{
              background: "#f0e8de", color: "#5a4a3a", border: "1px solid #d0c8be",
              padding: isMobile ? "7px 12px" : "8px 14px",
              borderRadius: 20, cursor: "pointer",
              fontSize: isMobile ? 11 : 13, touchAction: "manipulation",
            }}>📊 Stats</button>
            <button onClick={() => setAdding(v => !v)} style={{
              background: "#2d2418", color: "#f5efe6", border: "none",
              padding: isMobile ? "8px 13px" : "9px 18px",
              borderRadius: 20, cursor: "pointer",
              fontSize: isMobile ? 12 : 13, letterSpacing: "0.03em",
              whiteSpace: "nowrap", touchAction: "manipulation",
            }}>
              {adding ? "✕ cancel" : "+ new habit"}
            </button>
          </div>
        </div>

        {/* ── Quote banner ── */}
        <div style={{
          background: "#2d241811", borderRadius: 12, padding: "10px 16px",
          marginBottom: 14, borderLeft: "3px solid #4a7c59",
        }}>
          <p style={{
            margin: 0, fontFamily: "'Playfair Display',serif",
            fontStyle: "italic", fontSize: isMobile ? 12 : 14, color: "#5a4a3a",
          }}>
            "{QUOTES[quoteIdx]}"
          </p>
        </div>

        {/* ── Mood ring ── */}
        <MoodRing moods={moods} todayKey={todayKey} onSet={setMood} />

        {/* ── Progress bar ── */}
        {habits.length > 0 && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            marginBottom: isMobile ? 14 : 20, padding: "10px 14px",
            background: "#faf6f0bb", borderRadius: 12, border: "1px solid #e0d8ce",
          }}>
            <span style={{ fontSize: 12, color: "#5a4a3a", whiteSpace: "nowrap" }}>
              Today <strong style={{ color: "#2d2418" }}>{doneToday}/{habits.length}</strong>
            </span>
            <div style={{
              flex: 1, height: 6, background: "#e0d8ce",
              borderRadius: 3, overflow: "hidden",
            }}>
              <div style={{
                height: "100%",
                background: allDone
                  ? "linear-gradient(90deg,#4a7c59,#8fa04a)"
                  : "linear-gradient(90deg,#c0784a,#4a8fa3)",
                borderRadius: 3, width: `${pct}%`,
                transition: "width 0.5s ease, background 0.8s ease",
              }} />
            </div>
            <span style={{
              fontSize: 12, fontWeight: 700, minWidth: 30, textAlign: "right",
              color: allDone ? "#4a7c59" : "#c0784a",
            }}>{pct}%</span>
          </div>
        )}

        {/* ── Day headers ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: rowGap,
          marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid #c8bfb055",
        }}>
          {!isMobile && <div style={{ width: labelWidth, flexShrink: 0 }} />}
          {DAYS.map((d, i) => (
            <div key={i} style={{
              flex: 1, textAlign: "center",
              fontSize: isMobile ? 9 : 11,
              color: i === todayDow ? "#2d2418" : "#8a7a6a",
              fontWeight: i === todayDow ? 700 : 400,
              letterSpacing: "0.06em", textTransform: "uppercase",
              position: "relative", paddingBottom: 6,
            }}>
              {d}
              {i === todayDow && (
                <div style={{
                  width: 4, height: 4, borderRadius: "50%", background: "#4a7c59",
                  position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)",
                }} />
              )}
            </div>
          ))}
          <div style={{
            width: streakW, flexShrink: 0, textAlign: "center",
            fontSize: 9, color: "#8a7a6a",
            letterSpacing: "0.08em", textTransform: "uppercase",
          }}>
            {isMobile ? "🔥" : "streak"}
          </div>
        </div>

        {/* ── Habits ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {habits.length === 0 && (
            <div style={{
              textAlign: "center", color: "#8a7a6a",
              padding: "40px 0", fontStyle: "italic", fontSize: 14,
            }}>
              No habits yet — add one to begin growing 🌱
            </div>
          )}

          {habits.map((habit, hi) => {
            const streak = getStreak(habit.completions);
            return (
              <div key={habit.id} style={{
                background: "#faf6f0cc", borderRadius: 12, border: "1px solid #e0d8ce",
                animation: "fadeSlideIn 0.35s ease both",
                animationDelay: `${hi * 50}ms`, overflow: "hidden",
              }}>
                {isMobile ? (
                  /* Mobile stacked layout */
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 10px 4px" }}>
                      <span style={{ fontSize: 15 }}>{habit.emoji}</span>
                      <span style={{
                        fontSize: 13, color: "#2d2418", flex: 1,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>{habit.name}</span>
                      {habit.notes?.[todayKey] && <span style={{ fontSize: 11 }}>📝</span>}
                      <span style={{
                        fontSize: 12, fontWeight: 700,
                        color: streak > 0 ? habit.color : "#b5a898", whiteSpace: "nowrap",
                      }}>
                        {streak > 0 ? `🔥${streak}` : "—"}
                      </span>
                      <button onClick={() => removeHabit(habit.id)} style={{
                        background: "transparent", border: "none", cursor: "pointer",
                        color: "#c8bfb0", fontSize: 16, lineHeight: 1,
                        padding: "0 2px", touchAction: "manipulation",
                      }}>×</button>
                    </div>
                    <div style={{ display: "flex", gap: rowGap, padding: "4px 10px 10px", alignItems: "center" }}>
                      {weekKeys.map((key, i) => {
                        const done = !!habit.completions[key];
                        const isToday = i === todayDow;
                        const hasNote = !!habit.notes?.[key];
                        return (
                          <button key={key} onClick={e => toggle(habit.id, key, e)} style={{
                            flex: 1, height: dotSize, borderRadius: "50%",
                            cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            background: done ? habit.color : "transparent",
                            border: `2px solid ${done ? habit.color : "#c8bfb0"}`,
                            boxShadow: done ? `0 0 8px ${habit.color}55` : "none",
                            outline: isToday ? `2px solid ${habit.color}88` : "none",
                            outlineOffset: "2px",
                            transform: done ? "scale(1.08)" : "scale(1)",
                            transition: "all 0.18s cubic-bezier(.34,1.56,.64,1)",
                            touchAction: "manipulation", padding: 0, minWidth: 0,
                            position: "relative",
                          }}>
                            {done && <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>✓</span>}
                            {hasNote && (
                              <span style={{
                                position: "absolute", top: -2, right: -2,
                                width: 7, height: 7, borderRadius: "50%",
                                background: "#c0784a", border: "1px solid #f5efe6",
                              }} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  /* Desktop/tablet single row */
                  <div style={{
                    display: "flex", alignItems: "center",
                    gap: rowGap, padding: "12px 14px",
                  }}>
                    <div style={{
                      width: labelWidth, flexShrink: 0,
                      display: "flex", alignItems: "center", gap: 7, overflow: "hidden",
                    }}>
                      <span style={{ fontSize: 17, flexShrink: 0 }}>{habit.emoji}</span>
                      <span style={{
                        fontSize: 13, color: "#2d2418",
                        overflow: "hidden", textOverflow: "ellipsis",
                        whiteSpace: "nowrap", flex: 1,
                      }}>{habit.name}</span>
                      {habit.notes?.[todayKey] && <span style={{ fontSize: 11 }}>📝</span>}
                      <button onClick={() => removeHabit(habit.id)} style={{
                        background: "transparent", border: "none", cursor: "pointer",
                        color: "#c8bfb0", fontSize: 17, lineHeight: 1,
                        padding: "0 2px", flexShrink: 0,
                      }}>×</button>
                    </div>

                    {weekKeys.map((key, i) => {
                      const done = !!habit.completions[key];
                      const isToday = i === todayDow;
                      const hasNote = !!habit.notes?.[key];
                      return (
                        <div key={key} style={{ flex: 1, maxWidth: dotSize + 6, position: "relative" }}>
                          <button
                            onClick={e => toggle(habit.id, key, e)}
                            onContextMenu={e => { e.preventDefault(); setNoteModal({ habit, dayKey: key }); }}
                            title={isToday ? "Click to check · Right-click to note" : DAYS_FULL[i]}
                            style={{
                              width: "100%", height: dotSize, borderRadius: "50%",
                              cursor: "pointer",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              background: done ? habit.color : "transparent",
                              border: `2px solid ${done ? habit.color : "#c8bfb0"}`,
                              boxShadow: done ? `0 0 12px ${habit.color}55` : "none",
                              outline: isToday ? `2px solid ${habit.color}88` : "none",
                              outlineOffset: "3px",
                              transform: done ? "scale(1.12)" : "scale(1)",
                              transition: "all 0.18s cubic-bezier(.34,1.56,.64,1)",
                              padding: 0, minWidth: 0, touchAction: "manipulation",
                            }}
                          >
                            {done && <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>✓</span>}
                          </button>
                          {hasNote && (
                            <span style={{
                              position: "absolute", top: 0, right: 0,
                              width: 8, height: 8, borderRadius: "50%",
                              background: "#c0784a", border: "2px solid #f5efe6",
                            }} />
                          )}
                        </div>
                      );
                    })}

                    <div style={{
                      width: streakW, flexShrink: 0, textAlign: "center",
                      fontSize: 12, fontWeight: streak > 0 ? 700 : 400,
                      color: streak > 0 ? habit.color : "#b5a898",
                    }}>
                      {streak > 0 ? `🔥 ${streak}` : "—"}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Add habit panel ── */}
        {adding && (
          <div style={{
            marginTop: 18, background: "#faf6f0ee", borderRadius: 16,
            padding: isMobile ? 16 : 22, border: "1px solid #e0d8ce",
            animation: "fadeSlideIn 0.25s ease both",
          }}>
            <h3 style={{
              fontFamily: "'Playfair Display',serif",
              fontSize: isMobile ? 17 : 20,
              color: "#2d2418", margin: "0 0 14px", fontStyle: "italic",
            }}>New Habit</h3>

            <input
              style={{
                width: "100%", boxSizing: "border-box",
                background: "#f0e8de", border: "1px solid #d0c8be",
                borderRadius: 10, padding: "10px 14px",
                fontFamily: "'Lato',sans-serif", fontSize: 16,
                color: "#2d2418", outline: "none", marginBottom: 14,
              }}
              placeholder="Habit name…"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addHabit()}
              autoFocus
            />

            <div style={{ marginBottom: 12 }}>
              <span style={{
                fontSize: 10, color: "#8a7a6a", letterSpacing: "0.1em",
                textTransform: "uppercase", display: "block", marginBottom: 8,
              }}>Emoji</span>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {EMOJIS.map(em => (
                  <button key={em} onClick={() => setNewEmoji(em)} style={{
                    fontSize: isMobile ? 22 : 20, border: "none", cursor: "pointer",
                    borderRadius: 8, padding: isMobile ? "6px 8px" : "4px 6px",
                    background: newEmoji === em ? "#e8e0d5" : "transparent",
                    transform: newEmoji === em ? "scale(1.2)" : "scale(1)",
                    transition: "all 0.15s", touchAction: "manipulation",
                  }}>{em}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <span style={{
                fontSize: 10, color: "#8a7a6a", letterSpacing: "0.1em",
                textTransform: "uppercase", display: "block", marginBottom: 8,
              }}>Color</span>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {PALETTE.map(c => (
                  <button key={c} onClick={() => setNewColor(c)} style={{
                    width: isMobile ? 28 : 24, height: isMobile ? 28 : 24,
                    borderRadius: "50%", border: "none", cursor: "pointer",
                    background: c,
                    outline: newColor === c ? `3px solid ${c}` : "none",
                    outlineOffset: "3px",
                    transform: newColor === c ? "scale(1.2)" : "scale(1)",
                    transition: "all 0.15s", touchAction: "manipulation",
                  }} />
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setAdding(false)} style={{
                background: "transparent", border: "1px solid #c8bfb0",
                color: "#8a7a6a", padding: "9px 18px", borderRadius: 20,
                cursor: "pointer", fontSize: 13, touchAction: "manipulation",
              }}>cancel</button>
              <button onClick={addHabit} style={{
                background: newColor, border: "none", color: "#fff",
                padding: "9px 20px", borderRadius: 20, cursor: "pointer",
                fontSize: 13, touchAction: "manipulation",
              }}>plant it 🌱</button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showStats && <StatsModal habits={habits} onClose={() => setShowStats(false)} />}
      {noteModal  && <NoteModal habit={noteModal.habit} dayKey={noteModal.dayKey} onSave={saveNote} onClose={() => setNoteModal(null)} />}
    </div>
  );
}
