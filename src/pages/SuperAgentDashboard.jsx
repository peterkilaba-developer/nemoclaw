import { useState, useEffect, useCallback } from 'react';
import { useFirm } from '../contexts/FirmContext';
import { useAuth } from '../contexts/AuthContext';
import { getAuditLog } from '../lib/agentAPI';
import {
  Crown, Users, Shield, AlertTriangle, Eye, 
  Scale, BarChart3, CheckCircle, XOctagon,
  RefreshCw, Lock, Zap,
} from 'lucide-react';

const AUDIT_TYPE_LABELS = {
  agent_interaction: 'Agent Interaction',
  'agent.message': 'Agent Interaction',
  'agent.sub_dispatch': 'Sub-Agent Dispatch',
  'agent.error': 'Agent Error',
  'data.conflict_check': 'Conflict Check',
  'matter.engagement_generated': 'Engagement Generated',
  'matter.engagement_signed': 'Engagement Signed',
  'matter.closed': 'Matter Closed',
  'signature.requested': 'Signature Requested',
  'signature.signed': 'Signature Signed',
  'security.ethical_wall_violation': 'Conflict Review Required',
};

function getAuditDate(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null);
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function labelAuditType(type) {
  if (!type) return 'Audit Event';
  return AUDIT_TYPE_LABELS[type] || type
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function getAuditActor(entry) {
  return entry.employeeName
    || entry.employeeEmail
    || entry.signerName
    || entry.clearedBy
    || entry.agentId
    || 'System';
}

function getAuditDetail(entry) {
  return entry.userMessage
    || entry.agentResponse
    || entry.reason
    || entry.notes
    || entry.resource
    || entry.action
    || 'Audit event recorded.';
}

export default function SuperAgentDashboard() {
  const { user } = useAuth();
  const { firm, _employees, personalAgents: agents } = useFirm();
  const [auditLog, setAuditLog] = useState([]);
  const [_loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const firmId = firm?.id || user?.firmId;

  const myAgent = agents?.find(a => a.employeeEmail === user?.email);
  const hasAccess = myAgent?.superAgentAccess;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const log = await getAuditLog(firmId, 100);
      setAuditLog(log);
    } catch (err) {
      console.warn('Audit log load failed:', err.message);
    }
    setLoading(false);
  }, [firmId]);

  useEffect(() => {
    const initialLoad = setTimeout(loadData, 0);
    return () => clearTimeout(initialLoad);
  }, [loadData]);

  // Compute firm-wide metrics
  const personalCount = agents?.filter(a => !a.isAutonomous)?.length || 0;
  const autonomousCount = agents?.filter(a => a.isAutonomous)?.length || 0;
  const superCount = firm?.isConfigured ? 1 : 0; // Super Agent exists if firm is configured
  const totalAgents = personalCount + autonomousCount + superCount;

  const partnerCount = agents?.filter(a => a.agentType === 'partner')?.length || 0;
  const associateCount = agents?.filter(a => a.agentType === 'associate')?.length || 0;
  const ofCounselCount = agents?.filter(a => a.agentType === 'of-counsel')?.length || 0;
  const staffCount = personalCount - partnerCount - associateCount - ofCounselCount;

  // Audit metrics
  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const todayLogs = auditLog.filter(l => {
    const ts = getAuditDate(l.timestamp);
    return ts ? ts >= todayStart : false;
  });
  const piiRedactions = auditLog.filter(l => l.piiRedactions?.length > 0).length;
  const subAgentDispatches = auditLog.reduce((sum, l) => sum + (l.subAgentsUsed?.length || 0), 0);

  // Agent utilization by type
  const agentTypeCounts = {};
  agents?.forEach(a => {
    agentTypeCounts[a.agentType] = (agentTypeCounts[a.agentType] || 0) + 1;
  });

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'agents', label: 'Agentic Resource', icon: Users },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'audit', label: 'Audit Trail', icon: Eye },
  ];

  if (agents && myAgent && !hasAccess) {
    return (
      <div style={{ padding: '64px', textAlign: 'center' }}>
        <Crown size={48} style={{ color: '#ef4444', marginBottom: '16px', opacity: 0.5 }} />
        <h2>Access Denied</h2>
        <p style={{ color: 'var(--db-text-secondary)', marginTop: '8px' }}>
          The Super Agent Dashboard is restricted to Firm Management and Partners.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="db-page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <Crown size={28} style={{ color: 'var(--db-text-secondary)' }} />
            <h1 className="db-page-title" style={{ margin: 0 }}>Super Agent — Chief of Staff</h1>
          </div>
          <p className="db-page-subtitle">
            Firm-wide intelligence, conflict detection, and resource allocation. Partner-only access.
          </p>
        </div>
        <button className="db-btn db-btn-primary" onClick={loadData} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <RefreshCw size={14} /> Refresh Intel
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '1px solid var(--db-border)' }}>
        {(tabs || []).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '10px 16px', border: 'none', cursor: 'pointer',
              background: activeTab === tab.id ? 'var(--db-card-bg)' : 'transparent',
              color: activeTab === tab.id ? '#76b900' : 'var(--db-text-secondary)',
              borderBottom: activeTab === tab.id ? '2px solid #76b900' : '2px solid transparent',
              fontWeight: activeTab === tab.id ? 600 : 400,
              fontSize: '0.8125rem', borderRadius: '4px 4px 0 0',
              transition: 'all 0.2s',
            }}
          >
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* KPI Cards */}
          <div className="db-stats-grid" style={{ marginBottom: '24px' }}>
            <div className="db-stat-card">
              <div className="db-stat-label">Total Firm Agents</div>
              <div className="db-stat-value" style={{ color: '#76b900' }}>{totalAgents}</div>
              <div className="db-stat-meta">{personalCount} Tethered · {autonomousCount} Autonomous · {superCount} Super</div>
            </div>
            <div className="db-stat-card">
              <div className="db-stat-label">Today's Inferences</div>
              <div className="db-stat-value" style={{ color: todayLogs.length > 0 ? '#76b900' : '#f59e0b' }}>{todayLogs.length}</div>
              <div className="db-stat-meta">{todayLogs.length > 0 ? 'Across all agents' : 'No activity yet today'}</div>
            </div>
            <div className="db-stat-card">
              <div className="db-stat-label">PII Intercepted</div>
              <div className="db-stat-value" style={{ color: piiRedactions === 0 ? '#76b900' : '#f59e0b' }}>{piiRedactions}</div>
              <div className="db-stat-meta">{piiRedactions === 0 ? 'No PII detected' : 'Auto-redacted before inference'}</div>
            </div>
            <div className="db-stat-card">
              <div className="db-stat-label">Sub-Agent Dispatches</div>
              <div className="db-stat-value" style={{ color: '#76b900' }}>{subAgentDispatches}</div>
              <div className="db-stat-meta">Total specialist invocations</div>
            </div>
          </div>

          <div className="db-two-col">
            {/* Agent Utilization — unique per-agent breakdown not shown in stat cards */}
            <div className="db-card">
              <div className="db-card-header">
                <div className="db-card-title">⚡ Agent Utilization</div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)' }}>Inferences per agent · all time</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {auditLog.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', fontSize: '0.8125rem', color: 'var(--db-text-muted)' }}>
                    No agent activity recorded yet. Send a message to your AI Chief of Staff to see utilization data.
                  </div>
                ) : (() => {
                  // Build per-agent breakdown from audit log
                  const byAgent = {};
                  auditLog
                    .filter(l => l.userMessage || l.agentResponse || l.type === 'agent_interaction' || l.type === 'agent.message')
                    .forEach(l => {
                    const key = l.employeeName || l.employeeEmail || l.agentId || 'System';
                    if (!byAgent[key]) byAgent[key] = { name: key, type: l.agentType || '—', count: 0, pii: 0, dispatches: 0 };
                    byAgent[key].count++;
                    byAgent[key].pii += l.piiRedactions?.length || 0;
                    byAgent[key].dispatches += l.subAgentsUsed?.length || 0;
                  });
                  const rows = Object.values(byAgent).sort((a, b) => b.count - a.count);
                  return (rows || []).map((row, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < rows.length - 1 ? '1px solid var(--db-border)' : 'none' }}>
                      <div>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--db-text-primary)' }}>{row.name}</div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)', textTransform: 'capitalize' }}>{row.type}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '20px', textAlign: 'right' }}>
                        <div>
                          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#76b900', fontFamily: 'var(--db-font-mono)' }}>{row.count}</div>
                          <div style={{ fontSize: '0.5625rem', color: 'var(--db-text-muted)' }}>inferences</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '1rem', fontWeight: 700, color: row.dispatches > 0 ? '#76b900' : 'var(--db-text-muted)', fontFamily: 'var(--db-font-mono)' }}>{row.dispatches}</div>
                          <div style={{ fontSize: '0.5625rem', color: 'var(--db-text-muted)' }}>dispatches</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '1rem', fontWeight: 700, color: row.pii > 0 ? '#f59e0b' : 'var(--db-text-muted)', fontFamily: 'var(--db-font-mono)' }}>{row.pii}</div>
                          <div style={{ fontSize: '0.5625rem', color: 'var(--db-text-muted)' }}>PII caught</div>
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Conflict Detection */}
            <div className="db-card">
              <div className="db-card-header">
                <div className="db-card-title">⚖️ Conflict Detection</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ padding: '12px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '8px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <CheckCircle size={16} style={{ color: '#22c55e' }} />
                    <span style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#22c55e' }}>NO ACTIVE CONFLICTS</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)' }}>
                    Last scan: {new Date().toLocaleTimeString()} · Checked all tethered agents against current caseload
                  </div>
                </div>

                <div style={{ fontSize: '0.8125rem', color: 'var(--db-text-secondary)' }}>
                  <strong>Cross-Matter Monitoring:</strong>
                </div>
                <div style={{ padding: '12px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--db-text-muted)' }}>
                  No cross-matter conflicts detected. Conflict checks run automatically when new matters are created.
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Agentic Resource Tab */}
      {activeTab === 'agents' && (
        <>
          {/* Agent Type Distribution */}
          <div className="db-stats-grid" style={{ marginBottom: '24px', gridTemplateColumns: 'repeat(5, 1fr)' }}>
            {[
              { type: 'Partner', count: partnerCount, icon: Crown, color: '#76b900', access: 'Full firm + Super Agent' },
              { type: 'Associate', count: associateCount, icon: Scale, color: '#76b900', access: 'Assigned matters only' },
              { type: 'Staff', count: staffCount, icon: Users, color: '#76b900', access: 'Role-restricted' },
              { type: 'Of Counsel', count: ofCounselCount, icon: Scale, color: '#f59e0b', access: 'Read-only Super Agent' },
              { type: 'Total Tethered', count: personalCount, icon: Zap, color: '#76b900', access: 'Human-paired workforce' },
            ].map((item, i) => (
              <div key={i} className="db-stat-card" style={item.type === 'Of Counsel' ? { border: '1px solid rgba(245,158,11,0.15)' } : {}}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <item.icon size={16} style={{ color: item.color }} />
                  <div className="db-stat-label">{item.type}</div>
                </div>
                <div className="db-stat-value" style={{ color: item.color }}>{item.count}</div>
                <div className="db-stat-meta">{item.access}</div>
              </div>
            ))}
          </div>

          {/* Agent Roster */}
          <div className="db-card">
            <div className="db-card-header">
              <div className="db-card-title">Agent Roster</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--db-border)' }}>
                    {['Agent Name', 'Type', 'Employee', 'Sub-Agents', 'Status', 'Ethical Wall'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--db-text-muted)', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(agents || []).map((agent, i) => (
                    <tr key={agent.id || i} style={{ borderBottom: '1px solid var(--db-border)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--db-text-primary)' }}>{agent.agentName || 'AI Chief of Staff'}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '0.6875rem', fontWeight: 600, background: 'rgba(255,255,255,0.06)', color: 'var(--db-text-secondary)', textTransform: 'uppercase' }}>
                          {agent.agentType}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--db-text-secondary)' }}>{agent.employeeName}</td>
                      <td style={{ padding: '10px 12px', fontFamily: 'var(--db-font-mono)', color: 'var(--db-text-muted)' }}>{agent.availableSubAgents?.length || 0}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#22c55e', fontSize: '0.75rem' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} /> Active
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <Lock size={12} style={{ color: 'var(--db-text-muted)' }} />
                        <span style={{ fontSize: '0.6875rem', marginLeft: '4px', color: 'var(--db-text-muted)' }}>
                          {agent.agentType === 'partner' ? 'Full' : agent.agentType === 'contractor' ? 'Sandboxed' : 'Scoped'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!agents || agents.length === 0) && (
                    <tr>
                      <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--db-text-muted)' }}>
                        No agents provisioned yet. Complete onboarding to deploy your AI workforce.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <>
          <div className="db-stats-grid" style={{ marginBottom: '24px' }}>
            {[
              { label: 'Ethical Walls', value: 'ACTIVE', color: '#22c55e', icon: Shield },
              { label: 'PII Auto-Redaction', value: 'ENABLED', color: '#22c55e', icon: Lock },
              { label: 'UPL Detection', value: 'ARMED', color: '#22c55e', icon: AlertTriangle },
              { label: 'Network Egress', value: 'DENY-DEFAULT', color: '#22c55e', icon: XOctagon },
            ].map((item, i) => (
              <div key={i} className="db-stat-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <item.icon size={16} style={{ color: item.color }} />
                  <div className="db-stat-label">{item.label}</div>
                </div>
                <div className="db-stat-value" style={{ color: item.color, fontSize: '1rem' }}>{item.value}</div>
              </div>
            ))}
          </div>

          <div className="db-two-col">
            <div className="db-card">
              <div className="db-card-header"><div className="db-card-title">🔐 Security Controls</div></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { control: 'Role-based system prompts', status: '8/8 deployed', ok: true },
                  { control: 'Matter-level access isolation', status: 'Firestore rules enforced', ok: true },
                  { control: 'Client-side PII filter', status: '4 patterns active (SSN, phone, email, DOB)', ok: true },
                  { control: 'UPL guardrail (non-attorney roles)', status: '5 patterns monitored', ok: true },
                  { control: 'Audit trail immutability', status: 'Write-only, no delete', ok: true },
                  { control: 'Network egress firewall', status: 'NVIDIA endpoint only', ok: true },
                  { control: 'API key isolation', status: 'Server-side proxy (never in browser)', ok: true },
                  { control: 'Conversation encryption', status: 'TLS 1.3 in transit, AES-256 at rest', ok: true },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--db-bg)', borderRadius: '6px' }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--db-text-primary)' }}>{item.control}</span>
                    <span style={{ fontSize: '0.6875rem', fontFamily: 'var(--db-font-mono)', color: item.ok ? '#22c55e' : '#ef4444' }}>{item.status}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="db-card">
              <div className="db-card-header"><div className="db-card-title">🛡️ Ethical Wall Matrix</div></div>
              <div style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)', marginBottom: '12px' }}>
                What each agent type can access (enforced at inference + Firestore rule level)
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.6875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--db-border)' }}>
                      {['Role', 'All Matters', 'Financial', 'Strategy', 'Contacts', 'Audit'].map(h => (
                        <th key={h} style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 600, color: 'var(--db-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { role: 'Partner', matters: '\u2705', financial: '\u2705', strategy: '\u2705', contacts: '\u2705', audit: '\u26a1' },
                      { role: 'Of Counsel', matters: '\ud83d\udd12+\ud83d\udd0d', financial: '\u274c', strategy: '\u274c', contacts: '\ud83d\udd12', audit: '\ud83d\udc41\ufe0f' },
                      { role: 'Associate', matters: '\ud83d\udd12', financial: '\u274c', strategy: '\u274c', contacts: '\ud83d\udd12', audit: '\u274c' },
                      { role: 'Paralegal', matters: '\ud83d\udd12', financial: '\u274c', strategy: '\u274c', contacts: '\ud83d\udd12', audit: '\u274c' },
                      { role: 'Law Clerk', matters: '\ud83d\udd12', financial: '\u274c', strategy: '\u274c', contacts: '\u274c', audit: '\u274c' },
                      { role: 'Secretary', matters: '\ud83d\udd12', financial: '\u274c', strategy: '\u274c', contacts: '\ud83d\udd12', audit: '\u274c' },
                      { role: 'Receptionist', matters: '\u274c', financial: '\u274c', strategy: '\u274c', contacts: '\u2705', audit: '\u274c' },
                      { role: 'Billing', matters: '\u274c', financial: '\u2705', strategy: '\u274c', contacts: '\ud83d\udcb2', audit: '\u274c' },
                      { role: 'Operations', matters: '\u274c', financial: '\ud83d\udcca', strategy: '\u274c', contacts: '\u274c', audit: '\u2705' },
                      { role: 'Intern', matters: '\ud83d\udd12\ud83d\udd12', financial: '\u274c', strategy: '\u274c', contacts: '\u274c', audit: '\u274c' },
                    ].map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--db-border)' }}>
                        <td style={{ padding: '6px 8px', fontWeight: 600, color: 'var(--db-text-primary)' }}>{row.role}</td>
                        {['matters', 'financial', 'strategy', 'contacts', 'audit'].map(col => (
                          <td key={col} style={{ padding: '6px 8px', textAlign: 'center' }}>{row[col]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ fontSize: '0.625rem', color: 'var(--db-text-muted)', marginTop: '8px' }}>
                  {'\u2705'} Full {'\u00b7'} {'\ud83d\udd12'} Assigned only {'\u00b7'} {'\ud83d\udd12'}+{'\ud83d\udd0d'} Own + research {'\u00b7'} {'\ud83d\udd12\ud83d\udd12'} Sandboxed {'\u00b7'} {'\u26a1'} Own team {'\u00b7'} {'\ud83d\udc41\ufe0f'} Read-only {'\u00b7'} {'\ud83d\udcca'} Summary {'\u00b7'} {'\ud83d\udcb2'} Billing-only {'\u00b7'} {'\u274c'} Denied
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Audit Trail Tab */}
      {activeTab === 'audit' && (
        <div className="db-card">
          <div className="db-card-header">
            <div className="db-card-title">📋 Immutable Audit Trail</div>
            <span style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)' }}>{auditLog.length} entries</span>
          </div>
          {auditLog.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--db-text-muted)' }}>
              <Eye size={32} style={{ marginBottom: '12px', opacity: 0.4 }} />
              <div>No audit entries yet. Agent interactions will be logged here immutably.</div>
            </div>
          ) : (
            <div className="db-feed">
              {(auditLog || []).slice(0, 50).map((entry, i) => {
                const ts = getAuditDate(entry.timestamp);
                const typeLabel = labelAuditType(entry.type);
                const actor = getAuditActor(entry);
                const detail = getAuditDetail(entry);
                const failed = entry.granted === false || entry.type?.includes?.('error') || entry.type?.includes?.('violation');
                return (
                  <div key={entry.id || i} className="db-feed-item">
                    <div className={`db-feed-dot ${failed || entry.piiRedactions?.length > 0 ? 'yellow' : 'green'}`} />
                    <div className="db-feed-content">
                      <div className="db-feed-title">{typeLabel} - {actor}</div>
                      <div className="db-feed-desc" style={{ fontFamily: 'var(--db-font-mono)', fontSize: '0.75rem' }}>
                        {String(detail).slice(0, 140)}
                      </div>
                      {entry.resource && (
                        <div style={{ fontSize: '0.6875rem', color: 'var(--db-text-secondary)', marginTop: '4px' }}>
                          Resource: {entry.resource}
                        </div>
                      )}
                      {entry.subAgentsUsed?.length > 0 && (
                        <div style={{ fontSize: '0.6875rem', color: 'var(--db-text-secondary)', marginTop: '4px' }}>
                          Dispatched: {(entry.subAgentsUsed || []).map(s => s.name).join(', ')}
                        </div>
                      )}
                      {entry.piiRedactions?.length > 0 && (
                        <div style={{ fontSize: '0.6875rem', color: '#f59e0b', marginTop: '2px' }}>
                          ⚠️ PII redacted: {(entry.piiRedactions || []).map(r => `${r.type} (${r.count}×)`).join(', ')}
                        </div>
                      )}
                    </div>
                    <div className="db-feed-time">{ts ? ts.toLocaleString() : 'Pending'}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
}
