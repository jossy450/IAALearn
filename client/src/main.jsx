import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import capacitorService from './services/capacitor';

// Global error logging - attach after DOM ready to avoid initialization issues
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('error', (event) => {
      // eslint-disable-next-line no-console
      console.error('GlobalError', event.error?.message || event.message || event);
    });
    window.addEventListener('unhandledrejection', (event) => {
      // eslint-disable-next-line no-console
      console.error('UnhandledRejection', event.reason?.message || event.reason || event);
    });
  });
}

// Initialize Capacitor (non-blocking)
capacitorService.initialize().catch((err) => {
  console.warn('Capacitor initialization skipped or failed:', err);
});

// Render immediately, don't wait for Capacitor
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
