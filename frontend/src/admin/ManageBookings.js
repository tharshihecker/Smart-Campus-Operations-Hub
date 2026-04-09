import React, { useEffect, useState } from "react";
import {
  fetchAllBookings,
  updateBookingStatus,
  deleteBooking,
  counterProposeBooking
} from "../api";
import "./Admin.css";

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

  const loadData = async (status) => {
    setLoading(true); setError("");
    try {
      setBookings(await fetchAllBookings(status || undefined));
    } catch (err) { setError(err.message || "Failed to load bookings"); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(filterStatus); }, [filterStatus]);

  const handleStatusChange = async (bookingId, newStatus) => {
    setBusy(true); setMessage(""); setError("");
    try {
      await updateBookingStatus(bookingId, newStatus, remarksMap[bookingId] || "");
      setMessage(`Booking #${bookingId} updated to ${newStatus}.`);
      await loadData(filterStatus);
    } catch (err) { setError(err.message || "Failed to update booking status"); }
    finally { setBusy(false); }
  };

  const handleDelete = async (bookingId) => {
    if (!window.confirm("Delete this booking record permanently?")) return;
    setBusy(true); setMessage(""); setError("");
    try {
      await deleteBooking(bookingId);
      setMessage("Booking deleted.");
      await loadData(filterStatus);
    } catch (err) { setError(err.message || "Failed to delete booking"); }
    finally { setBusy(false); }
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
      PENDING: "badge-pending",
      APPROVED: "badge-approved",
      REJECTED: "badge-rejected",
      CANCELLED: "badge-cancelled",
      COMPLETED: "badge-completed",
    }[status] || "badge-pending";
    return <span className={`badge ${cls}`}>{status}</span>;
  };

  const pendingCount = bookings.filter(b => b.status === "PENDING").length;

  return (
    <section className="admin-panel">
      <h2>Manage Bookings</h2>
      <p className="admin-subtitle">
        Review, approve, reject, and manage all facility booking requests.
        {pendingCount > 0 && <strong style={{ color: "#b45309" }}> ({pendingCount} pending)</strong>}
      </p>

      <div className="admin-search">
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}
      {loading && <p className="state-text">Loading bookings...</p>}

      {!loading && bookings.length === 0 && <div className="empty-state"><p>No bookings found.</p></div>}

      {!loading && bookings.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Facility</th>
                <th>User</th>
                <th>Date</th>
                <th>Time</th>
                <th>Purpose</th>
                <th>Attendees</th>
                <th>Status</th>
                <th>Admin Remarks</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td>
                    <strong>{b.facilityName}</strong>
                    <br />
                    <span style={{ fontSize: "0.8rem", color: "#64748b" }}>{b.facilityLocation}</span>
                  </td>
                  <td>{b.userName}</td>
                  <td>{b.bookingDate}</td>
                  <td>{b.startTime} - {b.endTime}</td>
                  <td style={{ maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.purpose}</td>
                  <td>{b.attendeeCount || "—"}</td>
                  <td>{statusBadge(b.status)}</td>
                  <td>
                    <input
                      placeholder="Remarks..."
                      value={remarksMap[b.id] || ""}
                      onChange={(e) => setRemarksMap({ ...remarksMap, [b.id]: e.target.value })}
                      style={{ width: "120px", padding: "4px 6px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem" }}
                      disabled={busy}
                    />
                  </td>
                  <td className="actions">
                    {b.status === "PENDING" && (
                      <>
                        <button className="btn-approve btn-sm" onClick={() => handleStatusChange(b.id, "APPROVED")} disabled={busy}>Approve</button>
                        <button className="btn-reject btn-sm" onClick={() => handleStatusChange(b.id, "REJECTED")} disabled={busy}>Reject</button>
                        <button className="btn-sm" style={{ background: '#f59e0b', color: '#fff', border: 'none' }} onClick={() => {
                          setCounterId(b.id);
                          setCounterForm({ newDate: b.bookingDate, newStartTime: b.startTime, newEndTime: b.endTime, note: '' });
                        }} disabled={busy}>Propose Alternate Time</button>
                      </>
                    )}
                    {b.status === "APPROVED" && (
                      <button className="btn-sm btn-primary" onClick={() => handleStatusChange(b.id, "COMPLETED")} disabled={busy}>Complete</button>
                    )}
                    <button className="btn-sm btn-danger" onClick={() => handleDelete(b.id)} disabled={busy}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ marginTop: "16px", color: "#94a3b8", fontSize: "0.85rem" }}>
        Showing {bookings.length} booking(s)
      </p>

      {/* Counter-Propose Modal Overlay */}
      {counterId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', minWidth: '300px', maxWidth: '400px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Counter-Propose Time</h3>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>New Date</label>
              <input type="date" value={counterForm.newDate} onChange={e => setCounterForm(f => ({ ...f, newDate: e.target.value }))} className="form-control" />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Start Time</label>
                <input type="time" value={counterForm.newStartTime} onChange={e => setCounterForm(f => ({ ...f, newStartTime: e.target.value }))} className="form-control" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>End Time</label>
                <input type="time" value={counterForm.newEndTime} onChange={e => setCounterForm(f => ({ ...f, newEndTime: e.target.value }))} className="form-control" />
              </div>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Reason / Note</label>
              <input type="text" placeholder="e.g. Lab cleaning at 1PM" value={counterForm.note} onChange={e => setCounterForm(f => ({ ...f, note: e.target.value }))} className="form-control" />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setCounterId(null)} disabled={busy}>Cancel</button>
              <button className="btn-primary" onClick={() => handleCounterSubmit(counterId)} disabled={busy}>Send Proposal</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default ManageBookings;
