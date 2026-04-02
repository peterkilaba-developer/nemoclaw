import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, Bot, DollarSign, Users, Shield, Activity,
  Server, BarChart3, TrendingUp, AlertTriangle, CheckCircle2,
  Clock, ArrowUpRight, ArrowDownRight, Zap, Eye, Settings,
  Bell, LogOut, ChevronRight, Globe, FileText, Megaphone,
  HeadphonesIcon, Scale, FlaskConical, UserCog, Cpu, Sparkles,
  PanelLeft, RefreshCw, Circle, ExternalLink, ChevronDown, Rocket, Crown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GTMAgent from './admin/GTMAgent';
import { getInternalAgentStates, getInternalAuditLog, getPendingEscalations, resolveEscalation } from '../lib/internalAgentAPI';

/* ═══════════════════════════════════════════════════════════════
   AGENTIC RESOURCE DATA — 13 autonomous agents + COO
   ═══════════════════════════════════════════════════════════════ */
const AGENTIC_RESOURCES = [
  {
    id: 'revenue', name: 'Revenue Ops', icon: DollarSign, status: 'active',
    desc: 'Stripe billing, subscriptions, MRR/ARR tracking, invoicing',
    metrics: { primary: '$4,200', label: 'MRR', secondary: '$50.4K ARR', trend: +12.3 },
    lastAction: 'Processed 3 new subscriptions', lastActionTime: '2m ago',
    tasks24h: 47, resolved: 45, health: 96,
  },
  {
    id: 'customer-success', name: 'Customer Success', icon: Users, status: 'active',
    desc: 'Onboarding tracking, health scoring, churn prevention',
    metrics: { primary: '94%', label: 'Health Score', secondary: '2.1% churn', trend: +3.2 },
    lastAction: 'Flagged 2 at-risk accounts for outreach', lastActionTime: '8m ago',
    tasks24h: 31, resolved: 29, health: 94,
  },
  {
    id: 'support', name: 'Support Ops', icon: HeadphonesIcon, status: 'active',
    desc: 'Ticket routing, auto-resolution, SLA monitoring',
    metrics: { primary: '< 4min', label: 'Avg Response', secondary: '3 open tickets', trend: -18.5 },
    lastAction: 'Auto-resolved billing inquiry #1247', lastActionTime: '12m ago',
    tasks24h: 23, resolved: 21, health: 91,
  },
  {
    id: 'devops', name: 'DevOps & Infra', icon: Server, status: 'active',
    desc: 'Uptime monitoring, CI/CD pipeline, Firebase scaling',
    metrics: { primary: '99.97%', label: 'Uptime', secondary: '14 deploys today', trend: +0.02 },
    lastAction: 'Deployed v2.4.1 to production', lastActionTime: '18m ago',
    tasks24h: 14, resolved: 14, health: 99,
  },
  {
    id: 'security', name: 'Security Ops', icon: Shield, status: 'active',
    desc: 'Threat detection, access control, audit logging',
    metrics: { primary: '0', label: 'Active Threats', secondary: '847 blocked today', trend: -100 },
    lastAction: 'Blocked brute-force attempt from 203.x.x.x', lastActionTime: '23m ago',
    tasks24h: 847, resolved: 847, health: 100,
  },
  {
    id: 'compliance', name: 'Compliance', icon: Scale, status: 'active',
    desc: 'GDPR, SOC2, ABA ethics monitoring, policy enforcement',
    metrics: { primary: '98%', label: 'Compliance Score', secondary: '0 violations', trend: +1.5 },
    lastAction: 'Completed weekly GDPR audit scan', lastActionTime: '1h ago',
    tasks24h: 8, resolved: 8, health: 98,
  },
  {
    id: 'marketing', name: 'Growth Marketing', icon: Megaphone, status: 'active',
    desc: 'Campaign management, SEO optimization, funnel analytics',
    metrics: { primary: '$42', label: 'CAC', secondary: '3.2% conversion', trend: -8.1 },
    lastAction: 'Launched retargeting campaign for trial users', lastActionTime: '35m ago',
    tasks24h: 19, resolved: 17, health: 89,
  },
  {
    id: 'sales', name: 'Sales Pipeline', icon: TrendingUp, status: 'active',
    desc: 'Lead qualification, demo scheduling, pipeline management',
    metrics: { primary: '$127K', label: 'Pipeline Value', secondary: '34% win rate', trend: +22.0 },
    lastAction: 'Qualified 5 new enterprise leads', lastActionTime: '45m ago',
    tasks24h: 12, resolved: 10, health: 85,
  },
  {
    id: 'analytics', name: 'Analytics & Reporting', icon: BarChart3, status: 'active',
    desc: 'KPI dashboards, daily/weekly reports, trend analysis',
    metrics: { primary: '24', label: 'Reports Today', secondary: '100% on time', trend: +6.0 },
    lastAction: 'Generated weekly MRR cohort analysis', lastActionTime: '1h ago',
    tasks24h: 24, resolved: 24, health: 100,
  },
  {
    id: 'content', name: 'Content & KB', icon: FileText, status: 'standby',
    desc: 'Documentation, help articles, changelog management',
    metrics: { primary: '47', label: 'Articles', secondary: '92% search success', trend: +2.0 },
    lastAction: 'Updated API documentation v2.4', lastActionTime: '3h ago',
    tasks24h: 4, resolved: 4, health: 92,
  },
  {
    id: 'qa', name: 'QA Agent', icon: FlaskConical, status: 'standby',
    desc: 'Automated testing, bug detection, regression monitoring',
    metrics: { primary: '99.2%', label: 'Tests Passing', secondary: '2 flaky tests', trend: +0.4 },
    lastAction: 'Ran full regression suite (847 tests)', lastActionTime: '2h ago',
    tasks24h: 6, resolved: 5, health: 95,
  },
  {
    id: 'hr', name: 'HR Ops', icon: UserCog, status: 'standby',
    desc: 'Contractor management, payroll processing, scheduling',
    metrics: { primary: '3', label: 'Team Size', secondary: '94% utilization', trend: 0 },
    lastAction: 'Processed monthly contractor payments', lastActionTime: '1d ago',
    tasks24h: 2, resolved: 2, health: 88,
  },
  {
    id: 'chief-of-staff', name: 'Chief of Staff', icon: Scale, status: 'active',
    desc: 'Strategic coordination, executive briefings, cross-agent orchestration',
    metrics: { primary: '14', label: 'Briefings Today', secondary: '100% on time', trend: +4.0 },
    lastAction: 'Synthesized weekly C-Suite executive summary', lastActionTime: '30m ago',
    tasks24h: 18, resolved: 18, health: 100,
  },
];

