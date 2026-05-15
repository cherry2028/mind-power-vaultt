## 2026-05-15 - [CRITICAL] Prevent SSRF and Path Traversal in API URLs
**Vulnerability:** The `order_id` parameter from the incoming request body was used directly to construct the external Cashfree API URL (`https://api.cashfree.com/pg/orders/${order_id}`) without any validation.
**Learning:** This could allow an attacker to inject path traversal sequences (like `../`) or additional URL parameters, potentially manipulating the API request to access unintended resources or trigger Server-Side Request Forgery (SSRF).
**Prevention:** Always validate user-provided input before using it to construct external API URLs. Used a strict regex (`/^[a-zA-Z0-9_.-]+$/`) to whitelist acceptable characters for the `order_id` and ensure the path cannot be altered.
