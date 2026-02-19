import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authAPI, documentsAPI } from '../services/api';
import { Upload, FileText, Briefcase, X, Eye, EyeOff, Lock, Mail, AlertCircle, CheckCircle, KeyRound, Send } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import pushNotifications from '../services/pushNotifications';
import axios from 'axios';
import './Auth.css';

function Login() {
      // Exchange Supabase JWT for app JWT
      const exchangeSupabaseToken = async (supabaseSession) => {
        try {
          const supaToken = supabaseSession?.access_token || supabaseSession?.provider_token;
          if (!supaToken) throw new Error('No Supabase token');
          const res = await axios.post('/api/auth/supabase', { token: supaToken });
          if (res.data?.token) {
            setAuth(res.data.token, res.data.user);
            try { pushNotifications.flushPendingPushToken(); } catch (_) {}
            return true;
          }
          setError('Failed to exchange Supabase token');
          return false;
        } catch (err) {
          setError(err.message || 'Supabase token exchange failed');
          return false;
        }
      };
    // Social login loading state
    const [socialLoading, setSocialLoading] = useState(false);

    // Supabase email/password login
    const handleSupabaseLogin = async (e) => {
      e.preventDefault();
      setError('');
      setSocialLoading(true);
      try {
        const { data, error: supaError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (supaError) throw supaError;
        // Exchange Supabase JWT for app JWT
        const ok = await exchangeSupabaseToken(data.session);
        if (ok) navigate('/');
      } catch (err) {
        setError(err.message || 'Supabase login failed');
      } finally {
        setSocialLoading(false);
      }
    };

    // Google login
    const handleGoogleLogin = async () => {
      setError('');
      setSocialLoading(true);
          try {
            // Always use server-driven OAuth initiation to keep Supabase configuration optional.
            // The server will redirect to Google and return to /auth/callback with app token.
            window.location.href = '/api/auth/google';
            return;
      } catch (err) {
        setError(err.message || 'Google login failed');
      } finally {
        setSocialLoading(false);
      }
    };

    // GitHub login
    const handleGithubLogin = async () => {
      setError('');
      setSocialLoading(true);
      try {
          // Always use server-driven GitHub OAuth initiation.
          window.location.href = '/api/auth/github';
          return;
      } catch (err) {
        setError(err.message || 'GitHub login failed');
      } finally {
        setSocialLoading(false);
      }
    };
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuth } = useAuthStore();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState(() => {
    // Show OAuth error if redirected back from server with ?error=
    const oauthError = searchParams.get('error');
    if (oauthError === 'oauth_failed') return 'Google sign-in failed. Please check your Google credentials or try again.';
    if (oauthError) return decodeURIComponent(oauthError);
    return '';
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  // OTP State
  const [useOtp, setUseOtp] = useState(true);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  
  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [cvFile, setCvFile] = useState(null);
  const [jobDescFile, setJobDescFile] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const cvFileRef = useRef(null);
  const jobDescFileRef = useRef(null);

  // Resend timer effect
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleRequestOtp = async (e) => {
    e?.preventDefault();
    
    if (!formData.email) {
      setError('Please enter your email address');
      return;
    }
    
    setError('');
    setOtpLoading(true);

    try {
      const response = await authAPI.requestOtp({ email: formData.email });
      
      setOtpSent(true);
      setResendTimer(60);
      setOtpCode('');
      
      // In development, show the code (remove in production)
      if (response.data.code) {
        setError(`Development mode: Your code is ${response.data.code}`);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send verification code');
      setOtpSent(false);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    
    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }
    
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.verifyOtp({ 
        email: formData.email, 
        code: otpCode 
      });
      
      const { token, user } = response.data;
      
      // Store auth with remember me preference
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      }
      
      setAuth(token, user);
      try { pushNotifications.flushPendingPushToken(); } catch (_) {}

      // Flush any pending push token that was queued before auth
      try { pushNotifications.flushPendingPushToken(); } catch (_) {}
      
      // Show upload modal after successful login
      setShowUploadModal(true);
      setUploadError('');
      setUploadSuccess(false);
      setCvFile(null);
      setJobDescFile(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(formData);
      const { token, user } = response.data;
      
      // Store auth with remember me preference
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      }
      
      setAuth(token, user);
      try { pushNotifications.flushPendingPushToken(); } catch (_) {}
      // Show upload modal after successful login
      setShowUploadModal(true);
      setUploadError('');
      setUploadSuccess(false);
      setCvFile(null);
      setJobDescFile(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
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
            <img src="/mightysky-logo.svg" alt="Mightysky" style={{width: '70px', height: '70px'}} />
          </div>
          <h1 className="auth-title">Mightysky</h1>
          <p className="auth-tagline">Interview Answer Assistant</p>
          <h2 className="auth-subtitle">Welcome Back</h2>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
        
        {otpSent && !error && (
          <div className="alert alert-success">
            <AlertCircle size={18} />
            <span>Verification code sent to your email</span>
          </div>
        )}

        <form onSubmit={useOtp ? (otpSent ? handleVerifyOtp : handleRequestOtp) : handlePasswordLogin} className="auth-form">
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
              disabled={otpSent}
            />
          </div>

          {!useOtp && (
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
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}

          {useOtp && otpSent && (
            <div className="form-group">
              <label className="label">
                <KeyRound size={16} />
                Verification Code
              </label>
              <input
                type="text"
                className="input input-with-icon"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit code"
                required
                maxLength={6}
                autoFocus
              />
              {resendTimer > 0 ? (
                <p className="form-hint">Resend code in {resendTimer}s</p>
              ) : (
                <button 
                  type="button" 
                  onClick={handleRequestOtp}
                  className="btn-link"
                  style={{ marginTop: '8px', fontSize: '14px' }}
                >
                  Resend code
                </button>
              )}
            </div>
          )}
          
          {!useOtp && (
            <div className="form-extras">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me for 30 days</span>
              </label>
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary btn-block" 
            disabled={loading || (useOtp && otpSent && otpCode.length !== 6)}
          >
            {loading ? (
              <>
                <div className="spinner"></div>
                {useOtp && otpSent ? 'Verifying...' : useOtp ? 'Sending code...' : 'Signing in...'}
              </>
            ) : (
              <>
                {useOtp && otpSent ? (
                  <>
                    <KeyRound size={18} />
                    Verify Code
                  </>
                ) : useOtp ? (
                  <>
                    <Send size={18} />
                    Send Verification Code
                  </>
                ) : (
                  'Sign In'
                )}
              </>
            )}
          </button>
          
          <div style={{ textAlign: 'center', marginTop: '12px' }}>
            <button 
              type="button" 
              onClick={() => {
                setUseOtp(!useOtp);
                setOtpSent(false);
                setOtpCode('');
                setError('');
              }}
              className="btn-link"
              style={{ fontSize: '14px' }}
            >
              {useOtp ? 'Use password instead' : 'Use verification code instead'}
            </button>
          </div>
        </form>

        <div className="auth-divider">
          <span>or continue with</span>
        </div>

        <div className="oauth-buttons">
          <button 
            onClick={handleGoogleLogin}
            className="btn btn-outline btn-block oauth-btn"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
            type="button"
            disabled={socialLoading}
          >
            <svg className="oauth-icon" viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </button>
          
          <button 
            onClick={handleGithubLogin}
            className="btn btn-outline btn-block oauth-btn"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
            type="button"
            disabled={socialLoading}
          >
            <svg className="oauth-icon" viewBox="0 0 24 24" width="20" height="20">
              <path fill="currentColor" d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"/>
            </svg>
            GitHub
          </button>
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
