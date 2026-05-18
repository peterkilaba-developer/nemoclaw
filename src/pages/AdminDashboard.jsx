import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, Bot, DollarSign, Users, Shield, Activity,
  Server, BarChart3, TrendingUp, AlertTriangle, CheckCircle2,
  Clock, ArrowUpRight, ArrowDownRight, Zap, Globe, FileText, Megaphone,
  Scale, FlaskConical, UserCog, Cpu, Sparkles,
  PanelLeft, RefreshCw, ExternalLink, Rocket, Crown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GTMAgent from './admin/GTMAgent';
import { getInternalAgentStates, getInternalAuditLog, getPendingEscalations } from '../lib/internalAgentAPI';
import { INTERNAL_AGENT_REGISTRY, getInternalAgentById, getInternalAgentState } from '../lib/internalAgentRegistry';
import { auth } from '../lib/firebase';
import CorporateStrategy from './admin/CorporateStrategy';
import CEAChat from './admin/CEAChat';

const ICON_COMPONENTS = {
  Activity,
  BarChart3,
  Bot,
  Cpu,
  Crown,
  DollarSign,
  FileText,
  FlaskConical,
  Globe,
  Megaphone,
  Scale,
  Server,
  Shield,
  Sparkles,
  TrendingUp,
  UserCog,
  Users,
};

const NAV_ITEMS = [
  { id: 'cea-chat', Icon: Crown, label: 'C.E.A. Chat', accent: true },
  { id: 'overview', Icon: LayoutDashboard, label: 'COO Overview' },
  { id: 'strategy', Icon: Sparkles, label: 'Strategic Briefing', accent: true },
  { id: 'gtm', Icon: Rocket, label: 'GTM & Conversion', accent: true },
  { id: 'agents', Icon: Bot, label: 'Agentic Resource' },
  { id: 'revenue', Icon: DollarSign, label: 'Revenue' },
  { id: 'users', Icon: Users, label: 'Users & Accounts' },
  { id: 'system', Icon: Server, label: 'System Health' },
  { id: 'security', Icon: Shield, label: 'Security & Compliance' },
];

function getTelemetryMetrics(agent, live = null) {
  const metrics = live?.metrics && typeof live.metrics === 'object' ? live.metrics : {};
  const entries = Object.entries(metrics).filter(([, value]) => value !== undefined && value !== null && value !== '');
  const [label, value] = entries[0] || [];

  return {
    primary: value !== undefined ? String(value) : 'No signal',
    label: label || 'Live telemetry',
    secondary: entries[1] ? `${entries[1][0]}: ${entries[1][1]}` : 'Awaiting Firestore state',
    trend: typeof metrics.trend === 'number' ? metrics.trend : null,
  };
}

const AGENTIC_RESOURCES = INTERNAL_AGENT_REGISTRY.map((agent) => ({
  ...agent,
  icon: ICON_COMPONENTS[agent.icon] || Bot,
  desc: agent.description,
  metrics: getTelemetryMetrics(agent),
  lastActionTime: 'no live state',
}));

