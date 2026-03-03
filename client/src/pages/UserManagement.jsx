import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Trash2,
  RefreshCcw,
  Search,
  Filter,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import './UserManagement.css';

const OWNER_EMAILS = ['jossy450@gmail.com', 'mightyjosing@gmail.com', 'admin@admin.com'];

const formatDate = (value) => {
  if (!value) return 'Never';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

function UserManagement() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    fullName: '',
    password: '',
    role: 'user'
  });

  // Check if current user is the owner/developer (unrestricted access)
  const isOwner = () => {
    const email = user?.email?.toLowerCase() || '';
    return (
      user?.id === 1 ||
      OWNER_EMAILS.includes(email) ||
      email.includes('owner') ||
      email.includes('developer') ||
      user?.role === 'owner' ||
      user?.email === 'jossy450@gmail.com'
    );
  };

  // Owners have unrestricted access, others need admin role
  const hasAccess = () => {
    return isOwner() || user?.role === 'admin';
  };

  useEffect(() => {
    if (!hasAccess()) {
      navigate('/');
      return;
    }
    loadUsers();
  }, [user, navigate]);

  const loadUsers = async ({ silent = false, clearStatus = true } = {}) => {
    try {
      if (silent) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }

      if (clearStatus) {
        setStatus({ type: '', message: '' });
      }

      const response = await api.get('/admin/users?limit=100');
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Failed to load users:', error);
      setStatus({
        type: 'error',
        message:
          error?.response?.data?.error ||
          'Unable to load users right now. Please try again.'
      });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();

    const trimmedEmail = newUser.email.trim().toLowerCase();
    const trimmedName = newUser.fullName.trim();

    if (!trimmedEmail) {
      setStatus({ type: 'error', message: 'Email is required to create a user.' });
      return;
    }

    try {
      setIsCreatingUser(true);

      await api.post('/admin/users', {
        email: trimmedEmail,
        fullName: trimmedName,
        password: newUser.password,
        role: newUser.role
      });

      setShowCreateModal(false);
      setNewUser({ email: '', fullName: '', password: '', role: 'user' });
      setStatus({ type: 'success', message: 'User created successfully.' });
      await loadUsers({ silent: true, clearStatus: false });
    } catch (error) {
      console.error('Failed to create user:', error);
      setStatus({
        type: 'error',
        message:
          error?.response?.data?.error ||
          'Failed to create user. Please try again.'
      });
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    if (userId === user?.id && newRole !== 'owner') {
      const proceed = window.confirm(
        'You are changing your own role. This may remove your admin access. Continue?'
      );
      if (!proceed) return;
    }

    try {
      await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      setStatus({ type: 'success', message: 'User role updated.' });
      await loadUsers({ silent: true, clearStatus: false });
    } catch (error) {
      console.error('Failed to update user role:', error);
      setStatus({
        type: 'error',
        message:
          error?.response?.data?.error ||
          'Failed to update user role. Please try again.'
      });
    }
  };

  const handleDeleteUser = async (userId, email) => {
    if (userId === user?.id) {
      setStatus({ type: 'error', message: 'You cannot delete your own account from this screen.' });
      return;
    }

    if (!window.confirm(`Delete ${email}? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/admin/users/${userId}`);
      setStatus({ type: 'success', message: 'User deleted successfully.' });
      await loadUsers({ silent: true, clearStatus: false });
    } catch (error) {
      console.error('Failed to delete user:', error);
      setStatus({
        type: 'error',
        message:
          error?.response?.data?.error ||
          'Failed to delete user. Please try again.'
      });
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter((u) => u.role === 'admin').length;
    const moderators = users.filter((u) => u.role === 'moderator').length;
    const owners = users.filter((u) => u.role === 'owner').length;
    return { total, admins, moderators, owners };
  }, [users]);

  if (loading) {
    return (
      <div className="user-management-loading">
        <div className="spinner"></div>
        <p>Loading users...</p>
      </div>
    );
  }

  return (
    <div className="user-management">
      <div className="user-management-header">
        <div className="header-content">
          <h1><Users size={32} /> User Management</h1>
          <p>Manage user accounts, roles, and permissions</p>
          {isOwner() && (
            <div className="owner-badge">
              <Shield size={16} />
              Owner Account - Full Access
            </div>
          )}
        </div>

        <div className="header-actions">
          <button
            className="btn btn-ghost"
            onClick={() => loadUsers({ silent: true })}
            disabled={isRefreshing}
          >
            <RefreshCcw size={18} className={isRefreshing ? 'spin' : ''} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>

          {hasAccess() && (
            <button
              className="btn btn-primary"
              onClick={() => setShowCreateModal(true)}
            >
              <UserPlus size={20} />
              Create User
            </button>
          )}
        </div>
      </div>

      <div className="user-management-content">
        {status.message && (
          <div className={`status-banner ${status.type}`} role="status">
            {status.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            <span>{status.message}</span>
            <button
              type="button"
              className="status-close"
              onClick={() => setStatus({ type: '', message: '' })}
              aria-label="Dismiss status"
            >
              ×
            </button>
          </div>
        )}

        <div className="management-summary">
          <div className="summary-card">
            <span>Total Users</span>
            <strong>{stats.total}</strong>
          </div>
          <div className="summary-card">
            <span>Admins</span>
            <strong>{stats.admins}</strong>
          </div>
          <div className="summary-card">
            <span>Moderators</span>
            <strong>{stats.moderators}</strong>
          </div>
          <div className="summary-card">
            <span>Owners</span>
            <strong>{stats.owners}</strong>
          </div>
        </div>

        <div className="toolbar">
          <div className="search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search by email or name"
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-box">
            <Filter size={16} />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="role-filter"
            >
              <option value="all">All roles</option>
              <option value="user">Users</option>
              <option value="moderator">Moderators</option>
              <option value="admin">Admins</option>
              <option value="owner">Owners</option>
            </select>
          </div>
        </div>

        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>Full Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Sessions</th>
                <th>Joined</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((userData) => (
                <tr key={userData.id}>
                  <td>{userData.full_name || 'N/A'}</td>
                  <td>{userData.email}</td>
                  <td>
                    {hasAccess() ? (
                      <select
                        value={userData.role}
                        onChange={(e) => handleUpdateRole(userData.id, e.target.value)}
                        className={`role-select role-${userData.role}`}
                      >
                        <option value="user">User</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Admin</option>
                        {isOwner() && <option value="owner">Owner</option>}
                      </select>
                    ) : (
                      <span className={`role-badge role-${userData.role}`}>
                        {userData.role}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className="session-pill">{userData.session_count || 0}</span>
                  </td>
                  <td>{formatDate(userData.created_at)}</td>
                  <td>
                    {formatDate(userData.last_login)}
                  </td>
                  <td>
                    <div className="action-buttons">
                      {hasAccess() && (
                        <button
                          className="btn-icon btn-danger"
                          onClick={() => handleDeleteUser(userData.id, userData.email)}
                          title="Delete user"
                          disabled={userData.id === user?.id}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="empty-state">
            <Users size={48} />
            <h3>No users found</h3>
            <p>
              {searchTerm || roleFilter !== 'all'
                ? 'Try adjusting your search or role filter.'
                : 'No users have been created yet.'}
            </p>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateModal && hasAccess() && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><UserPlus size={24} /> Create New User</h2>
              <button
                className="modal-close"
                onClick={() => setShowCreateModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label className="label">Email Address *</label>
                <input
                  type="email"
                  className="input"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  required
                  placeholder="user@example.com"
                />
              </div>

              <div className="form-group">
                <label className="label">Full Name</label>
                <input
                  type="text"
                  className="input"
                  value={newUser.fullName}
                  onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                  placeholder="John Doe"
                />
              </div>

              <div className="form-group">
                <label className="label">Password *</label>
                <input
                  type="password"
                  className="input"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  required
                  placeholder="Enter a secure password"
                  minLength={8}
                />
              </div>

              <div className="form-group">
                <label className="label">Role</label>
                <select
                  className="input"
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                >
                  <option value="user">User</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                  {isOwner() && <option value="owner">Owner</option>}
                </select>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isCreatingUser}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isCreatingUser}>
                  {isCreatingUser ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;