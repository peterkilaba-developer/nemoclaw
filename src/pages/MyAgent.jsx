import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Crown, Bot, MessageSquare, Send, Zap, ArrowRight, Loader2, Eye, EyeOff,
  Search, FileText, PenTool, FolderSearch, Calendar, DollarSign, UserCheck,
  Scale, Mic, Database, Mail, TrendingUp, BarChart3, Cpu, RefreshCw, Lock,
  Briefcase, Clock, UserPlus, CreditCard, ShieldAlert, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useFirm } from '../contexts/FirmContext';
import { AGENT_SUB_AGENTS, SUB_AGENT_CATALOG } from '../lib/agentHierarchy';
import { sendAgentMessage, getConversationHistory } from '../lib/agentAPI';
import { collection, query, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import FrictionlessOnboardingPanel from '../components/FrictionlessOnboardingPanel';

const SUB_AGENT_ICONS = {
  'legal-research': Search, 'contract-review': FileText, 'drafting': PenTool,
  'ediscovery': FolderSearch, 'client-intake': UserCheck, 'scheduling': Calendar,
  'lead-qualification': TrendingUp, 'billing-time': DollarSign,
  'document-formatting': FileText, 'compliance-monitor': Scale,
  'deposition-prep': Mic, 'knowledge-search': Database,
  'communication-drafter': Mail, 'case-analytics': TrendingUp,
  'business-intelligence': BarChart3,
};


export default function MyAgent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const searchParams = new URLSearchParams(window.location.search);
  const simRole = searchParams.get('sim_role');
  const { firm, personalAgents, superAgent, firmId } = useFirm();
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showSubAgents, setShowSubAgents] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [matters, setMatters] = useState([]);
  const [activeMatterId, setActiveMatterId] = useState(null);
  const hasRestoredChat = useRef(false);
  const firstName = user?.displayName?.split(' ')[0] || 'there';

  // Find this user's agent
  const myAgent = personalAgents.find(a => a.employeeEmail === user?.email);
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

  // Restore persisted chat from localStorage
  useEffect(() => {
    const storageKey = `nemoc_chat_${firmId || 'demo'}_${agentId || 'default'}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch (e) { /* ignore */ }
    hasRestoredChat.current = true;
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
      } catch (e) { /* ignore quota errors */ }
    }
  }, [messages, firmId, agentId]);

  // Load matters for context
  useEffect(() => {
    if (firmId) {
      (async () => {
        try {
          const q = query(collection(db, 'firms', firmId, 'matters'), orderBy('updatedAt', 'desc'));
          const snap = await getDocs(q);
          const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
  }, [firmId]);

  // Load conversation history on mount
  useEffect(() => {
    if (firmId && agentId) {
      (async () => {
        try {
          const history = await getConversationHistory(firmId, agentId, 50);
          if (history.length > 0) {
            setMessages(history.map(m => ({
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
      const history = messages.slice(-20).map(m => ({
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

  // Role-Specific Configuration (Quick actions, Welcome text, Guardrails)
  const ROLE_CONFIG = {
    partner: {
      quickActions: [
        { label: 'Research case law', prompt: 'Research recent case law on breach of fiduciary duty in Delaware' },
        { label: 'Review contract', prompt: 'Review the attached contract and flag any high-risk clauses' },
        { label: 'Analyze pipeline', prompt: 'What is our current revenue pipeline for Q3?' },
      ],
      alert: null,
      greeting: 'What would you like to work on? You can ask me to research case law, review contracts, or analyze firm telemetry.',
      showMatters: true
    },
    'of-counsel': {
      quickActions: [
        { label: 'Research case law', prompt: 'Research recent case law on breach of fiduciary duty in Delaware' },
        { label: 'Draft motion', prompt: 'Draft a motion to compel discovery responses' },
        { label: 'Prepare depo', prompt: 'Prepare a deposition outline for a breach of contract case' },
      ],
      alert: null,
      greeting: 'What would you like to work on? You can ask me to research case law, draft documents, review contracts, or handle any legal task.',
      showMatters: true
    },
    associate: {
      quickActions: [
        { label: 'Research case law', prompt: 'Research recent case law on breach of fiduciary duty in Delaware' },
        { label: 'Draft motion', prompt: 'Draft a motion to compel discovery responses' },
        { label: 'Review contract', prompt: 'Review the attached contract and flag any high-risk clauses' },
      ],
      alert: null,
      greeting: 'What would you like to work on? You can ask me to research case law, draft documents, review contracts, or handle any legal task.',
      showMatters: true
    },
    paralegal: {
      quickActions: [
        { label: 'Format document', prompt: 'Format this document for the 9th Circuit Court of Appeals.' },
        { label: 'E-Discovery index', prompt: 'Can you summarize these discovery documents and tag them?' },
        { label: 'Research statute', prompt: 'Find the latest statute regarding corporate bylaws in NY.' },
      ],
      alert: null,
      greeting: 'What would you like to work on? You can ask me to format documents, perform eDiscovery indexing, or prepare exhibits.',
      showMatters: true
    },
    receptionist: {
      quickActions: [
        { label: 'Schedule consultation', prompt: 'Schedule a 30-minute consultation with a new prospective client for next Tuesday.' },
        { label: 'Run conflict check', prompt: 'Run a conflict check for a new prospective client cross-referencing past matters.' },
        { label: 'Draft intake memo', prompt: 'Draft a new intake memo for a personal injury claim.' },
      ],
      alert: null,
      greeting: 'What would you like to work on? You can ask me to schedule consultations, run conflict checks, or process new client intakes.',
      showMatters: false
    },
    billing: {
      quickActions: [
        { label: 'Audit time entries', prompt: 'Audit yesterday\'s time entries for non-compliant billing block formatting.' },
        { label: 'Generate invoice', prompt: 'Generate a LEDES formatted invoice for the most recent active matter.' },
        { label: 'Check unbilled', prompt: 'Show me all matters with unbilled WIP over $5,000.' },
      ],
      alert: null,
      greeting: 'What would you like to work on? You can ask me to audit time entries, generate invoices, or check trust account balances.',
      showMatters: false
    },
    operations: {
      quickActions: [
        { label: 'Check compliance', prompt: 'Check if we have any upcoming CLE compliance deadlines this month.' },
        { label: 'Draft offer letter', prompt: 'Draft a standard offer letter for a new Associate Attorney.' },
        { label: 'Review vendor contract', prompt: 'Review this software vendor contract for auto-renewal clauses.' },
      ],
      alert: null,
      greeting: 'What would you like to work on? You can ask me to check firm compliance, draft HR documents, or review vendor contracts.',
      showMatters: false
    },
    onboarding: {
      quickActions: [
        { label: 'What problems do you solve?', prompt: 'What specific problems does NemoC Law AI solve for a managing partner?' },
        { label: 'How is this different from ChatGPT?', prompt: 'How is NemoC Law AI different from just using ChatGPT or Copilot for legal work?' },
        { label: 'Is my client data safe?', prompt: 'How do you guarantee my client data stays confidential and compliant with bar association rules?' },
        { label: 'Show me the ROI', prompt: 'What is the return on investment for a small law firm using NemoC Law AI?' },
      ],
      alert: { type: 'setup', msg: '<strong>Welcome to NemoC Law AI!</strong> Complete your firm setup to unlock your full AI workforce — legal research, contract review, drafting, billing automation, and more. <strong>Founder pricing locks in at $297/mo for life.</strong>', action: 'Setup My Firm', icon: Zap, color: 'var(--db-nvidia-green)', bg: 'rgba(118,185,0,0.05)', border: 'rgba(118,185,0,0.15)' },
      greeting: 'Ask me anything about how NemoC Law AI can help your practice, or tap one of the questions below.',
      showMatters: true
    }
  };

  const isOnboarding = !firm?.isConfigured;
  const currentRoleConfig = isOnboarding ? ROLE_CONFIG['onboarding'] : (ROLE_CONFIG[agentType] || ROLE_CONFIG['partner']);
  const quickActions = currentRoleConfig.quickActions;
  const currentAlert = currentRoleConfig.alert;
  const currentGreeting = currentRoleConfig.greeting;
  const AlertIcon = currentAlert?.icon || null;

  const activeMatter = matters.find(m => m.id === activeMatterId);

  const handleSelectMatter = (mId) => {
    setActiveMatterId(mId);
    const m = matters.find(mat => mat.id === mId);
    if (m) {
      setChatInput(`I want to work on [${m.title}]. What's the latest update?`);
    }
  };

  const [showAgentDetails, setShowAgentDetails] = useState(false);
  
  // Refresh firm data after frictionless launch
  const refreshFirmData = async () => {
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
    <div className="db-viewport-workspace">
      <div className="db-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--db-border)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bot size={24} style={{ color: 'var(--db-nvidia-green)' }} />
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
        <div className="db-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          <div className="db-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="db-card-title">
                <MessageSquare size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
                Active Session
              </div>
              <div className="db-card-subtitle">Natural language commands will auto-dispatch specialist sub-agents.</div>
            </div>
            <button
              className="db-btn db-btn-secondary db-btn-sm"
              onClick={() => setShowSubAgents(!showSubAgents)}
              title={showSubAgents ? 'Hide sub-agent dispatches' : 'Show sub-agent dispatches'}
              style={{ gap: '4px', fontSize: '0.6875rem' }}
            >
              {showSubAgents ? <EyeOff size={12} /> : <Eye size={12} />}
              {showSubAgents ? 'Hide' : 'Show'} Dispatches
            </button>
          </div>

          {/* Messages area */}
          <div style={{
            flex: 1, padding: '16px', display: 'flex', flexDirection: 'column',
            gap: '14px', overflowY: 'auto'
          }}>
            {/* Welcome message */}
            {messages.length === 0 && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #76b900, #4a7a00)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Bot size={16} color="#111" />
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
                  {currentAlert && (
                    <div style={{ background: currentAlert.bg, border: `1px solid ${currentAlert.border}`, borderRadius: '8px', padding: '12px', marginBottom: '16px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <AlertIcon size={16} color={currentAlert.color} style={{ marginTop: '2px' }} />
                      <div style={{ fontSize: '0.75rem', color: 'var(--db-text-primary)' }}>
                        <span dangerouslySetInnerHTML={{ __html: currentAlert.msg }} />
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                          <button 
                            className="db-btn db-btn-primary db-btn-sm" 
                            style={{ padding: '2px 8px', fontSize: '0.65rem', background: currentAlert.color }}
                            onClick={() => currentAlert.type === 'setup' ? navigate('/onboarding') : null}
                          >
                            {currentAlert.action}
                          </button>
                          {!isOnboarding && <button className="db-btn db-btn-secondary db-btn-sm" style={{ padding: '2px 8px', fontSize: '0.65rem' }}>Dismiss</button>}
                        </div>
                      </div>
                    </div>
                  )}
                  {currentGreeting}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                    {quickActions.map(qa => (
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
            {messages.map((msg, msgIndex) => {
              // Parse follow-up questions from assistant messages
              let displayContent = msg.content;
              let followUps = [];
              if (msg.role === 'assistant' && isOnboarding && msg.content?.includes('---FOLLOW_UPS---')) {
                const parts = msg.content.split('---FOLLOW_UPS---');
                displayContent = parts[0].trim();
                try {
                  followUps = JSON.parse(parts[1].trim());
                } catch (e) { /* ignore parse errors */ }
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
                  return parts.map((part, pidx) => {
                    if (typeof part !== 'string') return part;
                    // Split by **
                    const bParts = part.split(/\*\*(.*?)\*\*/g);
                    return bParts.map((bp, bidx) => {
                      if (bidx % 2 === 1) { 
                        return <strong key={`b-${pidx}-${bidx}`} style={{ color: 'var(--db-text-primary)' }}>{bp}</strong>;
                      }
                      
                      // Split by *
                      const iParts = bp.split(/\*(.*?)\*/g);
                      return iParts.map((ip, iidx) => {
                        if (iidx % 2 === 1) {
                          return <em key={`i-${pidx}-${bidx}-${iidx}`} style={{ fontStyle: 'italic' }}>{ip}</em>;
                        }
                        
                        // Handle generic markdown links [Text](url)
                        const linkParts = ip.split(/\[(.*?)\]\((.*?)\)/g);
                        if (linkParts.length > 1) {
                           return linkParts.map((lp, lidx) => {
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
                      : 'linear-gradient(135deg, #76b900, #4a7a00)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    fontSize: '0.75rem', color: '#fff', fontWeight: 700,
                  }}>
                    {msg.role === 'user' ? firstName[0] : msg.role === 'system' ? '!' : <Bot size={14} color="#111" />}
                  </div>

                  {/* Message bubble */}
                  <div style={{
                    background: msg.role === 'user' ? 'rgba(59,130,246,0.1)' : 'var(--db-bg)',
                    padding: '10px 14px',
                    borderRadius: msg.role === 'user' ? '12px 2px 12px 12px' : '2px 12px 12px 12px',
                    fontSize: '0.8125rem', color: 'var(--db-text-primary)', lineHeight: 1.6,
                    maxWidth: '85%', whiteSpace: 'pre-wrap',
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
                        {msg.subAgentsUsed.map(sa => (
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
                </div>

                {/* Dynamic follow-up quick actions */}
                {isLastAssistant && followUps.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px', marginLeft: '40px' }}>
                    {followUps.map((q, i) => (
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
                  background: 'linear-gradient(135deg, #76b900, #4a7a00)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Bot size={14} color="#111" />
                </div>
                <div style={{
                  background: 'var(--db-bg)', padding: '12px 16px',
                  borderRadius: '2px 12px 12px 12px', display: 'flex',
                  alignItems: 'center', gap: '8px', fontSize: '0.8125rem',
                  color: 'var(--db-text-muted)',
                }}>
                  <Loader2 size={14} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                  Thinking... dispatching sub-agents
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat input */}
          <div style={{
            padding: '12px 16px', borderTop: '1px solid var(--db-border)',
            position: 'relative'
          }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
          {/* Frictionless Onboarding Panel (only during setup) */}
          {isOnboarding && (
            <div className="db-card" style={{ border: '2px solid var(--db-nvidia-green-subtle)', background: 'var(--db-surface)' }}>
               <FrictionlessOnboardingPanel onComplete={refreshFirmData} />
            </div>
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
                ) : matters.map(m => (
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
                {subAgents.map(sa => (
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

      {/* Spinner animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
