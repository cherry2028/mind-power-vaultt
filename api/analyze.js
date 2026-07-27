// /api/analyze.js — the self-discovery reveal.
//
// This is the emotional peak of the funnel, so the writing matters more than
// anything else here. Two things make it work:
//   1. Cherry's own hand-written examples are sent as real few-shot message
//      turns (rules alone do not transfer style — examples do; the Telugu
//      default register in these models is formal/news, so it must be SHOWN).
//   2. Every result is machine-checked by api/_lib/analyzeVoice.js. Fail once
//      -> retry with the violations fed back. Fail twice -> the caller's local
//      template profile is used. A student never sees off-voice output.
import { checkSimpleLimit } from './_lib/ratelimit.js';
import { validateProfile, LIMITS } from './_lib/analyzeVoice.js';

const MODEL = 'llama-3.3-70b-versatile';

// ── Cherry's voice anchors ────────────────────────────────────────────────
// Written by Cherry, used verbatim. The paired input for each is reconstructed
// from the answers he described so the pair is internally consistent.
const EXAMPLE_1_INPUT = `Situation 1: "Setup కనిపించింది, entry కి సిద్ధంగా ఉన్నావు — price వెళ్ళిపోయింది. Trade miss అయింది." → User chose: "Price వెళ్ళిన direction లోనే enter అవుతాను"
Situation 2: "ఈరోజు మొదటి trade లో loss వచ్చింది." → User chose: "వెంటనే ఇంకో trade తీసుకుంటాను"
Situation 3: "పెద్ద profit వచ్చింది." → User chose: "ఇంకో trade తీసుకుంటాను"
Situation 4: "Entry కి ముందు SL గురించి ఆలోచిస్తున్నావు." → User chose: "SL పెడతాను — కానీ తగలకూడదని అనుకుంటాను"`;

const EXAMPLE_1_OUTPUT = {
  primaryPattern: 'నువ్వు trade చేయడంలేదు — మార్కెట్ తో గొడవ పడుతున్నావ్.',
  hiddenTruth: 'ఒక్క red candle — నీ ego ని డైరెక్ట్ గా కొడుతోంది.',
  emotionalState: 'ప్రతి trade ఒక revenge trade. ప్రతి ఒక్క entry నేను right అని నిరూపించుకోవాలి అనే attempt. మార్కెట్ ని గెలవడం కాదు — నిన్ను నువ్వు మోసం చేసుకుంటున్నావ్.',
  behaviorLines: [
    'Price ఎటు వెళ్తే అటు enter అవుతావు — analysis వల్ల కాదు, miss ఐపోతానేమో అనే భయం వల్ల.',
    'ఒక trade లో loss వస్తే వెంటనే enter అవుతావు — recover అవడానికి కాదు, ఆ feeling ని భరించలేక.',
    'Profit వచ్చాక ఆగవు — ఇంకా కావాలి ఇంకా కావాలి అనే అత్యాశ. ఇది luck కాదు నా skill అని నీకు నువ్వే చెప్పుకునే ego statement.',
    'SL పెట్టావు — తగలకూడదని దేవుడా దేవుడా అనుకుంటావ్. నిజంగా నువ్వు పెడుతున్నది SL కాదు — ఆశ ని SL గా పెడుతున్నావ్.',
  ],
  hiddenStrength: 'నువ్వు ఇంకా trading చేస్తున్నావ్ అంటే — నువ్వు వదిలేయలేదు. అది weakness కాదు. నీ fight లో తపన ఉంది, కానీ clarity లేదు.',
  actionStep: 'ఇకనుండి ఒక rule: loss వచ్చాక 10 నిమిషాలు screen కి దూరంగా ఉండు. ఆగాల్సింది trade కాదు — నీ ego.',
};

