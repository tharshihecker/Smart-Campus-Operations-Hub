import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './ManageIncidents.css';
import {
  fetchAllIncidents, updateIncidentStatus, assignIncidentTechnician,
  fetchAllUsers, fetchIncidentComments, addAdminIncidentComment,
  editIncidentComment, deleteAdminIncidentComment
} from '../api';

const TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

/* Statuses that are "terminal" — read-only, no editing */
const TERMINAL = new Set(['CLOSED', 'REJECTED']);

/* ─── Safe Date Parser (fixes 01/Jan/1970 bug) ─── */
function safeDate(val) {
  if (!val) return null;
  if (typeof val === 'string') return new Date(val);
  const ms = typeof val === 'number' && val < 1e10 ? val * 1000 : val;
  return new Date(ms);
}
function fmtDate(val) {
  const d = safeDate(val);
  if (!d || isNaN(d)) return '—';
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
}
function fmtDateTime(val) {
  const d = safeDate(val);
  if (!d || isNaN(d)) return '—';
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/* ─── CSS Inject ─── */
const ADMIN_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  .adm-inc * { font-family: 'Inter', sans-serif !important; box-sizing: border-box; }
  .adm-inc select { background-color: #ffffff !important; color: #111827 !important; }
  .adm-inc select option { background-color: #ffffff !important; color: #111827 !important; }

  /* Table row hover */
  .adm-ticket-row { transition: background 0.15s, box-shadow 0.15s; }
  .adm-ticket-row:hover td { background: #eff6ff !important; }
  .adm-ticket-row:hover { box-shadow: inset 3px 0 0 #2563eb; }

  /* Buttons */
  .adm-inc-btn { transition: all 0.18s !important; }
  .adm-inc-btn:hover:not(:disabled) { filter: brightness(1.08); transform: translateY(-1px); box-shadow: 0 3px 10px rgba(0,0,0,0.12); }

  /* Stat cards */
  .adm-inc-card { transition: box-shadow 0.2s, transform 0.18s; }
  .adm-inc-card:hover { box-shadow: 0 8px 28px rgba(37,99,235,0.16); transform: translateY(-3px); }

  /* Inputs */
  .adm-inc-input { transition: border-color 0.18s, box-shadow 0.18s; }
  .adm-inc-input:focus { outline: none; border-color: #2563eb !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.15) !important; }

  /* Photos */
  .adm-photo-thumb { cursor: pointer; transition: transform 0.18s, box-shadow 0.18s; border-radius: 10px; }
  .adm-photo-thumb:hover { transform: scale(1.08); box-shadow: 0 8px 24px rgba(0,0,0,0.28); }

  /* Animations */
  .adm-lightbox { animation: admFadeIn 0.18s; }
  .adm-panel { animation: admSlideIn 0.28s cubic-bezier(0.16,1,0.3,1); }
  .adm-priority-critical { animation: admPulse 1.8s infinite; }
  .adm-comment-card { transition: background 0.15s, transform 0.15s; }
  .adm-comment-card:hover { background: #eff6ff !important; transform: translateX(2px); }
  .adm-pulse-dot { animation: admDotPulse 2s infinite; }
  .adm-stat-num { font-variant-numeric: tabular-nums; }

  /* Header gradient */
  .adm-page-header { background: linear-gradient(135deg, #1e1b4b, #312e81, #4f46e5) !important; border: 1px solid rgba(255, 255, 255, 0.1) !important; }

  /* Filter bar */
  .adm-filter-bar { backdrop-filter: blur(4px); }

  /* Image gallery */
  .adm-image-gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 12px; margin-top: 16px; }
  .adm-image-item { position: relative; width: 100%; padding-top: 100%; background: linear-gradient(135deg, #f0f4ff 0%, #e0e7ff 100%); border-radius: 12px; overflow: hidden; border: 2px solid #e0e7ff; }
  .adm-image-item img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; }

  /* Detail sections */
  .adm-detail-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
  .adm-detail-item { background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%); border-radius: 12px; padding: 14px; border: 1px solid #e5e7eb; }
  .adm-meta-label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.4px; color: #6b7280; margin-bottom: 4px; }
  .adm-meta-value { font-size: 13px; font-weight: 700; color: #111827; }

  /* Section badge */
  .adm-section-badge { letter-spacing: 0.8px; }

  @keyframes admFadeIn { from{opacity:0;}to{opacity:1;} }
  @keyframes admSlideIn { from{transform:translateX(80px);opacity:0;}to{transform:translateX(0);opacity:1;} }
  @keyframes admPulse { 0%,100%{box-shadow:0 0 0 0 rgba(220,38,38,0.35);}50%{box-shadow:0 0 0 8px rgba(220,38,38,0);} }
  @keyframes admDotPulse { 0%,100%{opacity:1;}50%{opacity:0.3;} }
  @keyframes admSlideUp { from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);} }
`;

function useAdminStyle() {
  useEffect(() => {
    if (document.getElementById('adm-inc-styles')) return;
    const tag = document.createElement('style');
    tag.id = 'adm-inc-styles';
    tag.textContent = ADMIN_STYLE;
    document.head.appendChild(tag);
  }, []);
}

const IS_BASE = {
  width: '100%', background: '#ffffff', border: '1.5px solid #d1d5db',
  borderRadius: 8, padding: '11px 14px', color: '#111827', fontSize: 14,
  fontWeight: 600, boxSizing: 'border-box',
};

/* ─── Badges ─── */
function StatusBadge({ status }) {
  const map = { OPEN: '#2563eb', IN_PROGRESS: '#d97706', RESOLVED: '#059669', CLOSED: '#4b5563', REJECTED: '#dc2626' };
  const labels = { OPEN: 'Open', IN_PROGRESS: 'In Progress', RESOLVED: 'Resolved', CLOSED: 'Closed', REJECTED: 'Rejected' };
  return <span style={{ background: map[status] || '#4b5563', color: '#fff', padding: '3px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, display: 'inline-block', whiteSpace: 'nowrap' }}>{labels[status] || status}</span>;
}

function PriorityBadge({ priority }) {
  const map = { LOW: '#6b7280', MEDIUM: '#2563eb', HIGH: '#d97706', CRITICAL: '#dc2626' };
  return (
    <span className={priority === 'CRITICAL' ? 'adm-priority-critical' : ''}
      style={{ background: map[priority] || '#6b7280', color: '#fff', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 800, display: 'inline-block' }}>
      {priority === 'CRITICAL' ? '🔥 ' : ''}{priority}
    </span>
  );
}

/* ─── Simple Photo Modal ─── */
function PhotoModal({ url, onClose }) {
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="adm-lightbox" onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <button onClick={onClose} style={{ position: 'absolute', top: 18, right: 22, background: 'rgba(255,255,255,0.18)', border: 'none', color: '#fff', fontSize: 22, borderRadius: '50%', width: 42, height: 42, cursor: 'pointer', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
      <img src={url} alt="full" onClick={e => e.stopPropagation()} style={{ maxWidth: '88vw', maxHeight: '88vh', borderRadius: 14, objectFit: 'contain', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', border: '2px solid rgba(255,255,255,0.15)' }} />
    </div>
  );
}

/* ─── Admin Attachments ─── */
function AdminAttachments({ urls }) {
  const [open, setOpen] = useState(null);
  if (!urls?.length) return <p style={{ color: '#9ca3af', fontSize: 13, fontWeight: 600, margin: 0 }}>No photos attached</p>;
  return (
    <div style={{ marginTop: 16 }}>
      <p style={{ color: '#111827', fontSize: 12, fontWeight: 900, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        📎 User Photos ({urls.length})
      </p>
      <div className="adm-image-gallery">
        {urls.map((url, i) => (
          <div key={i} className="adm-image-item" onClick={() => setOpen(url)}>
            <img src={url} alt={`photo-${i}`} onError={e => e.target.parentElement.style.display = 'none'} />
          </div>
        ))}
      </div>
      {open && <PhotoModal url={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

/* ─── Status Update Modal (only for non-terminal tickets) ─── */
function StatusModal({ ticket, onClose, onUpdated }) {
  const [status, setStatus] = useState(ticket.status);
  const [notes, setNotes] = useState(ticket.resolutionNotes || '');
  const [reason, setReason] = useState(ticket.rejectionReason || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const TS = { ...IS_BASE, resize: 'vertical' };
  const statusColors = { OPEN: '#2563eb', IN_PROGRESS: '#d97706', RESOLVED: '#059669', CLOSED: '#4b5563', REJECTED: '#dc2626' };

  const submit = async e => {
    e.preventDefault(); setLoading(true); setError('');
    try { const updated = await updateIncidentStatus(ticket.id, status, notes, reason); onUpdated(updated); onClose(); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#ffffff', borderRadius: 18, padding: '28px 28px', width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h3 style={{ color: '#111827', margin: 0, fontWeight: 900, fontSize: 18 }}>🔄 Update Status</h3>
            <p style={{ color: '#374151', margin: '3px 0 0', fontSize: 13, fontWeight: 600 }}>Ticket #{ticket.id} · {ticket.title}</p>
          </div>
          <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 18, cursor: 'pointer', color: '#374151', fontWeight: 700 }}>✕</button>
        </div>
        {error && <div style={{ background: '#fef2f2', border: '1.5px solid #dc2626', borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: '#991b1b', fontSize: 13, fontWeight: 700 }}>{error}</div>}
        <form onSubmit={submit}>
          <div style={{ display: 'grid', gap: 14 }}>
            <div>
              <label style={{ display: 'block', color: '#111827', fontSize: 11, fontWeight: 800, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 }}>New Status</label>
              <select className="adm-inc-input" style={{ ...IS_BASE, backgroundColor: '#ffffff', color: '#111827' }} value={status} onChange={e => setStatus(e.target.value)}>
                {TICKET_STATUSES.map(s => <option key={s} value={s} style={{ background: '#ffffff', color: '#111827' }}>{s.replace('_', ' ')}</option>)}
              </select>
              {status && (
                <div style={{ marginTop: 8, padding: '8px 14px', background: `${statusColors[status]}15`, borderRadius: 8, border: `1px solid ${statusColors[status]}50`, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <StatusBadge status={status} />
                  <span style={{ color: '#374151', fontSize: 12, fontWeight: 600 }}>will be applied</span>
                </div>
              )}
            </div>
            {(status === 'RESOLVED' || status === 'CLOSED') && (
              <div>
                <label style={{ display: 'block', color: '#111827', fontSize: 11, fontWeight: 800, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 }}>Resolution Notes</label>
                <textarea className="adm-inc-input" style={{ ...TS, minHeight: 80 }} placeholder="What was done to resolve this issue..." value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
            )}
            {status === 'REJECTED' && (
              <div>
                <label style={{ display: 'block', color: '#111827', fontSize: 11, fontWeight: 800, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 }}>Rejection Reason *</label>
                <textarea className="adm-inc-input" style={{ ...TS, minHeight: 70 }} placeholder="Explain why this ticket is being rejected..." value={reason} onChange={e => setReason(e.target.value)} />
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 22 }}>
            <button type="button" onClick={onClose} className="adm-inc-btn" style={{ flex: 1, padding: '11px 0', background: '#f9fafb', border: '1.5px solid #d1d5db', borderRadius: 10, color: '#374151', cursor: 'pointer', fontWeight: 700 }}>Cancel</button>
            <button type="submit" disabled={loading} className="adm-inc-btn" style={{ flex: 2, padding: '11px 0', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer', fontWeight: 800, fontSize: 15 }}>
              {loading ? '⏳ Saving...' : '✅ Update Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Assign Technician Modal (only for non-terminal tickets) ─── */
function AssignModal({ ticket, technicians, onClose, onUpdated }) {
  const [techId, setTechId] = useState(ticket.assigneeId || '');
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault(); setLoading(true);
    try { const updated = await assignIncidentTechnician(ticket.id, techId); onUpdated(updated); onClose(); }
    catch { } finally { setLoading(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#ffffff', borderRadius: 18, padding: '28px 28px', width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h3 style={{ color: '#111827', margin: 0, fontWeight: 900, fontSize: 18 }}>👷 Assign Technician</h3>
            <p style={{ color: '#374151', margin: '3px 0 0', fontSize: 13, fontWeight: 600 }}>Ticket #{ticket.id}</p>
          </div>
          <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 18, cursor: 'pointer', color: '#374151', fontWeight: 700 }}>✕</button>
        </div>
        <form onSubmit={submit}>
          <label style={{ display: 'block', color: '#111827', fontSize: 11, fontWeight: 800, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>Select Technician</label>
          <select value={techId} onChange={e => setTechId(e.target.value)} required className="adm-inc-input"
            style={{ ...IS_BASE, marginBottom: 16, backgroundColor: '#ffffff', color: '#111827' }}>
            <option value="" style={{ background: '#ffffff', color: '#111827' }}>-- Select Technician --</option>
            {technicians.map(t => <option key={t.id} value={t.id} style={{ background: '#ffffff', color: '#111827' }}>{t.fullName || t.username} ({t.role})</option>)}
          </select>
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" onClick={onClose} className="adm-inc-btn" style={{ flex: 1, padding: '11px 0', background: '#f9fafb', border: '1.5px solid #d1d5db', borderRadius: 10, color: '#374151', cursor: 'pointer', fontWeight: 700 }}>Cancel</button>
            <button type="submit" disabled={loading || !techId} className="adm-inc-btn" style={{ flex: 2, padding: '11px 0', background: 'linear-gradient(135deg, #059669, #047857)', border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer', fontWeight: 800, fontSize: 15 }}>
              {loading ? '⏳ Assigning...' : '✅ Assign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── SLA Badge ─── */
function SLABadge({ createdAt, status }) {
  if (TERMINAL.has(status) || status === 'RESOLVED') return null;
  const d = safeDate(createdAt);
  if (!d || isNaN(d)) return null;
  const hoursOpen = (Date.now() - d.getTime()) / 3600000;
  if (hoursOpen < 24) return null;
  const days = Math.floor(hoursOpen / 24);
  const bg = days >= 3 ? '#dc2626' : '#d97706';
  return (
    <span style={{ background: bg, color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 6, whiteSpace: 'nowrap', display: 'inline-block' }}>
      ⏱ {days}d overdue
    </span>
  );
}

/* ─── Ticket Detail Slide Panel (Admin) ─── */
function TicketDetailPanel({ ticket, onClose }) {
  const isTerminal = TERMINAL.has(ticket.status);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const currentUserId = localStorage.getItem('smartcampus_user_id');

  const loadComments = useCallback(async () => {
    try { setComments(await fetchIncidentComments(ticket.id)); } catch { }
  }, [ticket.id]);

  useEffect(() => { loadComments(); }, [loadComments]);

  const submitComment = async () => {
    if (!newComment.trim()) return;
    setAddingComment(true);
    try { await addAdminIncidentComment(ticket.id, newComment, currentUserId); setNewComment(''); loadComments(); } catch { }
    finally { setAddingComment(false); }
  };

  const saveEdit = async id => {
    try { await editIncidentComment(id, editContent); setEditingId(null); loadComments(); } catch { }
  };

  const removeComment = async id => {
    if (!window.confirm('Delete this comment?')) return;
    try { await deleteAdminIncidentComment(id, currentUserId); loadComments(); } catch { }
  };

  const TS = { ...IS_BASE, resize: 'vertical' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', zIndex: 999 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="adm-panel" style={{ background: '#ffffff', width: '100%', maxWidth: 560, height: '100vh', overflowY: 'auto', padding: '28px 24px', borderLeft: '3px solid #2563eb', boxShadow: '-12px 0 40px rgba(0,0,0,0.25)' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, paddingBottom: 16, borderBottom: '2px solid #e5e7eb' }}>
          <div>
            <span style={{ color: '#6b7280', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {isTerminal ? '📜 View Only' : '👁 Admin View'}
            </span>
            <h3 style={{ color: '#111827', margin: '6px 0 0', fontWeight: 900, fontSize: 22 }}>Ticket #{ticket.id}</h3>
          </div>
          <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', borderRadius: 10, padding: '8px 12px', fontSize: 22, cursor: 'pointer', color: '#374151', fontWeight: 700, transition: 'all 0.2s' }}>✕</button>
        </div>

        {/* Read-only banner for terminal tickets */}
        {isTerminal && (
          <div style={{ background: ticket.status === 'CLOSED' ? 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)' : 'linear-gradient(135deg, #fef2f2 0%, #fdf8f8 100%)', border: `2px solid ${ticket.status === 'CLOSED' ? '#10b981' : '#dc2626'}`, borderRadius: 12, padding: '12px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>{ticket.status === 'CLOSED' ? '🔒' : '🚫'}</span>
            <p style={{ margin: 0, fontWeight: 800, color: ticket.status === 'CLOSED' ? '#065f46' : '#991b1b', fontSize: 12 }}>
              This ticket is <strong>{ticket.status}</strong>. No further actions available — view only.
            </p>
          </div>
        )}

        {/* Title */}
        <p style={{ fontWeight: 900, fontSize: 18, color: '#111827', marginBottom: 12, lineHeight: 1.4 }}>{ticket.title}</p>
        
        {/* Badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18, alignItems: 'center' }}>
          <PriorityBadge priority={ticket.priority} />
          <StatusBadge status={ticket.status} />
          <SLABadge createdAt={ticket.createdAt} status={ticket.status} />
        </div>

        {/* Description */}
        <div style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #e0e7ff 100%)', borderRadius: 14, padding: '16px 18px', marginBottom: 18, border: '2px solid #dbeafe' }}>
          <p style={{ color: '#1e3a8a', fontSize: 11, fontWeight: 900, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 0.4 }}>📝 Description</p>
          <p style={{ color: '#111827', fontSize: 13, margin: 0, fontWeight: 600, lineHeight: 1.8 }}>{ticket.description}</p>
        </div>

        {/* Meta grid */}
        <p style={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#111827', margin: '0 0 14px' }}>ℹ️ Ticket Information</p>
        <div className="adm-detail-grid" style={{ marginBottom: 18 }}>
          {[
            { icon: '📍', label: 'Location', val: ticket.location },
            { icon: '🏷', label: 'Category', val: ticket.category },
            { icon: '👤', label: 'Reporter', val: ticket.reporterName || 'Unknown' },
            { icon: '👷', label: 'Assignee', val: ticket.assigneeName || 'Unassigned' },
            { icon: '📞', label: 'Contact', val: ticket.contactDetails || 'N/A' },
            { icon: '📅', label: 'Created', val: fmtDate(ticket.createdAt) },
          ].map(m => (
            <div key={m.label} className="adm-detail-item" style={{ display: 'flex', flexDirection: 'column' }}>
              <p className="adm-meta-label">{m.icon} {m.label}</p>
              <p className="adm-meta-value">{m.val}</p>
            </div>
          ))}
        </div>

        {ticket.resolutionNotes && (
          <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0.04) 100%)', border: '2px solid #10b981', borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
            <p style={{ color: '#059669', fontSize: 11, fontWeight: 900, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>✅ Resolution Notes</p>
            <p style={{ color: '#111827', fontSize: 13, margin: 0, fontWeight: 600, lineHeight: 1.6 }}>{ticket.resolutionNotes}</p>
          </div>
        )}
        {ticket.rejectionReason && (
          <div style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(239,68,68,0.04) 100%)', border: '2px solid #dc2626', borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
            <p style={{ color: '#dc2626', fontSize: 11, fontWeight: 900, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>❌ Rejection Reason</p>
            <p style={{ color: '#111827', fontSize: 13, margin: 0, fontWeight: 600, lineHeight: 1.6 }}>{ticket.rejectionReason}</p>
          </div>
        )}

        <AdminAttachments urls={ticket.attachmentUrls} />

        <hr style={{ borderColor: '#e5e7eb', margin: '20px 0', borderStyle: 'dashed' }} />

        {/* Comments */}
        <p style={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#111827', marginBottom: 14 }}>
          💬 Comments ({comments.length})
        </p>
        {comments.length === 0 && (
          <div style={{ background: '#ffffff', border: '2px dashed #d1d5db', borderRadius: 12, padding: 18, textAlign: 'center', marginBottom: 16 }}>
            <p style={{ color: '#6b7280', fontSize: 13, margin: 0, fontWeight: 600 }}>No comments yet. Be the first to comment!</p>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16, maxHeight: '300px', overflowY: 'auto' }}>
          {[...comments].sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt)).map(c => {
            const isEscalation = c.content && c.content.includes('ESCALATION REQUEST');
            return (
            <div key={c.id} className="adm-comment-card" style={{ background: isEscalation ? 'linear-gradient(135deg, #fef2f2 0%, #fdf8f8 100%)' : 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)', borderRadius: 12, padding: '12px 14px', border: `2px solid ${isEscalation ? '#fca5a5' : '#e5e7eb'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
                <span style={{ color: isEscalation ? '#dc2626' : '#2563eb', fontSize: 12, fontWeight: 800 }}>👤 {c.authorName}</span>
                <span style={{ color: '#6b7280', fontSize: 10, fontWeight: 600 }}>{fmtDateTime(c.createdAt)}</span>
              </div>
              {editingId === c.id && !isTerminal ? (
                <div>
                  <textarea value={editContent} onChange={e => setEditContent(e.target.value)} className="adm-inc-input" style={{ ...TS, minHeight: 60, fontSize: 12 }} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button onClick={() => saveEdit(c.id)} style={{ flex: 1, padding: '6px 12px', background: '#2563eb', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 700, transition: 'all 0.2s' }}>Save</button>
                    <button onClick={() => setEditingId(null)} style={{ flex: 1, padding: '6px 12px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 8, color: '#374151', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div>
                  <p style={{ color: isEscalation ? '#991b1b' : '#111827', fontSize: 12, margin: 0, fontWeight: isEscalation ? 800 : 600, lineHeight: 1.5 }}>{c.content}</p>
                  {!isTerminal && (
                    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                      {c.authorId === currentUserId && (
                        <button onClick={() => { setEditingId(c.id); setEditContent(c.content); }} style={{ fontSize: 11, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 700, transition: 'all 0.2s', textDecoration: 'underline' }}>✏ Edit</button>
                      )}
                      <button onClick={() => removeComment(c.id)} style={{ fontSize: 11, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 700, transition: 'all 0.2s', textDecoration: 'underline' }}>🗑 Delete</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )})}
        </div>

        {/* Add comment */}
        {!isTerminal && (
          <div style={{ marginTop: 12 }}>
            <textarea value={newComment} onChange={e => setNewComment(e.target.value)} className="adm-inc-input"
              placeholder="Write an admin comment..." style={{ ...TS, minHeight: 80, fontSize: 12 }} />
            <button onClick={submitComment} disabled={addingComment || !newComment.trim()} style={{ marginTop: 10, width: '100%', padding: '12px 16px', background: addingComment ? '#bfdbfe' : 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none', borderRadius: 10, color: '#fff', cursor: addingComment ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: 13, transition: 'all 0.2s' }}>
              {addingComment ? '⏳ Posting...' : '💬 Post Comment'}
            </button>
          </div>
        )}
        {isTerminal && (
          <p style={{ color: '#9ca3af', fontSize: 12, fontWeight: 600, textAlign: 'center', padding: '12px 0' }}>
            🔒 Ticket is {ticket.status.toLowerCase()} — commenting disabled
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── Ticket Row ─── */
function TicketRow({ t, idx, onView, onStatus, onAssign }) {
  const isTerminal = TERMINAL.has(t.status);
  return (
    <tr className="adm-ticket-row" style={{ borderBottom: '1px solid #f3f4f6', background: idx % 2 === 0 ? '#ffffff' : '#fafbff' }}>
      <td style={{ padding: '13px 14px', color: '#070707', fontSize: 11, fontWeight: 700 }}>#{t.id}</td>
      <td style={{ padding: '13px 14px', maxWidth: 220 }}>
        <p style={{ margin: 0, fontWeight: 800, color: '#111827', fontSize: 13 }}>{t.title}</p>
        <p style={{ margin: '2px 0 0', color: '#0b0b0b', fontSize: 11, fontWeight: 600 }}>📍 {t.location}</p>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
          {t.attachmentUrls?.length > 0 && (
            <span style={{ fontSize: 10, color: '#2563eb', fontWeight: 800, background: '#eff6ff', padding: '1px 7px', borderRadius: 999 }}>
              📎 {t.attachmentUrls.length} photo{t.attachmentUrls.length > 1 ? 's' : ''}
            </span>
          )}
          <SLABadge createdAt={t.createdAt} status={t.status} />
        </div>
      </td>
      <td style={{ padding: '13px 14px', color: '#040404', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>{t.category}</td>
      <td style={{ padding: '13px 14px' }}><PriorityBadge priority={t.priority} /></td>
      <td style={{ padding: '13px 14px' }}><StatusBadge status={t.status} /></td>
      <td style={{ padding: '13px 14px', color: '#0e0f0f', fontSize: 12, fontWeight: 700 }}>{t.reporterName || '—'}</td>
      <td style={{ padding: '13px 14px', fontSize: 12, fontWeight: 700 }}>
        {t.assigneeName
          ? <span style={{ color: '#059669', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>👷 {t.assigneeName}</span>
          : <span style={{ color: '#f40dc6', fontWeight: 600, fontStyle: 'italic' }}>Unassigned</span>}
      </td>
      <td style={{ padding: '13px 14px', color: '#090909', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{fmtDate(t.createdAt)}</td>
      <td style={{ padding: '13px 14px' }}>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <button onClick={() => onView(t)} className="adm-inc-btn" style={{ padding: '5px 11px', background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 7, color: '#1d4ed8', cursor: 'pointer', fontSize: 11, fontWeight: 800 }}>
            👁 View
          </button>
          {!isTerminal && (
            <>
              <button onClick={() => onStatus(t)} className="adm-inc-btn" style={{ padding: '5px 11px', background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: 7, color: '#92400e', cursor: 'pointer', fontSize: 11, fontWeight: 800 }}>🔄 Status</button>
              <button onClick={() => onAssign(t)} className="adm-inc-btn" style={{ padding: '5px 11px', background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 7, color: '#065f46', cursor: 'pointer', fontSize: 11, fontWeight: 800 }}>👷 Assign</button>
            </>
          )}
          {isTerminal && (
            <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, padding: '5px 9px', background: '#f9fafb', borderRadius: 7, border: '1px solid #e5e7eb' }}>
              🔒 {t.status === 'CLOSED' ? 'Closed' : 'Rejected'}
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

/* ─── Tickets Table ─── */
function TicketsTable({ displayed, onView, onStatus, onAssign, emptyMsg }) {
  if (displayed.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 40, background: '#ffffff', border: '1.5px dashed #d1d5db', borderRadius: 14 }}>
        <p style={{ fontSize: 38, margin: 0 }}>📭</p>
        <p style={{ marginTop: 10, color: '#111827', fontWeight: 800, fontSize: 15 }}>{emptyMsg}</p>
      </div>
    );
  }
  return (
    <div style={{ background: '#ffffff', borderRadius: 14, border: '1.5px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#ffffff' }}>
          <thead>
            <tr style={{ background: '#f0f4ff', borderBottom: '2px solid #dbeafe' }}>
              {['#', 'Title / Location', 'Category', 'Priority', 'Status', 'Reporter', 'Assignee', 'Date', 'Actions'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '12px 14px', color: '#111827', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayed.map((t, idx) => (
              <TicketRow key={t.id} t={t} idx={idx} onView={onView} onStatus={onStatus} onAssign={onAssign} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Main Admin Page ─── */
export default function ManageIncidents() {
  useAdminStyle();
  const location = useLocation();
  const navigate = useNavigate();

  /* Strip ?ticketId= from URL so the deep-link doesn't re-open on next poll */
  const clearTicketParam = useCallback(() => {
    const params = new URLSearchParams(location.search);
    if (params.has('ticketId')) navigate('/admin/incidents', { replace: true });
  }, [location.search, navigate]);

  const [tickets, setTickets] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [search, setSearch] = useState('');
  const [statusModal, setStatusModal] = useState(null);
  const [assignModal, setAssignModal] = useState(null);
  const [detailModal, setDetailModal] = useState(null);
  const [sortBy, setSortBy] = useState('newest');
  const [historyOpen, setHistoryOpen] = useState(false);
  const pollRef = useRef(null);
  const techLoadedRef = useRef(false); // technicians only need to load once
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  /**
   * Performance strategy:
   * - ALL filtering (status, priority, search, sort) is done CLIENT-SIDE from a full ticket list.
   * - load() has NO filter dependencies → stable callback → never accidentally re-triggers.
   * - fetchAllUsers() runs only ONCE (technicians are cached in a ref).
   * - Silent background polls skip the loading spinner entirely.
   */
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // Always fetch all tickets with no server filters — client-side filtering is instant
      const ticketPromise = fetchAllIncidents();
      // Technicians: only fetch once, cache forever for this page session
      const techPromise = techLoadedRef.current
        ? Promise.resolve(null)
        : fetchAllUsers();

      const [t, u] = await Promise.all([ticketPromise, techPromise]);
      setTickets(t);

      if (u !== null) {
        setTechnicians(u.filter(user => user.role === 'TECHNICIAN' || user.role === 'ADMIN'));
        techLoadedRef.current = true;
      }

      // Handle deep-link inline — faster than waiting for a separate useEffect
      const params = new URLSearchParams(window.location.search);
      const tid = params.get('ticketId');
      if (tid && t.length > 0) {
        const found = t.find(tk => String(tk.id) === String(tid));
        if (found) setDetailModal(found);
      }

      return t;
    } catch { setTickets([]); return []; }
    finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← stable: no filter deps, so this never re-creates

  // Initial load
  useEffect(() => { load(); }, [load]);

  /* ── Auto-poll every 15 seconds (silent — no spinner) ── */
  useEffect(() => {
    pollRef.current = setInterval(() => load(true), 15000);
    return () => clearInterval(pollRef.current);
  }, [load]);

  const onUpdated = updated => setTickets(prev => prev.map(t => t.id === updated.id ? updated : t));

  const stats = [
    { label: 'Total Tickets', val: tickets.length, color: '#2563eb', bg: '#eff6ff', icon: '📋' },
    { label: 'Open', val: tickets.filter(t => t.status === 'OPEN').length, color: '#2563eb', bg: '#dbeafe', icon: '🔓' },
    { label: 'In Progress', val: tickets.filter(t => t.status === 'IN_PROGRESS').length, color: '#d97706', bg: '#fffbeb', icon: '⚙️' },
    { label: 'Critical', val: tickets.filter(t => t.priority === 'CRITICAL').length, color: '#dc2626', bg: '#fef2f2', icon: '🔥' },
  ];

  const SS = { background: '#ffffff', border: '1.5px solid #d1d5db', borderRadius: 8, padding: '9px 14px', color: '#111827', fontSize: 13, cursor: 'pointer', fontWeight: 700, backgroundColor: '#ffffff' };

  const sortFn = (a, b) => {
    if (sortBy === 'newest') return (safeDate(b.createdAt) || 0) - (safeDate(a.createdAt) || 0);
    if (sortBy === 'oldest') return (safeDate(a.createdAt) || 0) - (safeDate(b.createdAt) || 0);
    if (sortBy === 'critical') { const po = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }; return (po[a.priority] ?? 9) - (po[b.priority] ?? 9); }
    return 0;
  };

  const baseFiltered = tickets
    .filter(t => !statusFilter || t.status === statusFilter)
    .filter(t => !priorityFilter || t.priority === priorityFilter)
    .filter(t => !search || [t.title, t.reporterName, t.category, t.location].some(f => (f || '').toLowerCase().includes(search.toLowerCase())));

  /* Split active vs history */
  const activeTickets  = baseFiltered.filter(t => !TERMINAL.has(t.status)).sort(sortFn);
  const historyTickets = baseFiltered.filter(t => TERMINAL.has(t.status)).sort(sortFn);

  /* Overdue count */
  const overdueCount = tickets.filter(t => {
    if (TERMINAL.has(t.status) || t.status === 'RESOLVED') return false;
    const d = safeDate(t.createdAt);
    return d && (Date.now() - d.getTime()) > 24 * 3600000;
  }).length;

  const exportCSV = () => {
    const rows = [['ID', 'Title', 'Category', 'Priority', 'Status', 'Reporter', 'Assignee', 'Location', 'Created']];
    [...activeTickets, ...historyTickets].forEach(t => rows.push([t.id, t.title, t.category, t.priority, t.status, t.reporterName || '', t.assigneeName || '', t.location, fmtDate(t.createdAt)]));
    const csv = rows.map(r => r.map(x => `"${x}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'incidents.csv'; a.click();
  };

  return (
    <div className="adm-inc" style={{ padding: '0 0 40px' }}>

      {/* ── Premium Gradient Header ── */}
      <div className="adm-page-header" style={{ borderRadius: 20, padding: '48px', marginBottom: 32, boxShadow: '0 10px 30px -10px rgba(79, 70, 229, 0.3)', position: 'relative', overflow: 'hidden' }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -30, right: -20, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -40, right: 100, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, position: 'relative', zIndex: 2 }}>
          <div>
            <div className="fac-page-kicker" style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: 12 }}>MODULE B • SUPPORT & OPERATIONS</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
              <span style={{ fontSize: 40 }}>🛡️</span>
              <h2 style={{ color: '#ffffff', margin: 0, fontWeight: 950, fontSize: '2.8rem', letterSpacing: '-0.04em', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>Manage Incidents</h2>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.85)', margin: 0, fontSize: '1.1rem', fontWeight: 500, maxWidth: 600 }}>Review, assign, and resolve maintenance tickets in real-time across the campus ecosystem.</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {/* Live indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: 10, backdropFilter: 'blur(8px)' }}>
              <div className="adm-pulse-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#ffffff' }}>Live · {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>
            <button onClick={exportCSV} className="adm-inc-btn" style={{ padding: '9px 18px', background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.35)', borderRadius: 10, color: '#ffffff', cursor: 'pointer', fontWeight: 800, fontSize: 13, backdropFilter: 'blur(8px)' }}>
              📥 Export CSV
            </button>
            <button onClick={() => load()} className="adm-inc-btn" style={{ padding: '9px 18px', background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: 10, color: '#1d4ed8', cursor: 'pointer', fontWeight: 800, fontSize: 13 }}>
              ↻ Refresh
            </button>
          </div>
        </div>
      </div>

      {/* ── Overdue Alert ── */}
      {overdueCount > 0 && (
        <div style={{ background: 'linear-gradient(135deg, #fef2f2, #fff5f5)', border: '1.5px solid #fca5a5', borderRadius: 14, padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 4px 16px rgba(220,38,38,0.1)' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fef2f2', border: '2px solid #dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>⚠️</div>
          <div>
            <p style={{ color: '#991b1b', fontWeight: 900, fontSize: 14, margin: 0 }}>{overdueCount} ticket{overdueCount > 1 ? 's are' : ' is'} overdue (&gt;24 hours open)</p>
            <p style={{ color: '#b91c1c', fontWeight: 600, fontSize: 12, margin: '3px 0 0' }}>Please review and assign or resolve these tickets promptly.</p>
          </div>
        </div>
      )}

      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 22 }}>
        {stats.map(s => (
          <div key={s.label} className="adm-inc-card" style={{ background: s.bg, border: `1.5px solid ${s.color}28`, borderRadius: 16, padding: '20px 18px', textAlign: 'center', boxShadow: `0 2px 12px ${s.color}14` }}>
            <p style={{ fontSize: 28, margin: 0 }}>{s.icon}</p>
            <p className="adm-stat-num" style={{ fontSize: 32, fontWeight: 900, color: s.color, margin: '6px 0 4px', lineHeight: 1 }}>{s.val}</p>
            <p style={{ color: '#374151', fontSize: 12, margin: 0, fontWeight: 700, letterSpacing: 0.3 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="adm-filter-bar" style={{ background: '#ffffff', borderRadius: 14, padding: '18px 22px', marginBottom: 22, border: '1.5px solid #e5e7eb', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
        <p style={{ color: '#6b7280', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, margin: '0 0 12px' }}>🔍 Filter & Search</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={{ display: 'block', color: '#374151', fontSize: 11, fontWeight: 800, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 }}>Search</label>
            <input className="adm-inc-input" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Title, reporter, category..."
              style={{ ...IS_BASE, padding: '9px 14px' }} />
          </div>
          <div>
            <label style={{ display: 'block', color: '#374151', fontSize: 11, fontWeight: 800, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 }}>Status</label>
            <select style={{ ...SS, width: '100%' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="adm-inc-input">
              <option value="" style={{ background: '#ffffff', color: '#111827' }}>All Statuses</option>
              {TICKET_STATUSES.map(s => <option key={s} value={s} style={{ background: '#ffffff', color: '#111827' }}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', color: '#374151', fontSize: 11, fontWeight: 800, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 }}>Priority</label>
            <select style={{ ...SS, width: '100%' }} value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="adm-inc-input">
              <option value="" style={{ background: '#ffffff', color: '#111827' }}>All Priorities</option>
              {PRIORITIES.map(p => <option key={p} value={p} style={{ background: '#ffffff', color: '#111827' }}>{p}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', color: '#374151', fontSize: 11, fontWeight: 800, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 }}>Sort By</label>
            <select style={{ ...SS, width: '100%' }} value={sortBy} onChange={e => setSortBy(e.target.value)} className="adm-inc-input">
              <option value="newest" style={{ background: '#ffffff', color: '#111827' }}>Newest First</option>
              <option value="oldest" style={{ background: '#ffffff', color: '#111827' }}>Oldest First</option>
              <option value="critical" style={{ background: '#ffffff', color: '#111827' }}>Critical First</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <p style={{ color: '#374151', fontSize: 12, fontWeight: 700, margin: 0 }}>
            Showing <strong style={{ color: '#111827' }}>{activeTickets.length}</strong> active &nbsp;·&nbsp; <strong style={{ color: '#4b5563' }}>{historyTickets.length}</strong> in history
          </p>
          {search && (
            <button onClick={() => setSearch('')} className="adm-inc-btn" style={{ fontSize: 11, color: '#6b7280', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 700 }}>
              ✕ Clear search
            </button>
          )}
        </div>
      </div>

      {/* ── Active Tickets Table ── */}
      {loading ? (
        <div style={{ textAlign: 'center', color: '#374151', padding: 50, background: '#ffffff', borderRadius: 12, border: '1.5px solid #e5e7eb', fontWeight: 700, fontSize: 15 }}>
          ⏳ Loading tickets...
        </div>
      ) : (
        <>
          {/* Section header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
  
  <span
    style={{
      fontSize: 13,
      fontWeight: 900,
      background: '#111827',   // dark background
      color: '#ffffff',        // white text
      padding: '4px 10px',
      borderRadius: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.5
    }}
  >
    📂 Active Tickets
  </span>

  <span
    style={{
      background: '#2563eb',
      color: '#fff',
      fontSize: 11,
      fontWeight: 800,
      padding: '2px 10px',
      borderRadius: 999
    }}
  >
    {activeTickets.length}
  </span>

  <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />

</div>

          <TicketsTable
            displayed={activeTickets}
            onView={t => { clearTicketParam(); setDetailModal(t); }}
            onStatus={setStatusModal}
            onAssign={setAssignModal}
            emptyMsg="No active tickets found"
          />

          {/* ── History Section ── */}
          <div style={{ marginTop: 32 }}>
            <button
              onClick={() => setHistoryOpen(h => !h)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 12, width: '100%' }}>
              <span style={{ fontSize: 13, fontWeight: 900, color: '#fbfbfbff', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {historyOpen ? '▼' : '▶'} 📜 Closed &amp; Rejected History
              </span>
              <span style={{ background: historyTickets.length > 0 ? '#136eeeff' : '#d1d5db', color: '#fff', fontSize: 11, fontWeight: 800, padding: '2px 10px', borderRadius: 999 }}>
                {historyTickets.length}
              </span>
              <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
              <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 700 }}>
                {historyOpen ? 'Click to collapse' : 'Click to expand'}
              </span>
            </button>

            {historyOpen && (
              <div>
                {/* Info banner */}
                <div style={{ background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '10px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span>🔒</span>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#070707ff' }}>
                    These tickets are finalized (Closed or Rejected). They are read-only — you can view details but cannot change status or assign technicians.
                  </p>
                </div>
                <TicketsTable
                  displayed={historyTickets}
                  onView={t => { clearTicketParam(); setDetailModal(t); }}
                  onStatus={() => {}} /* disabled */
                  onAssign={() => {}} /* disabled */
                  emptyMsg="No closed or rejected tickets"
                />
              </div>
            )}
          </div>
        </>
      )}

      {detailModal && <TicketDetailPanel ticket={detailModal} onClose={() => { setDetailModal(null); clearTicketParam(); }} />}
      {statusModal && !TERMINAL.has(statusModal.status) && <StatusModal ticket={statusModal} onClose={() => setStatusModal(null)} onUpdated={onUpdated} />}
      {assignModal && !TERMINAL.has(assignModal.status) && <AssignModal ticket={assignModal} technicians={technicians} onClose={() => setAssignModal(null)} onUpdated={onUpdated} />}
    </div>
  );
}
