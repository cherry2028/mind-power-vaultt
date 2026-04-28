import React, { useState, useEffect, useRef, useMemo } from 'react';

// Design Tokens (Matching App.jsx)
const G = {
  black: "#05050A", dark1: "#0A0A10", dark2: "#0F0F16",
  gold: "#C9A84C", goldDim: "rgba(201,168,76,0.18)",
  smoke: "#F5F2EA", mid: "#D0CCBF", soft: "#A8A498",
  vsoft: "rgba(240,237,228,0.32)",
  green: "#4CAF50", red: "#FF5252"
};
const serif = "'Cormorant Garamond', Georgia, serif";
const sans = "'DM Sans', sans-serif";

const DB_KEY = "mpv_journal_v2";
const STUDENT_KEY = "mpv_students_v1";

export default function Journal({ lang, onBack }) {
  const [activeTab, setActiveTab] = useState('foundation');
  const [accessLocked, setAccessLocked] = useState(true);
  const [accessCode, setAccessCode] = useState("");
  const [adminMode, setAdminMode] = useState(false);
  const [adminAuth, setAdminAuth] = useState(false);
  const [adminPwd, setAdminPwd] = useState("");

  const [db, setDb] = useState(() => {
    const saved = localStorage.getItem(DB_KEY);
    return saved ? JSON.parse(saved) : {
      found: { strategy: "", anchors: "", riskPerTrade: "", maxDrawdown: "", dailyStop: "" },
      pre: { mood: "", focus: "", bias: "", plan: "" },
      check: { higherTimeframe: false, keyLevel: false, signal: false, riskReward: false, emotionCheck: false },
      log: [],
      eod: { date: "", pnl: 0, processScore: 5, biggestLesson: "", tomorrowGoal: "" },
      rules: [],
      hist: []
    };
  });

  const [students, setStudents] = useState(() => {
    const saved = localStorage.getItem(STUDENT_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  }, [db]);

  useEffect(() => {
    localStorage.setItem(STUDENT_KEY, JSON.stringify(students));
  }, [students]);

  // Auth logic
  const checkAccess = () => {
    const match = students.find(s => s.code === accessCode && s.active);
    if (match || accessCode === 'MPV-CHERRY-2024') {
      setAccessLocked(false);
    } else {
      alert("Invalid Access Code. Please contact K Prasad.");
    }
  };

  const handleAdminLogin = () => {
    if (adminPwd === "mpv@cherry2028") {
      setAdminAuth(true);
    } else {
      alert("Incorrect Admin Password.");
    }
  };

  const addStudent = (name, city, phone) => {
    const code = "MPV-" + Math.random().toString(36).substr(2, 6).toUpperCase();
    const newStudent = { id: Date.now(), name, city, phone, code, active: true, joined: new Date().toLocaleDateString() };
    setStudents([...students, newStudent]);
    return code;
  };

  // Helper components
  const Card = ({ children, style }) => (
    <div style={{ background: G.dark2, border: `1px solid ${G.goldDim}`, borderRadius: 12, padding: 24, marginBottom: 20, ...style }}>
      {children}
    </div>
  );

  const Input = ({ label, value, onChange, placeholder, type = "text", multiline = false }) => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 10, letterSpacing: 2, color: G.gold, textTransform: "uppercase", marginBottom: 8, fontFamily: sans }}>{label}</label>
      {multiline ? (
        <textarea 
          value={value} 
          onChange={e => onChange(e.target.value)} 
          placeholder={placeholder}
          style={{ width: "100%", background: "rgba(201,168,76,0.04)", border: `1px solid ${G.goldDim}`, borderRadius: 6, color: G.smoke, padding: 12, fontSize: 14, fontFamily: sans, minHeight: 100, outline: "none" }}
        />
      ) : (
        <input 
          type={type}
          value={value} 
          onChange={e => onChange(e.target.value)} 
          placeholder={placeholder}
          style={{ width: "100%", background: "rgba(201,168,76,0.04)", border: `1px solid ${G.goldDim}`, borderRadius: 6, color: G.smoke, padding: 12, fontSize: 14, fontFamily: sans, outline: "none" }}
        />
      )}
    </div>
  );

  const Button = ({ label, onClick, variant = "primary", style }) => (
    <button 
      onClick={onClick}
      style={{ 
        padding: "12px 24px", 
        borderRadius: 4, 
        border: variant === "primary" ? "none" : `1px solid ${G.goldDim}`,
        background: variant === "primary" ? `linear-gradient(135deg, ${G.gold}, #9A7020)` : "transparent",
        color: variant === "primary" ? G.black : G.gold,
        fontWeight: 700,
        fontSize: 12,
        letterSpacing: 1.5,
        textTransform: "uppercase",
        cursor: "pointer",
        fontFamily: sans,
        ...style 
      }}
    >
      {label}
    </button>
  );

  // Identity Calculation
  const identity = useMemo(() => {
    if (!db.log.length) return { lvl: 'Observer', desc: 'No data yet. Start logging trades.' };
    const impulse = db.log.filter(t => t.impulse).length;
    const ratio = impulse / db.log.length;
    if (ratio > 0.5) return { lvl: 'Emotional Gambler', desc: 'High impulse rate. Emotions are driving your trades.' };
    if (ratio > 0.2) return { lvl: 'Aspiring Trader', desc: 'Some discipline, but impulses still leak through.' };
    return { lvl: 'Professional Trader', desc: 'High discipline. You trade your plan, not your mood.' };
  }, [db.log]);

  // Sections
  const Foundation = () => (
    <div>
      <h2 style={{ fontFamily: serif, fontSize: 32, color: G.gold, marginBottom: 24 }}>Trading Foundation</h2>
      <Card>
        <Input label="Strategy Core" value={db.found.strategy} onChange={v => setDb({...db, found: {...db.found, strategy: v}})} placeholder="Describe your primary edge..." multiline />
        <Input label="Psychological Anchors" value={db.found.anchors} onChange={v => setDb({...db, found: {...db.found, anchors: v}})} placeholder="What keeps you grounded?" multiline />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Input label="Risk per Trade" value={db.found.riskPerTrade} onChange={v => setDb({...db, found: {...db.found, riskPerTrade: v}})} placeholder="e.g. 1%" />
          <Input label="Daily Stop Loss" value={db.found.dailyStop} onChange={v => setDb({...db, found: {...db.found, dailyStop: v}})} placeholder="e.g. 3%" />
        </div>
      </Card>
    </div>
  );

  const PreMarket = () => (
    <div>
      <h2 style={{ fontFamily: serif, fontSize: 32, color: G.gold, marginBottom: 24 }}>Pre-Market Ritual</h2>
      <Card>
        <Input label="Current Mood" value={db.pre.mood} onChange={v => setDb({...db, pre: {...db.pre, mood: v}})} placeholder="Excited, Calm, Anxious?" />
        <Input label="Focus Level (1-10)" value={db.pre.focus} onChange={v => setDb({...db, pre: {...db.pre, focus: v}})} type="number" />
        <Input label="Market Bias" value={db.pre.bias} onChange={v => setDb({...db, pre: {...db.pre, bias: v}})} placeholder="Bullish, Bearish, Sideways?" />
        <Input label="Today's Plan" value={db.pre.plan} onChange={v => setDb({...db, pre: {...db.pre, plan: v}})} placeholder="What are you waiting for?" multiline />
      </Card>
    </div>
  );

  const EODReview = () => {
    const saveEOD = () => {
      const entry = { ...db.eod, id: Date.now(), timestamp: new Date().toISOString() };
      setDb({ ...db, hist: [entry, ...db.hist], eod: { date: "", pnl: 0, processScore: 5, biggestLesson: "", tomorrowGoal: "" } });
      alert("Daily Review Saved!");
    };
    return (
      <div>
        <h2 style={{ fontFamily: serif, fontSize: 32, color: G.gold, marginBottom: 24 }}>End of Day Review</h2>
        <Card>
          <Input label="PNL (Points/Currency)" value={db.eod.pnl} onChange={v => setDb({...db, eod: {...db.eod, pnl: v}})} type="number" />
          <Input label="Process Score (1-10)" value={db.eod.processScore} onChange={v => setDb({...db, eod: {...db.eod, processScore: v}})} type="number" />
          <Input label="Biggest Lesson Today" value={db.eod.biggestLesson} onChange={v => setDb({...db, eod: {...db.eod, biggestLesson: v}})} multiline />
          <Input label="Goal for Tomorrow" value={db.eod.tomorrowGoal} onChange={v => setDb({...db, eod: {...db.eod, tomorrowGoal: v}})} multiline />
          <Button label="Save Daily Review" onClick={saveEOD} style={{ width: "100%" }} />
        </Card>
      </div>
    );
  };

  const PsychologySection = () => (
    <div>
      <h2 style={{ fontFamily: serif, fontSize: 32, color: G.gold, marginBottom: 24 }}>Trader Psychology</h2>
      <Card style={{ textAlign: "center", padding: "40px 24px" }}>
        <p style={{ fontSize: 10, letterSpacing: 4, color: G.soft, textTransform: "uppercase", marginBottom: 12 }}>Current Identity Level</p>
        <h3 style={{ fontSize: 36, color: G.gold, fontFamily: serif, marginBottom: 12 }}>{identity.lvl}</h3>
        <p style={{ color: G.mid, fontSize: 14, lineHeight: 1.6, maxWidth: 400, margin: "0 auto" }}>{identity.desc}</p>
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          <h4 style={{ color: G.gold, fontSize: 12, marginBottom: 12 }}>Stats</h4>
          <p style={{ color: G.smoke, fontSize: 24 }}>{db.log.length} <span style={{ fontSize: 12, color: G.soft }}>Trades Logged</span></p>
          <p style={{ color: G.red, fontSize: 24, marginTop: 8 }}>{db.log.filter(t => t.impulse).length} <span style={{ fontSize: 12, color: G.soft }}>Impulse Trades</span></p>
        </Card>
        <Card>
          <h4 style={{ color: G.gold, fontSize: 12, marginBottom: 12 }}>Discipline</h4>
          <p style={{ color: G.green, fontSize: 24 }}>{db.log.length > 0 ? (((db.log.length - db.log.filter(t => t.impulse).length) / db.log.length) * 100).toFixed(0) : 0}%</p>
          <p style={{ fontSize: 12, color: G.soft }}>Process Consistency</p>
        </Card>
      </div>
    </div>
  );

  const HistorySection = () => (
    <div>
      <h2 style={{ fontFamily: serif, fontSize: 32, color: G.gold, marginBottom: 24 }}>Journal History</h2>
      {db.hist.length === 0 ? (
        <Card><p style={{ color: G.soft }}>No history found. Complete an EOD review to see entries here.</p></Card>
      ) : (
        db.hist.map(h => (
          <Card key={h.id}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ color: G.gold, fontWeight: 700 }}>{new Date(h.timestamp).toLocaleDateString()}</span>
              <span style={{ color: h.pnl >= 0 ? G.green : G.red }}>PNL: {h.pnl}</span>
            </div>
            <p style={{ color: G.mid, fontSize: 14, lineHeight: 1.6 }}><strong>Lesson:</strong> {h.biggestLesson}</p>
          </Card>
        ))
      )}
    </div>
  );


  const TradeLog = () => {
    const [entry, setEntry] = useState({ symbol: "", type: "BUY", entry: "", sl: "", tp: "", notes: "", impulse: false });
    const addTrade = () => {
      setDb({...db, log: [...db.log, {...entry, id: Date.now(), time: new Date().toLocaleTimeString()}]});
      setEntry({ symbol: "", type: "BUY", entry: "", sl: "", tp: "", notes: "", impulse: false });
    };
    return (
      <div>
        <h2 style={{ fontFamily: serif, fontSize: 32, color: G.gold, marginBottom: 24 }}>Live Trade Log</h2>
        <Card>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Input label="Symbol" value={entry.symbol} onChange={v => setEntry({...entry, symbol: v})} />
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 10, letterSpacing: 2, color: G.gold, textTransform: "uppercase", marginBottom: 8, fontFamily: sans }}>Type</label>
              <select value={entry.type} onChange={e => setEntry({...entry, type: e.target.value})} style={{ width: "100%", background: "rgba(201,168,76,0.04)", border: `1px solid ${G.goldDim}`, borderRadius: 6, color: G.smoke, padding: 12, fontSize: 14, fontFamily: sans, outline: "none" }}>
                <option value="BUY">BUY</option>
                <option value="SELL">SELL</option>
              </select>
            </div>
            <Input label="Entry Price" value={entry.entry} onChange={v => setEntry({...entry, entry: v})} />
          </div>
          <Input label="Trade Notes / Emotion" value={entry.notes} onChange={v => setEntry({...entry, notes: v})} multiline />
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <input type="checkbox" checked={entry.impulse} onChange={e => setEntry({...entry, impulse: e.target.checked})} id="impulse" />
            <label htmlFor="impulse" style={{ fontSize: 13, color: entry.impulse ? G.red : G.mid, fontFamily: sans }}>Was this an impulse trade?</label>
          </div>
          <Button label="Record Trade" onClick={addTrade} style={{ width: "100%" }} />
        </Card>
        
        {db.log.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <h3 style={{ fontSize: 12, letterSpacing: 3, color: G.soft, textTransform: "uppercase", marginBottom: 16, fontFamily: sans }}>Logged Trades</h3>
            {db.log.map(t => (
              <Card key={t.id} style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ color: t.type === 'BUY' ? G.green : G.red, fontWeight: 700, marginRight: 12 }}>{t.type}</span>
                  <span style={{ color: G.smoke, fontWeight: 600 }}>{t.symbol}</span>
                  <p style={{ fontSize: 12, color: G.soft, marginTop: 4 }}>{t.time} • Entry: {t.entry}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  {t.impulse && <span style={{ background: "rgba(255,82,82,0.1)", color: G.red, fontSize: 10, padding: "2px 8px", borderRadius: 10, border: `1px solid ${G.red}30` }}>IMPULSE</span>}
                  <button onClick={() => setDb({...db, log: db.log.filter(x => x.id !== t.id)})} style={{ background: "transparent", border: "none", color: G.soft, cursor: "pointer", marginLeft: 12 }}>✕</button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  const AdminSection = () => {
    const [name, setName] = useState("");
    const [city, setCity] = useState("");
    const [phone, setPhone] = useState("");
    return (
      <div>
        <h2 style={{ fontFamily: serif, fontSize: 32, color: G.gold, marginBottom: 24 }}>Student Management</h2>
        <Card>
          <Input label="Student Name" value={name} onChange={setName} />
          <Input label="City" value={city} onChange={setCity} />
          <Input label="WhatsApp/Phone" value={phone} onChange={setPhone} />
          <Button label="Generate Access Code" onClick={() => {
            const code = addStudent(name, city, phone);
            alert(`Code generated for ${name}: ${code}`);
            setName(""); setCity(""); setPhone("");
          }} style={{ width: "100%" }} />
        </Card>
        
        <div style={{ marginTop: 32 }}>
          <h3 style={{ fontSize: 12, letterSpacing: 3, color: G.soft, textTransform: "uppercase", marginBottom: 16, fontFamily: sans }}>Registered Students</h3>
          {students.map(s => (
            <Card key={s.id} style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ color: G.smoke, fontWeight: 600 }}>{s.name} <span style={{ color: G.soft, fontSize: 12, fontWeight: 400 }}>({s.city})</span></p>
                <p style={{ fontSize: 12, color: G.gold, marginTop: 4, letterSpacing: 1 }}>CODE: {s.code}</p>
              </div>
              <button onClick={() => setStudents(students.filter(x => x.id !== s.id))} style={{ background: "transparent", border: "none", color: G.red, cursor: "pointer", opacity: 0.7 }}>Remove</button>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  if (accessLocked && !adminMode) {
    return (
      <div style={{ minHeight: "100vh", background: G.black, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ maxWidth: 400, width: "100%", textAlign: "center" }}>
          <img src="https://raw.githubusercontent.com/mindpowervaultt/assets/main/logo.png" style={{ width: 80, marginBottom: 32 }} />
          <h2 style={{ fontFamily: serif, fontSize: 32, color: G.smoke, marginBottom: 8 }}>Student Portal</h2>
          <p style={{ color: G.soft, fontSize: 14, marginBottom: 32 }}>Enter your unique access code to unlock your trading journal.</p>
          <Card>
            <Input label="Access Code" value={accessCode} onChange={setAccessCode} placeholder="MPV-XXXXXX" />
            <Button label="Unlock Journal" onClick={checkAccess} style={{ width: "100%", marginBottom: 12 }} />
            <p onClick={() => setAdminMode(true)} style={{ fontSize: 11, color: G.vsoft, cursor: "pointer" }}>Admin Login</p>
          </Card>
          <p style={{ color: G.mid, fontSize: 12, marginTop: 24, cursor: "pointer" }} onClick={onBack}>← Back to Main Site</p>
        </div>
      </div>
    );
  }

  if (adminMode && !adminAuth) {
    return (
      <div style={{ minHeight: "100vh", background: G.black, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ maxWidth: 400, width: "100%", textAlign: "center" }}>
          <h2 style={{ fontFamily: serif, fontSize: 32, color: G.gold, marginBottom: 32 }}>Admin Access</h2>
          <Card>
            <Input label="Password" type="password" value={adminPwd} onChange={setAdminPwd} />
            <Button label="Login" onClick={handleAdminLogin} style={{ width: "100%", marginBottom: 12 }} />
            <p onClick={() => setAdminMode(false)} style={{ fontSize: 11, color: G.vsoft, cursor: "pointer" }}>Student Access</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: G.black, display: "flex" }}>
      {/* Sidebar */}
      <div style={{ width: 280, borderRight: `1px solid ${G.goldDim}`, padding: 32, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ marginBottom: 48, cursor: "pointer" }} onClick={onBack}>
          <h1 style={{ fontFamily: serif, fontSize: 24, color: G.gold, letterSpacing: 2 }}>MPV <span style={{ fontSize: 12, color: G.smoke }}>JOURNAL</span></h1>
        </div>
        
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
          {[
            { id: 'foundation', icon: '🏛️', label: 'Foundation' },
            { id: 'premarket', icon: '🌅', label: 'Pre-Market' },
            { id: 'tradelog', icon: '📝', label: 'Trade Log' },
            { id: 'eod', icon: '🌙', label: 'EOD Review' },
            { id: 'psychology', icon: '🧠', label: 'Psychology' },
            { id: 'history', icon: '📚', label: 'History' },
          ].map(t => (
            <div 
              key={t.id} 
              onClick={() => { setActiveTab(t.id); setAdminAuth(false); }}
              style={{ 
                padding: "12px 16px", 
                borderRadius: 8, 
                cursor: "pointer", 
                background: activeTab === t.id && !adminAuth ? "rgba(201,168,76,0.1)" : "transparent",
                color: activeTab === t.id && !adminAuth ? G.gold : G.mid,
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontSize: 14,
                fontFamily: sans,
                transition: "all 0.2s"
              }}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </div>
          ))}
        </div>

        {adminAuth && (
          <div 
            onClick={() => setActiveTab('admin')}
            style={{ 
              marginTop: 20,
              padding: "12px 16px", 
              borderRadius: 8, 
              cursor: "pointer", 
              background: activeTab === 'admin' ? "rgba(201,168,76,0.1)" : "transparent",
              color: G.gold,
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontSize: 14,
              fontFamily: sans,
              border: `1px solid ${G.goldDim}`
            }}
          >
            <span>⚙️</span>
            <span>Admin</span>
          </div>
        )}

        <div style={{ marginTop: "auto" }}>
          <p style={{ fontSize: 10, color: G.vsoft, letterSpacing: 1 }}>STUDENT ID: {accessCode || "ADMIN"}</p>
          <p onClick={() => window.location.reload()} style={{ fontSize: 11, color: G.gold, cursor: "pointer", marginTop: 8 }}>Lock Portal 🔒</p>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: "64px 48px", overflowY: "auto", maxHeight: "100vh" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          {activeTab === 'foundation' && <Foundation />}
          {activeTab === 'premarket' && <PreMarket />}
          {activeTab === 'tradelog' && <TradeLog />}
          {activeTab === 'eod' && <EODReview />}
          {activeTab === 'psychology' && <PsychologySection />}
          {activeTab === 'history' && <HistorySection />}
          {activeTab === 'admin' && adminAuth && <AdminSection />}
          {/* Add other sections as needed */}
        </div>
      </div>
    </div>
  );
}
