import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { login, googleLogin } from '../api';
import ForgotPasswordModal from './ForgotPasswordModal';
import './Login.css';

/* ── Google G logo ── */
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

function Login({ onLoginSuccess }) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [formErrors, setFormErrors] = useState({});
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (formErrors[e.target.name]) setFormErrors({ ...formErrors, [e.target.name]: null });
  };

  const validate = () => {
    const errs = {};
    if (!form.username.trim()) errs.username = 'Username is required';
    if (!form.password) errs.password = 'Password is required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true); setMessage('');
    try {
      const result = await login(form);
      setIsError(false);
      onLoginSuccess(result); // UserApp handles navigation based on role (admin → /admin/home, user → /home, etc.)
    } catch (err) {
      setIsError(true);
      setMessage(err.message || 'Invalid credentials. Please try again.');
    } finally { setLoading(false); }
  };

  /* Google OAuth — user/staff only */
  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true); setMessage('');
      try {
        const result = await googleLogin(tokenResponse.access_token);
        setIsError(false);
        onLoginSuccess(result);
      } catch (err) {
        setIsError(true);
        setMessage(err.message || 'Google login failed. Please try again.');
      } finally { setGoogleLoading(false); }
    },
    onError: () => { setIsError(true); setMessage('Google sign-in was cancelled or failed.'); },
    flow: 'implicit',
  });

  return (
    <div className="lp-shell">

      {/* ══ LEFT — Branding Panel ══ */}
      <div className="lp-left" aria-hidden="true">
        <div className="lp-orb lp-orb-1" />
        <div className="lp-orb lp-orb-2" />
        <div className="lp-orb lp-orb-3" />

        <div className="lp-left-content">
          {/* Brand */}
          <div className="lp-brand">
            <div className="lp-brand-dot" />
            <div>
              <p className="lp-brand-kicker">Smart Campus</p>
              <h1 className="lp-brand-name">NUSLIIT</h1>
            </div>
          </div>

          {/* Hero */}
          <div className="lp-hero">
            <h2 className="lp-hero-title">Your Campus,<br />Smarter.</h2>
            <p className="lp-hero-sub">
              One login for students, staff, technicians &amp; admins.
              Book resources, track incidents and manage events — all in one place.
            </p>
          </div>

          {/* Feature pills */}
          <div className="lp-features">
            {[
              { icon: '🏛️', label: 'Facility Booking' },
              { icon: '🔔', label: 'Live Notifications' },
              { icon: '🎯', label: 'Event Management' },
              { icon: '🔧', label: 'Incident Tracking' },
            ].map(f => (
              <div key={f.label} className="lp-feature-pill">
                <span>{f.icon}</span><span>{f.label}</span>
              </div>
            ))}
          </div>

          {/* Role cards */}
          <div className="lp-role-grid">
            {[
              { icon: '🎓', role: 'Student', color: '#0ea5e9' },
              { icon: '👨‍🏫', role: 'Staff', color: '#34d399' },
              { icon: '🔧', role: 'Technician', color: '#fbbf24' },
              { icon: '🛡️', role: 'Admin', color: '#a78bfa' },
            ].map(r => (
              <div key={r.role} className="lp-role-card" style={{ '--rc': r.color }}>
                <span className="lp-role-icon">{r.icon}</span>
                <span className="lp-role-label">{r.role}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ RIGHT — Form Panel ══ */}
      <div className="lp-right">
        <div className="lp-card">

          {/* Header */}
          <div className="lp-card-header">
            <div className="lp-avatar">🔐</div>
            <h2 className="lp-card-title">Welcome Back</h2>
            <p className="lp-card-desc">
              Sign in with your campus credentials.<br />
              <strong>Admins, students &amp; staff</strong> — all use this page.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="lp-form" noValidate>
            {/* Username */}
            <div className="lp-field">
              <label htmlFor="lp-username">Username</label>
              <div className="lp-input-wrap">
                <span className="lp-input-icon" aria-hidden>👤</span>
                <input
                  id="lp-username"
                  name="username"
                  type="text"
                  placeholder="Enter your username"
                  value={form.username}
                  onChange={handleChange}
                  autoComplete="username"
                  className={formErrors.username ? 'lp-input-error' : ''}
                  autoFocus
                />
              </div>
              {formErrors.username && <span className="lp-field-err" role="alert">{formErrors.username}</span>}
            </div>

            {/* Password */}
            <div className="lp-field">
              <label htmlFor="lp-password">Password</label>
              <div className="lp-input-wrap">
                <span className="lp-input-icon" aria-hidden>🔒</span>
                <input
                  id="lp-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  className={formErrors.password ? 'lp-input-error' : ''}
                />
                <button
                  type="button"
                  className="lp-eye-btn"
                  onClick={() => setShowPassword(p => !p)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {formErrors.password && <span className="lp-field-err" role="alert">{formErrors.password}</span>}
              <div style={{ textAlign: 'right', marginTop: '6px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowForgot(true)}
                  style={{ background: 'none', border: 'none', color: 'var(--brand-teal)', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                >
                  Forgot password?
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              id="login-submit-btn"
              type="submit"
              className="lp-submit-btn"
              disabled={loading}
            >
              {loading
                ? <><span className="lp-spinner" /> Signing in…</>
                : <>Sign In &rarr;</>
              }
            </button>
          </form>

          {/* Divider */}
          <div className="lp-divider"><span>or continue with</span></div>

          {/* Google */}
          <button
            id="login-google-btn"
            type="button"
            className="lp-google-btn"
            onClick={() => handleGoogleLogin()}
            disabled={googleLoading}
          >
            <GoogleIcon />
            {googleLoading ? 'Connecting…' : 'Continue with Google'}
          </button>

          {/* Alert */}
          {message && (
            <div className={`lp-alert ${isError ? 'lp-alert-err' : 'lp-alert-ok'}`} role="alert">
              <span>{isError ? '⚠️' : '✅'}</span>
              <span>{message}</span>
            </div>
          )}

          {/* Footer links */}
          <p className="lp-signup-link">
            New here? <Link to="/signup">Create an account</Link>
          </p>

          {/* Admin hint banner */}
          <div className="lp-admin-banner">
            <span className="lp-admin-banner-icon">🛡️</span>
            <div>
              <strong>Admin access?</strong> Simply use your admin credentials above.
              No separate admin login page is needed.
            </div>
          </div>

        </div>
      </div>
      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}
    </div>
  );
}

export default Login;
