import React, { useState, useEffect } from 'react';
import { Shield, Eye, EyeOff, Trash2, Lock, Calendar } from 'lucide-react';
import { privacyAPI } from '../services/api';
import './Settings.css';

function Settings() {
  const [settings, setSettings] = useState(null);
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [settingsRes, themesRes] = await Promise.all([
        privacyAPI.getSettings(),
        privacyAPI.getThemes()
      ]);
      setSettings(settingsRes.data.settings);
      setThemes(themesRes.data.themes);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await privacyAPI.updateSettings(settings);
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleClearHistory = async (days) => {
    if (!confirm(`Are you sure you want to clear history${days ? ` older than ${days} days` : ''}?`)) {
      return;
    }

    try {
      await privacyAPI.clearHistory({ days });
      alert('History cleared successfully!');
    } catch (error) {
      console.error('Failed to clear history:', error);
      alert('Failed to clear history. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="settings">
      <div className="settings-header">
        <h1>Settings</h1>
        <p className="subtitle">Manage your privacy and preferences</p>
      </div>

      {/* Privacy Settings */}
      <div className="card">
        <div className="card-header">
          <Shield size={24} />
          <h2>Privacy & Security</h2>
        </div>

        <div className="settings-section">
          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">
                {settings?.disguise_mode ? <EyeOff size={20} /> : <Eye size={20} />}
                Disguise Mode
              </label>
              <p className="setting-description">
                Hide interview assistant interface behind a productivity theme
              </p>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings?.disguise_mode || false}
                onChange={(e) => setSettings({ ...settings, disguise_mode: e.target.checked })}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          {settings?.disguise_mode && (
            <div className="setting-item">
              <div className="setting-info">
                <label className="setting-label">Disguise Theme</label>
                <p className="setting-description">Choose what the app should look like</p>
              </div>
              <select
                className="input"
                value={settings?.disguise_theme || 'productivity'}
                onChange={(e) => setSettings({ ...settings, disguise_theme: e.target.value })}
              >
                {themes.map((theme) => (
                  <option key={theme.id} value={theme.id}>
                    {theme.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">Quick Hide</label>
              <p className="setting-description">
                Enable quick hide with keyboard shortcut
              </p>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings?.quick_hide_enabled || false}
                onChange={(e) => setSettings({ ...settings, quick_hide_enabled: e.target.checked })}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          {settings?.quick_hide_enabled && (
            <div className="setting-item">
              <div className="setting-info">
                <label className="setting-label">Quick Hide Key</label>
                <p className="setting-description">Keyboard shortcut to hide the app</p>
              </div>
              <select
                className="input"
                value={settings?.quick_hide_key || 'Escape'}
                onChange={(e) => setSettings({ ...settings, quick_hide_key: e.target.value })}
              >
                <option value="Escape">Escape</option>
                <option value="F1">F1</option>
                <option value="F2">F2</option>
                <option value="Ctrl+H">Ctrl+H</option>
              </select>
            </div>
          )}

          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">
                <Lock size={20} />
                Data Encryption
              </label>
              <p className="setting-description">
                Encrypt sensitive data stored locally
              </p>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings?.encryption_enabled || false}
                onChange={(e) => setSettings({ ...settings, encryption_enabled: e.target.checked })}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div className="settings-actions">
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Data Management */}
      <div className="card">
        <div className="card-header">
          <Trash2 size={24} />
          <h2>Data Management</h2>
        </div>

        <div className="settings-section">
          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">
                <Calendar size={20} />
                Auto-Clear History
              </label>
              <p className="setting-description">
                Automatically delete old session data
              </p>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings?.auto_clear_history || false}
                onChange={(e) => setSettings({ ...settings, auto_clear_history: e.target.checked })}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          {settings?.auto_clear_history && (
            <div className="setting-item">
              <div className="setting-info">
                <label className="setting-label">Auto-Clear After</label>
                <p className="setting-description">Delete data older than</p>
              </div>
              <select
                className="input"
                value={settings?.auto_clear_days || 30}
                onChange={(e) => setSettings({ ...settings, auto_clear_days: parseInt(e.target.value) })}
              >
                <option value="7">7 days</option>
                <option value="30">30 days</option>
                <option value="60">60 days</option>
                <option value="90">90 days</option>
              </select>
            </div>
          )}

          <div className="danger-zone">
            <h3>Danger Zone</h3>
            <p>Permanently delete your data. This action cannot be undone.</p>
            <div className="danger-actions">
              <button
                className="btn btn-secondary"
                onClick={() => handleClearHistory(30)}
              >
                Clear History (30+ days)
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleClearHistory(null)}
              >
                Clear All History
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
