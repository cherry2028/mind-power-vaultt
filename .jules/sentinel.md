## 2024-06-24 - [HTML Injection in Telegram Messages]
**Vulnerability:** User inputs (name, phone, experience, profile pattern) in the `api/save-lead.js` endpoint were directly embedded into a Telegram message payload with `parse_mode: 'HTML'` without any sanitization.
**Learning:** Sending unsanitized user inputs in Telegram messages with HTML parsing enabled allows malicious users to inject HTML tags or cause delivery failures when unescaped special characters (e.g. `<` or `&`) violate the HTML constraints of the Telegram API.
**Prevention:** Always sanitize dynamic, user-provided inputs using an `escapeHTML` function before inserting them into string literals sent to Telegram when `parse_mode: 'HTML'` is used, or omit `parse_mode` entirely if plain text is sufficient.
