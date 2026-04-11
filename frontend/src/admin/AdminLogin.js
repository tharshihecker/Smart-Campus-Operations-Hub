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
    <section className="auth-panel admin-auth-panel" style={{ 
      borderTop: '4px solid var(--admin-brand)',
      boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
    }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <span style={{ fontSize: '3rem', display: 'block', marginBottom: 12 }}>🛡️</span>
        <h2 style={{ fontSize: '2.2rem' }}>Admin Portal</h2>
        <p className="auth-subtitle">Restricted Access: Authorized Personnel Only</p>
      </div>
      
      <div style={{ 
        background: 'rgba(239, 68, 68, 0.1)', 
        border: '1px solid rgba(239, 68, 68, 0.2)', 
        borderRadius: 'var(--radius-md)', 
        padding: '12px', 
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <span style={{ fontSize: '1.2rem' }}>⚠️</span>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--brand-danger)', fontWeight: 600 }}>
          Unauthorized access attempts are monitored and logged.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label>Admin Username</label>
          <input name="username" type="text" placeholder="Enter username" value={form.username} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Admin Password</label>
          <input name="password" type="password" placeholder="Enter password" value={form.password} onChange={handleChange} required />
        </div>
        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            background: 'var(--admin-gradient)', 
            boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
            marginTop: '12px'
          }}
        >
          {loading ? 'Authenticating...' : 'Sign In to Console'}
        </button>
      </form>
      
      <div style={{ marginTop: 24, textAlign: 'center', opacity: 0.5, fontSize: '0.8rem' }}>
        <p>NUSLIIT Smart Campus System &copy; 2026</p>
      </div>

      {message && <p className={`auth-message ${isError ? 'error' : 'success'}`} style={{ marginTop: 20 }}>{message}</p>}
    </section>
  );
}

export default AdminLogin;
