import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authAPI, documentsAPI } from '../services/api';
import { Upload, FileText, Briefcase, X, Eye, EyeOff, Lock, Mail, AlertCircle, CheckCircle } from 'lucide-react';
import './Auth.css';

function Login() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  
  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [cvFile, setCvFile] = useState(null);
  const [jobDescFile, setJobDescFile] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const cvFileRef = useRef(null);
  const jobDescFileRef = useRef(null);

  // Check for locked account on mount
  useEffect(() => {
    const lockTime = localStorage.getItem('loginLockTime');
    if (lockTime) {
      const lockExpiry = parseInt(lockTime) + (15 * 60 * 1000); // 15 minutes
      if (Date.now() < lockExpiry) {
        setIsLocked(true);
        const timeLeft = Math.ceil((lockExpiry - Date.now()) / 60000);
        setError(`Too many login attempts. Please try again in ${timeLeft} minutes.`);
      } else {
        localStorage.removeItem('loginLockTime');
        localStorage.removeItem('loginAttempts');
      }
    }
    
    const attempts = localStorage.getItem('loginAttempts');
    if (attempts) {
      setLoginAttempts(parseInt(attempts));
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isLocked) {
      return;
    }
    
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(formData);
      const { token, user } = response.data;
      
      // Clear login attempts on success
      localStorage.removeItem('loginAttempts');
      localStorage.removeItem('loginLockTime');
      setLoginAttempts(0);
      
      // Store auth with remember me preference
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      }
      
      setAuth(token, user);
      
      // Show upload modal after successful login
      setShowUploadModal(true);
      setUploadError('');
      setUploadSuccess(false);
      setCvFile(null);
      setJobDescFile(null);
    } catch (err) {
      // Handle failed login attempts
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);
      localStorage.setItem('loginAttempts', newAttempts.toString());
      
      if (newAttempts >= 5) {
        setIsLocked(true);
        localStorage.setItem('loginLockTime', Date.now().toString());
        setError('Too many failed attempts. Account locked for 15 minutes.');
      } else {
        const remainingAttempts = 5 - newAttempts;
        setError(
          err.response?.data?.error || 'Invalid credentials. ' +
          `${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCvChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setCvFile(file);
    }
  };

  const handleJobDescChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setJobDescFile(file);
    }
  };

  const handleUploadDocuments = async () => {
    if (!cvFile && !jobDescFile) return;
    
    setUploading(true);
    setUploadError('');

    try {
      const uploadPromises = [];
      
      if (cvFile) {
        uploadPromises.push(documentsAPI.uploadCV(cvFile));
      }
      
      if (jobDescFile) {
        uploadPromises.push(documentsAPI.uploadJobDescription(jobDescFile));
      }

      await Promise.all(uploadPromises);
      
      setUploadSuccess(true);
      setTimeout(() => {
        setShowUploadModal(false);
        navigate('/');
      }, 1500);
    } catch (err) {
      setUploadError(err.response?.data?.error || 'Upload failed. You can add documents later from your dashboard.');
    } finally {
      setUploading(false);
    }
  };

  const handleSkipUpload = () => {
    setShowUploadModal(false);
    navigate('/');
  };


  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <Lock size={40} />
          </div>
          <h1 className="auth-title">Interview Answer Assistant</h1>
          <h2 className="auth-subtitle">Welcome Back</h2>
        </div>

        {error && (
          <div className={`alert ${isLocked ? 'alert-warning' : 'alert-error'}`}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
        
        {loginAttempts > 0 && loginAttempts < 5 && !error && (
          <div className="alert alert-info">
            <AlertCircle size={18} />
            <span>{5 - loginAttempts} login attempt{5 - loginAttempts !== 1 ? 's' : ''} remaining</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="label">
              <Mail size={16} />
              Email Address
            </label>
            <input
              type="email"
              className="input input-with-icon"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="you@example.com"
              required
              autoFocus
              disabled={isLocked}
            />
          </div>

          <div className="form-group">
            <div className="label-with-link">
              <label className="label">
                <Lock size={16} />
                Password
              </label>
              <Link to="/forgot-password" className="forgot-link">
                Forgot?
              </Link>
            </div>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                className="input input-with-icon"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter your password"
                required
                disabled={isLocked}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="password-toggle"
                disabled={isLocked}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          
          <div className="form-extras">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isLocked}
              />
              <span>Remember me for 30 days</span>
            </label>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-block" 
            disabled={loading || isLocked}
          >
            {loading ? (
              <>
                <div className="spinner"></div>
                Signing in...
              </>
            ) : 'Sign In'}
          </button>
        </form>

        <div className="auth-divider">
          <span>or continue with</span>
        </div>

        <div className="oauth-buttons">
          <Link 
            to="/google-auth"
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
          </Link>
          
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

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={handleSkipUpload}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Upload Your Documents</h2>
              <button className="modal-close" onClick={handleSkipUpload}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              <p className="modal-subtitle">
                Help us tailor your interview answers by uploading your CV and job description
              </p>

              {uploadError && <div className="alert alert-error">{uploadError}</div>}
              {uploadSuccess && <div className="alert alert-success">Documents uploaded successfully!</div>}

              {/* CV Upload Box */}
              <div className="upload-box">
                <div className="upload-icon">
                  <FileText size={40} />
                </div>
                <div className="upload-content">
                  <h4>Your CV/Resume</h4>
                  <p className="upload-text">
                    {cvFile ? cvFile.name : 'Upload your resume for personalized answers'}
                  </p>
                  <input
                    type="file"
                    ref={cvFileRef}
                    onChange={handleCvChange}
                    accept=".pdf,.doc,.docx,.txt"
                    className="hidden-input"
                    disabled={uploading}
                  />
                  <button
                    type="button"
                    onClick={() => cvFileRef.current?.click()}
                    className="btn btn-secondary btn-small"
                    disabled={uploading}
                  >
                    {cvFile ? '✓ Selected' : 'Choose File'}
                  </button>
                </div>
              </div>

              {/* Job Description Upload Box */}
              <div className="upload-box">
                <div className="upload-icon">
                  <Briefcase size={40} />
                </div>
                <div className="upload-content">
                  <h4>Job Description</h4>
                  <p className="upload-text">
                    {jobDescFile ? jobDescFile.name : 'Upload the job posting to tailor answers'}
                  </p>
                  <input
                    type="file"
                    ref={jobDescFileRef}
                    onChange={handleJobDescChange}
                    accept=".pdf,.doc,.docx,.txt"
                    className="hidden-input"
                    disabled={uploading}
                  />
                  <button
                    type="button"
                    onClick={() => jobDescFileRef.current?.click()}
                    className="btn btn-secondary btn-small"
                    disabled={uploading}
                  >
                    {jobDescFile ? '✓ Selected' : 'Choose File'}
                  </button>
                </div>
              </div>

              <p className="modal-note">
                Both files are optional. You can upload them now or add them later in your dashboard.
              </p>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={handleSkipUpload}
                className="btn btn-outline"
                disabled={uploading}
              >
                Skip for Now
              </button>
              <button
                type="button"
                onClick={handleUploadDocuments}
                className="btn btn-primary"
                disabled={uploading || (!cvFile && !jobDescFile)}
              >
                {uploading ? 'Uploading...' : 'Upload Documents'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;