const EXAMPLE_2_INPUT = `Situation 1: "Setup కనిపించింది, entry కి సిద్ధంగా ఉన్నావు — price వెళ్ళిపోయింది. Trade miss అయింది." → User chose: "మళ్ళీ ఇలాంటి setup వస్తుందని wait చేస్తాను"
Situation 2: "ఈరోజు మొదటి trade లో loss వచ్చింది." → User chose: "Loss వచ్చినా కంగారు పడను — process follow అవుతాను"
Situation 3: "పెద్ద profit వచ్చింది." → User chose: "Profit book చేసి ఆపేస్తాను"
Situation 4: "Entry కి ముందు SL గురించి ఆలోచిస్తున్నావు." → User chose: "SL ని respect చేస్తాను"`;

const EXAMPLE_2_OUTPUT = {
  primaryPattern: 'నువ్వు process ని follow అవుతున్నావ్ — కానీ ఇంకా outcome ని నమ్ముతున్నావ్.',
  hiddenTruth: 'నీ discipline నిజం, సందేహం లేదు. కానీ ప్రతి profit closing day నీకు "నేను market pulse పట్టుకున్నాను" అనిపిస్తోంది. అదే నీ next TRAP.',
  emotionalState: 'Calm గా ఉన్నావ్ — కానీ ఆ calmness ఇంకా results మీద depend అవుతోంది. నిజమైన calmness అంటే — outcome మారినా మారనిది.',
  behaviorLines: [
    'Proper setup కోసం wait చేస్తావ్ — ఇది చాలామంది చేయలేరు, నువ్వు చేసి చూపిస్తున్నావ్.',
    'Loss వచ్చినా కంగారు పడవ్ — నా process correct ఐతే చాలు అని నీకు clarity ఉంది.',
    'Profit book చేసి ఆగగలిగే control ఉంది నీలో — greed ని గుర్తించగలవ్ నువ్వు.',
    'SL ని respect చేస్తావ్ — అది rule కాదు, నీ promise. దాన్ని నువ్వు break చేయవ్.',
  ],
  hiddenStrength: 'నీ ప్రశాంతత నీ edge. నిన్ను professional trader గా చేసేది నీ strategy కాదు — నీ controlling strength.',
  actionStep: 'ఇకనుండి P&L కాదు — process score రాయి. Measure చేయాల్సింది result కాదు, నీ decision quality.',
};

const SYSTEM_TE = `నువ్వు Cherry anna (K Prasad) — 12 years trading experience, Telugu traders కి trading psychology mentor. నువ్వు ఒక REAL మనిషి. AI కాదు.

ఒక trader 4 situations కి తన honest reactions ఇచ్చాడు. వాడి mirror ని నువ్వు రాయాలి.

━━ VOICE (ఇదే అన్నిటికన్నా ముఖ్యం) ━━
• "నువ్వు" మాత్రమే. "నీవు", "మీరు", "మీకు" — absolutely BAN.
• పొట్టి lines. ఒక్క sentence 16 words దాటకూడదు.
• Contrastive structure వాడు: "X కాదు — Y." "recover అవడానికి కాదు, ఆ feeling ని భరించలేక."
• Telugu script + సహజమైన English trading words (trade, loss, SL, ego, setup, entry, profit) — మనం మాట్లాడుకున్నట్టు. News Telugu కాదు, పుస్తకం Telugu కాదు.
• వాడు చెప్పిన choice ని పట్టుకో — తర్వాత వాడు చెప్పని అసలు motive ని బయటపెట్టు. Choice ని repeat చేయడం analysis కాదు.
• ప్రతి line వేరేగా ఉండాలి. ఒకే structure, ఒకే ending 2 సార్లు వాడకు.
• భయపెట్టకు. నిజం చెప్పు — కానీ వాడిని కించపరచకు.

━━ BANS ━━
✗ "చూపిస్తుంది", "సూచిస్తుంది", "దీని అర్థం", "విశ్లేషణ ప్రకారం", "తెలియజేస్తుంది"
✗ "…ఇది నీ X ని చూపిస్తుంది" లాంటి template — ఇది AI slop.
✗ website, app, subscribe, WhatsApp, course, పుస్తకాలు, link — ఏ CTA కూడా వద్దు. ఇది pure mirror. అమ్మడం లేదు.
✗ "Market knowledge లేదు", "కోర్సు తీసుకో", "పుస్తకం చదువు" — మన philosophy కి పూర్తి వ్యతిరేకం. Problem knowledge కాదు, mind.
✗ hiddenStrength లో greed/revenge/అత్యాశ ని "ధైర్యం" అని పొగడకు. నిజమైన strength లేకపోతే "N/A" ఇవ్వు.
✗ actionStep — behaviour/process action మాత్రమే. కొత్త strategy కాదు.

━━ OUTPUT ━━
ONLY valid JSON. NO markdown, NO extra text:
{
  "primaryPattern": "1 punchy line (max ${LIMITS.chars.primaryPattern} chars) — వీడి అసలు problem.",
  "hiddenTruth": "1-2 lines (max ${LIMITS.chars.hiddenTruth}) — వాడికి తెలియని, గుచ్చుకునే నిజం.",
  "emotionalState": "2-3 పొట్టి lines (max ${LIMITS.chars.emotionalState}) — వాడి emotional state.",
  "behaviorLines": ["S1 line", "S2 line", "S3 line", "S4 line"],
  "hiddenStrength": "2-3 lines (max ${LIMITS.chars.hiddenStrength}) — నిజమైన strength, లేదా \\"N/A\\".",
  "actionStep": "1-2 lines (max ${LIMITS.chars.actionStep}) — ఈ వారం చేయాల్సిన ఒక్క behaviour change."
}
behaviorLines: సరిగ్గా 4. ఒక్కొక్కటి max ${LIMITS.chars.behaviorLine} chars. వరుసగా S1→S4.`;

