import { useState, useEffect, useRef } from "react";
import Home from "./pages/Home";
import Journal from "./pages/Journal";
import AdminPanel from "./components/AdminPanel";
import { G, serif, sans, loadReviews } from "./utils/constants";
import { api } from "./utils/api-client";

const LOGO_B64 = "data:image/jpeg;base64,..."; // Keep existing logo string

const css = `...`; // Keep existing CSS

export default function App() {
  const SS_KEY = "mpv_session_v1";
  const loadSession = () => {
    try {
      const s = sessionStorage.getItem(SS_KEY);
      if (s) return JSON.parse(s);
    } catch (e) { }
    return null;
  };
  const saved = loadSession();

  const [phase, setPhase] = useState(saved?.phase || 0);
  const [lang, setLang] = useState(saved?.lang || "te");
  const [isJournalView, setIsJournalView] = useState(false);
  const [aiProfile, setAiProfile] = useState(saved?.aiProfile || null);
  const [aiLoading, setAiLoading] = useState(false);
  const [fading, setFading] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminAuth, setAdminAuth] = useState(false);
  const [adminPwdInput, setAdminPwdInput] = useState("");
  const [adminPwdErr, setAdminPwdErr] = useState(false);
  const [dynamicReviews, setDynamicReviews] = useState(() => loadReviews());

  const topRef = useRef(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(SS_KEY, JSON.stringify({ phase, aiProfile, lang }));
    } catch (e) { }
  }, [phase, aiProfile, lang]);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const top = () => topRef.current?.scrollIntoView({ behavior: "smooth" });
  
  const goTo = (p) => {
    setFading(true); 
    setTimeout(() => { 
      setPhase(p); 
      setFading(false); 
      top(); 
    }, 230);
  };

  const handleAdminLogin = async () => {
    const res = await api.validateCode(adminPwdInput, 'admin');
    if (res.valid) { 
      setAdminAuth(true); 
      setAdminPwdErr(false); 
    } else { 
      setAdminPwdErr(true); 
      setAdminPwdInput(""); 
    }
  };

  const navStyle = { 
    position: "fixed", top: 0, left: 0, right: 0, zIndex: 300, padding: "12px 28px", 
    display: "flex", justifyContent: "space-between", alignItems: "center", 
    background: scrolled ? "rgba(5,5,10,0.94)" : "transparent", 
    borderBottom: scrolled ? `1px solid rgba(201,168,76,0.12)` : "none", 
    backdropFilter: scrolled ? "blur(20px)" : "none", 
    transition: "all 0.4s" 
  };

  return (
    <div style={{ background: G.black, color: G.smoke, fontFamily: sans, minHeight: "100vh" }}>
      <style>{css}</style>
      <div ref={topRef} />
      
      {adminOpen && !adminAuth && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#0F0F16", border: "1px solid rgba(201,168,76,0.4)", borderRadius: 12, padding: "40px 36px", width: 340, textAlign: "center" }}>
            <h3 style={{ color: "#F5F2EA", fontSize: 18, marginBottom: 24 }}>Admin Access</h3>
            <input type="password" value={adminPwdInput} placeholder="Enter password"
              onChange={e => { setAdminPwdInput(e.target.value); setAdminPwdErr(false); }}
              onKeyDown={e => e.key === "Enter" && handleAdminLogin()}
              style={{ width: "100%", padding: "12px 16px", background: "rgba(201,168,76,0.06)", border: `1px solid ${adminPwdErr ? "rgba(200,80,80,0.6)" : "rgba(201,168,76,0.25)"}`, borderRadius: 6, color: "#F5F2EA", marginBottom: 16, textAlign: "center" }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setAdminOpen(false)} style={{ flex: 1, padding: "11px", background: "transparent", color: "#A8A498", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 4 }}>Cancel</button>
              <button onClick={handleAdminLogin} style={{ flex: 1, padding: "11px", background: G.gold, color: G.black, border: "none", borderRadius: 4, fontWeight: 700 }}>Login →</button>
            </div>
          </div>
        </div>
      )}
      
      {adminOpen && adminAuth && <AdminPanel onClose={() => { setAdminOpen(false); setAdminAuth(false); }} />}

      {phase > 0 && (
        <nav style={navStyle}>
          <div style={{ cursor: "pointer" }} onClick={() => { setIsJournalView(false); setPhase(1); top(); }}>
            <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, letterSpacing: 3, color: G.gold, textTransform: "uppercase" }}>Mind Power Vaultt</div>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ display: "flex", background: "rgba(201,168,76,0.08)", border: `1px solid ${G.goldDim}`, borderRadius: 40, padding: "3px" }}>
              {["te", "en"].map(l => (
                <button key={l} onClick={() => setLang(l)} style={{ padding: "5px 14px", borderRadius: 30, border: "none", cursor: "pointer", fontSize: 10, fontWeight: 700, background: lang === l ? G.gold : "transparent", color: lang === l ? G.black : `${G.smoke}55` }}>{l === "te" ? "తె" : "EN"}</button>
              ))}
            </div>
            <button onClick={() => setIsJournalView(true)} style={{ background: "transparent", border: `1px solid ${G.gold}40`, color: G.gold, padding: "6px 14px", borderRadius: 2, fontSize: 10, cursor: "pointer" }}>Student Portal</button>
          </div>
        </nav>
      )}

      <div style={{ opacity: fading ? 0 : 1, transition: "opacity 0.23s ease" }}>
        {isJournalView ? (
          <Journal lang={lang} onBack={() => setIsJournalView(false)} />
        ) : (
          <Home 
            lang={lang} phase={phase} setPhase={setPhase} goTo={goTo} 
            aiLoading={aiLoading} setAiLoading={setAiLoading}
            aiProfile={aiProfile} setAiProfile={setAiProfile}
            LOGO_B64={LOGO_B64} dynamicReviews={dynamicReviews}
          />
        )}
      </div>
    </div>
  );
}
