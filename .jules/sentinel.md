## 2026-06-19 - VITE_ Prefix Environment Variable Exposure
**Vulnerability:** The project prefixed an internal API key with `VITE_` (`VITE_INTERNAL_API_KEY`) and accessed it via `import.meta.env` in client-side code (`src/utils/api-client.js` and `src/App.jsx`).
**Learning:** Any environment variable prefixed with `VITE_` is automatically statically embedded into the client-side JavaScript bundle during the build process, making it public to anyone who inspects the network requests or source code.
**Prevention:** Never prefix sensitive backend secrets or internal API keys with `VITE_` if they are not meant to be public. Handle authentication and authorization server-side and remove client-side references to internal keys.
