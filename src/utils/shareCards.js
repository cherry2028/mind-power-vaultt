// Branded shareable card images (Phase 2 psychological hook layer).
//
// Students share these on WhatsApp status, so they render at 1080px width
// (status quality) via the same html2canvas rasterization used for the
// weekly PDF — the browser shapes the Telugu, we screenshot the DOM.

const GOLD = '#C9A84C', GOLD_DEEP = '#9A7020', GOLD_PALE = '#E2C97A';
const BLACK = '#05050A', INK_DARK = '#0B0B12', SMOKE = '#F5F2EA', MID = '#9A8870';
const RED = '#CF6679', GREEN = '#4CAF82';

function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const FONTS = `'DM Sans','Noto Sans Telugu','Nirmala UI',sans-serif`;
const SERIF = `'Cormorant Garamond','Noto Serif Telugu',serif`;

// Fine engraved-line background, passport style — pure CSS, no images.
const GUILLOCHE = `
  repeating-radial-gradient(circle at 20% 30%, rgba(201,168,76,0.05) 0px, transparent 1px, transparent 9px),
  repeating-radial-gradient(circle at 80% 70%, rgba(201,168,76,0.045) 0px, transparent 1px, transparent 11px),
  repeating-linear-gradient(115deg, rgba(201,168,76,0.03) 0px, transparent 1px, transparent 7px)`;

const brandFooter = (line) => `
  <div style="margin-top:34px;border-top:1px solid rgba(201,168,76,0.35);padding-top:22px;text-align:center">
    <div style="font-size:26px;line-height:1.6;color:${GOLD_PALE};font-weight:600">${line}</div>
    <div style="font-size:20px;letter-spacing:6px;color:${MID};margin-top:12px">MIND POWER VAULTT</div>
  </div>`;

const STAMP_LINE = 'Stock Market తెలుసు. Mind తెలియదు. అందుకే loss.';

// MRZ (machine-readable zone) strip — the passport detail that sells it.
// Chevrons must render as text, so escape them before they hit innerHTML.
function mrz(name, licNo, date) {
  const clean = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '<');
  const pad = (s, n) => (s + '<'.repeat(n)).slice(0, n);
  const he = (s) => s.replace(/</g, '&lt;');
  const l1 = he(pad('P<MPV<' + clean(name), 40));
  const l2 = he(pad(clean(licNo) + '<' + String(date || '').replace(/-/g, '') + '<MPV', 40));
  return `<div style="font-family:'Courier New',monospace;font-size:26px;letter-spacing:3px;color:rgba(245,242,234,0.55);line-height:1.7;word-break:break-all">${l1}<br/>${l2}</div>`;
}

export function buildLicenseCardHtml(p) {
  const row = (label, value, color) => `
    <div style="display:flex;align-items:baseline;gap:14px;margin-bottom:20px">
      <span style="font-size:20px;letter-spacing:3px;color:${MID};white-space:nowrap">${label}</span>
      <span style="flex:1;border-bottom:2px dotted rgba(201,168,76,0.4);transform:translateY(-6px)"></span>
      <span style="font-size:30px;font-weight:700;color:${color || SMOKE}">${value}</span>
    </div>`;
  return `
  <div style="width:1080px;padding:70px 60px;background:${BLACK};font-family:${FONTS};box-sizing:border-box">
    <div style="border:3px solid ${GOLD};border-radius:6px;padding:8px;background:${GUILLOCHE},${INK_DARK}">
    <div style="border:1px solid rgba(201,168,76,0.5);border-radius:3px;padding:56px 52px;position:relative">

      <div style="text-align:center;margin-bottom:8px">
        <img src="/logo.jpeg" style="width:88px;height:88px;border-radius:50%;object-fit:cover;border:2px solid ${GOLD}" alt=""/>
        <div style="font-size:30px;font-weight:700;letter-spacing:10px;color:${GOLD};margin-top:18px">MIND POWER VAULTT</div>
        <div style="font-size:44px;font-weight:700;letter-spacing:16px;color:${SMOKE};margin-top:26px">TRADING LICENSE</div>
        <div style="width:220px;height:2px;background:linear-gradient(90deg,transparent,${GOLD},transparent);margin:22px auto 0"></div>
      </div>

      <div style="font-family:${SERIF};font-size:64px;font-weight:600;color:${GOLD_PALE};text-align:center;margin:34px 0 44px;line-height:1.2">${esc(p.name)}</div>

      ${row('DATE', esc(p.dateDisplay))}
      ${row('MAX LOSS', '₹' + esc(p.mlDisplay), RED)}
      ${row('FOCUS', esc(p.foc || 'DISCIPLINE'), GOLD_PALE)}
      ${row('LICENSE NO', esc(p.licNo))}

      <!-- gold ink seal (stamp-translucent so data stays readable) -->
      <div style="position:absolute;right:44px;bottom:150px;width:190px;height:190px;border:4px solid rgba(201,168,76,0.85);border-radius:50%;display:flex;align-items:center;justify-content:center;transform:rotate(-12deg);opacity:0.55">
        <div style="width:154px;height:154px;border:2px solid rgba(201,168,76,0.7);border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">
          <div style="font-size:30px;color:${GOLD}">✦</div>
          <div style="font-size:26px;font-weight:800;letter-spacing:5px;color:${GOLD}">LICENSED</div>
          <div style="font-size:18px;color:rgba(201,168,76,0.8);margin-top:4px">MPV</div>
        </div>
      </div>

      <div style="font-size:24px;color:${MID};margin:30px 0 26px;text-align:center;font-style:italic">
        Valid today only — రేపు మళ్ళీ earn చేయాలి.
      </div>

      <div style="border-top:1px solid rgba(201,168,76,0.35);padding-top:20px">${mrz(p.name, p.licNo, p.date)}</div>
    </div>
    </div>
    <div style="text-align:center;font-size:22px;color:${MID};margin-top:26px;letter-spacing:2px">${STAMP_LINE} — <span style="color:${GOLD}">Mind Power Vaultt</span></div>
  </div>`;
}

