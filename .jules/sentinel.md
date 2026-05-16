## 2024-05-18 - Input Validation on External API Parameter
**Vulnerability:** Server-Side Request Forgery (SSRF) and Path Traversal risk in `api/verify-payment.js` due to unsanitized user-provided `order_id` being directly interpolated into an external API URL.
**Learning:** Vercel serverless functions that act as proxies or communicate with third-party APIs (like Cashfree) are vulnerable to SSRF if the dynamic parts of the URL are constructed with unsanitized user input. For instance, passing `../orders` could traverse the API endpoint paths.
**Prevention:** Always strictly validate user-provided parameters used in external URLs against a whitelist or rigid regex (e.g., `/^[a-zA-Z0-9_.-]+$/`) before making `fetch` calls. Return an early 400 response if validation fails.
