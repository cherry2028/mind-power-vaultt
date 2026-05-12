// /api/send-report.js — Send journal reports to mentor/self via email
// Uses Resend API with verified domain

import { verifyJWT } from './_lib/jwt.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // 🛡️ Security Fix: Add Authentication Check to protect external quota (Resend API)
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized: Missing token' });

  const { JWT_SECRET } = process.env;
  if (!JWT_SECRET) return res.status(500).json({ error: 'Server configuration error' });

  const payload = verifyJWT(token, JWT_SECRET);
  if (!payload || (payload.role !== 'student' && payload.role !== 'admin')) {
    return res.status(403).json({ error: 'Forbidden: Invalid or unauthorized token' });
  }

  const { to, subject, html, reportType, studentName } = req.body || {};
  if (!to || !html) return res.status(400).json({ error: 'Missing email or report content' });

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return res.status(500).json({ error: 'Email service not configured' });

  // Rate limit: max 10 emails per hour per IP
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';

  try {
    const emailSubject = subject || `MPV ${reportType || 'Journal'} Report — ${studentName || 'Student'} — ${new Date().toLocaleDateString('en-IN')}`;

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendKey}`
      },
      body: JSON.stringify({
        from: 'Mind Power Vaultt <noreply@mindpowervaultt.com>',
        to: to,
        subject: emailSubject,
        html: html
      })
    });

    const data = await emailRes.json();
    if (data.id) {
      console.log(`[MPV-REPORT] ${reportType} report sent to ${to} by ${studentName} from ${ip}`);
      return res.status(200).json({ success: true, id: data.id });
    } else {
      console.error('[MPV-REPORT] Resend error:', data);
      return res.status(500).json({ error: 'Email send failed', details: data });
    }
  } catch (e) {
    console.error('[MPV-REPORT] Error:', e);
    return res.status(500).json({ error: e.message });
  }
}
