import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchMyIncidents, createIncident, fetchIncidentComments,
  addIncidentComment, editIncidentComment, deleteIncidentComment
} from '../api';

const CATEGORIES = ['AV Equipment', 'HVAC', 'Infrastructure', 'IT/Network', 'Electrical', 'Plumbing', 'Safety', 'Cleaning', 'Other'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

function StatusBadge({ status }) {
  const colors = {
    OPEN: '#3b82f6', IN_PROGRESS: '#f59e0b', RESOLVED: '#10b981',
    CLOSED: '#6b7280', REJECTED: '#ef4444'
  };
  return (
    <span style={{
      background: colors[status] || '#6b7280', color: '#fff',
      padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600
    }}>{status.replace('_', ' ')}</span>
  );
}

function PriorityBadge({ priority }) {
  const colors = { LOW: '#6b7280', MEDIUM: '#3b82f6', HIGH: '#f59e0b', CRITICAL: '#ef4444' };
  return (
    <span style={{
      background: colors[priority] || '#6b7280', color: '#fff',
      padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700
    }}>{priority}</span>
  );
}

function TicketCard({ ticket, onSelect }) {
  return (
    <div onClick={() => onSelect(ticket)} style={{
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 12, padding: '18px 20px', cursor: 'pointer',
      transition: 'all 0.2s', marginBottom: 12
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(139,92,246,0.5)'}
    onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <p style={{ fontWeight: 700, marginBottom: 4, color: '#e2e8f0' }}>{ticket.title}</p>
          <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>{ticket.category} • {ticket.location}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <PriorityBadge priority={ticket.priority} />
          <StatusBadge status={ticket.status} />
        </div>
      </div>
      <p style={{ fontSize: 12, color: '#64748b' }}>
        {ticket.assigneeName ? `Assigned to: ${ticket.assigneeName}` : 'Unassigned'} •{' '}
        {new Date(ticket.createdAt).toLocaleDateString()}
      </p>
    </div>
  );
}

function CreateTicketModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '', description: '', category: 'AV Equipment', priority: 'MEDIUM',
    location: '', contactDetails: ''
  });
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handle = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    if (!form.title || !form.description || !form.location) {
      setError('Title, description, and location are required'); return;
    }
    setLoading(true); setError('');
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    files.slice(0, 3).forEach(f => fd.append('files', f));
    try {
      const ticket = await createIncident(fd);
      onCreated(ticket);
      onClose();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const inputStyle = {
    width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8, padding: '10px 14px', color: '#e2e8f0', fontSize: 14, boxSizing: 'border-box'
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: '#1e2437', borderRadius: 16, padding: 32, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)' }}>
        <h2 style={{ color: '#8b5cf6', marginBottom: 24 }}>Report New Incident</h2>
        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 8, padding: 10, marginBottom: 16, color: '#fca5a5', fontSize: 13 }}>{error}</div>}
        <form onSubmit={submit}>
          <div style={{ display: 'grid', gap: 14 }}>
            <input style={inputStyle} placeholder="Title *" value={form.title} onChange={handle('title')} />
            <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} placeholder="Description *" value={form.description} onChange={handle('description')} />
            <input style={inputStyle} placeholder="Location *" value={form.location} onChange={handle('location')} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <select style={inputStyle} value={form.category} onChange={handle('category')}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <select style={inputStyle} value={form.priority} onChange={handle('priority')}>
                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <input style={inputStyle} placeholder="Contact details (email/phone)" value={form.contactDetails} onChange={handle('contactDetails')} />
            <div>
              <label style={{ display: 'block', marginBottom: 6, color: '#94a3b8', fontSize: 13 }}>
                Evidence Images (max 3)
              </label>
              <input type="file" accept="image/*" multiple onChange={e => setFiles(Array.from(e.target.files).slice(0, 3))}
                style={{ ...inputStyle, padding: '8px 14px', cursor: 'pointer' }} />
              {files.length > 0 && <p style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>{files.length} file(s) selected</p>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: '10px 0', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#94a3b8', cursor: 'pointer', fontWeight: 600 }}>
              Cancel
            </button>
            <button type="submit" disabled={loading}
              style={{ flex: 2, padding: '10px 0', background: loading ? '#4c1d95' : 'linear-gradient(135deg, #7c3aed, #4f46e5)', border: 'none', borderRadius: 8, color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14 }}>
              {loading ? 'Submitting...' : 'Submit Incident'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TicketDetailPanel({ ticket, onClose, onUpdate }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const currentUserId = localStorage.getItem('smartcampus_user_id');

  const loadComments = useCallback(async () => {
    try { setComments(await fetchIncidentComments(ticket.id)); } catch {}
  }, [ticket.id]);

  useEffect(() => { loadComments(); }, [loadComments]);

  const submitComment = async () => {
    if (!newComment.trim()) return;
    setAddingComment(true);
    try {
      await addIncidentComment(ticket.id, newComment);
      setNewComment('');
      loadComments();
    } catch {}
    finally { setAddingComment(false); }
  };

  const saveEdit = async (id) => {
    try { await editIncidentComment(id, editContent); setEditingId(null); loadComments(); } catch {}
  };

  const removeComment = async (id) => {
    if (!window.confirm('Delete this comment?')) return;
    try { await deleteIncidentComment(id); loadComments(); } catch {}
  };

  const inputStyle = {
    width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8, padding: '10px 14px', color: '#e2e8f0', fontSize: 14, boxSizing: 'border-box', resize: 'vertical'
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', zIndex: 999, padding: 0 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: '#1a1f2e', width: '100%', maxWidth: 500, height: '100vh', overflowY: 'auto', padding: 28, borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ color: '#e2e8f0', margin: 0 }}>Ticket #{ticket.id}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 22, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ marginBottom: 20 }}>
          <p style={{ fontWeight: 700, fontSize: 18, color: '#e2e8f0', marginBottom: 8 }}>{ticket.title}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            <PriorityBadge priority={ticket.priority} />
            <StatusBadge status={ticket.status} />
          </div>
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 14, marginBottom: 12 }}>
            <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>{ticket.description}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13, color: '#64748b' }}>
            <span>📍 {ticket.location}</span>
            <span>🏷 {ticket.category}</span>
            {ticket.assigneeName && <span>👷 {ticket.assigneeName}</span>}
            {ticket.contactDetails && <span>📞 {ticket.contactDetails}</span>}
          </div>
          {ticket.resolutionNotes && (
            <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, padding: 10, marginTop: 10 }}>
              <p style={{ color: '#10b981', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>RESOLUTION NOTES</p>
              <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>{ticket.resolutionNotes}</p>
            </div>
          )}
          {ticket.rejectionReason && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: 10, marginTop: 10 }}>
              <p style={{ color: '#ef4444', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>REJECTION REASON</p>
              <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>{ticket.rejectionReason}</p>
            </div>
          )}
          {ticket.attachmentUrls?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <p style={{ color: '#64748b', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>ATTACHMENTS</p>
              <div style={{ display: 'flex', gap: 8 }}>
                {ticket.attachmentUrls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt={`attachment-${i+1}`}
                      style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }}
                      onError={e => e.target.style.display='none'} />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <hr style={{ borderColor: 'rgba(255,255,255,0.08)', marginBottom: 20 }} />

        <div>
          <p style={{ fontWeight: 700, color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>COMMENTS ({comments.length})</p>
          {comments.map(c => (
            <div key={c.id} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 12, marginBottom: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#8b5cf6', fontSize: 13, fontWeight: 600 }}>{c.authorName}</span>
                <span style={{ color: '#64748b', fontSize: 11 }}>{new Date(c.createdAt).toLocaleString()}</span>
              </div>
              {editingId === c.id ? (
                <div>
                  <textarea value={editContent} onChange={e => setEditContent(e.target.value)} style={{ ...inputStyle, minHeight: 60 }} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <button onClick={() => saveEdit(c.id)} style={{ padding: '4px 12px', background: '#7c3aed', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 12 }}>Save</button>
                    <button onClick={() => setEditingId(null)} style={{ padding: '4px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#94a3b8', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div>
                  <p style={{ color: '#d1d5db', fontSize: 13, margin: 0 }}>{c.content}</p>
                  {c.authorId === currentUserId && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      <button onClick={() => { setEditingId(c.id); setEditContent(c.content); }}
                        style={{ fontSize: 11, color: '#8b5cf6', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>✏ Edit</button>
                      <button onClick={() => removeComment(c.id)}
                        style={{ fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>🗑 Delete</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          <div style={{ marginTop: 16 }}>
            <textarea value={newComment} onChange={e => setNewComment(e.target.value)}
              placeholder="Add a comment..." style={{ ...inputStyle, minHeight: 70 }} />
            <button onClick={submitComment} disabled={addingComment || !newComment.trim()}
              style={{ marginTop: 8, padding: '9px 20px', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', border: 'none', borderRadius: 8, color: '#fff', cursor: addingComment ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 14 }}>
              {addingComment ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Incidents() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('ALL');

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try { setTickets(await fetchMyIncidents()); }
    catch { setTickets([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  const filtered = filter === 'ALL' ? tickets : tickets.filter(t => t.status === filter);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h2 style={{ color: '#e2e8f0', margin: 0 }}>My Incident Tickets</h2>
          <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>Report and track campus maintenance issues</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{
          background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', border: 'none',
          borderRadius: 10, padding: '10px 22px', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 14
        }}>+ New Ticket</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total', val: tickets.length, color: '#8b5cf6' },
          { label: 'Open', val: tickets.filter(t => t.status === 'OPEN').length, color: '#3b82f6' },
          { label: 'In Progress', val: tickets.filter(t => t.status === 'IN_PROGRESS').length, color: '#f59e0b' },
          { label: 'Resolved', val: tickets.filter(t => t.status === 'RESOLVED').length, color: '#10b981' },
        ].map(s => (
          <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 16, textAlign: 'center' }}>
            <p style={{ fontSize: 24, fontWeight: 800, color: s.color, margin: 0 }}>{s.val}</p>
            <p style={{ color: '#64748b', fontSize: 12, margin: '4px 0 0' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED'].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: '6px 14px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.12)',
            background: filter === s ? '#7c3aed' : 'rgba(255,255,255,0.04)',
            color: filter === s ? '#fff' : '#94a3b8', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            transition: 'all 0.15s'
          }}>{s.replace('_', ' ')}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: '#64748b', padding: 60 }}>Loading tickets...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#64748b', padding: 60, border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 12 }}>
          <p style={{ fontSize: 40, margin: 0 }}>🔧</p>
          <p style={{ marginTop: 8 }}>{filter !== 'ALL' ? 'No tickets with this status' : 'No incident tickets yet. Report an issue!'}</p>
        </div>
      ) : (
        filtered.map(t => <TicketCard key={t.id} ticket={t} onSelect={setSelected} />)
      )}

      {showCreate && <CreateTicketModal onClose={() => setShowCreate(false)} onCreated={t => { setTickets(prev => [t, ...prev]); }} />}
      {selected && <TicketDetailPanel ticket={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
