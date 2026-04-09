import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import FacilitiesAdmin from './FacilitiesAdmin';
import AdminHome from './AdminHome';
import AdminLogin from './AdminLogin';
import ManageUsers from './ManageUsers';
import ManageEvents from './ManageEvents';
import ManageServices from './ManageServices';
import ManageResources from './ManageResources';
import ManageBookings from './ManageBookings';
import ManageIncidents from './ManageIncidents';
import EventCheckIn from './EventCheckIn';
import Notifications from '../user/Notifications';
import { fetchUnreadCount } from '../api';
import '../App.css';

const ADMIN_AUTH_KEY = 'smartcampus_admin_auth';

function ProtectedAdminRoute({ isAuthenticated, children }) {
  const userRole = localStorage.getItem('smartcampus_user_role');
  if (!isAuthenticated || userRole !== 'ADMIN') return <Navigate to="/admin/login" replace />;
  return children;
}

function AdminNotificationBell({ userId, isAuthenticated }) {
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
    <NavLink to="/admin/notifications" className={({ isActive }) => `nav-link bell-link ${isActive ? 'active' : ''}`}>
      🔔
      {count > 0 && <span className="notif-badge">{count > 99 ? '99+' : count}</span>}
    </NavLink>
  );
}

function AdminTopNav({ isAuthenticated, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="top-nav">
      <div className="brand-block">
        <div className="brand-dot" />
        <div>
          <p className="brand-kicker">Smart Campus Platform</p>
          <h1>NUSLIIT Admin Portal</h1>
        </div>
      </div>
      <nav className="nav-links">
        {isAuthenticated ? (
          <>
            <NavLink to="/admin/home" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Dashboard</NavLink>
            <NavLink to="/admin/facilities" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Facilities</NavLink>
            <NavLink to="/admin/bookings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Bookings</NavLink>
            <NavLink to="/admin/incidents" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Incidents</NavLink>
            <NavLink to="/admin/users" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Users</NavLink>
            <div style={{ position: 'relative' }}>
              <button type="button" className="nav-link" onClick={() => setMenuOpen(!menuOpen)} style={{ cursor: 'pointer' }}>More ▾</button>
              {menuOpen && (
                <div style={{ position: 'absolute', top: '100%', right: 0, background: '#1e2437', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', zIndex: 50, minWidth: 160, padding: '6px 0' }}>
                  <NavLink to="/admin/events" className="nav-link" onClick={() => setMenuOpen(false)} style={{ display: 'block', padding: '8px 16px' }}>Events</NavLink>
                  <NavLink to="/admin/services" className="nav-link" onClick={() => setMenuOpen(false)} style={{ display: 'block', padding: '8px 16px' }}>Services</NavLink>
                  <NavLink to="/admin/resources" className="nav-link" onClick={() => setMenuOpen(false)} style={{ display: 'block', padding: '8px 16px' }}>Resources</NavLink>
                </div>
              )}
            </div>
            <AdminNotificationBell isAuthenticated={isAuthenticated} userId={localStorage.getItem('smartcampus_user_id')} />
            <button type="button" className="nav-button" onClick={onLogout}>Logout</button>
          </>
        ) : (
          <>
            <NavLink to="/admin/login" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Admin Login</NavLink>
            <NavLink to="/" className="nav-link">User Site</NavLink>
          </>
        )}
      </nav>
    </header>
  );
}

function AdminApp() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(localStorage.getItem(ADMIN_AUTH_KEY) === 'true');
  
  // Check if user trying to access admin panel is actually an admin
  useEffect(() => {
    const userRole = localStorage.getItem('smartcampus_user_role');
    const token = localStorage.getItem('smartcampus_token');
    
    if (token && userRole && userRole !== 'ADMIN') {
      // Non-admin trying to access admin panel, redirect to user portal
      localStorage.removeItem(ADMIN_AUTH_KEY);
      setIsAuthenticated(false);
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const authApi = useMemo(() => ({
    login: (data) => {
      // Only allow ADMIN role access
      if (data?.role !== 'ADMIN') {
        throw new Error('Admin access required');
      }
      localStorage.setItem(ADMIN_AUTH_KEY, 'true');
      if (data?.token) localStorage.setItem('smartcampus_token', data.token);
      if (data?.userId) localStorage.setItem('smartcampus_user_id', data.userId);
      if (data?.username) localStorage.setItem('smartcampus_username', data.username);
      if (data?.role) localStorage.setItem('smartcampus_user_role', data.role);
      setIsAuthenticated(true);
    },
    logout: () => {
      ['smartcampus_admin_auth', 'smartcampus_token', 'smartcampus_user_id', 'smartcampus_username', 'smartcampus_user_role']
        .forEach(k => localStorage.removeItem(k));
      setIsAuthenticated(false);
      navigate('/admin/login');
    },
  }), [navigate]);

  const protectedRoute = (Component) => (
    <ProtectedAdminRoute isAuthenticated={isAuthenticated}><Component /></ProtectedAdminRoute>
  );

  return (
    <div className="app-page">
      <AdminTopNav isAuthenticated={isAuthenticated} onLogout={authApi.logout} />
      <main className="page-body">
        <Routes>
          <Route path="/" element={<Navigate to={isAuthenticated ? '/admin/home' : '/admin/login'} replace />} />
          <Route path="/login" element={<AdminLogin onLoginSuccess={authApi.login} />} />
          <Route path="/home" element={protectedRoute(AdminHome)} />
          <Route path="/facilities" element={protectedRoute(FacilitiesAdmin)} />
          <Route path="/users" element={protectedRoute(ManageUsers)} />
          <Route path="/bookings" element={protectedRoute(ManageBookings)} />
          <Route path="/incidents" element={protectedRoute(ManageIncidents)} />
          <Route path="/events" element={protectedRoute(ManageEvents)} />
          <Route path="/event-checkin" element={protectedRoute(EventCheckIn)} />
          <Route path="/services" element={protectedRoute(ManageServices)} />
          <Route path="/resources" element={protectedRoute(ManageResources)} />
          <Route path="/notifications" element={protectedRoute(() => <Notifications isAdmin={true} />)} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default AdminApp;
