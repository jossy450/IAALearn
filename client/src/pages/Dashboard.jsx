import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar, Clock, TrendingUp } from 'lucide-react';
import { sessionAPI, analyticsAPI } from '../services/api';
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sessionsRes, analyticsRes] = await Promise.all([
        sessionAPI.getAll({ limit: 10 }),
        analyticsAPI.getUserAnalytics({ period: 30 })
      ]);
      setSessions(sessionsRes.data.sessions);
      setAnalytics(analyticsRes.data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    try {
      const response = await sessionAPI.create(newSession);
      const sessionId = response.data.session.id;
      navigate(`/session/${sessionId}`);
    } catch (error) {
      console.error('Failed to create session:', error);
      alert('Failed to create session. Please try again.');
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
            <h2>New Interview Session</h2>
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
                />
              </div>

              <div className="form-group">
                <label className="label">Session Type</label>
                <select
                  className="input"
                  value={newSession.sessionType}
                  onChange={(e) => setNewSession({ ...newSession, sessionType: e.target.value })}
                >
                  <option value="general">General</option>
                  <option value="technical">Technical</option>
                  <option value="behavioral">Behavioral</option>
                  <option value="case-study">Case Study</option>
                </select>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowNewSession(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Start Session
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
