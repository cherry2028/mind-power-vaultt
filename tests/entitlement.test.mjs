// P0 — server-side entitlement rule.
// Mirrors public.check_entitlement() in
// supabase/migrations/20260910_check_entitlement.sql; keep in sync.
//
// The rule exists to keep non-payers out WITHOUT ever locking out a payer, so
// the tests that matter most are the permissive ones: null status, empty
// status, unknown status, and the fail-open path.

// Mirror of the PL/pgSQL body. `sub` is the subscriptions row (or null).
function evaluateEntitlement(sub, now, jwtEmail) {
  const email = String(jwtEmail ?? '').toLowerCase();
  if (email === '') return { allowed: false, reason: 'no_email', expires_at: null };
  if (!sub) return { allowed: false, reason: 'no_subscription', expires_at: null };
  if (new Date(sub.expires_at) <= now) {
    return { allowed: false, reason: 'expired', expires_at: sub.expires_at };
  }
  if (['cancelled', 'expired', 'refunded'].includes(String(sub.status ?? '').toLowerCase())) {
    return { allowed: false, reason: 'cancelled', expires_at: sub.expires_at };
  }
  return { allowed: true, reason: 'ok', expires_at: sub.expires_at };
}

// Mirror of checkEntitlement() in src/pages/Journal.jsx — the fail-open wrapper.
async function checkEntitlement(rpc) {
  try {
    const { data, error } = await rpc();
    if (error) throw error;
    if (!data || typeof data.allowed !== 'boolean') throw new Error('malformed entitlement response');
    return data;
  } catch {
    return { allowed: true, reason: 'ok', degraded: true };
  }
}

const NOW = new Date('2026-09-10T12:00:00Z');
const FUTURE = '2027-01-01T00:00:00Z';
const PAST = '2026-01-01T00:00:00Z';
const ME = 'student@gmail.com';

let pass = 0, fail = 0;
function eq(name, got, expected) {
  const ok = got === expected;
  if (ok) pass++; else fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  → ${got}${ok ? '' : `  (expected ${expected})`}`);
}
const reason = (sub, email = ME) => evaluateEntitlement(sub, NOW, email).reason;
const allowed = (sub, email = ME) => evaluateEntitlement(sub, NOW, email).allowed;

console.log('\n══ DENY ══');
eq('no subscriptions row', reason(null), 'no_subscription');
eq('no row → denied', allowed(null), false);
eq('expires_at in the past', reason({ expires_at: PAST, status: 'active' }), 'expired');
eq('expired → denied', allowed({ expires_at: PAST, status: 'active' }), false);
eq('status cancelled', reason({ expires_at: FUTURE, status: 'cancelled' }), 'cancelled');
eq('status refunded', reason({ expires_at: FUTURE, status: 'refunded' }), 'cancelled');
eq('status expired (the string)', reason({ expires_at: FUTURE, status: 'expired' }), 'cancelled');
eq('status matching is case-insensitive', reason({ expires_at: FUTURE, status: 'Cancelled' }), 'cancelled');
eq('status REFUNDED upper', reason({ expires_at: FUTURE, status: 'REFUNDED' }), 'cancelled');
eq('no email claim (phone-OTP session)', reason({ expires_at: FUTURE, status: 'active' }, ''), 'no_email');
eq('null email claim', reason({ expires_at: FUTURE, status: 'active' }, null), 'no_email');

console.log('\n══ ALLOW — never lock out a payer ══');
eq('status active', reason({ expires_at: FUTURE, status: 'active' }), 'ok');
eq('status NULL is allowed', reason({ expires_at: FUTURE, status: null }), 'ok');
eq('status null → allowed', allowed({ expires_at: FUTURE, status: null }), true);
eq('status empty string is allowed', reason({ expires_at: FUTURE, status: '' }), 'ok');
eq('unknown status "paused" is allowed', reason({ expires_at: FUTURE, status: 'paused' }), 'ok');
eq('unknown status "trial" is allowed', reason({ expires_at: FUTURE, status: 'trialing' }), 'ok');
eq('mixed-case ACTIVE is allowed', reason({ expires_at: FUTURE, status: 'Active' }), 'ok');
eq('expires_at carried through on allow',
  evaluateEntitlement({ expires_at: FUTURE, status: 'active' }, NOW, ME).expires_at, FUTURE);

console.log('\n══ PRECEDENCE + BOUNDARY ══');
eq('expired wins over cancelled', reason({ expires_at: PAST, status: 'cancelled' }), 'expired');
eq('expires_at exactly now → denied (<=)',
  reason({ expires_at: NOW.toISOString(), status: 'active' }), 'expired');
eq('one second after now → allowed',
  reason({ expires_at: new Date(NOW.getTime() + 1000).toISOString(), status: 'active' }), 'ok');
eq('email compared case-insensitively', allowed({ expires_at: FUTURE, status: 'active' }, 'Student@Gmail.com'), true);

console.log('\n══ FAIL-OPEN — a Supabase outage must not lock out a payer ══');
const results = [];
await checkEntitlement(async () => { throw new Error('network down'); }).then(r => results.push(['thrown error', r]));
await checkEntitlement(async () => ({ data: null, error: { message: '503' } })).then(r => results.push(['rpc error', r]));
await checkEntitlement(async () => ({ data: null, error: null })).then(r => results.push(['null payload', r]));
await checkEntitlement(async () => ({ data: { nonsense: 1 }, error: null })).then(r => results.push(['malformed payload', r]));
for (const [label, r] of results) {
  eq(`${label} → allowed`, r.allowed, true);
  eq(`${label} → flagged degraded`, r.degraded, true);
}
// A genuine denial must NOT be turned into an allow by the wrapper.
const denied = await checkEntitlement(async () => ({ data: { allowed: false, reason: 'expired' }, error: null }));
eq('a real denial survives the wrapper', denied.allowed, false);
eq('a real denial keeps its reason', denied.reason, 'expired');
eq('a real denial is not marked degraded', denied.degraded, undefined);

console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
