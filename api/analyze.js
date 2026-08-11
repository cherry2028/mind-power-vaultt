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
//
// PROVIDER: Gemini (was Groq). Groq's free tier is 12,000 tokens/MINUTE, and a
// single Telugu reveal costs ~8,000 tokens, so it could serve barely one
// student a minute site-wide — a WhatsApp blast would rate-limit everyone. The
// retry (two calls ≈ 15k tokens) exceeded the per-minute ceiling on its own.
// Paid Gemini flash runs ~1000+ requests/minute, which absorbs a WhatsApp
// broadcast spike, and it tokenizes Telugu far more efficiently. The prompt, the
// two few-shot examples, the validator and the local fallback are all unchanged
// — only the model provider moved. The Gemini native generateContent endpoint is
// used (system + user/model turns carry the same text) with thinking disabled.
import { checkSimpleLimit } from './_lib/ratelimit.js';
import { validateProfile, latinizeProfile, LIMITS } from './_lib/analyzeVoice.js';

const MODEL = 'gemini-flash-latest';
// Native generateContent endpoint (not the OpenAI-compat one). The compat layer
// could not disable thinking: reasoning_effort:'none' 400s ("invalid argument")
// and there is no reliable REST field for a zero thinking budget there. The
// native endpoint exposes thinkingConfig.thinkingBudget:0 directly, which is
// what drops latency from ~20s to ~3s. It also gives native JSON mode.
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
// gemini-flash-latest currently resolves to gemini-3.6-flash, which rejects a
// thinkingBudget of 0 (it has a thinking floor). 128 is the minimum it accepts
// and keeps latency at ~3-4s vs ~13s at the model's default budget. Any residual
// Telugu-script slip from the lower budget is fixed deterministically by
// latinizeProfile(), so speed and brand-voice script are both guaranteed.
const THINKING_BUDGET = 128;

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
• English trading/psychology words ENGLISH అక్షరాల్లోనే రాయి — trade, loss, profit, SL, target, entry, exit, setup, ego, FOMO, greed, over-confidence, system, plan, mind, screen, recover, revenge, process, control, discipline. వాటిని Telugu script లోకి మార్చొద్దు: "ట్రేడ్", "ప్రాఫిట్", "ఓవర్ కాన్ఫిడెన్స్", "సెటప్", "ఎంటర్" — ఇది తప్పు. trade, profit, over-confidence, setup, enter అని English లోనే రాయాలి. (మినహాయింపు: "మార్కెట్" మాత్రం Telugu script లో OK — అది అలవాటైపోయింది.) అసలు Telugu మాటలు (భయం, ఆశ, తపన, గెలుపు) Telugu script లో. News Telugu కాదు, పుస్తకం Telugu కాదు — మనం మాట్లాడుకున్నట్టు.
• వాడు చెప్పిన choice ని పట్టుకో — ఆ choice వెనుక వాడు చెప్పని అసలు MOTIVE ని (ఎందుకు అలా చేశాడో) బయటపెట్టు. Choice ని repeat చేయడం analysis కాదు — కానీ వాడు select చేయని కొత్త behaviour ని కల్పించడం అబద్ధం.
• GROUNDING (ఇది break చేయకూడదు): నువ్వు రాసే ప్రతి behaviour నేరుగా వాడి 4 choices నుండే రావాలి. వాడు choose చేయని దాన్ని fact లా చెప్పకు. Motive ని లోతుగా చెప్పు — కొత్త కథ అల్లకు.
• ప్రతి line వేరేగా ఉండాలి. ఒకే structure, ఒకే ending 2 సార్లు వాడకు.
• భయపెట్టకు. నిజం చెప్పు — కానీ వాడిని కించపరచకు.

━━ BANS ━━
✗ "చూపిస్తుంది", "సూచిస్తుంది", "దీని అర్థం", "విశ్లేషణ ప్రకారం", "తెలియజేస్తుంది"
✗ "…ఇది నీ X ని చూపిస్తుంది" లాంటి template — ఇది AI slop.
✗ website, app, subscribe, WhatsApp, course, పుస్తకాలు, link — ఏ CTA కూడా వద్దు. ఇది pure mirror. అమ్మడం లేదు.
✗ "Market knowledge లేదు", "కోర్సు తీసుకో", "పుస్తకం చదువు" — మన philosophy కి పూర్తి వ్యతిరేకం. Problem knowledge కాదు, mind.
✗ hiddenStrength లో greed/revenge/అత్యాశ ని "ధైర్యం" అని పొగడకు. నిజమైన strength లేకపోతే "N/A" ఇవ్వు.
✗ actionStep — behaviour/process action మాత్రమే. కొత్త strategy కాదు.
✗ వాడు select చేయని physical reaction / behaviour ని కల్పించకు — "SL దగ్గర చేతులు వణుకుతాయి", "screen చూస్తూ చెమటలు పోస్తాయి", "గుండె వేగంగా కొట్టుకుంటుంది" లాంటివి వాడి 4 choices లో లేకపోతే absolutely రాయకు. అవి 4 decisions మాత్రమే ఇచ్చాడు — physical states కాదు.

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
• Grab the choice they actually made, then expose the unstated MOTIVE behind it (why they really chose it). Restating their choice is not analysis — but inventing a behaviour they never chose is a lie.
• GROUNDING (do not break this): every behaviour you describe must trace directly to one of their 4 actual choices. Never state as fact something they did not choose. Go deep on the motive; do not make up a new story.
• Every line distinct. Never reuse a structure or an ending.
• Be honest without insulting them.

