import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import Signup from './Signup';
import Login from './Login';
import Home from './Home';
import Landing from './Landing';
import Facilities from './Facilities';
import Events from './Events';
import Profile from './Profile';
import MyBookings from './MyBookings';
import Incidents from './Incidents';
import TechnicianDashboard from './TechnicianDashboard';
import Notifications from './Notifications';
import { fetchUnreadCount, isTechnician } from '../api';
import { useNotificationSound } from '../utils/useNotificationSound';
import '../App.css';

const USER_AUTH_KEY = 'smartcampus_user_auth';

function ProtectedRoute({ isAuthenticated, children }) {
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function NotificationBell({ userId, isAuthenticated }) {
  const [count, setCount] = useState(0);

  // 🔔 Play bell sound whenever new notifications arrive
  useNotificationSound(count);

  const loadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await fetchUnreadCount();
      setCount(data.count || 0);
    } catch { }
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

function UserTopNav({ isAuthenticated, onLogout, toggleTheme, theme }) {
  const [userInfo, setUserInfo] = useState({
    username: localStorage.getItem('smartcampus_username'),
    fullName: localStorage.getItem('smartcampus_user_fullname'),
    role: localStorage.getItem('smartcampus_user_role')
  });

  // Keep userInfo in sync with localStorage when authentication state changes
  useEffect(() => {
    if (isAuthenticated) {
      setUserInfo({
        username: localStorage.getItem('smartcampus_username'),
        fullName: localStorage.getItem('smartcampus_user_fullname'),
        role: localStorage.getItem('smartcampus_user_role')
      });
    } else {
      setUserInfo({ username: null, fullName: null, role: null });
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const handleProfileUpdate = (e) => {
      const updated = e.detail;
      setUserInfo({
        username: updated.username || localStorage.getItem('smartcampus_username'),
        fullName: updated.fullName,
        role: updated.role || localStorage.getItem('smartcampus_user_role')
      });
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, []);

  const displayName = userInfo.fullName || userInfo.username || '';
  const userId = localStorage.getItem('smartcampus_user_id');
  const isTech = userInfo.role === 'TECHNICIAN';

  return (
    <header className="top-nav">
      <div className="brand-block">
        <div className="brand-dot" />
        <div>
          <p className="brand-kicker">Smart Campus</p>
          <h1>{isTech ? '🔧 NUSLIIT Support' : 'NUSLIIT Premium'}</h1>
        </div>
      </div>

      <nav className="nav-links">
        {isAuthenticated ? (
          <>
            {isTech ? (
              <>
                <NavLink to="/technician-dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Home</NavLink>
                <NavLink to="/profile" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  {displayName ? `👤 ${displayName}` : 'Profile'}
                </NavLink>
                <NotificationBell isAuthenticated={isAuthenticated} userId={userId} />
                <button type="button" className="nav-button" onClick={onLogout}>Logout</button>
              </>
            ) : (
              <>
                <NavLink to="/home" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Home</NavLink>
                <NavLink to="/events" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Events</NavLink>
                <NavLink to="/facilities" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Facilities</NavLink>
                <NavLink to="/my-bookings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>My Bookings</NavLink>
                <NavLink to="/incidents" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Incidents</NavLink>
                <NavLink to="/profile" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  {displayName ? `👤 ${displayName}` : 'Profile'}
                </NavLink>
                <NotificationBell isAuthenticated={isAuthenticated} userId={userId} />
                <button type="button" className="nav-button" onClick={onLogout}>Logout</button>
              </>
            )}
          </>
        ) : (
          <>
            <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Overview</NavLink>
            <NavLink to="/login" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Login</NavLink>
            <NavLink to="/signup" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Signup</NavLink>
          </>
        )}
        <button type="button" className="theme-toggle-btn" onClick={toggleTheme} title="Toggle Theme">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </nav>
    </header>
  );
}

function UserApp() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(localStorage.getItem(USER_AUTH_KEY) === 'true');
  const [theme, setTheme] = useState(() => localStorage.getItem('smartcampus_theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('smartcampus_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Check if user is trying to access user app while being admin
  useEffect(() => {
    const userRole = localStorage.getItem('smartcampus_user_role');
    const token = localStorage.getItem('smartcampus_token');

    if (token && userRole === 'ADMIN') {
      // Redirect admin to admin panel
      navigate('/admin/home', { replace: true });
      setIsAuthenticated(false);
      return;
    }
  }, [navigate]);

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

      if (data?.role === 'ADMIN') {
        // ✅ Also set admin auth so AdminApp recognises the session (no second login needed)
        localStorage.setItem('smartcampus_admin_auth', 'true');
        navigate('/admin/home', { replace: true });
      } else if (data?.role === 'TECHNICIAN') {
        navigate('/technician-dashboard', { replace: true });
      } else {
        navigate('/home', { replace: true });
      }
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
      <UserTopNav isAuthenticated={isAuthenticated} onLogout={authApi.logout} toggleTheme={toggleTheme} theme={theme} />
      <main className="page-body">
        <Routes>
          <Route path="/" element={isAuthenticated ? (isTechnician() ? <Navigate to="/technician-dashboard" replace /> : <Navigate to="/home" replace />) : <Landing />} />
          <Route path="/signup" element={<Signup onSignupSuccess={authApi.login} />} />
          <Route path="/login" element={<Login onLoginSuccess={authApi.login} />} />
          <Route path="/home" element={protectedRoute(<Home />)} />
          <Route path="/technician-dashboard" element={protectedRoute(<TechnicianDashboard />)} />
          
          <Route path="/events" element={protectedRoute(<Events />)} />
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
