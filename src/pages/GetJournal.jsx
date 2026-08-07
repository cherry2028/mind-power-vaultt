import React from 'react';
import { useNavigate } from 'react-router-dom';
import Seo from '../Seo';
import JournalPitch from './JournalPitch';
import { track } from '../analytics';

// The direct journal path — reachable from the header without touching the
// quiz, so a purchase-ready visitor is never forced through 4 questions (and
// never triggers a Gemini call, which only fires on quiz completion).
//
// It deliberately reuses the SAME sales pitch a non-subscriber sees at /portal:
// a skeptical first-time visitor has to be convinced WHY before a price or a
// login box appears. The purchase CTA lands at the bottom, after the argument.
//
// Buying deep-links to /?buy=1 rather than re-implementing Cashfree: the
// working checkout lives in the Conversion phase and is left untouched.
export default function GetJournal() {
  const navigate = useNavigate();

  const onBuy = () => {
    track('journal_cta_click', { source: 'get_journal_page', price: 3540 });
    navigate('/?buy=1');
  };

  return (
    <>
      <Seo
        title="Trading Journal — Mind Power Vaultt"
        description="Telugu trading psychology journal: daily license, mistake-cost tracking, evening mirror and a weekly report. ₹3,000 + GST per year."
        path="/get-journal"
      />
      <JournalPitch variant="new" showPurchase onBuy={onBuy} onSignIn={() => navigate('/portal')} />
    </>
  );
}
