import React, { useState, useRef, useEffect } from 'react';
import { supabase } from './supabase';
import { track } from './analytics';

// Feature 4: after every 10 journal opens, a logged-in student is asked for a
// review. It writes to review_submissions (a moderation queue) — NOT the public
// reviews table, which is admin-only. Easy to skip, easy to give.
//
// A voice note is optional: recorded in-browser and uploaded to review_uploads
// (a student-writable bucket, RLS-scoped to their own uid folder). Everything
// degrades to stars + text if the mic is denied, unsupported, or the upload
// hiccups — a review is never lost over audio.

const C = {
  bg: '#0C0C11', ink: '#F5F2EA', mid: '#B8B2A4', soft: '#8A8270',
  gold: '#C9A84C', goldHi: '#F0D080', line: 'rgba(201,168,76,0.22)', red: '#CF6679',
};

const REC_CAP_SECS = 60;      // hard cap so a stray recording can't balloon
const MAX_AUDIO_BYTES = 6 * 1024 * 1024;

const RECORD_MIMES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
export function pickMime() {
  if (typeof window === 'undefined' || !window.MediaRecorder) return '';
  for (const m of RECORD_MIMES) { try { if (MediaRecorder.isTypeSupported(m)) return m; } catch { /* ignore */ } }
  return '';
}
export function extForMime(type) {
  const t = String(type || '');
  if (t.includes('mp4')) return 'mp4';
  if (t.includes('ogg')) return 'ogg';
  return 'webm';
}
const recSupported = typeof window !== 'undefined'
  && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  && typeof window.MediaRecorder !== 'undefined';