const ACTIVITY_FEED = [
  { agent: 'Revenue Ops', action: 'New subscription: Anderson & Associates Law (Base Plan, $297/mo)', time: '2m ago', type: 'success' },
  { agent: 'Security Ops', action: 'Blocked 23 suspicious login attempts from IP range 203.0.113.x', time: '8m ago', type: 'warning' },
  { agent: 'Customer Success', action: 'At-risk alert: Smith Legal Group - no login in 14 days, sending re-engagement', time: '12m ago', type: 'alert' },
  { agent: 'DevOps & Infra', action: 'Deployed v2.4.1 to production - 0 errors, all health checks passed', time: '18m ago', type: 'success' },
  { agent: 'Support Ops', action: 'Auto-resolved ticket #1247: "How to add practice areas" - sent KB article', time: '22m ago', type: 'info' },
  { agent: 'Sales Pipeline', action: 'Enterprise lead qualified: Davis & Partners LLP (est. deal: $24K/yr)', time: '28m ago', type: 'success' },
  { agent: 'Growth Marketing', action: 'Retargeting campaign launched: 1,200 trial users, est. 3.4% conversion', time: '35m ago', type: 'info' },
  { agent: 'Compliance', action: 'Weekly GDPR audit complete: 0 violations, all data handling compliant', time: '1h ago', type: 'success' },
  { agent: 'Analytics', action: 'Weekly cohort report generated: 12% improvement in Day-7 retention', time: '1h ago', type: 'info' },
  { agent: 'QA Agent', action: 'Full regression suite passed: 847/849 tests (2 flaky, auto-retry scheduled)', time: '2h ago', type: 'info' },
  { agent: 'Content & KB', action: 'Published: "Getting Started with Website Builder" - 3 min read', time: '3h ago', type: 'info' },
  { agent: 'Revenue Ops', action: 'Monthly invoice batch sent: 47 invoices, $8,341 total', time: '4h ago', type: 'success' },
];

