import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { api } from './utils/api-client';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableItem({ id, r, moveUp, moveDown, index, totalLength, deleteReview, G2 }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(201,168,76,0.15)",
    borderRadius: 6,
    padding: "14px 16px",
    marginBottom: 8,
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0, alignItems: "center" }}>
        <span {...attributes} {...listeners} style={{ fontSize: 16, color: "rgba(201,168,76,0.5)", cursor: "grab", lineHeight: 1 }}>⠿</span>
        <button onClick={() => moveUp(index)} disabled={index === 0} style={{ background: "rgba(201,168,76,0.15)", border: "none", color: G2.gold, cursor: "pointer", borderRadius: 3, padding: "1px 7px", fontSize: 11, opacity: index === 0 ? 0.3 : 1 }}>↑</button>
        <button onClick={() => moveDown(index)} disabled={index === totalLength - 1} style={{ background: "rgba(201,168,76,0.15)", border: "none", color: G2.gold, cursor: "pointer", borderRadius: 3, padding: "1px 7px", fontSize: 11, opacity: index === totalLength - 1 ? 0.3 : 1 }}>↓</button>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div style={{display: "flex", alignItems: "center", gap: 10}}>
            <span style={{ color: G2.smoke, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", fontSize: 14 }}>{r.name} — {r.city}</span>
          </div>
          <span style={{ color: G2.gold }}>{"★".repeat(r.stars)}</span>
        </div>
        
        {r.image_url && r.image_url.split(",").map((url, idx) => (
          <img key={idx} src={url} alt="Review Screenshot" style={{width: "100%", borderRadius: 4, marginBottom: 8, border: `1px solid ${G2.gold}`}} />
        ))}
        
        {r.type === 'audio' && r.audio_url && (
          <div style={{marginBottom: 10, marginTop: 8}}>
            <audio controls src={r.audio_url} style={{height: 30, width: "100%"}}></audio>
          </div>
        )}

        {r.te && <p style={{ color: G2.mid, fontSize: 13, lineHeight: 1.6 }}>{r.te}</p>}
        {r.en && <p style={{ color: "rgba(200,196,188,0.5)", fontSize: 12, marginTop: 4, fontStyle: "italic" }}>{r.en}</p>}
      </div>
      <button onClick={() => deleteReview(r.id)} style={{ background: "rgba(139,26,26,0.3)", border: "none", color: "#ff8080", cursor: "pointer", borderRadius: 3, padding: "4px 10px", flexShrink: 0, fontFamily: "'DM Sans',sans-serif" }}>Delete</button>
    </div>
  );
}

