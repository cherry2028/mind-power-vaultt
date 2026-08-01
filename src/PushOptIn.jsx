import React, { useEffect, useState } from 'react';

// Daily reminder opt-in. Strictly opt-in: we NEVER call requestPermission()
// on our own — the student sees a Telugu explainer first and taps Enable.
// Shows once the student is logged into the journal (a real session is required
// to store the subscription against their user id). It is still a two-step,
// explainer-first prompt — not a cold browser permission request — so there is
// no Chrome penalty. MIN_DAYS_USED can be raised later to defer it to more
// invested students; 0 keeps it discoverable (and testable) from day one.
const DISMISS_KEY = 'mpvPushDismissed';
const DONE_KEY = 'mpvPushSubscribed';
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const MIN_DAYS_USED = 0;
const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

function daysSinceFirstUse() {
  try {
    const f = JSON.parse(localStorage.getItem('mpvf') || '{}');
    if (!f._firstDay) return 0;
    const diff = Date.now() - new Date(f._firstDay + 'T00:00:00').getTime();
    return Math.floor(diff / 86400000);
  } catch {
    return 0;
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export default function PushOptIn() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!VAPID_PUBLIC) return;                                   // not configured yet
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'default') return;           // already granted or blocked
    if (localStorage.getItem(DONE_KEY)) return;
    const ts = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (ts && Date.now() - ts < COOLDOWN_MS) return;
    if (daysSinceFirstUse() < MIN_DAYS_USED) return;             // invested students only
    const token = sessionStorage.getItem('mpv_journal_token') || '';
    if (!token || token.startsWith('EMERGENCY_')) return;        // need a real session to store the sub
    setShow(true);
  }, []);

  const enable = async () => {
    setBusy(true);
    setNote('');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
        setShow(false);
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      });
      const token = sessionStorage.getItem('mpv_journal_token') || '';
      const res = await fetch('/api/push-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error('save failed');
      localStorage.setItem(DONE_KEY, '1');
      setNote('✅ Reminders on అయ్యాయి. రేపు ఉదయం కలుద్దాం.');
      setTimeout(() => setShow(false), 3200);
    } catch (err) {
      console.warn('[MPV-PUSH] subscribe failed:', err?.message);
      setNote('❌ Reminders on అవ్వలేదు — తర్వాత try చేయండి.');
    } finally {
      setBusy(false);
    }
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShow(false);
  };

  if (!show) return null;
  return (
    <div style={{
      position: 'fixed', left: 12, right: 12, bottom: 16, zIndex: 9400,
      maxWidth: 460, margin: '0 auto', background: '#0E0E15',
      border: '1px solid rgba(201,168,76,0.5)', borderRadius: 12, padding: 16,
      boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
      fontFamily: "'DM Sans','Noto Sans Telugu',sans-serif", color: '#F5F2EA',
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>🔔 రోజూ 2 reminders పెట్టనా?</div>
      <div style={{ fontSize: 12, color: '#9A8870', lineHeight: 1.85, marginBottom: 6 }}>
        🌅 <b style={{ color: '#C9A84C' }}>ఉదయం 8:45</b> — License earn చేయమని<br />
        🌙 <b style={{ color: '#C9A84C' }}>సాయంత్రం 4:00</b> — Evening Mirror రాయమని
      </div>
      <div style={{ fontSize: 11, color: '#6A5A40', lineHeight: 1.7, marginBottom: 12 }}>
        పని పూర్తి చేసిన రోజు ఆ reminder రాదు. ఎప్పుడైనా off చేసుకోవచ్చు.
      </div>
      {note && <div style={{ fontSize: 12, color: '#4CAF82', marginBottom: 10, lineHeight: 1.6 }}>{note}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={enable} disabled={busy} style={{ flex: 1, padding: 12, background: 'linear-gradient(135deg,#C9A84C,#9A7020)', color: '#05050A', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.7 : 1, fontFamily: 'inherit' }}>
          {busy ? '...' : '🔔 Reminders On చేయి'}
        </button>
        <button onClick={dismiss} disabled={busy} style={{ padding: '12px 16px', background: 'transparent', border: '1px solid rgba(201,168,76,0.25)', color: '#9A8870', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
          వద్దు
        </button>
      </div>
    </div>
  );
}
