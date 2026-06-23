import { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Bot, ShieldCheck, Settings, Search, Bell, LogOut,
  Globe, Crown, Briefcase, Menu, FileText, DollarSign, MessageSquare,
  Database, HeartHandshake, Network, UploadCloud, X, Clock,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useFirm } from '../contexts/FirmContext';
import { isAdminUser } from '../components/AdminRoute';
import DashboardModeToggle from '../components/DashboardModeToggle';
import ThemeToggle from '../components/ThemeToggle';
import useDashboardInterfaceMode from '../hooks/useDashboardInterfaceMode';
import { useIdleTimeout } from '../hooks/useIdleTimeout';
import { getAuditLog } from '../lib/agentAPI';
import { getFounderDaysRemaining } from '../lib/stripeService';
import CommandDashboardLayout from './CommandDashboardLayout';
import TrialBanner from '../components/TrialBanner';
import '../styles/dashboard.css';

// Solo-attorney-optimized navigation
const NAV_ITEMS = {
  main: [
    { path: '/dashboard', Icon: MessageSquare, label: 'AI Chief of Staff', exact: true },
    { path: '/dashboard/overview', Icon: LayoutDashboard, label: 'Today\'s Briefing' },
    { path: '/dashboard/matters', Icon: Briefcase, label: 'Matters' },
    { path: '/dashboard/client-portal', Icon: HeartHandshake, label: 'Client Portals' },
    { path: '/dashboard/crm', Icon: Network, label: 'My Clients' },
    { path: '/dashboard/super-agent', Icon: Crown, label: 'Super Agent', badge: '⚡' },
    { path: '/dashboard/team', Icon: Bot, label: 'My AI Workforce' },
    { path: '/dashboard/agents', Icon: Database, label: 'Agents & Knowledge' },
    { path: '/dashboard/security', Icon: ShieldCheck, label: 'Security Audit' },
    { path: '/dashboard/website-builder', Icon: Globe, label: 'Website Builder' },
    { path: '/dashboard/migration', Icon: UploadCloud, label: 'Migration Center' },
  ],
  manage: [
    { path: '/dashboard/settings', Icon: Settings, label: 'Settings' },
    { path: '/dashboard/billing', Icon: DollarSign, label: 'Billing & Trial' },
  ],
};

const BREADCRUMBS = {
  '/dashboard': 'AI Chief of Staff',
  '/dashboard/overview': "Today's Briefing",
  '/dashboard/matters': 'Matters',
  '/dashboard/client-portal': 'Client Portals',
  '/dashboard/crm': 'My Clients',
  '/dashboard/my-agent': 'AI Chief of Staff',
  '/dashboard/team': 'My AI Workforce',
  '/dashboard/website-builder': 'Website Builder',
  '/dashboard/migration': 'Migration Center',
  '/dashboard/agents': 'Agents & Knowledge Base',
  '/dashboard/security': 'Security Audit',
  '/dashboard/super-agent': 'Super Agent',
  '/dashboard/settings': 'Settings',
  '/dashboard/billing': 'Billing & Trial',
};

