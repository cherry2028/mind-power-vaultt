## 2026-06-04 - [Fix HTML Injection in Telegram Bot Notifications]
**Vulnerability:** User-provided input was interpolated directly into an HTML-formatted message string in `api/save-lead.js` before being sent to Telegram with `parse_mode: 'HTML'`. This allowed potential HTML injection that could cause API delivery failures or manipulate message rendering.
**Learning:** Even internal notification systems like Telegram bots using HTML parse modes require strict input sanitization to prevent format breaking and injection attacks.
**Prevention:** Always use a robust HTML escaping function (like `escapeHTML`) on all user-controlled data before interpolating it into HTML-formatted strings, especially when sending payloads to APIs that interpret HTML.
