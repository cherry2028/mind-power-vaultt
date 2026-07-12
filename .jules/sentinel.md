## 2026-07-02 - [Client-Side Admin Password Exposure]
**Vulnerability:** Admin password was hardcoded and accessed via Vite environment variables on the frontend.
**Learning:** Checking passwords in client-side React code via environment variables starting with VITE_ exposes the secret in the Javascript bundle, allowing anyone to bypass authentication.
**Prevention:** All authentication checks must be performed server-side using API endpoints, and sensitive credentials should never be prefixed with VITE_ or used in client-side bundles.