const ESCALATIONS = [
  { severity: 'high', title: 'Enterprise client requesting custom SLA terms', agent: 'Sales Pipeline', time: '15m ago', desc: 'Davis & Partners LLP requires 99.99% uptime guarantee and dedicated support.' },
  { severity: 'medium', title: 'Spike in failed payment retries', agent: 'Revenue Ops', time: '1h ago', desc: '3 accounts with expired cards. Auto-retry scheduled, dunning emails queued.' },
  { severity: 'low', title: 'Feature request: Multi-language support', agent: 'Customer Success', time: '3h ago', desc: '4 firms requested Spanish language support for client-facing websites.' },
];

import CorporateStrategy from './admin/CorporateStrategy';
import CEAChat from './admin/CEAChat';

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

export default function AdminDashboard() {
  const [page, setPage] = useState('cea-chat');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();

  // ═══ Live Firestore Data ═══
  const [liveAgentStates, setLiveAgentStates] = useState({});
  const [liveAuditLog, setLiveAuditLog] = useState([]);
  const [liveEscalations, setLiveEscalations] = useState([]);
  const [lastSync, setLastSync] = useState(null);

  const syncLiveData = useCallback(async () => {
    try {
      const [states, audit, escs] = await Promise.all([
        getInternalAgentStates(),
        getInternalAuditLog(30),
        getPendingEscalations(),
      ]);
      setLiveAgentStates(states);
      setLiveAuditLog(audit);
      setLiveEscalations(escs);
      setLastSync(new Date());
    } catch (err) {
      console.warn('Live data sync failed, using defaults:', err.message);
    }
  }, []);

  useEffect(() => { 
    syncLiveData(); 
    const interval = setInterval(syncLiveData, 15000); // 15s live heartbeat
    return () => clearInterval(interval);
  }, [syncLiveData]);

  // Merge live data on top of static defaults
  const mergedAgents = AGENTIC_RESOURCES.map(agent => {
    const live = liveAgentStates[agent.id];
    if (!live) return agent;
    return {
      ...agent,
      status: live.status || agent.status,
      health: live.health ?? agent.health,
      tasks24h: live.tasks24h ?? agent.tasks24h,
      resolved: live.resolved ?? agent.resolved,
      metrics: { ...agent.metrics, ...live.metrics },
      lastAction: live.lastAction || agent.lastAction,
      lastActionTime: live.lastActionTime || agent.lastActionTime,
    };
  });

  // Merge escalations: live first, fallback to static
  const mergedEscalations = liveEscalations.length > 0
    ? liveEscalations.map(e => ({
        severity: e.severity || 'medium',
        title: e.title,
        agent: e.agentName || e.agentId,
        time: e.createdAt?.toDate ? formatTimeAgo(e.createdAt.toDate()) : 'just now',
        desc: e.description || e.desc || '',
        id: e.id,
      }))
    : ESCALATIONS;

  // Merge audit feed: live first, fallback to static
  const mergedActivityFeed = liveAuditLog.length > 0
    ? liveAuditLog.map(entry => ({
        agent: entry.agentId || 'C.E.A.',
        action: entry.agentResponse?.slice(0, 120) || entry.userMessage?.slice(0, 120) || 'Agent action',
        time: entry.timestamp?.toDate ? formatTimeAgo(entry.timestamp.toDate()) : 'just now',
        type: entry.department === 'engineering' ? 'warning' : 'info',
      }))
    : ACTIVITY_FEED;

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0a0e17', color: '#e2e8f0', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* ═══ SIDEBAR ═══ */}
      <div style={{
        width: sidebarOpen ? '240px' : '60px', minWidth: sidebarOpen ? '240px' : '60px',
        background: '#0d1117', borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column', transition: 'all 0.3s ease',
        overflow: 'hidden',
      }}>
        {/* Brand */}
        <div style={{
          padding: sidebarOpen ? '20px 16px' : '20px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #76b900 0%, #4a7a00 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.875rem', fontWeight: 800, color: '#fff', flexShrink: 0,
          }}>NC</div>
          {sidebarOpen && (
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#fff' }}>NemoC LAW AI Admin</div>
              <div style={{ fontSize: '0.5625rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>COO Dashboard</div>
            </div>
          )}
        </div>

        {/* Nav */}
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

        {/* Footer */}
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

      {/* ═══ MAIN ═══ */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {/* Top Bar */}
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
                Platform Administration · Last sync: {lastSync ? formatTimeAgo(lastSync) : 'syncing...'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <StatusPill label="All Systems Operational" color="#16a34a" />
            <button onClick={syncLiveData} style={{
              padding: '6px 12px', border: '1px solid rgba(118,185,0,0.3)', borderRadius: '8px',
              background: 'rgba(118,185,0,0.08)', color: '#76b900', cursor: 'pointer',
              fontSize: '0.6875rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px',
            }}>
              <RefreshCw size={12} /> Sync
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {page === 'overview' && <CooOverview agents={mergedAgents} activityFeed={mergedActivityFeed} escalations={mergedEscalations} />}
          {page === 'strategy' && <CorporateStrategy />}
          {page === 'cea-chat' && <CEAChat />}
          {page === 'gtm' && <GTMAgent />}
          {page === 'agents' && <AgenticResourceView agents={mergedAgents} />}
          {page === 'revenue' && <RevenuePage />}
          {page === 'users' && <UsersPage />}
          {page === 'system' && <SystemPage />}
          {page === 'security' && <SecurityPage />}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   COO OVERVIEW PAGE
   ═══════════════════════════════════════════════════════════════ */
function CooOverview({ agents = AGENTIC_RESOURCES, activityFeed = ACTIVITY_FEED, escalations = ESCALATIONS }) {
  const activeAgents = agents.filter(a => a.status === 'active').length;
  const avgHealth = Math.round(agents.reduce((a, b) => a + b.health, 0) / agents.length);

  return (
    <>
      {/* COO Status Banner */}
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
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>C.O.O. Agent <span style={{ color: '#76b900' }}>Online</span></div>
            <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)' }}>
              Orchestrating {activeAgents} agentic resources · Platform health: {avgHealth}%
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <StatusPill label={`${activeAgents}/12 Active`} color="#76b900" />
          <StatusPill label={`${ESCALATIONS.length} Escalations`} color={ESCALATIONS.some(e => e.severity === 'high') ? '#f59e0b' : '#16a34a'} />
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <KpiCard label="Monthly Revenue" value="$4,200" trend={+12.3} sub="MRR" icon={DollarSign} color="#76b900" />
        <KpiCard label="Total Users" value="127" trend={+8.7} sub="Active accounts" icon={Users} color="#3b82f6" />
        <KpiCard label="Agent Tasks (24h)" value={AGENTIC_RESOURCES.reduce((a, b) => a + b.tasks24h, 0).toString()} trend={+5.2} sub="Across all agents" icon={Zap} color="#a78bfa" />
        <KpiCard label="Avg Resolution" value="< 4min" trend={-18.5} sub="Support tickets" icon={Clock} color="#f59e0b" invertTrend />
      </div>

      {/* Agent Fleet Grid + Activity Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '20px', marginBottom: '24px' }}>
        {/* Agentic Resource */}
        <Card title="Agentic Resource Status" subtitle={`${activeAgents} active, ${agents.length - activeAgents} standby`}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {agents.map(agent => (
              <AgentMiniCard key={agent.id} agent={agent} />
            ))}
          </div>
        </Card>

        {/* Activity Feed */}
        <Card title="Live Activity Feed" subtitle="Real-time agent actions">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0', maxHeight: '460px', overflow: 'auto' }}>
            {activityFeed.map((item, i) => (
              <div key={i} style={{
                padding: '10px 0', borderBottom: i < activityFeed.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              }}>
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
            ))}
          </div>
        </Card>
      </div>

      {/* Escalation Queue */}
      <Card title="Escalation Queue" subtitle="Items requiring human review">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {escalations.map((esc, i) => (
            <div key={i} style={{
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
                <div style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.3)' }}>via {esc.agent} · {esc.time}</div>
              </div>
              <button style={{
                padding: '6px 12px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px',
                background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
                fontSize: '0.6875rem', fontWeight: 600, flexShrink: 0,
              }}>Review</button>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   AGENTIC RESOURCE VIEW
   ═══════════════════════════════════════════════════════════════ */
function AgenticResourceView({ agents = AGENTIC_RESOURCES }) {
  return (
    <>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#76b900', marginBottom: '4px' }}>Autonomous Operations</div>
        <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)' }}>Each agentic resource operates autonomously, reporting to the C.O.O. Agent</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
        {agents.map(agent => (
          <AgentDetailCard key={agent.id} agent={agent} />
        ))}
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   REVENUE, USERS, SYSTEM, SECURITY PAGES
   ═══════════════════════════════════════════════════════════════ */
function RevenuePage() {
  const plans = [
    { name: 'Agentic OS', price: '$297/mo', users: 42, mrr: '$12,474', pct: 56 },
    { name: '10x Output Seat', price: '$149/mo', users: 28, mrr: '$4,172', pct: 31 },
    { name: 'Autonomous Role', price: '$2,497/mo', users: 2, mrr: '$4,994', pct: 13 },
  ];
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <KpiCard label="MRR" value="$4,200" trend={+12.3} sub="Monthly Recurring" icon={DollarSign} color="#76b900" />
        <KpiCard label="ARR" value="$50.4K" trend={+12.3} sub="Annual Recurring" icon={TrendingUp} color="#3b82f6" />
        <KpiCard label="ARPU" value="$80.77" trend={+4.1} sub="Per user avg" icon={Users} color="#a78bfa" />
        <KpiCard label="Churn Rate" value="2.1%" trend={-0.5} sub="Monthly" icon={ArrowDownRight} color="#f59e0b" invertTrend />
      </div>
      <Card title="Revenue by Plan" subtitle="Current subscription breakdown">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {plans.map(p => (
            <div key={p.name} style={{
              display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px',
              background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff' }}>{p.name} <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>{p.price}</span></div>
                <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', marginTop: '8px' }}>
                  <div style={{ width: `${p.pct}%`, height: '100%', background: '#76b900', borderRadius: '2px', transition: 'width 0.5s' }} />
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#76b900' }}>{p.mrr}</div>
                <div style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)' }}>{p.users} users</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

function UsersPage() {
  const users = [
    { name: 'Anderson & Associates', plan: 'Professional', status: 'active', health: 96, agents: 4, since: 'Jan 2026' },
    { name: 'Smith Legal Group', plan: 'Essential', status: 'at-risk', health: 42, agents: 2, since: 'Feb 2026' },
    { name: 'Davis & Partners LLP', plan: 'Enterprise', status: 'active', health: 91, agents: 5, since: 'Mar 2026' },
    { name: 'Chen Law Office', plan: 'Essential', status: 'active', health: 88, agents: 3, since: 'Mar 2026' },
    { name: 'Torres & Associates', plan: 'Professional', status: 'active', health: 79, agents: 4, since: 'Feb 2026' },
    { name: 'Mitchell & Reed', plan: 'Essential', status: 'trial', health: 67, agents: 1, since: 'Mar 2026' },
  ];
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <KpiCard label="Total Accounts" value="127" trend={+8.7} sub="All time" icon={Users} color="#3b82f6" />
        <KpiCard label="Active Users" value="94" trend={+5.3} sub="Last 30 days" icon={Activity} color="#76b900" />
        <KpiCard label="Onboarding Rate" value="87%" trend={+3.1} sub="Completion" icon={CheckCircle2} color="#a78bfa" />
        <KpiCard label="Avg Session" value="12min" trend={+22.0} sub="Per visit" icon={Clock} color="#f59e0b" />
      </div>
      <Card title="Account List" subtitle="Top accounts by activity">
        <div style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Firm', 'Plan', 'Status', 'Health', 'Agents', 'Since'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px 12px', fontSize: '0.8125rem', fontWeight: 600, color: '#fff' }}>{u.name}</td>
                  <td style={{ padding: '10px 12px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>{u.plan}</td>
                  <td style={{ padding: '10px 12px' }}><StatusPill label={u.status} color={u.status === 'active' ? '#16a34a' : u.status === 'at-risk' ? '#dc2626' : '#f59e0b'} /></td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ width: `${u.health}%`, height: '100%', background: u.health > 80 ? '#16a34a' : u.health > 50 ? '#f59e0b' : '#dc2626', borderRadius: '2px' }} />
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>{u.health}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>{u.agents}</td>
                  <td style={{ padding: '10px 12px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{u.since}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function SystemPage() {
  const services = [
    { name: 'Firebase Hosting', status: 'operational', uptime: '99.99%', latency: '42ms' },
    { name: 'Firestore Database', status: 'operational', uptime: '99.97%', latency: '18ms' },
    { name: 'Firebase Auth', status: 'operational', uptime: '99.99%', latency: '95ms' },
    { name: 'NemoClaw Sandbox', status: 'operational', uptime: '99.91%', latency: '230ms' },
    { name: 'Stripe API', status: 'operational', uptime: '99.99%', latency: '180ms' },
    { name: 'NVIDIA NIM APIs', status: 'degraded', uptime: '99.45%', latency: '890ms' },
  ];
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <KpiCard label="Platform Uptime" value="99.97%" trend={+0.02} sub="30-day avg" icon={Activity} color="#16a34a" />
        <KpiCard label="API Calls (24h)" value="14.2K" trend={+11.0} sub="All services" icon={Zap} color="#3b82f6" />
        <KpiCard label="Error Rate" value="0.03%" trend={-42.0} sub="Last 24 hours" icon={AlertTriangle} color="#f59e0b" invertTrend />
        <KpiCard label="Avg Latency" value="89ms" trend={-8.3} sub="P95 response" icon={Clock} color="#a78bfa" invertTrend />
      </div>
      <Card title="Service Status" subtitle="Real-time infrastructure monitoring">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {services.map(s => (
            <div key={s.name} style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
              background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: s.status === 'operational' ? '#16a34a' : '#f59e0b',
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fff' }}>{s.name}</div>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', width: '80px' }}>{s.uptime}</span>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', width: '60px' }}>{s.latency}</span>
              <StatusPill label={s.status} color={s.status === 'operational' ? '#16a34a' : '#f59e0b'} />
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

function SecurityPage() {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <KpiCard label="Threats Blocked" value="847" trend={-12.0} sub="Last 24 hours" icon={Shield} color="#dc2626" invertTrend />
        <KpiCard label="Compliance" value="98%" trend={+1.5} sub="Overall score" icon={CheckCircle2} color="#16a34a" />
        <KpiCard label="Active Incidents" value="0" trend={-100} sub="Current" icon={AlertTriangle} color="#76b900" invertTrend />
        <KpiCard label="Audit Log" value="2.4K" trend={+8.0} sub="Events today" icon={FileText} color="#3b82f6" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <Card title="Compliance Checklist" subtitle="Regulatory requirements">
          {['GDPR Data Protection', 'SOC 2 Type II Controls', 'ABA Ethics Guidelines', 'HTTPS/TLS Encryption', 'Data Retention Policy', 'Access Control (RBAC)', 'Audit Trail Logging', 'Incident Response Plan'].map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0',
              borderBottom: i < 7 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}>
              <CheckCircle2 size={14} color="#16a34a" />
              <span style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.7)' }}>{item}</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.625rem', fontWeight: 700, color: '#16a34a' }}>COMPLIANT</span>
            </div>
          ))}
        </Card>
        <Card title="Recent Threat Log" subtitle="Security events">
          {[
            { type: 'Blocked', desc: 'Brute-force login attempt (203.0.113.x)', time: '23m ago' },
            { type: 'Blocked', desc: 'SQL injection attempt on /api/auth', time: '1h ago' },
            { type: 'Blocked', desc: 'Rate limit exceeded (API key: sk_...4f2)', time: '2h ago' },
            { type: 'Monitored', desc: 'Unusual login location for user@firm.com', time: '4h ago' },
            { type: 'Blocked', desc: 'XSS payload in contact form submission', time: '5h ago' },
          ].map((t, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '8px 0',
              borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}>
              <Shield size={12} color={t.type === 'Blocked' ? '#dc2626' : '#f59e0b'} style={{ marginTop: '3px' }} />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>{t.desc}</div>
                <div style={{ fontSize: '0.5625rem', color: 'rgba(255,255,255,0.3)' }}>{t.type} · {t.time}</div>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SHARED COMPONENTS
   ═══════════════════════════════════════════════════════════════ */
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

function KpiCard({ label, value, trend, sub, icon: Icon, color, invertTrend }) {
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
        <span style={{
          fontSize: '0.625rem', fontWeight: 700,
          color: isPositive ? '#16a34a' : '#dc2626',
          display: 'flex', alignItems: 'center', gap: '2px',
        }}>
          {isPositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
          {Math.abs(trend)}%
        </span>
        <span style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.3)' }}>{sub}</span>
      </div>
    </div>
  );
}

function AgentMiniCard({ agent }) {
  const Icon = agent.icon;
  const isOC = agent.ofCounsel;
  const cardBg = isOC ? 'rgba(245,158,11,0.06)' : agent.status === 'active' ? 'rgba(118,185,0,0.04)' : 'rgba(255,255,255,0.02)';
  const cardBorder = isOC ? 'rgba(245,158,11,0.2)' : agent.status === 'active' ? 'rgba(118,185,0,0.1)' : 'rgba(255,255,255,0.06)';
  const iconBg = isOC ? 'rgba(245,158,11,0.15)' : agent.status === 'active' ? 'rgba(118,185,0,0.12)' : 'rgba(255,255,255,0.06)';
  const iconColor = isOC ? '#f59e0b' : agent.status === 'active' ? '#76b900' : '#64748b';
  return (
    <div style={{
      padding: '12px', borderRadius: '10px',
      background: cardBg,
      border: `1px solid ${cardBorder}`,
    }}>
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
        <div style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: agent.status === 'active' ? '#16a34a' : '#64748b',
        }} />
      </div>
      <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#fff' }}>{agent.metrics.primary}</div>
      <div style={{ fontSize: '0.5625rem', color: 'rgba(255,255,255,0.4)' }}>{agent.metrics.label}</div>
    </div>
  );
}

function AgentDetailCard({ agent }) {
  const Icon = agent.icon;
  const isOC = agent.ofCounsel;
  return (
    <div style={{
      padding: '20px', borderRadius: '12px',
      background: isOC ? 'rgba(245,158,11,0.04)' : 'rgba(255,255,255,0.02)',
      border: `1px solid ${isOC ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.06)'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '10px',
          background: isOC ? 'rgba(245,158,11,0.15)' : agent.status === 'active' ? 'rgba(118,185,0,0.12)' : 'rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={20} color={isOC ? '#f59e0b' : agent.status === 'active' ? '#76b900' : '#64748b'} />
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
        <MiniStat label="Tasks (24h)" value={agent.tasks24h} />
        <MiniStat label="Resolved" value={agent.resolved} />
        <MiniStat label="Health" value={`${agent.health}%`} />
        <MiniStat label="Secondary" value={agent.metrics.secondary} />
      </div>
      <div style={{
        padding: '8px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.04)', fontSize: '0.6875rem', color: 'rgba(255,255,255,0.5)',
        display: 'flex', alignItems: 'center', gap: '6px',
      }}>
        <Activity size={10} color="#76b900" />
        <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>Last:</span> {agent.lastAction}
        <span style={{ marginLeft: 'auto', fontSize: '0.5625rem', color: 'rgba(255,255,255,0.3)' }}>{agent.lastActionTime}</span>
      </div>
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

/* ═══════════════════════════════════════════════════════════════
   UTILITIES
   ═══════════════════════════════════════════════════════════════ */
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
