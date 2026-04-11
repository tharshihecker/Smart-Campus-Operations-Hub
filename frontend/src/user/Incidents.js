import React, { useState, useEffect, useCallback } from 'react';
import { sanitizeMessage } from '../utils/ui';
import { useLocation, useNavigate } from 'react-router-dom';
import './Incidents.css';
import {
  fetchMyIncidents, createIncident, fetchIncidentComments,
  addIncidentComment, editIncidentComment, deleteIncidentComment,
  deleteIncident, saveAnnotation
} from '../api';
import AnnotationEditor from '../components/AnnotationEditor';
import AnnotationViewer from '../components/AnnotationViewer';

const TERMINAL_STATUSES = new Set(['CLOSED', 'REJECTED']);

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
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
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
  .inc-panel { animation: incSlideIn 0.25s cubic-bezier(0.16,1,0.3,1); }
  @keyframes incFadeIn { from { opacity:0; } to { opacity:1; } }
  @keyframes incSlideIn { from { transform: translateX(60px); opacity:0; } to { transform: translateX(0); opacity:1; } }
  .inc-comment-card { transition: background 0.15s, transform 0.15s; }
  .inc-comment-card:hover { background: #f0f4ff !important; transform: translateX(2px); }
  .inc-priority-pulse { animation: incPulse 1.8s infinite; }
  @keyframes incPulse { 0%,100%{box-shadow:0 0 0 0 rgba(220,38,38,0.35);} 50%{box-shadow:0 0 0 6px rgba(220,38,38,0);} }
  .inc-photo-thumb { cursor: pointer; transition: transform 0.18s, box-shadow 0.18s; border-radius: 10px; }
  .inc-photo-thumb:hover { transform: scale(1.08); box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
  .inc-escalate-btn { transition: all 0.18s; }
  .inc-escalate-btn:hover { transform: scale(1.05); box-shadow: 0 4px 16px rgba(220,38,38,0.3); }
  .inc-feed-item { animation: incFeedIn 0.4s; }
  @keyframes incFeedIn { from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);} }
  .inc-image-gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 12px; margin-top: 16px; }
  .inc-image-item { position: relative; width: 100%; padding-top: 100%; background: linear-gradient(135deg, #f0f4ff 0%, #e0e7ff 100%); border-radius: 12px; overflow: hidden; border: 2px solid #e0e7ff; }
  .inc-image-item img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; }
  .inc-detail-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
  .inc-detail-item { background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%); border-radius: 12px; padding: 14px; border: 1px solid #e5e7eb; }
  .inc-badge-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .inc-section-title { font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; color: #111827; margin: 0 0 14px; }
  .inc-history-toggle { display: flex; align-items: center; gap: 10px; background: none; border: none; cursor: pointer; padding: 0; margin-bottom: 16px; width: 100%; transition: all 0.2s; }
  .inc-history-toggle:hover { opacity: 0.8; }
  .inc-meta-label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.4px; color: #6b7280; margin-bottom: 4px; }
  .inc-meta-value { font-size: 13px; font-weight: 700; color: #111827; }
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
  const statusMap = {
    OPEN: 'status-open',
    IN_PROGRESS: 'status-in_progress',
    RESOLVED: 'status-resolved',
    CLOSED: 'status-closed',
    REJECTED: 'status-rejected'
  };
  const labels = { OPEN: 'Open', IN_PROGRESS: 'In Progress', RESOLVED: 'Resolved', CLOSED: 'Closed', REJECTED: 'Rejected' };
  return (
    <span className={`inc-badge ${statusMap[status] || 'status-open'}`}>
      {labels[status] || status}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const priorityMap = {
    LOW: 'priority-low',
    MEDIUM: 'priority-medium',
    HIGH: 'priority-high',
    CRITICAL: 'priority-critical'
  };
  const icons = { LOW: '▼', MEDIUM: '■', HIGH: '▲', CRITICAL: '🔥' };
  return (
    <span className={`inc-badge ${priorityMap[priority] || 'priority-medium'}`}>
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
function AttachmentsSection({ urls, attachments }) {
  const [open, setOpen] = useState(null);
  const [viewingAnnotations, setViewingAnnotations] = useState(null);
  
  if (!urls?.length) return null;
  
  return (
    <div style={{ marginTop: 16 }}>
      <p className="inc-section-title">
        <span className="inc-section-badge">📎 Evidence Photos ({urls.length})</span>
      </p>
      
      {/* Show annotation view if selected */}
      {viewingAnnotations !== null && attachments && attachments[viewingAnnotations] && (
        <div style={{ marginBottom: 16, background: '#f9fafb', border: '2px solid #e5e7eb', borderRadius: 12, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ color: '#111827', fontSize: 12, fontWeight: 900, margin: 0, textTransform: 'uppercase' }}>
              📌 Annotations on Photo {viewingAnnotations + 1}
            </p>
            <button
              onClick={() => setViewingAnnotations(null)}
              style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#dc2626' }}
            >
              ✕
            </button>
          </div>
          <AnnotationViewer
            imageUrl={urls[viewingAnnotations]}
            annotations={attachments[viewingAnnotations].annotationData}
          />
        </div>
      )}
      
      {/* Image gallery */}
      <div className="inc-image-gallery">
        {urls && urls.map((url, i) => {
          const attachment = attachments && attachments[i];
          const hasAnnotations = attachment && attachment.annotationData;
          return (
            <div key={i} style={{ position: 'relative' }}>
              <div className="inc-image-item" onClick={() => setOpen(url)}>
                <img src={url} alt={`photo-${i}`} onError={e => e.target.parentElement.style.display = 'none'} />
              </div>
              {hasAnnotations && (
                <div style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  background: '#dc2626',
                  color: '#fff',
                  borderRadius: '50%',
                  width: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
                }}>
                  📌
                  <span
                    style={{
                      position: 'absolute',
                      bottom: -4,
                      right: -4,
                      background: '#2563eb',
                      color: '#fff',
                      borderRadius: '50%',
                      width: 18,
                      height: 18,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      fontWeight: 800,
                      border: '2px solid #fff',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewingAnnotations(i);
                    }}
                  >
                    👁
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Photo modal */}
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
    <div style={{ margin: '14px 0', padding: '12px 14px', background: 'var(--bg-glass-hover)', borderRadius: 10, border: '1px solid var(--border-medium)' }}>
      <p style={{ color: 'var(--text-primary)', fontSize: 11, fontWeight: 800, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {isRejected ? '❌ Ticket Rejected' : '📋 Progress'}
      </p>
      {isRejected ? (
        <div style={{ background: '#ffffff', border: '2px solid #dc2626', borderRadius: 8, padding: '12px 14px' }}>
          <p style={{ color: '#991b1b', fontWeight: 700, fontSize: 13, margin: 0 }}>This ticket has been rejected by admin.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {steps.map((s, i) => {
            const done = i <= idx; const active = i === idx;
            return (
              <React.Fragment key={s}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: done ? 'var(--brand-teal)' : 'var(--bg-surface)', color: done ? '#fff' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, border: active ? '3px solid var(--brand-teal)' : 'none', boxShadow: active ? '0 0 0 3px rgba(37,99,235,0.25)' : 'none' }}>
                    {done ? '✓' : i + 1}
                  </div>
                  <span style={{ fontSize: 9, color: done ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: done ? 700 : 500, marginTop: 4, whiteSpace: 'nowrap' }}>{s.replace('_', ' ')}</span>
                </div>
                {i < steps.length - 1 && <div style={{ flex: 1, height: 3, background: i < idx ? 'var(--brand-teal)' : 'var(--bg-surface)', margin: '-12px 4px 0' }} />}
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
    .slice(0, 3);

  const iconMap = { OPEN: '🔓', IN_PROGRESS: '⚙️', RESOLVED: '✅', CLOSED: '🔒', REJECTED: '❌' };
  const colorMap = { OPEN: '#2563eb', IN_PROGRESS: '#d97706', RESOLVED: '#059669', CLOSED: '#4b5563', REJECTED: '#dc2626' };

  if (!events.length) return null;

  return (
    <div className="profile-card" style={{ marginBottom: 20, background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '16px 18px' }}>
      <p style={{ color: '#111827', fontWeight: 900, fontSize: 14, margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        📡 Recent Activity
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {events.map((e, i) => (
          <div key={e.id} className="inc-feed-item-wrapper">
            <div className="inc-feed-icon" style={{ background: `${colorMap[e.status]}18`, borderColor: `${colorMap[e.status]}40` }}>
              {iconMap[e.status]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="inc-feed-title">{e.title}</p>
              <div className="inc-feed-meta">
                <span className="inc-feed-status-badge" style={{ background: colorMap[e.status] }}>{e.status.replace('_', ' ')}</span>
                <span className="inc-feed-date">{fmtDate(e.date)}</span>
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
      // Immediately notify parent to refresh comments AND main ticket list
      onEscalated && onEscalated(true);
    } catch (err) {
      console.error('Escalation failed:', err);
    }
    finally { setLoading(false); }
  };

  return (
    <button onClick={escalate} disabled={loading} className="inc-escalate-btn" style={{
      display: 'flex', alignItems: 'center', gap: 7,
      padding: '8px 16px', background: loading ? '#fca5a5' : 'var(--brand-danger)',
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
  const borderCol = ticket.priority === 'CRITICAL' ? '#dc2626' : '#e5e7eb';
  const cardClass = ticket.priority === 'CRITICAL' ? 'inc-ticket-card critical' : 'inc-ticket-card';
  
  return (
    <div onClick={() => onSelect(ticket)} className={cardClass} style={{ borderColor: borderCol }}>
      <div className="inc-ticket-header">
        <div className="inc-ticket-id-title">
          <span className="inc-ticket-id">#{ticket.id}</span>
          <p className="inc-ticket-title">{ticket.title}</p>
          {ticket.attachmentUrls?.length > 0 && (
            <span className="inc-ticket-attachments" style={{ marginTop: 6, display: 'block' }}>
              📎 {ticket.attachmentUrls.length} photo{ticket.attachmentUrls.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="inc-ticket-badges">
          <PriorityBadge priority={ticket.priority} />
          <StatusBadge status={ticket.status} />
        </div>
      </div>
      <p className="inc-ticket-category">
        📁 {ticket.category}
      </p>
      <p className="inc-ticket-location">
        📍 {ticket.location}
      </p>
      <div className="inc-ticket-meta">
        <p className="inc-ticket-assignee">
          {ticket.assigneeName ? `👷 ${ticket.assigneeName}` : '👤 Unassigned'}
        </p>
        <p className="inc-ticket-time">🕐 {fmtDate(ticket.createdAt)}</p>
      </div>
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
  const [annotatingIndex, setAnnotatingIndex] = useState(null); // Which image is being annotated
  const [annotations, setAnnotations] = useState({}); // { [index]: annotationData }

  const handle = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleFiles = e => {
    const chosen = Array.from(e.target.files).slice(0, 3);
    setFiles(chosen);
    setPreviews(chosen.map(f => URL.createObjectURL(f)));
    setAnnotations({}); // Reset annotations when new files selected
  };

  const submit = async e => {
    e.preventDefault();
    if (!form.title || !form.description || !form.location) { setError('Title, description, and location are required'); return; }
    setLoading(true); setError('');
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    files.forEach(f => fd.append('files', f));
    try { 
      const ticket = await createIncident(fd); 
      
      // INNOVATION: Save annotations for each attachment
      if (ticket.id && ticket.attachments && Object.keys(annotations).length > 0) {
        for (let i = 0; i < ticket.attachments.length; i++) {
          if (annotations[i]) {
            const attachmentId = ticket.attachments[i].id;
            try {
              await saveAnnotation(attachmentId, annotations[i]);
            } catch (err) {
              console.error(`Failed to save annotation for attachment ${i}:`, err);
            }
          }
        }
      }
      
      onCreated(ticket); 
      onClose(); 
    }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const LB = ({ children }) => <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 11, fontWeight: 800, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 }}>{children}</label>;

  return (
    <div className="fac-modal-overlay" onClick={onClose} style={{ padding: 16 }}>
      <div className="fac-modal-card" style={{ maxWidth: 560, maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="fac-modal-header" style={{ marginBottom: 24 }}>
          <div className="fac-modal-icon">🛠</div>
          <div>
            <h2 className="fac-modal-title">Report New Incident</h2>
            <p className="fac-modal-subtitle">Fill in details to submit a maintenance request</p>
          </div>
          <button className="fac-modal-close" onClick={onClose}>✕</button>
        </div>
        {error && <div className="profile-alert compact error">{error}</div>}
        <form onSubmit={submit}>
          <div style={{ display: 'grid', gap: 14 }}>
            <div><LB>Title *</LB><input className="inc-input" style={IS_BASE} placeholder="Brief incident title" value={form.title} onChange={handle('title')} /></div>
            <div><LB>Description *</LB><textarea className="inc-input" style={{ ...IS_BASE, minHeight: 90, resize: 'vertical' }} placeholder="Describe the issue in detail..." value={form.description} onChange={handle('description')} /></div>
            <div><LB>Location *</LB><input className="inc-input" style={IS_BASE} placeholder="e.g. Block A, Room 201" value={form.location} onChange={handle('location')} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <LB>Category</LB>
                <select className="inc-input" style={{ ...IS_BASE, backgroundColor: '#ffffff' }} value={form.category} onChange={handle('category')}>
                  {CATEGORIES.map(c => <option key={c} style={{ background: '#ffffff', color: '#111827' }}>{c}</option>)}
                </select>
              </div>
              <div>
                <LB>Priority</LB>
                <select className="inc-input" style={{ ...IS_BASE, backgroundColor: '#ffffff' }} value={form.priority} onChange={handle('priority')}>
                  {PRIORITIES.map(p => <option key={p} style={{ background: '#ffffff', color: '#111827' }}>{p}</option>)}
                </select>
              </div>
            </div>
            <div><LB>Contact (optional)</LB><input className="inc-input" style={IS_BASE} placeholder="Email or phone" value={form.contactDetails} onChange={handle('contactDetails')} /></div>
            <div>
              <LB>Evidence Photos (max 3)</LB>
              <input type="file" accept="image/*" multiple onChange={handleFiles} style={{ ...IS_BASE, padding: '8px 14px', cursor: 'pointer' }} />
              {previews.length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  {previews.map((p, i) => (
                    <div key={i} style={{ position: 'relative' }}>
                      <img src={p} alt="preview" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, border: '2px solid var(--border-medium)' }} />
                      {annotations[i] && (
                        <span style={{ position: 'absolute', top: -8, right: -8, background: '#10b981', color: '#fff', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>
                          ✓
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setAnnotatingIndex(i)}
                        style={{ position: 'absolute', bottom: 0, right: 0, background: '#2563eb', color: '#fff', border: 'none', borderRadius: '0 6px', padding: '2px 6px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                      >
                        🖍️
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="profile-form-actions" style={{ marginTop: 24 }}>
            <button type="submit" disabled={loading} className="btn-profile primary" style={{ flex: 2, justifyContent: 'center' }}>
              {loading ? '⏳ Submitting...' : '🚀 Submit Incident'}
            </button>
            <button type="button" onClick={onClose} className="btn-profile secondary" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
          </div>
        </form>

        {/* INNOVATION: Annotation Editor Modal */}
        {annotatingIndex !== null && (
          <div style={{
            background: '#ffffff',
            border: '2px solid #e5e7eb',
            borderRadius: 12,
            padding: 16,
            marginTop: 20,
            borderTop: '3px solid #2563eb',
          }}>
            <h3 style={{ color: '#111827', fontWeight: 900, fontSize: 14, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              🎯 Annotate Image {annotatingIndex + 1}
            </h3>
            <AnnotationEditor
              imageUrl={previews[annotatingIndex]}
              existingAnnotations={annotations[annotatingIndex]}
              onSave={(annotationData) => {
                setAnnotations(a => ({ ...a, [annotatingIndex]: annotationData }));
                setAnnotatingIndex(null);
              }}
              onCancel={() => setAnnotatingIndex(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Ticket Detail Panel ─── */
function TicketDetailPanel({ ticket, onClose, onTicketUpdated }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const [photoModal, setPhotoModal] = useState(null);
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
      <div className="inc-panel" style={{ background: 'var(--bg-card)', width: '100%', maxWidth: 520, height: '100vh', overflowY: 'auto', padding: '28px 24px', borderLeft: '2px solid #2563eb', boxShadow: '-8px 0 32px rgba(0,0,0,0.2)' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, paddingBottom: 16, borderBottom: '2px solid var(--border-subtle)' }}>
          <div>
            <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>Ticket Details</span>
            <h3 style={{ color: 'var(--text-primary)', margin: '6px 0 0', fontWeight: 900, fontSize: 22 }}>#{ticket.id}</h3>
          </div>
          <button onClick={onClose} style={{ background: 'var(--bg-surface)', border: 'none', borderRadius: 10, padding: '8px 12px', fontSize: 22, cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: 700, transition: 'all 0.2s', hover: 'background-color var(--bg-card-hover)' }}>✕</button>
        </div>

        {/* Title */}
        <p style={{ fontWeight: 900, fontSize: 18, color: 'var(--text-primary)', marginBottom: 12, lineHeight: 1.4, maxWidth: '100%', wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal' }}>{ticket.title}</p>
        
        {/* Badges */}
        <div className="inc-badge-row" style={{ marginBottom: 18 }}>
          <PriorityBadge priority={ticket.priority} />
          <StatusBadge status={ticket.status} />
          <EscalateButton ticket={ticket} onEscalated={(wasEscalated) => { 
            if (wasEscalated) { 
              loadComments();
              onTicketUpdated && onTicketUpdated();
            }
          }} />
        </div>

        {/* Status Timeline */}
        <StatusTimeline status={ticket.status} />

        {/* Description */}
        <div className="inc-light-surface" style={{ background: 'linear-gradient(135deg, rgba(255,237,213,0.8) 0%, rgba(254,215,170,0.8) 100%)', borderRadius: 14, padding: '16px 18px', marginBottom: 18, border: '2px solid #fb923c' }}>
          <p style={{ color: '#92400e', fontSize: 11, fontWeight: 900, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 0.4 }}>📝 Description</p>
          <p style={{ color: '#7c2d12', fontSize: 13, margin: 0, fontWeight: 700, lineHeight: 1.8, maxWidth: '100%', wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal' }}>{ticket.description}</p>
        </div>

        {/* Meta grid */}
        <p className="inc-section-title">
          <span className="inc-section-badge">ℹ️ Ticket Information</span>
        </p>
        <div className="inc-detail-grid" style={{ marginBottom: 18 }}>
          {[
            { icon: '📍', label: 'Location', val: ticket.location },
            { icon: '🏷', label: 'Category', val: ticket.category },
            { icon: '👷', label: 'Assignee', val: ticket.assigneeName || 'Unassigned' },
            { icon: '📞', label: 'Contact', val: ticket.contactDetails || 'N/A' },
            { icon: '📅', label: 'Created', val: fmtDate(ticket.createdAt) },
            { icon: '🔄', label: 'Updated', val: ticket.updatedAt ? fmtDate(ticket.updatedAt) : fmtDate(ticket.createdAt) },
          ].map(m => (
            <div key={m.label} className="inc-detail-item inc-light-surface" style={{ display: 'flex', flexDirection: 'column' }}>
              <p className="inc-meta-label">{m.icon} {m.label}</p>
              <p className="inc-meta-value">{m.val}</p>
            </div>
          ))}
        </div>

        {/* Resolutions */}
        {ticket.resolutionNotes && (
          <div className="inc-light-surface" style={{ background: '#ffffff', border: '2px solid #10b981', borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
            <p style={{ color: '#059669', fontSize: 11, fontWeight: 900, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>✅ Resolution Notes</p>
            <p style={{ color: '#059669', fontSize: 13, margin: 0, fontWeight: 600, lineHeight: 1.6 }}>{ticket.resolutionNotes}</p>
          </div>
        )}
        {ticket.rejectionReason && (
          <div className="inc-light-surface" style={{ background: '#ffffff', border: '2px solid #dc2626', borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
            <p style={{ color: '#dc2626', fontSize: 11, fontWeight: 900, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>❌ Rejection Reason</p>
            <p style={{ color: '#991b1b', fontSize: 13, margin: 0, fontWeight: 600, lineHeight: 1.6 }}>{ticket.rejectionReason}</p>
          </div>
        )}

        {/* Attachments */}
        <AttachmentsSection urls={ticket.attachmentUrls} attachments={ticket.attachments} />

        <hr style={{ borderColor: 'var(--border-subtle)', margin: '20px 0', borderStyle: 'dashed' }} />

        {/* Comments */}
        <p className="inc-section-title">
          <span className="inc-section-badge">💬 Comments ({comments.length})</span>
        </p>
        {comments.length === 0 && (
          <div style={{ background: 'var(--bg-surface)', border: '2px dashed var(--border-medium)', borderRadius: 12, padding: 18, textAlign: 'center', marginBottom: 16 }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0, fontWeight: 600 }}>No comments yet. Be the first to comment!</p>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16, maxHeight: '300px', overflowY: 'auto' }}>
          {[...comments].sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt)).map(c => {
            const isEscalation = c.content && c.content.includes('ESCALATION REQUEST');
            return (
            <div key={c.id} className={`inc-comment-card inc-light-surface${isEscalation ? ' inc-comment-card--escalation' : ''}`} style={{ borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
                <span style={{ color: isEscalation ? '#991b1b' : '#2563eb', fontSize: 12, fontWeight: 800 }}>👤 {c.authorName}</span>
                <span style={{ color: '#6b7280', fontSize: 10, fontWeight: 600 }}>{fmtDateTime(c.createdAt)}</span>
              </div>
              {editingId === c.id ? (
                <div>
                  <textarea value={editContent} onChange={e => setEditContent(e.target.value)} className="inc-input" style={{ ...TS, minHeight: 60, fontSize: 12 }} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button onClick={() => saveEdit(c.id)} style={{ flex: 1, padding: '6px 12px', background: 'var(--brand-teal)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 700, transition: 'all 0.2s' }}>Save</button>
                    <button onClick={() => setEditingId(null)} style={{ flex: 1, padding: '6px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', borderRadius: 8, color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className={`inc-comment-text${isEscalation ? ' inc-comment-text--escalation' : ''}`} style={{ fontSize: 12, margin: 0, lineHeight: 1.5 }}>{c.content}</p>
                  {c.authorId === currentUserId && !TERMINAL_STATUSES.has(ticket.status) && (
                    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                      <button onClick={() => { setEditingId(c.id); setEditContent(c.content); }} style={{ fontSize: 11, color: 'var(--brand-teal)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 700, transition: 'all 0.2s', textDecoration: 'underline' }}>✏ Edit</button>
                      <button onClick={() => removeComment(c.id)} style={{ fontSize: 11, color: 'var(--brand-danger)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 700, transition: 'all 0.2s', textDecoration: 'underline' }}>🗑 Delete</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )})}
        </div>

        {/* Add comment */}
        {TERMINAL_STATUSES.has(ticket.status) ? (
          <div style={{ marginTop: 12, background: 'var(--bg-surface)', border: '2px dashed var(--border-medium)', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>🔒</span>
            <p style={{ margin: 0, fontWeight: 800, color: 'var(--text-secondary)', fontSize: 12 }}>
              Ticket is {ticket.status.toLowerCase()} — commenting disabled
            </p>
          </div>
        ) : (
          <div style={{ marginTop: 12 }}>
            <textarea value={newComment} onChange={e => setNewComment(e.target.value)} className="inc-input"
              placeholder="Write your comment..." style={{ ...TS, minHeight: 80, fontSize: 12 }} />
            <button onClick={submitComment} disabled={addingComment || !newComment.trim()} style={{ marginTop: 10, width: '100%', padding: '12px 16px', background: addingComment ? '#bfdbfe' : 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none', borderRadius: 10, color: '#fff', cursor: addingComment ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: 13, transition: 'all 0.2s' }}>
              {addingComment ? '⏳ Posting...' : '💬 Post Comment'}
            </button>
          </div>
        )}
      </div>
      {photoModal && <PhotoModal url={photoModal} onClose={() => setPhotoModal(null)} />}
    </div>
  );
}

/* ─── Delete Confirmation Modal ─── */
function DeleteConfirmModal({ ticket, onConfirm, onCancel, loading }) {
  return (
    <div className="inc-lightbox" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 18, padding: '32px 28px', maxWidth: 420, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.35)', border: '1.5px solid var(--border-medium)' }}>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🗑️</div>
          <h3 style={{ color: 'var(--text-primary)', fontWeight: 900, fontSize: 18, margin: '0 0 8px' }}>Delete Incident?</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, margin: 0, lineHeight: 1.6 }}>
            Are you sure you want to delete ticket <strong style={{ color: 'var(--text-primary)' }}>#{ticket.id}</strong> &mdash; <em>"{ticket.title}"</em>?
          </p>
          <p style={{ color: 'var(--brand-danger)', fontSize: 12, fontWeight: 700, margin: '6px 0 0' }}>⚠️ This action cannot be undone.</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onCancel} disabled={loading}
            style={{ flex: 1, padding: '11px 0', background: 'var(--bg-surface)', border: '1.5px solid var(--border-medium)', borderRadius: 10, color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            style={{ flex: 2, padding: '11px 0', background: loading ? '#fca5a5' : '#dc2626', border: 'none', borderRadius: 10, color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: 14 }}>
            {loading ? '⏳ Deleting...' : '🗑 Yes, Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Ticket Row Component ─── */
function TicketRow({ t, onView, onDelete }) {
  const canDelete = t.status === 'OPEN';
  return (
    <tr className="inc-ticket-row" onClick={() => onView(t)} style={{ cursor: 'pointer' }}>
      <td className="inc-table-cell inc-cell-id" style={{ wordBreak: 'break-word', maxWidth: '60px' }}>#{t.id}</td>
      <td className="inc-table-cell inc-cell-title" title={t.title} style={{ wordBreak: 'break-word', maxWidth: '220px', overflowWrap: 'break-word', whiteSpace: 'normal' }}>{t.title}{t.attachmentUrls?.length > 0 && <div style={{ fontSize: '12px', color: '#059669', fontWeight: 600, marginTop: 4 }}>📎 {t.attachmentUrls.length}</div>}</td>
      <td className="inc-table-cell inc-cell-category" style={{ wordBreak: 'break-word', maxWidth: '130px', overflowWrap: 'break-word', whiteSpace: 'normal' }}>{t.category}</td>
      <td className="inc-table-cell inc-cell-location" title={t.location} style={{ wordBreak: 'break-word', maxWidth: '120px', overflowWrap: 'break-word', whiteSpace: 'normal' }}>{t.location}</td>
      <td className="inc-table-cell inc-cell-priority" style={{ wordBreak: 'break-word', maxWidth: '100px' }}>
        <PriorityBadge priority={t.priority} />
      </td>
      <td className="inc-table-cell inc-cell-status" style={{ wordBreak: 'break-word', maxWidth: '110px' }}>
        <StatusBadge status={t.status} />
      </td>
      <td className="inc-table-cell inc-cell-assignee" style={{ wordBreak: 'break-word', maxWidth: '130px', overflowWrap: 'break-word', whiteSpace: 'normal' }}>{t.assigneeName || 'Unassigned'}</td>
      <td className="inc-table-cell inc-cell-date" style={{ wordBreak: 'break-word', maxWidth: '150px', overflowWrap: 'break-word', whiteSpace: 'normal' }}>{fmtDate(t.createdAt)}</td>
      <td className="inc-table-cell inc-cell-actions" style={{ wordBreak: 'break-word', maxWidth: '160px', display: 'flex', gap: 6, flexDirection: 'column' }}>
        <button onClick={(e) => { e.stopPropagation(); onView(t); }} className="inc-action-btn">
          👁 View
        </button>
       <button
  onClick={(e) => {
    e.stopPropagation();
    onDelete(t);
  }}
  className="inc-action-btn"
  disabled={!canDelete}
  title={canDelete ? 'Delete this ticket' : 'Cannot delete - ticket is not OPEN'}
  style={{
    background: canDelete ? '#dc2626' : '#7f1d1d', // dark red when disabled
    color: canDelete ? '#ffffff' : '#fecaca',     // soft red text
    cursor: canDelete ? 'pointer' : 'not-allowed',
    opacity: canDelete ? 1 : 0.85,
    fontSize: '12px',
    border: `1px solid ${canDelete ? '#dc2626' : '#991b1b'}`
  }}
>
  {canDelete ? '🗑 Delete' : '🔒 Can\'t Delete'}
</button>
      </td>
    </tr>
  );
}

/* ─── Tickets Table Component ─── */
function TicketsTable({ displayed, onView, onDelete, emptyMsg }) {
  if (displayed.length === 0) {
    return (
      <div className="inc-empty-state">
        <p className="inc-empty-state-icon">📭</p>
        <p className="inc-empty-state-text">{emptyMsg}</p>
      </div>
    );
  }
  return (
    <div className="inc-tickets-table-wrapper">
      <div style={{ overflowX: 'auto' }}>
        <table className="inc-tickets-table">
          <thead>
            <tr>
              <th style={{ width: '60px', maxWidth: '60px' }}>#</th>
              <th style={{ maxWidth: '220px' }}>Title</th>
              <th style={{ width: '130px', maxWidth: '130px' }}>Category</th>
              <th style={{ width: '120px', maxWidth: '120px' }}>Location</th>
              <th style={{ width: '100px', maxWidth: '100px' }}>Priority</th>
              <th style={{ width: '110px', maxWidth: '110px' }}>Status</th>
              <th style={{ width: '130px', maxWidth: '130px' }}>Assignee</th>
              <th style={{ width: '150px', maxWidth: '150px' }}>Created</th>
              <th style={{ width: '160px', maxWidth: '160px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map(t => (
              <TicketRow key={t.id} t={t} onView={onView} onDelete={onDelete} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function Incidents() {
  useInjectStyle();
  const location = useLocation();
  const navigate = useNavigate();

  /* Strip ?ticketId= from URL so the deep-link doesn't re-open on next poll */
  const clearTicketParam = useCallback(() => {
    const params = new URLSearchParams(location.search);
    if (params.has('ticketId')) navigate('/incidents', { replace: true });
  }, [location.search, navigate]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [now, setNow] = useState(new Date());
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

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
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  /* Deep-link: auto-open ticket from notification (?ticketId=123)
     Runs ONLY when tickets state is populated — no extra API call. */
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tid = params.get('ticketId');
    if (!tid || tickets.length === 0) return;
    const found = tickets.find(t => String(t.id) === String(tid));
    if (found && (!selected || String(selected.id) !== String(tid))) {
      setSelected(found);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickets, location.search]);

  /* Auto-poll every 15 seconds so admin updates show dynamically */
  useEffect(() => {
    const interval = setInterval(() => loadTickets(true), 15000);
    return () => clearInterval(interval);
  }, [loadTickets]);

  const filterLabels = { ALL: 'All', OPEN: 'Open', IN_PROGRESS: 'In Progress', RESOLVED: 'Resolved', CLOSED: 'Closed', REJECTED: 'Rejected' };
  const filterColors = { OPEN: '#2563eb', IN_PROGRESS: '#d97706', RESOLVED: '#059669', CLOSED: '#4b5563', REJECTED: '#dc2626' };

  const filtered = tickets
    .filter(t => filter === 'ALL' || t.status === filter)
    .filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()) || (t.category || '').toLowerCase().includes(search.toLowerCase()) || (t.location || '').toLowerCase().includes(search.toLowerCase()));

  const activeTickets = filtered.filter(t => !TERMINAL_STATUSES.has(t.status));
  const historyTickets = filtered.filter(t => TERMINAL_STATUSES.has(t.status));

  const stats = [
    { label: 'Total', val: tickets.length, color: '#2563eb', bg: '#eff6ff', icon: '📋' },
    { label: 'Open', val: tickets.filter(t => t.status === 'OPEN').length, color: '#2563eb', bg: '#dbeafe', icon: '🔓' },
    { label: 'In Progress', val: tickets.filter(t => t.status === 'IN_PROGRESS').length, color: '#d97706', bg: '#fffbeb', icon: '⚙️' },
    { label: 'Resolved', val: tickets.filter(t => t.status === 'RESOLVED').length, color: '#059669', bg: '#ecfdf5', icon: '✅' },
  ];

  return (
    <section className="profile-shell">

      {/* Header */}
      <div className="profile-header">
        <div className="profile-header-content">
          <div className="profile-avatar" style={{ flexShrink: 0 }}>
            <div className="avatar-inner" style={{ background: 'var(--bg-glass)' }}>🛠</div>
          </div>
          <div className="profile-header-info">
            <h2>My Incident Tickets</h2>
            <p className="profile-subtitle">Report and track campus maintenance issues</p>
          </div>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center', position: 'relative', zIndex: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {/* Live indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'var(--bg-card)', border: '1px solid var(--brand-accent)', borderRadius: 'var(--radius-md)' }}>
            <div className="inc-priority-pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand-accent)' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand-accent)' }}>{now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>
          <button type="button" onClick={() => setShowCreate(true)} className="btn-profile primary">
            + New Ticket
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="inc-stats-grid">
        {stats.map(s => (
          <div key={s.label} className={`inc-stat-card ${s.label.toLowerCase().replace(' ', '-')}`}>
            <div className="inc-stat-icon">{s.icon}</div>
            <p className="inc-stat-num">{s.val}</p>
            <p className="inc-stat-label">{s.label}</p>
          </div>
        ))}
      </div>

      {/* 🆕 Activity Feed */}
      {!loading && tickets.length > 0 && <ActivityFeed tickets={tickets} />}

      {/* Search + Filter */}
      <div className="profile-card" style={{ marginBottom: 24, padding: '24px' }}>
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
        <div className="profile-card" style={{ textAlign: 'center', padding: 60 }}>
          <p className="title">⏳ Loading tickets...</p>
        </div>
      ) : activeTickets.length === 0 && historyTickets.length === 0 ? (
        <div className="profile-card" style={{ textAlign: 'center', padding: 60, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p style={{ fontSize: 48, margin: 0 }}>🔧</p>
          <h3 style={{ marginTop: 12, color: 'var(--text-primary)', fontWeight: 800, fontSize: '1.1rem' }}>
            {filter !== 'ALL' ? `No ${filterLabels[filter]} tickets` : search ? 'No tickets match your search' : 'No incident tickets yet!'}
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.95rem', margin: '4px 0 0' }}>
            {filter === 'ALL' && !search ? 'Click "+ New Ticket" to report a campus issue.' : 'Try adjusting your filters.'}
          </p>
        </div>
      ) : (
        <>
          {/* Active Tickets Section */}
          {activeTickets.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div className="inc-section-header-row">
                <span className="inc-section-badge">📂 Active Tickets</span>
                <span className="inc-section-count">{activeTickets.length}</span>
                <div className="inc-section-divider" />
              </div>
              <TicketsTable displayed={activeTickets} onView={(t) => { clearTicketParam(); setSelected(t); }} onDelete={(t) => setDeleteTarget(t)} emptyMsg="No active tickets" />
            </div>
          )}

          {/* History Section */}
          {historyTickets.length > 0 && (
            <div style={{ marginTop: 28 }}>
              <div className="inc-section-header-row" style={{ marginBottom: 14 }}>
                <span className="inc-section-badge" style={{ background: '#4b5563', cursor: 'pointer' }} onClick={() => setHistoryOpen(h => !h)}>
                  {historyOpen ? '▼' : '▶'} 📜 Closed &amp; Rejected
                </span>
                <span className="inc-section-count" style={{ background: '#4b5563' }}>{historyTickets.length}</span>
                <div className="inc-section-divider" style={{ background: 'linear-gradient(90deg, transparent, #4b5563, transparent)' }} />
              </div>

              {historyOpen && (
                <>
                  <div style={{ background: '#ffffff', border: '1.5px dashed #d1d5db', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>🔒</span>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#4b5563' }}>
                      These tickets are finalized. You can view details but no further actions are available.
                    </p>
                  </div>
                  <TicketsTable displayed={historyTickets} onView={(t) => { clearTicketParam(); setSelected(t); }} onDelete={(t) => setDeleteTarget(t)} emptyMsg="No closed or rejected tickets" />
                </>
              )}
            </div>
          )}
        </>
      )}

      {showCreate && <CreateTicketModal onClose={() => setShowCreate(false)} onCreated={t => { 
        setTickets(prev => [t, ...prev]);
        // Silently refresh in background to sync any server-side computed fields (timestamps, etc)
        setTimeout(() => loadTickets(true), 500);
      }} />}
      {selected && <TicketDetailPanel 
        ticket={selected} 
        onClose={() => { setSelected(null); clearTicketParam(); }}
        onTicketUpdated={() => { loadTickets(true); }}
      />}

      {deleteTarget && (
        <DeleteConfirmModal
          ticket={deleteTarget}
          loading={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            setDeleting(true);
            try {
              await deleteIncident(deleteTarget.id);
              setTickets(prev => prev.filter(t => t.id !== deleteTarget.id));
              if (selected && selected.id === deleteTarget.id) { setSelected(null); clearTicketParam(); }
              setDeleteTarget(null);
            } catch (err) {
              setError && setError(sanitizeMessage ? sanitizeMessage(err.message || 'Failed to delete') : ('Failed to delete: ' + (err.message || 'Server error')));
            } finally {
              setDeleting(false);
            }
          }}
        />
      )}
    </section>
  );
}
