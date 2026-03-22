import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification } from '../api';

const TYPE_ICONS = {
  BOOKING_APPROVED: { icon: '✅', color: '#10b981', priority: 'high' },
  BOOKING_REJECTED: { icon: '❌', color: '#ef4444', priority: 'high' },
  BOOKING_CANCELLED: { icon: '🚫', color: '#f59e0b', priority: 'medium' },
  TICKET_STATUS_CHANGED: { icon: '🔧', color: '#38bdf8', priority: 'medium' },
  TICKET_COMMENT_ADDED: { icon: '💬', color: '#8b5cf6', priority: 'low' },
  TICKET_ASSIGNED: { icon: '👤', color: '#f59e0b', priority: 'high' },
  SYSTEM: { icon: '📢', color: '#94a3b8', priority: 'low' },
};

// Skeleton loader component
const NotificationSkeleton = () => (
  <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', padding: '18px 20px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', animation: 'pulse 2s infinite' }}>
    <div style={{ width: 44, height: 44, borderRadius: 12, background: '#e2e8f0' }} />
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ height: 16, width: '60%', borderRadius: 6, background: '#e2e8f0' }} />
      <div style={{ height: 12, width: '85%', borderRadius: 6, background: '#f1f5f9' }} />
      <div style={{ height: 12, width: '40%', borderRadius: 6, background: '#f1f5f9' }} />
    </div>
  </div>
);

