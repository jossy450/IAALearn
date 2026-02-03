import React, { useState, useEffect } from 'react';
import { AlertCircle, Smartphone, Eye, Monitor } from 'lucide-react';
import '../styles/ScreenShareDetector.css';

function ScreenShareDetector({ isScreenShareDetected, onScreenShareDetected, onMobileRequired }) {
  const [showWarning, setShowWarning] = useState(false);
  const [meetingAppDetected, setMeetingAppDetected] = useState(null);

  // Detect meeting app from various sources
  const detectMeetingApp = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    const title = document.title.toLowerCase();
    const href = window.location.href.toLowerCase();

    // Meeting app detection patterns
    const patterns = [
      { name: 'Zoom', regex: /zoom|zoomvideo/i },
      { name: 'Google Meet', regex: /meet\.google|google.*meet/i },
      { name: 'Microsoft Teams', regex: /teams\.microsoft|teams\.live|microsoft.*teams/i },
      { name: 'Webex', regex: /webex|cisco/i },
      { name: 'Skype', regex: /skype/i },
      { name: 'Discord', regex: /discord/i }
    ];

    for (const app of patterns) {
      if (app.regex.test(userAgent) || app.regex.test(title) || app.regex.test(href)) {
        return app.name;
      }
    }

    return null;
  };

  useEffect(() => {
    // Detect if we're in a meeting app
    const detectedApp = detectMeetingApp();
    setMeetingAppDetected(detectedApp);
    
    // If we detect a meeting app and haven't already shown a warning,
    // show a one-time advisory without triggering any browser prompts.
    if (detectedApp && !isScreenShareDetected) {
      setShowWarning(true);
      onScreenShareDetected(true);
    }

    // No advanced polling or media API calls here to avoid
    // repeatedly opening the browser's screen-share dialog.
  }, [isScreenShareDetected, onScreenShareDetected]);

  const handleSwitchToMobile = () => {
    onMobileRequired();
    setShowWarning(false);
  };

  const handleStoppedSharing = () => {
    setShowWarning(false);
    onScreenShareDetected(false);
  };

  if (!showWarning) {
    return null;
  }

  return (
    <div className="screen-share-detector-overlay">
      <div className="screen-share-warning-modal">
        <div className="warning-icon">
          <AlertCircle size={48} />
        </div>

        <h2 className="warning-title">Screen Sharing Detected!</h2>

        <p className="warning-message">
          We detected that you are sharing your entire screen during this interview session. 
          This means the interviewer can see your AI-generated answers!
        </p>

        <div className="warning-details">
          <div className="detail-item">
            <Eye size={20} />
            <div>
              <strong>Your Answers Are Visible</strong>
              <p>The interviewer can see the AI-generated answers on your screen</p>
            </div>
          </div>
          <div className="detail-item">
            <Smartphone size={20} />
            <div>
              <strong>Switch to Mobile Mode</strong>
              <p>Use a separate mobile device to view answers discreetly</p>
            </div>
          </div>
          {meetingAppDetected && (
            <div className="detail-item">
              <Monitor size={20} />
              <div>
                <strong>{meetingAppDetected} Detected</strong>
                <p>You are currently in a {meetingAppDetected} session</p>
              </div>
            </div>
          )}
        </div>

        <div className="warning-actions">
          <button 
            className="btn-mobile-mode"
            onClick={handleSwitchToMobile}
          >
            <Smartphone size={20} />
            Switch to Mobile Mode
          </button>
          <button 
            className="btn-stop-sharing"
            onClick={handleStoppedSharing}
          >
            I've Stopped Screen Sharing
          </button>
        </div>

        <div className="warning-note">
          <p>
            Mobile mode allows you to use this application on your phone to receive 
            interview answers without exposing them on your laptop screen. Join this 
            session from your mobile device using the QR code.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ScreenShareDetector;
