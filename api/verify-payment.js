// /api/verify-payment.js — Verify Cashfree Payment Order Status
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { order_id } = req.body;

  if (!order_id) {
    return res.status(400).json({ error: 'Order ID is required' });
  }

  const appId = process.env.CASHFREE_APP_ID;
  const secretKey = process.env.CASHFREE_SECRET_KEY;
  const env = process.env.CASHFREE_ENV || 'PROD';

  if (!appId || !secretKey) {
    return res.status(500).json({ error: 'Payment gateway not configured' });
  }

  const apiUrl = env === 'PROD' 
    ? \`https://api.cashfree.com/pg/orders/\${order_id}\`
    : \`https://sandbox.cashfree.com/pg/orders/\${order_id}\`;

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
      // 1. In a full system, you would save this transaction to Supabase here
      // 2. Generate an access code or save user credentials
      
      const newAccessCode = \`MPV-\${Math.random().toString(36).substring(2, 8).toUpperCase()}\`;
      
      // Return success with access code
      return res.status(200).json({
        success: true,
        status: data.order_status,
        customer_email: data.customer_details.customer_email,
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
