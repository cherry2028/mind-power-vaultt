export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, phone, experience, profile } = req.body;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return res.status(500).json({ error: 'Telegram configuration missing. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env.' });
  }

  const message = `
<b>New Lead Captured!</b>
━━━━━━━━━━━━━━━━━━━━━
<b>Name:</b> ${name}
<b>Phone:</b> ${phone}
<b>Experience:</b> ${experience}
<b>Pattern:</b> ${profile?.primaryPattern || 'N/A'}
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
