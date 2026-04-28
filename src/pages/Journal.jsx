import React, { useState, useEffect, useMemo } from 'react';
import { G, serif, sans } from '../utils/constants';
import { api } from '../utils/api-client';

const DB_KEY = "mpv_journal_v2";
const STUDENT_KEY = "mpv_students_v1";

export default function Journal({ lang, onBack }) {
  const [activeTab, setActiveTab] = useState('foundation');
  const [accessLocked, setAccessLocked] = useState(true);
  const [accessCode, setAccessCode] = useState("");
  const [adminMode, setAdminMode] = useState(false);
  const [adminAuth, setAdminAuth] = useState(false);
  const [adminPwd, setAdminPwd] = useState("");
  const [loading, setLoading] = useState(false);

  const [db, setDb] = useState(() => {
    const saved = localStorage.getItem(DB_KEY);
    return saved ? JSON.parse(saved) : {
      found: { strategy: "", anchors: "", riskPerTrade: "", maxDrawdown: "", dailyStop: "" },
      pre: { mood: "", focus: "", bias: "", plan: "" },
      check: { higherTimeframe: false, keyLevel: false, signal: false, riskRR: false },
      log: [],
      eod: { date: new Date().toISOString().split('T')[0], pnl: "", score: 5, lesson: "" },
      hist: []
    };
  });

  const [students, setStudents] = useState(() => {
    const saved = localStorage.getItem(STUDENT_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => { localStorage.setItem(DB_KEY, JSON.stringify(db)); }, [db]);
  useEffect(() => { localStorage.setItem(STUDENT_KEY, JSON.stringify(students)); }, [students]);

  const checkAccess = async () => {
    setLoading(true);
    const match = students.find(s => s.code === accessCode && s.active);
    if (match) { setAccessLocked(false); setLoading(false); return; }
    try {
      const res = await api.validateCode(accessCode, 'access');
      if (res.valid) setAccessLocked(false);
      else alert("Invalid Access Code.");
    } catch (e) { alert("Error."); }
    setLoading(false);
  };

  const handleAdminLogin = async () => {
    setLoading(true);
    try {
      const res = await api.validateCode(adminPwd, 'admin');
      if (res.valid) setAdminAuth(true);
      else alert("Incorrect Admin Password.");
    } catch (e) { alert("Error."); }
    setLoading(false);
  };

  const addStudent = (name, city) => {
    const code = "MPV-" + Math.random().toString(36).substr(2, 6).toUpperCase();
    setStudents([...students, { id: Date.now(), name, city, code, active: true }]);
    return code;
  };

  // Components
  const Card = ({ children, style }) => (
    <div style={{ background: G.dark2, border: `1px solid ${G.goldDim}`, borderRadius: 12, padding: 24, marginBottom: 20, ...style }}>{children}</div>
  );

  const Input = ({ label, value, onChange, placeholder, type = "text", multiline = false }) => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 10, letterSpacing: 2, color: G.gold, textTransform: "uppercase", marginBottom: 8, fontFamily: sans }}>{label}</label>
      {multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ width: "100%", background: "rgba(201,168,76,0.04)", border: `1px solid ${G.goldDim}`, borderRadius: 6, color: G.smoke, padding: 12, fontSize: 14, fontFamily: sans, minHeight: 100, outline: "none" }} />
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ width: "100%", background: "rgba(201,168,76,0.04)", border: `1px solid ${G.goldDim}`, borderRadius: 6, color: G.smoke, padding: 12, fontSize: 14, fontFamily: sans, outline: "none" }} />
      )}
    </div>
  );

  const Check = ({ label, checked, onChange }) => (
    <label style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, cursor: "pointer", color: G.mid, fontSize: 14 }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ width: 18, height: 18, accentColor: G.gold }} /> {label}
    </label>
  );

  if (accessLocked) {
    return (
      <div style={{ minHeight: "100vh", background: G.black, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ maxWidth: 400, width: "100%", textAlign: "center" }}>
          <h1 style={{ fontFamily: serif, fontSize: 32, color: G.smoke, marginBottom: 32 }}>Mind Power Vaultt</h1>
          <Card>
            <p style={{ color: G.mid, fontSize: 14, marginBottom: 24 }}>Enter Student Access Code</p>
            <input value={accessCode} onChange={e => setAccessCode(e.target.value.toUpperCase())} placeholder="MPV-XXXXXX" style={{ width: "100%", background: G.black, border: `1px solid ${G.goldDim}`, borderRadius: 6, color: G.gold, padding: 16, fontSize: 18, textAlign: "center", letterSpacing: 4, marginBottom: 20 }} />
            <button onClick={checkAccess} disabled={loading} style={{ width: "100%", background: G.gold, color: G.black, border: "none", borderRadius: 6, padding: "16px", fontWeight: 700, cursor: "pointer", opacity: loading ? 0.6 : 1 }}>{loading ? "Validating..." : "Enter Portal →"}</button>
          </Card>
          <button onClick={onBack} style={{ background: "transparent", border: "none", color: G.soft, fontSize: 12, textDecoration: "underline" }}>← Back</button>
        </div>
      </div>
    );
  }

  if (adminMode && adminAuth) {
    return (
      <div style={{ minHeight: "100vh", background: G.black, color: G.smoke, padding: 40 }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 40 }}>
            <h1 style={{ fontFamily: serif, fontSize: 32, color: G.gold }}>Admin Portal</h1>
            <button onClick={() => {setAdminMode(false); setAdminAuth(false);}} style={{ background: "transparent", border: `1px solid ${G.goldDim}`, color: G.mid, padding: "8px 16px" }}>Exit</button>
          </div>
          <Card>
            <h3 style={{ marginBottom: 20 }}>Add Student</h3>
            <div style={{ display: "flex", gap: 12 }}>
              <input id="sN" placeholder="Name" style={{ flex: 1, background: G.black, border: `1px solid ${G.goldDim}`, color: G.smoke, padding: 12 }} />
              <input id="sC" placeholder="City" style={{ flex: 1, background: G.black, border: `1px solid ${G.goldDim}`, color: G.smoke, padding: 12 }} />
              <button onClick={() => { const n = document.getElementById('sN').value; const c = document.getElementById('sC').value; if(n&&c) alert("Code: " + addStudent(n,c)); }} style={{ background: G.gold, color: G.black, border: "none", padding: "0 24px" }}>Add</button>
            </div>
          </Card>
          <Card>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ borderBottom: `1px solid ${G.goldDim}` }}><tr style={{ textAlign: "left" }}><th style={{ padding: 12 }}>NAME</th><th style={{ padding: 12 }}>CODE</th></tr></thead>
              <tbody>{students.map(s => <tr key={s.id}><td style={{ padding: 12 }}>{s.name}</td><td style={{ padding: 12, color: G.gold }}>{s.code}</td></tr>)}</tbody>
            </table>
          </Card>
        </div>
      </div>
    );
  }

  const PreMarket = () => (
    <div>
      <h2 style={{ fontFamily: serif, fontSize: 32, marginBottom: 24 }}>Pre-Market Ritual</h2>
      <Card>
        <Input label="Current Mood" value={db.pre.mood} onChange={v => setDb({...db, pre: {...db.pre, mood: v}})} placeholder="How are you feeling?" />
        <Input label="Focus Area" value={db.pre.focus} onChange={v => setDb({...db, pre: {...db.pre, focus: v}})} placeholder="What is your main goal today?" />
        <Input label="Market Bias" value={db.pre.bias} onChange={v => setDb({...db, pre: {...db.pre, bias: v}})} placeholder="Bullish / Bearish / Neutral?" />
        <Input label="Trading Plan" value={db.pre.plan} onChange={v => setDb({...db, pre: {...db.pre, plan: v}})} placeholder="Scenario A / Scenario B..." multiline />
      </Card>
      <Card>
        <p style={{ color: G.gold, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>Pre-Flight Checklist</p>
        <Check label="Higher Timeframe Analysis" checked={db.check.higherTimeframe} onChange={v => setDb({...db, check: {...db.check, higherTimeframe: v}})} />
        <Check label="Key Levels Identified" checked={db.check.keyLevel} onChange={v => setDb({...db, check: {...db.check, keyLevel: v}})} />
        <Check label="Signal Confirmation" checked={db.check.signal} onChange={v => setDb({...db, check: {...db.check, signal: v}})} />
        <Check label="Risk/Reward > 1:2" checked={db.check.riskRR} onChange={v => setDb({...db, check: {...db.check, riskRR: v}})} />
      </Card>
    </div>
  );

  const TradeLog = () => {
    const addTrade = () => setDb({ ...db, log: [{ id: Date.now(), time: new Date().toLocaleTimeString(), pair: "", type: "BUY", size: "", price: "", result: "OPEN" }, ...db.log] });
    const updateTrade = (id, k, v) => setDb({ ...db, log: db.log.map(t => t.id === id ? { ...t, [k]: v } : t) });
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
          <h2 style={{ fontFamily: serif, fontSize: 32 }}>Live Trade Log</h2>
          <button onClick={addTrade} style={{ background: G.gold, color: G.black, border: "none", padding: "8px 20px", borderRadius: 4, fontWeight: 700 }}>+ Log Trade</button>
        </div>
        {db.log.map(t => (
          <Card key={t.id}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
              <Input label="TIME" value={t.time} onChange={v => updateTrade(t.id, 'time', v)} />
              <Input label="INSTRUMENT" value={t.pair} onChange={v => updateTrade(t.id, 'pair', v)} placeholder="Nifty" />
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 10, color: G.gold, marginBottom: 8 }}>TYPE</label>
                <select value={t.type} onChange={e => updateTrade(t.id, 'type', e.target.value)} style={{ width: "100%", background: "#12121A", border: `1px solid ${G.goldDim}`, color: G.smoke, padding: 10, borderRadius: 6 }}>
                  <option value="BUY">BUY</option><option value="SELL">SELL</option>
                </select>
              </div>
              <Input label="RESULT" value={t.result} onChange={v => updateTrade(t.id, 'result', v)} placeholder="P&L" />
            </div>
          </Card>
        ))}
      </div>
    );
  };

  const EOD = () => {
    const saveEOD = () => {
      const entry = { ...db.eod, id: Date.now(), timestamp: new Date().toLocaleDateString() };
      setDb({ ...db, hist: [entry, ...db.hist], eod: { date: new Date().toISOString().split('T')[0], pnl: "", score: 5, lesson: "" } });
      alert("Day Saved.");
    };
    return (
      <div>
        <h2 style={{ fontFamily: serif, fontSize: 32, marginBottom: 24 }}>End of Day Review</h2>
        <Card>
          <Input label="DATE" type="date" value={db.eod.date} onChange={v => setDb({...db, eod: {...db.eod, date: v}})} />
          <Input label="TOTAL P&L" value={db.eod.pnl} onChange={v => setDb({...db, eod: {...db.eod, pnl: v}})} placeholder="e.g. +5000" />
          <Input label="PROCESS SCORE (1-10)" type="number" value={db.eod.score} onChange={v => setDb({...db, eod: {...db.eod, score: v}})} />
          <Input label="BIGGEST LESSON" value={db.eod.lesson} onChange={v => setDb({...db, eod: {...db.eod, lesson: v}})} placeholder="What did you learn today?" multiline />
          <button onClick={saveEOD} style={{ width: "100%", background: G.gold, color: G.black, border: "none", padding: "16px", fontWeight: 700, borderRadius: 6 }}>Close & Save Day</button>
        </Card>
      </div>
    );
  };

  const History = () => (
    <div>
      <h2 style={{ fontFamily: serif, fontSize: 32, marginBottom: 24 }}>Journal History</h2>
      {db.hist.map(h => (
        <Card key={h.id}>
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${G.goldDim}`, marginBottom: 12, paddingBottom: 8 }}>
            <span style={{ color: G.gold, fontWeight: 700 }}>{h.date}</span>
            <span style={{ color: h.pnl.includes('+') ? '#4CAF50' : '#FF5252' }}>{h.pnl}</span>
          </div>
          <p style={{ fontSize: 13, color: G.mid }}>Lesson: {h.lesson}</p>
        </Card>
      ))}
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: G.black, color: G.smoke, display: "grid", gridTemplateColumns: "260px 1fr" }}>
      <aside style={{ background: G.dark1, borderRight: `1px solid ${G.goldDim}`, padding: 32, display: "flex", flexDirection: "column" }}>
        <h2 style={{ fontFamily: serif, fontSize: 24, color: G.gold, marginBottom: 48 }}>Journal</h2>
        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          {['foundation', 'premarket', 'tradelog', 'eod', 'history'].map(id => (
            <button key={id} onClick={() => setActiveTab(id)} style={{ padding: "12px 16px", borderRadius: 8, border: "none", textAlign: "left", fontSize: 14, background: activeTab === id ? `${G.gold}15` : "transparent", color: activeTab === id ? G.gold : G.soft, cursor: "pointer" }}>{id.toUpperCase()}</button>
          ))}
        </nav>
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 12, paddingTop: 20, borderTop: `1px solid ${G.goldDim}` }}>
           <button onClick={() => setAdminMode(true)} style={{ background: "transparent", border: "none", color: G.vsoft, fontSize: 10, cursor: "pointer", textAlign: "left" }}>ADMIN PORTAL</button>
           <button onClick={() => setAccessLocked(true)} style={{ background: "transparent", border: "none", color: "#FF525280", fontSize: 10, cursor: "pointer", textAlign: "left" }}>LOCK PORTAL</button>
        </div>
      </aside>
      <main style={{ padding: 48, maxWidth: 900 }}>
        {activeTab === 'foundation' && (
          <div>
            <h2 style={{ fontFamily: serif, fontSize: 32, marginBottom: 24 }}>Foundation</h2>
            <Card>
              <Input label="CORE STRATEGY" value={db.found.strategy} onChange={v => setDb({...db, found: {...db.found, strategy: v}})} multiline />
              <Input label="PSYCHOLOGICAL ANCHORS" value={db.found.anchors} onChange={v => setDb({...db, found: {...db.found, anchors: v}})} multiline />
            </Card>
          </div>
        )}
        {activeTab === 'premarket' && <PreMarket />}
        {activeTab === 'tradelog' && <TradeLog />}
        {activeTab === 'eod' && <EOD />}
        {activeTab === 'history' && <History />}
        <p style={{ color: G.soft, fontSize: 12, marginTop: 40 }}>- K Prasad</p>
      </main>
    </div>
  );
}
