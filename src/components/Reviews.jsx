import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';

// Student reviews — the trust layer on the journal pages.
//
// Reads the SAME `reviews` table the landing page uses, so Cherry's real
// assets (voice notes + scanned handwritten letters) appear here automatically
// with nothing to re-upload. When the table is empty or unreachable it falls
// back to example cards, so the layout is always visible and reviewable.
//
// A row supports: stars · te/en text · name · city · type:'audio' + audio_url
// (renders a real player) · image_url (comma-separated → scanned letters).

const G = {
  gold: '#C9A84C', goldHi: '#F0D080', goldDim: 'rgba(201,168,76,0.18)',
  smoke: '#F5F2EA', mid: '#B8B2A4', soft: '#8A8270', dark2: '#0E1526',
};

// Shown only when there are no real reviews yet — demonstrates every slot.
const PLACEHOLDERS = [
  { stars: 5, name: 'Ajay', city: 'Palakollu', _ph: true,
    te: 'Journal మొదలుపెట్టాక నా revenge trading ఆగింది. రోజూ license earn చేయడం అలవాటైంది.',
    en: 'After starting the journal my revenge trading stopped. Earning the daily license became a habit.',
    _hasAudio: true, _hasImage: true },
  { stars: 5, name: 'Ravi', city: 'Hyderabad', _ph: true,
    te: 'నా mistakes ఖరీదు number లో చూశాక — impulse trades సగానికి తగ్గాయి.',
    en: 'Seeing the cost of my mistakes as a number cut my impulse trades in half.',
    _hasAudio: true },
  { stars: 5, name: 'Suresh', city: 'Vijayawada', _ph: true,
    te: 'Evening mirror ప్రతి రోజు నన్ను నిలదీస్తుంది. అదే నన్ను మార్చింది.',
    en: 'The evening mirror confronts me every day. That is what changed me.',
    _hasImage: true },
];

