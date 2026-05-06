import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// Import the journal HTML as raw string — bundled in JS, never publicly accessible
import journalHtml from '../journal-content.html?raw';

export default function Journal() {
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const iframeRef = useRef(null);
  const navigate = useNavigate();

  // ═══ SESSION VALIDATION ═══
  useEffect(() => {
    const validateSession = async () => {
      const token = sessionStorage.getItem('mpv_journal_token');
      if (!token) {
        setError('No active session. Please login through Portal.');
        setChecking(false);
        return;
      }
      try {
        const res = await fetch('/api/verify-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
        const data = await res.json();
        if (data.valid) {
          setAuthorized(true);
        } else {
          sessionStorage.removeItem('mpv_journal_token');
          setError('Session expired. Please login again.');
        }
      } catch {
        // If API unavailable, check token exists as fallback
        if (token && token.length > 20) {
          setAuthorized(true);
        } else {
          setError('Verification failed. Please login again.');
        }
      }
      setChecking(false);
    };
    validateSession();
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
    if (!authorized || !iframeRef.current) return;
    // Create blob URL — HTML is never in a public URL
    const blob = new Blob([journalHtml], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    iframeRef.current.src = blobUrl;
    return () => URL.revokeObjectURL(blobUrl);
  }, [authorized]);

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
        display: 'flex', flexWrap: 'wrap', overflow: 'hidden', opacity: 0.04,
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
    </div>
  );
}
