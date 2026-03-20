import React, { useCallback, useEffect, useState } from 'react';
import { fetchUserBookings, cancelBooking, createBooking, fetchFacilities, fetchBookingQR, checkinBooking } from '../api';
import './Profile.css';

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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xl)', padding: 32, maxWidth: 380, width: '100%', textAlign: 'center' }}>
        <h3 style={{ margin: '0 0 4px', fontFamily: "'Outfit', sans-serif", color: 'var(--text-primary)' }}>📱 Booking QR Code</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.87rem', marginBottom: 20 }}>{booking.facilityName} · {booking.bookingDate}</p>

        {loading && <p style={{ color: 'var(--text-muted)' }}>Generating QR code…</p>}
        {!loading && qrData?.qrBase64 && (
          <>
            <img src={qrData.qrBase64} alt="Booking QR Code"
              style={{ width: 200, height: 200, border: '8px solid #fff', borderRadius: 12, margin: '0 auto 16px', display: 'block' }} />
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              Show this QR code at the facility entrance for check-in.
            </p>
          </>
        )}
        {!loading && !qrData?.qrBase64 && (
          <p style={{ color: '#f87171', margin: '12px 0' }}>Failed to load QR code.</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {isToday && booking.status === 'APPROVED' && !checkinMsg && (
            <button type="button" className="btn-primary" onClick={handleCheckin} style={{ width: '100%' }}>
              ✅ Check In Now
            </button>
          )}
          {checkinMsg && (
            <p style={{ color: '#34d399', fontWeight: 700, padding: '10px', background: 'rgba(52,211,153,0.1)', borderRadius: 8 }}>
              {checkinMsg}
            </p>
          )}
          <button type="button" className="btn-secondary" onClick={onClose} style={{ width: '100%' }}>
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

  useEffect(() => { loadBookings(); }, [loadBookings]);

  const loadFacilities = () => {
    fetchFacilities({ status: 'ACTIVE' }).then(data => setFacilities(data)).catch(() => setFacilities([]));
  };

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
    setFormLoading(true); setActionMsg({ type: '', text: '' });
    try {
      await createBooking({ ...bookingForm, userId: Number(userId) });
      setActionMsg({ type: 'success', text: '✅ Booking submitted! Awaiting admin approval.' });
      setShowForm(false);
      setBookingForm({ facilityId: '', bookingDate: '', startTime: '', endTime: '', purpose: '', notes: '', attendeeCount: 1 });
      loadBookings();
    } catch (err) {
      setActionMsg({ type: 'error', text: err.message || 'Failed to create booking' });
    } finally { setFormLoading(false); }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const statuses = ['', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED', 'CHECKED_IN'];
  const filtered = statusFilter ? bookings.filter(b => b.status === statusFilter) : bookings;

  return (
    <section className="profile-shell">
      <h2>My Bookings</h2>
      <p className="profile-subtitle">Manage your facility reservations and check bookings status.</p>

      {actionMsg.text && <div className={`profile-alert ${actionMsg.type}`}>{actionMsg.text}</div>}

      {/* ── New Booking Form ── */}
      <div className="profile-card">
        <h3>
          <span className="card-icon">➕</span>
          New Booking
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
                {formLoading ? 'Submitting…' : 'Submit Booking'}
              </button>
              <button type="button" className="btn-profile secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        )}
      </div>

      {/* ── Bookings List ── */}
      <div className="profile-card">
        <h3><span className="card-icon">📅</span>Reservation History</h3>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {statuses.map(s => (
            <button key={s} type="button" onClick={() => setStatusFilter(s)}
              style={{
                padding: '4px 12px', borderRadius: 999, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                border: statusFilter === s ? '2px solid var(--brand-teal)' : '1.5px solid var(--border-subtle)',
                background: statusFilter === s ? 'rgba(13,148,136,0.15)' : 'transparent',
                color: statusFilter === s ? '#5eead4' : 'var(--text-secondary)',
                transition: 'all 0.15s ease',
              }}>
              {s || 'All'}
            </button>
          ))}
        </div>

        {loading && <p className="state-text">Loading bookings…</p>}
        {error && <p className="state-text error">{error}</p>}
        {!loading && !error && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '2.5rem', marginBottom: 10 }}>📭</p>
            <p>{statusFilter ? `No ${statusFilter} bookings found.` : 'No bookings yet. Click "Book a Facility" to get started!'}</p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filtered.map(b => (
              <div key={b.id} style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1.1rem 1.2rem', background: 'var(--bg-glass)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>{b.facilityName || `Facility #${b.facilityId}`}</h4>
                  {statusBadge(b.status)}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <span>📅 {b.bookingDate}</span>
                  <span>🕐 {b.startTime} – {b.endTime}</span>
                  {b.attendeeCount && <span>👥 {b.attendeeCount}</span>}
                  <span>📍 {b.facilityLocation}</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}><strong style={{ color: 'var(--text-primary)' }}>Purpose:</strong> {b.purpose}</p>
                {b.adminRemarks && (
                  <p style={{ margin: 0, fontSize: '0.84rem', color: '#38bdf8', background: 'rgba(56,189,248,0.08)', padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(56,189,248,0.2)' }}>
                    <strong>Admin Remarks:</strong> {b.adminRemarks}
                  </p>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                  {(b.status === 'PENDING' || b.status === 'APPROVED') && (
                    <button type="button" className="btn-profile danger" style={{ padding: '5px 14px', fontSize: '0.82rem' }} onClick={() => handleCancel(b.id)}>
                      Cancel
                    </button>
                  )}
                  {(b.status === 'APPROVED' || b.status === 'CHECKED_IN') && (
                    <button type="button" className="btn-profile primary" style={{ padding: '5px 14px', fontSize: '0.82rem' }} onClick={() => setQrBooking(b)}>
                      📱 Show QR Code
                    </button>
                  )}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
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
