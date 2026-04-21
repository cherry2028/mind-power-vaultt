import { useState, useEffect, useRef } from "react";

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

const SCENARIOS = [
  { id:0, escalation:false, showCommunity:false,
    te:{ sit:"మార్కెట్ open అయింది.\nSetup కనిపించింది.\nEntry కి సిద్ధంగా ఉన్నావు…\nఒక్క క్షణంలో —\nprice వెళ్ళిపోయింది.\nTrade…\nmiss అయింది.", q:"ఇప్పుడు నువ్వు ఏమి చేస్తావు?",
      ch:[
        {l:"మళ్ళీ ఇలాంటి setup వస్తుందని wait చేస్తాను", r:"Wait చేయడం తెలుసు అని అనిపిస్తుంది. కానీ screen ముందు కూర్చుని నిజంగా wait చేయగలిగావా? తెలుసు అనడం వేరు. ఆ క్షణంలో execute చేయడం వేరు."},
        {l:"Price వెళ్ళిన direction లోనే enter అవుతాను", r:"Trade miss అవ్వలేదు నువ్వు — opportunity వెళ్ళిపోయిందని feel అయ్యావు. ఆ feeling చాలా తీవ్రంగా ఉంటుంది. Market చూసి చేశావా — లేదా miss అయిన feeling నుండి చేశావా?"},
        {l:"Frustrate అయి screen నుండి దూరంగా వెళ్తాను", r:"Market నీకు ఇవ్వాలి అనిపిస్తోంది…\nఇవ్వలేదు కాబట్టి frustrate అవుతున్నావు.\nకానీ —\nmarket నీది కాదు.\nఅయితే ఈ expectation…\nనీది ఎలా అయింది?"},
      ]},
    en:{ sit:"The market opened. You spotted a setup. You were ready to enter — in a split second the price moved. Trade missed.", q:"What do you do now?",
      ch:[
        {l:"I wait — a similar setup will come again", r:"You feel like you know how to wait. But sitting in front of the screen, watching the next candle — could you actually do it? Knowing is one thing. Executing in that moment is another."},
        {l:"I enter in the direction the price moved", r:"You didn't miss the trade — you felt like the opportunity left you. That feeling is intense. Did you trade based on the market — or based on the feeling of missing out?"},
        {l:"I get frustrated and step away from the screen", r:"You expected the market to give you something. It didn't — so frustration came. But the market owes you nothing. Understanding where that expectation comes from — that is the real work."},
      ]}},
  { id:1, escalation:false, showCommunity:false,
    te:{ sit:"Price stoploss దగ్గరకు వచ్చింది…\nnuvvu ముందుగానే exit అయ్యావు…\nకొద్దిసేపటికి —\nmarket నీ direction లోనే వెళ్ళింది.", q:"నీ మనసులో ఇప్పుడు ఏముంది?",
      ch:[
        {l:"వెంటనే మళ్ళీ ఎంటర్ అవుతాను — ట్రెండ్ ఇంకా ఉంది కదా", r:"నష్టం వచ్చిన వెంటనే Re-entry — అది Capital రికవరీ కోసం కాదు, తప్పు జరిగిందనే భావనను వదిలించుకోవడానికి. ఆ క్షణంలో నువ్వు చేసేది Trade ఆ? లేక కేవలం నీ Ego ఇస్తున్న Reaction ఆ?"},
        {l:"ఈ రోజు ఇక trade వద్దు — mind సరిగా లేదు", r:"ఆపడం తెలివైన పని లా కనిపిస్తుంది. కానీ rule వల్ల ఆపావా — లేదా pain వల్ల ఆపావా? Rule వల్ల ఆపడం discipline. Pain వల్ల ఆపడం — తర్వాత trade లో compounded గా తిరిగి వస్తుంది."},
        {l:"Journal లో రాసుకుని next setup కోసం wait చేస్తాను", r:"ఇది సరైన direction. కానీ నిజాయితీగా చెప్పు — last పది losses లో ఎన్నిసార్లు నిజంగా జర్నల్ రాశావు? సరైన choice తెలుసు. దాన్ని అలవాటు చేసుకోవడమే ఇంకా జరగలేదు."},
      ]},
    en:{ sit:"SL got hit. You took a loss. Shortly after, the market went in your direction — you exited too early.", q:"What is going through your mind right now?",
      ch:[
        {l:"I re-enter immediately — the trend is still there", r:"Re-entering right after a loss isn't about recovering capital. It's about escaping the feeling that something went wrong. In that moment — are you trading, or reacting?"},
        {l:"No more trades today — my mind isn't right", r:"Stopping looks like the smart move. But did you stop because of a rule — or because of pain? Stopping due to a rule is discipline. Stopping due to pain — it comes back compounded in your next trade."},
        {l:"I write it in my journal and wait for the next setup", r:"This is the right direction. But honestly — in your last ten losses, how many times did you actually journal? You know the right choice. Making it a habit is what hasn't happened yet."},
      ]}},
  { id:2, escalation:true, showCommunity:false,
    escLine:{ te:"ఒక్క క్షణం ఆగు.\n\nమొదటి రెండు situations లో నీ reaction గుర్తు చేసుకో.\n\nఇది మూడోసారి — ఒకే pattern నిన్ను follow చేస్తోంది.", en:"Wait a moment.\n\nThink back to how you reacted in the first two situations.\n\nThis is the third time — the same pattern is following you." },
    escNote:{ te:"ఇది coincidence కాదు. ఇది pattern.", en:"This isn't coincidence. This is pattern." },
    escBtn:{ te:"చూపించు →", en:"Show me →" },
    te:{ sit:"వరుసగా మూడు trades లో loss వచ్చింది. ఒక పరిచయస్థుడు ఒక setup share చేశాడు — 'ఈసారి confirm' అన్నాడు.", q:"nuvvu ఏమి చేస్తావు?",
      ch:[
        {l:"Try చేస్తాను — ఏమైనా recover అవ్వాలి కదా", r:"మూడు losses తర్వాత వేరేవాళ్ళ setup నమ్మడం — weakness కాదు. నీ దగ్గర స్పష్టత లేదు అనే signal. Own system లేనపుడు ఎవరైనా 'sure' అంటే అది hope లా కనిపిస్తుంది."},
        {l:"వద్దు — నా ప్లాన్ మాత్రమే ఫాలో అవుతాను.", r:"నీ ప్లాన్ స్పష్టంగా ఉందా? వరుసగా మూడు నష్టాల తర్వాత కూడా అది మారకుండా ఉందా? నిజంగా అలాగే ఉంటే... నువ్వు ఇప్పటికే సరైన దారిలో ఉన్నావు."},
        {l:"Setup analyze చేసి decide అవుతాను", r:"వరుసగా మూడు నష్టాల తర్వాత కూడా నీ అనాలిసిస్ objective గా ఉంటుందా? సెటప్ బాగున్నట్టు కనిపిస్తోంది అంటే — అది నిజంగా బాగున్నందుకా, లేక నష్టాన్ని రికవరీ చేయాలనే ఆరాటం వల్ల అలా కనిపిస్తోందా?"},
      ]},
    en:{ sit:"Three consecutive losses. A contact shares a setup — says 'this one is confirmed.'", q:"What do you do?",
      ch:[
        {l:"I try it — I need to recover somehow", r:"Trusting someone else's setup after three losses isn't weakness. It's a signal that you lack clarity. When you don't have your own system, anyone's 'sure' looks like hope."},
        {l:"No — I stick to my plan", r:"Is your plan clearly defined? Does it hold even after three losses? If yes — you're already on the right path."},
        {l:"I analyze the setup and then decide", r:"Can you analyze objectively after three losses? Does the setup look good because it actually is — or because you need it to be?"},
      ]}},
  { id:3, escalation:false, showCommunity:true,
    commLine:{ te:"చాలా మంది traders ఇలాంటి situations లో ఇలాగే feel అవుతారు. నువ్వు ఒంటరివి కాదు — కానీ దీన్ని తెలుసుకోవడం మాత్రమే చాలదు.", en:"Many traders feel the same way in situations like this. You are not alone — but just knowing this is not enough." },
    te:{ sit:"ఈ రోజు పెద్ద profit వచ్చింది. Market ఇంకా open లో ఉంది. సరిగ్గా అదే సమయంలో మరో setup కనిపించింది.", q:"nuvvu ఏమి చేస్తావు?",
      ch:[
        {l:"Enter అవుతాను — ఈ రోజు అన్నీ వర్క్ అవుతున్నాయి కదా!", r:"Profit వచ్చిన రోజు అన్నీ clear గా కనిపిస్తాయి. కానీ ఆ confidence నీ edge నుండి వస్తోందా — లేదా ఆ రోజు mood నుండి వస్తోందా? ఆ రెండూ చాలా వేరు."},
        {l:"Target hit అయింది — ఇక్కడితో ఆపుతాను", r:"Discipline లా కనిపిస్తుంది. కానీ target miss అయిన రోజు కూడా ఇంత clear ga ఆపగలవా? నిజమైన discipline good days లో easy. Bad days లో అదే test అవుతుంది."},
        {l:"Setup quality చూసి decide చేస్తాను", r:"Setup evaluate చేయడం సరైనదే. కానీ profit లో ఉన్నపుడు ఆ evaluation neutral గా ఉంటుందా? Profit వెనక ఆ setup కొంచెం better గా కనిపిస్తోందా?"},
      ]},
    en:{ sit:"Big profit day. The market is still open. Another setup appears.", q:"What do you do?",
      ch:[
        {l:"I enter — everything is working today", r:"On profit days everything looks clear. But is that confidence coming from your edge — or from the day's mood? Those two things are very different."},
        {l:"Target hit — I stop here", r:"This looks like discipline. But on a day when you miss your target — can you stop just as cleanly? Real discipline is easy on good days. Bad days are where it's actually tested."},
        {l:"I check the setup quality and then decide", r:"Evaluating setup quality is right. But with profit in hand, is that evaluation truly neutral? Does the setup look a little better because of the profit sitting there?"},
      ]}},
];

