export function logAttempt({ ip, type, success, reason, code }) {
  const entry = {
    ts: new Date().toISOString(),
    ip: ip || 'unknown',
    type,
    success,
    reason: reason || (success ? 'valid' : 'invalid_code'),
    hint: code ? code.substring(0, 3) + '***' : '---'
  };
  // Vercel captures console.log in Function Logs (dashboard visible)
  console.log('[MPV-AUTH]', JSON.stringify(entry));
}

export function logEvent(event, data = {}) {
  console.log('[MPV-EVENT]', JSON.stringify({ ts: new Date().toISOString(), event, ...data }));
}
