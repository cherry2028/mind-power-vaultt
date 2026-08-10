// Feature 4 voice-note follow-up — the pure helper that maps a MediaRecorder
// MIME type to a storage file extension. Mirrors extForMime in ReviewRequest.jsx.

function extForMime(type) {
  const t = String(type || '');
  if (t.includes('mp4')) return 'mp4';
  if (t.includes('ogg')) return 'ogg';
  return 'webm';
}

let pass = 0, fail = 0;
const eq = (name, got, exp) => {
  const ok = got === exp; ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  → ${got}${ok ? '' : `  expected ${exp}`}`);
};

eq('opus webm → webm', extForMime('audio/webm;codecs=opus'), 'webm');
eq('plain webm → webm', extForMime('audio/webm'), 'webm');
eq('mp4 (Safari) → mp4', extForMime('audio/mp4'), 'mp4');
eq('ogg → ogg', extForMime('audio/ogg'), 'ogg');
eq('unknown/empty → webm fallback', extForMime(''), 'webm');
eq('null → webm fallback', extForMime(null), 'webm');

// The upload path must be uid-prefixed so the RLS own-folder check passes.
const path = (uid, type) => `${uid}/${1234}.${extForMime(type)}`;
eq('path is uid-prefixed (RLS folder check)', path('user-abc', 'audio/mp4').startsWith('user-abc/'), true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
