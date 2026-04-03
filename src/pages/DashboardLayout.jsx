import { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Bot, ShieldCheck, Settings, CreditCard, Search, Bell, LogOut, Globe, Crown, Users, Briefcase, Menu, ChevronLeft, ChevronRight, X, FileText, Clock, DollarSign, MessageSquare, Database, HeartHandshake, Network } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useFirm } from '../contexts/FirmContext';
import { isAdminUser } from '../components/AdminRoute';
import { getAuditLog } from '../lib/agentAPI';
import '../styles/dashboard.css';

const NAV_ITEMS = {
  main: [
    { path: '/dashboard', Icon: MessageSquare, label: 'AI Chief of Staff', exact: true },
    { path: '/dashboard/overview', Icon: LayoutDashboard, label: 'Command Center' },
    { path: '/dashboard/matters', Icon: Briefcase, label: 'Matters' },
    { path: '/dashboard/client-portal', Icon: HeartHandshake, label: 'Client Portals' },
    { path: '/dashboard/team', Icon: Users, label: 'HR & AR' },
    { path: '/dashboard/super-agent', Icon: Crown, label: 'Super Agent', badge: '⚡' },
    { path: '/dashboard/agents', Icon: Database, label: 'Agents & Knowledgebase' },
    { path: '/dashboard/security', Icon: ShieldCheck, label: 'Security Audit' },
    { path: '/dashboard/website-builder', Icon: Globe, label: 'Website Builder' },
  ],
  manage: [
    { path: '/dashboard/settings', Icon: Settings, label: 'Firm Settings' },
    { path: '/dashboard/billing', Icon: DollarSign, label: 'Financials & Revenue' },
  ],
};

const BREADCRUMBS = {
  '/dashboard': 'AI Chief of Staff',
  '/dashboard/overview': 'Command Center',
  '/dashboard/matters': 'Firm Matters',
  '/dashboard/client-portal': 'Client Communications',
  '/dashboard/my-agent': 'AI Chief of Staff',
  '/dashboard/team': 'Human Resources & Agentic Resources',
  '/dashboard/website-builder': 'Website Builder',
  '/dashboard/agents': 'Agents & Knowledgebase',
  '/dashboard/security': 'Security Audit',
  '/dashboard/super-agent': 'Super Agent',
  '/dashboard/settings': 'Firm Settings',
  '/dashboard/billing': 'Financials & Revenue',
};

