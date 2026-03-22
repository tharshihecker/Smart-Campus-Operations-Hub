import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchAllIncidents, updateIncidentStatus, assignIncidentTechnician,
  fetchAllUsers
} from '../api';

const TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

function StatusBadge({ status }) {
  const colors = { OPEN: '#3b82f6', IN_PROGRESS: '#f59e0b', RESOLVED: '#10b981', CLOSED: '#6b7280', REJECTED: '#ef4444' };
  return <span style={{ background: colors[status] || '#6b7280', color: '#fff', padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{status.replace('_', ' ')}</span>;
}

function PriorityBadge({ priority }) {
  const colors = { LOW: '#6b7280', MEDIUM: '#3b82f6', HIGH: '#f59e0b', CRITICAL: '#ef4444' };
  return <span style={{ background: colors[priority] || '#6b7280', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>{priority}</span>;
}

function StatusModal({ ticket, onClose, onUpdated }) {
  const [status, setStatus] = useState(ticket.status);
  const [notes, setNotes] = useState(ticket.resolutionNotes || '');
  const [reason, setReason] = useState(ticket.rejectionReason || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const inputStyle = { width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 14px', color: '#222222', fontSize: 14, boxSizing: 'border-box', resize: 'vertical' };

  const submit = async e => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const updated = await updateIncidentStatus(ticket.id, status, notes, reason);
      onUpdated(updated); onClose();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#ffffff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
        <h3 style={{ color: '#222222', marginBottom: 20, fontWeight: 700 }}>Update Ticket #{ticket.id} Status</h3>
        {error && <div style={{ background: '#fbeaea', border: '1px solid #ef4444', borderRadius: 8, padding: 10, marginBottom: 14, color: '#b33030', fontSize: 13, fontWeight: 600 }}>{error}</div>}
        <form onSubmit={submit}>
          <div style={{ display: 'grid', gap: 14 }}>
            <select style={inputStyle} value={status} onChange={e => setStatus(e.target.value)}>
              {TICKET_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
            {(status === 'RESOLVED' || status === 'CLOSED') && (
              <textarea style={{ ...inputStyle, minHeight: 80 }} placeholder="Resolution notes..." value={notes} onChange={e => setNotes(e.target.value)} />
            )}
            {status === 'REJECTED' && (
              <textarea style={{ ...inputStyle, minHeight: 70 }} placeholder="Rejection reason *" value={reason} onChange={e => setReason(e.target.value)} />
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px 0', background: '#f0f0f0', border: '1px solid #d0d0d0', borderRadius: 8, color: '#333333', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
            <button type="submit" disabled={loading} style={{ flex: 2, padding: '10px 0', background: 'linear-gradient(135deg, #4f8cff, #3a6fd8)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
              {loading ? 'Saving...' : 'Update Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AssignModal({ ticket, technicians, onClose, onUpdated }) {
  const [techId, setTechId] = useState(ticket.assigneeId || '');
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault(); setLoading(true);
    try { const updated = await assignIncidentTechnician(ticket.id, techId); onUpdated(updated); onClose(); }
    catch {} finally { setLoading(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#ffffff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 400, border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
        <h3 style={{ color: '#222222', marginBottom: 20, fontWeight: 700 }}>Assign Technician – #{ticket.id}</h3>
        <form onSubmit={submit}>
          <select value={techId} onChange={e => setTechId(e.target.value)} required
            style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 14px', color: '#222222', fontSize: 14, marginBottom: 16 }}>
            <option value="">-- Select Technician --</option>
            {technicians.map(t => <option key={t.id} value={t.id}>{t.fullName || t.username} ({t.role})</option>)}
          </select>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px 0', background: '#f0f0f0', border: '1px solid #d0d0d0', borderRadius: 8, color: '#333333', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
            <button type="submit" disabled={loading || !techId} style={{ flex: 2, padding: '10px 0', background: 'linear-gradient(135deg, #4f8cff, #3a6fd8)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
              {loading ? 'Assigning...' : 'Assign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ManageIncidents() {
  const [tickets, setTickets] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusModal, setStatusModal] = useState(null);
  const [assignModal, setAssignModal] = useState(null);

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

  const onUpdated = (updated) => setTickets(prev => prev.map(t => t.id === updated.id ? updated : t));

  const selectStyle = { background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 14px', color: '#222222', fontSize: 13, cursor: 'pointer', fontWeight: 500 };

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'OPEN').length,
    inProgress: tickets.filter(t => t.status === 'IN_PROGRESS').length,
    critical: tickets.filter(t => t.priority === 'CRITICAL').length,
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ color: '#222222', margin: 0, fontWeight: 700 }}>Manage Incidents</h2>
        <p style={{ color: '#666666', margin: '4px 0 0', fontSize: 14 }}>Review, assign, and resolve maintenance tickets</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total', val: stats.total, color: '#4f8cff' },
          { label: 'Open', val: stats.open, color: '#3b82f6' },
          { label: 'In Progress', val: stats.inProgress, color: '#f59e0b' },
          { label: 'Critical', val: stats.critical, color: '#ef4444' },
        ].map(s => (
          <div key={s.label} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16, textAlign: 'center' }}>
            <p style={{ fontSize: 28, fontWeight: 800, color: s.color, margin: 0 }}>{s.val}</p>
            <p style={{ color: '#666666', fontSize: 12, margin: '4px 0 0', fontWeight: 500 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <select style={selectStyle} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {TICKET_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <select style={selectStyle} value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <button onClick={load} style={{ padding: '8px 16px', background: '#e8f0ff', border: '1px solid #4f8cff', borderRadius: 8, color: '#4f8cff', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>↻ Refresh</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: '#666666', padding: 40 }}>Loading tickets...</div>
      ) : tickets.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#666666', padding: 40, border: '1px dashed #e2e8f0', borderRadius: 12 }}>No tickets found.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#ffffff' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8faff' }}>
                {['#', 'Title', 'Category', 'Priority', 'Status', 'Reporter', 'Assignee', 'Created', 'Actions'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 12px', color: '#222222', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tickets.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px', color: '#666666', fontSize: 13 }}>#{t.id}</td>
                  <td style={{ padding: '12px', color: '#222222', fontSize: 13, maxWidth: 200 }}>
                    <p style={{ margin: 0, fontWeight: 600 }}>{t.title}</p>
                    <p style={{ margin: '2px 0 0', color: '#666666', fontSize: 11 }}>{t.location}</p>
                  </td>
                  <td style={{ padding: '12px', color: '#333333', fontSize: 12 }}>{t.category}</td>
                  <td style={{ padding: '12px' }}><PriorityBadge priority={t.priority} /></td>
                  <td style={{ padding: '12px' }}><StatusBadge status={t.status} /></td>
                  <td style={{ padding: '12px', color: '#333333', fontSize: 12 }}>{t.reporterName}</td>
                  <td style={{ padding: '12px', color: '#333333', fontSize: 12 }}>{t.assigneeName || <span style={{ color: '#999999' }}>Unassigned</span>}</td>
                  <td style={{ padding: '12px', color: '#666666', fontSize: 11 }}>{new Date(t.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setStatusModal(t)} style={{ padding: '5px 10px', background: '#e8f0ff', border: '1px solid #4f8cff', borderRadius: 6, color: '#4f8cff', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Status</button>
                      <button onClick={() => setAssignModal(t)} style={{ padding: '5px 10px', background: '#e8f0ff', border: '1px solid #3b82f6', borderRadius: 6, color: '#3b82f6', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Assign</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {statusModal && <StatusModal ticket={statusModal} onClose={() => setStatusModal(null)} onUpdated={onUpdated} />}
      {assignModal && <AssignModal ticket={assignModal} technicians={technicians} onClose={() => setAssignModal(null)} onUpdated={onUpdated} />}
    </div>
  );
}
