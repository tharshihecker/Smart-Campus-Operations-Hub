import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchMyIncidents, createIncident, fetchIncidentComments,
  addIncidentComment, editIncidentComment, deleteIncidentComment
} from '../api';

const CATEGORIES = ['AV Equipment', 'HVAC', 'Infrastructure', 'IT/Network', 'Electrical', 'Plumbing', 'Safety', 'Cleaning', 'Other'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

/* ─── Safe Date Parser ─── */
// Backend may send epoch-seconds (10 digit) or epoch-ms (13 digit) or ISO string
function safeDate(val) {
  if (!val) return null;
  if (typeof val === 'string') return new Date(val);
  // epoch-seconds check: if number < 1e10 it's seconds
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

/* ─── Global CSS Inject ─── */
const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  .inc-root * { font-family: 'Inter', sans-serif !important; box-sizing: border-box; }
  /* Force dropdowns to white with dark text — prevents dark browser themes from overriding */
  .inc-root select { background-color: #ffffff !important; color: #111827 !important; }
  .inc-root select option { background-color: #ffffff !important; color: #111827 !important; }
  .inc-tab-btn { transition: all 0.18s; }
  .inc-tab-btn:hover { transform: translateY(-1px); }
  .inc-card { transition: box-shadow 0.2s, transform 0.2s, border-color 0.2s; }
  .inc-card:hover { box-shadow: 0 6px 24px rgba(37,99,235,0.13); transform: translateY(-2px); border-color: #2563eb !important; }
  .inc-stat-card { transition: box-shadow 0.2s, transform 0.2s; }
  .inc-stat-card:hover { box-shadow: 0 4px 18px rgba(37,99,235,0.15); transform: translateY(-2px); }
  .inc-btn-primary { transition: all 0.18s !important; }
  .inc-btn-primary:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); box-shadow: 0 4px 14px rgba(37,99,235,0.35) !important; }
  .inc-input { transition: border-color 0.18s, box-shadow 0.18s; }
  .inc-input:focus { outline: none; border-color: #2563eb !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.15) !important; }
  .inc-lightbox { animation: incFadeIn 0.18s; }
  .inc-panel { animation: incSlideIn 0.25s; }
  @keyframes incFadeIn { from { opacity:0; } to { opacity:1; } }
  @keyframes incSlideIn { from { transform: translateX(60px); opacity:0; } to { transform: translateX(0); opacity:1; } }
  .inc-comment-card { transition: background 0.15s; }
  .inc-comment-card:hover { background: #f0f4ff !important; }
  .inc-priority-pulse { animation: incPulse 1.8s infinite; }
  @keyframes incPulse { 0%,100%{box-shadow:0 0 0 0 rgba(220,38,38,0.35);} 50%{box-shadow:0 0 0 6px rgba(220,38,38,0);} }
  .inc-photo-thumb { cursor: pointer; transition: transform 0.18s, box-shadow 0.18s; border-radius: 10px; }
  .inc-photo-thumb:hover { transform: scale(1.05); box-shadow: 0 6px 20px rgba(0,0,0,0.22); }
  .inc-escalate-btn { transition: all 0.18s; }
  .inc-escalate-btn:hover { transform: scale(1.04); box-shadow: 0 4px 16px rgba(220,38,38,0.3); }
  .inc-feed-item { animation: incFeedIn 0.4s; }
  @keyframes incFeedIn { from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);} }
`;

function useInjectStyle() {
  useEffect(() => {
    if (document.getElementById('inc-styles')) return;
    const tag = document.createElement('style');
    tag.id = 'inc-styles';
    tag.textContent = STYLE;
    document.head.appendChild(tag);
  }, []);
}

/* ─── Shared input style ─── */
const IS_BASE = {
  width: '100%', background: '#ffffff', border: '1.5px solid #d1d5db',
  borderRadius: 8, padding: '11px 14px', color: '#111827', fontSize: 14,
  fontWeight: 600, boxSizing: 'border-box',
};

/* ─── Badges ─── */
function StatusBadge({ status }) {
  const map = { OPEN: '#2563eb', IN_PROGRESS: '#d97706', RESOLVED: '#059669', CLOSED: '#4b5563', REJECTED: '#dc2626' };
  const labels = { OPEN: 'Open', IN_PROGRESS: 'In Progress', RESOLVED: 'Resolved', CLOSED: 'Closed', REJECTED: 'Rejected' };
  return (
    <span style={{ background: map[status] || '#4b5563', color: '#fff', padding: '3px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, display: 'inline-block', whiteSpace: 'nowrap' }}>
      {labels[status] || status}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const map = { LOW: '#6b7280', MEDIUM: '#2563eb', HIGH: '#d97706', CRITICAL: '#dc2626' };
  const icons = { LOW: '▼', MEDIUM: '■', HIGH: '▲', CRITICAL: '🔥' };
  return (
    <span className={priority === 'CRITICAL' ? 'inc-priority-pulse' : ''} style={{ background: map[priority] || '#6b7280', color: '#fff', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 800, display: 'inline-block' }}>
      {icons[priority]} {priority}
    </span>
  );
}

/* ─── Simple Photo Modal (click = fixed size fullscreen) ─── */
function PhotoModal({ url, onClose }) {
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="inc-lightbox" onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
    }}>
      <button onClick={onClose} style={{
        position: 'absolute', top: 18, right: 22,
        background: 'rgba(255,255,255,0.18)', border: 'none',
        color: '#fff', fontSize: 22, borderRadius: 50, width: 42, height: 42,
        cursor: 'pointer', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>✕</button>
      <img src={url} alt="full" onClick={e => e.stopPropagation()} style={{
        maxWidth: '88vw', maxHeight: '88vh', borderRadius: 14,
        objectFit: 'contain', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        border: '2px solid rgba(255,255,255,0.15)'
      }} />
    </div>
  );
}

/* ─── Attachments ─── */
function AttachmentsSection({ urls }) {
  const [open, setOpen] = useState(null);
  if (!urls?.length) return null;
  return (
    <div style={{ marginTop: 14 }}>
      <p style={{ color: '#111827', fontSize: 12, fontWeight: 800, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        📎 Attachments ({urls.length}) — click to view
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {urls.map((url, i) => (
          <img key={i} src={url} alt={`att-${i}`} className="inc-photo-thumb"
            onClick={() => setOpen(url)}
            style={{ width: 88, height: 88, objectFit: 'cover', border: '2px solid #e5e7eb' }}
            onError={e => e.target.style.display = 'none'} />
        ))}
      </div>
      {open && <PhotoModal url={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

/* ─── Status Timeline ─── */
function StatusTimeline({ status }) {
  const steps = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
  const isRejected = status === 'REJECTED';
  const idx = steps.indexOf(status);
  return (
    <div style={{ margin: '14px 0', padding: '12px 14px', background: '#f0f4ff', borderRadius: 10, border: '1.5px solid #dbeafe' }}>
      <p style={{ color: '#1e40af', fontSize: 11, fontWeight: 800, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {isRejected ? '❌ Ticket Rejected' : '📋 Progress'}
      </p>
      {isRejected ? (
        <p style={{ color: '#dc2626', fontWeight: 700, fontSize: 13, margin: 0 }}>This ticket has been rejected by admin.</p>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {steps.map((s, i) => {
            const done = i <= idx; const active = i === idx;
            return (
              <React.Fragment key={s}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: done ? '#2563eb' : '#e5e7eb', color: done ? '#fff' : '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, border: active ? '3px solid #1d4ed8' : 'none', boxShadow: active ? '0 0 0 3px rgba(37,99,235,0.25)' : 'none' }}>
                    {done ? '✓' : i + 1}
                  </div>
                  <span style={{ fontSize: 9, color: done ? '#1e40af' : '#6b7280', fontWeight: done ? 700 : 500, marginTop: 4, whiteSpace: 'nowrap' }}>{s.replace('_', ' ')}</span>
                </div>
                {i < steps.length - 1 && <div style={{ flex: 1, height: 3, background: i < idx ? '#2563eb' : '#e5e7eb', margin: '-12px 4px 0' }} />}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── 🆕 UNIQUE FEATURE: Activity Feed ─── */
function ActivityFeed({ tickets }) {
  // Build a sorted timeline of recent events from all tickets
  const events = tickets
    .slice(0, 12)
    .map(t => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      date: safeDate(t.updatedAt || t.createdAt),
    }))
    .filter(e => e.date && !isNaN(e.date))
    .sort((a, b) => b.date - a.date)
    .slice(0, 6);

  const iconMap = { OPEN: '🔓', IN_PROGRESS: '⚙️', RESOLVED: '✅', CLOSED: '🔒', REJECTED: '❌' };
  const colorMap = { OPEN: '#2563eb', IN_PROGRESS: '#d97706', RESOLVED: '#059669', CLOSED: '#4b5563', REJECTED: '#dc2626' };

  if (!events.length) return null;

  return (
    <div style={{ background: '#ffffff', borderRadius: 14, border: '1.5px solid #e5e7eb', padding: '18px 20px', marginBottom: 20, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
      <p style={{ color: '#111827', fontWeight: 900, fontSize: 14, margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        📡 Recent Activity
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {events.map((e, i) => (
          <div key={e.id} className="inc-feed-item" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, paddingBottom: i < events.length - 1 ? 12 : 0, marginBottom: i < events.length - 1 ? 12 : 0, borderBottom: i < events.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: `${colorMap[e.status]}18`, border: `2px solid ${colorMap[e.status]}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>
              {iconMap[e.status]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 800, color: '#111827', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.title}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                <span style={{ background: colorMap[e.status], color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 999 }}>{e.status.replace('_', ' ')}</span>
                <span style={{ color: '#6b7280', fontSize: 11, fontWeight: 600 }}>{fmtDate(e.date)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── 🆕 UNIQUE FEATURE: Urgency Escalation Button ─── */
function EscalateButton({ ticket, onEscalated }) {
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  if (ticket.priority === 'CRITICAL' || done) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#fef2f2', borderRadius: 8, border: '1.5px solid #dc2626' }}>
        <span style={{ fontSize: 14 }}>🔥</span>
        <span style={{ color: '#991b1b', fontSize: 12, fontWeight: 800 }}>{done ? 'Escalated to Critical!' : 'Already Critical Priority'}</span>
      </div>
    );
  }

  if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED' || ticket.status === 'REJECTED') return null;

  const escalate = async () => {
    setLoading(true);
    // We simulate escalation by adding a comment flagging urgency
    try {
      await addIncidentComment(ticket.id, '⚠️ ESCALATION REQUEST: User has flagged this issue as critically urgent and requires immediate attention.');
      setDone(true);
      onEscalated && onEscalated();
    } catch { }
    finally { setLoading(false); }
  };

  return (
    <button onClick={escalate} disabled={loading} className="inc-escalate-btn" style={{
      display: 'flex', alignItems: 'center', gap: 7,
      padding: '8px 16px', background: loading ? '#fca5a5' : 'linear-gradient(135deg, #dc2626, #b91c1c)',
      border: 'none', borderRadius: 8, color: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
      fontWeight: 800, fontSize: 12
    }}>
      <span>🚨</span>
      {loading ? 'Escalating...' : 'Escalate Urgency'}
    </button>
  );
}

/* ─── Ticket Card ─── */
function TicketCard({ ticket, onSelect }) {
  const borderCol = ticket.priority === 'CRITICAL' ? '#dc2626' : ticket.priority === 'HIGH' ? '#d97706' : '#e5e7eb';
  return (
    <div onClick={() => onSelect(ticket)} className="inc-card" style={{ background: '#ffffff', border: `1.5px solid ${borderCol}`, borderRadius: 14, padding: '18px 22px', cursor: 'pointer', marginBottom: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <span style={{ color: '#6b7280', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>#{ticket.id}</span>
            <p style={{ fontWeight: 800, margin: 0, color: '#111827', fontSize: 15, lineHeight: 1.3 }}>{ticket.title}</p>
          </div>
          <p style={{ fontSize: 13, color: '#374151', marginBottom: 8, fontWeight: 600 }}>
            📁 {ticket.category} &nbsp;•&nbsp; 📍 {ticket.location}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
          <PriorityBadge priority={ticket.priority} />
          <StatusBadge status={ticket.status} />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
        <p style={{ fontSize: 12, color: '#4b5563', margin: 0, fontWeight: 600 }}>
          {ticket.assigneeName ? `👷 ${ticket.assigneeName}` : '👤 Unassigned'}
        </p>
        <p style={{ fontSize: 11, color: '#6b7280', margin: 0, fontWeight: 500 }}>🕐 {fmtDate(ticket.createdAt)}</p>
      </div>
      {ticket.attachmentUrls?.length > 0 && (
        <span style={{ marginTop: 8, display: 'inline-block', fontSize: 11, color: '#2563eb', fontWeight: 700, background: '#eff6ff', padding: '2px 8px', borderRadius: 6 }}>
          📎 {ticket.attachmentUrls.length} photo{ticket.attachmentUrls.length > 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}

/* ─── Create Modal ─── */
function CreateTicketModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', description: '', category: 'AV Equipment', priority: 'MEDIUM', location: '', contactDetails: '' });
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previews, setPreviews] = useState([]);

  const handle = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleFiles = e => {
    const chosen = Array.from(e.target.files).slice(0, 3);
    setFiles(chosen);
    setPreviews(chosen.map(f => URL.createObjectURL(f)));
  };

  const submit = async e => {
    e.preventDefault();
    if (!form.title || !form.description || !form.location) { setError('Title, description, and location are required'); return; }
    setLoading(true); setError('');
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    files.forEach(f => fd.append('files', f));
    try { const ticket = await createIncident(fd); onCreated(ticket); onClose(); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const LB = ({ children }) => <label style={{ display: 'block', color: '#111827', fontSize: 11, fontWeight: 800, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 }}>{children}</label>;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: '#ffffff', borderRadius: 18, padding: '32px 28px', width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ color: '#111827', margin: 0, fontWeight: 900, fontSize: 22 }}>🛠 Report New Incident</h2>
            <p style={{ color: '#374151', margin: '4px 0 0', fontSize: 13, fontWeight: 600 }}>Fill in details to submit a maintenance request</p>
          </div>
          <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 20, cursor: 'pointer', color: '#374151', fontWeight: 700 }}>✕</button>
        </div>
        {error && <div style={{ background: '#fef2f2', border: '1.5px solid #dc2626', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#991b1b', fontSize: 13, fontWeight: 700 }}>{error}</div>}
        <form onSubmit={submit}>
          <div style={{ display: 'grid', gap: 14 }}>
            <div><LB>Title *</LB><input className="inc-input" style={IS_BASE} placeholder="Brief incident title" value={form.title} onChange={handle('title')} /></div>
            <div><LB>Description *</LB><textarea className="inc-input" style={{ ...IS_BASE, minHeight: 90, resize: 'vertical' }} placeholder="Describe the issue in detail..." value={form.description} onChange={handle('description')} /></div>
            <div><LB>Location *</LB><input className="inc-input" style={IS_BASE} placeholder="e.g. Block A, Room 201" value={form.location} onChange={handle('location')} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <LB>Category</LB>
                <select className="inc-input" style={{ ...IS_BASE, backgroundColor: '#ffffff', color: '#111827' }} value={form.category} onChange={handle('category')}>
                  {CATEGORIES.map(c => <option key={c} style={{ background: '#ffffff', color: '#111827' }}>{c}</option>)}
                </select>
              </div>
              <div>
                <LB>Priority</LB>
                <select className="inc-input" style={{ ...IS_BASE, backgroundColor: '#ffffff', color: '#111827' }} value={form.priority} onChange={handle('priority')}>
                  {PRIORITIES.map(p => <option key={p} style={{ background: '#ffffff', color: '#111827' }}>{p}</option>)}
                </select>
              </div>
            </div>
            <div><LB>Contact (optional)</LB><input className="inc-input" style={IS_BASE} placeholder="Email or phone" value={form.contactDetails} onChange={handle('contactDetails')} /></div>
            <div>
              <LB>Evidence Photos (max 3)</LB>
              <input type="file" accept="image/*" multiple onChange={handleFiles} style={{ ...IS_BASE, padding: '8px 14px', cursor: 'pointer' }} />
              {previews.length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  {previews.map((p, i) => <img key={i} src={p} alt="preview" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, border: '2px solid #d1d5db' }} />)}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '11px 0', background: '#f9fafb', border: '1.5px solid #d1d5db', borderRadius: 10, color: '#374151', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>Cancel</button>
            <button type="submit" disabled={loading} className="inc-btn-primary" style={{ flex: 2, padding: '11px 0', background: loading ? '#93c5fd' : 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none', borderRadius: 10, color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: 15 }}>
              {loading ? '⏳ Submitting...' : '🚀 Submit Incident'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Ticket Detail Panel ─── */
function TicketDetailPanel({ ticket, onClose }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const [escalated, setEscalated] = useState(false);
  const currentUserId = localStorage.getItem('smartcampus_user_id');

  const loadComments = useCallback(async () => {
    try { setComments(await fetchIncidentComments(ticket.id)); } catch { }
  }, [ticket.id]);

  useEffect(() => { loadComments(); }, [loadComments]);

  const submitComment = async () => {
    if (!newComment.trim()) return;
    setAddingComment(true);
    try { await addIncidentComment(ticket.id, newComment); setNewComment(''); loadComments(); } catch { }
    finally { setAddingComment(false); }
  };

  const saveEdit = async id => {
    try { await editIncidentComment(id, editContent); setEditingId(null); loadComments(); } catch { }
  };

  const removeComment = async id => {
    if (!window.confirm('Delete this comment?')) return;
    try { await deleteIncidentComment(id); loadComments(); } catch { }
  };

  const TS = { ...IS_BASE, resize: 'vertical' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', zIndex: 999 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="inc-panel" style={{ background: '#ffffff', width: '100%', maxWidth: 500, height: '100vh', overflowY: 'auto', padding: '28px 24px', borderLeft: '2px solid #e5e7eb', boxShadow: '-16px 0 40px rgba(0,0,0,0.15)' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <span style={{ color: '#6b7280', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>Ticket</span>
            <h3 style={{ color: '#111827', margin: 0, fontWeight: 900, fontSize: 20 }}>#{ticket.id}</h3>
          </div>
          <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 20, cursor: 'pointer', color: '#374151', fontWeight: 700 }}>✕</button>
        </div>

        <p style={{ fontWeight: 900, fontSize: 18, color: '#111827', marginBottom: 10, lineHeight: 1.4 }}>{ticket.title}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          <PriorityBadge priority={ticket.priority} />
          <StatusBadge status={ticket.status} />
          {/* 🆕 Escalate Button */}
          <EscalateButton ticket={ticket} onEscalated={() => { setEscalated(true); loadComments(); }} />
        </div>

        <StatusTimeline status={ticket.status} />

        <div style={{ background: '#f8faff', borderRadius: 10, padding: '14px 16px', marginBottom: 14, border: '1.5px solid #dbeafe' }}>
          <p style={{ color: '#111827', fontSize: 13, margin: 0, fontWeight: 600, lineHeight: 1.7 }}>{ticket.description}</p>
        </div>

        {/* Meta grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          {[
            { icon: '📍', label: 'Location', val: ticket.location },
            { icon: '🏷', label: 'Category', val: ticket.category },
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

        <AttachmentsSection urls={ticket.attachmentUrls} />

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
        {comments.map(c => {
          const isEscalation = c.content && c.content.includes('ESCALATION REQUEST');
          return (
          <div key={c.id} className="inc-comment-card" style={{ background: isEscalation ? '#fef2f2' : '#f8faff', borderRadius: 10, padding: '12px 14px', marginBottom: 8, border: `1.5px solid ${isEscalation ? '#fca5a5' : '#e5e7eb'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: isEscalation ? '#dc2626' : '#2563eb', fontSize: 13, fontWeight: 800 }}>👤 {c.authorName}</span>
              <span style={{ color: '#6b7280', fontSize: 11, fontWeight: 600 }}>{fmtDateTime(c.createdAt)}</span>
            </div>
            {editingId === c.id ? (
              <div>
                <textarea value={editContent} onChange={e => setEditContent(e.target.value)} className="inc-input" style={{ ...TS, minHeight: 60 }} />
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <button onClick={() => saveEdit(c.id)} style={{ padding: '5px 14px', background: '#2563eb', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Save</button>
                  <button onClick={() => setEditingId(null)} style={{ padding: '5px 14px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 6, color: '#374151', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ color: isEscalation ? '#991b1b' : '#111827', fontSize: 13, margin: 0, fontWeight: isEscalation ? 800 : 600 }}>{c.content}</p>
                {c.authorId === currentUserId && (
                  <div style={{ display: 'flex', gap: 10, marginTop: 7 }}>
                    <button onClick={() => { setEditingId(c.id); setEditContent(c.content); }} style={{ fontSize: 11, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 700 }}>✏ Edit</button>
                    <button onClick={() => removeComment(c.id)} style={{ fontSize: 11, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 700 }}>🗑 Delete</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )})}
        <div style={{ marginTop: 14 }}>
          <textarea value={newComment} onChange={e => setNewComment(e.target.value)} className="inc-input"
            placeholder="Write your comment..." style={{ ...TS, minHeight: 72 }} />
          <button onClick={submitComment} disabled={addingComment || !newComment.trim()} className="inc-btn-primary"
            style={{ marginTop: 8, padding: '10px 22px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none', borderRadius: 8, color: '#fff', cursor: addingComment ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: 14 }}>
            {addingComment ? '⏳ Posting...' : '💬 Post Comment'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function Incidents() {
  useInjectStyle();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const loadTickets = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await fetchMyIncidents();
      setTickets(data);
      // Auto-update the selected ticket if it's open in detail panel
      setSelected(prev => {
        if (!prev) return prev;
        const updated = data.find(t => t.id === prev.id);
        return updated || prev;
      });
    }
    catch { if (!silent) setTickets([]); }
    finally { if (!silent) setLoading(false); }
  }, []);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  /* Auto-poll every 30 seconds so admin updates show dynamically */
  useEffect(() => {
    const interval = setInterval(() => loadTickets(true), 30000);
    return () => clearInterval(interval);
  }, [loadTickets]);

  const filterLabels = { ALL: 'All', OPEN: 'Open', IN_PROGRESS: 'In Progress', RESOLVED: 'Resolved', CLOSED: 'Closed', REJECTED: 'Rejected' };
  const filterColors = { OPEN: '#2563eb', IN_PROGRESS: '#d97706', RESOLVED: '#059669', CLOSED: '#4b5563', REJECTED: '#dc2626' };

  const filtered = tickets
    .filter(t => filter === 'ALL' || t.status === filter)
    .filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()) || (t.category || '').toLowerCase().includes(search.toLowerCase()) || (t.location || '').toLowerCase().includes(search.toLowerCase()));

  const stats = [
    { label: 'Total', val: tickets.length, color: '#2563eb', bg: '#eff6ff', icon: '📋' },
    { label: 'Open', val: tickets.filter(t => t.status === 'OPEN').length, color: '#2563eb', bg: '#dbeafe', icon: '🔓' },
    { label: 'In Progress', val: tickets.filter(t => t.status === 'IN_PROGRESS').length, color: '#d97706', bg: '#fffbeb', icon: '⚙️' },
    { label: 'Resolved', val: tickets.filter(t => t.status === 'RESOLVED').length, color: '#059669', bg: '#ecfdf5', icon: '✅' },
  ];

  return (
    <div className="inc-root" style={{ maxWidth: 920, margin: '0 auto', padding: '32px 16px', background: '#f9fafb', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ background: '#ffffff', borderRadius: 16, padding: '24px 28px', marginBottom: 24, border: '1.5px solid #e5e7eb', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.7rem', fontWeight: 900, color: '#111827' }}>🛠 My Incident Tickets</h2>
            <p style={{ marginTop: 6, fontSize: '0.95rem', fontWeight: 600, color: '#374151' }}>Report and track campus maintenance issues</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="inc-btn-primary"
            style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none', borderRadius: 10, padding: '11px 24px', color: '#fff', cursor: 'pointer', fontWeight: 800, fontSize: 14, boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }}>
            + New Ticket
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14, marginBottom: 24 }}>
        {stats.map(s => (
          <div key={s.label} className="inc-stat-card" style={{ background: s.bg, border: `1.5px solid ${s.color}33`, borderRadius: 12, padding: '18px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: 26, margin: 0 }}>{s.icon}</p>
            <p style={{ fontSize: 26, fontWeight: 900, color: s.color, margin: '4px 0 2px' }}>{s.val}</p>
            <p style={{ color: '#374151', fontSize: 12, margin: 0, fontWeight: 700 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* 🆕 Activity Feed */}
      {!loading && tickets.length > 0 && <ActivityFeed tickets={tickets} />}

      {/* Search + Filter */}
      <div style={{ background: '#ffffff', borderRadius: 12, padding: '16px 20px', marginBottom: 20, border: '1.5px solid #e5e7eb', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
        <input className="inc-input" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍  Search by title, category or location..."
          style={{ ...IS_BASE, marginBottom: 14 }} />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(filterLabels).map(([s, label]) => {
            const active = filter === s;
            const col = s === 'ALL' ? '#2563eb' : (filterColors[s] || '#2563eb');
            return (
              <button key={s} className="inc-tab-btn" onClick={() => setFilter(s)} style={{
                padding: '7px 16px', borderRadius: 999, border: active ? `2px solid ${col}` : '1.5px solid #d1d5db',
                background: active ? col : '#ffffff', color: active ? '#fff' : '#374151',
                cursor: 'pointer', fontSize: 12, fontWeight: 700,
              }}>
                {label} {s !== 'ALL' && `(${tickets.filter(t => t.status === s).length})`}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', color: '#374151', padding: 60, background: '#ffffff', borderRadius: 12, border: '1.5px solid #e5e7eb', fontWeight: 700, fontSize: 15 }}>
          ⏳ Loading tickets...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#ffffff', border: '1.5px dashed #d1d5db', borderRadius: 14 }}>
          <p style={{ fontSize: 48, margin: 0 }}>🔧</p>
          <p style={{ marginTop: 12, color: '#111827', fontWeight: 800, fontSize: 16 }}>
            {filter !== 'ALL' ? `No ${filterLabels[filter]} tickets` : search ? 'No tickets match your search' : 'No incident tickets yet!'}
          </p>
          <p style={{ color: '#374151', fontWeight: 600, fontSize: 13 }}>
            {filter === 'ALL' && !search ? 'Click "+ New Ticket" to report a campus issue.' : 'Try adjusting your filters.'}
          </p>
        </div>
      ) : (
        filtered.map(t => <TicketCard key={t.id} ticket={t} onSelect={setSelected} />)
      )}

      {showCreate && <CreateTicketModal onClose={() => setShowCreate(false)} onCreated={t => { setTickets(prev => [t, ...prev]); }} />}
      {selected && <TicketDetailPanel ticket={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
