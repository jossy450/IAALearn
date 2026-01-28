import React, { useState, useEffect, useRef } from 'react';
import { Shield, Eye, EyeOff, Trash2, Lock, Calendar, Upload, FileText, Briefcase } from 'lucide-react';
import { privacyAPI } from '../services/api';
import './Settings.css';

function Settings() {
  const [settings, setSettings] = useState(null);
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadStatus, setUploadStatus] = useState({});
  const cvFileRef = useRef(null);
  const jobDescFileRef = useRef(null);

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

  const handleFileUpload = async (file, documentType) => {
    if (!file) return;

    // Validate file extension on client side
    const allowedExtensions = ['.pdf', '.doc', '.docx'];
    const fileExt = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!allowedExtensions.includes(fileExt)) {
      alert('Invalid file format. Please upload PDF, DOC, or DOCX files only.');
      return;
    }

    // Check file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('File size too large. Maximum size is 5MB.');
      return;
    }

    const formDataFile = new FormData();
    formDataFile.append('file', file);

    try {
      setUploadStatus(prev => ({ ...prev, [documentType]: 'uploading' }));
      
      const authData = localStorage.getItem('auth-storage');
      const token = authData ? JSON.parse(authData).state.token : '';
      
      const response = await fetch(`/api/documents/upload/${documentType}`, {
        method: 'POST',
        body: formDataFile,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setUploadStatus(prev => ({ ...prev, [documentType]: 'success' }));
      alert(data.message || `${documentType === 'cv' ? 'CV' : 'Job Description'} uploaded successfully!`);
      
      setTimeout(() => {
        setUploadStatus(prev => ({ ...prev, [documentType]: null }));
      }, 3000);
    } catch (err) {
      setUploadStatus(prev => ({ ...prev, [documentType]: 'error' }));
      alert(err.message || 'Upload failed. Please try again.');
      console.error('Upload error:', err);
      
      setTimeout(() => {
        setUploadStatus(prev => ({ ...prev, [documentType]: null }));
      }, 3000);
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

      {/* Document Upload Section */}
      <div className="card">
        <div className="card-header">
          <Upload size={24} />
          <h2>Personalization Documents</h2>
        </div>

        <div className="settings-section">
          <p className="section-description">
            Upload your CV and job description to get personalized interview answers tailored to your background and the specific role.
          </p>

          {/* CV Upload */}
          <div className="document-upload-box">
            <div className="upload-icon">
              <FileText size={32} />
            </div>
            <div className="upload-content">
              <h3>Your CV/Resume</h3>
              <p className="upload-text">
                Upload your resume for personalized answer suggestions
              </p>
              <p className="upload-format">
                Accepted formats: <strong>PDF, DOC, DOCX</strong> (max 5MB)
              </p>
              <input
                type="file"
                ref={cvFileRef}
                onChange={(e) => handleFileUpload(e.target.files?.[0], 'cv')}
                accept=".pdf,.doc,.docx"
                style={{ display: 'none' }}
              />
              <button
                className={`btn btn-secondary ${uploadStatus.cv === 'uploading' ? 'loading' : ''}`}
                onClick={() => cvFileRef.current?.click()}
                disabled={uploadStatus.cv === 'uploading'}
              >
                {uploadStatus.cv === 'uploading' && 'Uploading...'}
                {uploadStatus.cv === 'success' && '✓ Uploaded'}
                {uploadStatus.cv === 'error' && '✗ Failed - Try Again'}
                {!uploadStatus.cv && 'Choose File'}
              </button>
            </div>
          </div>

          {/* Job Description Upload */}
          <div className="document-upload-box">
            <div className="upload-icon">
              <Briefcase size={32} />
            </div>
            <div className="upload-content">
              <h3>Job Description</h3>
              <p className="upload-text">
                Upload the job posting to tailor answers to the specific requirements
              </p>
              <p className="upload-format">
                Accepted formats: <strong>PDF, DOC, DOCX</strong> (max 5MB)
              </p>
              <input
                type="file"
                ref={jobDescFileRef}
                onChange={(e) => handleFileUpload(e.target.files?.[0], 'job_description')}
                accept=".pdf,.doc,.docx"
                style={{ display: 'none' }}
              />
              <button
                className={`btn btn-secondary ${uploadStatus.job_description === 'uploading' ? 'loading' : ''}`}
                onClick={() => jobDescFileRef.current?.click()}
                disabled={uploadStatus.job_description === 'uploading'}
              >
                {uploadStatus.job_description === 'uploading' && 'Uploading...'}
                {uploadStatus.job_description === 'success' && '✓ Uploaded'}
                {uploadStatus.job_description === 'error' && '✗ Failed - Try Again'}
                {!uploadStatus.job_description && 'Choose File'}
              </button>
            </div>
          </div>

          <div className="help-text">
            <p>💡 <strong>Pro tip:</strong> Upload both your CV and job description for the most personalized and relevant interview answers.</p>
            <p>📝 <strong>Note:</strong> Documents are linked to your current session and will be automatically deleted when the session ends to save storage.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
