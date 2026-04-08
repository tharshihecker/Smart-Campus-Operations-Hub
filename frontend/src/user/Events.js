import React, { useEffect, useState } from 'react';
import { fetchEvents, createEventBooking, getCurrentUserId, fetchProfile, fetchUserEventBookings, cancelEventBooking, fetchEventAvailability } from '../api';
import Toast from '../components/Toast';
import './PageBlocks.css';

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
    <section className="content-shell">
      <h2>Campus Events</h2>
      <p className="content-subtitle">Discover student life activities, workshops, and networking sessions.</p>
      <div className="content-grid">
        {/* Toast popup container */}
        <Toast toast={toast} onClose={() => setToast(null)} />
        {loading && <p className="state-text">Loading events...</p>}
        {error && <p className="state-text error">{error}</p>}
        {!loading && !error && events.length === 0 && <p className="state-text">No events available yet.</p>}
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
        }).map(event => (
          <article className="content-card" key={event.id}>
            {event.imageUrl && <img src={event.imageUrl} alt={event.title} style={{ width: '100%', height: 160, objectFit: 'cover' }} />}
            <h3>{event.title}</h3>
            <p>{event.description}</p>
            <p className="content-meta">
              {event.eventDate} {event.startTime ? `| ${event.startTime} - ${event.endTime || ''}` : ''} | {event.location}
            </p>
            <p className="content-meta">Capacity: {event.capacity ?? '—'}</p>
            <p className="content-meta">Booking closes: {event.bookingCloseDate || '—'}</p>
            {availability[event.id] && (
              <p className="content-meta">Remaining seats: {availability[event.id].remaining === -1 ? '—' : availability[event.id].remaining} {availability[event.id].waitlistCount > 0 ? `(waitlist ${availability[event.id].waitlistCount})` : ''}</p>
            )}
            <div style={{ marginTop: 8 }}>
              {(() => {
                const userId = getCurrentUserId();
                const isBooked = userId && userBookings.some(b => b.eventId === event.id);
                if (isBooked) {
                  const booking = userBookings.find(b => b.eventId === event.id);
                  return (
                    <>
                      <button className="btn-secondary" disabled>Booked</button>
                      <button className="btn-danger" style={{ marginLeft: 8 }} onClick={async () => {
                        try {
                            await cancelEventBooking(booking.id, getCurrentUserId());
                            // remove booking locally
                            setUserBookings(prev => prev.filter(x => x.id !== booking.id));
                            // update availability for this event
                            try { const av = await fetchEventAvailability(event.id); setAvailability(prev => ({ ...prev, [event.id]: av })); } catch (e) {}
                            setToast({ type: 'success', title: 'Booking cancelled', message: 'Your booking was cancelled successfully.' });
                        } catch (err) { setToast({ type: 'error', title: 'Cancel failed', message: sanitizeMessage(err.message || 'Cancel failed') }); }
                      }}>Cancel</button>
                    </>
                  );
                }

                return (
                  <button className="btn-primary" onClick={async () => {
                    setCurrentEvent(event);
                    const userId = getCurrentUserId();
                    if (userId) {
                      try {
                        const profile = await fetchProfile(userId);
                        setGuestName(profile.fullName || '');
                        setGuestEmail(profile.email || '');
                      } catch (e) {
                        // ignore
                      }
                    }
                    setShowModal(true);
                  }}>Book</button>
                );
              })()}
            </div>
          </article>
        ))}
      </div>

      {showModal && currentEvent && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Book: {currentEvent.title}</h3>
            <label>Student Number</label>
            <input value={studentNumber} onChange={(e) => setStudentNumber(e.target.value)} />
            <label>NIC</label>
            <input value={nic} onChange={(e) => setNic(e.target.value)} />
            <label>Name</label>
            <input value={guestName} onChange={(e) => setGuestName(e.target.value)} />
            <label>Email (optional)</label>
            <input value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} />
            <div style={{ marginTop: 12 }}>
              <button className="btn-primary" onClick={async () => {
                try {
                  const userId = getCurrentUserId();
                  const payload = { userId, studentNumber, nic, guestName, guestEmail };
                    const res = await createEventBooking(currentEvent.id, payload);
                    const title = res.status === 'CONFIRMED' ? 'Booking confirmed' : 'Added to waitlist';
                    const seatMsg = res.seatNumber ? ` Seat: ${res.seatNumber}` : '';
                    setToast({ type: 'success', title, message: `Booking #${res.bookingNumber}.${seatMsg}` });
                    // add to local bookings so UI updates
                    setUserBookings(prev => [...prev, { id: res.bookingId, eventId: currentEvent.id, bookingNumber: res.bookingNumber, status: res.status, seatNumber: res.seatNumber }]);
                    // update availability for this event
                    try { const av = await fetchEventAvailability(currentEvent.id); setAvailability(prev => ({ ...prev, [currentEvent.id]: av })); } catch (e) {}
                  setShowModal(false);
                  setStudentNumber(''); setNic(''); setGuestName(''); setGuestEmail('');
                } catch (err) {
                  setToast({ type: 'error', title: 'Booking failed', message: sanitizeMessage(err.message || 'Booking failed') });
                }
              }}>Confirm Booking</button>
              <button className="btn-secondary" onClick={() => setShowModal(false)} style={{ marginLeft: 8 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default Events;
