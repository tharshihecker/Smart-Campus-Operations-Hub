import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../api';
import './Login.css';

function Login({ onLoginSuccess }) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true); setMessage('');
    try {
      const result = await login(form);
      setIsError(false);
      // Pass full result to authApi.login for JWT storage
      onLoginSuccess(result);
      navigate('/home');
    } catch (err) {
      setIsError(true);
      setMessage(err.message || 'Login failed. Check your credentials.');
    } finally { setLoading(false); }
  };

  return (
    <section className="auth-panel">
      <h2>Welcome Back</h2>
      <p className="auth-subtitle">Login to access your personalized campus dashboard.</p>
      <p className="auth-subtitle" style={{ fontSize: 12, opacity: 0.6 }}>
        Demo: <strong>demouser / user123</strong> &nbsp;|&nbsp; Admin: <strong>admin / admin123</strong>
      </p>
      <form onSubmit={handleSubmit} className="auth-form">
        <input name="username" type="text" placeholder="Username" value={form.username} onChange={handleChange} required autoComplete="username" />
        <input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} required autoComplete="current-password" />
        <button type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Login'}</button>
      </form>
      {message && <p className={`auth-message ${isError ? 'error' : 'success'}`}>{message}</p>}
      <p className="auth-switch">New here? <Link to="/signup">Create an account</Link></p>
    </section>
  );
}

export default Login;
