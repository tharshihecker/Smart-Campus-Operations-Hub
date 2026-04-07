import React, { useEffect, useState } from "react";
import {
  fetchAllUsers,
  fetchUserRoles,
  updateUserRole,
  toggleUserStatus,
  deleteUser,
} from "../api";
import "./Admin.css";

function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadData = async (q = "") => {
    setLoading(true);
    setError("");
    try {
      const [usersData, rolesData] = await Promise.all([
        fetchAllUsers(q),
        fetchUserRoles(),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
    } catch (err) {
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    loadData(searchQuery);
  };

  const handleRoleChange = async (userId, newRole) => {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await updateUserRole(userId, newRole);
      setMessage("User role updated successfully.");
      await loadData(searchQuery);
    } catch (err) {
      setError(err.message || "Failed to update role");
    } finally {
      setBusy(false);
    }
  };

  const handleToggleStatus = async (userId) => {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await toggleUserStatus(userId);
      setMessage("User status toggled successfully.");
      await loadData(searchQuery);
    } catch (err) {
      setError(err.message || "Failed to toggle status");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (userId, username) => {
    if (!window.confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await deleteUser(userId);
      setMessage(`User "${username}" deleted.`);
      await loadData(searchQuery);
    } catch (err) {
      setError(err.message || "Failed to delete user");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="admin-panel">
      <h2>Manage Users</h2>
      <p className="admin-subtitle">
        Search, view, assign roles, enable/disable, and manage all registered user accounts.
      </p>

      <form className="admin-search" onSubmit={handleSearch}>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by username, email, or name..."
        />
        <button type="submit" className="btn-primary" disabled={busy}>
          Search
        </button>
        <button type="button" className="btn-secondary" onClick={() => { setSearchQuery(""); loadData(); }} disabled={busy}>
          Clear
        </button>
      </form>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}
      {loading && <p className="state-text">Loading users...</p>}

      {!loading && users.length === 0 && (
        <div className="empty-state">
          <p>No users found.</p>
        </div>
      )}

      {!loading && users.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Email</th>
                <th>Full Name</th>
                <th>Department</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td><strong>{u.username}</strong></td>
                  <td>{u.email}</td>
                  <td>{u.fullName || "—"}</td>
                  <td>{u.department || "—"}</td>
                  <td>
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      disabled={busy}
                      style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                    >
                      {roles.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <span className={`badge ${u.enabled ? "badge-active" : "badge-disabled"}`}>
                      {u.enabled ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td style={{ fontSize: "0.82rem", color: "#64748b" }}>
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="actions">
                    <button
                      className={`btn-sm ${u.enabled ? "btn-danger" : "btn-approve"}`}
                      onClick={() => handleToggleStatus(u.id)}
                      disabled={busy}
                    >
                      {u.enabled ? "Disable" : "Enable"}
                    </button>
                    <button
                      className="btn-sm btn-danger"
                      onClick={() => handleDelete(u.id, u.username)}
                      disabled={busy}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ marginTop: "16px", color: "#94a3b8", fontSize: "0.85rem" }}>
        Total: {users.length} user(s) loaded
      </p>
    </section>
  );
}

export default ManageUsers;
