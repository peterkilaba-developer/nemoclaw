import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare, Send, Zap, Loader2,
  Search, FileText, PenTool, FolderSearch, Calendar, DollarSign, UserCheck,
  Scale, Mic, Database, Mail, TrendingUp, BarChart3, Cpu, Lock,
  Briefcase, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useFirm } from '../contexts/FirmContext';
import { AGENT_SUB_AGENTS, SUB_AGENT_CATALOG } from '../lib/agentHierarchy';
import { sendAgentMessage, getConversationHistory } from '../lib/agentAPI';
import { collection, query, getDocs, orderBy, doc, updateDoc, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import React from 'react';
import ParalegalCanvas from '../components/canvas/ParalegalCanvas';
import BillingCanvas from '../components/canvas/BillingCanvas';
import AssociateCanvas from '../components/canvas/AssociateCanvas';
import IntakeCanvas from '../components/canvas/IntakeCanvas';
import PartnerCanvas from '../components/canvas/PartnerCanvas';
import { getPracticeAreaConfig } from '../lib/practiceAreaConfig';
const stripePromise = loadStripe((import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '').trim());
const FULL_MATTER_ACCESS_ROLES = new Set(['partner', 'managing-partner', 'solo-partner', 'income-partner']);

const SUB_AGENT_ICONS = {
  'legal-research': Search, 'contract-review': FileText, 'drafting': PenTool,
  'ediscovery': FolderSearch, 'client-intake': UserCheck, 'scheduling': Calendar,
  'lead-qualification': TrendingUp, 'billing-time': DollarSign,
  'document-formatting': FileText, 'compliance-monitor': Scale,
  'deposition-prep': Mic, 'knowledge-search': Database,
  'communication-drafter': Mail, 'case-analytics': TrendingUp,
  'business-intelligence': BarChart3,
};





class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    console.error('AI Chief of Staff error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '400px', padding: '40px' }}>
          <div style={{ maxWidth: '440px', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <ShieldCheck size={22} style={{ color: '#ef4444' }} />
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 8px', color: 'var(--db-text-primary)' }}>
              Workspace Error
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--db-text-secondary)', lineHeight: 1.6, margin: '0 0 20px' }}>
              Your AI Chief of Staff encountered an unexpected error. Your data is safe.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{ background: '#76b900', color: '#071000', border: 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}
            >
              Reload Workspace
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function MyAgent() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const simRole = searchParams.get('sim_role');
  const { user } = useAuth();
  const { firm, personalAgents, _superAgent, firmId } = useFirm();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const promptParam = params.get('prompt');
    if (promptParam) {
      setChatInput(promptParam);
      setActiveView('chat');
      navigate('/dashboard', { replace: true });
    }
  }, [location.search, navigate]);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showSubAgents, _setShowSubAgents] = useState(false);
  const [activeView, setActiveView] = useState('chat');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [matters, setMatters] = useState([]);
  const [leads, setLeads] = useState([]);
  const [billableActivities, setBillableActivities] = useState([]);
  const [activeMatterId, setActiveMatterId] = useState(null);
  const hasRestoredChat = useRef(false);
  const firstName = user?.displayName?.split(' ')[0] || 'there';

  // Find this user's agent
  const myAgent = (Array.isArray(personalAgents) ? personalAgents : []).find(a => a?.employeeEmail === user?.email);
  const agentType = simRole || myAgent?.agentType || 'partner';
  const humanizedType = agentType.replace(/[-_]/g, ' ').split(' ').filter(Boolean).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  const rawAgentName = myAgent?.agentName || 'AI Chief of Staff';
  // Canonicalize: fix any legacy database values with wrong word ordering
  const agentName = rawAgentName.includes('Chief') && rawAgentName.includes('Staff') ? 'AI Chief of Staff' : rawAgentName;
  const agentId = myAgent?.id || null;
  const subAgentIds = myAgent?.availableSubAgents || AGENT_SUB_AGENTS[agentType] || [];
  const hasSuperAccess = ['partner', 'managing-partner', 'solo-partner'].includes(agentType) || myAgent?.superAgentAccess || false;

  const subAgents = subAgentIds.map(id => {
    const catalog = SUB_AGENT_CATALOG.find(s => s.id === id);
    return catalog || { id, name: id, desc: '', icon: 'Zap' };
  });

  // Restore persisted chat — Firestore-primary (durable across devices) with localStorage cache fallback
  useEffect(() => {
    const storageKey = `nemoc_chat_${firmId || 'demo'}_${agentId || 'default'}`;

    async function restoreChat() {
      // 1. If we have a real agentId, try Firestore first (durable, cross-device)
      if (firmId && agentId) {
        try {
          const history = await getConversationHistory(firmId, agentId, 100);
          if (Array.isArray(history) && history.length > 0) {
            const hydrated = history
              .filter(m => m.role === 'user' || m.role === 'assistant')
              .map(m => ({
                id: m.id || `fs-${Math.random().toString(36).slice(2)}`,
                role: m.role,
                content: m.content || '',
                timestamp: m.timestamp?.toDate?.() || new Date(),
                subAgentsUsed: Array.isArray(m.subAgentsUsed) ? m.subAgentsUsed : [],
              }))
              .filter(m => m.content.length > 0);
            if (hydrated.length > 0) {
              setMessages(hydrated);
              hasRestoredChat.current = true;
              // Sync to localStorage as a cache for instant future loads
              try { localStorage.setItem(storageKey, JSON.stringify(hydrated.slice(-100))); } catch (_) { /* ignore */ }
              return;
            }
          }
        } catch (_e) {
          // Firestore unavailable — fall through to localStorage
        }
      }

      // 2. localStorage fallback (offline / onboarding / no agentId yet)
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const sanitized = parsed.filter(m =>
              m && typeof m === 'object' &&
              typeof m.role === 'string' &&
              typeof m.content === 'string' &&
              m.content.length > 0
            ).map(m => ({
              ...m,
              id: m.id || `ls-${Math.random().toString(36).slice(2)}`,
              timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
              subAgentsUsed: Array.isArray(m.subAgentsUsed) ? m.subAgentsUsed : [],
            }));
            if (sanitized.length > 0) {
              setMessages(sanitized);
            } else {
              try { localStorage.removeItem(storageKey); } catch (_) { /* ignore */ }
            }
          }
        }
      } catch (_e) {
        try { localStorage.removeItem(storageKey); } catch (_) { /* ignore */ }
      }
      hasRestoredChat.current = true;
    }

    restoreChat();
  }, [firmId, agentId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Persist chat messages to localStorage
  useEffect(() => {
    if (!hasRestoredChat.current) return; // Don't save until we've restored
    if (messages.length > 0) {
      try {
        const storageKey = `nemoc_chat_${firmId || 'demo'}_${agentId || 'default'}`;
        localStorage.setItem(storageKey, JSON.stringify(messages.slice(-100)));
      } catch (_e) { /* ignore quota errors */ }
    }
  }, [messages, firmId, agentId]);

  // Load matters for context
  useEffect(() => {
    if (firmId) {
      (async () => {
        try {
          const mattersRef = collection(db, 'firms', firmId, 'matters');
          const hasFullMatterAccess = FULL_MATTER_ACCESS_ROLES.has(agentType);
          if (!hasFullMatterAccess && !user?.email) {
            setMatters([]);
            return;
          }
          const q = hasFullMatterAccess
            ? query(mattersRef, orderBy('updatedAt', 'desc'))
            : query(mattersRef, where('assignedTo', 'array-contains', user.email));
          const snap = await getDocs(q);
          const list = (snap?.docs || [])
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(m => m.status === 'Active');
          setMatters(list);
          // Auto-select first matter as context if none selected
          if (list.length > 0 && !activeMatterId) {
            // setActiveMatterId(list[0].id);
          }
        } catch (err) {
          console.error('Failed to load matters:', err);
        }
      })();
    }
  }, [activeMatterId, agentType, firmId, user?.email]);

  // Load specialized datasets for Canvases
  useEffect(() => {
    if (firmId) {
      // Leads for Intake
      getDocs(query(collection(db, 'firms', firmId, 'leads'), orderBy('createdAt', 'desc')))
        .then(snap => setLeads((snap?.docs || []).map(doc => ({ id: doc.id, ...doc.data() }))))
        .catch(console.error);
        
      // Billables for Finance / Partner
      getDocs(query(collection(db, 'firms', firmId, 'billableActivities'), orderBy('createdAt', 'desc')))
        .then(snap => setBillableActivities((snap?.docs || []).map(doc => ({ id: doc.id, ...doc.data() }))))
        .catch(console.error);
    }
  }, [firmId]);


  // Load conversation history on mount
  useEffect(() => {
    if (firmId && agentId) {
      (async () => {
        try {
          const history = await getConversationHistory(firmId, agentId, 50);
          if (history.length > 0) {
            setMessages((history || []).map(m => ({
              id: m.id,
              role: m.role,
              content: m.content,
              subAgentsUsed: m.subAgentsUsed || [],
              timestamp: m.timestamp?.toDate?.() || new Date(),
            })));
          }
        } catch (err) {
          console.error('Failed to load history:', err);
        }
      })();
    }
  }, [firmId, agentId]);

  // Send message handler
  const handleSend = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || isTyping) return;

    // Add user message immediately
    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);

    try {
      const history = (messages || []).slice(-20).map(m => ({
        role: m.role,
        content: m.content,
      }));

      const result = await sendAgentMessage(firmId, agentId, text, history);

      setMessages(prev => [...prev, {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: result.response,
        subAgentsUsed: result.subAgentsUsed || [],
        timestamp: new Date(),
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'system',
        content: `⚠️ Connection error: ${err.message}. Please try again.`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsTyping(false);
      inputRef.current?.focus();
    }
  }, [chatInput, isTyping, firmId, agentId, messages]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Practice-area-contextual quick actions for solo attorney
  const practiceAreas = firm?.practiceAreas || [];
  const paConfig = getPracticeAreaConfig(practiceAreas);

  const isOnboarding = !firm?.isConfigured;

  const quickActions = isOnboarding ? [
    { label: 'What problems do you solve?', prompt: 'What specific problems does NemoC LAW AI solve for a solo attorney?' },
    { label: 'How is this different from ChatGPT?', prompt: 'How is NemoC LAW AI different from just using ChatGPT or Copilot for legal work?' },
    { label: 'Is my client data safe?', prompt: 'How do you guarantee my client data stays confidential and compliant with bar association rules?' },
    { label: 'What is the ROI?', prompt: 'What is the return on investment for a solo attorney using NemoC LAW AI?' },
  ] : paConfig.quickActions;

  const currentGreeting = isOnboarding
    ? 'Ask me anything about how NemoC LAW AI can transform your solo practice.'
    : paConfig.welcomeSuffix;

  const _activeMatter = matters.find(m => m.id === activeMatterId);
  const canvasMatter = _activeMatter || matters[0] || null;

  const handleSelectMatter = (mId) => {
    setActiveMatterId(mId);
    const m = matters.find(mat => mat.id === mId);
    if (m) {
      setChatInput(`I want to work on [${m.title}]. What's the latest update?`);
    }
  };

  const [showAgentDetails, setShowAgentDetails] = useState(false);
  
  // Refresh firm data after frictionless launch
  const _refreshFirmData = async () => {
    // This will trigger a re-render because FirmContext should ideally be updated, 
    // or we can just do a window.location.reload() for a clean state.
    window.location.reload(); 
  };

  // 7-day trial logic
  const createdAt = firm?.createdAt?.toDate?.() || (firm?.createdAt ? new Date(firm.createdAt) : new Date());
  const trialDays = 7;
  const isTrialActive = (new Date() - createdAt) < (trialDays * 24 * 60 * 60 * 1000);
  const isUnlocked = firm?.hasPaymentMethod || isTrialActive;

  return (
    <ErrorBoundary>
    <div className="db-viewport-workspace">
      <div className="db-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--db-border)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/logos/claw-128-transparent.png" alt="Nemo" style={{ height: '24px', width: 'auto' }} />
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--db-text-primary)' }}>{agentName}</span>
            <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'var(--db-nvidia-green-subtle)', color: 'var(--db-nvidia-green)', borderRadius: '4px', fontWeight: 600 }}>{humanizedType}</span>
            {hasSuperAccess && <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'rgba(37,99,235,0.1)', color: '#2563eb', borderRadius: '4px', fontWeight: 600 }}>Super Agent</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="db-btn db-btn-secondary db-btn-sm" 
            onClick={() => setShowAgentDetails(!showAgentDetails)}
            style={{ padding: '4px 12px', fontSize: '0.75rem' }}
          >
            {showAgentDetails ? 'Hide Controls' : 'System Details'}
          </button>
        </div>
      </div>

      {/* Agent stats - TOGGLEABLE */}
      {showAgentDetails && (
      <div className="db-stats-grid" style={{ marginBottom: '24px' }}>
        <div className="db-stat-card">
          <div className="db-stat-label">Agent Type</div>
          <div className="db-stat-value">{humanizedType}</div>
          <div className="db-stat-meta">Secured by NemoClaw</div>
        </div>
        <div className="db-stat-card">
          <div className="db-stat-label">Sub-Agents</div>
          <div className="db-stat-value nvidia">{subAgents.length}</div>
          <div className="db-stat-meta">Specialist workers available</div>
        </div>
        <div className="db-stat-card">
          <div className="db-stat-label">Messages</div>
          <div className="db-stat-value accent">{messages.filter(m => m.role === 'user').length}</div>
          <div className="db-stat-meta">This session</div>
        </div>
        <div className="db-stat-card">
          <div className="db-stat-label">Model</div>
          <div className="db-stat-value" style={{ fontSize: '0.7rem' }}>Nemotron 120B</div>
          <div className="db-stat-meta">NVIDIA NIM Inference</div>
        </div>
      </div>
      )}

      <div className="db-two-col" style={{ flex: 1, minHeight: 0 }}>
        {/* Chat interface */}
        
        <div className="db-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden', padding: activeView === 'canvas' ? 0 : 24 }}>
          <div className="db-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: activeView === 'canvas' ? 0 : '20px', paddingBottom: activeView === 'canvas' ? 0 : 0, borderBottom: activeView === 'canvas' ? 'none' : 'none' }}>
            {activeView === 'canvas' ? null : (
            <div>
              <div className="db-card-title"><MessageSquare size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />Active Session</div>
              <div className="db-card-subtitle">Natural language commands will auto-dispatch specialist sub-agents.</div>
            </div>
            )}
            
            <div style={{ display: 'flex', gap: '8px', marginLeft: activeView === 'canvas' ? 'auto' : 0, marginBottom: activeView === 'canvas' ? 'auto' : 0, padding: activeView === 'canvas' ? '12px 16px' : 0, borderBottom: activeView === 'canvas' ? '1px solid var(--db-border)' : 'none', width: activeView === 'canvas' ? '100%' : 'auto', background: activeView === 'canvas' ? 'var(--db-surface)' : 'transparent', zIndex: 10 }}>
              <button onClick={() => setActiveView('chat')} className={`db-btn ${activeView === 'chat' ? 'db-btn-primary' : 'db-btn-secondary'}`} style={{ borderRadius: '20px', padding: '6px 16px', fontSize: '0.8125rem' }}><MessageSquare size={14} style={{ marginRight: '6px' }} /> Discuss with AI</button>
              <button onClick={() => setActiveView('canvas')} className={`db-btn ${activeView === 'canvas' ? 'db-btn-primary' : 'db-btn-secondary'}`} style={{ borderRadius: '20px', padding: '6px 16px', fontSize: '0.8125rem' }}><Cpu size={14} style={{ marginRight: '6px' }} /> Workspace Canvas</button>
            </div>
          </div>


          {/* Messages area */}
          
          {activeView === 'canvas' ? (
            <div style={{ height: '100%', minHeight: 0, overflow: 'hidden', padding: 0 }}>
              {/* Solo attorney always gets the full Partner canvas — they hold every role */}
              {simRole === 'paralegal' ? <ParalegalCanvas firmId={firmId} user={user} activeMatter={canvasMatter} /> :
               simRole === 'billing' ? <BillingCanvas firmId={firmId} user={user} billableActivities={billableActivities} /> :
               simRole === 'associate' ? <AssociateCanvas firmId={firmId} user={user} activeMatter={canvasMatter} /> :
               simRole === 'intake' ? <IntakeCanvas firmId={firmId} user={user} leads={leads} /> :
               <PartnerCanvas firmId={firmId} user={user} billableActivities={billableActivities} matters={matters} />}
            </div>
          ) : (
            <>
              <div style={{ flex: 1, minHeight: 0, padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>

            {/* Welcome message */}
            {messages.length === 0 && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: 'rgba(118,185,0,0.1)', border: '1px solid var(--db-nvidia-green-subtle)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden'
                }}>
                  <img src="/logos/claw-128-transparent.png" alt="Nemo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <div style={{
                  background: 'var(--db-bg)', padding: '12px 16px',
                  borderRadius: '2px 12px 12px 12px', fontSize: '0.8125rem',
                  color: 'var(--db-text-primary)', lineHeight: 1.6, maxWidth: '85%',
                }}>
                  <strong>{isOnboarding ? `Welcome, ${firstName}!` : `${new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'}, ${firstName}.`}</strong>{' '}
                  {isOnboarding ? (
                    <>I'm your AI Chief of Staff. Right now I'm running in <strong>preview mode</strong> — set up your firm to unlock my full capabilities across {subAgents.length} specialist agents.</>
                  ) : (
                    <>Your {humanizedType} workspace is active with <strong>{subAgents.length} specialists</strong> online.</>
                  )}
                  {hasSuperAccess && !isOnboarding && ' As a partner, you also have Super Agent access for firm-wide intelligence.'}
                  <br /><br />
                  {currentGreeting}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                    {(quickActions || []).map(qa => (
                      <button
                        key={qa.label}
                        className="db-btn db-btn-secondary db-btn-sm"
                        style={{ fontSize: '0.6875rem', padding: '4px 10px' }}
                        onClick={() => { setChatInput(qa.prompt); inputRef.current?.focus(); }}
                      >
                        {qa.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Chat messages */}
            {(messages || []).map((msg, msgIndex) => {
              // Parse follow-up questions from assistant messages
              let displayContent = msg.content;
              let followUps = [];
              if (msg.role === 'assistant' && isOnboarding && msg.content?.includes('---FOLLOW_UPS---')) {
                const parts = msg.content.split('---FOLLOW_UPS---');
                displayContent = parts[0].trim();
                try {
                  followUps = JSON.parse(parts[1].trim());
                } catch (_e) { /* ignore parse errors */ }
              }
              const isLastAssistant = msg.role === 'assistant' && msgIndex === messages.length - 1;

              // Render text with [SETUP_LINK] replaced with clickable inline links
              const renderWithLinks = (text) => {
                if (!text) return text;
                
                // Replace markdown list hyphen "- " with a professional bullet "• "
                let cleanText = text.replace(/(^|\n)- /g, '$1• ');

                const handleLinks = (str) => {
                  if (!str.includes('[SETUP_LINK]')) return [str];
                  const parts = str.split('[SETUP_LINK]');
                  return parts.reduce((acc, part, i) => {
                    if (i > 0) {
                      acc.push(
                        <span
                          key={`link-${i}`}
                          onClick={() => navigate('/onboarding')}
                          style={{
                            color: 'var(--db-nvidia-green)', cursor: 'pointer',
                            fontWeight: 700, textDecoration: 'underline',
                            textDecorationColor: 'rgba(118,185,0,0.4)',
                            textUnderlineOffset: '2px',
                          }}
                        >
                          Setup My Firm →
                        </span>
                      );
                    }
                    acc.push(part);
                    return acc;
                  }, []);
                };

                const handleBoldAndStars = (parts) => {
                  return (parts || []).map((part, pidx) => {
                    if (typeof part !== 'string') return part;
                    // Split by **
                    const bParts = part.split(/\*\*(.*?)\*\*/g);
                    return (bParts || []).map((bp, bidx) => {
                      if (bidx % 2 === 1) { 
                        return <strong key={`b-${pidx}-${bidx}`} style={{ color: 'var(--db-text-primary)' }}>{bp}</strong>;
                      }
                      
                      // Split by *
                      const iParts = bp.split(/\*(.*?)\*/g);
                      return (iParts || []).map((ip, iidx) => {
                        if (iidx % 2 === 1) {
                          return <em key={`i-${pidx}-${bidx}-${iidx}`} style={{ fontStyle: 'italic' }}>{ip}</em>;
                        }
                        
                        // Handle generic markdown links [Text](url)
                        const linkParts = ip.split(/\[(.*?)\]\((.*?)\)/g);
                        if (linkParts.length > 1) {
                           return (linkParts || []).map((lp, lidx) => {
                             if (lidx % 3 === 1) { // label
                               const url = linkParts[Math.floor(lidx/3)*3 + 2];
                               return <a href={url} target="_blank" rel="noopener noreferrer" key={`l-${pidx}-${bidx}-${iidx}-${lidx}`} style={{ color: 'var(--db-nvidia-green)', textDecoration: 'underline' }}>{lp}</a>;
                             } else if (lidx % 3 === 2) {
                               return null; // URL was already handled
                             }
                             return lp;
                           });
                        }
                        return ip;
                      });
                    });
                  });
                };

                return handleBoldAndStars(handleLinks(cleanText));
              };

              return (
              <div key={msg.id}>
                <div style={{
                  display: 'flex', gap: '10px',
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: '30px', height: '30px', borderRadius: '50%',
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
                      : msg.role === 'system'
                      ? '#ef4444'
                      : 'rgba(118,185,0,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    fontSize: '0.75rem', color: '#fff', fontWeight: 700,
                    overflow: 'hidden', border: msg.role === 'assistant' ? '1px solid var(--db-nvidia-green-subtle)' : 'none'
                  }}>
                    {msg.role === 'user' ? firstName[0] : msg.role === 'system' ? '!' : <img src="/logos/claw-128-transparent.png" alt="Nemo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
                  </div>

                  {/* Message wrapper */}
                  <div style={{ 
                    display: 'flex', flexDirection: 'column', gap: '4px', 
                    maxWidth: '85%', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' 
                  }}>
                    {/* Message bubble */}
                    <div style={{
                      background: msg.role === 'user' ? 'rgba(59,130,246,0.1)' : 'var(--db-bg)',
                      padding: '10px 14px',
                      borderRadius: msg.role === 'user' ? '12px 2px 12px 12px' : '2px 12px 12px 12px',
                      fontSize: '0.8125rem', color: 'var(--db-text-primary)', lineHeight: 1.6,
                      whiteSpace: 'pre-wrap', width: '100%',
                    }}>
                      {renderWithLinks(displayContent)}

                      {/* Sub-agent dispatch indicators */}
                      {showSubAgents && msg.subAgentsUsed?.length > 0 && (
                        <div style={{
                          marginTop: '8px', paddingTop: '8px',
                          borderTop: '1px solid var(--db-border)',
                          display: 'flex', flexWrap: 'wrap', gap: '4px',
                        }}>
                          <Cpu size={10} style={{ color: 'var(--db-nvidia-green)', marginTop: '2px' }} />
                          <span style={{ fontSize: '0.625rem', color: 'var(--db-text-muted)' }}>Dispatched: </span>
                          {(msg.subAgentsUsed || []).map(sa => (
                            <span key={sa.id} style={{
                              fontSize: '0.5625rem', background: 'rgba(118,185,0,0.1)',
                              color: 'var(--db-nvidia-green)', padding: '1px 6px',
                              borderRadius: '4px', fontWeight: 600,
                            }}>
                              {sa.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Timestamp */}
                    <div style={{ 
                      fontSize: '0.625rem', color: 'var(--db-text-muted)', 
                      padding: '0 4px', marginTop: '2px'
                    }}>
                      {new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(msg.timestamp || new Date())}
                    </div>
                  </div>
                </div>

                {/* Dynamic follow-up quick actions */}
                {isLastAssistant && followUps.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px', marginLeft: '40px' }}>
                    {(followUps || []).map((q, i) => (
                      <button
                        key={i}
                        className="db-btn db-btn-secondary db-btn-sm"
                        style={{ fontSize: '0.6875rem', padding: '4px 10px', textAlign: 'left' }}
                        onClick={() => { setChatInput(q); inputRef.current?.focus(); }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              );
            })}

            {/* Typing indicator */}
            {isTyping && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{
                  width: '30px', height: '30px', borderRadius: '50%',
                  background: 'rgba(118,185,0,0.1)', border: '1px solid var(--db-nvidia-green-subtle)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden'
                }}>
                  <img src="/logos/claw-128-transparent.png" alt="Nemo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <div style={{
                  background: 'var(--db-bg)', padding: '12px 16px',
                  borderRadius: '2px 12px 12px 12px', display: 'flex',
                  alignItems: 'center', gap: '8px', fontSize: '0.8125rem',
                  color: 'var(--db-text-muted)',
                }}>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center', height: '14px' }}>
                    <span className="dot-bounce" style={{ width: '4px', height: '4px', background: 'var(--db-nvidia-green)', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '-0.32s' }}></span>
                    <span className="dot-bounce" style={{ width: '4px', height: '4px', background: 'var(--db-nvidia-green)', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '-0.16s' }}></span>
                    <span className="dot-bounce" style={{ width: '4px', height: '4px', background: 'var(--db-nvidia-green)', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both' }}></span>
                  </div>
                  <span style={{ marginLeft: '4px' }}>Drafting response...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat input */}
          </>
          )}
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--db-border)', position: 'relative', display: activeView === 'chat' ? 'block' : 'none' }}>
            {(!isUnlocked) && (
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(2px)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px',
                zIndex: 10, borderRadius: '0 0 var(--db-radius) var(--db-radius)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--db-text-muted)' }}>
                  <Lock size={16} /> <span style={{ fontSize: '0.875rem' }}>Trial expired. Add a payment method to unlock live AI inference.</span>
                </div>
                <button 
                  className="db-btn db-btn-primary" 
                  style={{ padding: '6px 12px', fontSize: '0.75rem', background: 'var(--db-nvidia-green)', color: '#111', fontWeight: 600, border: 'none', borderRadius: '4px' }}
                  onClick={() => navigate('/dashboard/billing')}
                >
                  Enter Credit Card
                </button>
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                ref={inputRef}
                className="ob-form-input"
                style={{ flex: 1, marginBottom: 0 }}
                placeholder="Message your Chief of Staff..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isTyping || !isUnlocked}
              />
              <button
                className="db-btn db-btn-primary"
                style={{ padding: '8px 16px' }}
                onClick={handleSend}
                disabled={isTyping || !chatInput.trim() || !isUnlocked}
              >
                {isTyping ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
              </button>
            </div>
            {/* Security Signal */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '6px', marginTop: '8px', opacity: 0.6,
            }}>
              <ShieldCheck size={11} style={{ color: 'var(--db-nvidia-green)' }} />
              <span style={{
                fontSize: '0.5625rem', color: 'var(--db-text-muted)',
                fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase',
              }}>
                End-to-end encrypted · NVIDIA NemoClaw Sandbox · PII auto-redacted · Zero data leak
              </span>
            </div>
          </div>
        </div>

        {/* Context Panel — Onboarding + Matter Context always visible */}
        <div className="my-agent-context-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: 0, overflowY: 'auto' }}>
          {/* Subscription / Setup — inline in context panel */}
          {(isOnboarding || firm?.status === 'trial') && (
            <ContextSubscriptionPanel firm={firm} firmId={firmId} user={user} isOnboarding={isOnboarding} navigate={navigate} />
          )}

          {/* Matters panel — always visible for preview/test */}
          <div className="db-card">
            <div className="db-card-header">
              <div className="db-card-title">
                <Briefcase size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
                Matter Context
              </div>
            </div>
            <div style={{ padding: '0 0 16px 0' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--db-text-muted)', textTransform: 'uppercase', padding: '0 16px 8px', letterSpacing: '0.04em' }}>Active Matters</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {matters.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)' }}>
                      {isOnboarding ? 'Matters will appear here after setup.' : 'No active matters found.'}
                    </div>
                  </div>
                ) : (matters || []).map(m => (
                  <div 
                    key={m.id} 
                    onClick={() => handleSelectMatter(m.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '12px 16px', borderRadius: 'var(--db-radius)',
                      cursor: 'pointer',
                      background: activeMatterId === m.id ? 'var(--db-nvidia-green-subtle)' : 'transparent',
                      borderLeft: activeMatterId === m.id ? '3px solid var(--db-nvidia-green)' : '3px solid transparent',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: activeMatterId === m.id ? 'var(--db-nvidia-green)' : 'var(--db-text-primary)' }}>{m.title}</div>
                      <div style={{ fontSize: '0.625rem', color: 'var(--db-text-muted)' }}>Client: {m.client} · {m.type}</div>
                    </div>
                    {activeMatterId === m.id && <Zap size={12} color="var(--db-nvidia-green)" />}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sub-agents panel */}
          {!isOnboarding && subAgents.length > 0 && (
            <div className="db-card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--db-text-primary)', marginBottom: '8px' }}>Deployed Sub-Agents</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {(subAgents || []).map(sa => (
                  <span key={sa.id} style={{ fontSize: '0.625rem', background: 'var(--db-bg)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--db-border)' }}>{sa.name}</span>
                ))}
              </div>
            </div>
          )}

          {/* Security guarantee */}
          <div className="db-card" style={{ background: 'rgba(118,185,0,0.03)', border: '1px solid rgba(118,185,0,0.15)' }}>
            <div style={{ padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--db-nvidia-green)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                🔒 Zero Data Leak Guarantee
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Animation Styles */}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
    </ErrorBoundary>
  );
}

/**
 * Context Panel Subscription Widget — inline in the AI Chief of Staff right panel
 */
function ContextSubscriptionPanel({ firm, firmId, user, isOnboarding, navigate }) {
  const [clientSecret, setClientSecret] = useState(null);
  const [error, setError] = useState('');
  const [_loading, _setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!firmId || clientSecret) return;
    const fetchIntent = async () => {
      try {
        const response = await fetch('https://createinlinesubscription-2sejsgollq-uc.a.run.app', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firmId,
            userId: user?.uid,
            userEmail: user?.email,
            firmName: firm?.firmName || '',
            extraSeats: Math.max(0, (firm?.members?.length || 1) - 1),
          }),
        });
        const result = await response.json();
        if (result?.clientSecret) setClientSecret(result.clientSecret);
      } catch (err) {
        console.error('Context panel: intent fetch failed', err);
      }
    };
    fetchIntent();
  }, [clientSecret, firm?.firmName, firm?.members?.length, firmId, user?.email, user?.uid]);

  if (dismissed) {
    return (
      <div className="db-card" style={{ border: '2px solid var(--db-nvidia-green-subtle)', background: 'var(--db-surface)', padding: '24px', textAlign: 'center' }}>
        <Zap size={24} style={{ color: 'var(--db-nvidia-green)', marginBottom: '8px' }} />
        <h3 style={{ fontSize: '1rem', color: 'var(--db-text-primary)', marginBottom: '8px', fontWeight: 700 }}>Subscription Active</h3>
        <p style={{ fontSize: '0.8125rem', color: 'var(--db-text-secondary)', marginBottom: '0' }}>Your Founder Price-Lock is secured. Full AI workforce is now live.</p>
      </div>
    );
  }

  if (isOnboarding && !firmId) {
    return (
      <div className="db-card" style={{ border: '2px solid var(--db-nvidia-green-subtle)', background: 'var(--db-surface)', padding: '24px', textAlign: 'center' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--db-text-primary)', marginBottom: '8px', fontWeight: 700 }}>Finish Your Firm Setup</h3>
        <p style={{ fontSize: '0.8125rem', color: 'var(--db-text-secondary)', marginBottom: '16px' }}>Launch your NemoC LAW AI workspace to unlock your real-time agent.</p>
        <button className="db-btn db-btn-primary" onClick={() => navigate('/onboarding')}>Launch Workspace Configuration →</button>
      </div>
    );
  }

  return (
    <div className="db-card" style={{ border: '2px solid var(--db-nvidia-green-subtle)', background: 'var(--db-surface)', padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '0.875rem', color: 'var(--db-text-primary)', fontWeight: 700, margin: 0 }}>Activate Subscription</h3>
        <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--db-nvidia-green)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Lock size={10} /> Encrypted
        </span>
      </div>
      <div style={{ padding: '10px 12px', background: 'rgba(0,0,0,0.02)', borderRadius: '8px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--db-text-secondary)' }}>Founder Price-Lock</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--db-text-primary)' }}>$297/mo</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--db-text-secondary)' }}>Unlimited Legal Tokens</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--db-nvidia-green)' }}>INCLUDED</span>
        </div>
      </div>

      {error && <div style={{ fontSize: '0.6875rem', color: '#ef4444', marginBottom: '8px' }}>{error}</div>}

      <Elements stripe={stripePromise}>
        <ContextCardForm
          clientSecret={clientSecret}
          firmId={firmId}
          onError={setError}
          onSuccess={() => setDismissed(true)}
        />
      </Elements>

      <p style={{ fontSize: '0.625rem', color: 'var(--db-text-muted)', marginTop: '10px', textAlign: 'center', lineHeight: 1.4 }}>
        $297/mo price-lock. Cancel anytime. Powered by Stripe.
      </p>
    </div>
  );
}

