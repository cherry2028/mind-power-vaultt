## 2025-01-20 - Hardcoded Admin Password & Client-Side Auth Bypass
**Vulnerability:** Admin password was hardcoded in the frontend (`src/App.jsx`) and authentication was performed entirely client-side, exposing the secret in the client bundle and allowing trivial auth bypass.
**Learning:** Never perform authentication checks on the frontend. Sensitive credentials (like passwords) must never be hardcoded or accessed via environment variables prefixed with `VITE_` (which exposes them to the client).
**Prevention:** All authentication logic must be handled server-side, utilizing established endpoints like `/api/validate-code`, and secrets should be kept in secure backend environment variables.
