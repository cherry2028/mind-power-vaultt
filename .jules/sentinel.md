## 2025-05-04 - Fix Fail-Open Authorization Bypass
**Vulnerability:** The internal API endpoints (`api/analyze.js`, `api/notify.js`, `api/send-telegram.js`) used a fail-open authorization check (`if (internalKey && providedKey !== internalKey)`). If the `INTERNAL_API_KEY` environment variable was accidentally undefined or empty, the check would skip completely, allowing public unauthenticated access to the endpoints.
**Learning:** This is a classic "fail-open" pattern. Authentication logic must always fail securely ("fail-closed") if the configuration is missing or misconfigured.
**Prevention:** Always verify that an expected configuration value exists before comparing it, and block access if it doesn't: `if (!internalKey || providedKey !== internalKey)`.
