import React, { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  createFacility, fetchFacilities,
  fetchFacilityStatuses, fetchFacilityTypes, updateFacility,
} from "../api";
import "./FacilitiesAdmin.css";

// ── Helpers ──────────────────────────────────────────────────────────────────
const toLabel = (v = "") => v.replaceAll("_", " ");

const TYPE_ICON = {
  HALL: "🏛️", LECTURE_HALL: "🏛️", LAB: "🔬", LABORATORY: "🔬",
  MEETING_ROOM: "💼", EQUIPMENT: "📷", STUDIO: "🎨",
  GYM: "🏋️", LIBRARY: "📚", SPORTS: "⚽", OTHER: "📦",
};
const getIcon = (type = "") =>
  TYPE_ICON[type.toUpperCase()] || TYPE_ICON[type.split("_")[0]?.toUpperCase()] || "🏢";

const statusStyle = (status) => ({
  ACTIVE: "badge-active",
  OUT_OF_SERVICE: "badge-rejected",
  MAINTENANCE: "badge-pending",
  RESERVED: "badge-checked_in",
}[status] ?? "badge-closed");

const blankForm = {
  name: "", type: "", capacity: "", location: "",
  availableFrom: "08:00", availableTo: "17:00",
  status: "ACTIVE", description: "",
};

