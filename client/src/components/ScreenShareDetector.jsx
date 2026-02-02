import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, Smartphone, Eye, Monitor } from 'lucide-react';
import '../styles/ScreenShareDetector.css';

function ScreenShareDetector({ isScreenShareDetected, onScreenShareDetected, onMobileRequired }) {
  const [showWarning, setShowWarning] = useState(false);
  const [meetingAppDetected, setMeetingAppDetected] = useState(null);
  const detectionIntervalRef = useRef(null);
  const screenStreamRef = useRef(null);

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

  // Advanced screen share detection
  const detectScreenSharing = async () => {
    try {
      // Method 1: Try to request display media (only works if screen is already being shared)
      if (navigator.mediaDevices?.getDisplayMedia) {
        // Check if user has active screen share by attempting to list display media
        const displayMediaOptions = {
          video: {
            cursor: 'always',
            displaySurface: 'monitor'
          },
          audio: false
        };

        // Try to get display media
        const stream = await Promise.race([
          navigator.mediaDevices.getDisplayMedia(displayMediaOptions),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('timeout')), 100)
          )
        ]);

        // If successful, screen share is active
        if (stream && stream.active) {
          // Store reference to stop it
          screenStreamRef.current = stream;
          
          // Stop all tracks immediately
          stream.getTracks().forEach(track => track.stop());
          
          return true;
        }
      }
    } catch (error) {
      // Expected: User denied permission or timeout
      // This means no screen sharing was active
    }

    return false;
  };

  // Alternative detection: Monitor document visibility and focus changes
  // Screen share in meeting apps often causes visibility changes
  const monitorSessionActivity = () => {
    let focusLostCount = 0;
    let lastFocusTime = Date.now();

    const handleFocus = () => {
      const timeSinceLastFocus = Date.now() - lastFocusTime;
      
      // If tab regained focus after < 100ms, likely screen sharing in another tab
      if (timeSinceLastFocus < 100) {
        focusLostCount++;
      } else {
        focusLostCount = Math.max(0, focusLostCount - 1);
      }

      lastFocusTime = Date.now();
    };

    const handleBlur = () => {
      // Tab lost focus - could indicate meeting app is active
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  };

  useEffect(() => {
    // Detect if we're in a meeting app
    const detectedApp = detectMeetingApp();
    setMeetingAppDetected(detectedApp);

    // Only run screen share detection if in stealth mode
    if (!isScreenShareDetected) {
      const detectAndMonitor = async () => {
        const isSharing = await detectScreenSharing();
        
        if (isSharing) {
          onScreenShareDetected(true);
          setShowWarning(true);
        }
      };

      // Initial detection
      detectAndMonitor();

      // Periodic detection every 3 seconds
      detectionIntervalRef.current = setInterval(detectAndMonitor, 3000);

      // Monitor visibility changes
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          detectAndMonitor();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        clearInterval(detectionIntervalRef.current);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        monitorSessionActivity();
        
        // Cleanup screen stream if any
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach(track => track.stop());
        }
      };
    }

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [isScreenShareDetected, onScreenShareDetected]);

  const handleSwitchToMobile = () => {
    // Stop any active screen streams
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    onMobileRequired();
    setShowWarning(false);
  };

  const handleStoppedSharing = () => {
    // Stop any active screen streams
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
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
