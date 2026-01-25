import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import capacitorService from './services/capacitor';

// Initialize Capacitor
capacitorService.initialize().catch(console.error);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
