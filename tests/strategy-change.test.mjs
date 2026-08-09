// Feature 3 — strategy version tracking + the "changed during a losing week"
// mentor flag. Mirrors the snapshot + payload logic in src/journal-content.html.

// snapshotStrategy appends {date, action, rules[]} to DB.strategy.versions.
function snapshot(strategy, rules, action, date) {
  if (!strategy.versions) strategy.versions = [];
  strategy.versions.push({ date, action, rules: rules.map((r) => r.text) });
  strategy.setupDone = true;
  return strategy;
}

// The payload IIFE: was the strategy changed inside [ws,we], and was it a losing week?
function strategyChange(strategy, ws, we, weekPnl) {
  const v = (strategy && strategy.versions) || [];
  let changed = false, date = '';
  for (const x of v) if (x.date >= ws && x.date <= we) { changed = true; date = x.date; }
  return { changedThisWeek: changed, date, losingWeek: weekPnl < 0, totalVersions: v.length };
}

let pass = 0, fail = 0;
const eq = (name, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp); ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  → ${JSON.stringify(got)}${ok ? '' : `  expected ${JSON.stringify(exp)}`}`);
};

let strat = {};
strat = snapshot(strat, [{ text: 'wait 15m close' }], 'setup', '2026-08-01');
strat = snapshot(strat, [{ text: 'wait 15m close' }, { text: 'hard SL' }], 'add', '2026-08-05');
strat = snapshot(strat, [{ text: 'wait 30m close' }, { text: 'hard SL' }], 'edit', '2026-08-12');

console.log('\n══ Version history ══');
eq('3 versions recorded', strat.versions.length, 3);
eq('setupDone set', strat.setupDone, true);
eq('latest rule set captured', strat.versions[2].rules, ['wait 30m close', 'hard SL']);
eq('actions tracked', strat.versions.map((v) => v.action), ['setup', 'add', 'edit']);

console.log('\n══ Change-this-week detection ══');
eq('change on 08-12 falls in week 08-10..08-16',
  strategyChange(strat, '2026-08-10', '2026-08-16', 5000).changedThisWeek, true);
eq('no change in week 08-17..08-23',
  strategyChange(strat, '2026-08-17', '2026-08-23', 5000).changedThisWeek, false);

console.log('\n══ The losing-week tell (the mentor flag) ══');
{
  const winWeek = strategyChange(strat, '2026-08-10', '2026-08-16', 5000);
  const loseWeek = strategyChange(strat, '2026-08-10', '2026-08-16', -5000);
  eq('changed in a winning week → not a red flag', winWeek.changedThisWeek && winWeek.losingWeek, false);
  eq('changed in a LOSING week → red flag', loseWeek.changedThisWeek && loseWeek.losingWeek, true);
  eq('flag carries the change date', loseWeek.date, '2026-08-12');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
