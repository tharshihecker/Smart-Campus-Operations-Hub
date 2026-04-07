import React, { useEffect, useState } from "react";
import {
  fetchAllBookings,
  updateBookingStatus,
  deleteBooking,
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
                <th>ID</th>
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
                  <td>{b.id}</td>
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
    </section>
  );
}

export default ManageBookings;
