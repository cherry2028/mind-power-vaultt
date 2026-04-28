export const G = {
  black: "#05050A", dark1: "#0A0A10", dark2: "#0F0F16",
  gold: "#C9A84C", goldDim: "rgba(201,168,76,0.18)",
  smoke: "#F5F2EA", mid: "#D0CCBF", soft: "#A8A498",
  vsoft: "rgba(240,237,228,0.32)",
  green: "#4CAF50", red: "#FF5252"
};

export const serif = "'Cormorant Garamond', Georgia, serif";
export const sans = "'DM Sans', sans-serif";

export const REVIEWS_KEY = "mpv_reviews_v1";

export const loadReviews = () => {
  const saved = localStorage.getItem(REVIEWS_KEY);
  return saved ? JSON.parse(saved) : [
    { id: 1, name: "Prasad Rao", city: "Vizag", stars: 5, te: "ముందు ఎప్పుడు లాభాల గురించి ఆలోచించేవాడిని. ఇప్పుడు నా ప్రాసెస్ మీద ఫోకస్ చేస్తున్నాను. మార్పు కనిపిస్తోంది.", en: "Earlier I only thought about profits. Now I focus on my process. Seeing the change." },
    { id: 2, name: "Suresh K.", city: "Hyderabad", stars: 5, te: "రిస్క్ మేనేజ్‌మెంట్ అంటే ఏంటో ఇక్కడ తెలిసింది. కే ప్రసాద్ గారికి ధన్యవాదాలు.", en: "Learned what real risk management is. Thanks to K Prasad." }
  ];
};

export const saveReviews = (r) => localStorage.setItem(REVIEWS_KEY, JSON.stringify(r));

