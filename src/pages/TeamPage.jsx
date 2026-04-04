import { useState, useRef } from 'react';
import {
  Crown, Bot, Users, Briefcase, FileText, Phone, UserCheck,
  DollarSign, ClipboardList, Zap, ArrowRight, Plus, Trash2,
  ShieldCheck, X, Check, CheckCircle
} from 'lucide-react';
import { useFirm } from '../contexts/FirmContext';
import { EMPLOYEE_ROLES, AGENT_SUB_AGENTS } from '../lib/agentHierarchy';

const PARTNER_ROLES = ['partner', 'managing-partner', 'solo-partner'];

const ROLE_ICONS = {
  partner: Crown, 'managing-partner': Crown, 'solo-partner': Crown, 'income-partner': Crown,
  associate: Briefcase, 'senior-associate': Briefcase,
  'of-counsel': Briefcase,
  paralegal: FileText, 'law-clerk': FileText, intern: FileText,
  receptionist: Phone, secretary: UserCheck,
  billing: DollarSign, 'office-manager': ClipboardList,
};

// Conservative palette: neutral for everything, green only for links/active states
const ROLE_COLORS = {
  partner: 'var(--db-text-secondary)',
  'of-counsel': 'var(--db-text-secondary)',
  associate: 'var(--db-text-secondary)',
  paralegal: 'var(--db-text-secondary)',
  'law-clerk': 'var(--db-text-secondary)',
  intern: 'var(--db-text-secondary)',
  receptionist: 'var(--db-text-secondary)',
  secretary: 'var(--db-text-secondary)',
  billing: 'var(--db-text-secondary)',
  operations: 'var(--db-text-secondary)',
};

const AGENT_NAME_SUGGESTIONS = [
  { name: 'Lexi', desc: 'Latin for Law' },
  { name: 'Prudence', desc: 'Jurisprudence' },
  { name: 'Justice', desc: 'Fairness' },
  { name: 'Amicus', desc: 'Friend of the Court' },
  { name: 'Portia', desc: 'Merchant of Venice' },
  { name: 'Atticus', desc: 'To Kill a Mockingbird' },
  { name: 'Harvey', desc: 'Suits' },
  { name: 'Marshall', desc: 'Supreme Court' },
  { name: 'Solon', desc: 'Ancient Lawmaker' },
  { name: 'Verity', desc: 'Latin for Truth' },
  { name: 'Lincoln', desc: 'The Lincoln Lawyer' },
  { name: 'Sterling', desc: 'High Quality' },
];

