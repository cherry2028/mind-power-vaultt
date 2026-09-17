// Tradebook Autopsy — "the CSV never leaves the device", enforced.
// RUNS INSIDE `npm run build` (package.json): a failure fails the Vercel build.
//
//  · src/lib/tradebook is pure: relative imports only, nothing from outside it.
//  · src/pages/autopsy imports only react, react-router-dom, Seo, and the two
//    Autopsy directories. No Supabase, no api-client, no journal sync, no
//    analytics until a whitelisted payload exists (architecture doc §8).
//  · No network, storage, messaging, or remote-resource primitive appears in
//    the code at all (comments excluded).
//  · The global footer is hidden on the Autopsy routes (its copy uses banned
//    vocabulary; the page renders its own disclaimer).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIB = path.join(root, 'src/lib/tradebook');
const PAGE = path.join(root, 'src/pages/autopsy');

let pass = 0, fail = 0;
function check(name, ok, detail = '') {
  if (ok) pass++; else fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  ← ${detail}`}`);
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? walk(p) : /\.(js|jsx|mjs)$/.test(d.name) ? [p] : [];
  });
}

// Strip comments without touching string contents.
export function stripComments(src) {
  let out = '', i = 0, q = null;
  while (i < src.length) {
    const c = src[i], n = src[i + 1];
    if (q) {
      out += c;
      if (c === '\\') { out += n || ''; i += 2; continue; }
      if (c === q) q = null;
      i++; continue;
    }
    if (c === '"' || c === "'" || c === '`') { q = c; out += c; i++; continue; }
    if (c === '/' && n === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && n === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++; i += 2; continue; }
    out += c; i++;
  }
  return out;
}

const FORBIDDEN = [
  [/\bfetch\s*\(/, 'fetch('], [/XMLHttpRequest/, 'XMLHttpRequest'], [/sendBeacon/, 'sendBeacon'],
  [/WebSocket/, 'WebSocket'], [/EventSource/, 'EventSource'], [/RTCPeerConnection/, 'RTCPeerConnection'],
  [/localStorage/, 'localStorage'], [/sessionStorage/, 'sessionStorage'], [/indexedDB/i, 'indexedDB'],
  [/caches\s*\./, 'Cache API'], [/document\.cookie/, 'document.cookie'],
  [/\bsupabase\b/i, 'supabase'], [/\bgtag\b/, 'gtag'], [/dataLayer/, 'dataLayer'],
  [/serviceWorker/, 'serviceWorker'], [/postMessage/, 'postMessage'], [/window\.open/, 'window.open'],
  [/new\s+Image\b/, 'new Image'], [/\bimport\s*\(/, 'dynamic import()'], [/\brequire\s*\(/, 'require()'],
  [/<\s*(img|script|iframe|form|object|embed|link|video|audio|source)\b/, 'remote-resource element'], // lowercase = HTML tag; <Link> is a router anchor
  [/https?:\/\//i, 'absolute URL'],
];

const importsOf = (src) => [...src.matchAll(/^\s*(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|^\s*import\s*['"]([^'"]+)['"]/gm)].map((m) => m[1] || m[2]);

function resolvesInside(file, spec, dirs) {
  if (!spec.startsWith('.')) return false;
  let target = path.resolve(path.dirname(file), spec);
  return dirs.some((d) => target === d || target.startsWith(d + path.sep));
}

console.log('\n══ Imports ══');
for (const file of walk(LIB)) {
  const bad = importsOf(fs.readFileSync(file, 'utf8')).filter((s) => !resolvesInside(file, s, [LIB]));
  check(`lib is pure: ${path.relative(root, file)}`, bad.length === 0, bad.join(', '));
}
const PAGE_EXTERNAL = new Set(['react', 'react-router-dom']);
const PAGE_ALLOWED_FILES = [path.join(root, 'src/Seo')];
for (const file of walk(PAGE)) {
  const bad = importsOf(fs.readFileSync(file, 'utf8')).filter((s) =>
    !PAGE_EXTERNAL.has(s) && !resolvesInside(file, s, [LIB, PAGE]) &&
    !(s.startsWith('.') && PAGE_ALLOWED_FILES.includes(path.resolve(path.dirname(file), s).replace(/\.(jsx?|mjs)$/, ''))));
  check(`page imports allowlisted: ${path.relative(root, file)}`, bad.length === 0, bad.join(', '));
}

console.log('\n══ No network / storage / messaging primitives ══');
for (const file of [...walk(LIB), ...walk(PAGE)]) {
  const code = stripComments(fs.readFileSync(file, 'utf8'));
  const bad = FORBIDDEN.filter(([re]) => re.test(code)).map(([, label]) => label);
  check(path.relative(root, file), bad.length === 0, bad.join(', '));
}

console.log('\n══ Allowlisted outside file stays inert ══');
{
  const seo = stripComments(fs.readFileSync(path.join(root, 'src/Seo.jsx'), 'utf8'));
  const bad = FORBIDDEN.filter(([re, label]) => label !== 'remote-resource element' && label !== 'absolute URL' && re.test(seo)).map(([, l]) => l);
  check('src/Seo.jsx has no network/storage primitive', bad.length === 0, bad.join(', '));
}

console.log('\n══ Global footer hidden on Autopsy routes ══');
{
  const d = fs.readFileSync(path.join(root, 'src/components/Disclaimer.jsx'), 'utf8');
  check('Disclaimer.jsx returns null for /tradebook-autopsy and /autopsy', /pathname === '\/tradebook-autopsy'/.test(d) && /pathname === '\/autopsy'/.test(d));
}

console.log('\n══ Self-test of the scanner ══');
check('comment stripping keeps strings, drops comments', stripComments("const a = 'x // y'; // fetch(\n/* localStorage */ b") === "const a = 'x // y'; \n b", JSON.stringify(stripComments("const a = 'x // y'; // fetch(\n/* localStorage */ b")));
check('scanner catches fetch in code', FORBIDDEN.some(([re]) => re.test("fetch('/api')")));

console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
