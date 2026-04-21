import { useState, useEffect, useRef } from "react";

const LOGO_B64 = "data:image/jpeg;base64,..."; // Mee existing base64 ikkada untundhi
const ADMIN_PWD = "mpv@cherry2028";
const REVIEWS_KEY = "mpv_reviews_v1";
const CHERRY_WA = "919059181616";

// ... G (Colors) and Styles ikkade untay ...

export default function MPV() {
  // --- LIFTED STATES TO FIX INPUT CURSOR BUG ---
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
  const [dynamicReviews, setDynamicReviews] = useState([]);

  // --- REVIEWS & DRAG-DROP LOGIC ---
  useEffect(() => {
    const saved = localStorage.getItem(REVIEWS_KEY);
    if (saved) setDynamicReviews(JSON.parse(saved));
  }, []);

  const handleDragOver = (e, i) => {
    e.preventDefault();
    // Drag-drop implementation logic
  };

  // --- WHATSAPP REPORT SENDING LOGIC ---
  const sendReportToWhatsApp = () => {
    const pat = aiProfile?.primaryPattern || "Pattern analyzing...";
    const insight = aiProfile?.coreInsight || "";
    
    const fullReport = encodeURIComponent(
      `🧠 *MPV TRADER REPORT*\n👤 Name: ${formName}\n📱 WA: ${formWa}\n📊 Exp: ${formLevel}\n\n*Analysis:* ${pat}\n\n*Insight:* ${insight}`
    );
    
    // Admin self-message setup
    window.open(`https://wa.me/${CHERRY_WA}?text=${fullReport}`, "_blank");
  };

  // --- TERMS & CONDITIONS CONTENT ---
  const LegalSection = () => (
    <div style={{marginTop: 60, padding: 30, borderTop: "1px solid rgba(201,168,76,0.1)", textAlign: 'left'}}>
      <h3 style={{color: '#C9A84C', fontSize: 16, marginBottom: 15}}>Terms & Responsibility</h3>
      <div style={{color: '#A8A498', fontSize: 12, lineHeight: 1.8}}>
        <p>• <b>Transparency:</b> Mind Power Vaultt strategy gurinchi kadhu, psychology gurinchi. Memu user clarity ni mathrame guarantee chestham.</p>
        <p>• <b>Privacy:</b> Mee personal data and analysis results eppatiki confidential ga untay. No spam.</p>
        <p>• <b>Not Investment Advice:</b> Memu SEBI registered kadhu. Educational insights mathrame provide chestham.</p>
      </div>
    </div>
  );

  // --- MAIN RENDER LOGIC ---
  // (Input fields lo value={formName} and onChange={(e) => setFormName(e.target.value)} use chesthe focus jump avvadhu)

  return (
    <div style={{background: "#05050A", color: "#F5F2EA", minHeight: "100vh"}}>
      {/* Phases handling as per original code */}
      
      {/* Footer lo Legal Section */}
      {phase === 7 && <LegalSection />}
      
      {/* Admin Panel and remaining UI components */}
    </div>
  );
}
