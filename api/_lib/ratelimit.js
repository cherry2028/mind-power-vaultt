const ipAttempts = new Map();
const abuseBlocklist = new Map();
const WINDOW = 15 * 60 * 1000;
const MAX = 5;
const ABUSE = 20;
const BLOCK = 60 * 60 * 1000;

export function checkRateLimit(ip) {
  const now = Date.now();
  if (abuseBlocklist.has(ip)) {
    const until = abuseBlocklist.get(ip);
    if (now < until) return { blocked: true, reason: 'abuse_blocked', waitMins: Math.ceil((until - now) / 60000) };
    abuseBlocklist.delete(ip);
  }
  const r = ipAttempts.get(ip) || { count: 0, resetAt: now + WINDOW };
  if (now > r.resetAt) { r.count = 0; r.resetAt = now + WINDOW; }
  r.count++;
  ipAttempts.set(ip, r);
  if (r.count >= ABUSE) { abuseBlocklist.set(ip, now + BLOCK); ipAttempts.delete(ip); return { blocked: true, reason: 'abuse_detected', waitMins: 60 }; }
  if (r.count > MAX) return { blocked: true, reason: 'rate_limited', waitMins: Math.ceil((r.resetAt - now) / 60000), attemptsLeft: 0 };
  return { blocked: false, attemptsLeft: MAX - r.count };
}

export function recordSuccess(ip) { ipAttempts.delete(ip); }

export function checkSimpleLimit(ip, max = 10) {
  const now = Date.now();
  const k = `s_${ip}`;
  const r = ipAttempts.get(k) || { count: 0, resetAt: now + 3600000 };
  if (now > r.resetAt) { r.count = 0; r.resetAt = now + 3600000; }
  r.count++;
  ipAttempts.set(k, r);
  return r.count <= max;
}
