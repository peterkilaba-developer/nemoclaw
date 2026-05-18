import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Crown, MessageSquare, Send, Zap, Loader2, Eye, EyeOff,
  Cpu, RefreshCw, Target, Rocket,
  BarChart3, Users, DollarSign, Shield, Radio, Trash2
} from 'lucide-react';
import { sendInternalAgentMessage } from '../../lib/internalAgentAPI';
import { collection, addDoc, getDocs, query, orderBy, limit, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getProspects } from '../../lib/prospectService';
import { getEnrichmentStatus } from '../../lib/enrichmentService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
/**
 * C.E.A. Chat — Executive Command Interface
 *
 * Full chat interface for the Human C.E.O. to communicate with the
 * Chief Executive Agent (C.E.A.), mirroring the MyAgent chat that
 * law firm managing partners use with their personal agents.
 *
 * Features:
 *   - Persistent conversation history (Firestore _internalCEAChat)
 *   - Quick action commands (SDR Blitz, Pipeline Status, etc.)
 *   - Live context injection (real Agentic OS metrics in every message)
 *   - Sub-agent dispatch visibility
 *   - Executive-grade UI styling
 */

const CHAT_COLLECTION = '_internalCEAChat';

// ── Quick Actions ──
const QUICK_ACTIONS = [
  { label: 'Pipeline Status', prompt: 'Give me the current pipeline status. How many prospects, how many with emails, how many contacted?', icon: BarChart3 },
  { label: 'Run SDR Blitz', prompt: 'Execute an SDR Blitz across 3 random US cities. Search for law firms, add them to the pipeline, and auto-enrich their emails.', icon: Rocket },
  { label: 'Revenue Analysis', prompt: 'Analyze our current pricing model ($297/mo base, $149/seat, $2,497/autonomous). What should our pricing strategy be to hit 10 paying firms per day?', icon: DollarSign },
  { label: 'Enrichment Report', prompt: 'Report on our email enrichment capabilities. What tools are active? How many prospects have verified emails vs generic patterns?', icon: Target },
  { label: 'Blocker Assessment', prompt: 'What are the top 5 critical blockers preventing us from hitting 10 paying firms per day? Be brutally honest.', icon: Shield },
  { label: 'Agent Fleet Status', prompt: 'Give me a status report on all internal agents: SDR, Marketing, Success, Revenue. What is each one doing right now?', icon: Users },
];

// ── Gather live Agentic OS context ──
async function gatherLiveContext() {
  try {
    const prospects = await getProspects();
    const enrichStatus = getEnrichmentStatus();

    const statusCounts = { researched: 0, outreach_sent: 0, followed_up: 0, responded: 0, waitlist_signed: 0 };
    let withEmail = 0, withPhone = 0, withWebsite = 0;
    prospects.forEach(p => {
      if (statusCounts[p.status] !== undefined) statusCounts[p.status]++;
      if (p.email) withEmail++;
      if (p.phone) withPhone++;
      if (p.website) withWebsite++;
    });

    return {
      timestamp: new Date().toISOString(),
      prospects: { total: prospects.length, ...statusCounts, withEmail, withPhone, withWebsite },
      enrichment: enrichStatus,
      pricing: { base: '$297/mo', seat: '$149/mo', autonomous: '$2,497/mo', trial: '7 days' },
      tools: {
        hunterIO: enrichStatus.hunter.configured ? 'ACTIVE' : 'OFF',
        apolloIO: enrichStatus.apollo.configured ? 'ACTIVE' : 'OFF',
        sendgrid: 'NOT DEPLOYED',
        blandAI: 'BACKEND-MANAGED',
      },
    };
  } catch (_e) {
    return { error: 'Failed to load live context', timestamp: new Date().toISOString() };
  }
}

