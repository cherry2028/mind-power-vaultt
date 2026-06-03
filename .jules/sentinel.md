## 2024-06-03 - [Email HTML Injection via Template Literals]
**Vulnerability:** The `api/notify.js` endpoint constructed an HTML email body (`emailHtml`) using direct string interpolation of user-controlled variables (e.g., `name`, `report.primaryPattern`, etc.) without escaping them.
**Learning:** This exposes the application to Email HTML Injection, where an attacker could exploit the public form submission endpoint to send arbitrary HTML content (like phishing links or malicious formatting) from the application's verified sending domain (`mindpowervaultt.com`).
**Prevention:** Always apply the existing `escapeHTML()` utility function to all dynamically interpolated user inputs when constructing HTML structures, including email templates.
