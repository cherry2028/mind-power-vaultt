// When may the "new version" prompt appear? Pure rules, no DOM, no clock of
// its own — every input is passed in, so each rule is unit-tested.
//
// The owner's rules (2026-09-19), in the order they are checked:
//   1. Never while a trade sheet or any form is open — at any hour.
//   2. Never within 15 minutes of the student's last journal write.
//   3. Otherwise, wait 10 minutes after a dismissal.
//
// There is NO time-of-day window. An earlier version blocked 09:00-15:45 IST
// to stay out of the way during market hours. That was wrong for this journal:
// it already carries crypto, forex and gold, and across the six live journals
// only 35 of 244 trades were logged between 09:00 and 15:59 — the busiest hour
// is 20:00. A student is "busy" when they are writing, not when the NSE is
// open, so rule 2 measures the student instead of the clock.
//
// Consequence worth keeping in mind: every rule is now an elapsed-time
// comparison between stamps written on the SAME device, so none of this needs
// a trusted or server-corrected clock. A device whose clock is wrong is still
// self-consistent, and a clock that JUMPS can only ever release the prompt
// early — never silence it forever (see elapsedSince).

export const QUIET_MS = 10 * 60 * 1000; // after a dismissal
export const IDLE_MS = 15 * 60 * 1000;  // after the last journal write

// ms since a stamp, or null when there is no usable stamp.
// A stamp in the future means the device clock moved backwards; it is treated
// as "no stamp" so a bad clock can never suppress the prompt permanently.
export function elapsedSince(now, stamp) {
  if (!Number.isFinite(now) || !Number.isFinite(stamp) || stamp <= 0) return null;
  const d = now - stamp;
  return d < 0 ? null : d;
}

/**
 * @param s.entryInProgress  a sheet/overlay/form is open or being typed into
 * @param s.waiting          a new service worker is installed and waiting
 * @param s.now              epoch ms (the device's own clock is fine)
 * @param s.lastWriteAt      epoch ms of the last journal write, or null
 * @param s.lastDismissedAt  epoch ms of the last ✕, or null
 * @param s.idleMs           quiet time required after a write (preview shortens it)
 * @param s.quietMs          quiet time required after a dismissal
 * @returns { show, reason }
 */
export function decidePrompt(s) {
  if (s.entryInProgress) return { show: false, reason: 'entry_in_progress' };
  if (!s.waiting) return { show: false, reason: 'no_update_waiting' };
  if (!Number.isFinite(s.now)) return { show: false, reason: 'no_clock' };

  const idle = Number.isFinite(s.idleMs) ? s.idleMs : IDLE_MS;
  const sinceWrite = elapsedSince(s.now, s.lastWriteAt);
  if (sinceWrite !== null && sinceWrite < idle) return { show: false, reason: 'recent_write' };

  const quiet = Number.isFinite(s.quietMs) ? s.quietMs : QUIET_MS;
  const sinceDismiss = elapsedSince(s.now, s.lastDismissedAt);
  if (sinceDismiss !== null && sinceDismiss < quiet) return { show: false, reason: 'quiet_period' };

  return { show: true, reason: 'idle' };
}

// Rule 1, against real documents. `docs` = the app document plus the journal
// iframe's document when reachable. Anything that looks like data entry wins:
// an open sheet or overlay, a focused field, or a visible field holding text.
// If the journal iframe exists but cannot be read, assume entry in progress.
export function entryInProgress(docs, { journalUnreadable = false } = {}) {
  if (journalUnreadable) return true;
  for (const doc of docs) {
    if (!doc) continue;
    if (doc.querySelector('.sheet.open, .ov.open, #insightOv.open, #mileOv.open, #licSheet.open, #moreSheet.open, #sharePanel.open')) return true;
    for (const id of ['pinScreen', 'onboarding', 'lockOverlay']) {
      const el = doc.getElementById(id);
      if (el && !el.classList.contains('hidden')) return true;
    }
    const strat = doc.getElementById('stratSetupOverlay');
    if (strat && strat.style && strat.style.display && strat.style.display !== 'none') return true;
    const active = doc.activeElement;
    if (active && (active.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName || ''))) {
      const type = (active.getAttribute && active.getAttribute('type')) || '';
      if (!/^(button|submit|checkbox|radio|range|color|file|reset|hidden)$/i.test(type)) return true;
    }
    const fields = doc.querySelectorAll('input, textarea');
    for (const f of fields) {
      const type = (f.getAttribute('type') || 'text').toLowerCase();
      if (/^(button|submit|checkbox|radio|range|color|file|reset|hidden)$/.test(type)) continue;
      if (f.readOnly || f.disabled) continue;
      if (!f.value || !String(f.value).trim()) continue;
      if (f.getClientRects && f.getClientRects().length === 0) continue; // not visible
      return true;
    }
  }
  return false;
}
