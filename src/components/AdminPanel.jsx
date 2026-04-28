import React, { useState, useEffect } from 'react';
import { G, REVIEWS_KEY, loadReviews, saveReviews } from '../utils/constants';

export default function AdminPanel({ onClose }) {
  const [reviews, setReviews] = useState(loadReviews);
  const [form, setForm] = useState({ name: "", city: "", stars: 5, te: "", en: "" });
  const [dragIdx, setDragIdx] = useState(null);

  const addReview = () => {
    if (!form.name.trim() || !form.te.trim()) return;
    const newR = { ...form, id: Date.now() };
    const updated = [newR, ...reviews];
    setReviews(updated);
    saveReviews(updated);
    setForm({ name: "", city: "", stars: 5, te: "", en: "" });
  };

  const deleteReview = (id) => {
    const updated = reviews.filter(r => r.id !== id);
    setReviews(updated);
    saveReviews(updated);
  };

  const handleDragStart = (i) => setDragIdx(i);
  const handleDragOver = (e, i) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === i) return;
    const updated = [...reviews];
    const item = updated.splice(dragIdx, 1)[0];
    updated.splice(i, 0, item);
    setReviews(updated);
    saveReviews(updated);
    setDragIdx(i);
  };

  const G2 = { black: "#05050A", gold: "#C9A84C", dark: "#0F0F16", smoke: "#F5F2EA", mid: "#D0CCBF" };
  const inp = { width: "100%", padding: "10px 14px", background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 6, color: G2.smoke, fontSize: 14, fontFamily: "'DM Sans',sans-serif", marginBottom: 8 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 1000, overflow: "auto", padding: "20px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", background: G2.dark, border: "1px solid rgba(201,168,76,0.3)", borderRadius: 12, padding: "28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <p style={{ fontSize: 11, letterSpacing: 4, color: G2.gold, textTransform: "uppercase", fontFamily: "'DM Sans',sans-serif" }}>Admin Panel</p>
            <h2 style={{ color: G2.smoke, fontSize: 20, fontFamily: "'DM Sans',sans-serif" }}>Reviews Manager</h2>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "1px solid rgba(201,168,76,0.3)", color: G2.mid, padding: "6px 16px", borderRadius: 4, cursor: "pointer" }}>Close ✕</button>
        </div>

        <div style={{ background: "rgba(201,168,76,0.05)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 8, padding: "20px", marginBottom: 24 }}>
          <p style={{ color: G2.gold, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>+ Add New Review</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <input style={inp} placeholder="Student Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <input style={inp} placeholder="City" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
          </div>
          <textarea style={{ ...inp, height: 80 }} placeholder="Telugu Review *" value={form.te} onChange={e => setForm(f => ({ ...f, te: e.target.value }))} />
          <button onClick={addReview} style={{ padding: "12px 28px", background: `linear-gradient(135deg,${G2.gold},#9A7020)`, color: G2.black, border: "none", borderRadius: 4, fontWeight: 700, cursor: "pointer" }}>Add Review ✓</button>
        </div>

        <p style={{ color: G2.gold, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Drag to reorder reviews</p>
        {reviews.map((r, i) => (
          <div key={r.id} 
            draggable 
            onDragStart={() => handleDragStart(i)}
            onDragOver={(e) => handleDragOver(e, i)}
            style={{ background: dragIdx === i ? "rgba(201,168,76,0.12)" : "rgba(255,255,255,0.03)", border: `1px solid ${dragIdx === i ? G2.gold : "rgba(201,168,76,0.15)"}`, borderRadius: 6, padding: "14px 16px", marginBottom: 8, display: "flex", gap: 12, alignItems: "flex-start", cursor: "grab" }}>
            <div style={{ color: "rgba(201,168,76,0.5)", fontSize: 20 }}>⠿</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ color: G2.smoke, fontWeight: 700, fontSize: 14 }}>{r.name} {r.city && `— ${r.city}`}</span>
                <span style={{ color: G2.gold }}>{"★".repeat(r.stars)}</span>
              </div>
              <p style={{ color: G2.mid, fontSize: 13, lineHeight: 1.6 }}>{r.te}</p>
            </div>
            <button onClick={() => deleteReview(r.id)} style={{ background: "rgba(139,26,26,0.3)", color: "#ff8080", border: "none", borderRadius: 3, padding: "4px 10px", cursor: "pointer" }}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
