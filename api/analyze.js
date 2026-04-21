// /api/analyze.js — Vercel Serverless Function
// Set ANTHROPIC_API_KEY in Vercel Dashboard → Project Settings → Environment Variables

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { choiceDescriptions, lang } = req.body || {};
  if (!choiceDescriptions) return res.status(400).json({ error: 'Missing data' });

  const isTE = lang === 'te';

  const systemPrompt = isTE
    ? `నువ్వు ఒక experienced trading psychology mentor. చాలా మంది traders తో పని చేసిన నీకు human behavior బాగా అర్థమవుతుంది.

ఒక trader యొక్క 4 responses చూసి వారి psychology గురించి రాయి. ఒక friend లా, mentor లా రాయి — clinical గా కాదు.

నీ భాష:
- Simple, natural Telugu వాడు. Literary కాదు.
- "మీరు" కాదు, "నువ్వు" వాడు — personally మాట్లాడినట్టు
- Observations specific గా ఉండాలి — generic phrases వద్దు
- Warm, honest, caring tone
- English words natural గా mix చేయవచ్చు (traders తో common)

ONLY valid JSON return చేయి — no extra text, no markdown:
{
  "primaryPattern": "2-3 lines — ఈ trader లో కనిపించే main psychological pattern. Specific గా వారి choices కి relate చేసి చెప్పు. Human గా రాయి.",
  "coreInsight": "3-4 sentences — వారి behavior వెనక ఉన్న real reason ఏమిటో deeply explain చేయి. Why this happens, what drives it. Friend తో మాట్లాడినట్టు రాయి.",
  "behaviorLines": [
    "S1: ఈ situation లో వారు ఎంచుకున్న answer వల్ల వారిలో ఏ specific pattern కనపడుతోందో explain చేయి — 1-2 sentences",
    "S2: Same — S2 choice గురించి specific observation",
    "S3: Same — S3 choice గురించి",
    "S4: Same — S4 choice గురించి"
  ],
  "hiddenStrength": "1-2 sentences — వారి choices లో genuine గా కనపడే strength ఏదైనా ఉంటే చెప్పు. Forced positivity వద్దు.",
  "warningLine": "1-2 sentences — ఈ pattern continue అయితే specifically ఏమి జరుగుతుందో honest గా చెప్పు.",
  "actionStep": "1 concrete, specific action — ఈ వారం నుండి చేయగలిగేది. Vague advice వద్దు."
}`
    : `You are an experienced trading psychology mentor who has worked with many traders. You understand human behavior deeply.

Analyze a trader's 4 responses and write about their psychology. Write like a mentor, like a friend — not clinical.

Your language:
- Conversational, warm English
- Direct — "you" not "the trader"
- Specific observations tied to their exact choices — no generic phrases
- Honest but caring tone

ONLY valid JSON — no extra text, no markdown:
{
  "primaryPattern": "2-3 lines — the main psychological pattern visible in this trader. Specific to their choices. Human tone.",
  "coreInsight": "3-4 sentences — the real reason behind their behavior. What drives it, why it happens. Write like talking to a friend.",
  "behaviorLines": [
    "S1: What their choice in situation 1 reveals about their pattern — 1-2 specific sentences",
    "S2: Same for S2",
    "S3: Same for S3",
    "S4: Same for S4"
  ],
  "hiddenStrength": "1-2 sentences — genuine strength visible in their choices, if any. No forced positivity.",
  "warningLine": "1-2 sentences — honestly, what happens if this pattern continues. Be specific.",
  "actionStep": "1 concrete action they can start this week. No vague advice."
}`;

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set in Vercel Environment Variables' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1400,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: `Here are the trader's 4 situation responses:\n\n${choiceDescriptions}\n\nAnalyze their trading psychology and return the JSON profile.`
        }]
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('Anthropic error:', data.error);
      return res.status(500).json({ error: data.error.message });
    }

    const raw = (data.content?.[0]?.text || '').replace(/```json|```/g, '').trim();
    const match = raw.match(/\{[\s\S]*\}/);

    if (!match) {
      console.error('No JSON in response:', raw);
      return res.status(500).json({ error: 'Invalid response format' });
    }

    const parsed = JSON.parse(match[0]);
    return res.status(200).json(parsed);

  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
