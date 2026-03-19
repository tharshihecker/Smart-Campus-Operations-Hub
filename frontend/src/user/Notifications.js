import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchNotifications, markNotificationRead,
  markAllNotificationsRead, deleteNotification
} from '../api';

const TYPE_ICONS = {
  BOOKING_APPROVED: { icon: '✅', color: '#10b981' },
  BOOKING_REJECTED: { icon: '❌', color: '#ef4444' },
  BOOKING_CANCELLED: { icon: '🚫', color: '#f59e0b' },
  TICKET_STATUS_CHANGED: { icon: '🔧', color: '#3b82f6' },
  TICKET_COMMENT_ADDED: { icon: '💬', color: '#8b5cf6' },
  TICKET_ASSIGNED: { icon: '👤', color: '#f59e0b' },
  SYSTEM: { icon: '📢', color: '#64748b' },
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
      try { await markNotificationRead(n.id); setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x)); }
      catch {}
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

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h2 style={{ color: '#e2e8f0', margin: 0 }}>
            Notifications
            {unreadCount > 0 && (
              <span style={{ marginLeft: 10, background: '#7c3aed', color: '#fff', borderRadius: 999, padding: '2px 10px', fontSize: 14 }}>
                {unreadCount}
              </span>
            )}
          </h2>
          <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>Stay updated on your bookings and incident tickets</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} style={{
            background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.4)',
            borderRadius: 8, padding: '8px 18px', color: '#8b5cf6', cursor: 'pointer', fontWeight: 600, fontSize: 13
          }}>Mark All Read</button>
        )}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['ALL', 'UNREAD', 'READ'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '7px 16px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.12)',
            background: filter === f ? '#7c3aed' : 'rgba(255,255,255,0.04)',
            color: filter === f ? '#fff' : '#94a3b8', cursor: 'pointer', fontSize: 13, fontWeight: 600
          }}>{f}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: '#64748b', padding: 60 }}>Loading notifications...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#64748b', padding: 60, border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 12 }}>
          <p style={{ fontSize: 40, margin: 0 }}>🔔</p>
          <p style={{ marginTop: 8 }}>{filter === 'UNREAD' ? 'No unread notifications!' : 'No notifications yet.'}</p>
        </div>
      ) : (
        <div>
          {filtered.map(n => {
            const meta = TYPE_ICONS[n.type] || TYPE_ICONS.SYSTEM;
            return (
              <div key={n.id} onClick={() => handleRead(n)} style={{
                display: 'flex', gap: 14, alignItems: 'flex-start',
                background: n.read ? 'rgba(255,255,255,0.02)' : 'rgba(139,92,246,0.06)',
                border: `1px solid ${n.read ? 'rgba(255,255,255,0.06)' : 'rgba(139,92,246,0.2)'}`,
                borderRadius: 12, padding: '14px 16px', marginBottom: 10,
                cursor: 'pointer', transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(139,92,246,0.4)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = n.read ? 'rgba(255,255,255,0.06)' : 'rgba(139,92,246,0.2)'}
              >
                <div style={{ fontSize: 24, width: 40, textAlign: 'center' }}>{meta.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                    <p style={{ fontWeight: 700, color: '#e2e8f0', margin: 0, fontSize: 14 }}>{n.title}</p>
                    {!n.read && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#7c3aed', flexShrink: 0, marginTop: 5 }} />}
                  </div>
                  <p style={{ color: '#94a3b8', fontSize: 13, margin: '0 0 6px' }}>{n.message}</p>
                  <p style={{ color: '#475569', fontSize: 11, margin: 0 }}>
                    {new Date(n.createdAt).toLocaleString()}
                    {n.referenceType && <span style={{ marginLeft: 8, color: meta.color }}>→ {n.referenceType}</span>}
                  </p>
                </div>
                <button onClick={e => handleDelete(n.id, e)} style={{
                  background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 16, padding: '2px 6px', borderRadius: 4, flexShrink: 0
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                onMouseLeave={e => e.currentTarget.style.color = '#475569'}
                title="Delete">🗑</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
