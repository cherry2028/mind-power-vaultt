## 2024-05-14 - Prevent SSRF & Path Traversal in API
**Vulnerability:** The `api/verify-payment.js` Vercel function used unvalidated user input (`order_id`) to directly construct a backend API URL for Cashfree, which could allow Server-Side Request Forgery (SSRF) and Path Traversal if a malicious user provided a crafted ID like `../../something`.
**Learning:** External API URLs constructed in serverless functions using user input must always validate the structure of the parameter.
**Prevention:** Always validate external parameter format using regex (e.g., `/^[a-zA-Z0-9_.-]+$/`) or a whitelist before interpolating them into HTTP client requests.
