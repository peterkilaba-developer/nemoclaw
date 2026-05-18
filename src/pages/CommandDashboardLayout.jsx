import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import {
  Bell,
  Bot,
  Briefcase,
  CheckCircle,
  ChevronRight,
  Clock,
  DollarSign,
  FileText,
  Gavel,
  Layers,
  Lock,
  LogOut,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Scale,
  Search,
  Settings,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { isAdminUser } from '../components/AdminRoute';
import DashboardModeToggle from '../components/DashboardModeToggle';
import { db } from '../lib/firebase';
import '../styles/commandDashboard.css';

function getMatterType(matter) {
  return matter?.type || matter?.practiceArea || matter?.practice || 'General matter';
}

function getFirmName(firm) {
  return firm?.firmName || firm?.name || 'Firm workspace';
}

function getMatterIdFromPath(pathname) {
  const match = pathname.match(/^\/dashboard\/matters\/([^/]+)/);
  return match?.[1] || null;
}

function buildPageSummary(currentPage, activeMatter, firm) {
  if (activeMatter) {
    return `${activeMatter.client || 'Client'} · ${getMatterType(activeMatter)} · ${activeMatter.status || 'Active'}`;
  }
  if (currentPage === 'AI Chief of Staff') return `Command thread for ${getFirmName(firm)}.`;
  if (currentPage === 'Firm Matters') return 'Matter pipeline, intake proposals, and active workspaces.';
  if (currentPage === 'Financials & Revenue') return 'Billing, subscription, revenue, and trust activity.';
  return `${getFirmName(firm)} practice operations.`;
}

export default function CommandDashboardLayout({
  agents,
  currentPage,
  firm,
  firmId,
  initials,
  interfaceMode,
  mainNavItems,
  manageNavItems,
  onInterfaceModeChange,
  onLogout,
  user,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [matters, setMatters] = useState([]);
  const [matterQuery, setMatterQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(() => typeof window === 'undefined' || window.innerWidth > 880);

  useEffect(() => {
    if (!firmId) return undefined;
    const mattersQuery = query(collection(db, 'firms', firmId, 'matters'), orderBy('createdAt', 'desc'), limit(20));
    return onSnapshot(mattersQuery, (snap) => {
      setMatters(snap.docs.map(item => ({ id: item.id, ...item.data() })));
    }, (err) => {
      console.warn('Could not load command mode matters:', err.message);
      setMatters([]);
    });
  }, [firmId]);

  const activeMatterId = getMatterIdFromPath(location.pathname);
  const activeMatter = matters.find(matter => matter.id === activeMatterId) || null;
  const pageSummary = buildPageSummary(currentPage, activeMatter, firm);

  const visibleMatters = useMemo(() => {
    const normalizedQuery = matterQuery.trim().toLowerCase();
    if (!normalizedQuery) return matters;
    return matters.filter(matter =>
      matter.title?.toLowerCase().includes(normalizedQuery) ||
      matter.client?.toLowerCase().includes(normalizedQuery) ||
      getMatterType(matter).toLowerCase().includes(normalizedQuery)
    );
  }, [matterQuery, matters]);

  const searchablePages = useMemo(() => {
    const pages = [...mainNavItems, ...manageNavItems].map(item => ({
      label: item.label,
      path: item.path,
      Icon: item.Icon,
    }));
    if (isAdminUser(user)) pages.push({ label: 'C.E.A Dashboard', path: '/admin', Icon: ShieldCheck });
    matters.slice(0, 8).forEach(matter => {
      pages.push({
        label: matter.title || 'Untitled matter',
        path: `/dashboard/matters/${matter.id}`,
        Icon: Briefcase,
      });
    });
    return pages;
  }, [mainNavItems, manageNavItems, matters, user]);

  const searchResults = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) return searchablePages.slice(0, 8);
    return searchablePages.filter(item => item.label.toLowerCase().includes(normalizedQuery)).slice(0, 12);
  }, [searchQuery, searchablePages]);

  const handleSearchSelect = (path) => {
    navigate(path);
    setShowSearch(false);
    setSearchQuery('');
  };

  const activeAgentsCount = agents?.activeAgents?.length || 0;

  return (
    <main className="command-dashboard">
      {showSearch && (
        <div className="command-search-backdrop" onClick={(event) => { if (event.target === event.currentTarget) setShowSearch(false); }}>
          <div className="command-search-dialog">
            <div className="command-search-input">
              <Search size={18} />
              <input
                autoFocus
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                placeholder="Search pages and matters"
              />
              <button type="button" onClick={() => setShowSearch(false)} aria-label="Close search">
                <X size={16} />
              </button>
            </div>
            <div className="command-search-results">
              {searchResults.map(result => (
                <button key={`${result.path}-${result.label}`} type="button" onClick={() => handleSearchSelect(result.path)}>
                  <result.Icon size={17} />
                  <span>{result.label}</span>
                  <ChevronRight size={15} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className={`command-window ${isInspectorOpen ? 'has-inspector' : 'no-inspector'}`}>
        <header className="command-titlebar">
          <div className="command-traffic" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <button className="command-mobile-menu" type="button" onClick={() => setIsSidebarOpen(true)} aria-label="Open navigation">
            <Menu size={19} />
          </button>
          <div className="command-app-title">
            <Scale size={16} />
            <span>NemoC LAW AI</span>
          </div>
          <div className="command-title-actions">
            <DashboardModeToggle value={interfaceMode} onChange={onInterfaceModeChange} className="command-mode-toggle" />
            <button type="button" onClick={() => setShowSearch(true)} title="Search" aria-label="Search">
              <Search size={17} />
            </button>
            <button type="button" onClick={() => navigate('/dashboard/security')} title="Notifications" aria-label="Notifications">
              <Bell size={17} />
            </button>
            <button type="button" onClick={() => navigate('/dashboard/settings')} title="Settings" aria-label="Settings">
              <Settings size={17} />
            </button>
          </div>
        </header>

        <div className="command-shell">
          <aside className={`command-sidebar ${isSidebarOpen ? 'is-open' : ''}`}>
        <div className="command-mobile-head">
          <span>Workspace</span>
          <button type="button" onClick={() => setIsSidebarOpen(false)} aria-label="Close navigation">
            <X size={18} />
          </button>
        </div>

        <button className="command-firm-chip" type="button" onClick={() => { navigate('/dashboard'); setIsSidebarOpen(false); }} title={getFirmName(firm)}>
          <img src="/logos/claw-48-transparent.png" alt="" />
          <span>
            <strong>{getFirmName(firm)}</strong>
            <small>Practice command</small>
          </span>
        </button>

        <button className="command-new-button" type="button" onClick={() => { navigate('/dashboard/matters'); setIsSidebarOpen(false); }} title="New matter command">
          <Plus size={17} />
          <span>New matter command</span>
        </button>

        <nav className="command-nav" aria-label="Command dashboard navigation">
          {mainNavItems.map(item => (
            <NavLink key={item.path} to={item.path} end={item.exact} className={({ isActive }) => isActive ? 'is-active' : ''} onClick={() => setIsSidebarOpen(false)} title={item.label}>
              <item.Icon size={17} />
              <span>{item.label}</span>
              {item.badge && <em>{item.path === '/dashboard/agents' ? (activeAgentsCount || item.badge) : item.badge}</em>}
            </NavLink>
          ))}
        </nav>

        {manageNavItems.length > 0 && (
          <nav className="command-nav command-manage-nav" aria-label="Command dashboard management">
            {manageNavItems.map(item => (
              <NavLink key={item.path} to={item.path} className={({ isActive }) => isActive ? 'is-active' : ''} onClick={() => setIsSidebarOpen(false)} title={item.label}>
                <item.Icon size={17} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        )}

        <div className="command-matter-search">
          <Search size={16} />
          <input
            value={matterQuery}
            onChange={event => setMatterQuery(event.target.value)}
            placeholder="Search matters"
            aria-label="Search matters"
          />
        </div>

        <div className="command-matter-list" aria-label="Recent matters">
          {visibleMatters.length > 0 ? visibleMatters.map(matter => (
            <button
              key={matter.id}
              type="button"
              className={matter.id === activeMatterId ? 'is-selected' : ''}
              title={matter.title || 'Untitled matter'}
              onClick={() => { navigate(`/dashboard/matters/${matter.id}`); setIsSidebarOpen(false); }}
            >
              <span className={`command-risk-dot ${matter.status === 'Closed' ? 'muted' : 'active'}`} />
              <span>
                <strong>{matter.title || 'Untitled matter'}</strong>
                <small>{matter.client || getMatterType(matter)}</small>
              </span>
              <ChevronRight size={15} />
            </button>
          )) : (
            <div className="command-empty-state">No matters found.</div>
          )}
        </div>

        <div className="command-account">
          <div className="command-avatar">
            {user?.photoURL ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" /> : initials}
          </div>
          <span>
            <strong>{user?.displayName || 'User'}</strong>
            <small>{user?.email}</small>
          </span>
          <button type="button" onClick={onLogout} title="Sign out" aria-label="Sign out">
            <LogOut size={15} />
          </button>
        </div>
      </aside>

          <section className="command-main">
        <section className="command-workspace">
          <div className="command-hero">
            <div>
              <div className="command-eyebrow">
                <MessageSquare size={15} />
                <span>Dashboard / {currentPage}</span>
              </div>
              <h1>{activeMatter?.title || currentPage}</h1>
              <p>{pageSummary}</p>
            </div>
            <button type="button" className="command-context-toggle" onClick={() => setIsInspectorOpen(value => !value)}>
              <Layers size={17} />
              <span>{isInspectorOpen ? 'Hide context' : 'Show context'}</span>
            </button>
          </div>

          <div className="command-meta-grid">
            <article>
              <span>Firm</span>
              <strong>{getFirmName(firm)}</strong>
            </article>
            <article>
              <span>Matters</span>
              <strong>{matters.length}</strong>
            </article>
            <article>
              <span>Agents</span>
              <strong>{activeAgentsCount}</strong>
            </article>
            <article>
              <span>Mode</span>
              <strong>Command</strong>
            </article>
          </div>

          <div className="command-route-surface">
            <Outlet />
          </div>
        </section>
      </section>

      <aside className={`command-inspector ${isInspectorOpen ? 'is-open' : ''}`}>
        <div className="command-inspector-head">
          <span>{activeMatter ? activeMatter.status || 'Active' : 'Live context'}</span>
          <h2>{activeMatter?.title || getFirmName(firm)}</h2>
          <button type="button" onClick={() => setIsInspectorOpen(false)} aria-label="Close context">
            <X size={18} />
          </button>
        </div>

        <section className="command-context-card">
          <div className="command-section-title">
            <Briefcase size={16} />
            <span>{activeMatter ? 'Matter posture' : 'Workspace posture'}</span>
          </div>
          <div className="command-context-lines">
            <p><strong>Client</strong><span>{activeMatter?.client || user?.displayName || 'Firm user'}</span></p>
            <p><strong>Practice</strong><span>{activeMatter ? getMatterType(activeMatter) : 'All practice areas'}</span></p>
            <p><strong>Stage</strong><span>{activeMatter?.stage || activeMatter?.status || currentPage}</span></p>
          </div>
        </section>

        <section className="command-context-card">
          <div className="command-section-title">
            <Clock size={16} />
            <span>Quick layers</span>
          </div>
          <div className="command-layer-links">
            <button type="button" onClick={() => navigate(activeMatter ? `/dashboard/matters/${activeMatter.id}` : '/dashboard/matters')}>
              <MessageSquare size={15} />
              <span>Workspace</span>
            </button>
            <button type="button" onClick={() => navigate('/dashboard/matters')}>
              <Briefcase size={15} />
              <span>Matters</span>
            </button>
            <button type="button" onClick={() => navigate('/dashboard/client-portal')}>
              <Users size={15} />
              <span>Client</span>
            </button>
            <button type="button" onClick={() => navigate('/dashboard/billing')}>
              <DollarSign size={15} />
              <span>Billing</span>
            </button>
          </div>
        </section>

        <section className="command-context-card">
          <div className="command-section-title">
            <Gavel size={16} />
            <span>Authority</span>
          </div>
          <div className="command-authority-list">
            <span><Lock size={14} /> Attorney review</span>
            <span><ShieldCheck size={14} /> Privilege protected</span>
            <span><CheckCircle size={14} /> Audit active</span>
          </div>
        </section>

        <section className="command-context-card">
          <div className="command-section-title">
            <Bot size={16} />
            <span>Agent pod</span>
          </div>
          <div className="command-pod-list">
            <span>Partner</span>
            <span>Associate</span>
            <span>Paralegal</span>
            <span>Billing</span>
          </div>
        </section>

        <button className="command-inspector-action" type="button" onClick={() => navigate('/dashboard/security')}>
          <FileText size={16} />
          <span>Open audit trail</span>
          <MoreHorizontal size={16} />
        </button>
          </aside>
        </div>
      </div>
    </main>
  );
}
