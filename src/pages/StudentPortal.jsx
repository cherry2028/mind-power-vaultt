import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function StudentPortal() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!code.trim()) {
      setError("Please enter your access code.");
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/validate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() })
      });
      const data = await res.json();
      
      if (data.valid) {
        // Store JWT token for journal session validation
        sessionStorage.setItem('mpv_journal_token', data.token || code.trim());
        sessionStorage.setItem('mpv_journal_access', code.trim());
        navigate('/journal');
      } else {
        setError(data.error || "Invalid Access Code. Please contact Admin.");
      }
    } catch (err) {
      setError("Server error. Please try again later.");
    }
    setLoading(false);
  };

  const G = {
    gold: "#C9A84C",
    goldDim: "rgba(201,168,76,0.18)",
    smoke: "#F5F2EA",
    mid: "#D0CCBF",
    black: "#05050A",
    dark1: "#0A0A10"
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: G.black,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'DM Sans', sans-serif",
      color: G.smoke,
      userSelect: 'none' // Anti-copy
    }}>
      <div style={{
        maxWidth: 400,
        width: '100%',
        padding: '40px',
        background: G.dark1,
        border: `1px solid ${G.goldDim}`,
        borderRadius: '12px',
        textAlign: 'center',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
      }}>
        <h2 style={{ color: G.gold, fontSize: 24, marginBottom: 8 }}>Student Portal</h2>
        <p style={{ color: G.mid, fontSize: 14, marginBottom: 32 }}>Enter your secure access code to view the Premium Journal.</p>
        
        <form onSubmit={handleLogin}>
          <input 
            type="password"
            value={code}
            onChange={e => {setCode(e.target.value); setError('');}}
            placeholder="Enter Access Code"
            style={{
              width: '100%',
              padding: '16px 20px',
              backgroundColor: 'rgba(201,168,76,0.04)',
              border: `1px solid ${error ? 'rgba(200,80,80,0.5)' : G.goldDim}`,
              borderRadius: '8px',
              color: G.smoke,
              fontSize: '16px',
              outline: 'none',
              marginBottom: '16px',
              textAlign: 'center',
              letterSpacing: 2
            }}
          />
          {error && <div style={{ color: 'rgba(200,80,80,0.8)', fontSize: 13, marginBottom: 16 }}>{error}</div>}
          
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px',
              background: `linear-gradient(135deg, ${G.gold}, #9A7020)`,
              color: G.black,
              border: 'none',
              borderRadius: '6px',
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: 'uppercase',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Verifying...' : 'Access Journal'}
          </button>
        </form>

        <p style={{ marginTop: 24, fontSize: 12, color: 'rgba(240,237,228,0.32)' }}>
          Access to this portal is strictly monitored. Single device login enforced. Unauthorized sharing will result in permanent ban.
        </p>
      </div>
    </div>
  );
}
