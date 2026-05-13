## 2024-05-13 - SSRF & Path Traversal in Third-Party API URL Construction
**Vulnerability:** The application was concatenating the user-provided `order_id` directly into the Cashfree API URL (`https://api.cashfree.com/pg/orders/${order_id}`) without validation.
**Learning:** This could allow an attacker to use path traversal characters (e.g. `../`) to access unauthorized endpoints on the third-party API using the application's authenticated credentials (SSRF).
**Prevention:** Always validate parameters used to construct API URLs, especially IDs, against a strict whitelist or regex (e.g., `/^[a-zA-Z0-9_.-]+$/`) before making downstream HTTP requests.
