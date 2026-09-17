import React from 'react';
import { Link } from 'react-router-dom';
import { C, signColor } from './theme';
import {
  REPORT, PAGE, headerLine, statsLine, smallSampleLine, leakLine, rs,
  FINDING_TITLE, findingSentences, findingTable, skippedLine, coverageLines,
} from '../../lib/tradebook/copy.te.js';

export default function ReportView({ model: m, onReset }) {
  return (
    <div>
      {/* Top block: fits one phone screen, so a plain screenshot carries it. */}
      <section style={S.top}>
        <div style={S.header}>{headerLine(m)}</div>
        <div style={S.netLabel}>{REPORT.netLabel}</div>
        <div style={{ ...S.net, color: signColor(m.realizedPaise) }}>{rs(m.realizedPaise, { exact: true })}</div>
        <div style={S.stats}>{statsLine(m)}</div>
        {m.biggestLeak && (
          <div style={S.leak}>
            <div style={S.leakLabel}>{REPORT.leakLabel}</div>
            <div style={S.leakLine}>{leakLine(m.biggestLeak)}</div>
          </div>
        )}
        {!m.belowMin && !m.biggestLeak && <p style={S.p}>{REPORT.noLeak}</p>}
        {m.belowMin && <p style={{ ...S.p, marginTop: 16 }}>{smallSampleLine(m)}</p>}
      </section>

      {m.findings.map((f) => (
        <section key={f.id} style={S.card}>
          <h2 style={S.h2}>{FINDING_TITLE[f.id]}</h2>
          {findingSentences(f).map((s, i) => <p key={i} style={S.fact}>{s}</p>)}
          {findingTable(f).length > 0 && (
            <table style={S.table}>
              <thead>
                <tr><th style={S.th}>{REPORT.tableGroup}</th><th style={S.thR}>{REPORT.tableTrades}</th><th style={S.thR}>{REPORT.tableNet}</th></tr>
              </thead>
              <tbody>
                {findingTable(f).map((row, i) => (
                  <tr key={i}>
                    <td style={S.td}>{row[0]}</td>
                    <td style={S.tdR}>{row[1]}</td>
                    <td style={{ ...S.tdR, color: row[2].includes('−') ? C.red : row[2].includes('+') ? C.green : C.body }}>{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div style={S.basis}>{REPORT.basis(f.n)}</div>
        </section>
      ))}

      {m.skipped.length > 0 && (
        <section style={S.quiet}>
          <h3 style={S.h3}>{REPORT.skippedHead}</h3>
          <ul style={S.ul}>{m.skipped.map((s) => <li key={s.id}>{skippedLine(s)}</li>)}</ul>
        </section>
      )}

      <section style={S.quiet}>
        <h3 style={S.h3}>{REPORT.coverageHead}</h3>
        <ul style={S.ul}>{coverageLines(m).map((l, i) => <li key={i}>{l}</li>)}</ul>
      </section>

      <section style={S.handoff}>
        <p style={S.handoffLine}>{REPORT.handoff}</p>
        <Link to="/get-journal" style={S.link}>{REPORT.handoffLink}</Link>
      </section>

      <button type="button" onClick={onReset} style={S.again}>{PAGE.again}</button>
    </div>
  );
}

const S = {
  top: { marginTop: 20, padding: '22px 18px', border: `1px solid ${C.line}`, borderRadius: 16, background: `linear-gradient(180deg, rgba(201,168,76,0.09), rgba(201,168,76,0.02))` },
  header: { color: C.mid, fontSize: 13, lineHeight: 1.6 },
  netLabel: { color: C.goldPale, fontSize: 13, marginTop: 16, letterSpacing: 0.5 },
  net: { fontSize: 38, fontWeight: 700, lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' },
  stats: { color: C.body, fontSize: 14, marginTop: 4 },
  leak: { marginTop: 18, paddingTop: 16, borderTop: `1px solid ${C.line}` },
  leakLabel: { color: C.gold, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' },
  leakLine: { color: C.cream, fontSize: 19, lineHeight: 1.55, marginTop: 4, fontWeight: 600 },
  p: { color: C.body, fontSize: 15, lineHeight: 1.7, margin: 0 },
  card: { marginTop: 16, padding: '20px 18px', background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14 },
  h2: { color: C.goldPale, fontSize: 16, margin: '0 0 10px', fontWeight: 600, fontFamily: C.sans },
  h3: { color: C.goldPale, fontSize: 14, margin: '0 0 8px', fontWeight: 600, fontFamily: C.sans },
  fact: { color: C.cream, fontSize: 15.5, lineHeight: 1.75, margin: '0 0 8px' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: 10, fontSize: 14, fontVariantNumeric: 'tabular-nums' },
  th: { textAlign: 'left', color: C.mid, fontWeight: 500, padding: '6px 4px', borderBottom: `1px solid ${C.line}` },
  thR: { textAlign: 'right', color: C.mid, fontWeight: 500, padding: '6px 4px', borderBottom: `1px solid ${C.line}` },
  td: { color: C.body, padding: '7px 4px', borderBottom: '1px solid rgba(201,168,76,0.1)' },
  tdR: { textAlign: 'right', color: C.body, padding: '7px 4px', borderBottom: '1px solid rgba(201,168,76,0.1)', whiteSpace: 'nowrap' },
  basis: { color: C.mid, fontSize: 12.5, marginTop: 10 },
  quiet: { marginTop: 22, padding: '0 2px' },
  ul: { color: C.body, fontSize: 14, lineHeight: 1.75, paddingLeft: 18, margin: 0 },
  handoff: { marginTop: 32, paddingTop: 22, borderTop: `1px solid ${C.line}` },
  handoffLine: { color: C.cream, fontSize: 16, lineHeight: 1.8, margin: 0 },
  link: { display: 'inline-block', marginTop: 10, color: C.gold, fontSize: 15, textDecoration: 'none' },
  again: { marginTop: 28, background: 'transparent', color: C.goldPale, border: `1px solid ${C.line}`, borderRadius: 10, padding: '12px 18px', fontSize: 14, cursor: 'pointer', fontFamily: C.sans },
};
