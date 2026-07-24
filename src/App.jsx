import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";

// ─── Theme Context (Dark Mode) ────────────────────────────────────────────────
const ThemeContext = createContext();
function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("bloom-theme");
    if (saved) return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("bloom-theme", theme);
  }, [theme]);
  const toggle = () => setTheme(t => t === "dark" ? "light" : "dark");
  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}
const useTheme = () => useContext(ThemeContext);

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

const HABIT_TEMPLATES = [
  {
    label: "🌅 Morning Routine",
    habits: [
      { name: "Morning walk",    emoji: "🏃", color: "#4a7c59" },
      { name: "Drink water",     emoji: "💧", color: "#4a8fa3" },
      { name: "Meditate 5 min",  emoji: "🧘", color: "#7b6fa0" },
      { name: "No phone 1st hr", emoji: "🌞", color: "#c0784a" },
    ],
  },
  {
    label: "💪 Fitness",
    habits: [
      { name: "Exercise 30 min", emoji: "💪", color: "#c0784a" },
      { name: "Drink 2L water",  emoji: "💧", color: "#4a8fa3" },
      { name: "Sleep 8 hrs",     emoji: "😴", color: "#7b6fa0" },
      { name: "Eat vegetables",  emoji: "🥗", color: "#4a7c59" },
    ],
  },
  {
    label: "📚 Study & Mind",
    habits: [
      { name: "Read 20 min",     emoji: "📚", color: "#7b6fa0" },
      { name: "Journaling",      emoji: "✍️", color: "#c0784a" },
      { name: "Learn something", emoji: "🧠", color: "#4a8fa3" },
      { name: "No social media", emoji: "🎯", color: "#a05c7b" },
    ],
  },
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
    } else { cur = 1; }
    best = Math.max(best, cur);
    prev = dt;
  });
  return best;
};

const getTotalDone = (completions) => Object.keys(completions).length;

const useWindowWidth = () => {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 800);
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return w;
};

// ─── Storage ──────────────────────────────────────────────────────────────────
const STORE_KEY = "bloom-data-v2";
function loadData() {
  try { const r = localStorage.getItem(STORE_KEY); return r ? JSON.parse(r) : null; }
  catch { return null; }
}
function saveData(data) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); }
  catch (e) { console.warn("Storage save failed:", e); }
}