function ContextCardForm({ clientSecret, firmId, onError, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [btnText, setBtnText] = useState('Start Subscription');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements || !clientSecret) return;
    setProcessing(true);
    setBtnText('Confirming...');
    try {
      const cardElement = elements.getElement(CardElement);
      const isSetupIntent = clientSecret.startsWith('seti_');
      const submitResult = isSetupIntent
        ? await stripe.confirmCardSetup(clientSecret, { payment_method: { card: cardElement } })
        : await stripe.confirmCardPayment(clientSecret, { payment_method: { card: cardElement } });
      const { error, paymentIntent, setupIntent } = submitResult;
      if (error) {
        onError(error.message);
        setProcessing(false);
        setBtnText('Retry Payment');
      } else if ((paymentIntent?.status === 'succeeded') || (setupIntent?.status === 'succeeded')) {
        setBtnText('Success!');
        const intentId = paymentIntent?.id || setupIntent?.id;
        // Write status directly to Firestore so panel dismisses
        try {
          await updateDoc(doc(db, 'firms', firmId), {
            status: 'subscribed',
            subscribedAt: serverTimestamp(),
          });
        } catch (e) { console.error('Direct status update failed:', e); }
        try {
          await fetch('https://finalizepaymentsetup-2sejsgollq-uc.a.run.app', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firmId, intentId, type: isSetupIntent ? 'setup' : 'payment' })
          });
        } catch (e) { console.error('Finalize sync failed:', e); }
        setTimeout(() => onSuccess(), 1000);
      } else {
        onSuccess();
      }
    } catch (err) {
      console.error(err);
      onError('Payment failed. Please try again.');
      setProcessing(false);
      setBtnText('Retry');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
        <CardElement options={{
          hidePostalCode: true,
          style: {
            base: {
              fontSize: '13px',
              color: '#1e293b',
              fontFamily: 'Inter, system-ui, sans-serif',
              '::placeholder': { color: '#94a3b8' },
              iconColor: '#76b900'
            },
            invalid: { color: '#ef4444', iconColor: '#ef4444' }
          }
        }} />
      </div>
      <button
        type="submit"
        className="db-btn db-btn-primary"
        style={{ width: '100%', padding: '10px', fontSize: '0.8125rem', height: '40px' }}
        disabled={!stripe || processing || !clientSecret}
      >
        {processing ? (
          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
        ) : (
          <><Zap size={14} /> {clientSecret ? btnText : 'Loading...'}</>
        )}
      </button>
    </form>
  );
}
