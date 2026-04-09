import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api';
import '../user/Login.css';

function AdminLogin({ onLoginSuccess }) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true); setMessage('');
    try {
      const result = await login(form);
      if (result.role !== 'ADMIN') {
        setIsError(true);
        setMessage('Access denied: Admin privileges required');
        return;
      }
      setIsError(false);
      setMessage('Admin login successful');
      onLoginSuccess(result);
      navigate('/admin/home');
    } catch (err) {
      setIsError(true);
      setMessage(err.message || 'Invalid admin credentials');
    } finally { setLoading(false); }
  };

  return (
    <section className="auth-panel">
      <h2>Admin Login</h2>
      <p className="auth-subtitle">Access the admin console to manage campus details and facilities.</p>
      <p className="auth-subtitle" style={{ fontSize: 12, opacity: 0.6 }}>Credentials: <strong>admin / admin123</strong></p>
      <form onSubmit={handleSubmit} className="auth-form">
        <input name="username" type="text" placeholder="Admin username" value={form.username} onChange={handleChange} required />
        <input name="password" type="password" placeholder="Admin password" value={form.password} onChange={handleChange} required />
        <button type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Login as Admin'}</button>
      </form>
      {message && <p className={`auth-message ${isError ? 'error' : 'success'}`}>{message}</p>}
    </section>
  );
}

export default AdminLogin;
