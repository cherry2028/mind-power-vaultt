const INTERNAL_KEY = import.meta.env.VITE_INTERNAL_API_KEY || '';

export const api = {
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
        'Content-Type': 'application/json',
        ...(INTERNAL_KEY ? { 'x-internal-key': INTERNAL_KEY } : {})
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
        'Content-Type': 'application/json',
        ...(INTERNAL_KEY ? { 'x-internal-key': INTERNAL_KEY } : {})
      },
      body: JSON.stringify({ message })
    });
    return res.json();
  },

  async notify(data) {
    const res = await fetch('/api/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(INTERNAL_KEY ? { 'x-internal-key': INTERNAL_KEY } : {})
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
        'Content-Type': 'application/json',
        ...(INTERNAL_KEY ? { 'x-internal-key': INTERNAL_KEY } : {})
      },
      body: JSON.stringify({ choiceDescriptions, lang })
    });
    if (!res.ok) throw new Error('Analysis failed');
    return res.json();
  }
};