export const SCENARIOS = [
  {
    id: 0, escalation: false, showCommunity: false,
    te: {
      sit: "మార్కెట్ open అయింది.\nSetup కనిపించింది.\nEntry కి సిద్ధంగా ఉన్నావు…\nఒక్క క్షణంలో —\nprice వెళ్ళిపోయింది.\nTrade…\nmiss అయింది.", q: "ఇప్పుడు నువ్వు ఏమి చేస్తావు?",
      ch: [
        { l: "మళ్ళీ ఇలాంటి setup వస్తుందని wait చేస్తాను", r: "Wait చేయడం తెలుసు అని అనిపిస్తుంది. కానీ screen ముందు కూర్చుని నిజంగా wait చేయగలిగావా? తెలుసు అనడం వేరు. ఆ క్షణంలో execute చేయడం వేరు." },
        { l: "Price వెళ్ళిన direction లోనే enter అవుతాను", r: "Trade miss అవ్వలేదు నువ్వు — opportunity వెళ్ళిపోయిందని feel అయ్యావు. ఆ feeling చాలా తీవ్రంగా ఉంటుంది. Market చూసి చేశావా — లేదా miss అయిన feeling నుండి చేశావా?" },
        { l: "Frustrate అయి screen నుండి దూరంగా వెళ్తాను", r: "Market నీకు ఇవ్వాలి అనిపిస్తోంది…\nఇవ్వలేదు కాబట్టి frustrate అవుతున్నావు.\nకానీ —\nmarket నీది కాదు.\nఅయితే ఈ expectation…\nనీది ఎలా అయింది?" },
      ]
    },
    en: {
      sit: "The market opened. You spotted a setup. You were ready to enter — in a split second the price moved. Trade missed.", q: "What do you do now?",
      ch: [
        { l: "I wait — a similar setup will come again", r: "You feel like you know how to wait. But sitting in front of the screen, watching the next candle — could you actually do it? Knowing is one thing. Executing in that moment is another." },
        { l: "I enter in the direction the price moved", r: "You didn't miss the trade — you felt like the opportunity left you. That feeling is intense. Did you trade based on the market — or based on the feeling of missing out?" },
        { l: "I get frustrated and step away from the screen", r: "You expected the market to give you something. It didn't — so frustration came. But the market owes you nothing. Understanding where that expectation comes from — that is the real work." },
      ]
    }
  },
  {
    id: 1, escalation: false, showCommunity: false,
    te: {
      sit: "Price stoploss దగ్గరకు వచ్చింది…\nనువ్వు ముందుగానే exit అయ్యావు…\nకొద్దిసేపటికి —\nmarket నీ direction లోనే వెళ్ళింది.", q: "నీ మనసులో ఇప్పుడు ఏముంది?",
      ch: [
        { l: "వెంటనే మళ్ళీ ఎంటర్ అవుతాను — ట్రెండ్ ఇంకా ఉంది కదా", r: "నష్టం వచ్చిన వెంటనే Re-entry — అది Capital రికవరీ కోసం కాదు, తప్పు జరిగిందనే భావనను వదిలించుకోవడానికి. ఆ క్షణంలో నువ్వు చేసేది Trade ఆ? లేక కేవలం నీ Ego ఇస్తున్న Reaction ఆ?" },
        { l: "ఈ రోజు ఇక trade వద్దు — mind సరిగా లేదు", r: "ఆపడం తెలివైన పని లా కనిపిస్తుంది. కానీ rule వల్ల ఆపావా — లేదా pain వల్ల ఆపావా? Rule వల్ల ఆపడం discipline. Pain వల్ల ఆపడం — తర్వాత trade లో compounded గా తిరిగి వస్తుంది." },
        { l: "Journal లో రాసుకుని next setup కోసం wait చేస్తాను", r: "ఇది సరైన direction. కానీ నిజాయితీగా చెప్పు — last పది losses లో ఎన్నిసార్లు నిజంగా జర్నల్ రాశావు? సరైన choice తెలుసు. దాన్ని అలవాటు చేసుకోవడమే ఇంకా జరగలేదు." },
      ]
    },
    en: {
      sit: "SL got hit. You took a loss. Shortly after, the market went in your direction — you exited too early.", q: "What is going through your mind right now?",
      ch: [
        { l: "I re-enter immediately — the trend is still there", r: "Re-entering right after a loss isn't about recovering capital. It's about escaping the feeling that something went wrong. In that moment — are you trading, or reacting?" },
        { l: "No more trades today — my mind isn't right", r: "Stopping looks like the smart move. But did you stop because of a rule — or because of pain? Stopping due to a rule is discipline. Stopping due to pain — it comes back compounded in your next trade." },
        { l: "I write it in my journal and wait for the next setup", r: "This is the right direction. But honestly — in your last ten losses, how many times did you actually journal? You know the right choice. Making it a habit is what hasn't happened yet." },
      ]
    }
  },
  {
    id: 2, escalation: true, showCommunity: false,
    escLine: { te: "ఒక్క క్షణం ఆగు.\n\nమొదటి రెండు situations లో నీ reaction గుర్తు చేసుకో.\n\nఇది మూడోసారి — ఒకే pattern నిన్ను follow చేస్తోంది.", en: "Wait a moment.\n\nThink back to how you reacted in the first two situations.\n\nThis is the third time — the same pattern is following you." },
    escNote: { te: "ఇది coincidence కాదు. ఇది pattern.", en: "This isn't coincidence. This is pattern." },
    escBtn: { te: "చూపించు →", en: "Show me →" },
    te: {
      sit: "వరుసగా మూడు trades లో loss వచ్చింది. ఒక పరిచయస్థుడు ఒక setup share చేశాడు — 'ఈసారి confirm' అన్నాడు.", q: "నువ్వు ఏమి చేస్తావు?",
      ch: [
        { l: "Try చేస్తాను — ఏమైనా recover అవ్వాలి కదా", r: "మూడు losses తర్వాత వేరేవాళ్ళ setup నమ్మడం — weakness కాదు. నీ దగ్గర స్పష్టత లేదు అనే signal. Own system లేనపుడు ఎవరైనా 'sure' అంటే అది hope లా కనిపిస్తుంది." },
        { l: "వద్దు — నా ప్లాన్ మాత్రమే ఫాలో అవుతాను.", r: "నీ ప్లాన్ స్పష్టంగా ఉందా? వరుసగా మూడు నష్టాల తర్వాత కూడా అది మారకుండా ఉందా? నిజంగా అలాగే ఉంటే... నువ్వు ఇప్పటికే సరైన దారిలో ఉన్నావు." },
        { l: "Setup analyze చేసి decide అవుతాను", r: "వరుసగా మూడు నష్టాల తర్వాత కూడా నీ అనాలిసిస్ objective గా ఉంటుందా? సెటప్ బాగున్నట్టు కనిపిస్తోంది అంటే — అది నిజంగా బాగున్నందుకా, లేక నష్టాన్ని రికవరీ చేయాలనే ఆరాటం వల్ల అలా కనిపిస్తోందా?" },
      ]
    },
    en: {
      sit: "Three consecutive losses. A contact shares a setup — says 'this one is confirmed.'", q: "What do you do?",
      ch: [
        { l: "I try it — I need to recover somehow", r: "Trusting someone else's setup after three losses isn't weakness. It's a signal that you lack clarity. When you don't have your own system, anyone's 'sure' looks like hope." },
        { l: "No — I stick to my plan", r: "Is your plan clearly defined? Does it hold even after three losses? If yes — you're already on the right path." },
        { l: "I analyze the setup and then decide", r: "Can you analyze objectively after three losses? Does the setup look good because it actually is — or because you need it to be?" },
      ]
    }
  },
  {
    id: 3, escalation: false, showCommunity: true,
    commLine: { te: "చాలా మంది traders ఇలాంటి situations లో ఇలాగే feel అవుతారు. నువ్వు ఒంటరివి కాదు — కానీ దీన్ని తెలుసుకోవడం మాత్రమే చాలదు.", en: "Many traders feel the same way in situations like this. You are not alone — but just knowing this is not enough." },
    te: {
      sit: "ఈ రోజు పెద్ద profit వచ్చింది. Market ఇంకా open లో ఉంది. సరిగ్గా అదే సమయంలో మరో setup కనిపించింది.", q: "నువ్వు ఏమి చేస్తావు?",
      ch: [
        { l: "Enter అవుతాను — ఈ రోజు అన్నీ వర్క్ అవుతున్నాయి కదా!", r: "Profit వచ్చిన రోజు అన్నీ clear గా కనిపిస్తాయి. కానీ ఆ confidence నీ edge నుండి వస్తోందా — లేదా ఆ రోజు mood నుండి వస్తోందా? ఆ రెండూ చాలా వేరు." },
        { l: "Target hit అయింది — ఇక్కడితో ఆపుతాను", r: "Discipline లా కనిపిస్తుంది. కానీ target miss అయిన రోజు కూడా ఇంత clear ga ఆపగలవా? నిజమైన discipline good days లో easy. Bad days లో అదే test అవుతుంది." },
        { l: "Setup quality చూసి decide చేస్తాను", r: "Setup evaluate చేయడం సరైనదే. కానీ profit లో ఉన్నపుడు ఆ evaluation neutral గా ఉంటుందా? Profit వెనక ఆ setup కొంచెం better గా కనిపిస్తోందా?" },
      ]
    },
    en: {
      sit: "Big profit day. The market is still open. Another setup appears.", q: "What do you do?",
      ch: [
        { l: "I enter — everything is working today", r: "On profit days everything looks clear. But is that confidence coming from your edge — or from the day's mood? Those two things are very different." },
        { l: "Target hit — I stop here", r: "This looks like discipline. But on a day when you miss your target — can you stop just as cleanly? Real discipline is easy on good days. Bad days are where it's actually tested." },
        { l: "I check the setup quality and then decide", r: "Evaluating setup quality is right. But with profit in hand, is that evaluation truly neutral? Does the setup look a little better because of the profit sitting there?" },
      ]
    }
  },
];