/** Build QR payload to encode facility details */
const buildQRData = (f) =>
  JSON.stringify({
    id: f.id, name: f.name, type: f.type,
    location: f.location, capacity: f.capacity,
    available: `${f.availableFrom}–${f.availableTo}`,
    status: f.status, description: f.description,
    url: `${window.location.origin}/facilities?highlight=${f.id}`,
  });

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ color, icon, label, value, sub }) {
  return (
    <div className={`fac-stat-card fac-stat-${color}`}>
      <div className="fac-stat-icon">{icon}</div>
      <div className="fac-stat-body">
        <div className="fac-stat-value">{value}</div>
        <div className="fac-stat-label">{label}</div>
        {sub && <div className="fac-stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

// ── QR Details Modal ──────────────────────────────────────────────────────────
function QRModal({ facility, onClose }) {
  const qrValue = buildQRData(facility);
  const [copied, setCopied] = useState("");
  const shareUrl = `${window.location.origin}/facilities?highlight=${facility.id}`;

  const copy = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(""), 2500);
    });
  };

  return (
    <div className="fac-drawer" style={{ pointerEvents: "all" }}>
      <div className="fac-drawer-overlay" style={{ opacity: 1 }} onClick={onClose} />
      <div
        className="fac-drawer-panel"
        style={{ transform: "translateX(0)", maxWidth: 480, left: "50%", right: "auto", marginLeft: "-240px", borderRadius: "var(--radius-xl)", top: "5vh", bottom: "auto", maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="fac-drawer-header" style={{ paddingTop: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: "2.2rem" }}>{getIcon(facility.type)}</span>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.3rem" }}>{facility.name}</h2>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
                {toLabel(facility.type)} · {facility.location}
              </p>
            </div>
          </div>
          <button className="fac-drawer-close" onClick={onClose}>✕</button>
        </div>

        <div className="fac-drawer-form" style={{ alignItems: "center", gap: 24 }}>
          {/* QR code */}
          <div style={{ background: "#fff", padding: 16, borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-md)", display: "inline-block" }}>
            <QRCodeCanvas value={qrValue} size={200} level="H" includeMargin />
          </div>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-muted)", textAlign: "center" }}>
            Scan to view facility details on any device
          </p>

          {/* Details grid */}
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              ["📍", "Location", facility.location],
              ["👥", "Capacity", `${facility.capacity} people`],
              ["🕐", "Availability", `${facility.availableFrom} – ${facility.availableTo}`],
              ["🏷️", "Type", toLabel(facility.type)],
              ["⚡", "Status", toLabel(facility.status)],
            ].map(([icon, label, val]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--bg-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
                <span style={{ fontSize: "1.2rem" }}>{icon}</span>
                <span style={{ fontWeight: 700, color: "var(--text-secondary)", fontSize: "0.85rem", minWidth: 80 }}>{label}</span>
                <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{val}</span>
              </div>
            ))}
            {facility.description && (
              <p style={{ margin: 0, padding: "12px 14px", background: "var(--bg-glass)", borderRadius: "var(--radius-md)", color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.6, border: "1px solid var(--border-subtle)" }}>
                {facility.description}
              </p>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 12, width: "100%", flexWrap: "wrap" }}>
            <button className="fac-btn fac-btn--save" style={{ flex: 1 }} onClick={() => copy(shareUrl, "url")}>
              {copied === "url" ? "✅ Link Copied!" : "🔗 Copy Share Link"}
            </button>
            <button className="fac-btn fac-btn--edit" style={{ flex: 1 }} onClick={() => copy(qrValue, "qr")}>
              {copied === "qr" ? "✅ Copied!" : "📋 Copy QR Data"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Facility Card ──────────────────────────────────────────────────────────────
function FacilityCard({ facility, onEdit, onToggleStatus, onShowQR, busy }) {
  return (
    <article className={`fac-card fac-card--${facility.status?.toLowerCase()}`}>
      <div className="fac-card-top">
        <div className="fac-card-icon">{getIcon(facility.type)}</div>
        <span className={`badge ${statusStyle(facility.status)} fac-card-badge`}>
          {toLabel(facility.status)}
        </span>
      </div>

      <h3 className="fac-card-name">{facility.name}</h3>
      <p className="fac-card-desc">{facility.description}</p>

      <div className="fac-card-meta">
        <span className="fac-meta-pill">🏷️ {toLabel(facility.type)}</span>
        <span className="fac-meta-pill">👥 {facility.capacity}</span>
        <span className="fac-meta-pill">📍 {facility.location}</span>
        <span className="fac-meta-pill">🕐 {facility.availableFrom}–{facility.availableTo}</span>
      </div>

      <div className="fac-card-actions">
        <button className="fac-btn fac-btn--edit" onClick={() => onEdit(facility)} disabled={busy}>
          ✏️ Edit
        </button>
        <button className="fac-btn fac-btn--restore" onClick={() => onShowQR(facility)} disabled={busy} title="Generate QR">
          📱 QR Code
        </button>
        {facility.status !== "OUT_OF_SERVICE" ? (
          <button className="fac-btn fac-btn--oos" onClick={() => onToggleStatus(facility, "OUT_OF_SERVICE")} disabled={busy}>
            🚫 Out of Service
          </button>
        ) : (
          <button className="fac-btn fac-btn--restore" onClick={() => onToggleStatus(facility, "ACTIVE")} disabled={busy}>
            ✅ Restore
          </button>
        )}
      </div>
    </article>
  );
}

// ── Drawer Form ──────────────────────────────────────────────────────────────
function DrawerForm({ open, editingId, form, onChange, onSubmit, onCancel, busy, facilityTypes, facilityStatuses }) {
  const firstRef = useRef();
  useEffect(() => { if (open && firstRef.current) firstRef.current.focus(); }, [open]);

  return (
    <div className={`fac-drawer ${open ? "fac-drawer--open" : ""}`}>
      <div className="fac-drawer-panel">
        <div className="fac-drawer-header">
          <h2>{editingId ? "✏️ Edit Facility" : "➕ New Facility"}</h2>
          <button className="fac-drawer-close" onClick={onCancel}>✕</button>
        </div>

        <form className="fac-drawer-form" onSubmit={onSubmit}>
          <div className="fac-form-row">
            <div className="fac-form-group fac-form-group--full">
              <label>Facility Name *</label>
              <input ref={firstRef} name="name" value={form.name} onChange={onChange} placeholder="e.g. Auditorium A" required />
            </div>
          </div>
          <div className="fac-form-row">
            <div className="fac-form-group">
              <label>Type *</label>
              <select name="type" value={form.type} onChange={onChange} required>
                <option value="" disabled>Select type</option>
                {facilityTypes.map(t => <option key={t} value={t}>{toLabel(t)}</option>)}
              </select>
            </div>
            <div className="fac-form-group">
              <label>Status *</label>
              <select name="status" value={form.status} onChange={onChange} required>
                {facilityStatuses.map(s => <option key={s} value={s}>{toLabel(s)}</option>)}
              </select>
            </div>
          </div>
          <div className="fac-form-row">
            <div className="fac-form-group">
              <label>Location *</label>
              <input name="location" value={form.location} onChange={onChange} placeholder="e.g. Block B, Floor 2" required />
            </div>
            <div className="fac-form-group">
              <label>Capacity *</label>
              <input name="capacity" type="number" min="1" value={form.capacity} onChange={onChange} placeholder="e.g. 150" required />
            </div>
          </div>
          <div className="fac-form-row">
            <div className="fac-form-group">
              <label>Available From *</label>
              <input name="availableFrom" type="time" value={form.availableFrom} onChange={onChange} required />
            </div>
            <div className="fac-form-group">
              <label>Available To *</label>
              <input name="availableTo" type="time" value={form.availableTo} onChange={onChange} required />
            </div>
          </div>
          <div className="fac-form-row">
            <div className="fac-form-group fac-form-group--full">
              <label>Description *</label>
              <textarea name="description" rows={3} value={form.description} onChange={onChange} placeholder="Short description for students" required />
            </div>
          </div>

          <div className="fac-drawer-footer">
            <button type="button" className="fac-btn fac-btn--cancel" onClick={onCancel} disabled={busy}>Cancel</button>
            <button type="submit" className="fac-btn fac-btn--save" disabled={busy}>
              {busy ? "⏳ Saving…" : editingId ? "💾 Update Facility" : "➕ Create Facility"}
            </button>
          </div>
        </form>
      </div>
      <div className="fac-drawer-overlay" onClick={onCancel} />
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
function FacilitiesAdmin() {
  const [facilityTypes, setFacilityTypes] = useState([]);
  const [facilityStatuses, setFacilityStatuses] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [qrFacility, setQrFacility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState({ type: "", text: "" });

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [viewMode, setViewMode] = useState("grid");

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast({ type: "", text: "" }), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [types, statuses, data] = await Promise.all([
        fetchFacilityTypes(), fetchFacilityStatuses(),
        fetchFacilities({ sortBy: "name", sortDir: "asc" }),
      ]);
      setFacilityTypes(types);
      setFacilityStatuses(statuses);
      setFacilities(data);
      setForm(prev => ({
        ...prev,
        type: prev.type || types[0] || "",
        status: prev.status || "ACTIVE",
      }));
    } catch (err) {
      showToast("error", err.message || "Failed to load facilities");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []); // eslint-disable-line

  const onChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...blankForm, type: facilityTypes[0] || "", status: "ACTIVE" });
    setDrawerOpen(true);
  };

  const onEdit = facility => {
    setEditingId(facility.id);
    setForm({
      name: facility.name, type: facility.type, capacity: facility.capacity,
      location: facility.location, availableFrom: facility.availableFrom,
      availableTo: facility.availableTo, status: facility.status,
      description: facility.description,
    });
    setDrawerOpen(true);
  };

  const onSubmit = async e => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = { ...form, capacity: Number(form.capacity) };
      if (editingId) {
        await updateFacility(editingId, payload);
        showToast("success", `✅ "${form.name}" updated successfully.`);
      } else {
        await createFacility(payload);
        showToast("success", `✅ "${form.name}" added to the catalogue.`);
      }
      setDrawerOpen(false);
      await loadData();
    } catch (err) {
      showToast("error", err.message || "Failed to save facility");
    } finally {
      setBusy(false);
    }
  };

  const onToggleStatus = async (facility, newStatus) => {
    setBusy(true);
    try {
      await updateFacility(facility.id, { ...facility, status: newStatus, capacity: Number(facility.capacity) });
      showToast("success",
        newStatus === "OUT_OF_SERVICE"
          ? `🚫 "${facility.name}" marked as Out of Service.`
          : `✅ "${facility.name}" restored to Active.`
      );
      await loadData();
    } catch (err) {
      showToast("error", err.message || "Failed to update status");
    } finally {
      setBusy(false);
    }
  };

  const stats = {
    total: facilities.length,
    active: facilities.filter(f => f.status === "ACTIVE").length,
    oos: facilities.filter(f => f.status === "OUT_OF_SERVICE").length,
    maintenance: facilities.filter(f => f.status === "MAINTENANCE").length,
    totalCapacity: facilities.reduce((sum, f) => sum + (Number(f.capacity) || 0), 0),
  };

  const filtered = facilities.filter(f => {
    const q = search.toLowerCase();
    const matchSearch = !q || f.name?.toLowerCase().includes(q) || f.location?.toLowerCase().includes(q);
    return matchSearch && (!filterType || f.type === filterType) && (!filterStatus || f.status === filterStatus);
  });

  return (
    <div className="fac-admin-shell">
      {/* Toast */}
      {toast.text && <div className={`fac-toast fac-toast--${toast.type}`}>{toast.text}</div>}

      {/* Header */}
      <div className="fac-page-header">
        <div className="fac-page-title">
          <div className="fac-page-kicker">MODULE A • FACILITIES &amp; ASSETS</div>
          <h1>Resource Catalogue</h1>
          <p>Manage bookable campus resources — lecture halls, labs, meeting rooms &amp; equipment.</p>
        </div>
        <button className="fac-add-btn" onClick={openCreate}>
          <span>➕</span> Add Facility
        </button>
      </div>

      {/* Stats */}
      <div className="fac-stats-row">
        <StatCard color="blue" icon="🏛️" label="Total Resources" value={stats.total} sub={`${stats.totalCapacity} total seats`} />
        <StatCard color="green" icon="✅" label="Active" value={stats.active} sub="Available for booking" />
        <StatCard color="red" icon="🚫" label="Out of Service" value={stats.oos} sub="Unavailable" />
        <StatCard color="yellow" icon="🔧" label="Maintenance" value={stats.maintenance} sub="Temporarily offline" />
      </div>

      {/* Toolbar */}
      <div className="fac-toolbar">
        <div className="fac-search-wrap">
          <span className="fac-search-ic">🔍</span>
          <input className="fac-search-input" placeholder="Search by name or location…" value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button className="fac-search-clear" onClick={() => setSearch("")}>✕</button>}
        </div>
        <select className="fac-filter-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          {facilityTypes.map(t => <option key={t} value={t}>{toLabel(t)}</option>)}
        </select>
        <select className="fac-filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {facilityStatuses.map(s => <option key={s} value={s}>{toLabel(s)}</option>)}
        </select>
        <div className="fac-view-toggle">
          <button className={viewMode === "grid" ? "active" : ""} onClick={() => setViewMode("grid")}>▦</button>
          <button className={viewMode === "table" ? "active" : ""} onClick={() => setViewMode("table")}>☰</button>
        </div>
      </div>

      {!loading && (
        <div className="fac-results-count">
          Showing <strong>{filtered.length}</strong> of <strong>{facilities.length}</strong> resources
          {(search || filterType || filterStatus) && (
            <button className="fac-clear-filters" onClick={() => { setSearch(""); setFilterType(""); setFilterStatus(""); }}>Clear ✕</button>
          )}
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="fac-grid">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="fac-card fac-card--skeleton">
              <div className="skeleton-line title" /><div className="skeleton-line" /><div className="skeleton-line short" />
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="fac-empty">
          <div className="fac-empty-icon">🏛️</div>
          <h3>No facilities found.</h3>
          <p>Click "Add Facility" or clear your filters.</p>
        </div>
      )}

      {/* Grid view */}
      {!loading && filtered.length > 0 && viewMode === "grid" && (
        <div className="fac-grid">
          {filtered.map(facility => (
            <FacilityCard
              key={facility.id} facility={facility}
              onEdit={onEdit} onToggleStatus={onToggleStatus}
              onShowQR={setQrFacility} busy={busy}
            />
          ))}
        </div>
      )}

      {/* Table view */}
      {!loading && filtered.length > 0 && viewMode === "table" && (
        <div className="fac-table-wrap">
          <table className="fac-table">
            <thead>
              <tr>
                <th>#</th><th>Name</th><th>Type</th><th>Location</th>
                <th>Capacity</th><th>Availability</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f, i) => (
                <tr key={f.id} className={f.status === "OUT_OF_SERVICE" ? "row-oos" : ""}>
                  <td className="fac-id">{i + 1}</td>
                  <td><strong>{f.name}</strong>{f.description && <p className="fac-td-desc">{f.description}</p>}</td>
                  <td><span className="fac-type-chip">{getIcon(f.type)} {toLabel(f.type)}</span></td>
                  <td>📍 {f.location}</td>
                  <td className="fac-cap">👥 {f.capacity}</td>
                  <td className="fac-time">🕐 {f.availableFrom}–{f.availableTo}</td>
                  <td><span className={`badge ${statusStyle(f.status)}`}>{toLabel(f.status)}</span></td>
                  <td className="fac-table-actions">
                    <button className="fac-btn fac-btn--edit fac-btn--sm" onClick={() => onEdit(f)} disabled={busy}>✏️</button>
                    <button className="fac-btn fac-btn--restore fac-btn--sm" onClick={() => setQrFacility(f)} disabled={busy} title="QR Code">📱</button>
                    {f.status !== "OUT_OF_SERVICE" ? (
                      <button className="fac-btn fac-btn--oos fac-btn--sm" onClick={() => onToggleStatus(f, "OUT_OF_SERVICE")} disabled={busy} title="Mark Out of Service">🚫</button>
                    ) : (
                      <button className="fac-btn fac-btn--restore fac-btn--sm" onClick={() => onToggleStatus(f, "ACTIVE")} disabled={busy} title="Restore">✅</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit/Create Drawer */}
      <DrawerForm
        open={drawerOpen} editingId={editingId} form={form}
        onChange={onChange} onSubmit={onSubmit}
        onCancel={() => setDrawerOpen(false)} busy={busy}
        facilityTypes={facilityTypes} facilityStatuses={facilityStatuses}
      />

      {/* QR Modal */}
      {qrFacility && <QRModal facility={qrFacility} onClose={() => setQrFacility(null)} />}
    </div>
  );
}

export default FacilitiesAdmin;