// Helper to get RGB values for color
const getColorRGB = (color) => {
  const colorMap = {
    '#10b981': '16, 185, 129',
    '#ef4444': '239, 68, 68',
    '#f59e0b': '245, 158, 11',
    '#38bdf8': '56, 189, 248',
    '#8b5cf6': '139, 92, 246',
  };
  return colorMap[color] || '139, 92, 246';
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try { setNotifications(await fetchNotifications()); }
    catch { setNotifications([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRead = async (n) => {
    if (!n.read) {
      try {
        await markNotificationRead(n.id);
        setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
      } catch {}
    }
    if (n.referenceType === 'BOOKING') navigate('/my-bookings');
    else if (n.referenceType === 'TICKET') navigate('/incidents');
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    setDeleteConfirm(id);
  };

  const confirmDelete = async () => {
    try {
      await deleteNotification(deleteConfirm);
      setNotifications(prev => prev.filter(x => x.id !== deleteConfirm));
      setDeleteConfirm(null);
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications(prev => prev.map(x => ({ ...x, read: true })));
    } catch {}
  };

  const filtered = filter === 'ALL' ? notifications
                 : filter === 'UNREAD' ? notifications.filter(n => !n.read)
                 : notifications.filter(n => n.read);

  const unreadCount = notifications.filter(n => !n.read).length;

  /* ── Group Notifications by Date ── */
  const groups = { 'Today': [], 'Yesterday': [], 'Earlier': [] };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  filtered.forEach(n => {
    const d = new Date(n.createdAt);
    if (d >= today) groups['Today'].push(n);
    else if (d >= yesterday) groups['Yesterday'].push(n);
    else groups['Earlier'].push(n);
  });

  return (
    <div style={{ maxWidth: 840, margin: '0 auto', padding: '40px 20px', minHeight: '80vh' }}>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .notification-card { animation: slideIn 0.3s ease-out; }
        .empty-state { animation: fadeIn 0.4s ease-out; }
        .filter-btn-active { animation: fadeIn 0.2s ease-out; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid #e2e8f0', paddingBottom: 20, marginBottom: 28 }}>
        <div>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '2rem', color: '#0f172a', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 12, fontWeight: 700 }}>
            Notifications
            {unreadCount > 0 && (
              <span style={{ background: 'linear-gradient(135deg, #4f8cff 0%, #0052cc 100%)', color: '#ffffff', borderRadius: 999, padding: '4px 14px', fontSize: '0.9rem', fontWeight: 800, boxShadow: '0 4px 12px rgba(79, 140, 255, 0.3)' }}>
                {unreadCount} new
              </span>
            )}
          </h2>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>Stay updated on your bookings and incident tickets.</p>
        </div>
        <div>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} style={{
              background: 'linear-gradient(135deg, #4f8cff 0%, #0052cc 100%)', border: 'none', borderRadius: 8, padding: '10px 18px', color: '#ffffff', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(79, 140, 255, 0.2)'
            }} onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 16px rgba(79, 140, 255, 0.35)'; e.currentTarget.style.transform = 'translateY(-2px)'; }} onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(79, 140, 255, 0.2)'; e.currentTarget.style.transform = 'none'; }}>
              ✓ Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 32, background: '#f8fafc', padding: 6, borderRadius: 12, width: 'fit-content' }}>
        {['ALL', 'UNREAD', 'READ'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '10px 22px', borderRadius: 8, border: 'none',
            background: filter === f ? '#ffffff' : 'transparent',
            color: filter === f ? '#0052cc' : '#64748b',
            cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, transition: 'all 0.2s',
            boxShadow: filter === f ? '0 2px 8px rgba(0, 82, 204, 0.12)' : 'none'
          }} title={`Filter by ${f.toLowerCase()} notifications`}>
            {f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1, 2, 3].map(i => <NotificationSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state" style={{ textAlign: 'center', padding: '80px 20px', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderRadius: 'var(--radius-xl)', border: '2px dashed #cbd5e1' }}>
          <p style={{ fontSize: '4rem', margin: '0 0 16px' }}>📭</p>
          <p style={{ margin: '0 0 8px', fontSize: '1.3rem', fontWeight: 600, color: '#0f172a' }}>
            {filter === 'UNREAD' ? "You're all caught up!" : "No notifications yet."}
          </p>
          <p style={{ margin: 0, fontSize: '0.95rem', color: '#64748b', maxWidth: 380, marginLeft: 'auto', marginRight: 'auto' }}>
            {filter === 'UNREAD' ? 'Great job staying on top of things!' : 'When something happens with your bookings or tickets, you will see it here.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {['Today', 'Yesterday', 'Earlier'].map(groupName => {
            const items = groups[groupName];
            if (!items.length) return null;
            return (
              <div key={groupName}>
                <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', margin: '0 0 16px', paddingLeft: 12, fontWeight: 900, opacity: 0.7 }}>
                  {groupName}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {items.map(n => {
                    const meta = TYPE_ICONS[n.type] || TYPE_ICONS.SYSTEM;
                    return (
                      <div key={n.id} className="notification-card" onClick={() => handleRead(n)} style={{
                        display: 'flex', gap: 18, alignItems: 'flex-start',
                        background: n.read ? 'var(--bg-glass)' : 'linear-gradient(135deg, rgba(13,148,136,0.04) 0%, rgba(59,130,246,0.02) 100%)',
                        border: '1px solid',
                        borderColor: n.read ? 'var(--border-subtle)' : 'rgba(13,148,136,0.2)',
                        borderRadius: 'var(--radius-lg)', padding: '18px 20px',
                        cursor: 'pointer', transition: 'all 0.2s', position: 'relative',
                        overflow: 'hidden'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateX(4px)';
                        e.currentTarget.style.borderColor = n.read ? 'var(--border-medium)' : 'var(--brand-teal)';
                        e.currentTarget.style.background = n.read ? 'rgba(248, 250, 252, 0.8)' : 'linear-gradient(135deg, rgba(13,148,136,0.08) 0%, rgba(59,130,246,0.04) 100%)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.borderColor = n.read ? 'var(--border-subtle)' : 'rgba(13,148,136,0.2)';
                        e.currentTarget.style.background = n.read ? 'var(--bg-glass)' : 'linear-gradient(135deg, rgba(13,148,136,0.04) 0%, rgba(59,130,246,0.02) 100%)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      >
                        {/* Unread indicator */}
                        {!n.read && <div style={{ position: 'absolute', top: 26, left: -6, width: 12, height: 12, borderRadius: '50%', background: 'var(--brand-teal)', boxShadow: '0 0 10px var(--brand-teal)', animation: 'pulse 2s infinite' }} />}
                        
                        {/* Icon container */}
                        <div style={{ fontSize: '1.8rem', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `rgba(${getColorRGB(meta.color)}, 0.1)`, borderRadius: 12, flexShrink: 0 }}>
                          {meta.icon}
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                            <p style={{ fontWeight: n.read ? 600 : 700, color: n.read ? '#64748b' : '#0f172a', margin: 0, fontSize: '0.95rem', lineHeight: 1.4 }}>
                              {n.title}
                            </p>
                            <span style={{ color: '#94a3b8', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p style={{ color: n.read ? '#94a3b8' : '#475569', fontSize: '0.9rem', margin: '0 0 10px', lineHeight: 1.5 }}>
                            {n.message}
                          </p>
                          {n.referenceType && (
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800, color: meta.color, background: `rgba(${getColorRGB(meta.color)}, 0.15)`, padding: '3px 9px', borderRadius: 4, fontFamily: "'Outfit', sans-serif" }}>
                                {n.referenceType}
                              </span>
                              {meta.priority && (
                                <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700, color: meta.priority === 'high' ? '#ef4444' : meta.priority === 'medium' ? '#f59e0b' : '#94a3b8', opacity: 0.6 }}>
                                  {meta.priority === 'high' ? '⚡ High' : meta.priority === 'medium' ? '→ Medium' : '○ Low'}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Delete button */}
                        <button onClick={e => handleDelete(n.id, e)} style={{
                          background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem', padding: '4px 8px', borderRadius: 6, flexShrink: 0, transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'none'; }}
                        title="Delete Notification"
                        >
                          🗑
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)', animation: 'fadeIn 0.2s ease-out' }}>
          <div style={{ background: '#ffffff', borderRadius: 'var(--radius-xl)', padding: '32px', maxWidth: 360, boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)', animation: 'slideIn 0.3s ease-out' }}>
            <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 12px' }}>Delete notification?</p>
            <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '0 0 24px' }}>This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{
                flex: 1, padding: '10px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', transition: 'all 0.2s'
              }} onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#94a3b8'; }} onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}>
                Cancel
              </button>
              <button onClick={confirmDelete} style={{
                flex: 1, padding: '10px 16px', borderRadius: 8, border: 'none', background: '#ef4444', color: '#ffffff', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
              }} onMouseEnter={e => { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(239, 68, 68, 0.35)'; e.currentTarget.style.transform = 'translateY(-2px)'; }} onMouseLeave={e => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.2)'; e.currentTarget.style.transform = 'none'; }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
