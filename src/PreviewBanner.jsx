import React, { useEffect } from 'react';
import { SHOW_PREVIEW_BANNER, PREVIEW_BANNER_HEIGHT, TARGET } from './utils/deployTarget';

// Impossible-to-miss marker on every page served from anywhere other than
// mindpowervaultt.com — portal included. Fixed, full width, red, above every
// overlay, and deliberately not dismissible: a preview URL that looks like the
// real site is exactly the mistake this exists to prevent.
//
// pointer-events:none so it never blocks a tap on what sits beneath it; the
// body is padded so normal page content starts below it.
export default function PreviewBanner() {
  useEffect(() => {
    if (!SHOW_PREVIEW_BANNER) return undefined;
    document.body.style.paddingTop = `${PREVIEW_BANNER_HEIGHT}px`;
    // The tab title too — the banner is invisible from the tab strip.
    const tag = () => {
      if (!document.title.startsWith('[PREVIEW]')) document.title = `[PREVIEW] ${document.title}`;
    };
    tag();
    const t = setInterval(tag, 1000);
    return () => clearInterval(t);
  }, []);

  if (!SHOW_PREVIEW_BANNER) return null;

  return (
    <div
      role="alert"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: PREVIEW_BANNER_HEIGHT,
        zIndex: 2147483647, pointerEvents: 'none',
        background: '#D10000', color: '#FFFFFF', borderBottom: '3px solid #FFFFFF',
        boxShadow: '0 4px 18px rgba(209,0,0,0.55)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'DM Sans','Noto Sans Telugu',sans-serif", textAlign: 'center', lineHeight: 1.2,
      }}
    >
      <div style={{ fontSize: 21, fontWeight: 900, letterSpacing: 2 }}>⚠ PREVIEW — TEST DATA ⚠</div>
      <div style={{ fontSize: 11, fontWeight: 700, marginTop: 3 }}>
        ఇది students వాడే site కాదు · {TARGET.hostname || 'unknown host'} · DB: {TARGET.db}
      </div>
    </div>
  );
}
