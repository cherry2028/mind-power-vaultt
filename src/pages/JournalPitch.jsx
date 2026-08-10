import React, { useState } from 'react';
import { track, adsConversion } from '../analytics';
import Reviews from '../components/Reviews';

// High-conversion value pitch shown to anyone reaching the journal without an
// active subscription. Bilingual (Telugu default, remembered for the session),
// desire-focused only — never describes HOW the journal works. Two variants:
// 'new' (never subscribed) and 'expired' (was a member → renew close + CTA).
const MENTOR_WA = import.meta.env.VITE_MENTOR_WHATSAPP || '919059181616';
const LANG_KEY = 'mpvPitchLang';

const D = {
  te: {
    sub: ['నీ Broker దగ్గర నీ ప్రతి trade ఉంది.', 'నీ దగ్గర — ఏమీ లేదు.'],
    subHit: 'అందుకే నువ్వు ఓడిపోతున్నావ్.',
    slapEye: 'నిజం ఒప్పుకో.',
    q: ['నువ్వు ఇప్పటిదాకా ఎన్ని trades చేశావ్?', 'అందులో ఎన్ని plan తో చేశావో — చెప్పగలవా?', 'నిన్నటి loss ఎందుకు వచ్చిందో — గుర్తుందా?'],
    no: 'లేదు.',
    build: ['ఎందుకంటే నువ్వు trade చేస్తున్నావ్ — track చేయట్లేదు.', 'Track చేయని దాన్ని — మార్చలేవ్.', 'మార్చని దాన్ని — గెలవలేవ్.'],
    real: 'ఇదే నీ అసలు problem. Strategy కాదు.',
    valEye: 'ఈ Journal నీతో ఏం చేస్తుందంటే —',
    vals: [
      'License లేకుండా trade చేయనివ్వదు. రోజూ నీ mind check అయ్యాకే — trade unlock. Discipline optional కాదు, mandatory.',
      'నీ Mistakes ఖరీదు కళ్ళ ముందు పెడుతుంది. "ఈ నెల FOMO కి ₹X పోయింది." ఆ number చూశాక — నీ చెయ్యి ఆగుతుంది.',
      'రోజూ నిన్ను నిలదీస్తుంది. "ఈరోజు నిన్ను నువ్వు ఎక్కడ మోసం చేసుకున్నావ్?" — ఈ question నుండి తప్పించుకోలేవ్.',
      'నీకు తెలియని నీ నిజాలు చెప్తుంది. నీ danger time. నీ emotion-loss link. నీ pattern. నీ data నుండే — నిర్దయగా.',
      'నిన్ను మార్చి చూపిస్తుంది. Emotional trader నుండి Professional దాకా — ప్రతి రోజు కొలుస్తూ.',
    ],
    roadsHead: 'నువ్వు రెండు దారుల్లో ఒకటి ఎంచుకోవాలి.',
    road1: ['ఒకటి:', ' ఇలాగే — track లేకుండా, అదే mistakes తో, అదే losses తో. మళ్ళీ రేపు.'],
    road2: ['రెండు:', ' ఈరోజు నుండి — ఒక system తో, ఒక అద్దం తో, ఒక దారి తో.'],
    kicker: 'Market నీకోసం ఆగదు. నీ decision కోసం కూడా.',
    ctaLine: 'ఈ system నీది కావాలంటే — ఇప్పుడే K Prasad తో మాట్లాడు.',
    bio: '12 సంవత్సరాల trading. 30 మంది traders ని మార్చిన అనుభవం.',
    b1: '📞 ఇప్పుడే మాట్లాడు', b2: 'మా Students ఏం సాధించారో చూడు →', seats: 'Seats limited · Selection based',
    signin: 'ఇప్పటికే subscribe అయ్యావా? Sign in →',
    expClose: 'నువ్వు మొదలుపెట్టావు — ఇప్పుడు మళ్ళీ కొనసాగించు.', expB1: '🔄 తిరిగి కొనసాగించు',
    waNew: 'Journal గురించి తెలుసుకోవాలి అనుకుంటున్నాను',
    buy: '📓 Journal తీసుకో →',
    incl: [
      'రోజూ Trading License — mind ready ఐతేనే trade',
      'నీ Mistakes ఖరీదు — ఒక్క number లో',
      'రోజువారీ అద్దం + నీ patterns నీ data నుండి',
      'వారానికొక Report — K Prasad కి పంపించు',
      'Full year access · phone లో app లా',
    ],
  },
  en: {
    sub: ['Your broker has every trade you made.', 'You have nothing.'],
    subHit: "That's exactly why you keep losing.",
    slapEye: 'Be honest with yourself.',
    q: ['How many trades have you taken?', 'How many were actually planned — can you say?', "Yesterday's loss — do you even remember why?"],
    no: 'No.',
    build: ["Because you're trading — not tracking.", "What you don't track, you can't change.", "What you can't change, you can't beat."],
    real: 'This is your real problem. Not strategy.',
    valEye: "Here's what this Journal does to you —",
    vals: [
      "Won't let you trade without a License. Trade unlocks only after your mind checks out. Discipline isn't optional here — it's mandatory.",
      'Puts the cost of your mistakes in front of your eyes. "₹X lost to FOMO this month." Seeing that number — your hand freezes.',
      'Confronts you every single day. "Where did you deceive yourself today?" — you can\'t escape this question.',
      'Tells you truths about yourself you don\'t know. Your danger hours. Your emotion-loss link. Your patterns. From your own data — without mercy.',
      'Transforms you, visibly. From emotional trader to professional — measured, every single day.',
    ],
    roadsHead: 'You have two roads. Pick one.',
    road1: ['One:', ' keep going — no tracking, same mistakes, same losses. Again tomorrow.'],
    road2: ['Two:', ' from today — with a system, a mirror, a direction.'],
    kicker: "The market won't wait for you. Or for your decision.",
    ctaLine: 'Want this system? Talk to K Prasad now.',
    bio: '12 years of trading. 30 traders transformed.',
    b1: '📞 Talk Now', b2: 'See What Our Students Achieved →', seats: 'Seats limited · Selection based',
    signin: 'Already subscribed? Sign in →',
    expClose: 'You started the journey — now continue it.', expB1: '🔄 Continue Again',
    waNew: 'I want to know about the Journal / mentorship',
    buy: '📓 Get the Journal →',
    incl: [
      'A daily Trading License — trade only when your mind checks out',
      'The cost of your mistakes — in one number',
      'A daily mirror + your patterns, from your own data',
      'A weekly report you can send to K Prasad',
      'Full year access · works like an app on your phone',
    ],
  },
};

