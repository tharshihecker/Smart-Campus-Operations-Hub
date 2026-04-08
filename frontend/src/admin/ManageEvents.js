import React, { useEffect, useState } from "react";
import {
  fetchAdminEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  uploadEventImage,
} from "../api";
import "./Admin.css";

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

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      setEvents(await fetchAdminEvents());
    } catch (err) {
      setError(err.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const clearForm = () => { setEditingId(null); setForm(blankForm); };

  const [showModal, setShowModal] = useState(false);
  const openCreateModal = () => { clearForm(); setShowModal(true); setMessage(''); setError(''); };
  const onEdit = (event) => {
    setEditingId(event.id);
    setForm({ title: event.title, description: event.description, eventDate: event.eventDate, bookingCloseDate: event.bookingCloseDate || "", startTime: event.startTime || "", endTime: event.endTime || "", capacity: event.capacity || "", imageUrl: event.imageUrl || "", location: event.location });
    setMessage(""); setError("");
    setShowModal(true);
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
      clearForm();
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to save event");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this event?")) return;
    setBusy(true); setMessage(""); setError("");
    try {
      await deleteEvent(id);
      setMessage("Event deleted.");
      if (editingId === id) clearForm();
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to delete event");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="admin-panel">
      <h2>Manage Events</h2>
      <p className="admin-subtitle">Create, edit, and remove campus events, workshops, and activities.</p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <form style={{ display: 'inline-block' }} onSubmit={(e)=>{e.preventDefault(); openCreateModal();}}>
          <button type="button" className="btn-primary" onClick={openCreateModal}>Add Event</button>
        </form>
        <div />
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>{editingId ? 'Edit Event' : 'Create Event'}</h3>
            <div className="modal-body">
              <label>Title</label>
              <input name="title" value={form.title} onChange={onChange} placeholder="Event title" required />

              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label>Event Date</label>
                  <input name="eventDate" type="date" value={form.eventDate} onChange={onChange} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label>Booking Close Date</label>
                  <input name="bookingCloseDate" type="date" value={form.bookingCloseDate} onChange={onChange} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label>Start Time</label>
                  <input name="startTime" type="time" value={form.startTime} onChange={onChange} />
                </div>
                <div style={{ flex: 1 }}>
                  <label>End Time</label>
                  <input name="endTime" type="time" value={form.endTime} onChange={onChange} />
                </div>
                <div style={{ width: 120 }}>
                  <label>Capacity</label>
                  <input name="capacity" type="number" min="0" value={form.capacity} onChange={onChange} />
                </div>
              </div>

              <label>Location</label>
              <input name="location" value={form.location} onChange={onChange} placeholder="Location" required />

              <label>Description</label>
              <textarea name="description" value={form.description} onChange={onChange} placeholder="Description" required rows="3" />

              <div className="file-input-wrapper">
                <input id="eventImageInput" type="file" accept="image/*" onChange={(e) => setUploadFile(e.target.files[0])} style={{ display: 'none' }} />
                <label htmlFor="eventImageInput" className="file-input-btn">Choose Image</label>
                <div className="file-input-filename">{uploadFile ? uploadFile.name : 'No file chosen'}</div>
                <button type="button" className="btn-secondary file-upload-btn" disabled={!uploadFile || uploading} onClick={async () => {
                  if (!uploadFile) return;
                  setUploading(true);
                  setError('');
                  try {
                    const res = await uploadEventImage(uploadFile);
                    setForm({ ...form, imageUrl: res.url });
                    setMessage('Image uploaded');
                    setUploadFile(null);
                  } catch (err) {
                    setError(err.message || 'Image upload failed');
                  } finally { setUploading(false); }
                }}>{uploading ? 'Uploading...' : 'Upload'}</button>
                {form.imageUrl && <img src={form.imageUrl} alt="preview" style={{ width: 100, height: 64, objectFit: 'cover', borderRadius: 6 }} />}
              </div>

            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button className="btn-primary" onClick={onSubmit} disabled={busy}>{editingId ? 'Update Event' : 'Create Event'}</button>
              <button className="btn-secondary" onClick={() => { setShowModal(false); clearForm(); }} disabled={busy}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}
      {loading && <p className="state-text">Loading events...</p>}

      {!loading && events.length === 0 && (
        <div className="empty-state"><p>No events available.</p></div>
      )}

      {!loading && events.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                  <th>Title</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Booking Close</th>
                  <th>Capacity</th>
                  <th>Location</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id}>
                  <td><strong>{ev.title}</strong></td>
                  <td>{ev.eventDate}</td>
                  <td>{ev.startTime ? `${ev.startTime} - ${ev.endTime || ''}` : '-'}</td>
                  <td>{ev.bookingCloseDate || '-'}</td>
                  <td>{ev.capacity ?? '-'}</td>
                  <td>{ev.location}</td>
                  <td style={{ maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.description}</td>
                  <td className="actions">
                    <button className="btn-sm btn-primary" onClick={() => onEdit(ev)} disabled={busy}>Edit</button>
                    <button className="btn-sm btn-danger" onClick={() => onDelete(ev.id)} disabled={busy}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default ManageEvents;
