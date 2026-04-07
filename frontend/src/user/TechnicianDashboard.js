import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { fetchTechnicianAssignedIncidents, updateIncidentStatus, addIncidentComment, fetchIncidentComments, getCurrentUserId, getCurrentUserRole } from '../api';
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
    OPEN: { bg: '#2563eb', label: 'Open', icon: '🟢' },
    IN_PROGRESS: { bg: '#d97706', label: 'In Progress', icon: '🔄' },
    RESOLVED: { bg: '#059669', label: 'Resolved', icon: '✅' },
    CLOSED: { bg: '#4b5563', label: 'Closed', icon: '🔒' },
    REJECTED: { bg: '#dc2626', label: 'Rejected', icon: '❌' }
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
    MEDIUM: { bg: '#2563eb', icon: '■', label: 'Medium' },
    HIGH: { bg: '#d97706', icon: '▲', label: 'High' },
    CRITICAL: { bg: '#dc2626', icon: '🔥', label: 'Critical' }
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
    <div onClick={onClose} style={{
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
  
  // Verify user is technician
  useEffect(() => {
    if (userRole !== 'TECHNICIAN') {
      navigate('/home', { replace: true });
    }
  }, [userRole, navigate]);

  // Load assigned incidents
  useEffect(() => {
    const loadAssignments = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchTechnicianAssignedIncidents();
        setAssignments(data || []);
        
        // Show notification if assignments are available
        if (data && data.length > 0) {
          setAssignmentNotification(`📋 You have ${data.length} assigned ticket(s)`);
          setTimeout(() => setAssignmentNotification(''), 4000);
        }
      } catch (err) {
        setError(err.message || 'Failed to load assignments');
        setAssignments([]);
      } finally {
        setLoading(false);
      }
    };
    
    if (userId) {
      loadAssignments();
    }
  }, [userId]);

  // Load comments when ticket is selected
  const loadComments = useCallback(async (ticketId) => {
    try {
      const comments = await fetchIncidentComments(ticketId);
      setSelectedTicketComments(comments || []);
    } catch (err) {
      console.error('Failed to load comments:', err);
      setSelectedTicketComments([]);
    }
  }, []);

  // Handle ticket selection
  const handleTicketSelect = useCallback((ticket) => {
    setSelectedTicket(ticket);
    setNewStatus('');
    setNewComment('');
    loadComments(ticket.id);
  }, [loadComments]);

  // Handle deep-link from notification (ticketId query parameter)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ticketIdParam = params.get('ticketId');
    
    if (ticketIdParam && assignments.length > 0) {
      const ticket = assignments.find(t => t.id === ticketIdParam);
      if (ticket) {
        handleTicketSelect(ticket);
        // Clear the query parameter after handling
        navigate('/technician-dashboard', { replace: true });
      }
    }
  }, [location.search, assignments, handleTicketSelect, navigate]);

  // Separate active and closed tickets
  const activeTickets = assignments.filter(t => !TERMINAL_STATUSES.has(t.status));
  const closedTickets = assignments.filter(t => TERMINAL_STATUSES.has(t.status));

  // Filter and sort function
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
        
        if (sortOrder === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });
  };

  const filteredActive = filterAndSort(activeTickets);
  const filteredClosed = filterAndSort(closedTickets);

  // Update status
  const handleStatusChange = async (ticketId, newStat) => {
    try {
      const result = await updateIncidentStatus(ticketId, newStat);
      setAssignments(prev => prev.map(t => t.id === ticketId ? result : t));
      handleTicketSelect(result);
      
      const successMsg = document.createElement('div');
      successMsg.textContent = '✓ Status updated successfully';
      successMsg.className = 'tech-notification-toast';
      document.body.appendChild(successMsg);
      setTimeout(() => successMsg.remove(), 3000);
    } catch (err) {
      alert(err.message || 'Failed to update status');
    }
  };

  // Add comment
  const handleAddComment = async (ticketId) => {
    if (!newComment.trim()) return;
    setAddingComment(true);
    try {
      await addIncidentComment(ticketId, newComment);
      setNewComment('');
      loadComments(ticketId);
      
      const successMsg = document.createElement('div');
      successMsg.textContent = '✓ Comment added successfully';
      successMsg.className = 'tech-notification-toast';
      document.body.appendChild(successMsg);
      setTimeout(() => successMsg.remove(), 3000);
    } catch (err) {
      alert(err.message || 'Failed to add comment');
    } finally {
      setAddingComment(false);
    }
  };

  // Summary stats
  const stats = {
    total: assignments.length,
    open: activeTickets.filter(t => t.status === 'OPEN').length,
    inProgress: activeTickets.filter(t => t.status === 'IN_PROGRESS').length,
    resolved: activeTickets.filter(t => t.status === 'RESOLVED').length,
    closed: closedTickets.length,
    critical: assignments.filter(t => t.priority === 'CRITICAL').length,
  };

  // Render ticket card
  const renderTicketCard = (ticket, index) => (
    <div
      key={ticket.id}
      onClick={() => handleTicketSelect(ticket)}
      className={`tech-ticket-card${selectedTicket?.id === ticket.id ? ' selected' : ''}`}
      style={{ animation: `fadeInUp 0.3s ${index * 0.05}s both` }}
    >
      <div className="tech-ticket-header">
        <div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <h3 className="tech-ticket-title">{ticket.title}</h3>
            <span className="tech-ticket-id">#{ticket.id?.slice?.(-6) || 'N/A'}</span>
          </div>
        </div>
        <div className="tech-priority-indicator" style={{
          background: ticket.priority === 'CRITICAL' ? '#dc2626' : ticket.priority === 'HIGH' ? '#d97706' : '#10b981',
          animation: ticket.priority === 'CRITICAL' ? 'pulse 2s infinite' : 'none'
        }} />
      </div>
      <p className="tech-ticket-description">{ticket.description}</p>
      <div className="tech-ticket-meta">
        <StatusBadge status={ticket.status} />
        <PriorityBadge priority={ticket.priority} />
        <span className="tech-ticket-category">📂 {ticket.category || 'Uncategorized'}</span>
        <span className="tech-ticket-date">🕒 {fmtDate(ticket.createdAt)}</span>
      </div>
    </div>
  );

  return (
    <div className="tech-container">
      {/* Assignment Notification */}
      {assignmentNotification && (
        <div className="tech-notification-toast">{assignmentNotification}</div>
      )}

      {/* Header */}
      <section className="tech-header">
        <h2>🔧 My Work Assignments</h2>
        <p>Manage your assigned support tickets and incidents</p>
      </section>

      {/* Stats Cards */}
      <div className="tech-stats">
        {[
          { label: 'Total Assignments', value: stats.total, color: '#3b82f6', icon: '📋', bg: '#eff6ff' },
          { label: 'Open Tickets', value: stats.open, color: '#dc2626', icon: '🔴', bg: '#fef2f2' },
          { label: 'In Progress', value: stats.inProgress, color: '#f59e0b', icon: '⚠️', bg: '#fffbeb' },
          { label: 'Resolved', value: stats.resolved, color: '#059669', icon: '✅', bg: '#f0fdf4' },
          { label: 'Closed', value: stats.closed, color: '#4b5563', icon: '🔒', bg: '#f3f4f6' },
          { label: 'Critical Issues', value: stats.critical, color: '#991b1b', icon: '🔥', bg: '#fef2f2' },
        ].map((stat, idx) => (
          <div key={idx} className="tech-stat-card" style={{ background: stat.bg }}>
            <div className="tech-stat-value">
              <span className="tech-stat-icon">{stat.icon}</span>
              <h3 className="tech-stat-number" style={{ color: stat.color }}>{stat.value}</h3>
            </div>
            <p className="tech-stat-label">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="tech-alert-error">
          <span className="tech-alert-error-icon">❌</span>
          <span>{error}</span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="tech-loader">
          <div className="tech-spinner"></div>
          <p className="tech-loader-text">Loading your assignments...</p>
        </div>
      )}

      {/* Filters */}
      {!loading && (
        <div className="tech-filter-bar">
          <input
            type="text"
            placeholder="🔍 Search by title or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="tech-search-input"
          />
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="tech-filter-select"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="tech-filter-select"
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="tech-filter-select"
          >
            <option value="createdAt">Sort by Date</option>
            <option value="priority">Sort by Priority</option>
            <option value="status">Sort by Status</option>
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="tech-sort-btn"
          >
            {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
          </button>
        </div>
      )}

      {/* Active Tickets Section */}
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

          {/* Closed Tickets Section */}
          {filteredClosed.length > 0 && (
            <>
              <div className="tech-section-header" style={{ marginTop: 48 }}>
                <h3 className="tech-section-title">📁 Closed & Resolved</h3>
                <span className="tech-section-count">{filteredClosed.length}</span>
              </div>
              <div className="tech-tickets-grid">
                {filteredClosed.map((ticket, idx) => renderTicketCard(ticket, idx))}
              </div>
            </>
          )}

          {/* Empty State */}
          {filteredActive.length === 0 && filteredClosed.length === 0 && (
            <div className="tech-empty-state">
              <span className="tech-empty-icon">✨</span>
              <p className="tech-empty-title">No assignments matching your filters</p>
              <p className="tech-empty-subtitle">Great work staying on top of tickets!</p>
            </div>
          )}
        </>
      )}

      {/* Detail Panel */}
      {selectedTicket && (
        <>
          <div className="tech-detail-overlay" onClick={() => setSelectedTicket(null)} />
          <div className="tech-detail-panel">
            <div className="tech-panel-header">
              <h3 className="tech-panel-title">Ticket Details</h3>
              <button className="tech-panel-close-btn" onClick={() => setSelectedTicket(null)}>✕</button>
            </div>

            <div className="tech-panel-content">
              {/* Title */}
              <h2 className="tech-detail-title">{selectedTicket.title}</h2>

              {/* Status */}
              <div className="tech-status-section">
                <label className="tech-status-label">Current Status</label>
                <div className="tech-status-badges">
                  <StatusBadge status={selectedTicket.status} />
                  <PriorityBadge priority={selectedTicket.priority} />
                </div>

                {!TERMINAL_STATUSES.has(selectedTicket.status) && (
                  <div>
                    <label className="tech-status-label" style={{ marginTop: 12 }}>Update Status</label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="tech-status-update-select"
                    >
                      <option value="">-- Select Status --</option>
                      <option value="IN_PROGRESS">🔄 In Progress</option>
                      <option value="RESOLVED">✅ Resolved</option>
                      <option value="CLOSED">🔒 Closed</option>
                    </select>
                    {newStatus && (
                      <button
                        onClick={() => handleStatusChange(selectedTicket.id, newStatus)}
                        className="tech-status-update-btn"
                      >
                        Update Status
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="tech-status-section" style={{ background: 'linear-gradient(135deg, rgba(255,237,213,0.8) 0%, rgba(254,215,170,0.8) 100%)', border: '2px solid #fb923c' }}>
                <label className="tech-status-label" style={{ color: '#92400e' }}>📝 Description</label>
                <p className="tech-detail-description-text" style={{ color: '#7c2d12', fontWeight: 700 }}>
                  {selectedTicket.description}
                </p>
              </div>

              {/* Details */}
              <div className="tech-details-section">
                <div className="tech-detail-row">
                  <strong>Category:</strong>
                  <span>{selectedTicket.category || 'N/A'}</span>
                </div>
                <div className="tech-detail-row">
                  <strong>Location:</strong>
                  <span>{selectedTicket.location || 'N/A'}</span>
                </div>
                <div className="tech-detail-row">
                  <strong>Created:</strong>
                  <span>{fmtDate(selectedTicket.createdAt)}</span>
                </div>
                <div className="tech-detail-row">
                  <strong>Updated:</strong>
                  <span>{selectedTicket.updatedAt ? fmtDate(selectedTicket.updatedAt) : fmtDate(selectedTicket.createdAt)}</span>
                </div>
                <div className="tech-detail-row">
                  <strong>Reported by:</strong>
                  <span>{selectedTicket.reportedByName || 'N/A'}</span>
                </div>
                {selectedTicket.contactDetails && (
                  <div className="tech-detail-row">
                    <strong>Contact:</strong>
                    <span>{selectedTicket.contactDetails}</span>
                  </div>
                )}
              </div>

              {/* Images */}
              {selectedTicket.attachmentUrls?.length > 0 && (
                <div className="tech-images-section">
                  <h3 className="tech-images-title">📸 Evidence Photos ({selectedTicket.attachmentUrls.length})</h3>
                  <div className="tech-images-gallery">
                    {selectedTicket.attachmentUrls.map((url, i) => (
                      <div key={i} className="tech-image-thumbnail" onClick={() => setPhotoModal(url)}>
                        <img src={url} alt={`photo-${i}`} onError={e => e.target.parentElement.style.display = 'none'} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <hr style={{ borderColor: '#e5e7eb', margin: '20px 0', borderStyle: 'dashed' }} />

              {/* Comments */}
              <div className="tech-comments-section">
                <div className="tech-comments-header">
                  <h3 className="tech-comments-title">💬 Comments</h3>
                  <span className="tech-comments-badge">{selectedTicketComments.length}</span>
                </div>
                <div className="tech-comments-container">
                  {selectedTicketComments.length === 0 ? (
                    <p className="tech-comments-empty">No comments yet</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {[...selectedTicketComments].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).map((c, idx) => {
                        const isEscalation = c.content?.includes('ESCALATION REQUEST');
                        return (
                          <div 
                            key={c.id || idx} 
                            style={{
                              background: isEscalation ? 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)' : 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                              borderRadius: 12,
                              padding: '12px 14px',
                              border: `2px solid ${isEscalation ? '#fca5a5' : '#e5e7eb'}`,
                              transition: 'all 0.15s'
                            }}
                            className="tech-comment-card"
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
                              <span style={{ color: isEscalation ? '#dc2626' : '#059669', fontSize: 12, fontWeight: 800 }}>👤 {c.authorName || 'Unknown'}</span>
                              <span style={{ color: '#6b7280', fontSize: 10, fontWeight: 600 }}>{fmtDateTime(c.createdAt)}</span>
                            </div>
                            <p style={{ color: isEscalation ? '#991b1b' : '#111827', fontSize: 12, margin: 0, fontWeight: isEscalation ? 800 : 600, lineHeight: 1.5 }}>
                              {c.content}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {!TERMINAL_STATUSES.has(selectedTicket.status) && (
                  <div>
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Write your comment..."
                      className="tech-comment-textarea"
                    />
                    <button
                      onClick={() => handleAddComment(selectedTicket.id)}
                      disabled={addingComment || !newComment.trim()}
                      className="tech-comment-submit-btn"
                    >
                      {addingComment ? '⏳ Posting...' : '💬 Post Comment'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Photo Modal */}
      {photoModal && <PhotoModal url={photoModal} onClose={() => setPhotoModal(null)} />}

    </div>
  );
}

export default TechnicianDashboard;