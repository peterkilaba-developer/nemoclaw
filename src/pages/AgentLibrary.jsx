import { useState } from 'react';
import { Search, FileText, UserCheck,
  DollarSign, ScanSearch, BookOpen, Phone, Briefcase, AlertTriangle, Database, Crown
} from 'lucide-react';
import { useFirm } from '../contexts/FirmContext';
import { AGENT_SUB_AGENTS, SUB_AGENT_CATALOG } from '../lib/agentHierarchy';
const AGENT_ROLE_CONFIG = {
  partner: { name: 'Partner Agent', division: 'practice', desc: 'Full-authority intelligence agent mirroring equity roles. Handles strategy, drafting, and cross-matter analytics.', icon: Crown, color: 'var(--db-nvidia-green)' },
  associate: { name: 'Associate Agent', division: 'practice', desc: 'Primary legal service delivery, document drafting, and precedent retrieval.', icon: Briefcase, color: '#2563eb' },
  paralegal: { name: 'Paralegal Agent', division: 'practice', desc: 'Matter support, complex e-discovery tagging, and court-compliant document formatting.', icon: FileText, color: '#7c3aed' },
  'law-clerk': { name: 'Law Clerk Agent', division: 'practice', desc: 'Deep-dive legal research, case law summarization, and initial memo drafting.', icon: Search, color: '#059669' },
  'of-counsel': { name: 'Of Counsel Agent', division: 'practice', desc: 'Senior advisory intelligence bounded securely to specific matters.', icon: Briefcase, color: '#d97706' },
  intern: { name: 'Intern Agent', division: 'practice', desc: 'Sandboxed legal research and learning role.', icon: BookOpen, color: '#0d9488' },
  receptionist: { name: 'Receptionist / Intake Agent', division: 'business', desc: 'Front-line client intake, lead scoring, and initial conflict-of-interest checks.', icon: Phone, color: '#0891b2' },
  secretary: { name: 'Legal Secretary Agent', division: 'business', desc: 'Court scheduling, timeline tracking, and communication drafting.', icon: UserCheck, color: '#4f46e5' },
  billing: { name: 'Billing Clerk Agent', division: 'business', desc: 'LEDES invoicing, IOLTA trust account reconciliation, and time tracking.', icon: DollarSign, color: '#dc2626' },
  operations: { name: 'Office Manager Agent', division: 'business', desc: 'Firm-wide compliance tracking, resource monitoring, and vendor management.', icon: ScanSearch, color: '#4b5563' },
};

export default function AgentLibrary() {
  const { firm } = useFirm();
  const [filter, setFilter] = useState('All');

  const practiceAreas = firm?.practiceAreas || [];
  const hasSpecialty = practiceAreas.length > 0;

  const agentTypes = Object.keys(AGENT_SUB_AGENTS).map(type => ({
    id: type,
    tasks: AGENT_SUB_AGENTS[type].map(taskId => SUB_AGENT_CATALOG.find(t => t.id === taskId)),
    ...AGENT_ROLE_CONFIG[type]
  })).sort((a, b) => a.division === 'practice' && b.division === 'business' ? -1 : 1);

  const filteredAgents = agentTypes.filter(a => filter === 'All' || a.division === filter);

  return (
    <>
      <div className="db-page-header">
        <h1 className="db-page-title">Agents & Practice Knowledgebase</h1>
        <p className="db-page-subtitle">
          Your AI workforce operates as direct mirrors of your human staff. Each Agent is pre-loaded with specific responsibilities, tasks, and firm knowledge.
        </p>
      </div>

      {/* Specialty KB Banner */}
      <div style={{
        marginBottom: '32px',
        background: hasSpecialty ? 'rgba(118,185,0,0.06)' : 'rgba(239,68,68,0.05)',
        border: `1px solid ${hasSpecialty ? 'rgba(118,185,0,0.2)' : 'rgba(239,68,68,0.2)'}`,
        borderRadius: '12px',
        padding: '20px 24px',
        display: 'flex',
        gap: '16px',
        alignItems: 'flex-start'
      }}>
        <div style={{ marginTop: '2px', color: hasSpecialty ? 'var(--db-nvidia-green)' : '#ef4444' }}>
          {hasSpecialty ? <Database size={24} /> : <AlertTriangle size={24} />}
        </div>
        <div>
          <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--db-text-primary)', marginBottom: '4px' }}>
            {hasSpecialty ? 'Firm Practice Specialization Active' : 'No Practice Areas Configured'}
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--db-text-secondary)', margin: 0, lineHeight: 1.5, maxWidth: '600px' }}>
            {hasSpecialty 
              ? <>Because your firm specializes in <strong style={{ color: 'var(--db-text-primary)' }}>{practiceAreas.join(', ')}</strong>, all Agents listed below are securely pre-loaded with comprehensive case law, procedural precedence, and statutory frameworks directly relevant to your field.</>
              : <>It looks like your firm profile hasn't set any specialized practice areas. Your Agents are currently operating with generalist knowledge. Head to Firm Settings to define your specialty.</>
            }
          </p>
        </div>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {['All', 'practice', 'business'].map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            style={{
              padding: '6px 16px',
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'capitalize',
              color: filter === cat ? 'var(--text-on-brand)' : 'var(--db-text-secondary)',
              background: filter === cat ? 'var(--db-nvidia-green)' : 'var(--db-bg)',
              border: filter === cat ? '1px solid var(--db-nvidia-green)' : '1px solid var(--db-border)',
              borderRadius: '99px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {cat === 'practice' ? 'Practice of Law' : cat === 'business' ? 'Business Operations' : 'All Roles'}
          </button>
        ))}
      </div>

      {/* Agent Grid */}
      <div className="db-agents-grid">
        {filteredAgents.map(agent => (
          <div key={agent.id} className="db-agent-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="db-agent-card-header" style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="db-agent-icon" style={{ background: `${agent.color}15`, color: agent.color }}>
                  <agent.icon size={20} />
                </div>
                <div>
                  <div className="db-agent-name" style={{ fontSize: '0.9375rem', marginBottom: '2px' }}>{agent.name}</div>
                  <div style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--db-text-muted)' }}>
                    {agent.division === 'practice' ? 'Practice Delivery' : 'Firm Operations'}
                  </div>
                </div>
              </div>
            </div>

            <div className="db-agent-desc" style={{ marginBottom: '20px', flexGrow: 1 }}>{agent.desc}</div>

            {hasSpecialty && agent.division === 'practice' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--db-nvidia-green)', marginBottom: '16px' }}>
                <Database size={12} /> Pre-loaded: {practiceAreas[0]} KB
              </div>
            )}

            {/* Scoped Tasks */}
            <div style={{ background: 'var(--db-bg)', padding: '12px', borderRadius: '8px', border: '1px solid var(--db-border-light)' }}>
              <div style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--db-text-muted)', marginBottom: '10px' }}>
                Scoped Sub-Agents / Tasks
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {agent.tasks.map(task => task && (
                  <div 
                    key={task.id} 
                    title={task.desc}
                    style={{
                      padding: '4px 8px',
                      background: 'var(--db-surface)',
                      border: '1px solid var(--db-border)',
                      borderRadius: '6px',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      color: 'var(--db-text-primary)'
                    }}
                  >
                    {task.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
