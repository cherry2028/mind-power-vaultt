// Admin-only writes for the reviews table + their media.
//
// WHY THIS EXISTS: the admin panel used to write straight from the browser with
// the ANON key, and the admin's identity is a CUSTOM JWT (from
// /api/validate-code) that Postgres knows nothing about. So RLS saw a plain
// anonymous visitor. The only way to make those writes succeed client-side was
// an "anon can insert" policy — which, because the anon key is public in the
// JS bundle, would let anyone on the internet forge or DELETE the testimonials.
//
// So writes move here. This runs server-side with SUPABASE_SERVICE_ROLE_KEY
// (which bypasses RLS and never leaves the server) and is gated on a valid
// admin JWT. That means the reviews table needs NO write policy at all: the
// absence of one is the lock, and this endpoint is the only door.
//
// Uploads use a SIGNED UPLOAD URL rather than proxying the file, so a long
// voice note is not capped by the serverless request body limit — the browser
// PUTs straight to storage using a one-time credential minted here.
import { createClient } from '@supabase/supabase-js';
import { verifyJWT } from './_lib/jwt.js';
import { checkSimpleLimit } from './_lib/ratelimit.js';

const BUCKETS = new Set(['audio_reviews', 'review_images']);

// Only these columns may be written — a caller cannot set `id` or invent
// columns even with a valid admin token.
const FIELDS = ['name', 'city', 'stars', 'te', 'en', 'type', 'audio_url', 'image_url', 'order_index', 'featured'];

function pick(src) {
  const out = {};
  for (const k of FIELDS) if (src && src[k] !== undefined) out[k] = src[k];
  if (out.stars !== undefined) out.stars = Math.max(1, Math.min(5, Number(out.stars) || 5));
  if (out.featured !== undefined) out.featured = !!out.featured;
  for (const k of ['name', 'city', 'te', 'en']) {
    if (typeof out[k] === 'string') out[k] = out[k].slice(0, 2000);
  }
  return out;
}

// Keep uploads to a predictable, traversal-free name.
function safeName(name) {
  return String(name || 'file')
    .replace(/[^A-Za-z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(-80);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  if (!checkSimpleLimit(`admrev_${ip}`, 60)) {
    return res.status(429).json({ error: 'Too many requests. Try again later.' });
  }

  const { JWT_SECRET, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  if (!JWT_SECRET || !SUPABASE_SERVICE_ROLE_KEY || !supabaseUrl) {
    console.error('[MPV-ADMIN-REVIEWS] server not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // ── Admin gate ──────────────────────────────────────────────────────────
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return res.status(401).json({ error: 'Admin login required' });
  const payload = verifyJWT(token, JWT_SECRET);
  if (!payload || payload.role !== 'admin') {
    console.warn('[MPV-ADMIN-REVIEWS] rejected non-admin token from', ip);
    return res.status(403).json({ error: 'Admin access required' });
  }

  const supabase = createClient(supabaseUrl, SUPABASE_SERVICE_ROLE_KEY);
  const { op } = req.body || {};

  try {
    // Mint a one-time upload credential; the browser PUTs the file itself.
    if (op === 'uploadUrl') {
      const { bucket, fileName } = req.body || {};
      if (!BUCKETS.has(bucket)) return res.status(400).json({ error: 'Unknown bucket' });
      const path = `${Date.now()}_${safeName(fileName)}`;
      const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);
      if (error) throw new Error(error.message);
      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
      return res.status(200).json({ path, token: data.token, signedUrl: data.signedUrl, publicUrl: pub.publicUrl });
    }

    if (op === 'create') {
      const row = pick(req.body.review);
      if (!row.name) return res.status(400).json({ error: 'Name is required' });
      const { data, error } = await supabase.from('reviews').insert([row]).select();
      if (error) throw new Error(error.message);
      return res.status(200).json({ review: data && data[0] });
    }

    if (op === 'update') {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'id is required' });
      const { data, error } = await supabase.from('reviews').update(pick(req.body.patch)).eq('id', id).select();
      if (error) throw new Error(error.message);
      return res.status(200).json({ review: data && data[0] });
    }

    // Reordering — one call instead of a request per row.
    if (op === 'reorder') {
      const items = Array.isArray(req.body.items) ? req.body.items : [];
      for (const it of items) {
        if (!it || it.id === undefined) continue;
        const { error } = await supabase.from('reviews')
          .update({ order_index: Number(it.order_index) || 0 }).eq('id', it.id);
        if (error) throw new Error(error.message);
      }
      return res.status(200).json({ updated: items.length });
    }

    if (op === 'delete') {
      const { id, storagePaths } = req.body;
      if (!id) return res.status(400).json({ error: 'id is required' });
      // Remove the media too, so deleting a review doesn't orphan a voice note.
      for (const sp of Array.isArray(storagePaths) ? storagePaths : []) {
        if (sp && BUCKETS.has(sp.bucket) && sp.path) {
          await supabase.storage.from(sp.bucket).remove([sp.path]).catch(() => {});
        }
      }
      const { error } = await supabase.from('reviews').delete().eq('id', id);
      if (error) throw new Error(error.message);
      return res.status(200).json({ deleted: id });
    }

    return res.status(400).json({ error: 'Unknown op' });
  } catch (err) {
    console.error('[MPV-ADMIN-REVIEWS]', op, err?.message);
    return res.status(500).json({ error: err.message || 'Request failed' });
  }
}
