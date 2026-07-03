## 2024-07-03 - [Insecure Randomness for Access Codes]
**Vulnerability:** Weak random number generation (`Math.random()`) was being used to create security access codes in `api/verify-payment.js` and `src/Journal.jsx`.
**Learning:** `Math.random()` is not cryptographically secure and its values can be predicted, potentially allowing an attacker to guess valid access codes and bypass authentication.
**Prevention:** Always use cryptographically secure pseudo-random number generators (CSPRNG) like Node's `crypto.randomBytes` or the Web Crypto API's `window.crypto.getRandomValues` for security-sensitive values like access codes, tokens, or passwords.
