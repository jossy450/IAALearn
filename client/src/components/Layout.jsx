import React, { useEffect, useMemo, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { usePrivacyStore } from '../store/privacyStore';
import { canAccess } from '../store/subscriptionStore';
import { getApiRoot } from '../services/api';
import { 
  LayoutDashboard, 
  BarChart3, 
  Settings, 
  Smartphone, 
  LogOut,
  Eye,
  EyeOff,
  Shield,
  Monitor,
  Lock,
  Users,
  HelpCircle,
  MessageSquare,
  Headphones,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Gift,
} from 'lucide-react';
import './Layout.css';

function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, subscription } = useAuthStore();
  const { disguiseMode, setDisguiseMode } = usePrivacyStore();
  const userPlan = subscription?.plan || subscription?.status || 'free';
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [forceDesktop, setForceDesktop] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(() => window.matchMedia('(max-width: 768px)').matches);

  useEffect(() => {
    const stored = localStorage.getItem('forceDesktopLayout');
    if (stored === 'true') {
      setForceDesktop(true);
    }

    const mq = window.matchMedia('(max-width: 768px)');
    const handler = (e) => setIsMobileViewport(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (isMobileViewport && !forceDesktop) {
      setMobileMenuOpen(false);
    }
  }, [isMobileViewport, forceDesktop]);

  const isMobileLayout = useMemo(() => isMobileViewport && !forceDesktop, [isMobileViewport, forceDesktop]);

  const handleLogout = async () => {
    try {
      const authData = localStorage.getItem('auth-storage');
      const token = authData ? JSON.parse(authData).state?.token : null;
      
      if (token) {
        const apiBase = (getApiRoot() || '').trim().replace(/\/$/, '');
        const logoutUrl = apiBase ? `${apiBase}/api/auth/logout` : '/api/auth/logout';
        
        await fetch(logoutUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      logout();
      navigate('/login', { replace: true });
    }
  };

  const isPrivileged = () => {
    if (!user) return false;
    const email = user.email?.toLowerCase() || '';
    return (
      user.email === 'jossy450@gmail.com' ||
      user.id === 1 ||
      email.includes('owner') ||
      email.includes('developer') ||
      user.role === 'owner' ||
      user.email === 'admin@admin.com' ||
      user.email === 'mightyjosing@gmail.com'
    );
  };

  const navItems = [
    { path: '/',            icon: LayoutDashboard, label: 'Dashboard',          requiredPlan: null },
    { path: '/subscription',icon: Monitor,         label: 'Subscription',       requiredPlan: null },
    { path: '/analytics',   icon: BarChart3,       label: 'Analytics',          requiredPlan: null },
    { path: '/stealth',     icon: Shield,          label: 'Stealth',            requiredPlan: null },
    { path: '/mobile',      icon: Smartphone,      label: 'Mobile',             requiredPlan: null },
    { path: '/mock-interview', icon: Headphones,  label: 'Mock Interview',     requiredPlan: null },
    { path: '/faq',         icon: HelpCircle,      label: 'FAQ',                requiredPlan: null },
    { path: '/feedback',    icon: MessageSquare,   label: 'Feedback',           requiredPlan: null },
    { path: '/settings',    icon: Settings,        label: 'Settings',           requiredPlan: null },
    ...((isPrivileged() || user?.role === 'admin' || user?.role === 'power_user') ? [{ path: '/admin/users', icon: Users, label: 'Users', requiredPlan: null }] : []),
  ];

  const handleNavClick = (path) => {
    if (isMobileLayout) {
      setMobileMenuOpen(false);
    }
    navigate(path);
  };

  return (
    <div className={`layout ${disguiseMode ? 'disguise-mode' : ''} ${isMobileLayout ? 'mobile-layout' : 'force-desktop'}`}>
      
      {/* Mobile Header */}
      {isMobileLayout && (
        <header className="mobile-header">
          <button className="mobile-menu-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="mobile-header-brand">
            <img src="/mightysky-logo.svg" alt="Mightysky" />
            <span>{disguiseMode ? 'Productivity' : 'Mightysky'}</span>
          </div>
          <button className="icon-btn logout-btn" onClick={handleLogout} title="Logout">
            <LogOut size={20} />
          </button>
        </header>
      )}

      {/* Left Navigation Pane */}
      <aside className={`left-nav ${mobileMenuOpen ? 'mobile-open' : ''} ${navCollapsed ? 'collapsed' : ''}`}>
        {/* Nav Header */}
        <div className="left-nav-header">
          <div className="nav-brand">
            <img src="/mightysky-logo.svg" alt="Mightysky" />
            {!navCollapsed && <span className="brand-name">{disguiseMode ? 'Productivity' : 'Mightysky'}</span>}
          </div>
          {!isMobileLayout && (
            <button className="nav-collapse-btn" onClick={() => setNavCollapsed(!navCollapsed)}>
              {navCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          )}
        </div>

        {/* User Info */}
        <div className="left-nav-user">
          <div className="user-avatar-large">
            {user?.full_name?.[0] || user?.email?.[0] || 'U'}
          </div>
          {!navCollapsed && (
            <div className="user-details">
              <div className="user-name">{user?.full_name || 'User'}</div>
              <div className="user-email">{user?.email}</div>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="left-nav-items">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            const locked = item.requiredPlan ? (!isPrivileged() && !canAccess(userPlan, item.requiredPlan)) : false;
            return (
              <button
                key={item.path}
                className={`nav-item ${isActive ? 'active' : ''} ${locked ? 'locked' : ''}`}
                onClick={() => !locked && handleNavClick(item.path)}
                title={navCollapsed ? item.label : undefined}
              >
                <Icon size={20} />
                {!navCollapsed && <span>{item.label}</span>}
                {locked && !navCollapsed && <Lock size={14} className="lock-icon" />}
              </button>
            );
          })}
        </nav>

        {/* Referral Link */}
        <button className="nav-item referral-item" onClick={() => handleNavClick('/referral')}>
          <Gift size={20} />
          {!navCollapsed && <span>Invite Friends</span>}
        </button>

        {/* Footer Actions */}
        <div className="left-nav-footer">
          <button 
            className="nav-item" 
            onClick={() => setDisguiseMode(!disguiseMode)}
            title={navCollapsed ? (disguiseMode ? 'Show App' : 'Hide App') : undefined}
          >
            {disguiseMode ? <Eye size={20} /> : <EyeOff size={20} />}
            {!navCollapsed && <span>{disguiseMode ? 'Show' : 'Hide'}</span>}
          </button>
          
          <button className="nav-item logout-item" onClick={handleLogout}>
            <LogOut size={20} />
            {!navCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobileLayout && mobileMenuOpen && (
        <div className="mobile-nav-overlay" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Main Content */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
