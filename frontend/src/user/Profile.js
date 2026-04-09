import React, { useCallback, useEffect, useState } from 'react';
import { fetchProfile, updateProfile, changePassword, updateNotificationPrefs, requestPasswordResetOtp, resetPasswordWithOtp } from '../api';
import './Profile.css';

function Profile() {
  const userId = localStorage.getItem('smartcampus_user_id');

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  /* Edit mode */
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saveMsg, setSaveMsg] = useState({ type: '', text: '' });
  const [saving, setSaving] = useState(false);

  /* Notification Prefs */
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefMsg, setPrefMsg] = useState({ type: '', text: '' });

  /* Password change */
  const [showPwdForm, setShowPwdForm] = useState(false);
  const [isOtpMode, setIsOtpMode] = useState(false);
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '', otp: '' });
  const [pwdMsg, setPwdMsg] = useState({ type: '', text: '' });
  const [pwdSaving, setPwdSaving] = useState(false);

  const loadProfile = useCallback(() => {
    if (!userId) {
      setError('User session not found. Please log in again.');
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchProfile(userId)
      .then(data => {
        setProfile(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to load profile');
        setLoading(false);
      });
  }, [userId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  /* ── Edit handlers ── */
  const startEditing = () => {
    setEditForm({
      fullName: profile.fullName || '',
      email: profile.email || '',
      phone: profile.phone || '',
      department: profile.department || '',
      bio: profile.bio || '',
    });
    setSaveMsg({ type: '', text: '' });
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setSaveMsg({ type: '', text: '' });
  };

  const handleEditChange = e => {
    setEditForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSaveProfile = async e => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg({ type: '', text: '' });
    try {
      const updated = await updateProfile(userId, editForm);
      setProfile(updated);
      /* Keep localStorage in sync */
      localStorage.setItem('smartcampus_user_fullname', updated.fullName || '');
      localStorage.setItem('smartcampus_user_email', updated.email || '');
      localStorage.setItem('smartcampus_user_department', updated.department || '');
      setSaveMsg({ type: 'success', text: 'Profile updated successfully!' });
      setEditing(false);
    } catch (err) {
      setSaveMsg({ type: 'error', text: err.message || 'Failed to save profile' });
    } finally {
      setSaving(false);
    }
  };

  /* ── Password handlers ── */
  const handlePwdChange = e => {
    setPwdForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleForgotPassword = async () => {
    setPwdSaving(true);
    setPwdMsg({ type: '', text: '' });
    try {
      await requestPasswordResetOtp(userId);
      setPwdMsg({ type: 'success', text: 'OTP sent to your email address. It will expire in 10 minutes.' });
      setIsOtpMode(true);
    } catch (err) {
      setPwdMsg({ type: 'error', text: err.message || 'Failed to send OTP.' });
    } finally {
      setPwdSaving(false);
    }
  };

  const handlePasswordSubmit = async e => {
    e.preventDefault();
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setPwdMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (pwdForm.newPassword.length < 6) {
      setPwdMsg({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }
    setPwdSaving(true);
    setPwdMsg({ type: '', text: '' });
    try {
      if (isOtpMode) {
        await resetPasswordWithOtp(userId, {
          otp: pwdForm.otp,
          newPassword: pwdForm.newPassword,
        });
      } else {
        await changePassword(userId, {
          currentPassword: pwdForm.currentPassword,
          newPassword: pwdForm.newPassword,
        });
      }
      setPwdMsg({ type: 'success', text: 'Password changed successfully!' });
      setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '', otp: '' });
      setShowPwdForm(false);
      setIsOtpMode(false);
    } catch (err) {
      setPwdMsg({ type: 'error', text: err.message || 'Failed to change password' });
    } finally {
      setPwdSaving(false);
    }
  };

  /* ── Prefs handlers ── */
  const handlePrefToggle = async (key, currentValue) => {
    setPrefsSaving(true);
    try {
      await updateNotificationPrefs(userId, { [key]: !currentValue });
      setProfile(prev => ({ ...prev, [key]: !currentValue }));
    } catch (err) {
      setPrefMsg({ type: 'error', text: err.message || 'Failed to update preference.' });
      setTimeout(() => setPrefMsg({ type: '', text: '' }), 4000);
    } finally {
      setPrefsSaving(false);
    }
  };

  /* ── Render ── */
  if (loading) return <section className="profile-shell"><div className="loading-spinner"></div><p className="state-text">Loading profile...</p></section>;
  if (error) return <section className="profile-shell"><div className="error-icon">⚠️</div><p className="state-text error">{error}</p></section>;
  if (!profile) return <section className="profile-shell"><p className="state-text">No profile data.</p></section>;

  return (
    <section className="profile-shell">
      <div className="profile-header">
        <div className="profile-header-content">
          <div className="profile-avatar">
            <div className="avatar-inner">
              {profile.fullName ? profile.fullName.charAt(0).toUpperCase() : (profile.username?.charAt(0).toUpperCase() || '?')}
            </div>
          </div>
          <div className="profile-header-info">
            <h2>My Profile</h2>
            <p className="profile-subtitle">View and manage your campus account information.</p>
          </div>
        </div>
      </div>

      {saveMsg.text && (
        <div className={`profile-alert ${saveMsg.type}`}>
          <span className="alert-icon">{saveMsg.type === 'success' ? '✓' : '⚠️'}</span>
          <span>{saveMsg.text}</span>
        </div>
      )}

      {/* ── Profile Info Card ── */}
      <div className="profile-card">
        <div className="card-header">
          <div className="card-title">
            <span className="card-icon">👤</span>
            <h3>Personal Information</h3>
          </div>
          {!editing && (
            <button type="button" className="btn-edit-trigger" onClick={startEditing}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 3l4 4-7 7H10v-4l7-7z" />
                <path d="M4 20h16" />
              </svg>
              Edit Profile
            </button>
          )}
        </div>

        {!editing ? (
          <div className="profile-info-grid">
            <div className="profile-info-item">
              <span className="info-label">Username</span>
              <span className="info-value">@{profile.username}</span>
            </div>
            <div className="profile-info-item">
              <span className="info-label">Full Name</span>
              <span className={`info-value ${!profile.fullName ? 'muted' : ''}`}>{profile.fullName || 'Not set'}</span>
            </div>
            <div className="profile-info-item">
              <span className="info-label">Email</span>
              <span className={`info-value ${!profile.email ? 'muted' : ''}`}>
                {profile.email || 'Not set'}
                {profile.email && <span className="email-badge">Verified</span>}
              </span>
            </div>
            <div className="profile-info-item">
              <span className="info-label">Phone</span>
              <span className={`info-value ${!profile.phone ? 'muted' : ''}`}>{profile.phone || 'Not set'}</span>
            </div>
            <div className="profile-info-item">
              <span className="info-label">Department</span>
              <span className={`info-value ${!profile.department ? 'muted' : ''}`}>
                {profile.department || 'Not set'}
                {profile.department && <span className="dept-badge">{profile.department}</span>}
              </span>
            </div>
            <div className="profile-info-item">
              <span className="info-label">Role</span>
              <span className="info-value">
                <span className={`role-badge ${String(profile.role).toLowerCase()}`}>
                  {String(profile.role).toLowerCase() === 'admin' ? 'Administrator' :
                    String(profile.role).toLowerCase() === 'technician' ? 'Technician' : 'Student'}
                </span>
              </span>
            </div>
            <div className="profile-info-item full-width">
              <span className="info-label">Bio</span>
              <span className={`info-value bio-text ${!profile.bio ? 'muted' : ''}`}>
                {profile.bio || 'No bio provided. Click edit to add one!'}
              </span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveProfile} className="profile-form">
            <div className="profile-form-row">
              <div className="form-group">
                <label>Full Name</label>
                <input name="fullName" value={editForm.fullName} onChange={handleEditChange} placeholder="Enter your full name" />
              </div>
              <div className="form-group">
                <label>Email (Read Only)</label>
                <input name="email" type="email" value={editForm.email} readOnly className="readonly-input" style={{ background: "var(--bg-surface)", color: "var(--text-muted)", cursor: "not-allowed" }} title="Email address cannot be changed" />
              </div>
            </div>
            <div className="profile-form-row">
              <div className="form-group">
                <label>Phone</label>
                <input name="phone" value={editForm.phone} onChange={handleEditChange} placeholder="+94 xxx xxx xxxx" />
              </div>
              <div className="form-group">
                <label>Department</label>
                <input name="department" value={editForm.department} onChange={handleEditChange} placeholder="e.g. Computer Science" />
              </div>
            </div>
            <div className="form-group">
              <label>Bio</label>
              <textarea name="bio" value={editForm.bio} onChange={handleEditChange} placeholder="Tell us about yourself..." rows={3} />
            </div>
            <div className="profile-form-actions">
              <button type="submit" className="btn-profile primary" disabled={saving}>
                {saving ? (
                  <>
                    <span className="btn-spinner"></span>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
              <button type="button" className="btn-profile secondary" onClick={cancelEditing}>Cancel</button>
            </div>
          </form>
        )}
      </div>

      {/* ── Notification Preferences Card ── */}
      <div className="profile-card">
        <div className="card-header">
          <div className="card-title">
            <span className="card-icon">🔔</span>
            <h3>Notification Settings</h3>
          </div>
        </div>
        <p className="card-description">Choose what kind of email and dashboard notifications you want to receive.</p>

        {prefMsg.text && (
          <div className={`profile-alert ${prefMsg.type} compact`}>
            <span>{prefMsg.text}</span>
          </div>
        )}

        <div className="notification-list">
          {['notifBookingUpdates', 'notifTicketUpdates', 'notifComments'].map(key => {
            const label = key === 'notifBookingUpdates' ? 'Booking Approvals & Updates'
              : key === 'notifTicketUpdates' ? 'Incident Ticket Status Changes'
                : 'New Comments on Tickets';
            const isOn = profile[key];
            return (
              <div key={key} className="notification-item">
                <div className="notification-info">
                  <span className="notification-label">{label}</span>
                  <span className="notification-desc">
                    {key === 'notifBookingUpdates' && 'Get notified when your bookings are approved or modified'}
                    {key === 'notifTicketUpdates' && 'Receive updates when ticket status changes'}
                    {key === 'notifComments' && 'Stay informed about new comments on your tickets'}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={prefsSaving}
                  onClick={() => handlePrefToggle(key, isOn)}
                  className={`toggle-switch ${isOn ? 'active' : ''}`}
                >
                  <span className="toggle-slider"></span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Security Card ── */}
      <div className="profile-card">
        <div className="card-header">
          <div className="card-title">
            <span className="card-icon">🔒</span>
            <h3>Security</h3>
          </div>
        </div>

        {pwdMsg.text && (
          <div className={`profile-alert ${pwdMsg.type} compact`}>
            <span className="alert-icon">{pwdMsg.type === 'success' ? '✓' : '⚠️'}</span>
            <span>{pwdMsg.text}</span>
          </div>
        )}

        {!showPwdForm ? (
          <div className="security-content">
            <p className="security-description">Keep your account secure by using a strong password.</p>
            <button type="button" className="btn-profile primary" onClick={() => { setShowPwdForm(true); setPwdMsg({ type: '', text: '' }); }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Change Password
            </button>
          </div>
        ) : (
          <form onSubmit={handlePasswordSubmit} className="profile-form password-section">
            {isOtpMode ? (
              <div className="form-group">
                <label>Email OTP (6 Digits)</label>
                <input name="otp" type="text" value={pwdForm.otp} onChange={handlePwdChange} required placeholder="Enter OTP received via email" />
              </div>
            ) : (
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                  <label style={{ margin: 0 }}>Current Password</label>
                  <button type="button" onClick={handleForgotPassword} style={{ background: 'none', border: 'none', color: 'var(--brand-teal)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                    Forgot Password?
                  </button>
                </div>
                <input name="currentPassword" type="password" value={pwdForm.currentPassword} onChange={handlePwdChange} required autoComplete="current-password" />
              </div>
            )}
            <div className="profile-form-row">
              <div className="form-group">
                <label>New Password</label>
                <input name="newPassword" type="password" value={pwdForm.newPassword} onChange={handlePwdChange} required autoComplete="new-password" />
                <span className="password-hint">Minimum 6 characters</span>
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input name="confirmPassword" type="password" value={pwdForm.confirmPassword} onChange={handlePwdChange} required autoComplete="new-password" />
              </div>
            </div>
            <div className="profile-form-actions">
              <button type="submit" className="btn-profile primary" disabled={pwdSaving}>
                {pwdSaving ? (
                  <>
                    <span className="btn-spinner"></span>
                    Changing...
                  </>
                ) : (
                  'Update Password'
                )}
              </button>
              <button type="button" className="btn-profile secondary" onClick={() => { setShowPwdForm(false); setIsOtpMode(false); setPwdMsg({ type: '', text: '' }); }}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── Account Details Card ── */}
      <div className="profile-card">
        <div className="card-header">
          <div className="card-title">
            <span className="card-icon">📋</span>
            <h3>Account Details</h3>
          </div>
        </div>
        <div className="account-meta">
          <div className="meta-item">
            <span className="meta-icon">🆔</span>
            <span className="meta-label">User ID:</span>
            <strong className="meta-value">{profile.id}</strong>
          </div>
          {profile.createdAt && (
            <div className="meta-item">
              <span className="meta-icon">📅</span>
              <span className="meta-label">Joined:</span>
              <strong className="meta-value">{new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>
            </div>
          )}
          {profile.updatedAt && (
            <div className="meta-item">
              <span className="meta-icon">✏️</span>
              <span className="meta-label">Last Updated:</span>
              <strong className="meta-value">{new Date(profile.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>
            </div>
          )}
          <div className="meta-item">
            <span className="meta-icon">✅</span>
            <span className="meta-label">Status:</span>
            <strong className={`status-badge ${profile.enabled !== false ? 'active' : 'disabled'}`}>
              {profile.enabled !== false ? 'Active' : 'Disabled'}
            </strong>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Profile;