// Searchable pages within dashboard
const SEARCHABLE_PAGES = [
  { label: 'AI Chief of Staff', desc: 'Chat with your personal AI agent', path: '/dashboard', icon: MessageSquare },
  { label: 'Command Center', desc: 'Dashboard overview and firm analytics', path: '/dashboard/overview', icon: LayoutDashboard },
  { label: 'Matters', desc: 'Manage legal matters and workspaces', path: '/dashboard/matters', icon: Briefcase },
  { label: 'Client Portals', desc: 'Secure client communication channels', path: '/dashboard/client-portal', icon: HeartHandshake },
  { label: 'HR & AR', desc: 'Team members and agentic resources', path: '/dashboard/team', icon: Users },
  { label: 'Super Agent', desc: 'Firm-wide agent oversight dashboard', path: '/dashboard/super-agent', icon: Crown },
  { label: 'Agents & Knowledgebase', desc: 'Browse human role mirroring agents', path: '/dashboard/agents', icon: Database },
  { label: 'Security Audit', desc: 'NemoClaw sandbox security monitoring', path: '/dashboard/security', icon: ShieldCheck },
  { label: 'Website Builder', desc: 'AI-powered law firm website redesign', path: '/dashboard/website-builder', icon: Globe },
  { label: 'Firm Settings', desc: 'Profile, knowledge base, team, API keys', path: '/dashboard/settings', icon: Settings },
  { label: 'Financials & Revenue', desc: 'Firm subscription, client billing, and revenue metrics', path: '/dashboard/billing', icon: DollarSign },
  // Feature-specific entries
  { label: 'Edit Firm Profile', desc: 'Update firm name, jurisdiction, practice areas', path: '/dashboard/settings', icon: Settings },
  { label: 'Upload Knowledge Base', desc: 'Upload documents to train your AI', path: '/dashboard/settings', icon: FileText },
  { label: 'API Keys', desc: 'View and manage API credentials', path: '/dashboard/settings', icon: Settings },
  { label: 'Export Security Report', desc: 'Download audit trail as PDF', path: '/dashboard/security', icon: ShieldCheck },
  { label: 'Manage Subscription', desc: 'Update payment method and billing', path: '/dashboard/billing', icon: DollarSign },
  { label: 'Legal Research Agent', desc: 'Case law search and citation', path: '/dashboard/agents', icon: Search },
  { label: 'Contract Review Agent', desc: 'Automated NDA and MSA redlining', path: '/dashboard/agents', icon: FileText },
];

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { firm, firmId, agents, employees, personalAgents } = useFirm();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  // ═══ SEARCH STATE ═══
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  // ═══ NOTIFICATIONS STATE ═══
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);
  const notifRef = useRef(null);

  // Scroll to top on navigation
  useEffect(() => {
    window.scrollTo(0, 0);
    document.querySelector('.dashboard-main')?.scrollTo(0, 0);
  }, [location.pathname]);

  // Keyboard shortcut: Cmd/Ctrl+K for search
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

  // Focus search input when modal opens
  useEffect(() => {
    if (showSearch) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      setSearchQuery('');
    }
  }, [showSearch]);

  // Close notifications on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showNotifications]);

  // Load notifications from audit log
  const loadNotifications = useCallback(async () => {
    if (!firmId || notificationsLoaded) return;
    try {
      const log = await getAuditLog(firmId, 20);
      const mapped = log.map(entry => {
        const ts = entry.timestamp?.toDate?.() || new Date(entry.timestamp);
        const ago = formatTimeAgo(ts);
        return {
          id: entry.id || Math.random().toString(36),
          title: entry.agentRole ? `${entry.agentRole} Agent` : 'AI Chief of Staff',
          desc: (entry.agentResponse || entry.userMessage || 'Agent activity').slice(0, 80),
          time: ago,
          read: true,
        };
      });
      setNotifications(mapped);
    } catch (err) {
      console.warn('Could not load notifications:', err.message);
    }
    setNotificationsLoaded(true);
  }, [firmId, notificationsLoaded]);

  // Search filter
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

  // Breadcrumb
  const isMatterWorkspace = location.pathname.startsWith('/dashboard/matters/');
  const currentPage = isMatterWorkspace ? 'Matter Workspace' : (BREADCRUMBS[location.pathname] || 'Dashboard');

  const initials = user?.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || 'U';

  const myAgent = personalAgents?.find(a => a.employeeEmail === user?.email || a.humanEmail === user?.email);
  const myEmployeeData = employees?.find(e => e.email === user?.email);
  
  const hasSuperAgentAccess = !!myAgent?.superAgentAccess;
  const isFirmManager = ['managing-partner', 'solo-partner'].includes(myEmployeeData?.role) 
    || firm?.ownerId === user?.uid 
    || firm?.ownerUid === user?.uid
    || !firm?.isConfigured;

  const mainNavItems = NAV_ITEMS.main.filter(item => {
    if (item.path === '/dashboard/super-agent' && !hasSuperAgentAccess) return false;
    return true;
  });

  const manageNavItems = NAV_ITEMS.manage.filter(() => isFirmManager);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className={`dashboard-layout ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
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
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '10px 12px',
                    background: 'none', border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
                    color: 'var(--db-text-primary)', transition: 'background 0.1s',
                  }}
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
                  No results for "{searchQuery}"
                </div>
              )}
            </div>
            <div style={{ padding: '8px 16px', borderTop: '1px solid var(--db-border)', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '0.625rem', color: 'var(--db-text-muted)' }}>⌘K to open · ↑↓ to navigate · ↵ to select</span>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="db-sidebar">
        <div className="db-sidebar-logo" style={{ padding: isSidebarCollapsed ? '14px 8px' : '16px 20px', width: '100%', display: 'flex', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start', alignItems: 'center' }}>
          {isSidebarCollapsed ? (
            <img src="/logos/claw-128-transparent.png" alt="NemoC" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img src="/logos/claw-128-transparent.png" alt="" style={{ height: '32px', width: '32px', objectFit: 'contain' }} />
              <img src="/logos/wordmark.svg" alt="NemoC Law AI" style={{ height: '32px', objectFit: 'contain' }} />
            </div>
          )}
        </div>

        <nav className="db-sidebar-nav">
          <div className="db-sidebar-section">
            <div className="db-sidebar-section-title">Overview</div>
            {mainNavItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.exact}
                className={({ isActive }) => `db-sidebar-link ${isActive ? 'active' : ''}`}
              >
                <item.Icon size={18} className="db-nav-icon" />
                <span>{item.label}</span>
                {item.badge && <span className="db-sidebar-badge">{item.path === '/dashboard/agents' ? (agents?.activeAgents?.length || item.badge) : item.badge}</span>}
              </NavLink>
            ))}
          </div>

          {manageNavItems.length > 0 && (
            <div className="db-sidebar-section">
              <div className="db-sidebar-section-title">Manage</div>
              {manageNavItems.map(item => (
                <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `db-sidebar-link ${isActive ? 'active' : ''}`}
              >
                <item.Icon size={18} className="db-nav-icon" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
          )}

          {isAdminUser(user) && (
            <div className="db-sidebar-section">
              <div className="db-sidebar-section-title" style={{ color: '#ef4444' }}>God Mode</div>
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
              <span className="db-sidebar-user-name">{user?.displayName || 'User'}</span>
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
            {/* SEARCH BUTTON */}
            <div style={{ position: 'relative' }}>
              <button
                className="db-topbar-btn"
                title="Search (⌘K)"
                onClick={() => setShowSearch(true)}
              >
                <Search size={16} />
              </button>
            </div>

            {/* NOTIFICATIONS BELL */}
            <div style={{ position: 'relative' }} ref={notifRef}>
              <button 
                className="db-topbar-btn" 
                title="Notifications" 
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!notificationsLoaded) loadNotifications();
                }}
              >
                <Bell size={16} />
                {notifications.length > 0 && !showNotifications && (
                  <div style={{ position: 'absolute', top: '6px', right: '6px', width: '6px', height: '6px', borderRadius: '50%', background: '#76b900' }} />
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, width: '360px', marginTop: '8px',
                  background: 'var(--db-surface)', border: '1px solid var(--db-border)', borderRadius: '12px',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.25)', overflow: 'hidden', zIndex: 9999,
                }}>
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--db-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--db-text-primary)' }}>Notifications</div>
                    <button onClick={() => setShowNotifications(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--db-text-muted)', padding: '2px' }}>
                      <X size={14} />
                    </button>
                  </div>
                  <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                    {notifications.length > 0 ? notifications.map((n, i) => (
                      <div key={n.id} style={{
                        padding: '12px 16px', borderBottom: i < notifications.length - 1 ? '1px solid var(--db-border)' : 'none',
                        display: 'flex', gap: '10px', alignItems: 'flex-start',
                      }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--db-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Bot size={14} style={{ color: 'var(--db-nvidia-green)' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--db-text-primary)', marginBottom: '2px' }}>{n.title}</div>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.desc}</div>
                        </div>
                        <div style={{ fontSize: '0.5625rem', color: 'var(--db-text-muted)', flexShrink: 0, marginTop: '2px' }}>{n.time}</div>
                      </div>
                    )) : (
                      <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                        <Bell size={24} style={{ color: 'var(--db-text-muted)', opacity: 0.3, marginBottom: '8px' }} />
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--db-text-primary)', marginBottom: '4px' }}>No notifications</div>
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
