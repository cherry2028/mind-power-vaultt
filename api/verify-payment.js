import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { checkSimpleLimit } from './_lib/ratelimit.js';

// /api/verify-payment.js — Verify Cashfree Payment Order Status & Create Subscription
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  if (!checkSimpleLimit(ip, 10)) {
    return res.status(429).json({ error: 'Too many requests. Try again later.' });
  }

  const { order_id } = req.body;

  if (!order_id) {
    return res.status(400).json({ error: 'Order ID is required' });
  }

  // ══ SECURITY: Strict order_id validation to prevent SSRF & Path Traversal ══
  // Cashfree order IDs are ONLY alphanumeric + underscores + hyphens, max 50 chars
  const ORDER_ID_REGEX = /^[a-zA-Z0-9_-]{1,50}$/;
  if (!ORDER_ID_REGEX.test(order_id)) {
    return res.status(400).json({ error: 'Invalid order ID format.' });
  }
  // ════════════════════════════════════════════════════════════════════════════

  const appId = process.env.CASHFREE_APP_ID;
  const secretKey = process.env.CASHFREE_SECRET_KEY;
  const env = process.env.CASHFREE_ENV || 'PROD';

  if (!appId || !secretKey) {
    return res.status(500).json({ error: 'Payment gateway not configured' });
  }

  // SECURITY: Use encodeURIComponent to safely embed order_id in URL
  const baseUrl = env === 'PROD'
    ? 'https://api.cashfree.com/pg/orders/'
    : 'https://sandbox.cashfree.com/pg/orders/';
  const apiUrl = baseUrl + encodeURIComponent(order_id);

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'x-client-id': appId,
        'x-client-secret': secretKey,
        'x-api-version': '2023-08-01'
      }
    });

    const data = await response.json();

    if (response.ok && data.order_status === 'PAID') {
      const customerEmail = data.customer_details.customer_email;
      const newAccessCode = `MPV-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      
      // Save Subscription to Supabase
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
      
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // 1 Year Expiry
        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);

        const { error: dbError } = await supabase.from('subscriptions').upsert({
          email: customerEmail,
          name: data.customer_details.customer_name || 'Trader',
          phone: data.customer_details.customer_phone || '',
          access_code: newAccessCode,
          expires_at: expiresAt.toISOString(),
          status: 'active'
        }, { onConflict: 'email' });

        if (dbError) {
          console.error('[SUPABASE] Failed to save subscription:', dbError);
        }
      } else {
        console.warn('[SUPABASE] Environment variables missing. Skipping DB insert.');
      }
      
      return res.status(200).json({
        success: true,
        status: data.order_status,
        customer_email: customerEmail,
        access_code: newAccessCode
      });
    } else {
      return res.status(200).json({
        success: false,
        status: data.order_status || 'UNKNOWN'
      });
    }
  } catch (error) {
    console.error('[CASHFREE VERIFY] Error:', error);
    return res.status(500).json({ error: 'Failed to verify payment', details: error.message });
  }
}
