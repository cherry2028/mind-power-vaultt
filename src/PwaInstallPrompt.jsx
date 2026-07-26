import React, { useEffect, useState } from 'react';

// Install banner for students who are already invested — never a first-time
// visitor. Gates: not already installed, at least one completed Morning Ritual,
// and not dismissed within the last 7 days.
const DISMISS_KEY = 'mpvInstallDismissed';
const IOS_HINT_KEY = 'mpvIosHintShown';
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

function isStandalone() {
  return (
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    window.navigator.standalone === true
  );
}

function isIosSafari() {
  const ua = window.navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua);
  // Chrome/Firefox on iOS can't add to home screen from a prompt either, but
  // only Safari shows the Share → Add to Home Screen flow we describe.
  const safari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return ios && safari;
}

function hasCompletedRitual() {
  try {
    const pm = JSON.parse(localStorage.getItem('mpvpm') || '[]');
    return Array.isArray(pm) && pm.length > 0;
  } catch {
    return false;
  }
}

function dismissedRecently(key) {
  const ts = Number(localStorage.getItem(key) || 0);
  return ts > 0 && Date.now() - ts < COOLDOWN_MS;
}

export default function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [mode, setMode] = useState(null); // 'android' | 'ios' | null

  useEffect(() => {
    if (isStandalone()) return; // already installed — nothing to sell

    const onBip = (e) => {
      e.preventDefault(); // suppress Chrome's own mini-infobar; we choose the moment
      setDeferred(e);
    };
    window.addEventListener('beforeinstallprompt', onBip);

    // iOS Safari never fires beforeinstallprompt — show a one-time manual hint.
    if (isIosSafari() && !localStorage.getItem(IOS_HINT_KEY) && hasCompletedRitual()) {
      setMode('ios');
    }
    return () => window.removeEventListener('beforeinstallprompt', onBip);
  }, []);

  // Re-evaluate the gate whenever the journal saves (ritual may have just
  // completed) — MPV_DB_DIRTY already fires on every write.
  useEffect(() => {
    if (!deferred) return;
    const evaluate = () => {
      if (!isStandalone() && hasCompletedRitual() && !dismissedRecently(DISMISS_KEY)) setMode('android');
    };
    evaluate();
    const onMsg = (e) => { if (e.data && e.data.type === 'MPV_DB_DIRTY') evaluate(); };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [deferred]);

  const install = async () => {
    if (!deferred) return;
    setMode(null);
    try {
      deferred.prompt();
      await deferred.userChoice; // installed or dismissed — either way, done asking
    } catch { /* prompt already consumed */ }
    setDeferred(null);
  };

  const dismiss = () => {
    localStorage.setItem(mode === 'ios' ? IOS_HINT_KEY : DISMISS_KEY, String(Date.now()));
    setMode(null);
  };

  if (!mode) return null;

  const wrap = {
    position: 'fixed', left: 12, right: 12, bottom: 16, zIndex: 9500,
    maxWidth: 460, margin: '0 auto', background: '#0E0E15',
    border: '1px solid rgba(201,168,76,0.5)', borderRadius: 12, padding: '14px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
    fontFamily: "'DM Sans','Noto Sans Telugu',sans-serif", color: '#F5F2EA',
  };

  if (mode === 'ios') {
    return (
      <div style={wrap}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <img src="/icons/icon-192.png" alt="" width={38} height={38} style={{ borderRadius: 9, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>MPV ni phone lo install చేయి</div>
            <div style={{ fontSize: 12, color: '#9A8870', lineHeight: 1.7 }}>
              Safari లో <b style={{ color: '#C9A84C' }}>Share ⬆</b> → <b style={{ color: '#C9A84C' }}>Add to Home Screen</b> — app లా open అవుతుంది.
            </div>
          </div>
          <button onClick={dismiss} aria-label="Dismiss" style={{ background: 'transparent', border: 'none', color: '#6A5A40', fontSize: 16, cursor: 'pointer', padding: '2px 4px' }}>✕</button>
        </div>
      </div>
    );
  }

  return (
    <div style={wrap}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <img src="/icons/icon-192.png" alt="" width={40} height={40} style={{ borderRadius: 9, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 2 }}>MPV ni phone lo install చేయి</div>
          <div style={{ fontSize: 11.5, color: '#9A8870', lineHeight: 1.5 }}>app లా open అవుతుంది — offline కూడా పనిచేస్తుంది.</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={install} style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg,#C9A84C,#9A7020)', color: '#05050A', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          ⬇ Install
        </button>
        <button onClick={dismiss} style={{ padding: '12px 16px', background: 'transparent', border: '1px solid rgba(201,168,76,0.25)', color: '#9A8870', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
          తర్వాత
        </button>
      </div>
    </div>
  );
}
