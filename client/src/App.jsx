import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import { initializePushNotifications } from './services/pushNotifications';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import GoogleAuth from './pages/GoogleAuth';
import OAuthCallback from './pages/OAuthCallback';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import InterviewSession from './pages/InterviewSession';
import MobileInterviewSession from './pages/MobileInterviewSession';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Mobile from './pages/Mobile';
import StealthSettings from './pages/StealthSettings';
import DecoyScreen from './pages/DecoyScreen';
import MobileScanner from './pages/MobileScanner';
import MobileSession from './pages/MobileSession';
import StealthManager from './components/StealthManager';
import SubscriptionPage from './pages/SubscriptionPage';
import CheckoutReturn from './pages/CheckoutReturn';

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
    // Initialize push notifications on app mount (native platforms only)
    initializePushNotifications();
  }, []);

  useEffect(() => {
    let cancelled = false;

    // Force render after max 1 second, even if hydration hasn't completed
    const maxWaitTimer = setTimeout(() => {
      if (cancelled) return;
      console.log('Forcing hydration complete after timeout');
      setIsHydrated(true);
    }, 1000);

    // Give persist middleware a moment to hydrate, then allow render even if no token
    const timer = setTimeout(() => {
      if (cancelled) return;
      setIsHydrated(true);
      clearTimeout(maxWaitTimer);
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearTimeout(maxWaitTimer);
    };
  }, []);

  // Show loading spinner while hydrating (max 1 second)
  if (!isHydrated) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        background: 'radial-gradient(circle at 20% 20%, rgba(31,182,255,0.16), transparent 35%), linear-gradient(145deg, #05080f, #0b1220)'
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
        <Route path="/google-auth" element={<GoogleAuth />} />
        <Route path="/auth/callback" element={<OAuthCallback />} />
        <Route path="/decoy/:type" element={<DecoyScreen />} />
        <Route path="/mobile-transfer" element={<MobileScanner />} />
        <Route path="/mobile-session/:sessionId" element={<MobileSession />} />
        <Route path="/mobile/:sessionId" element={<MobileInterviewSession />} />
        <Route path="/admin" element={user?.role === 'admin' ? <AdminDashboard /> : <Navigate to="/" />} />
        
        {/* Stripe returns here after checkout — needs auth but no Layout chrome */}
        <Route path="/checkout/return" element={token ? <CheckoutReturn /> : <Navigate to="/login" />} />

        <Route path="/" element={token ? <Layout /> : <Navigate to="/login" />}>
          <Route index element={<Dashboard />} />
          <Route path="session/:id" element={<InterviewSession />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="settings" element={<Settings />} />
          <Route path="stealth" element={<StealthSettings />} />
          <Route path="mobile" element={<Mobile />} />
          <Route path="subscription" element={<SubscriptionPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
