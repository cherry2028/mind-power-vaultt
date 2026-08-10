// Feature 4 — review-request cadence. Mirrors the decision inlined in
// Journal.jsx: count account-mode opens, prompt every 10th, never after a
// review is given.

// A tiny in-memory localStorage stand-in.
function makeStore(init = {}) {
  const m = { ...init };
  return {
    getItem: (k) => (k in m ? m[k] : null),
    setItem: (k, v) => { m[k] = String(v); },
    _dump: () => m,
  };
}

// The exact rule from Journal.jsx's effect.
function shouldPrompt(store, { account }) {
  if (!account) return false;                                  // emergency mode can't submit
  if (store.getItem('mpvReviewed') === '1') return false;      // already reviewed
  const opens = (parseInt(store.getItem('mpvJournalOpens') || '0', 10) || 0) + 1;
  store.setItem('mpvJournalOpens', String(opens));
  return opens % 10 === 0;
}

let pass = 0, fail = 0;
const eq = (name, got, exp) => {
  const ok = got === exp; ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  → ${got}${ok ? '' : `  expected ${exp}`}`);
};

console.log('\n══ Cadence: prompt on every 10th account open ══');
{
  const s = makeStore();
  const prompts = [];
  for (let i = 1; i <= 25; i++) prompts.push(shouldPrompt(s, { account: true }) ? i : null);
  const firedAt = prompts.filter(Boolean);
  eq('fires at opens 10 and 20', JSON.stringify(firedAt), JSON.stringify([10, 20]));
  eq('does not fire at 9', shouldPromptAt(9), false);
  eq('does not fire at 11', shouldPromptAt(11), false);
}
function shouldPromptAt(n) {
  const s = makeStore({ mpvJournalOpens: String(n - 1) });
  return shouldPrompt(s, { account: true });
}

console.log('\n══ Never after a review is given ══');
{
  const s = makeStore({ mpvJournalOpens: '9', mpvReviewed: '1' });
  eq('reviewed student is never prompted (even at the 10th)', shouldPrompt(s, { account: true }), false);
  eq('and the open is not counted once reviewed', s.getItem('mpvJournalOpens'), '9');
}

console.log('\n══ Emergency (local-only) logins never counted ══');
{
  const s = makeStore({ mpvJournalOpens: '9' });
  eq('emergency open does not prompt', shouldPrompt(s, { account: false }), false);
  eq('emergency open does not increment the counter', s.getItem('mpvJournalOpens'), '9');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
