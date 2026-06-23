import { ArrowRight, BarChart3, BookOpen, Briefcase, Calendar, Crown, Database, DollarSign, Eye, FileText, FolderSearch, Layers, Mail, MessageSquare, Mic, PenTool, Phone, Scale, Search, Settings, Shield, TrendingUp, UserCheck, UserPlus, Users, UserX, Zap } from 'lucide-react';
import './Agents.css';

// ═══════════════════════════════════════════════════════════════
//  TIER 1: SUPER AGENT — The Firm's Chief of Staff
// ═══════════════════════════════════════════════════════════════
const SUPER_AGENT = {
  name: 'Super Agent',
  subtitle: "Your Firm's AI Chief of Staff",
  Icon: Crown,
  realWorldAnalog: 'Managing Partner\'s Chief of Staff / COO',
  whoUsesIt: 'Named Partners / Managing Partner only',
  lawFirmExplanation: 'Think of the person at your firm who sees everything — revenue, cases, staffing, deadlines — and makes sure nothing falls through the cracks. That\'s your Super Agent. It doesn\'t draft motions or answer phones. It advises the partners, orchestrates the agents below it, and ensures the entire firm runs in sync.',
  capabilities: [
    { label: 'Firm-Wide Intelligence', desc: 'Revenue trends, utilization rates, AR aging, pipeline — all in real time', icon: BarChart3 },
    { label: 'Cross-Matter Orchestration', desc: 'Routes new intake from Receptionist → Associate → Partner for approval', icon: Layers },
    { label: 'Conflict of Interest Detection', desc: 'Only the Super Agent sees ALL client matters — catches conflicts instantly', icon: Shield },
    { label: 'Resource Allocation', desc: '"Associate Kim has capacity; Associate Park is at 130% utilization"', icon: Users },
    { label: 'Strategic Advisory', desc: '"3 matters over $500K are at risk of deadline miss this week"', icon: TrendingUp },
    { label: 'Compliance & Audit Oversight', desc: 'Summarizes all agent activity, flags anomalies, enforces firm-wide policies', icon: Scale },
  ],
};

