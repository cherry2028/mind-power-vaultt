// Voice guardrails for the self-discovery reveal.
//
// The model is not trusted to police itself: every generated profile is run
// through these deterministic checks. A failure triggers ONE retry with the
// specific violations fed back, and a second failure falls back to the local
// template profile — a student never sees broken or off-voice output.
//
// Every rule here was calibrated against Cherry's two hand-written examples,
// and the test suite asserts those examples PASS. If his writing ever fails a
// threshold, the threshold is wrong — not his voice.

export const LIMITS = {
  // Cherry's longest example sentence is 15 words; 16 gives one word of
  // headroom while still forcing the short, punchy rhythm.
  maxWordsPerSentence: 16,
  // A 6-word span appearing in two different sections = recycled filler.
  repeatSpanWords: 6,
  // Per-field character caps — roughly 40% of the old verbose output.
  chars: {
    primaryPattern: 140,
    hiddenTruth: 170,
    emotionalState: 330,
    behaviorLine: 220,
    hiddenStrength: 270,
    actionStep: 240,
  },
};

// Formal/literary Telugu and textbook constructions. Note these are exact
// strings: "చూపిస్తుంది" is banned but "చూపిస్తున్నావ్" (used in Cherry's own
// example) is a different, natural conjugation and must stay legal.
const BANNED_TE = [
  ['నీవు', 'literary "నీవు" — use నువ్వు'],
  ['మీరు', 'formal "మీరు" — use నువ్వు'],
  ['మీకు', 'formal "మీకు" — use నీకు'],
  ['చూపిస్తుంది', 'textbook "చూపిస్తుంది"'],
  ['సూచిస్తుంది', 'textbook "సూచిస్తుంది"'],
  ['దీని అర్థం', 'textbook "దీని అర్థం"'],
  ['విశ్లేషణ ప్రకారం', 'textbook "విశ్లేషణ ప్రకారం"'],
  ['తెలియజేస్తుంది', 'textbook "తెలియజేస్తుంది"'],
];

const BANNED_EN = [
  ['this suggests', 'AI tell "this suggests"'],
  ['this indicates', 'AI tell "this indicates"'],
  ['this shows that', 'AI tell "this shows that"'],
  ['it is important to', 'AI tell "it is important to"'],
  ['in conclusion', 'AI tell "in conclusion"'],
];

// No CTA, no product mention, no "go learn more" advice — the reveal is a pure
// mirror; the conversion screen handles the offer.
// NOTE: bare "book" is legal ("Profit book చేసి" appears in Cherry's example);
// only the plural "books" (the go-read-something sense) is banned.
const BANNED_CTA = [
  [/\bwebsite\b/i, 'CTA: website'],
  [/mindpowervault/i, 'CTA: brand/product mention'],
  [/\bsubscribe\b/i, 'CTA: subscribe'],
  [/\bwhatsapp\b/i, 'CTA: whatsapp'],
  [/\btelegram\b/i, 'CTA: telegram'],
  [/\bcourses?\b/i, 'off-brand advice: course'],
  [/\bbooks\b/i, 'off-brand advice: books'],
  [/\bwebinar\b/i, 'off-brand advice: webinar'],
  [/\bjournal app\b/i, 'CTA: product'],
  [/కోర్స/, 'off-brand advice: కోర్సు'],
  [/పుస్తక/, 'off-brand advice: పుస్తకం'],
  [/వెబ్‌సైట్|వెబ్ సైట్/, 'CTA: website (te)'],
  [/లింక్/, 'CTA: link'],
];

// hiddenStrength must never re-label a destructive behaviour as a virtue.
const DESTRUCTIVE = /greed|గ్రీడ్|అత్యాశ|revenge|రెవెంజ్|పగ|overtrad|ఇంకా కావాలి|chase|ఛేజ్/i;
const PRAISE = /ధైర్యం|courage|సామర్థ్యం|గొప్ప|మంచి లక్షణం|strength|బలం/i;

