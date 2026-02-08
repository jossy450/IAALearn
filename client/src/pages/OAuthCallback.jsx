import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Capacitor } from '@capacitor/core';

// Add cache-busting to component
const CACHE_BUSTER = Date.now();

function OAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuth, token: currentToken } = useAuthStore();
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(true);
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    const processOAuthCallback = async () => {
      try {
        const platform = Capacitor.getPlatform();
        const token = searchParams.get('token');
        const userStr = searchParams.get('user');
        const errorParam = searchParams.get('error');
        const errorDesc = searchParams.get('error_description');

        const debug = `Platform: ${platform}, Token: ${!!token}, User: ${!!userStr}, Error: ${errorParam}`;
        console.log('🔐 OAuth Callback Debug:', debug);
        setDebugInfo(debug);

        // Check for OAuth errors
        if (errorParam) {
          const msg = errorDesc || errorParam;
          setError(`OAuth Error: ${msg}. If using mobile, you may need to configure OAuth correctly. Try email/password login instead.`);
          setProcessing(false);
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        if (!token || !userStr) {
          setError('Invalid authentication response. Missing token or user data.');
          setProcessing(false);
          setTimeout(() => navigate('/login'), 2000);
          return;
        }

        // Parse user data
        const user = JSON.parse(decodeURIComponent(userStr));
        
        // Store auth in state and localStorage
        setAuth(token, user);
        
        // Wait briefly for persist middleware to write, then route without hard reload
        const maxAttempts = 50; // 5 seconds max
        let attempts = 0;

        const checkAndNavigate = () => {
          attempts++;

          const stored = localStorage.getItem('auth-storage');
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              if (parsed?.state?.token === token) {
                console.log('✅ Auth stored successfully, navigating to dashboard');
                navigate('/', { replace: true });
                return;
              }
            } catch (e) {
              console.warn('Failed to parse stored auth:', e);
            }
          }

          if (attempts < maxAttempts) {
            setTimeout(checkAndNavigate, 100);
          } else {
            console.warn('Timeout waiting for localStorage sync, navigating anyway');
            navigate('/', { replace: true });
          }
        };

        checkAndNavigate();
      } catch (err) {
        console.error('OAuth callback error:', err);
        setError(`Authentication failed: ${err.message}. Try email/password login instead.`);
        setProcessing(false);
        setTimeout(() => navigate('/login'), 2000);
      }
    };

    processOAuthCallback();
  }, [searchParams, setAuth, navigate]);

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      flexDirection: 'column',
      gap: '1rem',
      padding: '2rem',
      textAlign: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    }}>
      {error ? (
        <>
          <div style={{ color: '#ffaaaa', fontSize: '1.2rem' }}>❌</div>
          <p style={{ color: '#ffaaaa', maxWidth: '500px' }}>{error}</p>
          {debugInfo && (
            <p style={{ fontSize: '12px', opacity: 0.7, marginTop: '1rem', fontFamily: 'monospace' }}>
              {debugInfo}
            </p>
          )}
          <p style={{ fontSize: '14px', marginTop: '1rem' }}>Redirecting to login...</p>
        </>
      ) : (
        <>
          <div className="spinner"></div>
          <p>Signing you in...</p>
          {debugInfo && (
            <p style={{ fontSize: '12px', opacity: 0.7, marginTop: '1rem', fontFamily: 'monospace' }}>
              {debugInfo}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default OAuthCallback;
