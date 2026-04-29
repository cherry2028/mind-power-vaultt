import { checkSimpleLimit } from './_lib/ratelimit.js';
import { logEvent } from './_lib/logger.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';

  // Rate limit: 10 Telegram messages per IP per hour
  if (!checkSimpleLimit(ip, 10)) {
    logEvent('telegram_rate_blocked', { ip });
    return res.status(429).json({ error: 'Too many requests. Try again later.' });
  }

  // Internal API key check
  const internalKey = req.headers['x-internal-key'];
  const { INTERNAL_API_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = process.env;

  if (INTERNAL_API_KEY && internalKey !== INTERNAL_API_KEY) {
    logEvent('telegram_unauthorized', { ip });
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const { message } = req.body || {};
  if (!message || !TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return res.status(400).json({ error: 'Missing configuration or message' });
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'HTML' })
    });
    const data = await response.json();
    if (data.ok) return res.status(200).json({ success: true });
    return res.status(500).json({ error: data.description });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
