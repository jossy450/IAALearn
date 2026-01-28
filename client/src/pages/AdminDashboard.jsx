import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, Activity, BarChart3, LogOut, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import './AdminDashboard.css';

function AdminDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Check if user is admin
    if (user?.role !== 'admin') {
      navigate('/');
      return;
    }
    loadDashboardData();
  }, [user, navigate]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes, analyticsRes] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/admin/users?limit=10'),
        api.get('/admin/analytics?period=30')
      ]);

      setStats(statsRes.data);
      setUsers(usersRes.data.users);
      setAnalytics(analyticsRes.data);
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="spinner"></div>
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="admin-header">
          <div className="admin-logo">
            <BarChart3 size={28} />
            <span>Admin</span>
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
            className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <Activity size={20} />
            <span>Overview</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <Users size={20} />
            <span>Users</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
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
          <h1>Admin Dashboard</h1>
          <div className="user-info">
            <span className="admin-badge">Admin</span>
            <span className="admin-email">{user?.email}</span>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="admin-overview">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#dbeafe' }}>
                  <Users size={24} color="#3b82f6" />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.users.total}</div>
                  <div className="stat-label">Total Users</div>
                  <div className="stat-detail">
                    +{stats.users.new_this_period} this period
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#d1fae5' }}>
                  <Activity size={24} color="#10b981" />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.sessions.completed}</div>
                  <div className="stat-label">Completed Sessions</div>
                  <div className="stat-detail">
                    {Math.round(
                      (stats.sessions.completed / stats.sessions.total) * 100
                    )}% completion rate
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#fef3c7' }}>
                  <BarChart3 size={24} color="#f59e0b" />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.activeSessions.count}</div>
                  <div className="stat-label">Active Sessions</div>
                  <div className="stat-detail">Last 24 hours</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#fce7f3' }}>
                  <TrendingUp size={24} color="#ec4899" />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.documents.total}</div>
                  <div className="stat-label">Documents Uploaded</div>
                  <div className="stat-detail">
                    {stats.documents.cvs} CVs, {stats.documents.job_descriptions} JDs
                  </div>
                </div>
              </div>
            </div>

            <div className="top-users-section">
              <h2>Top Users</h2>
              <div className="top-users-list">
                {stats.topUsers.map((user, idx) => (
                  <div key={user.id} className="user-rank-item">
                    <div className="rank-number">{idx + 1}</div>
                    <div className="rank-info">
                      <div className="rank-name">{user.full_name || user.email}</div>
                      <div className="rank-email">{user.email}</div>
                    </div>
                    <div className="rank-sessions">{user.session_count} sessions</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="admin-users">
            <div className="section-header">
              <h2>User Management</h2>
              <input
                type="text"
                placeholder="Search users..."
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="users-table">
              <table>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Full Name</th>
                    <th>Role</th>
                    <th>Joined</th>
                    <th>Last Login</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>{user.email}</td>
                      <td>{user.full_name || 'N/A'}</td>
                      <td>
                        <span className={`role-badge role-${user.role}`}>
                          {user.role}
                        </span>
                      </td>
                      <td>{new Date(user.created_at).toLocaleDateString()}</td>
                      <td>
                        {user.last_login
                          ? new Date(user.last_login).toLocaleDateString()
                          : 'Never'}
                      </td>
                      <td>
                        <button className="btn-view">View Details</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && analytics && (
          <div className="admin-analytics">
            <div className="section-header">
              <h2>Analytics & Trends</h2>
            </div>

            <div className="analytics-grid">
              <div className="analytics-card">
                <h3>Session Completion Rate</h3>
                <div className="metric-large">
                  {analytics.sessionCompletion.completion_rate}%
                </div>
                <div className="metric-detail">
                  {analytics.sessionCompletion.completed} of{' '}
                  {analytics.sessionCompletion.total} completed
                </div>
              </div>

              <div className="analytics-card">
                <h3>Average Session Duration</h3>
                <div className="metric-large">
                  {analytics.sessionDuration.avg_seconds
                    ? `${Math.round(analytics.sessionDuration.avg_seconds / 60)}m`
                    : 'N/A'}
                </div>
                <div className="metric-detail">
                  Min: {Math.round(analytics.sessionDuration.min_seconds / 60)}m | Max:{' '}
                  {Math.round(analytics.sessionDuration.max_seconds / 60)}m
                </div>
              </div>
            </div>

            <div className="features-section">
              <h3>Feature Usage</h3>
              <div className="features-list">
                {analytics.features.map((feature) => (
                  <div key={feature.document_type} className="feature-item">
                    <div className="feature-name">
                      {feature.document_type === 'cv' ? 'CV Uploads' : 'Job Descriptions'}
                    </div>
                    <div className="feature-count">{feature.count}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="daily-active-section">
              <h3>Daily Active Users (Last 30 Days)</h3>
              <div className="daily-chart">
                {analytics.dailyActiveUsers.map((day) => (
                  <div key={day.date} className="day-bar">
                    <div
                      className="bar"
                      style={{
                        height: `${Math.min(100, (day.count / 10) * 100)}%`
                      }}
                    ></div>
                    <div className="day-label">{new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                    <div className="day-count">{day.count}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminDashboard;
