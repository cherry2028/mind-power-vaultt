import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

// Common email domain typos. A typo here creates a brand-new (stray) auth
// account and the student's journal silently syncs to the wrong identity —
// so catch it BEFORE the OTP is sent.
const TYPO_DOMAINS = {
  'gmil.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gamil.com': 'gmail.com',
  'gmial.com': 'gmail.com', 'gnail.com': 'gmail.com', 'gmaill.com': 'gmail.com',
  'gmail.co': 'gmail.com', 'gmail.cm': 'gmail.com', 'gmail.om': 'gmail.com',
  'gmali.com': 'gmail.com', 'gemail.com': 'gmail.com',
  'yaho.com': 'yahoo.com', 'yahooo.com': 'yahoo.com', 'yahoo.co': 'yahoo.com',
  'hotmial.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmai.com': 'hotmail.com',
  'outlok.com': 'outlook.com', 'outloo.com': 'outlook.com',
  'rediffmal.com': 'rediffmail.com', 'redifmail.com': 'rediffmail.com',
};

function suggestEmailFix(addr) {
  const at = addr.lastIndexOf('@');
  if (at < 1) return null;
  const domain = addr.slice(at + 1).toLowerCase();
  const fixed = TYPO_DOMAINS[domain];
  return fixed ? addr.slice(0, at + 1) + fixed : null;
}

