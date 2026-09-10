// P1 — risk / R / flag engine.
// Mirrors the derived-only engine inlined in src/journal-content.html; keep in
// sync. The whole point of this file is the backward-compatibility contract:
// a record without rv is legacy and must produce null R, zero flags, and be
// excluded from every average — no matter how incomplete it looks.

function num(v){if(v===null||v===undefined||v==='')return null;var n=Number(v);return isFinite(n)?n:null;}
function isScoreable(t){return Number(t&&t.rv)>=2;}
function riskOf(t){
  if(!isScoreable(t))return null;
  const en=num(t.en),sl=num(t.sl),q=num(t.qty);
  if(en===null||sl===null||q===null||q<=0)return null;
  let lot=num(t.lotSize);if(lot===null||lot<=0)lot=1;
  const r=Math.abs(en-sl)*q*lot;
  return r>0?r:null;
}
function rOf(t){
  const r=riskOf(t);if(!r)return null;
  const p=num(t&&t.pnl);if(p===null)return null;
  return p/r;
}
function plannedRR(t){
  const en=num(t&&t.en),sl=num(t&&t.sl),tg=num(t&&t.tgt);
  if(en===null||sl===null||tg===null)return null;
  const risk=Math.abs(en-sl);if(!risk)return null;
  return Math.abs(tg-en)/risk;
}
function expectancy(trades){
  let s=0,n=0;
  for(const t of trades){
    if(!t||t.status==='open')continue;
    const r=rOf(t);if(r===null)continue;
    s+=r;n++;
  }
  return n?s/n:null;
}
function validDate(s){return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s);}
function afterFirstDay(s,firstDay){
  if(!validDate(s))return false;
  if(validDate(firstDay)&&s<firstDay)return false;
  return true;
}
const FLAG_W={nosl:35,slbreak:30,revenge:25,afterlimit:25,oversize:20,overtrade:15,lowchk:10};
// ctx: {day:[trades in id order], maxLoss:Number, maxt:Number}
function tradeFlags(t,ctx){
  const out=[];
  if(!isScoreable(t))return out;
  const day=(ctx&&ctx.day)||[t];
  let idx=-1;
  for(let i=0;i<day.length;i++){if(day[i].id===t.id){idx=i;break;}}
  if(t.nosl==='1'||num(t.sl)===null)out.push({k:'nosl',w:FLAG_W.nosl});
  const r=rOf(t);
  if(r!==null&&r<-1.4)out.push({k:'slbreak',w:FLAG_W.slbreak});
  let rev=(t.mist==='revenge');
  if(!rev&&idx>0){
    const prev=day[idx-1],pp=num(prev.pnl),ca=num(prev.closedAt),me=num(t.id);
    if(pp!==null&&pp<0&&ca!==null&&me!==null&&me>=ca&&(me-ca)<=600000)rev=true;
  }
  if(rev)out.push({k:'revenge',w:FLAG_W.revenge});
  const lim=Number((ctx&&ctx.maxLoss)||0);
  if(lim>0&&idx>0){
    let cum=0;
    for(let i=0;i<idx;i++){if(day[i].status!=='open')cum+=Number(day[i].pnl||0);}
    if(cum<=-lim)out.push({k:'afterlimit',w:FLAG_W.afterlimit});
  }
  const maxt=num(ctx&&ctx.maxt);
  if(maxt!==null&&maxt>0&&idx>=maxt)out.push({k:'overtrade',w:FLAG_W.overtrade});
  return out;
}
function tradeScore(t,ctx){
  if(!isScoreable(t))return null;
  let s=0;
  for(const f of tradeFlags(t,ctx))s+=f.w;
  return Math.max(0,100-s);
}

