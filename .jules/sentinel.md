## 2024-05-12 - Critical Vulnerability: Missing Authentication on External Quota API
**Vulnerability:** The `/api/send-report` endpoint, which triggers Resend API emails, lacked authentication. This effectively created an open email relay and left the external quota vulnerable to abuse.
**Learning:** Any API endpoint that consumes a third-party API or external quota MUST have authentication checks before executing the request, even if it's meant to be publicly accessible or used by authenticated users.
**Prevention:** Implement JWT authentication checks for all endpoints that integrate with third-party APIs (like Resend) to verify user authorization before consuming quotas.
