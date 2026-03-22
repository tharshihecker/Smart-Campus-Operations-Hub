import React, { useEffect, useMemo, useState } from "react";
import { fetchFacilities, fetchFacilityStatuses, fetchFacilityTypes, createBooking } from "../api";
import "./Facilities.css";

const defaultFilters = {
  q: "",
  type: "",
  minCapacity: "",
  location: "",
  status: "",
  sortBy: "name",
  sortDir: "asc",
};

function toLabel(value) {
  return value.replaceAll("_", " ");
}

function Facilities() {
  const [filters, setFilters] = useState(defaultFilters);
  const [facilityTypes, setFacilityTypes] = useState([]);
  const [facilityStatuses, setFacilityStatuses] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* Booking form state */
  const [bookingFacility, setBookingFacility] = useState(null);
  const [bookingForm, setBookingForm] = useState({ bookingDate: '', startTime: '', endTime: '', purpose: '', notes: '', attendeeCount: 1 });
  const [bookingMsg, setBookingMsg] = useState({ type: '', text: '' });
  const [bookingLoading, setBookingLoading] = useState(false);
  const userId = localStorage.getItem('smartcampus_user_id');

  useEffect(() => {
    Promise.all([fetchFacilityTypes(), fetchFacilityStatuses()])
      .then(([types, statuses]) => {
        setFacilityTypes(types);
        setFacilityStatuses(statuses);
      })
      .catch(() => {
        setFacilityTypes([]);
        setFacilityStatuses([]);
      });
  }, []);

  const queryFilters = useMemo(
    () => ({
      ...filters,
      minCapacity: filters.minCapacity === "" ? undefined : Number(filters.minCapacity),
    }),
    [filters]
  );

  useEffect(() => {
    setLoading(true);
    setError("");
    fetchFacilities(queryFilters)
      .then(data => {
        setFacilities(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || "Failed to load facilities");
        setLoading(false);
      });
  }, [queryFilters]);

  const onFilterChange = event => {
    const { name, value } = event.target;
    setFilters(previous => ({ ...previous, [name]: value }));
  };

  const handleBookingChange = e => {
    const { name, value } = e.target;
    setBookingForm(prev => ({ ...prev, [name]: name === 'attendeeCount' ? Number(value) : value }));
  };

  const openBookingForm = (facility) => {
    setBookingFacility(facility);
    setBookingForm({ bookingDate: '', startTime: facility.availableFrom || '', endTime: facility.availableTo || '', purpose: '', notes: '', attendeeCount: 1 });
    setBookingMsg({ type: '', text: '' });
  };

  const submitBooking = async (e) => {
    e.preventDefault();
    if (!userId) { setBookingMsg({ type: 'error', text: 'Please log in to book.' }); return; }
    setBookingLoading(true);
    setBookingMsg({ type: '', text: '' });
    try {
      await createBooking({
        facilityId: bookingFacility.id,
        userId: userId,
        ...bookingForm,
      });
      setBookingMsg({ type: 'success', text: 'Booking submitted! Awaiting admin approval.' });
      setTimeout(() => { setBookingFacility(null); setBookingMsg({ type: '', text: '' }); }, 2000);
    } catch (err) {
      setBookingMsg({ type: 'error', text: err.message || 'Booking failed' });
    } finally {
      setBookingLoading(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <section className="facility-shell">
      <h2>Facilities Catalogue</h2>
      <p className="facility-subtitle">
        Discover bookable lecture halls, labs, meeting rooms, and equipment across campus.
      </p>

      <div className="facility-filter-grid">
        <input name="q" value={filters.q} onChange={onFilterChange} placeholder="Search by name or description" />
        <select name="type" value={filters.type} onChange={onFilterChange}>
          <option value="">All types</option>
          {facilityTypes.map(type => (
            <option key={type} value={type}>
              {toLabel(type)}
            </option>
          ))}
        </select>
        <input
          name="minCapacity"
          type="number"
          min="0"
          value={filters.minCapacity}
          onChange={onFilterChange}
          placeholder="Minimum capacity"
        />
        <input name="location" value={filters.location} onChange={onFilterChange} placeholder="Location contains" />
        <select name="status" value={filters.status} onChange={onFilterChange}>
          <option value="">All status</option>
          {facilityStatuses.map(status => (
            <option key={status} value={status}>
              {toLabel(status)}
            </option>
          ))}
        </select>
        <select name="sortBy" value={filters.sortBy} onChange={onFilterChange}>
          <option value="name">Sort by name</option>
          <option value="capacity">Sort by capacity</option>
          <option value="location">Sort by location</option>
          <option value="type">Sort by type</option>
          <option value="status">Sort by status</option>
        </select>
        <select name="sortDir" value={filters.sortDir} onChange={onFilterChange}>
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
      </div>

      {loading && <p className="state-text">Loading facilities...</p>}
      {error && <p className="state-text error">{error}</p>}
      {!loading && !error && facilities.length === 0 && (
        <p className="state-text">No facilities match your current filters.</p>
      )}

      <div className="facility-grid">
        {facilities.map(facility => (
          <article className="facility-card" key={facility.id}>
            <div className="facility-head">
              <h3>{facility.name}</h3>
              <span className={`facility-status status-${facility.status.toLowerCase()}`}>{toLabel(facility.status)}</span>
            </div>
            <p>{facility.description}</p>
            <div className="facility-meta">
              <span>{toLabel(facility.type)}</span>
              <span>Capacity: {facility.capacity}</span>
              <span>{facility.location}</span>
              <span>
                Available: {facility.availableFrom} - {facility.availableTo}
              </span>
            </div>
            {facility.status === 'ACTIVE' && userId && (
              <div style={{ marginTop: '0.8rem' }}>
                {bookingFacility && bookingFacility.id === facility.id ? (
                  <div style={{ background: '#f8faff', border: '1.5px solid #d0dfff', borderRadius: '10px', padding: '1rem', marginTop: '0.5rem' }}>
                    {bookingMsg.text && (
                      <p style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600,
                        background: bookingMsg.type === 'success' ? '#e6f9ee' : '#fbeaea',
                        color: bookingMsg.type === 'success' ? '#1a7a3a' : '#b33030',
                        marginBottom: '0.7rem' }}>
                        {bookingMsg.text}
                      </p>
                    )}
                    <form onSubmit={submitBooking} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.4rem' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#222222', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Date *</label>
                          <input type="date" name="bookingDate" min={todayStr} value={bookingForm.bookingDate} onChange={handleBookingChange} required style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.85rem', color: '#222222', background: '#fff' }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                          <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#222222', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.3rem' }}>Start Time *</label>
                            <input type="time" name="startTime" value={bookingForm.startTime} onChange={handleBookingChange} required style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.85rem', color: '#222222', background: '#fff', width: '100%' }} />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#222222', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.3rem' }}>End Time *</label>
                            <input type="time" name="endTime" value={bookingForm.endTime} onChange={handleBookingChange} required style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.85rem', color: '#222222', background: '#fff', width: '100%' }} />
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.5rem' }}>
                        <input name="purpose" value={bookingForm.purpose} onChange={handleBookingChange} placeholder="Purpose (e.g. Workshop)" required style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.85rem', color: '#222222', background: '#fff' }} />
                        <input type="number" name="attendeeCount" min="1" max={facility.capacity} value={bookingForm.attendeeCount} onChange={handleBookingChange} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.85rem', color: '#222222', background: '#fff' }} />
                      </div>
                      <input name="notes" value={bookingForm.notes} onChange={handleBookingChange} placeholder="Additional notes (optional)" style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.85rem', color: '#222222', background: '#fff' }} />
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="submit" disabled={bookingLoading} style={{ padding: '0.45rem 1.2rem', background: '#4f8cff', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                          {bookingLoading ? 'Submitting...' : 'Submit Booking'}
                        </button>
                        <button type="button" onClick={() => setBookingFacility(null)} style={{ padding: '0.45rem 1rem', background: '#eee', border: 'none', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => openBookingForm(facility)}
                    style={{
                      padding: '0.5rem 1.2rem',
                      background: 'linear-gradient(135deg, #4f8cff, #3a6fd8)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'transform 0.15s',
                    }}
                  >
                    📅 Book This Facility
                  </button>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

export default Facilities;
