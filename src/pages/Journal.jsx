import { useState, useEffect } from 'react';
import { api } from '../utils/api-client';
import { G, serif, sans } from '../utils/constants';

const DB_KEY = "mpv_journal_v3";
const SESSION_KEY = "mpv_session_jwt"; // JWT token
const ALLOWED_DOMAIN = "mindpowervaultt.com";

// ── Security Layer 1: Domain Lock ─────────────────────────────────────────────
function isDomainAllowed() {
  const host = window.location.hostname;
  return host === ALLOWED_DOMAIN || host === "localhost" || host === "127.0.0.1";
}

// ── Security Layer 2: Device Fingerprint ──────────────────────────────────────
function getDeviceFingerprint() {
  try {
    const nav = window.navigator;
    const parts = [
      nav.language, nav.platform, nav.hardwareConcurrency || 0,
      screen.width, screen.height, screen.colorDepth,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      nav.vendor || "", nav.maxTouchPoints || 0
    ];
    const str = parts.join("|");
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  } catch { return "unknown"; }
}

// ── Security Layer 3: Anti-DevTools + Anti-Clone ───────────────────────────────
function applyAntiClone() {
  document.addEventListener("contextmenu", e => e.preventDefault());
  document.addEventListener("keydown", e => {
    if (
      e.key === "F12" ||
      (e.ctrlKey && ["u","s","p"].includes(e.key.toLowerCase())) ||
      (e.ctrlKey && e.shiftKey && ["i","j","c"].includes(e.key.toLowerCase()))
    ) { e.preventDefault(); e.stopPropagation(); }
  });
  document.addEventListener("selectstart", e => e.preventDefault());
  const threshold = 160;
  setInterval(() => {
    if (window.outerWidth - window.innerWidth > threshold ||
        window.outerHeight - window.innerHeight > threshold) {
      document.body.innerHTML = `<div style="background:#05050A;color:#C9A84C;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;font-size:20px;text-align:center;">⚠️<br/>Unauthorized Access Detected.<br/>Session Terminated.</div>`;
    }
  }, 1000);
}

function loadDB() {
  try { const s = localStorage.getItem(DB_KEY); return s ? JSON.parse(s) : null; } catch { return null; }
}
function saveDB(db) {
  try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch {}
}

const EMPTY_DB = {
  f: {}, pm: [], tr: [], eod: [], psyday: [], weekly: [], monthly: [],
  rules: [], strategy: {}, h: { g: {}, s: 0, b: 0 }
};