let pass=0,fail=0;
function eq(name,got,expected){
  const ok=Object.is(got,expected)||(typeof got==='number'&&typeof expected==='number'&&Math.abs(got-expected)<1e-9);
  if(ok)pass++;else fail++;
  console.log(`${ok?'PASS':'FAIL'}  ${name}  → ${got}${ok?'':`  (expected ${expected})`}`);
}
function eqFlags(name,got,expected){
  const g=got.map(f=>f.k).sort().join(',');
  const e=expected.slice().sort().join(',');
  const ok=g===e;
  if(ok)pass++;else fail++;
  console.log(`${ok?'PASS':'FAIL'}  ${name}  → [${g}]${ok?'':`  (expected [${e}])`}`);
}
// Every seg value is a STRING — that is the stored contract, so test it that way.
const V2={rv:'2',status:'closed'};

console.log('\n══ RISK — long, short, options with lotSize ══');
// Cash long: entry 100, SL 95, 50 shares → 5 × 50 = 250.
eq('cash long risk', riskOf({...V2,seg:'cash',dir:'long',en:'100',sl:'95',qty:'50'}), 250);
// Cash short: SL sits ABOVE entry. |100−105| × 50 = 250. Direction must not flip risk.
eq('cash short risk', riskOf({...V2,seg:'cash',dir:'short',en:'100',sl:'105',qty:'50'}), 250);
// Options: premiums 100 → SL 80, 2 lots × 75 = 20 × 150 = 3000.
eq('options risk uses lotSize', riskOf({...V2,seg:'options',optType:'CE',dir:'long',en:'100',sl:'80',qty:'2',lotSize:'75'}), 3000);
// Futures short: |24500−24550| × 1 × 75 = 3750.
eq('futures short risk', riskOf({...V2,seg:'futures',dir:'short',en:'24500',sl:'24550',qty:'1',lotSize:'75'}), 3750);
// Crypto has no lot size → multiplier 1.
eq('crypto risk lotSize defaults to 1', riskOf({...V2,seg:'crypto',dir:'long',en:'60000',sl:'58000',qty:'0.5'}), 1000);
eq('risk null when sl missing', riskOf({...V2,seg:'cash',en:'100',qty:'50'}), null);
eq('risk null when en===sl', riskOf({...V2,seg:'cash',en:'100',sl:'100',qty:'50'}), null);
eq('risk null when qty zero', riskOf({...V2,seg:'cash',en:'100',sl:'95',qty:'0'}), null);

console.log('\n══ R ══');
eq('R +2 on a winner', rOf({...V2,seg:'cash',en:'100',sl:'95',qty:'50',pnl:500}), 2);
eq('R −1 on a clean stop', rOf({...V2,seg:'cash',en:'100',sl:'95',qty:'50',pnl:-250}), -1);
eq('R short winner', rOf({...V2,seg:'cash',dir:'short',en:'100',sl:'105',qty:'50',pnl:250}), 1);
eq('R null when risk unknown', rOf({...V2,seg:'cash',en:'100',qty:'50',pnl:500}), null);
eq('R 0 on a scratch', rOf({...V2,seg:'cash',en:'100',sl:'95',qty:'50',pnl:0}), 0);

console.log('\n══ PLANNED RR (only when tgt exists — nobody has ever filled one) ══');
eq('RR 1:3', plannedRR({en:'100',sl:'95',tgt:'115'}), 3);
eq('RR short 1:2', plannedRR({en:'100',sl:'105',tgt:'90'}), 2);
eq('RR null without tgt', plannedRR({en:'100',sl:'95'}), null);

console.log('\n══ EXPECTANCY ══');
eq('mean R over closed scoreable trades', expectancy([
  {...V2,seg:'cash',en:'100',sl:'95',qty:'50',pnl:500},   // +2
  {...V2,seg:'cash',en:'100',sl:'95',qty:'50',pnl:-250},  // -1
]), 0.5);
eq('open trades excluded', expectancy([
  {...V2,seg:'cash',en:'100',sl:'95',qty:'50',pnl:500},
  {rv:'2',status:'open',seg:'cash',en:'100',sl:'95',qty:'50',pnl:0},
]), 2);
eq('legacy trades excluded', expectancy([
  {...V2,seg:'cash',en:'100',sl:'95',qty:'50',pnl:500},
  {status:'closed',en:'100',qty:'50',pnl:-9999},          // no rv
]), 2);
eq('expectancy null when nothing measurable', expectancy([{status:'closed',pnl:100}]), null);

