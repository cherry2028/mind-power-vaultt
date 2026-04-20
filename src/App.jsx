import { useState, useEffect, useRef } from "react";

// ─── DESIGN TOKENS ───────────────────────────────────────────
const G = {
  black:   "#05050A",
  dark1:   "#0A0A10",
  dark2:   "#0F0F16",
  gold:    "#C9A84C",
  goldDim: "rgba(201,168,76,0.18)",
  smoke:   "#F5F2EA",
  mid:     "#D8D4C8",
  soft:    "#B0AC9E",
  vsoft:   "rgba(240,237,228,0.35)",
};
const serif = "'Cormorant Garamond', Georgia, serif";
const sans  = "'DM Sans', sans-serif";

// ─── BEHAVIOR ANALYSIS SYSTEM ────────────────────────────────
// Each choice maps to a behavior trait
// Key = "s{scenarioIdx}_{choiceIdx}"
const traitMap = {
  s0_0: { id:"AWARE",        neg:false, line:"నువ్వు ఏమి చేయాలో తెలుసు — కానీ ఆ క్షణంలో చేయలేవు." },
  s0_1: { id:"FOMO",         neg:true,  line:"Miss అవ్వడాన్ని tolerate చేయలేవు — అందుకే chase అవుతావు." },
  s0_2: { id:"AVOIDER",      neg:true,  line:"Frustration వస్తే screen వదిలేస్తావు — అది escape, solution కాదు." },

  s1_0: { id:"EGO",          neg:true,  line:"Loss తర్వాత immediately re-enter — ego recover చేసుకోవడానికి." },
  s1_1: { id:"FEAR_STOP",    neg:true,  line:"Pain వల్ల ఆపావు — rule వల్ల కాదు. ఆ తేడా పెద్దది." },
  s1_2: { id:"STRUCTURED",   neg:false, line:"Process తెలుసు — కానీ consistent గా follow అవుతున్నావా?" },

  s2_0: { id:"DEPENDENT",    neg:true,  line:"Clarity లేనప్పుడు వేరేవాళ్ళ 'sure' hope లా కనిపిస్తుంది." },
  s2_1: { id:"AUTONOMOUS",   neg:false, line:"Own plan trust చేస్తావు — అది defined గా ఉందా?" },
  s2_2: { id:"ANALYTICAL",   neg:false, line:"Analyze చేయాలని try చేస్తావు — ఆ state లో bias ఉంటుందా?" },

  s3_0: { id:"OVERCONFIDENT",neg:true,  line:"Good days లో process forget అవుతావు — mood లో trade చేస్తావు." },
  s3_1: { id:"DISCIPLINED",  neg:false, line:"Target follow చేస్తావు — bad days లో కూడా అంతే?" },
  s3_2: { id:"PROCESS_AWARE",neg:false, line:"Quality focus చేస్తావు — profit లో కూడా neutral గా?" },
};

// Build unique behavioral profile from 4 choices
// choices = [{si:"s0", ci:0}, {si:"s1", ci:1}, ...]
function buildProfile(choices) {
  const traits   = choices.map(c => traitMap[`${c.si}_${c.ci}`]).filter(Boolean);
  const neg      = traits.filter(t => t.neg);
  const pos      = traits.filter(t => !t.neg);
  const ids      = traits.map(t => t.id);
  const negIds   = neg.map(t => t.id);
  const has      = (...xs) => xs.every(x => negIds.includes(x));

  // Behavior lines per situation (these are always unique per choice)
  const behaviorLines = choices.map((c,i) => {
    const t = traitMap[`s${i}_${c.ci}`];
    return t ? t.line : "";
  });

  // ── Rich combination-specific insights ──────────────────────
  let primaryLine = "";
  let coreInsight = "";
  let warningLine = "";
  let strengthLine = pos.length > 0 ? pos[0].line : "";

  if (has("FOMO","EGO")) {
    primaryLine = "నువ్వు miss అవ్వడం భరించలేవు. Loss వచ్చినా భరించలేవు.\nఈ రెండూ కలిసి నిన్ను continuously react చేయిస్తున్నాయి.";
    coreInsight = "మార్కెట్ నిన్ను trap చేయడం లేదు — నీ own pattern నిన్ను trap చేస్తోంది. Miss అయినపుడు chase చేస్తావు. Loss వచ్చినపుడు immediately recover చేయాలని trade చేస్తావు. ఈ రెండు reactions మధ్య నీ actual edge పూర్తిగా disappear అవుతోంది.";
    warningLine = "ఈ combination లో account slowly కాదు — quickly erode అవుతుంది. రెండు వేపుల నుండి reactive trades వస్తున్నాయి కాబట్టి.";
  } else if (has("FOMO","OVERCONFIDENT")) {
    primaryLine = "Loss లో నువ్వు FOMO తో trade చేస్తావు.\nProfit లో process మర్చిపోయి mood తో trade చేస్తావు.";
    coreInsight = "రెండు extreme states లో నీ decisions emotion-driven అవుతున్నాయి. Loss streak లో 'miss అవ్వకూడదు' అని chase చేస్తావు. Win streak లో 'ఈ రోజు lucky' అని over-trade చేస్తావు. Market neutral గా ఉంటే — నీ decisions మాత్రం ఎప్పుడూ neutral గా ఉండవు.";
    warningLine = "Win streaks లో risk పెరుగుతుంది. Loss streaks లో chase అవుతావు. ఇది inconsistent results కి direct reason.";
  } else if (has("EGO","DEPENDENT")) {
    primaryLine = "Loss వస్తే నువ్వు market ని beat చేయాలని try చేస్తావు.\nLosing streak వస్తే వేరేవాళ్ళని follow చేస్తావు.";
    coreInsight = "నీ confidence unstable — loss వస్తే ego trigger అవుతుంది, consecutive losses వస్తే external seek మొదలవుతుంది. ఈ రెండూ అదే root cause వల్ల వస్తున్నాయి: నీ దగ్గర clearly defined internal system లేదు.";
    warningLine = "Own system build చేయకపోతే — good days లో ego trade చేస్తుంది, bad days లో others' tips trade చేస్తాయి. నువ్వు ఎప్పుడూ trade చేయవు.";
  } else if (has("DEPENDENT","OVERCONFIDENT")) {
    primaryLine = "Good days లో నువ్వు genius feel అవుతావు.\nBad days లో వేరేవాళ్ళ advice కోసం వెతుకుతావు.";
    coreInsight = "నువ్వు market results ని బట్టి నిన్ను నువ్వు judge చేస్తున్నావు. Win = నా skill. Loss = naku help కావాలి. ఈ pattern లో self-trust ఎప్పటికీ stable అవ్వదు — ఎందుకంటే market always up and down గా ఉంటుంది.";
    warningLine = "External validation depend చేసినంత కాలం నీ decisions నీవి కాదు — market mood వి.";
  } else if (has("AVOIDER","FEAR_STOP")) {
    primaryLine = "Pressure వచ్చినపుడు — miss, loss, frustration — నువ్వు situation నుండి దూరంగా వెళ్తావు.";
    coreInsight = "ఇది discipline లా కనిపిస్తుంది. కానీ ఇది rule-based stopping కాదు — pain-based escape. Rule వల్ల ఆపడం నిన్ను protect చేస్తుంది. Pain వల్ల ఆపడం — ఆ pain next session కి carry అవుతుంది. Compounded అవుతుంది.";
    warningLine = "Avoidance తాత్కాలిక relief ఇస్తుంది. కానీ avoidance చేసిన situations real market లో మళ్ళీ వస్తాయి — prepared గా లేకుండా.";
  } else if (has("FOMO","DEPENDENT")) {
    primaryLine = "Miss అవ్వడానికి భయం వస్తే chase చేస్తావు.\nLosing streak వస్తే others' setup follow చేస్తావు.";
    coreInsight = "ఈ రెండూ same root problem: నీ దగ్గర 'ఇది నా trade' అనే clarity లేదు. Clarity లేనపుడు market కనపడిన ప్రతి opportunity లాగుతుంది. Others చెప్పిన ప్రతి setup convincing గా అనిపిస్తుంది.";
    warningLine = "Own entry criteria లేకపోతే — market నిన్ను random గా move చేస్తుంది. Consistent results impossible.";
  } else if (has("EGO","OVERCONFIDENT")) {
    primaryLine = "Loss వచ్చినపుడు prove చేయాలని trade చేస్తావు.\nProfit వచ్చినపుడు process మర్చిపోయి trade చేస్తావు.";
    coreInsight = "ఈ రెండు states లో — loss లో ego, profit లో overconfidence — నీ process follow అవ్వడం లేదు. Market ని నీ identity తో connect చేశావు. Win = నేను right, loss = నేను wrong. Trading ఆ game కాదు.";
    warningLine = "Identity-based trading చాలా expensive. P&L ని ఎప్పుడూ self-worth తో mix చేయకూడదు.";
  } else if (negIds.length === 0) {
    primaryLine = "నీ 4 choices అన్నీ process-oriented గా ఉన్నాయి.\nకానీ real market లో కూడా ఇలాగే ఉంటావా?";
    coreInsight = "నీకు right answers తెలుసు. ఇది significant. కానీ trading లో knowledge ≠ execution. Screen ముందు pressure లో, loss streak లో, profit day లో — అదే clarity maintain చేయగలవా? అదే question.";
    warningLine = "Process తెలిసిన traders కూడా execution లో fail అవుతారు. Knowing and doing మధ్య gap అక్కడే ఉంటుంది.";
  } else if (negIds.length === 1) {
    // Single negative — rich specific insight
    const n = neg[0];
    if (n.id === "FOMO") {
      primaryLine = "నువ్వు trade miss అవ్వడాన్ని tolerate చేయలేవు.\nఆ ఒక్క feeling నీ చాలా decisions drive చేస్తోంది.";
      coreInsight = "FOMO ఒక్కటే ఉన్నప్పుడు — అది manageable. కానీ దాన్ని acknowledge చేయకపోతే అది slowly అన్ని decisions లో వస్తుంది. Missed trade అయినప్పుడు నీ reaction ని notice చేయడం start చేయి. అది నీ edge ని protect చేస్తుంది.";
      warningLine = "Entry criteria లేకుండా 'opportunity miss అవుతోంది' అనే feeling నిన్ను market లోకి force చేస్తుంది.";
    } else if (n.id === "EGO") {
      primaryLine = "Loss తర్వాత నీ immediate reaction re-enter చేయడం.\nఆ moment లో capital కంటే ego priority అవుతోంది.";
      coreInsight = "ఒక్క behavior change: loss వచ్చిన తర్వాత minimum 15 minutes wait rule. ఆ 15 minutes లో re-enter trigger feel అవుతుందా లేదా notice చేయి. అది ego trade ని identify చేసే easiest way.";
      warningLine = "Loss తర్వాత re-entry — అది winning trade అయినా, habit గా ఉంటే అది long term లో expensive అవుతుంది.";
    } else if (n.id === "OVERCONFIDENT") {
      primaryLine = "Good days లో నువ్వు process కంటే mood ని follow చేస్తావు.\nఆ రోజు profit నీ judgment కి ఒక filter లా work చేస్తోంది.";
      coreInsight = "Good days లో అదనపు trade తీసుకోవడం — అది occasionally work అవుతుంది. కానీ that success reinforces the behavior. Over time, good days లో rule-breaking అలవాటు అవుతుంది. That's where bad months begin.";
      warningLine = "Target hit అయిన తర్వాత screen నుండి దూరంగా వెళ్ళడం — ఇది simple గా కనిపిస్తుంది కానీ execution లో చాలా difficult.";
    } else if (n.id === "DEPENDENT") {
      primaryLine = "Losing streak లో నువ్వు others' advice కి vulnerable అవుతావు.\nఆ moment లో judgment temporarily absent అవుతుంది.";
      coreInsight = "3+ losses వచ్చినపుడు external seek చేయడం అర్థమయ్యే behavior. కానీ ఆ moment లో వచ్చే 'sure' tips — అవి నీ system కాదు. Others' system. Others' context. Others' risk tolerance.";
      warningLine = "Losing streaks లో rest తీసుకోవడం — next trade కి fresh గా రావడం — ఇది అర్థం చేసుకోవడం easy, చేయడం hard.";
    } else {
      primaryLine = n.line;
      coreInsight = pos.length > 0 ? `నీ దగ్గర ${pos[0].id} ఉంది — అది strength. కానీ ${n.id} ని address చేయకపోతే ఆ strength consistently show కాదు.` : "ఒక్క area లో focus — that's all it takes.";
      warningLine = "";
    }
  } else {
    // 2+ negatives, no specific combo matched
    primaryLine = `${neg[0].line}\n${neg[1] ? neg[1].line : ""}`;
    coreInsight = `ఈ రెండు patterns — ${neg[0].id} మరియు ${neg[1]?.id || ""} — connected గా ఉన్నాయి. ఒకటి trigger అయినపుడు రెండోది automatically follow అవుతుంది. ఒకటి address చేస్తే రెండోది కూడా improve అవుతుంది.`;
    warningLine = "Combined patterns single pattern కంటే ఎక్కువ impact చేస్తాయి — address చేయడం urgent.";
  }

  return { primaryLine, coreInsight, warningLine, strengthLine, behaviorLines, negCount: neg.length, posCount: pos.length };
}

