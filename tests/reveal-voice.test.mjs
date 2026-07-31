// Acceptance tests for the self-discovery reveal.
//
//  A. The validator must PASS both of Cherry's hand-written examples.
//     (If his writing fails a threshold, the threshold is wrong — not his voice.)
//  B. The validator must CATCH each failure mode seen in the live production bug.
//  C. All 81 answer combinations (3^4) of the fallback reveal must validate.
import { validateProfile, latinizeText, latinizeProfile, LIMITS } from '../api/_lib/analyzeVoice.js';

let pass = 0, fail = 0;
const failures = [];
function check(name, cond, detail) {
  if (cond) { pass++; }
  else { fail++; failures.push(`${name}${detail ? ' :: ' + detail : ''}`); }
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond || !detail ? '' : '\n        ' + detail}`);
}

// ── Cherry's examples, verbatim ───────────────────────────────────────────
const CHOICES_1 = [
  'Price వెళ్ళిన direction లోనే enter అవుతాను',
  'వెంటనే ఇంకో trade తీసుకుంటాను',
  'ఇంకో trade తీసుకుంటాను',
  'SL పెడతాను — కానీ తగలకూడదని అనుకుంటాను',
];
const EX1 = {
  primaryPattern: 'నువ్వు trade చేయడంలేదు — మార్కెట్ తో గొడవ పడుతున్నావ్.',
  hiddenTruth: 'ఒక్క red candle — నీ ego ని డైరెక్ట్ గా కొడుతోంది.',
  emotionalState: 'ప్రతి trade ఒక revenge trade. ప్రతి ఒక్క entry నేను right అని నిరూపించుకోవాలి అనే attempt. మార్కెట్ ని గెలవడం కాదు — నిన్ను నువ్వు మోసం చేసుకుంటున్నావ్.',
  behaviorLines: [
    'Price ఎటు వెళ్తే అటు enter అవుతావు — analysis వల్ల కాదు, miss ఐపోతానేమో అనే భయం వల్ల.',
    'ఒక trade లో loss వస్తే వెంటనే enter అవుతావు — recover అవడానికి కాదు, ఆ feeling ని భరించలేక.',
    'Profit వచ్చాక ఆగవు — ఇంకా కావాలి ఇంకా కావాలి అనే అత్యాశ. ఇది luck కాదు నా skill అని నీకు నువ్వే చెప్పుకునే ego statement.',
    'SL పెట్టావు — తగలకూడదని దేవుడా దేవుడా అనుకుంటావ్. నిజంగా నువ్వు పెడుతున్నది SL కాదు — ఆశ ని SL గా పెడుతున్నావ్.',
  ],
  hiddenStrength: 'నువ్వు ఇంకా trading చేస్తున్నావ్ అంటే — నువ్వు వదిలేయలేదు. అది weakness కాదు. నీ fight లో తపన ఉంది, కానీ clarity లేదు.',
  actionStep: 'ఇకనుండి ఒక rule: loss వచ్చాక 10 నిమిషాలు screen కి దూరంగా ఉండు. ఆగాల్సింది trade కాదు — నీ ego.',
};

const CHOICES_2 = [
  'మళ్ళీ ఇలాంటి setup వస్తుందని wait చేస్తాను',
  'Loss వచ్చినా కంగారు పడను — process follow అవుతాను',
  'Profit book చేసి ఆపేస్తాను',
  'SL ని respect చేస్తాను',
];
const EX2 = {
  primaryPattern: 'నువ్వు process ని follow అవుతున్నావ్ — కానీ ఇంకా outcome ని నమ్ముతున్నావ్.',
  hiddenTruth: 'నీ discipline నిజం, సందేహం లేదు. కానీ ప్రతి profit closing day నీకు "నేను market pulse పట్టుకున్నాను" అనిపిస్తోంది. అదే నీ next TRAP.',
  emotionalState: 'Calm గా ఉన్నావ్ — కానీ ఆ calmness ఇంకా results మీద depend అవుతోంది. నిజమైన calmness అంటే — outcome మారినా మారనిది.',
  behaviorLines: [
    'Proper setup కోసం wait చేస్తావ్ — ఇది చాలామంది చేయలేరు, నువ్వు చేసి చూపిస్తున్నావ్.',
    'Loss వచ్చినా కంగారు పడవ్ — నా process correct ఐతే చాలు అని నీకు clarity ఉంది.',
    'Profit book చేసి ఆగగలిగే control ఉంది నీలో — greed ని గుర్తించగలవ్ నువ్వు.',
    'SL ని respect చేస్తావ్ — అది rule కాదు, నీ promise. దాన్ని నువ్వు break చేయవ్.',
  ],
  hiddenStrength: 'నీ ప్రశాంతత నీ edge. నిన్ను professional trader గా చేసేది నీ strategy కాదు — నీ controlling strength.',
  actionStep: 'ఇకనుండి P&L కాదు — process score రాయి. Measure చేయాల్సింది result కాదు, నీ decision quality.',
};

console.log('\n══ A. Cherry\'s examples must PASS ══');
const SITS_1 = [
  'Setup కనిపించింది, entry కి సిద్ధంగా ఉన్నావు — price వెళ్ళిపోయింది. Trade miss అయింది.',
  'ఈరోజు మొదటి trade లో loss వచ్చింది.',
  'పెద్ద profit వచ్చింది.',
  'Entry కి ముందు SL గురించి ఆలోచిస్తున్నావు.',
];
const r1 = validateProfile(EX1, { lang: 'te', choiceLabels: CHOICES_1, situationLabels: SITS_1 });
check("Cherry example 1 passes validator", r1.ok, r1.violations.join(' | '));
const r2 = validateProfile(EX2, { lang: 'te', choiceLabels: CHOICES_2, situationLabels: SITS_1 });
check("Cherry example 2 passes validator", r2.ok, r2.violations.join(' | '));

console.log('\n══ B. Validator must CATCH the real production failures ══');
const bad = (over) => validateProfile({ ...EX1, ...over }, { lang: 'te', choiceLabels: CHOICES_1, situationLabels: SITS_1 });

check('catches literary "నీవు"',
  bad({ hiddenTruth: 'నీవు మార్కెట్ ని అర్థం చేసుకోలేదు.' }).violations.some(v => /నీవు/.test(v)));
check('catches formal "మీరు"',
  bad({ hiddenTruth: 'మీరు మార్కెట్ ని అర్థం చేసుకోలేదు.' }).violations.some(v => /మీరు/.test(v)));
check('catches textbook "చూపిస్తుంది"',
  bad({ hiddenTruth: 'ఇది నీ భయాన్ని చూపిస్తుంది.' }).violations.some(v => /చూపిస్తుంది/.test(v)));
check('allows natural "చూపిస్తున్నావ్" (in Cherry\'s own example)',
  !r2.violations.some(v => /చూపిస్త/.test(v)));
check('catches the real S2/S3 verbatim repeat from production',
  bad({
    behaviorLines: [
      'Price ఎటు వెళ్తే అటు enter అవుతావు — miss ఐపోతానేమో అనే భయం వల్ల.',
      'Loss వచ్చింది కదా అని వెంటనే enter అవుతావు ఇది నీ భయాన్ని నిరాశను గురించి చెబుతుంది',
      'మూడు losses తర్వాత trade చేస్తావు ఇది నీ భయాన్ని నిరాశను గురించి చెబుతుంది',
      'SL పెట్టావు — ఆశ ని SL గా పెడుతున్నావ్.',
    ],
  }).violations.some(v => /repeated \d+-word span/.test(v)));
check('catches structural monotony (same ending 3+ times)',
  bad({
    behaviorLines: [
      'Price direction లో enter అవుతావ్ — ఇది నీ ego గురించి చెబుతోంది',
      'Loss తర్వాత వెంటనే enter అవుతావ్ — ఇది నీ భయం గురించి చెబుతోంది',
      'Profit వచ్చాక ఇంకో trade — ఇది నీ అత్యాశ గురించి చెబుతోంది',
      'SL పెట్టావ్ — ఆశ ని SL గా పెడుతున్నావ్.',
    ],
  }).violations.some(v => /structural monotony/.test(v)));
check('catches greed praised as courage in hiddenStrength',
  bad({ hiddenStrength: 'నీలో ధైర్యం ఉంది — profit వచ్చాక ఇంకా కావాలి అనుకుంటావ్.' })
    .violations.some(v => /praises a destructive/.test(v)));
check('catches "take a course" advice',
  bad({ actionStep: 'ఒక course తీసుకో, మంచి books చదువు.' }).violations.some(v => /course|books/.test(v)));
check('catches CTA / website mention',
  bad({ actionStep: 'మా website లో journal subscribe చేయి.' }).violations.some(v => /CTA/.test(v)));
check('allows "Profit book చేసి" (bare book is legal)',
  !r2.violations.some(v => /book/i.test(v)));
check('catches an over-long sentence',
  bad({ hiddenTruth: 'ఇది ఒక చాలా పొడవైన వాక్యం ఎందుకంటే ఇందులో చాలా ఎక్కువ పదాలు ఉన్నాయి కాబట్టి ఇది cap ని దాటుతుంది నిజంగా చాలా పొడవు.' })
    .violations.some(v => /sentence \d+ words/.test(v)));
check('catches a behaviour line ignoring the student\'s choice',
  bad({ behaviorLines: [ 'ఏదో ఒకటి రాశాను ఇక్కడ పూర్తిగా వేరే విషయం.', ...EX1.behaviorLines.slice(1) ] })
    .violations.some(v => /is generic/.test(v)));
check('ALLOWS a vivid paraphrase that engages the domain, not the exact choice tokens (rule #8 relaxed)',
  !bad({ behaviorLines: [
    'మిస్ అయిన trade ని చూసి తట్టుకోలేవు — పరుగెడుతున్న రైలు ఎక్కేస్తావు. ఎంట్రీ ప్లాన్ కోసం కాదు, బాధని భరించలేక.',
    ...EX1.behaviorLines.slice(1),
  ] }).violations.some(v => /behaviorLine1 is generic/.test(v)));
check('catches missing field', bad({ actionStep: '' }).violations.some(v => /missing\/empty/.test(v)));
check('catches wrong behaviorLines count',
  bad({ behaviorLines: EX1.behaviorLines.slice(0, 3) }).violations.some(v => /exactly 4/.test(v)));

console.log('\n══ B2. Latin-script normalization ══');
check('latinizes Telugu-script English terms (ట్రేడ్ → trade, సిస్టమ్ → system)',
  latinizeText('నీ ట్రేడ్ లో సిస్టమ్ లేదు — ఓవర్ కాన్ఫిడెన్స్ తో ఎంటర్ అవుతావు.')
    === 'నీ trade లో system లేదు — over-confidence తో enter అవుతావు.',
  latinizeText('నీ ట్రేడ్ లో సిస్టమ్ లేదు — ఓవర్ కాన్ఫిడెన్స్ తో ఎంటర్ అవుతావు.'));
check('keeps మార్కెట్ in Telugu (Cherry\'s own style) and leaves real Telugu words alone',
  latinizeText('మార్కెట్ ని భయంతో చూస్తావు') === 'మార్కెట్ ని భయంతో చూస్తావు');
check('latinizeProfile normalizes behaviorLines too',
  latinizeProfile({ behaviorLines: ['ప్రాఫిట్ వచ్చాక ఆగవు'] }).behaviorLines[0] === 'profit వచ్చాక ఆగవు');
check('latinizes general English too (సక్సెస్→success, మైండ్‌సెట్→mindset, రీ-entry→re-entry)',
  latinizeText('ఒక్క సక్సెస్ నీ మైండ్‌సెట్ మార్చదు — రీ-entry ఇవ్వకు')
    === 'ఒక్క success నీ mindset మార్చదు — re-entry ఇవ్వకు',
  latinizeText('ఒక్క సక్సెస్ నీ మైండ్‌సెట్ మార్చదు — రీ-entry ఇవ్వకు'));

console.log('\n══ C. All 81 fallback combinations must validate ══');
const { buildProfile, SCENARIOS } = await import('../src/utils/constants.js');

let combos = 0, bad81 = [];
for (const lang of ['te', 'en']) {
  for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) for (let c = 0; c < 3; c++) for (let d = 0; d < 3; d++) {
    const answers = [a, b, c, d];
    const labels = answers.map((ci, i) => SCENARIOS[i][lang].ch[ci].l);
    const sits = answers.map((_, i) => SCENARIOS[i][lang].sit.split(/\s+/).join(' '));
    const profile = buildProfile(answers, lang);
    const res = validateProfile(profile, { lang, choiceLabels: labels, situationLabels: sits });
    combos++;
    if (!res.ok) bad81.push(`[${lang}] ${answers.join('')} → ${res.violations.join(' | ')}`);
  }
}
check(`all ${combos} fallback combinations (81 te + 81 en) validate`, bad81.length === 0,
  bad81.slice(0, 5).join('\n        '));

// fallback must never produce the old undefined-field bug
let undef = [];
for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) for (let c = 0; c < 3; c++) for (let d = 0; d < 3; d++) {
  const p = buildProfile([a, b, c, d], 'te');
  for (const k of ['primaryPattern', 'hiddenTruth', 'emotionalState', 'hiddenStrength', 'actionStep']) {
    if (!p[k]) undef.push(`${[a,b,c,d].join('')}.${k}`);
  }
  if ((p.behaviorLines || []).length !== 4) undef.push(`${[a,b,c,d].join('')}.behaviorLines=${(p.behaviorLines||[]).length}`);
}
check('no undefined/blank fields in any fallback combination (the old bug)', undef.length === 0, undef.slice(0,5).join(', '));

console.log(`\n${pass} passed, ${fail} failed`);
if (failures.length) { console.log('\nFailures:'); failures.forEach(f => console.log('  - ' + f)); }
process.exitCode = fail ? 1 : 0;