const PUNCT_ONLY = /^[\s—–\-•.,;:"'"'()\[\]…!?।]+$/;

export function wordsOf(text) {
  return String(text || '')
    .split(/\s+/)
    .filter((w) => w && !PUNCT_ONLY.test(w));
}

export function sentencesOf(text) {
  return String(text || '')
    .split(/[.!?।\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeForRepeat(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[.,;:"'"'()\[\]…!?।—–\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function ngrams(text, n) {
  const w = normalizeForRepeat(text).split(' ').filter(Boolean);
  const out = [];
  for (let i = 0; i + n <= w.length; i++) out.push(w.slice(i, i + n).join(' '));
  return out;
}

const STOP = new Set([
  'the', 'and', 'for', 'you', 'your', 'that', 'this', 'with', 'will', 'from',
  'నేను', 'నువ్వు', 'నీకు', 'అని', 'ఒక', 'కాదు', 'లో', 'కి', 'ని', 'తో', 'అనే', 'ఇది',
]);

// Distinctive tokens from the student's chosen option — used to prove each
// behaviour line actually engages with what THEY picked.
export function choiceTokens(label) {
  return wordsOf(label)
    .map((w) => w.toLowerCase().replace(/[.,"'"'()]/g, ''))
    .filter((w) => w.length >= 3 && !STOP.has(w));
}

/**
 * @param {object} profile  generated profile
 * @param {{lang:string, choiceLabels:string[]}} ctx
 * @returns {{ok:boolean, violations:string[]}}
 */
export function validateProfile(profile, ctx = {}) {
  const v = [];
  const lang = ctx.lang === 'en' ? 'en' : 'te';
  const choiceLabels = ctx.choiceLabels || [];

  if (!profile || typeof profile !== 'object') {
    return { ok: false, violations: ['no profile object'] };
  }

  const lines = Array.isArray(profile.behaviorLines) ? profile.behaviorLines : [];
  const sections = {
    primaryPattern: profile.primaryPattern,
    hiddenTruth: profile.hiddenTruth,
    emotionalState: profile.emotionalState,
    hiddenStrength: profile.hiddenStrength,
    actionStep: profile.actionStep,
  };
  lines.forEach((l, i) => { sections[`behaviorLine${i + 1}`] = l; });

  // 1. required fields present and non-empty
  for (const k of ['primaryPattern', 'hiddenTruth', 'emotionalState', 'hiddenStrength', 'actionStep']) {
    if (!sections[k] || !String(sections[k]).trim()) v.push(`missing/empty: ${k}`);
  }
  if (lines.length !== 4) v.push(`behaviorLines must be exactly 4 (got ${lines.length})`);
  if (lines.some((l) => !l || !String(l).trim())) v.push('behaviorLines contains an empty entry');

  const all = Object.values(sections).filter(Boolean).join('\n');

  // 2. banned constructions
  const banned = lang === 'te' ? BANNED_TE : BANNED_EN;
  for (const [needle, why] of banned) {
    if (all.toLowerCase().includes(String(needle).toLowerCase())) v.push(`banned construction — ${why}`);
  }
  // Telugu bans also apply to the EN path (mixed output would still be wrong).
  if (lang === 'en') {
    for (const [needle, why] of BANNED_TE) {
      if (all.includes(needle)) v.push(`banned construction — ${why}`);
    }
  }

  // 3. CTA / off-brand advice
  for (const [re, why] of BANNED_CTA) {
    if (re.test(all)) v.push(`banned — ${why}`);
  }

  // 4. sentence word cap
  for (const [name, text] of Object.entries(sections)) {
    if (!text) continue;
    for (const s of sentencesOf(text)) {
      const n = wordsOf(s).length;
      if (n > LIMITS.maxWordsPerSentence) {
        v.push(`${name}: sentence ${n} words (max ${LIMITS.maxWordsPerSentence}) — "${s.slice(0, 45)}…"`);
      }
    }
  }

  // 5. per-field length caps
  const capOf = (name) => (name.startsWith('behaviorLine') ? LIMITS.chars.behaviorLine : LIMITS.chars[name]);
  for (const [name, text] of Object.entries(sections)) {
    const cap = capOf(name);
    if (text && cap && String(text).length > cap) {
      v.push(`${name}: ${String(text).length} chars (max ${cap})`);
    }
  }

  // 6. cross-section repetition (recycled filler)
  const names = Object.keys(sections).filter((k) => sections[k]);
  const seen = new Map(); // ngram -> section
  for (const name of names) {
    for (const g of new Set(ngrams(sections[name], LIMITS.repeatSpanWords))) {
      if (seen.has(g) && seen.get(g) !== name) {
        v.push(`repeated ${LIMITS.repeatSpanWords}-word span across ${seen.get(g)} & ${name} — "${g.slice(0, 40)}…"`);
      } else if (!seen.has(g)) {
        seen.set(g, name);
      }
    }
  }

  // 7. structural monotony — the "…ఇది నీ X ని చూపిస్తుంది." template trap.
  //    Catches sameness of SHAPE even when the words differ.
  if (lines.length >= 3) {
    const endings = lines.map((l) => wordsOf(l).slice(-2).join(' ').toLowerCase());
    const counts = {};
    endings.forEach((e) => { if (e) counts[e] = (counts[e] || 0) + 1; });
    const worst = Math.max(0, ...Object.values(counts));
    if (worst >= 3) v.push(`structural monotony: ${worst} of ${lines.length} behaviour lines share the same ending`);
  }

  // 8. each behaviour line must engage with THAT specific situation — matched
  //    against the choice wording OR the situation wording. Cherry's own
  //    example line 3 ("Profit వచ్చాక ఆగవు…") anchors on the situation rather
  //    than echoing the option text, and that is good writing: the rule is
  //    "must not be generic", not "must parrot the label".
  const situationLabels = ctx.situationLabels || [];
  lines.forEach((line, i) => {
    if (!line) return;
    const toks = [...choiceTokens(choiceLabels[i] || ''), ...choiceTokens(situationLabels[i] || '')];
    if (!toks.length) return; // nothing distinctive to match on — skip
    const hay = String(line).toLowerCase();
    if (!toks.some((t) => hay.includes(t))) {
      v.push(`behaviorLine${i + 1} is generic — engages with neither the choice nor situation ${i + 1}`);
    }
  });

  // 9. hiddenStrength must not praise a destructive behaviour
  const hs = String(profile.hiddenStrength || '');
  if (hs && hs.trim().toUpperCase() !== 'N/A' && DESTRUCTIVE.test(hs) && PRAISE.test(hs)) {
    v.push('hiddenStrength praises a destructive behaviour (greed/revenge framed as a virtue)');
  }

  return { ok: v.length === 0, violations: v };
}
