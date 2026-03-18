import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Global error handling - prevent crashes
window.onerror = function(msg, url, line, col, error) {
  console.log('Error:', msg, 'at line:', line);
  return true;
};

window.onunhandledrejection = function(event) {
  console.log('Unhandled rejection:', event.reason);
  event.preventDefault();
};

// Initialize plugins with error handling
setTimeout(() => {
  // Initialize Capacitor plugins (non-blocking)
  import('./services/capacitor').then(({ default: capacitorService }) => {
    capacitorService.initialize().catch(() => {});
  }).catch(() => {});
  
  // Initialize Firebase Analytics (non-blocking)
  import('./services/firebaseAnalytics').then(({ initializeAnalytics, trackSession }) => {
    initializeAnalytics().then(() => {
      trackSession();
    }).catch(() => {});
  }).catch(() => {});
  
  // Initialize Push Notifications (non-blocking)
  import('./services/pushNotifications').then(({ initializePushNotifications }) => {
    initializePushNotifications().catch(() => {});
  }).catch(() => {});
}, 100);

// Render app
try {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch(e) {
  console.error('Render error:', e);
  document.body.innerHTML = '<div style="padding:40px;text-align:center;font-family:sans-serif;"><h1>IAALearn</h1><p>Loading...</p></div>';
}
