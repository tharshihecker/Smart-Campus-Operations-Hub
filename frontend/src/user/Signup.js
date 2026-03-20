import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { signup, googleLogin } from '../api';
import './Signup.css';

/* Google G logo SVG */
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

function Signup({ onSignupSuccess }) {
  const [form, setForm] = useState({ username: '', email: '', password: '', fullName: '' });
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true); setMessage('');
    try {
      const result = await signup(form);
      setIsError(false);
      if (typeof result === 'object' && result.token) {
        // Auto-login after successful signup
        onSignupSuccess && onSignupSuccess(result);
        navigate('/home');
      } else {
        setMessage(typeof result === 'string' ? result : 'Account created! Redirecting…');
        setTimeout(() => navigate('/login'), 900);
      }
    } catch (err) {
      setIsError(true);
      setMessage(err.message || 'Signup failed');
    } finally { setLoading(false); }
  };

  const handleGoogleSuccess = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true);
      setMessage('');
      try {
        // tokenResponse.access_token from implicit flow; backend will validate with Google
        const result = await googleLogin(tokenResponse.access_token);
        setIsError(false);
        onSignupSuccess && onSignupSuccess(result);
        navigate('/home');
      } catch (err) {
        setIsError(true);
        setMessage(err.message || 'Google sign-up failed. Please try again.');
      } finally { setGoogleLoading(false); }
    },
    onError: () => { setIsError(true); setMessage('Google sign-in was cancelled.'); },
    flow: 'implicit',
  });

  return (
    <section className="auth-panel">
      <h2>Create Account</h2>
      <p className="auth-subtitle">Join Smart Campus – your unified university portal.</p>

      <form onSubmit={handleSubmit} className="auth-form">
        <input name="fullName" type="text" placeholder="Full Name (optional)"
          value={form.fullName} onChange={handleChange} autoComplete="name" />
        <input name="username" type="text" placeholder="Choose a username"
          value={form.username} onChange={handleChange} required autoComplete="username" />
        <input name="email" type="email" placeholder="University email"
          value={form.email} onChange={handleChange} required autoComplete="email" />
        <input name="password" type="password" placeholder="Password (min 6 chars)"
          value={form.password} onChange={handleChange} required autoComplete="new-password" minLength={6} />
        <button type="submit" disabled={loading}>
          {loading ? '⏳ Creating account…' : 'Create Account'}
        </button>
      </form>

      <div className="auth-divider">or</div>

      <button type="button" className="google-btn" onClick={() => handleGoogleSuccess()} disabled={googleLoading}>
        <GoogleIcon />
        {googleLoading ? 'Connecting to Google…' : 'Sign up with Google'}
      </button>

      {message && <p className={`auth-message ${isError ? 'error' : 'success'}`}>{message}</p>}
      <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
    </section>
  );
}

export default Signup;