export const TM = {
  s0_0: { id: "AWARE", neg: false, te: "ఏమి చేయాలో తెలుసు — కానీ ఆ క్షణంలో execute చేయలేవు.", en: "You know what to do — but can't execute it in the moment." },
  s0_1: { id: "FOMO", neg: true, te: "Miss అవ్వడాన్ని tolerate చేయలేవు — అందుకే chase చేస్తున్నావు.", en: "You can't tolerate missing a trade — so you chase." },
  s0_2: { id: "AVOIDER", neg: true, te: "Frustration వస్తే screen వదిలేస్తావు — అది escape, solution కాదు.", en: "When frustrated you walk away — that's escape, not solution." },
  s1_0: { id: "EGO", neg: true, te: "Loss తర్వాత immediate re-entery — ego recover చేసుకోవడానికి.", en: "You re-enter immediately after loss — to recover ego, not capital." },
  s1_1: { id: "FEAR_STOP", neg: true, te: "Pain వల్ల ఆపావు — rule వల్ల కాదు. ఆ తేడా పెద్దది.", en: "You stopped because of pain — not a rule. That difference is huge." },
  s1_2: { id: "STRUCTURED", neg: false, te: "Process తెలుసు — కానీ consistent గా follow అవుతున్నావా?", en: "You know the process — but are you following it consistently?" },
  s2_0: { id: "DEPENDENT", neg: true, te: "Clarity లేనపుడు వేరేవాళ్ళ 'sure' hope లా కనిపిస్తుంది.", en: "When you lack clarity, someone else's 'sure' looks like hope." },
  s2_1: { id: "AUTONOMOUS", neg: false, te: "Own plan trust చేస్తావు — అది defined గా ఉందా?", en: "You trust your own plan — but is it clearly defined?" },
  s2_2: { id: "ANALYTICAL", neg: false, te: "Analyze చేయాలని try చేస్తావు — ఆ state లో bias ఉంటుందా?", en: "You try to analyze — but is there bias in that emotional state?" },
  s3_0: { id: "OVERCONFIDENT", neg: true, te: "మంచి రోజుల్లో ప్రాసెస్ మర్చిపోతావు — కేవలం మూడ్‌ని బట్టే ట్రేడ్ చేస్తావు.", en: "On good days you forget the process — you trade on mood." },
  s3_1: { id: "DISCIPLINED", neg: false, te: "Target follow అవుతావు — bad days లో కూడా అంతేనా?", en: "You follow targets — but do you do the same on bad days?" },
  s3_2: { id: "PROCESS_AWARE", neg: false, te: "Quality focus చేస్తావు — profit లో కూడా neutral గా?", en: "You focus on quality — but can you stay neutral even in profit?" },
};

