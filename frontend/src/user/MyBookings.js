import React, { useCallback, useEffect, useState } from 'react';
import { fetchUserBookings, cancelBooking, createBooking, updateBooking, fetchFacilities, fetchBookingQR, checkinBooking } from '../api';
import './Profile.css';
import './MyBookings.css';

function statusBadge(status) {
  const cls = `badge badge-${status?.toLowerCase()}`;
  return <span className={cls}>{status}</span>;
}

/* ── QR Modal ─────────────────────────────────────────── */
function QRModal({ booking, onClose }) {
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkinMsg, setCheckinMsg] = useState('');
  const userId = localStorage.getItem('smartcampus_user_id');
  const today = new Date().toISOString().split('T')[0];
  const isToday = booking.bookingDate === today;

  useEffect(() => {
    fetchBookingQR(booking.id)
      .then(data => { setQrData(data); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, [booking.id]);

  const handleCheckin = async () => {
    try {
      const res = await checkinBooking(booking.id, userId);
      setCheckinMsg(res.message || '✅ Checked in!');
    } catch (err) {
      setCheckinMsg(err.message || 'Check-in failed');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>📱 Booking QR Code</h3>
        <p>{booking.facilityName} · {booking.bookingDate}</p>

        {loading && <p>Generating QR code…</p>}
        {!loading && qrData?.qrBase64 && (
          <>
            <img src={qrData.qrBase64} alt="Booking QR Code" className="qr-img" />
            <p>Show this QR code at the facility entrance for check-in.</p>
          </>
        )}
        {!loading && !qrData?.qrBase64 && (
          <p className="error-text">Failed to load QR code.</p>
        )}

        <div className="modal-actions">
          {isToday && booking.status === 'APPROVED' && !checkinMsg && (
            <button type="button" onClick={handleCheckin} className="btn-primary">
              ✅ Check In Now
            </button>
          )}
          {checkinMsg && (
            <p className="success-text">{checkinMsg}</p>
          )}
          <button type="button" onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function MyBookings() {
  const userId = localStorage.getItem('smartcampus_user_id');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState({ type: '', text: '' });
  const [showForm, setShowForm] = useState(false);
  const [facilities, setFacilities] = useState([]);
  const [formLoading, setFormLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [qrBooking, setQrBooking] = useState(null);
  const [bookingForm, setBookingForm] = useState({
    facilityId: '', bookingDate: '', startTime: '', endTime: '', purpose: '', notes: '', attendeeCount: 1,
  });

  const loadBookings = useCallback(() => {
    if (!userId) { setError('Session expired. Please log in again.'); setLoading(false); return; }
    setLoading(true);
    fetchUserBookings(userId)
      .then(data => { setBookings(data); setLoading(false); })
      .catch(err => { setError(err.message || 'Failed to load bookings'); setLoading(false); });
  }, [userId]);

  // Effect to clear action messages after 3 seconds
  useEffect(() => {
    if (actionMsg.text) {
      const timer = setTimeout(() => {
        setActionMsg({ type: '', text: '' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [actionMsg.text]);
  const loadFacilities = useCallback(async () => {
    try {
      const data = await fetchFacilities({ status: 'ACTIVE' });
      setFacilities(data);
    } catch (err) {
      setFacilities([]);
    }
  }, []);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  const handleCancel = async (bookingId) => {
    if (!window.confirm('Cancel this booking?')) return;
    setActionMsg({ type: '', text: '' });
    try {
      await cancelBooking(bookingId, userId);
      setActionMsg({ type: 'success', text: '✅ Booking cancelled successfully.' });
      loadBookings();
    } catch (err) {
      setActionMsg({ type: 'error', text: err.message || 'Failed to cancel booking' });
    }
  };

  const handleFormChange = e => {
    const { name, value } = e.target;
    setBookingForm(prev => ({ ...prev, [name]: name === 'attendeeCount' ? Number(value) : value }));
  };

  const handleCreateBooking = async e => {
    e.preventDefault();
    if (bookingForm.startTime >= bookingForm.endTime) {
      setActionMsg({ type: 'error', text: 'End Time must be after Start Time.' });
      return;
    }
    setFormLoading(true); setActionMsg({ type: '', text: '' });
    try {
      if (bookingForm.id) {
        await updateBooking(bookingForm.id, { ...bookingForm, userId: userId });
        setActionMsg({ type: 'success', text: '✅ Booking updated successfully!' });
      } else {
        await createBooking({ ...bookingForm, userId: userId });
        setActionMsg({ type: 'success', text: '✅ Booking submitted! Awaiting admin approval.' });
      }
      setShowForm(false);
      setBookingForm({ facilityId: '', bookingDate: '', startTime: '', endTime: '', purpose: '', notes: '', attendeeCount: 1 });
      loadBookings();
        } catch (err) {
      setActionMsg({ type: 'error', text: err.message || 'Failed to process booking' });
        } finally { setFormLoading(false); }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const statuses = ['', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED', 'CHECKED_IN'];
  const filtered = statusFilter ? bookings.filter(b => b.status === statusFilter) : bookings;

  return (
    <section className="profile-shell">
      <div className="profile-header">
        <h2>My Bookings</h2>
        <p>Manage your facility reservations and check bookings status.</p>
      </div>

      {actionMsg.text && <div className={`profile-alert ${actionMsg.type}`}>{actionMsg.text}</div>}

      <div className="profile-card">
        <h3>
          <span className="card-icon">{bookingForm.id ? '✏️' : '➕'}</span>
          {bookingForm.id ? 'Edit Booking' : 'New Booking'}
          {!showForm && (
            <button type="button" className="btn-edit-trigger" onClick={() => { loadFacilities(); setShowForm(true); setActionMsg({ type: '', text: '' }); }}>
              Book a Facility
            </button>
          )}
        </h3>
        {showForm && (
          <form onSubmit={handleCreateBooking} className="profile-form">
            <div className="profile-form-row">
              <label>Facility *
                <select name="facilityId" value={bookingForm.facilityId} onChange={handleFormChange} required>
                  <option value="">Select a facility</option>
                  {facilities.map(f => <option key={f.id} value={f.id}>{f.name} — {f.location} (Cap: {f.capacity})</option>)}
                </select>
              </label>
              <label>Date *
                <input type="date" name="bookingDate" min={todayStr} value={bookingForm.bookingDate} onChange={handleFormChange} required />
              </label>
            </div>
            <div className="profile-form-row">
              <label>Start Time *<input type="time" name="startTime" value={bookingForm.startTime} onChange={handleFormChange} required /></label>
              <label>End Time *<input type="time" name="endTime" value={bookingForm.endTime} onChange={handleFormChange} required /></label>
            </div>
            <div className="profile-form-row">
              <label>Purpose *<input name="purpose" value={bookingForm.purpose} onChange={handleFormChange} placeholder="e.g. Guest Lecture" required /></label>
              <label>Attendee Count<input type="number" name="attendeeCount" min="1" value={bookingForm.attendeeCount} onChange={handleFormChange} /></label>
            </div>
            <label>Notes
              <textarea name="notes" value={bookingForm.notes} onChange={handleFormChange} placeholder="Additional notes for admin…" rows={2} />
            </label>
            <div className="profile-form-actions">
              <button type="submit" className="btn-profile primary" disabled={formLoading}>
                {formLoading ? 'Submitting…' : (bookingForm.id ? 'Update Booking' : 'Submit Booking')}
              </button>
              <button type="button" className="btn-profile secondary" onClick={() => {
                setShowForm(false);
                setBookingForm({ facilityId: '', bookingDate: '', startTime: '', endTime: '', purpose: '', notes: '', attendeeCount: 1 });
              }}>Cancel</button>
            </div>
          </form>
        )}
      </div>

      <div className="profile-card">
        <h3><span className="card-icon">📅</span>Reservation History</h3>

        <div className="filter-bar">
          {statuses.map(s => (
            <button key={s} type="button" onClick={() => setStatusFilter(s)}
              className={statusFilter === s ? 'active' : ''}>
              {s || 'All'}
            </button>
          ))}
        </div>

        {loading && <p className="state-text">Loading bookings…</p>}
        {error && <p className="state-text error">{error}</p>}
        {!loading && !error && filtered.length === 0 && (
          <div className="empty-state">
            <p>📭</p>
            <p>{statusFilter ? `No ${statusFilter} bookings found.` : 'No bookings yet. Click "Book a Facility" to get started!'}</p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="bookings-list">
            {filtered.map(b => (
              <div key={b.id} className="booking-card">
                <div className="booking-card-header">
                  <h4>{b.facilityName || `Facility #${b.facilityId}`}</h4>
                  {statusBadge(b.status)}
                </div>
                <div className="booking-meta">
                  <span>📅 {b.bookingDate}</span>
                  <span>🕐 {b.startTime} – {b.endTime}</span>
                  {b.attendeeCount && <span>👥 {b.attendeeCount}</span>}
                  <span>📍 {b.facilityLocation}</span>
                </div>
                <p className="booking-purpose"><strong>Purpose:</strong> {b.purpose}</p>
                {b.adminRemarks && (
                  <p className="booking-remarks">
                    <strong>Admin Remarks:</strong> {b.adminRemarks}
                  </p>
                )}
                <div className="booking-actions-row">
                  {b.status === 'PENDING' && (
                    <>
                      <button type="button" className="btn-profile warning" onClick={() => {
                        setBookingForm({
                          id: b.id,
                          facilityId: b.facilityId,
                          bookingDate: b.bookingDate,
                          startTime: b.startTime,
                          endTime: b.endTime,
                          purpose: b.purpose,
                          notes: b.notes || '',
                          attendeeCount: b.attendeeCount || 1,
                        });
                        loadFacilities();
                        setShowForm(true);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}>
                        Edit
                      </button>
                      <button type="button" className="btn-profile danger" onClick={() => handleCancel(b.id)}>
                        Cancel
                      </button>
                    </>
                  )}
                  {(b.status === 'APPROVED' || b.status === 'CHECKED_IN') && (
                    <button type="button" className="btn-profile primary" onClick={() => setQrBooking(b)}>
                      📱 Show QR Code
                    </button>
                  )}
                </div>
                <div className="booking-timestamp">
                  Created: {new Date(b.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {qrBooking && <QRModal booking={qrBooking} onClose={() => setQrBooking(null)} />}
    </section>
  );
}

export default MyBookings;
