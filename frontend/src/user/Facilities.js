import React, { useEffect, useMemo, useState, useCallback } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  fetchFacilities, fetchFacilityStatuses, fetchFacilityTypes,
  createBooking, fetchFacilityAvailability,
} from "../api";
import "./Facilities.css";

/* ── helpers ─────────────────────────────────────────────────────────────── */
const toLabel = (v = "") => v.replaceAll("_", " ");
const todayStr = () => new Date().toISOString().split("T")[0];

/** Format "HH:MM:SS" or "HH:MM" → "H:MM AM/PM" */
function fmtTime(t = "") {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hr12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hr12}:${m} ${ampm}`;
}

/** Truncate "HH:MM:SS" → "HH:MM" for time input value */
const toHHMM = (t = "") => (t ? t.slice(0, 5) : "");

/** Returns current local time as "HH:MM" */
const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const TYPE_ICON = {
  HALL: "🏛️", LECTURE_HALL: "🏛️", LAB: "🔬", LABORATORY: "🔬",
  MEETING_ROOM: "💼", EQUIPMENT: "📷", STUDIO: "🎨",
  GYM: "🏋️", LIBRARY: "📚", SPORTS: "⚽", OTHER: "📦",
};
const getIcon = (type = "") =>
  TYPE_ICON[type.toUpperCase()] || TYPE_ICON[type.split("_")[0]?.toUpperCase()] || "🏢";

const buildShareUrl = (facilityId) =>
  `${window.location.origin}/facilities?highlight=${facilityId}`;

const buildFacilityQRData = (facility) =>
  JSON.stringify({
    id: facility.id,
    name: facility.name,
    type: facility.type,
    location: facility.location,
    capacity: facility.capacity,
    openHours: `${fmtTime(facility.availableFrom)}–${fmtTime(facility.availableTo)}`,
    status: facility.status,
    description: facility.description,
    url: buildShareUrl(facility.id),
  });

const defaultFilters = {
  q: "", type: "", minCapacity: "", location: "",
  status: "ACTIVE", sortBy: "name", sortDir: "asc",
};

/* ── QR Modal ────────────────────────────────────────────────────────────── */
function FacilityQRModal({ facility, onClose }) {
  const qrValue = buildFacilityQRData(facility);
  const shareUrl = buildShareUrl(facility.id);
  const [copied, setCopied] = useState("");

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(""), 2000);
    });
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Smart Campus – ${facility.name}`,
          text: `📍 ${facility.name} | ${toLabel(facility.type)} | Capacity: ${facility.capacity} | ${facility.location}`,
          url: shareUrl,
        });
      } catch { /* user cancelled */ }
    } else {
      handleCopy(shareUrl, "url");
    }
  };

  return (
    <div className="fac-modal-overlay" onClick={onClose}>
      <div className="fac-modal-card" onClick={e => e.stopPropagation()}>
        <button className="fac-modal-close" onClick={onClose}>✕</button>

        <div className="fac-modal-header">
          <div className="fac-modal-icon">{getIcon(facility.type)}</div>
          <div>
            <h2 className="fac-modal-title">{facility.name}</h2>
            <p className="fac-modal-subtitle">{toLabel(facility.type)} · {facility.location}</p>
          </div>
        </div>

        <div className="fac-qr-wrapper">
          <QRCodeCanvas
            value={qrValue}
            size={210}
            level="H"
            includeMargin
            style={{ borderRadius: 12, display: "block" }}
          />
          <p className="fac-qr-hint">Scan to view facility details</p>
        </div>

        <div className="fac-modal-details">
          {[
            ["📍", "Location", facility.location],
            ["👥", "Capacity", facility.capacity + " people"],
            ["🕐", "Open Hours", `${fmtTime(facility.availableFrom)} – ${fmtTime(facility.availableTo)}`],
            ["🏷️", "Status", toLabel(facility.status)],
          ].map(([icon, label, val]) => (
            <div key={label} className="fac-detail-row">
              <span className="fac-detail-icon">{icon}</span>
              <span className="fac-detail-label">{label}</span>
              <span className="fac-detail-val">{val}</span>
            </div>
          ))}
          {facility.description && (
            <p className="fac-modal-desc">{facility.description}</p>
          )}
        </div>

        <div className="fac-modal-actions">
          <button className="fac-share-btn fac-share-btn--primary" onClick={handleNativeShare}>
            {copied === "url" && !navigator.share ? "✅ Link Copied!" : "📤 Share Facility"}
          </button>
          <button className="fac-share-btn fac-share-btn--copy" onClick={() => handleCopy(shareUrl, "url")}>
            {copied === "url" ? "✅ Copied!" : "🔗 Copy Link"}
          </button>
          <button className="fac-share-btn fac-share-btn--qr" onClick={() => handleCopy(qrValue, "qr")}>
            {copied === "qr" ? "✅ Copied!" : "📋 Copy QR Data"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Booking Panel ───────────────────────────────────────────────────────── */
function BookingPanel({ facility, userId, onClose }) {
  const openFrom  = toHHMM(facility.availableFrom);   // e.g. "08:00"
  const openTo    = toHHMM(facility.availableTo);     // e.g. "22:00"
  const today     = todayStr();

  const [form, setForm] = useState({
    bookingDate: today,
    startTime: openFrom,
    endTime: "",
    purpose: "",
    notes: "",
    attendeeCount: 1,
  });
  const [msg,          setMsg]          = useState({ type: "", text: "" });
  const [loading,      setLoading]      = useState(false);
  const [availability, setAvailability] = useState(null);   // { totalCapacity, usedSeats, remainingSeats, ... }
  const [checkingAvail, setCheckingAvail] = useState(false);

  /* ── Minimum start time: if booking today, must be ≥ now (and ≥ openFrom) ── */
  const minStartTime = useMemo(() => {
    if (form.bookingDate === today) {
      const cur = nowHHMM();
      return cur > openFrom ? cur : openFrom;
    }
    return openFrom;
  }, [form.bookingDate, today, openFrom]);

  /* ── Minimum end time: always > startTime ── */
  const minEndTime = useMemo(() => {
    if (!form.startTime) return openFrom;
    // Add 30 min to start
    const [h, m] = form.startTime.split(":").map(Number);
    const total = h * 60 + m + 30;
    const nh = String(Math.floor(total / 60)).padStart(2, "0");
    const nm = String(total % 60).padStart(2, "0");
    return `${nh}:${nm}`;
  }, [form.startTime, openFrom]);

  /* ── Live availability check whenever date+startTime+endTime change ── */
  const fetchAvail = useCallback(() => {
    if (!form.bookingDate || !form.startTime || !form.endTime) {
      setAvailability(null);
      return;
    }
    if (form.startTime >= form.endTime) {
      setAvailability(null);
      return;
    }
    if (form.startTime < openFrom || form.endTime > openTo) {
      setAvailability(null);
      return;
    }

    let cancelled = false;
    setCheckingAvail(true);
    fetchFacilityAvailability(
      facility.id,
      form.bookingDate,
      form.startTime,
      form.endTime
    )
      .then(data => {
        if (!cancelled) setAvailability(data);
      })
      .catch(() => { if (!cancelled) setAvailability(null); })
      .finally(() => { if (!cancelled) setCheckingAvail(false); });

    return () => { cancelled = true; };
  }, [form.bookingDate, form.startTime, form.endTime, facility.id, openFrom, openTo]);

  useEffect(() => {
    const cleanup = fetchAvail();
    return cleanup;
  }, [fetchAvail]);

  const onChange = e => {
    const { name, value } = e.target;
    setForm(prev => {
      const next = { ...prev, [name]: name === "attendeeCount" ? Number(value) : value };
      // If date changed to today and startTime is before minStartTime, reset it
      if (name === "bookingDate" && value === today && next.startTime < nowHHMM()) {
        next.startTime = nowHHMM() > openFrom ? nowHHMM() : openFrom;
        next.endTime = "";
      }
      // If startTime changes and endTime ≤ startTime, clear endTime
      if (name === "startTime" && next.endTime && next.endTime <= value) {
        next.endTime = "";
      }
      return next;
    });
    setMsg({ type: "", text: "" });
  };

  /* ── Validation helpers ── */
  const timeErrors = useMemo(() => {
    const errs = [];
    if (form.startTime && form.startTime < openFrom)
      errs.push(`Start time cannot be before opening time (${fmtTime(openFrom)})`);
    if (form.endTime && form.endTime > openTo)
      errs.push(`End time cannot be after closing time (${fmtTime(openTo)})`);
    if (form.startTime && form.endTime && form.startTime >= form.endTime)
      errs.push("End time must be after start time");
    if (form.bookingDate === today && form.startTime && form.startTime < nowHHMM())
      errs.push("Cannot book a start time that has already passed today");
    return errs;
  }, [form.startTime, form.endTime, form.bookingDate, openFrom, openTo, today]);

  const isFull = availability && availability.remainingSeats <= 0;
  const hasErrors = timeErrors.length > 0;

  const handleSubmit = async e => {
    e.preventDefault();
    if (!userId) { setMsg({ type: "error", text: "Please log in to book." }); return; }
    if (hasErrors) { setMsg({ type: "error", text: timeErrors[0] }); return; }

    const requested = form.attendeeCount || 1;
    if (availability && requested > availability.remainingSeats) {
      setMsg({ type: "error", text: `Only ${availability.remainingSeats} seat(s) left for this time slot.` });
      return;
    }
    if (isFull) { setMsg({ type: "error", text: "This slot is fully booked." }); return; }

    setLoading(true);
    setMsg({ type: "", text: "" });
    try {
      await createBooking({
        facilityId: facility.id,
        userId,
        bookingDate: form.bookingDate,
        startTime: form.startTime,
        endTime: form.endTime,
        purpose: form.purpose,
        notes: form.notes,
        attendeeCount: form.attendeeCount,
      });
      setMsg({ type: "success", text: "✅ Booking submitted! Awaiting admin approval." });
      setTimeout(onClose, 2200);
    } catch (err) {
      setMsg({ type: "error", text: err.message || "Booking failed" });
    } finally {
      setLoading(false);
    }
  };

  /* ── Capacity bar percentage ── */
  const usedPct = availability
    ? Math.min(100, (availability.usedSeats / availability.totalCapacity) * 100)
    : 0;

  return (
    <div className="fac-modal-overlay" onClick={onClose}>
      <div className="fac-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <button className="fac-modal-close" onClick={onClose}>✕</button>
        <div className="fac-modal-header" style={{ marginBottom: 12 }}>
          <div className="fac-modal-icon" style={{ fontSize: "1.8rem", padding: "8px" }}>{getIcon(facility.type)}</div>
          <div>
            <h2 className="fac-modal-title">Book {facility.name}</h2>
            <p className="fac-modal-subtitle">{facility.location} · Cap: {facility.capacity}</p>
          </div>
        </div>

        <div className="booking-panel" style={{ marginTop: 0, padding: 0, border: 'none', background: 'transparent', boxShadow: 'none' }}>
          {/* Open hours info banner */}
          <div className="fac-open-hours-banner">
            <span className="fac-open-hours-icon">🕐</span>
            <span>
              Open: <strong>{fmtTime(openFrom)}</strong> – <strong>{fmtTime(openTo)}</strong>
            </span>
          </div>

      {/* Live availability bar */}
      {checkingAvail && (
        <div className="fac-cap-checking">⏳ Checking availability…</div>
      )}
      {!checkingAvail && availability && (
        <div className={`fac-cap-bar ${isFull ? "fac-cap-bar--full" : ""}`}>
          <div className="fac-cap-fill" style={{ width: `${usedPct}%` }} />
          <span className="fac-cap-label">
            {isFull
              ? `🚫 FULLY BOOKED for this slot (${availability.totalCapacity}/${availability.totalCapacity})`
              : `👥 ${availability.usedSeats}/${availability.totalCapacity} seats taken · ✅ ${availability.remainingSeats} available`
            }
          </span>
        </div>
      )}
      {!checkingAvail && !availability && form.bookingDate && form.startTime && form.endTime && !hasErrors && (
        <div className="fac-cap-checking">ℹ️ Select valid times to check availability</div>
      )}

      {/* Time validation errors */}
      {timeErrors.map((err, i) => (
        <div key={i} className="profile-alert compact error">{err}</div>
      ))}

      {msg.text && (
        <div className={`profile-alert compact ${msg.type}`}>{msg.text}</div>
      )}

      <form onSubmit={handleSubmit} className="booking-form">
        {/* Date */}
        <div className="form-group">
          <label>Date *</label>
          <input
            type="date"
            name="bookingDate"
            min={today}
            value={form.bookingDate}
            onChange={onChange}
            required
          />
        </div>

        {/* Time row */}
        <div className="form-row">
          <div className="form-group">
            <label>Start Time * <span className="fac-time-hint">({fmtTime(openFrom)} – {fmtTime(openTo)})</span></label>
            <input
              type="time"
              name="startTime"
              min={minStartTime}
              max={openTo}
              step="900"
              value={form.startTime}
              onChange={onChange}
              required
            />
          </div>
          <div className="form-group">
            <label>End Time * <span className="fac-time-hint">(max {fmtTime(openTo)})</span></label>
            <input
              type="time"
              name="endTime"
              min={minEndTime}
              max={openTo}
              step="900"
              value={form.endTime}
              onChange={onChange}
              required
            />
          </div>
        </div>

        {/* Purpose + Attendees */}
        <div className="form-row">
          <div className="form-group flex-2">
            <label>Purpose *</label>
            <input
              name="purpose"
              value={form.purpose}
              onChange={onChange}
              placeholder="e.g. Guest Lecture"
              required
            />
          </div>
          <div className="form-group flex-1">
            <label>
              Attendees
              {availability && (
                <span className="fac-seat-hint"> (max {availability.remainingSeats})</span>
              )}
            </label>
            <input
              type="number"
              name="attendeeCount"
              min="1"
              max={availability ? availability.remainingSeats : facility.capacity}
              value={form.attendeeCount}
              onChange={onChange}
            />
          </div>
        </div>

        {/* Notes */}
        <div className="form-group">
          <label>Notes</label>
          <input
            name="notes"
            value={form.notes}
            onChange={onChange}
            placeholder="Optional notes"
          />
        </div>

        <div className="booking-actions">
          <button
            type="submit"
            className="btn-primary"
            disabled={loading || isFull || hasErrors}
          >
            {loading ? "Submitting…" : isFull ? "🚫 Fully Booked" : "📅 Submit Booking"}
          </button>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </form>
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────────────────────── */
function Facilities() {
  const [filters,          setFilters]          = useState(defaultFilters);
  const [facilityTypes,    setFacilityTypes]    = useState([]);
  const [facilityStatuses, setFacilityStatuses] = useState([]);
  const [facilities,       setFacilities]       = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState("");

  const [bookingFacility, setBookingFacility] = useState(null);
  const [qrFacility,      setQrFacility]      = useState(null);

  const userId = localStorage.getItem("smartcampus_user_id");

  /* Detect ?highlight=id in URL */
  const highlightId = useMemo(() => {
    const p = new URLSearchParams(window.location.search);
    return p.get("highlight");
  }, []);

  useEffect(() => {
    Promise.all([fetchFacilityTypes(), fetchFacilityStatuses()])
      .then(([types, statuses]) => { setFacilityTypes(types); setFacilityStatuses(statuses); })
      .catch(() => { setFacilityTypes([]); setFacilityStatuses([]); });
  }, []);

  const queryFilters = useMemo(() => ({
    ...filters,
    minCapacity: filters.minCapacity === "" ? undefined : Number(filters.minCapacity),
  }), [filters]);

  useEffect(() => {
    setLoading(true); setError("");
    fetchFacilities(queryFilters)
      .then(data => { setFacilities(data); setLoading(false); })
      .catch(err => { setError(err.message || "Failed to load facilities"); setLoading(false); });
  }, [queryFilters]);

  /* Auto-open highlighted facility from shared link */
  useEffect(() => {
    if (highlightId && facilities.length) {
      const f = facilities.find(f => String(f.id) === String(highlightId));
      if (f) {
        setQrFacility(f);
        setTimeout(() => {
          document.getElementById(`fac-card-${f.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 300);
      }
    }
  }, [highlightId, facilities]);

  const onFilterChange = e => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  return (
    <section className="facilities-shell">
      {/* ── Hero ─────────────────────────────────────────── */}
      <div className="facilities-hero">
        <div className="facilities-hero-inner">
          <p className="facilities-kicker">CAMPUS RESOURCES</p>
          <h1 className="facilities-title">Facilities Catalogue</h1>
          <p>Discover bookable lecture halls, labs, meeting rooms, and equipment.
            Check real-time seat availability by date &amp; time slot before you book.</p>
        </div>
      </div>

      {/* ── Filters ──────────────────────────────────────── */}
      <div className="facilities-search">
        <span className="search-icon">🔍</span>
        <input
          className="search-input"
          name="q" value={filters.q} onChange={onFilterChange}
          placeholder="Search facilities by name or description…"
        />
      </div>

      <div className="fac-filter-bar">
        <select name="type" value={filters.type} onChange={onFilterChange} className="fac-select">
          <option value="">All Types</option>
          {facilityTypes.map(t => <option key={t} value={t}>{toLabel(t)}</option>)}
        </select>
        <input
          className="fac-input" name="minCapacity" type="number" min="0"
          value={filters.minCapacity} onChange={onFilterChange} placeholder="Min capacity"
        />
        <input
          className="fac-input" name="location" value={filters.location}
          onChange={onFilterChange} placeholder="Location"
        />
        <select name="status" value={filters.status} onChange={onFilterChange} className="fac-select">
          <option value="">All Statuses</option>
          {facilityStatuses.map(s => <option key={s} value={s}>{toLabel(s)}</option>)}
        </select>
        <select name="sortBy" value={filters.sortBy} onChange={onFilterChange} className="fac-select">
          <option value="name">Sort: Name</option>
          <option value="capacity">Sort: Capacity</option>
          <option value="location">Sort: Location</option>
        </select>
      </div>

      {/* ── States ───────────────────────────────────────── */}
      {loading && (
        <div className="facilities-grid">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="facility-card fac-skeleton">
              <div className="sk-line title" /><div className="sk-line" /><div className="sk-line short" />
            </div>
          ))}
        </div>
      )}
      {error && <p className="state-text error">{error}</p>}
      {!loading && !error && facilities.length === 0 && (
        <p className="state-text">No facilities match your current filters.</p>
      )}

      {/* ── Grid ─────────────────────────────────────────── */}
      {!loading && (
        <div className="facilities-grid">
          {facilities.map(facility => {
            const isHighlighted = String(facility.id) === String(highlightId);
            return (
              <article
                key={facility.id}
                id={`fac-card-${facility.id}`}
                className={`facility-card${isHighlighted ? " fac-card--highlighted" : ""}`}
              >
                <div className="facility-card-header">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: "1.8rem" }}>{getIcon(facility.type)}</span>
                    <h3>{facility.name}</h3>
                  </div>
                  <span className={`badge ${facility.status === "ACTIVE" ? "badge-active" : "badge-rejected"}`}>
                    {toLabel(facility.status)}
                  </span>
                </div>

                <p className="facility-desc">{facility.description}</p>

                {/* ── Open hours pill strip ── */}
                <div className="facility-meta">
                  <span className="meta-pill">🏷️ {toLabel(facility.type)}</span>
                  <span className="meta-pill">👥 {facility.capacity} seats</span>
                  <span className="meta-pill">📍 {facility.location}</span>
                  <span className="meta-pill fac-hours-pill">
                    🕐 {fmtTime(facility.availableFrom)} – {fmtTime(facility.availableTo)}
                  </span>
                </div>

                {/* ── Open hours note ── */}
                {facility.status === "ACTIVE" && (
                  <div className="fac-opentime-note">
                    <span className="fac-opentime-dot fac-opentime-dot--open" />
                    Open {fmtTime(facility.availableFrom)} to {fmtTime(facility.availableTo)}
                    &nbsp;·&nbsp; bookings only within this window
                  </div>
                )}

                <div className="facility-actions">
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: "16px" }}>
                    <button
                      type="button" className="btn-secondary"
                      onClick={() => setQrFacility(facility)}
                      title="View QR & Share options"
                      style={{ flex: 1 }}
                    >
                      📱 Share & QR
                    </button>
                  </div>

                  {facility.status === "ACTIVE" && userId ? (
                    <button
                      type="button" className="btn-primary"
                      onClick={() => { setBookingFacility(facility); setQrFacility(null); }}
                    >
                      📅 Book This Facility
                    </button>
                  ) : facility.status !== "ACTIVE" ? (
                    <p style={{ color: "var(--brand-danger)", fontWeight: 700, margin: 0, fontSize: "0.9rem" }}>
                      🚫 Not available for booking
                    </p>
                  ) : (
                    <p style={{ color: "var(--text-muted)", fontWeight: 600, margin: 0, fontSize: "0.9rem" }}>
                      Log in to book
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ── Booking / Details Modals ──────────────────────────── */}
      {qrFacility && (
        <FacilityQRModal facility={qrFacility} onClose={() => setQrFacility(null)} />
      )}
      {bookingFacility && (
        <BookingPanel facility={bookingFacility} userId={userId} onClose={() => setBookingFacility(null)} />
      )}
    </section>
  );
}

export default Facilities;