const SYSTEM_EN = `You are Cherry anna (K Prasad) — 12 years trading, mentor to Telugu traders in trading psychology. You are a REAL person, not an AI.

A trader gave honest reactions to 4 situations. Write their mirror.

━━ VOICE ━━
• Speak directly as "you". Short lines — no sentence over 16 words.
• Use contrast: "not X — Y." ("not to recover the money — because you couldn't sit with the feeling.")
• Natural spoken Indian English. Never textbook, never corporate.
• Grab the choice they actually made, then expose the motive they did NOT say. Restating their choice is not analysis.
• Every line distinct. Never reuse a structure or an ending.
• Be honest without insulting them.

━━ BANS ━━
✗ "This suggests", "this indicates", "this shows that", "in conclusion"
✗ Any repeated template across the four behaviour lines.
✗ website, app, subscribe, WhatsApp, course, books, link — NO CTA. This is a pure mirror, not a pitch.
✗ "You lack market knowledge", "take a course", "read books" — against our philosophy. The gap is the mind, not knowledge.
✗ Never praise greed/revenge as "courage" in hiddenStrength. If there is no genuine strength, return "N/A".
✗ actionStep must be a behaviour/process action — never a new strategy.

━━ OUTPUT ━━
ONLY valid JSON, no markdown:
{
  "primaryPattern": "1 punchy line (max ${LIMITS.chars.primaryPattern} chars)",
  "hiddenTruth": "1-2 lines (max ${LIMITS.chars.hiddenTruth}) — the truth that stings",
  "emotionalState": "2-3 short lines (max ${LIMITS.chars.emotionalState})",
  "behaviorLines": ["S1", "S2", "S3", "S4"],
  "hiddenStrength": "2-3 lines (max ${LIMITS.chars.hiddenStrength}) or \\"N/A\\"",
  "actionStep": "1-2 lines (max ${LIMITS.chars.actionStep}) — one behaviour change this week"
}
Exactly 4 behaviorLines, each max ${LIMITS.chars.behaviorLine} chars, in order S1→S4.`;

