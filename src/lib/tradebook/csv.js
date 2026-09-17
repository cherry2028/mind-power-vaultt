// CSV text → rows[][] (RFC 4180: quoted fields, "" escapes, CRLF/LF/CR).
//
// Hand-written on purpose instead of PapaParse: PapaParse ships XHR download
// and worker code in the bundle, and this page promises the file never leaves
// the device. ~50 lines we can read end to end is the easier promise to keep.

// Pick the delimiter that splits the first lines most consistently.
export function sniffDelimiter(text) {
  const lines = text.split(/\r\n|\n|\r/).filter((l) => l.trim()).slice(0, 10);
  let best = ',', bestScore = -1;
  for (const d of [',', ';', '\t', '|']) {
    const counts = lines.map((l) => l.split(d).length - 1);
    const max = Math.max(0, ...counts);
    if (!max) continue;
    // lines sharing the most common non-zero count
    const score = counts.filter((c) => c === max).length * max;
    if (score > bestScore) { best = d; bestScore = score; }
  }
  return best;
}

export function parseCsv(text) {
  if (typeof text !== 'string') return [];
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // BOM
  const d = sniffDelimiter(text);
  const rows = [];
  let row = [], field = '', i = 0, quoted = false;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        quoted = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"' && field === '') { quoted = true; i++; continue; }
    if (c === d) { row.push(field); field = ''; i++; continue; }
    if (c === '\r' || c === '\n') {
      row.push(field); rows.push(row); row = []; field = '';
      if (c === '\r' && text[i + 1] === '\n') i++;
      i++; continue;
    }
    field += c; i++;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.map((r) => r.map((v) => v.trim()));
}
