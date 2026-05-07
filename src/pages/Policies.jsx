import React from 'react';
import { Link } from 'react-router-dom';

const G = { black: "#05050A", dark1: "#0A0A0F", smoke: "#F5F2EA", gold: "#C9A84C", mid: "#A8A498", goldDim: "rgba(201,168,76,0.15)" };

const PolicyLayout = ({ title, children }) => (
  <div style={{ minHeight: '100vh', backgroundColor: G.black, color: G.smoke, fontFamily: "'DM Sans', sans-serif", padding: '40px 20px', lineHeight: 1.6 }}>
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Link to="/" style={{ color: G.gold, textDecoration: 'none', fontSize: 14, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 40, display: 'inline-block' }}>← Back to Home</Link>
      <h1 style={{ color: G.gold, fontSize: 32, marginBottom: 30, letterSpacing: 2 }}>{title}</h1>
      <div style={{ color: G.mid, fontSize: 15 }}>
        {children}
      </div>
      <div style={{ marginTop: 60, paddingTop: 30, borderTop: `1px solid ${G.goldDim}`, fontSize: 13, color: 'rgba(168,164,152,0.6)' }}>
        <p><strong>Legal Name:</strong> MALLADI SRI SAI SIVA RAMA KRISHNAPRASAD</p>
        <p><strong>Trade Name:</strong> ALR SERVICES</p>
        <p><strong>Constitution of Business:</strong> PROPRIETORSHIP</p>
        <p><strong>GST Number:</strong> 37DLNPM0984C1ZU</p>
      </div>
    </div>
  </div>
);

export const AboutUs = () => (
  <PolicyLayout title="About Us">
    <p>Welcome to Mind Power Vaultt, an educational platform dedicated to trading psychology and behavioral correction.</p>
    <br/>
    <p><strong>Who we are:</strong><br/>Mind Power Vaultt is run by ALR SERVICES (Proprietorship), legally registered under the name MALLADI SRI SAI SIVA RAMA KRISHNAPRASAD. We specialize in providing advanced digital journaling and psychological analysis tools for traders.</p>
    <br/>
    <p><strong>What we provide:</strong><br/>We provide a web-based subscription software (SaaS) called the "Mind Power Vaultt Journal". This journal helps traders track their emotions, enforce discipline through rigid rule-tracking, and identify destructive behavioral patterns in the financial markets.</p>
    <br/>
    <p><strong>Educational Purpose:</strong><br/>All content, journals, and tools provided on this platform are strictly for educational and self-improvement purposes. We are not SEBI registered financial advisors. We do not provide buy/sell recommendations, tips, or investment advice. Our service is solely a digital diary and psychological tracking tool.</p>
  </PolicyLayout>
);

export const TermsAndConditions = () => (
  <PolicyLayout title="Terms & Conditions">
    <p>Last updated: May 2026</p>
    <br/>
    <p>By accessing and using Mind Power Vaultt, you agree to comply with the following terms:</p>
    <br/>
    <p><strong>1. Subscription Access:</strong><br/>Access to the journal is granted on an annual subscription basis. Your account is tied strictly to a single device (Hardware Lock). Sharing accounts is strictly prohibited and will result in permanent ban without refund.</p>
    <br/>
    <p><strong>2. No Financial Advice:</strong><br/>The platform is entirely educational. We do not provide financial advice. You are solely responsible for your trades and financial decisions.</p>
    <br/>
    <p><strong>3. Intellectual Property:</strong><br/>All content, interface designs, and psychological frameworks are the intellectual property of ALR SERVICES. Unauthorized copying, screenshot distribution, or reproduction will invite legal action.</p>
  </PolicyLayout>
);

export const PrivacyPolicy = () => (
  <PolicyLayout title="Privacy Policy">
    <p>Last updated: May 2026</p>
    <br/>
    <p><strong>Data Collection:</strong><br/>We collect minimal data necessary for the functioning of our application, primarily your email address (for OTP authentication) and device hardware tokens (to enforce single-device policies).</p>
    <br/>
    <p><strong>Usage of Data:</strong><br/>Your trading journal entries are stored securely. We do not share, sell, or rent your personal data or journal entries to any third parties.</p>
    <br/>
    <p><strong>Security:</strong><br/>We employ industry-standard security measures including OTP verification and RLS (Row Level Security) databases to protect your information.</p>
  </PolicyLayout>
);

export const RefundPolicy = () => (
  <PolicyLayout title="Refund Policy">
    <p>Last updated: May 2026</p>
    <br/>
    <p><strong>Digital Goods:</strong><br/>Since Mind Power Vaultt provides immediate access to proprietary digital software and educational frameworks, <strong>all sales are final.</strong></p>
    <br/>
    <p><strong>No Refunds:</strong><br/>We do not offer refunds, exchanges, or cancellations once a subscription is successfully activated. Please ensure you understand the platform's purpose before purchasing.</p>
  </PolicyLayout>
);

export const ContactUs = () => (
  <PolicyLayout title="Contact Us">
    <p>If you have any questions, support requests, or need to request a device lock reset, please reach out to us:</p>
    <br/>
    <p><strong>Business Name:</strong> ALR SERVICES</p>
    <p><strong>Email:</strong> support@mindpowervaultt.com</p>
    <p><strong>Operating Hours:</strong> Monday to Friday, 9:00 AM - 6:00 PM (IST)</p>
  </PolicyLayout>
);
