import { checkSimpleLimit } from './_lib/ratelimit.js';
import { logEvent } from './_lib/logger.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';

  if (!checkSimpleLimit(ip, 10)) {
    logEvent('telegram_rate_blocked', { ip });
    return res.status(429).json({ error: 'Too many requests. Try again later.' });
  }

  const internalKey = req.headers['x-internal-key'];
  const serverKey = process.env.INTERNAL_API_KEY || process.env.VITE_INTERNAL_API_KEY;

  if (serverKey && internalKey && internalKey !== serverKey) {
    logEvent('telegram_unauthorized', { ip });
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const { message } = req.body || {};
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
  if (!message || !TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return res.status(400).json({ error: 'Missing configuration or message' });
  }

  try {
    const MAX_LENGTH = 4000;
    let isSuccess = true;
    let errorMessage = '';

    for (let i = 0; i < message.length; i += MAX_LENGTH) {
      const chunk = message.substring(i, i + MAX_LENGTH);
      
      // FIX: Send as Absolute Plain Text (Removed parse_mode completely)
      // This guarantees Telegram won't reject it due to special characters.
      const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: chunk })
      });
      
      const data = await response.json();
      
      if (!data.ok) {
        isSuccess = false;
        errorMessage = data.description;
        break; 
      }
    }

    if (isSuccess) {
      return res.status(200).json({ success: true });
    } else {
      return res.status(500).json({ error: errorMessage });
    }

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}