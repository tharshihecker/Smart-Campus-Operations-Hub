import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchHomeSummary, fetchUserStats, fetchAnalytics } from '../api';
import './Admin.css';

/* ── Mini bar chart using inline SVG ──────────────────── */
function BarChart({ data, colorFn }) {
  const entries = Object.entries(data || {}).filter(([, v]) => v > 0);
  if (!entries.length) return <p style={{ color: '#1e293b', fontSize: '0.85rem' }}>No data yet</p>;
  const max = Math.max(...entries.map(([, v]) => v));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {entries.map(([label, value]) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 140, fontSize: '0.75rem', color: '#1e293b', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={label}>{label}</span>
          <div style={{ flex: 1, background: 'rgba(0,0,0,0.1)', borderRadius: 99, height: 10, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${(value / max) * 100}%`,
              background: colorFn ? colorFn(label) : 'var(--admin-gradient)',
              borderRadius: 99,
              transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
            }} />
          </div>
          <span style={{ width: 32, fontSize: '0.85rem', color: '#0f172a', fontWeight: 900, textAlign: 'right' }}>{value}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Donut segment (SVG) ──────────────────────────────── */
function DonutChart({ data, colors }) {
  const entries = Object.entries(data || {}).filter(([, v]) => v > 0);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (!total) return <p style={{ color: '#1e293b', fontSize: '0.85rem' }}>No data yet</p>;
  let offset = 0;
  const r = 40, cx = 55, cy = 55, circum = 2 * Math.PI * r;
  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: 110, height: 110 }}>
        <svg width="110" height="110" viewBox="0 0 110 110">
          {entries.map(([label, value], i) => {
            const pct = value / total;
            const segment = (
              <circle key={label}
                cx={cx} cy={cy} r={r}
                fill="none"
                stroke={colors[i % colors.length]}
                strokeWidth={16}
                strokeDasharray={`${pct * circum} ${circum}`}
                strokeDashoffset={-offset * circum}
                transform={`rotate(-90 ${cx} ${cy})`}
                style={{ transition: 'stroke-dasharray 0.8s ease' }}
              />
            );
            offset += pct;
            return segment;
          })}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '1.3rem', fontWeight: 950, color: '#0f172a', lineHeight: 1 }}>{total}</span>
          <span style={{ fontSize: '0.65rem', color: '#1e293b', textTransform: 'uppercase', fontWeight: 800 }}>Total</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: '140px', flex: 1 }}>
        {entries.map(([label, value], i) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: '3px', background: colors[i % colors.length], flexShrink: 0 }} />
            <span style={{ fontSize: '0.75rem', color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 800 }}>{label}</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#0f172a', marginLeft: 'auto' }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const bookingColors = { PENDING: '#fbbf24', APPROVED: '#34d399', REJECTED: '#f87171', CANCELLED: '#94a3b8', COMPLETED: '#60a5fa', CHECKED_IN: '#a78bfa' };
const priorityColors = { CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#fbbf24', LOW: '#34d399' };
const statusChartColors = ['#38bdf8', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#94a3b8'];

function AdminHome() {
  const [summary, setSummary] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([fetchHomeSummary(), fetchUserStats(), fetchAnalytics()])
      .then(([s, u, a]) => { setSummary(s); setUserStats(u); setAnalytics(a); })
      .catch(err => setError(err.message || 'Failed to load dashboard data'));
  }, []);

  return (
    <section className="admin-panel">
      <div className="admin-home-header" style={{ 
        marginBottom: 32, 
        padding: '48px', 
        background: '#4f46e5', // Solid indigo background
        backgroundImage: 'var(--admin-gradient)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid #4338ca',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(79, 70, 229, 0.2)'
      }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <h2 style={{ 
            fontFamily: "'Outfit', sans-serif", 
            fontSize: '2.8rem', 
            fontWeight: 900,
            marginBottom: 12,
            color: '#ffffff',
            letterSpacing: '-0.03em',
            textShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>Admin Dashboard</h2>
          <p className="admin-subtitle" style={{ 
            fontSize: '1.15rem', 
            color: 'rgba(255, 255, 255, 0.9)',
            maxWidth: '600px',
            fontWeight: 500,
            lineHeight: 1.6
          }}>Real-time overview of Smart Campus platform metrics.</p>
        </div>
        <div style={{ 
          position: 'absolute', 
          right: '48px', 
          bottom: '-20px', 
          fontSize: '12rem', 
          opacity: 0.15, 
          zIndex: 1,
          pointerEvents: 'none',
          filter: 'drop-shadow(0 10px 10px rgba(0,0,0,0.2))'
        }}>📊</div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {!summary && !error && <p className="state-text">Loading dashboard...</p>}

      {summary && (
        <>
          {/* ── Key Metrics Row ── */}
          <div className="stats-grid" style={{ marginBottom: 28 }}>
            {[
              { label: 'Total Users', value: userStats?.total || 0, icon: '👥', cls: 'highlight' },
              { label: 'Facilities', value: summary.totalFacilities, icon: '🏛️', cls: '' },
              { label: 'Total Bookings', value: summary.totalBookings, icon: '📅', cls: '' },
              { label: 'Pending Bookings', value: summary.pendingBookings, icon: '⏳', cls: 'warning' },
              { label: "Today's Bookings", value: analytics?.todayBookings ?? '—', icon: '📆', cls: 'highlight' },
              { label: 'Open Incidents', value: analytics?.openIncidents ?? '—', icon: '🔧', cls: analytics?.openIncidents > 0 ? 'warning' : '' },
              { label: 'Avg Resolution', value: analytics?.avgResolutionHours != null ? `${analytics.avgResolutionHours}h` : '—', icon: '⏱️', cls: '' },
              { label: 'Campus Events', value: summary.totalEvents, icon: '🎉', cls: '' },
            ].map(m => (
              <div key={m.label} className={`stat-card ${m.cls}`} style={{ position: 'relative', overflow: 'hidden' }}>
                <div style={{ fontSize: '2.2rem', marginBottom: 8, opacity: 0.9, position: 'relative', zIndex: 2 }}>{m.icon}</div>
                <p className="stat-number" style={{ position: 'relative', zIndex: 2 }}>{m.value}</p>
                <p className="stat-label" style={{ position: 'relative', zIndex: 2 }}>{m.label}</p>
                <div style={{ 
                  position: 'absolute', 
                  top: '10px', 
                  right: '10px', 
                  fontSize: '3rem', 
                  opacity: 0.03, 
                  zIndex: 1,
                  pointerEvents: 'none'
                }}>{m.icon}</div>
              </div>
            ))}
          </div>

          {/* ── Analytics Charts ── */}
          {analytics && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 28 }}>

              {/* Booking Status Donut */}
              <div className="admin-card">
                <h3 className="card-title">📅 Bookings by Status</h3>
                <DonutChart
                  data={analytics.bookingsByStatus}
                  colors={Object.values(bookingColors)}
                />
              </div>

              {/* Ticket Priority Bar */}
              <div className="admin-card">
                <h3 className="card-title">🎫 Tickets by Priority</h3>
                <BarChart
                  data={analytics.ticketsByPriority}
                  colorFn={k => priorityColors[k] || '#60a5fa'}
                />
              </div>

              {/* Peak Booking Hours */}
              <div className="admin-card" style={{ gridColumn: 'span 2' }}>
                <h3 className="card-title">⏰ Peak Booking Hours</h3>
                <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 80, padding: '0 4px' }}>
                  {Array.from({ length: 24 }, (_, h) => {
                    const count = analytics.peakHours?.[h] || 0;
                    const max = Math.max(...Object.values(analytics.peakHours || {}).map(Number), 1);
                    const heightPct = (count / max) * 100;
                    return (
                      <div key={h} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <div style={{ width: '100%', height: `${heightPct}%`, minHeight: count > 0 ? 4 : 0, background: 'var(--gradient-brand)', borderRadius: '3px 3px 0 0', transition: 'height 0.8s ease' }} title={`${h}:00 — ${count} bookings`} />
                        {h % 4 === 0 && <span style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 600 }}>{h}h</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top Facilities */}
              <div className="admin-card">
                <h3 className="card-title">🏆 Top Booked Facilities</h3>
                {(analytics.topFacilities || []).length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No bookings yet</p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {analytics.topFacilities.map((f, i) => (
                      <li key={f.facilityId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: i < analytics.topFacilities.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                        <span style={{ fontSize: '1.1rem', width: 24, textAlign: 'center' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
                        <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>{f.facilityName}</span>
                        <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#4f46e5' }}>{f.bookingCount}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Ticket Status */}
              <div className="admin-card">
                <h3 className="card-title">🔧 Tickets by Status</h3>
                <BarChart
                  data={analytics.ticketsByStatus}
                  colorFn={(_, i) => statusChartColors[i % statusChartColors.length]}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Quick Actions ── */}
      <h3 style={{ margin: '8px 0 14px', color: 'var(--text-secondary)', fontSize: '0.85rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Quick Actions</h3>
      <div className="quick-actions">
        {[
          { to: '/admin/facilities', icon: '🏢', title: 'Facilities', desc: 'Create and manage bookable resources.' },
          { to: '/admin/users', icon: '👥', title: 'Users', desc: 'Roles, statuses, and account control.' },
          { to: '/admin/bookings', icon: '📅', title: 'Bookings', desc: 'Approve or reject booking requests.' },
          { to: '/admin/incidents', icon: '🔧', title: 'Incidents', desc: 'Assign techs and manage ticket flow.' },
          { to: '/admin/events', icon: '🎯', title: 'Events', desc: 'Manage campus events and activities.' },
        ].map(a => (
          <Link key={a.to} to={a.to} className="quick-action-card" style={{ 
            background: '#ffffff', 
            border: '1px solid var(--admin-border)',
            position: 'relative',
            overflow: 'hidden',
            padding: '24px',
            borderRadius: '16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            textDecoration: 'none'
          }}>
            <div style={{ fontSize: '1.8rem', position: 'relative', zIndex: 2 }}>{a.icon}</div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', fontWeight: 800, position: 'relative', zIndex: 2 }}>{a.title}</h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155', fontWeight: 500, position: 'relative', zIndex: 2 }}>{a.desc}</p>
            <div style={{ 
              position: 'absolute', 
              top: '10px', 
              right: '10px', 
              fontSize: '3rem', 
              opacity: 0.05, 
              zIndex: 1,
              pointerEvents: 'none'
            }}>{a.icon}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default AdminHome;
