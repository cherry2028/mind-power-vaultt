// Weekly report PDF generation for the journal.
//
// Telugu (and all Indic scripts) need OpenType glyph shaping, which jsPDF's
// text engine cannot do — embedding a Telugu TTF directly produces garbled
// conjuncts. So the report is rendered as real DOM (the browser shapes the
// text), rasterized with html2canvas, and placed into an A4 jsPDF as images.

const G = { gold: '#9A7020', goldLight: '#C9A84C', ink: '#1A1A1A', dim: '#555555', line: '#D9CFAF', bgSoft: '#FAF7EE', red: '#B0413E', green: '#2E7D52' };

function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const MIST_LABELS = { revenge: 'Revenge Trade', fomo: 'FOMO Entry', ignored_sl: 'Stop Loss Ignored', unspecified: 'Unspecified' };
const MOODS = { green: '🟢 Calm', yellow: '🟡 Mixed', red: '🔴 Stressed' };
const MIR_PROC = { yes_fully: 'Yes, fully followed', mostly: 'Mostly', partially: 'Partially', no: 'No, broke rules' };

const rupee = (n) => '₹' + Math.abs(Number(n || 0)).toLocaleString('en-IN');
const signedRupee = (n) => (Number(n || 0) >= 0 ? '+' : '-') + rupee(n);
const pretty = (v) => esc(String(v || '—').replace(/_/g, ' '));

export function buildReportHtml(p) {
  const s = p.stats || {};
  const th = `padding:5px 7px;background:${G.bgSoft};border:1px solid ${G.line};color:${G.gold};font-size:9.5px;text-transform:uppercase;letter-spacing:0.5px;text-align:left`;
  const td = `padding:5px 7px;border:1px solid ${G.line};font-size:10px;color:${G.ink};vertical-align:top`;
  const secTitle = (t) => `<div style="margin:18px 0 8px;font-size:12px;font-weight:700;color:${G.gold};letter-spacing:2px;text-transform:uppercase;border-bottom:2px solid ${G.line};padding-bottom:4px">${t}</div>`;
  const stat = (label, value, color) => `<td style="width:16.6%;padding:10px 6px;border:1px solid ${G.line};text-align:center;background:${G.bgSoft}"><div style="font-size:15px;font-weight:700;color:${color || G.ink}">${value}</div><div style="font-size:8.5px;color:${G.dim};letter-spacing:0.5px;text-transform:uppercase;margin-top:3px">${label}</div></td>`;

  const tradeRows = (p.trades || []).map((t) => {
    const pnl = Number(t.pnl || 0);
    return `<tr>
      <td style="${td}">${esc(t.date)}</td>
      <td style="${td}">${esc(t.inst)}</td>
      <td style="${td}">${esc((t.dir || '').toUpperCase())}</td>
      <td style="${td};color:${t.pln ? G.green : G.red};font-weight:600">${t.pln ? 'Planned' : 'Impulse'}</td>
      <td style="${td}">${pretty(t.emo)}</td>
      <td style="${td};color:${pnl >= 0 ? G.green : G.red};font-weight:700;white-space:nowrap">${signedRupee(pnl)}</td>
      <td style="${td}">${t.mist ? esc(MIST_LABELS[t.mist] || t.mist.replace(/_/g, ' ')) : '—'}</td>
      <td style="${td}">${t.voice ? '🎙 ' + esc(t.voice) : '—'}</td>
    </tr>`;
  }).join('');

  const eodRows = (p.eods || []).map((d) => `<tr>
      <td style="${td}">${esc(d.date)}</td>
      <td style="${td};text-align:center">${esc(d.proc ?? '—')}/10</td>
      <td style="${td};text-align:center">${esc(d.out ?? '—')}/10</td>
      <td style="${td}">${MOODS[d.mood] || pretty(d.mood)}</td>
      <td style="${td}">${esc(d.best || '—')}</td>
      <td style="${td}">${esc(d.worst || '—')}</td>
      <td style="${td}">${esc(MIR_PROC[d.mirProc] || pretty(d.mirProc))}<br/><span style="color:${G.dim}">${esc(d.mirLie || '')}</span>${d.mirPro ? `<br/><span style="color:${G.dim}">${pretty(d.mirPro)}</span>` : ''}</td>
    </tr>`).join('');

  const mistEntries = Object.entries(p.mistakes || {}).sort((a, b) => b[1] - a[1]);
  const mistRows = mistEntries.map(([k, n]) => `<tr>
      <td style="${td}">${esc(MIST_LABELS[k] || k.replace(/_/g, ' '))}</td>
      <td style="${td};text-align:center;font-weight:700;color:${G.red}">${n}×</td>
    </tr>`).join('');

  const ruleRows = (p.rules || []).map((r) => `<tr>
      <td style="${td}">${esc(r.text)}</td>
      <td style="${td};text-align:center;font-weight:700;color:${r.weekBreaks ? G.red : G.green}">${r.datesTracked ? r.weekBreaks + '×' : '—'}</td>
      <td style="${td};text-align:center;color:${r.totalBreaks ? G.red : G.green}">${r.totalBreaks}×</td>
    </tr>`).join('');

  const empty = (msg) => `<div style="padding:10px;border:1px dashed ${G.line};font-size:10px;color:${G.dim};text-align:center">${msg}</div>`;

  return `
  <div style="font-family:'DM Sans','Noto Sans Telugu','Nirmala UI',sans-serif;color:${G.ink};padding:34px 38px;background:#ffffff;width:794px;box-sizing:border-box">
    <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid ${G.goldLight};padding-bottom:14px">
      <div style="display:flex;align-items:center;gap:12px">
        <img src="/logo.jpeg" style="width:46px;height:46px;border-radius:50%;object-fit:cover" alt=""/>
        <div>
          <div style="font-size:19px;font-weight:700;letter-spacing:3px;color:${G.gold}">MIND POWER VAULTT</div>
          <div style="font-size:9px;letter-spacing:2px;color:${G.dim};text-transform:uppercase">Weekly Trading Psychology Report</div>
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-size:13px;font-weight:700">${esc(p.studentName)}</div>
        <div style="font-size:9.5px;color:${G.dim}">${esc(p.weekStart)} → ${esc(p.weekEnd)}</div>
        <div style="margin-top:4px"><span style="font-size:9px;font-weight:700;letter-spacing:1px;color:#fff;background:${G.gold};padding:2px 8px;border-radius:10px;text-transform:uppercase">${esc(p.identity)}</span>
        <span style="font-size:9px;font-weight:700;color:${G.gold};margin-left:6px">🔥 ${Number(p.streak || 0)}d streak</span></div>
      </div>
    </div>

    ${secTitle('Week Stats')}
    <table style="width:100%;border-collapse:collapse"><tr>
      ${stat('Total Trades', s.totalTrades ?? 0)}
      ${stat('Week P&L', signedRupee(s.pnl), Number(s.pnl || 0) >= 0 ? G.green : G.red)}
      ${stat('Win Rate', (s.winRate ?? 0) + '%', (s.winRate ?? 0) >= 50 ? G.green : G.red)}
      ${stat('Discipline', (s.disciplinePct ?? 0) + '%', G.gold)}
      ${stat('Mistake Cost', '-' + rupee(s.mistakeCost), G.red)}
      ${stat('Earned via Discipline', '+' + rupee(s.disciplineEarned), G.green)}
    </tr></table>
    <div style="font-size:9px;color:${G.dim};margin-top:5px">Discipline % = planned trades / total trades (${s.plannedCount ?? 0}/${s.totalTrades ?? 0}) · Overall discipline score: ${Number(p.discipline || 0)}</div>

    ${secTitle('All Trades This Week')}
    ${tradeRows ? `<table style="width:100%;border-collapse:collapse"><tr><th style="${th}">Date</th><th style="${th}">Instrument</th><th style="${th}">Dir</th><th style="${th}">Type</th><th style="${th}">Emotion</th><th style="${th}">P&amp;L</th><th style="${th}">Mistake</th><th style="${th}">Voice Note</th></tr>${tradeRows}</table>` : empty('ఈ వారం trades log అవ్వలేదు')}

    ${secTitle('EOD Reviews')}
    ${eodRows ? `<table style="width:100%;border-collapse:collapse"><tr><th style="${th}">Date</th><th style="${th}">Process</th><th style="${th}">Outcome</th><th style="${th}">Mood</th><th style="${th}">Best Decision</th><th style="${th}">Worst Decision</th><th style="${th}">Mirror Answers</th></tr>${eodRows}</table>` : empty('ఈ వారం EOD reviews లేవు')}

    ${secTitle('Repeated Mistakes')}
    ${mistRows ? `<table style="width:60%;border-collapse:collapse"><tr><th style="${th}">Mistake</th><th style="${th};text-align:center">Count</th></tr>${mistRows}</table>` : empty('ఈ వారం impulse mistakes లేవు ✦')}

    ${secTitle('Rule Breaks This Week')}
    ${ruleRows ? `<table style="width:100%;border-collapse:collapse"><tr><th style="${th}">Rule</th><th style="${th};text-align:center">This Week</th><th style="${th};text-align:center">All Time</th></tr>${ruleRows}</table><div style="font-size:8.5px;color:${G.dim};margin-top:4px">"—" అంటే ఆ rule కి per-week tracking ఇంకా start అవ్వలేదు (older data).</div>` : empty('Rules ఇంకా define అవ్వలేదు')}

    <div style="margin-top:26px;border-top:2px solid ${G.line};padding-top:10px;display:flex;justify-content:space-between;font-size:9px;color:${G.dim}">
      <span>Mind Power Vaultt — Confidential</span>
      <span>Generated ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
    </div>
  </div>`;
}

