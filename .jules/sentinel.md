## 2024-05-25 - [HTML Injection in Notification Templates]
**Vulnerability:** Unsanitized user inputs injected directly into HTML payloads for Emails (Resend) and Telegram (`parse_mode: HTML`). This allowed arbitrary HTML injection in the case of emails and caused Telegram APIs to reject malformed HTML payloads.
**Learning:** HTML injection issues can cause both phishing/content spoofing vectors in email contexts and Denial of Service (DoS) side-effects in third-party messaging integrations that validate HTML structure.
**Prevention:** Always use an `escapeHTML` helper to sanitize external/untrusted string inputs when interpolating values into HTML string templates or configuring message parsers.
