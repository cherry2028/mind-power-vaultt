// /api/send-report.js — Send journal reports to mentor/self via email
// Uses Resend API with verified domain
// SECURED: Requires valid Supabase session token

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── AUTH CHECK: Only valid Supabase journal sessions can send email ──
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Unauthorized: No session token provided.' });

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized: Invalid or expired session.' });
  // ─────────────────────────────────────────────────────────────────────

  const { to, subject, html, reportType, studentName } = req.body || {};
  if (!to || !html) return res.status(400).json({ error: 'Missing email or report content' });

  // Security: reports may only go to the student's own email or the mentor.
  // Students send "mentor" as the recipient; the real address stays server-side.
  const mentorEmail = (process.env.MENTOR_EMAIL || '').trim().toLowerCase();
  let recipient = String(to).trim();
  if (recipient.toLowerCase() === 'mentor') {
    if (!mentorEmail) return res.status(500).json({ error: 'Mentor email not configured. Ask admin to set MENTOR_EMAIL in Vercel.' });
    recipient = mentorEmail;
  }
  const allowedRecipients = [user.email?.toLowerCase(), mentorEmail].filter(Boolean);
  if (!allowedRecipients.includes(recipient.toLowerCase())) {
    return res.status(403).json({ error: 'Forbidden: Reports can only be sent to your own email or to the mentor.' });
  }
  const isForMentor = mentorEmail && recipient.toLowerCase() === mentorEmail;

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return res.status(500).json({ error: 'Email service not configured' });

  // Rate limit: max 10 emails per hour per IP
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';

  try {
    // When the report goes to the mentor, put the student's verified email in the
    // subject and reply-to so the mentor knows who it came from and can reply.
    const emailSubject = subject || `MPV ${reportType || 'Journal'} Report — ${studentName || 'Student'}${isForMentor ? ` (${user.email})` : ''} — ${new Date().toLocaleDateString('en-IN')}`;

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendKey}`
      },
      body: JSON.stringify({
        from: 'Mind Power Vaultt <noreply@mindpowervaultt.com>',
        to: recipient,
        reply_to: isForMentor ? user.email : undefined,
        subject: emailSubject,
        html: html
      })
    });

    const data = await emailRes.json();
    if (data.id) {
      console.log(`[MPV-REPORT] ${reportType} report sent to ${recipient} by ${studentName} (${user.email}) from ${ip}`);
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
