import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import AdminApp from './admin/AdminApp';
import UserApp from './user/UserApp';
import './App.css';

// console.cloud.google.com → APIs & Services → Credentials → OAuth 2.0 Client IDs

function App() {
  return (
<GoogleOAuthProvider clientId="525229368487-uae4vna5146dmah7lmshjna5rm985cr1.apps.googleusercontent.com">      <Router>
        <Routes>
          <Route path="/admin/*" element={<AdminApp />} />
          <Route path="/*" element={<UserApp />} />
        </Routes>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;
