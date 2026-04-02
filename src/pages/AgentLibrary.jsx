import { useState } from 'react';
import {
  Globe, Search, FileText, UserCheck, PenTool, FolderSearch, Scale, Mic,
  DollarSign, ScanSearch, Clock, Users, BookOpen, Shield, Mail, Phone,
  FileSearch, Briefcase, Building2, Gavel, ScrollText, BarChart3,
  CalendarCheck, FileSignature, MessageSquare, Brain, Landmark, Banknote,
  BookMarked, Network, ClipboardCheck, AlertTriangle, Receipt, HandCoins,
  Lightbulb, FolderOpen, FileCheck, Workflow, MapPin, Database,
  Lock, Megaphone, HeartHandshake, TrendingUp, Layers, X, Check, Send
} from 'lucide-react';
import { useFirm } from '../contexts/FirmContext';
import { useAuth } from '../contexts/AuthContext';
import { collection, addDoc, serverTimestamp, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../lib/firebase';

// ═══════════════════════════════════════════════════════════════
//  COMPREHENSIVE AGENT CATALOG
// ═══════════════════════════════════════════════════════════════

const ALL_AGENTS = [
  // ── DEPLOYED (live and running for the firm) ──
  {
    id: 'website-builder',
    Icon: Globe,
    name: 'Website Builder Agent',
    desc: 'Analyze your current firm website, redesign following best practices, and deploy a professional site on Firebase Hosting.',
    longDesc: 'Paste your existing website URL and this agent will crawl your site, analyze its content, design, SEO, and accessibility. It then generates a modern, mobile-first, ADA-compliant law firm website. If you like the redesign, purchase it for $500 and we deploy it to Firebase Hosting for you.',
    category: 'Marketing',
    status: 'deployed',
    price: '$500 one-time',
    color: '#2563eb',
    featured: true,
  },
  {
    id: 'research',
    Icon: Search,
    name: 'Legal Research Agent',
    desc: 'Summarize case law, find precedents, cite authority across federal and state courts.',
    longDesc: 'Conducts comprehensive legal research using CourtListener, Westlaw APIs, and internal knowledge base. Returns case summaries, relevant precedents, and properly formatted citations.',
    category: 'Research',
    status: 'deployed',
    color: '#2563eb',
    color: '#2563eb',
  },
  {
    id: 'contracts',
    Icon: FileText,
    name: 'Contract Review Agent',
    desc: 'Redline NDAs/MSAs, flag risk clauses, suggest edits based on your firm standards.',
    longDesc: 'Reviews contracts against your firm templates and industry standards. Identifies non-standard terms, liability caps, indemnification issues, and generates redline markups.',
    category: 'Documents',
    status: 'deployed',
    color: '#7c3aed',
    color: '#7c3aed',
  },
  {
    id: 'intake',
    Icon: UserCheck,
    name: 'Client Intake Agent',
    desc: 'Screen leads, run conflict checks, qualify matters, and score prospects.',
    longDesc: 'Automates the entire intake process: collects client information via forms, runs conflict-of-interest checks against your case database, scores leads by case value and fit, and routes qualified prospects to attorneys.',
    category: 'Operations',
    status: 'deployed',
    color: '#0891b2',
    color: '#0891b2',
  },
  {
    id: 'contact-mgmt',
    Icon: Users,
    name: 'Client Contact Manager',
    desc: 'Maintain client records, track communication history, manage relationships and follow-ups.',
    longDesc: 'Centralized client relationship management built for law firms. Tracks all client interactions, manages contact records, schedules follow-ups, and provides relationship health scores. Integrates with email, phone, and calendar.',
    category: 'Operations',
    status: 'deployed',
    color: '#059669',
    color: '#059669',
  },

  // ── AVAILABLE (ready to activate) ──
  {
    id: 'drafting',
    Icon: PenTool,
    name: 'Drafting Agent',
    desc: 'Generate pleadings, motions, briefs, and first-draft legal documents.',
    longDesc: 'Creates initial drafts of legal documents using your firm templates and jurisdictional requirements. Supports motions, briefs, complaints, answers, and discovery requests.',
    category: 'Documents',
    status: 'available',
    color: '#dc2626',
  },
  {
    id: 'ediscovery',
    Icon: FolderSearch,
    name: 'eDiscovery Agent',
    desc: 'Review documents, identify privilege, tag relevance, and manage productions.',
    longDesc: 'TAR-powered document review for litigation. Identifies privileged materials, tags responsive documents, and manages production sets with Bates numbering.',
    category: 'Litigation',
    status: 'available',
    color: '#d97706',
  },
  {
    id: 'compliance',
    Icon: Scale,
    name: 'Compliance Agent',
    desc: 'Monitor regulatory deadlines, filing requirements, and compliance obligations.',
    longDesc: 'Tracks regulatory changes across jurisdictions, monitors filing deadlines, and alerts attorneys to compliance obligations. Covers SEC, EPA, OSHA, and state-specific regulations.',
    category: 'Regulatory',
    status: 'available',
    color: '#059669',
  },
  {
    id: 'deposition',
    Icon: Mic,
    name: 'Deposition Prep Agent',
    desc: 'Prepare outlines, identify key exhibits, and generate targeted questions.',
    longDesc: 'Analyzes case files and prior testimony to generate deposition outlines, identify key areas of inquiry, and prepare exhibit lists for effective deposition strategy.',
    category: 'Litigation',
    status: 'available',
    color: '#7c3aed',
  },
  {
    id: 'billing',
    Icon: DollarSign,
    name: 'Billing Automation Agent',
    desc: 'Auto-generate time entries, track billable hours, and draft invoices.',
    longDesc: 'Captures billable activities automatically, generates properly formatted LEDES invoices, tracks WIP, and flags under-billed matters.',
    category: 'Finance',
    status: 'available',
    color: '#0891b2',
  },
  {
    id: 'duediligence',
    Icon: ScanSearch,
    name: 'Due Diligence Agent',
    desc: 'Analyze deal documents, flag discrepancies, and assess transaction risks.',
    longDesc: 'Reviews closing checklists, analyzes corporate records, identifies red flags in M&A transactions, and generates comprehensive due diligence reports.',
    category: 'M&A',
    status: 'available',
    color: '#4f46e5',
  },
  {
    id: 'deadline',
    Icon: Clock,
    name: 'Deadline Tracker Agent',
    desc: 'Track court dates, statute of limitations, and filing deadlines automatically.',
    longDesc: 'Monitors all case deadlines, calculates statute of limitations, syncs with court calendars, and sends escalating reminders to responsible attorneys.',
    category: 'Operations',
    status: 'available',
    color: '#dc2626',
  },
  {
    id: 'email-mgmt',
    Icon: Mail,
    name: 'Email Triage Agent',
    desc: 'Categorize, prioritize, and draft responses to client and court emails.',
    longDesc: 'Monitors firm email, categorizes messages by urgency and matter, drafts initial responses, and flags time-sensitive court communications.',
    category: 'Operations',
    status: 'available',
    color: '#2563eb',
  },
  {
    id: 'trust-accounting',
    Icon: Banknote,
    name: 'Trust Accounting Agent',
    desc: 'Manage IOLTA accounts, track client trust funds, and ensure bar compliance.',
    longDesc: 'Automates trust account reconciliation, tracks deposits and disbursements per client matter, and generates reports required by state bar associations.',
    category: 'Finance',
    status: 'available',
    color: '#059669',
  },

  // ── COMING SOON ──
  {
    id: 'court-filing',
    Icon: Landmark,
    name: 'Court Filing Agent',
    desc: 'Prepare and submit electronic court filings via ECF/PACER and state systems.',
    category: 'Litigation',
    status: 'coming-soon',
    color: '#6366f1',
  },
  {
    id: 'ip-patent',
    Icon: Lightbulb,
    name: 'IP / Patent Agent',
    desc: 'Search patent databases, draft patent applications, and monitor IP portfolios.',
    category: 'IP',
    status: 'coming-soon',
    color: '#f59e0b',
  },
  {
    id: 'immigration',
    Icon: MapPin,
    name: 'Immigration Agent',
    desc: 'Prepare visa petitions, track case processing, and manage RFE responses.',
    category: 'Immigration',
    status: 'coming-soon',
    color: '#0d9488',
  },
  {
    id: 'real-estate',
    Icon: Building2,
    name: 'Real Estate Agent',
    desc: 'Review title documents, prepare closing packages, and analyze lease agreements.',
    category: 'Real Estate',
    status: 'coming-soon',
    color: '#b45309',
  },
  {
    id: 'bankruptcy',
    Icon: Receipt,
    name: 'Bankruptcy Agent',
    desc: 'Prepare Chapter 7/11/13 petitions, schedules, and means test calculations.',
    category: 'Bankruptcy',
    status: 'coming-soon',
    color: '#dc2626',
  },
  {
    id: 'family-law',
    Icon: HeartHandshake,
    name: 'Family Law Agent',
    desc: 'Draft custody agreements, calculate support, and manage family court filings.',
    category: 'Family Law',
    status: 'coming-soon',
    color: '#ec4899',
  },
  {
    id: 'criminal-defense',
    Icon: Shield,
    name: 'Criminal Defense Agent',
    desc: 'Analyze police reports, prepare defense motions, and research sentencing guidelines.',
    category: 'Criminal',
    status: 'coming-soon',
    color: '#64748b',
  },
  {
    id: 'personal-injury',
    Icon: AlertTriangle,
    name: 'Personal Injury Agent',
    desc: 'Calculate damages, analyze medical records, and draft demand letters.',
    category: 'Personal Injury',
    status: 'coming-soon',
    color: '#f97316',
  },
  {
    id: 'mediation',
    Icon: HandCoins,
    name: 'Mediation / ADR Agent',
    desc: 'Prepare mediation briefs, settlement analyses, and negotiation strategies.',
    category: 'ADR',
    status: 'coming-soon',
    color: '#8b5cf6',
  },
  {
    id: 'tax-law',
    Icon: BarChart3,
    name: 'Tax Law Agent',
    desc: 'Analyze tax implications, prepare tax opinions, and monitor IRS guidance.',
    category: 'Tax',
    status: 'coming-soon',
    color: '#16a34a',
  },
  {
    id: 'employment-law',
    Icon: Briefcase,
    name: 'Employment Law Agent',
    desc: 'Draft employment policies, review separation agreements, and audit HR compliance.',
    category: 'Employment',
    status: 'coming-soon',
    color: '#0284c7',
  },
  {
    id: 'healthcare-law',
    Icon: ClipboardCheck,
    name: 'Healthcare Law Agent',
    desc: 'HIPAA compliance audits, Stark Law analysis, and healthcare regulatory monitoring.',
    category: 'Healthcare',
    status: 'coming-soon',
    color: '#0891b2',
  },
  {
    id: 'environmental',
    Icon: Layers,
    name: 'Environmental Law Agent',
    desc: 'EPA compliance tracking, environmental impact analysis, and permit management.',
    category: 'Environmental',
    status: 'coming-soon',
    color: '#059669',
  },
  {
    id: 'appellate',
    Icon: ScrollText,
    name: 'Appellate Agent',
    desc: 'Draft appellate briefs, analyze appellate records, and track appeal deadlines.',
    category: 'Appeals',
    status: 'coming-soon',
    color: '#7c3aed',
  },
  {
    id: 'knowledge-mgmt',
    Icon: Database,
    name: 'Knowledge Management Agent',
    desc: 'Index firm precedents, organize work product, and surface relevant past work.',
    category: 'Operations',
    status: 'coming-soon',
    color: '#2563eb',
  },
  {
    id: 'marketing',
    Icon: Megaphone,
    name: 'Marketing Agent',
    desc: 'Generate legal blog posts, social content, and SEO-optimized practice area pages.',
    category: 'Marketing',
    status: 'coming-soon',
    color: '#e11d48',
  },
  {
    id: 'translation',
    Icon: MessageSquare,
    name: 'Legal Translation Agent',
    desc: 'Translate legal documents across languages while preserving legal terminology.',
    category: 'Operations',
    status: 'coming-soon',
    color: '#0d9488',
  },
  {
    id: 'data-privacy',
    Icon: Lock,
    name: 'Data Privacy Agent',
    desc: 'GDPR/CCPA compliance audits, privacy policy generation, and breach response.',
    category: 'Privacy',
    status: 'coming-soon',
    color: '#4f46e5',
  },
  {
    id: 'conflict-check',
    Icon: Network,
    name: 'Conflict Check Agent',
    desc: 'Advanced cross-referencing for conflicts of interest across all firm matters.',
    category: 'Ethics',
    status: 'coming-soon',
    color: '#dc2626',
  },
  {
    id: 'case-analytics',
    Icon: TrendingUp,
    name: 'Case Analytics Agent',
    desc: 'Predict case outcomes, analyze judge tendencies, and benchmark case metrics.',
    category: 'Analytics',
    status: 'coming-soon',
    color: '#7c3aed',
  },
  {
    id: 'pro-bono',
    Icon: BookMarked,
    name: 'Pro Bono Manager Agent',
    desc: 'Match pro bono opportunities, track hours, and generate pro bono reports.',
    category: 'Operations',
    status: 'coming-soon',
    color: '#059669',
  },
  {
    id: 'notary',
    Icon: FileSignature,
    name: 'Notary / Signing Agent',
    desc: 'Coordinate remote notarization, manage signing ceremonies, and track documents.',
    category: 'Operations',
    status: 'coming-soon',
    color: '#b45309',
  },
  {
    id: 'ai-paralegal',
    Icon: Brain,
    name: 'AI Paralegal Agent',
    desc: 'General-purpose legal assistant for memo drafting, cite-checking, and fact gathering.',
    category: 'General',
    status: 'coming-soon',
    color: '#6366f1',
  },
];

const STATUS_CONFIG = {
  'deployed': { label: 'Deployed', dotColor: '#16a34a', bgColor: 'rgba(22, 163, 74, 0.08)', textColor: '#16a34a' },
  'available': { label: 'Available', dotColor: '#d97706', bgColor: 'rgba(217, 119, 6, 0.08)', textColor: '#d97706' },
  'coming-soon': { label: 'Coming Soon', dotColor: '#9ca3af', bgColor: 'rgba(156, 163, 175, 0.08)', textColor: '#9ca3af' },
};

const CATEGORIES = ['All', ...new Set(ALL_AGENTS.map(a => a.category))];

export default function AgentLibrary() {
  const [filter, setFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('all');
  const { agents: firmAgents } = useFirm();

  const filteredAgents = ALL_AGENTS.filter(a => {
    if (filter !== 'All' && a.category !== filter) return false;
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    return true;
  });

  const deployed = filteredAgents.filter(a => a.status === 'deployed');
  const available = filteredAgents.filter(a => a.status === 'available');
  const comingSoon = filteredAgents.filter(a => a.status === 'coming-soon');

  const totalDeployed = ALL_AGENTS.filter(a => a.status === 'deployed').length;
  const totalAvailable = ALL_AGENTS.filter(a => a.status === 'available').length;
  const totalComingSoon = ALL_AGENTS.filter(a => a.status === 'coming-soon').length;

  // ═══ REQUEST AGENT MODAL ═══
  const { user } = useAuth();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState({ name: '', description: '', category: 'Operations' });
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);

  const submitAgentRequest = async () => {
    if (!requestForm.name.trim() || !firmAgents) return;
    setRequestSubmitting(true);
    try {
      await addDoc(collection(db, 'agentRequests'), {
        firmId: firmAgents.firmId || 'unknown',
        userEmail: user?.email || 'unknown',
        agentName: requestForm.name,
        description: requestForm.description,
        category: requestForm.category,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setRequestSuccess(true);
      setTimeout(() => { setShowRequestModal(false); setRequestSuccess(false); setRequestForm({ name: '', description: '', category: 'Operations' }); }, 2000);
    } catch (err) { console.error('Request failed:', err); }
    setRequestSubmitting(false);
  };

  return (
    <>
      <div className="db-page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="db-page-title">Agent Library</h1>
          <p className="db-page-subtitle">
            {ALL_AGENTS.length} autonomous agents for every legal workflow.
            Deploy what you need today — more launching every month.
          </p>
        </div>
        <button className="db-btn db-btn-secondary" onClick={() => setShowRequestModal(true)}>Request Agent</button>
      </div>

      {/* ═══ REQUEST AGENT MODAL ═══ */}
      {showRequestModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }} onClick={(e) => { if (e.target === e.currentTarget) setShowRequestModal(false); }}>
          <div className="db-card" style={{ width: '100%', maxWidth: '480px', margin: '20px', padding: 0, background: 'var(--db-surface)', border: '1px solid var(--db-border)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--db-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--db-text-primary)' }}>Request Custom Agent</h2>
              <button onClick={() => setShowRequestModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--db-text-muted)', padding: '4px' }}><X size={18} /></button>
            </div>
            {requestSuccess ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <Check size={32} color="var(--db-nvidia-green)" style={{ marginBottom: '12px' }} />
                <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--db-text-primary)', marginBottom: '4px' }}>Request Submitted!</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--db-text-muted)' }}>Our engineering team will review and build your custom agent.</div>
              </div>
            ) : (
              <div style={{ padding: '24px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--db-text-muted)', marginBottom: '4px' }}>Agent Name</label>
                  <input type="text" value={requestForm.name} onChange={(e) => setRequestForm(p => ({...p, name: e.target.value}))} placeholder="e.g. Deposition Prep Agent" style={{ width: '100%', padding: '10px 12px', background: 'var(--db-bg)', border: '1px solid var(--db-border)', borderRadius: '8px', fontSize: '0.875rem', color: 'var(--db-text-primary)', outline: 'none' }} />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--db-text-muted)', marginBottom: '4px' }}>Category</label>
                  <select value={requestForm.category} onChange={(e) => setRequestForm(p => ({...p, category: e.target.value}))} style={{ width: '100%', padding: '10px 12px', background: 'var(--db-bg)', border: '1px solid var(--db-border)', borderRadius: '8px', fontSize: '0.875rem', color: 'var(--db-text-primary)', outline: 'none' }}>
                    {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--db-text-muted)', marginBottom: '4px' }}>Description</label>
                  <textarea value={requestForm.description} onChange={(e) => setRequestForm(p => ({...p, description: e.target.value}))} placeholder="Describe what this agent should do..." rows={3} style={{ width: '100%', padding: '10px 12px', background: 'var(--db-bg)', border: '1px solid var(--db-border)', borderRadius: '8px', fontSize: '0.875rem', color: 'var(--db-text-primary)', outline: 'none', resize: 'vertical', fontFamily: 'var(--db-font)' }} />
                </div>
                <button className="db-btn db-btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} onClick={submitAgentRequest} disabled={requestSubmitting || !requestForm.name.trim()}>
                  {requestSubmitting ? <><span className="auth-spinner" style={{ width: '14px', height: '14px', borderTopColor: '#000' }} /> Submitting...</> : <><Send size={14} /> Submit Request</>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="db-stats-grid" style={{ marginBottom: '24px' }}>
        <div className="db-stat-card" onClick={() => setStatusFilter('deployed')} style={{ cursor: 'pointer', border: statusFilter === 'deployed' ? '2px solid var(--db-nvidia-green)' : undefined }}>
          <div className="db-stat-label">Deployed</div>
          <div className="db-stat-value accent">{totalDeployed}</div>
          <div className="db-stat-meta">Active in your workspace</div>
        </div>
        <div className="db-stat-card" onClick={() => setStatusFilter('available')} style={{ cursor: 'pointer', border: statusFilter === 'available' ? '2px solid var(--db-warning)' : undefined }}>
          <div className="db-stat-label">Available</div>
          <div className="db-stat-value" style={{ color: 'var(--db-warning)' }}>{totalAvailable}</div>
          <div className="db-stat-meta">Ready to activate</div>
        </div>
        <div className="db-stat-card" onClick={() => setStatusFilter('coming-soon')} style={{ cursor: 'pointer', border: statusFilter === 'coming-soon' ? '2px solid var(--db-text-muted)' : undefined }}>
          <div className="db-stat-label">Coming Soon</div>
          <div className="db-stat-value" style={{ color: 'var(--db-text-muted)' }}>{totalComingSoon}</div>
          <div className="db-stat-meta">In development</div>
        </div>
        <div className="db-stat-card" onClick={() => setStatusFilter('all')} style={{ cursor: 'pointer', border: statusFilter === 'all' ? '2px solid var(--db-text-primary)' : undefined }}>
          <div className="db-stat-label">Total Catalog</div>
          <div className="db-stat-value">{ALL_AGENTS.length}</div>
          <div className="db-stat-meta">Complete agent portfolio</div>
        </div>
      </div>

      {/* Category Filter Strip */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '28px' }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`db-btn db-btn-sm ${filter === cat ? 'db-btn-primary' : 'db-btn-secondary'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Deployed Agents */}
      {deployed.length > 0 && (
        <div style={{ marginBottom: '36px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--db-accent)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--db-accent)' }} />
            Deployed — Live in Your Workspace ({deployed.length})
          </div>
          <div className="db-agents-grid">
            {deployed.map(agent => (
              <AgentCard key={agent.id} agent={agent} isActive={firmAgents?.activeAgents?.includes(agent.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Available Agents */}
      {available.length > 0 && (
        <div style={{ marginBottom: '36px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--db-warning)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--db-warning)' }} />
            Available — Ready to Activate ({available.length})
          </div>
          <div className="db-agents-grid">
            {available.map(agent => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </div>
      )}

      {/* Coming Soon Agents */}
      {comingSoon.length > 0 && (
        <div style={{ marginBottom: '36px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--db-text-muted)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--db-text-muted)' }} />
            Coming Soon — In Development ({comingSoon.length})
          </div>
          <div className="db-agents-grid">
            {comingSoon.map(agent => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function AgentCard({ agent, isActive }) {
  const { firmId } = useFirm();
  const { user } = useAuth();
  const [activating, setActivating] = useState(false);
  const [activated, setActivated] = useState(false);
  const [notified, setNotified] = useState(false);
  const statusCfg = STATUS_CONFIG[agent.status];
  const isDeployed = agent.status === 'deployed';
  const isComingSoon = agent.status === 'coming-soon';

  const handleActivate = async () => {
    if (!firmId) return;
    setActivating(true);
    try {
      await addDoc(collection(db, 'agentActivations'), {
        firmId,
        agentId: agent.id,
        agentName: agent.name,
        requestedBy: user?.email || 'unknown',
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setActivated(true);
    } catch (err) { console.error('Activation error:', err); }
    setActivating(false);
  };

  const handleNotify = async () => {
    if (!firmId) return;
    try {
      await addDoc(collection(db, 'agentWaitlist'), {
        firmId,
        agentId: agent.id,
        agentName: agent.name,
        email: user?.email || 'unknown',
        createdAt: serverTimestamp(),
      });
      setNotified(true);
    } catch (err) { console.error('Waitlist error:', err); }
  };

  return (
    <div
      className="db-agent-card"
      style={{
        opacity: isComingSoon ? 0.55 : 1,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Featured badge */}
      {agent.featured && (
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          padding: '3px 10px',
          background: 'linear-gradient(135deg, #76b900, #5a8f00)',
          borderRadius: '99px',
          fontSize: '0.625rem',
          fontWeight: 700,
          color: '#fff',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}>
          New
        </div>
      )}

      <div className="db-agent-card-header">
        <div className="db-agent-icon" style={{ background: agent.color + '12', color: agent.color }}>
          <agent.Icon size={20} />
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.6875rem',
          fontWeight: 600,
          color: statusCfg.textColor,
        }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusCfg.dotColor }} />
          {statusCfg.label}
        </div>
      </div>

      <div className="db-agent-name">{agent.name}</div>
      <div className="db-agent-desc">{agent.desc}</div>

      {/* Category tag */}
      <div style={{
        display: 'inline-block',
        marginTop: '8px',
        padding: '2px 8px',
        background: 'var(--db-bg)',
        borderRadius: '4px',
        fontSize: '0.625rem',
        fontWeight: 600,
        color: 'var(--db-text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}>
        {agent.category}
      </div>

      {/* Price badge for website builder */}
      {agent.price && (
        <div style={{
          marginTop: '8px',
          padding: '4px 10px',
          background: 'rgba(37, 99, 235, 0.08)',
          border: '1px solid rgba(37, 99, 235, 0.15)',
          borderRadius: '6px',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: '#2563eb',
          display: 'inline-block',
        }}>
          {agent.price}
        </div>
      )}

      {/* Stats for deployed agents */}
      {isDeployed && agent.tasks && (
        <div className="db-agent-stats">
          <div className="db-agent-stat">
            <span className="db-agent-stat-value">{agent.tasks}/day</span>
            <span className="db-agent-stat-label">Tasks</span>
          </div>
          <div className="db-agent-stat">
            <span className="db-agent-stat-value">{agent.avgTime}</span>
            <span className="db-agent-stat-label">Avg Time</span>
          </div>
          <div className="db-agent-stat">
            <span className="db-agent-stat-value">{agent.confidence}</span>
            <span className="db-agent-stat-label">Confidence</span>
          </div>
        </div>
      )}

      {/* Action button */}
      {!isDeployed && !isComingSoon && (
        <div style={{ marginTop: '16px' }}>
          {activated ? (
            <button className="db-btn db-btn-secondary db-btn-sm" style={{ width: '100%', pointerEvents: 'none' }} disabled>
              <Check size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> Activation Requested
            </button>
          ) : (
            <button className="db-btn db-btn-accent db-btn-sm" style={{ width: '100%' }} onClick={handleActivate} disabled={activating}>
              {activating ? 'Activating...' : 'Activate Agent'}
            </button>
          )}
        </div>
      )}
      {isComingSoon && (
        <div style={{ marginTop: '16px' }}>
          {notified ? (
            <button className="db-btn db-btn-secondary db-btn-sm" style={{ width: '100%', pointerEvents: 'none' }} disabled>
              <Check size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> On Waitlist
            </button>
          ) : (
            <button className="db-btn db-btn-secondary db-btn-sm" style={{ width: '100%' }} onClick={handleNotify}>Notify Me</button>
          )}
        </div>
      )}
    </div>
  );
}