// ═══════════════════════════════════════════════════════════════
//  TIER 2: AGENTS — One Per Employee (the conversational layer)
// ═══════════════════════════════════════════════════════════════
const AGENTS = [
  {
    Icon: Crown,
    role: 'Named Partner',
    agentName: 'Partner Agent',
    lawFirmExplanation: 'Your Partner Agent is your personal AI Chief of Staff. It knows your clients, your caseload, your schedule, and your firm strategy. It dispatches specialist sub-agents to do research, review contracts, or analyze case outcomes — then reports back to you in plain English. It also connects you to the Super Agent for firm-wide intelligence.',
    subAgents: ['Legal Research', 'Contract Review', 'Drafting', 'Case Analytics', 'Business Intelligence', 'Knowledge Search', 'Communication Drafter'],
    superAgentAccess: true,
    category: 'Leadership',
    color: '#2563eb',
  },
  {
    Icon: Scale,
    role: 'Of Counsel',
    agentName: 'Of Counsel Agent',
    lawFirmExplanation: 'Your Of Counsel Agent acts as a senior advisory layer. It doesn\'t just draft; it reviews complex litigation strategy, analyzes opposing counsel tendencies, and provides deep-dive jurisdictional research that goes beyond standard associate work.',
    subAgents: ['Legal Research', 'Contract Review', 'Case Analytics', 'Knowledge Search'],
    superAgentAccess: false,
    category: 'Legal',
    color: '#0d9488',
  },
  {
    Icon: Briefcase,
    role: 'Associate Attorney',
    agentName: 'Associate Agent',
    lawFirmExplanation: 'Your Associate Agent handles the heavy lifting that eats up your billable hours. You say "research 12(b)(6) dismissal in our jurisdiction" — it dispatches the Research Sub-Agent, compiles precedents, then sends the Drafting Sub-Agent to write a first draft using your firm\'s templates. You review, revise, and bill.',
    subAgents: ['Legal Research', 'Contract Review', 'Drafting', 'eDiscovery', 'Deposition Prep', 'Knowledge Search', 'Communication Drafter'],
    superAgentAccess: false,
    category: 'Legal',
    color: '#7c3aed',
  },
  {
    Icon: BookOpen,
    role: 'Law Clerk',
    agentName: 'Law Clerk Agent',
    lawFirmExplanation: 'Your Law Clerk Agent handles the grueling early-stage research and cite-checking. It combs through massive case files, prepares preliminary research memos, and verifies that every citation in your firm\'s briefs adheres to jurisdictional standards.',
    subAgents: ['Legal Research', 'Drafting', 'Knowledge Search'],
    superAgentAccess: false,
    category: 'Legal',
    color: '#4f46e5',
  },
  {
    Icon: FileText,
    role: 'Paralegal',
    agentName: 'Paralegal Agent',
    lawFirmExplanation: 'Your Paralegal Agent automates document-intensive work — indexing case files, preparing discovery productions, generating deposition summaries, and managing privilege logs. It works with the eDiscovery and Document Formatting sub-agents to process 10x the documents in a fraction of the time.',
    subAgents: ['Legal Research', 'eDiscovery', 'Document Formatting', 'Deposition Prep', 'Knowledge Search'],
    superAgentAccess: false,
    category: 'Support',
    color: '#0891b2',
  },
  {
    Icon: UserPlus,
    role: 'Intake Coordinator',
    agentName: 'Intake Specialist Agent',
    lawFirmExplanation: 'Your Intake Agent acts as your dedicated sales and qualification team. It evaluates incoming leads, scores their case viability, runs ethical conflict checks, and automatically sends fee agreements to high-value prospects.',
    subAgents: ['Lead Qualification', 'Client Intake', 'Conflict Check', 'Communication Drafter'],
    superAgentAccess: false,
    category: 'Growth',
    color: '#e11d48',
  },
  {
    Icon: Phone,
    role: 'Receptionist',
    agentName: 'Receptionist Agent',
    lawFirmExplanation: 'Your Receptionist Agent answers every call, qualifies every lead, and schedules every consultation — 24/7/365. When a potential client calls at 2 AM, the AI answers, evaluates the case type, runs a conflict check, scores the lead, and sends you a notification by morning. Zero missed leads.',
    subAgents: ['Client Intake', 'Scheduling', 'Lead Qualification', 'Communication Drafter'],
    superAgentAccess: false,
    category: 'Operations',
    color: '#059669',
  },
  {
    Icon: UserCheck,
    role: 'Legal Secretary',
    agentName: 'Secretary Agent',
    lawFirmExplanation: 'Your Secretary Agent handles formatting, calendaring, transcription, and court deadline tracking. It takes your rough dictation and turns it into properly formatted court filings. It monitors every deadline across every case and sends escalating reminders so nothing is ever missed.',
    subAgents: ['Scheduling', 'Document Formatting', 'Knowledge Search', 'Communication Drafter'],
    superAgentAccess: false,
    category: 'Admin',
    color: '#ec4899',
  },
  {
    Icon: DollarSign,
    role: 'Billing Clerk',
    agentName: 'Billing Agent',
    lawFirmExplanation: 'Your Billing Agent captures billable time automatically, generates LEDES-compliant invoices, reconciles trust accounts (IOLTA), and sends collection reminders. It ensures every billable minute is captured — no more end-of-day time entry reconstruction. Trust account compliance is maintained 24/7.',
    subAgents: ['Billing & Time', 'Knowledge Search', 'Communication Drafter'],
    superAgentAccess: false,
    category: 'Finance',
    color: '#dc2626',
  },
  {
    Icon: BarChart3,
    role: 'Office Manager',
    agentName: 'Operations Agent',
    lawFirmExplanation: 'Your Operations Agent monitors compliance deadlines, tracks KPIs, manages vendor contracts, and generates operational reports. It acts as the operational intelligence layer — surfacing issues before they become problems and ensuring regulatory filings are never missed.',
    subAgents: ['Compliance Monitor', 'Knowledge Search', 'Communication Drafter'],
    superAgentAccess: false,
    category: 'Operations',
    color: '#d97706',
  },
];

