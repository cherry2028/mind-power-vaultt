// Admin review writes go through /api/admin-reviews, which runs with the
// service-role key server-side and verifies the admin JWT. The browser never
// writes to the reviews table directly, so the table needs no write policy at
// all — see api/admin-reviews.js.
async function adminReviews(op, body = {}) {
  const token = sessionStorage.getItem('mpv_admin_token') || '';
  const res = await fetch('/api/admin-reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ op, ...body }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  adminReviews,

  // Upload via a one-time signed URL minted by the server, so large voice
  // notes are not limited by the serverless request body size.
  async adminUpload(bucket, file) {
    const { path, token, publicUrl } = await adminReviews('uploadUrl', { bucket, fileName: file.name });
    const { supabase } = await import('../supabase');
    const { error } = await supabase.storage.from(bucket).uploadToSignedUrl(path, token, file);
    if (error) throw new Error(error.message);
    return { path, publicUrl };
  },

  async validateCode(code, type = 'access') {
    const res = await fetch('/api/validate-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, type })
    });
    return res.json();
  },

  async verifySession(token) {
    try {
      const res = await fetch('/api/verify-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      return res.json();
    } catch { return { valid: false }; }
  },

  async saveLead(payload) {
    const res = await fetch('/api/save-lead', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Lead submission failed');
    return data;
  },

  async sendTelegram(message) {
    const res = await fetch('/api/send-telegram', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message })
    });
    return res.json();
  },

  async notify(data) {
    const res = await fetch('/api/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Notify request failed');
    return json;
  },

  async analyze(choiceDescriptions, lang) {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ choiceDescriptions, lang })
    });
    if (!res.ok) throw new Error('Analysis failed');
    return res.json();
  }
};
