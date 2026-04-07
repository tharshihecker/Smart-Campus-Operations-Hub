import React, { useEffect, useState } from "react";
import {
  fetchAdminEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} from "../api";
import "./Admin.css";

const blankForm = { title: "", description: "", eventDate: "", location: "" };

function ManageEvents() {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(blankForm);
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

  const onEdit = (event) => {
    setEditingId(event.id);
    setForm({ title: event.title, description: event.description, eventDate: event.eventDate, location: event.location });
    setMessage(""); setError("");
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true); setMessage(""); setError("");
    try {
      if (editingId) {
        await updateEvent(editingId, form);
        setMessage("Event updated successfully.");
      } else {
        await createEvent(form);
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

      <form className="admin-form" onSubmit={onSubmit}>
        <input name="title" value={form.title} onChange={onChange} placeholder="Event title" required />
        <input name="eventDate" type="date" value={form.eventDate} onChange={onChange} required />
        <input name="location" value={form.location} onChange={onChange} placeholder="Location" required />
        <textarea name="description" value={form.description} onChange={onChange} placeholder="Description" required rows="3" />
        <div className="admin-form-actions">
          <button type="submit" className="btn-primary" disabled={busy}>
            {editingId ? "Update Event" : "Create Event"}
          </button>
          <button type="button" className="btn-secondary" onClick={clearForm} disabled={busy}>Reset</button>
        </div>
      </form>

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
                <th>ID</th>
                <th>Title</th>
                <th>Date</th>
                <th>Location</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id}>
                  <td>{ev.id}</td>
                  <td><strong>{ev.title}</strong></td>
                  <td>{ev.eventDate}</td>
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
