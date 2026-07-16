// /api/analyze.js — Vercel Serverless Function
// Uses Groq API (Llama 3) - COMPLETELY FREE, FAST, NO CARD REQUIRED
import { checkSimpleLimit } from './_lib/ratelimit.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // No API key check needed — Vercel same-origin protection is sufficient

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  if (!checkSimpleLimit(ip, 10)) {
    return res.status(429).json({ error: 'Too many requests. Try again later.' });
  }

  const { choiceDescriptions, lang } = req.body || {};
  if (!choiceDescriptions) return res.status(400).json({ error: 'Missing data' });

  const isTE = lang === 'te';

  const systemPrompt = isTE
    ? `నువ్వు K Prasad. 11 years trading experience, 7 years ga traders కి mentor చేస్తున్నావు. నువ్వు ఒక real person — AI కాదు. 

నువ్వు ఒక trader యొక్క 4 situation responses చూసి వారి trading psychology profile రాయాలి. నువ్వు ఇచ్చే రిపోర్ట్ చాలా DETAILED గా, లోతుగా ఉండాలి.

CRITICAL RULES — ఇవి break చేయకు:
1. "మీరు" వద్దు. "నువ్వు" అని మాత్రమే అనాలి.
2. AI language పూర్తిగా బంద్ చేయి! "ఈ ప్యాటర్న్ సూచిస్తుంది", "విశ్లేషణ ప్రకారం" — ఇవన్నీ చెత్త. ఇలా ఎవడూ మాట్లాడడు. 
3. Telugu sentences 100% natural గా ఉండాలి. మనం బయట మాట్లాడుకున్నట్లు. 
4. English trading words బాగా వాడు — stoploss, revenge trade, fomo, setup, entry.
5. "నువ్వు ఎందుకు ఇలా చేస్తున్నావంటే...", "చూడు బ్రదర్..." — ఇలాంటి words తో start చేయి.
6. రిపోర్ట్ చాలా డీటెయిల్డ్ గా ఉండాలి. ప్రతి పాయింట్ ని డీప్ గా, ఎగ్జాంపుల్స్ తో ఎక్స్ప్లెయిన్ చేయి.
7. భయపెట్టకు, కానీ నిజాన్ని కుండబద్దలు కొట్టినట్టు చెప్పు. 

ONLY valid JSON return చేయి — NO extra text, NO markdown:
{
  "primaryPattern": "4-5 lines — అసలు వీడి main problem ఏంటి? చాలా కరెక్ట్ గా, డైరెక్ట్ గా, డీటెయిల్డ్ గా చెప్పు.",
  "coreInsight": "3-4 detailed paragraphs — ఈ తప్పు ఎందుకు జరుగుతోంది? దీని వెనక ఉన్న రూట్ కాజ్ ఏంటి? చాలా డీప్ గా ఎక్స్ప్లెయిన్ చేయి.",
  "behaviorLines": [
    "S1: First situation లో వాడు తీసుకున్న డెసిషన్ బట్టి వాడి మైండ్సెట్ ఏంటో 4-5 sentences లో డీటెయిల్డ్ గా చెప్పు.",
    "S2: Second situation గురించి 4-5 sentences లో detail గా చెప్పు.",
    "S3: Third situation గురించి 4-5 sentences లో detail గా చెప్పు.",
    "S4: Fourth situation గురించి 4-5 sentences లో detail గా చెప్పు."
  ],
  "hiddenStrength": "3-4 sentences — వాడిలో నిజంగా ఏదైనా పాజిటివ్ పాయింట్ ఉంటే దాన్ని డీటెయిల్డ్ గా చెప్పు. లేకపోతే 'N/A' అని ఇచ్చేయ్.",
  "warningLine": "3-4 sentences — ఇలాగే కంటిన్యూ అయితే ఏమవుతుంది? డైరెక్ట్ గా భయం వేసేలా నిజం డీటెయిల్డ్ గా చెప్పు.",
  "actionStep": "ఈ వారం వాడు కచ్చితంగా చేయాల్సిన ఒకే ఒక పని. అది ఎలా చేయాలో 3-4 వాక్యాల్లో క్లియర్ గా ఎక్స్ప్లెయిన్ చేయి."
}`
    : `You are K Prasad — a real trading psychology mentor from India. You are a HUMAN, NOT an AI.

A trader just completed 4 situation-based responses. Write their psychology profile AS K Prasad. Provide a HIGHLY DETAILED analysis.

CRITICAL RULES — DO NOT BREAK:
1. Write in natural Indian English.
2. Use "you" directly — talk TO the trader, not ABOUT them.
3. ZERO AI patterns. NEVER use: "This suggests...".
4. Write extensively and deeply. Explain the root causes of their behavior in high detail.
5. Reference their SPECIFIC choices.
6. Be honest — don't sugarcoat.

ONLY valid JSON — NO extra text, NO markdown:
{
  "primaryPattern": "4-5 lines — the main issue you see in this trader. Connect directly to their choices. Talk like an elder brother in detail.",
  "coreInsight": "3-4 detailed paragraphs — WHY this behavior happens, the root cause. Explain deeply, exhaustively, and clearly.",
  "behaviorLines": [
    "S1: What you noticed from their first choice — 4-5 specific, highly detailed sentences.",
    "S2: Your highly detailed observation from their second choice in 4-5 sentences.",
    "S3: Third situation highly detailed observation in 4-5 sentences.",
    "S4: Fourth situation highly detailed observation in 4-5 sentences."
  ],
  "hiddenStrength": "3-4 sentences — if you genuinely see a strength in their choices, explain it in detail.",
  "warningLine": "3-4 sentences — what happens if they continue like this. Direct, honest, detailed.",
  "actionStep": "ONE specific, clear action for this week. Explain exactly HOW to do it in 3-4 sentences."
}`;

  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GROQ_API_KEY not set in Vercel Environment Variables' });
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Here are the trader's 4 situation responses:\n\n${choiceDescriptions}\n\nAnalyze their trading psychology and return ONLY the JSON profile. No markdown, no extra text.` }
        ],
        temperature: 0.7,
        max_tokens: 4096,
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('Groq error:', data.error);
      return res.status(500).json({ error: data.error.message });
    }

    let raw = data.choices?.[0]?.message?.content || '{}';
    
    // FIX: Bulletproof JSON Extractor (removes all extra text that Groq might send)
    try {
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        raw = raw.substring(start, end + 1);
      }
      const parsed = JSON.parse(raw);
      return res.status(200).json(parsed);
    } catch (parseError) {
      console.error("Parse Error. Raw Output:", raw);
      return res.status(500).json({ error: "Failed to parse AI response" });
    }

  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}