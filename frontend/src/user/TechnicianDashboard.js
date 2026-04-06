import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchTechnicianAssignedIncidents, updateIncidentStatus, addIncidentComment, getCurrentUserId, getCurrentUserRole } from '../api';
import '../App.css';

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

// Status badge with enhanced design
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
    <span style={{ 
      background: bg, 
      color: '#fff', 
      padding: '4px 14px', 
      borderRadius: 999, 
      fontSize: 12, 
      fontWeight: 700, 
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <span>{icon}</span>
      <span>{label}</span>
    </span>
  );
}

// Priority badge with enhanced design
function PriorityBadge({ priority }) {
  const config = { 
    LOW: { bg: '#6b7280', icon: '▼', label: 'Low' },
    MEDIUM: { bg: '#2563eb', icon: '■', label: 'Medium' },
    HIGH: { bg: '#d97706', icon: '▲', label: 'High' },
    CRITICAL: { bg: '#dc2626', icon: '🔥', label: 'Critical' }
  };
  const { bg, icon, label } = config[priority] || config.LOW;
  
  return (
    <span style={{ 
      background: bg, 
      color: '#fff', 
      padding: '4px 12px', 
      borderRadius: 6, 
      fontSize: 11, 
      fontWeight: 800, 
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      animation: priority === 'CRITICAL' ? 'pulse 2s infinite' : 'none',
      boxShadow: priority === 'CRITICAL' ? '0 0 8px rgba(220,38,38,0.5)' : 'none'
    }}>
      <span>{icon}</span>
      <span>{label}</span>
    </span>
  );
}

