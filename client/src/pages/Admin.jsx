import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, BarChart3, Activity, AlertCircle, TrendingUp } from 'lucide-react';
import './Admin.css';

const ADMIN_API_BASE = '/api/admin';

function Admin() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [systemStatus, setSystemStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    loadAdminData();
  }, [period]);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('auth-storage');
      const authToken = token ? JSON.parse(token).state.token : '';

      const headers = {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      };

      const [overviewRes, usersRes, analyticsRes, logsRes, statusRes] = await Promise.all([
        fetch(`${ADMIN_API_BASE}/overview`, { headers }),
        fetch(`${ADMIN_API_BASE}/users?page=1&limit=10`, { headers }),
        fetch(`${ADMIN_API_BASE}/analytics?period=${period}`, { headers }),
        fetch(`${ADMIN_API_BASE}/audit-logs?page=1&limit=20`, { headers }),
        fetch(`${ADMIN_API_BASE}/system-status`, { headers })
      ]);

      if (!overviewRes.ok) throw new Error('Failed to load overview');
      if (!usersRes.ok) throw new Error('Failed to load users');
      if (!analyticsRes.ok) throw new Error('Failed to load analytics');
      if (!logsRes.ok) throw new Error('Failed to load audit logs');
      if (!statusRes.ok) throw new Error('Failed to load system status');

      const [overviewData, usersData, analyticsData, logsData, statusData] = await Promise.all([
        overviewRes.json(),
        usersRes.json(),
        analyticsRes.json(),
        logsRes.json(),
        statusRes.json()
      ]);

      setOverview(overviewData.overview);
      setUsers(usersData.users);
      setAnalytics(analyticsData);
      setAuditLogs(logsData.logs);
      setSystemStatus(statusData);
    } catch (err) {
      console.error('Error loading admin data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="spinner"></div>
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p className="subtitle">System overview and management</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Tabs */}
      <div className="admin-tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <BarChart3 size={20} /> Overview
        </button>
        <button
          className={`tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={20} /> Users
        </button>
        <button
          className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <TrendingUp size={20} /> Analytics
        </button>
        <button
          className={`tab ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          <Activity size={20} /> Audit Logs
        </button>
        <button
          className={`tab ${activeTab === 'system' ? 'active' : ''}`}
          onClick={() => setActiveTab('system')}
        >
          <AlertCircle size={20} /> System
        </button>
      </div>

      {/* Content */}
      <div className="admin-content">
        {/* Overview Tab */}
        {activeTab === 'overview' && overview && (
          <div className="overview-section">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Total Users</div>
                <div className="stat-value">{overview.totalUsers}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Active Sessions (24h)</div>
                <div className="stat-value">{overview.activeSessions24h}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Total Answers</div>
                <div className="stat-value">{overview.totalAnswers}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Avg Session Duration</div>
                <div className="stat-value">{overview.avgSessionDuration}s</div>
              </div>
            </div>

            <div className="charts-grid">
              <div className="card">
                <h3>Top Features</h3>
                <div className="feature-list">
                  {overview.topFeatures?.map((feature, idx) => (
                    <div key={idx} className="feature-item">
                      <span>{feature.feature}</span>
                      <span className="count">{feature.count} uses</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <h3>User Growth (Last 7 Days)</h3>
                <div className="growth-list">
                  {overview.userGrowth7days?.map((day, idx) => (
                    <div key={idx} className="growth-item">
                      <span>{new Date(day.date).toLocaleDateString()}</span>
                      <span className="bar" style={{ width: `${(day.count / 10) * 100}%` }}></span>
                      <span className="count">{day.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="users-section">
            <div className="section-header">
              <h2>Users Management</h2>
              <p>{users.length} users loaded</p>
            </div>
            <table className="users-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Sessions</th>
                  <th>Joined</th>
                  <th>Last Login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td className="email-cell">{user.email}</td>
                    <td>{user.full_name || '-'}</td>
                    <td><span className={`role-badge role-${user.role}`}>{user.role}</span></td>
                    <td className="center">{user.session_count}</td>
                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                    <td>{user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}</td>
                    <td><button className="btn btn-small">Details</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && analytics && (
          <div className="analytics-section">
            <div className="section-header">
              <h2>Analytics</h2>
              <select value={period} onChange={(e) => setPeriod(e.target.value)} className="period-select">
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
                <option value="year">Last Year</option>
              </select>
            </div>

            <div className="charts-grid">
              <div className="card">
                <h3>Sessions Created</h3>
                <div className="simple-chart">
                  {analytics.sessions?.map((item, idx) => (
                    <div key={idx} className="chart-item">
                      <div className="bar" style={{ height: `${item.count * 2}px` }}></div>
                      <span>{new Date(item.date).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <h3>Answers Generated</h3>
                <div className="simple-chart">
                  {analytics.answers?.map((item, idx) => (
                    <div key={idx} className="chart-item">
                      <div className="bar" style={{ height: `${item.count}px`, background: '#10b981' }}></div>
                      <span>{new Date(item.date).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <h3>New Users</h3>
                <div className="simple-chart">
                  {analytics.newUsers?.map((item, idx) => (
                    <div key={idx} className="chart-item">
                      <div className="bar" style={{ height: `${item.count * 5}px`, background: '#f59e0b' }}></div>
                      <span>{new Date(item.date).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Audit Logs Tab */}
        {activeTab === 'audit' && (
          <div className="audit-section">
            <div className="section-header">
              <h2>Audit Logs</h2>
              <p>{auditLogs.length} recent logs</p>
            </div>
            <div className="logs-list">
              {auditLogs.map((log, idx) => (
                <div key={idx} className="log-item">
                  <div className="log-header">
                    <span className="action-badge">{log.action}</span>
                    <span className="timestamp">{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                  {log.details && <div className="log-details">{JSON.stringify(log.details).substring(0, 100)}...</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* System Tab */}
        {activeTab === 'system' && systemStatus && (
          <div className="system-section">
            <div className="status-grid">
              <div className={`status-card status-${systemStatus.database.status}`}>
                <div className="status-label">Database</div>
                <div className="status-value">{systemStatus.database.status}</div>
              </div>
              <div className="status-card status-connected">
                <div className="status-label">Active Sessions</div>
                <div className="status-value">{systemStatus.sessions.activeSessions}</div>
              </div>
              <div className={`status-card ${systemStatus.errors.lastHour > 5 ? 'status-warning' : 'status-healthy'}`}>
                <div className="status-label">Errors (1h)</div>
                <div className="status-value">{systemStatus.errors.lastHour}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Admin;
