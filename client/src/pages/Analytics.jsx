import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Clock, Zap, Database } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { analyticsAPI, cacheAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { canAccess } from '../store/subscriptionStore';
import './Analytics.css';

function Analytics() {
  const navigate = useNavigate();
  const { subscription } = useAuthStore();
  const userPlan = subscription?.plan || subscription?.status || 'trial';
  const hasAccess = canAccess(userPlan, 'pro');

  const [userAnalytics, setUserAnalytics] = useState(null);
  const [cacheStats, setCacheStats] = useState(null);
  const [period, setPeriod] = useState('30');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [analyticsRes, cacheRes] = await Promise.all([
        analyticsAPI.getUserAnalytics({ period }),
        cacheAPI.getStats()
      ]);
      setUserAnalytics(analyticsRes.data);
      setCacheStats(cacheRes.data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading analytics...</p>
      </div>
    );
  }

  // ── Upgrade wall for non-Pro users ──────────────────────────────────────────
  if (!hasAccess) {
    return (
      <div className="upgrade-wall">
        <div className="upgrade-wall-card">
          <div className="upgrade-wall-icon">📊</div>
          <h2 className="upgrade-wall-title">Analytics — Pro Feature</h2>
          <p className="upgrade-wall-sub">
            Detailed session analytics, activity trends, response-time stats and cache
            performance are available on the <strong>Professional</strong> plan and above.
            Upgrade to unlock full insights into your interview performance.
          </p>
          <button
            className="upgrade-wall-btn"
            onClick={() => navigate('/subscription')}
          >
            🚀 Upgrade to Pro
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics">
      <div className="analytics-header">
        <div>
          <h1>Analytics</h1>
          <p className="subtitle">Track your interview performance</p>
        </div>
        <select
          className="input period-selector"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dbeafe' }}>
            <TrendingUp size={24} color="#3b82f6" />
          </div>
          <div className="stat-content">
            <div className="stat-value">{userAnalytics?.sessionStats?.total_sessions || 0}</div>
            <div className="stat-label">Total Sessions</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#d1fae5' }}>
            <Zap size={24} color="#10b981" />
          </div>
          <div className="stat-content">
            <div className="stat-value">{userAnalytics?.sessionStats?.total_questions || 0}</div>
            <div className="stat-label">Questions Answered</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fce7f3' }}>
            <Clock size={24} color="#ec4899" />
          </div>
          <div className="stat-content">
            <div className="stat-value">
              {formatDuration(userAnalytics?.sessionStats?.avg_duration)}
            </div>
            <div className="stat-label">Avg Session Duration</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#e0e7ff' }}>
            <Database size={24} color="#6366f1" />
          </div>
          <div className="stat-content">
            <div className="stat-value">{cacheStats?.stats?.total_hits || 0}</div>
            <div className="stat-label">Cache Hits</div>
          </div>
        </div>
      </div>

      {/* Trends Chart */}
      {userAnalytics?.trends && userAnalytics.trends.length > 0 && (
        <div className="card">
          <h2 className="card-title">Activity Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={userAnalytics.trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(date) => new Date(date).toLocaleDateString()}
              />
              <Legend />
              <Line type="monotone" dataKey="sessions" stroke="#3b82f6" name="Sessions" />
              <Line type="monotone" dataKey="questions" stroke="#10b981" name="Questions" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Cache Performance */}
      <div className="card">
        <h2 className="card-title">Cache Performance</h2>
        <div className="cache-stats">
          <div className="cache-stat">
            <div className="cache-stat-label">Total Entries</div>
            <div className="cache-stat-value">{cacheStats?.stats?.total_entries || 0}</div>
          </div>
          <div className="cache-stat">
            <div className="cache-stat-label">Active Entries</div>
            <div className="cache-stat-value">{cacheStats?.stats?.active_entries || 0}</div>
          </div>
          <div className="cache-stat">
            <div className="cache-stat-label">Total Hits</div>
            <div className="cache-stat-value">{cacheStats?.stats?.total_hits || 0}</div>
          </div>
          <div className="cache-stat">
            <div className="cache-stat-label">Avg Quality</div>
            <div className="cache-stat-value">
              {cacheStats?.stats?.avg_quality ? Number(cacheStats.stats.avg_quality).toFixed(2) : '0.00'}
            </div>
          </div>
        </div>

        {cacheStats?.topQuestions && cacheStats.topQuestions.length > 0 && (
          <>
            <h3 className="subsection-title">Most Frequent Questions</h3>
            <div className="top-questions">
              {cacheStats.topQuestions.slice(0, 5).map((q, idx) => (
                <div key={idx} className="top-question-item">
                  <div className="top-question-text">{q.question_text}</div>
                  <div className="top-question-stats">
                    <span className="badge badge-gray">{q.hit_count} hits</span>
                    <span className="badge badge-info">{q.category}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Response Time Stats */}
      {userAnalytics?.responseStats && (
        <div className="card">
          <h2 className="card-title">Response Time Statistics</h2>
          <div className="response-stats">
            <div className="response-stat">
              <div className="response-stat-label">Average</div>
              <div className="response-stat-value">
                {Math.round(userAnalytics.responseStats.avg_response_time || 0)}ms
              </div>
            </div>
            <div className="response-stat">
              <div className="response-stat-label">Minimum</div>
              <div className="response-stat-value">
                {Math.round(userAnalytics.responseStats.min_response_time || 0)}ms
              </div>
            </div>
            <div className="response-stat">
              <div className="response-stat-label">Maximum</div>
              <div className="response-stat-value">
                {Math.round(userAnalytics.responseStats.max_response_time || 0)}ms
              </div>
            </div>
            <div className="response-stat">
              <div className="response-stat-label">95th Percentile</div>
              <div className="response-stat-value">
                {Math.round(userAnalytics.responseStats.p95_response_time || 0)}ms
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Analytics;
