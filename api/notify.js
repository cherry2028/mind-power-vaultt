// /api/notify.js — Vercel Serverless Function
// 1. Sends full report to USER's email (via Resend)
// 2. Sends lead alert to K Prasad's Telegram Bot
//
// Environment Variables needed in Vercel:
//   TELEGRAM_BOT_TOKEN  — from @BotFather
//   TELEGRAM_CHAT_ID    — K Prasad's chat ID
//   RESEND_API_KEY      — from resend.com (free 100 emails/day)

function escapeHTML(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Internal-Key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // No API key check needed — Vercel same-origin protection is sufficient

  const { name, phone, email, level, report, lang } = req.body || {};
  if (!name || !phone) return res.status(400).json({ error: 'Missing name or phone' });

  const isTE = lang === 'te';
  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  // ═══════════════════════════════════════════════════════════════
  // 1. SEND REPORT TO USER'S EMAIL (via Resend)
  // ═══════════════════════════════════════════════════════════════
  let emailSent = false;
  const resendKey = process.env.RESEND_API_KEY;

  if (resendKey && email) {
    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#05050A;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#0A0A10;border:1px solid rgba(201,168,76,0.3);border-radius:12px;overflow:hidden;">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#C9A84C,#9A7020);padding:28px;text-align:center;">
      <h1 style="color:#05050A;margin:0;font-size:22px;letter-spacing:2px;">🧠 MIND POWER VAULTT</h1>
      <p style="color:rgba(5,5,10,0.7);margin:6px 0 0;font-size:12px;letter-spacing:3px;">YOUR TRADING PSYCHOLOGY REPORT</p>
    </div>

    <div style="padding:28px;">
      <!-- Greeting -->
      <p style="color:#F5F2EA;font-size:16px;line-height:1.8;">
        ${isTE ? `నమస్కారం ${escapeHTML(name)},` : `Hello ${escapeHTML(name)},`}<br>
        ${isTE ? 'మీ Trading Psychology Analysis report ఇది.' : 'Here is your Trading Psychology Analysis report.'}
      </p>

      <!-- Primary Pattern -->
      <div style="background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.3);border-radius:8px;padding:20px;margin:20px 0;">
        <p style="color:#C9A84C;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 12px;">
          ${isTE ? '🎯 Primary Pattern' : '🎯 Primary Pattern'}
        </p>
        <p style="color:#F5F2EA;font-size:15px;line-height:1.8;margin:0;white-space:pre-line;">${report?.primaryPattern ? escapeHTML(report.primaryPattern) : 'N/A'}</p>
      </div>

      <!-- Core Insight -->
      <div style="background:rgba(201,168,76,0.04);border:1px solid rgba(201,168,76,0.15);border-radius:8px;padding:20px;margin:20px 0;">
        <p style="color:#C9A84C;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 12px;">
          💡 Core Insight
        </p>
        <p style="color:#D0CCBF;font-size:14px;line-height:1.9;margin:0;font-style:italic;">"${report?.coreInsight ? escapeHTML(report.coreInsight) : 'N/A'}"</p>
      </div>

      <!-- 4 Situations -->
      <p style="color:#C9A84C;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:24px 0 12px;">
        📋 ${isTE ? '4 Situations లో మీ Behavior' : 'Your Behavior Across 4 Situations'}
      </p>
      ${(report?.behaviorLines || []).map((l, i) => `
        <div style="background:rgba(201,168,76,0.03);border:1px solid rgba(201,168,76,0.12);border-radius:6px;padding:14px;margin:8px 0;">
          <span style="color:#C9A84C;font-size:11px;font-weight:bold;">S${i + 1}</span>
          <span style="color:#D0CCBF;font-size:13px;line-height:1.8;margin-left:10px;">${escapeHTML(l)}</span>
        </div>
      `).join('')}

      <!-- Strength -->
      ${report?.hiddenStrength ? `
      <div style="background:rgba(107,142,107,0.08);border:1px solid rgba(107,142,107,0.25);border-radius:8px;padding:16px;margin:20px 0;">
        <p style="color:rgba(107,142,107,0.9);font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 8px;">✅ ${isTE ? 'Hidden Strength' : 'Hidden Strength'}</p>
        <p style="color:#D0CCBF;font-size:13px;line-height:1.8;margin:0;">${escapeHTML(report.hiddenStrength)}</p>
      </div>` : ''}

      <!-- Warning -->
      ${report?.warningLine ? `
      <div style="background:rgba(139,26,26,0.08);border:1px solid rgba(139,26,26,0.25);border-radius:8px;padding:16px;margin:20px 0;">
        <p style="color:rgba(200,80,80,0.9);font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 8px;">⚠️ ${isTE ? 'Warning' : 'Warning'}</p>
        <p style="color:#D0CCBF;font-size:13px;line-height:1.8;margin:0;">${escapeHTML(report.warningLine)}</p>
      </div>` : ''}

      <!-- Action Step -->
      ${report?.actionStep ? `
      <div style="background:rgba(201,168,76,0.06);border:1px solid rgba(201,168,76,0.3);border-radius:8px;padding:16px;margin:20px 0;">
        <p style="color:#C9A84C;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 8px;">🔑 ${isTE ? 'ఈ వారం నుండి చేయి' : 'Start This Week'}</p>
        <p style="color:#F5F2EA;font-size:14px;line-height:1.8;margin:0;font-weight:bold;">${escapeHTML(report.actionStep)}</p>
      </div>` : ''}

      <!-- CTA -->
      <div style="text-align:center;margin:32px 0 16px;">
        <p style="color:#D0CCBF;font-size:13px;line-height:1.8;margin:0 0 20px;">
          ${isTE ? 'మీ pattern fix చేయాలంటే K Prasad గారిని contact చేయండి:' : 'To fix your pattern, contact K Prasad:'}
        </p>
        <a href="https://wa.me/919059181616" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#C9A84C,#9A7020);color:#05050A;text-decoration:none;border-radius:6px;font-size:13px;font-weight:bold;letter-spacing:1px;">
          ${isTE ? '💬 K Prasad తో మాట్లాడు' : '💬 Talk to K Prasad'}
        </a>
      </div>

      <!-- Footer -->
      <div style="border-top:1px solid rgba(201,168,76,0.15);padding-top:20px;margin-top:28px;text-align:center;">
        <p style="color:rgba(200,196,188,0.4);font-size:11px;margin:0;">Mind Power Vaultt — Trading Psychology · Discipline · Clarity</p>
        <p style="color:rgba(200,196,188,0.3);font-size:10px;margin:6px 0 0;">mindpowervaultt.com</p>
      </div>
    </div>
  </div>
</body>
</html>`;

    try {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendKey}`
        },
        body: JSON.stringify({
          from: 'Mind Power Vaultt <noreply@mindpowervaultt.com>',
          to: email,
          subject: `🧠 ${name}, Your Trading Psychology Report — Mind Power Vaultt`,
          html: emailHtml
        })
      });
      const emailData = await emailRes.json();
      if (emailData.id) emailSent = true;
      else console.error('Resend error:', emailData);
    } catch (e) {
      console.error('Email send error:', e);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 2. SEND LEAD ALERT TO K PRASAD (via Telegram Bot)
  // ═══════════════════════════════════════════════════════════════
  let telegramSent = false;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.error('Telegram configuration missing');
    return res.status(500).json({ error: 'Telegram configuration missing. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.' });
  }

  // Changed Markdown to HTML format to prevent Telegram blocking special characters
  const tgMessage = `<b>🧠 NEW MPV LEAD</b>
━━━━━━━━━━━━━━━━━━━━━
👤 <b>Name:</b> ${escapeHTML(name)}
📱 <b>Phone:</b> ${escapeHTML(phone)}
📧 <b>Email:</b> ${escapeHTML(email) || 'Not provided'}
📊 <b>Level:</b> ${escapeHTML(level) || 'Not specified'}

🎯 <b>PRIMARY PATTERN:</b>
${escapeHTML(report?.primaryPattern || 'N/A')}

💡 <b>CORE INSIGHT:</b>
${escapeHTML(report?.coreInsight || 'N/A')}

📋 <b>SITUATIONS:</b>
${(report?.behaviorLines || []).map((l, i) => `<b>S${i + 1}:</b> ${escapeHTML(l)}`).join('\n')}

✅ <b>STRENGTH:</b> ${escapeHTML(report?.hiddenStrength || 'N/A')}
⚠️ <b>WARNING:</b> ${escapeHTML(report?.warningLine || 'N/A')}
🔑 <b>ACTION:</b> ${escapeHTML(report?.actionStep || 'N/A')}
━━━━━━━━━━━━━━━━━━━━━
📅 ${timestamp}
📨 Report ${emailSent ? 'sent to ' + escapeHTML(email) : 'email not configured'}`;

  try {
    const MAX_LENGTH = 4000;
    
    // Fallback plain text if HTML fails or if we need to chunk easily
    const plainTextMsg = tgMessage.replace(/<[^>]*>?/gm, ''); 

    // We will send plain text to be safe and easily chunkable
    for (let i = 0; i < plainTextMsg.length; i += MAX_LENGTH) {
      const chunk = plainTextMsg.substring(i, i + MAX_LENGTH);
      
      const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: chunk
        })
      });
      
      const tgData = await tgRes.json();
      if (!tgData.ok) {
        console.error('Telegram chunk error:', tgData);
        // Don't fail the whole request if one chunk fails, just log it
      } else {
        telegramSent = true;
      }
    }
  } catch (e) {
    console.error('Telegram send error:', e);
    // Don't fail the API call just because telegram failed
  }

  // Always log the lead (viewable in Vercel logs)
  console.log('📌 NEW LEAD:', JSON.stringify({ name, phone, email, level, timestamp }));

  return res.status(200).json({
    success: true,
    emailSent,
    telegramSent,
    message: 'Report processed successfully'
  });
}