import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './Landing.css';

function Landing() {
  const heroRef = useRef(null);

  // Subtle parallax on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (heroRef.current) {
        heroRef.current.style.transform = `translateY(${window.scrollY * 0.25}px)`;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="landing-shell">
      {/* ── Hero ────────────────────────────────────────── */}
      <section className="landing-hero">
        <div className="hero-bg" ref={heroRef} />
        <div className="hero-content">
          <div className="hero-badge">🎓 NUSLIIT Smart Campus 2026</div>
          <h1 className="hero-title">
            One Platform.<br />
            <span className="hero-gradient">Every Campus Need.</span>
          </h1>
          <p className="hero-desc">
            Book facilities, report incidents, track maintenance, and get instant notifications —
            all from a single unified dashboard built for modern university life.
          </p>
          <div className="hero-actions">
            <Link to="/signup" className="cta-primary">
              ✨ Get Started Free
            </Link>
            <Link to="/login" className="cta-secondary">
              Sign In →
            </Link>
          </div>
          <div className="hero-stats">
            <div className="hero-stat"><strong>10+</strong><span>Facilities</span></div>
            <div className="hero-stat-divider" />
            <div className="hero-stat"><strong>3</strong><span>User Roles</span></div>
            <div className="hero-stat-divider" />
            <div className="hero-stat"><strong>Real-time</strong><span>Notifications</span></div>
            <div className="hero-stat-divider" />
            <div className="hero-stat"><strong>OAuth 2.0</strong><span>Secure Login</span></div>
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────── */}
      <section className="landing-features">
        <div className="features-header">
          <p className="features-kicker">CORE MODULES</p>
          <h2>Everything you need, in one place</h2>
        </div>
        <div className="features-grid">
          {[
            { icon: '🏛️', title: 'Facilities Catalogue', desc: 'Discover lecture halls, labs, meeting rooms, and equipment. Search, filter, and check real-time availability.' },
            { icon: '📅', title: 'Smart Booking System', desc: 'Request, track, and manage facility bookings with conflict detection, admin approval workflow, and QR check-in.' },
            { icon: '🔧', title: 'Incident Ticketing', desc: 'Report campus issues with photo evidence. Track resolution progress and get notified at every step.' },
            { icon: '🔔', title: 'Smart Notifications', desc: 'Never miss an update. Booking approvals, ticket status changes, and new comments delivered in real-time.' },
            { icon: '📊', title: 'Admin Analytics', desc: 'Powerful dashboard with booking charts, peak hours analysis, SLA tracking, and resource utilization metrics.' },
            { icon: '🔐', title: 'Secure & Role-based', desc: 'OAuth 2.0 Google Sign-In plus JWT authentication. Role-based access for Users, Technicians, and Admins.' },
          ].map(f => (
            <article key={f.title} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Footer CTA ──────────────────────────────────── */}
      <section className="landing-cta">
        <h2>Ready to streamline your campus experience?</h2>
        <p>Join today — sign up with your university email or Google account.</p>
        <div className="hero-actions" style={{ justifyContent: 'center' }}>
          <Link to="/signup" className="cta-primary">Create Free Account</Link>
          <Link to="/login" className="cta-secondary">Already a member? Login</Link>
        </div>
      </section>
    </div>
  );
}

export default Landing;
