## 2026-07-02 - [Client-Side Admin Password Exposure]
**Vulnerability:** Admin password was hardcoded and accessed via Vite environment variables on the frontend.
**Learning:** Checking passwords in client-side React code via environment variables starting with VITE_ exposes the secret in the Javascript bundle, allowing anyone to bypass authentication.
**Prevention:** All authentication checks must be performed server-side using API endpoints, and sensitive credentials should never be prefixed with VITE_ or used in client-side bundles.
## 2024-11-23 - [HTML Injection in APIs]
**Vulnerability:** User inputs (name, phone, dynamically generated LLM report) were being directly interpolated into HTML strings for Emails (Resend) and Telegram messages (`parse_mode: 'HTML'`) without sanitization in `api/notify.js` and `api/save-lead.js`.
**Learning:** Even internal notification systems (like sending a lead to a Slack/Telegram bot or an email report) are susceptible to HTML injection if the transport mechanism relies on HTML formatting. In Telegram's case, unescaped characters like `<` or `&` when `parse_mode: 'HTML'` is set will actually cause the API to reject the message entirely, leading to silent failures and lost leads.
**Prevention:** Always sanitize dynamically interpolated strings using a utility like `escapeHTML` when constructing HTML payloads, or strictly use plain text / parameterized systems where possible.
## 2024-07-06 - [Insecure Randomness]
**Vulnerability:** Used `Math.random()` to generate sensitive identifiers (Cashfree order IDs, Supabase student access codes, device IDs, and uploaded file names) across backend API and frontend components.
**Learning:** `Math.random()` is not a Cryptographically Secure Pseudo-Random Number Generator (CSPRNG), meaning attackers can potentially predict the generated values, leading to session hijacking, ID spoofing, or unauthorized access.
**Prevention:** Always use Node.js `crypto` (`crypto.randomInt()`, `crypto.randomBytes()`, `crypto.randomUUID()`) for backend operations and `window.crypto.getRandomValues()` or `window.crypto.randomUUID()` for frontend components when generating identifiers or tokens.
