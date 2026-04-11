import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchHomeSummary, fetchUserBookings, fetchUserEventBookings, fetchMyIncidents, getCurrentUserId } from '../api';
import './Home.css';

function Home() {
  const [summary, setSummary] = useState(null);
  const [userBookings, setUserBookings] = useState([]);
  const [eventBookings, setEventBookings] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const fullName = localStorage.getItem('smartcampus_user_fullname');
  const username = localStorage.getItem('smartcampus_username');
  const displayName = fullName || username || 'Student';
  const userId = getCurrentUserId();

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      try {
        const [sum, bookings, events, incs] = await Promise.all([
          fetchHomeSummary(),
          fetchUserBookings(userId),
          fetchUserEventBookings(userId),
          fetchMyIncidents() // This usually doesn't need userId as it's token based
        ]);
        setSummary(sum);
        // Take latest 3 of each
        setUserBookings((bookings || []).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3));
        setEventBookings((events || []).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3));
        setIncidents((incs || []).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3));
      } catch (err) {
        setError(err.message || 'Failed to sync your dashboard');
      } finally {
        setLoading(false);
      }
    };

    if (userId) loadDashboard();
  }, [userId]);

  // 💬 Tawk.to Integration (Home Page Only)
  useEffect(() => {
    var Tawk_API = Tawk_API || {}, Tawk_LoadStart = new Date();
    const s1 = document.createElement("script");
    const s0 = document.getElementsByTagName("script")[0];
    s1.async = true;
    s1.src = 'https://embed.tawk.to/69d9d0753ad18f1c36acef65/1jltdcjaa';
    s1.charset = 'UTF-8';
    s1.setAttribute('crossorigin', '*');
    s0.parentNode.insertBefore(s1, s0);

    return () => {
      // Hide the widget when leaving the home page
      if (window.Tawk_API && typeof window.Tawk_API.hideWidget === 'function') {
        window.Tawk_API.hideWidget();
      }
      // Remove the script tag
      s1.remove();
    };
  }, []);

  if (loading) {
    return (
      <div className="home-page" style={{ padding: '40px', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '100px auto 20px' }}></div>
        <p style={{ color: '#64748b', fontWeight: 600 }}>Syncing your campus profile...</p>
      </div>
    );
  }

  return (
    <section className="home-page">
      {/* ── Hero ── */}
      <div className="home-hero">
        <div className="home-hero-content">
          <span className="home-kicker">Student Command Center</span>
          <h1 className="home-title">Welcome back, {displayName.split(' ')[0]}!</h1>
          <p className="home-subtitle">Your personalized hub for campus facilities, events, and support services.</p>
        </div>
        <div className="home-hero-bg">🎓</div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 32 }}>{error}</div>}

      <div className="home-viewport">
        
        {/* ── Left: Campus Overview (Bento) ── */}
        <div className="home-overview">
          <h2 className="home-section-title"><span>📊</span> Campus Highlights</h2>
          <div className="home-bento">
            <Link to="/facilities" className="bento-item blue">
              <div className="bento-content">
                <span className="bento-icon">🏫</span>
                <span className="bento-val">{summary?.totalFacilities || 0}</span>
                <span className="bento-label">Facilities</span>
                <span className="bento-desc">Available on campus</span>
              </div>
              <span className="bento-bg-icon">🏫</span>
            </Link>
            <Link to="/events" className="bento-item green">
              <div className="bento-content">
                <span className="bento-icon">🎉</span>
                <span className="bento-val">{summary?.totalEvents || 0}</span>
                <span className="bento-label">Active Events</span>
                <span className="bento-desc">Happening this month</span>
              </div>
              <span className="bento-bg-icon">🎉</span>
            </Link>
            <Link to="/resources" className="bento-item purple">
              <div className="bento-content">
                <span className="bento-icon">📚</span>
                <span className="bento-val">{summary?.totalResources || 0}</span>
                <span className="bento-label">Resources</span>
                <span className="bento-desc">Learning materials</span>
              </div>
              <span className="bento-bg-icon">📚</span>
            </Link>
            <Link to="/services" className="bento-item orange">
              <div className="bento-content">
                <span className="bento-icon">🔧</span>
                <span className="bento-val">{summary?.totalServices || 0}</span>
                <span className="bento-label">Service Hub</span>
                <span className="bento-desc">Active support channels</span>
              </div>
              <span className="bento-bg-icon">🔧</span>
            </Link>
          </div>
        </div>

        {/* ── Right: Personalized Columns ── */}
        <div className="home-personalized">
          
          {/* Recent Facility Bookings */}
          <div className="personal-card">
            <div className="personal-header">
              <h3 className="personal-title">Recent Reservations</h3>
              <Link to="/my-bookings" className="personal-link">View All</Link>
            </div>
            {userBookings.length === 0 ? (
              <div className="empty-personal">No recent bookings</div>
            ) : (
              <div className="personal-list">
                {userBookings.map(b => (
                  <div key={b.id} className="personal-item">
                    <div className="item-icon">🏛️</div>
                    <div className="item-info">
                      <span className="item-name">{b.facilityName}</span>
                      <span className="item-meta">{b.bookingDate} • {b.startTime}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Event Tickets */}
          <div className="personal-card">
            <div className="personal-header">
              <h3 className="personal-title">Upcoming Events</h3>
              <Link to="/events" className="personal-link">Explore</Link>
            </div>
            {eventBookings.length === 0 ? (
              <div className="empty-personal">No event tickets found</div>
            ) : (
              <div className="personal-list">
                {eventBookings.map(e => (
                  <div key={e.id} className="personal-item">
                    <div className="item-icon">🎟️</div>
                    <div className="item-info">
                      <span className="item-name">{e.eventTitle || 'Event Ticket'}</span>
                      <span className="item-meta">{e.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* My Incidents */}
          <div className="personal-card">
            <div className="personal-header">
              <h3 className="personal-title">Support Tickets</h3>
              <Link to="/incidents" className="personal-link">My Incidents</Link>
            </div>
            {incidents.length === 0 ? (
              <div className="empty-personal">No active tickets</div>
            ) : (
              <div className="personal-list">
                {incidents.map(i => (
                  <div key={i.id} className="personal-item">
                    <div className="item-icon" style={{ background: '#fef2f2' }}>🔧</div>
                    <div className="item-info">
                      <span className="item-name">{i.title}</span>
                      <span className="item-meta" style={{ color: i.status === 'OPEN' ? '#ef4444' : '#64748b' }}>{i.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Launchpad ── */}
      <span className="home-section-label" style={{ marginBottom: 16, display: 'block' }}>Quick Launchpad</span>
      <div className="home-launchpad">
        <Link to="/facilities" className="action-card">
          <div className="action-icon">🏢</div>
          <div className="action-info">
            <h3>Facilities</h3>
            <p>Labs and Studios</p>
          </div>
        </Link>
        <Link to="/events" className="action-card">
          <div className="action-icon">🎯</div>
          <div className="action-info">
            <h3>Campus Life</h3>
            <p>Social & Tech Events</p>
          </div>
        </Link>
        <Link to="/incidents" className="action-card">
          <div className="action-icon">🔧</div>
          <div className="action-info">
            <h3>Reporting</h3>
            <p>Report an Issue</p>
          </div>
        </Link>
        <Link to="/profile" className="action-card">
          <div className="action-icon">👤</div>
          <div className="action-info">
            <h3>Account</h3>
            <p>Manage Settings</p>
          </div>
        </Link>
      </div>
    </section>
  );
}

export default Home;
