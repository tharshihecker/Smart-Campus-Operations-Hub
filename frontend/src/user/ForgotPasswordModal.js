import React, { useState } from 'react';
import { forgotPasswordRequest, forgotPasswordReset } from '../api';

export default function ForgotPasswordModal({ onClose }) {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP + New Pass, 3: Success
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequest = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await forgotPasswordRequest(email);
      setUserId(res.userId);
      setStep(2);
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Check your email address.');
    } finally { setLoading(false); }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) return setError('Password must be at least 6 characters.');
    if (newPassword !== confirmPassword) return setError('Passwords do not match.');
    setLoading(true); setError('');
    try {
      await forgotPasswordReset({ userId, otp, newPassword });
      setStep(3);
    } catch (err) {
      setError(err.message || 'Reset failed. Check your OTP.');
    } finally { setLoading(false); }
  };

  return (
    <div className="notif-modal-overlay">
      <div className="notif-modal notif-slide" style={{ maxWidth: 400 }}>
        {step === 1 && (
          <form onSubmit={handleRequest}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔑</div>
            <h3 style={{ marginBottom: '8px' }}>Forgot Password?</h3>
            <p style={{ color: '#64748b', marginBottom: '24px', fontSize: '0.9rem' }}>
              Enter your registered email and we'll send you a 6-digit code to reset your password.
            </p>
            {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '16px', fontWeight: 600 }}>{error}</p>}
            <input 
              type="email" 
              placeholder="name@university.edu" 
              className="notif-input"
              style={{ width: '100%', marginBottom: '16px', padding: '12px' }}
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" className="notif-btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
              <button type="submit" className="notif-btn-main" style={{ flex: 1 }} disabled={loading}>
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleReset}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📩</div>
            <h3 style={{ marginBottom: '8px' }}>Verify Identity</h3>
            <p style={{ color: '#64748b', marginBottom: '24px', fontSize: '0.9rem' }}>
              We sent a code to <b>{email}</b>. Enter it below with your new password.
            </p>
            {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '16px', fontWeight: 600 }}>{error}</p>}
            <input 
              type="text" 
              placeholder="6-digit OTP" 
              maxLength="6"
              className="notif-input"
              style={{ width: '100%', marginBottom: '12px', padding: '12px', textAlign: 'center', fontSize: '1.2rem', letterSpacing: '4px' }}
              value={otp}
              onChange={e => setOtp(e.target.value)}
              required
            />
            <input 
              type="password" 
              placeholder="New Secure Password" 
              className="notif-input"
              style={{ width: '100%', marginBottom: '12px', padding: '12px' }}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
            />
            <input 
              type="password" 
              placeholder="Confirm New Password" 
              className="notif-input"
              style={{ width: '100%', marginBottom: '20px', padding: '12px' }}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" className="notif-btn-secondary" style={{ flex: 1 }} onClick={() => setStep(1)}>Back</button>
              <button type="submit" className="notif-btn-main" style={{ flex: 1 }} disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <div>
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🎉</div>
            <h3 style={{ marginBottom: '8px' }}>All Set!</h3>
            <p style={{ color: '#64748b', marginBottom: '24px', fontSize: '0.9rem' }}>
              Your password has been reset successfully. You can now log in with your new credentials.
            </p>
            <button className="notif-btn-main" onClick={onClose}>Back to Login</button>
          </div>
        )}
      </div>
    </div>
  );
}
