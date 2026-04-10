import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification } from '../api';
import './Notifications.css';

const TYPE_META = {
  BOOKING_APPROVED: { icon: '✅', color: 'var(--brand-accent)', bg: 'rgba(16,185,129,0.1)', label: 'Booking' },
  BOOKING_REJECTED: { icon: '❌', color: 'var(--brand-danger)', bg: 'rgba(239,68,68,0.1)', label: 'Booking' },
  BOOKING_CANCELLED: { icon: '🚫', color: 'var(--brand-warning)', bg: 'rgba(245,158,11,0.1)', label: 'Booking' },
  TICKET_STATUS_CHANGED: { icon: '🔧', color: 'var(--brand-blue)', bg: 'rgba(59,130,246,0.1)', label: 'Ticket' },
  TICKET_COMMENT_ADDED: { icon: '💬', color: 'var(--brand-purple)', bg: 'rgba(139,92,246,0.1)', label: 'Ticket' },
  TICKET_ASSIGNED: { icon: '👤', color: 'var(--brand-warning)', bg: 'rgba(245,158,11,0.1)', label: 'Ticket' },
  USER_COMMENT: { icon: '💬', color: 'var(--brand-teal)', bg: 'rgba(14,165,233,0.1)', label: 'Message' },
  SYSTEM: { icon: '📢', color: 'var(--text-muted)', bg: 'var(--bg-surface)', label: 'System' },
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
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
}

/* ─── Skeleton ─── */
function NotifSkeleton() {
  return (
    <div className="notif-card notif-skeleton">
      <div className="notif-icon-box" style={{ background: '#f1f5f9' }} />
      <div className="notif-content">
        <div style={{ height: '14px', width: '40%', background: '#f1f5f9', borderRadius: '4px', marginBottom: '8px' }} />
        <div style={{ height: '12px', width: '85%', background: '#f8fafc', borderRadius: '4px', marginBottom: '4px' }} />
        <div style={{ height: '12px', width: '60%', background: '#f8fafc', borderRadius: '4px' }} />
      </div>
    </div>
  );
}

