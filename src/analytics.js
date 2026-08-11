// One-line GA4 event helper. Safe when gtag is blocked/absent (ad blockers,
// emergency offline use) — analytics must never break app behavior.
export function track(event, params) {
  try { if (typeof window.gtag === 'function') window.gtag('event', event, params || {}); } catch { /* never throw */ }
}

// Google Ads conversion labels. Fill each from Google Ads → Goals → Conversions
// → (your action) → "Tag setup / Use Google tag" → the `send_to` value, which
// looks like 'AW-18381298138/AbC-dEfGh1jk'. Until a label is set here, the
// matching adsConversion() call is a safe no-op — so this ships inert and goes
// live the moment you paste the labels.
const ADS_CONVERSIONS = {
  journal_purchase: 'AW-18381298138/S9twCMSM_t4cENqz8bxE', // journal purchase (page-load) — LIVE
  masterclass_lead: null,     // LEAD (post-quiz lead-capture form submit) — paste 'AW-18381298138/…' to activate
  mentorship_enquiry: null,   // bonus: WhatsApp mentorship CTA — paste label to activate
};

// Fire a Google Ads conversion by logical name. No-op until its label is set
// above, and never throws (shares the ad-blocker safety of track()).
export function adsConversion(name, params) {
  const sendTo = ADS_CONVERSIONS[name];
  if (!sendTo) return;
  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'conversion', Object.assign({ send_to: sendTo }, params || {}));
    }
  } catch { /* never throw */ }
}
