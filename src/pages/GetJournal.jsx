import React from 'react';
import { useNavigate } from 'react-router-dom';
import Seo from '../Seo';
import JournalPitch from './JournalPitch';
import { track } from '../analytics';
import { withAttr } from '../utils/attribution';

// The direct journal path. For a high-intent SEARCH visitor (someone who
// searched *to buy*), the page now leads with a compact hero — price, what's
// inside, one Buy button, all above the fold — so they don't have to scroll the
// full emotional pitch to find a price. The pitch stays below for the undecided.
const C = {
  bg0: '#05070F', bg1: '#0B1122', gold: '#C9A84C', goldHi: '#F0D080', goldLo: '#9A7020',
  ink: '#F5F2EA', dim: '#9A9382', line: 'rgba(201,168,76,0.22)', green: '#4CAF82',
};

function SearchHero({ onBuy }) {
  const bullets = [
    ['🎫', 'రోజూ Trading License — mind ready ఐతేనే trade unlock'],
    ['📉', 'నీ Mistakes ఖరీదు — ఒక్క number లో కళ్ళ ముందు'],
    ['⚖️', 'Strategy దా, Psychology దా — నీ data చెప్తుంది'],
    ['📄', 'వారానికొక Report — K Prasad కి పంపించు'],
  ];
  return (
    <div style={{
      background: `radial-gradient(120% 80% at 50% 0%, ${C.bg1} 0%, ${C.bg0} 62%)`,
      color: C.ink, fontFamily: "'DM Sans','Noto Sans Telugu',sans-serif",
      padding: '26px 18px 30px', borderBottom: `1px solid ${C.line}`,
    }}>
      <div style={{ maxWidth: 460, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: C.gold, fontWeight: 700 }}>
          🔒 Mind Power Vaultt
        </div>
        <h1 style={{ fontSize: 'clamp(22px,5vw,30px)', fontWeight: 800, lineHeight: 1.25, margin: '10px 0 6px' }}>
          Trading Journal — నీ <span style={{ color: C.goldHi }}>Discipline System</span>
        </h1>
        <p style={{ fontSize: 13.5, color: C.dim, lineHeight: 1.7, margin: '0 0 16px' }}>
          Strategy కాదు — నీ psychology ని fix చేసే system. Telugu traders కోసం.
        </p>

        {/* Price — the thing a high-intent buyer wants immediately */}
        <div style={{
          display: 'inline-block', background: 'rgba(201,168,76,0.07)',
          border: `1px solid ${C.gold}`, borderRadius: 14, padding: '12px 22px', marginBottom: 16,
        }}>
          <div style={{ fontSize: 30, fontWeight: 900, lineHeight: 1 }}>
            ₹3,540<span style={{ fontSize: 13, color: C.dim, fontWeight: 600 }}> / సంవత్సరం</span>
          </div>
          <div style={{ fontSize: 11.5, color: C.dim, marginTop: 3 }}>₹3,000 + 18% GST · Full year access</div>
        </div>

        {/* What's inside — compact */}
        <div style={{ textAlign: 'left', maxWidth: 360, margin: '0 auto 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {bullets.map(([ic, t], i) => (
            <div key={i} style={{ fontSize: 13, color: C.ink, lineHeight: 1.5, opacity: 0.94 }}>
              <span style={{ marginRight: 8 }}>{ic}</span>{t}
            </div>
          ))}
        </div>

        {/* Single Buy button, above the fold */}
        <button onClick={onBuy} style={{
          width: '100%', maxWidth: 360, padding: 17, border: 'none', borderRadius: 12,
          background: `linear-gradient(135deg,${C.goldHi},${C.goldLo})`, color: '#05050A',
          fontSize: 16.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: '0 12px 30px rgba(201,168,76,0.32)',
        }}>
          📓 ఇప్పుడే Journal కొను →
        </button>
        <div style={{ fontSize: 11, color: C.dim, marginTop: 10 }}>
          🔒 Secure payment · Instant access · ↓ పూర్తి details కింద
        </div>
      </div>
    </div>
  );
}

export default function GetJournal() {
  const navigate = useNavigate();

  const onBuy = () => {
    track('journal_cta_click', { source: 'get_journal_page', price: 3540 });
    navigate(withAttr('/?buy=1')); // carry gclid/utm to the payment page
  };

  return (
    <>
      <Seo
        title="Trading Journal — Mind Power Vaultt"
        description="Telugu trading psychology journal: daily license, mistake-cost tracking, evening mirror and a weekly report. ₹3,000 + GST per year."
        path="/get-journal"
      />
      {/* High-intent Search hero: price + inside + Buy, above the fold */}
      <SearchHero onBuy={onBuy} />
      {/* The full emotional pitch, for the undecided who scroll */}
      <JournalPitch variant="new" showPurchase onBuy={onBuy} onSignIn={() => navigate('/portal')} />
    </>
  );
}
