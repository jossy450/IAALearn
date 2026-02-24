import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, Ban, CheckCircle, XCircle, Edit, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import './UserManagement.css';

function UserManagement() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    fullName: '',
    password: '',
    role: 'user'
  });

  // Check if current user is the owner/developer (unrestricted access)
  const isOwner = () => {
    // Owner identification logic:
    // 1. First user (ID = 1) - typically the developer/owner account
    // 2. Or user with email containing 'owner' or 'developer' or specific admin emails
    // 3. Or user with 'owner' role if it exists
    return (
      user?.id === 1 || // First user is typically the owner
      user?.email?.toLowerCase().includes('owner') ||
      user?.email?.toLowerCase().includes('developer') ||
      user?.role === 'owner' ||
      user?.email === 'admin@admin.com' // Common admin email
    );
  };

  // Owners have unrestricted access, others need admin role
  const hasAccess = () => {
    return isOwner() || user?.role === 'admin';
  };

  useEffect(() => {
    // Check if user has access to user management
    if (!hasAccess()) {
      navigate('/');
      return;
    }
    loadUsers();
  }, [user, navigate]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/users?limit=100');
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/users', newUser);
      setShowCreateModal(false);
      setNewUser({ email: '', fullName: '', password: '', role: 'user' });
      loadUsers();
    } catch (error) {
      console.error('Failed to create user:', error);
      alert('Failed to create user. Please try again.');
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      loadUsers();
    } catch (error) {
      console.error('Failed to update user role:', error);
      alert('Failed to update user role. Please try again.');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to permanently delete this user? This action cannot be undone.')) {
      return;
    }
    try {
      await api.delete(`/admin/users/${userId}`);
      loadUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user. Please try again.');
    }
  };

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

      <div className="user-management-content">
        <div className="search-section">
          <input
            type="text"
            placeholder="Search users by email or name..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Full Name</th>
                <th>Role</th>
                <th>Device ID</th>
                <th>Joined</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((userData) => (
                <tr key={userData.id}>
                  <td>{userData.email}</td>
                  <td>{userData.full_name || 'N/A'}</td>
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
                    <code className="device-id">
                      {userData.device_id ? userData.device_id.substring(0, 12) + '...' : 'Not set'}
                    </code>
                  </td>
                  <td>{new Date(userData.created_at).toLocaleDateString()}</td>
                  <td>
                    {userData.last_login
                      ? new Date(userData.last_login).toLocaleDateString()
                      : 'Never'}
                  </td>
                  <td>
                    <div className="action-buttons">
                      {hasAccess() && (
                        <button
                          className="btn-icon btn-danger"
                          onClick={() => handleDeleteUser(userData.id)}
                          title="Delete user"
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
            <p>{searchTerm ? 'Try adjusting your search terms.' : 'No users have been created yet.'}</p>
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
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create User
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