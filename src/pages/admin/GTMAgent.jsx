import { useState, useEffect } from 'react';
import {
  Rocket, Users, Target, TrendingUp, Mail, MapPin,
  CheckCircle2, Flame, Thermometer,
  Snowflake, RefreshCw, Eye, Send,
  Star, Copy,
  Megaphone, Search, Sparkles, Activity, Radio
} from 'lucide-react';
import { getWaitlistLeads, updateLeadStatus, getWaitlistStats } from '../../lib/waitlistService';
import { sendLaunchEmail, sendBulkLaunchEmails, generateSignupLink, getLaunchEmailTemplate } from '../../lib/emailService';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import GTMProspecting from './GTMProspecting';
import GTMCampaigns from './GTMCampaigns';
import GTMContentDrafts from './GTMContentDrafts';
const TASK_LABELS = {
  'legal-research': 'Legal Research', 'contract-review': 'Contract Review',
  'client-intake': 'Client Intake', 'document-drafting': 'Document Drafting',
  'ediscovery': 'eDiscovery', 'compliance': 'Compliance',
  'deposition-prep': 'Deposition Prep', 'billing': 'Billing Automation',
  'due-diligence': 'Due Diligence', 'deadline-tracker': 'Deadline Tracking',
  'website-builder': 'Website Builder', 'client-comms': 'Client Communication',
  'case-strategy': 'Case Strategy', 'ip-patent': 'IP & Patent',
  'conflict-check': 'Conflict Check', 'court-filing': 'Court Filing',
  'brief-writing': 'Brief Writing', 'crm': 'CRM',
};

const AREA_LABELS = {
  'general': 'General', 'corporate': 'Corporate', 'litigation': 'Litigation',
  'ip': 'IP/Patent', 'employment': 'Employment', 'real-estate': 'Real Estate',
  'criminal': 'Criminal Defense', 'immigration': 'Immigration', 'family': 'Family Law',
  'bankruptcy': 'Bankruptcy', 'tax': 'Tax Law', 'personal-injury': 'Personal Injury',
  'estate-planning': 'Estate Planning', 'environmental': 'Environmental',
  'healthcare': 'Healthcare', 'entertainment': 'Entertainment',
  'civil-rights': 'Civil Rights', 'securities': 'Securities',
};

const SIZE_LABELS = { 'solo': 'Solo', '2-5': '2-5', '5-10': '5-10', '10+': '10+' };