// ─── CSV Export ───────────────────────────────────────────────────────────────
function exportCSV(habits) {
  const allDates = [...new Set(
    habits.flatMap(h => Object.keys(h.completions))
  )].sort();

  const header = ["Date", ...habits.map(h => `${h.emoji} ${h.name}`)].join(",");
  const rows = allDates.map(d => {
    const cols = habits.map(h => h.completions[d] ? "✓" : "");
    return [d, ...cols].join(",");
  });

  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bloom-habits-${dateKey()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Notifications ────────────────────────────────────────────────────────────
async function requestNotificationPermission() {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  return await Notification.requestPermission();
}

function scheduleNotification(habit, timeStr) {
  // Store intent; SW fires it daily at the chosen time
  const settings = JSON.parse(localStorage.getItem("bloom-notif-settings") || "{}");
  if (timeStr) {
    settings[habit.id] = { name: habit.name, emoji: habit.emoji, time: timeStr };
  } else {
    delete settings[habit.id];
  }
  localStorage.setItem("bloom-notif-settings", JSON.stringify(settings));
  checkAndFireNotifications();
}

function checkAndFireNotifications() {
  if (Notification.permission !== "granted") return;
  const settings = JSON.parse(localStorage.getItem("bloom-notif-settings") || "{}");
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
  Object.values(settings).forEach(s => {
    if (s.time === hhmm) {
      new Notification(`${s.emoji} Time for: ${s.name}`, {
        body: "Tap to open Bloom and check it off 🌿",
        icon: "/favicon.svg",
        tag: `bloom-${s.name}`,
      });
    }
  });
}

// Check every minute
setInterval(checkAndFireNotifications, 60000);

// Register service worker for PWA + offline
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

// ─── Drag-to-reorder hook ─────────────────────────────────────────────────────
function useDragReorder(items, onReorder) {
  const dragIdx = useRef(null);
  const dragOverIdx = useRef(null);

  const onDragStart = (i) => { dragIdx.current = i; };
  const onDragEnter = (i) => { dragOverIdx.current = i; };
  const onDragEnd   = () => {
    if (dragIdx.current === null || dragOverIdx.current === null ||
        dragIdx.current === dragOverIdx.current) {
      dragIdx.current = null; dragOverIdx.current = null; return;
    }
    const reordered = [...items];
    const [moved] = reordered.splice(dragIdx.current, 1);
    reordered.splice(dragOverIdx.current, 0, moved);
    onReorder(reordered);
    dragIdx.current = null; dragOverIdx.current = null;
  };

  // Touch drag support
  const touchState = useRef({ startIdx: null, startY: 0 });
  const onTouchStart = (i, e) => {
    touchState.current = { startIdx: i, startY: e.touches[0].clientY };
  };
  const onTouchEnd = (e, allRefs) => {
    const { startIdx, startY } = touchState.current;
    if (startIdx === null) return;
    const endY = e.changedTouches[0].clientY;
    const dy = endY - startY;
    const rowH = 64;
    const delta = Math.round(dy / rowH);
    if (delta === 0) { touchState.current.startIdx = null; return; }
    const endIdx = Math.max(0, Math.min(items.length - 1, startIdx + delta));
    const reordered = [...items];
    const [moved] = reordered.splice(startIdx, 1);
    reordered.splice(endIdx, 0, moved);
    onReorder(reordered);
    touchState.current.startIdx = null;
  };

  return { onDragStart, onDragEnter, onDragEnd, onTouchStart, onTouchEnd };
}

// ─── Default habits ───────────────────────────────────────────────────────────
const defaultHabits = [
  { id:1, name:"Morning walk",  emoji:"🏃", color:"#4a7c59", completions:{}, notes:{} },
  { id:2, name:"Read 20 min",   emoji:"📚", color:"#7b6fa0", completions:{}, notes:{} },
  { id:3, name:"Drink water",   emoji:"💧", color:"#4a8fa3", completions:{}, notes:{} },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function ConfettiPop({ x, y, color, onDone }) {
  const particles = Array.from({ length: 10 }, (_, i) => ({
    angle: (i / 10) * 360,
    dist: 30 + Math.random() * 30,
    size: 4 + Math.random() * 4,
  }));
  useEffect(() => { const t = setTimeout(onDone, 700); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{ position:"fixed", left:x, top:y, pointerEvents:"none", zIndex:9999 }}>
      {particles.map((p, i) => (
        <div key={i} style={{
          position:"absolute", width:p.size, height:p.size, borderRadius:"50%",
          background:color, animation:"confettiBurst 0.6s ease-out forwards",
          transformOrigin:"center",
          "--dx":`${Math.cos((p.angle*Math.PI)/180)*p.dist}px`,
          "--dy":`${Math.sin((p.angle*Math.PI)/180)*p.dist}px`,
        }} />
      ))}
    </div>
  );
}

function MoodRing({ moods, todayKey, onSet }) {
  const today = moods[todayKey];
  return (
    <div style={{ background:"var(--card-bg)", borderRadius:14, border:"1px solid var(--border)", padding:"12px 16px", marginBottom:14 }}>
      <div style={{ fontSize:11, color:"var(--text-muted)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10 }}>
        How are you feeling today?
      </div>
      <div style={{ display:"flex", gap:6, justifyContent:"space-between" }}>
        {MOODS.map(m => (
          <button key={m.val} onClick={() => onSet(m.val)} style={{
            flex:1, padding:"8px 0", borderRadius:12, border:"none", cursor:"pointer",
            touchAction:"manipulation",
            background: today === m.val ? "var(--text-primary)" : "var(--input-bg)",
            transform: today === m.val ? "scale(1.1)" : "scale(1)",
            transition:"all 0.18s",
            display:"flex", flexDirection:"column", alignItems:"center", gap:3,
          }}>
            <span style={{ fontSize:18 }}>{m.icon}</span>
            <span style={{ fontSize:9, color: today === m.val ? "var(--bg)" : "var(--text-muted)", letterSpacing:"0.05em" }}>
              {m.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function NotificationModal({ habits, onClose }) {
  const [perm, setPerm] = useState(Notification?.permission || "unsupported");
  const [settings, setSettings] = useState(() =>
    JSON.parse(localStorage.getItem("bloom-notif-settings") || "{}")
  );

  const requestPerm = async () => {
    const result = await requestNotificationPermission();
    setPerm(result);
  };

  const setTime = (habit, time) => {
    scheduleNotification(habit, time);
    setSettings(JSON.parse(localStorage.getItem("bloom-notif-settings") || "{}"));
  };

  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.45)",
      zIndex:1000, display:"flex", alignItems:"flex-end", justifyContent:"center",
      backdropFilter:"blur(3px)",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background:"var(--bg)", borderRadius:"20px 20px 0 0",
        width:"100%", maxWidth:560, padding:24, paddingBottom:36,
        maxHeight:"80vh", overflowY:"auto",
        animation:"slideUp 0.3s ease",
      }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:"var(--text-primary)", margin:0 }}>
            🔔 Reminders
          </h2>
          <button onClick={onClose} style={{ background:"transparent", border:"none", fontSize:22, color:"var(--text-muted)", cursor:"pointer" }}>×</button>
        </div>

        {perm !== "granted" && (
          <div style={{ background:"var(--card-bg)", borderRadius:12, padding:"14px 16px", marginBottom:16, border:"1px solid var(--border)" }}>
            <p style={{ fontSize:13, color:"var(--text-secondary)", margin:"0 0 10px" }}>
              Allow notifications to get daily reminders for each habit.
            </p>
            {perm === "unsupported"
              ? <p style={{ fontSize:12, color:"var(--text-muted)", margin:0 }}>Notifications not supported in this browser.</p>
              : perm === "denied"
              ? <p style={{ fontSize:12, color:"#c0474a", margin:0 }}>Notifications blocked. Enable them in your browser settings.</p>
              : <button onClick={requestPerm} style={{
                  background:"var(--text-primary)", color:"var(--bg)", border:"none",
                  padding:"8px 18px", borderRadius:20, cursor:"pointer", fontSize:13,
                }}>Enable notifications</button>
            }
          </div>
        )}

        {perm === "granted" && (
          <p style={{ fontSize:13, color:"var(--text-muted)", marginBottom:16 }}>
            Set a daily reminder time for each habit. Leave blank to disable.
          </p>
        )}

        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {habits.map(h => (
            <div key={h.id} style={{
              background:"var(--card-bg)", borderRadius:12, padding:"12px 16px",
              border:"1px solid var(--border)", display:"flex", alignItems:"center", gap:12,
            }}>
              <span style={{ fontSize:20 }}>{h.emoji}</span>
              <span style={{ flex:1, fontSize:14, color:"var(--text-primary)" }}>{h.name}</span>
              <input
                type="time"
                disabled={perm !== "granted"}
                value={settings[h.id]?.time || ""}
                onChange={e => setTime(h, e.target.value)}
                style={{
                  background:"var(--input-bg)", border:"1px solid var(--border)",
                  borderRadius:8, padding:"6px 10px", fontSize:13,
                  color:"var(--text-primary)", cursor: perm !== "granted" ? "not-allowed" : "pointer",
                  opacity: perm !== "granted" ? 0.5 : 1,
                }}
              />
              {settings[h.id] && (
                <button onClick={() => setTime(h, "")} style={{
                  background:"transparent", border:"none", cursor:"pointer",
                  color:"var(--text-muted)", fontSize:16, padding:"0 2px",
                }}>×</button>
              )}
            </div>
          ))}
        </div>
        <p style={{ fontSize:11, color:"var(--text-muted)", marginTop:14 }}>
          Reminders fire when the app is open or installed as a PWA.
        </p>
      </div>
    </div>
  );
}

function TemplatesModal({ onApply, onClose }) {
  const [chosen, setChosen] = useState(null);
  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.45)",
      zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center",
      backdropFilter:"blur(3px)", padding:20,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background:"var(--bg)", borderRadius:18, padding:24,
        width:"100%", maxWidth:440, animation:"fadeSlideIn 0.25s ease",
        maxHeight:"80vh", overflowY:"auto",
      }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:"var(--text-primary)", margin:0 }}>
            Starter packs
          </h2>
          <button onClick={onClose} style={{ background:"transparent", border:"none", fontSize:22, color:"var(--text-muted)", cursor:"pointer" }}>×</button>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {HABIT_TEMPLATES.map((t, ti) => (
            <div key={ti} onClick={() => setChosen(ti)} style={{
              background: chosen === ti ? "var(--input-bg)" : "var(--card-bg)",
              borderRadius:12, padding:"14px 16px",
              border: chosen === ti ? "2px solid #4a7c59" : "1px solid var(--border)",
              cursor:"pointer", transition:"all 0.15s",
            }}>
              <div style={{ fontSize:14, fontWeight:700, color:"var(--text-primary)", marginBottom:8 }}>{t.label}</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {t.habits.map((h, hi) => (
                  <span key={hi} style={{
                    fontSize:12, background:"var(--bg)", borderRadius:20,
                    padding:"3px 10px", color:"var(--text-secondary)",
                    border:"1px solid var(--border)",
                  }}>{h.emoji} {h.name}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:18 }}>
          <button onClick={onClose} style={{
            background:"transparent", border:"1px solid var(--border)", color:"var(--text-muted)",
            padding:"9px 18px", borderRadius:20, cursor:"pointer", fontSize:13,
          }}>cancel</button>
          <button disabled={chosen === null} onClick={() => chosen !== null && onApply(HABIT_TEMPLATES[chosen].habits)} style={{
            background: chosen !== null ? "#4a7c59" : "var(--border)", color:"#fff",
            border:"none", padding:"9px 20px", borderRadius:20,
            cursor: chosen !== null ? "pointer" : "not-allowed", fontSize:13,
            transition:"background 0.2s",
          }}>Add these habits 🌱</button>
        </div>
      </div>
    </div>
  );
}

function InstallPWABanner({ onDismiss }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("bloom-pwa-dismissed")) return;
    const handler = (e) => { e.preventDefault(); setDeferredPrompt(e); setVisible(true); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!visible) return null;

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") { setVisible(false); onDismiss(); }
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem("bloom-pwa-dismissed", "1");
    onDismiss();
  };

  return (
    <div style={{
      background:"#2d2418", color:"#f5efe6", borderRadius:14,
      padding:"14px 16px", marginBottom:14,
      display:"flex", alignItems:"center", gap:12,
      animation:"fadeSlideIn 0.3s ease",
    }}>
      <span style={{ fontSize:24 }}>📲</span>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight:700, marginBottom:2 }}>Add to home screen</div>
        <div style={{ fontSize:12, opacity:0.7 }}>Check habits with one tap — works offline too</div>
      </div>
      <button onClick={install} style={{
        background:"#8fa04a", color:"#fff", border:"none",
        padding:"7px 14px", borderRadius:20, cursor:"pointer",
        fontSize:12, whiteSpace:"nowrap", touchAction:"manipulation",
      }}>Install</button>
      <button onClick={dismiss} style={{
        background:"transparent", border:"none", color:"rgba(245,239,230,0.5)",
        fontSize:18, cursor:"pointer", padding:"0 2px",
      }}>×</button>
    </div>
  );
}

function StatsModal({ habits, onClose }) {
  const totalCompletions = habits.reduce((s, h) => s + getTotalDone(h.completions), 0);
  const bestStreak = habits.reduce((s, h) => Math.max(s, getLongestStreak(h.completions)), 0);
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i));
    const k = dateKey(d);
    const done = habits.filter(h => h.completions[k]).length;
    return { done, total: habits.length };
  });
  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.45)",
      zIndex:1000, display:"flex", alignItems:"flex-end", justifyContent:"center",
      backdropFilter:"blur(3px)",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background:"var(--bg)", borderRadius:"20px 20px 0 0",
        width:"100%", maxWidth:640, padding:24, paddingBottom:36,
        maxHeight:"80vh", overflowY:"auto", animation:"slideUp 0.3s ease",
      }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:"var(--text-primary)", margin:0 }}>Your Garden 🌿</h2>
          <button onClick={onClose} style={{ background:"transparent", border:"none", fontSize:22, color:"var(--text-muted)", cursor:"pointer" }}>×</button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:20 }}>
          {[
            { label:"Total Done", val:totalCompletions, icon:"✅" },
            { label:"Best Streak", val:`${bestStreak}d`, icon:"🔥" },
            { label:"Habits", val:habits.length, icon:"🌱" },
          ].map(s => (
            <div key={s.label} style={{ background:"var(--card-bg)", borderRadius:12, padding:"12px 10px", textAlign:"center", border:"1px solid var(--border)" }}>
              <div style={{ fontSize:20 }}>{s.icon}</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:"var(--text-primary)", fontWeight:700 }}>{s.val}</div>
              <div style={{ fontSize:10, color:"var(--text-muted)", letterSpacing:"0.06em", textTransform:"uppercase" }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:11, color:"var(--text-muted)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 }}>Last 30 days</div>
          <div style={{ display:"flex", gap:3, flexWrap:"wrap" }}>
            {last30.map((d, i) => {
              const ratio = d.total ? d.done / d.total : 0;
              return <div key={i} style={{ width:16, height:16, borderRadius:3, background: ratio===0?"var(--border)":ratio<0.5?"#a8c9b0":ratio<1?"#6aa87e":"#4a7c59" }} />;
            })}
          </div>
        </div>
        <div style={{ fontSize:11, color:"var(--text-muted)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 }}>Per habit</div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {[...habits].sort((a,b) => getTotalDone(b.completions)-getTotalDone(a.completions)).map(h => {
            const total = getTotalDone(h.completions);
            const streak = getStreak(h.completions);
            const longest = getLongestStreak(h.completions);
            return (
              <div key={h.id} style={{ background:"var(--card-bg)", borderRadius:10, padding:"10px 14px", border:"1px solid var(--border)", display:"flex", alignItems:"center", gap:12 }}>
                <span style={{ fontSize:20 }}>{h.emoji}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, color:"var(--text-primary)", marginBottom:4 }}>{h.name}</div>
                  <div style={{ height:4, background:"var(--border)", borderRadius:2, overflow:"hidden" }}>
                    <div style={{ height:"100%", borderRadius:2, background:h.color, width:`${Math.min(100,(total/90)*100)}%`, transition:"width 0.6s ease" }} />
                  </div>
                </div>
                <div style={{ textAlign:"right", fontSize:11, color:"var(--text-muted)", lineHeight:1.6 }}>
                  <div style={{ color:h.color, fontWeight:700, fontSize:14 }}>{total}×</div>
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

function NoteModal({ habit, dayKey, onSave, onClose }) {
  const [text, setText] = useState(habit.notes?.[dayKey] || "");
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(3px)", padding:20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background:"var(--bg)", borderRadius:18, padding:22, width:"100%", maxWidth:400, animation:"fadeSlideIn 0.25s ease" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
          <span style={{ fontSize:22 }}>{habit.emoji}</span>
          <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:17, color:"var(--text-primary)", margin:0, fontStyle:"italic" }}>{habit.name}</h3>
        </div>
        <textarea autoFocus placeholder="Add a note for today…" value={text} onChange={e => setText(e.target.value)} style={{ width:"100%", minHeight:100, boxSizing:"border-box", background:"var(--input-bg)", border:"1px solid var(--border)", borderRadius:10, padding:"10px 14px", fontFamily:"'Lato',sans-serif", fontSize:14, color:"var(--text-primary)", outline:"none", resize:"vertical" }} />
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:12 }}>
          <button onClick={onClose} style={{ background:"transparent", border:"1px solid var(--border)", color:"var(--text-muted)", padding:"8px 16px", borderRadius:20, cursor:"pointer", fontSize:13 }}>cancel</button>
          <button onClick={() => onSave(text)} style={{ background:habit.color, border:"none", color:"#fff", padding:"8px 18px", borderRadius:20, cursor:"pointer", fontSize:13 }}>save note</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
