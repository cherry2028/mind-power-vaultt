// /api/cron/push.js — send the daily Telugu reminders.
//
// Triggered by GitHub Actions (the Vercel Hobby plan has no usable cron), which
// calls this with the CRON_SECRET as a bearer token.
//   ?type=morning  → "earn today's license" (before market open)
//   ?type=evening  → "write tonight's mirror" (after market close)
//
// Smart suppression: a student who already did the ritual (morning) or the
// mirror (evening) today is skipped. Suppression reads the synced journal, so a
// student who worked offline and hasn't synced yet may still get a redundant
// ping — an accepted trade-off.

import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

const MESSAGES = {
  morning: {
    title: '🌅 ఈరోజు License earn చేశావా?',
    body: '60 seconds — Ritual complete చేయి',
    tag: 'mpv-morning',
  },
  evening: {
    title: '🌙 Evening Mirror ready',
    body: 'ఈరోజు నిజం రాయి.',
    tag: 'mpv-evening',
  },
};

// Today's date in IST as YYYY-MM-DD — the journal stores dates in the
// student's local (Indian) day, so the cron must compare against the same day.
export function istToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const get = (t) => parts.find((p) => p.type === t)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

// Pure so it can be unit-tested: has this student already done today's task?
export function alreadyDone(journal, type, today) {
  if (!journal) return false;
  const list = type === 'morning' ? journal.mpvpm : journal.mpveod;
  return Array.isArray(list) && list.some((entry) => entry && entry.date === today);
}

import crypto from 'crypto';

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  const auth = (req.headers['authorization'] || '').replace('Bearer ', '').trim();

  if (!secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const isTimingSafeEqual = (a, b) => {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    const aBuf = Buffer.from(a);
    const bBuf = Buffer.from(b);
    return aBuf.length === bBuf.length && crypto.timingSafeEqual(aBuf, bBuf);
  };

  if (!isTimingSafeEqual(auth, secret)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const type = String(req.query?.type || '').toLowerCase();
  if (!MESSAGES[type]) {
    return res.status(400).json({ error: 'type must be morning or evening' });
  }

  const { VAPID_PUBLIC_KEY, VITE_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  const publicKey = VAPID_PUBLIC_KEY || VITE_VAPID_PUBLIC_KEY;
  if (!publicKey || !VAPID_PRIVATE_KEY) {
    return res.status(500).json({ error: 'VAPID keys not configured' });
  }
  webpush.setVapidDetails(VAPID_SUBJECT || 'mailto:support@mindpowervaultt.com', publicKey, VAPID_PRIVATE_KEY);

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: subs, error: subErr } = await supabase
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh, auth');
  if (subErr) {
    console.error('[MPV-CRON] Failed to read subscriptions:', subErr);
    return res.status(500).json({ error: 'Failed to read subscriptions' });
  }
  if (!subs?.length) return res.status(200).json({ sent: 0, skipped: 0, removed: 0, total: 0 });

  // One round-trip for every relevant journal, then suppress in memory.
  const userIds = [...new Set(subs.map((s) => s.user_id).filter(Boolean))];
  const { data: journals } = await supabase
    .from('journal_data')
    .select('user_id, data')
    .in('user_id', userIds);
  const byUser = new Map((journals || []).map((j) => [j.user_id, j.data]));

  const today = istToday();
  const payload = JSON.stringify({ ...MESSAGES[type], url: '/portal' });

  let sent = 0, skipped = 0, removed = 0;
  const stale = [];

  await Promise.all(
    subs.map(async (s) => {
      if (alreadyDone(byUser.get(s.user_id), type, today)) { skipped++; return; }
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        );
        sent++;
      } catch (err) {
        // 404/410 = the browser dropped the subscription; stop pushing to it.
        if (err?.statusCode === 404 || err?.statusCode === 410) stale.push(s.endpoint);
        else console.warn('[MPV-CRON] push failed:', err?.statusCode, err?.body || err?.message);
      }
    })
  );

  if (stale.length) {
    await supabase.from('push_subscriptions').delete().in('endpoint', stale);
    removed = stale.length;
  }

  console.log(`[MPV-CRON] ${type} ${today}: sent=${sent} skipped=${skipped} removed=${removed}`);
  return res.status(200).json({ type, date: today, sent, skipped, removed, total: subs.length });
}