export function buildProfile(answers, L) {
  const traits = answers.map((ci, i) => TM[`s${i}_${ci}`]).filter(Boolean);
  const neg = traits.filter(t => t.neg);
  const pos = traits.filter(t => !t.neg);
  const nIds = neg.map(t => t.id);
  const has = (...xs) => xs.every(x => nIds.includes(x));
  const bLines = answers.map((ci, i) => { const t = TM[`s${i}_${ci}`]; return t ? t[L] : ""; });
  let p = "", c = "", w = "", s = pos.length ? pos[0][L] : "";
  if (has("FOMO", "EGO")) {
    p = L === "te" ? "నువ్వు miss అవ్వడం భరించలేవు. Loss వచ్చినా భరించలేవు.\nఈ రెండూ నిన్ను continuously reactive చేస్తున్నాయి." : "You can't bear missing a trade. You can't bear a loss.\nBoth keep you in a constant state of reaction.";
    c = L === "te" ? "Market నిన్ను trap చేయడం లేదు — నీ own pattern నిన్ను trap చేస్తోంది. Miss అయినపుడు chase, loss వస్తే immediately recover. ఈ రెండు reactions మధ్య నీ actual edge disappear అవుతోంది." : "The market isn't trapping you — your own pattern is. Miss = chase. Loss = re-enter. Between these two reactions, your actual edge disappears completely.";
    w = L === "te" ? "ఈ combination లో account quickly erode అవుతుంది — రెండు వేపుల నుండి reactive trades వస్తున్నాయి." : "With this combination, capital erodes quickly — reactive trades are coming from both directions.";
  } else if (has("FOMO", "OVERCONFIDENT")) {
    p = L === "te" ? "Loss లో FOMO తో trade చేస్తావు.\nProfit లో process మర్చిపోయి mood తో trade చేస్తావు." : "In losses you trade driven by FOMO.\nIn profits you forget the process and trade on mood.";
    c = L === "te" ? "రెండు extreme states లో నీ decisions emotion-driven. Loss streak లో chase, win streak లో over-trade. Market neutral గా ఉంటే — నీ decisions ఎప్పుడూ neutral గా ఉండవు." : "In both extreme states your decisions are emotion-driven. Losing streak: chase. Winning streak: over-trade. The market is neutral — your decisions never are.";
    w = L === "te" ? "Win streaks లో risk పెరుగుతుంది. Loss streaks లో chase అవుతావు. ఇది inconsistent results కి direct reason." : "On winning streaks you increase risk. On losing streaks you chase. This is the direct reason for inconsistent results.";
  } else if (has("EGO", "DEPENDENT")) {
    p = L === "te" ? "Loss వస్తే market ని beat చేయాలని try చేస్తావు.\nLosing streak వస్తే వేరేవాళ్ళని follow చేస్తావు." : "When you lose you try to beat the market.\nWhen on a losing streak you follow others.";
    c = L === "te" ? "నీ confidence unstable. Loss → ego trigger, consecutive losses → external seek. ఈ రెండూ same root cause: clearly defined internal system లేదు." : "Your confidence is unstable. A loss triggers ego. A streak triggers seeking external help. Both come from the same root: no clearly defined internal system.";
    w = L === "te" ? "System build చేయకపోతే — good days లో ego trade చేస్తుంది, bad days లో others' tips trade చేస్తాయి. నువ్వు ఎప్పుడూ trade చేయవు." : "Without your own system — ego trades on good days, others' tips trade on bad days. You never actually trade.";
  } else if (has("DEPENDENT", "OVERCONFIDENT")) {
    p = L === "te" ? "Good days లో నువ్వు genius feel అవుతావు.\nBad days లో వేరేవాళ్ళ advice కోసం వెతుకుతావు." : "On good days you feel like a genius.\nOn bad days you seek advice from others.";
    c = L === "te" ? "నువ్వు market results ని బట్టి నిన్ను నువ్వు judge చేస్తున్నావు. Win = నా skill. Loss = help కావాలి. Self-trust market outcomes మీద depend చేసినంత కాలం stable అవ్వదు." : "You judge yourself by market results. Win = my skill. Loss = I need help. Self-trust can never be stable when it depends on outcomes.";
    w = L === "te" ? "External validation depend చేసినంత కాలం నీ decisions నీవి కాదు — market mood వి." : "As long as you depend on external validation, your decisions aren't truly yours.";
  } else if (has("AVOIDER", "FEAR_STOP")) {
    p = L === "te" ? "Pressure వచ్చినపుడు — miss, loss, frustration — నువ్వు situation నుండి దూరంగా వెళ్తావు." : "When pressure comes — missed trades, losses, frustration — you step away from the situation.";
    c = L === "te" ? "ఇది discipline లా కనిపిస్తుంది. కానీ rule-based stopping కాదు — pain-based escape. Pain వల్ల ఆపడం ఆ pain ని next session కి carry చేస్తుంది." : "This looks like discipline but it's pain-based escape. Stopping due to pain carries that pain forward to the next session. It compounds.";
    w = L === "te" ? "Avoidance చేసిన situations real market లో మళ్ళీ వస్తాయి — prepared గా లేకుండా." : "Avoided situations return in the real market — and you'll be unprepared for them.";
  } else if (has("FOMO", "DEPENDENT")) {
    p = L === "te" ? "Miss అవ్వడానికి భయం వస్తే chase చేస్తావు.\nLosing streak వస్తే others' setup follow చేస్తావు." : "Fear of missing out drives you to chase.\nA losing streak drives you to follow others.";
    c = L === "te" ? "ఈ రెండూ same root: నీ దగ్గర 'ఇది నా trade' అనే clarity లేదు. Clarity లేనపుడు ప్రతి opportunity లాగుతుంది, ప్రతి 'sure' convincing గా అనిపిస్తుంది." : "Both come from the same root: you don't have the clarity of 'this is my trade.' Without clarity, every opportunity pulls you in and every 'sure' sounds convincing.";
    w = L === "te" ? "Own entry criteria లేకపోతే market నిన్ను random గా move చేస్తుంది. Consistent results impossible." : "Without your own entry criteria, the market moves you randomly. Consistent results are impossible.";
  } else if (has("EGO", "OVERCONFIDENT")) {
    p = L === "te" ? "Loss వచ్చినపుడు prove చేయాలని trade చేస్తావు.\nProfit వచ్చినపుడు process మర్చిపోయి trade చేస్తావు." : "When you lose, you trade to prove yourself.\nWhen you profit, you forget the process and keep trading.";
    c = L === "te" ? "రెండు states లో — loss లో ego, profit లో overconfidence — process follow అవ్వడం లేదు. Market ని నీ identity తో connect చేశావు. Win = right. Loss = wrong. Trading ఆ game కాదు." : "In both states — ego in loss, overconfidence in profit — the process breaks down. You've connected the market to your identity. Win = right. Loss = wrong. Trading is not that game.";
    w = L === "te" ? "P&L ని ఎప్పుడూ self-worth తో mix చేయకూడదు. అది identity-based trading అవుతుంది — చాలా expensive." : "Never mix P&L with self-worth. That becomes identity-based trading — and it's very expensive.";
  } else if (has("FEAR_STOP", "OVERCONFIDENT")) {
    p = L === "te" ? "Losses తో panic అవుతావు — profits తో careless అవుతావు.\nరెండు extremes లో process missing అవుతోంది." : "You panic with losses — you get careless with profits.\nThe process is missing at both extremes.";
    c = L === "te" ? "Loss వచ్చినపుడు fear వల్ల ఆపుతావు. Profit వచ్చినపుడు overconfidence వల్ల continue చేస్తావు. Opposite directions కానీ same problem — emotional state decisions drive చేస్తోంది." : "Fear stops you when losing. Overconfidence pushes you when winning. Opposite directions, same problem — your emotional state is driving your decisions.";
    w = L === "te" ? "Consistency అంటే good days లో and bad days లో same process follow చేయడం." : "Consistency means following the same process on both good days and bad days.";
  } else if (nIds.length === 0) {
    p = L === "te" ? "నీ 4 choices అన్నీ process-oriented గా ఉన్నాయి.\nకానీ real market లో కూడా ఇలాగే ఉంటావా?" : "Your 4 choices are all process-oriented.\nBut is this how you actually behave in the real market?";
    c = L === "te" ? "నీకు right answers తెలుసు. ఇది significant. కానీ screen ముందు pressure లో, loss streak లో, profit day లో — అదే clarity maintain చేయగలవా?" : "You know the right answers. That matters. But under pressure, during a losing streak, on a big profit day — can you maintain that same clarity?";
    w = L === "te" ? "Process తెలిసిన traders కూడా execution లో fail అవుతారు. Knowing and doing మధ్య gap — అక్కడే most traders fail అవుతారు." : "Even traders who know the process fail in execution. The knowing-doing gap is where most traders break down.";
  } else if (nIds.length === 1) {
    const n = neg[0];
    const mp = {
      FOMO: { te: { p: "నువ్వు trade miss అవ్వడాన్ని tolerate చేయలేవు.\nఆ ఒక్క feeling నీ చాలా decisions drive చేస్తోంది.", c: "FOMO ఒక్కటే ఉన్నపుడు manageable. కానీ acknowledge చేయకపోతే slowly అన్ని decisions లో వస్తుంది. Missed trade అయినపుడు నీ reaction ని notice చేయడం start చేయి.", w: "Entry criteria లేకుండా 'opportunity miss అవుతోంది' అనే feeling నిన్ను market లోకి force చేస్తుంది." }, en: { p: "You can't tolerate missing a trade.\nThat one feeling is driving many of your decisions.", c: "FOMO alone is manageable. But left unacknowledged, it slowly enters all your decisions. Start noticing your reaction when you miss a trade.", w: "Without entry criteria, the feeling of missing out forces you into the market." } },
      EGO: { te: { p: "Loss తర్వాత నీ immediate reaction re-enter చేయడం.\nఆ moment లో capital కంటే ego priority అవుతోంది.", c: "ఒక్క behavior change: loss వచ్చిన తర్వాత minimum 15 minutes wait rule. ఆ 15 minutes లో re-enter trigger feel అవుతుందా లేదా notice చేయి. అది ego trade ని identify చేసే easiest way.", w: "Loss తర్వాత re-entry — అది winning trade అయినా, habit గా ఉంటే long term లో expensive." }, en: { p: "Your immediate reaction after a loss is to re-enter.\nIn that moment, ego takes priority over capital.", c: "One behavior change: a minimum 15-minute wait rule after every loss. Notice whether the re-entry urge shows up in those 15 minutes. That's the easiest way to identify ego trades.", w: "Re-entering after a loss — even if it wins — becomes expensive as a habit." } },
      OVERCONFIDENT: { te: { p: "Good days లో నువ్వు process కంటే mood ని follow చేస్తావు.\nProfit నీ judgment కి filter లా work చేస్తోంది.", c: "Good days లో అదనపు trade occasionally work అవుతుంది. కానీ that success reinforces the behavior. Over time good days లో rule-breaking అలవాటు అవుతుంది. Bad months అక్కడ start అవుతాయి.", w: "Target hit అయిన తర్వాత screen వదలడం — simple గా కనిపిస్తుంది కానీ execution లో చాలా difficult." }, en: { p: "On good days you follow mood over process.\nYour profit is acting as a filter on your judgment.", c: "Taking extra trades on good days occasionally works. But that success reinforces the behavior. Over time, rule-breaking on good days becomes a habit. That's where bad months begin.", w: "Stepping away from the screen after hitting your target looks simple — but in execution it's very difficult." } },
      DEPENDENT: { te: { p: "Losing streak లో నువ్వు others' advice కి vulnerable అవుతావు.\nఆ moment లో judgment temporarily absent అవుతుంది.", c: "3+ losses వచ్చినపుడు external seek చేయడం అర్థమయ్యే behavior. కానీ ఆ moment లో వచ్చే 'sure' tips — అవి నీ system కాదు. Others' system. Others' context.", w: "Losing streaks లో rest తీసుకోవడం — next trade కి fresh గా రావడం — అర్థం చేసుకోవడం easy, చేయడం hard." }, en: { p: "During a losing streak you become vulnerable to others' advice.\nIn that moment your judgment is temporarily absent.", c: "Seeking external input after 3+ losses is understandable. But the 'sure' tips that come in that moment — they're someone else's system, not yours.", w: "Taking rest during a losing streak and coming back fresh — easy to understand, hard to do." } },
    };
    if (mp[n.id]) { const d = mp[n.id][L]; p = d.p; c = d.c; w = d.w; }
    else { p = n[L]; c = pos.length ? pos[0][L] : ""; w = ""; }
  } else {
    p = `${neg[0][L]}\n${neg[1] ? neg[1][L] : ""}`;
    c = L === "te" ? `ఈ రెండు patterns connected గా ఉన్నాయి. ఒకటి trigger అయినపుడు రెండోది automatically follow అవుతుంది. ఒకటి address చేస్తే రెండోది కూడా improve అవుతుంది.` : `These two patterns are connected. When one is triggered, the other follows automatically. Fix one and the other begins to improve.`;
    w = L === "te" ? "Combined patterns single pattern కంటే ఎక్కువ impact చేస్తాయి." : "Combined patterns have more impact than a single one — they reinforce each other.";
  }
  return { primaryLine: p, coreInsight: c, warningLine: w, strengthLine: s, behaviorLines: bLines };
}

