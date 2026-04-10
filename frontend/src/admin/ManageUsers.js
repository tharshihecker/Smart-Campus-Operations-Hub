import React, { useEffect, useState } from "react";
import {
  fetchAllUsers,
  fetchUserRoles,
  updateUserRole,
  toggleUserStatus,
  deleteUser,
} from "../api";
import "./Admin.css";
import "./ManageUsers.css"; // The new premium styles

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

  useEffect(() => {
    loadData();
  }, []);

  // Auto-hide messages
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadData(searchQuery);
  };

  const [confirmDialog, setConfirmDialog] = useState(null);

  const triggerRoleChange = (userId, newRole) => {
    const user = users.find(u => u.id === userId);
    setConfirmDialog({
      title: 'Update User Role',
      msg: `Are you sure you want to change ${user.username}'s role to ${newRole.replace("ROLE_", "")}?`,
      btnClass: 'mu-btn-confirm',
      btnText: 'Yes, Update Role',
      icon: '🔐',
      onConfirm: async () => {
        setBusy(true); setMessage(""); setError(""); setConfirmDialog(null);
        try {
          await updateUserRole(userId, newRole);
          setMessage("✅ User role updated successfully.");
          await loadData(searchQuery);
        } catch (err) {
          setError(err.message || "Failed to update role");
        } finally { setBusy(false); }
      }
    });
  };

  const triggerToggleStatus = (userId, username, isCurrentlyEnabled) => {
    const action = isCurrentlyEnabled ? "disable" : "enable";
    setConfirmDialog({
      title: isCurrentlyEnabled ? 'Disable Account' : 'Enable Account',
      msg: `Are you sure you want to ${action} user "${username}"? They will ${isCurrentlyEnabled ? 'lose' : 'gain'} access to the platform.`,
      btnClass: isCurrentlyEnabled ? 'mu-btn-warning' : 'mu-btn-confirm',
      btnText: `Yes, ${action} user`,
      icon: isCurrentlyEnabled ? '🚫' : '✅',
      onConfirm: async () => {
        setBusy(true); setMessage(""); setError(""); setConfirmDialog(null);
        try {
          await toggleUserStatus(userId);
          setMessage(`✅ User "${username}" has been ${action}d.`);
          await loadData(searchQuery);
        } catch (err) {
          setError(err.message || "Failed to toggle status");
        } finally { setBusy(false); }
      }
    });
  };

  const triggerDelete = (userId, username) => {
    setConfirmDialog({
      title: 'Delete Account',
      msg: `⚠️ DESTRUCTIVE ACTION: Are you sure you want to permanently delete user "${username}"? This cannot be undone.`,
      btnClass: 'mu-btn-danger',
      btnText: 'Delete Permanently',
      icon: '🗑️',
      onConfirm: async () => {
        setBusy(true); setMessage(""); setError(""); setConfirmDialog(null);
        try {
          await deleteUser(userId);
          setMessage(`🗑️ User "${username}" permanently deleted.`);
          await loadData(searchQuery);
        } catch (err) {
          setError(err.message || "Failed to delete user");
        } finally { setBusy(false); }
      }
    });
  };

  return (
    <section className="app-page mu-page">
      <div className="mu-header">
        <h2 className="mu-title">Manage Users</h2>
        <p className="mu-subtitle">
          Search, view, assign roles, enable/disable, and manage all registered user accounts with a modern card interface.
        </p>
      </div>

      <div className="mu-toolbar">
        <form className="mu-search-wrapper" onSubmit={handleSearch}>
          <span className="mu-search-icon">🔍</span>
          <input
            className="mu-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by username, email, or name..."
          />
        </form>
        <button type="button" className="mu-btn mu-btn-primary" onClick={handleSearch} disabled={busy}>
          Search
        </button>
        <button type="button" className="mu-btn mu-btn-clear" onClick={() => { setSearchQuery(""); loadData(); }} disabled={busy}>
          Clear
        </button>
      </div>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}
      
      {loading && (
         <div className="mu-table-container" style={{ padding: "20px" }}>
           {[1, 2, 3, 4, 5].map(i => (
             <div key={i} style={{ display: 'flex', gap: '20px', marginBottom: '20px', alignItems: 'center' }}>
               <div className="sk-line" style={{ height: '40px', width: '40px', borderRadius: '50%', marginBottom: 0 }}></div>
               <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                 <div className="sk-line title" style={{ height: '16px', width: '30%', marginBottom: 0 }}></div>
                 <div className="sk-line" style={{ height: '12px', width: '20%', marginBottom: 0 }}></div>
               </div>
               <div className="sk-line" style={{ height: '30px', width: '15%', marginBottom: 0 }}></div>
               <div className="sk-line" style={{ height: '30px', width: '10%', marginBottom: 0 }}></div>
               <div className="sk-line" style={{ height: '30px', width: '10%', marginBottom: 0 }}></div>
             </div>
           ))}
         </div>
      )}

      {!loading && users.length === 0 && (
        <div className="mu-empty">
          <div className="mu-empty-icon">📂</div>
          <p>No users found matching your search.</p>
        </div>
      )}

      {!loading && users.length > 0 && (
        <>
          <p style={{ margin: "0 0 16px 4px", color: "#64748b", fontSize: "0.9rem", fontWeight: "600" }}>
            Showing {users.length} registered user(s)
          </p>
          <div className="mu-table-container">
            <table className="mu-table">
              <thead>
                <tr>
                  <th>User Profile</th>
                  <th>Department</th>
                  <th>Joined Date</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const initials = (u.fullName || u.username).substring(0, 2).toUpperCase();
                  // Fallback for missing Join Date
                  const joinDate = u.createdAt 
                      ? new Date(u.createdAt).toLocaleDateString() 
                      : "04/05/2026";

                  return (
                    <tr key={u.id} className={!u.enabled ? "mu-row-disabled" : ""}>
                      <td>
                        <div className="mu-user-cell">
                          <div className="mu-avatar-small">{initials}</div>
                          <div className="mu-user-details">
                            <span className="mu-user-name">{u.fullName || u.username}</span>
                            <span className="mu-user-email">@{u.username} • {u.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="mu-meta-text">{u.department || "Student"}</span>
                      </td>
                      <td>
                        <span className="mu-meta-text">{joinDate}</span>
                      </td>
                      <td>
                        <select
                          className="mu-compact-select"
                          value={u.role}
                          onChange={(e) => triggerRoleChange(u.id, e.target.value)}
                          disabled={busy}
                        >
                          {roles.map((r) => (
                            <option key={r} value={r}>{r.replace("ROLE_", "")}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <span className={`mu-status-pill ${u.enabled ? "mu-status-pill-active" : "mu-status-pill-disabled"}`}>
                          {u.enabled ? "active" : "disabled"}
                        </span>
                      </td>
                      <td>
                        <div className="mu-inline-actions" style={{ justifyContent: "flex-end" }}>
                          <button
                            className="mu-icon-btn mu-icon-btn-toggle"
                            title={u.enabled ? "Disable User" : "Enable User"}
                            onClick={() => triggerToggleStatus(u.id, u.username, u.enabled)}
                            disabled={busy}
                          >
                            {u.enabled ? "🚫" : "✅"}
                          </button>
                          <button
                            className="mu-icon-btn mu-icon-btn-delete"
                            title="Delete User permanently"
                            onClick={() => triggerDelete(u.id, u.username)}
                            disabled={busy}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Confirmation Modal */}
      {confirmDialog && (
        <div className="mu-modal-overlay">
          <div className="mu-modal-card">
            <span className="mu-modal-icon">{confirmDialog.icon}</span>
            <h3 className="mu-modal-title">{confirmDialog.title}</h3>
            <p className="mu-modal-msg">{confirmDialog.msg}</p>
            <div className="mu-modal-actions">
              <button 
                className="mu-btn-cancel" 
                onClick={() => setConfirmDialog(null)}
                disabled={busy}
              >
                Cancel
              </button>
              <button 
                className={confirmDialog.btnClass} 
                onClick={confirmDialog.onConfirm}
                disabled={busy}
              >
                {busy ? "Processing..." : confirmDialog.btnText}
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  );
}

export default ManageUsers;
