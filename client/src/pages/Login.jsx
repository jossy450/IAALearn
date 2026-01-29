import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authAPI, documentsAPI } from '../services/api';
import { Upload, FileText, Briefcase, X, CheckCircle, AlertCircle } from 'lucide-react';
import './Auth.css';

function Login() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadStatus, setUploadStatus] = useState({});
  const [cvFile, setCvFile] = useState(null);
  const [jobDescFile, setJobDescFile] = useState(null);
  const [uploadError, setUploadError] = useState('');
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
      
      // Show upload modal immediately after successful login
      setShowUploadModal(true);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
      setLoading(false);
    }
  };

  const handleCvChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setUploadError('CV file size must be less than 10MB');
        return;
      }
      setCvFile(file);
      setUploadError('');
    }
  };

  const handleJobDescChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setUploadError('Job description file size must be less than 5MB');
        return;
      }
      setJobDescFile(file);
      setUploadError('');
    }
  };

  const handleSkipUpload = () => {
    setShowUploadModal(false);
    navigate('/');
  };

  const handleUploadDocuments = async () => {
    if (!cvFile && !jobDescFile) {
      setUploadError('Please select at least one document to upload');
      return;
    }

    setUploadStatus({ uploading: true });
    setUploadError('');

    try {
      const uploadPromises = [];
      
      // Upload CV if selected
      if (cvFile) {
        uploadPromises.push(
          documentsAPI.uploadCV(cvFile)
            .then(response => ({ type: 'cv', success: true, data: response.data }))
            .catch(error => ({ type: 'cv', success: false, error }))
        );
      }
      
      // Upload Job Description if selected
      if (jobDescFile) {
        uploadPromises.push(
          documentsAPI.uploadJobDescription(jobDescFile)
            .then(response => ({ type: 'job_description', success: true, data: response.data }))
            .catch(error => ({ type: 'job_description', success: false, error }))
        );
      }

      // Wait for all uploads to complete
      const results = await Promise.all(uploadPromises);
      
      // Check if any upload failed
      const failed = results.filter(r => !r.success);
      if (failed.length > 0) {
        const errorMsg = failed.map(f => 
          `${f.type === 'cv' ? 'CV' : 'Job Description'}: ${f.error.response?.data?.error || 'Upload failed'}`
        ).join(', ');
        setUploadError(errorMsg);
        setUploadStatus({ error: true });
        return;
      }
      
      console.log('Upload successful:', results);
      
      setUploadStatus({ success: true });
      
      setTimeout(() => {
        setShowUploadModal(false);
        navigate('/');
      }, 1000);
    } catch (err) {
      console.error('Upload error:', err);
      setUploadError('Failed to upload documents. Please try again.');
      setUploadStatus({ error: true });
    }
  };

  return (
    <>
      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 relative" style={{ backgroundColor: 'white', borderRadius: '1rem', maxWidth: '42rem', width: '100%', padding: '2rem', position: 'relative' }}>
            <button
              onClick={handleSkipUpload}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              style={{ position: 'absolute', top: '1rem', right: '1rem', color: '#9ca3af', cursor: 'pointer', background: 'none', border: 'none', fontSize: '1.5rem' }}
            >
              <X size={24} />
            </button>

            <div className="text-center mb-6">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-lg mb-4" style={{ background: 'linear-gradient(to right, #2563eb, #4f46e5)', color: 'white', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                <h2 className="text-2xl font-bold mb-2" style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Welcome! 🎉</h2>
                <p className="text-blue-100" style={{ color: '#dbeafe' }}>
                  Upload your CV and job description for AI-powered personalized answers
                </p>
              </div>
            </div>

            {uploadError && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2" style={{ marginBottom: '1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={20} style={{ color: '#ef4444' }} />
                <span className="text-sm text-red-800" style={{ fontSize: '0.875rem', color: '#991b1b' }}>{uploadError}</span>
              </div>
            )}

            {uploadStatus.success && (
              <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2" style={{ marginBottom: '1rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.5rem', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={20} style={{ color: '#22c55e' }} />
                <span className="text-sm text-green-800" style={{ fontSize: '0.875rem', color: '#166534' }}>Documents uploaded successfully! Redirecting...</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 cursor-pointer" style={{ border: '2px dashed #d1d5db', borderRadius: '0.75rem', padding: '1rem', textAlign: 'center', cursor: 'pointer' }}>
                <input
                  type="file"
                  ref={cvFileRef}
                  onChange={handleCvChange}
                  accept=".pdf,.doc,.docx,.txt"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => cvFileRef.current?.click()}
                  className="w-full"
                  style={{ width: '100%', background: 'none', border: 'none' }}
                >
                  <FileText size={24} style={{ margin: '0 auto 0.5rem', color: '#9ca3af' }} />
                  <div className="text-sm text-gray-600" style={{ fontSize: '0.875rem', color: '#4b5563' }}>{cvFile ? cvFile.name : 'Click to upload CV'}</div>
                  <div className="text-xs text-gray-500" style={{ fontSize: '0.75rem', color: '#6b7280' }}>PDF, DOC, DOCX, TXT (Max 10MB)</div>
                </button>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 cursor-pointer" style={{ border: '2px dashed #d1d5db', borderRadius: '0.75rem', padding: '1rem', textAlign: 'center', cursor: 'pointer' }}>
                <input
                  type="file"
                  ref={jobDescFileRef}
                  onChange={handleJobDescChange}
                  accept=".pdf,.doc,.docx,.txt"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => jobDescFileRef.current?.click()}
                  className="w-full"
                  style={{ width: '100%', background: 'none', border: 'none' }}
                >
                  <Upload size={24} style={{ margin: '0 auto 0.5rem', color: '#9ca3af' }} />
                  <div className="text-sm text-gray-600" style={{ fontSize: '0.875rem', color: '#4b5563' }}>{jobDescFile ? jobDescFile.name : 'Click to upload job description'}</div>
                  <div className="text-xs text-gray-500" style={{ fontSize: '0.75rem', color: '#6b7280' }}>PDF, DOC, DOCX, TXT (Max 5MB)</div>
                </button>
              </div>
            </div>

            <div className="flex gap-4" style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="button"
                onClick={handleSkipUpload}
                disabled={uploadStatus.uploading}
                className="flex-1 px-6 py-3 border-2 rounded-lg font-semibold"
                style={{ flex: 1, padding: '0.75rem 1.5rem', border: '2px solid #d1d5db', borderRadius: '0.5rem', fontWeight: '600', cursor: 'pointer', backgroundColor: 'white' }}
              >
                Skip for Now
              </button>
              <button
                type="button"
                onClick={handleUploadDocuments}
                disabled={uploadStatus.uploading || (!cvFile && !jobDescFile)}
                className="flex-1 px-6 py-3 rounded-lg font-semibold text-white"
                style={{ flex: 1, padding: '0.75rem 1.5rem', borderRadius: '0.5rem', fontWeight: '600', color: 'white', cursor: uploadStatus.uploading || (!cvFile && !jobDescFile) ? 'not-allowed' : 'pointer', opacity: uploadStatus.uploading || (!cvFile && !jobDescFile) ? 0.5 : 1, background: 'linear-gradient(to right, #2563eb, #4f46e5)', border: 'none' }}
              >
                {uploadStatus.uploading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <span className="animate-spin" style={{ display: 'inline-block', width: '1rem', height: '1rem', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%' }}></span>
                    Uploading...
                  </span>
                ) : (
                  <>Upload & Continue</>
                )}
              </button>
            </div>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg" style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.5rem' }}>
              <p className="text-sm text-blue-800" style={{ fontSize: '0.875rem', color: '#1e40af', margin: 0 }}>
                <strong>💡 Pro Tip:</strong> Uploading documents helps provide personalized, context-aware answers!
              </p>
            </div>
          </div>
        </div>
      )}

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

        <div className="auth-divider">
          <span>or continue with</span>
        </div>

        <div className="oauth-buttons">
          <a 
            href="/api/auth/google"
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
    </>
  );
}

export default Login;