export default function TeamPage() {
  const { employees, personalAgents, superAgent, addTeamMember, updateTeamMember } = useFirm();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);

  const partners = employees.filter(e => PARTNER_ROLES.includes(e.role));
  const managingPartners = employees.filter(e => ['managing-partner', 'solo-partner'].includes(e.role));
  const practiceRoles = employees.filter(e => {
    const rc = EMPLOYEE_ROLES.find(r => r.value === e.role);
    return rc?.division === 'practice';
  });
  const businessRoles = employees.filter(e => {
    const rc = EMPLOYEE_ROLES.find(r => r.value === e.role);
    return rc?.division === 'business';
  });

  return (
    <>
      <div className="db-page-header">
        <h1 className="db-page-title">Human Resources & Agentic Resources</h1>
        <p className="db-page-subtitle">
          Every team member has a dedicated personal Agent. Partners have Super Agent access for firm-wide intelligence.
        </p>
      </div>

      {/* Stats */}
      <div className="db-stats-grid" style={{ marginBottom: '24px' }}>
        <div className="db-stat-card">
          <div className="db-stat-label">Super Agent</div>
          <div className="db-stat-value" style={{ color: '#76b900' }}>1</div>
          <div className="db-stat-meta">Firm's Chief of Staff</div>
        </div>
        <div className="db-stat-card">
          <div className="db-stat-label">Personal Agents</div>
          <div className="db-stat-value" style={{ color: '#76b900' }}>{personalAgents.length || employees.length}</div>
          <div className="db-stat-meta">One per human member</div>
        </div>
        <div className="db-stat-card">
          <div className="db-stat-label">Practice of Law</div>
          <div className="db-stat-value">{practiceRoles.length}</div>
          <div className="db-stat-meta">Legal service delivery</div>
        </div>
        <div className="db-stat-card">
          <div className="db-stat-label">Business of Law</div>
          <div className="db-stat-value">{businessRoles.length}</div>
          <div className="db-stat-meta">Firm operations</div>
        </div>
      </div>

      {/* Tier 1 - Super Agent card */}
      <div className="db-card" style={{ marginBottom: '24px', border: '1px solid rgba(118,185,0,0.2)' }}>
        <div className="db-card-header">
          <div>
            <div className="db-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(118,185,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Crown size={16} color="var(--db-text-secondary)" />
              </div>
              <span>Firm Super Agent — Chief of Staff</span>
            </div>
            <div className="db-card-subtitle" style={{ marginLeft: '40px' }}>
              A firmware resource for firm-wide intelligence, cross-matter orchestration, and resource allocation.
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 600, color: '#16a34a' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }} />
            Operational
          </div>
        </div>
        <div style={{ padding: '0 20px 16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {partners.map((p, i) => {
            const isManaging = ['managing-partner', 'solo-partner'].includes(p.role);
            return (
              <span key={i} style={{
                padding: '4px 12px', background: 'rgba(118,185,0,0.06)',
                border: '1px solid rgba(118,185,0,0.12)', borderRadius: '99px',
                fontSize: '0.75rem', fontWeight: 600, color: 'var(--db-text-primary)',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                {p.name || p.email} — Access Granted
                {isManaging && (
                  <span style={{
                    padding: '1px 6px', background: 'rgba(118,185,0,0.12)',
                    borderRadius: '4px', fontSize: '0.5625rem', fontWeight: 700,
                    textTransform: 'uppercase',
                  }}>
                    {p.role === 'solo-partner' ? 'Solo' : 'Managing'}
                  </span>
                )}
              </span>
            );
          })}
        </div>
      </div>

      {/* Practice of Law Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--db-text-secondary)' }}>
            Practice of Law
          </div>
          <span style={{ fontSize: '0.625rem', color: 'var(--db-text-muted)', fontWeight: 400 }}>
            Attorneys, Of Counsel, Paralegals, Law Clerks — legal service delivery
          </span>
        </div>
        <button className="db-btn db-btn-primary db-btn-sm" onClick={() => setShowAddModal('practice')}>
          <Plus size={14} /> Add Team Member
        </button>
      </div>

      {/* Practice team grid */}
      <div className="db-agents-grid" style={{ marginBottom: '32px' }}>
        {practiceRoles.map((emp, i) => {
          const roleConfig = EMPLOYEE_ROLES.find(r => r.value === emp.role);
          const agentType = roleConfig?.agentType || 'associate';
          const Icon = ROLE_ICONS[emp.role] || Briefcase;
          const color = ROLE_COLORS[agentType] || '#6b7280';
          const subAgentCount = AGENT_SUB_AGENTS[agentType]?.length || 0;
          const matchedAgent = (Array.isArray(personalAgents) ? personalAgents : []).find(a => a.employeeEmail === emp.email || a.humanEmail === emp.email);
          const agentName = matchedAgent?.agentName || emp.agentName || `${emp.name}'s AI Chief of Staff`;
          return <EmployeeCard key={emp.id || `p-${i}`} emp={emp} roleConfig={roleConfig} agentType={agentType} Icon={Icon} color={color} subAgentCount={subAgentCount} matchedAgent={matchedAgent} agentName={agentName} onEdit={setEditingEmployee} />;
        })}
        {practiceRoles.length === 0 && (
          <div className="db-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px' }}>
            <Users size={48} color="var(--db-text-muted)" style={{ marginBottom: '16px' }} />
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--db-text-primary)', marginBottom: '8px' }}>
              No Practice of Law Resources
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--db-text-muted)', marginBottom: '20px' }}>
              Add attorneys, paralegals, or law clerks to create their corresponding Agentic Resources.
            </div>
            <button className="db-btn db-btn-primary" onClick={() => setShowAddModal('practice')}>
              <Plus size={14} /> Add Human Resource
            </button>
          </div>
        )}
      </div>

      {/* Business of Law Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--db-text-secondary)' }}>
            Business of Law
          </div>
          <span style={{ fontSize: '0.625rem', color: 'var(--db-text-muted)', fontWeight: 400 }}>
            Secretaries, Receptionists, Billing, Office Managers, Bookkeepers — firm operations
          </span>
        </div>
        <button className="db-btn db-btn-primary db-btn-sm" onClick={() => setShowAddModal('business')}>
          <Plus size={14} /> Add Team Member
        </button>
      </div>

      {/* Business team grid */}
      <div className="db-agents-grid">
        {businessRoles.map((emp, i) => {
          const roleConfig = EMPLOYEE_ROLES.find(r => r.value === emp.role);
          const agentType = roleConfig?.agentType || 'associate';
          const Icon = ROLE_ICONS[emp.role] || Briefcase;
          const color = ROLE_COLORS[agentType] || '#6b7280';
          const subAgentCount = AGENT_SUB_AGENTS[agentType]?.length || 0;
          const matchedAgent = (Array.isArray(personalAgents) ? personalAgents : []).find(a => a.employeeEmail === emp.email || a.humanEmail === emp.email);
          const agentName = matchedAgent?.agentName || emp.agentName || `${emp.name}'s AI Chief of Staff`;
          return <EmployeeCard key={emp.id || `b-${i}`} emp={emp} roleConfig={roleConfig} agentType={agentType} Icon={Icon} color={color} subAgentCount={subAgentCount} matchedAgent={matchedAgent} agentName={agentName} onEdit={setEditingEmployee} />;
        })}
        {businessRoles.length === 0 && (
          <div className="db-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px' }}>
            <Users size={48} color="var(--db-text-muted)" style={{ marginBottom: '16px' }} />
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--db-text-primary)', marginBottom: '8px' }}>
              No Business of Law Resources
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--db-text-muted)', marginBottom: '20px' }}>
              Add secretaries, billing clerks, or office managers to create their corresponding Agentic Resources.
            </div>
            <button className="db-btn db-btn-primary" onClick={() => setShowAddModal('business')}>
              <Plus size={14} /> Add Human Resource
            </button>
          </div>
        )}
      </div>



      {/* Edit Modal */}
      {(showAddModal || editingEmployee) && (
        <AddTeamMemberModal
          partners={partners}
          onClose={() => { setShowAddModal(false); setEditingEmployee(null); }}
          onAdded={addTeamMember}
          onUpdated={updateTeamMember}
          initialData={editingEmployee || { name: '', email: '', role: showAddModal === 'business' ? 'secretary' : 'associate', supervisingPartnerId: null, agentName: '', photoURL: '' }}
        />
      )}
    </>
  );
}


