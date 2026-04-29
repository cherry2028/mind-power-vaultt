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
  const { MASTER_ACCESS_CODE, ADMIN_PASSWORD, JWT_SECRET } = process.env;

  if (!code || !type) {
    return res.status(400).json({ valid: false, error: 'Invalid request' });
  }

  if (!JWT_SECRET) {
    console.error('[MPV] JWT_SECRET not configured in environment!');
    return res.status(500).json({ valid: false, error: 'Server configuration error' });
  }

  // Student access
  if (type === 'access' && code === MASTER_ACCESS_CODE) {
    const token = signJWT({ role: 'student', type: 'access' }, JWT_SECRET, 24);
    recordSuccess(ip);
    logAttempt({ ip, code, type, success: true });
    return res.status(200).json({ valid: true, role: 'student', token });
  }

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
