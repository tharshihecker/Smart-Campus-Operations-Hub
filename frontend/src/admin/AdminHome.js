import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchHomeSummary, fetchUserStats, fetchAnalytics } from '../api';
import './AdminHome.css';

/* ── Mini bar chart using defined styles ──────────────────── */
function BarChart({ data, colorFn }) {
  const entries = Object.entries(data || {}).filter(([, v]) => v > 0);
  if (!entries.length) return <p className="ah-empty-text">No data yet</p>;
  const max = Math.max(...entries.map(([, v]) => v));
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {entries.map(([label, value], i) => (
        <div key={label} className="ah-bar-row">
          <span className="ah-bar-label" title={label}>{label}</span>
          <div className="ah-bar-track">
            <div className="ah-bar-fill" style={{
              width: `${(value / max) * 100}%`,
              background: colorFn ? colorFn(label, i) : 'linear-gradient(90deg, #6366f1, #4f46e5)',
            }} />
          </div>
          <span className="ah-bar-value">{value}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Donut segment (SVG) ──────────────────────────────── */
function DonutChart({ data, colors }) {
  const entries = Object.entries(data || {}).filter(([, v]) => v > 0);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (!total) return <p className="ah-empty-text">No data yet</p>;
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
                strokeWidth={14}
                strokeDasharray={`${pct * circum} ${circum}`}
                strokeDashoffset={-offset * circum}
                transform={`rotate(-90 ${cx} ${cy})`}
                style={{ transition: 'stroke-dasharray 0.8s ease', strokeLinecap: 'round' }}
              />
            );
            offset += pct;
            return segment;
          })}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '1.4rem', fontWeight: 950, color: '#1e1b4b', lineHeight: 1 }}>{total}</span>
          <span style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Total</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: '140px', flex: 1 }}>
        {entries.map(([label, value], i) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: '3px', background: colors[i % colors.length], flexShrink: 0 }} />
            <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 800 }}>{label}</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 950, color: '#1e1b4b', marginLeft: 'auto' }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const bookingColors = { PENDING: '#f59e0b', APPROVED: '#10b981', REJECTED: '#ef4444', CANCELLED: '#64748b', COMPLETED: '#3b82f6', CHECKED_IN: '#8b5cf6' };
