import { escapeHTML } from './_lib/utils.js';
import { checkSimpleLimit } from './_lib/ratelimit.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  if (!checkSimpleLimit(ip, 5)) {
    return res.status(429).json({ error: 'Too many requests. Try again later.' });
  }

  const { name, phone, experience, profile } = req.body;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return res.status(500).json({ error: 'Telegram configuration missing. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env.' });
  }

  const message = `
<b>New Lead Captured!</b>
━━━━━━━━━━━━━━━━━━━━━
<b>Name:</b> ${escapeHTML(name)}
<b>Phone:</b> ${escapeHTML(phone)}
<b>Experience:</b> ${escapeHTML(experience)}
<b>Pattern:</b> ${escapeHTML(profile?.primaryPattern || 'N/A')}
━━━━━━━━━━━━━━━━━━━━━
`;

  try {
    // 1. Send to Telegram
    const telegramRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    });
    const telegramData = await telegramRes.json();
    if (!telegramData.ok) {
      return res.status(500).json({ error: telegramData.description || 'Telegram sendMessage failed' });
    }

    // 2. Placeholder for DB storage (e.g. Supabase, Firebase, Google Sheets)
    // console.log("Lead data:", { name, phone, experience, profile });

    return res.status(200).json({ success: true, message: 'Lead saved and notification sent' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