const STATUS_CONFIG = {
  new: { label: 'New', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  contacted: { label: 'Contacted', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  qualified: { label: 'Qualified', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
  converted: { label: 'Converted', color: '#16a34a', bg: 'rgba(22,163,74,0.1)' },
};

const _s = (styles) => styles; // inline style helper

const GTM_TABS = [
  { id: 'pipeline', label: 'Pipeline', icon: Target, desc: 'Inbound leads' },
  { id: 'prospecting', label: 'Prospecting', icon: Search, desc: 'Find firms' },
  { id: 'campaigns', label: 'Campaigns', icon: Megaphone, desc: 'Outreach' },
  { id: 'content', label: 'AI Content', icon: Sparkles, desc: 'Marketing drafts' },
];

export default function GTMAgent() {
  const [activeTab, setActiveTab] = useState('pipeline');
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedLead, setSelectedLead] = useState(null);
  const [sendingEmail, setSendingEmail] = useState({});
  const [bulkSending, setBulkSending] = useState(false);
  const [emailPreview, setEmailPreview] = useState(null);
  const [campaignResults, setCampaignResults] = useState(null);
  const [copiedLink, setCopiedLink] = useState(null);
  const [agentActivity, setAgentActivity] = useState([]);
  const [showActivityFeed, setShowActivityFeed] = useState(true);

  // Load recent GTM agent activity from audit logs
  const loadAgentActivity = async () => {
    try {
      const q = query(
        collection(db, '_internalAuditLog'),
        where('department', '==', 'gtm'),
        orderBy('timestamp', 'desc'),
        limit(15)
      );
      const snap = await getDocs(q);
      setAgentActivity(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (_err) {
      // Fallback: try without the where clause
      try {
        const q2 = query(
          collection(db, '_internalAuditLog'),
          orderBy('timestamp', 'desc'),
          limit(15)
        );
        const snap2 = await getDocs(q2);
        setAgentActivity(snap2.docs.map(d => ({ id: d.id, ...d.data() })).filter(l => l.department === 'gtm' || l.agentId === 'sdr'));
      } catch (e2) {
        console.warn('Activity feed unavailable', e2);
      }
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [leadsData, statsData] = await Promise.all([
        getWaitlistLeads(),
        getWaitlistStats(),
      ]);
      setLeads(leadsData);
      setStats(statsData);
    } catch (err) {
      console.error('GTM Agent: Failed to load data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); loadAgentActivity(); }, []);

  const _handleStatusChange = async (leadId, newStatus) => {
    try {
      await updateLeadStatus(leadId, newStatus);
      await loadData();
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const handleSendEmail = async (lead) => {
    setSendingEmail(prev => ({ ...prev, [lead.id]: true }));
    try {
      await sendLaunchEmail(lead);
      await loadData();
    } catch (err) {
      console.error('Failed to send email', err);
    } finally {
      setSendingEmail(prev => ({ ...prev, [lead.id]: false }));
    }
  };

  const handleBulkSend = async () => {
    const newLeads = leads.filter(l => l.status === 'new');
    if (newLeads.length === 0) return;
    setBulkSending(true);
    try {
      const results = await sendBulkLaunchEmails(newLeads);
      setCampaignResults(results);
      await loadData();
    } catch (err) {
      console.error('Bulk send failed', err);
    } finally {
      setBulkSending(false);
    }
  };

  const handleCopyLink = (email) => {
    const link = generateSignupLink(email);
    navigator.clipboard.writeText(link);
    setCopiedLink(email);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handlePreviewEmail = (lead) => {
    const template = getLaunchEmailTemplate(lead);
    setEmailPreview({ lead, template });
  };

  const filteredLeads = filter === 'all' ? leads : leads.filter(l => l.status === filter);

  // Sort top items helper
  const sortedTopItems = (obj, labels, limit = 5) => {
    return Object.entries(obj || {})
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([key, count]) => ({ label: labels?.[key] || key, count }));
  };

  if (loading && !stats) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px', color: 'rgba(255,255,255,0.4)' }}>
        <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', marginRight: '8px' }} />
        Loading GTM Intelligence...
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  return (
    <>
      {/* Agent Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(239,68,68,0.06) 0%, rgba(249,115,22,0.06) 50%, rgba(10,14,23,0) 100%)',
        border: '1px solid rgba(239,68,68,0.12)', borderRadius: '16px',
        padding: '24px 28px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #ef4444, #f97316)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Rocket size={28} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
              GTM & Conversion Agent <span style={{ color: '#16a34a' }}>Active</span>
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)' }}>
              Research · Outreach · Prospecting · Conversion — C.O.O. Sub-Agent #1
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={loadData} style={{
            padding: '8px 14px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
            background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
            fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px',
          }}>
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {/* ═══ LIVE AGENT ACTIVITY FEED ═══ */}
      <div style={{
        background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(118,185,0,0.12)',
        borderRadius: '12px', padding: '16px 20px', marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showActivityFeed ? '12px' : '0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={14} color="#76b900" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff' }}>Agent Activity Feed</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#76b900', animation: 'gtm-pulse 1.5s infinite' }} />
              <span style={{ fontSize: '0.5625rem', color: '#76b900', fontWeight: 700 }}>LIVE</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={loadAgentActivity} style={{
              padding: '4px 10px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px',
              background: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
              fontSize: '0.625rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px',
            }}>
              <RefreshCw size={10} /> Refresh
            </button>
            <button onClick={() => setShowActivityFeed(!showActivityFeed)} style={{
              padding: '4px 10px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px',
              background: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
              fontSize: '0.625rem', fontWeight: 600,
            }}>
              {showActivityFeed ? 'Collapse' : 'Expand'}
            </button>
          </div>
        </div>

        {showActivityFeed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
            {agentActivity.length > 0 ? agentActivity.map((log, _i) => {
              const ts = log.timestamp?.toDate?.() || (log.timestamp ? new Date(log.timestamp) : new Date());
              const agentColors = { cea: '#f59e0b', sdr: '#3b82f6', marketing: '#a855f7', success: '#10b981', revenue: '#ef4444' };
              const color = agentColors[log.agentId] || '#76b900';
              const timeSince = (d) => {
                const s = Math.floor((new Date() - d) / 1000);
                if (s < 60) return `${s}s ago`;
                if (s < 3600) return `${Math.floor(s / 60)}m ago`;
                if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
                return `${Math.floor(s / 86400)}d ago`;
              };
              return (
                <div key={log.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '10px',
                  padding: '6px 10px', borderRadius: '6px',
                  background: 'rgba(255,255,255,0.02)',
                }}>
                  <CheckCircle2 size={11} color={color} style={{ marginTop: '3px', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      <span style={{
                        fontSize: '0.5rem', fontWeight: 800, color,
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                        padding: '1px 5px', borderRadius: '3px',
                        background: `${color}15`, border: `1px solid ${color}30`,
                      }}>{log.agentId || 'system'}</span>
                      <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.2)' }}>{timeSince(ts)}</span>
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
                      {log.agentResponse || log.userMessage || 'Action logged'}
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div style={{ textAlign: 'center', padding: '16px', color: 'rgba(255,255,255,0.25)', fontSize: '0.6875rem' }}>
                <Radio size={14} style={{ marginBottom: '6px', opacity: 0.4 }} />
                <div>No recent agent activity. Trigger the SDR Loop or execute a mission to see live actions here.</div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes gtm-pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex', gap: '4px', marginBottom: '24px', padding: '4px',
        background: 'rgba(255,255,255,0.02)', borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        {GTM_TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex: 1, padding: '10px 16px', border: 'none', borderRadius: '8px',
            background: activeTab === tab.id ? 'rgba(118,185,0,0.12)' : 'transparent',
            color: activeTab === tab.id ? '#76b900' : 'rgba(255,255,255,0.4)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            transition: 'all 0.15s',
          }}>
            <tab.icon size={15} />
            <span style={{ fontSize: '0.8125rem', fontWeight: 700 }}>{tab.label}</span>
            <span style={{ fontSize: '0.5625rem', fontWeight: 500, opacity: 0.6 }}>{tab.desc}</span>
          </button>
        ))}
      </div>

      {/* Prospecting Tab */}
      {activeTab === 'prospecting' && <GTMProspecting />}

      {/* Campaigns Tab */}
      {activeTab === 'campaigns' && <GTMCampaigns />}

      {/* AI Content Tab */}
      {activeTab === 'content' && <GTMContentDrafts />}

      {/* Pipeline Tab (existing) */}
      {activeTab === 'pipeline' && (<>

      {/* Pipeline KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px', marginBottom: '24px' }}>
        <KpiCard label="Total Leads" value={stats?.total || 0} icon={Users} color="#3b82f6" sub="All time" />
        <KpiCard label="Hot Leads" value={stats?.byTier?.hot || 0} icon={Flame} color="#ef4444" sub={`Score ≥ 70`} />
        <KpiCard label="Warm Leads" value={stats?.byTier?.warm || 0} icon={Thermometer} color="#f59e0b" sub={`Score 45-69`} />
        <KpiCard label="Contacted" value={stats?.byStatus?.contacted || 0} icon={Send} color="#a78bfa" sub="In pipeline" />
        <KpiCard label="Converted" value={stats?.byStatus?.converted || 0} icon={CheckCircle2} color="#16a34a" sub="Paying users" />
      </div>

      {/* Pipeline Funnel + Insights */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px', marginBottom: '24px' }}>

        {/* Lead Table */}
        <Card title="Inbound Pipeline" subtitle={`${filteredLeads.length} leads`} action={
          <div style={{ display: 'flex', gap: '4px' }}>
            {['all', 'new', 'contacted', 'qualified', 'converted'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '4px 10px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px',
                background: filter === f ? 'rgba(118,185,0,0.12)' : 'transparent',
                color: filter === f ? '#76b900' : 'rgba(255,255,255,0.4)',
                cursor: 'pointer', fontSize: '0.625rem', fontWeight: 700, textTransform: 'capitalize',
              }}>{f}</button>
            ))}
          </div>
        }>
          {filteredLeads.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.3)' }}>
              <Mail size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
              <div style={{ fontSize: '0.875rem' }}>No leads yet — share your sign-up link!</div>
            </div>
          ) : (
            <div style={{ maxHeight: '480px', overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Lead', 'Score', 'Firm Size', 'Location', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{
                        padding: '6px 10px', textAlign: 'left', fontSize: '0.5625rem', fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.3)',
                        borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0,
                        background: '#0d1117',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map(lead => (
                    <tr key={lead.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}
                        onClick={() => setSelectedLead(selectedLead?.id === lead.id ? null : lead)}>
                      <td style={{ padding: '10px' }}>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fff' }}>{lead.email}</div>
                        <div style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.35)' }}>
                          {(lead.practiceAreas || []).map(a => AREA_LABELS[a] || a).join(', ') || 'No areas'}
                        </div>
                      </td>
                      <td style={{ padding: '10px' }}>
                        <ScoreBadge score={lead.leadScore} tier={lead.tier} />
                      </td>
                      <td style={{ padding: '10px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                        {SIZE_LABELS[lead.firmSize] || lead.firmSize}
                      </td>
                      <td style={{ padding: '10px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                        {lead.location || '—'}
                      </td>
                      <td style={{ padding: '10px' }}>
                        <StatusPill status={lead.status} />
                      </td>
                      <td style={{ padding: '10px' }}>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          {lead.status === 'new' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleSendEmail(lead); }}
                              disabled={sendingEmail[lead.id]}
                              style={{
                                padding: '4px 8px', borderRadius: '5px', fontSize: '0.5625rem', fontWeight: 700,
                                background: 'rgba(118,185,0,0.12)', border: '1px solid rgba(118,185,0,0.25)',
                                color: '#76b900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px',
                                opacity: sendingEmail[lead.id] ? 0.5 : 1,
                              }}
                            >
                              <Send size={9} /> {sendingEmail[lead.id] ? '...' : 'Send'}
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleCopyLink(lead.email); }}
                            style={{
                              padding: '4px 6px', borderRadius: '5px', fontSize: '0.5625rem',
                              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                              color: copiedLink === lead.email ? '#16a34a' : 'rgba(255,255,255,0.4)',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px',
                            }}
                          >
                            <Copy size={9} /> {copiedLink === lead.email ? '✓' : 'Link'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Right Sidebar: Insights */}
        <div>
          {/* Lead Detail (if selected) */}
          {selectedLead && (
            <Card title="Lead Detail" subtitle={selectedLead.email}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Score</span>
                  <ScoreBadge score={selectedLead.leadScore} tier={selectedLead.tier} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Firm Size</span>
                  <span style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 600 }}>{SIZE_LABELS[selectedLead.firmSize] || selectedLead.firmSize} attorneys</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Location</span>
                  <span style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 600 }}>{selectedLead.location || 'Not provided'}</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.625rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Practice Areas</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                    {(selectedLead.practiceAreas || []).map(a => (
                      <span key={a} style={{
                        padding: '2px 8px', borderRadius: '4px', fontSize: '0.5625rem', fontWeight: 600,
                        background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)',
                      }}>{AREA_LABELS[a] || a}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.625rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Interested Tasks</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                    {(selectedLead.selectedTasks || []).map(t => (
                      <span key={t} style={{
                        padding: '2px 8px', borderRadius: '4px', fontSize: '0.5625rem', fontWeight: 600,
                        background: 'rgba(118,185,0,0.1)', color: '#76b900', border: '1px solid rgba(118,185,0,0.2)',
                      }}>{TASK_LABELS[t] || t}</span>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Signed Up</span>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                    {selectedLead.createdAt?.toDate ? selectedLead.createdAt.toDate().toLocaleDateString() : 'Just now'}
                  </span>
                </div>
                {/* Lead Actions */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                  {selectedLead.status === 'new' && (
                    <button onClick={() => handleSendEmail(selectedLead)} disabled={sendingEmail[selectedLead.id]} style={{
                      flex: 1, padding: '8px', borderRadius: '8px', fontSize: '0.6875rem', fontWeight: 700,
                      background: 'rgba(118,185,0,0.12)', border: '1px solid rgba(118,185,0,0.25)',
                      color: '#76b900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                    }}>
                      <Send size={12} /> Send Launch Email
                    </button>
                  )}
                  <button onClick={() => handleCopyLink(selectedLead.email)} style={{
                    flex: 1, padding: '8px', borderRadius: '8px', fontSize: '0.6875rem', fontWeight: 700,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    color: copiedLink === selectedLead.email ? '#16a34a' : 'rgba(255,255,255,0.6)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                  }}>
                    <Copy size={12} /> {copiedLink === selectedLead.email ? 'Copied!' : 'Copy Signup Link'}
                  </button>
                  <button onClick={() => handlePreviewEmail(selectedLead)} style={{
                    padding: '8px', borderRadius: '8px',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
                  }}>
                    <Eye size={12} />
                  </button>
                </div>
              </div>
            </Card>
          )}

          {/* Top Requested Tasks */}
          <Card title="Top Requested Tasks" subtitle="By inbound leads">
            {sortedTopItems(stats?.topTasks, TASK_LABELS).map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0',
                borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#76b900', width: '20px' }}>{i + 1}</span>
                <span style={{ flex: 1, fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>{item.label}</span>
                <span style={{
                  padding: '2px 8px', borderRadius: '4px', fontSize: '0.625rem', fontWeight: 700,
                  background: 'rgba(118,185,0,0.1)', color: '#76b900',
                }}>{item.count}</span>
              </div>
            ))}
            {(!stats?.topTasks || Object.keys(stats.topTasks).length === 0) && (
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', padding: '20px 0', textAlign: 'center' }}>No data yet</div>
            )}
          </Card>

          {/* Firm Size Distribution */}
          <Card title="Firm Size Distribution" subtitle="Lead demographics">
            {Object.entries(stats?.byFirmSize || {}).map(([size, count], _i) => {
              const pct = stats?.total ? Math.round((count / stats.total) * 100) : 0;
              return (
                <div key={size} style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>{SIZE_LABELS[size] || size} attorneys</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff' }}>{count} ({pct}%)</span>
                  </div>
                  <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: '#76b900', borderRadius: '2px', transition: 'width 0.5s' }} />
                  </div>
                </div>
              );
            })}
            {(!stats?.byFirmSize || Object.keys(stats.byFirmSize).length === 0) && (
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', padding: '20px 0', textAlign: 'center' }}>No data yet</div>
            )}
          </Card>

          {/* Top Locations */}
          <Card title="Top Locations" subtitle="Geographic distribution">
            {sortedTopItems(stats?.topLocations, null, 5).map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0',
                borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              }}>
                <MapPin size={12} color="#76b900" />
                <span style={{ flex: 1, fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>{item.label}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>{item.count}</span>
              </div>
            ))}
            {(!stats?.topLocations || Object.keys(stats.topLocations).length === 0) && (
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', padding: '20px 0', textAlign: 'center' }}>No data yet</div>
            )}
          </Card>
        </div>
      </div>

      {/* ═══ EMAIL CAMPAIGN SECTION ═══ */}
      <Card title="Launch Campaign" subtitle="Send founder access invitations to pending leads" action={
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.3)' }}>
            {leads.filter(l => l.status === 'new').length} unsent
          </span>
          <button
            onClick={handleBulkSend}
            disabled={bulkSending || leads.filter(l => l.status === 'new').length === 0}
            style={{
              padding: '8px 16px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700,
              background: bulkSending ? 'rgba(118,185,0,0.06)' : 'linear-gradient(135deg, #76b900, #4a7a00)',
              border: 'none', color: bulkSending ? '#76b900' : '#000',
              cursor: leads.filter(l => l.status === 'new').length === 0 ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
              opacity: leads.filter(l => l.status === 'new').length === 0 ? 0.4 : 1,
            }}
          >
            <Megaphone size={14} />
            {bulkSending ? 'Sending...' : `Send to All New Leads (${leads.filter(l => l.status === 'new').length})`}
          </button>
        </div>
      }>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* Campaign Stats */}
          <div style={{
            padding: '20px', borderRadius: '12px',
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
              Campaign Status
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#3b82f6' }}>{leads.filter(l => l.status === 'new').length}</div>
                <div style={{ fontSize: '0.5625rem', color: 'rgba(255,255,255,0.3)' }}>Pending</div>
              </div>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b' }}>{leads.filter(l => l.status === 'contacted').length}</div>
                <div style={{ fontSize: '0.5625rem', color: 'rgba(255,255,255,0.3)' }}>Sent</div>
              </div>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#16a34a' }}>{leads.filter(l => l.status === 'converted').length}</div>
                <div style={{ fontSize: '0.5625rem', color: 'rgba(255,255,255,0.3)' }}>Converted</div>
              </div>
            </div>
          </div>

          {/* Email Preview Snippet */}
          <div style={{
            padding: '20px', borderRadius: '12px',
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
              Email Template
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
              🚀 NemoC Law AI is Live — Founder Access Ready
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
              Personalized HTML email with founder pricing ($297/mo locked), unique signup link per lead, pre-configured agent tasks based on interests.
            </div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
              <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.5625rem', fontWeight: 600, background: 'rgba(118,185,0,0.1)', color: '#76b900' }}>Personalized</span>
              <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.5625rem', fontWeight: 600, background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>HTML + Text</span>
              <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.5625rem', fontWeight: 600, background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>Signup Link</span>
            </div>
          </div>
        </div>

        {/* Bulk Results */}
        {campaignResults && (
          <div style={{ marginTop: '16px', padding: '16px', borderRadius: '10px', background: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.15)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={14} /> Campaign Complete
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.5)' }}>
              {campaignResults.filter(r => r.success).length} emails queued successfully
              {campaignResults.filter(r => !r.success).length > 0 && (
                <span style={{ color: '#ef4444' }}> · {campaignResults.filter(r => !r.success).length} failed</span>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Email Preview Modal */}
      {emailPreview && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setEmailPreview(null)}>
          <div style={{
            width: '660px', maxHeight: '80vh', overflow: 'auto',
            borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              padding: '16px 20px', background: '#1a1f2e', borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff' }}>Email Preview</div>
                <div style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.4)' }}>To: {emailPreview.lead.email}</div>
              </div>
              <button onClick={() => setEmailPreview(null)} style={{
                padding: '4px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.75rem',
              }}>Close</button>
            </div>
            <div dangerouslySetInnerHTML={{ __html: emailPreview.template.html }} />
          </div>
        </div>
      )}

      {/* Auto-Actions Banner */}
      <Card title="Agent Auto-Actions" subtitle="Autonomous workflows managed by this agent">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {[
            { icon: Mail, label: 'Welcome Email', desc: 'Sent on new signup', status: 'active', count: stats?.total || 0 },
            { icon: Star, label: 'Lead Scoring', desc: 'Auto-score all leads', status: 'active', count: stats?.total || 0 },
            { icon: Target, label: 'Priority Flagging', desc: 'Flag hot leads for COO', status: 'active', count: stats?.byTier?.hot || 0 },
            { icon: TrendingUp, label: 'Conversion Tracking', desc: 'Track lead → paid', status: 'active', count: stats?.byStatus?.converted || 0 },
          ].map((action, i) => (
            <div key={i} style={{
              padding: '16px', borderRadius: '10px',
              background: 'rgba(118,185,0,0.04)', border: '1px solid rgba(118,185,0,0.1)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '7px',
                  background: 'rgba(118,185,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <action.icon size={14} color="#76b900" />
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff' }}>{action.label}</span>
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>{action.desc}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{
                  padding: '2px 6px', borderRadius: '4px', fontSize: '0.5625rem', fontWeight: 700,
                  background: 'rgba(22,163,74,0.15)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.3)',
                  textTransform: 'uppercase',
                }}>Active</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#76b900' }}>{action.count}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
      </>)}
    </>
  );
}

/* ── Shared sub-components ── */
function Card({ title, subtitle, action, children }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '12px', padding: '20px', marginBottom: '16px',
    }}>
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff' }}>{title}</div>
            {subtitle && <div style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)' }}>{subtitle}</div>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '12px', padding: '16px 18px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontSize: '0.625rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
        <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={14} color={color} />
        </div>
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginBottom: '2px' }}>{value}</div>
      <div style={{ fontSize: '0.5625rem', color: 'rgba(255,255,255,0.3)' }}>{sub}</div>
    </div>
  );
}

function ScoreBadge({ score, tier }) {
  const colors = { hot: '#ef4444', warm: '#f59e0b', cold: '#3b82f6' };
  const icons = { hot: Flame, warm: Thermometer, cold: Snowflake };
  const Icon = icons[tier] || Snowflake;
  const color = colors[tier] || '#64748b';
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '2px 8px', borderRadius: '6px', fontSize: '0.6875rem', fontWeight: 700,
      background: `${color}15`, color, border: `1px solid ${color}30`,
    }}>
      <Icon size={10} /> {score}
    </div>
  );
}

function StatusPill({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.new;
  return (
    <span style={{
      padding: '2px 8px', borderRadius: '6px', fontSize: '0.5625rem', fontWeight: 700,
      textTransform: 'capitalize', background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.color}30`,
    }}>{cfg.label}</span>
  );
}