export default function StudentPortal() {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [typoSuggestion, setTypoSuggestion] = useState(null); // {typed, suggested}
  const navigate = useNavigate();

  const actuallySendOtp = async (addr) => {
    setLoading(true);
    setError('');

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: addr,
    });

    if (signInError) {
      if (signInError.message.toLowerCase().includes('rate limit')) {
        setError("Network is busy. If you have an Emergency Code, you can enter it now.");
        setStep(2); // Force advance to step 2 for master code
      } else {
        setError(signInError.message || "Failed to send OTP. Please try again.");
      }
      setLoading(false);
    } else {
      setStep(2);
      setLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    const addr = email.trim();
    if (!addr || !addr.includes('@')) {
      setError("Please enter a valid email address.");
      return;
    }
    const suggested = suggestEmailFix(addr);
    if (suggested) {
      setTypoSuggestion({ typed: addr, suggested });
      setError('');
      return; // student must choose before the OTP goes out
    }
    await actuallySendOtp(addr);
  };

  const acceptSuggestion = async () => {
    const fixed = typoSuggestion.suggested;
    setEmail(fixed);
    setTypoSuggestion(null);
    await actuallySendOtp(fixed);
  };

  const keepTypedEmail = async () => {
    const typed = typoSuggestion.typed;
    setTypoSuggestion(null);
    await actuallySendOtp(typed);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp.trim()) {
      setError("Please enter the OTP.");
      return;
    }
    setLoading(true);
    setError('');

    try {
      // Normal Auth Flow
      const { data: authData, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp.trim(),
        type: 'email'
      });

      if (verifyError || !authData.session) {
        throw new Error(verifyError?.message || "Invalid OTP.");
      }

      // 2. Check Subscription Table
      const { data: sub, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('email', email.trim())
        .single();

      if (subError || !sub) {
        throw new Error("No active subscription found for this email.");
      }

      const expiryDate = new Date(sub.expires_at);
      if (expiryDate < new Date()) {
        throw new Error("Your annual subscription has expired.");
      }

      // 3. AUTO-SYNC CURRENT DEVICE LOGIC
      let localDeviceId = localStorage.getItem('mpv_device_id');
      if (!localDeviceId) {
        localDeviceId = 'DEV-' + window.crypto.randomUUID().replace(/-/g, '').substring(0, 13) + Date.now().toString(36);
        localStorage.setItem('mpv_device_id', localDeviceId);
      }

      // Always update the DB to make THIS device the active one
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({ device_id: localDeviceId })
        .eq('email', email.trim());
          
      if (updateError) throw new Error("Failed to sync device securely. Please try again.");

      // 4. Grant Access
      sessionStorage.setItem('mpv_journal_token', authData.session.access_token);
      sessionStorage.setItem('mpv_journal_access', sub.access_code || email.trim());
      navigate('/journal');
      
    } catch (err) {
      setError(err.message || "Authentication failed.");
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
      userSelect: 'none'
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
        {step === 1 ? (
          <p style={{ color: G.mid, fontSize: 14, marginBottom: 32 }}>Enter your registered email to receive an OTP.</p>
        ) : (
          <div style={{ marginBottom: 28 }}>
            <p style={{ color: G.mid, fontSize: 14, marginBottom: 8 }}>OTP పంపింది:</p>
            <p style={{ color: G.gold, fontSize: 16, fontWeight: 700, wordBreak: 'break-all', marginBottom: 6 }}>{email.trim()}</p>
            <p style={{ color: 'rgba(240,237,228,0.4)', fontSize: 11 }}>Email లో typo ఉంటే "Use a different email" నొక్కి సరిచేయండి.</p>
          </div>
        )}
        
        {step === 1 ? (
          <form onSubmit={handleSendOtp}>
            <input 
              type="email"
              value={email}
              onChange={e => {setEmail(e.target.value); setError(''); setTypoSuggestion(null);}}
              placeholder="Your Email Address"
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
                letterSpacing: 1
              }}
            />
            {error && <div style={{ color: 'rgba(200,80,80,0.8)', fontSize: 13, marginBottom: 16 }}>{error}</div>}
            {typoSuggestion && (
              <div style={{ background: 'rgba(224,168,76,0.08)', border: '1px solid rgba(224,168,76,0.4)', borderRadius: 8, padding: '14px 12px', marginBottom: 16, textAlign: 'left' }}>
                <p style={{ color: '#E0A84C', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>⚠️ Email లో typo లా ఉంది</p>
                <p style={{ color: G.mid, fontSize: 12, lineHeight: 1.7, marginBottom: 12, wordBreak: 'break-all' }}>
                  మీరు type చేసింది: <b style={{ color: G.smoke }}>{typoSuggestion.typed}</b><br/>
                  మీ ఉద్దేశం ఇదా? <b style={{ color: '#4CAF82' }}>{typoSuggestion.suggested}</b>
                </p>
                <button type="button" onClick={acceptSuggestion} disabled={loading}
                  style={{ width: '100%', padding: 12, marginBottom: 8, background: 'linear-gradient(135deg,#2E7D52,#4CAF82)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  ✔ అవును — {typoSuggestion.suggested} వాడు
                </button>
                <button type="button" onClick={keepTypedEmail} disabled={loading}
                  style={{ width: '100%', padding: 10, background: 'transparent', border: `1px solid ${G.goldDim}`, color: G.mid, borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                  కాదు — నేను type చేసిందే సరైనది
                </button>
              </div>
            )}
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
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <input 
              type="text"
              value={otp}
              onChange={e => {setOtp(e.target.value); setError('');}}
              placeholder="Enter OTP"
              maxLength={12}
              style={{
                width: '100%',
                padding: '16px 20px',
                backgroundColor: 'rgba(201,168,76,0.04)',
                border: `1px solid ${error ? 'rgba(200,80,80,0.5)' : G.goldDim}`,
                borderRadius: '8px',
                color: G.smoke,
                fontSize: '20px',
                outline: 'none',
                marginBottom: '16px',
                textAlign: 'center',
                letterSpacing: 8
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
              {loading ? 'Verifying...' : 'Login to Journal'}
            </button>
            <button
              type="button"
              onClick={() => {setStep(1); setOtp(''); setError('');}}
              style={{
                background: 'transparent', border: 'none', color: G.soft, fontSize: 12, marginTop: 16, cursor: 'pointer', textDecoration: 'underline'
              }}
            >
              Use a different email
            </button>
          </form>
        )}

        <p style={{ marginTop: 24, fontSize: 12, color: 'rgba(240,237,228,0.32)' }}>
          Access to this portal is strictly monitored. Single device login enforced. Unauthorized sharing will result in permanent ban.
        </p>
      </div>
    </div>
  );
}