const SEARCHABLE_PAGES = [
  { label: 'AI Chief of Staff', desc: 'Chat with your personal AI agent', path: '/dashboard', icon: MessageSquare },
  { label: "Today's Briefing", desc: 'Daily command center — deadlines, matters, and AI activity', path: '/dashboard/overview', icon: LayoutDashboard },
  { label: 'Matters', desc: 'Manage legal matters and workspaces', path: '/dashboard/matters', icon: Briefcase },
  { label: 'Client Portals', desc: 'Secure client communication channels', path: '/dashboard/client-portal', icon: HeartHandshake },
  { label: 'My Clients', desc: 'Client and prospect database', path: '/dashboard/crm', icon: Network },
  { label: 'Super Agent', desc: 'Firm-wide intelligence and oversight', path: '/dashboard/super-agent', icon: Crown },
  { label: 'My AI Workforce', desc: 'Your AI agents — capabilities, activity, and configuration', path: '/dashboard/team', icon: Bot },
  { label: 'Agents & Knowledge Base', desc: 'Browse agents and upload firm knowledge', path: '/dashboard/agents', icon: Database },
  { label: 'Security Audit', desc: 'NemoClaw sandbox security monitoring', path: '/dashboard/security', icon: ShieldCheck },
  { label: 'Website Builder', desc: 'AI-powered law firm website redesign', path: '/dashboard/website-builder', icon: Globe },
  { label: 'Migration Center', desc: 'Import from Clio, MyCase, or other systems', path: '/dashboard/migration', icon: UploadCloud },
  { label: 'Settings', desc: 'Profile, knowledge base, API keys, appearance', path: '/dashboard/settings', icon: Settings },
  { label: 'Billing & Trial', desc: 'Subscription, trial status, payment method', path: '/dashboard/billing', icon: DollarSign },
  { label: 'Upload Knowledge Base', desc: 'Upload documents to train your AI', path: '/dashboard/settings', icon: FileText },
  { label: 'Legal Research Agent', desc: 'Case law search and citation', path: '/dashboard/agents', icon: Search },
  { label: 'Contract Review Agent', desc: 'Automated redlining and risk flagging', path: '/dashboard/agents', icon: FileText },
];