// ─── SCENARIOS ────────────────────────────────────────────────
const scenarios = [
  {
    id: 0,
    situation: "మార్కెట్ open అయింది. Setup కనపడింది. Entry కి సిద్ధంగా ఉన్నావు — ఒక్క క్షణంలో price వెళ్ళిపోయింది. Trade miss అయింది.",
    question: "ఇప్పుడు నువ్వు ఏమి చేస్తావు?",
    isLast: false,
    showCommunity: false,
    escalation: false,
    choices: [
      { label: "మళ్ళీ ఇలాంటి setup వస్తుందని wait చేస్తాను", reflection: "Wait చేయడం తెలుసు అని అనిపిస్తుంది. కానీ screen ముందు కూర్చుని next candle చూస్తూ — నిజంగా wait చేయగలిగావా? తెలుసు అనడం వేరు. ఆ క్షణంలో execute చేయడం వేరు." },
      { label: "Price వెళ్ళిన direction లోనే enter అవుతాను", reflection: "Trade miss అవ్వలేదు నువ్వు — opportunity వెళ్ళిపోయిందని feel అయ్యావు. ఆ feeling చాలా తీవ్రంగా ఉంటుంది. అందుకే late entry తీసుకుంటావు. Market చూసి చేశావా — లేదా miss అయిన feeling నుండి చేశావా?" },
      { label: "Frustrated అయి screen నుండి దూరంగా వెళ్తాను", reflection: "Market నీకు ఏదైనా ఇవ్వాలని నువ్వు expect చేస్తున్నావు. అది ఇవ్వలేదు కాబట్టి frustration వస్తోంది. కానీ market నీకు ఏమీ belong కాదు. ఆ expectation ఎక్కడ నుండి వస్తోందో అది అర్థం చేసుకోవడమే అసలు పని." },
    ],
  },
  {
    id: 1,
    situation: "SL hit అయింది. Loss వచ్చింది. కొద్దిసేపటికి market నీ direction లోనే వెళ్ళింది — నువ్వు too early గా exit అయ్యావు.",
    question: "నీ మనసులో ఇప్పుడు ఏముంది?",
    isLast: false,
    showCommunity: false,
    escalation: false,
    choices: [
      { label: "వెంటనే మళ్ళీ enter చేస్తాను — trend ఇంకా ఉంది కదా", reflection: "Loss వచ్చిన వెంటనే re-enter చేయడం — capital recover కోసం కాదు. ఇది తప్పు జరిగిందనే feeling ని వదిలించుకోవడానికి. Market కి తేడా తెలియదు. నీ mind కి తెలుసు — ఆ క్షణంలో నువ్వు trade చేస్తున్నావా, reaction చేస్తున్నావా?" },
      { label: "ఈ రోజు ఇక trade వద్దు — mind సరిగా లేదు", reflection: "ఆపడం తెలివైన పని లా కనిపిస్తుంది. కానీ rule వల్ల ఆపావా — లేదా pain వల్ల ఆపావా? Rule వల్ల ఆపడం discipline. Pain వల్ల ఆపడం — తర్వాత trade లో compounded గా తిరిగి వస్తుంది." },
      { label: "Journal లో రాసుకుని next setup కోసం wait చేస్తాను", reflection: "ఇది సరైన direction. కానీ ఒక్కసారి నిజాయితీగా చెప్పు — last పది losses లో ఎన్నిసార్లు actually journal రాశావు? సరైన choice తెలుసు. దాన్ని habit చేసుకోవడమే ఇంకా జరగలేదు." },
    ],
  },
  {
    id: 2,
    situation: "వరుసగా మూడు trades లో loss వచ్చింది. ఒక పరిచయస్థుడు ఒక setup share చేశాడు — 'ఈసారి confirm' అన్నాడు.",
    question: "నువ్వు ఏమి చేస్తావు?",
    isLast: false,
    showCommunity: false,
    escalation: true,
    escalationLine: "ఒక్క క్షణం ఆగు.\n\nమొదటి రెండు situations లో నీ reaction గుర్తు చేసుకో.\n\nఇది మూడోసారి — ఒకే pattern నిన్ను follow చేస్తోంది.",
    choices: [
      { label: "Try చేస్తాను — ఏమైనా recover అవ్వాలి కదా", reflection: "మూడు losses తర్వాత వేరేవాళ్ళ setup నమ్మడం — weakness కాదు. నీ దగ్గర స్పష్టత లేదు అనే signal. Own system లేనప్పుడు ఎవరైనా 'sure' అంటే అది hope లా కనిపిస్తుంది. ఆ moment లో నీ judgment నీ దగ్గర ఉంటుందా?" },
      { label: "వద్దు — నా plan follow చేస్తాను", reflection: "నీ plan clearly defined గా ఉందా? మూడు losses తర్వాత కూడా unchanged గా ఉందా? నిజంగా అయితే నువ్వు ఇప్పటికే సరైన దారిలో ఉన్నావు. కానీ 'plan ఉంది' అనే feeling మాత్రమే ఉంటే — అది వేరే మాట." },
      { label: "Setup analyze చేసి decide అవుతాను", reflection: "మూడు losses తర్వాత analysis objective గా ఉంటుందా? ఆ moment లో — setup good గా కనిపించడం అది actually good అయినందుకేనా, లేదా recover అవ్వాలని ఉన్నందుకేనా? ఆ రెండింటి మధ్య తేడా చెప్పగలవా?" },
    ],
  },
  {
    id: 3,
    situation: "ఈ రోజు పెద్ద profit వచ్చింది. Market ఇంకా open లో ఉంది. మరో setup కనిపించింది.",
    question: "నువ్వు ఏమి చేస్తావు?",
    isLast: true,
    showCommunity: true, // ONLY last question shows community line
    escalation: false,
    choices: [
      { label: "Enter చేస్తాను — ఈ రోజు అన్నీ work అవుతున్నాయి", reflection: "Profit వచ్చిన రోజు అన్నీ clear గా కనిపిస్తాయి. Setup better గా కనిపిస్తుంది. కానీ ఆ confidence నీ edge నుండి వస్తోందా — లేదా ఆ రోజు mood నుండి వస్తోందా? ఆ రెండూ వేరు. చాలా వేరు." },
      { label: "Target hit అయింది — ఇక్కడితో ఆపుతాను", reflection: "Discipline లా కనిపిస్తుంది. కానీ target miss అయిన రోజు, loss లో ఉన్న రోజు కూడా ఇంత clearly ఆపగలవా? నిజమైన discipline good days లో easy. Bad days లో అదే test అవుతుంది." },
      { label: "Setup quality చూసి decide చేస్తాను", reflection: "Setup evaluate చేయడం సరైనదే. కానీ profit లో ఉన్నప్పుడు ఆ evaluation neutral గా ఉంటుందా? ₹ profit వెనక ఆ setup కొంచెం better గా కనిపిస్తోందా? ఆ subtle bias అక్కడే తేడా తెచ్చి పెడుతుంది." },
    ],
  },
];

