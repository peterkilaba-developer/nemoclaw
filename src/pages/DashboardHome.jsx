import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useFirm } from '../contexts/FirmContext';
import { getOwnerRole } from '../lib/agentHierarchy';
import { doc, setDoc, getDoc, serverTimestamp, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getFounderDaysRemaining } from '../lib/stripeService';
import { getAuditLog } from '../lib/agentAPI';
import { getPracticeAreaConfig, getPracticeAreaLabel } from '../lib/practiceAreaConfig';
import {
  Briefcase, Calendar, Zap, ArrowRight, Clock, ShieldCheck,
  MessageSquare, DollarSign, Bot, ChevronRight, X,
} from 'lucide-react';

export default function DashboardHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { firm, personalAgents, superAgent, refreshFirm, firmId } = useFirm();

  const firstName = user?.displayName?.split(' ')[0] || 'Counselor';
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const practiceAreas = firm?.practiceAreas || [];
  const practiceLabel = getPracticeAreaLabel(practiceAreas);
  const paConfig = getPracticeAreaConfig(practiceAreas);

  const personalCount = (Array.isArray(personalAgents) ? personalAgents : []).length;
  const superCount = superAgent ? 1 : 0;
  const agentCount = personalCount + superCount;
  const trialDaysLeft = getFounderDaysRemaining(firm?.trialEndsAt);

  // Self-healing: ensure owner agent and super agent exist
  useEffect(() => {
    if (!firmId || !user?.uid) return;
    const repair = async () => {
      try {
        const ownerAgentSnap = await getDoc(doc(db, 'firms', firmId, 'agents', user.uid));
        if (!ownerAgentSnap.exists()) {
          const ownerName = user.displayName || firm?.contactName || 'Attorney';
          const ownerEmail = user.email || '';
          const ownerRole = getOwnerRole(firm?.firmSize);
          await setDoc(doc(db, 'firms', firmId, 'employees', user.uid), {
            name: ownerName, email: ownerEmail, role: ownerRole,
            photoURL: user.photoURL || null, isOwner: true,
            practiceAreas: firm?.practiceAreas || [],
            createdAt: serverTimestamp(),
          }, { merge: true });
          await setDoc(doc(db, 'firms', firmId, 'agents', user.uid), {
            employeeId: user.uid, employeeName: ownerName, employeeEmail: ownerEmail,
            employeePhotoURL: user.photoURL || null, agentType: 'partner',
            agentName: 'AI Chief of Staff', firmId,
            permissions: {}, availableSubAgents: ['legal-research', 'contract-review', 'drafting', 'case-analytics', 'business-intelligence', 'knowledge-search', 'communication-drafter', 'billing-time', 'deadline-tracker', 'client-intake', 'scheduling'],
            context: { preferences: {}, writingStyle: null, caseload: [] },
            settings: { showSubAgentVisibility: false },
            superAgentAccess: true, canEditFirmPolicies: true, isOwner: true,
            status: 'active', createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
          }, { merge: true });
          await refreshFirm?.();
        }
        const saSnap = await getDoc(doc(db, 'firms', firmId, 'superAgent', 'config'));
        if (!saSnap.exists()) {
          await setDoc(doc(db, 'firms', firmId, 'superAgent', 'config'), {
            agentName: 'NemoClaw Super Agent', firmId, status: 'active',
            capabilities: ['firm-wide-analytics', 'cross-matter-search', 'compliance-monitoring', 'risk-assessment', 'performance-metrics'],
            createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
          }, { merge: true });
        }
      } catch (err) { console.error('Agent auto-repair:', err); }
    };
    repair();
  }, [firm?.contactName, firm?.email, firm?.firmSize, firm?.practiceAreas, firmId, refreshFirm, user?.displayName, user?.email, user?.photoURL, user?.uid]);

  const [auditLogs, setAuditLogs] = useState([]);
  const [tasksToday, setTasksToday] = useState(0);
  const [piiRedactedCount, setPiiRedactedCount] = useState(0);
  const [recentMatters, setRecentMatters] = useState([]);
  const [mattersLoading, setMattersLoading] = useState(true);

  useEffect(() => {
    if (!firmId) return;
    const fetchLogs = async () => {
      try {
        const logs = await getAuditLog(firmId, 50);
        setAuditLogs(logs);
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        setTasksToday(logs.filter(l => {
          const ts = l.timestamp?.toDate?.() || new Date(l.timestamp);
          return ts >= todayStart;
        }).length);
        setPiiRedactedCount(logs.reduce((s, l) => s + (l.piiRedactions?.length || 0), 0));
      } catch (err) { console.warn('Audit log load failed:', err); }
    };
    const fetchMatters = async () => {
      try {
        const q = query(collection(db, 'firms', firmId, 'matters'), orderBy('updatedAt', 'desc'), limit(5));
        const snap = await getDocs(q);
        setRecentMatters(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) { console.warn('Matters load failed:', err); }
      setMattersLoading(false);
    };
    fetchLogs();
    fetchMatters();
  }, [firmId]);

  const [dismissedBriefing, setDismissedBriefing] = useState(false);

  return (
    <>
      {/* Page header */}
      <div className="db-page-header">
        <div>
          <h1 className="db-page-title">{greeting}, {firstName}.</h1>
          <p className="db-page-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {today}
            {practiceAreas.length > 0 && (
              <>
                <span style={{ color: 'var(--db-border)', userSelect: 'none' }}>·</span>
                <span style={{ color: 'var(--db-nvidia-green)', fontWeight: 600 }}>{practiceLabel}</span>
              </>
            )}
          </p>
        </div>
        <button
          className="db-btn db-btn-primary"
          onClick={() => navigate('/dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}
        >
          <MessageSquare size={15} />
          Ask AI Chief of Staff
        </button>
      </div>

      {/* ── KPI STATS ── */}
      <div className="db-stats-grid" style={{ marginBottom: '24px' }}>
        <div className="db-stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard/matters')}>
          <div className="db-stat-label">Active Matters</div>
          <div className="db-stat-value">{mattersLoading ? '—' : recentMatters.filter(m => m.status === 'Active' || !m.status).length}</div>
          <div className="db-stat-meta" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Briefcase size={11} /> Open files
          </div>
        </div>
        <div className="db-stat-card">
          <div className="db-stat-label">AI Tasks Today</div>
          <div className="db-stat-value nvidia">{tasksToday}</div>
          <div className="db-stat-meta" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Zap size={11} /> Agent throughput
          </div>
        </div>
        <div className="db-stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard/billing')}>
          <div className="db-stat-label">{firm?.hasPaymentMethod ? 'Subscription' : 'Free Trial'}</div>
          <div className="db-stat-value accent" style={{ fontSize: firm?.hasPaymentMethod ? '1rem' : undefined }}>
            {firm?.hasPaymentMethod ? 'Active' : `${trialDaysLeft}d left`}
          </div>
          <div className="db-stat-meta" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <DollarSign size={11} /> {firm?.hasPaymentMethod ? '$297/mo' : '30-day trial'}
          </div>
        </div>
        <div className="db-stat-card">
          <div className="db-stat-label">Sandbox Status</div>
          <div className="db-stat-value accent">{firm?.isConfigured ? 'Healthy' : 'Provisioning'}</div>
          <div className="db-stat-meta" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ShieldCheck size={11} /> NemoClaw · {agentCount} agent{agentCount !== 1 ? 's' : ''} active
          </div>
        </div>
      </div>

      {/* ── MAIN TWO-COLUMN LAYOUT ── */}
      <div className="db-two-col">

        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Practice-Area Quick Actions */}
          {!dismissedBriefing && (
            <div className="db-card">
              <div className="db-card-header">
                <div>
                  <div className="db-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Zap size={15} style={{ color: 'var(--db-nvidia-green)' }} />
                    Start Here
                  </div>
                  <div className="db-card-subtitle">
                    Practice-area quick actions for {practiceLabel}
                  </div>
                </div>
                <button onClick={() => setDismissedBriefing(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--db-text-muted)', padding: '4px' }}>
                  <X size={14} />
                </button>
              </div>
              <div style={{ padding: '0 20px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {paConfig.quickActions.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => navigate(`/dashboard?prompt=${encodeURIComponent(action.prompt)}`)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                      padding: '10px 14px', background: 'var(--db-bg)', border: '1px solid var(--db-border)',
                      borderRadius: '8px', cursor: 'pointer', textAlign: 'left', color: 'var(--db-text-primary)',
                      transition: 'border-color 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(118,185,0,0.4)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--db-border)'}
                  >
                    <MessageSquare size={13} style={{ color: 'var(--db-nvidia-green)', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.8125rem', fontWeight: 500, flex: 1 }}>{action.label}</span>
                    <ChevronRight size={13} style={{ color: 'var(--db-text-muted)', flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recent Matters */}
          <div className="db-card">
            <div className="db-card-header">
              <div>
                <div className="db-card-title">Recent Matters</div>
                <div className="db-card-subtitle">Your most recently updated files</div>
              </div>
              <button className="db-btn db-btn-secondary db-btn-sm" onClick={() => navigate('/dashboard/matters')}>
                All Matters
              </button>
            </div>
            <div>
              {mattersLoading ? (
                <div style={{ padding: '24px', textAlign: 'center', fontSize: '0.8125rem', color: 'var(--db-text-muted)' }}>Loading...</div>
              ) : recentMatters.length > 0 ? (
                recentMatters.map((matter, i) => (
                  <div
                    key={matter.id}
                    onClick={() => navigate(`/dashboard/matters/${matter.id}`)}
                    style={{
                      padding: '14px 20px',
                      borderBottom: i < recentMatters.length - 1 ? '1px solid var(--db-border)' : 'none',
                      display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--db-bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(118,185,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Briefcase size={15} style={{ color: 'var(--db-nvidia-green)' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{matter.title || 'Untitled Matter'}</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)', marginTop: '2px' }}>
                        {matter.clientName || matter.client || 'Client'} · {matter.type || 'General'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                      <span style={{
                        fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                        padding: '2px 7px', borderRadius: '4px',
                        background: matter.status === 'Active' || !matter.status ? 'rgba(118,185,0,0.12)' : 'rgba(255,255,255,0.06)',
                        color: matter.status === 'Active' || !matter.status ? 'var(--db-nvidia-green)' : 'var(--db-text-muted)',
                      }}>
                        {matter.status || 'Active'}
                      </span>
                      <ArrowRight size={12} style={{ color: 'var(--db-text-muted)' }} />
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                  <Briefcase size={28} style={{ color: 'var(--db-text-muted)', opacity: 0.3, marginBottom: '8px' }} />
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>No matters yet</div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)', margin: '0 0 16px' }}>Open your first matter to start your AI-assisted workflow.</p>
                  <button className="db-btn db-btn-primary" style={{ fontSize: '0.8125rem' }} onClick={() => navigate('/dashboard/matters')}>
                    Open a Matter
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Live Agent Activity */}
          <div className="db-card">
            <div className="db-card-header">
              <div>
                <div className="db-card-title">Live Agent Activity</div>
                <div className="db-card-subtitle">Real-time updates from your AI workforce</div>
              </div>
              {firm?.isConfigured && (
                <button className="db-btn db-btn-secondary db-btn-sm" onClick={() => navigate('/dashboard/security')}>
                  Audit Log
                </button>
              )}
            </div>
            <div className="db-feed" style={{ maxHeight: '320px', overflowY: 'auto' }}>
              {auditLogs.length > 0 ? (
                auditLogs.slice(0, 8).map((log, i) => {
                  const timeStr = log.timestamp?.toDate
                    ? log.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'Just now';
                  return (
                    <div key={i} style={{ padding: '12px 20px', borderBottom: '1px solid var(--db-border)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <div style={{ width: '28px', height: '28px', background: 'rgba(118,185,0,0.08)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Bot size={13} style={{ color: 'var(--db-nvidia-green)' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                          {String(log.agentType || log.type || 'Agent task').replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--db-text-secondary)', marginTop: '2px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {(log.userMessage || log.agentResponse || log.reason || 'Agent activity').slice(0, 100)}
                        </div>
                        <div style={{ fontSize: '0.625rem', color: 'var(--db-text-muted)', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Clock size={9} /> {timeStr}</span>
                          {log.subAgentsUsed?.length > 0 && <span>⚡ {log.subAgentsUsed.length} sub-agents</span>}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                  <Bot size={28} style={{ color: 'var(--db-text-muted)', opacity: 0.3, marginBottom: '8px' }} />
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>No activity yet</div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)', margin: 0 }}>
                    Start a conversation with your AI Chief of Staff to see agent activity here.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Security Overview */}
          <div className="db-card">
            <div className="db-card-header">
              <div className="db-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={15} style={{ color: 'var(--db-nvidia-green)' }} />
                NemoClaw Security
              </div>
              <button className="db-btn db-btn-secondary db-btn-sm" onClick={() => navigate('/dashboard/security')}>
                Details
              </button>
            </div>
            <div className="db-security-status" style={{ margin: '0 20px 12px' }}>
              <div className="status-dot" style={{ background: firm?.isConfigured ? 'var(--db-nvidia-green)' : '#f59e0b' }} />
              <span style={{ fontSize: '0.8125rem' }}>Sandbox — {firm?.isConfigured ? 'Operational' : 'Provisioning'}</span>
            </div>
            <div className="db-protection-grid" style={{ padding: '0 20px 16px' }}>
              <div className="db-protection-card">
                <div className="db-protection-value">{piiRedactedCount}</div>
                <div className="db-protection-label">PII Redacted</div>
              </div>
              <div className="db-protection-card">
                <div className="db-protection-value">0</div>
                <div className="db-protection-label">Blocked</div>
              </div>
              <div className="db-protection-card">
                <div className="db-protection-value">0</div>
                <div className="db-protection-label">Halluc. Caught</div>
              </div>
            </div>
          </div>

          {/* Upcoming deadlines — placeholder for future integration */}
          <div className="db-card">
            <div className="db-card-header">
              <div className="db-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={15} style={{ color: 'var(--db-text-muted)' }} />
                Upcoming Deadlines
              </div>
            </div>
            <div style={{ padding: '24px 20px', textAlign: 'center' }}>
              <Calendar size={24} style={{ color: 'var(--db-text-muted)', opacity: 0.3, marginBottom: '8px' }} />
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>Calendar sync coming soon</div>
              <p style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)', margin: '0 0 12px' }}>
                Court dates and matter deadlines will appear here once calendar integration is active.
              </p>
              <button className="db-btn db-btn-secondary" style={{ fontSize: '0.75rem' }} onClick={() => navigate('/dashboard')}>
                Ask AI to track a deadline
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
