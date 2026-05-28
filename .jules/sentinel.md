## 2024-05-24 - [Hardcoded Admin Password & Exposed Internal API Key]
**Vulnerability:** A hardcoded admin password (`mpv@kprasad2028`) and `VITE_INTERNAL_API_KEY` were exposed in the client-side bundle in `src/App.jsx` and `src/utils/api-client.js`.
**Learning:** Client-side logic inherently exposes any variables checked locally, rendering environment variables or hardcoded values completely useless for secrets.
**Prevention:** All authentication must happen server-side, and no secret keys or passwords should ever be configured or bundled into client-facing code.