/* ─────────────────────────────────────────────── */
/*  EMPLOYEE CARD — Reusable for both divisions    */
/* ─────────────────────────────────────────────── */

function EmployeeCard({ emp, roleConfig, agentType, Icon, color, subAgentCount, matchedAgent, agentName, onEdit }) {
  return (
    <div 
      className="db-agent-card" 
      onClick={() => onEdit(emp)}
      style={{ position: 'relative', display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
    >
      {/* Access Badges */}
      <div style={{ display: 'flex', gap: '8px', position: 'absolute', top: '12px', right: '12px' }}>
        {roleConfig?.superAgentAccess && (
          <div style={{
            fontSize: '0.625rem', fontWeight: 800,
            color: 'var(--db-nvidia-green)', textTransform: 'uppercase',
            letterSpacing: '0.06em'
          }}>
            Super Agent
          </div>
        )}
        {roleConfig?.canEditFirmPolicies && (
          <div style={{
            fontSize: '0.625rem', fontWeight: 800,
            color: '#f59e0b', textTransform: 'uppercase',
            letterSpacing: '0.06em'
          }}>
            Policy Admin
          </div>
        )}
      </div>

      <div className="db-agent-card-header" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div 
          onClick={(e) => { e.stopPropagation(); onEdit(emp); }}
          style={{ position: 'relative', transition: 'opacity 0.2s' }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          {emp.photoURL ? (
            <img 
              src={emp.photoURL} 
              alt={emp.name} 
              style={{ width: '48px', height: '48px', borderRadius: '12px', objectFit: 'cover', border: '2px solid var(--db-border-light)' }} 
            />
          ) : (
            <div style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: '12px', 
              background: `linear-gradient(135deg, ${color}, ${color}CC)`, 
              color: '#fff', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '1rem', 
              fontWeight: 700,
              textShadow: '0 2px 4px rgba(0,0,0,0.1)',
              border: '2px solid var(--db-border-light)'
            }}>
              {(emp.name || emp.email || '?')[0].toUpperCase()}
            </div>
          )}
          <div style={{ 
            position: 'absolute', 
            bottom: '-2px', 
            right: '-2px', 
            width: '12px', 
            height: '12px', 
            borderRadius: '50%', 
            background: matchedAgent ? '#16a34a' : '#f59e0b',
            border: '2px solid var(--db-surface)',
            boxShadow: 'var(--db-shadow-sm)'
          }} />
        </div>
      </div>

      <div style={{ flex: 1 }}>
        <div className="db-agent-name" style={{ marginBottom: '2px' }}>{emp.name || emp.email}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--db-text-secondary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontWeight: 600 }}>{roleConfig?.label || emp.role}</span>
          <span style={{ color: 'var(--db-text-muted)' }}>&middot;</span>
          <span style={{ textTransform: 'capitalize', color: 'var(--db-text-muted)' }}>
            {roleConfig?.division === 'practice' ? 'Practice Delivery' : 'Firm Operations'}
          </span>
        </div>

        {/* Agentic Resources Consolidated */}
        <div style={{ background: 'var(--db-bg)', padding: '12px', borderRadius: 'var(--db-radius)', border: '1px solid var(--db-border-light)' }}>
          <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--db-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
            Agentic Resources
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
              <span style={{ color: 'var(--db-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Personal Agent
              </span>
              <span style={{ fontWeight: 600, color: 'var(--db-text-primary)' }}>{agentName}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
              <span style={{ color: 'var(--db-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Specialist Sub-Agents
              </span>
              <span style={{ fontWeight: 600, color: 'var(--db-text-primary)' }}>{subAgentCount} Deployed</span>
            </div>
          </div>
        </div>
      </div>

      <div className="db-agent-stats" style={{ marginTop: '20px', justifyContent: 'space-between' }}>
        <div className="db-agent-stat">
          <span className="db-agent-stat-value" style={{ textTransform: 'capitalize' }}>{agentType}</span>
          <span className="db-agent-stat-label">Hierarchy</span>
        </div>
        <div className="db-agent-stat" style={{ alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', fontWeight: 700, color: matchedAgent ? '#16a34a' : '#f59e0b' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: matchedAgent ? '#16a34a' : '#f59e0b' }} />
            {matchedAgent ? 'Resource Ready' : 'Provisioning'}
          </div>
          <span className="db-agent-stat-label">System Status</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────── */
/*  ADD TEAM MEMBER MODAL                          */
/* ─────────────────────────────────────────────── */

function AddTeamMemberModal({ partners, onClose, onAdded, onUpdated, initialData }) {
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState(initialData || {
    name: '', email: '', role: 'associate',
    supervisingPartnerId: null, agentName: '', photoURL: '',
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 200;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.7);
          setFormData(prev => ({ ...prev, photoURL: compressed }));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const update = (k, v) => setFormData(prev => ({ ...prev, [k]: v }));

  const roleConfig = EMPLOYEE_ROLES.find(r => r.value === formData.role);
  const agentType = roleConfig?.agentType || 'associate';
  const subAgentCount = AGENT_SUB_AGENTS[agentType]?.length || 0;

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.email.trim()) return;
    setSaving(true);
    try {
      console.log('handleSave execution started:', formData);
      if (initialData?.id) {
        console.log('Calling onUpdated with id:', initialData.id);
        await onUpdated(initialData.id, formData);
      } else {
        console.log('Calling onAdded');
        await onAdded(formData);
      }
      console.log('Save successful');
      setSuccess(true);
      setTimeout(() => { onClose(); }, 1200);
    } catch (err) {
      console.error('Failed to add team member:', err);
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 9999, padding: '20px',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--db-surface)', borderRadius: 'var(--db-radius-lg)',
        border: '1px solid var(--db-border)', width: '100%', maxWidth: '650px',
        boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--db-border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--db-text-primary)' }}>
              {initialData ? 'Edit Human Resource' : 'Add Human Resource'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)', marginTop: '2px' }}>
              A dedicated Personal Agent will be provisioned automatically.
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--db-text-muted)', padding: '4px',
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {success ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'rgba(22,163,106,0.1)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
              }}>
                <Check size={28} color="#16a34a" />
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--db-text-primary)' }}>
                {formData.name} has been added!
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--db-text-muted)', marginTop: '4px', marginBottom: '20px' }}>
                Agentic resources provisioned and subscription automatically updated.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left', background: 'var(--db-bg)', padding: '16px', borderRadius: '8px', border: '1px solid var(--db-border)' }}>
                {[
                  { label: 'Agentic Role Payment', detail: 'Authorized additional $149.00/mo', color: 'var(--db-nvidia-green)' },
                  { label: 'Personal Agent Created', detail: `${formData.name.split(' ')[0]}'s AI ${agentType}` },
                  { label: 'Sub-Agents Deployed', detail: `${subAgentCount} specialists auto-assigned` },
                  { label: 'Ethical Wall Configured', detail: 'Matter-level access control active' },
                  { label: 'NemoClaw Sandbox', detail: 'Isolated runtime provisioned' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <CheckCircle size={14} color="#16a34a" />
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--db-text-primary)' }}>{item.label}</span>
                    <span style={{ fontSize: '0.6875rem', color: item.color || 'var(--db-text-muted)', marginLeft: 'auto', fontWeight: item.color ? 600 : 400 }}>{item.detail}</span>
                  </div>
                ))}
              </div>
            </div>

          ) : (
            <>
              {/* Row 1: Name + Email */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--db-text-muted)', marginBottom: '6px' }}>
                    Full Name *
                  </label>
                  <input
                    className="ob-form-input"
                    style={{ marginBottom: 0, width: '100%' }}
                    placeholder="Jane Doe"
                    value={formData.name}
                    onChange={e => update('name', e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--db-text-muted)', marginBottom: '6px' }}>
                    Email *
                  </label>
                  <input
                    className="ob-form-input"
                    style={{ marginBottom: 0, width: '100%' }}
                    type="email"
                    placeholder="jane@firm.com"
                    value={formData.email}
                    onChange={e => update('email', e.target.value)}
                  />
                </div>
              </div>

              {/* Row 2: Role + Supervising Partner */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--db-text-muted)', marginBottom: '6px' }}>
                    Role
                  </label>
                  <select
                    className="ob-form-select"
                    style={{ marginBottom: 0, width: '100%' }}
                    value={formData.role}
                    onChange={e => update('role', e.target.value)}
                  >
                    {EMPLOYEE_ROLES.map(r => r.value === EMPLOYEE_ROLES.find(x => x.division === 'business')?.value ? null : null)}
                    <optgroup label="Practice of Law">
                      {EMPLOYEE_ROLES.filter(r => r.division === 'practice' && r.value !== 'solo-partner').map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Business of Law">
                      {EMPLOYEE_ROLES.filter(r => r.division === 'business').map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                {!PARTNER_ROLES.includes(formData.role) && partners.length > 0 && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--db-text-muted)', marginBottom: '6px' }}>
                      Supervising Partner
                    </label>
                    <select
                      className="ob-form-select"
                      style={{ marginBottom: 0, width: '100%' }}
                      value={formData.supervisingPartnerId || ''}
                      onChange={e => update('supervisingPartnerId', e.target.value || null)}
                    >
                      <option value="">Select partner...</option>
                      {partners.map((p, pi) => (
                        <option key={pi} value={p.email}>{p.name || `Partner ${pi + 1}`}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>


            {/* Row 4: Photo Management */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--db-text-muted)', marginBottom: '6px' }}>
                Profile Photo
              </label>
              
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  style={{ 
                    width: '64px', height: '64px', borderRadius: '12px', 
                    background: 'var(--db-bg)', border: '2px dashed var(--db-border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', overflow: 'hidden', position: 'relative'
                  }}
                >
                  {formData.photoURL ? (
                    <img src={formData.photoURL} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Plus size={20} color="var(--db-text-muted)" />
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    style={{ display: 'none' }} 
                    accept="image/*" 
                  />
                </div>
                
                <div style={{ flex: 1 }}>
                  <button 
                    className="db-btn db-btn-secondary db-btn-sm" 
                    onClick={() => fileInputRef.current?.click()}
                    style={{ marginBottom: '8px', width: '100%' }}
                  >
                    Upload Local Photo
                  </button>
                  <input
                    className="ob-form-input"
                    style={{ marginBottom: 0, width: '100%', fontSize: '0.6875rem', padding: '6px 10px' }}
                    placeholder="Or paste image URL..."
                    value={formData.photoURL?.startsWith('data:') ? '' : formData.photoURL}
                    onChange={e => update('photoURL', e.target.value)}
                  />
                </div>
              </div>
            </div>


            {/* Agent Auto-Provisioning Summary */}
            <div style={{
              padding: '16px', background: 'rgba(118,185,0,0.05)',
              border: '1px solid rgba(118,185,0,0.15)', borderRadius: '10px',
              marginBottom: '20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Bot size={14} color="var(--db-nvidia-green)" />
                <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--db-nvidia-green)' }}>Agent Auto-Provisioning</span>
                <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: 'var(--db-text-muted)' }}>No configuration required</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--db-text-muted)', marginBottom: '3px' }}>Agent Identity</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--db-text-primary)' }}>
                    {formData.name ? `${formData.name.split(' ')[0]}'s AI Agent` : 'Auto-named on save'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--db-text-muted)', marginBottom: '3px' }}>Agent Type</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--db-text-primary)' }}>{agentType}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--db-text-muted)', marginBottom: '3px' }}>Sub-Agents</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--db-text-primary)' }}>{subAgentCount} auto-assigned</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--db-text-muted)', marginBottom: '3px' }}>Status</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#16a34a' }}>Ready on save</span>
                  </div>
                </div>
              </div>
            </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button className="db-btn db-btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
                <button
                  className="db-btn db-btn-primary"
                  onClick={handleSave}
                  disabled={saving || !formData.name.trim() || !formData.email.trim()}
                >
                  {saving ? 'Authorizing Payment & Provisioning...' : 'Authorize $149/mo & Provision Agent'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
