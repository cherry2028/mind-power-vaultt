import crypto from 'crypto';
import { checkSimpleLimit } from './_lib/ratelimit.js';
import { logEvent } from './_lib/logger.js';

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
    logEvent('create-order_rate_blocked', { ip });
    return res.status(429).json({ error: 'Too many requests. Try again later.' });
  }

  const { name, email, phone } = req.body;

  if (!name || !email || !phone) {
    return res.status(400).json({ error: 'Name, email, and phone are required' });
  }

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
    order_amount: 3540, // 3000 + 18% GST (540)
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
