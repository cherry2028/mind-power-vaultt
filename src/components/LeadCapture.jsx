import React, { useState, useRef } from 'react';
import { G, sans } from '../utils/constants';
import { api } from '../utils/api-client';

export default function LeadCapture({ lang, LL, aiProfile, formLevel, setFormLevel, goTo }) {
  const nameRef = useRef(null);
  const waRef = useRef(null);
  const [errs, setErrs] = useState({});
  const [sending, setSending] = useState(false);
  
  const lc = lang === "te" ? "tel" : "eng";
  const sec = { padding: "108px 0 72px" };
  const gBtn = { padding: "15px 36px", background: `linear-gradient(135deg,${G.gold},#9A7020)`, color: G.black, border: "none", borderRadius: 2, fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", fontFamily: sans };

  const valid = () => {
    const n = nameRef.current?.value || "";
    const w = waRef.current?.value || "";
    const e = {};
    if (!n.trim()) e.name = LL.eN;
    if (w.replace(/\D/g, "").length < 10) e.wa = LL.eW;
    if (!formLevel) e.level = LL.eL;
    return e;
  };

  const submit = async () => {
    const e = valid(); 
    if (Object.keys(e).length) { setErrs(e); return; } 
    setSending(true);

    const name = nameRef.current?.value || "";
    const wa = waRef.current?.value || "";

    try {
      // 1. Save Lead via API (Secure)
      await api.saveLead({
        name,
        phone: wa,
        experience: formLevel,
        profile: aiProfile
      });

      // 2. Open WhatsApp for personal connection (UX)
      const userMsg = encodeURIComponent(`నమస్కారం K Prasad గారు,\n\nనేను MPV website లో నా trading psychology test complete చేశాను.\n\n👤 పేరు: ${name}\n📊 Experience: ${formLevel}\n\nనా analysis చూశాను — మీతో మాట్లాడాలనుకుంటున్నాను.`);
      window.open(`https://wa.me/919059181616?text=${userMsg}`, "_blank");

      setSending(false);
      goTo(7);
    } catch (error) {
      alert("Submission failed. Please try again.");
      setSending(false);
    }
  };

  const is = (f) => ({ width: "100%", padding: "14px 18px", background: "rgba(201,168,76,0.04)", border: `1px solid ${errs[f] ? "rgba(200,80,80,0.5)" : G.goldDim}`, borderRadius: 6, color: G.smoke, fontSize: 15, fontFamily: sans });

  return (
    <div style={sec}>
      <div style={{ textAlign: "center", marginBottom: 52 }}>
        <p style={{ fontSize: 11, letterSpacing: 5, color: `${G.gold}90`, textTransform: "uppercase", marginBottom: 14, fontFamily: sans }}>{LL.tag}</p>
        <div style={{ width: 1, height: 40, background: `linear-gradient(to bottom,transparent,${G.gold})`, margin: "0 auto 28px" }} />
        <h2 className={lc} style={{ fontSize: "clamp(24px,3.5vw,44px)", color: G.smoke, marginBottom: 16, lineHeight: 1.4 }}>"{LL.th}<br /><span style={{ color: G.gold }}>{LL.tg}"</span></h2>
        <p className={lc} style={{ color: G.mid, fontSize: 14, lineHeight: 1.9 }}>{LL.sub}</p>
      </div>
      <div style={{ maxWidth: 520, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
        <div>
          <label style={{ fontSize: 10, letterSpacing: 3, color: `${G.gold}80`, textTransform: "uppercase", display: "block", marginBottom: 8, fontFamily: sans }}>{LL.nl}</label>
          <input ref={nameRef} type="text" defaultValue="" placeholder={LL.np} onChange={() => setErrs(r => ({ ...r, name: "" }))} style={is("name")} autoComplete="name" />
          {errs.name && <p style={{ color: "rgba(200,80,80,0.8)", fontSize: 12, marginTop: 6, fontFamily: sans }}>{errs.name}</p>}
        </div>
        <div>
          <label style={{ fontSize: 10, letterSpacing: 3, color: `${G.gold}80`, textTransform: "uppercase", display: "block", marginBottom: 8, fontFamily: sans }}>{LL.wl}</label>
          <input ref={waRef} type="tel" defaultValue="" placeholder={LL.wp} onChange={() => setErrs(r => ({ ...r, wa: "" }))} style={is("wa")} inputMode="numeric" autoComplete="tel" />
          {errs.wa && <p style={{ color: "rgba(200,80,80,0.8)", fontSize: 12, marginTop: 6, fontFamily: sans }}>{errs.wa}</p>}
        </div>
        <div>
          <label style={{ fontSize: 10, letterSpacing: 3, color: `${G.gold}80`, textTransform: "uppercase", display: "block", marginBottom: 8, fontFamily: sans }}>{LL.el}</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {LL.lvls.map(l => (
              <button key={l.v} onClick={() => { setFormLevel(l.v); setErrs(r => ({ ...r, level: "" })); }}
                style={{ padding: "14px 18px", textAlign: "left", cursor: "pointer", background: formLevel === l.v ? "rgba(201,168,76,0.12)" : "rgba(201,168,76,0.03)", border: `1px solid ${formLevel === l.v ? G.gold : G.goldDim}`, borderRadius: 6, color: formLevel === l.v ? G.smoke : G.mid, fontSize: 14, fontFamily: sans, transition: "all 0.2s", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", flexShrink: 0, border: `2px solid ${formLevel === l.v ? G.gold : G.goldDim}`, background: formLevel === l.v ? G.gold : "transparent", transition: "all 0.2s" }} />
                <span className={lc}>{l.l}</span>
              </button>
            ))}
          </div>
          {errs.level && <p style={{ color: "rgba(200,80,80,0.8)", fontSize: 12, marginTop: 6, fontFamily: sans }}>{errs.level}</p>}
        </div>
        <div style={{ marginTop: 8 }}>
          <button className="bg" onClick={submit} style={{ ...gBtn, width: "100%", padding: "18px", fontSize: 13, borderRadius: 4, opacity: sending ? 0.5 : 1, cursor: sending ? "not-allowed" : "pointer" }}>{sending ? LL.send : LL.sub2}</button>
          <p style={{ textAlign: "center", marginTop: 12, fontSize: 11, color: G.vsoft, letterSpacing: 1, fontFamily: sans }}>{LL.priv}</p>
        </div>
      </div>
    </div>
  );
}