━━ BANS ━━
✗ "This suggests", "this indicates", "this shows that", "in conclusion"
✗ Any repeated template across the four behaviour lines.
✗ website, app, subscribe, WhatsApp, course, books, link — NO CTA. This is a pure mirror, not a pitch.
✗ "You lack market knowledge", "take a course", "read books" — against our philosophy. The gap is the mind, not knowledge.
✗ Never praise greed/revenge as "courage" in hiddenStrength. If there is no genuine strength, return "N/A".
✗ actionStep must be a behaviour/process action — never a new strategy.
✗ Never invent a physical reaction or behaviour they did not choose — "your hands shake at SL", "you sweat watching the screen", "your heart races" — unless their own choice says so. They gave 4 DECISIONS, not physical states.

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

// Gemini tokenizes Telugu efficiently (native SentencePiece coverage, ~1 token
// per character, unlike Llama's ~2.2). But gemini-2.5-flash is a THINKING model:
// it spends completion tokens on internal reasoning before the JSON, and via
// the OpenAI-compat layer those count against max_tokens. So the budget must
// cover thinking + the actual reveal or the JSON truncates to empty. Kept
// generous — only tokens actually generated are billed.
const MAX_TOKENS = { te: 6000, en: 4000 };

async function callGemini(apiKey, messages, temperature, maxTokens) {
  // buildMessages() still speaks the OpenAI shape (system/user/assistant) so the
  // orchestration + unit tests are provider-agnostic. Convert to Gemini native:
  // system -> systemInstruction, user -> role "user", assistant -> role "model".
  const sys = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));

  const r = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      ...(sys ? { systemInstruction: { parts: [{ text: sys }] } } : {}),
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingBudget: THINKING_BUDGET },
      },
    }),
  });

  const data = await r.json().catch(() => null);
  const errObj = Array.isArray(data) ? data.find((d) => d && d.error)?.error : data?.error;
  if (errObj) {
    // Gemini's INVALID_ARGUMENT message is generic; the offending field is in
    // details[].fieldViolations. Surface it so a bad param is diagnosable.
    const detail = errObj.details ? ' :: ' + JSON.stringify(errObj.details).slice(0, 300) : '';
    throw new Error((errObj.message || `Gemini error (HTTP ${r.status})`) + detail);
  }
  if (!r.ok) throw new Error(`Gemini HTTP ${r.status}`);

  const cand = data?.candidates?.[0];
  if (cand?.finishReason === 'MAX_TOKENS') {
    console.error('[MPV-ANALYZE] hit maxOutputTokens (%d) — output truncated', maxTokens);
  }
  const content = (cand?.content?.parts || []).map((p) => p?.text || '').join('');
  if (!content || content.trim().length < 5) {
    // Empty content on a 200 usually means a safety block or refusal.
    console.error('[MPV-ANALYZE] empty Gemini content. finish=%s raw=%s',
      cand?.finishReason, JSON.stringify(data).slice(0, 400));
    throw new Error('Gemini returned empty content');
  }
  let raw = content;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start !== -1 && end !== -1) raw = raw.substring(start, end + 1);
  return JSON.parse(raw);
}

// The full generate-validate-retry orchestration, with the model call injected
// so the exact production decision path (attempt 1 → feed violations back →
// attempt 2 → keep the better of the two) can be exercised in a unit test
// without a network or an API key. Returns the chosen profile, its validator
// verdict, and how many model calls were made.
export async function generateProfile({ call, systemPrompt, userInput, ctx, maxTokens }) {
  let attempts = 1;
  let profile = latinizeProfile(await call(buildMessages(systemPrompt, userInput), 0.5, maxTokens));
  let check = validateProfile(profile, ctx);

  if (!check.ok) {
    console.warn('[MPV-ANALYZE] attempt 1 failed validation:', check.violations.slice(0, 6));
    const note = check.violations.slice(0, 8).map((x) => `- ${x}`).join('\n');
    try {
      attempts = 2;
      const retry = latinizeProfile(await call(buildMessages(systemPrompt, userInput, note), 0.35, maxTokens));
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

  return { profile, check, attempts };
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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not set in Vercel Environment Variables' });

  try {
    const { profile, check, attempts } = await generateProfile({
      call: (messages, temperature, maxTokens) => callGemini(apiKey, messages, temperature, maxTokens),
      systemPrompt,
      userInput,
      ctx,
      maxTokens: MAX_TOKENS[ctx.lang],
    });

    // Signal quality to the caller so it can prefer its local template when the
    // model could not hit the voice (never show off-voice output as "yours").
    // _attempts (1 = passed first try, 2 = a retry was needed) is harmless
    // telemetry the client ignores.
    return res.status(200).json({ ...profile, _voiceOk: check.ok, _violations: check.ok ? [] : check.violations.slice(0, 8), _attempts: attempts });
  } catch (err) {
    console.error('[MPV-ANALYZE] handler error:', err?.message);
    return res.status(500).json({ error: err.message });
  }
}
