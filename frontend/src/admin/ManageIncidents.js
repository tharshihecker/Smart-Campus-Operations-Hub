import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchAllIncidents, updateIncidentStatus, assignIncidentTechnician,
  fetchAllUsers, fetchIncidentComments, addAdminIncidentComment,
  editIncidentComment, deleteAdminIncidentComment
} from '../api';

const TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

/* ─── Safe Date Parser (fixes 01/Jan/1970 bug) ─── */
function safeDate(val) {
  if (!val) return null;
  if (typeof val === 'string') return new Date(val);
  // epoch-seconds (10-digit) → convert to ms
  const ms = typeof val === 'number' && val < 1e10 ? val * 1000 : val;
  return new Date(ms);
}
function fmtDate(val) {
  const d = safeDate(val);
  if (!d || isNaN(d)) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
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
  /* Fix dropdown dark bg */
  .adm-inc select { background-color: #ffffff !important; color: #111827 !important; }
  .adm-inc select option { background-color: #ffffff !important; color: #111827 !important; }
  .adm-inc table tr:hover td { background: #eff6ff !important; }
  .adm-inc-btn { transition: all 0.18s !important; }
  .adm-inc-btn:hover:not(:disabled) { filter: brightness(1.08); transform: translateY(-1px); }
  .adm-inc-card { transition: box-shadow 0.2s, transform 0.18s; }
  .adm-inc-card:hover { box-shadow: 0 4px 18px rgba(37,99,235,0.14); transform: translateY(-2px); }
  .adm-inc-input { transition: border-color 0.18s, box-shadow 0.18s; }
  .adm-inc-input:focus { outline: none; border-color: #2563eb !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.15) !important; }
  .adm-photo-thumb { cursor: pointer; transition: transform 0.18s, box-shadow 0.18s; border-radius: 10px; }
  .adm-photo-thumb:hover { transform: scale(1.06); box-shadow: 0 6px 20px rgba(0,0,0,0.22); }
  .adm-lightbox { animation: admFadeIn 0.18s; }
  .adm-panel { animation: admSlideIn 0.25s; }
  .adm-priority-critical { animation: admPulse 1.8s infinite; }
  .adm-comment-card { transition: background 0.15s; }
  .adm-comment-card:hover { background: #f0f4ff !important; }
  @keyframes admFadeIn { from{opacity:0;}to{opacity:1;} }
  @keyframes admSlideIn { from{transform:translateX(60px);opacity:0;}to{transform:translateX(0);opacity:1;} }
  @keyframes admPulse { 0%,100%{box-shadow:0 0 0 0 rgba(220,38,38,0.35);}50%{box-shadow:0 0 0 6px rgba(220,38,38,0);} }
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

/* ─── Simple Photo Modal — fixed size, no zoom controls ─── */
function PhotoModal({ url, onClose }) {
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="adm-lightbox" onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
    }}>
      <button onClick={onClose} style={{
        position: 'absolute', top: 18, right: 22, background: 'rgba(255,255,255,0.18)',
        border: 'none', color: '#fff', fontSize: 22, borderRadius: '50%',
        width: 42, height: 42, cursor: 'pointer', fontWeight: 800,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>✕</button>
      <img src={url} alt="full" onClick={e => e.stopPropagation()} style={{
        maxWidth: '88vw', maxHeight: '88vh', borderRadius: 14,
        objectFit: 'contain', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        border: '2px solid rgba(255,255,255,0.15)'
      }} />
    </div>
  );
}

/* ─── Admin Attachments ─── */
function AdminAttachments({ urls }) {
  const [open, setOpen] = useState(null);
  if (!urls?.length) return <p style={{ color: '#9ca3af', fontSize: 13, fontWeight: 600, margin: 0 }}>No photos attached</p>;
  return (
    <div style={{ marginTop: 14 }}>
      <p style={{ color: '#111827', fontSize: 12, fontWeight: 900, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        📎 User Photos ({urls.length}) — click to view
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {urls.map((url, i) => (
          <img key={i} src={url} alt={`att-${i}`} className="adm-photo-thumb"
            onClick={() => setOpen(url)}
            style={{ width: 100, height: 100, objectFit: 'cover', border: '2px solid #d1d5db', display: 'block' }}
            onError={e => e.target.style.display = 'none'} />
        ))}
      </div>
      {open && <PhotoModal url={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

/* ─── Status Update Modal ─── */
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

/* ─── Assign Technician Modal ─── */
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

/* ─── 🆕 Unique Feature: SLA Badge ─── */
function SLABadge({ createdAt, status }) {
  if (status === 'RESOLVED' || status === 'CLOSED' || status === 'REJECTED') return null;
  const d = safeDate(createdAt);
  if (!d || isNaN(d)) return null;
  const hoursOpen = (Date.now() - d.getTime()) / 3600000;
  if (hoursOpen < 24) return null; // only show if overdue
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
      <div className="adm-panel" style={{ background: '#ffffff', width: '100%', maxWidth: 540, height: '100vh', overflowY: 'auto', padding: '28px 24px', borderLeft: '2px solid #e5e7eb', boxShadow: '-16px 0 40px rgba(0,0,0,0.15)' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <span style={{ color: '#6b7280', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>Admin View</span>
            <h3 style={{ color: '#111827', margin: 0, fontWeight: 900, fontSize: 20 }}>Ticket #{ticket.id}</h3>
          </div>
          <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 20, cursor: 'pointer', color: '#374151', fontWeight: 700 }}>✕</button>
        </div>

        <p style={{ fontWeight: 900, fontSize: 18, color: '#111827', marginBottom: 10, lineHeight: 1.4 }}>{ticket.title}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14, alignItems: 'center' }}>
          <PriorityBadge priority={ticket.priority} />
          <StatusBadge status={ticket.status} />
          <SLABadge createdAt={ticket.createdAt} status={ticket.status} />
        </div>

        {/* Description */}
        <div style={{ background: '#f0f4ff', borderRadius: 10, padding: '14px 16px', marginBottom: 14, border: '1.5px solid #dbeafe' }}>
          <p style={{ color: '#1e3a8a', fontSize: 11, fontWeight: 900, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 0.4 }}>Description</p>
          <p style={{ color: '#111827', fontSize: 13, margin: 0, fontWeight: 600, lineHeight: 1.7 }}>{ticket.description}</p>
        </div>

        {/* Meta grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          {[
            { icon: '📍', label: 'Location', val: ticket.location },
            { icon: '🏷', label: 'Category', val: ticket.category },
            { icon: '👤', label: 'Reporter', val: ticket.reporterName || 'Unknown' },
            { icon: '👷', label: 'Assignee', val: ticket.assigneeName || 'Unassigned' },
            { icon: '📞', label: 'Contact', val: ticket.contactDetails || 'N/A' },
            { icon: '📅', label: 'Submitted', val: fmtDate(ticket.createdAt) },
          ].map(m => (
            <div key={m.label} style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 12px', border: '1px solid #e5e7eb' }}>
              <p style={{ color: '#6b7280', fontSize: 10, fontWeight: 800, margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: 0.4 }}>{m.icon} {m.label}</p>
              <p style={{ color: '#111827', fontSize: 13, margin: 0, fontWeight: 700 }}>{m.val}</p>
            </div>
          ))}
        </div>

        {ticket.resolutionNotes && (
          <div style={{ background: '#ecfdf5', border: '1.5px solid #059669', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
            <p style={{ color: '#065f46', fontSize: 11, fontWeight: 900, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 }}>✅ Resolution Notes</p>
            <p style={{ color: '#111827', fontSize: 13, margin: 0, fontWeight: 600 }}>{ticket.resolutionNotes}</p>
          </div>
        )}
        {ticket.rejectionReason && (
          <div style={{ background: '#fef2f2', border: '1.5px solid #dc2626', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
            <p style={{ color: '#991b1b', fontSize: 11, fontWeight: 900, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 }}>❌ Rejection Reason</p>
            <p style={{ color: '#111827', fontSize: 13, margin: 0, fontWeight: 600 }}>{ticket.rejectionReason}</p>
          </div>
        )}

        <AdminAttachments urls={ticket.attachmentUrls} />

        <hr style={{ borderColor: '#e5e7eb', margin: '20px 0' }} />

        {/* Comments */}
        <p style={{ fontWeight: 900, color: '#111827', fontSize: 13, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.4 }}>
          💬 Comments ({comments.length})
        </p>
        {comments.length === 0 && (
          <div style={{ background: '#ffffff', border: '1.5px dashed #d1d5db', borderRadius: 10, padding: 16, textAlign: 'center', marginBottom: 12 }}>
            <p style={{ color: '#6b7280', fontSize: 13, margin: 0, fontWeight: 600 }}>No comments yet.</p>
          </div>
        )}
        {comments.map(c => (
          <div key={c.id} className="adm-comment-card" style={{ background: '#f8faff', borderRadius: 10, padding: '12px 14px', marginBottom: 8, border: '1.5px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: '#2563eb', fontSize: 13, fontWeight: 800 }}>👤 {c.authorName}</span>
              <span style={{ color: '#6b7280', fontSize: 11, fontWeight: 600 }}>{fmtDateTime(c.createdAt)}</span>
            </div>
            {editingId === c.id ? (
              <div>
                <textarea value={editContent} onChange={e => setEditContent(e.target.value)} className="adm-inc-input" style={{ ...TS, minHeight: 60 }} />
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <button onClick={() => saveEdit(c.id)} className="adm-inc-btn" style={{ padding: '5px 14px', background: '#2563eb', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Save</button>
                  <button onClick={() => setEditingId(null)} className="adm-inc-btn" style={{ padding: '5px 14px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 6, color: '#374151', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ color: '#111827', fontSize: 13, margin: 0, fontWeight: 600 }}>{c.content}</p>
                <div style={{ display: 'flex', gap: 10, marginTop: 7 }}>
                  {c.authorId === currentUserId && (
                    <button onClick={() => { setEditingId(c.id); setEditContent(c.content); }} style={{ fontSize: 11, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 700 }}>✏ Edit</button>
                  )}
                  <button onClick={() => removeComment(c.id)} style={{ fontSize: 11, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 700 }}>🗑 Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
        <div style={{ marginTop: 14 }}>
          <textarea value={newComment} onChange={e => setNewComment(e.target.value)} className="adm-inc-input"
            placeholder="Write an admin comment..." style={{ ...TS, minHeight: 72 }} />
          <button onClick={submitComment} disabled={addingComment || !newComment.trim()} className="adm-inc-btn"
            style={{ marginTop: 8, padding: '10px 22px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none', borderRadius: 8, color: '#fff', cursor: addingComment ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: 14 }}>
            {addingComment ? '⏳ Posting...' : '💬 Post Comment'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Admin Page ─── */
export default function ManageIncidents() {
  useAdminStyle();
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, u] = await Promise.all([
        fetchAllIncidents({ status: statusFilter || undefined, priority: priorityFilter || undefined }),
        fetchAllUsers()
      ]);
      setTickets(t);
      setTechnicians(u.filter(u => u.role === 'TECHNICIAN' || u.role === 'ADMIN'));
    } catch { setTickets([]); }
    finally { setLoading(false); }
  }, [statusFilter, priorityFilter]);

  useEffect(() => { load(); }, [load]);

  const onUpdated = updated => setTickets(prev => prev.map(t => t.id === updated.id ? updated : t));

  const stats = [
    { label: 'Total Tickets', val: tickets.length, color: '#2563eb', bg: '#eff6ff', icon: '📋' },
    { label: 'Open', val: tickets.filter(t => t.status === 'OPEN').length, color: '#2563eb', bg: '#dbeafe', icon: '🔓' },
    { label: 'In Progress', val: tickets.filter(t => t.status === 'IN_PROGRESS').length, color: '#d97706', bg: '#fffbeb', icon: '⚙️' },
    { label: 'Critical', val: tickets.filter(t => t.priority === 'CRITICAL').length, color: '#dc2626', bg: '#fef2f2', icon: '🔥' },
  ];

  const SS = { background: '#ffffff', border: '1.5px solid #d1d5db', borderRadius: 8, padding: '9px 14px', color: '#111827', fontSize: 13, cursor: 'pointer', fontWeight: 700, backgroundColor: '#ffffff' };

  const displayed = tickets
    .filter(t => !statusFilter || t.status === statusFilter)
    .filter(t => !priorityFilter || t.priority === priorityFilter)
    .filter(t => !search || [t.title, t.reporterName, t.category, t.location].some(f => (f || '').toLowerCase().includes(search.toLowerCase())))
    .sort((a, b) => {
      if (sortBy === 'newest') return (safeDate(b.createdAt) || 0) - (safeDate(a.createdAt) || 0);
      if (sortBy === 'oldest') return (safeDate(a.createdAt) || 0) - (safeDate(b.createdAt) || 0);
      if (sortBy === 'critical') { const po = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }; return (po[a.priority] ?? 9) - (po[b.priority] ?? 9); }
      return 0;
    });

  // 🆕 Overdue tickets count
  const overdueCount = tickets.filter(t => {
    if (t.status === 'RESOLVED' || t.status === 'CLOSED' || t.status === 'REJECTED') return false;
    const d = safeDate(t.createdAt);
    return d && (Date.now() - d.getTime()) > 24 * 3600000;
  }).length;

  const exportCSV = () => {
    const rows = [['ID', 'Title', 'Category', 'Priority', 'Status', 'Reporter', 'Assignee', 'Location', 'Created']];
    displayed.forEach(t => rows.push([t.id, t.title, t.category, t.priority, t.status, t.reporterName || '', t.assigneeName || '', t.location, fmtDate(t.createdAt)]));
    const csv = rows.map(r => r.map(x => `"${x}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'incidents.csv'; a.click();
  };

  return (
    <div className="adm-inc" style={{ padding: '0 0 40px' }}>

      {/* Header */}
      <div style={{ background: '#ffffff', borderRadius: 16, padding: '22px 26px', marginBottom: 20, border: '1.5px solid #e5e7eb', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ color: '#111827', margin: 0, fontWeight: 900, fontSize: '1.6rem' }}>🛡 Manage Incidents</h2>
            <p style={{ color: '#374151', margin: '5px 0 0', fontSize: 14, fontWeight: 600 }}>Review, assign, and resolve maintenance tickets</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={exportCSV} className="adm-inc-btn" style={{ padding: '9px 18px', background: '#ecfdf5', border: '1.5px solid #059669', borderRadius: 8, color: '#065f46', cursor: 'pointer', fontWeight: 800, fontSize: 13 }}>
              📥 Export CSV
            </button>
            <button onClick={load} className="adm-inc-btn" style={{ padding: '9px 18px', background: '#eff6ff', border: '1.5px solid #2563eb', borderRadius: 8, color: '#1d4ed8', cursor: 'pointer', fontWeight: 800, fontSize: 13 }}>
              ↻ Refresh
            </button>
          </div>
        </div>
      </div>

      {/* 🆕 Overdue Alert */}
      {overdueCount > 0 && (
        <div style={{ background: '#fef2f2', border: '1.5px solid #dc2626', borderRadius: 12, padding: '14px 18px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>⚠️</span>
          <div>
            <p style={{ color: '#991b1b', fontWeight: 900, fontSize: 14, margin: 0 }}>{overdueCount} ticket{overdueCount > 1 ? 's are' : ' is'} overdue (&gt;24 hours open)</p>
            <p style={{ color: '#b91c1c', fontWeight: 600, fontSize: 12, margin: '3px 0 0' }}>Please review and assign or resolve these tickets promptly.</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 20 }}>
        {stats.map(s => (
          <div key={s.label} className="adm-inc-card" style={{ background: s.bg, border: `1.5px solid ${s.color}33`, borderRadius: 12, padding: '18px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: 26, margin: 0 }}>{s.icon}</p>
            <p style={{ fontSize: 28, fontWeight: 900, color: s.color, margin: '4px 0 2px' }}>{s.val}</p>
            <p style={{ color: '#374151', fontSize: 12, margin: 0, fontWeight: 700 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background: '#ffffff', borderRadius: 12, padding: '16px 20px', marginBottom: 20, border: '1.5px solid #e5e7eb', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ display: 'block', color: '#111827', fontSize: 11, fontWeight: 800, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 }}>Search</label>
            <input className="adm-inc-input" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Title, reporter, category..."
              style={{ ...IS_BASE, padding: '9px 14px' }} />
          </div>
          <div>
            <label style={{ display: 'block', color: '#111827', fontSize: 11, fontWeight: 800, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 }}>Status</label>
            <select style={{ ...SS, width: '100%' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="adm-inc-input">
              <option value="" style={{ background: '#ffffff', color: '#111827' }}>All Statuses</option>
              {TICKET_STATUSES.map(s => <option key={s} value={s} style={{ background: '#ffffff', color: '#111827' }}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', color: '#111827', fontSize: 11, fontWeight: 800, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 }}>Priority</label>
            <select style={{ ...SS, width: '100%' }} value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="adm-inc-input">
              <option value="" style={{ background: '#ffffff', color: '#111827' }}>All Priorities</option>
              {PRIORITIES.map(p => <option key={p} value={p} style={{ background: '#ffffff', color: '#111827' }}>{p}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', color: '#111827', fontSize: 11, fontWeight: 800, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 }}>Sort By</label>
            <select style={{ ...SS, width: '100%' }} value={sortBy} onChange={e => setSortBy(e.target.value)} className="adm-inc-input">
              <option value="newest" style={{ background: '#ffffff', color: '#111827' }}>Newest First</option>
              <option value="oldest" style={{ background: '#ffffff', color: '#111827' }}>Oldest First</option>
              <option value="critical" style={{ background: '#ffffff', color: '#111827' }}>Critical First</option>
            </select>
          </div>
        </div>
        <p style={{ color: '#374151', fontSize: 12, fontWeight: 700, margin: 0 }}>
          Showing <strong style={{ color: '#111827' }}>{displayed.length}</strong> of <strong style={{ color: '#111827' }}>{tickets.length}</strong> tickets
        </p>
      </div>

      {/* Table / Empty */}
      {loading ? (
        <div style={{ textAlign: 'center', color: '#374151', padding: 50, background: '#ffffff', borderRadius: 12, border: '1.5px solid #e5e7eb', fontWeight: 700, fontSize: 15 }}>
          ⏳ Loading tickets...
        </div>
      ) : displayed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 50, background: '#ffffff', border: '1.5px dashed #d1d5db', borderRadius: 14 }}>
          <p style={{ fontSize: 42, margin: 0 }}>📭</p>
          <p style={{ marginTop: 12, color: '#111827', fontWeight: 800, fontSize: 16 }}>No tickets found</p>
          <p style={{ color: '#374151', fontWeight: 600, fontSize: 13 }}>Try adjusting filters or click Refresh.</p>
        </div>
      ) : (
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
                  <tr key={t.id} style={{ borderBottom: '1px solid #f3f4f6', background: idx % 2 === 0 ? '#ffffff' : '#fafbff' }}>
                    <td style={{ padding: '13px 14px', color: '#6b7280', fontSize: 12, fontWeight: 700 }}>#{t.id}</td>
                    <td style={{ padding: '13px 14px', maxWidth: 220 }}>
                      <p style={{ margin: 0, fontWeight: 800, color: '#111827', fontSize: 13 }}>{t.title}</p>
                      <p style={{ margin: '2px 0 0', color: '#4b5563', fontSize: 11, fontWeight: 600 }}>📍 {t.location}</p>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 3 }}>
                        {t.attachmentUrls?.length > 0 && (
                          <span style={{ fontSize: 10, color: '#2563eb', fontWeight: 800, background: '#eff6ff', padding: '1px 6px', borderRadius: 4 }}>
                            📎 {t.attachmentUrls.length} photo{t.attachmentUrls.length > 1 ? 's' : ''}
                          </span>
                        )}
                        <SLABadge createdAt={t.createdAt} status={t.status} />
                      </div>
                    </td>
                    <td style={{ padding: '13px 14px', color: '#1f2937', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>{t.category}</td>
                    <td style={{ padding: '13px 14px' }}><PriorityBadge priority={t.priority} /></td>
                    <td style={{ padding: '13px 14px' }}><StatusBadge status={t.status} /></td>
                    <td style={{ padding: '13px 14px', color: '#1f2937', fontSize: 12, fontWeight: 700 }}>{t.reporterName || '—'}</td>
                    <td style={{ padding: '13px 14px', fontSize: 12, fontWeight: 700 }}>
                      {t.assigneeName
                        ? <span style={{ color: '#059669', fontWeight: 800 }}>👷 {t.assigneeName}</span>
                        : <span style={{ color: '#9ca3af', fontWeight: 600 }}>Unassigned</span>}
                    </td>
                    <td style={{ padding: '13px 14px', color: '#4b5563', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{fmtDate(t.createdAt)}</td>
                    <td style={{ padding: '13px 14px' }}>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        <button onClick={() => setDetailModal(t)} className="adm-inc-btn" style={{ padding: '5px 10px', background: '#eff6ff', border: '1.5px solid #2563eb', borderRadius: 6, color: '#1d4ed8', cursor: 'pointer', fontSize: 11, fontWeight: 800 }}>👁 View</button>
                        <button onClick={() => setStatusModal(t)} className="adm-inc-btn" style={{ padding: '5px 10px', background: '#fffbeb', border: '1.5px solid #d97706', borderRadius: 6, color: '#92400e', cursor: 'pointer', fontSize: 11, fontWeight: 800 }}>🔄 Status</button>
                        <button onClick={() => setAssignModal(t)} className="adm-inc-btn" style={{ padding: '5px 10px', background: '#ecfdf5', border: '1.5px solid #059669', borderRadius: 6, color: '#065f46', cursor: 'pointer', fontSize: 11, fontWeight: 800 }}>👷 Assign</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {detailModal && <TicketDetailPanel ticket={detailModal} onClose={() => setDetailModal(null)} onUpdate={onUpdated} />}
      {statusModal && <StatusModal ticket={statusModal} onClose={() => setStatusModal(null)} onUpdated={onUpdated} />}
      {assignModal && <AssignModal ticket={assignModal} technicians={technicians} onClose={() => setAssignModal(null)} onUpdated={onUpdated} />}
    </div>
  );
}