export default function ReviewRequest({ userId, onClose }) {
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [recNote, setRecNote] = useState('');

  const mrRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  const stopStream = () => {
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch { /* ignore */ }
    streamRef.current = null;
  };

  // Clean up mic + object URL if the sheet closes mid-recording.
  useEffect(() => () => {
    clearInterval(timerRef.current);
    try { if (mrRef.current && mrRef.current.state !== 'inactive') mrRef.current.stop(); } catch { /* ignore */ }
    stopStream();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  const stopRec = () => {
    clearInterval(timerRef.current);
    try { if (mrRef.current && mrRef.current.state !== 'inactive') mrRef.current.stop(); } catch { /* ignore */ }
    setRecording(false);
  };

  const startRec = async () => {
    setRecNote('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMime();
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime || 'audio/webm' });
        stopStream();
        if (blob.size > MAX_AUDIO_BYTES) { setRecNote('Recording చాలా పెద్దది — మళ్ళీ try చేయి.'); return; }
        setAudioBlob(blob);
        setAudioUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(blob); });
      };
      mrRef.current = mr;
      mr.start();
      setRecording(true);
      setRecSecs(0);
      timerRef.current = setInterval(() => setRecSecs((s) => {
        if (s + 1 >= REC_CAP_SECS) stopRec();
        return s + 1;
      }), 1000);
    } catch {
      setRecNote('Mic access రాలేదు — text తో submit చేయొచ్చు.');
    }
  };

  const clearAudio = () => {
    setAudioBlob(null);
    setAudioUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return ''; });
    setRecSecs(0); setRecNote('');
  };

  const skip = () => { track('review_request_skipped', { stars }); onClose(); };

  const submit = async () => {
    if (!stars) { setErr('ముందు ఒక rating select చేయి ★'); return; }
    if (!userId) { setErr('Session expired — login again.'); return; }
    setSending(true); setErr('');

    // Upload the voice note first, if any. A failure here must NOT lose the
    // review — fall through to a text-only submission.
    let audio_url = null;
    if (audioBlob) {
      try {
        const path = `${userId}/${Date.now()}.${extForMime(audioBlob.type)}`;
        const { error: upErr } = await supabase.storage
          .from('review_uploads').upload(path, audioBlob, { contentType: audioBlob.type, upsert: false });
        if (upErr) throw upErr;
        audio_url = supabase.storage.from('review_uploads').getPublicUrl(path).data.publicUrl;
      } catch {
        audio_url = null; // degrade to text-only
      }
    }

    try {
      const { error } = await supabase.from('review_submissions').insert([{
        user_id: userId, stars, text: text.trim() || null, audio_url,
      }]);
      if (error) throw error;
      localStorage.setItem('mpvReviewed', '1');
      track('review_request_submitted', { stars, has_audio: !!audio_url });
      setDone(true);
      setTimeout(onClose, 1700);
    } catch (e) {
      setErr(e.message || 'Failed — try again');
      setSending(false);
    }
  };

  const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div
      role="dialog" aria-label="Review request"
      style={{
        position: 'fixed', inset: 0, zIndex: 10050, background: 'rgba(5,5,10,0.92)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
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

            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 16 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => { setStars(n); setErr(''); }}
                  onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
                  aria-label={`${n} star${n > 1 ? 's' : ''}`}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 4, fontSize: 34, lineHeight: 1,
                    color: (hover || stars) >= n ? C.gold : 'rgba(201,168,76,0.25)',
                    transition: 'color 0.12s, transform 0.12s',
                    transform: (hover || stars) >= n ? 'scale(1.05)' : 'none',
                  }}
                >★</button>
              ))}
            </div>

            <textarea
              value={text} onChange={(e) => setText(e.target.value)} maxLength={600} rows={3}
              placeholder="ఏం మారింది? (optional) — ఉదా: revenge trading ఆగింది, discipline వచ్చింది..."
              style={{
                width: '100%', boxSizing: 'border-box', padding: '12px 13px',
                background: '#12121A', border: `1px solid ${C.line}`, borderRadius: 10,
                color: C.ink, fontSize: 13.5, fontFamily: 'inherit', resize: 'vertical', marginBottom: 10,
              }}
            />

            {/* Optional voice note */}
            {recSupported && (
              <div style={{ marginBottom: 12 }}>
                {!audioUrl && !recording && (
                  <button onClick={startRec} style={voiceBtn(false)}>🎙 Voice note record చేయి (optional)</button>
                )}
                {recording && (
                  <button onClick={stopRec} style={voiceBtn(true)}>
                    <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: '#fff', marginRight: 8, animation: 'none' }} />
                    ⏺ Recording… {mmss(recSecs)} — ఆపడానికి tap
                  </button>
                )}
                {audioUrl && !recording && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <audio controls src={audioUrl} style={{ flex: 1, height: 38 }} />
                    <button onClick={clearAudio} aria-label="Remove recording"
                      style={{ background: 'none', border: `1px solid ${C.line}`, color: C.soft, borderRadius: 8, padding: '8px 10px', cursor: 'pointer', fontSize: 12 }}>✕</button>
                  </div>
                )}
                {recNote && <div style={{ color: C.soft, fontSize: 11.5, marginTop: 6 }}>{recNote}</div>}
              </div>
            )}

            {err && <div style={{ color: '#E0857F', fontSize: 12, textAlign: 'center', marginBottom: 8 }}>{err}</div>}

            <button onClick={submit} disabled={sending || recording}
              style={{
                width: '100%', padding: 15, border: 'none', borderRadius: 11,
                background: (sending || recording) ? '#5A4E28' : `linear-gradient(135deg,${C.goldHi},${C.gold})`,
                color: '#05050A', fontSize: 15, fontWeight: 800,
                cursor: (sending || recording) ? 'default' : 'pointer', fontFamily: 'inherit', marginTop: 4,
              }}
            >{sending ? 'పంపుతోంది…' : 'Review పంపు →'}</button>

            <button onClick={skip}
              style={{ width: '100%', padding: 11, marginTop: 8, background: 'transparent', border: 'none', color: C.soft, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}
            >తర్వాత</button>
          </>
        )}
      </div>
    </div>
  );

  function voiceBtn(active) {
    return {
      width: '100%', padding: 12, borderRadius: 10, fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
      cursor: 'pointer', border: `1px solid ${active ? C.red : C.line}`,
      background: active ? 'rgba(207,102,121,0.12)' : '#12121A',
      color: active ? C.red : C.gold,
    };
  }
}
