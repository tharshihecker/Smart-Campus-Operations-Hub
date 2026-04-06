import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { login, googleLogin } from '../api';
import './Login.css';

/* Google G logo SVG */
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
  const navigate = useNavigate();

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (formErrors[e.target.name]) setFormErrors({ ...formErrors, [e.target.name]: null }); // Clear error on edit
  };

  const validate = () => {
    const errs = {};
    if (!form.username.trim()) errs.username = 'Username is required.';
    if (!form.password) errs.password = 'Password is required.';
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
      onLoginSuccess(result);
      navigate('/home');
    } catch (err) {
      setIsError(true);
      setMessage(err.message || 'Login failed. Check your credentials.');
    } finally { setLoading(false); }
  };

  /* Google OAuth login – uses auth-code flow to get ID token from backend */
  const handleGoogleSuccess = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true);
      setMessage('');
      try {
        // tokenResponse contains access_token; use it to fetch user info or exchange for id_token
        // For this implementation, we send access_token and backend validates with Google
        const result = await googleLogin(tokenResponse.access_token);
        setIsError(false);
        onLoginSuccess(result);
        navigate('/home');
      } catch (err) {
        setIsError(true);
        setMessage(err.message || 'Google login failed. Please try again.');
      } finally { setGoogleLoading(false); }
    },
    onError: () => {
      setIsError(true);
      setMessage('Google sign-in was cancelled or failed.');
    },
    flow: 'implicit',
  });

  return (
    <section className="auth-panel">
      <h2>Welcome Back</h2>
      <p className="auth-subtitle">Sign in to your campus dashboard securely.</p>

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label>Username</label>
          <input
            name="username" type="text" placeholder="Enter your username"
            value={form.username} onChange={handleChange} autoComplete="username"
            style={{ borderColor: formErrors.username ? 'var(--brand-danger)' : undefined }}
          />
          {formErrors.username && <span className="form-error">{formErrors.username}</span>}
        </div>
        <div className="form-group">
          <label>Password</label>
          <input
            name="password" type="password" placeholder="Enter your password"
            value={form.password} onChange={handleChange} autoComplete="current-password"
            style={{ borderColor: formErrors.password ? 'var(--brand-danger)' : undefined }}
          />
          {formErrors.password && <span className="form-error">{formErrors.password}</span>}
        </div>
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? '⏳ Signing in…' : 'Sign In'}
        </button>
      </form>

      <div className="auth-divider">or</div>

      <button
        type="button"
        className="google-btn"
        onClick={() => handleGoogleSuccess()}
        disabled={googleLoading}
      >
        <GoogleIcon />
        {googleLoading ? 'Connecting to Google…' : 'Continue with Google'}
      </button>

      {message && <p className={`auth-message ${isError ? 'error' : 'success'}`}>{message}</p>}
      <p className="auth-switch">
        New here? <Link to="/signup">Create an account</Link>
      </p>
    </section>
  );
}

export default Login;