console.log('\n══ FLAGS ══');
const base={...V2,id:1000,seg:'cash',en:'100',sl:'95',qty:'50',pnl:-250,date:'2026-09-10'};
eqFlags('clean trade raises nothing', tradeFlags(base,{day:[base]}), []);
// nosl — via the checkbox, and via a simply absent SL.
const noslT={...V2,id:1,seg:'cash',en:'100',qty:'50',pnl:-100,nosl:'1'};
eqFlags('nosl via checkbox', tradeFlags(noslT,{day:[noslT]}), ['nosl']);
const noslT2={...V2,id:1,seg:'cash',en:'100',qty:'50',pnl:-100};
eqFlags('nosl via missing sl', tradeFlags(noslT2,{day:[noslT2]}), ['nosl']);
eq('nosl weight is 35 — not softened', FLAG_W.nosl, 35);
// slbreak — R below −1.4 means the stop was not honoured.
const brk={...V2,id:2,seg:'cash',en:'100',sl:'95',qty:'50',pnl:-400}; // R = -1.6
eqFlags('slbreak at R −1.6', tradeFlags(brk,{day:[brk]}), ['slbreak']);
const notBrk={...V2,id:2,seg:'cash',en:'100',sl:'95',qty:'50',pnl:-300}; // R = -1.2
eqFlags('no slbreak at R −1.2', tradeFlags(notBrk,{day:[notBrk]}), []);
// revenge — derived from timestamps, and separately from the self-reported field.
const lossPrev={...V2,id:1000,pnl:-500,closedAt:1_000_000,seg:'cash',en:'100',sl:'95',qty:'50'};
const quickNext={...V2,id:1_300_000,seg:'cash',en:'100',sl:'95',qty:'50',pnl:100}; // +5 min
eqFlags('revenge from timestamps (<10 min after a loss)',
  tradeFlags(quickNext,{day:[lossPrev,quickNext]}), ['revenge']);
const lateNext={...V2,id:2_000_000,seg:'cash',en:'100',sl:'95',qty:'50',pnl:100}; // +16.6 min
eqFlags('no revenge after 10 min', tradeFlags(lateNext,{day:[lossPrev,lateNext]}), []);
const winPrev={...V2,id:1000,pnl:500,closedAt:1_000_000,seg:'cash',en:'100',sl:'95',qty:'50'};
eqFlags('no revenge when the previous trade won',
  tradeFlags(quickNext,{day:[winPrev,quickNext]}), []);
const selfRev={...V2,id:3,seg:'cash',en:'100',sl:'95',qty:'50',pnl:-100,mist:'revenge'};
eqFlags('self-reported mist:revenge still counts', tradeFlags(selfRev,{day:[selfRev]}), ['revenge']);
// afterlimit — the day was already past the loss limit before this trade opened.
// l1 carries a big rupee loss but a shallow R (risk 10000), so it breaches the
// day limit WITHOUT tripping slbreak — keeping this test about afterlimit only.
const l1={...V2,id:10,seg:'cash',en:'100',sl:'95',qty:'2000',pnl:-6000};
const l2={...V2,id:20,seg:'cash',en:'100',sl:'95',qty:'50',pnl:-100};
eqFlags('afterlimit once the day limit is breached',
  tradeFlags(l2,{day:[l1,l2],maxLoss:5000}), ['afterlimit']);
eqFlags('no afterlimit while inside the limit',
  tradeFlags(l2,{day:[l1,l2],maxLoss:50000}), []);
eqFlags('first trade of the day can never be afterlimit',
  tradeFlags(l1,{day:[l1,l2],maxLoss:1}), []);
