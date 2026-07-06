## 2024-07-06 - [Insecure Randomness]
**Vulnerability:** Used `Math.random()` to generate sensitive identifiers (Cashfree order IDs, Supabase student access codes, device IDs, and uploaded file names) across backend API and frontend components.
**Learning:** `Math.random()` is not a Cryptographically Secure Pseudo-Random Number Generator (CSPRNG), meaning attackers can potentially predict the generated values, leading to session hijacking, ID spoofing, or unauthorized access.
**Prevention:** Always use Node.js `crypto` (`crypto.randomInt()`, `crypto.randomBytes()`, `crypto.randomUUID()`) for backend operations and `window.crypto.getRandomValues()` or `window.crypto.randomUUID()` for frontend components when generating identifiers or tokens.