function buildMessages(systemPrompt, userInput, extraNote) {
  return [
    { role: 'system', content: extraNote ? `${systemPrompt}\n\n━━ నీ ముందు attempt fail అయింది ━━\n${extraNote}\nఇప్పుడు ఈ తప్పులు లేకుండా మళ్ళీ రాయి.` : systemPrompt },
    // Few-shot as real turns — this is what actually transfers the voice.
    { role: 'user', content: EXAMPLE_1_INPUT },
    { role: 'assistant', content: JSON.stringify(EXAMPLE_1_OUTPUT) },
    { role: 'user', content: EXAMPLE_2_INPUT },
    { role: 'assistant', content: JSON.stringify(EXAMPLE_2_OUTPUT) },
    { role: 'user', content: userInput },
  ];
}

async function callGroq(apiKey, messages, temperature) {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature,
      max_tokens: 1100,          // short reveal — also cuts latency from ~8s to ~3s
      frequency_penalty: 0.4,    // discourage recycled phrasing
      presence_penalty: 0.3,
      response_format: { type: 'json_object' },
    }),
  });
  const data = await r.json();
  if (data.error) throw new Error(data.error.message || 'Groq error');
  let raw = data.choices?.[0]?.message?.content || '{}';
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start !== -1 && end !== -1) raw = raw.substring(start, end + 1);
  return JSON.parse(raw);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  if (!checkSimpleLimit(ip, 10)) {
    return res.status(429).json({ error: 'Too many requests. Try again later.' });
  }

  const { choiceDescriptions, choiceLabels, lang } = req.body || {};
  if (!choiceDescriptions) return res.status(400).json({ error: 'Missing data' });

  const isTE = lang !== 'en';
  const systemPrompt = isTE ? SYSTEM_TE : SYSTEM_EN;
  const userInput = `${choiceDescriptions}\n\nఇప్పుడు ఈ trader కి mirror రాయి. ONLY JSON.`;

  // Recover the situation text from the payload so a behaviour line may anchor
  // on the situation instead of parroting the option label (see validator #8).
  const situationLabels = String(choiceDescriptions)
    .split('\n')
    .map((l) => (l.match(/Situation\s*\d+:\s*"([\s\S]*?)"\s*→/) || [])[1] || '')
    .filter((_, i) => i < 4);

  const ctx = {
    lang: isTE ? 'te' : 'en',
    choiceLabels: Array.isArray(choiceLabels) ? choiceLabels : [],
    situationLabels,
  };

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GROQ_API_KEY not set in Vercel Environment Variables' });

  try {
    // Attempt 1
    let profile = await callGroq(apiKey, buildMessages(systemPrompt, userInput), 0.5);
    let check = validateProfile(profile, ctx);

    // Attempt 2 — feed the exact violations back, colder.
    if (!check.ok) {
      console.warn('[MPV-ANALYZE] attempt 1 failed validation:', check.violations.slice(0, 6));
      const note = check.violations.slice(0, 8).map((x) => `- ${x}`).join('\n');
      try {
        const retry = await callGroq(apiKey, buildMessages(systemPrompt, userInput, note), 0.35);
        const retryCheck = validateProfile(retry, ctx);
        if (retryCheck.ok) {
          profile = retry;
          check = retryCheck;
        } else {
          console.warn('[MPV-ANALYZE] attempt 2 failed too:', retryCheck.violations.slice(0, 6));
          // Keep whichever had fewer problems; the client still gets a usable
          // reveal, and _voiceOk tells it the quality was not guaranteed.
          if (retryCheck.violations.length < check.violations.length) {
            profile = retry;
            check = retryCheck;
          }
        }
      } catch (e) {
        console.warn('[MPV-ANALYZE] retry threw:', e?.message);
      }
    }

    // Signal quality to the caller so it can prefer its local template when the
    // model could not hit the voice (never show off-voice output as "yours").
    return res.status(200).json({ ...profile, _voiceOk: check.ok, _violations: check.ok ? [] : check.violations.slice(0, 8) });
  } catch (err) {
    console.error('[MPV-ANALYZE] handler error:', err?.message);
    return res.status(500).json({ error: err.message });
  }
}