export default function CEAChat() {
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showDispatches, setShowDispatches] = useState(false);
  const [liveContext, setLiveContext] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Load conversation history from Firestore
  useEffect(() => {
    (async () => {
      try {
        const q = query(collection(db, CHAT_COLLECTION), orderBy('timestamp', 'asc'), limit(100));
        const snap = await getDocs(q);
        const history = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (history.length > 0) {
          setMessages(history.map(m => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp?.toDate?.() || new Date(),
          })));
        }
      } catch (e) {
        console.warn('Failed to load CEA chat history:', e);
      }
    })();
  }, []);

  // Gather live context on mount
  useEffect(() => {
    gatherLiveContext().then(setLiveContext);
  }, []);

  // ── Save message to Firestore ──
  const saveMessage = async (role, content) => {
    try {
      const docRef = await addDoc(collection(db, CHAT_COLLECTION), {
        role,
        content,
        timestamp: serverTimestamp(),
      });
      return docRef.id;
    } catch (e) {
      console.warn('Failed to persist CEA chat message:', e);
      return `local-${Date.now()}`;
    }
  };

  // ── Send message ──
  const handleSend = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || isTyping) return;

    // Add user message
    const userMsgId = await saveMessage('user', text);
    const userMsg = { id: userMsgId, role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);

    try {
      // Refresh live context for every message
      const freshContext = await gatherLiveContext();
      setLiveContext(freshContext);

      // Build conversation history for the API
      const history = messages.slice(-20).map(m => ({ role: m.role, content: m.content }));

      // Prepend live context to the user message
      const enrichedMessage = `[LIVE PLATFORM DATA: ${JSON.stringify(freshContext)}]\n\nUser (Human CEO): ${text}`;

      const { response } = await sendInternalAgentMessage('cea', enrichedMessage, history);

      const assistantMsgId = await saveMessage('assistant', response);
      setMessages(prev => [...prev, {
        id: assistantMsgId,
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      }]);
    } catch (err) {
      const errorMsgId = await saveMessage('system', `⚠️ C.E.A. connection error: ${err.message}`);
      setMessages(prev => [...prev, {
        id: errorMsgId,
        role: 'system',
        content: `⚠️ C.E.A. connection error: ${err.message}. Check NVIDIA NIM status.`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsTyping(false);
      inputRef.current?.focus();
    }
  }, [chatInput, isTyping, messages]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (prompt) => {
    setChatInput(prompt);
    inputRef.current?.focus();
  };

  const clearHistory = async () => {
    if (!window.confirm('Clear all C.E.A. conversation history?')) return;
    try {
      const q = query(collection(db, CHAT_COLLECTION));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await deleteDoc(doc(db, CHAT_COLLECTION, d.id));
      }
      setMessages([]);
    } catch (e) {
      console.error('Failed to clear history:', e);
    }
  };

  const _timeAgo = (date) => {
    if (!date) return '';
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #76b900, #4a7a00)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(118,185,0,0.25)',
          }}>
            <Crown size={24} color="#fff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>C.E.A.</span>
              <span style={{
                padding: '3px 10px', borderRadius: '20px', fontSize: '0.625rem', fontWeight: 700,
                background: 'rgba(118,185,0,0.15)', color: '#76b900', border: '1px solid rgba(118,185,0,0.3)',
                display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>
                <Radio size={8} style={{ animation: 'pulse 1.5s infinite' }} /> Online
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
              Chief Executive Agent · NVIDIA Nemotron 120B · Executive Command Interface
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowDispatches(!showDispatches)}
            style={{
              padding: '6px 12px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
              background: showDispatches ? 'rgba(118,185,0,0.12)' : 'rgba(255,255,255,0.04)',
              color: showDispatches ? '#76b900' : 'rgba(255,255,255,0.5)', cursor: 'pointer',
              fontSize: '0.6875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px',
            }}
          >
            {showDispatches ? <EyeOff size={12} /> : <Eye size={12} />}
            {showDispatches ? 'Hide' : 'Show'} Context
          </button>
          <button
            onClick={clearHistory}
            style={{
              padding: '6px 12px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
              background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
              fontSize: '0.6875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px',
            }}
          >
            <Trash2 size={12} /> Clear
          </button>
        </div>
      </div>

      {/* Main chat area */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '16px', flex: 1, minHeight: 0 }}>
        {/* Chat panel */}
        <div style={{
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Chat header */}
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MessageSquare size={14} /> Executive Session
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.35)' }}>
                {messages.length} messages · All commands logged to audit trail
              </div>
            </div>
            <button
              onClick={() => gatherLiveContext().then(setLiveContext)}
              style={{
                padding: '4px 10px', border: '1px solid rgba(118,185,0,0.3)', borderRadius: '6px',
                background: 'rgba(118,185,0,0.08)', color: '#76b900', cursor: 'pointer',
                fontSize: '0.625rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px',
              }}
            >
              <RefreshCw size={10} /> Refresh Context
            </button>
          </div>

          {/* Messages area */}
          <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
            {/* Welcome message */}
            {messages.length === 0 && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #76b900, #4a7a00)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Crown size={16} color="#111" />
                </div>
                <div style={{
                  background: 'rgba(255,255,255,0.03)', padding: '14px 18px',
                  borderRadius: '2px 12px 12px 12px', fontSize: '0.8125rem',
                  color: 'rgba(255,255,255,0.85)', lineHeight: 1.7, maxWidth: '85%',
                }}>
                  <strong style={{ color: '#76b900' }}>C.E.A. Online.</strong> Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, CEO.
                  <br /><br />
                  I am your Chief Executive Agent. I have real-time access to the Agentic OS data — {liveContext?.prospects?.total || '...'} prospects in the pipeline, enrichment via {liveContext?.tools?.hunterIO === 'ACTIVE' ? 'Hunter.io ✅' : 'Hunter.io ❌'} and {liveContext?.tools?.apolloIO === 'ACTIVE' ? 'Apollo.io ✅' : 'Apollo.io ❌'}.
                  <br /><br />
                  Every message you send includes live Agentic OS telemetry. I will never hallucinate metrics — I can only reference what is actually in the system.
                  <br /><br />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                    {QUICK_ACTIONS.slice(0, 4).map(qa => (
                      <button
                        key={qa.label}
                        onClick={() => handleQuickAction(qa.prompt)}
                        style={{
                          padding: '5px 12px', border: '1px solid rgba(118,185,0,0.2)', borderRadius: '6px',
                          background: 'rgba(118,185,0,0.06)', color: '#76b900', cursor: 'pointer',
                          fontSize: '0.6875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px',
                        }}
                      >
                        <qa.icon size={11} /> {qa.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Chat messages */}
            {messages.map(msg => (
              <div key={msg.id} style={{
                display: 'flex', gap: '10px',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
              }}>
                {/* Avatar */}
                <div style={{
                  width: '30px', height: '30px', borderRadius: '50%',
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg, #dc2626, #991b1b)' // Red for CEO
                    : msg.role === 'system'
                    ? '#ef4444'
                    : 'rgba(118,185,0,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  fontSize: '0.75rem', color: '#fff', fontWeight: 700,
                  overflow: 'hidden', border: msg.role === 'assistant' ? '1px solid rgba(118,185,0,0.2)' : 'none'
                }}>
                  {msg.role === 'user' ? <Crown size={14} /> : msg.role === 'system' ? '!' : <img src="/logos/claw-128-transparent.png" alt="Nemo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
                </div>

                {/* Message wrapper */}
                <div style={{ 
                  display: 'flex', flexDirection: 'column', gap: '4px', 
                  maxWidth: '85%', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' 
                }}>
                  {/* Message bubble */}
                  <div style={{
                    background: msg.role === 'user' ? 'rgba(220,38,38,0.08)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${msg.role === 'user' ? 'rgba(220,38,38,0.15)' : 'rgba(255,255,255,0.05)'}`,
                    padding: '10px 14px',
                    borderRadius: msg.role === 'user' ? '12px 2px 12px 12px' : '2px 12px 12px 12px',
                    fontSize: '0.8125rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.6,
                    width: '100%',
                    ...(msg.role === 'user' ? { whiteSpace: 'pre-wrap' } : {}),
                  }}>
                    {msg.role === 'user' && (
                      <div style={{ fontSize: '0.5625rem', color: 'rgba(255,255,255,0.3)', marginBottom: '4px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        CEO Command
                      </div>
                    )}
                    {msg.role === 'assistant' ? (
                      <div className="cea-markdown">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      </div>
                    ) : msg.content}
                  </div>
                  {/* Timestamp */}
                  <div style={{ 
                    fontSize: '0.625rem', color: 'rgba(255,255,255,0.3)', 
                    padding: '0 4px', marginTop: '2px'
                  }}>
                    {new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(msg.timestamp || new Date())}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{
                  width: '30px', height: '30px', borderRadius: '50%',
                  background: 'rgba(118,185,0,0.1)', border: '1px solid rgba(118,185,0,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden'
                }}>
                  <img src="/logos/claw-128-transparent.png" alt="Nemo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <div style={{
                  background: 'rgba(255,255,255,0.03)', padding: '12px 16px',
                  borderRadius: '2px 12px 12px 12px', display: 'flex',
                  alignItems: 'center', gap: '8px', fontSize: '0.8125rem',
                  color: 'rgba(255,255,255,0.4)',
                  border: '1px solid rgba(118,185,0,0.1)',
                }}>
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', color: '#76b900' }} />
                  C.E.A. analyzing... consulting fleet telemetry
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat input */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                ref={inputRef}
                style={{
                  flex: 1, padding: '10px 14px', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px', background: 'rgba(255,255,255,0.04)', color: '#fff',
                  fontSize: '0.8125rem', outline: 'none', fontFamily: "'Inter', sans-serif",
                }}
                placeholder="Command your C.E.A...."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isTyping}
              />
              <button
                onClick={handleSend}
                disabled={isTyping || !chatInput.trim()}
                style={{
                  padding: '10px 18px', border: 'none', borderRadius: '8px',
                  background: isTyping || !chatInput.trim() ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #76b900, #4a7a00)',
                  color: isTyping || !chatInput.trim() ? 'rgba(255,255,255,0.3)' : '#111',
                  cursor: isTyping || !chatInput.trim() ? 'not-allowed' : 'pointer',
                  fontWeight: 700, fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                {isTyping ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
              </button>
            </div>
          </div>
        </div>

        {/* Command Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
          {/* Quick Commands */}
          <div style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '12px', padding: '16px',
          }}>
            <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#76b900', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={12} /> Quick Commands
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {QUICK_ACTIONS.map(qa => (
                <button
                  key={qa.label}
                  onClick={() => handleQuickAction(qa.prompt)}
                  style={{
                    padding: '8px 12px', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px',
                    background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
                    fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px',
                    textAlign: 'left', transition: 'all 0.15s',
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = 'rgba(118,185,0,0.08)'; e.currentTarget.style.borderColor = 'rgba(118,185,0,0.2)'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                >
                  <qa.icon size={14} color="#76b900" style={{ flexShrink: 0 }} />
                  {qa.label}
                </button>
              ))}
            </div>
          </div>

          {/* Live Context Panel */}
          {showDispatches && liveContext && (
            <div style={{
              background: 'rgba(118,185,0,0.03)', border: '1px solid rgba(118,185,0,0.12)',
              borderRadius: '12px', padding: '16px',
            }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#76b900', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Cpu size={12} /> Live Context Injected
              </div>
              <div style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
                <div style={{ marginBottom: '6px' }}>
                  <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Prospects:</strong> {liveContext.prospects?.total || 0} total
                </div>
                <div style={{ marginBottom: '6px' }}>
                  <strong style={{ color: 'rgba(255,255,255,0.7)' }}>With Email:</strong> {liveContext.prospects?.withEmail || 0}
                </div>
                <div style={{ marginBottom: '6px' }}>
                  <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Hunter.io:</strong> {liveContext.tools?.hunterIO}
                </div>
                <div style={{ marginBottom: '6px' }}>
                  <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Apollo.io:</strong> {liveContext.tools?.apolloIO}
                </div>
                <div style={{ marginBottom: '6px' }}>
                  <strong style={{ color: 'rgba(255,255,255,0.7)' }}>SendGrid:</strong> {liveContext.tools?.sendgrid}
                </div>
                <div>
                  <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Updated:</strong> {new Date(liveContext.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          )}

          {/* Security Badge */}
          <div style={{
            background: 'rgba(118,185,0,0.03)', border: '1px solid rgba(118,185,0,0.15)',
            borderRadius: '12px', padding: '14px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '0.5625rem', fontWeight: 700, color: '#76b900', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Shield size={10} /> Executive-Only Channel
            </div>
            <div style={{ fontSize: '0.5625rem', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
              All messages logged to _internalAuditLog
            </div>
          </div>
        </div>
      </div>

      {/* Spinner animation */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        
        .cea-markdown h1, .cea-markdown h2, .cea-markdown h3, .cea-markdown h4 {
          color: #fff; margin: 12px 0 6px 0; line-height: 1.3;
        }
        .cea-markdown h1 { font-size: 1.1rem; font-weight: 800; }
        .cea-markdown h2 { font-size: 1rem; font-weight: 700; }
        .cea-markdown h3 { font-size: 0.9rem; font-weight: 700; color: #76b900; }
        .cea-markdown h4 { font-size: 0.825rem; font-weight: 600; }
        .cea-markdown p { margin: 6px 0; }
        .cea-markdown strong { color: #fff; font-weight: 700; }
        .cea-markdown em { color: rgba(255,255,255,0.6); }
        .cea-markdown ul, .cea-markdown ol { padding-left: 20px; margin: 6px 0; }
        .cea-markdown li { margin: 3px 0; }
        .cea-markdown li::marker { color: #76b900; }
        .cea-markdown hr { border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 12px 0; }
        .cea-markdown code {
          background: rgba(118,185,0,0.1); color: #76b900; padding: 1px 5px;
          border-radius: 3px; font-size: 0.75rem; font-family: 'Fira Code', monospace;
        }
        .cea-markdown pre {
          background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.06);
          border-radius: 8px; padding: 12px; overflow-x: auto; margin: 8px 0;
        }
        .cea-markdown pre code { background: none; padding: 0; color: rgba(255,255,255,0.8); }
        .cea-markdown table {
          width: 100%; border-collapse: collapse; margin: 8px 0;
          font-size: 0.75rem;
        }
        .cea-markdown th {
          text-align: left; padding: 6px 10px; font-weight: 700; color: #76b900;
          border-bottom: 1px solid rgba(118,185,0,0.2); font-size: 0.6875rem;
          text-transform: uppercase; letter-spacing: 0.03em;
        }
        .cea-markdown td {
          padding: 5px 10px; border-bottom: 1px solid rgba(255,255,255,0.04);
          color: rgba(255,255,255,0.7);
        }
        .cea-markdown tr:hover td { background: rgba(118,185,0,0.03); }
        .cea-markdown blockquote {
          border-left: 3px solid #76b900; margin: 8px 0; padding: 6px 12px;
          background: rgba(118,185,0,0.04); border-radius: 0 6px 6px 0;
          color: rgba(255,255,255,0.7);
        }
        .cea-markdown a { color: #76b900; text-decoration: underline; }
      `}</style>
    </div>
  );
}
