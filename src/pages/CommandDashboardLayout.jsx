import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import {
  Bell,
  Bot,
  Briefcase,
  CheckCircle,
  ChevronRight,
  Circle,
  Clock,
  DollarSign,
  FileText,
  Layers,
  LogOut,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Scale,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { isAdminUser } from '../components/AdminRoute';
import DashboardModeToggle from '../components/DashboardModeToggle';
import { sendAgentMessage } from '../lib/agentAPI';
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

const COMMAND_LAYER_ITEMS = [
  { id: 'timeline', label: 'Thread', Icon: MessageSquare },
  { id: 'work', label: 'Work', Icon: CheckCircle },
  { id: 'documents', label: 'Docs', Icon: FileText },
  { id: 'billing', label: 'Billing', Icon: DollarSign },
  { id: 'client', label: 'Client', Icon: Users },
];

const DEFAULT_WORKFLOW = ['Intake', 'Conflict', 'Engagement', 'Discovery', 'Resolution', 'Close'];

function compactDate(value, fallback = 'Today') {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value?.toDate === 'function') {
    return value.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  return fallback;
}

function getRiskTone(matter) {
  const status = String(matter?.status || matter?.risk || '').toLowerCase();
  if (status.includes('urgent') || status.includes('high') || status.includes('trial')) return 'danger';
  if (status.includes('medium') || status.includes('pending')) return 'warn';
  return 'calm';
}

function getRiskLabel(tone) {
  if (tone === 'danger') return 'High';
  if (tone === 'warn') return 'Medium';
  return 'Low';
}

function buildCommandMatter(matter, currentPage, firm, user, counts = {}) {
  const firmName = getFirmName(firm);
  if (!matter) {
    return {
      id: 'firm-command',
      title: currentPage || 'Dashboard',
      shortTitle: 'Firm',
      client: user?.displayName || 'Attorney',
      practice: (firm?.practiceAreas || [])[0] || '',
      forum: firmName,
      stage: '',
      status: 'Active',
      risk: 'Low',
      riskTone: 'calm',
      deadline: '',
      nextAction: '',
      value: '',
      agent: 'NemoC LAW AI',
      summary: `Workspace for ${firmName}.`,
      workflow: [],
      activeStep: 0,
      metrics: [
        { label: 'Matters', value: String(counts.matters || 0) },
        { label: 'Agents', value: String(counts.agents || 0) },
      ],
      prompts: [],
      layers: { timeline: [], work: [], documents: [], billing: [], client: [] },
    };
  }

  const practice = getMatterType(matter);
  const stage = matter.stage || matter.status || 'Active';
  const nextAction = matter.nextAction || matter.nextStep || matter.action || 'Review matter posture';
  const deadline = compactDate(matter.deadline || matter.nextDeadline || matter.trialDate || matter.updatedAt, '');
  const riskTone = getRiskTone(matter);
  const title = matter.title || 'Untitled matter';
  const shortTitle = matter.shortTitle || title;
  return {
    id: matter.id,
    title,
    shortTitle,
    client: matter.client || matter.clientName || '',
    practice,
    forum: matter.court || matter.forum || firmName,
    stage,
    status: matter.status || 'Active',
    risk: matter.risk || getRiskLabel(riskTone),
    riskTone,
    deadline,
    nextAction,
    value: matter.value || matter.feeStructure || '',
    agent: matter.agent || `${practice} pod`,
    summary: matter.summary || matter.description || '',
    workflow: Array.isArray(matter.workflow) && matter.workflow.length ? matter.workflow : [],
    activeStep: 0,
    metrics: [
      { label: 'Open tasks', value: String(matter.openTasks || matter.tasks?.length || 0) },
      { label: 'Documents', value: String(matter.documents?.length || 0) },
    ],
    prompts: Array.isArray(matter.prompts) ? matter.prompts : [],
    layers: matter.layers || { timeline: [], work: [], documents: [], billing: [], client: [] },
  };
}



function getStateIcon(state) {
  const normalized = String(state || '').toLowerCase();
  if (['done', 'complete', 'paid', 'captured', 'recognized', 'current', 'ready', 'active'].includes(normalized)) return CheckCircle;
  if (['urgent', 'restricted', 'partner only', 'protected'].includes(normalized)) return ShieldCheck;
  return Circle;
}

function buildPageSummary(currentPage, activeMatter, firm) {
  if (activeMatter) {
    return `${activeMatter.client || 'Client'} \u00B7 ${getMatterType(activeMatter)} \u00B7 ${activeMatter.status || 'Active'}`;
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
  personalAgents,
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
  const [activeLayer, setActiveLayer] = useState('timeline');
  const [composer, setComposer] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [showLayerActions, setShowLayerActions] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const attachmentInputRef = useRef(null);
  const myAgent = (Array.isArray(personalAgents) ? personalAgents : []).find(a => a?.employeeEmail === user?.email);
  const agentId = myAgent?.id || null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
  const activeAgentsCount = agents?.activeAgents?.length || 0;
  const commandMatter = useMemo(() => buildCommandMatter(
    activeMatter || (location.pathname === '/dashboard' ? matters[0] : null),
    currentPage,
    firm,
    user,
    { matters: matters.length, agents: activeAgentsCount }
  ), [activeAgentsCount, activeMatter, currentPage, firm, location.pathname, matters, user]);
  const shouldRenderCommandCanvas = location.pathname.startsWith('/dashboard/matters/') && Boolean(activeMatter);
  const activeLayerData = commandMatter.layers[activeLayer] || [];

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

  const handlePromptSelect = (prompt) => {
    setComposer(prompt);
  };

  const handleAttachmentChange = async (event) => {
    const files = Array.from(event.target.files || []).slice(0, 5);
    event.target.value = '';
    const next = await Promise.all(files.map(async file => {
      const isText = file.type.startsWith('text/') || /\.(txt|md|csv|json)$/i.test(file.name);
      return {
        id: `${file.name}-${file.lastModified}-${file.size}`,
        name: file.name,
        size: file.size,
        content: isText && file.size <= 1024 * 1024 ? (await file.text()).slice(0, 20000) : '',
      };
    }));
    setAttachments(prev => [...prev, ...next].slice(0, 5));
  };

  const handleSendCommand = useCallback(async () => {
    const text = composer.trim();
    if (!text || isTyping || !agentId) return;
    const attachmentContext = attachments.map(file => file.content
      ? `\n\nAttached file: ${file.name}\n${file.content}`
      : `\n\nAttached file metadata: ${file.name} (${file.size} bytes; binary content unavailable)`
    ).join('');
    const agentText = `${text}${attachmentContext}`;
    const userMsg = { id: `user-${Date.now()}`, role: 'user', label: user?.displayName || 'Attorney', content: text };
    setMessages(prev => [...prev, userMsg]);
    setComposer('');
    setAttachments([]);
    setIsTyping(true);
    try {
      const history = messages.slice(-20).map(m => ({ role: m.role, content: m.content }));
      const result = await sendAgentMessage(firmId, agentId, agentText, history);
      setMessages(prev => [...prev, { id: `assistant-${Date.now()}`, role: 'assistant', label: 'NemoC LAW AI', content: result.response }]);
    } catch (err) {
      setMessages(prev => [...prev, { id: `error-${Date.now()}`, role: 'system', label: '', content: `Error: ${err.message}` }]);
    } finally {
      setIsTyping(false);
    }
  }, [agentId, attachments, composer, firmId, isTyping, messages, user]);

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
          {isSidebarOpen && (
            <button
              type="button"
              className="command-sidebar-scrim"
              onClick={() => setIsSidebarOpen(false)}
              aria-label="Close navigation"
            />
          )}
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
              className={matter.id === (activeMatterId || commandMatter.id) ? 'is-selected' : ''}
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
            <section className={`command-workspace ${shouldRenderCommandCanvas ? 'is-command-canvas' : ''}`}>
              {shouldRenderCommandCanvas ? (
                <>
                  <div className="command-matter-hero">
                    <div className="command-matter-hero-top">
                      <div>
                        <div className="command-eyebrow">
                          <Briefcase size={15} />
                          <span>{commandMatter.practice}</span>
                        </div>
                        <h1>{commandMatter.title}</h1>
                        <p>{commandMatter.summary}</p>
                      </div>
                      <button type="button" className="command-context-toggle" onClick={() => setIsInspectorOpen(value => !value)}>
                        <Layers size={17} />
                        <span>{isInspectorOpen ? 'Hide context' : 'Show context'}</span>
                      </button>
                    </div>

                    <div className="command-meta-grid">
                      <article>
                        <span>Client</span>
                        <strong>{commandMatter.client}</strong>
                      </article>
                      <article>
                        <span>Stage</span>
                        <strong>{commandMatter.stage}</strong>
                      </article>
                      <article>
                        <span>Next</span>
                        <strong>{commandMatter.nextAction}</strong>
                      </article>
                      <article>
                        <span>Deadline</span>
                        <strong>{commandMatter.deadline}</strong>
                      </article>
                    </div>
                  </div>

                  <div className="command-workflow-strip" aria-label="Matter workflow">
                    {commandMatter.workflow.map((step, index) => (
                      <div className={`command-workflow-step ${index <= commandMatter.activeStep ? 'is-complete' : ''}`} key={step}>
                        <span>{index + 1}</span>
                        <strong>{step}</strong>
                      </div>
                    ))}
                  </div>

                  <div className="command-layer-tabs" aria-label="Matter layers">
                    {COMMAND_LAYER_ITEMS.map(layer => (
                      <button
                        className={`command-layer-tab ${activeLayer === layer.id ? 'is-active' : ''}`}
                        type="button"
                        key={layer.id}
                        onClick={() => setActiveLayer(layer.id)}
                      >
                        <layer.Icon size={16} />
                        <span>{layer.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="command-thread-board">
                    <div className="command-message-stack" aria-live="polite">
                      {messages.length === 0 ? (
                        <div className="command-empty-state" style={{ padding: '24px', textAlign: 'center', color: 'var(--cmd-muted)' }}>Send a message to get started.</div>
                      ) : messages.map(message => (
                        <article className={`command-thread-message ${message.role}`} key={message.id}>
                          <div className="command-message-avatar">
                            {message.role === 'assistant' ? <Bot size={17} /> : <Users size={17} />}
                          </div>
                          <div>
                            <span>{message.label}</span>
                            <p>{message.content}</p>
                          </div>
                        </article>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>

                    <div className="command-layer-board" aria-label="Selected matter layer">
                      <div className="command-layer-board-head" style={{ position: 'relative' }}>
                        <div>
                          <span>{COMMAND_LAYER_ITEMS.find(layer => layer.id === activeLayer)?.label}</span>
                          <strong>{commandMatter.nextAction}</strong>
                        </div>
                        <button type="button" aria-label="More actions" aria-expanded={showLayerActions} onClick={() => setShowLayerActions(open => !open)}>
                          <MoreHorizontal size={18} />
                        </button>
                        {showLayerActions && (
                          <div style={{ position: 'absolute', top: '42px', right: 0, zIndex: 20, minWidth: '180px', padding: '6px', borderRadius: '8px', border: '1px solid var(--db-border)', background: 'var(--db-surface-elevated)', boxShadow: '0 12px 30px rgba(0,0,0,.22)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <button type="button" className="db-btn db-btn-secondary db-btn-sm" onClick={() => { navigate(`/dashboard/matters/${commandMatter.id}`); setShowLayerActions(false); }}>Open matter workspace</button>
                            <button type="button" className="db-btn db-btn-secondary db-btn-sm" onClick={() => { navigate('/dashboard/billing'); setShowLayerActions(false); }}>Open billing</button>
                            <button type="button" className="db-btn db-btn-secondary db-btn-sm" onClick={() => { navigate('/dashboard/client-portal'); setShowLayerActions(false); }}>Open client portal</button>
                          </div>
                        )}
                      </div>

                      <div className="command-layer-card-grid">
                        {activeLayerData.map(item => {
                          const StateIcon = getStateIcon(item.state || item.status);
                          return (
                            <article className="command-layer-card" key={`${activeLayer}-${item.title}`}>
                              <StateIcon size={18} />
                              <div>
                                <strong>{item.title}</strong>
                                <span>{item.meta || item.owner || item.type || item.amount}</span>
                              </div>
                              <em>{item.state || item.status}</em>
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="command-prompt-row" aria-label="Suggested commands">
                    {commandMatter.prompts.map(prompt => (
                      <button type="button" key={prompt} onClick={() => handlePromptSelect(prompt)}>
                        <Sparkles size={15} />
                        <span>{prompt}</span>
                      </button>
                    ))}
                  </div>

                  <div className="command-composer">
                    <input ref={attachmentInputRef} type="file" multiple hidden accept=".txt,.md,.csv,.json,.pdf,.doc,.docx" onChange={handleAttachmentChange} />
                    <button type="button" aria-label="Attach file" onClick={() => attachmentInputRef.current?.click()}>
                      <Upload size={18} />
                    </button>
                    {attachments.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '220px' }}>
                        {attachments.map(file => (
                          <button key={file.id} type="button" title="Remove attachment" onClick={() => setAttachments(prev => prev.filter(item => item.id !== file.id))} style={{ border: '1px solid var(--db-border)', borderRadius: '999px', background: 'var(--db-surface)', color: 'var(--db-text-secondary)', padding: '3px 8px', fontSize: '0.6875rem', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</button>
                        ))}
                      </div>
                    )}
                    <textarea
                      value={composer}
                      onChange={event => setComposer(event.target.value)}
                      onKeyDown={event => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          handleSendCommand();
                        }
                      }}
                      placeholder={`Message ${commandMatter.agent}`}
                      aria-label="Matter command"
                    />
                    <button className="command-send-button" type="button" onClick={handleSendCommand} aria-label="Send command">
                      <Send size={18} />
                    </button>
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}
            </section>
          </section>

          <aside className={`command-inspector ${isInspectorOpen ? 'is-open' : ''}`}>
            <div className="command-inspector-head">
              <div>
                <span>{shouldRenderCommandCanvas ? commandMatter.status : (activeMatter ? activeMatter.status || 'Active' : 'Live context')}</span>
                <h2>{shouldRenderCommandCanvas ? commandMatter.shortTitle : (activeMatter?.title || getFirmName(firm))}</h2>
              </div>
              <button type="button" onClick={() => setIsInspectorOpen(false)} aria-label="Close context">
                <X size={18} />
              </button>
            </div>

            {shouldRenderCommandCanvas ? (
              <>
                <section className="command-risk-panel">
                  <div className={`command-risk-badge ${commandMatter.riskTone}`}>
                    <ShieldCheck size={16} />
                    <span>{commandMatter.risk} risk</span>
                  </div>
                  <p>{commandMatter.forum}</p>
                </section>

                <div className="command-metric-grid">
                  {commandMatter.metrics.map(metric => (
                    <article key={metric.label}>
                      <span>{metric.label}</span>
                      <strong>{metric.value}</strong>
                    </article>
                  ))}
                </div>

                <section className="command-context-card">
                  <div className="command-section-title">
                    <Clock size={16} />
                    <span>Pressure points</span>
                  </div>
                  {commandMatter.layers.timeline.map(item => (
                    <div className="command-compact-row" key={item.title}>
                      <span className={`command-risk-dot ${item.state === 'urgent' ? 'danger' : 'calm'}`} />
                      <div>
                        <strong>{item.title}</strong>
                        <small>{item.meta}</small>
                      </div>
                    </div>
                  ))}
                </section>
              </>
            ) : (
              <>
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
              </>
            )}

            <section className="command-context-card">
              <div className="command-section-title">
                <Bot size={16} />
                <span>My Agents</span>
              </div>
              <div className="command-pod-list">
                {(Array.isArray(personalAgents) ? personalAgents : []).length > 0
                  ? personalAgents.map(a => <span key={a.id}>{a.agentName || 'Agent'}</span>)
                  : <span>No agents configured</span>}
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