// featuredOnly: show ONLY the reviews flagged "featured" in the admin panel.
// Default is featured-FIRST, which never hides a student's testimonial.
export default function Reviews({ lang = 'te', title, compact = false, featuredOnly = false }) {
  const [rows, setRows] = useState(null); // null = loading
  const [zoom, setZoom] = useState(null); // handwritten letter opened full-screen

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await supabase.from('reviews').select('*').order('order_index', { ascending: true });
        if (alive) setRows(Array.isArray(data) && data.length ? data : PLACEHOLDERS);
      } catch {
        if (alive) setRows(PLACEHOLDERS); // never leave the section blank
      }
    })();
    return () => { alive = false; };
  }, []);

  if (!rows) return null;

  // Featured reviews (admin toggle) lead — they are the strongest proof, so a
  // skeptical visitor meets them first. Order within each group still follows
  // the drag-order from the admin panel.
  const featured = rows.filter((r) => r.featured);
  let list = featuredOnly && featured.length
    ? featured
    : [...featured, ...rows.filter((r) => !r.featured)];
  if (compact) list = list.slice(0, Math.max(3, featured.length));

  const heading = title || (lang === 'en' ? 'What Our Students Say' : 'మా Students ఏం అంటున్నారు');

  return (
    <div style={{ margin: '34px 0 8px' }}>
      <h2 style={{
        fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: G.gold,
        fontWeight: 700, textAlign: 'center', margin: '0 0 16px',
      }}>{heading}</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {list.map((r, i) => {
          const txt = (r[lang] || r.te || r.en || '').trim();
          // Some rows carry a "name from city" label in the text column; that
          // reads like a placeholder, so suppress it (same guard as the
          // landing page). The voice note and letter still render.
          const norm = (x) => (x || '').toLowerCase().replace(/[^a-zఀ-౿]+/g, '');
          const isJustNameCity = txt && (
            norm(txt) === norm(r.name) ||
            norm(txt) === norm(`${r.name}${r.city}`) ||
            norm(txt) === norm(`${r.name}from${r.city}`)
          );
          const images = typeof r.image_url === 'string' && r.image_url
            ? r.image_url.split(',').map((u) => u.trim()).filter(Boolean)
            : [];

          const isFeatured = !!r.featured;
          const hasLetter = images.length > 0;

          return (
            <div key={i} style={{
              background: G.dark2,
              // A featured card — especially one carrying a scanned letter —
              // gets a gold edge and glow so it reads as the most credible
              // thing on the page, not just another card in the stack.
              border: `1px solid ${isFeatured ? G.gold : G.goldDim}`,
              borderRadius: 14,
              padding: isFeatured ? '20px 18px' : '18px 17px',
              boxShadow: isFeatured ? '0 0 26px rgba(201,168,76,0.13)' : 'none',
            }}>
              {isFeatured && (
                <div style={{
                  display: 'inline-block', fontSize: 9.5, letterSpacing: 1.5,
                  textTransform: 'uppercase', color: '#05050A', fontWeight: 800,
                  background: `linear-gradient(135deg,${G.goldHi},${G.gold})`,
                  padding: '3px 10px', borderRadius: 20, marginBottom: 11,
                }}>{hasLetter ? '✍️ Handwritten Letter' : '★ Featured'}</div>
              )}
              <div style={{ color: G.gold, fontSize: 15, marginBottom: 10, letterSpacing: 2 }}>
                {'★'.repeat(Number(r.stars) || 5)}
              </div>

              {txt && !isJustNameCity && (
                <p style={{
                  fontSize: 13.5, color: G.mid, lineHeight: 1.85,
                  fontStyle: 'italic', margin: '0 0 14px',
                }}>“{txt}”</p>
              )}

              {/* Voice-note review */}
              {r.audio_url ? (
                <audio controls src={r.audio_url} style={{ width: '100%', height: 36, marginBottom: 14, borderRadius: 6 }} />
              ) : r._hasAudio ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14, padding: '10px 12px',
                  border: `1px dashed ${G.goldDim}`, borderRadius: 8, color: G.soft, fontSize: 11.5,
                }}>🎙 <span>Voice note slot — audio_url</span></div>
              ) : null}

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', background: 'rgba(201,168,76,0.14)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, color: G.gold, fontWeight: 700, flexShrink: 0,
                }}>{(r.name || '?')[0]}</div>
                <div>
                  <div style={{ fontSize: 12.5, color: G.smoke, fontWeight: 600 }}>{r.name}</div>
                  <div style={{ fontSize: 10.5, color: G.soft, letterSpacing: 1 }}>{r.city}</div>
                </div>
              </div>

              {/* Scanned handwritten letters — the strongest trust proof, so
                  they get a gold frame, a caption and tap-to-enlarge (the
                  handwriting is unreadable at card width otherwise). */}
              {images.map((url, idx) => (
                <button
                  key={idx}
                  onClick={() => setZoom(url)}
                  title="Tap to enlarge"
                  style={{
                    display: 'block', width: '100%', marginTop: 14, padding: 0,
                    borderRadius: 10, overflow: 'hidden', cursor: 'zoom-in',
                    border: `1px solid ${isFeatured ? G.gold : G.goldDim}`,
                    background: 'transparent', position: 'relative',
                  }}
                >
                  <img src={url} alt={`Handwritten letter from ${r.name}`} loading="lazy" style={{ width: '100%', display: 'block' }} />
                  <span style={{
                    position: 'absolute', right: 8, bottom: 8, fontSize: 10,
                    background: 'rgba(5,5,10,0.78)', color: G.goldHi,
                    padding: '4px 9px', borderRadius: 20, letterSpacing: 0.5,
                  }}>🔍 పెద్దది చూడు</span>
                </button>
              ))}
              {!images.length && r._hasImage && (
                <div style={{
                  marginTop: 14, padding: '22px 12px', textAlign: 'center',
                  border: `1px dashed ${G.goldDim}`, borderRadius: 8, color: G.soft, fontSize: 11.5,
                }}>✍️ Handwritten letter slot — image_url</div>
              )}
            </div>
          );
        })}
      </div>

      {list.some((r) => r._ph) && (
        <p style={{ fontSize: 10.5, color: G.soft, textAlign: 'center', marginTop: 12, lineHeight: 1.6 }}>
          Example layout — real reviews appear automatically once rows exist.
        </p>
      )}

      {/* Full-screen letter view. Tapping anywhere closes it. */}
      {zoom && (
        <div
          onClick={() => setZoom(null)}
          role="dialog"
          aria-label="Handwritten letter"
          style={{
            position: 'fixed', inset: 0, zIndex: 9800, cursor: 'zoom-out',
            background: 'rgba(5,5,10,0.94)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: 16,
            overflowY: 'auto',
          }}
        >
          <img src={zoom} alt="Handwritten letter" style={{ maxWidth: '100%', maxHeight: '92vh', borderRadius: 10, border: `1px solid ${G.gold}` }} />
          <button
            onClick={(e) => { e.stopPropagation(); setZoom(null); }}
            aria-label="Close"
            style={{
              position: 'fixed', top: 14, right: 16, width: 40, height: 40,
              borderRadius: '50%', border: `1px solid ${G.goldDim}`,
              background: 'rgba(14,21,38,0.9)', color: G.goldHi,
              fontSize: 18, cursor: 'pointer', lineHeight: 1,
            }}
          >✕</button>
        </div>
      )}
    </div>
  );
}
