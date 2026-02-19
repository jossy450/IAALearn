import React, { useEffect, useCallback } from 'react';
import useStealthStore from '../store/stealthStore';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';

const StealthManager = () => {
  const {
    stealthMode,
    panicKey,
    detection,
    isScreenBeingRecorded,
    setScreenRecording,
    triggerPanic,
    hideApp
  } = useStealthStore();

  // Allow disabling stealth detection in non-production via Vite env
  const disableStealth = (import.meta.env.VITE_DISABLE_STEALTH === 'true');
  if (disableStealth) return null;

  // Panic button handler
  const handleKeyPress = useCallback((e) => {
    const { key, modifiers } = panicKey;
    
    const modifiersMatch = 
      (!modifiers.includes('Ctrl') || e.ctrlKey) &&
      (!modifiers.includes('Alt') || e.altKey) &&
      (!modifiers.includes('Shift') || e.shiftKey);
    
    if (e.key === key && modifiersMatch) {
      e.preventDefault();
      triggerPanic();
    }
  }, [panicKey, triggerPanic]);

  // Screen sharing detection - passive monitoring only
  // Detects if screen might be shared based on visibility and focus changes
  useEffect(() => {
    if (!detection.screenRecording) return;

    let wasVisible = !document.hidden;
    let wasFocused = document.hasFocus();

    const checkScreenShareIndicators = () => {
      const isVisible = !document.hidden;
      const isFocused = document.hasFocus();

      // If tab becomes visible but not focused, might indicate screen sharing
      if (isVisible && !isFocused && (wasVisible !== isVisible || wasFocused !== isFocused)) {
        console.log('Potential screen share detected - tab visible but not focused');
        setScreenRecording(true);
        
        if (detection.autoHide) {
          hideApp();
        }
      }

      // Reset detection if user interacts normally
      if (isFocused) {
        setScreenRecording(false);
      }

      wasVisible = isVisible;
      wasFocused = isFocused;
    };

    const visibilityHandler = () => checkScreenShareIndicators();
    const focusHandler = () => checkScreenShareIndicators();
    const blurHandler = () => checkScreenShareIndicators();

    document.addEventListener('visibilitychange', visibilityHandler);
    window.addEventListener('focus', focusHandler);
    window.addEventListener('blur', blurHandler);
    
    return () => {
      document.removeEventListener('visibilitychange', visibilityHandler);
      window.removeEventListener('focus', focusHandler);
      window.removeEventListener('blur', blurHandler);
    };
  }, [detection, setScreenRecording, hideApp]);

  // Tab visibility detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && stealthMode) {
        // Tab is hidden - user might have alt+tabbed
        console.log('Tab hidden - stealth mode active');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [stealthMode]);

  // Mouse gesture detection (triple-click panic)
  useEffect(() => {
    let clickCount = 0;
    let clickTimer = null;

    const handleClick = (e) => {
      // Check if clicking in top-right corner (within 50px)
      if (e.clientX > window.innerWidth - 50 && e.clientY < 50) {
        clickCount++;
        
        if (clickTimer) clearTimeout(clickTimer);
        
        if (clickCount === 3) {
          triggerPanic();
          clickCount = 0;
        } else {
          clickTimer = setTimeout(() => {
            clickCount = 0;
          }, 500);
        }
      }
    };

    if (stealthMode) {
      window.addEventListener('click', handleClick);
    }

    return () => {
      window.removeEventListener('click', handleClick);
      if (clickTimer) clearTimeout(clickTimer);
    };
  }, [stealthMode, triggerPanic]);

  // Keyboard listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Screen recording alert
  if (isScreenBeingRecorded && detection.alertUser) {
    return (
      <div className="fixed top-4 right-4 z-50 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
        <AlertCircle size={20} />
        <span>Screen Recording Detected!</span>
      </div>
    );
  }

  // Stealth mode indicator (subtle)
  if (stealthMode) {
    return (
      <div className="fixed bottom-4 right-4 z-50 bg-gray-800 text-gray-400 px-2 py-1 rounded text-xs opacity-30 hover:opacity-100 transition-opacity">
        <EyeOff size={12} className="inline mr-1" />
        Stealth
      </div>
    );
  }

  return null;
};

export default StealthManager;