// ─── CSS ─────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:wght@400;500;600&display=swap');
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  html { scroll-behavior:smooth; }
  body { background:#05050A; }
  ::-webkit-scrollbar { width:3px; }
  ::-webkit-scrollbar-thumb { background:rgba(201,168,76,0.22); border-radius:2px; }
  p,span,div,h1,h2,h3,h4 { -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility; }

  .btn-choice {
    width:100%; text-align:left; cursor:pointer;
    background:rgba(201,168,76,0.04);
    border:1px solid rgba(201,168,76,0.16);
    border-radius:7px; padding:20px 22px;
    display:flex; align-items:center; gap:16px;
    transition:all 0.22s ease;
  }
  .btn-choice:hover {
    border-color:rgba(201,168,76,0.52);
    background:rgba(201,168,76,0.09);
    transform:translateX(6px);
  }
  .btn-gold { cursor:pointer; transition:all 0.28s ease; }
  .btn-gold:hover { transform:translateY(-3px); box-shadow:0 12px 40px rgba(201,168,76,0.28); }
  .btn-out  { cursor:pointer; transition:all 0.28s ease; }
  .btn-out:hover  { background:rgba(201,168,76,0.07)!important; }

  /* Page transitions */
  .page-enter { animation: pageIn 0.55s ease forwards; }
  @keyframes pageIn {
    from { opacity:0; transform:translateY(22px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes fadeIn { from{opacity:0}to{opacity:1} }
  @keyframes float  { 0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)} }
  @keyframes breathe { 0%,100%{opacity:0.07}50%{opacity:0.15} }
  @keyframes scrollAnim { 0%,100%{opacity:0.3;transform:translateY(0)}50%{opacity:0.9;transform:translateY(7px)} }
  @keyframes lineGrow { from{height:0;opacity:0}to{height:56px;opacity:1} }
  @keyframes ritualLine { from{opacity:0;letter-spacing:8px}to{opacity:1;letter-spacing:normal} }

  .float { animation:float 3.5s ease-in-out infinite; }
  .breathe { animation:breathe 5s ease-in-out infinite; }
  .scroll-anim { animation:scrollAnim 2.5s ease-in-out infinite; }
  .ritual-line { animation:ritualLine 0.9s ease forwards; }
`;

// ─── HELPERS ─────────────────────────────────────────────────
const GoldLine = () => (
  <div style={{display:"flex",alignItems:"center",gap:10,margin:"0 auto",width:130}}>
    <div style={{flex:1,height:1,background:`linear-gradient(to right,transparent,${G.gold})`}}/>
    <div style={{width:5,height:5,background:G.gold,transform:"rotate(45deg)",flexShrink:0}}/>
    <div style={{flex:1,height:1,background:`linear-gradient(to left,transparent,${G.gold})`}}/>
  </div>
);
const Tag = ({children}) => (
  <span style={{fontSize:9,letterSpacing:5,color:`${G.gold}85`,textTransform:"uppercase",display:"block",marginBottom:14}}>
    {children}
  </span>
);

// ─── MAIN ─────────────────────────────────────────────────────
export default function MPV() {
  const [phase,   setPhase]   = useState(0);
  const [rs,      setRs]      = useState(0);   // ritual step
  const [heroIn,  setHeroIn]  = useState(false);
  const [curLang, setLang]    = useState("te"); // language toggle
  const [scIdx,   setScIdx]   = useState(0);
  const [choices, setChoices] = useState([]);   // [{si,ci}]
  const [refText, setRefText] = useState(null);
  const [showEsc, setShowEsc] = useState(false);
  const [escDone, setEscDone] = useState(false);
  const [scrolled,setScrolled]= useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const topRef = useRef(null);

  useEffect(()=>{
    const fn=()=>setScrolled(window.scrollY>50);
    window.addEventListener("scroll",fn);
    return()=>window.removeEventListener("scroll",fn);
  },[]);

  // Entry ritual auto-advance
  useEffect(()=>{
    if(phase!==0) return;
    if(rs===0){setTimeout(()=>setRs(1),1000);return;}
    if(rs===1){setTimeout(()=>setRs(2),2600);return;}
    if(rs===2){setTimeout(()=>setRs(3),2600);return;}
  },[phase,rs]);

  useEffect(()=>{ if(phase===1) setTimeout(()=>setHeroIn(true),150); },[phase]);

  const top = () => topRef.current?.scrollIntoView({behavior:"smooth"});

  const goTo = (p) => {
    setTransitioning(true);
    setTimeout(()=>{
      setPhase(p);
      setTransitioning(false);
      top();
    },250);
  };

  const goBack = () => {
    if(phase===4){
      if(refText){ setRefText(null); setShowEsc(false); return; }
      if(scIdx>0){ setScIdx(s=>s-1); return; }
      goTo(3); return;
    }
    goTo(phase-1);
  };

  const handleChoice = (ci) => {
    const sc = scenarios[scIdx];
    if(sc.escalation && !escDone){
      setChoices(p=>[...p,{si:`s${scIdx}`,ci}]);
      setShowEsc(true);
      return;
    }
    setChoices(p=>[...p,{si:`s${scIdx}`,ci}]);
    setRefText(sc.choices[ci].reflection);
  };

  const handleEscContinue = () => {
    const sc = scenarios[scIdx];
    const last = choices[choices.length-1];
    setEscDone(true);
    setShowEsc(false);
    setRefText(sc.choices[last.ci].reflection);
  };

  const handleNext = () => {
    setRefText(null);
    setShowEsc(false);
    setEscDone(false);
    if(scIdx<scenarios.length-1){ setScIdx(s=>s+1); top(); }
    else{ goTo(5); }
  };

  const profile = choices.length===4 ? buildProfile(choices) : null;

  const nav = {
    position:"fixed",top:0,left:0,right:0,zIndex:300,
    padding:"14px 28px",display:"flex",justifyContent:"space-between",alignItems:"center",
    background:scrolled?"rgba(5,5,10,0.97)":"transparent",
    borderBottom:scrolled?`1px solid ${G.goldDim}`:"none",
    transition:"all 0.4s",
  };
  const page = {maxWidth:720,margin:"0 auto",padding:"0 22px"};
  const sec  = {padding:"108px 0 72px"};

  // ── PHASE 0: ENTRY RITUAL ────────────────────────────────────
  const EntryRitual = () => (
    <div style={{minHeight:"100vh",background:G.black,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",padding:"0 24px"}}>
      <div style={{maxWidth:540}}>
        {rs>=1&&(
          <p className="ritual-line" key="r1" style={{fontFamily:serif,fontSize:"clamp(16px,2.4vw,23px)",color:G.soft,fontStyle:"italic",lineHeight:2,marginBottom:32}}>
            "Profit గురించి ఆలోచించే ముందు…"
          </p>
        )}
        {rs>=2&&(
          <p className="page-enter" key="r2" style={{fontFamily:serif,fontSize:"clamp(18px,2.8vw,27px)",color:G.smoke,lineHeight:1.9,marginBottom:32}}>
            "Loss ని అర్థం చేసుకున్నావా?"
          </p>
        )}
        {rs>=3&&(
          <>
            <p className="page-enter" key="r3" style={{fontFamily:serif,fontSize:"clamp(18px,2.8vw,27px)",color:G.gold,fontWeight:600,lineHeight:1.8,marginBottom:52}}>
              "Loss ని accept చేయలేని వాడు…<br/>market లో survive అవ్వలేడు."
            </p>
            <div className="page-enter" style={{display:"flex",flexDirection:"column",gap:14,alignItems:"center"}}>
              <button className="btn-gold" onClick={()=>goTo(1)}
                style={{padding:"16px 44px",background:`linear-gradient(135deg,${G.gold},#9A7020)`,color:G.black,border:"none",borderRadius:2,fontSize:12,fontWeight:700,letterSpacing:2,textTransform:"uppercase",width:"100%",maxWidth:380}}>
                అవును — నేను నిజం చూడటానికి సిద్ధంగా ఉన్నాను
              </button>
              <button className="btn-out" onClick={()=>{}}
                style={{padding:"13px 44px",background:"transparent",color:G.soft,border:"1px solid rgba(240,237,228,0.14)",borderRadius:2,fontSize:11,letterSpacing:2,textTransform:"uppercase",width:"100%",maxWidth:380}}>
                వద్దు… తర్వాత వస్తాను
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  // ── PHASE 1: HERO ────────────────────────────────────────────
  const Hero = () => (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",inset:0,backgroundImage:`linear-gradient(${G.goldDim} 1px,transparent 1px),linear-gradient(90deg,${G.goldDim} 1px,transparent 1px)`,backgroundSize:"58px 58px",opacity:0.7}}/>
      <div className="breathe" style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:540,height:540,background:"radial-gradient(circle,rgba(201,168,76,0.11) 0%,transparent 65%)"}}/>
      <div style={{position:"relative",zIndex:1,padding:"0 24px",maxWidth:760,margin:"0 auto"}}>
        <div style={{opacity:heroIn?1:0,transform:heroIn?"none":"translateY(14px)",transition:"all 0.8s ease 0.1s"}}>
          <Tag>Mind Power Vaultt</Tag>
        </div>
        <div style={{opacity:heroIn?1:0,transform:heroIn?"none":"translateY(18px)",transition:"all 0.9s ease 0.4s"}}>
          <h1 style={{fontFamily:serif,fontSize:"clamp(28px,4.5vw,58px)",fontWeight:600,fontStyle:"italic",color:G.soft,lineHeight:1.3,marginBottom:16,letterSpacing:0.5}}>
            మార్కెట్ నిన్ను కిందకి లాగడం లేదు…
          </h1>
        </div>
        <div style={{opacity:heroIn?1:0,transform:heroIn?"none":"translateY(18px)",transition:"all 0.9s ease 0.8s"}}>
          <h2 style={{fontFamily:serif,fontSize:"clamp(30px,5vw,66px)",fontWeight:700,color:G.gold,lineHeight:1.1,marginBottom:24,letterSpacing:0.3}}>
            నీ decisions నిన్ను<br/>కిందకి లాగుతున్నాయి.
          </h2>
        </div>
        <div style={{opacity:heroIn?1:0,transform:heroIn?"none":"translateY(14px)",transition:"all 0.8s ease 1.1s"}}>
          <p style={{fontFamily:serif,fontSize:"clamp(15px,2vw,22px)",fontStyle:"italic",color:G.mid,lineHeight:1.85,marginBottom:44,maxWidth:540,margin:"0 auto 44px",letterSpacing:0.3}}>
            సమస్య మార్కెట్‌లో లేదు…<br/>
            అది నిన్ను నువ్వు ఎలా చూసుకుంటావో అక్కడ ఉంది.
          </p>
        </div>
        <div style={{opacity:heroIn?1:0,transition:"all 0.8s ease 1.4s"}}>
          <GoldLine/>
          <div style={{marginTop:48}}>
            <button className="btn-gold" onClick={()=>goTo(2)}
              style={{padding:"17px 54px",background:`linear-gradient(135deg,${G.gold},#9A7020)`,color:G.black,border:"none",borderRadius:2,fontSize:12,fontWeight:700,letterSpacing:3,textTransform:"uppercase"}}>
              నీ గురించి నీకు తెలుసా? →
            </button>
          </div>
        </div>
      </div>
      <div className="scroll-anim" style={{position:"absolute",bottom:36,display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
        <div style={{width:1,height:36,background:`linear-gradient(to bottom,transparent,${G.gold}70)`}}/>
        <span style={{fontSize:8,letterSpacing:4,color:`${G.gold}55`,textTransform:"uppercase"}}>scroll</span>
      </div>
    </div>
  );

  // ── PHASE 2: MIRROR ──────────────────────────────────────────
  const Mirror = () => {
    const cards=[
      {icon:"🔄",text:"వారానికోసారి strategy మారుస్తావు — problem system లో ఉందని నమ్ముతావు."},
      {icon:"💢",text:"Loss తర్వాత వెంటనే మళ్ళీ trade చేస్తావు — money కోసం కాదు, ego కోసం."},
      {icon:"🙏",text:"Stop Loss పెట్టావు — కానీ అది hit అవ్వకూడదని మనసులో కోరుకుంటున్నావు."},
      {icon:"📱",text:"ఇతరుల trades చూసి copy చేస్తావు. Result మాత్రం వేరేగా వస్తుందని ఆశ్చర్యపడతావు."},
      {icon:"🎲",text:"Profit వస్తే నీ తెలివి — loss వస్తే market తప్పు."},
      {icon:"🔒",text:"ఏమి చేయాలో తెలుసు. కానీ ఆ క్షణంలో చేయలేవు."},
    ];
    return(
      <div style={sec}>
        <div style={{textAlign:"center",marginBottom:60}}>
          <Tag>The Mirror</Tag>
          <h2 style={{fontFamily:serif,fontSize:"clamp(28px,4vw,52px)",color:G.smoke,marginBottom:18,letterSpacing:0.5}}>ఇది నీ కథేనా?</h2>
          <p style={{color:G.mid,fontSize:16,letterSpacing:1,lineHeight:1.8,fontStyle:"italic"}}>
            "చదివేటప్పుడు ఇది నాకే అనిపిస్తే… అదే నీ answer."
          </p>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(270px,1fr))",gap:14,marginBottom:44}}>
          {cards.map((c,i)=>(
            <div key={i} style={{background:`${G.gold}04`,border:`1px solid ${G.goldDim}`,borderRadius:7,padding:"22px 18px",display:"flex",gap:14,alignItems:"flex-start",transition:"border-color 0.2s"}}>
              <span style={{fontSize:24,flexShrink:0}}>{c.icon}</span>
              <p style={{color:G.mid,fontSize:14,lineHeight:1.9,letterSpacing:0.3}}>{c.text}</p>
            </div>
          ))}
        </div>
        <div style={{textAlign:"center",padding:"28px 24px",border:`1px solid ${G.goldDim}`,borderRadius:7,background:`${G.gold}04`,marginBottom:52}}>
          <p style={{fontFamily:serif,fontSize:"clamp(17px,2.2vw,24px)",fontStyle:"italic",color:G.gold,lineHeight:1.85}}>
            "ఇది failure కాదు. ఇది train కాని mind.<br/>దాన్ని train చేయవచ్చు."
          </p>
        </div>
        <div style={{textAlign:"center"}}>
          <p style={{fontSize:13,letterSpacing:1.5,color:G.mid,marginBottom:28}}>నీకు నీ గురించి మరింత తెలుసుకోవాలని ఉందా?</p>
          <button className="btn-gold" onClick={()=>goTo(3)}
            style={{padding:"16px 48px",background:`linear-gradient(135deg,${G.gold},#9A7020)`,color:G.black,border:"none",borderRadius:2,fontSize:11,fontWeight:700,letterSpacing:3,textTransform:"uppercase"}}>
            లోపలికి వెళ్ళు →
          </button>
        </div>
      </div>
    );
  };

  // ── PHASE 3: INTRO ───────────────────────────────────────────
  const Intro = () => (
    <div style={{...sec,textAlign:"center"}}>
      <Tag>Self-Discovery Engine</Tag>
      <div style={{width:1,height:0,background:`linear-gradient(to bottom,transparent,${G.gold})`,margin:"0 auto 32px",animation:"lineGrow 0.8s ease 0.2s forwards"}}/>
      <h2 style={{fontFamily:serif,fontSize:"clamp(26px,4vw,50px)",color:G.smoke,marginBottom:20,lineHeight:1.3}}>
        ఇది test కాదు.<br/>
        <span style={{color:G.gold,fontStyle:"italic"}}>ఇది నీ mirror.</span>
      </h2>
      <p style={{color:G.mid,fontSize:16,lineHeight:2,maxWidth:480,margin:"0 auto 14px",letterSpacing:0.3}}>Score రాదు. Marks రావు. Right/Wrong లేదు.</p>
      <p style={{color:G.soft,fontSize:14,lineHeight:2,maxWidth:480,margin:"0 auto 48px"}}>4 real situations వస్తాయి.<br/>నీ honest reaction select చేయి.<br/>నీ behavior ని నేను reflect చేస్తాను.</p>
      <GoldLine/>
      <div style={{marginTop:44,display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
        {["4 Situations","నీ Reactions","Behavior Analysis","నీ Profile"].map((s,i)=>(
          <span key={i} style={{padding:"7px 16px",border:`1px solid ${G.goldDim}`,borderRadius:2,fontSize:9,letterSpacing:2,color:G.mid,textTransform:"uppercase"}}>{s}</span>
        ))}
      </div>
      <div style={{marginTop:52}}>
        <button className="btn-gold" onClick={()=>goTo(4)}
          style={{padding:"17px 54px",background:`linear-gradient(135deg,${G.gold},#9A7020)`,color:G.black,border:"none",borderRadius:2,fontSize:11,fontWeight:700,letterSpacing:3,textTransform:"uppercase"}}>
          Start →
        </button>
      </div>
    </div>
  );

  // ── PHASE 4: SCENARIOS ───────────────────────────────────────
  const Scenario = () => {
    const sc = scenarios[scIdx];
    const prog = (scIdx/scenarios.length)*100;
    return(
      <div style={sec}>
        {/* Progress */}
        <div style={{marginBottom:44}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:9}}>
            <span style={{fontSize:9,letterSpacing:3,color:`${G.gold}65`,textTransform:"uppercase"}}>Situation {scIdx+1} / {scenarios.length}</span>
            <span style={{fontSize:9,color:G.soft,letterSpacing:1}}>{Math.round(prog)}%</span>
          </div>
          <div style={{height:1,background:G.goldDim}}>
            <div style={{height:"100%",width:`${prog}%`,background:`linear-gradient(to right,${G.gold}70,${G.gold})`,transition:"width 0.5s ease"}}/>
          </div>
        </div>

        {/* Escalation */}
        {showEsc&&(
          <div className="page-enter" style={{padding:"40px 28px",background:G.dark2,border:`1px solid ${G.gold}35`,borderRadius:8,textAlign:"center",marginBottom:32}}>
            <div style={{width:1,height:40,background:`linear-gradient(to bottom,transparent,${G.gold})`,margin:"0 auto 28px"}}/>
            <p style={{fontFamily:serif,fontSize:"clamp(18px,2.5vw,26px)",color:G.smoke,lineHeight:2,whiteSpace:"pre-line",marginBottom:24,letterSpacing:0.3}}>
              {sc.escalationLine}
            </p>
            <p style={{fontSize:14,color:`${G.gold}85`,fontStyle:"italic",marginBottom:36}}>ఇది coincidence కాదు. ఇది pattern.</p>
            <button className="btn-gold" onClick={handleEscContinue}
              style={{padding:"14px 38px",background:`linear-gradient(135deg,${G.gold},#9A7020)`,color:G.black,border:"none",borderRadius:2,fontSize:10,fontWeight:700,letterSpacing:3,textTransform:"uppercase"}}>
              చూపించు →
            </button>
          </div>
        )}

        {/* Question */}
        {!showEsc&&!refText&&(
          <>
            <div style={{marginBottom:36,padding:"28px 26px",background:G.dark2,border:`1px solid ${G.goldDim}`,borderRadius:8}}>
              <Tag>Situation</Tag>
              <p style={{fontFamily:serif,fontSize:"clamp(17px,2.3vw,24px)",color:G.smoke,lineHeight:1.95,letterSpacing:0.3}}>
                {sc.situation}
              </p>
            </div>
            <p style={{fontSize:13,letterSpacing:2,color:G.mid,textAlign:"center",marginBottom:22,textTransform:"uppercase"}}>
              {sc.question}
            </p>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {sc.choices.map((c,i)=>(
                <button key={i} className="btn-choice" onClick={()=>handleChoice(i)}>
                  <div style={{width:28,height:28,borderRadius:"50%",border:`1px solid ${G.goldDim}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{fontSize:10,color:`${G.gold}80`,fontWeight:600}}>{String.fromCharCode(65+i)}</span>
                  </div>
                  <span style={{color:G.mid,fontSize:15,lineHeight:1.75,letterSpacing:0.2}}>{c.label}</span>
                </button>
              ))}
            </div>
            <p style={{marginTop:22,textAlign:"center",fontSize:11,color:G.vsoft,letterSpacing:1.5}}>
              Nobody is watching. But you are.
            </p>
          </>
        )}

        {/* Reflection */}
        {refText&&!showEsc&&(
          <div className="page-enter">
            <div style={{textAlign:"center",marginBottom:28}}>
              <Tag>Mirror</Tag>
              <div style={{width:1,height:40,background:`linear-gradient(to bottom,transparent,${G.gold})`,margin:"0 auto"}}/>
            </div>
            <div style={{padding:"32px 28px",background:G.dark2,border:`1px solid ${G.gold}25`,borderRadius:8,marginBottom:24}}>
              <p style={{fontFamily:serif,fontSize:"clamp(17px,2.3vw,24px)",color:G.smoke,lineHeight:2,fontStyle:"italic",letterSpacing:0.3}}>
                "{refText}"
              </p>
            </div>

            {/* Community line ONLY on last question */}
            {sc.showCommunity&&(
              <div style={{padding:"16px 20px",background:`${G.gold}07`,border:`1px solid ${G.goldDim}`,borderRadius:5,display:"flex",alignItems:"center",gap:14,marginBottom:24}}>
                <span style={{fontSize:22,flexShrink:0}}>👥</span>
                <p style={{fontSize:14,color:G.mid,lineHeight:1.8}}>
                  <span style={{color:G.gold,fontWeight:600}}>చాలా మంది traders</span> ఇలాంటి situations లో ఇలాగే feel అవుతారు. నువ్వు ఒంటరివి కాదు — కానీ దీన్ని తెలుసుకోవడం మాత్రమే చాలదు.
                </p>
              </div>
            )}

            <div style={{textAlign:"center"}}>
              <button className="btn-gold" onClick={handleNext}
                style={{padding:"15px 44px",background:`linear-gradient(135deg,${G.gold},#9A7020)`,color:G.black,border:"none",borderRadius:2,fontSize:11,fontWeight:700,letterSpacing:3,textTransform:"uppercase"}}>
                {scIdx<scenarios.length-1?"Continue →":"నా Analysis చూడు →"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── PHASE 5: BEHAVIOR ANALYSIS RESULT ───────────────────────
  const Result = () => {
    if(!profile) return null;
    const {primaryLine, coreInsight, warningLine, strengthLine, behaviorLines} = profile;

    return(
      <div style={{...sec,textAlign:"center"}}>
        <Tag>నీ Behavior Analysis</Tag>
        <div style={{width:1,height:52,background:`linear-gradient(to bottom,transparent,${G.gold})`,margin:"0 auto 32px"}}/>

        {/* Situation checkpoints */}
        <div style={{display:"flex",justifyContent:"center",gap:10,marginBottom:40}}>
          {[0,1,2,3].map(i=>{
            const t=traitMap[`s${i}_${choices[i]?.ci}`];
            return(
              <div key={i} style={{textAlign:"center"}}>
                <div style={{width:46,height:46,borderRadius:"50%",
                  background:t?.neg?"rgba(139,26,26,0.18)":"rgba(107,142,107,0.15)",
                  border:`2px solid ${t?.neg?"rgba(139,26,26,0.45)":"rgba(107,142,107,0.4)"}`,
                  display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 6px",fontSize:18}}>
                  {t?.neg?"⚠️":"✓"}
                </div>
                <div style={{fontSize:9,color:G.soft,letterSpacing:1}}>S{i+1}</div>
              </div>
            );
          })}
        </div>

        {/* Primary insight */}
        <div style={{padding:"32px 28px",background:G.dark2,border:`1px solid ${G.gold}30`,borderRadius:8,marginBottom:20,maxWidth:620,margin:"0 auto 20px",textAlign:"left"}}>
          <p style={{fontSize:9,letterSpacing:4,color:`${G.gold}80`,textTransform:"uppercase",marginBottom:16}}>Primary Pattern Detected</p>
          <h2 style={{fontFamily:serif,fontSize:"clamp(17px,2.5vw,26px)",color:G.smoke,lineHeight:1.75,marginBottom:18,whiteSpace:"pre-line",letterSpacing:0.3}}>
            {primaryLine}
          </h2>
          <p style={{fontFamily:serif,fontSize:"clamp(14px,1.9vw,18px)",color:G.mid,lineHeight:2,fontStyle:"italic"}}>
            "{coreInsight}"
          </p>
        </div>

        {/* Per-situation breakdown */}
        <div style={{maxWidth:620,margin:"0 auto 20px",textAlign:"left"}}>
          <p style={{fontSize:9,letterSpacing:4,color:`${G.gold}70`,textTransform:"uppercase",marginBottom:16,textAlign:"center"}}>
            4 Situations లో నీ Behavior
          </p>
          {behaviorLines.map((line,i)=>(
            line ? (
              <div key={i} style={{display:"flex",gap:14,alignItems:"flex-start",marginBottom:12,padding:"14px 18px",background:`${G.gold}04`,border:`1px solid ${G.goldDim}`,borderRadius:6}}>
                <span style={{fontSize:11,color:`${G.gold}85`,fontWeight:700,flexShrink:0,marginTop:2}}>S{i+1}</span>
                <p style={{fontSize:14,color:G.mid,lineHeight:1.8}}>{line}</p>
              </div>
            ) : null
          ))}
        </div>

        {/* Strength */}
        {strengthLine&&(
          <div style={{maxWidth:620,margin:"0 auto 16px",padding:"18px 22px",background:"rgba(107,142,107,0.07)",border:"1px solid rgba(107,142,107,0.22)",borderRadius:6,textAlign:"left"}}>
            <p style={{fontSize:9,letterSpacing:3,color:"rgba(107,142,107,0.85)",textTransform:"uppercase",marginBottom:10}}>Hidden Strength</p>
            <p style={{fontSize:14,color:G.mid,lineHeight:1.8}}>{strengthLine}</p>
          </div>
        )}

        {/* Warning */}
        {warningLine&&(
          <div style={{maxWidth:620,margin:"0 auto 32px",padding:"18px 22px",background:"rgba(139,26,26,0.07)",border:"1px solid rgba(139,26,26,0.22)",borderRadius:6,textAlign:"left"}}>
            <p style={{fontSize:9,letterSpacing:3,color:"rgba(200,80,80,0.8)",textTransform:"uppercase",marginBottom:10}}>Notice చేయి</p>
            <p style={{fontSize:14,color:G.mid,lineHeight:1.8}}>{warningLine}</p>
          </div>
        )}

        {/* Closing */}
        <div style={{maxWidth:580,margin:"0 auto 40px",padding:"26px 28px",border:`1px solid ${G.gold}35`,borderRadius:7,background:`${G.gold}06`}}>
          <p style={{fontFamily:serif,fontSize:"clamp(16px,2vw,21px)",color:G.smoke,lineHeight:2,letterSpacing:0.3}}>
            "నువ్వు ఇప్పుడు నీ గురించి చదివావు.<br/>
            <span style={{color:G.gold}}>ఇప్పటి నుండి నీ trading వేరేగా మొదలవుతుంది.</span>"
          </p>
        </div>

        <button className="btn-gold" onClick={()=>goTo(6)}
          style={{padding:"17px 52px",background:`linear-gradient(135deg,${G.gold},#9A7020)`,color:G.black,border:"none",borderRadius:2,fontSize:11,fontWeight:700,letterSpacing:3,textTransform:"uppercase"}}>
          నా Analysis Save చేసుకో →
        </button>
      </div>
    );
  };

  // ── PHASE 6: LEAD CAPTURE ────────────────────────────────────
  const LeadCapture = () => {
    const [form, setForm]       = useState({name:"", whatsapp:"", level:""});
    const [errors, setErrors]   = useState({});
    const [sending, setSending] = useState(false);

    const levels = [
      { val:"beginner",     te:"Beginner — Trading start చేశాను",      en:"Beginner — Just started trading" },
      { val:"struggling",   te:"Struggling — Losses అవుతున్నాయి",        en:"Struggling — Taking regular losses" },
      { val:"inconsistent", te:"Inconsistent — Kabbu kabbu profit",      en:"Inconsistent — Sometimes profit, sometimes loss" },
      { val:"experienced",  te:"Experienced — System కోసం వెతుకుతున్నా", en:"Experienced — Looking for a system" },
    ];

    const validate = () => {
      const e = {};
      if (!form.name.trim())     e.name     = curLang==="te" ? "పేరు రాయి" : "Enter your name";
      if (!form.whatsapp.trim() || form.whatsapp.replace(/\D/g,"").length < 10)
                                  e.whatsapp = curLang==="te" ? "Valid WhatsApp number రాయి" : "Enter valid WhatsApp number";
      if (!form.level)            e.level    = curLang==="te" ? "Level select చేయి" : "Select your level";
      return e;
    };

    const getPatternSummary = () => {
      if (!profile) return "";
      const lines = profile.behaviorLines.filter(Boolean).join(" | ");
      return `Pattern: ${profile.primaryLine?.split("\n")[0] || ""} | ${lines}`;
    };

    const handleSubmit = () => {
      const e = validate();
      if (Object.keys(e).length > 0) { setErrors(e); return; }
      setSending(true);

      // ── Build WhatsApp message to Cherry ──────────────────────
      // REPLACE THE NUMBER BELOW WITH YOUR ACTUAL WHATSAPP NUMBER
      const CHERRY_WHATSAPP = "+919059181616"; // ← Cherry number ఇక్కడ పెట్టు
      const msg = encodeURIComponent(
`🔔 *New MPV Lead — Self-Discovery Engine*

👤 *Name:* ${form.name}
📱 *WhatsApp:* ${form.whatsapp}
📊 *Level:* ${form.level}

🧠 *Analysis Summary:*
${getPatternSummary()}

_Via mindpowervaultt.com_`
      );

      setTimeout(() => {
        setSending(false);
        // Open WhatsApp with pre-filled message
        window.open(`https://wa.me/${CHERRY_WHATSAPP}?text=${msg}`, "_blank");
        goTo(7);
      }, 1200);
    };

    const inputStyle = (field) => ({
      width:"100%", padding:"14px 18px",
      background:"rgba(201,168,76,0.04)",
      border:`1px solid ${errors[field] ? "rgba(200,80,80,0.5)" : G.goldDim}`,
      borderRadius:6, color:G.smoke, fontSize:15,
      fontFamily:sans, outline:"none",
      transition:"border-color 0.2s",
    });

    const labelStyle = {
      fontSize:10, letterSpacing:3, color:`${G.gold}80`,
      textTransform:"uppercase", display:"block", marginBottom:8,
    };

    return (
      <div style={{...sec}}>
        <div style={{textAlign:"center", marginBottom:52}}>
          <Tag>నీ Analysis Save చేసుకో</Tag>
          <div style={{width:1,height:40,background:`linear-gradient(to bottom,transparent,${G.gold})`,margin:"0 auto 28px"}}/>
          <h2 style={{fontFamily:serif,fontSize:"clamp(24px,3.5vw,44px)",color:G.smoke,marginBottom:16,lineHeight:1.3}}>
            {curLang==="te"
              ? <>"నీ analysis నీకు పంపిస్తా.<br/><span style={{color:G.gold}}>నీ పేరు చెప్పు.</span>"</>
              : <>"I'll send your analysis.<br/><span style={{color:G.gold}}>Tell me who you are.</span>"</>
            }
          </h2>
          <p style={{color:G.mid,fontSize:14,lineHeight:1.9}}>
            {curLang==="te"
              ? "నీ report WhatsApp కి వస్తుంది. Cherry personally review చేస్తాడు."
              : "Your report comes to WhatsApp. Cherry personally reviews it."
            }
          </p>
        </div>

        <div style={{maxWidth:520,margin:"0 auto",display:"flex",flexDirection:"column",gap:24}}>

          {/* Name */}
          <div>
            <label style={labelStyle}>{curLang==="te" ? "నీ పేరు" : "Your Name"}</label>
            <input
              type="text"
              value={form.name}
              placeholder={curLang==="te" ? "పేరు రాయి..." : "Enter your name..."}
              onChange={e=>{ setForm(f=>({...f,name:e.target.value})); setErrors(r=>({...r,name:""})); }}
              style={inputStyle("name")}
            />
            {errors.name && <p style={{color:"rgba(200,80,80,0.8)",fontSize:12,marginTop:6}}>{errors.name}</p>}
          </div>

          {/* WhatsApp */}
          <div>
            <label style={labelStyle}>{curLang==="te" ? "WhatsApp Number" : "WhatsApp Number"}</label>
            <input
              type="tel"
              value={form.whatsapp}
              placeholder={curLang==="te" ? "10-digit number రాయి..." : "Enter 10-digit number..."}
              onChange={e=>{ setForm(f=>({...f,whatsapp:e.target.value})); setErrors(r=>({...r,whatsapp:""})); }}
              style={inputStyle("whatsapp")}
            />
            {errors.whatsapp && <p style={{color:"rgba(200,80,80,0.8)",fontSize:12,marginTop:6}}>{errors.whatsapp}</p>}
          </div>

          {/* Experience Level */}
          <div>
            <label style={labelStyle}>{curLang==="te" ? "నీ Trading Experience" : "Your Trading Experience"}</label>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {levels.map(l=>(
                <button key={l.val} onClick={()=>{ setForm(f=>({...f,level:l.val})); setErrors(r=>({...r,level:""})); }}
                  style={{
                    padding:"14px 18px", textAlign:"left", cursor:"pointer",
                    background: form.level===l.val ? `rgba(201,168,76,0.12)` : `rgba(201,168,76,0.03)`,
                    border: `1px solid ${form.level===l.val ? G.gold : G.goldDim}`,
                    borderRadius:6, color: form.level===l.val ? G.smoke : G.mid,
                    fontSize:14, fontFamily:sans, transition:"all 0.2s",
                    display:"flex", alignItems:"center", gap:12,
                  }}>
                  <div style={{
                    width:18, height:18, borderRadius:"50%", flexShrink:0,
                    border:`2px solid ${form.level===l.val ? G.gold : G.goldDim}`,
                    background: form.level===l.val ? G.gold : "transparent",
                    transition:"all 0.2s",
                  }}/>
                  {curLang==="te" ? l.te : l.en}
                </button>
              ))}
            </div>
            {errors.level && <p style={{color:"rgba(200,80,80,0.8)",fontSize:12,marginTop:6}}>{errors.level}</p>}
          </div>

          {/* Submit */}
          <div style={{marginTop:8}}>
            <button className="btn-gold" onClick={handleSubmit}
              style={{
                width:"100%", padding:"18px",
                background: sending ? "rgba(201,168,76,0.4)" : `linear-gradient(135deg,${G.gold},#9A7020)`,
                color:G.black, border:"none", borderRadius:4,
                fontSize:13, fontWeight:700, letterSpacing:2, textTransform:"uppercase",
                fontFamily:sans, cursor: sending ? "not-allowed" : "pointer",
              }}>
              {sending
                ? (curLang==="te" ? "పంపిస్తున్నాను..." : "Sending...")
                : (curLang==="te" ? "నా Report పంపించు →" : "Send My Report →")
              }
            </button>
            <p style={{textAlign:"center",marginTop:12,fontSize:11,color:G.vsoft,letterSpacing:1}}>
              {curLang==="te"
                ? "నీ details ఎవరికీ share చేయం. Spam రాదు."
                : "Your details are never shared. No spam."
              }
            </p>
          </div>
        </div>
      </div>
    );
  };

  // ── PHASE 7: CONVERSION ──────────────────────────────────────
  const Conversion = () => {
    const pat  = profile ? profile.primaryLine?.split("\n")[0] || "" : "";
    const neg  = profile ? profile.negCount : 0;

    const mentorshipMsg = encodeURIComponent(
      `నమస్కారం Cherry గారు, నేను MPV Self-Discovery Engine complete చేశాను. Mentorship గురించి మాట్లాడాలనుకుంటున్నాను.`
    );
    const communityMsg = encodeURIComponent(
      `నమస్కారం, నేను Mind Power Vaultt Free Community లో join అవ్వాలనుకుంటున్నాను.`
    );
    const CHERRY_WA = "+919059181616"; // ← Same number update చేయి

    return (
      <div style={{...sec, textAlign:"center"}}>

        {/* Personalized problem statement */}
        <div style={{marginBottom:52}}>
          <Tag>నీ తర్వాత Step</Tag>
          <div style={{width:1,height:40,background:`linear-gradient(to bottom,transparent,${G.gold})`,margin:"0 auto 32px"}}/>
          <h2 style={{fontFamily:serif,fontSize:"clamp(26px,3.5vw,46px)",color:G.smoke,lineHeight:1.4,marginBottom:20,maxWidth:620,margin:"0 auto 20px"}}>
            {curLang==="te"
              ? "నీ problem ఇప్పుడు clearly తెలుసు."
              : "Your problem is now clearly visible."
            }
          </h2>
          <p style={{fontFamily:serif,fontSize:"clamp(16px,2vw,22px)",color:G.mid,lineHeight:1.9,fontStyle:"italic",maxWidth:560,margin:"0 auto"}}>
            {curLang==="te"
              ? `"Analysis మాత్రమే చాలదు. దాన్ని fix చేయడానికి ఒక system కావాలి."`
              : `"Analysis alone isn't enough. Fixing it requires a system."`
            }
          </p>
        </div>

        {/* 3 truth cards */}
        <div style={{maxWidth:620,margin:"0 auto 52px",display:"flex",flexDirection:"column",gap:16}}>
          {[
            {
              num:"01",
              te:"నువ్వు chart చదవడం నేర్చుకున్నావు. కానీ chart చూసే moment లో నీ mind ని control చేయడం నేర్చుకోలేదు.",
              en:"You learned to read charts. But you haven't learned to control your mind while reading them.",
            },
            {
              num:"02",
              te:"Strategy correct గా ఉంటుంది. కానీ ఆ strategy execute చేసే వ్యక్తి correct గా లేడు — అందుకే results వేరేగా వస్తున్నాయి.",
              en:"The strategy is correct. But the person executing it isn't — that's why the results are different.",
            },
            {
              num:"03",
              te:"Mind Power Vault లో ఉన్నది strategies కాదు — ఈ gap ని close చేసే system. నీ specific pattern కి specific approach.",
              en:"Mind Power Vault doesn't teach strategies — it closes this gap. A specific approach for your specific pattern.",
            },
          ].map((c,i)=>(
            <div key={i} style={{display:"flex",gap:20,alignItems:"flex-start",padding:"22px 24px",background:G.dark2,border:`1px solid ${G.goldDim}`,borderRadius:8,textAlign:"left"}}>
              <span style={{fontFamily:serif,fontSize:32,color:`${G.gold}35`,fontWeight:700,flexShrink:0,lineHeight:1}}>{c.num}</span>
              <p style={{fontFamily:serif,fontSize:"clamp(14px,1.8vw,18px)",color:G.mid,lineHeight:1.9,fontStyle:"italic"}}>
                {curLang==="te" ? c.te : c.en}
              </p>
            </div>
          ))}
        </div>

        {/* Silent killer */}
        <div style={{maxWidth:460,margin:"0 auto 52px"}}>
          <GoldLine/>
          <div style={{marginTop:40}}>
            <p style={{fontFamily:serif,fontSize:"clamp(20px,3vw,34px)",color:G.smoke,lineHeight:1.75,marginBottom:4}}>
              {curLang==="te" ? "ఇప్పుడైనా…" : "From this point…"}
            </p>
            <p style={{fontFamily:serif,fontSize:"clamp(18px,2.5vw,28px)",color:G.soft,lineHeight:1.75,marginBottom:4,fontStyle:"italic"}}>
              {curLang==="te" ? "random గా trade చేయాలా…" : "do you trade randomly…"}
            </p>
            <p style={{fontFamily:serif,fontSize:"clamp(22px,3vw,36px)",color:G.gold,lineHeight:1.75,fontWeight:700}}>
              {curLang==="te" ? "లేదా conscious గా?" : "or consciously?"}
            </p>
          </div>
        </div>

        {/* CTA Box */}
        <div style={{position:"relative",maxWidth:560,margin:"0 auto",padding:"48px 32px",background:G.dark2,border:`1px solid ${G.goldDim}`,borderRadius:8}}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:`linear-gradient(to right,transparent,${G.gold},transparent)`}}/>

          <p style={{fontSize:12,letterSpacing:3,color:G.mid,textTransform:"uppercase",marginBottom:12}}>
            {curLang==="te" ? "Strategies అన్ని చోట్లా దొరుకుతాయి." : "Strategies are everywhere."}
          </p>
          <h2 style={{fontFamily:serif,fontSize:"clamp(26px,4vw,46px)",color:G.gold,fontWeight:700,marginBottom:12,letterSpacing:0.5}}>
            {curLang==="te" ? "Clarity ఇక్కడ మాత్రమే." : "Clarity is rare."}
          </h2>
          <p style={{fontSize:12,letterSpacing:2,color:G.mid,textTransform:"uppercase",marginBottom:40}}>
            {curLang==="te" ? "ఇది నీ స్థలం." : "This is where you find it."}
          </p>

          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {/* Primary — Mentorship */}
            <button className="btn-gold"
              onClick={()=>window.open(`https://wa.me/${CHERRY_WA}?text=${mentorshipMsg}`,"_blank")}
              style={{padding:"18px",background:`linear-gradient(135deg,${G.gold},#9A7020)`,color:G.black,border:"none",borderRadius:4,fontSize:13,fontWeight:700,letterSpacing:2,textTransform:"uppercase",fontFamily:sans,cursor:"pointer",width:"100%"}}>
              {curLang==="te" ? "🎯 Mentorship కి Apply చేయి" : "🎯 Apply for Mentorship"}
            </button>
            {/* Secondary — Free Community */}
            <button className="btn-out"
              onClick={()=>window.open(`https://wa.me/${CHERRY_WA}?text=${communityMsg}`,"_blank")}
              style={{padding:"16px",background:"transparent",color:G.gold,border:`1px solid ${G.gold}48`,borderRadius:4,fontSize:12,fontWeight:700,letterSpacing:2,textTransform:"uppercase",fontFamily:sans,cursor:"pointer",width:"100%"}}>
              {curLang==="te" ? "Free Community లో Join చేయి" : "Join Free Community"}
            </button>
          </div>

          <div style={{marginTop:24,padding:"16px",background:`${G.gold}06`,borderRadius:4,border:`1px solid ${G.goldDim}`}}>
            <p style={{fontSize:13,color:G.mid,lineHeight:1.8}}>
              {curLang==="te"
                ? "🔒 Limited seats. Cherry personally review చేస్తాడు. Random admission లేదు."
                : "🔒 Limited seats. Cherry personally reviews each application. No random admissions."
              }
            </p>
          </div>

          <div style={{position:"absolute",bottom:0,left:0,right:0,height:1,background:`linear-gradient(to right,transparent,${G.gold}35,transparent)`}}/>
        </div>

        {/* About Cherry */}
        <div style={{maxWidth:560,margin:"48px auto 0",display:"grid",gridTemplateColumns:"auto 1fr",gap:22,alignItems:"center",textAlign:"left",padding:"28px",background:G.dark2,border:`1px solid ${G.goldDim}`,borderRadius:8}}>
          <div className="float" style={{width:64,height:64,borderRadius:"50%",background:`linear-gradient(135deg,${G.gold}28,${G.gold}0a)`,border:`2px solid ${G.gold}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,flexShrink:0}}>🧘</div>
          <div>
            <Tag>Cherry</Tag>
            <p style={{fontSize:13,color:G.mid,lineHeight:1.9,marginBottom:8}}>
              {curLang==="te"
                ? "11 సంవత్సరాల trading. 7 సంవత్సరాల teaching. ఒక్కో trader తన గురించి తానే discover అయ్యేలా చేయడమే పని."
                : "11 years trading. 7 years teaching. Helping each trader discover the truth about themselves."
              }
            </p>
            <p style={{fontFamily:serif,fontSize:14,fontStyle:"italic",color:G.soft}}>
              {curLang==="te" ? `"Profit promise చేయను. Clarity ఇస్తాను."` : `"I don't promise profit. I offer clarity."`}
            </p>
          </div>
        </div>

        <p style={{marginTop:28,fontSize:9,color:G.vsoft,letterSpacing:1.5,lineHeight:2}}>
          Mind Power Vaultt · Trading Psychology Education<br/>
          {curLang==="te" ? "SEBI registered investment advice కాదు." : "Not SEBI registered investment advice."}
        </p>
      </div>
    );
  };

  const phases=[<EntryRitual/>,<Hero/>,<Mirror/>,<Intro/>,<Scenario/>,<Result/>,<LeadCapture/>,<Conversion/>];

  return(
    <div style={{background:G.black,color:G.smoke,fontFamily:sans,minHeight:"100vh",overflowX:"hidden"}}>
      <style>{css}</style>
      <div ref={topRef}/>

      {/* NAV */}
      {phase>0&&(
        <nav style={nav}>
          <div>
            <div style={{fontFamily:serif,fontSize:19,fontWeight:700,letterSpacing:3,color:G.gold,textTransform:"uppercase"}}>Mind Power Vaultt</div>
            <div style={{fontSize:10,letterSpacing:3,color:G.soft,textTransform:"uppercase",marginTop:3}}>Trading Psychology · Discipline · Clarity</div>
          </div>
          <div style={{display:"flex",gap:12,alignItems:"center"}}>
          {/* EN/TE toggle */}
          <div style={{display:"flex",background:"rgba(201,168,76,0.08)",border:`1px solid ${G.goldDim}`,borderRadius:40,padding:"3px"}}>
            {["te","en"].map(l=>(
              <button key={l} onClick={()=>setLang&&setLang(l)}
                style={{padding:"4px 12px",borderRadius:30,border:"none",cursor:"pointer",fontSize:9,fontWeight:700,letterSpacing:1,fontFamily:sans,background:curLang===l?G.gold:"transparent",color:curLang===l?G.black:G.soft,transition:"all 0.3s"}}>
                {l==="te"?"తె":"EN"}
              </button>
            ))}
          </div>
          {phase>1&&(
            <button className="btn-out" onClick={goBack}
              style={{background:"transparent",border:`1px solid ${G.goldDim}`,color:G.mid,padding:"6px 16px",borderRadius:2,fontSize:10,letterSpacing:2,textTransform:"uppercase"}}>
              ← వెనక్కి
            </button>
          )}
          </div>
        </nav>
      )}

      {/* PAGE with transition */}
      <div style={{opacity:transitioning?0:1,transform:transitioning?"translateY(12px)":"none",transition:"all 0.25s ease"}}>
        <div style={phase<=1?{}:{maxWidth:720,margin:"0 auto",padding:"0 22px"}}>
          <div className={transitioning?"":"page-enter"}>
            {phases[phase]}
          </div>
        </div>
      </div>
    </div>
  );
}
