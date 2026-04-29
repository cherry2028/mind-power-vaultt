import { verifyJWT } from './_lib/jwt.js';
import { logEvent } from './_lib/logger.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { JWT_SECRET } = process.env;
  const { token } = req.body || {};
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';

  if (!token) return res.status(400).json({ valid: false, error: 'No token provided' });

  if (!JWT_SECRET) {
    return res.status(500).json({ valid: false, error: 'Server configuration error' });
  }

  const payload = verifyJWT(token, JWT_SECRET);

  if (!payload) {
    logEvent('session_invalid', { ip });
    return res.status(401).json({ valid: false, error: 'Invalid or expired session. Please login again.' });
  }

  logEvent('session_verified', { ip, role: payload.role });
  return res.status(200).json({
    valid: true,
    role: payload.role,
    expiresAt: payload.exp,
    issuedAt: payload.iat
  });
}
