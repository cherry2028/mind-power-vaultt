import React from 'react';
import { track } from '../analytics';

// Value pitch shown to anyone who reaches the journal without an active
// subscription. Desire-focused: describes WHAT the journal does for the trader,
// never HOW it works. Two variants — 'new' (never subscribed) and 'expired'
// (was a member) — differ only in the closing line and the primary CTA.
const MENTOR_WA = import.meta.env.VITE_MENTOR_WHATSAPP || '919059181616';

const BLOCKS = [
  {
    h: 'రోజూ నీకు ఒక License',
    b: 'నీ mind ready గా ఉంటేనే — ఆ రోజు trade చేసే అర్హత. License లేకుండా trade లేదు. Discipline రోజూ earn చేసేది.',
  },
  {
    h: 'నీ Mistakes ఖరీదు — కళ్ళ ముందు',
    b: 'FOMO కి, revenge కి ఈ నెల ఎంత pay చేశావో — ఒక్క number లో. ఆ number చూసిన రోజు నుండి — నీ impulse trades ఆగుతాయి.',
  },
  {
    h: 'రోజూ ఒక అద్దం',
    b: 'Market close అయ్యాక — "ఈరోజు నిన్ను నువ్వు ఎక్కడ deceive చేసుకున్నావ్?" ఈ ఒక్క question రోజూ face చేసే trader — మారకుండా ఉండలేడు.',
  },
  {
    h: 'నీ గురించి నీకు చెప్పే voice',
    b: 'నీ patterns. నీ danger time zones. నీ emotion-loss connection. నీకు తెలియని నిజాలు — నీ data నుండే.',
  },
  {
    h: 'Emotional నుండి Professional దాకా',
    b: 'ఒక ప్రయాణం. రోజురోజుకీ నువ్వు ఎవరవుతున్నావో — నీకే కనిపిస్తుంది.',
  },
];

const C = {
  bg0: '#05070F', bg1: '#0B1122', card: '#0E1526',
  gold: '#C9A84C', goldHi: '#E8C46A', goldLo: '#9A7020',
  ink: '#F5F2EA', dim: '#A9A08C', line: 'rgba(201,168,76,0.20)',
};

export default function JournalPitch({ variant = 'new', onSignIn }) {
  const expired = variant === 'expired';

  const openMentorship = () => {
    track('journal_pitch_mentorship_click', { variant });
    const msg = encodeURIComponent(
      expired ? 'Journal renew చేయాలి అనుకుంటున్నాను' : 'Journal గురించి తెలుసుకోవాలి అనుకుంటున్నాను'
    );
    window.open(`https://wa.me/${MENTOR_WA}?text=${msg}`, '_blank', 'noopener,noreferrer');
  };

  const openReviews = () => { window.location.href = '/#reviews'; };

  return (
    <div style={{
      minHeight: '100vh',
      background: `radial-gradient(130% 80% at 30% 0%, ${C.bg1} 0%, ${C.bg0} 62%)`,
      color: C.ink,
      fontFamily: "'DM Sans','Noto Sans Telugu',sans-serif",
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
    }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '34px 18px 40px' }}>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div style={{ fontSize: 32, lineHeight: 1, marginBottom: 10 }}>🔒</div>
          <h1 style={{
            fontSize: 21, fontWeight: 700, letterSpacing: 0.5, margin: '0 0 10px',
            background: `linear-gradient(120deg, ${C.goldHi}, ${C.gold} 55%, ${C.goldLo})`,
            WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
          }}>
            Mind Power Vaultt Journal
          </h1>
          <p style={{ fontSize: 14, color: C.dim, lineHeight: 1.7, margin: 0 }}>
            Trader ని professional చేసేది strategy కాదు — <b style={{ color: C.gold }}>ఇది.</b>
          </p>
        </div>

        {/* Value cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {BLOCKS.map((blk, i) => (
            <div key={i} style={{
              background: C.card, border: `1px solid ${C.line}`, borderRadius: 14,
              padding: '18px 18px 20px', boxShadow: '0 6px 18px rgba(0,0,0,0.35)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 9 }}>
                <span style={{ color: C.gold, fontSize: 11, flexShrink: 0 }}>◆</span>
                <h3 style={{ fontSize: 15.5, color: C.goldHi, margin: 0, fontWeight: 700, lineHeight: 1.4 }}>{blk.h}</h3>
              </div>
              <p style={{ fontSize: 13.5, color: C.ink, lineHeight: 1.85, margin: 0, opacity: 0.9 }}>{blk.b}</p>
            </div>
          ))}
        </div>

        {/* Closing */}
        <div style={{ textAlign: 'center', margin: '28px 6px 22px' }}>
          {expired ? (
            <p style={{ fontSize: 15.5, color: C.goldHi, lineHeight: 1.8, fontWeight: 700, margin: 0 }}>
              నువ్వు మొదలుపెట్టావు — ఇప్పుడు మళ్ళీ కొనసాగించు.
            </p>
          ) : (
            <>
              <p style={{ fontSize: 14, color: C.dim, lineHeight: 1.9, margin: '0 0 2px' }}>ఇది notes app కాదు.</p>
              <p style={{ fontSize: 14.5, color: C.ink, lineHeight: 1.9, margin: '0 0 12px' }}>
                ఇది struggling trader ని disciplined trader గా మార్చే <b style={{ color: C.gold }}>system</b>.
              </p>
              <p style={{ fontSize: 15.5, color: C.goldHi, lineHeight: 1.8, fontWeight: 700, margin: 0 }}>
                ఈ system నీది కావాలంటే — K Prasad తో మాట్లాడు.
              </p>
            </>
          )}
        </div>

        {/* CTAs */}
        <button onClick={openMentorship} style={{
          width: '100%', padding: '16px', border: 'none', borderRadius: 10,
          background: `linear-gradient(135deg, ${C.goldHi}, ${C.goldLo})`, color: '#05050A',
          fontSize: 14.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          marginBottom: 10, boxShadow: '0 10px 26px rgba(201,168,76,0.28)',
        }}>
          {expired ? '🔄 తిరిగి కొనసాగించు' : '📞 Mentorship గురించి తెలుసుకో'}
        </button>

        <button onClick={openReviews} style={{
          width: '100%', padding: '14px', borderRadius: 10,
          background: 'transparent', border: `1px solid ${C.line}`, color: C.gold,
          fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          మా Students ఏం అంటున్నారో చూడు →
        </button>

        {/* Existing members */}
        {onSignIn && (
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <button onClick={onSignIn} style={{
              background: 'transparent', border: 'none', color: C.dim, fontSize: 12.5,
              cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit',
            }}>
              ఇప్పటికే subscribe అయ్యావా? Sign in →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