// 25-minute idle warning, 30-minute auto-logout
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const IDLE_WARN_BEFORE_MS = 5 * 60 * 1000;

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { firm, firmId, agents, personalAgents, loading: firmLoading } = useFirm();
  const { interfaceMode, setInterfaceMode } = useDashboardInterfaceMode(user);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  // ═══ IDLE TIMEOUT STATE ═══
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const [idleCountdown, setIdleCountdown] = useState(300);
  const idleCountdownRef = useRef(null);

  const handleIdle = useCallback(async () => {
    setShowIdleWarning(false);
    clearInterval(idleCountdownRef.current);
    await logout();
    navigate('/login?reason=idle');
  }, [logout, navigate]);

  const handleIdleWarn = useCallback(() => {
    setShowIdleWarning(true);
    setIdleCountdown(Math.floor(IDLE_WARN_BEFORE_MS / 1000));
    idleCountdownRef.current = setInterval(() => {
      setIdleCountdown(prev => {
        if (prev <= 1) {
          clearInterval(idleCountdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleActive = useCallback(() => {
    setShowIdleWarning(false);
    setIdleCountdown(Math.floor(IDLE_WARN_BEFORE_MS / 1000));
    clearInterval(idleCountdownRef.current);
  }, []);

  useIdleTimeout({
    onIdle: handleIdle,
    onWarn: handleIdleWarn,
    onActive: handleActive,
    timeoutMs: IDLE_TIMEOUT_MS,
    warnBeforeMs: IDLE_WARN_BEFORE_MS,
    enabled: !!user,
  });

  useEffect(() => {
    return () => clearInterval(idleCountdownRef.current);
  }, []);

  // ═══ SEARCH STATE ═══
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);
  const notifRef = useRef(null);

  // Redirect to onboarding once profile is fully hydrated
  useEffect(() => {
    if (user && user.isPartial === false && user.onboardingComplete === false) {
      navigate('/onboarding', { replace: true });
    }
  }, [user, navigate]);

  // Scroll to top on navigation
  useEffect(() => {
    window.scrollTo(0, 0);
    document.querySelector('.db-content')?.scrollTo(0, 0);
  }, [location.pathname]);

  // Keyboard: Cmd+K for search, Escape for close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'Escape') {
        setShowSearch(false);
        setShowNotifications(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (showSearch) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      const t = setTimeout(() => setSearchQuery(''), 0);
      return () => clearTimeout(t);
    }
  }, [showSearch]);

  useEffect(() => {
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showNotifications]);

  const loadNotifications = useCallback(async () => {
    if (!firmId || notificationsLoaded) return;
    try {
      const log = await getAuditLog(firmId, 20);
      const mapped = log.map(entry => {
        const ts = entry.timestamp?.toDate?.() || new Date(entry.timestamp);
        return {
          id: entry.id || Math.random().toString(36),
          title: entry.agentRole ? `${entry.agentRole} Agent` : 'AI Chief of Staff',
          desc: (entry.agentResponse || entry.userMessage || 'Agent activity').slice(0, 80),
          time: formatTimeAgo(ts),
          read: true,
        };
      });
      setNotifications(mapped);
    } catch (err) {
      console.warn('Could not load notifications:', err.message);
    }
    setNotificationsLoaded(true);
  }, [firmId, notificationsLoaded]);

  const searchResults = searchQuery.trim().length > 0
    ? SEARCHABLE_PAGES.filter(p =>
        p.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.desc.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : SEARCHABLE_PAGES.slice(0, 6);

  const handleSearchSelect = (path) => {
    navigate(path);
    setShowSearch(false);
  };

  // Loading / onboarding redirect states
  if (firmLoading || (user?.isPartial === false && user?.onboardingComplete === false)) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0f', color: 'var(--db-nvidia-green)', flexDirection: 'column' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid rgba(118, 185, 0, 0.2)', borderTopColor: '#76b900', borderRadius: '50%', animation: 'spin 0.6s linear infinite', marginBottom: '16px' }} />
        <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>{firmLoading ? 'Loading your firm workspace...' : 'Launching setup...'}</p>
      </div>
    );
  }

  if (!firmId && !firm) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#fff', display: 'grid', placeItems: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '520px', width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '28px' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#76b900', fontWeight: 800, marginBottom: '12px' }}>Firm Setup Required</div>
          <h1 style={{ margin: '0 0 10px', fontSize: '1.5rem' }}>No firm workspace is linked to this account.</h1>
          <p style={{ margin: '0 0 20px', color: 'rgba(255,255,255,0.62)', lineHeight: 1.6 }}>
            Complete your firm setup to access your private AI practice management workspace.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/onboarding')} style={{ border: 0, borderRadius: '8px', padding: '12px 16px', background: '#76b900', color: '#071000', fontWeight: 800, cursor: 'pointer' }}>Set Up My Firm</button>
            {isAdminUser(user) && (
              <button onClick={() => navigate('/admin')} style={{ border: '1px solid rgba(255,255,255,0.16)', borderRadius: '8px', padding: '12px 16px', background: 'transparent', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Admin Dashboard</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const isMatterWorkspace = location.pathname.startsWith('/dashboard/matters/');
  const currentPage = isMatterWorkspace ? 'Matter Workspace' : (BREADCRUMBS[location.pathname] || 'Dashboard');

  const initials = user?.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || 'U';

  // Solo attorney: always has full access — no role-gating
  const trialDaysLeft = getFounderDaysRemaining(firm?.trialEndsAt);
  const isInTrial = trialDaysLeft > 0 && !firm?.hasPaymentMethod;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (interfaceMode === 'command') {
    return (
      <CommandDashboardLayout
        agents={agents}
        currentPage={currentPage}
        firm={firm}
        firmId={firmId}
        initials={initials}
        interfaceMode={interfaceMode}
        mainNavItems={NAV_ITEMS.main}
        manageNavItems={NAV_ITEMS.manage}
        onInterfaceModeChange={setInterfaceMode}
        onLogout={handleLogout}
        personalAgents={personalAgents}
        user={user}
      />
    );
  }

  return (
    <div className={`dashboard-layout ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>

      {/* ═══ IDLE WARNING MODAL ═══ */}
      {showIdleWarning && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999,
        }}>
          <div style={{
            maxWidth: '420px', width: '100%', background: 'var(--db-surface)',
            border: '1px solid var(--db-border)', borderRadius: '16px', padding: '28px',
            textAlign: 'center',
          }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Clock size={22} style={{ color: '#f59e0b' }} />
            </div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 8px', color: 'var(--db-text-primary)' }}>
              Still there?
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--db-text-secondary)', lineHeight: 1.6, margin: '0 0 20px' }}>
              For client data security, you will be signed out in{' '}
              <strong style={{ color: '#f59e0b' }}>{formatCountdown(idleCountdown)}</strong>{' '}
              due to inactivity.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => { setShowIdleWarning(false); clearInterval(idleCountdownRef.current); }}
                style={{ flex: 1, background: '#76b900', color: '#071000', border: 'none', borderRadius: '8px', padding: '12px', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}
              >
                I'm still here
              </button>
              <button
                onClick={handleLogout}
                style={{ flex: 1, background: 'transparent', color: 'var(--db-text-secondary)', border: '1px solid var(--db-border)', borderRadius: '8px', padding: '12px', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ GLOBAL SEARCH MODAL ═══ */}
      {showSearch && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '15vh', zIndex: 99999 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowSearch(false); }}
        >
          <div style={{ width: '100%', maxWidth: '560px', background: 'var(--db-surface)', border: '1px solid var(--db-border)', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--db-border)' }}>
              <Search size={18} style={{ color: 'var(--db-text-muted)', flexShrink: 0 }} />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search pages, features, agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1, background: 'none', border: 'none', fontSize: '0.9375rem', color: 'var(--db-text-primary)', outline: 'none', fontFamily: 'var(--db-font)' }}
              />
              <kbd style={{ padding: '2px 8px', borderRadius: '4px', background: 'var(--db-bg)', border: '1px solid var(--db-border)', fontSize: '0.625rem', fontWeight: 600, color: 'var(--db-text-muted)' }}>ESC</kbd>
            </div>
            <div style={{ maxHeight: '360px', overflowY: 'auto', padding: '8px' }}>
              {searchResults.length > 0 ? searchResults.map((result, i) => (
                <button
                  key={`${result.path}-${i}`}
                  onClick={() => handleSearchSelect(result.path)}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '10px 12px', background: 'none', border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', color: 'var(--db-text-primary)', transition: 'background 0.1s' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--db-bg)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--db-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <result.icon size={16} style={{ color: 'var(--db-text-muted)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{result.label}</div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{result.desc}</div>
                  </div>
                </button>
              )) : (
                <div style={{ padding: '24px', textAlign: 'center', fontSize: '0.8125rem', color: 'var(--db-text-muted)' }}>
                  No results for &ldquo;{searchQuery}&rdquo;
                </div>
              )}
            </div>
            <div style={{ padding: '8px 16px', borderTop: '1px solid var(--db-border)', display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '0.625rem', color: 'var(--db-text-muted)' }}>⌘K to open · ↑↓ navigate · ↵ select</span>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="db-sidebar">
        <div className="db-sidebar-logo" style={{ padding: isSidebarCollapsed ? '14px 8px' : '16px 20px', width: '100%', display: 'flex', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start', alignItems: 'center' }}>
          {isSidebarCollapsed ? (
            <img src="/logos/claw-128-transparent.png" alt="NemoC LAW AI" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img src="/logos/claw-128-transparent.png" alt="" style={{ height: '32px', width: '32px', objectFit: 'contain' }} />
              <img src="/logos/wordmark.svg" alt="NemoC LAW AI" style={{ height: '32px', objectFit: 'contain' }} />
            </div>
          )}
        </div>

        <nav className="db-sidebar-nav">
          <div className="db-sidebar-section">
            <div className="db-sidebar-section-title">Workspace</div>
            {NAV_ITEMS.main.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.exact}
                className={({ isActive }) => `db-sidebar-link ${isActive ? 'active' : ''}`}
              >
                <item.Icon size={18} className="db-nav-icon" />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="db-sidebar-badge">
                    {item.path === '/dashboard/agents' ? (agents?.activeAgents?.length || item.badge) : item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </div>

          <div className="db-sidebar-section">
            <div className="db-sidebar-section-title">Account</div>
            {NAV_ITEMS.manage.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `db-sidebar-link ${isActive ? 'active' : ''}`}
              >
                <item.Icon size={18} className="db-nav-icon" />
                <span>{item.label}</span>
                {item.path === '/dashboard/billing' && isInTrial && (
                  <span style={{ fontSize: '0.55rem', fontWeight: 700, background: 'rgba(118,185,0,0.15)', color: '#76b900', borderRadius: '4px', padding: '1px 5px', marginLeft: 'auto', flexShrink: 0 }}>
                    {trialDaysLeft}d
                  </span>
                )}
              </NavLink>
            ))}
          </div>

          {isAdminUser(user) && (
            <div className="db-sidebar-section">
              <div className="db-sidebar-section-title" style={{ color: '#ef4444' }}>Platform Admin</div>
              <NavLink
                to="/admin"
                className="db-sidebar-link"
                style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
              >
                <Crown size={18} className="db-nav-icon" color="#ef4444" />
                <span style={{ color: '#ef4444', fontWeight: 600 }}>C.E.A Dashboard</span>
              </NavLink>
            </div>
          )}
        </nav>

        <div className="db-sidebar-footer">
          <div className="db-sidebar-user">
            <div className="db-sidebar-avatar" style={{ padding: user?.photoURL ? 0 : '', overflow: 'hidden' }}>
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
              ) : (
                initials
              )}
            </div>
            <div className="db-sidebar-user-info">
              <span className="db-sidebar-user-name">{user?.displayName || 'Attorney'}</span>
              <span className="db-sidebar-user-role">{user?.email}</span>
            </div>
          </div>
          <button className="db-sidebar-logout" onClick={handleLogout} title="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="db-main">
        <div className="db-topbar">
          <div className="db-topbar-left">
            <button
              className="db-topbar-btn"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              style={{ marginRight: '16px', border: 'none', background: 'transparent' }}
            >
              <Menu size={20} />
            </button>
            <div className="db-topbar-breadcrumb">
              Dashboard / <span>{currentPage}</span>
            </div>
          </div>
          <div className="db-topbar-right">
            <DashboardModeToggle value={interfaceMode} onChange={setInterfaceMode} />
            <ThemeToggle />
            <div style={{ position: 'relative' }}>
              <button className="db-topbar-btn" title="Search (⌘K)" onClick={() => setShowSearch(true)}>
                <Search size={16} />
              </button>
            </div>

            {/* Notifications */}
            <div style={{ position: 'relative' }} ref={notifRef}>
              <button
                className="db-topbar-btn"
                title="Notifications"
                onClick={() => { setShowNotifications(!showNotifications); if (!notificationsLoaded) loadNotifications(); }}
              >
                <Bell size={16} />
                {notifications.length > 0 && !showNotifications && (
                  <div style={{ position: 'absolute', top: '6px', right: '6px', width: '6px', height: '6px', borderRadius: '50%', background: '#76b900' }} />
                )}
              </button>

              {showNotifications && (
                <div style={{ position: 'absolute', top: '100%', right: 0, width: '360px', marginTop: '8px', background: 'var(--db-surface)', border: '1px solid var(--db-border)', borderRadius: '12px', boxShadow: '0 12px 40px rgba(0,0,0,0.25)', overflow: 'hidden', zIndex: 9999 }}>
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--db-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 700 }}>Agent Activity</div>
                    <button onClick={() => setShowNotifications(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--db-text-muted)', padding: '2px' }}>
                      <X size={14} />
                    </button>
                  </div>
                  <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                    {notifications.length > 0 ? notifications.map((n, i) => (
                      <div key={n.id} style={{ padding: '12px 16px', borderBottom: i < notifications.length - 1 ? '1px solid var(--db-border)' : 'none', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--db-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Bot size={14} style={{ color: 'var(--db-nvidia-green)' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '2px' }}>{n.title}</div>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.desc}</div>
                        </div>
                        <div style={{ fontSize: '0.5625rem', color: 'var(--db-text-muted)', flexShrink: 0, marginTop: '2px' }}>{n.time}</div>
                      </div>
                    )) : (
                      <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                        <Bell size={24} style={{ color: 'var(--db-text-muted)', opacity: 0.3, marginBottom: '8px' }} />
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>No activity yet</div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)' }}>Agent activity will appear here as your AI workforce processes tasks.</div>
                      </div>
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <div style={{ padding: '10px 16px', borderTop: '1px solid var(--db-border)', textAlign: 'center' }}>
                      <button onClick={() => { navigate('/dashboard/security'); setShowNotifications(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--db-nvidia-green)' }}>
                        View Full Audit Log →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="db-content">
          {/* Trial banner inside content area */}
          {isInTrial && (
            <TrialBanner trialEndsAt={firm?.trialEndsAt} hasPaymentMethod={firm?.hasPaymentMethod} />
          )}
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatCountdown(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
}
