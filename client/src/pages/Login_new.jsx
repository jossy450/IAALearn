import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authAPI } from '../services/api';
import { Upload, FileText, Briefcase } from 'lucide-react';
import './Auth.css';

function Login() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [uploadStatus, setUploadStatus] = useState({});
  const cvFileRef = useRef(null);
  const jobDescFileRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(formData);
      const { token, user } = response.data;
      setAuth(token, user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file, documentType) => {
    if (!file) return;

    const formDataFile = new FormData();
    formDataFile.append('file', file);

    try {
      setUploadStatus(prev => ({ ...prev, [documentType]: 'uploading' }));
      
      const response = await fetch(`/api/documents/upload/${documentType}`, {
        method: 'POST',
        body: formDataFile,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-storage') ? JSON.parse(localStorage.getItem('auth-storage')).state.token : ''}`
        }
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      setUploadStatus(prev => ({ ...prev, [documentType]: 'success' }));
      setTimeout(() => {
        setUploadStatus(prev => ({ ...prev, [documentType]: null }));
      }, 3000);
    } catch (err) {
      setUploadStatus(prev => ({ ...prev, [documentType]: 'error' }));
      console.error('Upload error:', err);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Interview Answer Assistant</h1>
        <h2 className="auth-subtitle">Sign In</h2>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Expandable Document Section */}
        <div className="document-section">
          <button
            type="button"
            onClick={() => setShowDocuments(!showDocuments)}
            className="document-toggle"
          >
            <Upload size={18} />
            {showDocuments ? 'Hide' : 'Add'} CV & Job Description
            <span className="toggle-icon">{showDocuments ? '▼' : '▶'}</span>
          </button>

          {showDocuments && (
            <div className="document-upload-area">
              <p className="document-hint">
                Upload your CV and job description to get personalized answers
              </p>

              {/* CV Upload */}
              <div className="upload-box">
                <div className="upload-icon">
                  <FileText size={32} />
                </div>
                <div className="upload-content">
                  <h4>Your CV</h4>
                  <p className="upload-text">
                    Upload your resume for personalized answer suggestions
                  </p>
                  <input
                    type="file"
                    ref={cvFileRef}
                    onChange={(e) => handleFileUpload(e.target.files?.[0], 'cv')}
                    accept=".pdf,.doc,.docx,.txt"
                    className="hidden-input"
                  />
                  <button
                    type="button"
                    onClick={() => cvFileRef.current?.click()}
                    className="btn btn-secondary btn-small"
                    disabled={uploadStatus.cv === 'uploading'}
                  >
                    {uploadStatus.cv === 'uploading' && 'Uploading...'}
                    {uploadStatus.cv === 'success' && '✓ Uploaded'}
                    {uploadStatus.cv === 'error' && 'Upload Failed'}
                    {!uploadStatus.cv && 'Choose File'}
                  </button>
                </div>
              </div>

              {/* Job Description Upload */}
              <div className="upload-box">
                <div className="upload-icon">
                  <Briefcase size={32} />
                </div>
                <div className="upload-content">
                  <h4>Job Description</h4>
                  <p className="upload-text">
                    Upload the job posting to tailor answers to requirements
                  </p>
                  <input
                    type="file"
                    ref={jobDescFileRef}
                    onChange={(e) => handleFileUpload(e.target.files?.[0], 'job_description')}
                    accept=".pdf,.doc,.docx,.txt"
                    className="hidden-input"
                  />
                  <button
                    type="button"
                    onClick={() => jobDescFileRef.current?.click()}
                    className="btn btn-secondary btn-small"
                    disabled={uploadStatus.job_description === 'uploading'}
                  >
                    {uploadStatus.job_description === 'uploading' && 'Uploading...'}
                    {uploadStatus.job_description === 'success' && '✓ Uploaded'}
                    {uploadStatus.job_description === 'error' && 'Upload Failed'}
                    {!uploadStatus.job_description && 'Choose File'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="auth-divider">
          <span>or continue with</span>
        </div>

        <div className="oauth-buttons">
          <a 
            //href="/api/auth/google"
            href="https://accounts.google.com/v3/signin/accountchooser?client_id=1020136274261-fvsfg9jgtaq6d3p0lbf1ib03vhtkn09p.apps.googleusercontent.com&redirect_uri=https%3A%2F%2Fiaalearn.onrender.com%2Fapi%2Fauth%2Fgoogle%2Fcallback&response_type=code&scope=profile+email&dsh=S-367915222%3A1769798481913221&o2v=2&service=lso&flowName=GeneralOAuthFlow&opparams=%253F&continue=https%3A%2F%2Faccounts.google.com%2Fsignin%2Foauth%2Fconsent%3Fauthuser%3Dunknown%26part%3DAJi8hAMa090CILoT4SPz5jLyUVMb0fXNbvzsKZWzV7ilHpolsNdjE8zQKnRdhT4_0OPMRNCBzNSSXrAAQsrplUA4QE_ps3ZoPPqAuaGgd-Em5xJvV_e5DmIaip-L-U7SYv-MTt0bw7hvz4v_TRwVTr96Ogjy_U6jplf5d31IxWZXK8RTslgPeLRj8vzvjI19_wKzpNgy4SHTlHUQLdRBOPfTkLgGTbyMEU-UuSdqyQ6aP5-I7AtHkmvkrMjfojfmIim8w3JjUw4Jr3oEPzSWf2yzUvO841p1virE7FdeY7sTb7NLjirrzpUG9SImsuur1TfW-F0-k0M1gh6xgcoRWGOQ1JBOF07BLL08TOKCc408rsvbcAibmEnaENYQWvn3RI-INMp-GWiIvv7HHDCGFol7jb868lPI8B_WCj720mnEwGdkqYiCLo8rpNm6ergbk27lFXxJUHzNj6WtjN6fzYcHtH-Wq_N0xzjEMpweKgDJs4QFvkW6_wU%26flowName%3DGeneralOAuthFlow%26as%3DS-367915222%253A1769798481913221%26client_id%3D1020136274261-fvsfg9jgtaq6d3p0lbf1ib03vhtkn09p.apps.googleusercontent.com%26requestPath%3D%252Fsignin%252Foauth%252Fconsent%23&app_domain=https%3A%2F%2Fiaalearn.onrender.com"
            
            className="btn btn-outline btn-block oauth-btn"
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <svg className="oauth-icon" viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </a>
          
          <a 
            href="/api/auth/github"
            className="btn btn-outline btn-block oauth-btn"
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <svg className="oauth-icon" viewBox="0 0 24 24" width="20" height="20">
              <path fill="currentColor" d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"/>
            </svg>
            GitHub
          </a>
        </div>

        <p className="auth-footer">
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
