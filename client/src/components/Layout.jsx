import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { usePrivacyStore } from '../store/privacyStore';
import { 
  LayoutDashboard, 
  BarChart3, 
  Settings, 
  Smartphone, 
  LogOut,
  Eye,
  EyeOff,
  Shield
} from 'lucide-react';
import './Layout.css';

function Layout() {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { disguiseMode, setDisguiseMode } = usePrivacyStore();

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/stealth', icon: Shield, label: 'Stealth Mode' },
    { path: '/mobile', icon: Smartphone, label: 'Mobile' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const handleLogout = async () => {
    try {
      // Call server logout endpoint
      const authData = localStorage.getItem('auth-storage');
      const token = authData ? JSON.parse(authData).state?.token : null;
      
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }).catch(() => {
          // Logout might fail but we still want to clear client-side
        });
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Clear client-side auth state
      logout();
      
      // Force redirect to login with small delay to ensure state is cleared
      setTimeout(() => {
        window.location.href = '/login';
      }, 50);
    }
  };

  return (
    <div className={`layout ${disguiseMode ? 'disguise-mode' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-header">
          <img src="/mightysky-logo.svg" alt="Mightysky" style={{width: '32px', height: '32px', marginRight: '8px'}} />
          <h1>{disguiseMode ? 'Productivity' : 'Mightysky'}</h1>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button
            className="nav-item"
            onClick={() => setDisguiseMode(!disguiseMode)}
            title={disguiseMode ? 'Disable Disguise Mode' : 'Enable Disguise Mode'}
          >
            {disguiseMode ? <Eye size={20} /> : <EyeOff size={20} />}
            <span>{disguiseMode ? 'Show' : 'Hide'}</span>
          </button>
          
          <button className="nav-item" onClick={handleLogout}>
            <LogOut size={20} />
            <span>Logout</span>
          </button>
          
          <div className="user-info">
            <div className="user-avatar">
              {user?.full_name?.[0] || user?.email?.[0] || 'U'}
            </div>
            <div className="user-details">
              <div className="user-name">{user?.full_name || 'User'}</div>
              <div className="user-email">{user?.email}</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
