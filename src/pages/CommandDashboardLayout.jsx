import { useEffect, useMemo, useState } from 'react';
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
      title: currentPage === 'AI Chief of Staff' ? 'Practice Command Center' : currentPage,
      shortTitle: 'Firm command',
      client: user?.displayName || 'Firm leadership',
      practice: (firm?.practiceAreas || [])[0] || 'All practice areas',
      forum: firmName,
      stage: currentPage,
      status: 'Active',
      risk: 'Low',
      riskTone: 'calm',
      deadline: 'Today',
      nextAction: 'Review practice priorities',
      value: 'Firm-wide',
      agent: 'NemoC Practice OS',
      summary: `Command workspace for ${firmName}: matters, deadlines, client posture, documents, billing, and agent activity in one thread.`,
      workflow: ['Intake', 'Conflict', 'Matters', 'Documents', 'Billing', 'Review'],
      activeStep: 2,
      metrics: [
        { label: 'Matters', value: String(counts.matters || 0) },
        { label: 'Agents', value: String(counts.agents || 0) },
        { label: 'Mode', value: 'Command' },
      ],
      prompts: ['Review open priorities', 'Prepare matter intake checklist', 'Summarize firm risk'],
      layers: {
        timeline: [
          { title: 'Practice command initialized', meta: 'Ready now', state: 'done' },
          { title: 'Matter intake monitoring', meta: 'Listening across channels', state: 'pending' },
          { title: 'Attorney review queue', meta: 'Protected by ethical wall', state: 'pending' },
        ],
        work: [
          { title: 'Review active matters', owner: 'Partner', time: 'Firm-wide', state: 'Queued' },
          { title: 'Confirm practice-area knowledge base', owner: 'NemoC', time: 'Ready', state: 'In progress' },
          { title: 'Audit command workflows', owner: 'Operations', time: 'Today', state: 'Needs review' },
        ],
        documents: [
          { title: 'Firm knowledge base', type: 'KB', status: 'Ready' },
          { title: 'Intake templates', type: 'Workflow', status: 'Queued' },
          { title: 'Audit trail', type: 'Security', status: 'Active' },
        ],
        billing: [
          { title: 'Subscription posture', amount: 'Active', status: 'Monitored' },
          { title: 'Unbilled WIP review', amount: '$0.00', status: 'Ready' },
          { title: 'Trust controls', amount: 'Protected', status: 'Active' },
        ],
        client: [
          { title: 'Client portal layer', meta: 'Available', state: 'Ready' },
          { title: 'Receptionist intake', meta: 'Website-ready', state: 'Queued' },
          { title: 'Privilege warning', meta: 'Attorney review required', state: 'Restricted' },
        ],
      },
    };
  }

  const practice = getMatterType(matter);
  const stage = matter.stage || matter.status || 'Active';
  const nextAction = matter.nextAction || matter.nextStep || matter.action || 'Review matter posture';
  const deadline = compactDate(matter.deadline || matter.nextDeadline || matter.trialDate || matter.updatedAt, 'Next review');
  const riskTone = getRiskTone(matter);
  const title = matter.title || 'Untitled matter';
  const shortTitle = matter.shortTitle || title;
  return {
    id: matter.id,
    title,
    shortTitle,
    client: matter.client || matter.clientName || 'Client',
    practice,
    forum: matter.court || matter.forum || firmName,
    stage,
    status: matter.status || 'Active',
    risk: matter.risk || getRiskLabel(riskTone),
    riskTone,
    deadline,
    nextAction,
    value: matter.value || matter.feeStructure || 'Matter value',
    agent: matter.agent || `${practice} pod`,
    summary: matter.summary || matter.description || `${practice} matter in ${stage}. NemoC is watching deadlines, documents, client posture, work, and billing in one command thread.`,
    workflow: Array.isArray(matter.workflow) && matter.workflow.length ? matter.workflow : DEFAULT_WORKFLOW,
    activeStep: Math.min(3, DEFAULT_WORKFLOW.length - 1),
    metrics: [
      { label: 'Open tasks', value: String(matter.openTasks || matter.tasks?.length || 0) },
      { label: 'Documents', value: String(matter.documents?.length || 0) },
      { label: 'Value', value: matter.value || (matter.rate ? `$${matter.rate}` : 'Tracked') },
    ],
    prompts: matter.prompts || [
      `Summarize ${practice.toLowerCase()} posture`,
      `Draft ${nextAction.toLowerCase()}`,
      'Prepare client update',
    ],
    layers: {
      timeline: [
        { title: nextAction, meta: `Due ${deadline}`, state: riskTone === 'danger' ? 'urgent' : 'pending' },
        { title: 'Matter status review', meta: stage, state: 'pending' },
        { title: 'Ethical wall check', meta: 'Active', state: 'done' },
      ],
      work: [
        { title: nextAction, owner: 'Attorney', time: '1.0h', state: 'In progress' },
        { title: 'Update matter notes', owner: 'Associate', time: '0.5h', state: 'Queued' },
        { title: 'Partner posture review', owner: 'Partner', time: '0.3h', state: 'Needs review' },
      ],
      documents: [
        { title: `${title} workspace file`, type: 'Matter file', status: 'Current' },
        { title: 'Client intake packet', type: 'Intake', status: 'Indexed' },
        { title: 'Attorney work product', type: 'Protected', status: 'Review' },
      ],
      billing: [
        { title: 'Matter billing posture', amount: matter.feeStructure || 'Hourly', status: 'Tracked' },
        { title: 'Unbilled work review', amount: '$0.00', status: 'Ready' },
        { title: 'Trust balance check', amount: 'Protected', status: 'Active' },
      ],
      client: [
        { title: 'Client portal', meta: matter.portalProvisioned ? 'Provisioned' : 'Ready to provision', state: 'Open' },
        { title: 'Client update', meta: 'Attorney review required', state: 'Restricted' },
        { title: 'Intake facts', meta: matter.client || 'Client', state: 'Current' },
      ],
    },
  };
}