function BloomApp() {
  const { theme, toggle: toggleTheme } = useTheme();
  const [habits,      setHabits]      = useState([]);
  const [moods,       setMoods]       = useState({});
  const [loaded,      setLoaded]      = useState(false);
  const [adding,      setAdding]      = useState(false);
  const [showStats,   setShowStats]   = useState(false);
  const [showNotifs,  setShowNotifs]  = useState(false);
  const [showTemplates,setShowTemplates]=useState(false);
  const [noteModal,   setNoteModal]   = useState(null);
  const [confetti,    setConfetti]    = useState([]);
  const [newName,     setNewName]     = useState("");
  const [newEmoji,    setNewEmoji]    = useState("🌱");
  const [newColor,    setNewColor]    = useState(PALETTE[0]);
  const [saveStatus,  setSaveStatus]  = useState("");
  const [quoteIdx,    setQuoteIdx]    = useState(() => Math.floor(Math.random() * QUOTES.length));
  const [exportFlash, setExportFlash] = useState(false);

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

  // ── Load ──
  useEffect(() => {
    const data = loadData();
    if (data) { setHabits(data.habits || defaultHabits); setMoods(data.moods || {}); }
    else { setHabits(defaultHabits); }
    setLoaded(true);
  }, []);

  // ── Quote rotation ──
  useEffect(() => {
    const t = setInterval(() => setQuoteIdx(i => (i+1) % QUOTES.length), 8000);
    return () => clearInterval(t);
  }, []);

  const persist = useCallback((h, m) => {
    saveData({ habits:h, moods:m });
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus(""), 1400);
  }, []);

  // ── Toggle completion ──
  const toggle = (habitId, key, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width/2;
    const cy = rect.top  + rect.height/2;
    const updated = habits.map(h => {
      if (h.id !== habitId) return h;
      const c = { ...h.completions };
      if (c[key]) { delete c[key]; }
      else {
        c[key] = true;
        if (key === todayKey) {
          const id = Date.now() + Math.random();
          setConfetti(prev => [...prev, { id, x:cx, y:cy, color:h.color }]);
        }
      }
      return { ...h, completions:c };
    });
    setHabits(updated); persist(updated, moods);
  };

  const removeConfetti = useCallback((id) => {
    setConfetti(prev => prev.filter(c => c.id !== id));
  }, []);

  // ── Reorder ──
  const reorder = useCallback((newOrder) => {
    setHabits(newOrder); persist(newOrder, moods);
  }, [moods, persist]);

  const drag = useDragReorder(habits, reorder);

  // ── Add habit ──
  const addHabit = () => {
    if (!newName.trim()) return;
    const updated = [...habits, { id:Date.now(), name:newName.trim(), emoji:newEmoji, color:newColor, completions:{}, notes:{} }];
    setHabits(updated); persist(updated, moods);
    setNewName(""); setNewEmoji("🌱"); setNewColor(PALETTE[0]); setAdding(false);
  };

  // ── Apply template ──
  const applyTemplate = (templateHabits) => {
    const newOnes = templateHabits.map(h => ({ ...h, id:Date.now()+Math.random(), completions:{}, notes:{} }));
    const updated = [...habits, ...newOnes];
    setHabits(updated); persist(updated, moods);
    setShowTemplates(false);
  };

  const removeHabit = (id) => {
    const updated = habits.filter(h => h.id !== id);
    setHabits(updated); persist(updated, moods);
  };

  const setMood = (val) => {
    const updated = { ...moods, [todayKey]:val };
    setMoods(updated); persist(habits, updated);
  };

  const saveNote = (text) => {
    const { habit, dayKey:dk } = noteModal;
    const updated = habits.map(h => h.id===habit.id ? { ...h, notes:{ ...h.notes, [dk]:text } } : h);
    setHabits(updated); persist(updated, moods); setNoteModal(null);
  };

  const handleExport = () => {
    exportCSV(habits);
    setExportFlash(true);
    setTimeout(() => setExportFlash(false), 1500);
  };

  if (!loaded) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", fontSize:48, background:"var(--bg)" }}>
      <span style={{ animation:"bounce 1s ease-in-out infinite", display:"inline-block" }}>🌱</span>
    </div>
  );

  const doneToday = habits.filter(h => h.completions[todayKey]).length;
  const pct       = habits.length ? Math.round((doneToday/habits.length)*100) : 0;
  const allDone   = habits.length > 0 && doneToday === habits.length;

  return (
    <div style={{
      minHeight:"100vh",
      background: allDone ? "var(--bg-done)" : "var(--bg)",
      position:"relative", paddingBottom:60,
      boxSizing:"border-box", overflowX:"hidden",
      transition:"background 1s ease",
    }}>
      {/* Grain texture */}
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`, backgroundRepeat:"repeat", backgroundSize:"200px" }} />

      {/* Confetti */}
      {confetti.map(c => <ConfettiPop key={c.id} x={c.x} y={c.y} color={c.color} onDone={() => removeConfetti(c.id)} />)}

      <div style={{ maxWidth:820, margin:"0 auto", padding:cPad, position:"relative", zIndex:1, boxSizing:"border-box", width:"100%" }}>

        {/* ── PWA Install Banner ── */}
        <InstallPWABanner onDismiss={() => {}} />

        {/* ── Header ── */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom: isMobile?16:24, flexWrap:"wrap", gap:10 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize: isMobile?20:26 }}>{allDone?"🌸":"🌿"}</span>
              <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:titleSize, fontWeight:700, color:"var(--text-primary)", margin:0, letterSpacing:"-1px" }}>bloom</h1>
            </div>
            <p style={{ fontWeight:300, color:"var(--text-muted)", margin:"3px 0 0 28px", fontSize: isMobile?11:13, letterSpacing:"0.05em" }}>
              {allDone ? "All done! You're blooming 🌸" : "tend your daily habits"}
            </p>
          </div>

          {/* Action buttons */}
          <div style={{ display:"flex", alignItems:"center", gap:6, paddingTop:4, flexWrap:"wrap" }}>
            {saveStatus === "saved" && <span style={{ background:"#4a7c5922", color:"#4a7c59", fontSize:11, padding:"4px 10px", borderRadius:20 }}>✓ saved</span>}

            {/* Dark mode toggle */}
            <button onClick={toggleTheme} title="Toggle dark mode" style={{
              background:"var(--card-bg)", color:"var(--text-primary)", border:"1px solid var(--border)",
              padding: isMobile?"7px 10px":"8px 12px", borderRadius:20, cursor:"pointer",
              fontSize: isMobile?14:16, touchAction:"manipulation",
            }}>{theme==="dark"?"☀️":"🌙"}</button>

            {/* Notifications */}
            <button onClick={() => setShowNotifs(true)} title="Reminders" style={{
              background:"var(--card-bg)", color:"var(--text-primary)", border:"1px solid var(--border)",
              padding: isMobile?"7px 10px":"8px 12px", borderRadius:20, cursor:"pointer",
              fontSize: isMobile?14:16, touchAction:"manipulation",
            }}>🔔</button>

            {/* Export CSV */}
            <button onClick={handleExport} title="Export CSV" style={{
              background: exportFlash?"#4a7c59":"var(--card-bg)",
              color: exportFlash?"#fff":"var(--text-primary)",
              border:"1px solid var(--border)",
              padding: isMobile?"7px 10px":"8px 12px", borderRadius:20, cursor:"pointer",
              fontSize: isMobile?14:16, touchAction:"manipulation",
              transition:"all 0.2s",
            }}>📤</button>

            {/* Stats */}
            <button onClick={() => setShowStats(true)} style={{
              background:"var(--card-bg)", color:"var(--text-secondary)", border:"1px solid var(--border)",
              padding: isMobile?"7px 12px":"8px 14px", borderRadius:20, cursor:"pointer",
              fontSize: isMobile?11:13, touchAction:"manipulation",
            }}>📊 Stats</button>

            {/* Add habit */}
            <button onClick={() => setAdding(v => !v)} style={{
              background:"var(--text-primary)", color:"var(--bg)", border:"none",
              padding: isMobile?"8px 13px":"9px 18px", borderRadius:20, cursor:"pointer",
              fontSize: isMobile?12:13, letterSpacing:"0.03em",
              whiteSpace:"nowrap", touchAction:"manipulation",
            }}>{adding?"✕ cancel":"+ new habit"}</button>
          </div>
        </div>

        {/* ── Quote ── */}
        <div style={{ background:"var(--quote-bg)", borderRadius:12, padding:"10px 16px", marginBottom:14, borderLeft:"3px solid #4a7c59" }}>
          <p style={{ margin:0, fontFamily:"'Playfair Display',serif", fontStyle:"italic", fontSize: isMobile?12:14, color:"var(--text-secondary)" }}>
            "{QUOTES[quoteIdx]}"
          </p>
        </div>

        {/* ── Mood ── */}
        <MoodRing moods={moods} todayKey={todayKey} onSet={setMood} />

        {/* ── Progress ── */}
        {habits.length > 0 && (
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom: isMobile?14:20, padding:"10px 14px", background:"var(--card-bg)", borderRadius:12, border:"1px solid var(--border)" }}>
            <span style={{ fontSize:12, color:"var(--text-secondary)", whiteSpace:"nowrap" }}>
              Today <strong style={{ color:"var(--text-primary)" }}>{doneToday}/{habits.length}</strong>
            </span>
            <div style={{ flex:1, height:6, background:"var(--border)", borderRadius:3, overflow:"hidden" }}>
              <div style={{ height:"100%", background: allDone?"linear-gradient(90deg,#4a7c59,#8fa04a)":"linear-gradient(90deg,#c0784a,#4a8fa3)", borderRadius:3, width:`${pct}%`, transition:"width 0.5s ease" }} />
            </div>
            <span style={{ fontSize:12, fontWeight:700, minWidth:30, textAlign:"right", color: allDone?"#4a7c59":"#c0784a" }}>{pct}%</span>
          </div>
        )}

        {/* ── Day headers ── */}
        <div style={{ display:"flex", alignItems:"center", gap:rowGap, marginBottom:8, paddingBottom:8, borderBottom:"1px solid var(--border)" }}>
          {!isMobile && <div style={{ width:labelWidth, flexShrink:0 }} />}
          {DAYS.map((d,i) => (
            <div key={i} style={{ flex:1, textAlign:"center", fontSize: isMobile?9:11, color: i===todayDow?"var(--text-primary)":"var(--text-muted)", fontWeight: i===todayDow?700:400, letterSpacing:"0.06em", textTransform:"uppercase", position:"relative", paddingBottom:6 }}>
              {d}
              {i===todayDow && <div style={{ width:4, height:4, borderRadius:"50%", background:"#4a7c59", position:"absolute", bottom:0, left:"50%", transform:"translateX(-50%)" }} />}
            </div>
          ))}
          <div style={{ width:streakW, flexShrink:0, textAlign:"center", fontSize:9, color:"var(--text-muted)", letterSpacing:"0.08em", textTransform:"uppercase" }}>
            {isMobile?"🔥":"streak"}
          </div>
          {/* reorder hint */}
          <div style={{ width:22, flexShrink:0 }} />
        </div>

        {/* ── Habit rows ── */}
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {habits.length === 0 && (
            <div style={{ textAlign:"center", color:"var(--text-muted)", padding:"32px 0 16px", fontStyle:"italic", fontSize:14 }}>
              No habits yet —
              <button onClick={() => setShowTemplates(true)} style={{ background:"none", border:"none", color:"#4a7c59", cursor:"pointer", fontSize:14, textDecoration:"underline", fontStyle:"italic", padding:"0 4px" }}>
                pick a starter pack
              </button>
              or add your own 🌱
            </div>
          )}

          {habits.map((habit, hi) => {
            const streak = getStreak(habit.completions);
            return (
              <div
                key={habit.id}
                draggable
                onDragStart={() => drag.onDragStart(hi)}
                onDragEnter={() => drag.onDragEnter(hi)}
                onDragEnd={drag.onDragEnd}
                onDragOver={e => e.preventDefault()}
                onTouchStart={e => drag.onTouchStart(hi, e)}
                onTouchEnd={e => drag.onTouchEnd(e)}
                style={{
                  background:"var(--card-bg)", borderRadius:12, border:"1px solid var(--border)",
                  animation:"fadeSlideIn 0.35s ease both",
                  animationDelay:`${hi*50}ms`, overflow:"hidden",
                  cursor:"grab",
                }}
              >
                {isMobile ? (
                  <>
                    <div style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 10px 4px" }}>
                      <span style={{ fontSize:15 }}>{habit.emoji}</span>
                      <span style={{ fontSize:13, color:"var(--text-primary)", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{habit.name}</span>
                      {habit.notes?.[todayKey] && <span style={{ fontSize:11 }}>📝</span>}
                      <span style={{ fontSize:12, fontWeight:700, color: streak>0?habit.color:"var(--text-muted)", whiteSpace:"nowrap" }}>
                        {streak>0?`🔥${streak}`:"—"}
                      </span>
                      <button onClick={() => removeHabit(habit.id)} style={{ background:"transparent", border:"none", cursor:"pointer", color:"var(--text-muted)", fontSize:16, lineHeight:1, padding:"0 2px", touchAction:"manipulation" }}>×</button>
                    </div>
                    <div style={{ display:"flex", gap:rowGap, padding:"4px 10px 10px", alignItems:"center" }}>
                      {weekKeys.map((key, i) => {
                        const done = !!habit.completions[key];
                        const isToday = i===todayDow;
                        const hasNote = !!habit.notes?.[key];
                        return (
                          <button key={key} onClick={e => toggle(habit.id, key, e)} style={{
                            flex:1, height:dotSize, borderRadius:"50%", cursor:"pointer",
                            display:"flex", alignItems:"center", justifyContent:"center",
                            background: done?habit.color:"transparent",
                            border:`2px solid ${done?habit.color:"var(--dot-border)"}`,
                            boxShadow: done?`0 0 8px ${habit.color}55`:"none",
                            outline: isToday?`2px solid ${habit.color}88`:"none",
                            outlineOffset:"2px",
                            transform: done?"scale(1.08)":"scale(1)",
                            transition:"all 0.18s cubic-bezier(.34,1.56,.64,1)",
                            touchAction:"manipulation", padding:0, minWidth:0, position:"relative",
                          }}>
                            {done && <span style={{ color:"#fff", fontSize:10, fontWeight:700 }}>✓</span>}
                            {hasNote && <span style={{ position:"absolute", top:-2, right:-2, width:7, height:7, borderRadius:"50%", background:"#c0784a", border:"1px solid var(--bg)" }} />}
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div style={{ display:"flex", alignItems:"center", gap:rowGap, padding:"12px 14px" }}>
                    {/* Drag handle */}
                    <span style={{ fontSize:14, color:"var(--text-muted)", cursor:"grab", userSelect:"none", flexShrink:0 }}>⠿</span>

                    <div style={{ width:labelWidth-22, flexShrink:0, display:"flex", alignItems:"center", gap:7, overflow:"hidden" }}>
                      <span style={{ fontSize:17, flexShrink:0 }}>{habit.emoji}</span>
                      <span style={{ fontSize:13, color:"var(--text-primary)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }}>{habit.name}</span>
                      {habit.notes?.[todayKey] && <span style={{ fontSize:11 }}>📝</span>}
                      <button onClick={() => removeHabit(habit.id)} style={{ background:"transparent", border:"none", cursor:"pointer", color:"var(--text-muted)", fontSize:17, lineHeight:1, padding:"0 2px", flexShrink:0 }}>×</button>
                    </div>

                    {weekKeys.map((key, i) => {
                      const done = !!habit.completions[key];
                      const isToday = i===todayDow;
                      const hasNote = !!habit.notes?.[key];
                      return (
                        <div key={key} style={{ flex:1, maxWidth:dotSize+6, position:"relative" }}>
                          <button
                            onClick={e => toggle(habit.id, key, e)}
                            onContextMenu={e => { e.preventDefault(); setNoteModal({ habit, dayKey:key }); }}
                            title={isToday?"Click to check · Right-click to note":DAYS_FULL[i]}
                            style={{
                              width:"100%", height:dotSize, borderRadius:"50%", cursor:"pointer",
                              display:"flex", alignItems:"center", justifyContent:"center",
                              background: done?habit.color:"transparent",
                              border:`2px solid ${done?habit.color:"var(--dot-border)"}`,
                              boxShadow: done?`0 0 12px ${habit.color}55`:"none",
                              outline: isToday?`2px solid ${habit.color}88`:"none",
                              outlineOffset:"3px",
                              transform: done?"scale(1.12)":"scale(1)",
                              transition:"all 0.18s cubic-bezier(.34,1.56,.64,1)",
                              padding:0, minWidth:0, touchAction:"manipulation",
                            }}
                          >
                            {done && <span style={{ color:"#fff", fontSize:13, fontWeight:700 }}>✓</span>}
                          </button>
                          {hasNote && <span style={{ position:"absolute", top:0, right:0, width:8, height:8, borderRadius:"50%", background:"#c0784a", border:"2px solid var(--bg)" }} />}
                        </div>
                      );
                    })}

                    <div style={{ width:streakW, flexShrink:0, textAlign:"center", fontSize:12, fontWeight: streak>0?700:400, color: streak>0?habit.color:"var(--text-muted)" }}>
                      {streak>0?`🔥 ${streak}`:"—"}
                    </div>
                    <div style={{ width:22, flexShrink:0 }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Templates shortcut */}
        {habits.length > 0 && (
          <button onClick={() => setShowTemplates(true)} style={{
            background:"transparent", border:"1px dashed var(--border)", color:"var(--text-muted)",
            width:"100%", marginTop:10, padding:"10px", borderRadius:12, cursor:"pointer",
            fontSize:13, touchAction:"manipulation",
          }}>+ add a starter pack</button>
        )}

        {/* ── Add habit panel ── */}
        {adding && (
          <div style={{ marginTop:18, background:"var(--card-bg)", borderRadius:16, padding: isMobile?16:22, border:"1px solid var(--border)", animation:"fadeSlideIn 0.25s ease both" }}>
            <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize: isMobile?17:20, color:"var(--text-primary)", margin:"0 0 14px", fontStyle:"italic" }}>New Habit</h3>
            <input style={{ width:"100%", boxSizing:"border-box", background:"var(--input-bg)", border:"1px solid var(--border)", borderRadius:10, padding:"10px 14px", fontFamily:"'Lato',sans-serif", fontSize:16, color:"var(--text-primary)", outline:"none", marginBottom:14 }}
              placeholder="Habit name…" value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key==="Enter" && addHabit()} autoFocus />
            <div style={{ marginBottom:12 }}>
              <span style={{ fontSize:10, color:"var(--text-muted)", letterSpacing:"0.1em", textTransform:"uppercase", display:"block", marginBottom:8 }}>Emoji</span>
              <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                {EMOJIS.map(em => (
                  <button key={em} onClick={() => setNewEmoji(em)} style={{ fontSize: isMobile?22:20, border:"none", cursor:"pointer", borderRadius:8, padding: isMobile?"6px 8px":"4px 6px", background: newEmoji===em?"var(--input-bg)":"transparent", transform: newEmoji===em?"scale(1.2)":"scale(1)", transition:"all 0.15s", touchAction:"manipulation" }}>{em}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom:16 }}>
              <span style={{ fontSize:10, color:"var(--text-muted)", letterSpacing:"0.1em", textTransform:"uppercase", display:"block", marginBottom:8 }}>Color</span>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {PALETTE.map(c => (
                  <button key={c} onClick={() => setNewColor(c)} style={{ width: isMobile?28:24, height: isMobile?28:24, borderRadius:"50%", border:"none", cursor:"pointer", background:c, outline: newColor===c?`3px solid ${c}`:"none", outlineOffset:"3px", transform: newColor===c?"scale(1.2)":"scale(1)", transition:"all 0.15s", touchAction:"manipulation" }} />
                ))}
              </div>
            </div>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button onClick={() => setAdding(false)} style={{ background:"transparent", border:"1px solid var(--border)", color:"var(--text-muted)", padding:"9px 18px", borderRadius:20, cursor:"pointer", fontSize:13, touchAction:"manipulation" }}>cancel</button>
              <button onClick={addHabit} style={{ background:newColor, border:"none", color:"#fff", padding:"9px 20px", borderRadius:20, cursor:"pointer", fontSize:13, touchAction:"manipulation" }}>plant it 🌱</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {showStats    && <StatsModal habits={habits} onClose={() => setShowStats(false)} />}
      {noteModal    && <NoteModal  habit={noteModal.habit} dayKey={noteModal.dayKey} onSave={saveNote} onClose={() => setNoteModal(null)} />}
      {showNotifs   && <NotificationModal habits={habits} onClose={() => setShowNotifs(false)} />}
      {showTemplates && <TemplatesModal onApply={applyTemplate} onClose={() => setShowTemplates(false)} />}
    </div>
  );
}

export default function App() {
  return <ThemeProvider><BloomApp /></ThemeProvider>;
}
