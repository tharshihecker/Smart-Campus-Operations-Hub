import React, { useEffect, useState } from 'react';
import { fetchEvents } from '../api';
import './PageBlocks.css';

function Events() {
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchEvents()
      .then(data => {
        if (!mounted) return;
        setEvents(data);
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
        {loading && <p className="state-text">Loading events...</p>}
        {error && <p className="state-text error">{error}</p>}
        {!loading && !error && events.length === 0 && <p className="state-text">No events available yet.</p>}
        {events.map(event => (
          <article className="content-card" key={event.id}>
            <h3>{event.title}</h3>
            <p>{event.description}</p>
            <p className="content-meta">
              {event.eventDate} | {event.location}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default Events;
