## 2025-05-29 - Telegram HTML Injection
**Vulnerability:** User input was dynamically concatenated into a Telegram `sendMessage` payload using `parse_mode: 'HTML'` without sanitization in `api/save-lead.js`.
**Learning:** Telegram strictly parses HTML and rejects invalid syntax, making the integration vulnerable to DoS or HTML Injection if user input contains unescaped characters like `<` or `&`.
**Prevention:** Always sanitize/escape dynamic variables using an `escapeHTML` helper before interpolating them into HTML strings for Telegram.
