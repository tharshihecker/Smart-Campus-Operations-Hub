import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { fetchTechnicianAssignedIncidents, updateIncidentStatus, addIncidentComment, fetchIncidentComments, getCurrentUserId, getCurrentUserRole } from '../api';
import { sanitizeMessage } from '../utils/ui';
import './TechnicianDashboard.css';

const TERMINAL_STATUSES = new Set(['CLOSED', 'REJECTED']);

// Safe date parser
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

// Status badge
function StatusBadge({ status }) {
  const config = { 
    OPEN: { bg: 'var(--brand-blue)', label: 'Open', icon: '🟢' },
    IN_PROGRESS: { bg: 'var(--brand-warning)', label: 'In Progress', icon: '🔄' },
    RESOLVED: { bg: 'var(--brand-accent)', label: 'Resolved', icon: '✅' },
    CLOSED: { bg: 'var(--text-muted)', label: 'Closed', icon: '🔒' },
    REJECTED: { bg: 'var(--brand-danger)', label: 'Rejected', icon: '❌' }
  };
  const { bg, label, icon } = config[status] || config.CLOSED;
  
  return (
    <span className="tech-ticket-badge" style={{ background: bg }}>
      <span>{icon}</span>
      <span>{label}</span>
    </span>
  );
}

// Priority badge
function PriorityBadge({ priority }) {
  const config = { 
    LOW: { bg: '#6b7280', icon: '▼', label: 'Low' },
    MEDIUM: { bg: 'var(--brand-blue)', icon: '■', label: 'Medium' },
    HIGH: { bg: 'var(--brand-warning)', icon: '▲', label: 'High' },
    CRITICAL: { bg: 'var(--brand-danger)', icon: '🔥', label: 'Critical' }
  };
  const { bg, icon, label } = config[priority] || config.LOW;
  
  return (
    <span className="tech-ticket-badge" style={{ background: bg }}>
      <span>{icon}</span>
      <span>{label}</span>
    </span>
  );
}

// Photo Modal
function PhotoModal({ url, onClose }) {
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="tech-detail-overlay" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <button onClick={onClose} style={{
        position: 'absolute', top: 24, right: 24,
        background: 'rgba(255,255,255,0.2)', border: 'none',
        color: '#fff', fontSize: 24, borderRadius: 16, width: 48, height: 48,
        cursor: 'pointer', fontWeight: 800, backdropFilter: 'blur(10px)'
      }}>✕</button>
      <img src={url} alt="full" onClick={e => e.stopPropagation()} style={{
        maxWidth: '90vw', maxHeight: '90vh', borderRadius: 24,
        objectFit: 'contain', boxShadow: '0 30px 60px rgba(0,0,0,0.6)',
        border: '1px solid rgba(255,255,255,0.1)'
      }} />
    </div>
  );
}

function TechnicianDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const userId = getCurrentUserId();
  const userRole = getCurrentUserRole();
  
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedTicketComments, setSelectedTicketComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [addingComment, setAddingComment] = useState(false);
  const [photoModal, setPhotoModal] = useState(null);
  const [assignmentNotification, setAssignmentNotification] = useState('');
  
  useEffect(() => {
    if (userRole !== 'TECHNICIAN') {
      navigate('/home', { replace: true });
    }
  }, [userRole, navigate]);

  useEffect(() => {
    const loadAssignments = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchTechnicianAssignedIncidents();
        setAssignments(data || []);
        const activeTickets = (data || []).filter(t => !TERMINAL_STATUSES.has(t.status));
        if (activeTickets.length > 0) {
          setAssignmentNotification(`📋 You have ${activeTickets.length} active work assignments`);
          setTimeout(() => setAssignmentNotification(''), 5000);
        }
      } catch (err) {
        setError(err.message || 'Failed to load assignments');
        setAssignments([]);
      } finally {
        setLoading(false);
      }
    };
    if (userId) loadAssignments();
  }, [userId]);

  // 💬 Tawk.to Integration (Dashboard Only)
  useEffect(() => {
    var Tawk_API = Tawk_API || {}, Tawk_LoadStart = new Date();
    const s1 = document.createElement("script");
    const s0 = document.getElementsByTagName("script")[0];
    s1.async = true;
    s1.src = 'https://embed.tawk.to/69d9d0753ad18f1c36acef65/1jltdcjaa';
    s1.charset = 'UTF-8';
    s1.setAttribute('crossorigin', '*');
    s0.parentNode.insertBefore(s1, s0);

    return () => {
      // Hide the widget when leaving the dashboard
      if (window.Tawk_API && typeof window.Tawk_API.hideWidget === 'function') {
        window.Tawk_API.hideWidget();
      }
      // Remove the script tag
      s1.remove();
    };
  }, []);

  const loadComments = useCallback(async (ticketId) => {
    try {
      const comments = await fetchIncidentComments(ticketId);
      setSelectedTicketComments(comments || []);
    } catch (err) {
      console.error('Failed to load comments:', err);
      setSelectedTicketComments([]);
    }
  }, []);

  const handleTicketSelect = useCallback((ticket) => {
    setSelectedTicket(ticket);
    setNewStatus('');
    setNewComment('');
    loadComments(ticket.id);
  }, [loadComments]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ticketIdParam = params.get('ticketId');
    if (ticketIdParam && assignments.length > 0) {
      const ticket = assignments.find(t => t.id === ticketIdParam);
      if (ticket) {
        handleTicketSelect(ticket);
        navigate('/technician-dashboard', { replace: true });
      }
    }
  }, [location.search, assignments, handleTicketSelect, navigate]);

  const activeTickets = assignments.filter(t => !TERMINAL_STATUSES.has(t.status));
  const closedTickets = assignments.filter(t => TERMINAL_STATUSES.has(t.status));

  const filterAndSort = (tickets) => {
    return tickets
      .filter(ticket => {
        if (statusFilter && ticket.status !== statusFilter) return false;
        if (priorityFilter && ticket.priority !== priorityFilter) return false;
        if (searchTerm && !ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) && 
            !ticket.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => {
        let aVal = a[sortBy];
        let bVal = b[sortBy];
        if (sortBy === 'createdAt') {
          aVal = new Date(aVal).getTime();
          bVal = new Date(bVal).getTime();
        }
        if (sortOrder === 'asc') return aVal > bVal ? 1 : -1;
        return aVal < bVal ? 1 : -1;
      });
  };

  const filteredActive = filterAndSort(activeTickets);
  const filteredClosed = filterAndSort(closedTickets);

  const handleStatusChange = async (ticketId, newStat) => {
    try {
      const result = await updateIncidentStatus(ticketId, newStat);
      setAssignments(prev => prev.map(t => t.id === ticketId ? result : t));
      handleTicketSelect(result);
    } catch (err) {
      setError(err.message || 'Failed to update status');
    }
  };

  const handleAddComment = async (ticketId) => {
    if (!newComment.trim()) return;
    setAddingComment(true);
    try {
      await addIncidentComment(ticketId, newComment);
      setNewComment('');
      loadComments(ticketId);
    } catch (err) {
      setError(err.message || 'Failed to add comment');
    } finally {
      setAddingComment(false);
    }
  };

  const stats = {
    total: assignments.length,
    open: activeTickets.filter(t => t.status === 'OPEN').length,
    inProgress: activeTickets.filter(t => t.status === 'IN_PROGRESS').length,
    resolved: activeTickets.filter(t => t.status === 'RESOLVED').length,
    closed: closedTickets.length,
    critical: assignments.filter(t => t.priority === 'CRITICAL').length,
  };

  const renderTicketCard = (ticket, index) => {
    const accentColor = ticket.priority === 'CRITICAL' ? 'var(--brand-danger)' : ticket.priority === 'HIGH' ? 'var(--brand-warning)' : 'var(--brand-accent)';
    return (
      <div
        key={ticket.id}
        onClick={() => handleTicketSelect(ticket)}
        className={`tech-ticket-card${selectedTicket?.id === ticket.id ? ' selected' : ''}`}
        style={{ 
          animation: `fadeInUp 0.4s ${index * 0.08}s both`,
          '--accent-color': accentColor,
          background: 'var(--bg-card)', // Keeps it thematic but readable
          border: '1px solid var(--border-subtle)'
        }}
      >
        {/* Ticket ID & Priority Header */}
        <div className="tech-ticket-header">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="tech-ticket-id">TRK-{ticket.id?.slice?.(-5).toUpperCase() || 'N/A'}</span>
            <h3 className="tech-ticket-title">{ticket.title}</h3>
          </div>
          <div className="tech-priority-indicator" style={{
            color: accentColor,
            background: 'currentColor',
            animation: ticket.priority === 'CRITICAL' ? 'pulse 2s infinite' : 'none',
            flexShrink: 0
          }} />
        </div>

        {/* Description Body */}
        <p className="tech-ticket-description">{ticket.description}</p>

        {/* Metadata Footer */}
        <div className="tech-ticket-meta" style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 'auto' }}>
          {/* Row 1: Badges */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
          </div>
          
          {/* Row 2: Category & Date (The requested one-row design) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#f8fafc', borderRadius: 14, border: '1px solid #e2e8f0', flexWrap: 'nowrap' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 800, color: '#64748b', whiteSpace: 'nowrap' }}>
                <span>📂</span>
                <span>{ticket.category || 'Unassigned'}</span>
             </div>
             <div style={{ width: 1, height: 12, background: '#cbd5e1' }} />
             <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 750, color: '#64748b', whiteSpace: 'nowrap' }}>
                <span>🕒</span>
                <span>{fmtDate(ticket.createdAt)}</span>
             </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="tech-container">
      {assignmentNotification && <div className="tech-notification-toast">{assignmentNotification}</div>}

      <section className="tech-header">
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div className="badge" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', marginBottom: 16 }}>OPERATIONS TERMINAL</div>
          <h2>🔧 My Work Assignments</h2>
          <p>Real-time incident management for campus technicians. Resolve maintenance tickets and provide updates to the campus ecosystem.</p>
        </div>
      </section>

      <div className="tech-stats">
        {[
          { label: 'Total Tasks', value: stats.total, color: 'var(--brand-blue)', icon: '📋' },
          { label: 'Open', value: stats.open, color: 'var(--brand-danger)', icon: '🔴' },
          { label: 'In Progress', value: stats.inProgress, color: 'var(--brand-warning)', icon: '🔄' },
          { label: 'Resolved', value: stats.resolved, color: 'var(--brand-accent)', icon: '✅' },
          { label: 'Closed', value: stats.closed, color: 'var(--text-muted)', icon: '🔒' },
          { label: 'Critical', value: stats.critical, color: '#991b1b', icon: '🔥' },
        ].map((stat, idx) => (
          <div key={idx} className="tech-stat-card">
            <div className="tech-stat-value">
              <span className="tech-stat-icon">{stat.icon}</span>
              <h3 className="tech-stat-number" style={{ color: stat.color }}>{stat.value}</h3>
            </div>
            <p className="tech-stat-label">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="tech-filter-bar">
        <input
          type="text"
          placeholder="🔍 Search tickets by name, problem, or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="tech-search-input"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="tech-filter-select">
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="tech-filter-select">
          <option value="">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>
        <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} className="tech-sort-btn">
          {sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
        </button>
      </div>

      {!loading && (
        <>
          {filteredActive.length > 0 && (
            <>
              <div className="tech-section-header">
                <h3 className="tech-section-title">🔧 Active Tickets</h3>
                <span className="tech-section-count">{filteredActive.length}</span>
              </div>
              <div className="tech-tickets-grid">
                {filteredActive.map((ticket, idx) => renderTicketCard(ticket, idx))}
              </div>
            </>
          )}

          {filteredClosed.length > 0 && (
            <>
              <div className="tech-section-header" style={{ marginTop: 60 }}>
                <h3 className="tech-section-title">📁 Closed & Resolved</h3>
                <span className="tech-section-count">{filteredClosed.length}</span>
              </div>
              <div className="tech-tickets-grid">
                {filteredClosed.map((ticket, idx) => renderTicketCard(ticket, idx))}
              </div>
            </>
          )}

          {filteredActive.length === 0 && filteredClosed.length === 0 && (
            <div className="tech-empty-state">
              <span className="tech-empty-icon">✨</span>
              <p className="tech-empty-title">All Caught Up!</p>
              <p className="tech-empty-subtitle">No tickets found matching your current filters.</p>
            </div>
          )}
        </>
      )}

      {selectedTicket && (
        <>
          <div className="tech-detail-overlay" onClick={() => setSelectedTicket(null)} />
          <div className="tech-detail-panel">
            <div className="tech-panel-header">
              <h3 className="tech-panel-title">Incident Explorer</h3>
              <button className="tech-panel-close-btn" onClick={() => setSelectedTicket(null)}>✕</button>
            </div>

            <div className="tech-panel-content">
              <h2 className="tech-detail-title">{selectedTicket.title}</h2>

              <div className="tech-status-section">
                <label className="tech-status-label">Ticket Governance</label>
                <div className="tech-status-badges">
                  <StatusBadge status={selectedTicket.status} />
                  <PriorityBadge priority={selectedTicket.priority} />
                </div>

                {!TERMINAL_STATUSES.has(selectedTicket.status) && (
                  <div>
                    <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="tech-status-update-select">
                      <option value="">-- Change State --</option>
                      <option value="IN_PROGRESS">🔄 Mark In Progress</option>
                      <option value="RESOLVED">✅ Resolve Ticket</option>
                      <option value="CLOSED">🔒 Close Permanently</option>
                    </select>
                    {newStatus && (
                      <button onClick={() => handleStatusChange(selectedTicket.id, newStatus)} className="tech-status-update-btn">
                        Transition Status
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="tech-status-section" style={{ borderLeft: '6px solid var(--brand-warning)', background: 'var(--bg-base)' }}>
                <label className="tech-status-label">📝 Problem Definition</label>
                <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {selectedTicket.description}
                </p>
              </div>

              <div className="tech-details-section">
                <div className="tech-detail-row"><strong>Category:</strong> <span>{selectedTicket.category || 'N/A'}</span></div>
                <div className="tech-detail-row"><strong>Location:</strong> <span>{selectedTicket.location || 'N/A'}</span></div>
                <div className="tech-detail-row"><strong>Created:</strong> <span>{fmtDate(selectedTicket.createdAt)}</span></div>
                <div className="tech-detail-row"><strong>Reported by:</strong> <span>{selectedTicket.reporterName || 'N/A'}</span></div>
                {selectedTicket.contactDetails && (
                  <div className="tech-detail-row"><strong>Contact:</strong> <span>{selectedTicket.contactDetails}</span></div>
                )}
              </div>

              {selectedTicket.attachmentUrls?.length > 0 && (
                <div className="tech-images-section">
                  <h3 className="tech-status-label">📸 Evidence Assets</h3>
                  <div className="tech-images-gallery">
                    {selectedTicket.attachmentUrls.map((url, i) => (
                      <div key={i} className="tech-image-thumbnail" onClick={() => setPhotoModal(url)}>
                        <img src={url} alt={`evidence-${i}`} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="tech-comments-section">
                <div className="tech-comments-header">
                  <h3 className="tech-panel-title" style={{ fontSize: '1.2rem' }}>💬 Discussion Thread</h3>
                  <span className="tech-comments-badge">{selectedTicketComments.length}</span>
                </div>
                <div className="tech-comments-container">
                  {selectedTicketComments.length === 0 ? (
                    <div className="tech-empty-state" style={{ padding: '20px' }}>No comments recorded</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {[...selectedTicketComments].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).map((c, idx) => (
                        <div key={c.id || idx} className="tech-comment-card" style={{
                           background: 'var(--bg-card)', padding: '20px', borderRadius: '20px', border: '1px solid var(--border-subtle)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ color: 'var(--brand-blue)', fontWeight: 800, fontSize: '0.85rem' }}>@{c.authorName || 'User'}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{fmtDateTime(c.createdAt)}</span>
                          </div>
                          <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 500 }}>{c.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {!TERMINAL_STATUSES.has(selectedTicket.status) && (
                  <div style={{ marginTop: 24 }}>
                    <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a professional update..." className="tech-comment-textarea" />
                    <button onClick={() => handleAddComment(selectedTicket.id)} disabled={addingComment || !newComment.trim()} className="tech-comment-submit-btn">
                      {addingComment ? '⏳ Syncing...' : '💬 Add Update'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {photoModal && <PhotoModal url={photoModal} onClose={() => setPhotoModal(null)} />}
    </div>
  );
}

export default TechnicianDashboard;