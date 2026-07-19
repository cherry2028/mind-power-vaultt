import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// Import the journal HTML as raw string — bundled in JS, never publicly accessible
import journalHtml from '../journal-content.html?raw';

import { supabase } from '../supabase';
import { generateWeeklyPdf } from '../utils/weeklyPdf';
import { pullJournal, pushJournal, markDirty, isDirty, resetSyncMarkers } from '../utils/journalSync';
import { buildLicenseCardHtml, buildInsightCardHtml, buildMilestoneCardHtml, generateCardImage } from '../utils/shareCards';

const CARD_BUILDERS = {
  license: { build: buildLicenseCardHtml, file: (p) => `MPV_License_${p.date}.png` },
  insight: { build: buildInsightCardHtml, file: (p) => `MPV_Mirror_${p.date}.png` },
  milestone: { build: buildMilestoneCardHtml, file: (p) => `MPV_Streak_${p.days}days.png` },
};

// Public mentor WhatsApp number for the wa.me fallback (same number as the
// site's contact button — not a secret, unlike MENTOR_EMAIL which stays server-side).
const MENTOR_WHATSAPP = (import.meta.env.VITE_MENTOR_WHATSAPP || '919059181616').replace(/\D/g, '');
const WA_TEXT = 'Weekly report పంపుతున్నాను 📊 — Mind Power Vaultt Journal';

