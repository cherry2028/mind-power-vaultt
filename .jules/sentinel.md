## 2025-02-27 - Telegram HTML Injection & Email Injection
**Vulnerability:** Telegram APIs using `parse_mode: 'HTML'` and Resend APIs sending raw `html` will fail (DoS) or inject malicious scripts if unescaped user inputs are embedded into the payload strings.
**Learning:** Telegram strictly validates HTML entities and tags; mismatched tags or `<`/`>` signs in user inputs cause complete message rejection. Similarly, passing unsanitized inputs to email HTML bodies allows HTML injection.
**Prevention:** Always use a robust `escapeHTML()` function on all dynamic data injected into HTML contexts (emails) or remove `parse_mode` entirely and use plain text for external APIs like Telegram that lack built-in sanitization.
