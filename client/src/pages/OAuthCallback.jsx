import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

function OAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuth, token: currentToken } = useAuthStore();
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const processOAuthCallback = async () => {
      try {
        const token = searchParams.get('token');
        const userStr = searchParams.get('user');

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
        
        // Wait for multiple conditions to ensure everything is ready:
        // 1. Zustand persist middleware writes to localStorage
        // 2. Store subscription updates
        // 3. App.jsx detects the token
        const maxAttempts = 50; // 5 seconds max
        let attempts = 0;
        
        const checkAndNavigate = () => {
          attempts++;
          
          // Check if token is in localStorage
          const stored = localStorage.getItem('auth-storage');
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              if (parsed?.state?.token === token) {
                // Token is properly stored, navigate immediately
                navigate('/', { replace: true });
                return;
              }
            } catch (e) {
              console.warn('Failed to parse stored auth:', e);
            }
          }
          
          if (attempts < maxAttempts) {
            // Keep checking every 100ms
            setTimeout(checkAndNavigate, 100);
          } else {
            // Timeout - just navigate anyway, App.jsx will handle it
            console.warn('Timeout waiting for localStorage sync, navigating anyway');
            navigate('/', { replace: true });
          }
        };
        
        // Start checking
        checkAndNavigate();
      } catch (err) {
        console.error('OAuth callback error:', err);
        setError(`Authentication failed: ${err.message}`);
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
      gap: '1rem'
    }}>
      {error ? (
        <>
          <div style={{ color: 'red', fontSize: '1.2rem' }}>❌</div>
          <p style={{ color: 'red' }}>{error}</p>
        </>
      ) : (
        <>
          <div className="spinner"></div>
          <p>Signing you in...</p>
        </>
      )}
    </div>
  );
}

export default OAuthCallback;
