import { useState } from 'react';
import { Bot, Crown, Plus, ShieldCheck, Users } from 'lucide-react';
import AddTeamMemberModal from '../components/AddTeamMemberModal';
import { useAuth } from '../contexts/AuthContext';
import { useFirm } from '../contexts/FirmContext';
import {
  AGENT_SUB_AGENTS, EMPLOYEE_ROLES, MAX_FIRM_EMPLOYEE_COUNT,
  OWNER_ELIGIBLE_ROLES, PARTNER_ROLES,
} from '../lib/agentHierarchy';

function roleLabel(role) {
  return EMPLOYEE_ROLES.find(item => item.value === role)?.label || role || 'Team Member';
}

export default function TeamPage() {
  const { user } = useAuth();
  const {
    firm, employees = [], personalAgents = [], addTeamMember,
    updateTeamMember, removeTeamMember,
  } = useFirm();
  const [modal, setModal] = useState(null);

  const currentHuman = employees.find(item => item.id === user?.uid || item.email === user?.email);
  const canManageMappings = firm?.ownerId === user?.uid || OWNER_ELIGIBLE_ROLES.includes(currentHuman?.role);
  const partners = employees.filter(item => PARTNER_ROLES.includes(item.role));
  const atCapacity = employees.length >= MAX_FIRM_EMPLOYEE_COUNT;

  const agentFor = human => personalAgents.find(agent =>
    agent.employeeId === human.id || agent.humanId === human.id ||
    agent.employeeEmail === human.email || agent.humanEmail === human.email
  );

  return (
    <>
      <div className="db-page-header">
        <div>
          <h1 className="db-page-title">Human + Agent Role Mapping</h1>
          <p className="db-page-subtitle">
            Built for solo firms first, then growth into small-firm teams up to {MAX_FIRM_EMPLOYEE_COUNT} people across practice and business operations.
          </p>
        </div>
        {canManageMappings && (
          <button
            className="db-btn db-btn-primary"
            onClick={() => setModal({ mode: 'add' })}
            disabled={atCapacity}
            title={atCapacity ? `This workspace is at the ${MAX_FIRM_EMPLOYEE_COUNT}-person small-firm limit.` : undefined}
          >
            <Plus size={15} /> {atCapacity ? 'Small Firm Capacity Reached' : 'Add Human Role + Agent'}
          </button>
        )}
      </div>

      <div className="db-stats-grid" style={{ marginBottom: '24px' }}>
        <div className="db-stat-card"><div className="db-stat-label">Human Roles</div><div className="db-stat-value">{employees.length}/{MAX_FIRM_EMPLOYEE_COUNT}</div></div>
        <div className="db-stat-card"><div className="db-stat-label">Personal Agents</div><div className="db-stat-value">{personalAgents.length}</div></div>
        <div className="db-stat-card"><div className="db-stat-label">Partner Oversight</div><div className="db-stat-value">{partners.length}</div></div>
        <div className="db-stat-card"><div className="db-stat-label">HITL Policy</div><div className="db-stat-value accent">Active</div></div>
      </div>

      <div className="db-card" style={{ padding: '18px 20px', marginBottom: '24px' }}>
        <div className="db-card-title">Small-Firm Growth Model</div>
        <p className="db-card-subtitle" style={{ marginTop: 6 }}>
          The onboarding attorney starts as the partner human-in-the-loop. As the firm grows, partners can add attorneys,
          paralegals, legal assistants, case managers, intake, billing, docketing, records, marketing, and operations roles,
          each with a dedicated least-privilege personal agent.
        </p>
      </div>

      {employees.length === 0 ? (
        <div className="db-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <Users size={36} style={{ color: 'var(--db-text-muted)', marginBottom: '12px' }} />
          <div className="db-card-title">No human role mappings found</div>
          <p className="db-card-subtitle">The onboarding partner can add the first human-to-agent assignment.</p>
        </div>
      ) : (
        <div className="db-agents-grid">
          {employees.map(human => {
            const agent = agentFor(human);
            const agentType = agent?.agentType || EMPLOYEE_ROLES.find(item => item.value === human.role)?.agentType;
            const specialistCount = agent?.availableSubAgents?.length || AGENT_SUB_AGENTS[agentType]?.length || 0;
            const isOwner = human.isOwner || OWNER_ELIGIBLE_ROLES.includes(human.role);
            return (
              <button
                type="button"
                className="db-card"
                key={human.id}
                onClick={() => canManageMappings && setModal({ mode: 'edit', human })}
                style={{ padding: 0, textAlign: 'left', cursor: canManageMappings ? 'pointer' : 'default', color: 'inherit' }}
              >
                <div className="db-card-header">
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'rgba(118,185,0,.08)' }}>
                      {isOwner ? <Crown size={17} /> : <Users size={17} />}
                    </div>
                    <div><div className="db-card-title">{human.name || human.email}</div><div className="db-card-subtitle">{roleLabel(human.role)}</div></div>
                  </div>
                  {isOwner && <ShieldCheck size={16} style={{ color: 'var(--db-nvidia-green)' }} />}
                </div>
                <div style={{ padding: '0 20px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px', border: '1px solid var(--db-border)', borderRadius: 8 }}>
                    <Bot size={16} style={{ color: 'var(--db-nvidia-green)' }} />
                    <div style={{ flex: 1 }}><strong>{agent?.agentName || `${human.name}'s AI Chief of Staff`}</strong><div className="db-card-subtitle">{agentType || 'personal'} agent, {specialistCount} specialists</div></div>
                    <span style={{ color: '#16a34a', fontSize: '.75rem', fontWeight: 700 }}>HUMAN SUPERVISED</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {modal && (
        <AddTeamMemberModal
          partners={partners}
          initialData={modal.mode === 'edit' ? modal.human : null}
          onClose={() => setModal(null)}
          onAdded={addTeamMember}
          onUpdated={updateTeamMember}
          onRemoved={removeTeamMember}
        />
      )}
    </>
  );
}
