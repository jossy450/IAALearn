import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import OAuthCallback from './pages/OAuthCallback';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import InterviewSession from './pages/InterviewSession';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Mobile from './pages/Mobile';
import StealthSettings from './pages/StealthSettings';
import DecoyScreen from './pages/DecoyScreen';
import MobileScanner from './pages/MobileScanner';
import MobileSession from './pages/MobileSession';
import StealthManager from './components/StealthManager';

function App() {
  const { token, user } = useAuthStore();

  return (
    <Router>
      <StealthManager />
      <Routes>
        <Route path="/login" element={token ? <Navigate to="/" /> : <Login />} />
        <Route path="/register" element={token ? <Navigate to="/" /> : <Register />} />
        <Route path="/auth/callback" element={<OAuthCallback />} />
        <Route path="/decoy/:type" element={<DecoyScreen />} />
        <Route path="/mobile-transfer" element={<MobileScanner />} />
        <Route path="/mobile-session/:sessionId" element={<MobileSession />} />
        <Route path="/admin" element={user?.role === 'admin' ? <AdminDashboard /> : <Navigate to="/" />} />
        
        <Route path="/" element={token ? <Layout /> : <Navigate to="/login" />}>
          <Route index element={<Dashboard />} />
          <Route path="session/:id" element={<InterviewSession />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="settings" element={<Settings />} />
          <Route path="stealth" element={<StealthSettings />} />
          <Route path="mobile" element={<Mobile />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