// overtrade — index within the day at or beyond maxt.
const d1={...V2,id:1,seg:'cash',en:'100',sl:'95',qty:'50',pnl:10};
const d2={...V2,id:2,seg:'cash',en:'100',sl:'95',qty:'50',pnl:10};
const d3={...V2,id:3,seg:'cash',en:'100',sl:'95',qty:'50',pnl:10};
eqFlags('3rd trade with maxt=2 is overtrade', tradeFlags(d3,{day:[d1,d2,d3],maxt:2}), ['overtrade']);
eqFlags('2nd trade with maxt=2 is fine', tradeFlags(d2,{day:[d1,d2,d3],maxt:2}), []);
eqFlags('no maxt set → flag never fires', tradeFlags(d3,{day:[d1,d2,d3]}), []);
// oversize / lowchk ship inert — mpvf has no per-trade risk %, and inventing a
// default would fabricate a rule the student never set. A ₹5,00,000 risk on a
// single trade must therefore raise NOTHING until P2 adds that field.
const huge={...V2,id:1,seg:'cash',en:'100',sl:'50',qty:'10000',pnl:-1000};
eqFlags('oversize inert: even a ₹5L risk raises no flag', tradeFlags(huge,{day:[huge]}), []);

console.log('\n══ SCORE ══');
eq('clean trade scores 100', tradeScore(base,{day:[base]}), 100);
eq('nosl costs exactly 35', tradeScore(noslT,{day:[noslT]}), 65);
eq('nosl + slbreak stacks to 35', tradeScore(
  {...V2,id:1,seg:'cash',en:'100',sl:'95',qty:'50',pnl:-400,nosl:'1'},
  {day:[]}), 35);
eq('score floors at 0, never negative', tradeScore(
  {...V2,id:20,seg:'cash',en:'100',sl:'95',qty:'50',pnl:-400,nosl:'1',mist:'revenge'},
  {day:[l1,{...V2,id:20,seg:'cash',en:'100',sl:'95',qty:'50',pnl:-400,nosl:'1',mist:'revenge'}],maxLoss:5000,maxt:1}),
  0);

console.log('\n══ LEGACY (no rv) — the non-negotiable contract ══');
// Shaped like the real legacy rows: en filled, sl absent, no status, no seg.
const legacy={id:1756100111000,date:'2026-06-11',inst:'NIFTY',pnl:-3750,pln:false,mist:'ignored_sl',en:'120.5',ex:'98',qty:'2',dir:'long'};
eq('legacy is not scoreable', isScoreable(legacy), false);
eq('legacy risk is null', riskOf(legacy), null);
eq('legacy R is null', rOf(legacy), null);
eqFlags('legacy raises ZERO flags despite no sl', tradeFlags(legacy,{day:[legacy],maxLoss:100,maxt:1}), []);
eq('legacy has no score', tradeScore(legacy,{day:[legacy]}), null);
// Even a legacy row that looks maximally bad must stay unflagged.
const legacyBad={id:2,date:'2026-06-11',pnl:-99999,mist:'revenge',en:'100',qty:'50'};
eqFlags('worst-case legacy row still raises nothing', tradeFlags(legacyBad,{day:[legacyBad],maxLoss:1,maxt:1}), []);
eq('rv:"1" is below the bar and reads as legacy', isScoreable({rv:'1',en:'1',sl:'2',qty:'1'}), false);
eq('rv:"2" qualifies', isScoreable({rv:'2'}), true);
eq('rv:"3" (a future version) still qualifies', isScoreable({rv:'3'}), true);

console.log('\n══ CORRUPT DATES (one student has an mpvpm row dated 2002-05-23) ══');
eq('date before _firstDay is ignored', afterFirstDay('2002-05-23','2026-07-24'), false);
eq('date on/after _firstDay is kept', afterFirstDay('2026-08-01','2026-07-24'), true);
eq('non-ISO junk is ignored', afterFirstDay('not-a-date','2026-07-24'), false);
eq('missing _firstDay still accepts a valid date', afterFirstDay('2026-08-01',undefined), true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
