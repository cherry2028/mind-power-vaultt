import { useState, useEffect, useRef } from "react";

const G = {
  black:"#05050A", dark1:"#0A0A10", dark2:"#0F0F16",
  gold:"#C9A84C",  goldDim:"rgba(201,168,76,0.18)",
  smoke:"#F5F2EA", mid:"#D0CCBF",   soft:"#A8A498",
  vsoft:"rgba(240,237,228,0.32)",
};
const serif = "'Cormorant Garamond', Georgia, serif";
const sans  = "'DM Sans', sans-serif";

const SCENARIOS = [
  { id:0, escalation:false, showCommunity:false,
    te:{ sit:"మార్కెట్ open అయింది. Setup కనపడింది. Entry కి సిద్ధంగా ఉన్నావు — ఒక్క క్షణంలో price వెళ్ళిపోయింది. Trade miss అయింది.", q:"ఇప్పుడు నువ్వు ఏమి చేస్తావు?",
      ch:[
        {l:"మళ్ళీ ఇలాంటి setup వస్తుందని wait చేస్తాను", r:"Wait చేయడం తెలుసు అని అనిపిస్తుంది. కానీ screen ముందు కూర్చుని నిజంగా wait చేయగలిగావా? తెలుసు అనడం వేరు. ఆ క్షణంలో execute చేయడం వేరు."},
        {l:"Price వెళ్ళిన direction లోనే enter అవుతాను", r:"Trade miss అవ్వలేదు నువ్వు — opportunity వెళ్ళిపోయిందని feel అయ్యావు. ఆ feeling చాలా తీవ్రంగా ఉంటుంది. Market చూసి చేశావా — లేదా miss అయిన feeling నుండి చేశావా?"},
        {l:"Frustrated అయి screen నుండి దూరంగా వెళ్తాను", r:"Market నీకు ఏదైనా ఇవ్వాలని expect చేస్తున్నావు. అది ఇవ్వలేదు కాబట్టి frustration. కానీ market నీకు ఏమీ belong కాదు. ఆ expectation ఎక్కడ నుండి వస్తోందో అది అర్థం చేసుకోవడమే అసలు పని."},
      ]},
    en:{ sit:"The market opened. You spotted a setup. You were ready to enter — in a split second the price moved. Trade missed.", q:"What do you do now?",
      ch:[
        {l:"I wait — a similar setup will come again", r:"You feel like you know how to wait. But sitting in front of the screen, watching the next candle — could you actually do it? Knowing is one thing. Executing in that moment is another."},
        {l:"I enter in the direction the price moved", r:"You didn't miss the trade — you felt like the opportunity left you. That feeling is intense. Did you trade based on the market — or based on the feeling of missing out?"},
        {l:"I get frustrated and step away from the screen", r:"You expected the market to give you something. It didn't — so frustration came. But the market owes you nothing. Understanding where that expectation comes from — that is the real work."},
      ]}},
  { id:1, escalation:false, showCommunity:false,
    te:{ sit:"SL hit అయింది. Loss వచ్చింది. కొద్దిసేపటికి market నీ direction లోనే వెళ్ళింది — నువ్వు too early గా exit అయ్యావు.", q:"నీ మనసులో ఇప్పుడు ఏముంది?",
      ch:[
        {l:"వెంటనే మళ్ళీ enter చేస్తాను — trend ఇంకా ఉంది కదా", r:"Loss వచ్చిన వెంటనే re-enter — capital recover కోసం కాదు. తప్పు జరిగిందనే feeling ని వదిలించుకోవడానికి. ఆ క్షణంలో నువ్వు trade చేస్తున్నావా, reaction చేస్తున్నావా?"},
        {l:"ఈ రోజు ఇక trade వద్దు — mind సరిగా లేదు", r:"ఆపడం తెలివైన పని లా కనిపిస్తుంది. కానీ rule వల్ల ఆపావా — లేదా pain వల్ల ఆపావా? Rule వల్ల ఆపడం discipline. Pain వల్ల ఆపడం — తర్వాత trade లో compounded గా తిరిగి వస్తుంది."},
        {l:"Journal లో రాసుకుని next setup కోసం wait చేస్తాను", r:"ఇది సరైన direction. కానీ నిజాయితీగా చెప్పు — last పది losses లో ఎన్నిసార్లు actually journal రాశావు? సరైన choice తెలుసు. దాన్ని habit చేసుకోవడమే ఇంకా జరగలేదు."},
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
    te:{ sit:"వరుసగా మూడు trades లో loss వచ్చింది. ఒక పరిచయస్థుడు ఒక setup share చేశాడు — 'ఈసారి confirm' అన్నాడు.", q:"నువ్వు ఏమి చేస్తావు?",
      ch:[
        {l:"Try చేస్తాను — ఏమైనా recover అవ్వాలి కదా", r:"మూడు losses తర్వాత వేరేవాళ్ళ setup నమ్మడం — weakness కాదు. నీ దగ్గర స్పష్టత లేదు అనే signal. Own system లేనపుడు ఎవరైనా 'sure' అంటే అది hope లా కనిపిస్తుంది."},
        {l:"వద్దు — నా plan follow చేస్తాను", r:"నీ plan clearly defined గా ఉందా? మూడు losses తర్వాత కూడా unchanged గా ఉందా? నిజంగా అయితే నువ్వు ఇప్పటికే సరైన దారిలో ఉన్నావు."},
        {l:"Setup analyze చేసి decide అవుతాను", r:"మూడు losses తర్వాత analysis objective గా ఉంటుందా? Setup good గా కనిపించడం — అది actually good అయినందుకేనా, లేదా recover అవ్వాలని ఉన్నందుకేనా?"},
      ]},
    en:{ sit:"Three consecutive losses. A contact shares a setup — says 'this one is confirmed.'", q:"What do you do?",
      ch:[
        {l:"I try it — I need to recover somehow", r:"Trusting someone else's setup after three losses isn't weakness. It's a signal that you lack clarity. When you don't have your own system, anyone's 'sure' looks like hope."},
        {l:"No — I stick to my plan", r:"Is your plan clearly defined? Does it hold even after three losses? If yes — you're already on the right path."},
        {l:"I analyze the setup and then decide", r:"Can you analyze objectively after three losses? Does the setup look good because it actually is — or because you need it to be?"},
      ]}},
  { id:3, escalation:false, showCommunity:true,
    commLine:{ te:"చాలా మంది traders ఇలాంటి situations లో ఇలాగే feel అవుతారు. నువ్వు ఒంటరివి కాదు — కానీ దీన్ని తెలుసుకోవడం మాత్రమే చాలదు.", en:"Many traders feel the same way in situations like this. You are not alone — but just knowing this is not enough." },
    te:{ sit:"ఈ రోజు పెద్ద profit వచ్చింది. Market ఇంకా open లో ఉంది. మరో setup కనిపించింది.", q:"నువ్వు ఏమి చేస్తావు?",
      ch:[
        {l:"Enter చేస్తాను — ఈ రోజు అన్నీ work అవుతున్నాయి", r:"Profit వచ్చిన రోజు అన్నీ clear గా కనిపిస్తాయి. కానీ ఆ confidence నీ edge నుండి వస్తోందా — లేదా ఆ రోజు mood నుండి వస్తోందా? ఆ రెండూ చాలా వేరు."},
        {l:"Target hit అయింది — ఇక్కడితో ఆపుతాను", r:"Discipline లా కనిపిస్తుంది. కానీ target miss అయిన రోజు కూడా ఇంత clearly ఆపగలవా? నిజమైన discipline good days లో easy. Bad days లో అదే test అవుతుంది."},
        {l:"Setup quality చూసి decide చేస్తాను", r:"Setup evaluate చేయడం సరైనదే. కానీ profit లో ఉన్నపుడు ఆ evaluation neutral గా ఉంటుందా? Profit వెనక ఆ setup కొంచెం better గా కనిపిస్తోందా?"},
      ]},
    en:{ sit:"Big profit day. The market is still open. Another setup appears.", q:"What do you do?",
      ch:[
        {l:"I enter — everything is working today", r:"On profit days everything looks clear. But is that confidence coming from your edge — or from the day's mood? Those two things are very different."},
        {l:"Target hit — I stop here", r:"This looks like discipline. But on a day when you miss your target — can you stop just as cleanly? Real discipline is easy on good days. Bad days are where it's actually tested."},
        {l:"I check the setup quality and then decide", r:"Evaluating setup quality is right. But with profit in hand, is that evaluation truly neutral? Does the setup look a little better because of the profit sitting there?"},
      ]}},
];

const TM = {
  s0_0:{id:"AWARE",neg:false,te:"ఏమి చేయాలో తెలుసు — కానీ ఆ క్షణంలో execute చేయలేవు.",en:"You know what to do — but can't execute it in the moment."},
  s0_1:{id:"FOMO",neg:true,te:"Miss అవ్వడాన్ని tolerate చేయలేవు — అందుకే chase అవుతావు.",en:"You can't tolerate missing a trade — so you chase."},
  s0_2:{id:"AVOIDER",neg:true,te:"Frustration వస్తే screen వదిలేస్తావు — అది escape, solution కాదు.",en:"When frustrated you walk away — that's escape, not solution."},
  s1_0:{id:"EGO",neg:true,te:"Loss తర్వాత immediately re-enter — ego recover చేసుకోవడానికి.",en:"You re-enter immediately after loss — to recover ego, not capital."},
  s1_1:{id:"FEAR_STOP",neg:true,te:"Pain వల్ల ఆపావు — rule వల్ల కాదు. ఆ తేడా పెద్దది.",en:"You stopped because of pain — not a rule. That difference is huge."},
  s1_2:{id:"STRUCTURED",neg:false,te:"Process తెలుసు — కానీ consistent గా follow అవుతున్నావా?",en:"You know the process — but are you following it consistently?"},
  s2_0:{id:"DEPENDENT",neg:true,te:"Clarity లేనపుడు వేరేవాళ్ళ 'sure' hope లా కనిపిస్తుంది.",en:"When you lack clarity, someone else's 'sure' looks like hope."},
  s2_1:{id:"AUTONOMOUS",neg:false,te:"Own plan trust చేస్తావు — అది defined గా ఉందా?",en:"You trust your own plan — but is it clearly defined?"},
  s2_2:{id:"ANALYTICAL",neg:false,te:"Analyze చేయాలని try చేస్తావు — ఆ state లో bias ఉంటుందా?",en:"You try to analyze — but is there bias in that emotional state?"},
  s3_0:{id:"OVERCONFIDENT",neg:true,te:"Good days లో process forget అవుతావు — mood లో trade చేస్తావు.",en:"On good days you forget the process — you trade on mood."},
  s3_1:{id:"DISCIPLINED",neg:false,te:"Target follow చేస్తావు — bad days లో కూడా అంతేనా?",en:"You follow targets — but do you do the same on bad days?"},
  s3_2:{id:"PROCESS_AWARE",neg:false,te:"Quality focus చేస్తావు — profit లో కూడా neutral గా?",en:"You focus on quality — but can you stay neutral even in profit?"},
};

function buildProfile(answers, L) {
  const traits = answers.map((ci,i) => TM[`s${i}_${ci}`]).filter(Boolean);
  const neg    = traits.filter(t => t.neg);
  const pos    = traits.filter(t => !t.neg);
  const nIds   = neg.map(t => t.id);
  const has    = (...xs) => xs.every(x => nIds.includes(x));
  const bLines = answers.map((ci,i) => { const t=TM[`s${i}_${ci}`]; return t?t[L]:""; });
  let p="",c="",w="",s=pos.length?pos[0][L]:"";
  if(has("FOMO","EGO")){
    p=L==="te"?"నువ్వు miss అవ్వడం భరించలేవు. Loss వచ్చినా భరించలేవు.\nఈ రెండూ నిన్ను continuously reactive చేస్తున్నాయి.":"You can't bear missing a trade. You can't bear a loss.\nBoth keep you in a constant state of reaction.";
    c=L==="te"?"Market నిన్ను trap చేయడం లేదు — నీ own pattern నిన్ను trap చేస్తోంది. Miss అయినపుడు chase, loss వస్తే immediately recover. ఈ రెండు reactions మధ్య నీ actual edge disappear అవుతోంది.":"The market isn't trapping you — your own pattern is. Miss = chase. Loss = re-enter. Between these two reactions, your actual edge disappears completely.";
    w=L==="te"?"ఈ combination లో account quickly erode అవుతుంది — రెండు వేపుల నుండి reactive trades వస్తున్నాయి.":"With this combination, capital erodes quickly — reactive trades are coming from both directions.";
  } else if(has("FOMO","OVERCONFIDENT")){
    p=L==="te"?"Loss లో FOMO తో trade చేస్తావు.\nProfit లో process మర్చిపోయి mood తో trade చేస్తావు.":"In losses you trade driven by FOMO.\nIn profits you forget the process and trade on mood.";
    c=L==="te"?"రెండు extreme states లో నీ decisions emotion-driven. Loss streak లో chase, win streak లో over-trade. Market neutral గా ఉంటే — నీ decisions ఎప్పుడూ neutral గా ఉండవు.":"In both extreme states your decisions are emotion-driven. Losing streak: chase. Winning streak: over-trade. The market is neutral — your decisions never are.";
    w=L==="te"?"Win streaks లో risk పెరుగుతుంది. Loss streaks లో chase అవుతావు. ఇది inconsistent results కి direct reason.":"On winning streaks you increase risk. On losing streaks you chase. This is the direct reason for inconsistent results.";
  } else if(has("EGO","DEPENDENT")){
    p=L==="te"?"Loss వస్తే market ని beat చేయాలని try చేస్తావు.\nLosing streak వస్తే వేరేవాళ్ళని follow చేస్తావు.":"When you lose you try to beat the market.\nWhen on a losing streak you follow others.";
    c=L==="te"?"నీ confidence unstable. Loss → ego trigger, consecutive losses → external seek. ఈ రెండూ same root cause: clearly defined internal system లేదు.":"Your confidence is unstable. A loss triggers ego. A streak triggers seeking external help. Both come from the same root: no clearly defined internal system.";
    w=L==="te"?"System build చేయకపోతే — good days లో ego trade చేస్తుంది, bad days లో others' tips trade చేస్తాయి. నువ్వు ఎప్పుడూ trade చేయవు.":"Without your own system — ego trades on good days, others' tips trade on bad days. You never actually trade.";
  } else if(has("DEPENDENT","OVERCONFIDENT")){
    p=L==="te"?"Good days లో నువ్వు genius feel అవుతావు.\nBad days లో వేరేవాళ్ళ advice కోసం వెతుకుతావు.":"On good days you feel like a genius.\nOn bad days you seek advice from others.";
    c=L==="te"?"నువ్వు market results ని బట్టి నిన్ను నువ్వు judge చేస్తున్నావు. Win = నా skill. Loss = help కావాలి. Self-trust market outcomes మీద depend చేసినంత కాలం stable అవ్వదు.":"You judge yourself by market results. Win = my skill. Loss = I need help. Self-trust can never be stable when it depends on outcomes.";
    w=L==="te"?"External validation depend చేసినంత కాలం నీ decisions నీవి కాదు — market mood వి.":"As long as you depend on external validation, your decisions aren't truly yours.";
  } else if(has("AVOIDER","FEAR_STOP")){
    p=L==="te"?"Pressure వచ్చినపుడు — miss, loss, frustration — నువ్వు situation నుండి దూరంగా వెళ్తావు.":"When pressure comes — missed trades, losses, frustration — you step away from the situation.";
    c=L==="te"?"ఇది discipline లా కనిపిస్తుంది. కానీ rule-based stopping కాదు — pain-based escape. Pain వల్ల ఆపడం ఆ pain ని next session కి carry చేస్తుంది.":"This looks like discipline but it's pain-based escape. Stopping due to pain carries that pain forward to the next session. It compounds.";
    w=L==="te"?"Avoidance చేసిన situations real market లో మళ్ళీ వస్తాయి — prepared గా లేకుండా.":"Avoided situations return in the real market — and you'll be unprepared for them.";
  } else if(has("FOMO","DEPENDENT")){
    p=L==="te"?"Miss అవ్వడానికి భయం వస్తే chase చేస్తావు.\nLosing streak వస్తే others' setup follow చేస్తావు.":"Fear of missing out drives you to chase.\nA losing streak drives you to follow others.";
    c=L==="te"?"ఈ రెండూ same root: నీ దగ్గర 'ఇది నా trade' అనే clarity లేదు. Clarity లేనపుడు ప్రతి opportunity లాగుతుంది, ప్రతి 'sure' convincing గా అనిపిస్తుంది.":"Both come from the same root: you don't have the clarity of 'this is my trade.' Without clarity, every opportunity pulls you in and every 'sure' sounds convincing.";
    w=L==="te"?"Own entry criteria లేకపోతే market నిన్ను random గా move చేస్తుంది. Consistent results impossible.":"Without your own entry criteria, the market moves you randomly. Consistent results are impossible.";
  } else if(has("EGO","OVERCONFIDENT")){
    p=L==="te"?"Loss వచ్చినపుడు prove చేయాలని trade చేస్తావు.\nProfit వచ్చినపుడు process మర్చిపోయి trade చేస్తావు.":"When you lose, you trade to prove yourself.\nWhen you profit, you forget the process and keep trading.";
    c=L==="te"?"రెండు states లో — loss లో ego, profit లో overconfidence — process follow అవ్వడం లేదు. Market ని నీ identity తో connect చేశావు. Win = right. Loss = wrong. Trading ఆ game కాదు.":"In both states — ego in loss, overconfidence in profit — the process breaks down. You've connected the market to your identity. Win = right. Loss = wrong. Trading is not that game.";
    w=L==="te"?"P&L ని ఎప్పుడూ self-worth తో mix చేయకూడదు. అది identity-based trading అవుతుంది — చాలా expensive.":"Never mix P&L with self-worth. That becomes identity-based trading — and it's very expensive.";
  } else if(has("FEAR_STOP","OVERCONFIDENT")){
    p=L==="te"?"Losses తో panic అవుతావు — profits తో careless అవుతావు.\nరెండు extremes లో process missing అవుతోంది.":"You panic with losses — you get careless with profits.\nThe process is missing at both extremes.";
    c=L==="te"?"Loss వచ్చినపుడు fear వల్ల ఆపుతావు. Profit వచ్చినపుడు overconfidence వల్ల continue చేస్తావు. Opposite directions కానీ same problem — emotional state decisions drive చేస్తోంది.":"Fear stops you when losing. Overconfidence pushes you when winning. Opposite directions, same problem — your emotional state is driving your decisions.";
    w=L==="te"?"Consistency అంటే good days లో and bad days లో same process follow చేయడం.":"Consistency means following the same process on both good days and bad days.";
  } else if(nIds.length===0){
    p=L==="te"?"నీ 4 choices అన్నీ process-oriented గా ఉన్నాయి.\nకానీ real market లో కూడా ఇలాగే ఉంటావా?":"Your 4 choices are all process-oriented.\nBut is this how you actually behave in the real market?";
    c=L==="te"?"నీకు right answers తెలుసు. ఇది significant. కానీ screen ముందు pressure లో, loss streak లో, profit day లో — అదే clarity maintain చేయగలవా?":"You know the right answers. That matters. But under pressure, during a losing streak, on a big profit day — can you maintain that same clarity?";
    w=L==="te"?"Process తెలిసిన traders కూడా execution లో fail అవుతారు. Knowing and doing మధ్య gap — అక్కడే most traders fail అవుతారు.":"Even traders who know the process fail in execution. The knowing-doing gap is where most traders break down.";
  } else if(nIds.length===1){
    const n=neg[0];
    const mp={
      FOMO:{te:{p:"నువ్వు trade miss అవ్వడాన్ని tolerate చేయలేవు.\nఆ ఒక్క feeling నీ చాలా decisions drive చేస్తోంది.",c:"FOMO ఒక్కటే ఉన్నపుడు manageable. కానీ acknowledge చేయకపోతే slowly అన్ని decisions లో వస్తుంది. Missed trade అయినపుడు నీ reaction ని notice చేయడం start చేయి.",w:"Entry criteria లేకుండా 'opportunity miss అవుతోంది' అనే feeling నిన్ను market లోకి force చేస్తుంది."},en:{p:"You can't tolerate missing a trade.\nThat one feeling is driving many of your decisions.",c:"FOMO alone is manageable. But left unacknowledged, it slowly enters all your decisions. Start noticing your reaction when you miss a trade.",w:"Without entry criteria, the feeling of missing out forces you into the market."}},
      EGO:{te:{p:"Loss తర్వాత నీ immediate reaction re-enter చేయడం.\nఆ moment లో capital కంటే ego priority అవుతోంది.",c:"ఒక్క behavior change: loss వచ్చిన తర్వాత minimum 15 minutes wait rule. ఆ 15 minutes లో re-enter trigger feel అవుతుందా లేదా notice చేయి. అది ego trade ని identify చేసే easiest way.",w:"Loss తర్వాత re-entry — అది winning trade అయినా, habit గా ఉంటే long term లో expensive."},en:{p:"Your immediate reaction after a loss is to re-enter.\nIn that moment, ego takes priority over capital.",c:"One behavior change: a minimum 15-minute wait rule after every loss. Notice whether the re-entry urge shows up in those 15 minutes. That's the easiest way to identify ego trades.",w:"Re-entering after a loss — even if it wins — becomes expensive as a habit."}},
      OVERCONFIDENT:{te:{p:"Good days లో నువ్వు process కంటే mood ని follow చేస్తావు.\nProfit నీ judgment కి filter లా work చేస్తోంది.",c:"Good days లో అదనపు trade occasionally work అవుతుంది. కానీ that success reinforces the behavior. Over time good days లో rule-breaking అలవాటు అవుతుంది. Bad months అక్కడ start అవుతాయి.",w:"Target hit అయిన తర్వాత screen వదలడం — simple గా కనిపిస్తుంది కానీ execution లో చాలా difficult."},en:{p:"On good days you follow mood over process.\nYour profit is acting as a filter on your judgment.",c:"Taking extra trades on good days occasionally works. But that success reinforces the behavior. Over time, rule-breaking on good days becomes a habit. That's where bad months begin.",w:"Stepping away from the screen after hitting your target looks simple — but in execution it's very difficult."}},
      DEPENDENT:{te:{p:"Losing streak లో నువ్వు others' advice కి vulnerable అవుతావు.\nఆ moment లో judgment temporarily absent అవుతుంది.",c:"3+ losses వచ్చినపుడు external seek చేయడం అర్థమయ్యే behavior. కానీ ఆ moment లో వచ్చే 'sure' tips — అవి నీ system కాదు. Others' system. Others' context.",w:"Losing streaks లో rest తీసుకోవడం — next trade కి fresh గా రావడం — అర్థం చేసుకోవడం easy, చేయడం hard."},en:{p:"During a losing streak you become vulnerable to others' advice.\nIn that moment your judgment is temporarily absent.",c:"Seeking external input after 3+ losses is understandable. But the 'sure' tips that come in that moment — they're someone else's system, not yours.",w:"Taking rest during a losing streak and coming back fresh — easy to understand, hard to do."}},
    };
    if(mp[n.id]){const d=mp[n.id][L];p=d.p;c=d.c;w=d.w;}
    else{p=n[L];c=pos.length?pos[0][L]:"";w="";}
  } else {
    p=`${neg[0][L]}\n${neg[1]?neg[1][L]:""}`;
    c=L==="te"?`ఈ రెండు patterns connected గా ఉన్నాయి. ఒకటి trigger అయినపుడు రెండోది automatically follow అవుతుంది. ఒకటి address చేస్తే రెండోది కూడా improve అవుతుంది.`:`These two patterns are connected. When one is triggered, the other follows automatically. Fix one and the other begins to improve.`;
    w=L==="te"?"Combined patterns single pattern కంటే ఎక్కువ impact చేస్తాయి.":"Combined patterns have more impact than a single one — they reinforce each other.";
  }
  return {primaryLine:p,coreInsight:c,warningLine:w,strengthLine:s,behaviorLines:bLines};
}

const REVIEWS=[
  {name:"Ravi K.",city:"Hyderabad",stars:5,te:"MPV కి రాకముందు నేను రోజూ revenge trade చేసేవాడిని. 3 నెలల తర్వాత — ఒక్కసారి కూడా చేయలేదు. 2 సంవత్సరాల తర్వాత capital intact గా ఉంది.",en:"Before MPV I revenge traded every single day. 3 months later — not once. Capital intact for the first time in 2 years."},
  {name:"Suresh M.",city:"Vijayawada",stars:5,te:"Cherry strategies నేర్పించడు. నిజంగా నిన్ను నువ్వు చూసుకోవడం నేర్పిస్తాడు. అదే నాకు work అయింది.",en:"Cherry doesn't teach strategies. He teaches you to see yourself honestly. That's the only thing that actually worked."},
  {name:"Anitha P.",city:"Bengaluru",stars:5,te:"Chart patterns కోసం వచ్చాను. Psychology వల్ల ఉండిపోయాను. Win rate పెద్దగా మారలేదు — కానీ drawdown 60% తగ్గింది.",en:"I came for chart patterns. I stayed for the psychology. Win rate didn't change much — but my drawdown dropped 60%."},
];

const css=`
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Noto+Serif+Telugu:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html{scroll-behavior:smooth}body{background:#05050A}
  ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:rgba(201,168,76,0.22);border-radius:2px}
  p,span,h1,h2,h3,div,button{-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
  .tel{font-family:'Noto Serif Telugu',Georgia,serif}
  .eng{font-family:'Cormorant Garamond',Georgia,serif}
  .bc{width:100%;text-align:left;cursor:pointer;background:rgba(201,168,76,0.04);border:1px solid rgba(201,168,76,0.16);border-radius:7px;padding:20px 22px;display:flex;align-items:center;gap:16px;transition:all 0.22s ease}
  .bc:hover{border-color:rgba(201,168,76,0.52);background:rgba(201,168,76,0.09);transform:translateX(5px)}
  .bg{cursor:pointer;transition:all 0.28s ease}.bg:hover{transform:translateY(-3px);box-shadow:0 12px 40px rgba(201,168,76,0.28)}
  .bo{cursor:pointer;transition:all 0.28s ease}.bo:hover{background:rgba(201,168,76,0.07)!important}
  .pin{animation:pageIn 0.55s ease forwards}
  @keyframes pageIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
  @keyframes breathe{0%,100%{opacity:0.07}50%{opacity:0.15}}
  @keyframes scr{0%,100%{opacity:0.3;transform:translateY(0)}50%{opacity:0.9;transform:translateY(7px)}}
  @keyframes ritIn{from{opacity:0;letter-spacing:6px}to{opacity:1;letter-spacing:normal}}
  @keyframes lineG{from{height:0;opacity:0}to{height:52px;opacity:1}}
  .flt{animation:float 3.5s ease-in-out infinite}
  .brth{animation:breathe 5s ease-in-out infinite}
  .scrl{animation:scr 2.5s ease-in-out infinite}
  .rit{animation:ritIn 0.85s ease forwards}
  .lg{animation:lineG 0.7s ease 0.2s forwards;height:0;opacity:0}
  input{outline:none}input:focus{border-color:rgba(201,168,76,0.5)!important}
  .aifab{position:fixed;bottom:28px;right:28px;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#C9A84C,#9A7020);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 4px 24px rgba(201,168,76,0.4);z-index:400;transition:all 0.3s}
  .aifab:hover{transform:scale(1.1)}
  .aimod{position:fixed;bottom:96px;right:20px;width:340px;max-height:500px;background:#0F0F16;border:1px solid rgba(201,168,76,0.25);border-radius:12px;display:flex;flex-direction:column;z-index:400;box-shadow:0 8px 48px rgba(0,0,0,0.8)}
  .aimsg{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px}
  .mu{align-self:flex-end;background:rgba(201,168,76,0.15);border:1px solid rgba(201,168,76,0.3);border-radius:10px 10px 2px 10px;padding:9px 13px;max-width:80%}
  .ma{align-self:flex-start;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px 10px 10px 2px;padding:9px 13px;max-width:85%}
  @media(max-width:500px){.aimod{width:calc(100vw - 24px);right:12px}}
`;

const GL=()=>(
  <div style={{display:"flex",alignItems:"center",gap:10,margin:"0 auto",width:130}}>
    <div style={{flex:1,height:1,background:`linear-gradient(to right,transparent,${G.gold})`}}/>
    <div style={{width:5,height:5,background:G.gold,transform:"rotate(45deg)",flexShrink:0}}/>
    <div style={{flex:1,height:1,background:`linear-gradient(to left,transparent,${G.gold})`}}/>
  </div>
);

const Tg=({c,ch})=>(
  <p style={{fontSize:11,letterSpacing:5,color:c==="s"?`${G.smoke}60`:`${G.gold}90`,textTransform:"uppercase",marginBottom:14,fontFamily:sans}}>{ch}</p>
);

function AIChat({lang}){
  const [open,setOpen]=useState(false);
  const [msgs,setMsgs]=useState([{r:"a",t:lang==="te"?"నమస్కారం! Trading psychology గురించి ఏమైనా అడుగు.":"Hello! Ask me anything about trading psychology."}]);
  const [inp,setInp]=useState("");
  const [loading,setLoading]=useState(false);
  const endRef=useRef(null);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"});},[msgs]);
  const send=async()=>{
    if(!inp.trim()||loading)return;
    const q=inp.trim();setInp("");
    setMsgs(m=>[...m,{r:"user",t:q}]);setLoading(true);
    try{
      const sys=lang==="te"?"నువ్వు MPV Trading Psychology Expert. Telugu లో short, honest, practical answers ఇవ్వు. Investment advice ఇవ్వకు.":"You are MPV Trading Psychology Expert. Give short, honest, practical answers about trader psychology only. No investment advice.";
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:350,system:sys,messages:[{role:"user",content:q}]})});
      const d=await res.json();
      setMsgs(m=>[...m,{r:"a",t:d.content?.[0]?.text||"Try again."}]);
    }catch{setMsgs(m=>[...m,{r:"a",t:"Connection error. Try again."}]);}
    setLoading(false);
  };
  return(
    <>
      <button className="aifab" onClick={()=>setOpen(o=>!o)}>{open?"✕":"🧠"}</button>
      {open&&(
        <div className="aimod">
          <div style={{padding:"12px 16px",borderBottom:"1px solid rgba(201,168,76,0.15)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><div style={{fontSize:13,fontWeight:700,color:G.gold,fontFamily:sans}}>MPV AI</div><div style={{fontSize:10,color:G.soft,fontFamily:sans}}>{lang==="te"?"Trading Psychology Expert":"Trading Psychology Expert"}</div></div>
            <button onClick={()=>setOpen(false)} style={{background:"transparent",border:"none",color:G.soft,cursor:"pointer",fontSize:18,fontFamily:sans}}>✕</button>
          </div>
          <div className="aimsg">
            {msgs.map((m,i)=><div key={i} className={m.r==="user"?"mu":"ma"}><p style={{fontSize:13,color:G.mid,lineHeight:1.7,fontFamily:sans,whiteSpace:"pre-wrap"}}>{m.t}</p></div>)}
            {loading&&<div className="ma"><p style={{fontSize:13,color:G.soft,fontFamily:sans}}>...</p></div>}
            <div ref={endRef}/>
          </div>
          <div style={{padding:"10px",borderTop:"1px solid rgba(201,168,76,0.12)",display:"flex",gap:8}}>
            <input value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()}
              placeholder={lang==="te"?"Psychology అడుగు...":"Ask psychology..."}
              style={{flex:1,background:"rgba(201,168,76,0.05)",border:"1px solid rgba(201,168,76,0.2)",borderRadius:6,padding:"8px 11px",color:G.smoke,fontSize:13,fontFamily:sans}}/>
            <button onClick={send} disabled={loading} style={{padding:"8px 14px",background:`linear-gradient(135deg,${G.gold},#9A7020)`,color:G.black,border:"none",borderRadius:6,fontFamily:sans,fontSize:12,fontWeight:700,cursor:"pointer",opacity:loading?0.5:1}}>→</button>
          </div>
          <p style={{padding:"6px 12px",fontSize:10,color:G.vsoft,fontFamily:sans,textAlign:"center",borderTop:"1px solid rgba(201,168,76,0.08)"}}>{lang==="te"?"Investment advice కాదు":"Not investment advice"}</p>
        </div>
      )}
    </>
  );
}