function TechnicianDashboard() {
  const navigate = useNavigate();
  const userId = getCurrentUserId();
  const userRole = getCurrentUserRole();
  
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  
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

  // Filter and sort assignments
  const filtered = assignments
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

  // Update status
  const handleStatusChange = async (ticketId, newStat) => {
    try {
      const result = await updateIncidentStatus(ticketId, newStat);
      setAssignments(prev => prev.map(t => t.id === ticketId ? result : t));
      setSelectedTicket(result);
      setNewStatus('');
      
      // Show success feedback
      const successMsg = document.createElement('div');
      successMsg.textContent = '✓ Status updated successfully';
      successMsg.style.cssText = 'position:fixed;top:20px;right:20px;background:#059669;color:#fff;padding:12px 20px;border-radius:8px;z-index:1001;animation:slideIn 0.3s,slideOut 0.3s 2.7s';
      document.body.appendChild(successMsg);
      setTimeout(() => successMsg.remove(), 3000);
    } catch (err) {
      alert(err.message || 'Failed to update status');
    }
  };

  // Add comment
  const handleAddComment = async (ticketId) => {
    if (!newComment.trim()) return;
    try {
      await addIncidentComment(ticketId, newComment);
      // Refresh ticket data
      const updated = assignments.find(t => t.id === ticketId);
      if (updated) {
        setSelectedTicket({ ...updated });
      }
      setNewComment('');
      
      // Show success feedback
      const successMsg = document.createElement('div');
      successMsg.textContent = '✓ Comment added successfully';
      successMsg.style.cssText = 'position:fixed;top:20px;right:20px;background:#059669;color:#fff;padding:12px 20px;border-radius:8px;z-index:1001;animation:slideIn 0.3s,slideOut 0.3s 2.7s';
      document.body.appendChild(successMsg);
      setTimeout(() => successMsg.remove(), 3000);
    } catch (err) {
      alert(err.message || 'Failed to add comment');
    }
  };

  // Summary stats
  const stats = {
    total: assignments.length,
    open: assignments.filter(t => t.status === 'OPEN').length,
    inProgress: assignments.filter(t => t.status === 'IN_PROGRESS').length,
    resolved: assignments.filter(t => t.status === 'RESOLVED').length,
    critical: assignments.filter(t => t.priority === 'CRITICAL').length,
  };

  return (
    <div style={{ padding: '20px 40px', maxWidth: 1400, margin: '0 auto', background: '#f9fafb', minHeight: '100vh' }}>
      {/* Enhanced Header with Gradient */}
      <section style={{ 
        marginBottom: 40, 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '30px 40px',
        borderRadius: 20,
        color: '#fff',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 36, fontWeight: 800 }}>
          🔧 My Work Assignments
        </h2>
        <p style={{ margin: 0, fontSize: 16, opacity: 0.95 }}>
          Manage your assigned support tickets and incidents
        </p>
      </section>

      {/* Enhanced Stats Cards with Hover Effects */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: 20, 
        marginBottom: 32 
      }}>
        {[
          { label: 'Total Assignments', value: stats.total, color: '#3b82f6', icon: '📋', bg: '#eff6ff' },
          { label: 'Open Tickets', value: stats.open, color: '#dc2626', icon: '🔴', bg: '#fef2f2' },
          { label: 'In Progress', value: stats.inProgress, color: '#f59e0b', icon: '⚠️', bg: '#fffbeb' },
          { label: 'Resolved', value: stats.resolved, color: '#059669', icon: '✅', bg: '#f0fdf4' },
          { label: 'Critical Issues', value: stats.critical, color: '#991b1b', icon: '🔥', bg: '#fef2f2' },
        ].map((stat, idx) => (
          <div key={idx} style={{
            background: stat.bg,
            border: 'none',
            borderRadius: 16,
            padding: 20,
            transition: 'transform 0.2s, box-shadow 0.2s',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 32 }}>{stat.icon}</span>
              <h3 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: stat.color }}>{stat.value}</h3>
            </div>
            <p style={{ margin: 0, fontSize: 14, color: '#6b7280', fontWeight: 600 }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Error Alert with Animation */}
      {error && (
        <div style={{
          background: '#fee2e2',
          border: '1px solid #fecaca',
          borderRadius: 12,
          padding: 14,
          marginBottom: 20,
          color: '#991b1b',
          fontSize: 14,
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          animation: 'slideDown 0.3s'
        }}>
          <span style={{ fontSize: 20 }}>❌</span>
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ 
            display: 'inline-block',
            width: 50,
            height: 50,
            border: '4px solid #e5e7eb',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p style={{ marginTop: 20, color: '#6b7280', fontSize: 16 }}>Loading your assignments...</p>
        </div>
      )}

      {/* Enhanced Filters with Search */}
      {!loading && (
        <div style={{ 
          display: 'flex', 
          gap: 12, 
          marginBottom: 24, 
          flexWrap: 'wrap',
          alignItems: 'center',
          background: '#fff',
          padding: 16,
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <input
              type="text"
              placeholder="🔍 Search by title or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1.5px solid #d1d5db',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                background: '#ffffff',
                color: '#111827',
              }}
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1.5px solid #d1d5db',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              background: '#ffffff',
              color: '#111827',
            }}
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
            style={{
              padding: '8px 12px',
              border: '1.5px solid #d1d5db',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              background: '#ffffff',
              color: '#111827',
            }}
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
            style={{
              padding: '8px 12px',
              border: '1.5px solid #d1d5db',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              background: '#ffffff',
              color: '#111827',
            }}
          >
            <option value="createdAt">Sort by Date</option>
            <option value="priority">Sort by Priority</option>
            <option value="status">Sort by Status</option>
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            style={{
              padding: '8px 12px',
              border: '1.5px solid #d1d5db',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              background: '#ffffff',
              color: '#111827',
            }}
          >
            {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
          </button>
        </div>
      )}

      {/* Enhanced Empty State */}
      {!loading && filtered.length === 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 20,
          padding: 60,
          textAlign: 'center',
          color: '#fff',
        }}>
          <span style={{ fontSize: 64, display: 'block', marginBottom: 20 }}>✨</span>
          <p style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>No assignments matching your filters</p>
          <p style={{ margin: '12px 0 0', fontSize: 14, opacity: 0.9 }}>Great work staying on top of tickets!</p>
        </div>
      )}

      {/* Enhanced Tickets List with Animations */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: 'grid', gap: 16 }}>
          {filtered.map((ticket, index) => (
            <div
              key={ticket.id}
              onClick={() => setSelectedTicket(ticket)}
              style={{
                background: '#ffffff',
                border: selectedTicket?.id === ticket.id ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                borderRadius: 16,
                padding: 20,
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: selectedTicket?.id === ticket.id ? '0 8px 25px rgba(59,130,246,0.2)' : '0 1px 3px rgba(0,0,0,0.05)',
                transform: selectedTicket?.id === ticket.id ? 'translateY(-2px)' : 'none',
                animation: `fadeInUp 0.3s ${index * 0.05}s both`
              }}
              onMouseEnter={(e) => {
                if (selectedTicket?.id !== ticket.id) {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedTicket?.id !== ticket.id) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                }
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>
                      {ticket.title}
                    </h3>
                    <span style={{ 
                      fontSize: 11, 
                      color: '#6b7280', 
                      background: '#f3f4f6', 
                      padding: '4px 10px', 
                      borderRadius: 20,
                      fontWeight: 600
                    }}>
                      #{ticket.id?.slice(-6) || 'N/A'}
                    </span>
                  </div>
                  <p style={{ 
                    margin: '0 0 16px', 
                    fontSize: 14, 
                    color: '#6b7280', 
                    lineHeight: 1.6,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {ticket.description}
                  </p>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    <StatusBadge status={ticket.status} />
                    <PriorityBadge priority={ticket.priority} />
                    <span style={{ 
                      fontSize: 12, 
                      color: '#6b7280', 
                      padding: '4px 10px',
                      background: '#f3f4f6',
                      borderRadius: 6,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}>
                      📂 {ticket.category || 'Uncategorized'}
                    </span>
                    <span style={{ 
                      fontSize: 12, 
                      color: '#6b7280', 
                      padding: '4px 10px',
                      background: '#f3f4f6',
                      borderRadius: 6,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}>
                      🕒 {fmtDate(ticket.createdAt)}
                    </span>
                  </div>
                </div>
                <div style={{ 
                  width: 8, 
                  height: 8, 
                  borderRadius: '50%', 
                  background: ticket.priority === 'CRITICAL' ? '#dc2626' : '#10b981',
                  animation: ticket.priority === 'CRITICAL' ? 'pulse 2s infinite' : 'none'
                }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Enhanced Detail Panel with Better UX */}
      {selectedTicket && (
        <>
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 999,
              animation: 'fadeIn 0.3s'
            }}
            onClick={() => setSelectedTicket(null)}
          />
          <div style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: 500,
            height: '100vh',
            background: '#ffffff',
            boxShadow: '-4px 0 25px rgba(0,0,0,0.15)',
            zIndex: 1000,
            overflow: 'auto',
            animation: 'slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}>
            <div style={{
              position: 'sticky',
              top: 0,
              background: '#fff',
              borderBottom: '1px solid #e5e7eb',
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              zIndex: 1
            }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>
                Ticket Details
              </h3>
              <button
                onClick={() => setSelectedTicket(null)}
                style={{
                  width: 32,
                  height: 32,
                  border: 'none',
                  background: '#f3f4f6',
                  cursor: 'pointer',
                  fontSize: 18,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e5e7eb';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f3f4f6';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              {/* Title */}
              <h2 style={{ margin: '0 0 16px', fontSize: 22, fontWeight: 800, color: '#111827', lineHeight: 1.3 }}>
                {selectedTicket.title}
              </h2>

              {/* Status Card */}
              <div style={{
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                padding: 16,
                marginBottom: 20,
              }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#6b7280', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Current Status
                </label>
                <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                  <StatusBadge status={selectedTicket.status} />
                  <PriorityBadge priority={selectedTicket.priority} />
                </div>

                {!TERMINAL_STATUSES.has(selectedTicket.status) && (
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#6b7280', marginBottom: 8, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Update Status
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1.5px solid #d1d5db',
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 500,
                        background: '#ffffff',
                        color: '#111827',
                        marginBottom: 10,
                        cursor: 'pointer'
                      }}
                    >
                      <option value="">-- Select Status --</option>
                      <option value="IN_PROGRESS">🔄 In Progress</option>
                      <option value="RESOLVED">✅ Resolved</option>
                      <option value="CLOSED">🔒 Closed</option>
                    </select>
                    {newStatus && (
                      <button
                        onClick={() => handleStatusChange(selectedTicket.id, newStatus)}
                        style={{
                          width: '100%',
                          padding: '10px 0',
                          background: '#3b82f6',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 8,
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontSize: 14,
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
                      >
                        Update Status
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Details Card */}
              <div style={{
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                padding: 16,
                marginBottom: 20,
                fontSize: 13,
              }}>
                <div style={{ marginBottom: 12 }}>
                  <strong style={{ color: '#374151' }}>Category:</strong>
                  <span style={{ marginLeft: 8, color: '#6b7280' }}>{selectedTicket.category || 'N/A'}</span>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <strong style={{ color: '#374151' }}>Created:</strong>
                  <span style={{ marginLeft: 8, color: '#6b7280' }}>{fmtDate(selectedTicket.createdAt)}</span>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <strong style={{ color: '#374151' }}>Reported by:</strong>
                  <span style={{ marginLeft: 8, color: '#6b7280' }}>{selectedTicket.reportedByName || 'N/A'}</span>
                </div>
                <div>
                  <strong style={{ color: '#374151', display: 'block', marginBottom: 8 }}>Description:</strong>
                  <p style={{ margin: 0, color: '#4b5563', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {selectedTicket.description}
                  </p>
                </div>
              </div>

              {/* Comments Section */}
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ 
                  margin: '0 0 12px', 
                  fontSize: 14, 
                  fontWeight: 800, 
                  color: '#111827', 
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  💬 Comments
                  <span style={{
                    fontSize: 11,
                    background: '#f3f4f6',
                    padding: '2px 8px',
                    borderRadius: 12,
                    color: '#6b7280'
                  }}>
                    {selectedTicket.comments?.length || 0}
                  </span>
                </h3>
                <div style={{
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: 12,
                  padding: 16,
                  maxHeight: 300,
                  overflow: 'auto',
                  marginBottom: 16,
                }}>
                  {selectedTicket.comments?.length === 0 ? (
                    <p style={{ margin: 0, color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: 20 }}>
                      No comments yet
                    </p>
                  ) : (
                    selectedTicket.comments?.map((cmt, idx) => (
                      <div key={idx} style={{ 
                        marginBottom: idx < selectedTicket.comments.length - 1 ? 16 : 0,
                        paddingBottom: idx < selectedTicket.comments.length - 1 ? 16 : 0,
                        borderBottom: idx < selectedTicket.comments.length - 1 ? '1px solid #e5e7eb' : 'none'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#111827' }}>
                            {cmt.authorName || 'Unknown'}
                          </p>
                          <p style={{ margin: 0, fontSize: 10, color: '#9ca3af' }}>
                            {fmtDate(cmt.createdAt)}
                          </p>
                        </div>
                        <p style={{ margin: 0, fontSize: 13, color: '#4b5563', lineHeight: 1.5 }}>
                          {cmt.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {!TERMINAL_STATUSES.has(selectedTicket.status) && (
                  <div>
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Write a comment..."
                      style={{
                        width: '100%',
                        height: 100,
                        padding: 12,
                        border: '1.5px solid #d1d5db',
                        borderRadius: 8,
                        fontSize: 13,
                        fontFamily: 'Inter, sans-serif',
                        resize: 'vertical',
                        marginBottom: 10,
                      }}
                    />
                    <button
                      onClick={() => handleAddComment(selectedTicket.id)}
                      disabled={!newComment.trim()}
                      style={{
                        width: '100%',
                        padding: '10px 0',
                        background: newComment.trim() ? '#059669' : '#d1d5db',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        fontWeight: 700,
                        cursor: newComment.trim() ? 'pointer' : 'not-allowed',
                        fontSize: 14,
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (newComment.trim()) e.currentTarget.style.background = '#047857';
                      }}
                      onMouseLeave={(e) => {
                        if (newComment.trim()) e.currentTarget.style.background = '#059669';
                      }}
                    >
                      Post Comment
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes fadeInUp {
          from { 
            opacity: 0; 
            transform: translateY(20px);
          }
          to { 
            opacity: 1; 
            transform: translateY(0);
          }
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}

export default TechnicianDashboard;