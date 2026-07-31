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
## 2026-07-03 - [Missing Rate Limiting on Third-Party Proxies (DoW Prevention)]
**Vulnerability:** Several API endpoints acting as proxies to external third-party services (like Resend in `api/send-report.js` and `api/notify.js`, Groq in `api/analyze.js`, and Cashfree in `api/create-order.js`) lacked proper rate limiting.
**Learning:** Exposing third-party API proxies without rate limits leaves the application vulnerable to Denial of Wallet (DoW) attacks or quota exhaustion, where attackers can script repeated requests to consume paid API credits or free tiers rapidly.
**Prevention:** Always implement IP-based rate limiting (e.g., using a utility like `checkSimpleLimit`) on all public-facing or authenticated endpoints that trigger external API calls or perform resource-intensive tasks.
## 2024-08-01 - [Insecure JWT Signature Verification (Timing Attack)]
**Vulnerability:** JWT signature verification in `api/_lib/jwt.js` used a standard equality operator (`!==`) to compare the provided signature against the expected signature.
**Learning:** Using standard string comparison for security-sensitive hashes or signatures allows attackers to perform timing attacks. They can observe the response time variations (which fail faster when an early character mismatches) to guess the signature byte by byte.
**Prevention:** Always use constant-time comparison functions like Node's `crypto.timingSafeEqual` for comparing sensitive hashes, tokens, or signatures. Ensure the lengths of the buffers match prior to comparison to avoid `RangeError` exceptions.