export function buildInsightCardHtml(p) {
  return `
  <div style="width:1080px;padding:80px 70px;background:${GUILLOCHE},${BLACK};font-family:${FONTS};box-sizing:border-box">
    <div style="text-align:center;margin-bottom:44px">
      <img src="/logo.jpeg" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:2px solid ${GOLD}" alt=""/>
      <div style="font-size:24px;letter-spacing:8px;color:${MID};margin-top:16px">TODAY'S MIRROR</div>
    </div>
    <div style="border-left:6px solid ${GOLD};padding:10px 0 10px 40px;margin:0 0 30px">
      <div style="font-size:46px;line-height:1.75;color:${SMOKE};font-weight:600">${esc(p.text)}</div>
    </div>
    ${p.sub ? `<div style="font-size:30px;color:${GOLD_PALE};text-align:right;margin-top:8px">${esc(p.sub)}</div>` : ''}
    ${brandFooter(STAMP_LINE)}
  </div>`;
}

export function buildMilestoneCardHtml(p) {
  return `
  <div style="width:1080px;padding:90px 70px;background:${GUILLOCHE},${BLACK};font-family:${FONTS};box-sizing:border-box;text-align:center">
    <div style="font-size:24px;letter-spacing:8px;color:${MID}">MIND POWER VAULTT · STREAK MILESTONE</div>
    <div style="width:300px;height:300px;margin:56px auto;border:5px solid ${GOLD};border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(circle,rgba(201,168,76,0.16),transparent 70%)">
      <div style="font-size:120px;font-weight:800;color:${GOLD_PALE};line-height:1">${Number(p.days)}</div>
      <div style="font-size:30px;letter-spacing:6px;color:${GOLD}">DAYS 🔥</div>
    </div>
    <div style="font-size:48px;line-height:1.7;color:${SMOKE};font-weight:700;max-width:860px;margin:0 auto">${esc(p.statement)}</div>
    <div style="font-size:28px;color:${MID};margin-top:30px">${esc(p.name)} · ${esc(p.dateDisplay)}</div>
    ${brandFooter(STAMP_LINE)}
  </div>`;
}

// Rasterize a card to a PNG File (1080px wide, WhatsApp-status quality).
export async function generateCardImage(html, fileName) {
  const { default: html2canvas } = await import('html2canvas');
  const host = document.createElement('div');
  host.style.cssText = 'position:absolute;left:-12000px;top:0;width:1080px;z-index:-1';
  host.innerHTML = html;
  document.body.appendChild(host);
  try {
    if (document.fonts?.ready) await document.fonts.ready;
    const canvas = await html2canvas(host, { scale: 1, backgroundColor: '#05050A', useCORS: true, logging: false });
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
    return { blob, file: new File([blob], fileName, { type: 'image/png' }) };
  } finally {
    document.body.removeChild(host);
  }
}