const priorityColors = { CRITICAL: '#dc2626', HIGH: '#ea580c', MEDIUM: '#f59e0b', LOW: '#10b981' };
const statusChartColors = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

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
    <section className="ah-page">
      <div className="ah-header">
        <div className="ah-header-content">
          <h2 className="ah-title">Admin Dashboard</h2>
          <p className="ah-subtitle">Real-time overview of Smart Campus platform metrics and operational health.</p>
        </div>
        <div className="ah-header-icon">📊</div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {!summary && !error && (
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <div className="spinner" style={{ margin: '0 auto 20px' }}></div>
          <p style={{ color: '#64748b', fontWeight: 600 }}>Assembling your dashboard metrics...</p>
        </div>
      )}

      {summary && (
        <>
          {/* ── Key Metrics ── */}
          <div className="ah-stats">
            {[
              { label: 'Total Users', value: userStats?.total || 0, icon: '👥', cls: 'highlight' },
              { label: 'Facilities', value: summary.totalFacilities, icon: '🏛️', cls: '' },
              { label: 'Total Bookings', value: summary.totalBookings, icon: '📅', cls: '' },
              { label: 'Pending Requests', value: summary.pendingBookings, icon: '⏳', cls: 'warning' },
              { label: "Today's Bookings", value: analytics?.todayBookings ?? '—', icon: '📆', cls: 'highlight' },
              { label: 'Open Incidents', value: analytics?.openIncidents ?? '—', icon: '🔧', cls: analytics?.openIncidents > 0 ? 'warning' : '' },
              { label: 'Avg Resolution', value: analytics?.avgResolutionHours != null ? `${analytics.avgResolutionHours}h` : '—', icon: '⏱️', cls: '' },
              { label: 'Active Events', value: summary.totalEvents, icon: '🎉', cls: '' },
            ].map(m => (
              <div key={m.label} className={`ah-stat-card ${m.cls}`}>
                <span className="ah-stat-icon">{m.icon}</span>
                <p className="ah-stat-number">{m.value}</p>
                <p className="ah-stat-label">{m.label}</p>
                <span className="ah-stat-icon-bg">{m.icon}</span>
              </div>
            ))}
          </div>

          {/* ── Analytics Grid ── */}
          {analytics && (
            <div className="ah-charts">
              {/* Booking Status */}
              <div className="ah-chart-card">
                <h3 className="ah-chart-title">📅 Booking Distribution</h3>
                <DonutChart
                  data={analytics.bookingsByStatus}
                  colors={Object.values(bookingColors)}
                />
              </div>

              {/* Ticket Priority */}
              <div className="ah-chart-card">
                <h3 className="ah-chart-title">🎫 Ticket Priority Load</h3>
                <BarChart
                  data={analytics.ticketsByPriority}
                  colorFn={k => priorityColors[k] || '#3b82f6'}
                />
              </div>

              {/* Incident Status */}
              <div className="ah-chart-card">
                <h3 className="ah-chart-title">🔧 Operational Incident Flow</h3>
                <BarChart
                  data={analytics.ticketsByStatus}
                  colorFn={(label, i) => statusChartColors[i % statusChartColors.length]}
                />
              </div>

              {/* Peak Hours */}
              <div className="ah-chart-card" style={{ gridColumn: 'span 2' }}>
                <h3 className="ah-chart-title">⏰ Network Peak Utilization</h3>
                <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 120, padding: '20px 10px', background: 'rgba(248,250,252,0.5)', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                  {Array.from({ length: 24 }, (_, h) => {
                    const count = analytics.peakHours?.[h] || 0;
                    const max = Math.max(...Object.values(analytics.peakHours || {}).map(Number), 1);
                    const heightPct = (count / max) * 100;
                    return (
                      <div key={h} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 6 }}>
                        <div style={{ 
                          width: '100%', 
                          height: `${heightPct}%`, 
                          minHeight: count > 0 ? 6 : 2, 
                          background: count > (max * 0.7) ? 'linear-gradient(to top, #ef4444, #f87171)' : 'linear-gradient(to top, #4f46e5, #818cf8)', 
                          borderRadius: '6px', 
                          transition: 'height 1s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                          boxShadow: count > 0 ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none'
                        }} title={`${h}:00 — ${count} bookings`} />
                        {h % 3 === 0 && <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 900 }}>{h}h</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top Facilities */}
              <div className="ah-chart-card">
                <h3 className="ah-chart-title">🏆 Top Performing Facilities</h3>
                {(analytics.topFacilities || []).length === 0 ? (
                  <p className="ah-empty-text">No data recorded</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {analytics.topFacilities.map((f, i) => (
                      <div key={f.facilityId} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ 
                          width: 32, height: 32, borderRadius: '10px', 
                          background: i === 0 ? '#fef3c7' : i === 1 ? '#f1f5f9' : i === 2 ? '#fff7ed' : '#f8fafc',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem'
                        }}>
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                        </div>
                        <span style={{ flex: 1, fontSize: '0.95rem', fontWeight: 700, color: '#1e1b4b' }}>{f.facilityName}</span>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ display: 'block', fontSize: '1rem', fontWeight: 900, color: '#4f46e5' }}>{f.bookingCount}</span>
                          <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Bookings</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}
        </>
      )}

      {/* ── Quick Actions ── */}
      <span className="ah-section-label">Command Center Launchpad</span>
      <div className="ah-actions">
        {[
          { to: '/admin/facilities', icon: '🏢', title: 'Facilities', desc: 'Asset registry & capacity management.' },
          { to: '/admin/users', icon: '👥', title: 'Users', desc: 'Identity control & role provisioning.' },
          { to: '/admin/bookings', icon: '📅', title: 'Bookings', desc: 'Workflow approval & scheduling.' },
          { to: '/admin/incidents', icon: '🔧', title: 'Incidents', desc: 'Service tickets & resolution tracking.' },
          { to: '/admin/events', icon: '🎯', title: 'Events', desc: 'Campus activities & check-in terminal.' },
        ].map(a => (
          <Link key={a.to} to={a.to} className="ah-action-card">
            <span className="ah-action-icon">{a.icon}</span>
            <h3 className="ah-action-title">{a.title}</h3>
            <p className="ah-action-desc">{a.desc}</p>
            <span className="ah-action-icon-bg">{a.icon}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default AdminHome;
