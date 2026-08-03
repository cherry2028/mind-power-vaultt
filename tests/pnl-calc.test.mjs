// Sign-correctness tests for the trade P&L auto-calc across all four segments.
// The same computePnl() logic is inlined in src/journal-content.html; keep both
// in sync.
import { computePnl } from '../src/utils/pnlCalc.js';

let pass = 0, fail = 0;
function eq(name, t, expected) {
  const got = computePnl(t);
  const ok = got === expected;
  if (ok) pass++; else fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  → ${got}${ok ? '' : `  (expected ${expected})`}`);
}

console.log('\n══ OPTIONS (entry/exit are premiums; CE/PE informational; only long/short flips sign) ══');
// Bought a NIFTY call, premium 100 → 150, 1 lot × 75.
eq('CE long WIN (prem up)',  { seg:'options', optType:'CE', dir:'long',  en:100, ex:150, qty:1, lotSize:75 }, 3750);
// Bought a PUT, premium 80 → 130 (underlying fell, put gained). Buyer profits.
eq('PE long WIN (prem up)',  { seg:'options', optType:'PE', dir:'long',  en:80,  ex:130, qty:1, lotSize:75 }, 3750);
// Bought a PUT that lost premium.
eq('PE long LOSS (prem down)',{ seg:'options', optType:'PE', dir:'long', en:130, ex:80,  qty:1, lotSize:75 }, -3750);
// SOLD/wrote a call, premium fell 120 → 60 → seller profits.
eq('CE short WIN (sold, prem down)',{ seg:'options', optType:'CE', dir:'short', en:120, ex:60, qty:1, lotSize:75 }, 4500);
// SOLD a put, premium ROSE against the seller → loss.
eq('PE short LOSS (sold, prem up)',{ seg:'options', optType:'PE', dir:'short', en:60, ex:110, qty:1, lotSize:75 }, -3750);

console.log('\n══ FUTURES ══');
eq('FUT long WIN',  { seg:'futures', dir:'long',  en:24500, ex:24600, qty:1, lotSize:75 }, 7500);
eq('FUT short WIN (price fell)', { seg:'futures', dir:'short', en:24500, ex:24400, qty:1, lotSize:75 }, 7500);
eq('FUT short LOSS (price rose)',{ seg:'futures', dir:'short', en:24500, ex:24600, qty:1, lotSize:75 }, -7500);

console.log('\n══ CASH / SWING (buy=en, sell=ex; direction not applied) ══');
eq('CASH long WIN',  { seg:'cash', dir:'long',  en:100, ex:110, qty:50 }, 500);
eq('CASH long LOSS', { seg:'cash', dir:'long',  en:110, ex:100, qty:50 }, -500);
// Short sell: sold @100, bought back @90 → buy=en=90, sell=ex=100. dir must NOT flip it.
eq('CASH short WIN (dir ignored)', { seg:'cash', dir:'short', en:90, ex:100, qty:50 }, 500);

console.log('\n══ CRYPTO (leverage NOT multiplied into P&L) ══');
eq('CRYPTO spot long WIN', { seg:'crypto', mkt:'spot', dir:'long',  en:60000, ex:62000, qty:0.5 }, 1000);
eq('CRYPTO perp SHORT WIN (price fell)', { seg:'crypto', mkt:'perp', dir:'short', lev:10, en:60000, ex:58000, qty:0.5 }, 1000);
eq('CRYPTO perp SHORT LOSS (price rose)',{ seg:'crypto', mkt:'perp', dir:'short', lev:20, en:60000, ex:62000, qty:0.5 }, -1000);

console.log('\n══ FALLBACK — must return null so manual entry / fast path stays ══');
eq('no segment (quick entry / legacy trade)', { en:100, ex:110, qty:50 }, null);
eq('missing exit (still open / not filled)',  { seg:'options', dir:'long', en:100, qty:1, lotSize:75 }, null);
eq('missing qty',   { seg:'cash', en:100, ex:110 }, null);
eq('missing lotSize on options', { seg:'options', dir:'long', en:100, ex:150, qty:1 }, null);

console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
