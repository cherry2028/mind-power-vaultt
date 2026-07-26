import React, { useEffect, useState } from 'react';
import { onNeedRefresh, refreshNow } from './pwa';

// App-wide "a new version is available" toast. Dismissible — the update simply
// applies on the next natural reload if ignored.
export default function PwaUpdateToast() {
  const [show, setShow] = useState(false);

  useEffect(() => onNeedRefresh(setShow), []);

  if (!show) return null;
  return (
    <div style={{
      position: 'fixed', left: 12, right: 12, bottom: 16, zIndex: 9600,
      display: 'flex', alignItems: 'center', gap: 12, maxWidth: 460, margin: '0 auto',
      background: '#0E0E15', border: '1px solid rgba(201,168,76,0.5)', borderRadius: 12,
      padding: '13px 14px', boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
      fontFamily: "'DM Sans','Noto Sans Telugu',sans-serif", color: '#F5F2EA',
    }}>
      <span style={{ fontSize: 20, flexShrink: 0 }}>✨</span>
      <span style={{ fontSize: 13, lineHeight: 1.6, flex: 1 }}>కొత్త version వచ్చింది — refresh చేయి</span>
      <button
        onClick={refreshNow}
        style={{ flexShrink: 0, padding: '10px 16px', background: 'linear-gradient(135deg,#C9A84C,#9A7020)', color: '#05050A', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
      >
        Refresh
      </button>
      <button
        onClick={() => setShow(false)}
        aria-label="Dismiss"
        style={{ flexShrink: 0, background: 'transparent', border: 'none', color: '#6A5A40', fontSize: 16, cursor: 'pointer', padding: '4px 6px' }}
      >
        ✕
      </button>
    </div>
  );
}
