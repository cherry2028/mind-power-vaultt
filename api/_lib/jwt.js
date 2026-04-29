import { createHmac } from 'crypto';

/**
 * Sign a JWT token using HMAC-SHA256
 * @param {object} payload - Data to encode
 * @param {string} secret - JWT_SECRET from env
 * @param {number} expiresInHours - Token lifetime
 */
export function signJWT(payload, secret, expiresInHours = 24) {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInHours * 3600
  };
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

/**
 * Verify and decode a JWT token
 * @returns {object|null} payload if valid, null if invalid/expired
 */
export function verifyJWT(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expectedSig = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
    if (signature !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp < Math.floor(Date.now() / 1000)) return null; // expired
    return payload;
  } catch { return null; }
}
