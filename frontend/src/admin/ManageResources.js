import React, { useEffect, useState } from "react";
import {
  fetchAdminResources,
  createResource,
  updateResource,
  deleteResource,
} from "../api";
import "./Admin.css";

const CATEGORIES = ["Library", "Technology", "Infrastructure", "Academic", "Research", "Other"];
const blankForm = { title: "", description: "", category: "Library" };

function ManageResources() {
  const [resources, setResources] = useState([]);
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true); setError("");
    try { setResources(await fetchAdminResources()); }
    catch (err) { setError(err.message || "Failed to load resources"); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const clearForm = () => { setEditingId(null); setForm(blankForm); };

  const onEdit = (res) => {
    setEditingId(res.id);
    setForm({ title: res.title, description: res.description, category: res.category });
    setMessage(""); setError("");
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true); setMessage(""); setError("");
    try {
      if (editingId) {
        await updateResource(editingId, form);
        setMessage("Resource updated successfully.");
      } else {
        await createResource(form);
        setMessage("Resource created successfully.");
      }
      clearForm(); await loadData();
    } catch (err) { setError(err.message || "Failed to save resource"); }
    finally { setBusy(false); }
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this resource?")) return;
    setBusy(true); setMessage(""); setError("");
    try {
      await deleteResource(id);
      setMessage("Resource deleted.");
      if (editingId === id) clearForm();
      await loadData();
    } catch (err) { setError(err.message || "Failed to delete resource"); }
    finally { setBusy(false); }
  };

  return (
    <section className="admin-panel">
      <h2>Manage Resources</h2>
      <p className="admin-subtitle">Maintain the learning resources catalogue — digital tools, library access, and academic materials.</p>

      <form className="admin-form" onSubmit={onSubmit}>
        <input name="title" value={form.title} onChange={onChange} placeholder="Resource title" required />
        <select name="category" value={form.category} onChange={onChange} required>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <textarea name="description" value={form.description} onChange={onChange} placeholder="Description" required rows="3" />
        <div className="admin-form-actions">
          <button type="submit" className="btn-primary" disabled={busy}>{editingId ? "Update Resource" : "Create Resource"}</button>
          <button type="button" className="btn-secondary" onClick={clearForm} disabled={busy}>Reset</button>
        </div>
      </form>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}
      {loading && <p className="state-text">Loading resources...</p>}

      {!loading && resources.length === 0 && <div className="empty-state"><p>No resources found.</p></div>}

      {!loading && resources.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>ID</th><th>Title</th><th>Category</th><th>Description</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {resources.map((res) => (
                <tr key={res.id}>
                  <td>{res.id}</td>
                  <td><strong>{res.title}</strong></td>
                  <td><span className="badge badge-active">{res.category}</span></td>
                  <td style={{ maxWidth: "350px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{res.description}</td>
                  <td className="actions">
                    <button className="btn-sm btn-primary" onClick={() => onEdit(res)} disabled={busy}>Edit</button>
                    <button className="btn-sm btn-danger" onClick={() => onDelete(res.id)} disabled={busy}>Delete</button>
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

export default ManageResources;
