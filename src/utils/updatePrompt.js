// When may the "new version" prompt appear? Pure rules, no DOM, no clock of
// its own — every input is passed in, so each rule is unit-tested.
//
// The owner's rules (2026-09-17), in the order they are checked:
//   1. Never while a trade sheet or any form is open — at any hour.
//   2. Never between 09:00 and 15:45 IST. During market hours the journal
//      must not interrupt, not even once.
//   3. The first foreground return after 15:45 shows it, regardless of any
//      quiet period — the trader is done and reviewing.
//   4. Otherwise (outside market hours) wait 10 minutes after a dismissal.
//
// Time is IST computed from a server-corrected clock, never the device's
// timezone setting. If the clock cannot be trusted, the prompt stays hidden:
// a wrong clock must never put the prompt inside market hours.

export const IST_OFFSET_MIN = 330;          // IST = UTC+05:30, no daylight saving
export const MARKET_BLOCK_START = 9 * 60;   // 09:00 IST
export const MARKET_BLOCK_END = 15 * 60 + 45; // 15:45 IST (exclusive)
export const QUIET_MS = 10 * 60 * 1000;
export const CLOCK_SKEW_LIMIT_MS = 5 * 60 * 1000; // beyond this the device clock is "clearly off"
export const CLOCK_MEASURE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const MIN_MS = 60 * 1000;
const DAY_MIN = 24 * 60;

// Minutes since IST midnight, from epoch milliseconds. No Intl, no device TZ.
export function istMinutes(epochMs) {
  const m = Math.floor(epochMs / MIN_MS) + IST_OFFSET_MIN;
  return ((m % DAY_MIN) + DAY_MIN) % DAY_MIN;
}

// IST calendar day number (days since 1970-01-01 IST).
export function istDay(epochMs) {
  return Math.floor((Math.floor(epochMs / MIN_MS) + IST_OFFSET_MIN) / DAY_MIN);
}

export function isMarketBlocked(epochMs) {
  const m = istMinutes(epochMs);
  return m >= MARKET_BLOCK_START && m < MARKET_BLOCK_END;
}

// The after-close window runs from 15:45 IST to 09:00 IST the next morning.
// Its key is the IST day whose close it follows, so 07:00 on Tuesday belongs
// to Monday's close. null during market hours.
export function afterCloseKey(epochMs) {
  const m = istMinutes(epochMs);
  if (m >= MARKET_BLOCK_END) return istDay(epochMs);
  if (m < MARKET_BLOCK_START) return istDay(epochMs) - 1;
  return null;
}

// Replace the time of day (IST) of epochMs — preview-only test hook ("HH:MM").
export function withIstTime(epochMs, hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || '');
  if (!m) return epochMs;
  const target = Number(m[1]) * 60 + Number(m[2]);
  if (target >= DAY_MIN || Number(m[2]) > 59) return epochMs;
  return epochMs + (target - istMinutes(epochMs)) * MIN_MS - (epochMs % MIN_MS);
}

// Parse "YYYYMMDD.HHMM-sha" (the BUILD_ID stamp, UTC on Vercel) → epoch ms.
export function buildTime(buildId) {
  const m = /^(\d{4})(\d{2})(\d{2})\.(\d{2})(\d{2})/.exec(buildId || '');
  if (!m) return null;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
}

/**
 * Which time can we trust?
 * @param deviceNow   Date.now()
 * @param skew        { skewMs, measuredAt } | null — serverTime − deviceTime, measured from an HTTP Date header
 * @param buildId     running BUILD_ID (a build can never be newer than "now")
 * @returns { now: epochMs | null, reason }
 */
export function trustedNow(deviceNow, skew, buildId) {
  // measuredAt is the DEVICE time of the measurement; if the device clock has
  // since moved by more than a day either way, the measurement is useless.
  const fresh = skew && Number.isFinite(skew.skewMs) && Number.isFinite(skew.measuredAt)
    && Math.abs(deviceNow - skew.measuredAt) <= CLOCK_MEASURE_MAX_AGE_MS;
  if (fresh) {
    return { now: deviceNow + skew.skewMs, reason: Math.abs(skew.skewMs) > CLOCK_SKEW_LIMIT_MS ? 'server_corrected' : 'server_confirmed' };
  }
  // No recent server measurement (e.g. offline). The device clock alone is
  // only believed if it is not provably wrong: it cannot be earlier than the
  // build we are running, nor absurdly later.
  const bt = buildTime(buildId);
  if (bt !== null && (deviceNow < bt - CLOCK_SKEW_LIMIT_MS || deviceNow > bt + 400 * 24 * 60 * MIN_MS)) {
    return { now: null, reason: 'clock_clearly_off' };
  }
  return { now: null, reason: 'clock_unverified' };
}

/**
 * @param s.entryInProgress  a sheet/overlay/form is open or being typed into
 * @param s.waiting          a new service worker is installed and waiting
 * @param s.now              trusted epoch ms, or null
 * @param s.lastDismissedAt  epoch ms of the last ✕, or null
 * @param s.shownAfterClose  afterCloseKey already used for the rule-3 prompt, or null
 * @param s.quietMs          quiet period (preview builds shorten it)
 * @returns { show, reason, markAfterClose }
 */
export function decidePrompt(s) {
  if (s.entryInProgress) return { show: false, reason: 'entry_in_progress', markAfterClose: null };
  if (!s.waiting) return { show: false, reason: 'no_update_waiting', markAfterClose: null };
  if (s.now === null || s.now === undefined) return { show: false, reason: 'clock_untrusted', markAfterClose: null };
  if (isMarketBlocked(s.now)) return { show: false, reason: 'market_hours', markAfterClose: null };
  const key = afterCloseKey(s.now);
  if (key !== null && s.shownAfterClose !== key) {
    return { show: true, reason: 'first_after_close', markAfterClose: key };
  }
  const quiet = Number.isFinite(s.quietMs) ? s.quietMs : QUIET_MS;
  if (s.lastDismissedAt && s.now - s.lastDismissedAt >= 0 && s.now - s.lastDismissedAt < quiet) {
    return { show: false, reason: 'quiet_period', markAfterClose: null };
  }
  return { show: true, reason: 'outside_market_hours', markAfterClose: null };
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
