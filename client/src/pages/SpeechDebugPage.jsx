import React, { useState, useEffect } from 'react';
import { speechDebug } from '../services/speechDebug';
import './SpeechDebugPage.css';

function SpeechDebugPage() {
  const [logs, setLogs] = useState([]);
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [deviceInfo, setDeviceInfo] = useState({});

  useEffect(() => {
    // Update logs when they change
    const updateLogs = () => {
      setLogs([...speechDebug.getLogs()]);
    };

    // Update logs every second
    const interval = setInterval(updateLogs, 1000);
    
    // Get device info
    setDeviceInfo({
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      language: navigator.language,
      deviceMemory: navigator.deviceMemory,
      hardwareConcurrency: navigator.hardwareConcurrency,
      mediaDevices: !!navigator.mediaDevices,
      mediaDevicesGetUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      speechRecognition: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
      capacitor: !!window.Capacitor,
      capacitorPlatform: window.Capacitor?.getPlatform?.() || 'Not available'
    });

    return () => clearInterval(interval);
  }, []);

  const runAllTests = async () => {
    setIsTesting(true);
    setTestResults(null);
    speechDebug.clearLogs();
    
    try {
      const results = await speechDebug.runAllTests();
      setTestResults(results);
    } catch (error) {
      speechDebug.log('Test runner error:', error);
    } finally {
      setIsTesting(false);
    }
  };

  const testCapacitorOnly = async () => {
    setIsTesting(true);
    speechDebug.clearLogs();
    
    try {
      const result = await speechDebug.testCapacitorSpeechRecognition();
      setTestResults({ capacitor: result });
    } catch (error) {
      speechDebug.log('Capacitor test error:', error);
    } finally {
      setIsTesting(false);
    }
  };

  const testWebSpeechOnly = async () => {
    setIsTesting(true);
    speechDebug.clearLogs();
    
    try {
      const result = await speechDebug.testWebSpeechAPI();
      setTestResults({ webSpeech: result });
    } catch (error) {
      speechDebug.log('Web Speech test error:', error);
    } finally {
      setIsTesting(false);
    }
  };

  const testMediaRecorderOnly = async () => {
    setIsTesting(true);
    speechDebug.clearLogs();
    
    try {
      const result = await speechDebug.testMediaRecorder();
      setTestResults({ mediaRecorder: result });
    } catch (error) {
      speechDebug.log('MediaRecorder test error:', error);
    } finally {
      setIsTesting(false);
    }
  };

  const clearLogs = () => {
    speechDebug.clearLogs();
    setLogs([]);
    setTestResults(null);
  };

  const copyLogs = () => {
    const logText = logs.map(log => 
      `[${log.timestamp}ms] ${log.message} ${log.data || ''}`
    ).join('\n');
    
    navigator.clipboard.writeText(logText);
    speechDebug.log('Logs copied to clipboard');
  };

  return (
    <div className="speech-debug-page">
      <div className="debug-header">
        <h1>Speech Recognition Debug</h1>
        <p>For testing on Samsung Galaxy S24 Ultra</p>
      </div>

      <div className="device-info">
        <h2>Device Information</h2>
        <div className="info-grid">
          {Object.entries(deviceInfo).map(([key, value]) => (
            <div key={key} className="info-item">
              <span className="info-key">{key}:</span>
              <span className="info-value">{String(value)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="test-controls">
        <h2>Test Controls</h2>
        <div className="button-group">
          <button 
            className="btn btn-primary" 
            onClick={runAllTests}
            disabled={isTesting}
          >
            {isTesting ? 'Running Tests...' : 'Run All Tests'}
          </button>
          
          <button 
            className="btn btn-secondary" 
            onClick={testCapacitorOnly}
            disabled={isTesting}
          >
            Test Capacitor Only
          </button>
          
          <button 
            className="btn btn-secondary" 
            onClick={testWebSpeechOnly}
            disabled={isTesting}
          >
            Test Web Speech Only
          </button>
          
          <button 
            className="btn btn-secondary" 
            onClick={testMediaRecorderOnly}
            disabled={isTesting}
          >
            Test MediaRecorder Only
          </button>
          
          <button 
            className="btn btn-warning" 
            onClick={clearLogs}
          >
            Clear Logs
          </button>
          
          <button 
            className="btn btn-info" 
            onClick={copyLogs}
          >
            Copy Logs
          </button>
        </div>
      </div>

      {testResults && (
        <div className="test-results">
          <h2>Test Results</h2>
          <div className="results-grid">
            {Object.entries(testResults).map(([key, result]) => (
              <div key={key} className={`result-item ${result?.success ? 'success' : 'error'}`}>
                <h3>{key}</h3>
                <p>Success: {result?.success ? '✅' : '❌'}</p>
                {result?.error && <p>Error: {result.error}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="debug-logs">
        <div className="logs-header">
          <h2>Debug Logs ({logs.length})</h2>
          <button 
            className="btn btn-sm btn-secondary"
            onClick={() => setLogs([...speechDebug.getLogs()])}
          >
            Refresh
          </button>
        </div>
        
        <div className="logs-container">
          {logs.length === 0 ? (
            <p className="no-logs">No logs yet. Run a test to see debug output.</p>
          ) : (
            <div className="logs-list">
              {logs.map((log, index) => (
                <div key={index} className="log-entry">
                  <div className="log-header">
                    <span className="log-timestamp">[{log.timestamp}ms]</span>
                    <span className="log-time">{log.time.split('T')[1].split('.')[0]}</span>
                  </div>
                  <div className="log-message">{log.message}</div>
                  {log.data && (
                    <pre className="log-data">{log.data}</pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="debug-instructions">
        <h2>Instructions</h2>
        <ol>
          <li>Click "Run All Tests" to test all speech recognition methods</li>
          <li>Check the logs for any errors or issues</li>
          <li>If tests fail, try individual tests to isolate the problem</li>
          <li>Copy logs and share them for debugging</li>
          <li>Make sure microphone permission is granted when prompted</li>
          <li>Speak clearly during the tests</li>
        </ol>
        
        <h3>Expected Results:</h3>
        <ul>
          <li><strong>Capacitor Speech Recognition</strong>: Should work on Android devices</li>
          <li><strong>Web Speech API</strong>: May not work on all Android browsers</li>
          <li><strong>MediaRecorder</strong>: Should always work if microphone permission is granted</li>
        </ul>
      </div>
    </div>
  );
}

export default SpeechDebugPage;