export default function MPV(){
  const [phase,setPhase]=useState(0);
  const [rs,setRs]=useState(0);
  const [heroIn,setHeroIn]=useState(false);
  const [lang,setLang]=useState("te");
  const [scIdx,setScIdx]=useState(0);
  const [answers,setAnswers]=useState([]);
  const [refText,setRefText]=useState(null);
  const [showEsc,setShowEsc]=useState(false);
  const [escPend,setEscPend]=useState(null);
  const [scrolled,setScrolled]=useState(false);
  const [fading,setFading]=useState(false);
  const topRef=useRef(null);

  useEffect(()=>{const fn=()=>setScrolled(window.scrollY>50);window.addEventListener("scroll",fn);return()=>window.removeEventListener("scroll",fn);},[]);
  useEffect(()=>{if(phase!==0)return;if(rs===0){setTimeout(()=>setRs(1),1000);return;}if(rs===1){setTimeout(()=>setRs(2),2600);return;}if(rs===2){setTimeout(()=>setRs(3),2600);return;}},[phase,rs]);
  useEffect(()=>{if(phase===1)setTimeout(()=>setHeroIn(true),150);},[phase]);

  const top=()=>topRef.current?.scrollIntoView({behavior:"smooth"});
  const goTo=(p)=>{setFading(true);setTimeout(()=>{setPhase(p);setFading(false);top();},230);};
  const goBack=()=>{
    if(phase===4){
      if(refText){setRefText(null);setShowEsc(false);setEscPend(null);top();return;}
      if(showEsc){setShowEsc(false);setEscPend(null);setAnswers(a=>a.slice(0,-1));top();return;}
      if(scIdx>0){setScIdx(s=>s-1);setAnswers(a=>a.slice(0,-1));top();return;}
      goTo(3);return;
    }
    goTo(Math.max(1,phase-1));
  };

  const sc=SCENARIOS[scIdx];
  const scL=sc?.[lang];
  const profile=answers.length===4?buildProfile(answers,lang):null;
  const CHERRY_WA="919059181616";
  const lc=lang==="te"?"tel":"eng";
  const sec={padding:"108px 0 72px"};
  const gBtn={padding:"15px 36px",background:`linear-gradient(135deg,${G.gold},#9A7020)`,color:G.black,border:"none",borderRadius:2,fontSize:12,fontWeight:700,letterSpacing:2,textTransform:"uppercase",fontFamily:sans};
  const oBtn={padding:"15px 36px",background:"transparent",color:G.gold,border:`1px solid ${G.gold}48`,borderRadius:2,fontSize:12,fontWeight:700,letterSpacing:2,textTransform:"uppercase",fontFamily:sans};

  const handleChoice=(ci)=>{
    if(sc.escalation&&escPend===null){setEscPend(ci);setAnswers(a=>[...a,ci]);setShowEsc(true);return;}
    setAnswers(a=>[...a,ci]);setRefText(scL.ch[ci].r);
  };
  const handleEsc=()=>{setShowEsc(false);setRefText(scL.ch[escPend].r);};
  const handleNext=()=>{setRefText(null);setShowEsc(false);setEscPend(null);if(scIdx<SCENARIOS.length-1){setScIdx(s=>s+1);top();}else goTo(5);};

  const RIT={te:{l1:'"Profit గురించి ఆలోచించే ముందు…"',l2:'"Loss ని అర్థం చేసుకున్నావా?"',l3:'"Loss ని accept చేయలేని వాడు…\nmarket లో survive అవ్వలేడు."',yes:"అవును — నేను నిజం చూడటానికి సిద్ధంగా ఉన్నాను",no:"వద్దు… తర్వాత వస్తాను"},en:{l1:'"Before thinking about profit…"',l2:'"Have you understood your losses?"',l3:'"A trader who cannot accept loss…\ncannot survive the market."',yes:"Yes — I am ready to see the truth",no:"Not now… I'll come back"}};
  const HRO={te:{l1:"మార్కెట్ నిన్ను కిందకి లాగడం లేదు…",l2:"నీ decisions నిన్ను\nకిందకి లాగుతున్నాయి.",sub:"సమస్య మార్కెట్‌లో లేదు…\nఅది నిన్ను నువ్వు ఎలా చూసుకుంటావో అక్కడ ఉంది.",cta:"నీ గురించి నీకు తెలుసా? →"},en:{l1:"The market is not pulling you down…",l2:"Your decisions are\npulling you down.",sub:"The problem isn't in the market…\nIt's in how you see yourself as a trader.",cta:"Do you know yourself? →"}};
  const MIR={te:{title:"ఇది నీ కథేనా?",sub:'"చదివేటప్పుడు ఇది నాకే అనిపిస్తే… అదే నీ answer."',close:'"“ఇది failure కాదు… నీ mind ఇంకా అర్థం చేసుకోలేదు.అర్థం అయిన రోజు ..\nనీ అవగాహన మారదు…..
నీ ఆచరణ మారుతుంది.ు."',prompt:"నీకు నీ గురించి మరింత తెలుసుకోవాలని ఉందా?",cta:"లోపలికి వెళ్ళు →",cards:[{i:"🔄",t:"వారానికోసారి strategy మారుస్తావు — problem system లో ఉందని నమ్ముతావు."},{i:"💢",t:"Loss తర్వాత వెంటనే trade చేస్తావు — money కోసం కాదు, ego కోసం."},{i:"🙏",t:"SL పెట్టావు — అది hit అవ్వకూడదని మనసులో కోరుకుంటున్నావు."},{i:"📱",t:"ఇతఇతరుల trades copy చేస్తావు. Result వేరేగా వస్తుందని ఆశపడతావు."},{i:"🎲",t:"Profit వస్తే నీ తెలివి — loss వస్తే market తప్పు."},{i:"🔒",t:"ఏమి చేయాలో తెలుసు. కానీ ఆ క్షణంలో చేయలేవు."}]},en:{title:"Is this your story?",sub:'"If while reading you think — this is about me… that is your answer."',close:'"This isn\'t failure. This is an untrained mind.\nAnd it can be trained."',prompt:"Do you want to understand yourself better?",cta:"Enter →",cards:[{i:"🔄",t:"You change strategies every week — believing the problem is the system."},{i:"💢",t:"After a loss you trade again immediately — not for money, but for ego."},{i:"🙏",t:"You placed your SL — but deep down you hope it doesn't get hit."},{i:"📱",t:"You copy trades from others and wonder why your results are different."},{i:"🎲",t:"When you profit — you're smart. When you lose — it's the market's fault."},{i:"🔒",t:"You know exactly what to do. But in that moment, you cannot do it."}]}};
  const INT={te:{t1:"ఇది test కాదు.",t2:"ఇది నీ mirror.",p1:"Score రాదు. Marks రావు. Right/Wrong లేదు.",p2:"4 real situations వస్తాయి.\nనీ honest reaction select చేయి.\nనీ behavior ని నేను reflect చేస్తాను.",tags:["4 Situations","నీ Reactions","Behavior Analysis","నీ Profile"],cta:"Start →"},en:{t1:"This is not a test.",t2:"This is your mirror.",p1:"No scores. No marks. No right or wrong.",p2:"4 real trading situations will appear.\nChoose your honest reaction.\nI will reflect your behavior back to you.",tags:["4 Situations","Your Reactions","Behavior Analysis","Your Profile"],cta:"Start →"}};
  const RES={te:{tag:"నీ Behavior Analysis",primary:"Primary Pattern Detected",breakdown:"4 Situations లో నీ Behavior",strength:"Hidden Strength",notice:"Notice చేయి",close:"నువ్వు ఇప్పుడు నీ గురించి చదివావు.",closeg:"ఇప్పటి నుండి నీ trading వేరేగా మొదలవుతుంది.",cta:"నా Analysis Save చేసుకో →"},en:{tag:"Your Behavior Analysis",primary:"Primary Pattern Detected",breakdown:"Your Behavior Across 4 Situations",strength:"Hidden Strength",notice:"Pay Attention",close:"You have now read about yourself.",closeg:"Your trading changes from this point.",cta:"Save My Analysis →"}};
  const LED={te:{tag:"నీ Analysis Save చేసుకో",th:"నీ analysis నీకు పంపిస్తా.",tg:"నీ పేరు చెప్పు.",sub:"నీ report WhatsApp కి వస్తుంది. Cherry personally review చేస్తాడు.",nl:"నీ పేరు",np:"పేరు రాయి...",wl:"WhatsApp Number",wp:"10-digit number రాయి...",el:"నీ Trading Experience",lvls:[{v:"beginner",l:"Beginner — Trading start చేశాను"},{v:"struggling",l:"Struggling — Losses అవుతున్నాయి"},{v:"inconsistent",l:"Inconsistent — కొన్నిసార్లు profit, కొన్నిసార్లు loss"},{v:"experienced",l:"Experienced — System కోసం వెతుకుతున్నా"}],sub2:"నా Report పంపించు →",send:"పంపిస్తున్నాను...",priv:"నీ details ఎవరికీ share చేయం. Spam రాదు.",eN:"పేరు రాయి",eW:"Valid WhatsApp number రాయి",eL:"Level select చేయి"},en:{tag:"Save Your Analysis",th:"I will send your analysis.",tg:"Tell me who you are.",sub:"Your report comes to WhatsApp. Cherry personally reviews it.",nl:"Your Name",np:"Enter your name...",wl:"WhatsApp Number",wp:"Enter 10-digit number...",el:"Your Trading Experience",lvls:[{v:"beginner",l:"Beginner — Just started trading"},{v:"struggling",l:"Struggling — Taking regular losses"},{v:"inconsistent",l:"Inconsistent — Sometimes profit, sometimes loss"},{v:"experienced",l:"Experienced — Looking for a system"}],sub2:"Send My Report →",send:"Sending...",priv:"Your details are never shared. No spam.",eN:"Enter your name",eW:"Enter valid WhatsApp number",eL:"Select your level"}};
  const CNV={te:{tag:"నీ తర్వాత Step",h:"నీ problem ఇప్పుడు clearly తెలుసు.",sub:'"Analysis మాత్రమే చాలదు. దాన్ని fix చేయడానికి ఒక system కావాలి."',cards:["నువ్వు chart చదవడం నేర్చుకున్నావు. కానీ chart చూసే moment లో నీ mind ని control చేయడం నేర్చుకోలేదు.","Strategy correct గా ఉంటుంది. కానీ ఆ strategy execute చేసే వ్యక్తి correct గా లేడు — అందుకే results వేరేగా వస్తున్నాయి.","Mind Power Vault లో ఉన్నది strategies కాదు — ఈ gap ని close చేసే system. నీ specific pattern కి specific approach."],k1:"ఇప్పుడైనా…",k2:"random గా trade చేయాలా…",k3:"లేదా conscious గా?",s1:"Strategies అన్ని చోట్లా దొరుకుతాయి.",h2:"Clarity ఇక్కడ మాత్రమే.",s2:"ఇది నీ స్థలం.",b1:"🎯 Mentorship కి Apply చేయి",b2:"Free Community లో Join చేయి",lk:"🔒 Limited seats. Cherry personally review చేస్తాడు.",bio:"11 సంవత్సరాల trading. 7 సంవత్సరాల teaching.",q:'"Profit promise చేయను. Clarity ఇస్తాను."',rev:"Real Students",soc:"మాతో Connect అవ్వు",disc:"SEBI registered investment advice కాదు."},en:{tag:"Your Next Step",h:"Your problem is now clearly visible.",sub:'"Analysis alone isn\'t enough. Fixing it requires a system."',cards:["You learned to read charts. But you haven't learned to control your mind while reading them.","The strategy is correct. But the person executing it isn't — that's why the results are different.","Mind Power Vault doesn't teach strategies — it closes this gap. A specific approach for your specific pattern."],k1:"From this point…",k2:"do you trade randomly…",k3:"or consciously?",s1:"Strategies are everywhere.",h2:"Clarity is rare.",s2:"This is where you find it.",b1:"🎯 Apply for Mentorship",b2:"Join Free Community",lk:"🔒 Limited seats. Cherry personally reviews each application.",bio:"11 years trading. 7 years teaching.",q:'"I don\'t promise profit. I offer clarity."',rev:"Real Students",soc:"Connect With Us",disc:"Not SEBI registered investment advice."}};
  const L={rit:RIT[lang],hro:HRO[lang],mir:MIR[lang],int:INT[lang],res:RES[lang],led:LED[lang],cnv:CNV[lang]};

  const Ritual=()=>(
    <div style={{minHeight:"100vh",background:G.black,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",padding:"0 24px"}}>
      <div style={{maxWidth:560}}>
        {rs>=1&&<p className={`rit ${lc}`} style={{fontSize:"clamp(16px,2.4vw,22px)",color:G.soft,fontStyle:"italic",lineHeight:2.1,marginBottom:32}}>{L.rit.l1}</p>}
        {rs>=2&&<p className={`pin ${lc}`} style={{fontSize:"clamp(18px,2.8vw,26px)",color:G.smoke,lineHeight:1.95,marginBottom:32}}>{L.rit.l2}</p>}
        {rs>=3&&<>
          <p className={`pin ${lc}`} style={{fontSize:"clamp(18px,2.8vw,26px)",color:G.gold,fontWeight:600,lineHeight:1.9,marginBottom:52,whiteSpace:"pre-line"}}>{L.rit.l3}</p>
          <div className="pin" style={{display:"flex",flexDirection:"column",gap:14,alignItems:"center"}}>
            <button className="bg" onClick={()=>goTo(1)} style={{...gBtn,width:"100%",maxWidth:420}}>{L.rit.yes}</button>
            <button className="bo" onClick={()=>{}} style={{...oBtn,width:"100%",maxWidth:420,fontSize:11}}>{L.rit.no}</button>
          </div>
        </>}
      </div>
    </div>
  );

  const Hero=()=>(
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",inset:0,backgroundImage:`linear-gradient(${G.goldDim} 1px,transparent 1px),linear-gradient(90deg,${G.goldDim} 1px,transparent 1px)`,backgroundSize:"58px 58px",opacity:0.7}}/>
      <div className="brth" style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:540,height:540,background:"radial-gradient(circle,rgba(201,168,76,0.11) 0%,transparent 65%)"}}/>
      <div style={{position:"relative",zIndex:1,padding:"0 24px",maxWidth:760,margin:"0 auto"}}>
        <div style={{opacity:heroIn?1:0,transform:heroIn?"none":"translateY(14px)",transition:"all 0.8s ease 0.1s"}}>
          <p style={{fontSize:11,letterSpacing:6,color:`${G.gold}75`,textTransform:"uppercase",marginBottom:28,fontFamily:sans}}>Mind Power Vaultt</p>
        </div>
        <div style={{opacity:heroIn?1:0,transform:heroIn?"none":"translateY(18px)",transition:"all 0.9s ease 0.45s"}}>
          <h1 className={lc} style={{fontSize:"clamp(26px,4.5vw,56px)",fontWeight:600,fontStyle:"italic",color:G.soft,lineHeight:1.35,marginBottom:16}}>{L.hro.l1}</h1>
        </div>
        <div style={{opacity:heroIn?1:0,transform:heroIn?"none":"translateY(18px)",transition:"all 0.9s ease 0.85s"}}>
          <h2 className={lc} style={{fontSize:"clamp(30px,5vw,66px)",fontWeight:700,color:G.gold,lineHeight:1.15,marginBottom:28,whiteSpace:"pre-line"}}>{L.hro.l2}</h2>
        </div>
        <div style={{opacity:heroIn?1:0,transform:heroIn?"none":"translateY(14px)",transition:"all 0.8s ease 1.2s"}}>
          <p className={lc} style={{fontSize:"clamp(14px,2vw,20px)",fontStyle:"italic",color:G.mid,lineHeight:1.9,marginBottom:44,maxWidth:540,margin:"0 auto 44px",whiteSpace:"pre-line"}}>{L.hro.sub}</p>
        </div>
        <div style={{opacity:heroIn?1:0,transition:"all 0.8s ease 1.5s"}}>
          <GL/>
          <div style={{marginTop:48}}><button className="bg" onClick={()=>goTo(2)} style={gBtn}>{L.hro.cta}</button></div>
        </div>
      </div>
      <div className="scrl" style={{position:"absolute",bottom:36,display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
        <div style={{width:1,height:36,background:`linear-gradient(to bottom,transparent,${G.gold}70)`}}/>
        <span style={{fontSize:8,letterSpacing:4,color:`${G.gold}55`,textTransform:"uppercase",fontFamily:sans}}>scroll</span>
      </div>
    </div>
  );

  const Mirror=()=>(
    <div style={sec}>
      <div style={{textAlign:"center",marginBottom:60}}>
        <Tg>The Mirror</Tg>
        <h2 className={lc} style={{fontSize:"clamp(28px,4vw,52px)",color:G.smoke,marginBottom:18}}>{L.mir.title}</h2>
        <p className={lc} style={{color:G.mid,fontSize:16,letterSpacing:0.5,lineHeight:1.9,fontStyle:"italic"}}>{L.mir.sub}</p>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(270px,1fr))",gap:14,marginBottom:44}}>
        {L.mir.cards.map((c,i)=>(
          <div key={i} style={{background:`${G.gold}04`,border:`1px solid ${G.goldDim}`,borderRadius:7,padding:"22px 18px",display:"flex",gap:14,alignItems:"flex-start"}}>
            <span style={{fontSize:24,flexShrink:0}}>{c.i}</span>
            <p className={lc} style={{color:G.mid,fontSize:14,lineHeight:1.9}}>{c.t}</p>
          </div>
        ))}
      </div>
      <div style={{textAlign:"center",padding:"28px 24px",border:`1px solid ${G.goldDim}`,borderRadius:7,background:`${G.gold}04`,marginBottom:52}}>
        <p className={lc} style={{fontSize:"clamp(17px,2.2vw,24px)",fontStyle:"italic",color:G.gold,lineHeight:1.9,whiteSpace:"pre-line"}}>{L.mir.close}</p>
      </div>
      <div style={{textAlign:"center"}}>
        <p className={lc} style={{fontSize:14,color:G.mid,marginBottom:28}}>{L.mir.prompt}</p>
        <button className="bg" onClick={()=>goTo(3)} style={gBtn}>{L.mir.cta}</button>
      </div>
    </div>
  );

  const Intro=()=>(
    <div style={{...sec,textAlign:"center"}}>
      <Tg>Self-Discovery Engine</Tg>
      <div className="lg" style={{width:1,background:`linear-gradient(to bottom,transparent,${G.gold})`,margin:"0 auto 32px"}}/>
      <h2 className={lc} style={{fontSize:"clamp(24px,4vw,48px)",color:G.smoke,marginBottom:20,lineHeight:1.3}}>
        {L.int.t1}<br/><span style={{color:G.gold,fontStyle:"italic"}}>{L.int.t2}</span>
      </h2>
      <p className={lc} style={{color:G.mid,fontSize:16,lineHeight:2,maxWidth:480,margin:"0 auto 14px"}}>{L.int.p1}</p>
      <p className={lc} style={{color:G.soft,fontSize:14,lineHeight:2,maxWidth:480,margin:"0 auto 48px",whiteSpace:"pre-line"}}>{L.int.p2}</p>
      <GL/>
      <div style={{marginTop:44,display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
        {L.int.tags.map((s,i)=><span key={i} style={{padding:"7px 16px",border:`1px solid ${G.goldDim}`,borderRadius:2,fontSize:9,letterSpacing:2,color:G.mid,textTransform:"uppercase",fontFamily:sans}}>{s}</span>)}
      </div>
      <div style={{marginTop:52}}>
        <button className="bg" onClick={()=>{setScIdx(0);setAnswers([]);setRefText(null);setShowEsc(false);setEscPend(null);goTo(4);}} style={gBtn}>{L.int.cta}</button>
      </div>
    </div>
  );

  const Scenario=()=>{
    const prg=(scIdx/SCENARIOS.length)*100;
    return(
      <div style={sec}>
        <div style={{marginBottom:44}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:9}}>
            <span style={{fontSize:10,letterSpacing:3,color:`${G.gold}65`,textTransform:"uppercase",fontFamily:sans}}>Situation {scIdx+1} / {SCENARIOS.length}</span>
            <span style={{fontSize:10,color:G.soft,fontFamily:sans}}>{Math.round(prg)}%</span>
          </div>
          <div style={{height:1,background:G.goldDim}}><div style={{height:"100%",width:`${prg}%`,background:`linear-gradient(to right,${G.gold}70,${G.gold})`,transition:"width 0.5s ease"}}/></div>
        </div>
        {showEsc&&(
          <div className="pin" style={{padding:"40px 28px",background:G.dark2,border:`1px solid ${G.gold}35`,borderRadius:8,textAlign:"center"}}>
            <div style={{width:1,height:40,background:`linear-gradient(to bottom,transparent,${G.gold})`,margin:"0 auto 28px"}}/>
            <p className={lc} style={{fontSize:"clamp(18px,2.5vw,26px)",color:G.smoke,lineHeight:2.1,whiteSpace:"pre-line",marginBottom:20}}>{sc.escLine[lang]}</p>
            <p className={lc} style={{fontSize:14,color:`${G.gold}85`,fontStyle:"italic",marginBottom:36}}>{sc.escNote[lang]}</p>
            <button className="bg" onClick={handleEsc} style={gBtn}>{sc.escBtn[lang]}</button>
          </div>
        )}
        {!showEsc&&!refText&&<>
          <div style={{marginBottom:36,padding:"28px 26px",background:G.dark2,border:`1px solid ${G.goldDim}`,borderRadius:8}}>
            <Tg>{lang==="te"?"Situation":"Situation"}</Tg>
            <p className={lc} style={{fontSize:"clamp(17px,2.3vw,24px)",color:G.smoke,lineHeight:1.95}}>{scL.sit}</p>
          </div>
          <p className={lc} style={{fontSize:14,letterSpacing:1,color:G.mid,textAlign:"center",marginBottom:22}}>{scL.q}</p>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {scL.ch.map((c,i)=>(
              <button key={i} className="bc" onClick={()=>handleChoice(i)}>
                <div style={{width:28,height:28,borderRadius:"50%",border:`1px solid ${G.goldDim}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <span style={{fontSize:10,color:`${G.gold}80`,fontWeight:600,fontFamily:sans}}>{String.fromCharCode(65+i)}</span>
                </div>
                <span className={lc} style={{color:G.mid,fontSize:15,lineHeight:1.8}}>{c.l}</span>
              </button>
            ))}
          </div>
          <p style={{marginTop:22,textAlign:"center",fontSize:11,color:G.vsoft,letterSpacing:1.5,fontFamily:sans}}>Nobody is watching. But you are.</p>
        </>}
        {refText&&!showEsc&&(
          <div className="pin">
            <div style={{textAlign:"center",marginBottom:28}}>
              <Tg>Mirror</Tg>
              <div style={{width:1,height:40,background:`linear-gradient(to bottom,transparent,${G.gold})`,margin:"0 auto"}}/>
            </div>
            <div style={{padding:"32px 28px",background:G.dark2,border:`1px solid ${G.gold}25`,borderRadius:8,marginBottom:20}}>
              <p className={lc} style={{fontSize:"clamp(16px,2.3vw,22px)",color:G.smoke,lineHeight:2.05,fontStyle:"italic"}}>"{refText}"</p>
            </div>
            {sc.showCommunity&&(
              <div style={{padding:"16px 20px",background:`${G.gold}07`,border:`1px solid ${G.goldDim}`,borderRadius:5,display:"flex",alignItems:"center",gap:14,marginBottom:20}}>
                <span style={{fontSize:22,flexShrink:0}}>👥</span>
                <p className={lc} style={{fontSize:14,color:G.mid,lineHeight:1.8}}>{sc.commLine[lang]}</p>
              </div>
            )}
            <div style={{textAlign:"center"}}>
              <button className="bg" onClick={handleNext} style={gBtn}>
                {scIdx<SCENARIOS.length-1?(lang==="te"?"Continue →":"Continue →"):(lang==="te"?"నా Analysis చూడు →":"See My Analysis →")}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const Result=()=>{
    if(!profile)return null;
    const {primaryLine,coreInsight,warningLine,strengthLine,behaviorLines}=profile;
    return(
      <div style={{...sec,textAlign:"center"}}>
        <Tg>{L.res.tag}</Tg>
        <div style={{width:1,height:52,background:`linear-gradient(to bottom,transparent,${G.gold})`,margin:"0 auto 32px"}}/>
        <div style={{display:"flex",justifyContent:"center",gap:10,marginBottom:40}}>
          {[0,1,2,3].map(i=>{const t=TM[`s${i}_${answers[i]}`];return(
            <div key={i} style={{textAlign:"center"}}>
              <div style={{width:46,height:46,borderRadius:"50%",background:t?.neg?"rgba(139,26,26,0.18)":"rgba(107,142,107,0.15)",border:`2px solid ${t?.neg?"rgba(139,26,26,0.45)":"rgba(107,142,107,0.4)"}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 6px",fontSize:18}}>
                {t?.neg?"⚠️":"✓"}
              </div>
              <div style={{fontSize:9,color:G.soft,letterSpacing:1,fontFamily:sans}}>S{i+1}</div>
            </div>
          );})}
        </div>
        <div style={{padding:"32px 28px",background:G.dark2,border:`1px solid ${G.gold}30`,borderRadius:8,marginBottom:20,maxWidth:620,margin:"0 auto 20px",textAlign:"left"}}>
          <p style={{fontSize:10,letterSpacing:4,color:`${G.gold}80`,textTransform:"uppercase",marginBottom:16,fontFamily:sans}}>{L.res.primary}</p>
          <h2 className={lc} style={{fontSize:"clamp(17px,2.5vw,26px)",color:G.smoke,lineHeight:1.8,marginBottom:16,whiteSpace:"pre-line"}}>{primaryLine}</h2>
          <p className={lc} style={{fontSize:"clamp(14px,1.9vw,18px)",color:G.mid,lineHeight:2,fontStyle:"italic"}}>"{coreInsight}"</p>
        </div>
        <div style={{maxWidth:620,margin:"0 auto 20px",textAlign:"left"}}>
          <p style={{fontSize:10,letterSpacing:4,color:`${G.gold}70`,textTransform:"uppercase",marginBottom:16,textAlign:"center",fontFamily:sans}}>{L.res.breakdown}</p>
          {behaviorLines.map((line,i)=>line?(
            <div key={i} style={{display:"flex",gap:14,alignItems:"flex-start",marginBottom:12,padding:"14px 18px",background:`${G.gold}04`,border:`1px solid ${G.goldDim}`,borderRadius:6}}>
              <span style={{fontSize:11,color:`${G.gold}85`,fontWeight:700,flexShrink:0,marginTop:2,fontFamily:sans}}>S{i+1}</span>
              <p className={lc} style={{fontSize:14,color:G.mid,lineHeight:1.8}}>{line}</p>
            </div>
          ):null)}
        </div>
        {strengthLine&&<div style={{maxWidth:620,margin:"0 auto 16px",padding:"18px 22px",background:"rgba(107,142,107,0.07)",border:"1px solid rgba(107,142,107,0.22)",borderRadius:6,textAlign:"left"}}><p style={{fontSize:10,letterSpacing:3,color:"rgba(107,142,107,0.85)",textTransform:"uppercase",marginBottom:10,fontFamily:sans}}>{L.res.strength}</p><p className={lc} style={{fontSize:14,color:G.mid,lineHeight:1.8}}>{strengthLine}</p></div>}
        {warningLine&&<div style={{maxWidth:620,margin:"0 auto 32px",padding:"18px 22px",background:"rgba(139,26,26,0.07)",border:"1px solid rgba(139,26,26,0.22)",borderRadius:6,textAlign:"left"}}><p style={{fontSize:10,letterSpacing:3,color:"rgba(200,80,80,0.8)",textTransform:"uppercase",marginBottom:10,fontFamily:sans}}>{L.res.notice}</p><p className={lc} style={{fontSize:14,color:G.mid,lineHeight:1.8}}>{warningLine}</p></div>}
        <div style={{maxWidth:580,margin:"0 auto 40px",padding:"26px 28px",border:`1px solid ${G.gold}35`,borderRadius:7,background:`${G.gold}06`}}>
          <p className={lc} style={{fontSize:"clamp(16px,2vw,21px)",color:G.smoke,lineHeight:2}}>"{L.res.close}<br/><span style={{color:G.gold}}>{L.res.closeg}"</span></p>
        </div>
        <button className="bg" onClick={()=>goTo(6)} style={gBtn}>{L.res.cta}</button>
      </div>
    );
  };

  const LeadCapture=()=>{
    const [form,setForm]=useState({name:"",wa:"",level:""});
    const [errs,setErrs]=useState({});
    const [sending,setSending]=useState(false);
    const LL=L.led;
    const valid=()=>{const e={};if(!form.name.trim())e.name=LL.eN;if(form.wa.replace(/\D/g,"").length<10)e.wa=LL.eW;if(!form.level)e.level=LL.eL;return e;};
    const submit=()=>{const e=valid();if(Object.keys(e).length){setErrs(e);return;}setSending(true);const pat=profile?profile.primaryLine?.split("\n")[0]||"":"";const msg=encodeURIComponent(`🔔 *New MPV Lead*\n\n👤 *Name:* ${form.name}\n📱 *WhatsApp:* ${form.wa}\n📊 *Level:* ${form.level}\n\n🧠 *Pattern:* ${pat}\n\n_Via mindpowervaultt.com_`);setTimeout(()=>{setSending(false);window.open(`https://wa.me/${CHERRY_WA}?text=${msg}`,"_blank");goTo(7);},1200);};
    const is=(f)=>({width:"100%",padding:"14px 18px",background:"rgba(201,168,76,0.04)",border:`1px solid ${errs[f]?"rgba(200,80,80,0.5)":G.goldDim}`,borderRadius:6,color:G.smoke,fontSize:15,fontFamily:sans});
    return(
      <div style={sec}>
        <div style={{textAlign:"center",marginBottom:52}}>
          <Tg>{LL.tag}</Tg>
          <div style={{width:1,height:40,background:`linear-gradient(to bottom,transparent,${G.gold})`,margin:"0 auto 28px"}}/>
          <h2 className={lc} style={{fontSize:"clamp(24px,3.5vw,44px)",color:G.smoke,marginBottom:16,lineHeight:1.4}}>"{LL.th}<br/><span style={{color:G.gold}}>{LL.tg}"</span></h2>
          <p className={lc} style={{color:G.mid,fontSize:14,lineHeight:1.9}}>{LL.sub}</p>
        </div>
        <div style={{maxWidth:520,margin:"0 auto",display:"flex",flexDirection:"column",gap:24}}>
          <div>
            <label style={{fontSize:10,letterSpacing:3,color:`${G.gold}80`,textTransform:"uppercase",display:"block",marginBottom:8,fontFamily:sans}}>{LL.nl}</label>
            <input type="text" value={form.name} placeholder={LL.np} onChange={e=>{setForm(f=>({...f,name:e.target.value}));setErrs(r=>({...r,name:""}));}} style={is("name")}/>
            {errs.name&&<p style={{color:"rgba(200,80,80,0.8)",fontSize:12,marginTop:6,fontFamily:sans}}>{errs.name}</p>}
          </div>
          <div>
            <label style={{fontSize:10,letterSpacing:3,color:`${G.gold}80`,textTransform:"uppercase",display:"block",marginBottom:8,fontFamily:sans}}>{LL.wl}</label>
            <input type="tel" value={form.wa} placeholder={LL.wp} onChange={e=>{setForm(f=>({...f,wa:e.target.value}));setErrs(r=>({...r,wa:""}));}} style={is("wa")}/>
            {errs.wa&&<p style={{color:"rgba(200,80,80,0.8)",fontSize:12,marginTop:6,fontFamily:sans}}>{errs.wa}</p>}
          </div>
          <div>
            <label style={{fontSize:10,letterSpacing:3,color:`${G.gold}80`,textTransform:"uppercase",display:"block",marginBottom:8,fontFamily:sans}}>{LL.el}</label>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {LL.lvls.map(l=>(
                <button key={l.v} onClick={()=>{setForm(f=>({...f,level:l.v}));setErrs(r=>({...r,level:""}));}}
                  style={{padding:"14px 18px",textAlign:"left",cursor:"pointer",background:form.level===l.v?`rgba(201,168,76,0.12)`:`rgba(201,168,76,0.03)`,border:`1px solid ${form.level===l.v?G.gold:G.goldDim}`,borderRadius:6,color:form.level===l.v?G.smoke:G.mid,fontSize:14,fontFamily:sans,transition:"all 0.2s",display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:18,height:18,borderRadius:"50%",flexShrink:0,border:`2px solid ${form.level===l.v?G.gold:G.goldDim}`,background:form.level===l.v?G.gold:"transparent",transition:"all 0.2s"}}/>
                  <span className={lc}>{l.l}</span>
                </button>
              ))}
            </div>
            {errs.level&&<p style={{color:"rgba(200,80,80,0.8)",fontSize:12,marginTop:6,fontFamily:sans}}>{errs.level}</p>}
          </div>
          <div style={{marginTop:8}}>
            <button className="bg" onClick={submit} style={{...gBtn,width:"100%",padding:"18px",fontSize:13,borderRadius:4,opacity:sending?0.5:1,cursor:sending?"not-allowed":"pointer"}}>{sending?LL.send:LL.sub2}</button>
            <p style={{textAlign:"center",marginTop:12,fontSize:11,color:G.vsoft,letterSpacing:1,fontFamily:sans}}>{LL.priv}</p>
          </div>
        </div>
      </div>
    );
  };

  const Conversion=()=>{
    const CV=L.cnv;
    const mMsg=encodeURIComponent(lang==="te"?"నమస్కారం Cherry గారు, నేను MPV Self-Discovery Engine complete చేశాను. Mentorship గురించి మాట్లాడాలనుకుంటున్నాను.":"Hello Cherry, I completed the MPV Self-Discovery Engine. I would like to discuss mentorship.");
    const cMsg=encodeURIComponent(lang==="te"?"నమస్కారం, నేను Mind Power Vaultt Free Community లో join అవ్వాలనుకుంటున్నాను.":"Hello, I would like to join the Mind Power Vaultt Free Community.");
    const socials=[{icon:"▶",label:"YouTube",url:"https://youtube.com/@mindpowervaultt",color:"#FF4444"},{icon:"📸",label:"Instagram",url:"https://instagram.com/mindpowervaultt",color:"#E1306C"},{icon:"𝕏",label:"X",url:"https://x.com/mindpowervaultt",color:G.smoke},{icon:"✈",label:"Telegram",url:"https://t.me/mindpowervaultt",color:"#2AABEE"}];
    return(
      <div style={{...sec,textAlign:"center"}}>
        <Tg>{CV.tag}</Tg>
        <div style={{width:1,height:40,background:`linear-gradient(to bottom,transparent,${G.gold})`,margin:"0 auto 32px"}}/>
        <h2 className={lc} style={{fontSize:"clamp(26px,3.5vw,46px)",color:G.smoke,lineHeight:1.4,marginBottom:20,maxWidth:620,margin:"0 auto 20px"}}>{CV.h}</h2>
        <p className={lc} style={{fontSize:"clamp(16px,2vw,22px)",color:G.mid,lineHeight:1.9,fontStyle:"italic",maxWidth:560,margin:"0 auto 52px"}}>{CV.sub}</p>
        <div style={{maxWidth:620,margin:"0 auto 52px",display:"flex",flexDirection:"column",gap:16}}>
          {CV.cards.map((c,i)=>(
            <div key={i} style={{display:"flex",gap:20,alignItems:"flex-start",padding:"22px 24px",background:G.dark2,border:`1px solid ${G.goldDim}`,borderRadius:8,textAlign:"left"}}>
              <span style={{fontFamily:serif,fontSize:32,color:`${G.gold}35`,fontWeight:700,flexShrink:0,lineHeight:1}}>0{i+1}</span>
              <p className={lc} style={{fontFamily:serif,fontSize:"clamp(14px,1.8vw,18px)",color:G.mid,lineHeight:1.9,fontStyle:"italic"}}>{c}</p>
            </div>
          ))}
        </div>
        <div style={{maxWidth:680,margin:"0 auto 52px"}}>
          <Tg c="s">{CV.rev}</Tg>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(270px,1fr))",gap:16}}>
            {REVIEWS.map((r,i)=>(
              <div key={i} style={{background:G.dark2,border:`1px solid ${G.goldDim}`,borderRadius:8,padding:"22px 20px",textAlign:"left"}}>
                <div style={{color:G.gold,fontSize:16,marginBottom:12}}>{"★".repeat(r.stars)}</div>
                <p className={lc} style={{fontSize:13,color:G.mid,lineHeight:1.85,fontStyle:"italic",marginBottom:16}}>"{r[lang]}"</p>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:30,height:30,borderRadius:"50%",background:`${G.gold}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:G.gold,fontWeight:700,fontFamily:sans}}>{r.name[0]}</div>
                  <div><div style={{fontSize:12,color:G.smoke,fontFamily:sans,fontWeight:600}}>{r.name}</div><div style={{fontSize:10,color:G.soft,fontFamily:sans,letterSpacing:1}}>{r.city}</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{maxWidth:460,margin:"0 auto 52px"}}>
          <GL/>
          <div style={{marginTop:40}}>
            <p className={lc} style={{fontFamily:serif,fontSize:"clamp(20px,3vw,34px)",color:G.smoke,lineHeight:1.75,marginBottom:4}}>{CV.k1}</p>
            <p className={lc} style={{fontFamily:serif,fontSize:"clamp(18px,2.5vw,28px)",color:G.soft,lineHeight:1.75,marginBottom:4,fontStyle:"italic"}}>{CV.k2}</p>
            <p className={lc} style={{fontFamily:serif,fontSize:"clamp(22px,3vw,36px)",color:G.gold,lineHeight:1.75,fontWeight:700}}>{CV.k3}</p>
          </div>
        </div>
        <div style={{position:"relative",maxWidth:560,margin:"0 auto 48px",padding:"48px 32px",background:G.dark2,border:`1px solid ${G.goldDim}`,borderRadius:8}}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:`linear-gradient(to right,transparent,${G.gold},transparent)`}}/>
          <p className={lc} style={{fontSize:12,letterSpacing:2,color:G.mid,textTransform:"uppercase",marginBottom:12}}>{CV.s1}</p>
          <h2 className={lc} style={{fontFamily:serif,fontSize:"clamp(26px,4vw,46px)",color:G.gold,fontWeight:700,marginBottom:12}}>{CV.h2}</h2>
          <p className={lc} style={{fontSize:12,letterSpacing:2,color:G.mid,textTransform:"uppercase",marginBottom:40}}>{CV.s2}</p>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <button className="bg" onClick={()=>window.open(`https://wa.me/${CHERRY_WA}?text=${mMsg}`,"_blank")} style={{...gBtn,width:"100%",padding:"18px",fontSize:13,borderRadius:4,cursor:"pointer"}}>{CV.b1}</button>
            <button className="bo" onClick={()=>window.open(`https://wa.me/${CHERRY_WA}?text=${cMsg}`,"_blank")} style={{...oBtn,width:"100%",padding:"16px",fontSize:12,borderRadius:4,cursor:"pointer"}}>{CV.b2}</button>
          </div>
          <div style={{marginTop:20,padding:"14px",background:`${G.gold}06`,borderRadius:4,border:`1px solid ${G.goldDim}`}}>
            <p className={lc} style={{fontSize:13,color:G.mid,lineHeight:1.8}}>{CV.lk}</p>
          </div>
          <div style={{position:"absolute",bottom:0,left:0,right:0,height:1,background:`linear-gradient(to right,transparent,${G.gold}35,transparent)`}}/>
        </div>
        <div style={{maxWidth:560,margin:"0 auto 48px",display:"grid",gridTemplateColumns:"auto 1fr",gap:22,alignItems:"center",textAlign:"left",padding:"28px",background:G.dark2,border:`1px solid ${G.goldDim}`,borderRadius:8}}>
          <div className="flt" style={{width:64,height:64,borderRadius:"50%",background:`linear-gradient(135deg,${G.gold}28,${G.gold}0a)`,border:`2px solid ${G.gold}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,flexShrink:0}}>🧘</div>
          <div>
            <Tg>Cherry</Tg>
            <p className={lc} style={{fontSize:13,color:G.mid,lineHeight:1.9,marginBottom:8}}>{CV.bio}</p>
            <p className={lc} style={{fontFamily:serif,fontSize:14,fontStyle:"italic",color:G.soft}}>{CV.q}</p>
          </div>
        </div>
        <div style={{maxWidth:460,margin:"0 auto 32px"}}>
          <Tg c="s">{CV.soc}</Tg>
          <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
            {socials.map((s,i)=>(
              <button key={i} onClick={()=>window.open(s.url,"_blank")}
                style={{padding:"10px 16px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:6,color:s.color,cursor:"pointer",fontSize:13,fontFamily:sans,display:"flex",alignItems:"center",gap:8,transition:"border-color 0.2s"}}
                onMouseEnter={e=>e.currentTarget.style.borderColor=s.color}
                onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(255,255,255,0.1)"}>
                <span>{s.icon}</span><span style={{fontSize:11,letterSpacing:1}}>{s.label}</span>
              </button>
            ))}
          </div>
        </div>
        <p style={{marginTop:8,fontSize:9,color:G.vsoft,letterSpacing:1.5,lineHeight:2,fontFamily:sans}}>Mind Power Vaultt · Trading Psychology Education<br/>{CV.disc}</p>
      </div>
    );
  };

  const phases=[<Ritual/>,<Hero/>,<Mirror/>,<Intro/>,<Scenario/>,<Result/>,<LeadCapture/>,<Conversion/>];
  const navStyle={position:"fixed",top:0,left:0,right:0,zIndex:300,padding:"14px 28px",display:"flex",justifyContent:"space-between",alignItems:"center",background:scrolled?"rgba(5,5,10,0.97)":"transparent",borderBottom:scrolled?`1px solid ${G.goldDim}`:"none",transition:"all 0.4s"};

  return(
    <div style={{background:G.black,color:G.smoke,fontFamily:sans,minHeight:"100vh",overflowX:"hidden"}}>
      <style>{css}</style>
      <div ref={topRef}/>
      {phase>0&&<AIChat lang={lang}/>}
      {phase>0&&(
        <nav style={navStyle}>
          <div style={{cursor:"pointer"}} onClick={()=>{setPhase(1);setScIdx(0);setAnswers([]);setRefText(null);setShowEsc(false);setEscPend(null);top();}}>
            <div style={{fontFamily:serif,fontSize:22,fontWeight:700,letterSpacing:3,color:G.gold,textTransform:"uppercase",lineHeight:1.2}}>Mind Power Vaultt</div>
            <div style={{fontSize:10,letterSpacing:3,color:G.mid,textTransform:"uppercase",marginTop:3,fontFamily:sans}}>Trading Psychology · Discipline · Clarity</div>
          </div>
          <div style={{display:"flex",gap:12,alignItems:"center"}}>
            <div style={{display:"flex",background:"rgba(201,168,76,0.08)",border:`1px solid ${G.goldDim}`,borderRadius:40,padding:"3px"}}>
              {["te","en"].map(l=>(
                <button key={l} onClick={()=>setLang(l)} style={{padding:"5px 14px",borderRadius:30,border:"none",cursor:"pointer",fontSize:10,fontWeight:700,letterSpacing:1,fontFamily:sans,background:lang===l?G.gold:"transparent",color:lang===l?G.black:`${G.smoke}55`,transition:"all 0.3s"}}>
                  {l==="te"?"తె":"EN"}
                </button>
              ))}
            </div>
            {phase>1&&(
              <button className="bo" onClick={goBack} style={{background:"transparent",border:`1px solid ${G.goldDim}`,color:G.mid,padding:"6px 16px",borderRadius:2,fontSize:10,letterSpacing:2,textTransform:"uppercase",fontFamily:sans}}>
                {lang==="te"?"← వెనక్కి":"← Back"}
              </button>
            )}
          </div>
        </nav>
      )}
      <div style={{opacity:fading?0:1,transform:fading?"translateY(12px)":"none",transition:"opacity 0.23s ease,transform 0.23s ease"}}>
        <div style={phase<=1?{}:{maxWidth:720,margin:"0 auto",padding:"0 22px"}}>
          {phases[phase]}
        </div>
      </div>
    </div>
  );
}
