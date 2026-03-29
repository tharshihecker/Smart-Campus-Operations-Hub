import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import Signup from './Signup';
import Login from './Login';
import Home from './Home';
import Landing from './Landing';
import Events from './Events';
import Resources from './Resources';
import Services from './Services';
import Facilities from './Facilities';
import Profile from './Profile';
import MyBookings from './MyBookings';
import Incidents from './Incidents';
import Notifications from './Notifications';
import { fetchUnreadCount } from '../api';
import '../App.css';

const USER_AUTH_KEY = 'smartcampus_user_auth';

function ProtectedRoute({ isAuthenticated, children }) {
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function NotificationBell({ userId, isAuthenticated }) {
  const [count, setCount] = useState(0);

  const loadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await fetchUnreadCount();
      setCount(data.count || 0);
    } catch {}
  }, [isAuthenticated]);

  useEffect(() => {
    loadCount();
    const timer = setInterval(loadCount, 15000); // Poll every 15s
    const handleUpdate = () => loadCount();
    window.addEventListener('updateNotifCount', handleUpdate);
    return () => {
      clearInterval(timer);
      window.removeEventListener('updateNotifCount', handleUpdate);
    };
  }, [loadCount]);

  return (
    <NavLink to="/notifications" className={({ isActive }) => `nav-link bell-link ${isActive ? 'active' : ''}`}>
      🔔
      {count > 0 && <span className="notif-badge">{count > 99 ? '99+' : count}</span>}
    </NavLink>
  );
}

function UserTopNav({ isAuthenticated, onLogout }) {
  const username = localStorage.getItem('smartcampus_username');
  const fullName = localStorage.getItem('smartcampus_user_fullname');
  const displayName = fullName || username || '';
  const userId = localStorage.getItem('smartcampus_user_id');

  return (
    <header className="top-nav">
      <div className="brand-block">
        <div className="brand-dot" />
        <div>
          <p className="brand-kicker">Smart Campus Platform</p>
          <h1>NUSLIIT PAF Portal</h1>
        </div>
      </div>

      <nav className="nav-links">
        {isAuthenticated ? (
          <>
            <NavLink to="/home" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Home</NavLink>
            <NavLink to="/facilities" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Facilities</NavLink>
            <NavLink to="/my-bookings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>My Bookings</NavLink>
            <NavLink to="/incidents" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Incidents</NavLink>
            <NavLink to="/events" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Events</NavLink>
            <NavLink to="/resources" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Resources</NavLink>
            <NavLink to="/services" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Services</NavLink>
            <NavLink to="/profile" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              {displayName ? `👤 ${displayName}` : 'Profile'}
            </NavLink>
            <NotificationBell isAuthenticated={isAuthenticated} userId={userId} />
            <button type="button" className="nav-button" onClick={onLogout}>Logout</button>
          </>
        ) : (
          <>
            <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Overview</NavLink>
            <NavLink to="/login" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Login</NavLink>
            <NavLink to="/signup" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Signup</NavLink>
          </>
        )}
      </nav>
    </header>
  );
}

function UserApp() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(localStorage.getItem(USER_AUTH_KEY) === 'true');

  const authApi = useMemo(() => ({
    login: (data) => {
      localStorage.setItem(USER_AUTH_KEY, 'true');
      if (data?.token) localStorage.setItem('smartcampus_token', data.token);
      if (data?.userId) localStorage.setItem('smartcampus_user_id', data.userId);
      if (data?.username) localStorage.setItem('smartcampus_username', data.username);
      if (data?.email) localStorage.setItem('smartcampus_user_email', data.email);
      if (data?.role) localStorage.setItem('smartcampus_user_role', data.role);
      if (data?.fullName) localStorage.setItem('smartcampus_user_fullname', data.fullName);
      if (data?.department) localStorage.setItem('smartcampus_user_department', data.department);
      setIsAuthenticated(true);
    },
    logout: () => {
      ['smartcampus_user_auth', 'smartcampus_token', 'smartcampus_user_id',
       'smartcampus_username', 'smartcampus_user_email', 'smartcampus_user_role',
       'smartcampus_user_fullname', 'smartcampus_user_department'].forEach(k => localStorage.removeItem(k));
      setIsAuthenticated(false);
      navigate('/login');
    },
  }), [navigate]);

  const protectedRoute = (component) => (
    <ProtectedRoute isAuthenticated={isAuthenticated}>{component}</ProtectedRoute>
  );

  return (
    <div className="app-page">
      <UserTopNav isAuthenticated={isAuthenticated} onLogout={authApi.logout} />
      <main className="page-body">
        <Routes>
          <Route path="/" element={isAuthenticated ? <Navigate to="/home" replace /> : <Landing />} />
          <Route path="/signup" element={<Signup onSignupSuccess={authApi.login} />} />
          <Route path="/login" element={<Login onLoginSuccess={authApi.login} />} />
          <Route path="/home" element={protectedRoute(<Home />)} />
          <Route path="/events" element={protectedRoute(<Events />)} />
          <Route path="/resources" element={protectedRoute(<Resources />)} />
          <Route path="/services" element={protectedRoute(<Services />)} />
          <Route path="/facilities" element={protectedRoute(<Facilities />)} />
          <Route path="/profile" element={protectedRoute(<Profile />)} />
          <Route path="/my-bookings" element={protectedRoute(<MyBookings />)} />
          <Route path="/incidents" element={protectedRoute(<Incidents />)} />
          <Route path="/notifications" element={protectedRoute(<Notifications />)} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default UserApp;