export default function Journal() {
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [dataReady, setDataReady] = useState(false); // cloud pull finished (or not applicable)
  const [pdfShare, setPdfShare] = useState(null); // {status:'generating'|'ready'|'error', ...}
  const [syncConflict, setSyncConflict] = useState(null); // {cloudTrades, cloudEods} — empty local vs real cloud
  const [cardShare, setCardShare] = useState(null); // {status:'generating'|'ready'|'error', kind, file, url, fileName, hint}
  const iframeRef = useRef(null);
  const pulledRef = useRef(false);      // cloud pull runs once per page load
  const syncUserRef = useRef(null);     // {id, email?} — null = emergency/local-only mode
  const syncStatusRef = useRef('off');  // 'synced' | 'syncing' | 'offline' | 'error' | 'off'
  const navigate = useNavigate();

  const postSyncStatus = (status) => {
    if (status) syncStatusRef.current = status;
    try {
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'MPV_SYNC_STATUS', status: syncStatusRef.current }, '*');
    } catch { /* iframe not ready yet — it will ask via MPV_HELLO */ }
  };

  // Tell the journal iframe to re-read localStorage (after a merge/restore
  // changed it underneath a live journal).
  const postReloadDb = (note) => {
    try {
      iframeRef.current?.contentWindow?.postMessage({ type: 'MPV_RELOAD_DB', note: note || '' }, '*');
    } catch { /* ignore */ }
  };

  // Shared handling for a push outcome (statuses come from journalSync).
  const handlePushResult = (result) => {
    if (result.status === 'blocked-empty') {
      setSyncConflict({ cloudTrades: result.cloudTrades, cloudEods: result.cloudEods });
      postSyncStatus('error');
      return;
    }
    if (result.status === 'merged') {
      postReloadDb('Journal cloud తో sync అయింది ✦');
      postSyncStatus('synced');
      return;
    }
    postSyncStatus(result.status); // 'synced' | 'offline' | 'error'
  };

  // ═══ CLOUD SYNC ENGINE (local-first, guarded push, merge on conflict) ═══
  useEffect(() => {
    if (!authorized || !dataReady) return;
    let pushTimer = null;

    const doPush = async () => {
      if (!syncUserRef.current) return;
      postSyncStatus('syncing');
      const result = await pushJournal(supabase, syncUserRef.current);
      handlePushResult(result);
    };

    const onMessage = (e) => {
      if (e.source !== iframeRef.current?.contentWindow || !e.data) return;
      if (e.data.type === 'MPV_HELLO') postSyncStatus(); // iframe booted — tell it the current status
      if (e.data.type === 'MPV_DB_DIRTY') {
        if (!syncUserRef.current) return; // emergency login: local-only
        markDirty();
        clearTimeout(pushTimer);
        pushTimer = setTimeout(doPush, 5000);
      }
    };
    const onPageHide = () => {
      // Best-effort flush — don't lose the debounce window on tab close
      if (syncUserRef.current && isDirty()) pushJournal(supabase, syncUserRef.current);
    };
    const onOnline = () => {
      if (!syncUserRef.current) return;
      if (isDirty()) doPush();
      else postSyncStatus('synced');
    };
    const onOffline = () => {
      if (syncUserRef.current) postSyncStatus('offline');
    };

    window.addEventListener('message', onMessage);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      clearTimeout(pushTimer);
      window.removeEventListener('message', onMessage);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [authorized, dataReady]);

  // ═══ WEEKLY PDF → WHATSAPP (triggered from the journal iframe) ═══
  useEffect(() => {
    const onMessage = async (e) => {
      if (e.source !== iframeRef.current?.contentWindow) return;
      if (!e.data || e.data.type !== 'MPV_WEEKLY_PDF') return;
      const payload = e.data.payload || {};
      setPdfShare({ status: 'generating' });
      try {
        const { blob, file, fileName } = await generateWeeklyPdf(payload);
        const url = URL.createObjectURL(blob);

        // Best-effort permanent record in Supabase — sharing works even if this fails.
        let recordSaved = false;
        const token = sessionStorage.getItem('mpv_journal_token') || '';
        if (token && !token.startsWith('EMERGENCY_')) {
          try {
            const res = await fetch('/api/save-weekly-report', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({
                studentName: payload.studentName,
                weekStart: payload.weekStart,
                weekEnd: payload.weekEnd,
                report: payload,
              }),
            });
            recordSaved = (await res.json())?.success === true;
          } catch { /* offline or server issue — keep sharing */ }
        }
        setPdfShare({ status: 'ready', file, url, fileName, recordSaved, hint: '' });
      } catch (err) {
        setPdfShare({ status: 'error', message: err?.message || 'PDF generation failed' });
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // ═══ SHAREABLE CARDS (license / insight / milestone — from the iframe) ═══
  useEffect(() => {
    const onMessage = async (e) => {
      if (e.source !== iframeRef.current?.contentWindow) return;
      if (!e.data || e.data.type !== 'MPV_SHARE_IMAGE') return;
      const { kind, payload } = e.data;
      const builder = CARD_BUILDERS[kind];
      if (!builder || !payload) return;
      setCardShare({ status: 'generating', kind });
      try {
        const { blob, file } = await generateCardImage(builder.build(payload), builder.file(payload));
        setCardShare({ status: 'ready', kind, file, url: URL.createObjectURL(blob), fileName: file.name, hint: '' });
      } catch (err) {
        setCardShare({ status: 'error', kind, message: err?.message || 'Image generation failed' });
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const downloadCard = () => {
    const a = document.createElement('a');
    a.href = cardShare.url;
    a.download = cardShare.fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const shareCard = async () => {
    const files = [cardShare.file];
    if (navigator.canShare && navigator.canShare({ files })) {
      try {
        await navigator.share({ files, title: cardShare.fileName });
        setCardShare(s => ({ ...s, hint: '✅ Share sheet లో WhatsApp Status select చేయండి.' }));
        return;
      } catch (err) {
        if (err?.name === 'AbortError') return;
      }
    }
    downloadCard();
    setCardShare(s => ({ ...s, hint: '📥 Image download అయింది — WhatsApp Status లో upload చేయండి.' }));
  };

  const closeCardShare = () => {
    if (cardShare?.url) URL.revokeObjectURL(cardShare.url);
    setCardShare(null);
  };

  const downloadPdf = () => {
    const a = document.createElement('a');
    a.href = pdfShare.url;
    a.download = pdfShare.fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const shareToWhatsApp = async () => {
    const files = [pdfShare.file];
    if (navigator.canShare && navigator.canShare({ files })) {
      try {
        await navigator.share({ files, title: pdfShare.fileName, text: WA_TEXT });
        setPdfShare(s => ({ ...s, hint: '✅ Share sheet లో WhatsApp select చేసి Krishna Prasad కి పంపండి.' }));
        return;
      } catch (err) {
        if (err?.name === 'AbortError') return; // user cancelled the sheet
        // fall through to wa.me fallback
      }
    }
    downloadPdf();
    window.open(`https://wa.me/${MENTOR_WHATSAPP}?text=${encodeURIComponent(WA_TEXT)}`, '_blank', 'noopener');
    setPdfShare(s => ({ ...s, hint: '📥 PDF download అయింది — WhatsApp లో attach చేయండి.' }));
  };

  const closePdfShare = () => {
    if (pdfShare?.url) URL.revokeObjectURL(pdfShare.url);
    setPdfShare(null);
  };

  // ═══ SYNC CONFLICT RESOLUTION (empty device vs real cloud journal) ═══
  const resolveConflictRestore = () => {
    // Forget local sync markers so the boot pull restores the cloud journal.
    resetSyncMarkers();
    sessionStorage.setItem('mpv_restore_note', 'మీ journal cloud నుండి restore అయింది ✦');
    window.location.reload();
  };
  const resolveConflictForce = async () => {
    setSyncConflict(null);
    postSyncStatus('syncing');
    const result = await pushJournal(supabase, syncUserRef.current, { force: true });
    handlePushResult(result);
  };
  const resolveConflictLater = () => {
    setSyncConflict(null); // stays dirty — dot shows ⚠ until they decide
  };

  // ═══ SESSION VALIDATION ═══
  useEffect(() => {
    const validateSession = async () => {
      const token = sessionStorage.getItem('mpv_journal_token');
      if (!token) {
        setError('No active session. Please login through Portal.');
        setChecking(false);
        return;
      }
      
      // Emergency bypass validation — local-only, no cloud sync
      if (token.startsWith('EMERGENCY_')) {
        syncUserRef.current = null;
        syncStatusRef.current = 'off';
        setAuthorized(true);
        setDataReady(true);
        setChecking(false);
        return;
      }

      try {
        const { data, error } = await supabase.auth.getSession();
        if (data?.session) {
          // Supabase auto-refreshes the session, but the journal iframe reads this
          // stored token for API calls — keep it in sync or it goes stale after ~1 hour
          sessionStorage.setItem('mpv_journal_token', data.session.access_token);


          // Verify if THIS is still the active device. The subscriptions
          // table is keyed on email — phone-OTP sessions have no email claim,
          // so skip the lookup rather than querying with undefined.
          const localDeviceId = localStorage.getItem('mpv_device_id');
          const user = data.session.user;

          if (user.email) {
            const { data: sub, error: subError } = await supabase
              .from('subscriptions')
              .select('device_id')
              .eq('email', user.email)
              .single();

            if (sub && sub.device_id && sub.device_id !== localDeviceId) {
              // Another device logged in!
              await supabase.auth.signOut();
              sessionStorage.removeItem('mpv_journal_token');
              setError('Access revoked. You logged into this account on another device.');
              setChecking(false);
              return;
            }
          }

          // Cloud pull — once per page load, BEFORE the journal iframe boots,
          // so a student on a new phone sees their restored journal immediately.
          // Keyed on user.id: present for every auth method incl. phone OTP.
          syncUserRef.current = { id: user.id, email: user.email || null };
          if (!pulledRef.current) {
            pulledRef.current = true;
            const result = await pullJournal(supabase, syncUserRef.current);
            if (result.status === 'restored') {
              sessionStorage.setItem('mpv_restore_note', 'మీ journal cloud నుండి restore అయింది ✦');
            }
            if (result.status === 'blocked-empty') {
              // Stale dirty flag on a near-empty device vs a real cloud journal —
              // never auto-resolve; the student decides via the conflict overlay.
              setSyncConflict({ cloudTrades: result.cloudTrades, cloudEods: result.cloudEods });
              syncStatusRef.current = 'error';
            } else {
              syncStatusRef.current =
                (result.status === 'offline' || result.status === 'error') ? result.status : 'synced';
            }
          }

          setAuthorized(true);
          setDataReady(true);
        } else {
          sessionStorage.removeItem('mpv_journal_token');
          setError('Session expired. Please login again.');
        }
      } catch (err) {
        setError('Verification failed. Please login again.');
      }
      setChecking(false);
    };
    
    validateSession();
    
    // Auto-sync: Check every 60 seconds if another device logged in
    const interval = setInterval(validateSession, 60000);
    return () => clearInterval(interval);
  }, []);

  // ═══ ANTI-SCREENSHOT + ANTI-COPY + ANTI-DEVTOOLS ═══
  useEffect(() => {
    if (!authorized) return;

    // Anti-right-click
    const noContext = (e) => { e.preventDefault(); return false; };
    document.addEventListener('contextmenu', noContext);

    // Anti-keyboard shortcuts (Ctrl+S, Ctrl+U, Ctrl+Shift+I, F12, PrintScreen)
    const noKeys = (e) => {
      if (e.key === 'F12') { e.preventDefault(); return false; }
      if (e.ctrlKey && e.shiftKey && ['I','J','C'].includes(e.key.toUpperCase())) { e.preventDefault(); return false; }
      if (e.ctrlKey && ['s','u','p'].includes(e.key.toLowerCase())) { e.preventDefault(); return false; }
      if (e.key === 'PrintScreen') {
        navigator.clipboard.writeText('');
        document.body.style.filter = 'blur(20px)';
        setTimeout(() => { document.body.style.filter = ''; }, 1500);
      }
    };
    document.addEventListener('keydown', noKeys);

    // Anti-print
    const printStyle = document.createElement('style');
    printStyle.textContent = '@media print { body * { display: none !important; } body::after { content: "CONFIDENTIAL — Mind Power Vaultt"; display: block; font-size: 40px; text-align: center; margin-top: 200px; color: red; } }';
    document.head.appendChild(printStyle);

    // Visibility change — blur on tab switch (anti-screenshot via screen share)
    const onVisChange = () => {
      if (document.hidden && iframeRef.current) {
        iframeRef.current.style.filter = 'blur(8px)';
      } else if (iframeRef.current) {
        iframeRef.current.style.filter = '';
      }
    };
    document.addEventListener('visibilitychange', onVisChange);

    return () => {
      document.removeEventListener('contextmenu', noContext);
      document.removeEventListener('keydown', noKeys);
      document.removeEventListener('visibilitychange', onVisChange);
      if (printStyle.parentNode) printStyle.parentNode.removeChild(printStyle);
    };
  }, [authorized]);

  // ═══ RENDER SECURE IFRAME ═══
  useEffect(() => {
    // dataReady gate: never boot the journal before the cloud pull finishes,
    // or it would initialize from stale/empty localStorage.
    if (!authorized || !dataReady || !iframeRef.current) return;
    // Create blob URL — HTML is never in a public URL
    const blob = new Blob([journalHtml], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    iframeRef.current.src = blobUrl;
    return () => URL.revokeObjectURL(blobUrl);
  }, [authorized, dataReady]);

  const G = {
    gold: "#C9A84C", smoke: "#F5F2EA", black: "#05050A", dark1: "#0A0A10",
    goldDim: "rgba(201,168,76,0.18)", mid: "#D0CCBF"
  };

  // ═══ CHECKING STATE ═══
  if (checking) {
    return (
      <div style={{ minHeight:'100vh', background:G.black, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16 }}>
        <div style={{ width:40, height:40, border:`2px solid ${G.goldDim}`, borderTopColor:G.gold, borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ color:G.gold, fontSize:12, letterSpacing:3, fontFamily:"'DM Sans',sans-serif" }}>VERIFYING SESSION...</p>
      </div>
    );
  }

  // ═══ UNAUTHORIZED STATE ═══
  if (!authorized) {
    return (
      <div style={{ minHeight:'100vh', background:G.black, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'DM Sans',sans-serif", color:G.smoke, userSelect:'none' }}>
        <div style={{ maxWidth:400, width:'100%', padding:'40px', background:G.dark1, border:`1px solid ${G.goldDim}`, borderRadius:12, textAlign:'center', boxShadow:'0 10px 40px rgba(0,0,0,0.5)' }}>
          <div style={{ fontSize:48, marginBottom:16 }}>🔒</div>
          <h2 style={{ color:'#CF6679', fontSize:20, marginBottom:8 }}>Access Denied</h2>
          <p style={{ color:G.mid, fontSize:14, marginBottom:24, lineHeight:1.8 }}>{error}</p>
          <button onClick={() => navigate('/portal')} style={{ width:'100%', padding:16, background:`linear-gradient(135deg, ${G.gold}, #9A7020)`, color:G.black, border:'none', borderRadius:6, fontSize:14, fontWeight:700, letterSpacing:2, cursor:'pointer' }}>
            Go to Portal Login →
          </button>
          <p style={{ marginTop:20, fontSize:11, color:'rgba(240,237,228,0.25)' }}>
            Unauthorized access attempts are logged and monitored.
          </p>
        </div>
      </div>
    );
  }

  // ═══ AUTHORIZED — RENDER JOURNAL ═══
  const accessCode = sessionStorage.getItem('mpv_journal_access') || 'STUDENT';
  
  return (
    <div style={{ width:'100vw', height:'100vh', overflow:'hidden', background:G.black, userSelect:'none', WebkitUserSelect:'none', position:'relative' }}>
      {/* 🛡️ DYNAMIC WATERMARK TO DETER SCREENSHOTS */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 9999,
        display: 'flex', flexWrap: 'wrap', overflow: 'hidden', opacity: 0.015,
        transform: 'rotate(-30deg) scale(1.5)', userSelect: 'none'
      }}>
        {Array.from({ length: 50 }).map((_, i) => (
          <div key={i} style={{ padding: '40px', fontSize: '24px', fontWeight: 900, color: '#FFFFFF', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
            {accessCode} • CONFIDENTIAL • DO NOT SHARE
          </div>
        ))}
      </div>
      
      <iframe
        ref={iframeRef}
        title="Mind Power Vaultt Journal"
        style={{ width:'100%', height:'100%', border:'none' }}
        sandbox="allow-scripts allow-same-origin allow-modals allow-popups"
      />

      {/* ═══ SYNC CONFLICT OVERLAY — empty device vs real cloud journal ═══ */}
      {syncConflict && (
        <div style={{ position:'fixed', inset:0, zIndex:10001, background:'rgba(5,5,10,0.92)', display:'flex', alignItems:'center', justifyContent:'center', padding:16, fontFamily:"'DM Sans','Noto Sans Telugu',sans-serif" }}>
          <div style={{ maxWidth:430, width:'100%', background:G.dark1, border:'1px solid rgba(224,168,76,0.4)', borderRadius:12, padding:'28px 24px', textAlign:'center', color:G.smoke }}>
            <div style={{ fontSize:36, marginBottom:10 }}>⚠️</div>
            <h3 style={{ color:'#E0A84C', fontSize:16, marginBottom:10, lineHeight:1.5 }}>Cloud లో మీ పాత journal data ఉంది</h3>
            <p style={{ fontSize:13, color:G.mid, lineHeight:1.8, marginBottom:18 }}>
              Cloud లో <b style={{ color:G.smoke }}>{syncConflict.cloudTrades} trades · {syncConflict.cloudEods} EOD reviews</b> ఉన్నాయి —
              కానీ ఈ device లో journal ఖాళీగా ఉంది. ఖాళీ data తో cloud ని replace చేస్తే మీ పాత journal శాశ్వతంగా పోతుంది.
            </p>
            <button onClick={resolveConflictRestore} style={{ width:'100%', padding:15, marginBottom:10, background:`linear-gradient(135deg, ${G.gold}, #9A7020)`, color:G.black, border:'none', borderRadius:8, fontSize:14, fontWeight:700, cursor:'pointer' }}>
              ✦ Cloud data restore చేయి (recommended)
            </button>
            <button onClick={resolveConflictForce} style={{ width:'100%', padding:12, marginBottom:10, background:'transparent', border:'1px solid rgba(207,102,121,0.5)', color:'#CF6679', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer' }}>
              కాదు — ఖాళీ data తో replace చేయి (పాత data పోతుంది)
            </button>
            <button onClick={resolveConflictLater} style={{ background:'transparent', border:'none', color:G.mid, fontSize:12, cursor:'pointer', textDecoration:'underline' }}>
              తర్వాత decide చేస్తాను
            </button>
          </div>
        </div>
      )}

      {/* ═══ SHAREABLE CARD OVERLAY (license / insight / milestone) ═══ */}
      {cardShare && (
        <div style={{ position:'fixed', inset:0, zIndex:10000, background:'rgba(5,5,10,0.92)', display:'flex', alignItems:'center', justifyContent:'center', padding:16, fontFamily:"'DM Sans','Noto Sans Telugu',sans-serif" }}>
          <div style={{ maxWidth:400, width:'100%', maxHeight:'92vh', overflowY:'auto', background:G.dark1, border:`1px solid ${G.goldDim}`, borderRadius:12, padding:'22px 20px', textAlign:'center', color:G.smoke }}>
            {cardShare.status === 'generating' && (
              <>
                <div style={{ width:36, height:36, margin:'14px auto', border:`2px solid ${G.goldDim}`, borderTopColor:G.gold, borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                <p style={{ color:G.gold, fontSize:13, letterSpacing:2 }}>CARD తయారవుతోంది...</p>
              </>
            )}
            {cardShare.status === 'error' && (
              <>
                <div style={{ fontSize:32, margin:'8px 0' }}>❌</div>
                <p style={{ fontSize:13, marginBottom:16 }}>Card generate అవ్వలేదు — మళ్ళీ try చేయండి.</p>
                <button onClick={closeCardShare} style={{ padding:'10px 24px', background:'transparent', border:`1px solid ${G.goldDim}`, color:G.mid, borderRadius:6, cursor:'pointer' }}>Close</button>
              </>
            )}
            {cardShare.status === 'ready' && (
              <>
                <img src={cardShare.url} alt="card preview" style={{ width:'100%', borderRadius:8, border:`1px solid ${G.goldDim}`, marginBottom:14 }}/>
                <button onClick={shareCard} style={{ width:'100%', padding:14, marginBottom:8, background:'linear-gradient(135deg,#2E7D52,#25D366)', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:700, cursor:'pointer' }}>
                  📱 WhatsApp Status లో పెట్టు
                </button>
                <button onClick={downloadCard} style={{ width:'100%', padding:12, marginBottom:8, background:'transparent', border:`1px solid ${G.goldDim}`, color:G.gold, borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                  ⬇ Download Image
                </button>
                {cardShare.hint && <p style={{ fontSize:12, color:'#25D366', marginBottom:8, lineHeight:1.6 }}>{cardShare.hint}</p>}
                <button onClick={closeCardShare} style={{ background:'transparent', border:'none', color:G.mid, fontSize:12, cursor:'pointer', textDecoration:'underline' }}>Close</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══ WEEKLY PDF SHARE OVERLAY ═══ */}
      {pdfShare && (
        <div style={{ position:'fixed', inset:0, zIndex:10000, background:'rgba(5,5,10,0.88)', display:'flex', alignItems:'center', justifyContent:'center', padding:16, fontFamily:"'DM Sans','Noto Sans Telugu',sans-serif" }}>
          <div style={{ maxWidth:420, width:'100%', background:G.dark1, border:`1px solid ${G.goldDim}`, borderRadius:12, padding:'28px 24px', textAlign:'center', color:G.smoke }}>
            {pdfShare.status === 'generating' && (
              <>
                <div style={{ width:36, height:36, margin:'0 auto 14px', border:`2px solid ${G.goldDim}`, borderTopColor:G.gold, borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                <p style={{ color:G.gold, fontSize:13, letterSpacing:2 }}>WEEKLY REPORT PDF తయారవుతోంది...</p>
              </>
            )}
            {pdfShare.status === 'error' && (
              <>
                <div style={{ fontSize:36, marginBottom:10 }}>❌</div>
                <p style={{ fontSize:14, marginBottom:6 }}>PDF generate అవ్వలేదు — మళ్ళీ try చేయండి.</p>
                <p style={{ fontSize:11, color:G.mid, marginBottom:18 }}>{pdfShare.message}</p>
                <button onClick={closePdfShare} style={{ padding:'12px 28px', background:'transparent', border:`1px solid ${G.goldDim}`, color:G.mid, borderRadius:6, cursor:'pointer' }}>Close</button>
              </>
            )}
            {pdfShare.status === 'ready' && (
              <>
                <div style={{ fontSize:36, marginBottom:8 }}>📊</div>
                <h3 style={{ color:G.gold, fontSize:17, marginBottom:4 }}>Weekly Report Ready ✦</h3>
                <p style={{ fontSize:11, color:G.mid, marginBottom:18, wordBreak:'break-all' }}>{pdfShare.fileName}</p>
                <button onClick={shareToWhatsApp} style={{ width:'100%', padding:15, marginBottom:10, background:'linear-gradient(135deg,#2E7D52,#25D366)', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:700, letterSpacing:1, cursor:'pointer' }}>
                  📱 Krishna Prasad కి పంపు (WhatsApp)
                </button>
                <button onClick={downloadPdf} style={{ width:'100%', padding:13, marginBottom:10, background:'transparent', border:`1px solid ${G.goldDim}`, color:G.gold, borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                  ⬇ Download PDF
                </button>
                {pdfShare.hint && <p style={{ fontSize:12, color:'#25D366', marginBottom:10, lineHeight:1.6 }}>{pdfShare.hint}</p>}
                <p style={{ fontSize:10.5, color:G.mid, marginBottom:4 }}>
                  {pdfShare.recordSaved ? '✅ Report copy mentor records లో save అయింది.' : 'ℹ️ Report copy save అవ్వలేదు (share కి problem లేదు).'}
                </p>
                <p style={{ fontSize:10.5, color:G.mid, marginBottom:14 }}>Email గా పంపాలంటే Share panel లో 📧 option వాడండి.</p>
                <button onClick={closePdfShare} style={{ background:'transparent', border:'none', color:G.mid, fontSize:12, cursor:'pointer', textDecoration:'underline' }}>Close</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
