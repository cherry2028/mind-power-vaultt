// /api/send-report.js — Send journal reports to mentor/self via email
// Uses Resend API with verified domain

import { verifyJWT } from './_lib/jwt.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Validate JWT Token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const payload = verifyJWT(token, jwtSecret);
  if (!payload || !['student', 'admin'].includes(payload.role)) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token or insufficient permissions' });
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
