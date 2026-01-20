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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Shield className="text-blue-600" />
                Stealth & Disguise Settings
              </h1>
              <p className="text-gray-600 mt-1">
                Configure undetectable interview assistance features
              </p>
            </div>
            <button
              onClick={toggleStealthMode}
              className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 ${
                stealthMode 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-300 text-gray-700'
              }`}
            >
              {stealthMode ? <Eye size={20} /> : <EyeOff size={20} />}
              {stealthMode ? 'Stealth ON' : 'Stealth OFF'}
            </button>
          </div>
        </div>

        {/* Disguise Themes */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Monitor size={20} />
            Disguise Themes
          </h2>
          <p className="text-gray-600 mb-4">
            Make the app look like a different application to avoid detection
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {disguiseThemes.map(theme => (
              <button
                key={theme.id}
                onClick={() => setActiveDisguise(theme.id)}
                className={`p-4 border-2 rounded-lg text-center transition-all ${
                  activeDisguise === theme.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-3xl mb-2">{theme.icon}</div>
                <div className="font-semibold">{theme.name}</div>
                <div className="text-xs text-gray-500 mt-1">{theme.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Panic Button Configuration */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Keyboard size={20} />
            Panic Button (Boss Key)
          </h2>
          <p className="text-gray-600 mb-4">
            Instantly hide the app when interviewer gets suspicious
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Panic Key</label>
              <select
                value={selectedPanicKey}
                onChange={(e) => {
                  setSelectedPanicKey(e.target.value);
                  setPanicKey(e.target.value, []);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                {quickHideOptions.panicKeys.map(option => (
                  <option key={option.label} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Panic Action</label>
              <select
                value={panicAction}
                onChange={(e) => setPanicAction(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                {quickHideOptions.hideActions.map(action => (
                  <option key={action.id} value={action.id}>
                    {action.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Decoy Screen</label>
              <select
                value={decoyScreen}
                onChange={(e) => setDecoyScreen(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="google-search">Google Search</option>
                <option value="stackoverflow">Stack Overflow</option>
                <option value="documentation">Technical Documentation</option>
                <option value="blank">Blank Screen</option>
              </select>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 flex gap-2">
              <AlertTriangle className="text-yellow-600 flex-shrink-0" size={20} />
              <div className="text-sm text-yellow-800">
                <strong>Quick Escape:</strong> Triple-click top-right corner or press your panic key to activate decoy screen
              </div>
            </div>
          </div>
        </div>

        {/* Floating Widget */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Square size={20} />
              Floating Answer Widget
            </h2>
            <button
              onClick={toggleFloatingWidget}
              className={`px-3 py-1 rounded ${
                floatingWidget.enabled
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-300 text-gray-700'
              }`}
            >
              {floatingWidget.enabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
          <p className="text-gray-600 mb-4">
            Show answers in a small floating window (like sticky note)
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Size</label>
              <select
                value={floatingWidget.size}
                onChange={(e) => updateFloatingWidget({ size: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                {floatingWidgetOptions.sizes.map(size => (
                  <option key={size.id} value={size.id}>{size.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Position</label>
              <select
                value={floatingWidget.position}
                onChange={(e) => updateFloatingWidget({ position: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                {floatingWidgetOptions.positions.map(pos => (
                  <option key={pos.id} value={pos.id}>{pos.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Opacity</label>
              <input
                type="range"
                min="0.3"
                max="1.0"
                step="0.1"
                value={floatingWidget.opacity}
                onChange={(e) => updateFloatingWidget({ opacity: parseFloat(e.target.value) })}
                className="w-full"
              />
              <div className="text-sm text-gray-600 text-center">{Math.round(floatingWidget.opacity * 100)}%</div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Style</label>
              <select
                value={floatingWidget.style}
                onChange={(e) => updateFloatingWidget({ style: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                {floatingWidgetOptions.styles.map(style => (
                  <option key={style.id} value={style.id}>{style.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Detection & Evasion */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <AlertTriangle size={20} />
            Detection & Auto-Hide
          </h2>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={detection.screenRecording}
                onChange={(e) => updateDetection({ screenRecording: e.target.checked })}
                className="w-5 h-5"
              />
              <div className="flex-1">
                <div className="font-semibold">Detect Screen Recording</div>
                <div className="text-sm text-gray-600">Alert if screen capture is detected</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={detection.screenSharing}
                onChange={(e) => updateDetection({ screenSharing: e.target.checked })}
                className="w-5 h-5"
              />
              <div className="flex-1">
                <div className="font-semibold">Detect Screen Sharing</div>
                <div className="text-sm text-gray-600">Detect if screen is being shared</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={detection.autoHide}
                onChange={(e) => updateDetection({ autoHide: e.target.checked })}
                className="w-5 h-5"
              />
              <div className="flex-1">
                <div className="font-semibold">Auto-Hide on Detection</div>
                <div className="text-sm text-gray-600">Automatically hide app if recording detected</div>
              </div>
            </label>
          </div>
        </div>

        {/* Quick Copy Features */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Copy size={20} />
            Quick Copy Settings
          </h2>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={quickCopy.singleClick}
                onChange={(e) => updateQuickCopy({ singleClick: e.target.checked })}
                className="w-5 h-5"
              />
              <div className="flex-1">
                <div className="font-semibold">Single-Click Copy</div>
                <div className="text-sm text-gray-600">Copy answer with one click instead of selecting text</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={quickCopy.autoClipboard}
                onChange={(e) => updateQuickCopy({ autoClipboard: e.target.checked })}
                className="w-5 h-5"
              />
              <div className="flex-1">
                <div className="font-semibold">Auto-Copy to Clipboard</div>
                <div className="text-sm text-gray-600">Automatically copy answers without showing selection</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={!quickCopy.showToast}
                onChange={(e) => updateQuickCopy({ showToast: !e.target.checked })}
                className="w-5 h-5"
              />
              <div className="flex-1">
                <div className="font-semibold">Silent Copy (No Toast)</div>
                <div className="text-sm text-gray-600">Don't show "Copied!" notification</div>
              </div>
            </label>
          </div>
        </div>

        {/* Additional Features */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Settings size={20} />
            Additional Stealth Features
          </h2>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={silentMode}
                onChange={toggleSilentMode}
                className="w-5 h-5"
              />
              <div className="flex-1">
                <div className="font-semibold">Silent Mode</div>
                <div className="text-sm text-gray-600">No sounds, notifications, or popups</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={pipEnabled}
                onChange={togglePIP}
                className="w-5 h-5"
              />
              <div className="flex-1">
                <div className="font-semibold">Picture-in-Picture Mode</div>
                <div className="text-sm text-gray-600">Always-on-top floating window</div>
              </div>
            </label>
          </div>
        </div>

        {/* Clipboard History */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Copy size={20} />
              Clipboard History
            </h2>
            <button
              onClick={clearClipboardHistory}
              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Clear History
            </button>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {clipboardHistory.length === 0 ? (
              <div className="text-center text-gray-500 py-4">No clipboard history yet</div>
            ) : (
              clipboardHistory.map((item, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded border border-gray-200">
                  <div className="text-sm text-gray-700 line-clamp-2">{item.text}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-bold text-blue-900 mb-3">💡 Stealth Tips</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• Use mobile companion on your phone for even more discretion</li>
            <li>• Enable floating widget in "nearly invisible" mode (30% opacity)</li>
            <li>• Set panic key to something natural like ESC or F1</li>
            <li>• Use disguise themes that match your interview context (terminal for coding interviews)</li>
            <li>• Practice quick-hide before actual interview</li>
            <li>• Keep the app in a separate monitor or use picture-in-picture</li>
            <li>• Use single-click copy and paste quickly to avoid suspicion</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default StealthSettings;
