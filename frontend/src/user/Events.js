import React, { useEffect, useState } from 'react';
import { fetchEvents, createEventBooking, getCurrentUserId, fetchProfile, fetchUserEventBookings, cancelEventBooking, fetchEventAvailability } from '../api';
import Toast from '../components/Toast';
import './Events.css';

import { sanitizeMessage } from '../utils/ui';

function Events() {
  const [events, setEvents] = useState([]);
  const [userBookings, setUserBookings] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [studentNumber, setStudentNumber] = useState('');
  const [nic, setNic] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState({});

  useEffect(() => {
    let mounted = true;
    const userId = getCurrentUserId();
    Promise.all([fetchEvents(), userId ? fetchUserEventBookings(userId) : Promise.resolve([])])
      .then(async ([eventsData, bookings]) => {
        if (!mounted) return;
        setEvents(eventsData || []);
        setUserBookings(bookings || []);
        // fetch availability for each event
        try {
          const avs = await Promise.all((eventsData || []).map(ev => fetchEventAvailability(ev.id).catch(() => null)));
          const map = {};
          (eventsData || []).forEach((ev, idx) => { if (avs[idx]) map[ev.id] = avs[idx]; });
          setAvailability(map);
        } catch (e) {
          // ignore availability errors
        }
        setLoading(false);
      })
      .catch(err => {
        if (!mounted) return;
        setError(err.message || 'Failed to load events');
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="events-shell">
      <div className="events-hero">
        <p className="events-kicker">Experience Campus Life</p>
        <h1 className="events-title">Campus Events</h1>
        <p>Discover student life activities, workshops, networking sessions, and special get-togethers right here on campus. Join your friends and peers.</p>
      </div>

      <div className="events-grid">
        {/* Toast popup container */}
        <Toast toast={toast} onClose={() => setToast(null)} />

        {loading && <div className="state-text">Loading events...</div>}
        {error && <div className="state-text error">{error}</div>}
        {!loading && !error && events.length === 0 && (
          <div className="state-text">No events available yet. Check back later!</div>
        )}

        {events.filter(ev => {
          // hide if booking close date exists and is before today
          const today = new Date();
          if (ev.bookingCloseDate) {
            const close = new Date(ev.bookingCloseDate + 'T23:59:59');
            if (close < today) return false;
          }
          // hide if event date exists and is before today
          if (ev.eventDate) {
            const ed = new Date(ev.eventDate + 'T23:59:59');
            if (ed < today) return false;
          }
          return true;
        }).map(event => {
          const userId = getCurrentUserId();
          const activeBooking = userId && userBookings.find(b => b.eventId === event.id && b.status !== 'CANCELLED');
          const isWaitlisted = availability[event.id] && availability[event.id].remaining === 0;

          return (
            <article className="event-card" key={event.id}>
              {event.imageUrl ? (
                <img src={event.imageUrl} alt={event.title} className="event-img" />
              ) : (
                <div className="event-img-fallback">🎟️</div>
              )}

              <div className="event-body">
                <div className="event-header">
                  <h3>{event.title}</h3>
                </div>

                <p className="event-desc">{event.description}</p>

                <div className="event-details">
                  <div className="detail-item">
                    <div className="detail-icon">📅</div>
                    <div className="detail-text">
                      <span className="detail-label">Date</span>
                      <span className="detail-value">{event.eventDate || '—'}</span>
                    </div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-icon">🕒</div>
                    <div className="detail-text">
                      <span className="detail-label">Time</span>
                      <span className="detail-value">{event.startTime ? `${event.startTime} ${event.endTime ? `– ${event.endTime}` : ''}` : '—'}</span>
                    </div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-icon">📍</div>
                    <div className="detail-text">
                      <span className="detail-label">Location</span>
                      <span className="detail-value">{event.location || '—'}</span>
                    </div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-icon">🗓️</div>
                    <div className="detail-text">
                      <span className="detail-label">Booking Closes</span>
                      <span className="detail-value">{event.bookingCloseDate || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="event-footer">
                <div className="event-footer-info">
                  {availability[event.id] ? (
                    <div className={`seat-pill ${availability[event.id].remaining === 0 ? 'full' : ''}`}>
                      {availability[event.id].remaining === -1 ? (
                        <>👥 Unlimited Capacity</>
                      ) : availability[event.id].remaining === 0 ? (
                        <>🚫 Fully Booked</>
                      ) : (
                        <>🪑 {availability[event.id].remaining} left / {event.capacity}</>
                      )}
                      {availability[event.id].waitlistCount > 0 && ` (+${availability[event.id].waitlistCount} Waitlist)`}
                    </div>
                  ) : (
                    <div className="seat-pill">👥 Cap: {event.capacity ?? '—'}</div>
                  )}
                </div>

                <div className="event-actions">
                  {activeBooking ? (
                    activeBooking.status === 'CHECKED_IN' ? (
                      <button className="btn-secondary" style={{ background: '#d1fae5', color: '#065f46', borderColor: '#059669', cursor: 'default' }}>✅ Entered</button>
                    ) : (
                      <>
                        <button className="btn-secondary" disabled>Booked</button>
                        <button className="btn-danger" onClick={async () => {
                          try {
                            await cancelEventBooking(activeBooking.id, getCurrentUserId());
                            setUserBookings(prev => prev.filter(x => x.id !== activeBooking.id));
                            try { const av = await fetchEventAvailability(event.id); setAvailability(prev => ({ ...prev, [event.id]: av })); } catch (e) { }
                            setToast({ type: 'success', title: 'Booking cancelled', message: 'Your booking was cancelled successfully.' });
                          } catch (err) { setToast({ type: 'error', title: 'Cancel failed', message: sanitizeMessage(err.message || 'Cancel failed') }); }
                        }}>Cancel</button>
                      </>
                    )
                  ) : (
                    <button className="btn-primary" onClick={async () => {
                      setCurrentEvent(event);
                      const userId = getCurrentUserId();
                      if (userId) {
                        try {
                          const profile = await fetchProfile(userId);
                          setGuestName(profile.fullName || '');
                          setGuestEmail(profile.email || '');
                          setGuestPhone(profile.phone || '');
                          setStudentNumber(profile.studentNumber || profile.studentNo || '');
                        } catch (e) {
                          // ignore
                        }
                      }
                      setError('');
                      setShowModal(true);
                    }}>
                      {isWaitlisted ? 'Join Waitlist' : 'Book Now'}
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {showModal && currentEvent && (
        <div className="events-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="events-modal-card" onClick={e => e.stopPropagation()}>
            <button className="events-modal-close" onClick={() => setShowModal(false)}>✕</button>
            <div className="events-modal-header">
              <h3>{availability[currentEvent.id]?.remaining === 0 ? 'Waitlist for' : 'Book'}: {currentEvent.title}</h3>
              <p>📍 {currentEvent.location} · 📅 {currentEvent.eventDate}</p>
            </div>

            <div className="events-modal-body">
              {error && <div className="state-text error">{error}</div>}

              <div className="events-form-group">
                <label>Full Name</label>
                <input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="John Doe" />
              </div>

              <div className="events-form-group">
                <label>Email (Verified)</label>
                <input value={guestEmail} readOnly />
              </div>

              <div className="events-form-group">
                <label>Student Number</label>
                <input value={studentNumber} onChange={(e) => setStudentNumber(e.target.value)} placeholder="IT12345678" />
              </div>

              <div className="events-form-group">
                <label>Phone Number</label>
                <input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="+94 77 123 4567" />
              </div>

              <div className="events-modal-actions">
                <button className="btn-secondary" onClick={() => { setShowModal(false); setError(''); }}>Cancel</button>
                <button className="btn-primary" disabled={submitting} onClick={async () => {
                  if (submitting) return;
                  const studentValid = /^IT\d{8}$/i.test(studentNumber || '');
                  const phoneValid = (guestPhone || '') === '' || /^\+?\d{7,15}$/.test(guestPhone);
                  if (!studentValid) {
                    setError('Student number must start with IT followed by 8 digits (e.g. IT12345678).');
                    return;
                  }
                  if (!phoneValid) {
                    setError('Enter a valid phone number (digits only, 7–15 digits, optional leading +).');
                    return;
                  }
                  setSubmitting(true);
                  try {
                    const userId = getCurrentUserId();
                    const payload = { userId, studentNumber, nic, guestName, guestEmail, phone: guestPhone };
                    const res = await createEventBooking(currentEvent.id, payload);
                    const title = res.status === 'CONFIRMED' ? 'Booking confirmed' : 'Added to waitlist';
                    const seatMsg = res.seatNumber ? ` Seat: ${res.seatNumber}` : '';
                    const qrMsg = res.qrToken ? ` QR: ${res.qrToken}` : '';
                    setToast({ type: 'success', title, message: `Booking #${res.bookingNumber}.${seatMsg}${qrMsg}` });
                    setUserBookings(prev => [...prev, { id: res.bookingId, eventId: currentEvent.id, bookingNumber: res.bookingNumber, status: res.status, seatNumber: res.seatNumber, qrToken: res.qrToken }]);
                    try { const av = await fetchEventAvailability(currentEvent.id); setAvailability(prev => ({ ...prev, [currentEvent.id]: av })); } catch (e) { }
                    setShowModal(false);
                    setStudentNumber(''); setNic(''); setGuestName(''); setGuestEmail(''); setGuestPhone('');
                  } catch (err) {
                    setError(sanitizeMessage(err.message || 'Booking failed'));
                  } finally {
                    setSubmitting(false);
                  }
                }}>
                  {submitting ? 'Submitting…' : 'Confirm Registration'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default Events;
