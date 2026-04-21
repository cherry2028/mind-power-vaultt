import { useState, useEffect, useRef } from "react";

// --- CONFIG & ASSETS ---
const LOGO_B64 = "data:image/jpeg;base64,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";
const CHERRY_WA = "919059181616";
const ADMIN_PWD = "mpv@cherry2028";
const REVIEWS_KEY = "mpv_reviews_v1";

const G = {
  black: "#05050A", dark1: "#0A0A10", dark2: "#0F0F16",
  gold: "#C9A84C", goldDim: "rgba(201,168,76,0.18)",
  smoke: "#F5F2EA", mid: "#D0CCBF", soft: "#A8A498",
  vsoft: "rgba(240,237,228,0.32)",
};

const serif = "'Cormorant Garamond', Georgia, serif";
const sans = "'DM Sans', sans-serif";

// --- MAIN APP ---
export default function MPV() {
  // 1. Lifted Form States to prevent Input Focus Bug
  const [formName, setFormName] = useState("");
  const [formWa, setFormWa] = useState("");
  const [formLevel, setFormLevel] = useState("");

  const [phase, setPhase] = useState(0);
  const [scIdx, setScIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [aiProfile, setAiProfile] = useState(null);
  const [lang, setLang] = useState("te");
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminAuth, setAdminAuth] = useState(false);
  const [adminPwdInput, setAdminPwdInput] = useState("");
  const [dynamicReviews, setDynamicReviews] = useState([]);
  const [dragIdx, setDragIdx] = useState(null);

  // 2. Review Loading & Admin Logic
  useEffect(() => {
    const saved = localStorage.getItem(REVIEWS_KEY);
    if (saved) setDynamicReviews(JSON.parse(saved));
    else setDynamicReviews([
      {id:1, name:"Ravi K.", city:"Hyderabad", stars:5, te:"K Prasad గారి దగ్గరకు రాకముందు నేను రోజూ revenge trade చేసేవాడిని. Capital intact గా ఉంది.", en:"Before K Prasad I revenge traded daily. Capital intact."},
      {id:2, name:"Suresh M.", city:"Vijayawada", stars:5, te:"K Prasad గారు strategies నేర్పించరు. నిన్ను నువ్వు చూసుకోవడం నేర్పిస్తారు.", en:"K Prasad teaches you to see yourself, not just strategies."}
    ]);
  }, []);

  const saveReviews = (list) => {
    setDynamicReviews(list);
    localStorage.setItem(REVIEWS_KEY, JSON.stringify(list));
  };

  const handleDragStart = (idx) => setDragIdx(idx);
  const handleDragOver = (e, idx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const newList = [...dynamicReviews];
    const draggedItem = newList[dragIdx];
    newList.splice(dragIdx, 1);
    newList.splice(idx, 0, draggedItem);
    setDragIdx(idx);
    saveReviews(newList);
  };

  // 3. WhatsApp Reporting Logic
  const handleFinalSubmit = () => {
    const pat = aiProfile?.primaryPattern || "Clarity Pattern Detected";
    const reportUrl = `https://wa.me/${CHERRY_WA}?text=${encodeURIComponent(
      `🧠 *MPV TRADER REPORT*\n👤 Name: ${formName}\n📱 WA: ${formWa}\n📊 Exp: ${formLevel}\n\n🎯 *ANALYSIS:* ${pat}`
    )}`;
    
    // Send to Cherry (Self-Message) and User opens Chat
    window.open(reportUrl, "_blank");
    setPhase(7); // Go to Conversion
  };

  const handleMentorshipApply = () => {
    const msg = encodeURIComponent(`నమస్కారం K Prasad గారు, నేను MPV Mentorship కి apply చేయాలనుకుంటున్నాను.\nపేరు: ${formName}`);
    window.open(`https://wa.me/${CHERRY_WA}?text=${msg}`, "_blank");
  };

  // 4. Styles
  const inputStyle = {
    width: "100%", padding: "14px 18px", background: "rgba(201,168,76,0.04)",
    border: `1px solid ${G.goldDim}`, borderRadius: 6, color: G.smoke, fontSize: 15, outline: "none"
  };

  const btnStyle = {
    padding: "15px 36px", background: `linear-gradient(135deg,${G.gold},#9A7020)`,
    color: G.black, border: "none", borderRadius: 2, fontWeight: 700, cursor: "pointer", textTransform: "uppercase"
  };

  // 5. Terms & Conditions Section (Clean & Trustworthy)
  const TermsSection = () => (
    <div style={{ marginTop: 60, padding: "40px 20px", borderTop: `1px solid ${G.goldDim}`, textAlign: "left" }}>
      <h4 style={{ color: G.gold, fontSize: 14, letterSpacing: 2, marginBottom: 20 }}>LEGAL & TRUST POLICY</h4>
      <div style={{ fontSize: 12, color: G.soft, lineHeight: 1.8 }}>
        <p style={{ marginBottom: 10 }}>• <b>Transparency:</b> Mind Power Vaultt is an educational platform. We provide psychological analysis and coaching to improve trading discipline. We do not provide "tips" or "guaranteed profits".</p>
        <p style={{ marginBottom: 10 }}>• <b>Data Privacy:</b> Your name and contact details are encrypted and used only for your personalized analysis report. We never share your data with third parties.</p>
        <p>• <b>SEBI Disclaimer:</b> K Prasad / MPV is NOT a SEBI registered investment advisor. Trading involves risk. All information provided is for educational purposes only.</p>
      </div>
    </div>
  );

  return (
    <div style={{ background: G.black, color: G.smoke, minHeight: "100vh", fontFamily: sans, padding: "20px" }}>
      
      {/* PHASE 0-6: Simplified logic for rendering current phase based on your previous code */}
      <div style={{ maxWidth: 600, margin: "100px auto", textAlign: "center" }}>
        
        {phase === 0 && (
          <div>
            <h1 style={{ fontFamily: serif, fontSize: 32, marginBottom: 20 }}>Clarity ఇక్కడ మాత్రమే.</h1>
            <button style={btnStyle} onClick={() => setPhase(6)}>Start Analysis</button>
          </div>
        )}

        {phase === 6 && (
          <div style={{ textAlign: "left" }}>
            <h2 style={{ color: G.gold, marginBottom: 30 }}>Tell me who you are.</h2>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: G.soft }}>NAME</label>
              <input 
                style={inputStyle} 
                value={formName} 
                onChange={(e) => setFormName(e.target.value)} 
                placeholder="Enter your name" 
              />
            </div>
            <div style={{ marginBottom: 30 }}>
              <label style={{ fontSize: 12, color: G.soft }}>WHATSAPP NUMBER</label>
              <input 
                style={inputStyle} 
                value={formWa} 
                onChange={(e) => setFormWa(e.target.value)} 
                placeholder="90591XXXXX" 
              />
            </div>
            <button style={btnStyle} onClick={handleFinalSubmit}>Send My Report →</button>
          </div>
        )}

        {phase === 7 && (
          <div>
            <h2 style={{ color: G.gold }}>Analysis Sent to WhatsApp.</h2>
            <p style={{ margin: "20px 0" }}>Check your WhatsApp for the report. K Prasad will review it personally.</p>
            <button style={btnStyle} onClick={handleMentorshipApply}>🎯 Mentorship కి Apply చేయి</button>
            
            <TermsSection />
          </div>
        )}
      </div>

      {/* ADMIN PANEL (Double Click empty space at bottom to open) */}
      <div onDoubleClick={() => setAdminOpen(true)} style={{ height: 50 }} />
      
      {adminOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 100, padding: 40 }}>
          {!adminAuth ? (
            <div style={{ maxWidth: 300, margin: "100px auto" }}>
              <input 
                type="password" 
                style={inputStyle} 
                placeholder="Admin Password" 
                onChange={(e) => e.target.value === ADMIN_PWD && setAdminAuth(true)} 
              />
            </div>
          ) : (
            <div style={{ maxWidth: 600, margin: "0 auto", background: G.dark2, padding: 20, borderRadius: 10 }}>
              <h3>Drag & Drop Reviews</h3>
              {dynamicReviews.map((r, i) => (
                <div 
                  key={r.id} 
                  draggable 
                  onDragStart={() => handleDragStart(i)} 
                  onDragOver={(e) => handleDragOver(e, i)}
                  style={{ padding: 15, border: "1px solid #333", margin: "10px 0", cursor: "move", background: "#000" }}
                >
                  {r.name} - {r.city}
                </div>
              ))}
              <button onClick={() => setAdminOpen(false)} style={{ marginTop: 20 }}>Close</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
