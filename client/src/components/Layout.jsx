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
} from 'lucide-react';
import './Layout.css';

function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, subscription } = useAuthStore();
  const { disguiseMode, setDisguiseMode } = usePrivacyStore();
  const userPlan = subscription?.plan || subscription?.status || 'trial';
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [forceDesktop, setForceDesktop] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(() => window.matchMedia('(max-width: 1024px)').matches);

  const renderMobileBottomNav = () => {
    if (!isMobileLayout) return null;
    return (
      <nav className="mobile-bottom-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <button
              key={`mobile-bottom-${item.path}`}
              className={`mobile-bottom-item ${isActive ? 'active' : ''}`}
              type="button"
              onClick={() => handleNavClick(item.path)}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    );
  };

  useEffect(() => {
    // Hydrate desktop override preference
    const stored = localStorage.getItem('forceDesktopLayout');
    if (stored === 'true') {
      setForceDesktop(true);
    }

    const mq = window.matchMedia('(max-width: 1024px)');
    const handler = (e) => setIsMobileViewport(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    // Close sidebar when switching into mobile layout
    if (isMobileViewport && !forceDesktop) {
      setSidebarOpen(false);
    }
  }, [isMobileViewport, forceDesktop]);

  const isMobileLayout = useMemo(() => isMobileViewport && !forceDesktop, [isMobileViewport, forceDesktop]);

  const handleLogout = async () => {
    try {
      // Call server logout endpoint
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
        }).catch(() => {
          // Logout might fail but we still want to clear client-side
        });
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Clear client-side auth state
      logout();
      
      // Use navigate instead of window.location to avoid page reload issues on mobile
      navigate('/login', { replace: true });
    }
  };

  // requiredPlan: minimum plan needed; null = always accessible
  const navItems = [
    { path: '/',            icon: LayoutDashboard, label: 'Dashboard',          requiredPlan: null },
    { path: '/subscription',icon: Monitor,         label: 'Subscription & Trial',requiredPlan: null },
    { path: '/analytics',   icon: BarChart3,       label: 'Analytics',          requiredPlan: 'pro'   },
    { path: '/stealth',     icon: Shield,          label: 'Stealth',            requiredPlan: 'basic' },
    { path: '/mobile',      icon: Smartphone,      label: 'Mobile',             requiredPlan: 'basic' },
    { path: '/settings',    icon: Settings,        label: 'Settings',           requiredPlan: null },
  ];

  const mobileActions = [
    { 
      action: () => setDisguiseMode(!disguiseMode), 
      icon: disguiseMode ? Eye : EyeOff, 
      label: disguiseMode ? 'Show' : 'Hide'
    },
    { 
      action: handleLogout, 
      icon: LogOut, 
      label: 'Logout' 
    },
  ];

  const handleNavClick = (path) => {
    setSidebarOpen(false);
    navigate(path);
  };

  const toggleDesktopOverride = () => {
    const next = !forceDesktop;
    setForceDesktop(next);
    localStorage.setItem('forceDesktopLayout', next ? 'true' : 'false');
  };

  return (
    <div className={`layout ${disguiseMode ? 'disguise-mode' : ''} ${isSidebarOpen ? 'sidebar-open' : ''} ${isMobileLayout ? 'mobile-layout' : 'force-desktop'}`}>
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <img src="/mightysky-logo.svg" alt="Mightysky" style={{width: '32px', height: '32px', marginRight: '8px'}} />
          <h1>{disguiseMode ? 'Productivity' : 'Mightysky'}</h1>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            const locked = item.requiredPlan ? !canAccess(userPlan, item.requiredPlan) : false;
            const planLabel = item.requiredPlan === 'pro' ? 'Pro' : item.requiredPlan === 'basic' ? 'Basic' : null;
            return (
              <button
                key={item.path}
                className={`nav-item ${isActive ? 'active' : ''} ${locked ? 'nav-item-locked' : ''}`}
                type="button"
                onClick={() => handleNavClick(item.path)}
                title={locked ? `Requires ${planLabel} plan` : item.label}
              >
                <Icon size={20} />
                <span>{item.label}</span>
                {locked && (
                  <span className="nav-plan-badge" title={`Requires ${planLabel} plan`}>
                    <Lock size={11} style={{ marginRight: 2 }} />
                    {planLabel}
                  </span>
                )}
              </button>
            );
          })}
          {mobileActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={`mobile-action-${index}`}
                className="nav-item mobile-only"
                type="button"
                onClick={action.action}
              >
                <Icon size={20} />
                <span>{action.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button
            className="nav-item"
            type="button"
            onClick={toggleDesktopOverride}
            title={forceDesktop ? 'Switch to mobile view' : 'Switch to desktop view'}
          >
            {forceDesktop ? <Smartphone size={20} /> : <Monitor size={20} />}
            <span>{forceDesktop ? 'Mobile view' : 'Desktop view'}</span>
          </button>
          <button
            className="nav-item"
            type="button"
            onClick={() => setDisguiseMode(!disguiseMode)}
            title={disguiseMode ? 'Disable Disguise Mode' : 'Enable Disguise Mode'}
          >
            {disguiseMode ? <Eye size={20} /> : <EyeOff size={20} />}
            <span>{disguiseMode ? 'Show' : 'Hide'}</span>
          </button>
          
          <button className="nav-item" type="button" onClick={handleLogout}>
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

      <div className={`sidebar-backdrop ${isSidebarOpen ? 'show' : ''}`} onClick={() => setSidebarOpen(false)} />

      <main className="main-content">
        <header className="mobile-topbar">
          <button className="mobile-menu-btn" type="button" onClick={() => setSidebarOpen(!isSidebarOpen)} aria-label="Toggle navigation">
            <span />
            <span />
            <span />
          </button>
          <div className="mobile-brand">
            <img src="/mightysky-logo.svg" alt="Mightysky" />
            <div>
              <div className="brand-title">{disguiseMode ? 'Productivity' : 'Mightysky'}</div>
              <div className="brand-sub">Dashboard</div>
            </div>
          </div>
          <div className="mobile-actions">
            <button className="icon-btn" type="button" onClick={toggleDesktopOverride} aria-label={forceDesktop ? 'Switch to mobile view' : 'Switch to desktop view'}>
              {forceDesktop ? <Smartphone size={18} /> : <Monitor size={18} />}
            </button>
            <button className="icon-btn" type="button" onClick={() => setDisguiseMode(!disguiseMode)} aria-label="Toggle disguise mode">
              {disguiseMode ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            <button className="icon-btn" type="button" onClick={handleLogout} aria-label="Logout">
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <Outlet />
      </main>
      {renderMobileBottomNav()}
    </div>
  );
}

export default Layout;
