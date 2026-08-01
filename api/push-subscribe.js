// /api/push-subscribe.js — store a student's Web Push subscription.
// SECURED: requires a valid Supabase session; the row is keyed on the verified
// auth.uid(), never on anything the client claims.

import { createClient } from '@supabase/supabase-js';
import { checkSimpleLimit } from './_lib/ratelimit.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  if (!checkSimpleLimit(ip, 20)) {
    return res.status(429).json({ error: 'Too many requests. Try again later.' });
  }

  const token = (req.headers['authorization'] || '').replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Unauthorized: No session token provided.' });

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized: Invalid or expired session.' });

  const { endpoint, keys } = req.body || {};
  if (!endpoint || typeof endpoint !== 'string') {
    return res.status(400).json({ error: 'Missing push endpoint' });
  }

  // Unsubscribe
  if (req.method === 'DELETE') {
    await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint).eq('user_id', user.id);
    return res.status(200).json({ success: true, removed: true });
  }

  if (!keys || !keys.p256dh || !keys.auth) {
    return res.status(400).json({ error: 'Missing push keys' });
  }

  const { error: dbError } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      created_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' }
  );

  if (dbError) {
    console.error('[MPV-PUSH] Failed to save subscription:', dbError);
    return res.status(500).json({ error: 'Failed to save subscription' });
  }

  console.log(`[MPV-PUSH] Subscription saved for ${user.email || user.id} from ${ip}`);
  return res.status(200).json({ success: true });
}
