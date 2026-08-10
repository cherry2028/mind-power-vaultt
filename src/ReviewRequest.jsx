import React, { useState } from 'react';
import { supabase } from './supabase';
import { track } from './analytics';

// Feature 4: after every 10 journal opens, a logged-in student is asked for a
// review. It writes to review_submissions (a moderation queue) — NOT the public
// reviews table, which is admin-only. Easy to skip, easy to give.
//
// Voice note: the schema reserves audio_url, but recording+upload needs a
// student-writable storage bucket and is a deliberate fast-follow — v1 is stars
// + text, which is the core social proof and fully testable.

const C = {
  bg: '#0C0C11', ink: '#F5F2EA', mid: '#B8B2A4', soft: '#8A8270',
  gold: '#C9A84C', goldHi: '#F0D080', line: 'rgba(201,168,76,0.22)',
};

export default function ReviewRequest({ userId, onClose }) {
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  const skip = () => {
    track('review_request_skipped', { stars });
    onClose();
  };

  const submit = async () => {
    if (!stars) { setErr('ముందు ఒక rating select చేయి ★'); return; }
    if (!userId) { setErr('Session expired — login again.'); return; }
    setSending(true); setErr('');
    try {
      const { error } = await supabase.from('review_submissions').insert([{
        user_id: userId, stars, text: text.trim() || null,
      }]);
      if (error) throw error;
      // Don't nag again once a student has given a review.
      localStorage.setItem('mpvReviewed', '1');
      track('review_request_submitted', { stars });
      setDone(true);
      setTimeout(onClose, 1700);
    } catch (e) {
      setErr(e.message || 'Failed — try again');
      setSending(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Review request"
      style={{
        position: 'fixed', inset: 0, zIndex: 10050, background: 'rgba(5,5,10,0.92)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 0,
        fontFamily: "'DM Sans','Noto Sans Telugu',sans-serif",
      }}
      onClick={skip}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 460, background: C.bg,
          borderTop: `1px solid ${C.line}`, borderRadius: '18px 18px 0 0',
          padding: '22px 20px calc(22px + env(safe-area-inset-bottom))',
          boxShadow: '0 -14px 40px rgba(0,0,0,0.6)',
        }}
      >
        {done ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🙏</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.goldHi }}>Thank you! నీ review వచ్చింది.</div>
            <div style={{ fontSize: 12, color: C.soft, marginTop: 6 }}>Cherry review చేసి publish చేస్తారు.</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 30, textAlign: 'center', marginBottom: 4 }}>🌟</div>
            <h3 style={{ textAlign: 'center', fontSize: 17, fontWeight: 800, color: C.ink, margin: '0 0 4px' }}>
              Journal నీకు ఎలా అనిపిస్తోంది?
            </h3>
            <p style={{ textAlign: 'center', fontSize: 12.5, color: C.soft, margin: '0 0 16px', lineHeight: 1.7 }}>
              నీ మాటలు ఇంకో trader ని help చేస్తాయి. 10 seconds — అంతే.
            </p>

            {/* Stars */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 16 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => { setStars(n); setErr(''); }}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  aria-label={`${n} star${n > 1 ? 's' : ''}`}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                    fontSize: 34, lineHeight: 1,
                    color: (hover || stars) >= n ? C.gold : 'rgba(201,168,76,0.25)',
                    transition: 'color 0.12s, transform 0.12s',
                    transform: (hover || stars) >= n ? 'scale(1.05)' : 'none',
                  }}
                >★</button>
              ))}
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={600}
              placeholder="ఏం మారింది? (optional) — ఉదా: revenge trading ఆగింది, discipline వచ్చింది..."
              rows={3}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '12px 13px',
                background: '#12121A', border: `1px solid ${C.line}`, borderRadius: 10,
                color: C.ink, fontSize: 13.5, fontFamily: 'inherit', resize: 'vertical', marginBottom: 6,
              }}
            />

            {err && <div style={{ color: '#E0857F', fontSize: 12, textAlign: 'center', marginBottom: 8 }}>{err}</div>}

            <button
              onClick={submit}
              disabled={sending}
              style={{
                width: '100%', padding: 15, border: 'none', borderRadius: 11,
                background: sending ? '#5A4E28' : `linear-gradient(135deg,${C.goldHi},${C.gold})`,
                color: '#05050A', fontSize: 15, fontWeight: 800, cursor: sending ? 'default' : 'pointer',
                fontFamily: 'inherit', marginTop: 6,
              }}
            >{sending ? 'పంపుతోంది…' : 'Review పంపు →'}</button>

            <button
              onClick={skip}
              style={{
                width: '100%', padding: 11, marginTop: 8, background: 'transparent',
                border: 'none', color: C.soft, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >తర్వాత</button>
          </>
        )}
      </div>
    </div>
  );
}
