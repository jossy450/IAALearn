import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
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

// Wrapper component to check auth status
function ProtectedRoute({ children }) {
  const { token } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    // If user loses token (logged out), redirect to login
    if (!token) {
      navigate('/login', { replace: true });
    }
  }, [token, navigate]);

  return token ? children : null;
}

function App() {
  const { token, user } = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Check if Zustand has already hydrated from persist middleware
    // The persist middleware marks the store as hydrated
    const checkHydration = () => {
      // If there's a token, we're hydrated
      if (useAuthStore.getState().token) {
        setIsHydrated(true);
        return;
      }
      
      // Check localStorage directly for auth data
      const stored = localStorage.getItem('auth-storage');
      if (stored) {
        setIsHydrated(true);
        return;
      }
      
      // Not hydrated yet, try again soon
      const timer = setTimeout(checkHydration, 50);
      return () => clearTimeout(timer);
    };

    const cleanup = checkHydration();
    return cleanup || undefined;
  }, []);

  // Show loading spinner while hydrating
  if (!isHydrated) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh'
      }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <Router>
      <StealthManager />
      <Routes>
        <Route path="/login" element={token ? <Navigate to="/" /> : <Login />} />
        <Route path="/register" element={token ? <Navigate to="/" /> : <Register />} />
        <Route path="/forgot-password" element={token ? <Navigate to="/" /> : <ForgotPassword />} />
        <Route path="/reset-password" element={token ? <Navigate to="/" /> : <ResetPassword />} />
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
