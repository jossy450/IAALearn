import React, { useState, useEffect } from 'react';
import { Smartphone, RefreshCw, Link as LinkIcon } from 'lucide-react';
import { mobileAPI } from '../services/api';
import { useSessionStore } from '../store/sessionStore';
import './Mobile.css';

function Mobile() {
  const [connectionCode, setConnectionCode] = useState(null);
  const [mobileSessions, setMobileSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const { currentSession } = useSessionStore();

  useEffect(() => {
    loadMobileSessions();
  }, []);

  const loadMobileSessions = async () => {
    try {
      const response = await mobileAPI.getSessions();
      setMobileSessions(response.data.sessions);
    } catch (error) {
      console.error('Failed to load mobile sessions:', error);
    }
  };

  const generateCode = async () => {
    setLoading(true);
    try {
      const response = await mobileAPI.generateCode({
        sessionId: currentSession?.id,
        deviceType: 'mobile'
      });
      setConnectionCode(response.data.connectionCode);
      setTimeout(() => {
        setConnectionCode(null);
      }, 300000); // Code expires after 5 minutes
    } catch (error) {
      console.error('Failed to generate code:', error);
      alert('Failed to generate connection code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const disconnect = async (sessionId) => {
    try {
      await mobileAPI.disconnect({ sessionId });
      loadMobileSessions();
      alert('Mobile device disconnected successfully!');
    } catch (error) {
      console.error('Failed to disconnect:', error);
      alert('Failed to disconnect. Please try again.');
    }
  };

  return (
    <div className="mobile-page">
      <div className="mobile-header">
        <h1>Mobile Companion</h1>
        <p className="subtitle">Control interview assistant from your phone</p>
      </div>

      <div className="card">
        <div className="card-header">
          <Smartphone size={24} />
          <h2>Connect Mobile Device</h2>
        </div>

        <div className="mobile-content">
          <div className="mobile-instructions">
            <h3>How to Connect</h3>
            <ol>
              <li>Open the Interview Assistant mobile app on your phone</li>
              <li>Tap "Connect to Desktop"</li>
              <li>Enter the 6-digit code shown below</li>
              <li>Your phone will mirror the desktop interface</li>
            </ol>
          </div>

          <div className="connection-section">
            {!connectionCode ? (
              <button
                className="btn btn-primary btn-large"
                onClick={generateCode}
                disabled={loading}
              >
                <LinkIcon size={20} />
                {loading ? 'Generating...' : 'Generate Connection Code'}
              </button>
            ) : (
              <div className="connection-code-display">
                <div className="connection-code">{connectionCode}</div>
                <p className="code-expiry">Code expires in 5 minutes</p>
                <button
                  className="btn btn-secondary"
                  onClick={generateCode}
                >
                  <RefreshCw size={18} />
                  Generate New Code
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Connections */}
      <div className="card">
        <h2 className="card-title">Active Connections</h2>
        {mobileSessions.length === 0 ? (
          <div className="empty-state">
            <Smartphone size={48} />
            <p>No active mobile connections</p>
          </div>
        ) : (
          <div className="mobile-sessions-list">
            {mobileSessions.map((session) => (
              <div key={session.id} className="mobile-session-item">
                <div className="mobile-session-info">
                  <Smartphone size={20} />
                  <div>
                    <div className="mobile-session-device">
                      {session.device_type || 'Mobile Device'}
                    </div>
                    <div className="mobile-session-time">
                      Connected: {new Date(session.connected_at).toLocaleString()}
                    </div>
                  </div>
                </div>
                <button
                  className="btn btn-danger btn-small"
                  onClick={() => disconnect(session.id)}
                >
                  Disconnect
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Features */}
      <div className="card">
        <h2 className="card-title">Mobile Features</h2>
        <div className="features-grid">
          <div className="feature-item">
            <div className="feature-icon">🎤</div>
            <h3>Voice Control</h3>
            <p>Ask questions using your phone's microphone</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">👁️</div>
            <h3>Discrete View</h3>
            <p>View answers on your phone without looking at the screen</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">🔔</div>
            <h3>Notifications</h3>
            <p>Get instant answer notifications on your phone</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">🔒</div>
            <h3>Secure</h3>
            <p>End-to-end encrypted connection</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Mobile;