async function fetchAdminSnapshot() {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Admin authentication required.');

  const token = await currentUser.getIdToken();
  const response = await fetch('/api/getAdminSnapshot', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Admin snapshot failed (${response.status})`);
  return payload;
}

function normalizeTime(value) {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  if (value._seconds) return new Date(value._seconds * 1000);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function asPercent(value) {
  return typeof value === 'number' ? `${value}%` : 'No signal';
}

function formatCurrency(cents, emptyLabel = 'Unavailable') {
  if (typeof cents !== 'number') return emptyLabel;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

function formatNumber(value, emptyLabel = 'Unavailable') {
  if (typeof value !== 'number') return emptyLabel;
  return new Intl.NumberFormat('en-US').format(value);
}

function formatDurationMs(value) {
  return typeof value === 'number' ? `${Math.round(value)}ms` : 'Unavailable';
}

function formatMonth(value) {
  const date = normalizeTime(value);
  if (!date) return 'Unknown';
  return date.toLocaleDateString([], { month: 'short', year: 'numeric' });
}

export default function AdminDashboard() {
  const [page, setPage] = useState('cea-chat');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [liveAgentStates, setLiveAgentStates] = useState({});
  const [liveAuditLog, setLiveAuditLog] = useState([]);
  const [liveEscalations, setLiveEscalations] = useState([]);
  const [adminSnapshot, setAdminSnapshot] = useState(null);
  const [snapshotError, setSnapshotError] = useState('');
  const [lastSync, setLastSync] = useState(null);
  const navigate = useNavigate();

  const syncLiveData = useCallback(async () => {
    const [states, audit, escs, snapshot] = await Promise.allSettled([
      getInternalAgentStates(),
      getInternalAuditLog(30),
      getPendingEscalations(),
      fetchAdminSnapshot(),
    ]);

    if (states.status === 'fulfilled') setLiveAgentStates(states.value);
    if (audit.status === 'fulfilled') setLiveAuditLog(audit.value);
    if (escs.status === 'fulfilled') setLiveEscalations(escs.value);
    if (snapshot.status === 'fulfilled') {
      setAdminSnapshot(snapshot.value);
      setSnapshotError('');
    } else {
      setSnapshotError(snapshot.reason?.message || 'Admin snapshot unavailable.');
    }
    setLastSync(new Date());
  }, []);

  useEffect(() => {
    const initialSync = setTimeout(syncLiveData, 0);
    const interval = setInterval(syncLiveData, 15000);
    return () => {
      clearTimeout(initialSync);
      clearInterval(interval);
    };
  }, [syncLiveData]);

  const mergedAgents = AGENTIC_RESOURCES.map((agent) => {
    const live = getInternalAgentState(liveAgentStates, agent);
    if (!live) return agent;
    return {
      ...agent,
      status: live.status || agent.status,
      health: typeof live.health === 'number' ? live.health : agent.health,
      tasks24h: typeof live.tasks24h === 'number' ? live.tasks24h : agent.tasks24h,
      resolved: typeof live.resolved === 'number' ? live.resolved : agent.resolved,
      metrics: getTelemetryMetrics(agent, live),
      lastAction: live.lastAction || agent.lastAction,
      lastActionTime: live.lastActionTime || (normalizeTime(live.lastUpdated) ? formatTimeAgo(normalizeTime(live.lastUpdated)) : agent.lastActionTime),
      telemetrySource: 'firestore',
    };
  });

  const mergedEscalations = liveEscalations.map((e) => ({
    severity: e.severity || 'medium',
    title: e.title || 'Untitled escalation',
    agent: e.agentName || getInternalAgentById(e.agentId)?.abbr || e.agentId || 'Agent',
    time: normalizeTime(e.createdAt) ? formatTimeAgo(normalizeTime(e.createdAt)) : 'unknown',
    desc: e.description || e.desc || '',
    id: e.id,
  }));

  const mergedActivityFeed = liveAuditLog.map((entry) => {
    const agent = getInternalAgentById(entry.agentId || 'cea');
    return {
      agent: agent.abbr,
      action: entry.agentResponse?.slice(0, 160) || entry.userMessage?.slice(0, 160) || 'Logged agent action',
      time: normalizeTime(entry.timestamp) ? formatTimeAgo(normalizeTime(entry.timestamp)) : 'unknown',
      type: entry.department === 'engineering' ? 'warning' : 'info',
    };
  });

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0a0e17', color: '#e2e8f0', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <div style={{
        width: sidebarOpen ? '240px' : '60px', minWidth: sidebarOpen ? '240px' : '60px',
        background: '#0d1117', borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column', transition: 'all 0.3s ease',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: sidebarOpen ? '20px 16px' : '20px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <img src="/logos/claw-64-transparent.png" alt="" style={{ width: '36px', height: '36px', objectFit: 'contain', flexShrink: 0 }} />
          {sidebarOpen && (
            <div>
              <img src="/logos/wordmark.svg" alt="NemoC LAW AI" style={{ height: '24px', objectFit: 'contain', display: 'block' }} />
              <div style={{ fontSize: '0.5625rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '2px' }}>Admin Console</div>
            </div>
          )}
        </div>

        <div style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => setPage(item.id)} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: sidebarOpen ? '10px 12px' : '10px 14px', border: 'none', borderRadius: '8px',
              background: page === item.id ? 'rgba(118,185,0,0.12)' : 'transparent',
              color: page === item.id ? '#76b900' : 'rgba(255,255,255,0.5)',
              cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600,
              transition: 'all 0.15s', justifyContent: sidebarOpen ? 'flex-start' : 'center',
            }}>
              <item.Icon size={16} />
              {sidebarOpen && item.label}
            </button>
          ))}
        </div>

        <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={() => navigate('/dashboard')} style={{
            display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
            padding: '8px 12px', border: '1px solid rgba(118,185,0,0.3)', borderRadius: '8px',
            background: 'rgba(118,185,0,0.08)', color: '#76b900', cursor: 'pointer',
            fontSize: '0.75rem', fontWeight: 600, justifyContent: sidebarOpen ? 'flex-start' : 'center',
            transition: 'all 0.15s'
          }}>
            <ExternalLink size={14} />
            {sidebarOpen && 'Enter Practice Mode'}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{
          padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(13,17,23,0.8)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '4px',
            }}>
              <PanelLeft size={18} />
            </button>
            <div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff' }}>
                {NAV_ITEMS.find(n => n.id === page)?.label || 'COO Overview'}
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.35)' }}>
                Platform Administration - Last sync: {lastSync ? formatTimeAgo(lastSync) : 'syncing...'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <StatusPill label={snapshotError ? 'Snapshot degraded' : 'Live snapshot'} color={snapshotError ? '#f59e0b' : '#16a34a'} />
            <button onClick={syncLiveData} style={{
              padding: '6px 12px', border: '1px solid rgba(118,185,0,0.3)', borderRadius: '8px',
              background: 'rgba(118,185,0,0.08)', color: '#76b900', cursor: 'pointer',
              fontSize: '0.6875rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px',
            }}>
              <RefreshCw size={12} /> Sync
            </button>
          </div>
        </div>

        <div style={{ padding: '24px' }}>
          {snapshotError && <SystemNotice message={snapshotError} />}
          {page === 'overview' && <CooOverview agents={mergedAgents} activityFeed={mergedActivityFeed} escalations={mergedEscalations} snapshot={adminSnapshot} />}
          {page === 'strategy' && <CorporateStrategy />}
          {page === 'cea-chat' && <CEAChat />}
          {page === 'gtm' && <GTMAgent />}
          {page === 'agents' && <AgenticResourceView agents={mergedAgents} />}
          {page === 'revenue' && <RevenuePage snapshot={adminSnapshot} />}
          {page === 'users' && <UsersPage snapshot={adminSnapshot} />}
          {page === 'system' && <SystemPage snapshot={adminSnapshot} />}
          {page === 'security' && <SecurityPage snapshot={adminSnapshot} />}
        </div>
      </div>
    </div>
  );
}

function CooOverview({ agents, activityFeed, escalations, snapshot }) {
  const activeAgents = agents.filter(a => a.status === 'active').length;
  const measuredHealth = agents.map(a => a.health).filter(value => typeof value === 'number');
  const avgHealth = measuredHealth.length
    ? `${Math.round(measuredHealth.reduce((a, b) => a + b, 0) / measuredHealth.length)}%`
    : 'No signal';
  const taskCount = agents.reduce((a, b) => a + (Number(b.tasks24h) || 0), 0);

  return (
    <>
      <div style={{
        background: 'linear-gradient(135deg, rgba(118,185,0,0.08) 0%, rgba(10,14,23,0) 60%)',
        border: '1px solid rgba(118,185,0,0.15)', borderRadius: '16px',
        padding: '24px 28px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #76b900, #4a7a00)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Cpu size={28} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>C.O.O. Agent <span style={{ color: activeAgents ? '#76b900' : '#f59e0b' }}>{activeAgents ? 'Reporting' : 'Awaiting Telemetry'}</span></div>
            <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)' }}>
              Orchestrating {activeAgents} active agentic resources - Platform health: {avgHealth}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <StatusPill label={`${activeAgents}/${agents.length} Active`} color={activeAgents ? '#76b900' : '#f59e0b'} />
          <StatusPill label={`${escalations.length} Escalations`} color={escalations.some(e => e.severity === 'high') ? '#f59e0b' : '#16a34a'} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <KpiCard label="Monthly Revenue" value={formatCurrency(snapshot?.revenue?.mrrCents)} sub={snapshot?.revenue?.source || 'Firestore/Stripe records'} icon={DollarSign} color="#76b900" />
        <KpiCard label="Total Users" value={formatNumber(snapshot?.accounts?.totalUsers)} sub="Firebase user profiles" icon={Users} color="#3b82f6" />
        <KpiCard label="Agent Tasks (24h)" value={formatNumber(taskCount, '0')} sub="Recorded telemetry" icon={Zap} color="#a78bfa" />
        <KpiCard label="P95 Latency" value={formatDurationMs(snapshot?.system?.p95LatencyMs)} sub="Telemetry logs" icon={Clock} color="#f59e0b" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '20px', marginBottom: '24px' }}>
        <Card title="Agentic Resource Status" subtitle={`${activeAgents} active, ${agents.length - activeAgents} awaiting telemetry`}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {agents.map(agent => (
              <AgentMiniCard key={agent.id} agent={agent} />
            ))}
          </div>
        </Card>

        <Card title="Live Activity Feed" subtitle="Firestore _internalAuditLog">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0', maxHeight: '460px', overflow: 'auto' }}>
            {activityFeed.length > 0 ? activityFeed.map((item, i) => (
              <FeedRow key={`${item.agent}-${item.time}-${i}`} item={item} isLast={i === activityFeed.length - 1} />
            )) : <EmptyState label="No internal audit events have been recorded yet." />}
          </div>
        </Card>
      </div>

      <Card title="Escalation Queue" subtitle="Firestore _internalEscalations">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {escalations.length > 0 ? escalations.map((esc) => (
            <EscalationRow key={esc.id || `${esc.agent}-${esc.title}`} esc={esc} />
          )) : <EmptyState label="No pending escalations." />}
        </div>
      </Card>
    </>
  );
}

function AgenticResourceView({ agents }) {
  return (
    <>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#76b900', marginBottom: '4px' }}>Autonomous Operations</div>
        <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)' }}>The registry defines the 13-agent operating model. Metrics below are shown only when live telemetry exists.</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
        {agents.map(agent => (
          <AgentDetailCard key={agent.id} agent={agent} />
        ))}
      </div>
    </>
  );
}

function RevenuePage({ snapshot }) {
  const revenue = snapshot?.revenue || {};
  const plans = revenue.plans || [];
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <KpiCard label="MRR" value={formatCurrency(revenue.mrrCents)} sub={revenue.source || 'Live billing records'} icon={DollarSign} color="#76b900" />
        <KpiCard label="ARR" value={formatCurrency(revenue.arrCents)} sub="Derived from MRR" icon={TrendingUp} color="#3b82f6" />
        <KpiCard label="ARPU" value={formatCurrency(revenue.arpuCents)} sub="Per firm average" icon={Users} color="#a78bfa" />
        <KpiCard label="Paid Firms" value={formatNumber(revenue.paidFirmCount)} sub="Active subscriptions" icon={CheckCircle2} color="#f59e0b" />
      </div>
      <Card title="Revenue by Plan" subtitle="Live subscription breakdown">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {plans.length > 0 ? plans.map(p => (
            <div key={p.name} style={{
              display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px',
              background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff' }}>{p.name}</div>
                <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', marginTop: '8px' }}>
                  <div style={{ width: `${Math.max(0, Math.min(100, p.pct || 0))}%`, height: '100%', background: '#76b900', borderRadius: '2px', transition: 'width 0.5s' }} />
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#76b900' }}>{formatCurrency(p.mrrCents, '$0')}</div>
                <div style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)' }}>{formatNumber(p.firms, '0')} firms</div>
              </div>
            </div>
          )) : <EmptyState label="No paid subscription records were found." />}
        </div>
      </Card>
    </>
  );
}

function UsersPage({ snapshot }) {
  const accounts = snapshot?.accounts || {};
  const firms = accounts.firms || [];
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <KpiCard label="Total Accounts" value={formatNumber(accounts.totalAccounts)} sub="Firm documents" icon={Users} color="#3b82f6" />
        <KpiCard label="Active Users" value={formatNumber(accounts.activeUsers30d)} sub="Last 30 days" icon={Activity} color="#76b900" />
        <KpiCard label="Onboarding Rate" value={typeof accounts.onboardingRatePct === 'number' ? `${accounts.onboardingRatePct}%` : 'Unavailable'} sub="Completed firms" icon={CheckCircle2} color="#a78bfa" />
        <KpiCard label="Trial Accounts" value={formatNumber(accounts.trialAccounts)} sub="Trial plan/status" icon={Clock} color="#f59e0b" />
      </div>
      <Card title="Account List" subtitle="Latest firms from Firestore">
        <div style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Firm', 'Plan', 'Status', 'Members', 'Matters', 'Since'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {firms.length > 0 ? firms.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px 12px', fontSize: '0.8125rem', fontWeight: 600, color: '#fff' }}>{u.name || 'Unnamed firm'}</td>
                  <td style={{ padding: '10px 12px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>{u.plan || 'Unspecified'}</td>
                  <td style={{ padding: '10px 12px' }}><StatusPill label={u.status || 'unknown'} color={u.status === 'active' ? '#16a34a' : u.status === 'trial' ? '#f59e0b' : '#64748b'} /></td>
                  <td style={{ padding: '10px 12px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>{formatNumber(u.memberCount, '0')}</td>
                  <td style={{ padding: '10px 12px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>{formatNumber(u.matterCount, '0')}</td>
                  <td style={{ padding: '10px 12px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{formatMonth(u.createdAt)}</td>
                </tr>
              )) : (
                <tr><td colSpan={6}><EmptyState label="No firm account records were found." /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function SystemPage({ snapshot }) {
  const system = snapshot?.system || {};
  const services = system.services || [];
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <KpiCard label="Snapshot Age" value={system.generatedAt ? formatTimeAgo(new Date(system.generatedAt)) : 'Unavailable'} sub="Admin function" icon={Activity} color="#16a34a" />
        <KpiCard label="API Events (24h)" value={formatNumber(system.telemetryEvents24h)} sub="Telemetry logs" icon={Zap} color="#3b82f6" />
        <KpiCard label="Error Rate" value={typeof system.errorRatePct === 'number' ? `${system.errorRatePct}%` : 'Unavailable'} sub="Telemetry logs" icon={AlertTriangle} color="#f59e0b" />
        <KpiCard label="P95 Latency" value={formatDurationMs(system.p95LatencyMs)} sub="Observed calls" icon={Clock} color="#a78bfa" />
      </div>
      <Card title="Service Status" subtitle="Live platform checks and telemetry">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {services.length > 0 ? services.map(s => (
            <div key={s.name} style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
              background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: s.status === 'operational' ? '#16a34a' : s.status === 'degraded' ? '#f59e0b' : '#64748b',
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fff' }}>{s.name}</div>
                <div style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.35)' }}>{s.source || 'not reported'}</div>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', width: '80px' }}>{s.uptime || 'n/a'}</span>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', width: '60px' }}>{s.latencyMs ? `${s.latencyMs}ms` : 'n/a'}</span>
              <StatusPill label={s.status || 'unknown'} color={s.status === 'operational' ? '#16a34a' : s.status === 'degraded' ? '#f59e0b' : '#64748b'} />
            </div>
          )) : <EmptyState label="No service telemetry has been reported." />}
        </div>
      </Card>
    </>
  );
}

function SecurityPage({ snapshot }) {
  const security = snapshot?.security || {};
  const controls = security.controls || [];
  const recentThreats = security.recentThreats || [];
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <KpiCard label="Blocked Events" value={formatNumber(security.blockedEvents24h, '0')} sub="Security logs, 24h" icon={Shield} color="#dc2626" />
        <KpiCard label="Controls Ready" value={formatNumber(security.readyControls)} sub="Configured controls" icon={CheckCircle2} color="#16a34a" />
        <KpiCard label="Active Incidents" value={formatNumber(security.activeIncidents, '0')} sub="Open security events" icon={AlertTriangle} color="#76b900" />
        <KpiCard label="Audit Events" value={formatNumber(security.auditEvents24h, '0')} sub="Internal audit, 24h" icon={FileText} color="#3b82f6" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <Card title="Compliance Controls" subtitle="Configured production controls">
          {controls.length > 0 ? controls.map((item, i) => (
            <div key={item.name} style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0',
              borderBottom: i < controls.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}>
              <CheckCircle2 size={14} color={item.ready ? '#16a34a' : '#f59e0b'} />
              <span style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.7)' }}>{item.name}</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.625rem', fontWeight: 700, color: item.ready ? '#16a34a' : '#f59e0b', textTransform: 'uppercase' }}>{item.ready ? 'Ready' : 'Review'}</span>
            </div>
          )) : <EmptyState label="No compliance control snapshot is available." />}
        </Card>
        <Card title="Recent Security Log" subtitle="Firestore _securityLogs">
          {recentThreats.length > 0 ? recentThreats.map((t, i) => (
            <div key={t.id || i} style={{
              display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '8px 0',
              borderBottom: i < recentThreats.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}>
              <Shield size={12} color={t.type === 'blocked' ? '#dc2626' : '#f59e0b'} style={{ marginTop: '3px' }} />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>{t.description || 'Security event'}</div>
                <div style={{ fontSize: '0.5625rem', color: 'rgba(255,255,255,0.3)' }}>{t.type || 'event'} - {normalizeTime(t.timestamp) ? formatTimeAgo(normalizeTime(t.timestamp)) : 'unknown'}</div>
              </div>
            </div>
          )) : <EmptyState label="No security events recorded in the selected window." />}
        </Card>
      </div>
    </>
  );
}

function Card({ title, subtitle, children }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '12px', padding: '20px', marginBottom: '16px',
    }}>
      {title && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff' }}>{title}</div>
          {subtitle && <div style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)' }}>{subtitle}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

function KpiCard({ label, value, trend = null, sub, icon: Icon, color, invertTrend }) {
  const hasTrend = typeof trend === 'number';
  const isPositive = invertTrend ? trend < 0 : trend > 0;
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '12px', padding: '18px 20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color={color} />
        </div>
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {hasTrend && (
          <span style={{
            fontSize: '0.625rem', fontWeight: 700,
            color: isPositive ? '#16a34a' : '#dc2626',
            display: 'flex', alignItems: 'center', gap: '2px',
          }}>
            {isPositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
            {Math.abs(trend)}%
          </span>
        )}
        <span style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.3)' }}>{sub}</span>
      </div>
    </div>
  );
}

function AgentMiniCard({ agent }) {
  const Icon = agent.icon;
  const isOC = agent.ofCounsel;
  const hasTelemetry = agent.telemetrySource === 'firestore';
  const cardBg = isOC ? 'rgba(245,158,11,0.06)' : hasTelemetry ? 'rgba(118,185,0,0.04)' : 'rgba(255,255,255,0.02)';
  const cardBorder = isOC ? 'rgba(245,158,11,0.2)' : hasTelemetry ? 'rgba(118,185,0,0.1)' : 'rgba(255,255,255,0.06)';
  const iconBg = isOC ? 'rgba(245,158,11,0.15)' : hasTelemetry ? 'rgba(118,185,0,0.12)' : 'rgba(255,255,255,0.06)';
  const iconColor = isOC ? '#f59e0b' : hasTelemetry ? '#76b900' : '#64748b';
  return (
    <div style={{ padding: '12px', borderRadius: '10px', background: cardBg, border: `1px solid ${cardBorder}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '7px',
          background: iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={14} color={iconColor} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{agent.name}</div>
          {isOC && <div style={{ fontSize: '0.5rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Of Counsel</div>}
        </div>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: agent.status === 'active' ? '#16a34a' : '#64748b' }} />
      </div>
      <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#fff' }}>{agent.metrics.primary}</div>
      <div style={{ fontSize: '0.5625rem', color: 'rgba(255,255,255,0.4)' }}>{agent.metrics.label}</div>
    </div>
  );
}

function AgentDetailCard({ agent }) {
  const Icon = agent.icon;
  const isOC = agent.ofCounsel;
  const hasTelemetry = agent.telemetrySource === 'firestore';
  return (
    <div style={{
      padding: '20px', borderRadius: '12px',
      background: isOC ? 'rgba(245,158,11,0.04)' : 'rgba(255,255,255,0.02)',
      border: `1px solid ${isOC ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.06)'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '10px',
          background: isOC ? 'rgba(245,158,11,0.15)' : hasTelemetry ? 'rgba(118,185,0,0.12)' : 'rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={20} color={isOC ? '#f59e0b' : hasTelemetry ? '#76b900' : '#64748b'} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff' }}>{agent.name}</span>
            <StatusPill label={agent.status} color={agent.status === 'active' ? '#16a34a' : '#64748b'} />
            {isOC && <StatusPill label="Of Counsel" color="#f59e0b" />}
          </div>
          <div style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)' }}>{agent.desc}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>{agent.metrics.primary}</div>
          <div style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.4)' }}>{agent.metrics.label}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
        <MiniStat label="Tasks (24h)" value={formatNumber(agent.tasks24h, '0')} />
        <MiniStat label="Resolved" value={formatNumber(agent.resolved, '0')} />
        <MiniStat label="Health" value={asPercent(agent.health)} />
        <MiniStat label="Secondary" value={agent.metrics.secondary} />
      </div>
      <div style={{
        padding: '8px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.04)', fontSize: '0.6875rem', color: 'rgba(255,255,255,0.5)',
        display: 'flex', alignItems: 'center', gap: '6px',
      }}>
        <Activity size={10} color={hasTelemetry ? '#76b900' : '#64748b'} />
        <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>Last:</span> {agent.lastAction}
        <span style={{ marginLeft: 'auto', fontSize: '0.5625rem', color: 'rgba(255,255,255,0.3)' }}>{agent.lastActionTime}</span>
      </div>
    </div>
  );
}

function FeedRow({ item, isLast }) {
  return (
    <div style={{ padding: '10px 0', borderBottom: !isLast ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
        <div style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: item.type === 'success' ? '#16a34a' : item.type === 'warning' ? '#f59e0b' : item.type === 'alert' ? '#dc2626' : '#64748b',
        }} />
        <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#76b900' }}>{item.agent}</span>
        <span style={{ fontSize: '0.5625rem', color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>{item.time}</span>
      </div>
      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', paddingLeft: '12px', lineHeight: 1.4 }}>{item.action}</div>
    </div>
  );
}

function EscalationRow({ esc }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '12px',
      padding: '14px 16px', borderRadius: '10px',
      background: esc.severity === 'high' ? 'rgba(245,158,11,0.06)' : esc.severity === 'medium' ? 'rgba(59,130,246,0.06)' : 'rgba(255,255,255,0.02)',
      border: `1px solid ${esc.severity === 'high' ? 'rgba(245,158,11,0.15)' : esc.severity === 'medium' ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.06)'}`,
    }}>
      <AlertTriangle size={16} color={esc.severity === 'high' ? '#f59e0b' : esc.severity === 'medium' ? '#3b82f6' : '#64748b'} style={{ marginTop: '2px', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#fff' }}>{esc.title}</span>
          <span style={{
            padding: '1px 6px', borderRadius: '4px', fontSize: '0.5625rem', fontWeight: 700,
            textTransform: 'uppercase',
            background: esc.severity === 'high' ? 'rgba(245,158,11,0.15)' : esc.severity === 'medium' ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.06)',
            color: esc.severity === 'high' ? '#f59e0b' : esc.severity === 'medium' ? '#3b82f6' : '#94a3b8',
          }}>{esc.severity}</span>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>{esc.desc}</div>
        <div style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.3)' }}>via {esc.agent} - {esc.time}</div>
      </div>
      <button style={{
        padding: '6px 12px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px',
        background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
        fontSize: '0.6875rem', fontWeight: 600, flexShrink: 0,
      }}>Review</button>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: '0.5625rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>{value}</div>
    </div>
  );
}

function StatusPill({ label, color }) {
  return (
    <span style={{
      padding: '2px 8px', borderRadius: '6px', fontSize: '0.5625rem', fontWeight: 700,
      textTransform: 'capitalize',
      background: `${color}15`, color: color, border: `1px solid ${color}30`,
    }}>{label}</span>
  );
}

function EmptyState({ label }) {
  return (
    <div style={{ padding: '18px', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '8px', color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem', textAlign: 'center' }}>
      {label}
    </div>
  );
}

function SystemNotice({ message }) {
  return (
    <div style={{ padding: '12px 14px', marginBottom: '16px', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '8px', background: 'rgba(245,158,11,0.06)', color: '#fbbf24', fontSize: '0.75rem' }}>
      {message}
    </div>
  );
}

function formatTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 10) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${diffDay}d ago`;
}
