import React, { useState } from 'react';
import { 
  Shield, Settings, Eye, EyeOff, Keyboard, Copy, 
  Monitor, Smartphone, AlertTriangle, Minimize2,
  Square, CheckSquare
} from 'lucide-react';
import useStealthStore from '../store/stealthStore';
import { 
  disguiseThemes, 
  quickHideOptions, 
  floatingWidgetOptions,
  stealthFeatures 
} from '../config/stealth';
import './StealthSettings.css';

const StealthSettings = () => {
  const {
    activeDisguise,
    stealthMode,
    panicKey,
    panicAction,
    decoyScreen,
    floatingWidget,
    detection,
    quickCopy,
    silentMode,
    pipEnabled,
    clipboardHistory,
    setActiveDisguise,
    toggleStealthMode,
    setPanicKey,
    setPanicAction,
    setDecoyScreen,
    updateFloatingWidget,
    toggleFloatingWidget,
    updateDetection,
    updateQuickCopy,
    toggleSilentMode,
    togglePIP,
    clearClipboardHistory
  } = useStealthStore();

  const [selectedPanicKey, setSelectedPanicKey] = useState(panicKey.key);

  return (
    <div className="stealth-container">
      <div className="stealth-content">
        {/* Header */}
        <div className="stealth-section">
          <div className="stealth-header">
            <div>
              <h1>
                <Shield />
                Stealth & Disguise Settings
              </h1>
              <p className="stealth-subtitle">
                Configure undetectable interview assistance features
              </p>
            </div>
            <button
              onClick={toggleStealthMode}
              className={`stealth-toggle ${stealthMode ? 'active' : 'inactive'}`}
            >
              {stealthMode ? <Eye size={20} /> : <EyeOff size={20} />}
              {stealthMode ? 'Stealth ON' : 'Stealth OFF'}
            </button>
          </div>
        </div>

        {/* Disguise Themes */}
        <div className="stealth-section">
          <h2>
            <Monitor />
            Disguise Themes
          </h2>
          <p className="stealth-description">
            Make the app look like a different application to avoid detection
          </p>
          <div className="disguise-grid">
            {disguiseThemes.map(theme => (
              <button
                key={theme.id}
                onClick={() => setActiveDisguise(theme.id)}
                className={`disguise-button ${activeDisguise === theme.id ? 'active' : ''}`}
              >
                <div className="disguise-icon">{theme.icon}</div>
                <div className="disguise-name">{theme.name}</div>
                <div className="disguise-desc">{theme.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Panic Button Configuration */}
        <div className="stealth-section">
          <h2>
            <Keyboard />
            Panic Button (Boss Key)
          </h2>
          <p className="stealth-description">
            Instantly hide the app when interviewer gets suspicious
          </p>
          
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Panic Key</label>
              <select
                value={selectedPanicKey}
                onChange={(e) => {
                  setSelectedPanicKey(e.target.value);
                  setPanicKey(e.target.value, []);
                }}
                className="form-select"
              >
                {quickHideOptions.panicKeys.map(option => (
                  <option key={option.label} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Panic Action</label>
              <select
                value={panicAction}
                onChange={(e) => setPanicAction(e.target.value)}
                className="form-select"
              >
                {quickHideOptions.hideActions.map(action => (
                  <option key={action.id} value={action.id}>
                    {action.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Decoy Screen</label>
            <select
              value={decoyScreen}
              onChange={(e) => setDecoyScreen(e.target.value)}
              className="form-select"
            >
              <option value="google-search">Google Search</option>
              <option value="stackoverflow">Stack Overflow</option>
              <option value="documentation">Technical Documentation</option>
              <option value="blank">Blank Screen</option>
            </select>
          </div>

          <div className="stealth-alert stealth-alert-warning">
            <AlertTriangle className="stealth-alert-icon" size={20} />
            <div className="stealth-alert-content">
              <h3>Quick Escape</h3>
              <p>Triple-click top-right corner or press your panic key to activate decoy screen</p>
            </div>
          </div>
        </div>

        {/* Floating Widget */}
        <div className="stealth-section">
          <div className="stealth-header">
            <h2>
              <Square />
              Floating Answer Widget
            </h2>
            <button
              onClick={toggleFloatingWidget}
              className={`stealth-btn stealth-btn-${floatingWidget.enabled ? 'primary' : 'secondary'}`}
            >
              {floatingWidget.enabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
          <p className="stealth-description">
            Show answers in a small floating window (like sticky note)
          </p>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Size</label>
              <select
                value={floatingWidget.size}
                onChange={(e) => updateFloatingWidget({ size: e.target.value })}
                className="form-select"
              >
                {floatingWidgetOptions.sizes.map(size => (
                  <option key={size.id} value={size.id}>{size.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Position</label>
              <select
                value={floatingWidget.position}
                onChange={(e) => updateFloatingWidget({ position: e.target.value })}
                className="form-select"
              >
                {floatingWidgetOptions.positions.map(pos => (
                  <option key={pos.id} value={pos.id}>{pos.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Opacity</label>
              <input
                type="range"
                min="0.3"
                max="1.0"
                step="0.1"
                value={floatingWidget.opacity}
                onChange={(e) => updateFloatingWidget({ opacity: parseFloat(e.target.value) })}
                className="form-input"
                style={{ width: '100%' }}
              />
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '0.5rem' }}>
                {Math.round(floatingWidget.opacity * 100)}%
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Style</label>
              <select
                value={floatingWidget.style}
                onChange={(e) => updateFloatingWidget({ style: e.target.value })}
                className="form-select"
              >
                {floatingWidgetOptions.styles.map(style => (
                  <option key={style.id} value={style.id}>{style.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Detection & Evasion */}
        <div className="stealth-section">
          <h2>
            <AlertTriangle />
            Detection & Auto-Hide
          </h2>
          <div className="features-grid">
            <label className="feature-card">
              <div className="feature-header">
                <span className="feature-title">Detect Screen Recording</span>
                <input
                  type="checkbox"
                  checked={detection.screenRecording}
                  onChange={(e) => updateDetection({ screenRecording: e.target.checked })}
                  className="feature-toggle"
                />
              </div>
              <p className="feature-desc">Alert if screen capture is detected</p>
            </label>

            <label className="feature-card">
              <div className="feature-header">
                <span className="feature-title">Detect Screen Sharing</span>
                <input
                  type="checkbox"
                  checked={detection.screenSharing}
                  onChange={(e) => updateDetection({ screenSharing: e.target.checked })}
                  className="feature-toggle"
                />
              </div>
              <p className="feature-desc">Detect if screen is being shared</p>
            </label>

            <label className="feature-card">
              <div className="feature-header">
                <span className="feature-title">Auto-Hide on Detection</span>
                <input
                  type="checkbox"
                  checked={detection.autoHide}
                  onChange={(e) => updateDetection({ autoHide: e.target.checked })}
                  className="feature-toggle"
                />
              </div>
              <p className="feature-desc">Automatically hide app if recording detected</p>
            </label>
          </div>
        </div>

        {/* Quick Copy Features */}
        <div className="stealth-section">
          <h2>
            <Copy />
            Quick Copy Settings
          </h2>
          
          <div className="features-grid">
            <label className="feature-card">
              <div className="feature-header">
                <span className="feature-title">Single-Click Copy</span>
                <input
                  type="checkbox"
                  checked={quickCopy.singleClick}
                  onChange={(e) => updateQuickCopy({ singleClick: e.target.checked })}
                  className="feature-toggle"
                />
              </div>
              <p className="feature-desc">Copy answer with one click instead of selecting text</p>
            </label>

            <label className="feature-card">
              <div className="feature-header">
                <span className="feature-title">Auto-Copy to Clipboard</span>
                <input
                  type="checkbox"
                  checked={quickCopy.autoClipboard}
                  onChange={(e) => updateQuickCopy({ autoClipboard: e.target.checked })}
                  className="feature-toggle"
                />
              </div>
              <p className="feature-desc">Automatically copy answers without showing selection</p>
            </label>

            <label className="feature-card">
              <div className="feature-header">
                <span className="feature-title">Silent Copy (No Toast)</span>
                <input
                  type="checkbox"
                  checked={!quickCopy.showToast}
                  onChange={(e) => updateQuickCopy({ showToast: !e.target.checked })}
                  className="feature-toggle"
                />
              </div>
              <p className="feature-desc">Don't show "Copied!" notification</p>
            </label>
          </div>
        </div>

        {/* Additional Features */}
        <div className="stealth-section">
          <h2>
            <Settings />
            Additional Stealth Features
          </h2>
          
          <div className="features-grid">
            <label className="feature-card">
              <div className="feature-header">
                <span className="feature-title">Silent Mode</span>
                <input
                  type="checkbox"
                  checked={silentMode}
                  onChange={toggleSilentMode}
                  className="feature-toggle"
                />
              </div>
              <p className="feature-desc">No sounds, notifications, or popups</p>
            </label>

            <label className="feature-card">
              <div className="feature-header">
                <span className="feature-title">Picture-in-Picture Mode</span>
                <input
                  type="checkbox"
                  checked={pipEnabled}
                  onChange={togglePIP}
                  className="feature-toggle"
                />
              </div>
              <p className="feature-desc">Always-on-top floating window</p>
            </label>
          </div>
        </div>

        {/* Clipboard History */}
        <div className="stealth-section">
          <div className="stealth-header">
            <h2>
              <Copy />
              Clipboard History
            </h2>
            <button
              onClick={clearClipboardHistory}
              className="stealth-btn stealth-btn-danger"
            >
              Clear History
            </button>
          </div>
          <ul className="stealth-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {clipboardHistory.length === 0 ? (
              <li style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>No clipboard history yet</li>
            ) : (
              clipboardHistory.map((item, index) => (
                <li key={index} className="list-item">
                  <div className="list-item-content">
                    <div style={{ wordBreak: 'break-word', overflow: 'hidden', textOverflow: 'ellipsis', maxHeight: '3em' }}>
                      {item.text}
                    </div>
                    <div className="list-item-desc">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Tips */}
        <div className="stealth-alert stealth-alert-info">
          <AlertTriangle className="stealth-alert-icon" size={20} />
          <div className="stealth-alert-content">
            <h3>💡 Stealth Tips</h3>
            <ul style={{ marginTop: '0.75rem', paddingLeft: '1.25rem' }}>
              <li>Use mobile companion on your phone for even more discretion</li>
              <li>Enable floating widget in "nearly invisible" mode (30% opacity)</li>
              <li>Set panic key to something natural like ESC or F1</li>
              <li>Use disguise themes that match your interview context (terminal for coding interviews)</li>
              <li>Practice quick-hide before actual interview</li>
              <li>Keep the app in a separate monitor or use picture-in-picture</li>
              <li>Use single-click copy and paste quickly to avoid suspicion</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StealthSettings;
