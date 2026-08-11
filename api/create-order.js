import crypto from 'crypto';
import { checkSimpleLimit } from './_lib/ratelimit.js';

// /api/create-order.js — Create Cashfree Payment Order
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  if (!checkSimpleLimit(ip, 10)) {
    return res.status(429).json({ error: 'Too many requests. Try again later.' });
  }

  const { name, email, phone, coupon } = req.body;

  if (!name || !email || !phone) {
    return res.status(400).json({ error: 'Name, email, and phone are required' });
  }

  // ─── TEMPORARY TEST COUPON — DELETE AFTER CONVERSION IS VERIFIED ───
  // Makes a ₹1 order that still routes through the REAL Cashfree success flow,
  // so the journal_purchase conversion fires on a genuine payment-success. Amount
  // is decided SERVER-SIDE only (never trust a client amount). Auto-expires as a
  // backstop; remove this block + the coupon field once the test is done.
  let orderAmount = 3540; // ₹3,000 + 18% GST
  const TEST_COUPON = 'MPVTEST100';
  const TEST_COUPON_EXPIRES = Date.parse('2026-08-14T23:59:59+05:30'); // ~3 days
  if (coupon && coupon === TEST_COUPON && Date.now() < TEST_COUPON_EXPIRES) {
    orderAmount = 1; // gateways reject ₹0 — ₹1 is the minimum real payment
    console.log('[MPV-TEST-COUPON] ₹1 test order created:', name);
  }
  // ──────────────────────────────────────────────────────────────────

  const appId = process.env.CASHFREE_APP_ID;
  const secretKey = process.env.CASHFREE_SECRET_KEY;
  const env = process.env.CASHFREE_ENV || 'PROD';

  if (!appId || !secretKey) {
    return res.status(500).json({ error: 'Payment gateway not configured' });
  }

  const apiUrl = env === 'PROD' 
    ? 'https://api.cashfree.com/pg/orders' 
    : 'https://sandbox.cashfree.com/pg/orders';

  const orderId = `MPV_${Date.now()}_${crypto.randomInt(0, 1000)}`;

  const orderPayload = {
    order_id: orderId,
    order_amount: orderAmount, // 3540 normally; 1 with the test coupon
    order_currency: "INR",
    customer_details: {
      customer_id: `cust_${phone.replace(/\D/g, '').slice(-10)}`,
      customer_name: name,
      customer_email: email,
      customer_phone: phone.replace(/\D/g, '').slice(-10) // Ensure 10 digits
    },
    order_meta: {
      // return_url will be handled by the frontend SDK, but we provide a fallback
      return_url: `https://mindpowervaultt.com/portal?order_id={order_id}&status={order_status}`
    },
    order_note: "Mind Power Vaultt - Annual Access"
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': appId,
        'x-client-secret': secretKey,
        'x-api-version': '2023-08-01'
      },
      body: JSON.stringify(orderPayload)
    });

    const data = await response.json();

    if (response.ok && data.payment_session_id) {
      return res.status(200).json({
        order_id: data.order_id,
        payment_session_id: data.payment_session_id,
        environment: env
      });
    } else {
      console.error('[CASHFREE] Error creating order:', data);
      return res.status(500).json({ error: 'Failed to create payment order', details: data });
    }
  } catch (error) {
    console.error('[CASHFREE] Network/Server Error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
