import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  TrendingUp,
  Activity,
  BarChart3,
  LogOut,
  Menu,
  RefreshCcw,
  AlertTriangle,
  Clock3
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import './AdminDashboard.css';

const isPrivilegedUser = (currentUser) => {
  return (
    currentUser?.role === 'admin' ||
    currentUser?.id === 1 ||
    currentUser?.email?.toLowerCase().includes('owner') ||
    currentUser?.email?.toLowerCase().includes('developer') ||
    currentUser?.role === 'owner' ||
    currentUser?.email === 'admin@admin.com' ||
    currentUser?.email === 'jossy450@gmail.com' ||
    currentUser?.email === 'mightyjosing@gmail.com'
  );
};

const sumCounts = (items = []) =>
  items.reduce((total, item) => total + Number(item?.count || 0), 0);

const formatDuration = (seconds) => {
  if (!seconds || Number.isNaN(Number(seconds))) return 'N/A';
  const mins = Math.round(Number(seconds) / 60);
  if (mins < 1) return '< 1 min';
  return `${mins} min`;
};

const getTopDay = (items = []) => {
  if (!items.length) return null;
  return items.reduce((top, day) => {
    if (!top) return day;
    return Number(day.count || 0) > Number(top.count || 0) ? day : top;
  }, null);
};

function AdminDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [overview, setOverview] = useState(null);
  const [topUsers, setTopUsers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!isPrivilegedUser(user)) {
      navigate('/');
      return;
    }
    loadDashboardData();
  }, [user, navigate]);

  const loadDashboardData = async ({ silent = false } = {}) => {
    try {
      if (silent) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }

      setLoadError('');

      const [overviewRes, usersRes, analyticsRes] = await Promise.all([
        api.get('/admin/overview'),
        api.get('/admin/users?limit=10'),
        api.get('/admin/analytics?period=month')
      ]);

      setOverview(overviewRes.data?.overview || null);
      setTopUsers(usersRes.data?.users || []);
      setAnalytics(analyticsRes.data);
    } catch (error) {
      console.error('Failed to load admin data:', error);
      setLoadError(
        error?.response?.data?.error ||
          'Unable to load admin dashboard data right now. Please try again.'
      );
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const weeklyUserGrowth = useMemo(
    () => sumCounts(overview?.userGrowth7days),
    [overview]
  );

  const analyticsSummary = useMemo(() => {
    return {
      sessions: sumCounts(analytics?.sessions),
      answers: sumCounts(analytics?.answers),
      newUsers: sumCounts(analytics?.newUsers)
    };
  }, [analytics]);

  const sessionPeakDay = useMemo(
    () => getTopDay(analytics?.sessions),
    [analytics]
  );

  const maxSessionCount = useMemo(() => {
    const counts = (analytics?.sessions || []).map((day) => Number(day.count || 0));
    return Math.max(...counts, 1);
  }, [analytics]);

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="spinner"></div>
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  if (!overview && loadError) {
    return (
      <div className="admin-loading admin-error-state">
        <AlertTriangle size={28} />
        <p>{loadError}</p>
        <button
          className="admin-refresh-btn"
          onClick={() => loadDashboardData()}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="admin-header">
          <div className="admin-logo">
            <img src="/mightysky-logo.svg" alt="Mightysky" style={{width: '32px', height: '32px', marginRight: '8px'}} />
            <span>Mightysky Admin</span>
          </div>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu size={20} />
          </button>
        </div>

        <nav className="admin-nav">
          <button
            className={`admin-nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <Activity size={20} />
            <span>Overview</span>
          </button>
          <button
            className="admin-nav-item"
            onClick={() => navigate('/admin/users')}
          >
            <Users size={20} />
            <span>Users</span>
          </button>
          <button
            className={`admin-nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <TrendingUp size={20} />
            <span>Analytics</span>
          </button>
        </nav>

        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="admin-content">
        <div className="admin-topbar">
          <div>
            <h1>Admin Dashboard</h1>
            <p className="admin-subtitle">Overview of platform usage and user activity</p>
          </div>

          <div className="admin-topbar-actions">
            <button
              className="admin-refresh-btn"
              onClick={() => loadDashboardData({ silent: true })}
              disabled={isRefreshing}
            >
              <RefreshCcw size={16} className={isRefreshing ? 'spin' : ''} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            <div className="admin-user-info">
              <span className="admin-badge">Admin</span>
              <span className="admin-email">{user?.email}</span>
            </div>
          </div>
        </div>

        {loadError && (
          <div className="admin-alert" role="status">
            <AlertTriangle size={16} />
            <span>{loadError}</span>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && overview && (
          <div className="admin-overview">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#dbeafe' }}>
                  <Users size={24} color="#3b82f6" />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{overview.totalUsers ?? 0}</div>
                  <div className="stat-label">Total Users</div>
                  <div className="stat-detail">+{weeklyUserGrowth} users in the last 7 days</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#d1fae5' }}>
                  <Activity size={24} color="#10b981" />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{overview.activeSessions24h ?? 0}</div>
                  <div className="stat-label">Active Sessions (24h)</div>
                  <div className="stat-detail">Interview sessions created in the last day</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#fef3c7' }}>
                  <BarChart3 size={24} color="#f59e0b" />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{overview.totalAnswers ?? 0}</div>
                  <div className="stat-label">Total Answers Generated</div>
                  <div className="stat-detail">Across all user interview sessions</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#fce7f3' }}>
                  <Clock3 size={24} color="#ec4899" />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{formatDuration(overview.avgSessionDuration)}</div>
                  <div className="stat-label">Avg Session Duration</div>
                  <div className="stat-detail">Average time spent per completed session</div>
                </div>
              </div>
            </div>

            <div className="top-users-section">
              <h2>Top Users</h2>

              {topUsers.length === 0 ? (
                <p className="admin-empty-state">No user activity found yet.</p>
              ) : (
                <div className="top-users-list">
                  {topUsers.map((topUser, idx) => (
                    <div key={topUser.id} className="user-rank-item">
                      <div className="rank-number">{idx + 1}</div>
                      <div className="rank-info">
                        <div className="rank-name">{topUser.full_name || topUser.email}</div>
                        <div className="rank-email">{topUser.email}</div>
                      </div>
                      <div className="rank-sessions">{topUser.session_count || 0} sessions</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && analytics && (
          <div className="admin-analytics">
            <div className="admin-section-header">
              <h2>Analytics & Trends ({analytics.period || 'month'})</h2>
            </div>

            <div className="analytics-grid">
              <div className="analytics-card">
                <h3>Interview Sessions</h3>
                <div className="metric-large">{analyticsSummary.sessions}</div>
                <div className="metric-detail">Total sessions created for this period</div>
              </div>

              <div className="analytics-card">
                <h3>Answers Generated</h3>
                <div className="metric-large">{analyticsSummary.answers}</div>
                <div className="metric-detail">Total AI answers generated in this period</div>
              </div>

              <div className="analytics-card">
                <h3>New Users</h3>
                <div className="metric-large">{analyticsSummary.newUsers}</div>
                <div className="metric-detail">New signups recorded in this period</div>
              </div>

              <div className="analytics-card">
                <h3>Busiest Session Day</h3>
                <div className="metric-large">
                  {sessionPeakDay
                    ? new Date(sessionPeakDay.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })
                    : 'N/A'}
                </div>
                <div className="metric-detail">
                  {sessionPeakDay ? `${sessionPeakDay.count} sessions` : 'Not enough activity yet'}
                </div>
              </div>
            </div>

            <div className="daily-active-section">
              <h3>Daily Session Activity</h3>

              {(analytics.sessions || []).length === 0 ? (
                <p className="admin-empty-state">No daily session data available yet.</p>
              ) : (
                <div className="daily-chart">
                  {analytics.sessions.map((day) => (
                    <div key={day.date} className="day-bar">
                      <div
                        className="bar"
                        style={{
                          height: `${Math.max(8, (Number(day.count || 0) / maxSessionCount) * 100)}%`
                        }}
                      ></div>
                      <div className="day-label">
                        {new Date(day.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                      <div className="day-count">{day.count}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminDashboard;
