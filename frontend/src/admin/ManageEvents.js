import React, { useEffect, useState } from "react";
import { fetchAdminEvents, createEvent, updateEvent, deleteEvent, uploadEventImage } from "../api";
import { useNavigate } from 'react-router-dom';
import "./Admin.css";
import "./ManageEvents.css";

const blankForm = { title: "", description: "", eventDate: "", bookingCloseDate: "", startTime: "", endTime: "", capacity: "", imageUrl: "", location: "" };

function ManageEvents() {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(blankForm);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true); setError("");
    try { setEvents(await fetchAdminEvents()); }
    catch (err) { setError(err.message || "Failed to load events"); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const clearForm = () => { setEditingId(null); setForm(blankForm); };

  const [showModal, setShowModal] = useState(false);
  const openCreateModal = () => { clearForm(); setShowModal(true); setMessage(''); setError(''); };
  const onEdit = (event) => {
    setEditingId(event.id);
    setForm({ title: event.title, description: event.description, eventDate: event.eventDate, bookingCloseDate: event.bookingCloseDate || "", startTime: event.startTime || "", endTime: event.endTime || "", capacity: event.capacity || "", imageUrl: event.imageUrl || "", location: event.location });
    setMessage(""); setError(""); setShowModal(true);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true); setMessage(""); setError("");
    try {
      const payload = { ...form };
      payload.capacity = payload.capacity === "" || payload.capacity === null ? null : Number(payload.capacity);
      if (editingId) {
        await updateEvent(editingId, payload);
        setMessage("Event updated successfully.");
      } else {
        await createEvent(payload);
        setMessage("Event created successfully.");
      }
      clearForm(); setShowModal(false); await loadData();
    } catch (err) { setError(err.message || "Failed to save event"); }
    finally { setBusy(false); }
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this event permanently?")) return;
    setBusy(true); setMessage(""); setError("");
    try {
      await deleteEvent(id);
      setMessage("Event deleted.");
      if (editingId === id) { clearForm(); setShowModal(false); }
      await loadData();
    } catch (err) { setError(err.message || "Failed to delete event"); }
    finally { setBusy(false); }
  };

  return (
    <section className="app-page ev-page">
      <div className="ev-header">
        <div className="ev-header-titles">
          <h2 className="ev-title">Campus Events Showcase</h2>
          <p className="ev-subtitle">Create, edit, and organize stunning campus activities.</p>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button type="button" className="ev-btn ev-btn-secondary" onClick={() => navigate('/admin/event-checkin')} style={{ boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            📱 QR Terminal
          </button>
          <button type="button" className="ev-btn ev-btn-primary" onClick={openCreateModal}>
            ✨ + New Event
          </button>
        </div>
      </div>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {loading && (
        <div className="ev-grid">
           {[1, 2, 3].map(i => (
             <div key={i} className="ev-card" style={{ padding: '0', minHeight: '340px' }}>
               <div className="ext-sk-line" style={{ height: '160px', width: '100%', borderRadius: 0 }}></div>
               <div style={{ padding: '24px' }}>
                 <div className="ext-sk-line" style={{ height: '24px', width: '70%', marginBottom: '16px' }}></div>
                 <div className="ext-sk-line" style={{ height: '16px', width: '50%', marginBottom: '8px' }}></div>
                 <div className="ext-sk-line" style={{ height: '16px', width: '60%', marginBottom: '24px' }}></div>
                 <div className="ext-sk-line" style={{ height: '40px', width: '100%', borderRadius: '12px' }}></div>
               </div>
             </div>
           ))}
        </div>
      )}

      {!loading && events.length === 0 && (
        <div className="ev-empty">
          <h3 style={{ margin: '0 0 8px', color: '#0f172a' }}>No Events Found</h3>
          <p style={{ margin: 0 }}>There are no upcoming events scheduled at this moment.</p>
        </div>
      )}

      {!loading && events.length > 0 && (
        <div className="ev-grid">
          {events.map((ev) => (
            <div className="ev-card" key={ev.id}>
              {ev.imageUrl ? (
                <img src={ev.imageUrl} alt={ev.title} className="ev-card-img" />
              ) : (
                <div className="ev-card-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f8fafc, #e2e8f0)', color: '#94a3b8', fontSize: '2rem' }}>
                  🖼️
                </div>
              )}
              <div className="ev-card-content">
                <h3 className="ev-card-title">{ev.title}</h3>
                <p className="ev-card-desc">{ev.description}</p>
                <div style={{ marginTop: 'auto' }}>
                  <div className="ev-detail-row">
                    <span className="ev-detail-icon">📅</span>
                    <span>{ev.eventDate} {ev.startTime && `• ${ev.startTime}`}</span>
                  </div>
                  <div className="ev-detail-row">
                    <span className="ev-detail-icon">📍</span>
                    <span>{ev.location}</span>
                  </div>
                  <div className="ev-detail-row">
                    <span className="ev-detail-icon">🎟️</span>
                    <span>Cap: {ev.capacity || 'Unlimited'} {ev.bookingCloseDate && `(Closes: ${ev.bookingCloseDate})`}</span>
                  </div>
                </div>
                <div className="ev-card-actions">
                  <button className="ev-btn ev-btn-secondary ev-btn-action" onClick={() => onEdit(ev)} disabled={busy}>✏️ Edit</button>
                  <button className="ev-btn ev-btn-danger ev-btn-action" onClick={() => onDelete(ev.id)} disabled={busy}>🗑️ Remove</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="ev-modal-overlay">
          <div className="ev-modal-card">
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 20px', color: '#0f172a' }}>{editingId ? '✏️ Edit Event Details' : '✨ Frame New Event'}</h3>
            
            <div className="ev-form-group">
              <label className="ev-form-label">Event Banner Artwork</label>
              <div className="ev-file-upload">
                {form.imageUrl ? (
                  <img src={form.imageUrl} alt="preview" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: '12px' }} />
                ) : (
                  <div style={{ width: 80, height: 80, background: '#e2e8f0', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>📸</div>
                )}
                <div style={{ flex: 1 }}>
                  <input id="evImg" type="file" accept="image/*" onChange={(e) => setUploadFile(e.target.files[0])} style={{ display: 'none' }} />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <label htmlFor="evImg" className="ev-btn ev-btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>Select Image</label>
                    <button type="button" className="ev-btn ev-btn-primary" disabled={!uploadFile || uploading} onClick={async () => {
                      if (!uploadFile) return;
                      setUploading(true); setError('');
                      try {
                        const res = await uploadEventImage(uploadFile);
                        setForm({ ...form, imageUrl: res.url });
                        setMessage('Image successfully uploaded and bound.');
                        setUploadFile(null);
                      } catch (err) { setError(err.message || 'Image upload failed'); } finally { setUploading(false); }
                    }} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>{uploading ? 'Up...' : 'Upload'}</button>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>{uploadFile ? uploadFile.name : 'No file staged.'}</div>
                </div>
              </div>
            </div>

            <div className="ev-form-group">
              <label className="ev-form-label">Event Title</label>
              <input className="ev-input" name="title" value={form.title} onChange={onChange} placeholder="e.g. Annual Tech Symposium" required />
            </div>

            <div className="ev-form-group">
              <label className="ev-form-label">Location</label>
              <input className="ev-input" name="location" value={form.location} onChange={onChange} placeholder="e.g. Main Auditorium" required />
            </div>

            <div className="ev-row">
              <div className="ev-form-group" style={{ flex: 1 }}>
                <label className="ev-form-label">Event Date</label>
                <input className="ev-input" name="eventDate" type="date" min={new Date().toISOString().split('T')[0]} value={form.eventDate} onChange={onChange} required />
              </div>
              <div className="ev-form-group" style={{ flex: 1 }}>
                <label className="ev-form-label">Registration Closes</label>
                <input className="ev-input" name="bookingCloseDate" type="date" min={new Date().toISOString().split('T')[0]} max={form.eventDate || undefined} value={form.bookingCloseDate} onChange={(e) => {
                  if (form.eventDate && e.target.value > form.eventDate) {
                    // Prevent entering a close date after the event date
                    return;
                  }
                  onChange(e);
                }} />
              </div>
            </div>

            <div className="ev-row">
              <div className="ev-form-group" style={{ flex: 1 }}>
                <label className="ev-form-label">Start Time</label>
                <input className="ev-input" name="startTime" type="time" step="1800" value={form.startTime} onChange={onChange} />
              </div>
              <div className="ev-form-group" style={{ flex: 1 }}>
                <label className="ev-form-label">End Time</label>
                <input className="ev-input" name="endTime" type="time" step="1800" value={form.endTime} onChange={onChange} />
              </div>
              <div className="ev-form-group" style={{ width: '90px' }}>
                <label className="ev-form-label">Seats</label>
                <input className="ev-input" name="capacity" type="number" min="0" value={form.capacity} onChange={onChange} placeholder="∞" />
              </div>
            </div>

            <div className="ev-form-group">
              <label className="ev-form-label">Description Outline</label>
              <textarea className="ev-input" name="description" value={form.description} onChange={onChange} placeholder="Provide details about the event..." required rows="3" style={{ resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button className="ev-btn ev-btn-secondary" onClick={() => { setShowModal(false); clearForm(); }} disabled={busy}>Cancel</button>
              <button className="ev-btn ev-btn-primary" onClick={onSubmit} disabled={busy}>{editingId ? 'Update Event Details' : 'Publish Global Event'}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default ManageEvents;
