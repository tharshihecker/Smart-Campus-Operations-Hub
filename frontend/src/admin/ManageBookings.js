import React, { useEffect, useState } from "react";
import {
  fetchAllBookings,
  updateBookingStatus,
  deleteBooking,
  counterProposeBooking
} from "../api";
import "./Admin.css";
import "./ManageBookings.css";

const STATUSES = ["PENDING", "APPROVED", "REJECTED", "CANCELLED", "COMPLETED"];

function ManageBookings() {
  const [bookings, setBookings] = useState([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [remarksMap, setRemarksMap] = useState({});
  const [counterId, setCounterId] = useState(null);
  const [counterForm, setCounterForm] = useState({ newDate: '', newStartTime: '', newEndTime: '', note: '' });

  // Custom confirmation modal state
  const [confirmDialog, setConfirmDialog] = useState(null);

  const loadData = async (status) => {
    setLoading(true); setError("");
    try {
      setBookings(await fetchAllBookings(status || undefined));
    } catch (err) { setError(err.message || "Failed to load bookings"); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(filterStatus); }, [filterStatus]);

  // Auto-hide messages
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleStatusChange = async (bookingId, newStatus) => {
    setBusy(true); setMessage(""); setError("");
    try {
      await updateBookingStatus(bookingId, newStatus, remarksMap[bookingId] || "");
      setMessage(`Booking #${bookingId} updated to ${newStatus}.`);
      await loadData(filterStatus);
    } catch (err) { setError(err.message || "Failed to update booking status"); }
    finally { setBusy(false); }
  };

  const triggerStatusChange = (bookingId, newStatus) => {
    setConfirmDialog({
      title: 'Update Status',
      msg: `Are you sure you want to change this booking's status to ${newStatus}?`,
      btnClass: newStatus === 'REJECTED' ? 'mb-btn-danger' : 'mb-btn-primary',
      btnText: `Yes, ${newStatus.toLowerCase()}`,
      onConfirm: () => {
        setConfirmDialog(null);
        handleStatusChange(bookingId, newStatus);
      }
    });
  };

  const handleDelete = async (bookingId) => {
    setBusy(true); setMessage(""); setError("");
    try {
      await deleteBooking(bookingId);
      setMessage("Booking deleted permanently.");
      await loadData(filterStatus);
    } catch (err) { setError(err.message || "Failed to delete booking"); }
    finally { setBusy(false); }
  };

  const triggerDelete = (bookingId) => {
    setConfirmDialog({
      title: 'Delete Booking',
      msg: '⚠️ DESTRUCTIVE ACTION: Are you sure you want to permanently delete this booking record? This cannot be undone.',
      btnClass: 'mb-btn-danger',
      btnText: 'Delete Permanently',
      onConfirm: () => {
        setConfirmDialog(null);
        handleDelete(bookingId);
      }
    });
  };

  const handleCounterSubmit = async (bookingId) => {
    if (!counterForm.newDate || !counterForm.newStartTime || !counterForm.newEndTime) {
      setError("Please fill in date and times for the counter-proposal.");
      return;
    }
    setBusy(true); setMessage(""); setError("");
    try {
      await counterProposeBooking(bookingId, counterForm);
      setMessage(`Counter-proposal sent for Booking #${bookingId}.`);
      setCounterId(null);
      await loadData(filterStatus);
    } catch (err) { setError(err.message || "Failed to counter-propose"); }
    finally { setBusy(false); }
  };

  const statusBadge = (status) => {
    const cls = {
      PENDING: "mb-badge-pending",
      APPROVED: "mb-badge-approved",
      REJECTED: "mb-badge-rejected",
      CANCELLED: "mb-badge-cancelled",
      COMPLETED: "mb-badge-completed",
    }[status] || "mb-badge-pending";
    return <span className={`mb-badge ${cls}`}>{status}</span>;
  };

  const pendingCount = bookings.filter(b => b.status === "PENDING").length;

  return (
    <section className="app-page mb-page">
      <div className="mb-header">
        <h2 className="mb-title">Manage Bookings</h2>
        <p className="mb-subtitle">
          Review, approve, reject, and manage all facility booking requests.
          {pendingCount > 0 && <strong style={{ color: "#d97706" }}> ({pendingCount} pending)</strong>}
        </p>
      </div>

      <div className="mb-toolbar">
        <div className="mb-select-wrapper">
          <select className="mb-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {loading && (
        <div className="mb-table-container" style={{ padding: "20px" }}>
           {[1, 2, 3, 4, 5].map(i => (
             <div key={i} style={{ display: 'flex', gap: '20px', marginBottom: '20px', alignItems: 'center' }}>
               <div className="sk-line" style={{ height: '30px', width: '20%' }}></div>
               <div className="sk-line" style={{ height: '30px', width: '15%' }}></div>
               <div className="sk-line" style={{ height: '30px', width: '20%' }}></div>
               <div className="sk-line" style={{ height: '30px', width: '10%' }}></div>
               <div className="sk-line" style={{ height: '30px', width: '15%' }}></div>
             </div>
           ))}
        </div>
      )}

      {!loading && bookings.length === 0 && (
        <div className="mb-table-container" style={{ textAlign: "center", padding: "60px 20px" }}>
          <p style={{ color: "#64748b", margin: 0, fontSize: "1.1rem" }}>No bookings match your criteria.</p>
        </div>
      )}

      {!loading && bookings.length > 0 && (
        <>
          <p style={{ margin: "0 0 16px 4px", color: "#64748b", fontSize: "0.9rem", fontWeight: "600" }}>
            Showing {bookings.length} booking(s)
          </p>
          <div className="mb-table-container">
            <table className="mb-table">
              <thead>
                <tr>
                  <th>Facility</th>
                  <th>Request Details</th>
                  <th>Purpose</th>
                  <th>Status & Remarks</th>
                  <th style={{ textAlign: "right", minWidth: '150px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <div className="mb-entity-cell">
                        <span className="mb-entity-title">{b.facilityName}</span>
                        <span className="mb-entity-sub">📍 {b.facilityLocation}</span>
                      </div>
                    </td>
                    <td>
                      <div className="mb-entity-cell">
                        <span className="mb-entity-title">📅 {b.bookingDate}</span>
                        <span className="mb-entity-sub">⏰ {b.startTime} - {b.endTime}</span>
                        <span className="mb-entity-sub" style={{ marginTop: '4px' }}>👤 By: {b.userName}</span>
                      </div>
                    </td>
                    <td>
                      <div className="mb-entity-cell">
                        <span className="mb-entity-title" style={{ maxWidth: '200px', whiteSpace: 'normal' }}>{b.purpose}</span>
                        <span className="mb-entity-sub">👥 Attendees: {b.attendeeCount || "—"}</span>
                      </div>
                    </td>
                    <td>
                      <div className="mb-entity-cell" style={{ gap: '8px', alignItems: 'stretch' }}>
                        {statusBadge(b.status)}
                        <input
                          className="mb-inline-input"
                          placeholder="Admin remarks..."
                          value={remarksMap[b.id] || ""}
                          onChange={(e) => setRemarksMap({ ...remarksMap, [b.id]: e.target.value })}
                          disabled={busy}
                        />
                      </div>
                    </td>
                    <td>
                      <div className="mb-actions" style={{ justifyContent: "flex-end" }}>
                        {b.status === "PENDING" && (
                          <>
                            <button className="mb-icon-btn mb-btn-approve" title="Approve" onClick={() => triggerStatusChange(b.id, "APPROVED")} disabled={busy}>✅</button>
                            <button className="mb-icon-btn mb-btn-reject" title="Reject" onClick={() => triggerStatusChange(b.id, "REJECTED")} disabled={busy}>❌</button>
                            <button className="mb-icon-btn mb-btn-propose" title="Counter-Propose" onClick={() => {
                              setCounterId(b.id);
                              setCounterForm({ newDate: b.bookingDate, newStartTime: b.startTime, newEndTime: b.endTime, note: '' });
                            }} disabled={busy}>🕒</button>
                          </>
                        )}
                        {b.status === "APPROVED" && (
                          <button className="mb-icon-btn mb-btn-complete" title="Mark as Completed" onClick={() => triggerStatusChange(b.id, "COMPLETED")} disabled={busy}>✓</button>
                        )}
                        <button className="mb-icon-btn mb-btn-delete" title="Delete record" onClick={() => triggerDelete(b.id)} disabled={busy}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Counter-Propose Modal Overlay */}
      {counterId && (
        <div className="mb-modal-overlay">
          <div className="mb-modal-card">
            <h3 className="mb-modal-title">Counter-Propose Time</h3>
            <div className="mb-modal-form-group">
              <label>New Date</label>
              <input type="date" className="mb-modal-input" value={counterForm.newDate} onChange={e => setCounterForm(f => ({ ...f, newDate: e.target.value }))} />
            </div>
            <div className="mb-modal-row">
              <div className="mb-modal-form-group" style={{ flex: 1 }}>
                <label>Start Time</label>
                <input type="time" className="mb-modal-input" value={counterForm.newStartTime} onChange={e => setCounterForm(f => ({ ...f, newStartTime: e.target.value }))} />
              </div>
              <div className="mb-modal-form-group" style={{ flex: 1 }}>
                <label>End Time</label>
                <input type="time" className="mb-modal-input" value={counterForm.newEndTime} onChange={e => setCounterForm(f => ({ ...f, newEndTime: e.target.value }))} />
              </div>
            </div>
            <div className="mb-modal-form-group">
              <label>Reason / Note</label>
              <input type="text" className="mb-modal-input" placeholder="e.g. Lab cleaning at 1PM" value={counterForm.note} onChange={e => setCounterForm(f => ({ ...f, note: e.target.value }))} />
            </div>
            <div className="mb-modal-actions">
              <button className="mb-btn mb-btn-secondary" onClick={() => setCounterId(null)} disabled={busy}>Cancel</button>
              <button className="mb-btn mb-btn-primary" onClick={() => handleCounterSubmit(counterId)} disabled={busy}>Send Proposal</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmDialog && (
        <div className="mb-modal-overlay">
          <div className="mb-modal-card" style={{ maxWidth: '400px' }}>
            <h3 className="mb-modal-title">{confirmDialog.title}</h3>
            <p style={{ color: '#475569', lineHeight: 1.5, marginBottom: '24px' }}>{confirmDialog.msg}</p>
            <div className="mb-modal-actions">
              <button className="mb-btn mb-btn-secondary" onClick={() => setConfirmDialog(null)} disabled={busy}>Cancel</button>
              <button className={`mb-btn ${confirmDialog.btnClass}`} onClick={confirmDialog.onConfirm} disabled={busy}>{busy ? "Processing..." : confirmDialog.btnText}</button>
            </div>
          </div>
        </div>
      )}

    </section>
  );
}

export default ManageBookings;
