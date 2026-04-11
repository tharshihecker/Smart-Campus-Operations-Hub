import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, useNavigate, useLocation } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import AdminApp from './admin/AdminApp';
import UserApp from './user/UserApp';
import './App.css';

// console.cloud.google.com → APIs & Services → Credentials → OAuth 2.0 Client IDs

function RoleBasedRouter() {
  const navigate = useNavigate();
  const location = useLocation();
  const [initialized, setInitialized] = useState(false);
  
  useEffect(() => {
    // Get user role from localStorage
    const userRole = localStorage.getItem('smartcampus_user_role');
    const token = localStorage.getItem('smartcampus_token');
    
    // If authenticated, route based on role
    if (token && userRole) {
      setInitialized(true);
      
      // Route to appropriate app based on role
      if (userRole === 'ADMIN' && !location.pathname.startsWith('/admin')) {
        navigate('/admin/home', { replace: true });
      } else if ((userRole === 'USER' || userRole === 'TECHNICIAN' || userRole === 'STAFF') && location.pathname.startsWith('/admin') && !location.pathname.startsWith('/admin/login')) {
        navigate('/home', { replace: true });
      }
    }
    
    setInitialized(true);
  }, []);
  
  if (!initialized) {
    return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>Loading...</div>;
  }
  
  return (
    <Routes>
      <Route path="/admin/*" element={<AdminApp />} />
      <Route path="/*" element={<UserApp />} />
    </Routes>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId="525229368487-uae4vna5146dmah7lmshjna5rm985cr1.apps.googleusercontent.com">
      <Router>
        <RoleBasedRouter />
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;
