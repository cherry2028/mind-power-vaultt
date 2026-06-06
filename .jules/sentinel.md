## 2024-06-06 - Telegram API HTML Parse Mode Vulnerability
**Vulnerability:** User input was being embedded directly into a Telegram message payload while using `parse_mode: 'HTML'` in `api/save-lead.js`.
**Learning:** If a user submits malformed HTML characters (like `<` or `&`), the Telegram API strictly rejects the message payload due to the HTML parse mode, causing the lead capture process or notification process to fail completely (effectively causing a Denial of Service for that specific user's action and potentially dropping leads).
**Prevention:** Always use a utility function like `escapeHTML` to sanitize any user-controlled input before interpolating it into a message that will be sent to the Telegram API with HTML parse mode enabled.
