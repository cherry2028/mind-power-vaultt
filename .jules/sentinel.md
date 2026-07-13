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
## 2025-06-25 - [Removed Hardcoded Internal API Key Exposure in Client-Side Bundle]
**Vulnerability:** The VITE_INTERNAL_API_KEY environment variable was being used in `src/utils/api-client.js` and `src/App.jsx`. Because Vite automatically bundles environment variables prefixed with `VITE_` into the client-side JavaScript, this secret key was publicly exposed.
**Learning:** Prefixing backend secrets with `VITE_` directly exposes them to the public in Vite applications. Vercel same-origin protections already handle the authorization for these frontend-to-backend API calls (as noted in the backend serverless functions themselves). Therefore, the API key injection in the frontend requests was unnecessary and presented a major risk of leaking the internal key.
**Prevention:** Never use the `VITE_` prefix for secrets or internal API keys. Rely on appropriate server-side configurations, same-origin policies, and proper authentication flows instead of hardcoding API keys in frontend bundles.
## 2026-07-13 - [Missing Rate Limiting on External APIs]
**Vulnerability:** Endpoints acting as proxies to third-party services (like Resend, Groq, Cashfree, Telegram) such as `api/send-report.js`, `api/analyze.js`, `api/notify.js`, and `api/create-order.js` lacked rate limiting checks.
**Learning:** Even if endpoints don't expose secrets to the client, failing to rate limit endpoints that consume external services opens the application to Denial of Wallet (DoW) attacks and quota exhaustion by malicious actors spamming requests.
**Prevention:** Always implement IP-based rate limiting (e.g., using `checkSimpleLimit`) on endpoints that trigger external side effects or consume external API quotas, especially when they are unauthenticated.
