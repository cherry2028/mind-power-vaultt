import React, { useRef, useState } from 'react';
import Seo from '../../Seo';
import { C } from './theme';
import { PAGE, REPORT, brokerSteps } from '../../lib/tradebook/copy.te.js';
import { analyze, sniffBinary } from '../../lib/tradebook/report.js';
import { parseCsv } from '../../lib/tradebook/csv.js';
import ReportView from './ReportView';
import FailurePanel from './FailurePanel';

// Tradebook Autopsy. The trader's file is read with the File API and analysed
// in this tab. Nothing here talks to a server, touches storage, or imports the
// journal/auth code — tests/tradebook-isolation.test.mjs fails the build if it
// ever does. The report lives in React state and is gone on refresh.

export default function AutopsyPage() {
  const [phase, setPhase] = useState('choose'); // choose | reading | report | failure
  const [model, setModel] = useState(null);
  const [failure, setFailure] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [howTo, setHowTo] = useState(false);
  const inputRef = useRef(null);

  function reset() {
    setPhase('choose'); setModel(null); setFailure(null);
    if (inputRef.current) inputRef.current.value = '';
    window.scrollTo(0, 0);
  }

  async function onFiles(list) {
    const picked = Array.from(list || []);
    if (!picked.length) return;
    setPhase('reading');
    const files = [];
    try {
      for (const file of picked) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const bin = sniffBinary(bytes);
        if (bin) { fail({ file: file.name, reason: `binary_${bin}` }); return; }
        files.push({ name: file.name, text: new TextDecoder('utf-8').decode(bytes) });
      }
      // let "reading" paint before the synchronous crunch
      await new Promise((r) => setTimeout(r, 30));
      const res = analyze(files);
      if (res.ok) { setModel(res.model); setPhase('report'); window.scrollTo(0, 0); }
      else fail(res.failure);
    } catch (err) {
      // Diagnostic carries column names only — never rows or values.
      const first = files[0] ? (parseCsv(files[0].text.slice(0, 4000))[0] || []) : [];
      fail({ file: files[0] && files[0].name, reason: 'engine_error', found: first.filter(Boolean), missing: [], error: err && err.name });
    }
  }

  function fail(f) { setFailure(f); setPhase('failure'); window.scrollTo(0, 0); }

  const zerodha = brokerSteps('zerodha');

  return (
    <main style={S.page}>
      <Seo title={PAGE.seoTitle} description={PAGE.seoDescription} path="/tradebook-autopsy" />
      <div style={S.wrap}>
        <header>
          <div style={S.brand}>MIND POWER VAULTT</div>
          <h1 style={S.h1}>{PAGE.title}</h1>
          <p style={S.sub}>{PAGE.sub}</p>
        </header>

        {(phase === 'choose' || phase === 'reading') && (
          <>
            <section style={S.privacy} aria-label="Privacy">
              <div style={S.privacyHead}>🔒 {PAGE.privacyHead}</div>
              {PAGE.privacyLines.map((l, i) => <p key={i} style={S.privacyLine}>{l}</p>)}
              <p style={S.proof}>{PAGE.privacyProof}</p>
            </section>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); onFiles(e.dataTransfer.files); }}
              style={{ ...S.drop, ...(dragOver ? S.dropOn : null) }}
            >
              <input
                ref={inputRef} id="tb-file" type="file" multiple
                accept=".csv,text/csv,text/comma-separated-values,application/vnd.ms-excel,.xlsx,.xls,.pdf"
                onChange={(e) => onFiles(e.target.files)}
                style={S.hiddenInput}
                disabled={phase === 'reading'}
              />
              <label htmlFor="tb-file" style={{ ...S.chooseBtn, ...(phase === 'reading' ? S.chooseBusy : null) }}>
                {phase === 'reading' ? PAGE.reading : PAGE.choose}
              </label>
              <p style={S.hint}>{PAGE.chooseHint}</p>
              <p style={S.brokers}>{PAGE.brokersLine}</p>
            </div>

            <section style={S.howTo}>
              <button type="button" onClick={() => setHowTo((v) => !v)} style={S.howToBtn} aria-expanded={howTo}>
                {howTo ? '▾' : '▸'} {PAGE.howTo}
              </button>
              {howTo && (
                <div style={S.howToBody}>
                  <div style={S.howToBroker}>{zerodha.name}</div>
                  <ol style={S.ol}>{zerodha.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
                  <div style={S.howToBroker}>Angel One · Upstox · Dhan · Fyers · ఇతర</div>
                  <ol style={S.ol}>{brokerSteps('other').steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
                </div>
              )}
            </section>
          </>
        )}

        {phase === 'report' && model && <ReportView model={model} onReset={reset} />}
        {phase === 'failure' && failure && <FailurePanel failure={failure} onReset={reset} />}

        <footer style={S.disclaimer}>{REPORT.disclaimer}</footer>
      </div>
    </main>
  );
}

const S = {
  page: { minHeight: '100vh', background: C.black, color: C.body, fontFamily: C.sans },
  wrap: { maxWidth: 680, margin: '0 auto', padding: '28px 16px 48px' },
  brand: { color: C.gold, fontSize: 11, letterSpacing: 5 },
  h1: { color: C.cream, fontFamily: C.serif, fontSize: 40, lineHeight: 1.1, margin: '10px 0 8px', fontWeight: 600 },
  sub: { color: C.body, fontSize: 16, lineHeight: 1.7, margin: 0 },
  privacy: { marginTop: 22, padding: '18px 16px', borderRadius: 14, border: `1.5px solid ${C.gold}`, background: 'rgba(201,168,76,0.08)' },
  privacyHead: { color: C.cream, fontSize: 18, fontWeight: 700, lineHeight: 1.5, marginBottom: 6 },
  privacyLine: { color: C.body, fontSize: 15, lineHeight: 1.7, margin: 0 },
  proof: { color: C.goldPale, fontSize: 14, lineHeight: 1.7, margin: '10px 0 0' },
  drop: { marginTop: 18, padding: '24px 16px', borderRadius: 14, border: `1.5px dashed ${C.line}`, textAlign: 'center' },
  dropOn: { borderColor: C.gold, background: 'rgba(201,168,76,0.06)' },
  hiddenInput: { position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden' },
  chooseBtn: { display: 'inline-block', background: C.gold, color: C.black, borderRadius: 12, padding: '15px 26px', fontSize: 17, fontWeight: 700, cursor: 'pointer' },
  chooseBusy: { background: 'transparent', color: C.goldPale, border: `1px solid ${C.line}`, cursor: 'progress' },
  hint: { color: C.mid, fontSize: 13.5, lineHeight: 1.6, margin: '14px 0 0' },
  brokers: { color: C.body, fontSize: 13, margin: '8px 0 0' },
  howTo: { marginTop: 14 },
  howToBtn: { background: 'transparent', border: 'none', color: C.goldPale, fontSize: 15, padding: '8px 0', cursor: 'pointer', fontFamily: C.sans },
  howToBody: { paddingLeft: 4 },
  howToBroker: { color: C.cream, fontSize: 14, fontWeight: 600, margin: '10px 0 4px' },
  ol: { color: C.body, fontSize: 14.5, lineHeight: 1.85, paddingLeft: 22, margin: 0 },
  disclaimer: { marginTop: 40, paddingTop: 18, borderTop: `1px solid ${C.line}`, color: C.mid, fontSize: 12.5, lineHeight: 1.7 },
};
