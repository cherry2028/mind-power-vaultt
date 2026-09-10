import { signJWT } from './_lib/jwt.js';
import { checkRateLimit, recordSuccess } from './_lib/ratelimit.js';
import { logAttempt } from './_lib/logger.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';

  // Advanced rate limit check
  const limit = checkRateLimit(ip);
  if (limit.blocked) {
    logAttempt({ ip, type: 'blocked', success: false, reason: limit.reason });
    return res.status(429).json({
      valid: false,
      error: `Too many attempts. Try again in ${limit.waitMins} minute(s).`
    });
  }

  const { code, type } = req.body || {};
  const { ADMIN_PASSWORD, JWT_SECRET } = process.env;

  if (!code) {
    return res.status(400).json({ valid: false, error: 'Invalid request' });
  }

  if (!JWT_SECRET) {
    console.error('[MPV] JWT_SECRET not configured in environment!');
    return res.status(500).json({ valid: false, error: 'Server configuration error' });
  }

  // NOTE (2026-09-10): the two student branches that lived here — 'journal'
  // (STUDENT_CODES / MASTER_ACCESS_CODE) and the legacy 'access' branch — have
  // been removed.
  //
  // They minted a role:'student' JWT that NOTHING in src/ consumes. Students
  // authenticate via Supabase email OTP (StudentPortal.jsx); no call site ever
  // passed type 'journal' or 'access'. The EMERGENCY_ token checks left in
  // pages/Journal.jsx, PushOptIn.jsx and journal-content.html are orphaned
  // guards for that removed path.
  //
  // Keeping them meant an unauthenticated, guessable code endpoint that handed
  // out student tokens — and MASTER_ACCESS_CODE shipped in .env.example as the
  // real-looking default 'MPV2025MAY', so it must be treated as public.
  // Rotating a secret that guards a door into an empty room is cost without
  // benefit; deleting the door removes the attack surface entirely.
  //
  // Admin login below is LIVE — App.jsx:396 calls api.validateCode(pwd,'admin').

  // Admin access
  if (type === 'admin' && code === ADMIN_PASSWORD) {
    const token = signJWT({ role: 'admin', type: 'admin' }, JWT_SECRET, 8);
    recordSuccess(ip);
    logAttempt({ ip, code, type, success: true });
    return res.status(200).json({ valid: true, role: 'admin', token });
  }

  // Failed attempt
  logAttempt({ ip, code, type, success: false });
  return res.status(401).json({
    valid: false,
    error: 'Invalid code',
    attemptsLeft: limit.attemptsLeft ?? 0
  });
}
