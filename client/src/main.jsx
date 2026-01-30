import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import capacitorService from './services/capacitor';

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