export async function generateWeeklyPdf(payload) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);

  const host = document.createElement('div');
  // Must be rendered (not display:none) for html2canvas — park it off-screen.
  host.style.cssText = 'position:absolute;left:-10000px;top:0;width:794px;background:#ffffff;z-index:-1';
  host.innerHTML = buildReportHtml(payload);
  document.body.appendChild(host);

  try {
    if (document.fonts?.ready) await document.fonts.ready;
    const canvas = await html2canvas(host, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
    const pageWpx = canvas.width;                       // 794 * 2
    const pageHpx = Math.floor(pageWpx * 297 / 210);    // A4 aspect
    const pages = Math.max(1, Math.ceil(canvas.height / pageHpx));

    for (let i = 0; i < pages; i++) {
      const sliceH = Math.min(pageHpx, canvas.height - i * pageHpx);
      const slice = document.createElement('canvas');
      slice.width = pageWpx;
      slice.height = sliceH;
      const ctx = slice.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pageWpx, sliceH);
      ctx.drawImage(canvas, 0, i * pageHpx, pageWpx, sliceH, 0, 0, pageWpx, sliceH);
      if (i > 0) pdf.addPage();
      pdf.addImage(slice.toDataURL('image/jpeg', 0.85), 'JPEG', 0, 0, 210, (sliceH * 210) / pageWpx);
    }

    const fileName = `MPV_Weekly_${String(payload.studentName || 'Student').replace(/[^\wఀ-౿-]+/g, '_')}_${payload.weekEnd}.pdf`;
    const blob = pdf.output('blob');
    const file = new File([blob], fileName, { type: 'application/pdf' });
    return { blob, file, fileName };
  } finally {
    document.body.removeChild(host);
  }
}
