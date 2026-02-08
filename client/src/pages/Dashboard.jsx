import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar, Clock, TrendingUp, FileText, Briefcase, X, User, MessageSquare } from 'lucide-react';
import { sessionAPI, analyticsAPI, documentsAPI } from '../services/api';
import './Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNewSession, setShowNewSession] = useState(false);
  const [newSession, setNewSession] = useState({
    title: '',
    companyName: '',
    position: '',
    sessionType: 'general'
  });
  
  // Document upload state
  const [cvFile, setCvFile] = useState(null);
  const [jobDescFile, setJobDescFile] = useState(null);
  const [personSpecFile, setPersonSpecFile] = useState(null);
  const [aiInstructions, setAiInstructions] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);
  const cvFileRef = useRef(null);
  const jobDescFileRef = useRef(null);
  const personSpecFileRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Try to load sessions
      try {
        const sessionsRes = await sessionAPI.getAll({ limit: 10 });
        setSessions(sessionsRes.data.sessions || []);
      } catch (sessionsErr) {
        console.warn('Failed to load sessions:', sessionsErr);
        setSessions([]); // Set empty array on error
      }

      // Try to load analytics
      try {
        const analyticsRes = await analyticsAPI.getUserAnalytics({ period: 30 });
        setAnalytics(analyticsRes.data);
      } catch (analyticsErr) {
        console.warn('Failed to load analytics:', analyticsErr);
        // Set minimal analytics data on error
        setAnalytics({
          sessionStats: { total_sessions: 0, avg_duration: 0, total_questions: 0, completed_sessions: 0 },
          trends: [],
          responseStats: {}
        });
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    try {
      // Include AI instructions in session creation
      const sessionData = {
        ...newSession,
        aiInstructions: aiInstructions.trim() || null
      };
      const response = await sessionAPI.create(sessionData);
      const sessionId = response.data.session.id;
      
      // Upload documents if provided
      setUploading(true);
      setUploadError('');
      
      try {
        if (cvFile) {
          await documentsAPI.uploadCV(cvFile);
        }
        if (jobDescFile) {
          await documentsAPI.uploadJobDescription(jobDescFile);
        }
        if (personSpecFile) {
          await documentsAPI.uploadPersonSpec(personSpecFile);
        }
      } catch (uploadErr) {
        console.warn('Document upload failed, but session created:', uploadErr);
        // Don't fail the session creation if upload fails
      }
      
      setUploading(false);
      // Reset form
      setCvFile(null);
      setJobDescFile(null);
      setPersonSpecFile(null);
      setAiInstructions('');
      setNewSession({ title: '', companyName: '', position: '', sessionType: 'general' });
      setShowNewSession(false);
      
      navigate(`/session/${sessionId}`);
    } catch (error) {
      // Try to extract a useful error message
      let errorMsg = 'Failed to create session. Please try again.';
      if (error?.response?.data?.error) {
        errorMsg = error.response.data.error;
      } else if (error?.message) {
        errorMsg = error.message;
      }
      // Log the full error object for debugging
      console.error('Failed to create session:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      setUploadError(errorMsg);
    }
  };

  const handleCvChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setUploadError('CV file must be less than 10MB');
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
        setUploadError('Job description file must be less than 5MB');
        return;
      }
      setJobDescFile(file);
      setUploadError('');
    }
  };

  const handlePersonSpecChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setUploadError('Person specification file must be less than 5MB');
        return;
      }
      setPersonSpecFile(file);
      setUploadError('');
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p className="subtitle">Manage your interview sessions</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowNewSession(true)}
        >
          <Plus size={20} />
          New Session
        </button>
      </div>

      {/* Analytics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dbeafe' }}>
            <Calendar size={24} color="#3b82f6" />
          </div>
          <div className="stat-content">
            <div className="stat-value">{analytics?.sessionStats?.total_sessions || 0}</div>
            <div className="stat-label">Total Sessions</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#d1fae5' }}>
            <TrendingUp size={24} color="#10b981" />
          </div>
          <div className="stat-content">
            <div className="stat-value">{analytics?.sessionStats?.total_questions || 0}</div>
            <div className="stat-label">Questions Answered</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fce7f3' }}>
            <Clock size={24} color="#ec4899" />
          </div>
          <div className="stat-content">
            <div className="stat-value">
              {formatDuration(analytics?.sessionStats?.avg_duration)}
            </div>
            <div className="stat-label">Avg Duration</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#e0e7ff' }}>
            <TrendingUp size={24} color="#6366f1" />
          </div>
          <div className="stat-content">
            <div className="stat-value">
              {Math.round(analytics?.responseStats?.avg_response_time || 0)}ms
            </div>
            <div className="stat-label">Avg Response Time</div>
          </div>
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="card">
        <h2 className="card-title">Recent Sessions</h2>
        {sessions.length === 0 ? (
          <div className="empty-state">
            <p>No sessions yet. Create your first session to get started!</p>
          </div>
        ) : (
          <div className="sessions-list">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="session-item"
                onClick={() => navigate(`/session/${session.id}`)}
              >
                <div className="session-info">
                  <h3>{session.title}</h3>
                  <div className="session-meta">
                    {session.company_name && <span>{session.company_name}</span>}
                    {session.position && <span>• {session.position}</span>}
                  </div>
                </div>
                <div className="session-stats">
                  <div className="stat-badge">
                    {session.question_count || session.total_questions || 0} questions
                  </div>
                  <div className="stat-badge">
                    {session.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Session Modal */}
      {showNewSession && (
        <div className="modal-overlay" onClick={() => setShowNewSession(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Interview Session</h2>
              <button 
                className="modal-close" 
                onClick={() => {
                  setShowNewSession(false);
                  setCvFile(null);
                  setJobDescFile(null);
                  setPersonSpecFile(null);
                  setAiInstructions('');
                  setUploadError('');
                }}
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateSession}>
              <div className="form-group">
                <label className="label">Session Title *</label>
                <input
                  type="text"
                  className="input"
                  value={newSession.title}
                  onChange={(e) => setNewSession({ ...newSession, title: e.target.value })}
                  required
                  placeholder="e.g., Frontend Developer Interview"
                  disabled={uploading}
                />
              </div>

              <div className="form-group">
                <label className="label">Company Name</label>
                <input
                  type="text"
                  className="input"
                  value={newSession.companyName}
                  onChange={(e) => setNewSession({ ...newSession, companyName: e.target.value })}
                  placeholder="e.g., Tech Corp"
                  disabled={uploading}
                />
              </div>

              <div className="form-group">
                <label className="label">Position</label>
                <input
                  type="text"
                  className="input"
                  value={newSession.position}
                  onChange={(e) => setNewSession({ ...newSession, position: e.target.value })}
                  placeholder="e.g., Senior Developer"
                  disabled={uploading}
                />
              </div>

              <div className="form-group">
                <label className="label">Session Type</label>
                <select
                  className="input"
                  value={newSession.sessionType}
                  onChange={(e) => setNewSession({ ...newSession, sessionType: e.target.value })}
                  disabled={uploading}
                >
                  <option value="general">General</option>
                  <option value="technical">Technical</option>
                  <option value="behavioral">Behavioral</option>
                  <option value="case-study">Case Study</option>
                </select>
              </div>

              {/* Document Upload Section */}
              <div className="documents-section">
                <label className="label">Upload Documents (Optional)</label>
                <p className="section-hint">Add your CV and job description to get personalized answers</p>
                
                {uploadError && <div className="alert alert-error">{uploadError}</div>}

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

                {/* Person Specification Upload Box */}
                <div className="upload-box">
                  <div className="upload-icon">
                    <User size={40} />
                  </div>
                  <div className="upload-content">
                    <h4>Person Specification</h4>
                    <p className="upload-text">
                      {personSpecFile ? personSpecFile.name : 'Upload person spec for better matching'}
                    </p>
                    <input
                      type="file"
                      ref={personSpecFileRef}
                      onChange={handlePersonSpecChange}
                      accept=".pdf,.doc,.docx,.txt"
                      className="hidden-input"
                      disabled={uploading}
                    />
                    <button
                      type="button"
                      onClick={() => personSpecFileRef.current?.click()}
                      className="btn btn-secondary btn-small"
                      disabled={uploading}
                    >
                      {personSpecFile ? '✓ Selected' : 'Choose File'}
                    </button>
                  </div>
                </div>

                {/* AI Instructions Textarea */}
                <div className="ai-instructions-box">
                  <div className="ai-instructions-header">
                    <MessageSquare size={24} />
                    <h4>AI Instructions</h4>
                  </div>
                  <p className="upload-text">Tell the AI how to format answers (optional)</p>
                  <textarea
                    className="input ai-instructions-textarea"
                    value={aiInstructions}
                    onChange={(e) => setAiInstructions(e.target.value)}
                    placeholder="Examples:
• Use STAR method (Situation, Task, Action, Result)
• Use STARR method (add Reflection at the end)
• Keep answers concise - 2 minutes max
• Focus on leadership and teamwork examples
• Include metrics and numbers where possible
• Tailor for senior management role"
                    rows={5}
                    disabled={uploading}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowNewSession(false);
                    setCvFile(null);
                    setJobDescFile(null);
                    setPersonSpecFile(null);
                    setAiInstructions('');
                    setUploadError('');
                  }}
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Start Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
