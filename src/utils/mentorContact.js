// Public mentor WhatsApp number for the wa.me fallback (same number as the
// site's contact button — not a secret, unlike MENTOR_EMAIL which stays server-side).
export const MENTOR_WHATSAPP = (import.meta.env.VITE_MENTOR_WHATSAPP || '919059181616').replace(/\D/g, '');

export const mentorWaUrl = (text) => `https://wa.me/${MENTOR_WHATSAPP}?text=${encodeURIComponent(text)}`;