// ═══════════════════════════════════════════════════════════════
//  TIER 3: SUB-AGENTS — The Specialist Workers
// ═══════════════════════════════════════════════════════════════
const SUB_AGENTS = [
  { id: 'legal-research', Icon: Search, name: 'Legal Research', desc: 'Searches case law, finds precedents, formats citations. Covers federal, state, and agency databases.', usedBy: 'Partner, Associate, Paralegal' },
  { id: 'contract-review', Icon: FileText, name: 'Contract Review', desc: 'Redlines NDAs/MSAs, flags risk clauses (non-compete scope, liability caps, indemnification), suggests edits against your firm standards.', usedBy: 'Partner, Associate' },
  { id: 'drafting', Icon: PenTool, name: 'Drafting', desc: 'Generates motions, briefs, pleadings, complaints, letters, and memos using your firm templates and jurisdictional requirements.', usedBy: 'Partner, Associate' },
  { id: 'ediscovery', Icon: FolderSearch, name: 'eDiscovery', desc: 'TAR-powered document review — identifies privilege, tags responsive documents, Bates numbers productions, manages review sets.', usedBy: 'Associate, Paralegal' },
  { id: 'client-intake', Icon: UserCheck, name: 'Client Intake', desc: 'Processes intake forms, runs conflict-of-interest checks against your case database, scores leads by case value and fit.', usedBy: 'Receptionist' },
  { id: 'scheduling', Icon: Calendar, name: 'Scheduling', desc: 'Manages attorney calendars, books consultations, tracks court dates, sends reminders with escalation logic.', usedBy: 'Receptionist, Secretary' },
  { id: 'lead-qualification', Icon: TrendingUp, name: 'Lead Qualification', desc: 'Scores incoming leads by case type, jurisdiction fit, estimated value, and urgency. Routes qualified leads to the right attorney.', usedBy: 'Receptionist' },
  { id: 'billing-time', Icon: DollarSign, name: 'Billing & Time', desc: 'Auto-captures billable activities from calendar, email, and documents. Generates LEDES invoices, tracks WIP, manages IOLTA reconciliation.', usedBy: 'Billing' },
  { id: 'document-formatting', Icon: FileText, name: 'Document Formatting', desc: 'Formats briefs for court-specific requirements, generates Table of Authorities, handles Bates stamping and exhibit numbering.', usedBy: 'Secretary, Paralegal' },
  { id: 'compliance-monitor', Icon: Scale, name: 'Compliance Monitor', desc: 'Tracks regulatory changes, monitors filing deadlines across jurisdictions, sends alerts for SEC, EPA, OSHA, and state-specific obligations.', usedBy: 'Operations' },
  { id: 'deposition-prep', Icon: Mic, name: 'Deposition Prep', desc: 'Analyzes case files and prior testimony to generate deposition outlines, exhibit lists, and targeted questions.', usedBy: 'Associate, Paralegal' },
  { id: 'knowledge-search', Icon: Database, name: 'Knowledge Search', desc: 'Searches your firm\'s own precedents, past work product, and templates. Surfaces relevant internal documents you may have forgotten existed.', usedBy: 'All Agents' },
  { id: 'communication-drafter', Icon: Mail, name: 'Communication Drafter', desc: 'Drafts client update emails, engagement letters, opposing counsel correspondence, and internal memos in your firm\'s voice.', usedBy: 'All Agents' },
  { id: 'case-analytics', Icon: BarChart3, name: 'Case Analytics', desc: 'Predicts case outcomes based on judge history, opposing counsel track record, and case metrics. Provides data-driven strategy recommendations.', usedBy: 'Partner' },
  { id: 'business-intelligence', Icon: TrendingUp, name: 'Business Intelligence', desc: 'Revenue forecasting, client profitability analysis, market rate benchmarking, and practice area growth trends.', usedBy: 'Partner' },
  { id: 'conflict-check', Icon: Users, name: 'Conflict Check', desc: 'Advanced cross-referencing for conflicts of interest across past clients, opposing parties, and firm matters.', usedBy: 'Intake, Partner' },
  { id: 'trust-accounting', Icon: Shield, name: 'Trust Accounting', desc: 'Automates IOLTA reconciliation, flags potential commingling, tracks trust deposits and disbursements.', usedBy: 'Bookkeeper' },
  { id: 'legal-memo', Icon: FileText, name: 'Legal Memo Drafting', desc: 'Synthesizes research and case facts into structured preliminary memos for partner review.', usedBy: 'Law Clerk, Associate' },
];

