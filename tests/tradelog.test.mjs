// Trade Log screen: reachable from the More menu, no ritual gate (it cannot
// log), and a delete that takes two deliberate taps and names the trade.
//
// Before this, sec-tradelog existed in the HTML with a working delete but
// NOTHING opened it, so a wrong trade from any earlier day was uncorrectable.
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../src/journal-content.html', import.meta.url), 'utf8');

let pass = 0, fail = 0;
function eq(name, got, expected) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (ok) pass++; else fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  → ${JSON.stringify(got)}${ok ? '' : `  (expected ${JSON.stringify(expected)})`}`);
}
const fnSrc = (name) => {
  const i = html.indexOf(`function ${name}(`);
  if (i < 0) return null;
  let depth = 0;
  for (let k = html.indexOf('{', i); k < html.length; k++) {
    if (html[k] === '{') depth++;
    else if (html[k] === '}') { depth--; if (depth === 0) return html.slice(i, k + 1); }
  }
  return null;
};

console.log('\n══ Reachable ══');
eq('More menu opens the Trade Log screen', /more-item[^>]*goLegacy\('tradelog'\)/.test(html), true);
eq('the screen it opens still exists', html.includes('id="sec-tradelog"'), true);

console.log('\n══ No ritual gate on a screen that cannot log ══');
{
  const gs = fnSrc('gS') || '';
  const tradelogBranch = gs.slice(gs.indexOf("if(id==='tradelog')"), gs.indexOf("if(id==='checklist')"));
  eq('Trade Log no longer checks pmDone', /pmDone\(\)/.test(tradelogBranch), false);
  eq('…and no lock overlay is raised there', /lockOverlay/.test(tradelogBranch), false);
  eq('checklist keeps its ritual gate', /pmDone\(\)/.test(gs.slice(gs.indexOf("if(id==='checklist')"))), true);
  eq('logging a trade still requires the ritual (openStep1 untouched)', /pmDone\(\)/.test(fnSrc('openStep1') || ''), true);
  eq('the Trade Log screen still has no way to create a trade',
    /<input|<textarea|openStep1\(/.test(html.slice(html.indexOf('id="sec-tradelog"'), html.indexOf('id="sec-eod"'))), false);
}

console.log('\n══ Delete takes two deliberate taps ══');
{
  const rtrSrc = fnSrc('rTr') || '';
  eq('the card button arms the confirm', /class="tdel" onclick="askDelT\(/.test(rtrSrc), true);
  const delCalls = [...rtrSrc.matchAll(/onclick="delT\(/g)].map((m) => m.index);
  eq('…delT is called exactly once in the card markup', delCalls.length, 1);
  eq('…and only from inside the confirm block', delCalls[0] > rtrSrc.indexOf('tdelc'), true);
  const confirm = html.slice(html.indexOf('tdelc'), html.indexOf('list.appendChild(div)', html.indexOf('tdelc')));
  eq('the confirm names the instrument', /esc2\(t\.inst\)/.test(confirm), true);
  eq('…the date', /t\.date/.test(confirm), true);
  eq('…and the amount', /ps2\(pnl2\)/.test(confirm), true);
  eq('confirm offers both "వద్దు" and "అవును, తీసేయి"', /వద్దు/.test(confirm) && /అవును, తీసేయి/.test(confirm), true);
}

console.log('\n══ Behaviour: armed vs unarmed (running the real functions) ══');
{
  const sandbox = `
    ${fnSrc('askDelT')}
    ${fnSrc('cancelDelT')}
    ${fnSrc('delT')}
    var TL_DEL_ID = null, TL_DEL_NOTE = false, saved = null, toasts = [], renders = 0;
    var DB = { tr: [ {id:1,inst:'A'}, {id:2,inst:'B'}, {id:3,inst:'C'} ] };
    function ls(k, v) { saved = { k: k, n: v.length }; }
    function rTr() { renders++; }
    function updHdr() {}
    function toast(m) { toasts.push(m); }
    return {
      run: function (steps) { steps(); },
      state: function () { return { ids: DB.tr.map(function (t) { return t.id; }), armed: TL_DEL_ID, note: TL_DEL_NOTE, saved: saved, toasts: toasts }; },
      askDelT: askDelT, cancelDelT: cancelDelT, delT: delT
    };`;
  const S = new Function(sandbox)();

  S.delT(2);
  eq('delete with nothing armed does nothing', S.state().ids, [1, 2, 3]);

  S.askDelT(2);
  eq('first tap only arms that trade', [S.state().armed, S.state().ids.length], [2, 3]);

  S.delT(1);
  eq('confirming a DIFFERENT trade while another is armed does nothing', S.state().ids, [1, 2, 3]);

  S.askDelT(2);
  eq('tapping the same trade again cancels (toggle)', S.state().armed, null);

  S.askDelT(3); S.cancelDelT();
  eq('"వద్దు" disarms without deleting', [S.state().armed, S.state().ids], [null, [1, 2, 3]]);

  S.askDelT(2); S.delT(2);
  const st = S.state();
  eq('armed + confirmed → that trade only is removed', st.ids, [1, 3]);
  eq('…written to mpvtr', [st.saved.k, st.saved.n], ['mpvtr', 2]);
  eq('…confirm is disarmed again', st.armed, null);
  eq('…and the multi-device note is switched on', st.note, true);

  S.delT(3);
  eq('a second confirm tap after the delete cannot remove another trade', S.state().ids, [1, 3]);
}

console.log('\n══ The truth about other devices ══');
{
  const rtr = fnSrc('rTr') || '';
  eq('a note is shown after a delete', /TL_DEL_NOTE/.test(rtr), true);
  eq('…it tells them to open the journal on the other device', /వేరే phone/.test(rtr), true);
  eq('…and does not claim the delete is permanent everywhere', /మళ్ళీ తిరిగి రావచ్చు/.test(rtr), true);
  eq('the note clears when the screen is opened again', /TL_DEL_NOTE=false/.test(fnSrc('gS') || ''), true);
}

console.log('\n══ Tap targets ══');
{
  const css = (sel) => (html.match(new RegExp(`\\${sel}\\{[^}]*\\}`)) || [''])[0];
  eq('delete button is at least 44px tall', /min-height:44px/.test(css('.tdel')), true);
  eq('…and wide enough to hit', /min-width:1\d\dpx/.test(css('.tdel')), true);
  eq('confirm buttons are at least 44px tall', /min-height:44px/.test(css('.tdelr button')), true);
}

console.log('\n══ The journal still parses ══');
{
  const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  let ok = true, err = '';
  for (const code of blocks) { try { new Function(code); } catch (e) { ok = false; err = e.message; } }
  eq(`${blocks.length} inline script block(s) parse`, ok, true, err);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
