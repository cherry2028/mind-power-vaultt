// /api/save-weekly-report.js — Permanent record of generated weekly reports
// so the mentor keeps a copy even if the WhatsApp message is lost.
// SECURED: requires a valid Supabase session; email is taken from the
// verified session, never from the request body.

import { createClient } from '@supabase/supabase-js';
import { checkSimpleLimit } from './_lib/ratelimit.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_REPORT_BYTES = 250_000;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  if (!checkSimpleLimit(ip, 20)) {
    return res.status(429).json({ error: 'Too many requests. Try again later.' });
  }

  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Unauthorized: No session token provided.' });

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized: Invalid or expired session.' });

  const { studentName, weekStart, weekEnd, report } = req.body || {};
  if (!weekStart || !weekEnd || !report) return res.status(400).json({ error: 'Missing week range or report data' });
  if (!DATE_RE.test(weekStart) || !DATE_RE.test(weekEnd)) return res.status(400).json({ error: 'Invalid week range format' });
  if (JSON.stringify(report).length > MAX_REPORT_BYTES) return res.status(413).json({ error: 'Report too large' });

  // Phone-OTP sessions have no email — key the record on the user id and
  // store whichever contact identifiers the session does carry.
  const { error: dbError } = await supabase.from('weekly_reports').insert({
    user_id: user.id,
    student_email: user.email || null,
    student_phone: user.phone || null,
    student_name: String(studentName || '').slice(0, 120),
    week_start: weekStart,
    week_end: weekEnd,
    report_data: report,
  });

  if (dbError) {
    console.error('[MPV-WEEKLY] Failed to save report record:', dbError);
    return res.status(500).json({ error: 'Failed to save report record' });
  }

  console.log(`[MPV-WEEKLY] Report record saved for ${user.email || user.phone || user.id} (${weekStart} → ${weekEnd}) from ${ip}`);
  return res.status(200).json({ success: true });
}
