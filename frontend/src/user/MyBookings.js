import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchUserBookings, cancelBooking, createBooking, updateBooking, fetchFacilities, fetchBookingQR, resendBookingEmail, checkinBooking, fetchFacilityBookingsByDate, acceptCounterProposal, rejectCounterProposal } from '../api';
import './Profile.css';
import './MyBookings.css';

function statusBadge(status) {
  const cls = `badge badge-${status?.toLowerCase()}`;
  return <span className={cls}>{status}</span>;
}

/** Compute inverse free blocks and split into 1-hour increments */
function getFreeBlocks(openFrom, openTo, bookings, chunkMins = 60) {
  const toMins = (t) => { const [h, m] = t.split(':'); return parseInt(h) * 60 + parseInt(m); };
  const toStr = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

  let start = toMins(openFrom);
  let end = toMins(openTo);
  let sorted = [...bookings].map(b => [toMins(b.startTime.slice(0, 5)), toMins(b.endTime.slice(0, 5))]).sort((a, b) => a[0] - b[0]);

  // Compute raw free gaps
  let gaps = [];
  let cur = start;
  for (let b of sorted) {
    if (b[0] > cur) gaps.push([cur, b[0]]);
    cur = Math.max(cur, b[1]);
  }
  if (cur < end) gaps.push([cur, end]);

  // Split each gap into fixed-size chunks
  let blocks = [];
  for (let [gStart, gEnd] of gaps) {
    let s = gStart;
    while (s + chunkMins <= gEnd) {
      blocks.push({ start: toStr(s), end: toStr(s + chunkMins) });
      s += chunkMins;
    }
    if (s < gEnd && (gEnd - s) >= 30) {
      blocks.push({ start: toStr(s), end: toStr(gEnd) });
    }
  }

  return blocks;
}

function fmtTime(t = "") {
  if (!t) return "";
  const [h, m] = t.split(":");
  return `${h % 12 || 12}:${m} ${h >= 12 ? "PM" : "AM"}`;
}