export default function Journal({ lang, onBack }) {
  const [auth, setAuth] = useState(false);
  const [sessionChecking, setSessionChecking] = useState(true);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("foundation");
  const [db, setDb] = useState(() => loadDB() || { ...EMPTY_DB });
  const [blocked] = useState(!isDomainAllowed());

  // Anti-clone on mount
  useEffect(() => { applyAntiClone(); }, []);

  // JWT session verification on mount
  useEffect(() => {
    if (blocked) { setSessionChecking(false); return; }
    const token = localStorage.getItem(SESSION_KEY);
    if (!token) { setSessionChecking(false); return; }
    api.verifySession(token).then(res => {
      if (res.valid) { setAuth(true); }
      else { localStorage.removeItem(SESSION_KEY); } // expired
    }).catch(() => {
      localStorage.removeItem(SESSION_KEY);
    }).finally(() => setSessionChecking(false));
  }, [blocked]);

  if (blocked) return (
    <div style={{ minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", color: "#C9A84C" }}>
        <p style={{ fontSize: 40, marginBottom: 16 }}>⛔</p>
        <p style={{ fontSize: 18, marginBottom: 8 }}>Unauthorized Access</p>
        <p style={{ fontSize: 13, color: "#666" }}>This journal is only accessible at mindpowervaultt.com</p>
      </div>
    </div>
  );

  // Show loading while verifying existing session
  if (sessionChecking) return (
    <div style={{ minHeight: "100vh", background: G.black, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: G.gold, fontFamily: sans, letterSpacing: 3, fontSize: 13 }}>Verifying session...</p>
    </div>
  );

  const upd = (fn) => {
    setDb(prev => {
      const next = fn({ ...prev });
      saveDB(next);
      return next;
    });
  };

  const handleAccess = async () => {
    if (!code.trim()) { setErr("Access code enter చేయి"); return; }
    setLoading(true);
    try {
      const deviceId = getDeviceFingerprint();
      const res = await api.validateCode(code.trim().toUpperCase(), 'access');
      if (res.valid && res.token) {
        // Store JWT token (not the raw code)
        localStorage.setItem(SESSION_KEY, res.token);
        localStorage.setItem("mpv_device", deviceId);
        setAuth(true); setErr("");
      } else {
        const msg = res.error || "Invalid code. మీ mentor నుంచి valid code తీసుకో.";
        const left = res.attemptsLeft !== undefined ? ` (${res.attemptsLeft} attempts left)` : '';
        setErr(msg + left);
      }
    } catch { setErr("Connection error. Try again."); }
    setLoading(false);
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setAuth(false); setCode(""); setErr("");
  };

  if (!auth) return (
    <div style={{ minHeight: "100vh", background: G.black, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ maxWidth: 400, width: "100%", textAlign: "center" }}>
        <p style={{ fontFamily: serif, fontSize: 28, color: G.gold, letterSpacing: 3, marginBottom: 8 }}>MIND POWER VAULTT</p>
        <p style={{ fontSize: 12, color: G.soft, letterSpacing: 2, marginBottom: 48 }}>TRADING JOURNAL</p>
        <div style={{ background: "#0D0D16", border: `1px solid ${G.goldDim}`, borderRadius: 12, padding: 32 }}>
          <p style={{ color: G.mid, fontSize: 14, marginBottom: 24, lineHeight: 1.8 }}>
            ఈ Journal మీ Mentor నుండి access code తీసుకున్న students మాత్రమే use చేయగలరు.
          </p>
          <input
            value={code}
            onChange={e => { setCode(e.target.value.toUpperCase()); setErr(""); }}
            onKeyDown={e => e.key === 'Enter' && handleAccess()}
            placeholder="ACCESS CODE"
            style={{ width: "100%", background: "#181822", border: `1px solid ${err ? "rgba(200,80,80,0.5)" : G.goldDim}`, borderRadius: 8, padding: "16px", color: G.gold, fontSize: 20, textAlign: "center", letterSpacing: 6, marginBottom: 16, outline: "none", fontFamily: sans }}
          />
          {err && <p style={{ color: "rgba(200,80,80,0.8)", fontSize: 12, marginBottom: 16 }}>{err}</p>}
          <button
            onClick={handleAccess} disabled={loading}
            style={{ width: "100%", background: loading ? G.goldDim : `linear-gradient(135deg,${G.gold},#9A7020)`, color: G.black, border: "none", borderRadius: 6, padding: 16, fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", letterSpacing: 2 }}
          >{loading ? "Verifying..." : "ENTER JOURNAL →"}</button>
          <button onClick={onBack} style={{ background: "transparent", border: "none", color: G.soft, fontSize: 12, marginTop: 20, cursor: "pointer", textDecoration: "underline" }}>← Back to site</button>
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: "foundation", icon: "🏛", label: "Foundation" },
    { id: "premarket", icon: "🌅", label: "Pre-Market" },
    { id: "tradelog", icon: "📋", label: "Trade Log" },
    { id: "eod", icon: "🌙", label: "EOD Review" },
    { id: "psych", icon: "🧠", label: "Psychology" },
    { id: "weekly", icon: "📅", label: "Weekly" },
  ];

  const td = () => new Date().toISOString().split('T')[0];
  const Card = ({ children, style }) => (
    <div style={{ background: "#0D0D16", border: `1px solid ${G.goldDim}`, borderRadius: 10, padding: 20, marginBottom: 16, ...style }}>{children}</div>
  );
  const Label = ({ children }) => (
    <p style={{ fontSize: 10, color: G.gold, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6, fontFamily: sans }}>{children}</p>
  );
  const Input = ({ value, onChange, placeholder, multiline, type = "text" }) => {
    const s = { width: "100%", background: "#181822", border: `1px solid ${G.goldDim}`, borderRadius: 6, padding: "10px 12px", color: G.smoke, fontFamily: sans, fontSize: 14, outline: "none", marginBottom: 4 };
    return multiline
      ? <textarea value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} style={{ ...s, resize: "vertical" }} />
      : <input type={type} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={s} />;
  };
  const Btn = ({ onClick, children, danger }) => (
    <button onClick={onClick} style={{ padding: "10px 20px", borderRadius: 6, border: "none", background: danger ? "rgba(200,80,80,0.15)" : `linear-gradient(135deg,${G.gold},#9A7020)`, color: danger ? "#CF6679" : G.black, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: sans }}>{children}</button>
  );

  const FoundationTab = () => (
    <div>
      <p style={{ color: G.soft, fontSize: 12, marginBottom: 20, fontStyle: "italic" }}>ఒక్కసారి fill చేయి — ఇది నీ anchor.</p>
      <Card>
        <Label>నా Why — Trading ఎందుకు చేస్తున్నావు?</Label>
        <Input multiline value={db.f.why} onChange={v => upd(d => ({ ...d, f: { ...d.f, why: v } }))} placeholder="నా family కోసం..." />
        <Label>Trading Constitution — NEVER చేయని rules</Label>
        <Input multiline value={db.f.con} onChange={v => upd(d => ({ ...d, f: { ...d.f, con: v } }))} placeholder="1. Stoploss hit తర్వాత re-enter అవ్వను..." />
        <Label>1 సంవత్సరం Vision</Label>
        <Input multiline value={db.f.vis} onChange={v => upd(d => ({ ...d, f: { ...d.f, vis: v } }))} placeholder="1 సంవత్సరంలో నేను ఎక్కడ ఉండాలి..." />
      </Card>
      <Card>
        <p style={{ color: G.gold, fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Capital Framework</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[["cap","Total Capital (₹)"],["day","Max Daily Loss (₹)"],["maxt","Max Trades/Day"],["ota","Overtrading Alert After"]].map(([k, label]) => (
            <div key={k}><Label>{label}</Label><Input type="number" value={db.f[k]} onChange={v => upd(d => ({ ...d, f: { ...d.f, [k]: v } }))} placeholder="0" /></div>
          ))}
        </div>
      </Card>
      <div style={{ textAlign: "right" }}><Btn onClick={() => { saveDB(db); alert("Foundation saved ✦"); }}>Foundation Save చేయి ✦</Btn></div>
    </div>
  );

  const PreMarketTab = () => {
    const [form, setForm] = useState({ date: td(), bias: "bullish", levels: "", focus: "" });
    const today = db.pm.find(p => p.date === td());
    return (
      <div>
        {today && <div style={{ background: "rgba(76,175,130,0.08)", border: "1px solid rgba(76,175,130,0.3)", borderRadius: 8, padding: "12px 16px", marginBottom: 16 }}>
          <p style={{ color: "#4CAF82", fontSize: 13, fontWeight: 700 }}>✦ ఈరోజు ritual complete — Bias: {today.bias}</p>
        </div>}
        <Card>
          <Label>Market Bias</Label>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {["bullish","bearish","neutral","sideways"].map(b => (
              <button key={b} onClick={() => setForm(f => ({ ...f, bias: b }))} style={{ padding: "8px 16px", borderRadius: 6, border: `1px solid ${form.bias === b ? G.gold : G.goldDim}`, background: form.bias === b ? "rgba(201,168,76,0.12)" : "transparent", color: form.bias === b ? G.smoke : G.soft, cursor: "pointer", fontFamily: sans, fontSize: 12 }}>{b}</button>
            ))}
          </div>
          <Label>Key Levels</Label>
          <Input value={form.levels} onChange={v => setForm(f => ({ ...f, levels: v }))} placeholder="Support: 24200, Resistance: 24800" />
          <Label>ఈరోజు Focus</Label>
          <Input value={form.focus} onChange={v => setForm(f => ({ ...f, focus: v }))} placeholder="Stoploss discipline / Overtrading లేదు..." />
        </Card>
        <div style={{ textAlign: "right" }}>
          <Btn onClick={() => { upd(d => ({ ...d, pm: [...d.pm.filter(p => p.date !== form.date), { ...form, id: Date.now() }] })); alert("Pre-Market Ritual complete ✦"); }}>Ritual Complete ✦</Btn>
        </div>
      </div>
    );
  };

  const TradeLogTab = () => {
    const [form, setForm] = useState({ date: td(), inst: "", pnl: "", planned: true, note: "" });
    const [showForm, setShowForm] = useState(false);
    const totalPnL = db.tr.reduce((a, t) => a + Number(t.pnl || 0), 0);
    const wins = db.tr.filter(t => Number(t.pnl) > 0).length;
    const wr = db.tr.length ? Math.round(wins / db.tr.length * 100) : 0;
    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[["Total P&L",(totalPnL>=0?"+":"")+"₹"+Math.abs(totalPnL).toLocaleString('en-IN'),totalPnL>=0?"#4CAF82":"#CF6679"],["Win Rate",wr+"%","#C9A84C"],["Trades",db.tr.length,G.smoke]].map(([l,v,c]) => (
            <div key={l} style={{ background:"#0D0D16",border:`1px solid ${G.goldDim}`,borderRadius:8,padding:14,textAlign:"center" }}>
              <p style={{ fontSize:20,fontWeight:900,color:c }}>{v}</p>
              <p style={{ fontSize:9,color:G.soft,letterSpacing:1,textTransform:"uppercase" }}>{l}</p>
            </div>
          ))}
        </div>
        <div style={{ textAlign:"right",marginBottom:12 }}>
          <button onClick={() => setShowForm(s => !s)} style={{ padding:"8px 16px",background:"transparent",border:`1px solid ${G.goldDim}`,color:G.gold,borderRadius:6,cursor:"pointer",fontSize:12,fontFamily:sans }}>+ Trade Add చేయి</button>
        </div>
        {showForm && (
          <Card>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10 }}>
              <div><Label>Instrument</Label><Input value={form.inst} onChange={v => setForm(f => ({ ...f, inst:v }))} placeholder="NIFTY" /></div>
              <div><Label>P&L (₹)</Label><Input type="number" value={form.pnl} onChange={v => setForm(f => ({ ...f, pnl:v }))} placeholder="3750" /></div>
            </div>
            <div style={{ display:"flex",gap:8,marginBottom:12 }}>
              {["Planned","Impulse"].map((t,i) => (
                <button key={t} onClick={() => setForm(f => ({ ...f, planned:i===0 }))} style={{ flex:1,padding:"8px",border:`1px solid ${(i===0)===form.planned?G.gold:G.goldDim}`,background:(i===0)===form.planned?"rgba(201,168,76,0.1)":"transparent",color:(i===0)===form.planned?G.smoke:G.soft,borderRadius:6,cursor:"pointer",fontFamily:sans,fontSize:12 }}>{t}</button>
              ))}
            </div>
            <Label>Note</Label>
            <Input multiline value={form.note} onChange={v => setForm(f => ({ ...f, note:v }))} placeholder="Why did you take this trade?" />
            <div style={{ textAlign:"right" }}>
              <Btn onClick={() => { if(!form.inst){alert("Instrument enter చేయి!");return;} upd(d=>({...d,tr:[...d.tr,{...form,id:Date.now()}]})); setForm({date:td(),inst:"",pnl:"",planned:true,note:""}); setShowForm(false); }}>Trade Log చేయి ✦</Btn>
            </div>
          </Card>
        )}
        {db.tr.length===0 && <p style={{ textAlign:"center",color:G.soft,padding:40 }}>ఇంకా trades లేవు.</p>}
        {[...db.tr].reverse().map(t => (
          <div key={t.id} style={{ background:"#0D0D16",border:`1px solid ${Number(t.pnl)>=0?"rgba(76,175,130,0.3)":"rgba(200,80,80,0.3)"}`,borderRadius:8,padding:14,marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <div>
              <p style={{ color:G.smoke,fontWeight:700,marginBottom:4 }}>{t.inst} · <span style={{ color:t.planned?"#4CAF82":"#E0A84C",fontSize:12 }}>{t.planned?"Planned":"Impulse"}</span></p>
              <p style={{ color:G.soft,fontSize:12 }}>{t.date} · {t.note}</p>
            </div>
            <div style={{ textAlign:"right" }}>
              <p style={{ fontSize:20,fontWeight:900,color:Number(t.pnl)>=0?"#4CAF82":"#CF6679" }}>{Number(t.pnl)>=0?"+":""}₹{Math.abs(Number(t.pnl)).toLocaleString('en-IN')}</p>
              <button onClick={() => upd(d=>({...d,tr:d.tr.filter(x=>x.id!==t.id)}))} style={{ background:"none",border:"none",color:G.soft,fontSize:11,cursor:"pointer" }}>remove</button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const EODTab = () => {
    const [form, setForm] = useState({ date: td(), best:"", worst:"", improve:"", mood:"green", proc:7 });
    return (
      <div>
        <Card>
          <Label>Best Decision Today</Label>
          <Input value={form.best} onChange={v => setForm(f=>({...f,best:v}))} placeholder="Stop loss respect చేశాను..." />
          <Label>Worst Decision Today</Label>
          <Input value={form.worst} onChange={v => setForm(f=>({...f,worst:v}))} placeholder="FOMO లో entry తీసుకున్నాను..." />
          <Label>రేపు Improve చేయేది</Label>
          <Input value={form.improve} onChange={v => setForm(f=>({...f,improve:v}))} placeholder="..." />
          <Label>Process Score: {form.proc}/10</Label>
          <input type="range" min={1} max={10} value={form.proc} onChange={e=>setForm(f=>({...f,proc:Number(e.target.value)}))} style={{ width:"100%",marginBottom:12 }} />
          <Label>Mood Seal</Label>
          <div style={{ display:"flex",gap:8 }}>
            {[["green","🟢 Calm"],["yellow","🟡 Mixed"],["red","🔴 Emotional"]].map(([v,l]) => (
              <button key={v} onClick={() => setForm(f=>({...f,mood:v}))} style={{ flex:1,padding:"10px 4px",border:`1px solid ${form.mood===v?G.gold:G.goldDim}`,background:form.mood===v?"rgba(201,168,76,0.1)":"transparent",color:G.smoke,borderRadius:6,cursor:"pointer",fontFamily:sans,fontSize:12 }}>{l}</button>
            ))}
          </div>
        </Card>
        <div style={{ textAlign:"right" }}><Btn onClick={() => { upd(d=>({...d,eod:[...d.eod,{...form,id:Date.now()}]})); alert("EOD Review saved ✦"); }}>EOD Save చేయి ✦</Btn></div>
      </div>
    );
  };

  const PsychTab = () => {
    const imp = db.tr.filter(t => !t.planned);
    const pct = db.tr.length ? Math.round((db.tr.length-imp.length)/db.tr.length*100) : 0;
    const identity = pct>=85?"Professional 🏆":pct>=70?"Consistent 🎯":pct>=50?"Aware 👁":"Emotional 😤";
    const iColor = pct>=85?"#4CAF82":pct>=70?"#5B8FD4":pct>=50?"#E0A84C":"#CF6679";
    return (
      <div>
        <Card style={{ textAlign:"center" }}>
          <p style={{ fontSize:11,color:G.gold,letterSpacing:2,textTransform:"uppercase",marginBottom:8 }}>Trader Identity</p>
          <p style={{ fontSize:32,fontWeight:900,color:iColor,marginBottom:4 }}>{identity}</p>
          <p style={{ fontSize:13,color:G.soft }}>{pct}% planned trades</p>
        </Card>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16 }}>
          {[["Impulse Trades",imp.length,"#CF6679"],["Discipline %",pct+"%","#C9A84C"],["Total Trades",db.tr.length,G.smoke]].map(([l,v,c]) => (
            <div key={l} style={{ background:"#0D0D16",border:`1px solid ${G.goldDim}`,borderRadius:8,padding:14,textAlign:"center" }}>
              <p style={{ fontSize:22,fontWeight:900,color:c }}>{v}</p>
              <p style={{ fontSize:9,color:G.soft,letterSpacing:1,textTransform:"uppercase" }}>{l}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const WeeklyTab = () => {
    const now = new Date();
    const start = new Date(now); start.setDate(now.getDate()-((now.getDay()+6)%7)); start.setHours(0,0,0,0);
    const wTr = db.tr.filter(t => new Date(t.date)>=start);
    const wPnL = wTr.reduce((a,t)=>a+Number(t.pnl||0),0);
    return (
      <div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16 }}>
          {[["Week P&L",(wPnL>=0?"+":"")+"₹"+Math.abs(wPnL).toLocaleString('en-IN'),wPnL>=0?"#4CAF82":"#CF6679"],["This Week Trades",wTr.length,"#C9A84C"]].map(([l,v,c]) => (
            <div key={l} style={{ background:"#0D0D16",border:`1px solid ${G.goldDim}`,borderRadius:8,padding:14,textAlign:"center" }}>
              <p style={{ fontSize:24,fontWeight:900,color:c }}>{v}</p>
              <p style={{ fontSize:10,color:G.soft,textTransform:"uppercase" }}>{l}</p>
            </div>
          ))}
        </div>
        <Card>
          <p style={{ color:G.gold,fontWeight:700,marginBottom:14 }}>Weekly Reflection</p>
          <Label>ఈ వారం biggest mistake?</Label>
          <Input multiline placeholder="నీ reflection..." onChange={()=>{}} value="" />
          <Label>ఈ వారం biggest WIN?</Label>
          <Input multiline placeholder="నీ reflection..." onChange={()=>{}} value="" />
          <div style={{ textAlign:"right",marginTop:8 }}><Btn onClick={()=>alert("Weekly saved ✦")}>Weekly Save ✦</Btn></div>
        </Card>
      </div>
    );
  };

  const tabContent = { foundation:<FoundationTab/>, premarket:<PreMarketTab/>, tradelog:<TradeLogTab/>, eod:<EODTab/>, psych:<PsychTab/>, weekly:<WeeklyTab/> };

  return (
    <div style={{ minHeight:"100vh", background:G.black, color:G.smoke, fontFamily:sans }}>
      <div style={{ background:"#0C0C11", borderBottom:`1px solid ${G.goldDim}`, padding:"12px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <p style={{ fontFamily:serif, color:G.gold, fontSize:16, letterSpacing:3, fontWeight:700 }}>MIND POWER VAULTT</p>
          <p style={{ fontSize:9, color:G.soft, letterSpacing:2 }}>TRADING JOURNAL</p>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onBack} style={{ background:"transparent", border:`1px solid ${G.goldDim}`, color:G.soft, padding:"6px 12px", borderRadius:4, cursor:"pointer", fontSize:11, fontFamily:sans }}>← Back</button>
          <button onClick={logout} style={{ background:"transparent", border:"1px solid rgba(200,80,80,0.3)", color:"#CF6679", padding:"6px 12px", borderRadius:4, cursor:"pointer", fontSize:11, fontFamily:sans }}>Logout</button>
        </div>
      </div>
      <div style={{ display:"flex", overflowX:"auto", borderBottom:`1px solid ${G.goldDim}`, background:"#0A0A10" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding:"12px 18px", background:"none", border:"none", borderBottom:`2px solid ${tab===t.id?G.gold:"transparent"}`, color:tab===t.id?G.gold:G.soft, cursor:"pointer", whiteSpace:"nowrap", fontSize:12, fontFamily:sans, display:"flex", alignItems:"center", gap:6 }}>
            <span>{t.icon}</span><span>{t.label}</span>
          </button>
        ))}
      </div>
      <div style={{ maxWidth:700, margin:"0 auto", padding:"28px 16px" }}>
        <h2 style={{ fontFamily:serif, color:G.smoke, fontSize:22, marginBottom:20 }}>
          {tabs.find(t=>t.id===tab)?.icon} {tabs.find(t=>t.id===tab)?.label}
        </h2>
        {tabContent[tab]}
      </div>
    </div>
  );
}
