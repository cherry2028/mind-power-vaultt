## 2024-05-09 - [Missing Authorization on Send Report Endpoint]
**Vulnerability:** The internal endpoint `api/send-report.js` lacks an authorization check, meaning an attacker could craft HTTP POST requests to this API and consume the limited quota (Resend 100 emails/day) to spam users indiscriminately.
**Learning:** Any endpoint that consumes external services quotas, even if internal or hidden from primary workflows, needs robust authentication checks. Relying solely on client obscurity is inadequate.
**Prevention:** Implement standard JWT token validation check that enforces an authorized role to access the endpoint safely.
