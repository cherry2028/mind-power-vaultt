## 2024-05-30 - [Fix] Email HTML Injection in api/notify.js
**Vulnerability:** User input values (name and dynamic AI report contents) were directly interpolated into an HTML string and sent via email without proper sanitization.
**Learning:** Even though `escapeHTML` was defined and used when constructing the plain text message chunking for Telegram in `api/notify.js`, the same variables were unescaped in the Resend HTML template within the same function.
**Prevention:** Whenever manually constructing an HTML response or HTML payload containing external variables, explicitly sanitize them with utilities like `escapeHTML`.