const C = {
  bg0: '#05070F', bg1: '#0B1122', card: '#0E1526',
  gold: '#C9A84C', goldHi: '#F0D080', goldLo: '#9A7020',
  ink: '#F5F2EA', dim: '#9A9382', line: 'rgba(201,168,76,0.18)', crimson: '#DB5B54',
};

// showPurchase = the direct-from-website path: the same pitch convinces first,
// then the price + Buy CTA land at the bottom. The /portal path (a student who
// already tried to sign in) keeps the consultative WhatsApp CTA.
export default function JournalPitch({ variant = 'new', onSignIn, showPurchase = false, onBuy }) {
  const [lang, setLang] = useState(() => (sessionStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'te'));
  const d = D[lang];
  const expired = variant === 'expired';

  const chooseLang = (l) => { sessionStorage.setItem(LANG_KEY, l); setLang(l); };

  const openMentorship = () => {
    track('journal_pitch_mentorship_click', { variant, lang });
    adsConversion('mentorship_enquiry', { variant, lang }); // no-op until label set
    const msg = encodeURIComponent(expired ? 'Journal renew చేయాలి అనుకుంటున్నాను' : d.waNew);
    window.open(`https://wa.me/${MENTOR_WA}?text=${msg}`, '_blank', 'noopener,noreferrer');
  };
  const openReviews = () => { window.location.href = '/#reviews'; };

  const eyebrow = { fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: C.gold, fontWeight: 700, textAlign: 'center', margin: '0 0 14px' };
  const pill = (on) => ({ padding: '7px 16px', borderRadius: 20, border: `1px solid ${C.line}`, cursor: 'pointer', fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', background: on ? `linear-gradient(135deg,${C.goldHi},${C.goldLo})` : 'transparent', color: on ? '#05050A' : C.dim });

  return (
    <div style={{
      minHeight: '100vh',
      background: `radial-gradient(130% 75% at 30% 0%, ${C.bg1} 0%, ${C.bg0} 60%)`,
      color: C.ink, fontFamily: "'DM Sans','Noto Sans Telugu',sans-serif",
      overflowY: 'auto', WebkitOverflowScrolling: 'touch',
    }}>
      {/* Language toggle */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', padding: '16px 0 4px' }}>
        <button onClick={() => chooseLang('te')} style={pill(lang === 'te')}>తెలుగు</button>
        <button onClick={() => chooseLang('en')} style={pill(lang === 'en')}>English</button>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '18px 18px 42px' }}>
        {/* Title */}
        <h1 style={{ textAlign: 'center', fontSize: 22, fontWeight: 800, letterSpacing: 0.4, margin: '0 0 20px' }}>
          <span style={{ display: 'block', fontSize: 30, marginBottom: 10 }}>🔒</span>
          <span style={{
            background: `linear-gradient(120deg,${C.goldHi},${C.gold} 55%,${C.goldLo})`,
            WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
          }}>Mind Power Vaultt Journal</span>
        </h1>

        {/* Subtitle */}
        <div style={{ textAlign: 'center', margin: '0 0 30px' }}>
          {d.sub.map((l, i) => <p key={i} style={{ margin: '0 0 4px', fontSize: 16, lineHeight: 1.65, color: C.ink, fontWeight: 600 }}>{l}</p>)}
          <p style={{ margin: '6px 0 0', fontSize: 17.5, lineHeight: 1.6, color: C.crimson, fontWeight: 800 }}>{d.subHit}</p>
        </div>

        {/* Reality slap */}
        <p style={eyebrow}>{d.slapEye}</p>
        <div style={{ borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}`, padding: '24px 6px', margin: '0 0 30px', textAlign: 'center' }}>
          {d.q.map((l, i) => <p key={i} style={{ fontSize: 15, lineHeight: 1.9, color: C.ink, margin: '0 0 4px', opacity: 0.92 }}>{l}</p>)}
          <div style={{ fontSize: 52, fontWeight: 900, color: C.crimson, margin: '16px 0 18px', letterSpacing: 1, lineHeight: 1 }}>{d.no}</div>
          {d.build.map((l, i) => <p key={i} style={{ fontSize: 14.5, lineHeight: 1.85, color: C.dim, margin: '0 0 3px' }}>{l}</p>)}
          <p style={{ fontSize: 16, fontWeight: 800, color: C.goldHi, margin: '16px 0 0', lineHeight: 1.6 }}>{d.real}</p>
        </div>

        {/* Value cards */}
        <p style={eyebrow}>{d.valEye}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 30 }}>
          {d.vals.map((v, i) => (
            <div key={i} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: '17px 17px 18px', display: 'flex', gap: 11, boxShadow: '0 6px 18px rgba(0,0,0,0.35)' }}>
              <span style={{ color: C.goldHi, fontSize: 17, fontWeight: 800, flexShrink: 0, lineHeight: 1.5 }}>→</span>
              <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.8, color: C.ink, opacity: 0.92 }}>{v}</p>
            </div>
          ))}
        </div>

        {/* Two roads */}
        <p style={{ textAlign: 'center', fontSize: 16, fontWeight: 800, color: C.ink, lineHeight: 1.6, margin: '6px 6px 16px' }}>{d.roadsHead}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 8 }}>
          <div style={{ borderRadius: 14, padding: '16px', fontSize: 13.5, lineHeight: 1.75, background: 'rgba(219,91,84,0.06)', border: '1px solid rgba(219,91,84,0.28)', color: '#C9A79A' }}>
            <b style={{ fontWeight: 800 }}>{d.road1[0]}</b>{d.road1[1]}
          </div>
          <div style={{ borderRadius: 14, padding: '16px', fontSize: 13.5, lineHeight: 1.75, background: 'rgba(201,168,76,0.08)', border: `1px solid ${C.gold}`, color: C.ink, boxShadow: '0 0 24px rgba(201,168,76,0.12)' }}>
            <b style={{ fontWeight: 800 }}>{d.road2[0]}</b>{d.road2[1]}
          </div>
        </div>
        <p style={{ textAlign: 'center', fontSize: 15.5, fontWeight: 800, color: C.crimson, lineHeight: 1.6, margin: '22px 6px 30px' }}>{d.kicker}</p>

        {/* Social proof — real voice notes + handwritten letters when present */}
        <Reviews lang={lang} compact />

        {/* CTA */}
        <div style={{ textAlign: 'center', marginTop: 26 }}>
          {showPurchase && !expired ? (
            <>
              {/* Price framed by what they get, not a bare number */}
              <div style={{
                background: 'rgba(201,168,76,0.07)', border: `1px solid ${C.gold}`,
                borderRadius: 14, padding: '18px 16px', marginBottom: 16,
                boxShadow: '0 0 26px rgba(201,168,76,0.10)',
              }}>
                <div style={{ fontSize: 30, fontWeight: 900, color: C.ink, lineHeight: 1.1 }}>
                  ₹3,540<span style={{ fontSize: 13, color: C.dim, fontWeight: 600 }}> / సంవత్సరం</span>
                </div>
                <div style={{ fontSize: 11.5, color: C.dim, margin: '4px 0 12px' }}>₹3,000 + 18% GST</div>
                <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {d.incl.map((x, i) => (
                    <div key={i} style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.6, opacity: 0.92 }}>
                      <span style={{ color: C.goldHi, marginRight: 7 }}>✓</span>{x}
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={onBuy} style={{ width: '100%', padding: 18, border: 'none', borderRadius: 11, background: `linear-gradient(135deg,${C.goldHi},${C.goldLo})`, color: '#05050A', fontSize: 16, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10, boxShadow: '0 12px 30px rgba(201,168,76,0.34)' }}>
                {d.buy}
              </button>
              <button onClick={openMentorship} style={{ width: '100%', padding: 14, borderRadius: 11, background: 'transparent', border: `1px solid ${C.line}`, color: C.gold, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                {d.b1}
              </button>
              <p style={{ fontSize: 11.5, letterSpacing: 1, textTransform: 'uppercase', color: C.dim, margin: '14px 0 0' }}>{d.seats}</p>
            </>
          ) : (
            <>
              <p style={{ fontSize: 15, color: C.goldHi, fontWeight: 700, lineHeight: 1.7, margin: '0 0 8px' }}>{expired ? d.expClose : d.ctaLine}</p>
              {!expired && <p style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.7, margin: '0 0 18px' }}>{d.bio}</p>}
              <button onClick={openMentorship} style={{ width: '100%', padding: 17, border: 'none', borderRadius: 11, background: `linear-gradient(135deg,${C.goldHi},${C.goldLo})`, color: '#05050A', fontSize: 15.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10, boxShadow: '0 12px 28px rgba(201,168,76,0.3)' }}>
                {expired ? d.expB1 : d.b1}
              </button>
              <button onClick={openReviews} style={{ width: '100%', padding: 14, borderRadius: 11, background: 'transparent', border: `1px solid ${C.line}`, color: C.gold, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                {d.b2}
              </button>
              {!expired && <p style={{ fontSize: 11.5, letterSpacing: 1, textTransform: 'uppercase', color: C.dim, margin: '14px 0 0' }}>{d.seats}</p>}
            </>
          )}
        </div>

        {onSignIn && (
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <button onClick={onSignIn} style={{ background: 'transparent', border: 'none', color: C.dim, fontSize: 12.5, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}>{d.signin}</button>
          </div>
        )}
      </div>
    </div>
  );
}
