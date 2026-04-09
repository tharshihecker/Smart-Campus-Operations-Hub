import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchHomeSummary } from '../api';
import './Home.css';

function Home() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const fullName = localStorage.getItem('smartcampus_user_fullname');
  const username = localStorage.getItem('smartcampus_username');
  const displayName = fullName || username || 'Student';

  useEffect(() => {
    let mounted = true;
    fetchHomeSummary()
      .then(data => { if (mounted) setSummary(data); })
      .catch(err => { if (mounted) setError(err.message || 'Failed to load dashboard summary'); });
    return () => { mounted = false; };
  }, []);

  return (
    <section className="dashboard-shell">
      <div className="dashboard-hero">
        <p className="dashboard-kicker">Student Command Center</p>
        <h2>Welcome back, {displayName}!</h2>
        <p>View today&apos;s priorities, discover upcoming activities, and quickly access essential campus tools.</p>
      </div>

      {!summary && !error && (
        <div className="dashboard-grid">
          <div className="dashboard-card skeleton-card">
            <div className="skeleton-line title" />
            <div className="skeleton-line long" />
            <div className="skeleton-line medium" />
            <div className="skeleton-line short" />
          </div>
          <div className="dashboard-card skeleton-card">
            <div className="skeleton-line title" />
            <div className="skeleton-line medium" />
            <div className="skeleton-line" />
            <div className="skeleton-line long" />
          </div>
          <div className="dashboard-card skeleton-card">
            <div className="skeleton-line title" />
            <div className="skeleton-line long" />
            <div className="skeleton-line medium" />
          </div>
        </div>
      )}
      {error && <p className="state-text error">{error}</p>}

      {summary && (
        <>
          {/* ── Stats Row ── */}
          <div className="dashboard-grid">
            <div className="dashboard-card highlight">
              <h3>📊 Campus Overview</h3>
              <ul>
                <li><strong>{summary.totalFacilities || 0}</strong> campus facilities</li>
                <li><strong>{summary.totalEvents || 0}</strong> registered events</li>
                <li><strong>{summary.totalResources || 0}</strong> learning resources</li>
                <li><strong>{summary.totalServices || 0}</strong> service channels</li>
              </ul>
            </div>
            <div className="dashboard-card">
              <h3>📋 Booking Status</h3>
              <ul>
                <li><strong>{summary.totalBookings || 0}</strong> total bookings</li>
                <li><strong>{summary.pendingBookings || 0}</strong> pending approval</li>
                <li><strong>{summary.approvedBookings || 0}</strong> approved</li>
              </ul>
            </div>
            <div className="dashboard-card">
              <h3>🏫 Active Services</h3>
              <ul>
                <li><strong>{summary.activeServices || 0}</strong> active today</li>
                <li><strong>{summary.totalUsers || 0}</strong> registered users</li>
              </ul>
            </div>
          </div>

          {/* ── Quick Actions ── */}
          <div className="dashboard-grid" style={{ marginTop: '1rem' }}>
            <Link to="/facilities" className="dashboard-card action-card">
              <h3>🏛️ Browse Facilities</h3>
              <p>Explore labs, lecture halls, and meeting rooms across campus.</p>
            </Link>
            <Link to="/my-bookings" className="dashboard-card action-card">
              <h3>📅 My Bookings</h3>
              <p>View your reservations, create new bookings, or cancel existing ones.</p>
            </Link>
            <Link to="/events" className="dashboard-card action-card">
              <h3>🎉 Campus Events</h3>
              <p>Discover upcoming workshops, seminars, and social events.</p>
            </Link>
            <Link to="/resources" className="dashboard-card action-card">
              <h3>📚 Learning Resources</h3>
              <p>Access library materials, research tools, and academic resources.</p>
            </Link>
            <Link to="/services" className="dashboard-card action-card">
              <h3>🔧 Campus Services</h3>
              <p>Find maintenance, IT support, and administrative services.</p>
            </Link>
            <Link to="/profile" className="dashboard-card action-card">
              <h3>👤 My Profile</h3>
              <p>Update your information, change password, and manage account settings.</p>
            </Link>
          </div>
        </>
      )}
    </section>
  );
}

export default Home;
