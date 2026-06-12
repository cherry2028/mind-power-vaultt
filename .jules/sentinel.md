## 2024-06-12 - [HTML Injection in Serverless API Notifications]
**Vulnerability:** Unsanitized user inputs and API responses were being injected directly into Telegram message templates (with `parse_mode: 'HTML'`) and Resend email HTML payloads.
**Learning:** Even when the backend acts as a proxy for third-party notifications, passing unescaped data into templates intended for external rendering (like Telegram HTML parsing or email HTML clients) exposes the system to HTML Injection and potential message delivery failures due to malformed tags.
**Prevention:** All user-controlled variables and external API inputs interpolated into HTML-based templates or third-party message bodies must be strictly sanitized using an HTML escaping utility function (e.g., `escapeHTML`) before interpolation.