// --- APP COMPONENT ---
export default function MPV() {
  const [phase, setPhase] = useState(0);
  const [scIdx, setScIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [aiProfile, setAiProfile] = useState(null);
  const [lang, setLang] = useState("te");
  const [fading, setFading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  
  // FIX: Lifted states for inputs to stop focus-loss jump
  const [formName, setFormName] = useState("");
  const [formWa, setFormWa] = useState("");
  const [formLevel, setFormLevel] = useState("");

  const [adminOpen, setAdminOpen] = useState(false);
  const [adminAuth, setAdminAuth] = useState(false);
  const [adminPwdInput, setAdminPwdInput] = useState("");
  const [dynamicReviews, setDynamicReviews] = useState([]);
  const [dragIdx, setDragIdx] = useState(null);

  const topRef = useRef(null);
  const top = () => topRef.current?.scrollIntoView({ behavior: "smooth" });

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
    const item = newList.splice(dragIdx, 1)[0];
    newList.splice(idx, 0, item);
    setDragIdx(idx);
    saveReviews(newList);
  };

  const goTo = (p) => {
    setFading(true);
    setTimeout(() => { setPhase(p); setFading(false); top(); }, 250);
  };

  const handleChoice = (ci) => {
    const newAnswers = [...answers, ci];
    setAnswers(newAnswers);
    if (scIdx < SCENARIOS.length - 1) {
      setScIdx(scIdx + 1);
      top();
    } else {
      generateProfile(newAnswers);
    }
  };

  const generateProfile = (finalAnswers) => {
    setAiLoading(true);
    setPhase(5);
    setTimeout(() => {
      setAiProfile({
        primaryPattern: lang === "te" ? "నువ్వు Market Mood ని బట్టి ట్రేడ్ చేస్తున్నావు." : "You are trading based on Market Mood.",
        coreInsight: lang === "te" ? "నీకు process కంటే emotion priority అవుతోంది." : "Emotion is taking priority over your process."
      });
      setAiLoading(false);
    }, 1500);
  };

  const handleReportAndLead = () => {
    if (!formName || !formWa) return alert(lang === "te" ? "దయచేసి వివరాలు పూర్తి చేయండి" : "Please fill details");
    
    const reportMsg = encodeURIComponent(`🧠 *MPV TRADER REPORT*\n👤 Name: ${formName}\n📊 Status: ${formLevel}\n\n*Pattern:* ${aiProfile?.primaryPattern}`);
    
    // Send to K Prasad (9059181616)
    window.open(`https://wa.me/${CHERRY_WA}?text=${reportMsg}`, "_blank");
    goTo(7);
  };

  const handleMentorship = () => {
    const msg = encodeURIComponent(`నమస్కారం K Prasad గారు, నేను Mentorship గురించి మాట్లాడాలనుకుంటున్నాను.\nపేరు: ${formName}`);
    window.open(`https://wa.me/${CHERRY_WA}?text=${msg}`, "_blank");
  };

  // --- SUB-COMPONENTS ---
  const TermsAndLegal = () => (
    <div style={{ marginTop: 60, padding: "40px 20px", borderTop: `1px solid ${G.goldDim}`, textAlign: "left" }}>
      <h4 style={{ color: G.gold, fontSize: 11, letterSpacing: 4, textTransform: "uppercase", marginBottom: 20 }}>Legal & Trust Policy</h4>
      <div style={{ fontSize: 12, color: G.soft, lineHeight: 1.9 }}>
        <p style={{ marginBottom: 12 }}>• <b>Transparency:</b> Mind Power Vaultt is an educational brand. We focus on trading psychology and discipline improvement. We do not provide financial tips or fixed profit guarantees.</p>
        <p style={{ marginBottom: 12 }}>• <b>Data Privacy:</b> Your details are used solely to send your personalized report. We do not share your data with any external agencies or marketing lists.</p>
        <p>• <b>SEBI Disclaimer:</b> K Prasad / MPV is NOT a SEBI registered investment advisor. Trading involves financial risk. Content is for educational purposes only.</p>
      </div>
    </div>
  );

  return (
    <div style={{ background: G.black, color: G.smoke, minHeight: "100vh", padding: "20px", fontFamily: "'DM Sans', sans-serif" }}>
      <div ref={topRef} />
      
      <div style={{ opacity: fading ? 0 : 1, transition: "0.25s", maxWidth: 600, margin: "80px auto", textAlign: "center" }}>
        
        {phase === 0 && (
          <div style={{ padding: "40px 0" }}>
            <h1 style={{ fontSize: 42, color: G.gold }}>Clarity ఇక్కడ మాత్రమే.</h1>
            <p style={{ margin: "20px 0 40px", color: G.mid }}>Before you trade the market, understand yourself.</p>
            <button onClick={() => goTo(4)} style={{ padding: "18px 40px", background: G.gold, color: G.black, border: "none", fontWeight: 700, cursor: "pointer" }}>START ANALYSIS →</button>
          </div>
        )}

        {phase === 4 && (
          <div style={{ textAlign: "left" }}>
            <p style={{ color: G.gold, fontSize: 12, marginBottom: 10 }}>SITUATION {scIdx + 1} / 4</p>
            <h2 style={{ fontSize: 24, marginBottom: 30, lineHeight: 1.5 }}>{SCENARIOS[scIdx][lang].sit}</h2>
            {SCENARIOS[scIdx][lang].ch.map((c, i) => (
              <button key={i} onClick={() => handleChoice(i)} style={{ width: "100%", padding: "20px", background: "rgba(201,168,76,0.05)", border: `1px solid ${G.goldDim}`, color: G.smoke, textAlign: "left", marginBottom: 12, cursor: "pointer" }}>{c.l}</button>
            ))}
          </div>
        )}

        {phase === 5 && (
          <div>
            {aiLoading ? <p>Analyzing patterns...</p> : (
              <div style={{ textAlign: "left", background: G.dark2, padding: 30, border: `1px solid ${G.goldDim}` }}>
                <h3 style={{ color: G.gold }}>Detection Complete</h3>
                <p style={{ fontSize: 20, margin: "20px 0" }}>{aiProfile.primaryPattern}</p>
                <button onClick={() => goTo(6)} style={{ width: "100%", padding: "15px", background: G.gold, color: G.black, border: "none", fontWeight: 700 }}>GET FULL REPORT →</button>
              </div>
            )}
          </div>
        )}

        {phase === 6 && (
          <div style={{ textAlign: "left" }}>
            <h2 style={{ color: G.gold, marginBottom: 10 }}>Tell me who you are.</h2>
            <p style={{ color: G.soft, marginBottom: 30 }}>Your report will be sent to WhatsApp.</p>
            
            <label style={{ fontSize: 11, color: G.gold }}>YOUR NAME</label>
            <input style={{ width: "100%", padding: "15px", background: "transparent", border: `1px solid ${G.goldDim}`, color: "#fff", marginBottom: 20 }} value={formName} onChange={e => setFormName(e.target.value)} />
            
            <label style={{ fontSize: 11, color: G.gold }}>WHATSAPP NUMBER</label>
            <input style={{ width: "100%", padding: "15px", background: "transparent", border: `1px solid ${G.goldDim}`, color: "#fff", marginBottom: 30 }} value={formWa} onChange={e => setFormWa(e.target.value)} />
            
            <button onClick={handleReportAndLead} style={{ width: "100%", padding: "18px", background: G.gold, color: G.black, border: "none", fontWeight: 700 }}>SEND MY REPORT →</button>
          </div>
        )}

        {phase === 7 && (
          <div>
            <h2 style={{ color: G.gold }}>Report Sent.</h2>
            <p style={{ margin: "20px 0 40px" }}>Check your WhatsApp. K Prasad will review it personally.</p>
            <button onClick={handleMentorship} style={{ width: "100%", padding: "18px", background: G.gold, color: G.black, border: "none", fontWeight: 700 }}>🎯 MENTORSHIP కి APPLY చేయి</button>
            <TermsAndLegal />
          </div>
        )}

      </div>

      {/* Admin Invisible Trigger (Double Click bottom) */}
      <div onDoubleClick={() => setAdminOpen(true)} style={{ height: 40, opacity: 0 }} />

      {adminOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 1000, padding: 30 }}>
          {!adminAuth ? (
            <div style={{ maxWidth: 300, margin: "100px auto" }}>
              <input type="password" placeholder="Password" style={{ width: "100%", padding: 15 }} value={adminPwdInput} onChange={e => { setAdminPwdInput(e.target.value); if(e.target.value === ADMIN_PWD) setAdminAuth(true); }} />
              <button onClick={() => setAdminOpen(false)} style={{ marginTop: 20 }}>Cancel</button>
            </div>
          ) : (
            <div style={{ maxWidth: 600, margin: "0 auto", background: G.dark2, padding: 20 }}>
              <h3>Manage Reviews (Drag to Reorder)</h3>
              {dynamicReviews.map((r, i) => (
                <div key={r.id} draggable onDragStart={() => handleDragStart(i)} onDragOver={(e) => handleDragOver(e, i)} style={{ padding: 15, border: "1px solid #333", margin: "10px 0", cursor: "move", background: "#000" }}>{r.name}</div>
              ))}
              <button onClick={() => { setAdminOpen(false); setAdminAuth(false); setAdminPwdInput(""); }}>Close & Save</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
