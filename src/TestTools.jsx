import React, { useEffect, useState } from 'react';
import { TARGET } from './utils/deployTarget';
import { OWNER_KEY, readOwner, maskEmail, isBlankDevice } from './utils/accountBinding';

// PREVIEW-ONLY test tools for the Step B phone test. Mounted only when the
// build flag is on (never in a Vercel production build) AND the page is on a
// non-production host AND the bundle talks to the staging database — see
// deployTarget.js. They let a phone reproduce the states that otherwise need
// devtools: a device from before binding existed, and a contaminated device.
//
// They write localStorage directly and never touch the cloud.

const FOREIGN_INST = 'TEST-FOREIGN';
const FOREIGN_ID = 1600000000000; // 2020-09-13 — older than any sync stamp on a test phone
const TRAIL_KEY = 'mpvTestBindingTrail';

function readArr(key) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function readTrail() {
  try {
    const v = JSON.parse(sessionStorage.getItem(TRAIL_KEY));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

// Records every journal_binding result the app reports — the exact values GA
// receives — so a tester can SEE which code path ran instead of inferring it.
// Wraps window.gtag once; sessionStorage keeps the trail across reloads in this tab.
function installTrailRecorder() {
  if (window.__mpvTrailRecorder) return;
  window.__mpvTrailRecorder = true;
  const original = window.gtag;
  window.gtag = function gtagWithTrail(...args) {
    try {
      if (args[0] === 'event' && args[1] === 'journal_binding') {
        const trail = readTrail();
        trail.push(`${new Date().toLocaleTimeString('en-GB')} ${window.location.pathname} → ${args[2] && args[2].result}`);
        sessionStorage.setItem(TRAIL_KEY, JSON.stringify(trail.slice(-10)));
      }
    } catch { /* test aid only — never break analytics */ }
    return typeof original === 'function' ? original.apply(this, args) : undefined;
  };
}

// Both test accounts mask to s***@gmail.com — show the +tag so a tester can
// tell which account the phone is bound to.
function ownerLabel(email) {
  const tag = /\+([^@]+)@/.exec(email || '');
  return tag ? `${maskEmail(email)} (+${tag[1]})` : maskEmail(email);
}

// A LIVE reading: re-taken every half second while the panel is open, so it can
// never show a state from an earlier page (the panel survives in-app
// navigation from /portal to /journal).
function makeView() {
  const owner = readOwner();
  const trades = readArr('mpvtr');
  return {
    at: new Date().toLocaleTimeString('en-GB'),
    rows: [
      ['page', window.location.pathname],
      ['host', TARGET.hostname],
      ['database', TARGET.db],
      ['binding (mpvOwner)', owner ? ownerLabel(owner.email) : '— లేదు'],
      ['unsynced (mpvSyncDirty)', localStorage.getItem('mpvSyncDirty') === '1' ? 'YES' : 'no'],
      ['last sync stamp', localStorage.getItem('mpvCloudUpdatedAt') || '—'],
      ['trades', String(trades.length)],
      ['TEST-FOREIGN trades', String(trades.filter((t) => t?.inst === FOREIGN_INST).length)],
      ['EOD reviews', String(readArr('mpveod').length)],
      ['PIN set', localStorage.getItem('mpvPin') ? 'yes' : 'no'],
      ['blank device', isBlankDevice() ? 'yes' : 'no'],
    ],
    trail: readTrail(),
  };
}

const ACTIONS = [
  {
    label: '① Binding తీసేయి (update కి ముందు phone లా)',
    confirm: 'mpvOwner తీసేసి page reload చేస్తాం. Journal data ఏమీ మారదు.',
    run: () => localStorage.removeItem(OWNER_KEY),
  },
  {
    label: '② వేరే account పాత trade కలుపు + binding తీసేయి',
    confirm: '2020 date తో ఒక TEST-FOREIGN trade ఈ phone లో కలుపుతాం, binding తీసేస్తాం, reload. Cloud కి ఏమీ వెళ్ళదు.',
    run: () => {
      const trades = readArr('mpvtr');
      if (!trades.some((t) => t?.id === FOREIGN_ID)) {
        trades.push({ id: FOREIGN_ID, date: '2020-09-13', inst: FOREIGN_INST, setup: '', pnl: 0, emo: '', pln: true, mist: [], voice: '', status: 'closed', rv: '2' });
        localStorage.setItem('mpvtr', JSON.stringify(trades));
      }
      localStorage.removeItem(OWNER_KEY);
    },
  },
  {
    label: '③ TEST-FOREIGN trade తీసేయి',
    confirm: 'TEST-FOREIGN trade ఒక్కటే ఈ phone నుండి తీసేస్తాం, reload. Binding మారదు.',
    run: () => {
      localStorage.setItem('mpvtr', JSON.stringify(readArr('mpvtr').filter((t) => t?.inst !== FOREIGN_INST)));
    },
  },
  {
    label: '④ Unsynced మార్పు ఉన్నట్టు mark చేయి',
    confirm: 'mpvSyncDirty = 1 పెడతాం, reload. (Account switch refusal test కోసం.)',
    run: () => localStorage.setItem('mpvSyncDirty', '1'),
  },
  {
    label: '⑤ Decision trail clear చేయి',
    run: () => sessionStorage.removeItem(TRAIL_KEY),
    noReload: true,
  },
];

export default function TestTools() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(null);

  useEffect(() => { installTrailRecorder(); }, []);

  useEffect(() => {
    if (!open) return undefined;
    const t = setInterval(() => setView(makeView()), 500);
    return () => clearInterval(t);
  }, [open]);

  const toggle = () => {
    if (!open) setView(makeView());
    setOpen(!open);
  };

  const runAction = (a) => {
    if (a.confirm && !window.confirm(a.confirm)) return;
    a.run();
    if (a.noReload) setView(makeView());
    else window.location.reload();
  };

  return (
    <div style={{ position:'fixed', top:64, right:8, zIndex:2147483646, fontFamily:"'DM Sans','Noto Sans Telugu',sans-serif" }}>
      <button type="button" onClick={toggle} style={{ padding:'6px 10px', background:'#D10000', color:'#fff', border:'2px solid #fff', borderRadius:16, fontSize:12, fontWeight:800, cursor:'pointer' }}>
        {open ? '✕ TEST' : '🧪 TEST'}
      </button>
      {open && view && (
        <div style={{ marginTop:6, width:300, maxHeight:'75vh', overflowY:'auto', background:'#140000', border:'2px solid #D10000', borderRadius:10, padding:12, color:'#fff' }}>
          <div style={{ fontSize:12, fontWeight:800, color:'#FF6B6B', marginBottom:4 }}>🧪 PREVIEW TEST TOOLS — test accounts only</div>
          <div style={{ fontSize:10, color:'#BBB', marginBottom:8 }}>LIVE · read at {view.at}</div>
          <table style={{ width:'100%', fontSize:11, borderCollapse:'collapse', marginBottom:10 }}>
            <tbody>
              {view.rows.map(([k, v]) => (
                <tr key={k}>
                  <td style={{ color:'#BBB', padding:'2px 4px 2px 0', verticalAlign:'top' }}>{k}</td>
                  <td style={{ fontWeight:700, padding:'2px 0', wordBreak:'break-all' }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize:11, fontWeight:800, color:'#FF6B6B', margin:'4px 0' }}>Decision trail (this tab)</div>
          <div style={{ fontSize:10.5, fontFamily:'monospace', background:'#000', borderRadius:4, padding:6, marginBottom:10, minHeight:18 }}>
            {view.trail.length ? view.trail.map((line, i) => <div key={i}>{line}</div>) : <span style={{ color:'#888' }}>— ఇంకా ఏమీ లేదు</span>}
          </div>
          {ACTIONS.map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={() => runAction(a)}
              style={{ display:'block', width:'100%', textAlign:'left', padding:'9px 10px', marginBottom:6, background:'#2A0808', color:'#fff', border:'1px solid #D10000', borderRadius:6, fontSize:12, cursor:'pointer' }}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
