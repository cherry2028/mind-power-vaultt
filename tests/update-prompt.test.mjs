// When the "new version" prompt may appear — the owner's rules, 2026-09-19.
//
//   1. Never while a trade sheet or any form is open — at any hour.
//   2. Never within 15 minutes of the student's last journal write.
//   3. Otherwise, 10 minutes after a dismissal.
//
// The earlier 09:00–15:45 IST block is gone: this journal carries crypto,
// forex and gold, and the live journals log most trades in the evening.
import fs from 'node:fs';
import {
  decidePrompt, elapsedSince, entryInProgress, QUIET_MS, IDLE_MS,
} from '../src/utils/updatePrompt.js';

let pass = 0, fail = 0;
function eq(name, got, expected) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (ok) pass++; else fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  → ${JSON.stringify(got)}${ok ? '' : `  (expected ${JSON.stringify(expected)})`}`);
}

const MIN = 60 * 1000;
const NOW = Date.UTC(2026, 8, 19, 14, 30); // any moment: no rule reads the clock face
const base = { entryInProgress: false, waiting: true, now: NOW, lastWriteAt: null, lastDismissedAt: null, idleMs: IDLE_MS, quietMs: QUIET_MS };
const decide = (o) => decidePrompt({ ...base, ...o });

console.log('\n══ The waits are 15 and 10 minutes ══');
eq('idle after a write', IDLE_MS, 15 * MIN);
eq('quiet after a dismissal', QUIET_MS, 10 * MIN);

console.log('\n══ Rule 1: a sheet or form open wins over everything ══');
eq('form open with an update waiting → hidden', decide({ entryInProgress: true }).reason, 'entry_in_progress');
eq('form open and idle for hours → still hidden', decide({ entryInProgress: true, lastWriteAt: NOW - 5 * 60 * MIN }).reason, 'entry_in_progress');
eq('form open with no clock → still reported as entry_in_progress (checked first)', decide({ entryInProgress: true, now: null }).reason, 'entry_in_progress');

console.log('\n══ Nothing waiting ══');
eq('no update → hidden', decide({ waiting: false }).reason, 'no_update_waiting');
eq('a broken clock value → hidden rather than guessed', decide({ now: null }).reason, 'no_clock');

console.log('\n══ Rule 2: 15 minutes after the student\'s last write ══');
eq('saved 1 minute ago → hidden', decide({ lastWriteAt: NOW - MIN }).reason, 'recent_write');
eq('saved 14m59s ago → hidden', decide({ lastWriteAt: NOW - (15 * MIN - 1000) }).reason, 'recent_write');
eq('saved exactly 15 min ago → shown', decide({ lastWriteAt: NOW - 15 * MIN }), { show: true, reason: 'idle' });
eq('saved 3 hours ago → shown', decide({ lastWriteAt: NOW - 180 * MIN }).show, true);
eq('never written (new student) → shown', decide({ lastWriteAt: null }).show, true);
eq('write rule beats the quiet period when both would hide (write reported first)',
  decide({ lastWriteAt: NOW - MIN, lastDismissedAt: NOW - MIN }).reason, 'recent_write');
eq('preview idle (60s) honoured', decide({ lastWriteAt: NOW - 61 * 1000, idleMs: 60 * 1000 }).show, true);

console.log('\n══ Time of day is no longer a rule ══');
for (const [h, label] of [[9 * 60, '09:00 IST'], [11 * 60 + 30, '11:30 IST'], [15 * 60 + 30, '15:30 IST'], [20 * 60, '20:00 IST']]) {
  // IST wall time h, expressed as an epoch, with no write and no dismissal.
  const t = Date.UTC(2026, 8, 19) + (h - 330) * MIN;
  eq(`${label}: idle student sees the prompt`, decide({ now: t }).show, true);
}
eq('…and a student mid-entry never does, whatever the hour',
  decide({ now: Date.UTC(2026, 8, 19) + (11 * 60 - 330) * MIN, entryInProgress: true }).show, false);

console.log('\n══ Rule 3: 10-minute quiet period after ✕ ══');
eq('dismissed 9m59s ago → hidden', decide({ lastDismissedAt: NOW - (10 * MIN - 1000) }).reason, 'quiet_period');
eq('dismissed exactly 10 min ago → shown', decide({ lastDismissedAt: NOW - 10 * MIN }).show, true);
eq('never dismissed → shown', decide({}).show, true);
eq('preview quiet period (30s) honoured', decide({ lastDismissedAt: NOW - 31 * 1000, quietMs: 30 * 1000 }).show, true);

console.log('\n══ A clock that jumps can release the prompt, never silence it forever ══');
eq('dismissal stamped in the future → ignored', decide({ lastDismissedAt: NOW + 60 * MIN }).show, true);
eq('write stamped in the future → ignored', decide({ lastWriteAt: NOW + 60 * MIN }).show, true);
eq('elapsedSince: no stamp / future stamp / real gap', [elapsedSince(NOW, null), elapsedSince(NOW, NOW + 1000), elapsedSince(NOW, NOW - 5 * MIN)], [null, null, 5 * MIN]);
eq('elapsedSince: zero and negative stamps are not stamps', [elapsedSince(NOW, 0), elapsedSince(NOW, -5)], [null, null]);
{
  // The device clock is 7 hours slow. Both stamps came off the SAME clock, so
  // the elapsed time is still right — this is why no server clock is needed.
  const slow = NOW - 7 * 60 * MIN;
  eq('device clock hours off → decision unchanged', decide({ now: slow, lastWriteAt: slow - 16 * MIN }).show, true);
  eq('…and still suppressed inside the window', decide({ now: slow, lastWriteAt: slow - 2 * MIN }).reason, 'recent_write');
}

console.log('\n══ The stamp the rule depends on ══');
{
  const html = fs.readFileSync(new URL('../src/journal-content.html', import.meta.url), 'utf8');
  const ls = html.slice(html.indexOf('function ls(k,v)'), html.indexOf('function ge(id)'));
  eq('the journal stamps mpvLastWrite inside ls(), the one function every save goes through',
    /localStorage\.setItem\('mpvLastWrite',String\(Date\.now\(\)\)\)/.test(ls), true);
  eq('…only after startApp finished, so booting does not count as working',
    /if\(MPV_STARTED\)/.test(ls) && /MPV_STARTED=true/.test(html), true);
  const sync = fs.readFileSync(new URL('../src/utils/journalSync.js', import.meta.url), 'utf8');
  const keys = sync.slice(sync.indexOf('JOURNAL_KEYS'), sync.indexOf('STAMP_KEY'));
  eq('…and the stamp never syncs to the cloud (device-local)', keys.includes('mpvLastWrite'), false);
  const pwa = fs.readFileSync(new URL('../src/pwa.js', import.meta.url), 'utf8');
  eq('the app reads that stamp for the decision', pwa.includes("const LS_LAST_WRITE = 'mpvLastWrite'") && pwa.includes('lastWriteAt'), true);
  eq('no market-hours rule survives anywhere', /MARKET_BLOCK|market_hours|first_after_close|afterCloseKey/.test(pwa + fs.readFileSync(new URL('../src/utils/updatePrompt.js', import.meta.url), 'utf8')), false);
  eq('no server-clock call survives (an offline student still gets the prompt)', /__clock/.test(pwa), false);
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
