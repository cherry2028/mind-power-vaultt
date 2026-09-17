import React, { useState } from 'react';
import { C } from './theme';
import { failureCopy, FAILURE, brokerSteps, PAGE } from '../../lib/tradebook/copy.te.js';
import { REQUIRED, BROKERS } from '../../lib/tradebook/brokers.js';

// A free tool that fails confusingly loses the trader for good. Every failure
// shows: what we saw, what we needed, and how to get the right file.
export default function FailurePanel({ failure, onReset }) {
  const copy = failureCopy(failure);
  const [broker, setBroker] = useState(null);
  const [copied, setCopied] = useState(false);
  const showColumns = ['no_header', 'missing_columns', 'bad_rows', 'engine_error'].includes(failure.reason);
  const missing = new Set(failure.missing || []);

  const diagnostic = [
    `reason: ${failure.reason}`,
    failure.file ? `file: ${failure.file}` : null,
    failure.found && failure.found.length ? `columns: ${failure.found.join(' | ')}` : null,
    failure.missing && failure.missing.length ? `missing: ${failure.missing.join(', ')}` : null,
    failure.dataRows ? `rows: ${failure.dataRows}, unreadable: ${failure.badRows}` : null,
    failure.error ? `error: ${failure.error}` : null,
  ].filter(Boolean).join('\n');

  async function copyDiagnostic() {
    try { await navigator.clipboard.writeText(diagnostic); setCopied(true); } catch { setCopied(false); }
  }

  const steps = broker ? brokerSteps(broker) : null;

  return (
    <section style={S.card} aria-live="polite">
      <h2 style={S.head}>{copy.head}</h2>
      <p style={S.p}>{copy.body}</p>

      {showColumns && failure.found && failure.found.length > 0 && (
        <>
          <h3 style={S.h3}>{FAILURE.foundHead}</h3>
          <div style={S.chips}>{failure.found.map((c, i) => <span key={i} style={S.chip}>{c}</span>)}</div>
        </>
      )}
      {showColumns && (
        <>
          <h3 style={S.h3}>{FAILURE.missingHead}</h3>
          <ul style={S.list}>
            {REQUIRED.map((f) => (
              <li key={f} style={{ color: missing.has(f) ? C.red : C.body }}>
                {missing.has(f) ? '✕ ' : '✓ '}{FAILURE.requiredLabels[f]}
              </li>
            ))}
          </ul>
        </>
      )}

      <h3 style={S.h3}>{FAILURE.pickBroker}</h3>
      <div style={S.chips}>
        {[...Object.keys(BROKERS), 'other'].map((id) => (
          <button key={id} type="button" onClick={() => setBroker(id)}
            style={{ ...S.brokerBtn, ...(broker === id ? S.brokerOn : null) }}>
            {id === 'other' ? 'ఇతర' : BROKERS[id].name}
          </button>
        ))}
      </div>
      {steps && (
        <div style={S.steps}>
          {!steps.verified && <p style={{ ...S.p, color: C.mid }}>{FAILURE.unverified}</p>}
          <ol style={S.ol}>{steps.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
        </div>
      )}

      <div style={S.row}>
        <button type="button" onClick={onReset} style={S.primary}>{PAGE.again}</button>
        <button type="button" onClick={copyDiagnostic} style={S.secondary}>{copied ? FAILURE.copied : FAILURE.diagnostic}</button>
      </div>
      <p style={S.note}>{FAILURE.diagnosticNote}</p>
    </section>
  );
}

const S = {
  card: { background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: '22px 18px', marginTop: 20 },
  head: { color: C.cream, fontSize: 19, lineHeight: 1.5, margin: '0 0 8px', fontWeight: 700, fontFamily: C.sans },
  h3: { color: C.goldPale, fontSize: 14, margin: '20px 0 8px', fontWeight: 600, fontFamily: C.sans },
  p: { color: C.body, fontSize: 15, lineHeight: 1.7, margin: 0 },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  chip: { background: C.ink, border: `1px solid ${C.line}`, color: C.body, borderRadius: 8, padding: '4px 10px', fontSize: 13, fontFamily: 'monospace' },
  list: { listStyle: 'none', padding: 0, margin: 0, lineHeight: 1.9, fontSize: 15 },
  brokerBtn: { background: 'transparent', border: `1px solid ${C.line}`, color: C.body, borderRadius: 20, padding: '8px 14px', fontSize: 14, cursor: 'pointer', fontFamily: C.sans },
  brokerOn: { borderColor: C.gold, color: C.black, background: C.gold },
  steps: { marginTop: 12 },
  ol: { color: C.body, fontSize: 15, lineHeight: 1.9, paddingLeft: 22, margin: '6px 0 0' },
  row: { display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 24 },
  primary: { background: C.gold, color: C.black, border: 'none', borderRadius: 10, padding: '12px 18px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: C.sans },
  secondary: { background: 'transparent', color: C.goldPale, border: `1px solid ${C.line}`, borderRadius: 10, padding: '12px 18px', fontSize: 14, cursor: 'pointer', fontFamily: C.sans },
  note: { color: C.mid, fontSize: 12.5, lineHeight: 1.6, margin: '10px 0 0' },
};