/* ── QR Modal ─────────────────────────────────────────── */
function QRModal({ booking, onClose, onResendEmail }) {
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkinMsg, setCheckinMsg] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState({ type: '', text: '' });
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

  const handleResend = async () => {
    setResendLoading(true);
    setResendMsg({ type: '', text: '' });
    try {
      await onResendEmail(booking.id);
      setResendMsg({ type: 'success', text: '✅ Email sent successfully.' });
    } catch (err) {
      setResendMsg({ type: 'error', text: err.message || 'Failed to send email.' });
    } finally {
      setResendLoading(false);
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
          {(booking.status === 'APPROVED' || booking.status === 'CHECKED_IN') && (
            <button type="button" onClick={handleResend} className="btn-secondary" disabled={resendLoading}>
              {resendLoading ? 'Sending…' : '✉️ Send Email'}
            </button>
          )}
          {isToday && booking.status === 'APPROVED' && !checkinMsg && (
            <button type="button" onClick={handleCheckin} className="btn-primary">
              ✅ Check In Now
            </button>
          )}
          {resendMsg.text && (
            <p className={resendMsg.type === 'error' ? 'error-text' : 'success-text'}>{resendMsg.text}</p>
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
  const navigate = useNavigate();
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
    id: null, facilityId: '', bookingDate: '', startTime: '', endTime: '', purpose: '', notes: '', attendeeCount: 1,
  });

  const [dayBookings, setDayBookings] = useState([]);
  const [loadingDay, setLoadingDay] = useState(false);

  useEffect(() => {
    if (!bookingForm.bookingDate || !bookingForm.facilityId) return;
    setLoadingDay(true);
    fetchFacilityBookingsByDate(bookingForm.facilityId, bookingForm.bookingDate)
      .then(b => setDayBookings(b.filter(bk => bk.id !== bookingForm.id))) // exclude self
      .catch(() => setDayBookings([]))
      .finally(() => setLoadingDay(false));
  }, [bookingForm.bookingDate, bookingForm.facilityId, bookingForm.id]);

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

  const handleAcceptCounter = async (bookingId) => {
    setActionMsg({ type: '', text: '' });
    try {
      await acceptCounterProposal(bookingId, userId);
      setActionMsg({ type: 'success', text: '✅ Counter-proposal accepted. Booking confirmed.' });
      loadBookings();
    } catch (err) {
      setActionMsg({ type: 'error', text: err.message || 'Failed to accept counter-proposal' });
    }
  };

  const handleRejectCounter = async (bookingId) => {
    if (!window.confirm('Reject this proposal? The booking will be rejected permanently.')) return;
    setActionMsg({ type: '', text: '' });
    try {
      await rejectCounterProposal(bookingId, userId);
      setActionMsg({ type: 'success', text: 'Booking rejected successfully.' });
      loadBookings();
    } catch (err) {
      setActionMsg({ type: 'error', text: err.message || 'Failed to reject counter-proposal' });
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
        const { id, ...updateData } = bookingForm;
        await updateBooking(bookingForm.id, updateData);
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
            <button type="button" className="btn-edit-trigger btn-primary" style={{ padding: '8px 16px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => navigate('/facilities')}>
              <span>🏢</span> Book a Facility
            </button>
          )}
        </h3>
        {showForm && (() => {
          const selectedFacility = facilities.find(f => f.id === bookingForm.facilityId);
          return (
            <form onSubmit={handleCreateBooking} className="profile-form">
              {selectedFacility && bookingForm.bookingDate && (
                <div style={{ background: 'var(--surface)', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px solid var(--border)' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: 'var(--text-main)' }}>✨ Available Time Slots for {bookingForm.bookingDate}</h4>
                  <p style={{ margin: '0 0 10px 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Click a free slot below to automatically select it.</p>
                  {loadingDay ? <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Calculating free slots...</p> :
                    (() => {
                      const freeBlocks = getFreeBlocks(selectedFacility.availableFrom.slice(0, 5), selectedFacility.availableTo.slice(0, 5), dayBookings);
                      if (freeBlocks.length === 0) return <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--brand-danger)' }}>🚫 Fully booked for the entire day.</p>;
                      return (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                          {freeBlocks.map((block, idx) => (
                            <button
                              key={idx} type="button"
                              onClick={() => setBookingForm(prev => ({ ...prev, startTime: block.start, endTime: block.end }))}
                              style={{
                                background: 'rgba(20, 184, 166, 0.08)', color: 'var(--brand-teal)', border: '1px solid rgba(20, 184, 166, 0.25)', padding: '6px 4px',
                                borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '600',
                                textAlign: 'center', transition: 'all 0.2s', whiteSpace: 'nowrap',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                              }}
                              onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(20, 184, 166, 0.2)'; e.currentTarget.style.borderColor = 'var(--brand-teal)'; }}
                              onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(20, 184, 166, 0.08)'; e.currentTarget.style.borderColor = 'rgba(20, 184, 166, 0.25)'; }}
                            >
                              {fmtTime(block.start)} – {fmtTime(block.end)}
                            </button>
                          ))}
                        </div>
                      );
                    })()
                  }
                </div>
              )}
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
                  setBookingForm({ id: null, facilityId: '', bookingDate: '', startTime: '', endTime: '', purpose: '', notes: '', attendeeCount: 1 });
                }}>Cancel</button>
              </div>
            </form>
          );
        })}
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
                {b.status === 'APPROVED' && (
                  <p className="booking-note">📩 QR code also emailed to your registered email address.</p>
                )}
                <div className="booking-actions-row">
                  {b.status === 'PENDING' && (
                    <>
                      <button type="button" className="btn-profile warning" onClick={async () => {
                        setActionMsg({ type: '', text: '' });
                        await loadFacilities();
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
                  {b.status === 'COUNTER_PROPOSED' && (
                    <div style={{ background: '#fdf6e3', padding: '12px', borderRadius: '8px', border: '1px solid #fcebb6', width: '100%', marginBottom: '10px' }}>
                      <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#b45309', fontWeight: 'bold' }}>⚠️ Admin Counter-Proposal</p>
                      <p style={{ margin: '0 0 5px 0', fontSize: '0.85rem' }}>The admin suggested a new time for your booking:</p>
                      <ul style={{ margin: '0 0 10px 0', paddingLeft: '20px', fontSize: '0.85rem' }}>
                        <li><strong>Date:</strong> {b.counterProposedDate}</li>
                        <li><strong>Time:</strong> {b.counterProposedStartTime} – {b.counterProposedEndTime}</li>
                        {b.counterProposalNote && <li><strong>Note:</strong> {b.counterProposalNote}</li>}
                      </ul>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button type="button" className="btn-profile primary" onClick={() => handleAcceptCounter(b.id)}>Accept Alternate Time</button>
                        <button type="button" className="btn-profile danger" onClick={() => handleRejectCounter(b.id)}>Reject (Cancel Booking)</button>
                      </div>
                    </div>
                  )}
                  {(b.status === 'APPROVED' || b.status === 'CHECKED_IN') && (
                    <>
                      <button type="button" className="btn-profile primary" onClick={() => setQrBooking(b)}>
                        📱 Show QR Code
                      </button>
                    </>
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

      {qrBooking && (
        <QRModal
          booking={qrBooking}
          onClose={() => setQrBooking(null)}
          onResendEmail={resendBookingEmail}
        />
      )}
    </section>
  );
}

export default MyBookings;
