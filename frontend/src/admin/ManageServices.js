import React, { useEffect, useState } from "react";
import {
  fetchAdminServices,
  createService,
  updateService,
  deleteService,
} from "../api";
import "./Admin.css";

const SERVICE_STATUSES = ["active", "maintenance", "inactive"];
const blankForm = { title: "", description: "", status: "active" };

function ManageServices() {
  const [services, setServices] = useState([]);
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true); setError("");
    try { setServices(await fetchAdminServices()); }
    catch (err) { setError(err.message || "Failed to load services"); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const clearForm = () => { setEditingId(null); setForm(blankForm); };

  const onEdit = (svc) => {
    setEditingId(svc.id);
    setForm({ title: svc.title, description: svc.description, status: svc.status });
    setMessage(""); setError("");
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true); setMessage(""); setError("");
    try {
      if (editingId) {
        await updateService(editingId, form);
        setMessage("Service updated successfully.");
      } else {
        await createService(form);
        setMessage("Service created successfully.");
      }
      clearForm(); await loadData();
    } catch (err) { setError(err.message || "Failed to save service"); }
    finally { setBusy(false); }
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this service?")) return;
    setBusy(true); setMessage(""); setError("");
    try {
      await deleteService(id);
      setMessage("Service deleted.");
      if (editingId === id) clearForm();
      await loadData();
    } catch (err) { setError(err.message || "Failed to delete service"); }
    finally { setBusy(false); }
  };

  const statusBadge = (status) => {
    const cls = status === "active" ? "badge-active" : status === "maintenance" ? "badge-maintenance" : "badge-disabled";
    return <span className={`badge ${cls}`}>{status.toUpperCase()}</span>;
  };

  return (
    <section className="admin-panel">
      <h2>Manage Services</h2>
      <p className="admin-subtitle">Control campus service channels, their descriptions, and operational status.</p>

      <form className="admin-form" onSubmit={onSubmit}>
        <input name="title" value={form.title} onChange={onChange} placeholder="Service title" required />
        <select name="status" value={form.status} onChange={onChange} required>
          {SERVICE_STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <textarea name="description" value={form.description} onChange={onChange} placeholder="Description" required rows="3" />
        <div className="admin-form-actions">
          <button type="submit" className="btn-primary" disabled={busy}>{editingId ? "Update Service" : "Create Service"}</button>
          <button type="button" className="btn-secondary" onClick={clearForm} disabled={busy}>Reset</button>
        </div>
      </form>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}
      {loading && <p className="state-text">Loading services...</p>}

      {!loading && services.length === 0 && <div className="empty-state"><p>No services found.</p></div>}

      {!loading && services.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>ID</th><th>Title</th><th>Status</th><th>Description</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {services.map((svc) => (
                <tr key={svc.id}>
                  <td>{svc.id}</td>
                  <td><strong>{svc.title}</strong></td>
                  <td>{statusBadge(svc.status)}</td>
                  <td style={{ maxWidth: "350px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{svc.description}</td>
                  <td className="actions">
                    <button className="btn-sm btn-primary" onClick={() => onEdit(svc)} disabled={busy}>Edit</button>
                    <button className="btn-sm btn-danger" onClick={() => onDelete(svc.id)} disabled={busy}>Delete</button>
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

export default ManageServices;