function buildInitialMessages(commandMatter) {
  return [
    {
      id: `${commandMatter.id}-intro`,
      role: 'assistant',
      label: 'NemoC Practice OS',
      content: 'I pulled the active matter context, deadlines, open work, client posture, documents, and billing signals into one command thread.',
    },
    {
      id: `${commandMatter.id}-pod`,
      role: 'assistant',
      label: commandMatter.agent,
      content: `${commandMatter.shortTitle} is in ${commandMatter.stage}. ${commandMatter.nextAction} is the next pressure point, with privilege, billing, and client communication checks attached.`,
    },
  ];
}

function buildAssistantReply(matter, activeLayer, text) {
  const layer = COMMAND_LAYER_ITEMS.find(item => item.id === activeLayer)?.label || 'matter';
  const firstTask = matter.layers[activeLayer]?.[0]?.title || matter.nextAction;
  return `For ${matter.shortTitle}, I would handle ${firstTask.toLowerCase()} first. I will keep the ${layer.toLowerCase()} layer tied to ${matter.practice}, ${matter.stage.toLowerCase()}, and the ${matter.deadline} deadline. Your note was: "${text}".`;
}

function getStateIcon(state) {
  const normalized = String(state || '').toLowerCase();
  if (['done', 'complete', 'paid', 'captured', 'recognized', 'current', 'ready', 'active'].includes(normalized)) return CheckCircle;
  if (['urgent', 'restricted', 'partner only', 'protected'].includes(normalized)) return ShieldCheck;
  return Circle;
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
  const [activeLayer, setActiveLayer] = useState('timeline');
  const [composer, setComposer] = useState('');
  const [threadLog, setThreadLog] = useState({ matterId: null, messages: [] });

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
  const shouldRenderCommandCanvas = location.pathname === '/dashboard' || Boolean(activeMatter);
  const activeLayerData = commandMatter.layers[activeLayer] || commandMatter.layers.timeline;
  const threadMessages = threadLog.matterId === commandMatter.id ? threadLog.messages : buildInitialMessages(commandMatter);

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

  const handleSendCommand = () => {
    const text = composer.trim();
    if (!text) return;
    const baseMessages = threadLog.matterId === commandMatter.id ? threadLog.messages : buildInitialMessages(commandMatter);
    setThreadLog({
      matterId: commandMatter.id,
      messages: [
        ...baseMessages,
        {
          id: `user-${Date.now()}`,
          role: 'user',
          label: user?.displayName || 'Managing attorney',
          content: text,
        },
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          label: commandMatter.agent,
          content: buildAssistantReply(commandMatter, activeLayer, text),
        },
      ],
    });
    setComposer('');
  };

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
                      {threadMessages.map(message => (
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
                    </div>

                    <div className="command-layer-board" aria-label="Selected matter layer">
                      <div className="command-layer-board-head">
                        <div>
                          <span>{COMMAND_LAYER_ITEMS.find(layer => layer.id === activeLayer)?.label}</span>
                          <strong>{commandMatter.nextAction}</strong>
                        </div>
                        <button type="button" aria-label="More actions">
                          <MoreHorizontal size={18} />
                        </button>
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
                    <button type="button" aria-label="Attach file">
                      <Upload size={18} />
                    </button>
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
                <Gavel size={16} />
                <span>Authority</span>
              </div>
              <div className="command-authority-list">
                <span><Lock size={14} /> Attorney review required</span>
                <span><ShieldCheck size={14} /> Privilege protected</span>
                <span><CheckCircle size={14} /> Audit trail active</span>
              </div>
            </section>

            <section className="command-context-card">
              <div className="command-section-title">
                <Bot size={16} />
                <span>Assigned pod</span>
              </div>
              <div className="command-pod-list">
                <span>Partner Agent</span>
                <span>Associate Agent</span>
                <span>Paralegal Agent</span>
                <span>Billing Agent</span>
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
