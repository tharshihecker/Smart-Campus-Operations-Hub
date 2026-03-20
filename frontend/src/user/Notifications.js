import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification } from '../api';

const TYPE_ICONS = {
  BOOKING_APPROVED: { icon: '✅', color: '#10b981' },
  BOOKING_REJECTED: { icon: '❌', color: '#ef4444' },
  BOOKING_CANCELLED: { icon: '🚫', color: '#f59e0b' },
  TICKET_STATUS_CHANGED: { icon: '🔧', color: '#38bdf8' },
  TICKET_COMMENT_ADDED: { icon: '💬', color: '#8b5cf6' },
  TICKET_ASSIGNED: { icon: '👤', color: '#f59e0b' },
  SYSTEM: { icon: '📢', color: '#94a3b8' },
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
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
    try {
      await deleteNotification(id);
      setNotifications(prev => prev.filter(x => x.id !== id));
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 20, marginBottom: 28 }}>
        <div>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '2rem', color: 'var(--text-primary)', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
            Notifications
            {unreadCount > 0 && (
              <span style={{ background: 'var(--brand-teal)', color: '#0f172a', borderRadius: 999, padding: '2px 12px', fontSize: '0.9rem', fontWeight: 800 }}>
                {unreadCount} new
              </span>
            )}
          </h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem' }}>Stay updated on your bookings and incident tickets.</p>
        </div>
        <div>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} style={{
              background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: 8, padding: '8px 16px', color: '#38bdf8', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s'
            }} onMouseEnter={e => e.currentTarget.style.background='rgba(56,189,248,0.2)'} onMouseLeave={e => e.currentTarget.style.background='rgba(56,189,248,0.1)'}>
              ✓ Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 32 }}>
        {['ALL', 'UNREAD', 'READ'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '8px 20px', borderRadius: 999, border: '1px solid',
            background: filter === f ? 'var(--bg-card-hover)' : 'transparent',
            borderColor: filter === f ? 'var(--border-medium)' : 'var(--border-subtle)',
            color: filter === f ? 'var(--text-primary)' : 'var(--text-secondary)',
            cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, transition: 'all 0.2s'
          }}>{f.charAt(0) + f.slice(1).toLowerCase()}</button>
        ))}
      </div>

      {loading ? (
        <div className="state-text">Loading notifications...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px 20px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-xl)', border: '1px dashed var(--border-medium)' }}>
          <p style={{ fontSize: '3rem', margin: '0 0 16px' }}>📭</p>
          <p style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
            {filter === 'UNREAD' ? "You're all caught up!" : "No notifications yet."}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {['Today', 'Yesterday', 'Earlier'].map(groupName => {
            const items = groups[groupName];
            if (!items.length) return null;
            return (
              <div key={groupName}>
                <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', margin: '0 0 16px', paddingLeft: 8 }}>
                  {groupName}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {items.map(n => {
                    const meta = TYPE_ICONS[n.type] || TYPE_ICONS.SYSTEM;
                    return (
                      <div key={n.id} onClick={() => handleRead(n)} style={{
                        display: 'flex', gap: 18, alignItems: 'flex-start',
                        background: n.read ? 'var(--bg-glass)' : 'rgba(13,148,136,0.06)',
                        border: '1px solid',
                        borderColor: n.read ? 'var(--border-subtle)' : 'rgba(13,148,136,0.3)',
                        borderRadius: 'var(--radius-lg)', padding: '18px 20px',
                        cursor: 'pointer', transition: 'all 0.2s', position: 'relative'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateX(4px)';
                        e.currentTarget.style.borderColor = n.read ? 'var(--border-medium)' : 'var(--brand-teal)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.borderColor = n.read ? 'var(--border-subtle)' : 'rgba(13,148,136,0.3)';
                      }}
                      >
                        {!n.read && <div style={{ position: 'absolute', top: 26, left: -6, width: 12, height: 12, borderRadius: '50%', background: 'var(--brand-teal)', boxShadow: '0 0 10px var(--brand-teal)' }} />}
                        
                        <div style={{ fontSize: '1.8rem', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: 12, flexShrink: 0 }}>
                          {meta.icon}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 6 }}>
                            <p style={{ fontWeight: 700, color: n.read ? 'var(--text-secondary)' : 'var(--text-primary)', margin: 0, fontSize: '1rem', lineHeight: 1.3 }}>
                              {n.title}
                            </p>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 0 10px', lineHeight: 1.5 }}>
                            {n.message}
                          </p>
                          {n.referenceType && (
                            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 800, color: meta.color, background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 4 }}>
                              {n.referenceType}
                            </span>
                          )}
                        </div>

                        <button onClick={e => handleDelete(n.id, e)} style={{
                          background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', padding: '4px', borderRadius: 6, flexShrink: 0, transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none'; }}
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
    </div>
  );
}