export default function Agents() {
  return (
    <section className="section agents-section" id="hitl-os">
      <div className="container">
        <div className="agents-header">
          <span className="section-label">Your Solo-to-Small-Firm AI Workforce</span>
          <h2 className="section-title">
            You. Plus <span className="gradient-text">19 <span className="text-nvidia">AI</span> Specialists.</span>
          </h2>
          <p className="section-subtitle">
            You're a solo attorney, not a staffing agency. You get one Personal <span className="text-nvidia">AI</span> Chief of Staff that commands your entire workforce —
            Add human role + agent mappings as you grow into a small firm: attorneys, paralegals, intake, billing, docketing, records, marketing, and operations.
            19 specialist <span className="text-nvidia">agents</span> handle the work behind each role.
          </p>
        </div>

        <div className="hierarchy-visual" style={{ gap: '32px' }}>
          
          <div style={{ marginBottom: '12px' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '16px', textAlign: 'center' }}>
              Your Legal AI Specialists
            </h4>
            <div className="agents-grid">
              {AGENTS.filter(a => ['Leadership', 'Legal', 'Support'].includes(a.category)).map((agent, i) => {
                return (
                  <div
                    key={agent.role}
                    className="agent-card glass-card"
                    style={{ animationDelay: `${i * 0.06}s` }}
                  >
                    <div className="agent-card-top">
                      <span className="agent-icon" style={{ color: agent.color }}><agent.Icon size={22} /></span>
                      <span className="agent-category">{agent.category}</span>
                    </div>
                    <div className="role-name-row">
                      <span className="role-human-name">{agent.role}</span>
                      <ArrowRight size={14} className="role-arrow" />
                      <span className="role-agent-name"><span className="text-nvidia">{agent.agentName.replace(' Agent', '')}</span> <span className="text-nvidia">Agent</span></span>
                    </div>

                    <p className="agent-desc" dangerouslySetInnerHTML={{ __html: agent.lawFirmExplanation.replace(/AI/g, '<span class="text-nvidia">AI</span>').replace(/agent/g, '<span class="text-nvidia">agent</span>').replace(/Agent/g, '<span class="text-nvidia">Agent</span>') }} />
                    <div className="role-tasks">
                      {agent.subAgents.map((sa, j) => (
                        <span key={j} className="role-task-tag">
                          <Zap size={10} /> {sa}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '16px', textAlign: 'center' }}>
              Your Operations AI Specialists
            </h4>
            <div className="agents-grid">
              {AGENTS.filter(a => ['Operations', 'Admin', 'Finance'].includes(a.category)).map((agent, i) => {
                return (
                  <div
                    key={agent.role}
                    className="agent-card glass-card"
                    style={{ animationDelay: `${(i + 3) * 0.06}s` }}
                  >
                    <div className="agent-card-top">
                      <span className="agent-icon" style={{ color: agent.color }}><agent.Icon size={22} /></span>
                      <span className="agent-category">{agent.category}</span>
                    </div>
                    <div className="role-name-row">
                      <span className="role-human-name">{agent.role}</span>
                      <ArrowRight size={14} className="role-arrow" />
                      <span className="role-agent-name"><span className="text-nvidia">{agent.agentName.replace(' Agent', '')}</span> <span className="text-nvidia">Agent</span></span>
                    </div>

                    <p className="agent-desc" dangerouslySetInnerHTML={{ __html: agent.lawFirmExplanation.replace(/AI/g, '<span class="text-nvidia">AI</span>').replace(/agent/g, '<span class="text-nvidia">agent</span>').replace(/Agent/g, '<span class="text-nvidia">Agent</span>') }} />
                    <div className="role-tasks">
                      {agent.subAgents.map((sa, j) => (
                        <span key={j} className="role-task-tag">
                          <Zap size={10} /> {sa}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* ── FIRM-GRADE CONTROLS ── */}
        <div className="firm-controls">
          <div className="firm-controls-header">
            <h3 className="section-title" style={{ fontSize: '1.75rem', marginBottom: '16px' }}>
              Built for the <span className="gradient-text">Real Business of Law</span>
            </h3>
            <p className="section-subtitle" style={{ maxWidth: '700px', margin: '0 auto' }}>
              Designed for solo attorneys who need full control, zero overhead, and airtight ethics — without a managing partner committee.
            </p>
          </div>
          
          <div className="firm-controls-grid">
            <div className="firm-control-card">
              <div className="firm-control-icon"><Crown size={20} /></div>
              <h4>Solo Practitioner Hybrid</h4>
              <p>Solo attorneys receive a unified "Hybrid" <span className="text-nvidia">Agent</span> that delivers full firm-wide strategic intelligence while simultaneously managing day-to-day drafting and associate-level tasks.</p>
            </div>
            
            <div className="firm-control-card">
              <div className="firm-control-icon"><Settings size={20} /></div>
              <h4>Your Global Controls</h4>
              <p>You set the policies. Every <span className="text-nvidia">agent</span> in your workforce operates within your exact standards — jurisdictional rules, tone, formatting, ethical boundaries — all enforced automatically.</p>
            </div>
            
            <div className="firm-control-card">
              <div className="firm-control-icon"><UserX size={20} /></div>
              <h4>Strict Ethical Walls</h4>
              <p>Bringing on contract attorneys or 'Of Counsel'? Issue them uniquely sandboxed "Contractor" <span className="text-nvidia">Agents</span> engineered to rigorously limit case data visibility and protect privilege.</p>
            </div>
            
            <div className="firm-control-card">
              <div className="firm-control-icon"><MessageSquare size={20} /></div>
              <h4><span className="text-nvidia">Agent</span> Personalization</h4>
              <p>Name your Personal <span className="text-nvidia">Agent</span> whatever you want (e.g., "Harvey"). Over time, it learns your unique writing style, preferred templates, and drafting voice — so every output sounds like you.</p>
            </div>
            
            <div className="firm-control-card">
              <div className="firm-control-icon"><Eye size={20} /></div>
              <h4>Explainable <span className="text-nvidia">AI</span> Toggles</h4>
              <p>Want to look under the hood? Power users can toggle sub-<span className="text-nvidia">agent</span> visibility to transparently watch their Personal <span className="text-nvidia">Agent</span> delegate and manage the specialists working behind the scenes.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="agents-footer" style={{ marginTop: '24px' }}>
          <p className="agents-lock-note">
            You get <strong>every new sub-<span className="text-nvidia">agent</span> capability automatically</strong> at your locked-in price.
          </p>
          <div className="agents-security-badge" style={{ marginTop: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <Shield size={12} className="text-nvidia" style={{ verticalAlign: 'middle', marginRight: '6px' }} />
            Secured by <span className="text-nvidia">NVIDIA</span> <span className="text-nvidia">NemoClaw</span>
          </div>
        </div>
      </div>
    </section>
  );
}
