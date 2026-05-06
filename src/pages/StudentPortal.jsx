import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

export default function StudentPortal() {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    setError('');

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
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

      // 3. STRICT SINGLE DEVICE LOCK LOGIC
      let localDeviceId = localStorage.getItem('mpv_device_id');
      if (!localDeviceId) {
        localDeviceId = 'DEV-' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
        localStorage.setItem('mpv_device_id', localDeviceId);
      }

      if (!sub.device_id) {
        // First time login - Lock to this device
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({ device_id: localDeviceId })
          .eq('email', email.trim());
          
        if (updateError) throw new Error("Failed to lock device securely. Contact Admin.");
      } else if (sub.device_id !== localDeviceId) {
        // Tried to login from a DIFFERENT device
        // Since we don't want to log them out automatically, we BLOCK them here.
        await supabase.auth.signOut(); // Force sign out from supabase
        throw new Error("SECURITY ALERT: This account is already locked to another device. Multiple devices are strictly prohibited. Contact Admin to reset your device.");
      }

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
        <p style={{ color: G.mid, fontSize: 14, marginBottom: 32 }}>
          {step === 1 ? "Enter your registered email to receive an OTP." : "Enter the OTP sent to your email."}
        </p>
        
        {step === 1 ? (
          <form onSubmit={handleSendOtp}>
            <input 
              type="email"
              value={email}
              onChange={e => {setEmail(e.target.value); setError('');}}
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
