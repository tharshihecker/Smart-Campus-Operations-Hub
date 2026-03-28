import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification } from '../api';

/* ─── Inject scoped styles (white-card, same look as Incidents page) ─── */
const NOTIF_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  .notif-root * { font-family: 'Inter', sans-serif !important; box-sizing: border-box; }
  .notif-card { transition: box-shadow 0.2s, transform 0.18s, border-color 0.2s; }
  .notif-card:hover { box-shadow: 0 6px 24px rgba(37,99,235,0.12); transform: translateX(4px); border-color: #2563eb !important; }
  .notif-card-unread { border-left: 4px solid #2563eb !important; }
  .notif-filter-btn { transition: all 0.18s; }
  .notif-filter-btn:hover { filter: brightness(0.95); }
  .notif-del-btn { transition: all 0.18s; }
  .notif-del-btn:hover { color: #dc2626 !important; background: #fef2f2 !important; }
  @keyframes notifPulse { 0%,100%{opacity:1;} 50%{opacity:0.45;} }
  @keyframes notifSlideIn { from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);} }
  .notif-slide { animation: notifSlideIn 0.3s ease-out; }
  .notif-skeleton { animation: notifPulse 1.8s infinite; }
`;
function useNotifStyle() {
  useEffect(() => {
    if (document.getElementById('notif-styles')) return;
    const tag = document.createElement('style');
    tag.id = 'notif-styles';
    tag.textContent = NOTIF_STYLE;
    document.head.appendChild(tag);
  }, []);
}

const TYPE_META = {
  BOOKING_APPROVED:   { icon: '✅', color: '#059669', bg: '#ecfdf5', label: 'Booking' },
  BOOKING_REJECTED:   { icon: '❌', color: '#dc2626', bg: '#fef2f2', label: 'Booking' },
  BOOKING_CANCELLED:  { icon: '🚫', color: '#d97706', bg: '#fffbeb', label: 'Booking' },
  TICKET_STATUS_CHANGED: { icon: '🔧', color: '#2563eb', bg: '#eff6ff', label: 'Ticket' },
  TICKET_COMMENT_ADDED:  { icon: '💬', color: '#7c3aed', bg: '#f5f3ff', label: 'Ticket' },
  TICKET_ASSIGNED:    { icon: '👤', color: '#d97706', bg: '#fffbeb', label: 'Ticket' },
  USER_COMMENT:       { icon: '💬', color: '#0891b2', bg: '#ecfeff', label: 'Message' },
  SYSTEM:             { icon: '📢', color: '#4b5563', bg: '#f9fafb', label: 'System'  },
};

function fmtTime(val) {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d)) return '';
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
function fmtDate(val) {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ─── Skeleton ─── */
function NotifSkeleton() {
  return (
    <div className="notif-skeleton" style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '18px 20px', borderRadius: 12, background: '#ffffff', border: '1.5px solid #e5e7eb', marginBottom: 10 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f3f4f6', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ height: 14, width: '55%', borderRadius: 6, background: '#f3f4f6' }} />
        <div style={{ height: 12, width: '80%', borderRadius: 6, background: '#f9fafb' }} />
        <div style={{ height: 11, width: '35%', borderRadius: 6, background: '#f9fafb' }} />
      </div>
    </div>
  );
}

export default function Notifications({ isAdmin = false }) {
  useNotifStyle();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('UNREAD');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try { setNotifications(await fetchNotifications()); }
    catch { setNotifications([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* auto-refresh every 30 s */
  useEffect(() => {
    const id = setInterval(() => {
      fetchNotifications().then(data => { setNotifications(data); window.dispatchEvent(new Event('updateNotifCount')); }).catch(() => {});
    }, 30000);
    return () => clearInterval(id);
  }, []);

  const handleRead = async (n) => {
    if (!n.read) {
      try {
        await markNotificationRead(n.id);
        setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
        window.dispatchEvent(new Event('updateNotifCount'));
      } catch {}
    }
    if (n.referenceType === 'BOOKING') navigate(isAdmin ? '/admin/bookings' : '/my-bookings');
    else if (n.referenceType === 'TICKET') navigate(isAdmin ? '/admin/incidents' : '/incidents');
  };

  const handleDelete = (id, e) => { e.stopPropagation(); setDeleteConfirm(id); };

  const confirmDelete = async () => {
    try {
      await deleteNotification(deleteConfirm);
      setNotifications(prev => prev.filter(x => x.id !== deleteConfirm));
      setDeleteConfirm(null);
      window.dispatchEvent(new Event('updateNotifCount'));
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications(prev => prev.map(x => ({ ...x, read: true })));
      window.dispatchEvent(new Event('updateNotifCount'));
    } catch {}
  };

  const filtered = filter === 'ALL'    ? notifications
                 : filter === 'UNREAD' ? notifications.filter(n => !n.read)
                 : notifications.filter(n => n.read);

  const unreadCount = notifications.filter(n => !n.read).length;

  /* Group by date */
  const groups = { 'Today': [], 'Yesterday': [], 'Earlier': [] };
  const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0);
  const yestMidnight  = new Date(todayMidnight); yestMidnight.setDate(yestMidnight.getDate() - 1);
  filtered.forEach(n => {
    const d = new Date(n.createdAt);
    if (d >= todayMidnight) groups['Today'].push(n);
    else if (d >= yestMidnight) groups['Yesterday'].push(n);
    else groups['Earlier'].push(n);
  });

  const filterOpts = [
    { key: 'ALL',    label: `All (${notifications.length})` },
    { key: 'UNREAD', label: `Unread (${unreadCount})` },
    { key: 'READ',   label: `Read (${notifications.length - unreadCount})` },
  ];

  return (
    <div className="notif-root" style={{ maxWidth: 860, margin: '0 auto', padding: '32px 16px', background: '#f9fafb', minHeight: '100vh' }}>

      {/* ── Header ── */}
      <div style={{ background: '#ffffff', borderRadius: 16, padding: '24px 28px', marginBottom: 24, border: '1.5px solid #e5e7eb', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.7rem', fontWeight: 900, color: '#111827', display: 'flex', alignItems: 'center', gap: 10 }}>
              🔔 Notifications
              {unreadCount > 0 && (
                <span style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', borderRadius: 999, padding: '3px 13px', fontSize: '0.85rem', fontWeight: 800, boxShadow: '0 3px 10px rgba(37,99,235,0.3)' }}>
                  {unreadCount} new
                </span>
              )}
            </h2>
            <p style={{ marginTop: 6, fontSize: '0.95rem', fontWeight: 600, color: '#374151' }}>
              Stay updated on your bookings and incident tickets
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={load} style={{ padding: '9px 16px', background: '#eff6ff', border: '1.5px solid #2563eb', borderRadius: 8, color: '#1d4ed8', cursor: 'pointer', fontWeight: 800, fontSize: 13 }}>
              ↻ Refresh
            </button>
            <button onClick={handleMarkAllRead} disabled={unreadCount === 0} style={{ padding: '9px 18px', background: unreadCount > 0 ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : '#f3f4f6', border: 'none', borderRadius: 8, color: unreadCount > 0 ? '#ffffff' : '#9ca3af', cursor: unreadCount > 0 ? 'pointer' : 'not-allowed', fontWeight: 700, fontSize: 13, boxShadow: unreadCount > 0 ? '0 4px 12px rgba(37,99,235,0.25)' : 'none' }}>
              ✓ Mark All as Read
            </button>
          </div>
        </div>
      </div>

      {/* ── Filter Tabs ── */}
      <div style={{ background: '#ffffff', borderRadius: 12, padding: '14px 18px', marginBottom: 20, border: '1.5px solid #e5e7eb', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {filterOpts.map(({ key, label }) => {
          const active = filter === key;
          return (
            <button key={key} className="notif-filter-btn" onClick={() => setFilter(key)} style={{
              padding: '7px 18px', borderRadius: 999, border: active ? '2px solid #2563eb' : '1.5px solid #d1d5db',
              background: active ? '#2563eb' : '#ffffff', color: active ? '#fff' : '#374151',
              cursor: 'pointer', fontSize: 12, fontWeight: 700,
            }}>
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[1, 2, 3].map(i => <NotifSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="notif-slide" style={{ textAlign: 'center', padding: '70px 20px', background: '#ffffff', border: '1.5px dashed #d1d5db', borderRadius: 14 }}>
          <p style={{ fontSize: '3.5rem', margin: '0 0 16px' }}>📭</p>
          <p style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 800, color: '#111827' }}>
            {filter === 'UNREAD' ? "You're all caught up!" : 'No notifications yet'}
          </p>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#4b5563', fontWeight: 600 }}>
            {filter === 'UNREAD' ? 'Great job staying on top of things!' : 'Notifications will appear here when something happens.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {['Today', 'Yesterday', 'Earlier'].map(groupName => {
            const items = groups[groupName];
            if (!items.length) return null;
            return (
              <div key={groupName}>
                {/* Group header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', fontWeight: 900 }}>{groupName}</span>
                  <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
                  <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 700 }}>{items.length} item{items.length !== 1 ? 's' : ''}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {items.map(n => {
                    const isEscalation = (n.title && n.title.includes('ESCALATION')) || (n.message && n.message.includes('ESCALATION REQUEST'));
                    const meta = isEscalation ? { icon: '🚨', color: '#dc2626', bg: '#fef2f2', label: 'Escalated' } : (TYPE_META[n.type] || TYPE_META.SYSTEM);
                    
                    return (
                      <div key={n.id} className={`notif-card notif-slide ${!n.read ? 'notif-card-unread' : ''}`}
                        onClick={() => handleRead(n)}
                        style={{
                          display: 'flex', gap: 14, alignItems: 'flex-start',
                          background: n.read ? '#ffffff' : (isEscalation ? '#fff5f5' : '#fafbff'),
                          border: `1.5px solid ${n.read ? '#e5e7eb' : (isEscalation ? '#fca5a5' : '#dbeafe')}`,
                          borderRadius: 12, padding: '16px 18px',
                          cursor: 'pointer', position: 'relative', overflow: 'hidden',
                        }}
                      >
                        {/* Unread dot */}
                        {!n.read && (
                          <div style={{ position: 'absolute', top: 20, left: n.type ? -5 : 8, width: 10, height: 10, borderRadius: '50%', background: isEscalation ? '#dc2626' : '#2563eb', boxShadow: `0 0 8px ${isEscalation ? 'rgba(220,38,38,0.5)' : 'rgba(37,99,235,0.5)'}` }} />
                        )}

                        {/* Icon */}
                        <div style={{ fontSize: '1.5rem', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: meta.bg, borderRadius: 12, flexShrink: 0, border: `1.5px solid ${meta.color}22` }}>
                          <span className={isEscalation && !n.read ? 'inc-priority-pulse' : ''}>{meta.icon}</span>
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 5 }}>
                            <p style={{ fontWeight: n.read ? 700 : 800, color: isEscalation && !n.read ? '#991b1b' : (n.read ? '#374151' : '#111827'), margin: 0, fontSize: '0.95rem', lineHeight: 1.4 }}>
                              {n.title}
                            </p>
                            <span style={{ color: '#9ca3af', fontSize: '0.75rem', whiteSpace: 'nowrap', fontWeight: 600 }}>
                              {fmtTime(n.createdAt)}
                            </span>
                          </div>
                          <p style={{ color: isEscalation && !n.read ? '#b91c1c' : (n.read ? '#6b7280' : '#374151'), fontSize: '0.88rem', margin: '0 0 8px', lineHeight: 1.5, fontWeight: isEscalation && !n.read ? 700 : 600 }}>
                            {n.message}
                          </p>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800, color: meta.color, background: meta.bg, padding: '2px 9px', borderRadius: 4, border: `1px solid ${meta.color}33` }}>
                              {meta.label}
                            </span>
                            {!n.read && (
                              <span style={{ fontSize: 10, fontWeight: 800, color: isEscalation ? '#dc2626' : '#2563eb', background: isEscalation ? '#fee2e2' : '#eff6ff', padding: '2px 7px', borderRadius: 4 }}>
                                ● Unread
                              </span>
                            )}
                            <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600 }}>{fmtDate(n.createdAt)}</span>
                          </div>
                        </div>

                        {/* Delete btn */}
                        <button className="notif-del-btn" onClick={e => handleDelete(n.id, e)} title="Delete"
                          style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', color: '#6b7280', cursor: 'pointer', fontSize: '1rem', padding: '6px 9px', borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

      {/* ── Delete Confirm Modal ── */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#ffffff', borderRadius: 14, padding: '28px 28px', maxWidth: 360, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827', margin: '0 0 8px' }}>Delete notification?</p>
            <p style={{ fontSize: '0.9rem', color: '#4b5563', margin: '0 0 22px', fontWeight: 600 }}>This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1.5px solid #d1d5db', background: '#ffffff', color: '#111827', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem' }}>
                Cancel
              </button>
              <button onClick={confirmDelete} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: '#dc2626', color: '#ffffff', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', boxShadow: '0 4px 12px rgba(220,38,38,0.25)' }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
