import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

function OAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuth } = useAuthStore();
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
        
        // Wait a brief moment for state to update, then redirect
        // Use setTimeout to ensure React state updates are flushed
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 100);
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
