import React, { useState } from 'react';
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

function readArr(key) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

// Both test accounts mask to s***@gmail.com — show the +tag so a tester can
// tell which account the phone is bound to.
function ownerLabel(email) {
  const tag = /\+([^@]+)@/.exec(email || '');
  return tag ? `${maskEmail(email)} (+${tag[1]})` : maskEmail(email);
}

function snapshot() {
  const owner = readOwner();
  const trades = readArr('mpvtr');
  return [
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
  ];
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
];

export default function TestTools() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);

  const toggle = () => {
    if (!open) setRows(snapshot());
    setOpen(!open);
  };

  return (
    <div style={{ position:'fixed', top:64, right:8, zIndex:2147483646, fontFamily:"'DM Sans','Noto Sans Telugu',sans-serif" }}>
      <button type="button" onClick={toggle} style={{ padding:'6px 10px', background:'#D10000', color:'#fff', border:'2px solid #fff', borderRadius:16, fontSize:12, fontWeight:800, cursor:'pointer' }}>
        {open ? '✕ TEST' : '🧪 TEST'}
      </button>
      {open && (
        <div style={{ marginTop:6, width:290, maxHeight:'70vh', overflowY:'auto', background:'#140000', border:'2px solid #D10000', borderRadius:10, padding:12, color:'#fff' }}>
          <div style={{ fontSize:12, fontWeight:800, color:'#FF6B6B', marginBottom:8 }}>🧪 PREVIEW TEST TOOLS — test accounts only</div>
          <table style={{ width:'100%', fontSize:11, borderCollapse:'collapse', marginBottom:10 }}>
            <tbody>
              {rows.map(([k, v]) => (
                <tr key={k}>
                  <td style={{ color:'#BBB', padding:'2px 4px 2px 0', verticalAlign:'top' }}>{k}</td>
                  <td style={{ fontWeight:700, padding:'2px 0', wordBreak:'break-all' }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {ACTIONS.map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={() => { if (window.confirm(a.confirm)) { a.run(); window.location.reload(); } }}
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
