import React, { useEffect } from 'react';

function GoogleAuth() {
  useEffect(() => {
    // Immediately redirect to the API endpoint
    window.location.href = '/api/auth/google';
    
    // Auto-refresh every 2 seconds if stuck on this page
    const interval = setInterval(() => {
      if (window.location.pathname === '/google-auth') {
        window.location.href = '/api/auth/google';
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      flexDirection: 'column',
      gap: '1rem',
      color: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    }}>
      <div className="spinner" style={{
        border: '4px solid rgba(255, 255, 255, 0.3)',
        borderRadius: '50%',
        borderTop: '4px solid white',
        width: '50px',
        height: '50px',
        animation: 'spin 1s linear infinite'
      }}></div>
      <h2 style={{ margin: 0 }}>Redirecting to Google...</h2>
      <p style={{ opacity: 0.9 }}>Please wait</p>
    </div>
  );
}

export default GoogleAuth;
