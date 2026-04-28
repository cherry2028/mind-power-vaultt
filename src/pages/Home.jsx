import React, { useState, useEffect, useRef } from 'react';
import { G, serif, sans, SCENARIOS, PHASES_TEXT, buildProfile } from '../utils/constants';
import { api } from '../utils/api-client';
import LeadCapture from '../components/LeadCapture';

const GL = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 auto", width: 130 }}>
    <div style={{ flex: 1, height: 1, background: `linear-gradient(to right,transparent,${G.gold})` }} />
    <div style={{ width: 5, height: 5, background: G.gold, transform: "rotate(45deg)", flexShrink: 0 }} />
    <div style={{ flex: 1, height: 1, background: `linear-gradient(to left,transparent,${G.gold})` }} />
  </div>
);

const Tg = ({ c, ch }) => (
  <p style={{ fontSize: 11, letterSpacing: 5, color: c === "s" ? `${G.smoke}60` : `${G.gold}90`, textTransform: "uppercase", marginBottom: 14, fontFamily: sans }}>{ch}</p>
);

export default function Home({ lang, phase, setPhase, goTo, goBack, aiLoading, setAiLoading, aiProfile, setAiProfile, LOGO_B64, dynamicReviews }) {
  const [scIdx, setScIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [rs, setRs] = useState(0);
  const [heroIn, setHeroIn] = useState(false);
  const [refText, setRefText] = useState(null);
  const [showEsc, setShowEsc] = useState(false);
  const [escPend, setEscPend] = useState(null);
  const [formLevel, setFormLevel] = useState("");

  const lc = lang === "te" ? "tel" : "eng";
  const sec = { padding: "108px 0 72px" };
  const gBtn = { padding: "15px 36px", background: `linear-gradient(135deg,${G.gold},#9A7020)`, color: G.black, border: "none", borderRadius: 2, fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", fontFamily: sans };
  const oBtn = { padding: "15px 36px", background: "transparent", color: G.gold, border: `1px solid ${G.gold}48`, borderRadius: 2, fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", fontFamily: sans };

  const L = {
    rit: PHASES_TEXT[lang].rit,
    hro: PHASES_TEXT[lang].hro,
    mir: PHASES_TEXT[lang].mir,
    int: PHASES_TEXT[lang].int,
    res: PHASES_TEXT[lang].res,
    led: PHASES_TEXT[lang].led,
    cnv: PHASES_TEXT[lang].cnv
  };

  useEffect(() => { 
    if (phase !== 0) return; 
    if (rs === 0) { setTimeout(() => setRs(1), 1000); return; } 
    if (rs === 1) { setTimeout(() => setRs(2), 2600); return; } 
    if (rs === 2) { setTimeout(() => setRs(3), 2600); return; } 
  }, [phase, rs]);

  useEffect(() => { if (phase === 1) setTimeout(() => setHeroIn(true), 150); }, [phase]);

  const handleChoice = (ci) => {
    const sc = SCENARIOS[scIdx];
    const scL = sc?.[lang];
    if (sc.escalation && escPend === null) { setEscPend(ci); setAnswers(a => [...a, ci]); setShowEsc(true); return; }
    setAnswers(a => [...a, ci]); setRefText(scL.ch[ci].r);
  };

  const handleEsc = () => { 
    const sc = SCENARIOS[scIdx];
    const scL = sc?.[lang];
    setShowEsc(false); setRefText(scL.ch[escPend].r); 
  };

  const fetchAIProfile = async (finalAnswers, currentLang) => {
    setAiLoading(true);
    setAiProfile(null);
    goTo(5);

    const choiceDescriptions = finalAnswers.map((ci, i) => {
      const s = SCENARIOS[i];
      const chosen = s[currentLang].ch[ci].l;
      const sit = s[currentLang].sit.replace(/\n/g, " ");
      return `Situation ${i + 1}: "${sit}" → User chose: "${chosen}"`;
    }).join("\n");

    try {
      const parsed = await api.analyze(choiceDescriptions, currentLang);
      setAiProfile(parsed);
    } catch (e) {
      const sp = buildProfile(finalAnswers, currentLang);
      setAiProfile({
        primaryPattern: sp.primaryLine,
        coreInsight: sp.coreInsight,
        behaviorLines: sp.behaviorLines,
        hiddenStrength: sp.strengthLine,
        warningLine: sp.warningLine,
        actionStep: "",
      });
    }
    setAiLoading(false);
  };

  const handleNext = () => {
    setRefText(null); setShowEsc(false); setEscPend(null);
    if (scIdx < SCENARIOS.length - 1) {
      setScIdx(s => s + 1);
    } else {
      fetchAIProfile([...answers], lang);
    }
  };

  const Ritual = () => (
    <div style={{ minHeight: "100vh", background: G.black, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 24px" }}>
      <div style={{ maxWidth: 560 }}>
        {rs >= 1 && <p className={`rit ${lc}`} style={{ fontSize: "clamp(16px,2.4vw,22px)", color: G.soft, fontStyle: "italic", lineHeight: 2.1, marginBottom: 32 }}>{L.rit.l1}</p>}
        {rs >= 2 && <p className={`pin ${lc}`} style={{ fontSize: "clamp(18px,2.8vw,26px)", color: G.smoke, lineHeight: 1.95, marginBottom: 32 }}>{L.rit.l2}</p>}
        {rs >= 3 && <>
          <p className={`pin ${lc}`} style={{ fontSize: "clamp(18px,2.8vw,26px)", color: G.gold, fontWeight: 600, lineHeight: 1.9, marginBottom: 52, whiteSpace: "pre-line" }}>{L.rit.l3}</p>
          <div className="pin" style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
            <button className="bg" onClick={() => goTo(1)} style={{ ...gBtn, width: "100%", maxWidth: 420 }}>{L.rit.yes}</button>
            <button className="bo" onClick={() => { }} style={{ ...oBtn, width: "100%", maxWidth: 420, fontSize: 11 }}>{L.rit.no}</button>
          </div>
        </>}
      </div>
    </div>
  );

  const Hero = () => (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", position: "relative", overflow: "hidden", background: "radial-gradient(ellipse at 30% 20%, rgba(201,168,76,0.07) 0%, transparent 50%), radial-gradient(ellipse at 75% 80%, rgba(150,100,20,0.05) 0%, transparent 50%), #04040C" }}>
      <div className="mesh" style={{ position: "absolute", inset: -20, backgroundImage: `linear-gradient(rgba(201,168,76,0.07) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,0.07) 1px,transparent 1px)`, backgroundSize: "64px 64px" }} />
      <div style={{ position: "absolute", top: "15%", left: "8%", width: 420, height: 420, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.13) 0%, transparent 65%)", filter: "blur(40px)", animation: "orb1 14s ease-in-out infinite" }} />
      <div style={{ position: "absolute", bottom: "10%", right: "6%", width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.1) 0%, transparent 65%)", filter: "blur(50px)", animation: "orb2 18s ease-in-out infinite" }} />
      <div style={{ position: "absolute", top: "55%", left: "55%", width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 65%)", filter: "blur(30px)", animation: "orb3 10s ease-in-out infinite" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 40%, rgba(5,5,10,0.7) 100%)" }} />
      <div style={{ position: "relative", zIndex: 1, padding: "0 24px", maxWidth: 800, margin: "0 auto" }}>
        <div style={{ opacity: heroIn ? 1 : 0, transform: heroIn ? "none" : "translateY(18px)", transition: "all 0.9s cubic-bezier(.4,0,.2,1) 0.05s" }}>
          <p style={{ fontSize: 10, letterSpacing: 7, color: `${G.gold}80`, textTransform: "uppercase", marginBottom: 18, fontFamily: sans, display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <span style={{ width: 32, height: 1, background: `linear-gradient(to right, transparent, ${G.gold}60)` }} />
            Mind Power Vaultt
            <span style={{ width: 32, height: 1, background: `linear-gradient(to left, transparent, ${G.gold}60)` }} />
          </p>
          <div style={{ position: "relative", display: "inline-block", marginBottom: 20 }}>
            <div style={{ position: "absolute", inset: -8, borderRadius: "50%", background: `radial-gradient(circle, rgba(201,168,76,0.25) 0%, transparent 70%)`, filter: "blur(12px)", animation: "breathe 4s ease-in-out infinite" }} />
            <img src={LOGO_B64} alt="Mind Power Vaultt" style={{ width: 96, height: 96, objectFit: "contain", position: "relative", zIndex: 1, filter: "drop-shadow(0 0 20px rgba(201,168,76,0.4))" }} onError={e => e.target.style.display = "none"} />
          </div>
        </div>
        <div style={{ opacity: heroIn ? 1 : 0, transform: heroIn ? "none" : "translateY(22px)", transition: "all 1s cubic-bezier(.4,0,.2,1) 0.4s" }}>
          <h1 className={lc} style={{ fontSize: lang==="te" ? "clamp(16px,2.4vw,28px)" : "clamp(20px,3.2vw,42px)", fontWeight: 600, fontStyle: "italic", color: G.soft, lineHeight: 1.55, marginBottom: 14 }}>{L.hro.l1}</h1>
        </div>
        <div style={{ opacity: heroIn ? 1 : 0, transform: heroIn ? "none" : "translateY(22px)", transition: "all 1s cubic-bezier(.4,0,.2,1) 0.75s" }}>
          <h2 className={`neon ${lc}`} style={{ fontSize: lang==="te" ? "clamp(22px,3.8vw,48px)" : "clamp(30px,5vw,68px)", fontWeight: 700, color: G.gold, lineHeight: 1.25, marginBottom: 32, whiteSpace: "pre-line" }}>{L.hro.l2}</h2>
        </div>
        <div style={{ opacity: heroIn ? 1 : 0, transform: heroIn ? "none" : "translateY(14px)", transition: "all 0.9s cubic-bezier(.4,0,.2,1) 1.1s" }}>
          <p className={lc} style={{ fontSize: "clamp(14px,1.9vw,19px)", fontStyle: "italic", color: G.mid, lineHeight: 2, maxWidth: 560, margin: "0 auto 48px", whiteSpace: "pre-line", opacity: 0.85 }}>{L.hro.sub}</p>
        </div>
        <div style={{ opacity: heroIn ? 1 : 0, transition: "all 0.9s ease 1.45s" }}>
          <GL />
          <div style={{ marginTop: 52 }}>
            <button className="bg" onClick={() => goTo(2)} style={{ ...gBtn, letterSpacing: 3, padding: "18px 48px", fontSize: 13, borderRadius: 4, boxShadow: "0 4px 24px rgba(201,168,76,0.3)" }}>{L.hro.cta}</button>
          </div>
          <p style={{ marginTop: 18, fontSize: 10, color: `${G.gold}45`, letterSpacing: 2, fontFamily: sans }}>4 situations · 2 min · Free</p>
        </div>
      </div>
    </div>
  );

  const Mirror = () => (
    <div style={sec}>
      <div style={{ textAlign: "center", marginBottom: 60 }}>
        <Tg>The Mirror</Tg>
        <h2 className={lc} style={{ fontSize: "clamp(28px,4vw,52px)", color: G.smoke, marginBottom: 18 }}>{L.mir.title}</h2>
        <p className={lc} style={{ color: G.mid, fontSize: 16, letterSpacing: 0.5, lineHeight: 1.9, fontStyle: "italic" }}>{L.mir.sub}</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(270px,1fr))", gap: 14, marginBottom: 44 }}>
        {L.mir.cards.map((c, i) => (
          <div key={i} style={{ background: `${G.gold}04`, border: `1px solid ${G.goldDim}`, borderRadius: 7, padding: "22px 18px", display: "flex", gap: 14, alignItems: "flex-start" }}>
            <span style={{ fontSize: 24, flexShrink: 0 }}>{c.i}</span>
            <p className={lc} style={{ color: G.mid, fontSize: 14, lineHeight: 1.9 }}>{c.t}</p>
          </div>
        ))}
      </div>
      <div style={{ textAlign: "center", padding: "28px 24px", border: `1px solid ${G.goldDim}`, borderRadius: 7, background: `${G.gold}04`, marginBottom: 52 }}>
        <p className={lc} style={{ fontSize: "clamp(17px,2.2vw,24px)", fontStyle: "italic", color: G.gold, lineHeight: 1.9, whiteSpace: "pre-line" }}>{L.mir.close}</p>
      </div>
      <div style={{ textAlign: "center" }}>
        <p className={lc} style={{ fontSize: 14, color: G.mid, marginBottom: 28 }}>{L.mir.prompt}</p>
        <button className="bg" onClick={() => goTo(3)} style={gBtn}>{L.mir.cta}</button>
      </div>
    </div>
  );

  const Intro = () => (
    <div style={{ ...sec, textAlign: "center" }}>
      <Tg>Self-Discovery Engine</Tg>
      <div className="lg" style={{ width: 1, background: `linear-gradient(to bottom,transparent,${G.gold})`, margin: "0 auto 32px" }} />
      <h2 className={lc} style={{ fontSize: "clamp(24px,4vw,48px)", color: G.smoke, marginBottom: 20, lineHeight: 1.3 }}>
        {L.int.t1}<br /><span style={{ color: G.gold, fontStyle: "italic" }}>{L.int.t2}</span>
      </h2>
      <p className={lc} style={{ color: G.mid, fontSize: 16, lineHeight: 2, maxWidth: 480, margin: "0 auto 14px" }}>{L.int.p1}</p>
      <p className={lc} style={{ color: G.soft, fontSize: 14, lineHeight: 2, maxWidth: 480, margin: "0 auto 48px", whiteSpace: "pre-line" }}>{L.int.p2}</p>
      <GL />
      <div style={{ marginTop: 44, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        {L.int.tags.map((s, i) => <span key={i} style={{ padding: "7px 16px", border: `1px solid ${G.goldDim}`, borderRadius: 2, fontSize: 9, letterSpacing: 2, color: G.mid, textTransform: "uppercase", fontFamily: sans }}>{s}</span>)}
      </div>
      <div style={{ marginTop: 52 }}>
        <button className="bg" onClick={() => { setScIdx(0); setAnswers([]); setRefText(null); setShowEsc(false); setEscPend(null); goTo(4); }} style={gBtn}>{L.int.cta}</button>
      </div>
    </div>
  );

  const Scenario = () => {
    const sc = SCENARIOS[scIdx];
    const scL = sc?.[lang];
    const prg = (scIdx / SCENARIOS.length) * 100;
    return (
      <div style={sec}>
        <div style={{ marginBottom: 44 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 9 }}>
            <span style={{ fontSize: 10, letterSpacing: 3, color: `${G.gold}65`, textTransform: "uppercase", fontFamily: sans }}>Situation {scIdx + 1} / {SCENARIOS.length}</span>
            <span style={{ fontSize: 10, color: G.soft, fontFamily: sans }}>{Math.round(prg)}%</span>
          </div>
          <div style={{ height: 1, background: G.goldDim }}><div style={{ height: "100%", width: `${prg}%`, background: `linear-gradient(to right,${G.gold}70,${G.gold})`, transition: "width 0.5s ease" }} /></div>
        </div>
        {showEsc && (
          <div className="pin" style={{ padding: "40px 28px", background: G.dark2, border: `1px solid ${G.gold}35`, borderRadius: 8, textAlign: "center" }}>
            <div style={{ width: 1, height: 40, background: `linear-gradient(to bottom,transparent,${G.gold})`, margin: "0 auto 28px" }} />
            <p className={lc} style={{ fontSize: "clamp(18px,2.5vw,26px)", color: G.smoke, lineHeight: 2.1, whiteSpace: "pre-line", marginBottom: 20 }}>{sc.escLine[lang]}</p>
            <p className={lc} style={{ fontSize: 14, color: `${G.gold}85`, fontStyle: "italic", marginBottom: 36 }}>{sc.escNote[lang]}</p>
            <button className="bg" onClick={handleEsc} style={gBtn}>{sc.escBtn[lang]}</button>
          </div>
        )}
        {!showEsc && !refText && <>
          <div style={{ marginBottom: 36, padding: "28px 26px", background: G.dark2, border: `1px solid ${G.goldDim}`, borderRadius: 8 }}>
            <Tg>{lang === "te" ? "Situation" : "Situation"}</Tg>
            <p className={lc} style={{ fontSize: "clamp(17px,2.3vw,24px)", color: G.smoke, lineHeight: 1.95 }}>{scL.sit}</p>
          </div>
          <p className={lc} style={{ fontSize: 14, letterSpacing: 1, color: G.mid, textAlign: "center", marginBottom: 22 }}>{scL.q}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {scL.ch.map((c, i) => (
              <button key={i} className="bc" onClick={() => handleChoice(i)}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", border: `1px solid ${G.goldDim}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 10, color: `${G.gold}80`, fontWeight: 600, fontFamily: sans }}>{String.fromCharCode(65 + i)}</span>
                </div>
                <span className={lc} style={{ color: G.mid, fontSize: 15, lineHeight: 1.8 }}>{c.l}</span>
              </button>
            ))}
          </div>
        </>}
        {refText && !showEsc && (
          <div className="pin">
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <Tg>Mirror</Tg>
              <div style={{ width: 1, height: 40, background: `linear-gradient(to bottom,transparent,${G.gold})`, margin: "0 auto" }} />
            </div>
            <div style={{ padding: "32px 28px", background: G.dark2, border: `1px solid ${G.gold}25`, borderRadius: 8, marginBottom: 20 }}>
              <p className={lc} style={{ fontSize: "clamp(16px,2.3vw,22px)", color: G.smoke, lineHeight: 2.05, fontStyle: "italic" }}>"{refText}"</p>
            </div>
            <div style={{ textAlign: "center" }}>
              <button className="bg" onClick={handleNext} style={gBtn}>
                {scIdx < SCENARIOS.length - 1 ? "Continue →" : "See My Analysis →"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const Result = () => {
    if (aiLoading || !aiProfile) return <p style={{ color: G.gold, textAlign: "center", padding: 100 }}>Analyzing...</p>;
    const { primaryPattern, coreInsight, behaviorLines = [], hiddenStrength, warningLine, actionStep } = aiProfile;
    return (
      <div style={{ ...sec, textAlign: "center" }}>
        <Tg>{L.res.tag}</Tg>
        <div style={{ width: 1, height: 52, background: `linear-gradient(to bottom,transparent,${G.gold})`, margin: "0 auto 32px" }} />
        <div style={{ padding: "32px 28px", background: G.dark2, border: `1px solid ${G.gold}30`, borderRadius: 8, marginBottom: 20, maxWidth: 620, margin: "0 auto 20px", textAlign: "left" }}>
          <p style={{ fontSize: 10, letterSpacing: 4, color: `${G.gold}80`, textTransform: "uppercase", marginBottom: 16, fontFamily: sans }}>{L.res.primary}</p>
          <h2 className={lc} style={{ fontSize: "clamp(17px,2.5vw,26px)", color: G.smoke, lineHeight: 1.8, marginBottom: 16, whiteSpace: "pre-line" }}>{primaryPattern}</h2>
          <p className={lc} style={{ fontSize: "clamp(14px,1.9vw,18px)", color: G.mid, lineHeight: 2, fontStyle: "italic" }}>"{coreInsight}"</p>
        </div>
        <button className="bg" onClick={() => goTo(6)} style={gBtn}>{L.res.cta}</button>
      </div>
    );
  };

  const Conversion = () => {
    const CV = L.cnv;
    return (
      <div style={{ ...sec, textAlign: "center" }}>
        <Tg>{CV.tag}</Tg>
        <h2 className={lc} style={{ fontSize: "clamp(26px,3.5vw,46px)", color: G.smoke, lineHeight: 1.4, marginBottom: 20 }}>{CV.h}</h2>
        <p className={lc} style={{ fontSize: "clamp(16px,2vw,22px)", color: G.mid, lineHeight: 1.9, fontStyle: "italic", maxWidth: 560, margin: "0 auto 52px" }}>{CV.sub}</p>
        <button className="bg" onClick={() => goTo(1)} style={gBtn}>Back to Home</button>
      </div>
    );
  };

  const phases = [<Ritual />, <Hero />, <Mirror />, <Intro />, <Scenario />, <Result />, <LeadCapture lang={lang} LL={L.led} aiProfile={aiProfile} formLevel={formLevel} setFormLevel={setFormLevel} goTo={goTo} />, <Conversion />];

  return (
    <div className="pin">
      {phases[phase]}
    </div>
  );
}
