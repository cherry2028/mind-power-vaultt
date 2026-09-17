// When the "new version" prompt may appear — the owner's rules, 2026-09-17.
import {
  istMinutes, istDay, isMarketBlocked, afterCloseKey, withIstTime, buildTime,
  trustedNow, decidePrompt, entryInProgress, QUIET_MS, CLOCK_SKEW_LIMIT_MS,
} from '../src/utils/updatePrompt.js';

let pass = 0, fail = 0;
function eq(name, got, expected) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (ok) pass++; else fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  → ${JSON.stringify(got)}${ok ? '' : `  (expected ${JSON.stringify(expected)})`}`);
}

// An IST wall-clock moment → epoch ms (IST = UTC+05:30).
const IST = (y, mo, d, h, mi, s = 0) => Date.UTC(y, mo - 1, d, h, mi, s) - 330 * 60 * 1000;
const MIN = 60 * 1000;

console.log('\n══ IST from epoch, independent of device timezone ══');
eq('09:15 IST', istMinutes(IST(2026, 9, 17, 9, 15)), 555);
eq('00:00 IST', istMinutes(IST(2026, 9, 18, 0, 0)), 0);
eq('23:59 IST', istMinutes(IST(2026, 9, 17, 23, 59)), 1439);
eq('same IST day at 00:00 and 23:59', istDay(IST(2026, 9, 17, 0, 0)) === istDay(IST(2026, 9, 17, 23, 59)), true);
eq('UTC 18:29 on 17 Sep is still 17 Sep IST (23:59)', istDay(Date.UTC(2026, 8, 17, 18, 29)) === istDay(IST(2026, 9, 17, 12, 0)), true);
eq('UTC 18:30 on 17 Sep is 18 Sep IST (00:00)', istDay(Date.UTC(2026, 8, 17, 18, 30)) === istDay(IST(2026, 9, 18, 12, 0)), true);
{
  const saved = process.env.TZ;
  process.env.TZ = 'America/Los_Angeles';
  eq('device timezone set to Los Angeles changes nothing', istMinutes(IST(2026, 9, 17, 10, 0)), 600);
  process.env.TZ = saved;
}

console.log('\n══ Rule 2: never 09:00–15:45 IST ══');
eq('08:59 not blocked', isMarketBlocked(IST(2026, 9, 17, 8, 59)), false);
eq('09:00 blocked', isMarketBlocked(IST(2026, 9, 17, 9, 0)), true);
eq('12:30 blocked', isMarketBlocked(IST(2026, 9, 17, 12, 30)), true);
eq('15:44 blocked', isMarketBlocked(IST(2026, 9, 17, 15, 44)), true);
eq('15:45 not blocked', isMarketBlocked(IST(2026, 9, 17, 15, 45)), false);
eq('Saturday 10:00 also blocked (rule is time of day, no calendar guess)', isMarketBlocked(IST(2026, 9, 19, 10, 0)), true);

console.log('\n══ After-close window key ══');
const MON = istDay(IST(2026, 9, 14, 12, 0));
eq('Mon 15:45 → Mon', afterCloseKey(IST(2026, 9, 14, 15, 45)) === MON, true);
eq('Mon 23:00 → Mon', afterCloseKey(IST(2026, 9, 14, 23, 0)) === MON, true);
eq('Tue 07:00 → still Mon\'s close', afterCloseKey(IST(2026, 9, 15, 7, 0)) === MON, true);
eq('Tue 10:00 → null (market hours)', afterCloseKey(IST(2026, 9, 15, 10, 0)), null);
eq('Tue 16:00 → Tue', afterCloseKey(IST(2026, 9, 15, 16, 0)) === MON + 1, true);

const base = { entryInProgress: false, waiting: true, lastDismissedAt: null, shownAfterClose: null, quietMs: QUIET_MS };
const decide = (o) => decidePrompt({ ...base, ...o });

console.log('\n══ Rule 1: a sheet or form open wins over everything ══');
eq('form open at 16:00 with update waiting → hidden', decide({ entryInProgress: true, now: IST(2026, 9, 17, 16, 0) }).reason, 'entry_in_progress');
eq('form open during first-after-close moment → hidden, after-close NOT used up', decide({ entryInProgress: true, now: IST(2026, 9, 17, 15, 50) }), { show: false, reason: 'entry_in_progress', markAfterClose: null });
eq('form open with untrusted clock → still reported as entry_in_progress (checked first)', decide({ entryInProgress: true, now: null }).reason, 'entry_in_progress');

console.log('\n══ No update / untrusted clock ══');
eq('nothing waiting → hidden', decide({ waiting: false, now: IST(2026, 9, 17, 16, 0) }).reason, 'no_update_waiting');
eq('clock untrusted → hidden', decide({ now: null }).reason, 'clock_untrusted');

console.log('\n══ Rule 2 in the decision ══');
for (const [h, m] of [[9, 0], [9, 15], [11, 30], [15, 44]]) {
  eq(`${h}:${String(m).padStart(2, '0')} IST → hidden even if never shown today`, decide({ now: IST(2026, 9, 17, h, m) }).reason, 'market_hours');
}

console.log('\n══ Rule 3: first foreground return after 15:45 ignores the quiet period ══');
{
  const now = IST(2026, 9, 17, 15, 46);
  const d = decide({ now, lastDismissedAt: now - 60 * 1000 });
  eq('dismissed 1 min ago, first return after close → shown', [d.show, d.reason], [true, 'first_after_close']);
  eq('…and marks today\'s close as used', d.markAfterClose === afterCloseKey(now), true);
  const again = decide({ now: now + 2 * MIN, lastDismissedAt: now + MIN, shownAfterClose: d.markAfterClose });
  eq('dismissed after that → quiet period applies again', again.reason, 'quiet_period');
}
{
  const d = decide({ now: IST(2026, 9, 18, 7, 0), shownAfterClose: afterCloseKey(IST(2026, 9, 17, 16, 0)) });
  eq('next morning 07:00, yesterday\'s close already used → normal rule (shown, not after-close)', [d.show, d.reason], [true, 'outside_market_hours']);
}
{
  const d = decide({ now: IST(2026, 9, 18, 7, 0), shownAfterClose: afterCloseKey(IST(2026, 9, 16, 16, 0)) });
  eq('app not opened after yesterday\'s close → 07:00 counts as the first return after close', d.reason, 'first_after_close');
}

console.log('\n══ Rule 4: 10-minute quiet period outside market hours ══');
{
  const now = IST(2026, 9, 17, 20, 0);
  const used = afterCloseKey(now);
  eq('dismissed 9m59s ago → hidden', decide({ now, shownAfterClose: used, lastDismissedAt: now - (10 * MIN - 1000) }).reason, 'quiet_period');
  eq('dismissed exactly 10 min ago → shown', decide({ now, shownAfterClose: used, lastDismissedAt: now - 10 * MIN }).show, true);
  eq('never dismissed → shown', decide({ now, shownAfterClose: used }).show, true);
  eq('dismissal in the "future" (clock moved back) does not silence it forever', decide({ now, shownAfterClose: used, lastDismissedAt: now + 60 * MIN }).show, true);
  eq('preview quiet period (30s) honoured', decide({ now, shownAfterClose: used, lastDismissedAt: now - 31 * 1000, quietMs: 30 * 1000 }).show, true);
}

console.log('\n══ Clock trust ══');
const BUILD = '20260917.1005-5707e5c';
eq('build stamp parsed as UTC', new Date(buildTime(BUILD)).toISOString(), '2026-09-17T10:05:00.000Z');
{
  const dev = IST(2026, 9, 17, 16, 0);
  eq('recent measurement, small skew → server-confirmed device time',
    trustedNow(dev, { skewMs: 1200, measuredAt: dev - 5 * MIN }, BUILD), { now: dev + 1200, reason: 'server_confirmed' });
  const wrong = dev - 7 * 60 * MIN; // device clock 7 hours slow: shows 09:00 IST at a real 16:00
  const t = trustedNow(wrong, { skewMs: 7 * 60 * MIN, measuredAt: wrong - MIN }, BUILD);
  eq('device clock 7 h slow → corrected with the server skew', [t.reason, istMinutes(t.now)], ['server_corrected', 16 * 60]);
  eq('…so the corrected time is outside market hours and the prompt may show', decide({ now: t.now }).show, true);
  const fast = dev - 6 * 60 * MIN + 30 * MIN; // real 10:30 IST, device says 16:30
  const tf = trustedNow(fast + 6 * 60 * MIN, { skewMs: -6 * 60 * MIN, measuredAt: fast + 6 * 60 * MIN - MIN }, BUILD);
  eq('device clock 6 h FAST (says 16:30 at a real 10:30) → corrected back into market hours → hidden', decide({ now: tf.now }).reason, 'market_hours');
  eq('no measurement, device clock plausible → still untrusted (hidden)', trustedNow(dev, null, BUILD), { now: null, reason: 'clock_unverified' });
  eq('no measurement, device clock before the running build → clearly off', trustedNow(buildTime(BUILD) - 2 * 24 * 60 * MIN, null, BUILD).reason, 'clock_clearly_off');
  eq('measurement older than a day → not used', trustedNow(dev, { skewMs: 0, measuredAt: dev - 25 * 60 * MIN }, BUILD).now, null);
  eq('skew limit is 5 minutes', CLOCK_SKEW_LIMIT_MS, 5 * MIN);
}

console.log('\n══ Preview-only IST override ══');
{
  const real = Date.UTC(2026, 8, 17, 4, 30, 17); // 10:00:17 IST
  const moved = withIstTime(real, '16:05');
  eq('moves only the time of day', [istMinutes(moved), istDay(moved) === istDay(real)], [16 * 60 + 5, true]);
  eq('garbage leaves time unchanged', withIstTime(real, 'soon'), real);
}

console.log('\n══ entryInProgress against fake documents ══');
function fakeDoc({ selectors = [], ids = {}, active = null, fields = [] } = {}) {
  return {
    querySelector: (sel) => (sel.split(',').some((s) => selectors.includes(s.trim())) ? {} : null),
    getElementById: (id) => (id in ids ? ids[id] : null),
    activeElement: active,
    querySelectorAll: () => fields,
  };
}
const el = (hidden) => ({ classList: { contains: (c) => (c === 'hidden' ? hidden : false) }, style: {} });
const field = (value, { type = 'text', visible = true, readOnly = false } = {}) => ({ value, readOnly, disabled: false, getAttribute: (a) => (a === 'type' ? type : null), getClientRects: () => (visible ? [1] : []) });
eq('empty page → no entry', entryInProgress([fakeDoc()]), false);
eq('journal trade sheet open (.sheet.open) → entry', entryInProgress([fakeDoc(), fakeDoc({ selectors: ['.sheet.open'] })]), true);
eq('PIN screen visible → entry', entryInProgress([fakeDoc({ ids: { pinScreen: el(false) } })]), true);
eq('PIN screen hidden → no entry', entryInProgress([fakeDoc({ ids: { pinScreen: el(true) } })]), false);
eq('focused text input → entry', entryInProgress([fakeDoc({ active: { tagName: 'INPUT', getAttribute: () => 'tel' } })]), true);
eq('focused button → no entry', entryInProgress([fakeDoc({ active: { tagName: 'BUTTON', getAttribute: () => null } })]), false);
eq('lead form with a typed name (visible) → entry', entryInProgress([fakeDoc({ fields: [field('Ravi')] })]), true);
eq('typed value in a HIDDEN field → no entry', entryInProgress([fakeDoc({ fields: [field('230', { visible: false })] })]), false);
eq('checkbox value ignored', entryInProgress([fakeDoc({ fields: [field('on', { type: 'checkbox' })] })]), false);
eq('journal iframe present but unreadable → assume entry', entryInProgress([fakeDoc()], { journalUnreadable: true }), true);
eq('null journal doc (not on /journal) ignored', entryInProgress([fakeDoc(), null]), false);

console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
