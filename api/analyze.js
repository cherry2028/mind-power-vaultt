// /api/analyze.js — Vercel Serverless Function
// This proxies the Anthropic API call securely from the server side
// Set ANTHROPIC_API_KEY in Vercel Dashboard → Project Settings → Environment Variables

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS headers — allow our website
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const { choiceDescriptions, lang } = req.body;

  if (!choiceDescriptions) {
    return res.status(400).json({ error: 'Missing choiceDescriptions' });
  }

  const isTE = lang === 'te';

  const systemPrompt = isTE
    ? `నువ్వు MPV Trading Psychology Expert. ఒక trader యొక్క 4 situation responses deeply analyze చేసి వారి behavioral profile రాయి.

IMPORTANT: ONLY valid JSON respond చేయి. No extra text. This exact structure:
{
  "primaryPattern": "2-3 lines Telugu — trader యొక్క core psychological pattern specific గా",
  "coreInsight": "3-4 sentences Telugu — deep psychological insight, why this pattern formed, what it costs them",
  "behaviorLines": [
    "S1: Situation 1 లో వారి specific behavior ఎందుకు జరిగిందో explain చేయి — Telugu",
    "S2: Situation 2 లో వారి specific behavior — Telugu",
    "S3: Situation 3 లో వారి specific behavior — Telugu",
    "S4: Situation 4 లో వారి specific behavior — Telugu"
  ],
  "hiddenStrength": "2 sentences Telugu — వారి choices లో ఉన్న genuine strength",
  "warningLine": "2 sentences Telugu — ఈ pattern వల్ల specific గా ఏమి జరుగుతోందో warning",
  "actionStep": "1 specific, practical step Telugu — ఈ వారం నుండి చేయగలిగేది"
}

Rules:
- Generic గా రాయకు. Specific గా వారి exact choices కి respond చేయి
- Empathetic గా ఉండు, judgmental కాదు
- Simple Telugu వాడు, literary కాదు`
    : `You are MPV Trading Psychology Expert. Deeply analyze a trader's 4 situation responses and write their behavioral profile.

IMPORTANT: ONLY valid JSON. No extra text. This exact structure:
{
  "primaryPattern": "2-3 lines — trader's core psychological pattern, specific to their choices",
  "coreInsight": "3-4 sentences — deep psychological insight: why this pattern formed, what it costs them in trading",
  "behaviorLines": [
    "S1: What specifically drove their behavior in situation 1 and why",
    "S2: What specifically drove their behavior in situation 2 and why",
    "S3: What specifically drove their behavior in situation 3 and why",
    "S4: What specifically drove their behavior in situation 4 and why"
  ],
  "hiddenStrength": "2 sentences — genuine strength visible in their choices",
  "warningLine": "2 sentences — specific warning about what this pattern costs them",
  "actionStep": "1 specific, practical step they can take starting this week"
}

Rules:
- Never generic. Respond specifically to their exact choices
- Empathetic, not judgmental
- Concrete, actionable language`;

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured. Set ANTHROPIC_API_KEY in Vercel.' });
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
        max_tokens: 1200,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: `Analyze this trader's responses and provide their psychology profile:\n\n${choiceDescriptions}`
        }]
      })
    });

    const data = await response.json();
    const raw = (data.content?.[0]?.text || '').replace(/```json|```/g, '').trim();
    const match = raw.match(/\{[\s\S]*\}/);

    if (!match) {
      return res.status(500).json({ error: 'Invalid AI response format' });
    }

    const parsed = JSON.parse(match[0]);
    return res.status(200).json(parsed);

  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: err.message });
  }
}

