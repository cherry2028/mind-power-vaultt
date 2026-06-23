## 2024-05-18 - [Critical] Hardcoded Frontend Secrets Exposed Authentication Logic
**Vulnerability:** Found hardcoded fallback passwords in the client bundle (e.g. `mpv@kprasad2028` in `src/App.jsx` and `mpv@cherry2028`/`MPV-CHERRY-2024` in `src/Journal.jsx`), enabling client-side bypass of authentication checks.
**Learning:** Client-side components like React components shouldn't rely on `import.meta.env` for sensitive checks or include hardcoded fallbacks for access. The client can simply be inspected or debugged to view the password.
**Prevention:** Always delegate authentication to a server-side endpoint (like `/api/validate-code`) using an asynchronous check that returns a token, and keep sensitive environment variables and static codes out of frontend code entirely.