export const PHASES_TEXT = {
  te: {
    rit: { l1: '"Profit గురించి ఆలోచించే ముందు…"', l2: '"Loss ని అర్థం చేసుకున్నావా?"', l3: '"Loss ని accept చేయలేని వాడు…\nmarket లో survive అవ్వలేడు."', yes: "అవును — నేను నిజం చూడటానికి సిద్ధంగా ఉన్నాను", no: "వద్దు… తర్వాత వస్తాను" },
    hro: { l1: "మార్కెట్ నిన్ను కిందకి లాగడం లేదు…", l2: "నీ decisions నిన్ను\nకిందకి లాగుతున్నాయి.", sub: "సమస్య మార్కెట్‌లో లేదు…\nఅది నిన్ను నువ్వు ఎలా చూసుకుంటావో అక్కడ ఉంది.", cta: "నీ గురించి నీకు తెలుసా? →" },
    mir: { title: "ఇది నీ కథేనా?", sub: '"చదివేటప్పుడు ఇది నాకే అనిపిస్తే… అదే నీ answer."', close: '"ఇది failure కాదు…\n\nనీ mind ఇంకా అర్థం చేసుకోలేదు.\nఅర్థం అయిన రోజు —\n\nనీ అవగాహన మారదు…\nనీ ఆచరణ మారుతుంది."', prompt: "నీకు నీ గురించి మరింత తెలుసుకోవాలని ఉందా?", cta: "లోపలికి వెళ్ళు →", cards: [{ i: "🔄", t: "వారానికోసారి strategy మారుస్తావు — problem system లో ఉందని నమ్ముతావు." }, { i: "💢", t: "Loss తర్వాత వెంటనే trade చేస్తావు — money కోసం కాదు, ego కోసం." }, { i: "🙏", t: "SL పెట్టావు — అది hit అవ్వకూడదని మనసులో కోరుకుంటున్నావు." }, { i: "📱", t: "ఇతరుల trades copy చేస్తావు. Result వేరేగా వస్తుందని ఆశపడతావు." }, { i: "🎲", t: "Profit వస్తే నీ తెలివి — loss వస్తే market తప్పు." }, { i: "🔒", t: "ఏమి చేయాలో తెలుసు. కానీ ఆ క్షణంలో చేయలేవు." }] },
    int: { t1: "ఇది test కాదు.", t2: "ఇది నీ mirror.", p1: "Score రాదు. Marks రావు. Right/Wrong లేదు.", p2: "4 real situations వస్తాయి.\nనీ honest reaction select చేయి.\nనీ behavior ని నేను reflect చేస్తాను.", tags: ["4 Situations", "నీ Reactions", "Behavior Analysis", "నీ Profile"], cta: "Start →" },
    res: { tag: "నీ Behavior Analysis", primary: "Primary Pattern Detected", breakdown: "4 Situations లో నీ Behavior", strength: "Hidden Strength", notice: "Notice చేయి", close: "నువ్వు ఇప్పుడు నీ గురించి చదివావు.", closeg: "ఇప్పటి నుండి నీ trading వేరేగా మొదలవుతుంది.", cta: "నా Analysis Save చేసుకో →" },
    led: { tag: "నీ Analysis Save చేసుకో", th: "నీ analysis నీకు పంపిస్తా.", tg: "నీ పేరు చెప్పు.", sub: "మీ report WhatsApp కి వస్తుంది. K Prasad personal గా review చేస్తారు.", nl: "మీ పేరు", np: "మీ పేరు రాయండి", wl: "WhatsApp Number", wp: "10-digit number రాయండి...", el: "మీ Trading Experience", lvls: [{ v: "beginner", l: "Beginner — Trading start చేశాను" }, { v: "struggling", l: "Struggling — Losses అవుతున్నాయి" }, { v: "inconsistent", l: "Inconsistent — కొన్నిసార్లు profit, కొన్నిసార్లు loss" }, { v: "experienced", l: "Experienced — System కోసం వెతుకుతున్నా" }], sub2: "నా Report పంపించు →", send: "పంపిస్తున్నాను...", priv: "మీ details ఎవరికీ share చేయం. Spam రాదు.", eN: "పేరు రాయి", eW: "Valid WhatsApp number రాయి", eL: "Level select చేయి" },
    cnv: { tag: "నీ తర్వాత Step", h: "మీ problem ఇప్పుడు clearly తెలుసు.", sub: '"Analysis మాత్రమే చాలదు. దాన్ని fix చేయడానికి ఒక system కావాలి."', cards: ["నువ్వు chart చదవడం నేర్చుకున్నావు. కానీ chart చూసే moment లో నీ mind ని control చేయడం నేర్చుకోలేదు.", "Strategy correct గా ఉంటుంది. కానీ ఆ strategy execute చేసే వ్యక్తి correct గా లేడు — అందుకే results వేరేగా వస్తున్నాయి.", "Mind Power Vault లో ఉన్నది strategies కాదు — ఈ gap ని close చేసే system. నీ specific pattern కి specific approach."], k1: "ఇప్పుడైనా…", k2: "random గా trade చేయాలా…", k3: "లేదా conscious గా?", s1: "Strategies అన్ని చోట్లా దొరుకుతాయి.", h2: "Clarity ఇక్కడ మాత్రమే.", s2: "ఇది నీ స్థలం.", b1: "🎯 Mentorship కి Apply చేయి", b2: "Free Community లో Join చేయి", lk: "🔒 Limited seats. K Prasad గారు personally review చేస్తారు.", bio: "11 సంవత్సరాల trading. 7 సంవత్సరాల teaching. చాలా మంది traders ని train చేసిన experience.", q: '"Profit promise చేయను. Clarity ఇస్తాను."', rev: "Real Students", soc: "మాతో Connect అవ్వు", disc: "SEBI registered investment advice కాదు. | GST: 37DLNPM0984C1ZU" }
  },
  en: {
    rit: { l1: '"Before thinking about profit…"', l2: '"Have you understood your losses?"', l3: '"A trader who cannot accept loss…\ncannot survive the market."', yes: "Yes — I am ready to see the truth", no: "Not now… I'll come back" },
    hro: { l1: "The market is not pulling you down…", l2: "Your decisions are\npulling you down.", sub: "The problem isn't in the market…\nIt's in how you see yourself as a trader.", cta: "Do you know yourself? →" },
    mir: { title: "Is this your story?", sub: '"If while reading you think — this is about me… that is your answer."', close: '"This isn\'t failure. This is an untrained mind.\nAnd it can be trained."', prompt: "Do you want to understand yourself better?", cta: "Enter →", cards: [{ i: "🔄", t: "You change strategies every week — believing the problem is the system." }, { i: "💢", t: "After a loss you trade again immediately — not for money, but for ego." }, { i: "🙏", t: "You placed your SL — but deep down you hope it doesn't get hit." }, { i: "📱", t: "You copy trades from others and wonder why your results are different." }, { i: "🎲", t: "When you profit — you're smart. When you lose — it's the market's fault." }, { i: "🔒", t: "You know exactly what to do. But in that moment, you cannot do it." }] },
    int: { t1: "This is not a test.", t2: "This is your mirror.", p1: "No scores. No marks. No right or wrong.", p2: "4 real trading situations will appear.\nChoose your honest reaction.\nI will reflect your behavior back to you.", tags: ["4 Situations", "Your Reactions", "Behavior Analysis", "Your Profile"], cta: "Start →" },
    res: { tag: "Your Behavior Analysis", primary: "Primary Pattern Detected", breakdown: "Your Behavior Across 4 Situations", strength: "Hidden Strength", notice: "Pay Attention", close: "You have now read about yourself.", closeg: "Your trading changes from this point.", cta: "Save My Analysis →" },
    led: { tag: "Save Your Analysis", th: "I will send your analysis.", tg: "Tell me who you are.", sub: "Your report comes to WhatsApp. Cherry personally reviews it.", nl: "Your Name", np: "Enter your name...", wl: "WhatsApp Number", wp: "Enter 10-digit number...", el: "Your Trading Experience", lvls: [{ v: "beginner", l: "Beginner — Just started trading" }, { v: "struggling", l: "Struggling — Taking regular losses" }, { v: "inconsistent", l: "Inconsistent — Sometimes profit, sometimes loss" }, { v: "experienced", l: "Experienced — Looking for a system" }], sub2: "Send My Report →", send: "Sending...", priv: "Your details are never shared. No spam.", eN: "Enter your name", eW: "Enter valid WhatsApp number", eL: "Select your level" },
    cnv: { tag: "Your Next Step", h: "Your problem is now clearly visible.", sub: '"Analysis alone isn\'t enough. Fixing it requires a system."', cards: ["You learned to read charts. But you haven't learned to control your mind while reading them.", "The strategy is correct. But the person executing it isn't — that's why the results are different.", "Mind Power Vault doesn't teach strategies — it closes this gap. A specific approach for your specific pattern."], k1: "From this point…", k2: "do you trade randomly…", k3: "or consciously?", s1: "Strategies are everywhere.", h2: "Clarity is rare.", s2: "This is where you find it.", b1: "🎯 Apply for Mentorship", b2: "Join Free Community", lk: "🔒 Limited seats. K Prasad personally reviews each application.", bio: "11 years trading. 7 years teaching. Experience training many traders.", q: '"I don\'t promise profit. I offer clarity."', rev: "Real Students", soc: "Connect With Us", disc: "Not SEBI registered investment advice. | GST: 37DLNPM0984C1ZU" }
  }
};
