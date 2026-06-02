## 2026-06-02 - Telegram HTML Message Injection
**Vulnerability:** User inputs (name, phone, experience, primaryPattern) were directly interpolated into a Telegram message sent with `parse_mode: 'HTML'` in `api/save-lead.js` without any sanitization.
**Learning:** Telegram API strictly validates HTML payloads. If user input contains unescaped special characters like `<` or `&`, the Telegram API will reject the request with a formatting error, causing the entire lead submission to fail. Alternatively, an attacker could inject arbitrary HTML tags.
**Prevention:** Always use a sanitization utility like `escapeHTML` to escape user-controlled data before interpolating it into formatted HTML strings (especially when interacting with external APIs like Telegram that parse HTML).