export default function AdminPanel({ onClose }) {
  const [reviews, setReviews] = useState([]);
  const [form, setForm] = useState({ name: "", city: "", stars: 5, te: "", en: "" });
  const [audioFile, setAudioFile] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const G2 = { black: "#05050A", gold: "#C9A84C", dark: "#0F0F16", smoke: "#F5F2EA", mid: "#D0CCBF" };
  const inp = { width: "100%", padding: "10px 14px", background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 6, color: G2.smoke, fontSize: 14, fontFamily: "'DM Sans',sans-serif", marginBottom: 8 };

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('reviews').select('*').order('order_index', { ascending: true });
    if (!error && data) {
      setReviews(data);
    }
    setLoading(false);
  };

  const handleAudioChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setAudioFile(e.target.files[0]);
    }
  };

  const handleImageChange = (e) => {
    if (e.target.files) {
      setImageFiles(Array.from(e.target.files));
    }
  };

  const addReview = async () => {
    if (!form.name.trim()) return alert("Name is required");
    if (!audioFile && !form.te.trim()) return alert("Either a Text Review or an Audio File is required");

    setUploading(true);
    let audioUrl = null;
    let imageUrl = null;
    let reviewType = 'text';

    try {
      if (imageFiles && imageFiles.length > 0) {
        const uploadedUrls = [];
        for (const file of imageFiles) {
          const { publicUrl } = await api.adminUpload('review_images', file);
          uploadedUrls.push(publicUrl);
        }
        if (uploadedUrls.length > 0) imageUrl = uploadedUrls.join(",");
      }

      if (audioFile) {
        const { publicUrl } = await api.adminUpload('audio_reviews', audioFile);
        audioUrl = publicUrl;
        reviewType = 'audio';
      }

      const newIndex = reviews.length > 0 ? Math.max(...reviews.map(r => r.order_index)) + 1 : 0;

      const { review } = await api.adminReviews('create', {
        review: {
          name: form.name,
          city: form.city,
          stars: form.stars,
          te: form.te,
          en: form.en,
          type: reviewType,
          audio_url: audioUrl,
          image_url: imageUrl,
          order_index: newIndex,
        },
      });

      if (review) {
        setReviews([...reviews, review]);
        setForm({ name: "", city: "", stars: 5, te: "", en: "" });
        setAudioFile(null);
        setImageFiles([]);
        if (document.getElementById('audioInput')) document.getElementById('audioInput').value = '';
        if (document.getElementById('imageInput')) document.getElementById('imageInput').value = '';
      }
    } catch (err) {
      alert("Error adding review: " + err.message);
    }
    setUploading(false);
  };

  const deleteReview = async (id) => {
    if(!window.confirm("Are you sure you want to delete this review?")) return;
    
    // Hand the server the media paths so the voice note / scanned letters are
    // removed along with the row instead of being orphaned in storage.
    const review = reviews.find(r => r.id === id);
    const storagePaths = [];
    const pathOf = (url) => { try { return new URL(url).pathname.split('/').pop(); } catch { return null; } };
    if (review?.audio_url) {
      const p = pathOf(review.audio_url);
      if (p) storagePaths.push({ bucket: 'audio_reviews', path: p });
    }
    if (typeof review?.image_url === 'string') {
      review.image_url.split(',').map(u => u.trim()).filter(Boolean).forEach(u => {
        const p = pathOf(u);
        if (p) storagePaths.push({ bucket: 'review_images', path: p });
      });
    }

    try {
      await api.adminReviews('delete', { id, storagePaths });
      setReviews(reviews.filter(r => r.id !== id));
    } catch (err) {
      alert("Error deleting review: " + err.message);
    }
  };

  const updateOrderInDB = async (newItems) => {
    // Update locally immediately for snappy feel
    setReviews(newItems);
    try {
      await api.adminReviews('reorder', {
        items: newItems.map((item, idx) => ({ id: item.id, order_index: idx })),
      });
    } catch (err) {
      alert("Error saving order: " + err.message);
      fetchReviews(); // fall back to server truth
    }
  };

  const moveUp = (index) => {
    if (index === 0) return;
    const newItems = [...reviews];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    updateOrderInDB(newItems);
  };

  const moveDown = (index) => {
    if (index === reviews.length - 1) return;
    const newItems = [...reviews];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    updateOrderInDB(newItems);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = reviews.findIndex((r) => r.id === active.id);
      const newIndex = reviews.findIndex((r) => r.id === over.id);
      const newItems = arrayMove(reviews, oldIndex, newIndex);
      updateOrderInDB(newItems);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 1000, overflow: "auto", padding: "20px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", background: G2.dark, border: "1px solid rgba(201,168,76,0.3)", borderRadius: 12, padding: "28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <p style={{ fontSize: 11, letterSpacing: 4, color: G2.gold, textTransform: "uppercase", fontFamily: "'DM Sans',sans-serif" }}>Live Database Panel</p>
            <h2 style={{ color: G2.smoke, fontSize: 20, fontFamily: "'DM Sans',sans-serif" }}>Reviews Manager</h2>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "1px solid rgba(201,168,76,0.3)", color: G2.mid, padding: "6px 16px", borderRadius: 4, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Close ✕</button>
        </div>

        {/* Add New Review */}
        <div style={{ background: "rgba(201,168,76,0.05)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 8, padding: "20px", marginBottom: 24 }}>
          <p style={{ color: G2.gold, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", marginBottom: 14, fontFamily: "'DM Sans',sans-serif" }}>+ Add New Review (Audio or Text)</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <input style={inp} placeholder="Student Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <input style={inp} placeholder="City (Hyderabad, etc.)" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
          </div>
          <select style={{ ...inp, appearance: "none" }} value={form.stars} onChange={e => setForm(f => ({ ...f, stars: Number(e.target.value) }))}>
            {[5, 4, 3].map(s => <option key={s} value={s}>{s} Stars {"★".repeat(s)}</option>)}
          </select>
          
          <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 8}}>
            <div style={{...inp, display: "flex", flexDirection: "column", gap: 6, marginBottom: 0}}>
              <span style={{fontSize: 12, color: G2.mid}}>Written Review Screenshot (JPEG/PNG):</span>
              <input id="imageInput" type="file" multiple accept="image/*" onChange={handleImageChange} style={{fontSize: 11, color: G2.smoke}} />
              {imageFiles.length > 0 && <span style={{fontSize: 10, color: G2.gold}}>{imageFiles.length} file(s) selected</span>}
            </div>
            <div style={{...inp, display: "flex", flexDirection: "column", gap: 6, marginBottom: 0}}>
              <span style={{fontSize: 12, color: G2.mid}}>Audio File (Optional):</span>
              <input id="audioInput" type="file" accept="audio/*" onChange={handleAudioChange} style={{fontSize: 11, color: G2.smoke}} />
            </div>
          </div>

          <textarea style={{ ...inp, height: 60, resize: "vertical" }} placeholder="Telugu Text Review" value={form.te} onChange={e => setForm(f => ({ ...f, te: e.target.value }))} />
          <textarea style={{ ...inp, height: 60, resize: "vertical" }} placeholder="English Text Review" value={form.en} onChange={e => setForm(f => ({ ...f, en: e.target.value }))} />
          <button onClick={addReview} disabled={uploading} style={{ padding: "12px 28px", background: `linear-gradient(135deg,${G2.gold},#9A7020)`, color: G2.black, border: "none", borderRadius: 4, fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 700, cursor: uploading ? "not-allowed" : "pointer" }}>
            {uploading ? "Uploading & Saving..." : "Save Review ✓"}
          </button>
        </div>

        {/* Reviews List */}
        <p style={{ color: G2.gold, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", marginBottom: 14, fontFamily: "'DM Sans',sans-serif", display: "flex", justifyContent: "space-between" }}>
          <span>Live Reviews ({reviews.length}) — Drag or click arrows</span>
          <span style={{color: "#8BCCA8"}}>Auto-Saved ✓</span>
        </p>

        {loading ? (
          <div style={{color: G2.mid, textAlign: "center", padding: 20}}>Loading reviews from database...</div>
        ) : (
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={reviews.map(r => r.id)} strategy={verticalListSortingStrategy}>
              {reviews.map((r, i) => (
                <SortableItem key={r.id} id={r.id} r={r} moveUp={moveUp} moveDown={moveDown} index={i} totalLength={reviews.length} deleteReview={deleteReview} G2={G2} />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