export default function Notifications({ isAdmin = false }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('UNREAD');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [qrModal, setQrModal] = useState(null);
  const navigate = useNavigate();
  const userRole = localStorage.getItem('smartcampus_user_role') || 'USER';

  const load = useCallback(async () => {
    setLoading(true);
    try { setNotifications(await fetchNotifications()); }
    catch { setNotifications([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const id = setInterval(() => {
      fetchNotifications().then(data => { 
        setNotifications(data); 
        window.dispatchEvent(new Event('updateNotifCount')); 
      }).catch(() => { });
    }, 15000);
    return () => clearInterval(id);
  }, []);

  const handleRead = async (n) => {
    if (!n.read) {
      try {
        await markNotificationRead(n.id);
        setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
        window.dispatchEvent(new Event('updateNotifCount'));
      } catch { }
    }
    const token = n.qrToken || (n.message && (n.message.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/) || [null])[0]);
    if (token) {
      setQrModal({ token, title: n.title, message: n.message });
      return;
    }
    if (n.referenceType === 'BOOKING' || n.referenceType === 'event_booking') navigate(isAdmin ? '/admin/bookings' : '/my-bookings');
    else if (n.referenceType === 'WAITLIST_OPEN') {
      navigate(`/facilities?highlight=${n.referenceId}&book=true`);
    }
    else if (n.referenceType === 'TICKET') {
      let base = isAdmin ? '/admin/incidents' : (userRole === 'TECHNICIAN' ? '/technician-dashboard' : '/incidents');
      const ticketParam = n.referenceId ? `?ticketId=${n.referenceId}` : '';
      navigate(`${base}${ticketParam}`);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications(prev => prev.map(x => ({ ...x, read: true })));
      window.dispatchEvent(new Event('updateNotifCount'));
    } catch { }
  };

  const filtered = (filter === 'ALL' ? notifications
    : filter === 'UNREAD' ? notifications.filter(n => !n.read)
      : notifications.filter(n => n.read)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const unreadCount = notifications.filter(n => !n.read).length;

  const groups = { 'Today': [], 'Yesterday': [], 'Earlier': [] };
  const todayMid = new Date(); todayMid.setHours(0, 0, 0, 0);
  const yestMid = new Date(todayMid); yestMid.setDate(yestMid.getDate() - 1);
  filtered.forEach(n => {
    const d = new Date(n.createdAt);
    if (d >= todayMid) groups['Today'].push(n);
    else if (d >= yestMid) groups['Yesterday'].push(n);
    else groups['Earlier'].push(n);
  });

  return (
    <div className="notif-root">
      <div className="notif-container">
        
        {/* ── Header Card ── */}
        <div className="notif-header">
           <h2>{isAdmin ? 'System Logs' : 'My Notifications'}</h2>
           <p>Stay updated on your {isAdmin ? 'admin alerts and system events' : 'campus life, bookings, and help tickets'}.</p>
        </div>

        {/* ── Toolbar ── */}
        <div className="notif-toolbar">
          <div className="notif-filters">
            {['ALL', 'UNREAD', 'READ'].map(key => (
              <button 
                key={key} 
                className={`notif-filter-btn ${filter === key ? 'active' : ''}`}
                onClick={() => setFilter(key)}
              >
                {key.charAt(0) + key.slice(1).toLowerCase()}
                {key === 'UNREAD' && unreadCount > 0 && ` (${unreadCount})`}
              </button>
            ))}
          </div>
          <div className="notif-actions">
            <button className="notif-btn-secondary" onClick={load}>↻ Refresh</button>
            <button 
              className="notif-btn-secondary" 
              onClick={handleMarkAllRead} 
              disabled={unreadCount === 0}
            >
              ✓ Mark All Read
            </button>
          </div>
        </div>

        {/* ── List Content ── */}
        {loading ? (
          <div className="notif-skeleton-list">
            {[1, 2, 3].map(i => <NotifSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="notif-empty notif-slide">
            <span className="notif-empty-icon">📭</span>
            <h3>No notifications here</h3>
            <p>We'll alert you when there's an update on your requests.</p>
          </div>
        ) : (
          <div className="notif-list">
            {['Today', 'Yesterday', 'Earlier'].map(groupName => {
              const items = groups[groupName];
              if (!items.length) return null;
              return (
                <div key={groupName} className="notif-group">
                  <h4 className="notif-group-title">{groupName}</h4>
                  {items.map(n => {
                    const isEscalation = n.title?.includes('ESCALATION');
                    const meta = isEscalation ? { icon: '🚨', color: '#dc2626', bg: '#fef2f2', label: 'Urgent' } : (TYPE_META[n.type] || TYPE_META.SYSTEM);

                    return (
                      <div 
                        key={n.id} 
                        className={`notif-card notif-slide ${!n.read ? 'notif-card-unread' : ''}`}
                        onClick={() => handleRead(n)}
                      >
                        {!n.read && <div className="notif-unread-accent" />}
                        <div className="notif-icon-box" style={{ background: meta.bg }}>
                          {meta.icon}
                        </div>
                        <div className="notif-content">
                          <div className="notif-meta">
                            <span className="notif-category" style={{ color: meta.color, background: `${meta.color}11` }}>
                              {meta.label}
                            </span>
                            <span className="notif-time">{fmtDate(n.createdAt)}</span>
                          </div>
                          <h3 className="notif-title">{n.title}</h3>
                          <p className="notif-message">{n.message}</p>
                        </div>
                        <button 
                          className="notif-del-btn" 
                          onClick={e => { e.stopPropagation(); setDeleteConfirm(n.id); }}
                        >
                          🗑
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {deleteConfirm && (
        <div className="notif-modal-overlay">
          <div className="notif-modal notif-slide">
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗑</div>
            <h3 style={{ margin: '0 0 8px' }}>Remove Notification?</h3>
            <p style={{ color: '#64748b', marginBottom: '24px' }}>This will be permanently removed from your history.</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="notif-btn-secondary" style={{ flex: 1 }} onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button 
                className="notif-btn-main" 
                style={{ flex: 1, background: '#ef4444' }} 
                onClick={async () => {
                  await deleteNotification(deleteConfirm);
                  setNotifications(prev => prev.filter(x => x.id !== deleteConfirm));
                  setDeleteConfirm(null);
                  window.dispatchEvent(new Event('updateNotifCount'));
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {qrModal && (
        <div className="notif-modal-overlay">
          <div className="notif-modal notif-slide">
             <h3 style={{ marginBottom: '8px' }}>Check-in Pass</h3>
             <p style={{ color: '#64748b' }}>Scan this code at the event entrance.</p>
             <div className="notif-qr-frame">
               <QRCodeCanvas 
                id="qr-canvas" 
                value={`${window.location.origin}/admin/event-checkin?qr=${qrModal.token}`} 
                size={220} 
                level="H"
               />
             </div>
             <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  className="notif-btn-main" 
                  onClick={() => {
                    const canvas = document.getElementById('qr-canvas');
                    const a = document.createElement('a');
                    a.href = canvas.toDataURL('image/png');
                    a.download = 'campus-event-qr.png';
                    a.click();
                  }}
                >
                  Download PNG
                </button>
                <button className="notif-btn-secondary" onClick={() => setQrModal(null)}>Close</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
