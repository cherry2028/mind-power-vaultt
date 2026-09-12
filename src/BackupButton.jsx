import React, { useState } from 'react';
import { downloadBackupFile, hasStoredPin, pinMatches } from './utils/accountBinding';

// One-tap journal backup, shown on every screen that refuses to sync, sign in
// or log out. A refused device that cannot export is a trapped student.
//
// PIN-gated: these screens sit OUTSIDE the journal's own PIN screen, so without
// this check anyone holding the phone could download the owner's journal.
export default function BackupButton({ onDone }) {
  const [note, setNote] = useState('');

  const run = () => {
    if (hasStoredPin()) {
      const p = window.prompt('Backup కోసం మీ journal PIN enter చేయండి:');
      if (p === null) return;
      if (!pinMatches(p)) {
        setNote('❌ PIN తప్పు — backup download కాలేదు.');
        return;
      }
    }
    try {
      const fileName = downloadBackupFile();
      setNote(`✅ ${fileName} download అయింది — phone లో Files / Downloads లో ఉంటుంది.`);
      if (onDone) onDone(fileName);
    } catch {
      setNote('❌ Backup download కాలేదు — మళ్ళీ try చేయండి.');
    }
  };

  return (
    <>
      <button type="button" onClick={run} style={{ width:'100%', padding:15, marginBottom:8, background:'linear-gradient(135deg,#2E7D52,#4CAF82)', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:700, cursor:'pointer' }}>
        📥 Backup download చేయి
      </button>
      {note && (
        <p style={{ fontSize:12, color: note.startsWith('✅') ? '#4CAF82' : '#CF6679', margin:'0 0 10px', lineHeight:1.6, wordBreak:'break-all' }}>{note}</p>
      )}
    </>
  );
}
