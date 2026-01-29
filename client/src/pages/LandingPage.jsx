import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, Briefcase, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [showUpload, setShowUpload] = useState(true);
  const [cvFile, setCvFile] = useState(null);
  const [jobDescriptionFile, setJobDescriptionFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user has already uploaded documents in this session
    const hasUploaded = sessionStorage.getItem('documents-uploaded');
    if (hasUploaded === 'true') {
      setShowUpload(false);
      navigate('/');
    }
  }, [navigate]);

  const handleCvChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('CV file size must be less than 10MB');
        return;
      }
      setCvFile(file);
      setError(null);
    }
  };

  const handleJobDescriptionChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Job description file size must be less than 5MB');
        return;
      }
      setJobDescriptionFile(file);
      setError(null);
    }
  };

  const handleSkip = () => {
    sessionStorage.setItem('documents-uploaded', 'true');
    navigate('/');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!cvFile && !jobDescriptionFile) {
      setError('Please select at least one document to upload');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      if (cvFile) {
        formData.append('cv', cvFile);
      }
      if (jobDescriptionFile) {
        formData.append('job_description', jobDescriptionFile);
      }

      // TODO: Replace with actual API endpoint
      // const response = await documentsAPI.upload(formData);
      
      // Simulate upload for now
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setSuccess(true);
      sessionStorage.setItem('documents-uploaded', 'true');
      
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err.response?.data?.message || 'Failed to upload documents. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removeCv = () => {
    setCvFile(null);
  };

  const removeJobDescription = () => {
    setJobDescriptionFile(null);
  };

  if (!showUpload) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
          <h1 className="text-3xl font-bold mb-2">Welcome, {user?.full_name || 'User'}! 👋</h1>
          <p className="text-blue-100">
            Upload your CV and job description for AI-powered, personalized interview answers
          </p>
        </div>

        {success ? (
          <div className="p-8 text-center">
            <CheckCircle className="mx-auto mb-4 text-green-500" size={64} />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Upload Successful!</h2>
            <p className="text-gray-600 mb-4">Your documents have been processed. Redirecting...</p>
            <div className="animate-spin mx-auto w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-8">
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
                <span className="text-sm text-red-800">{error}</span>
              </div>
            )}

            <div className="space-y-6">
              {/* CV Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <FileText className="inline mr-2" size={18} />
                  Upload Your CV/Resume
                </label>
                <div className="relative">
                  <input
                    type="file"
                    id="cv-upload"
                    onChange={handleCvChange}
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    disabled={uploading}
                  />
                  <label
                    htmlFor="cv-upload"
                    className={`flex items-center justify-center w-full px-4 py-6 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                      cvFile 
                        ? 'border-green-400 bg-green-50' 
                        : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
                    }`}
                  >
                    {cvFile ? (
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="text-green-500" size={24} />
                          <div className="text-left">
                            <div className="font-semibold text-gray-800">{cvFile.name}</div>
                            <div className="text-sm text-gray-600">
                              {(cvFile.size / 1024).toFixed(1)} KB
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            removeCv();
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Upload className="mx-auto mb-2 text-gray-400" size={32} />
                        <span className="text-sm text-gray-600">
                          Click to upload or drag and drop
                        </span>
                        <div className="text-xs text-gray-500 mt-1">PDF, DOC, or DOCX (Max 10MB)</div>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Job Description Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Briefcase className="inline mr-2" size={18} />
                  Upload Job Description
                </label>
                <div className="relative">
                  <input
                    type="file"
                    id="jd-upload"
                    onChange={handleJobDescriptionChange}
                    accept=".pdf,.doc,.docx,.txt"
                    className="hidden"
                    disabled={uploading}
                  />
                  <label
                    htmlFor="jd-upload"
                    className={`flex items-center justify-center w-full px-4 py-6 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                      jobDescriptionFile 
                        ? 'border-green-400 bg-green-50' 
                        : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
                    }`}
                  >
                    {jobDescriptionFile ? (
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="text-green-500" size={24} />
                          <div className="text-left">
                            <div className="font-semibold text-gray-800">{jobDescriptionFile.name}</div>
                            <div className="text-sm text-gray-600">
                              {(jobDescriptionFile.size / 1024).toFixed(1)} KB
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            removeJobDescription();
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Upload className="mx-auto mb-2 text-gray-400" size={32} />
                        <span className="text-sm text-gray-600">
                          Click to upload or drag and drop
                        </span>
                        <div className="text-xs text-gray-500 mt-1">PDF, DOC, DOCX, or TXT (Max 5MB)</div>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-4">
              <button
                type="button"
                onClick={handleSkip}
                disabled={uploading}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Skip for Now
              </button>
              <button
                type="submit"
                disabled={uploading || (!cvFile && !jobDescriptionFile)}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload size={20} />
                    Upload & Continue
                  </>
                )}
              </button>
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>💡 Pro Tip:</strong> Uploading your documents allows our AI to provide personalized,
                context-aware answers tailored to your experience and the specific role you're applying for.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default LandingPage;