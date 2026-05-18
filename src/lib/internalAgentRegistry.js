export const RALPH_REQUIRED_AGENT_COUNT = 13;

const LIVE_TELEMETRY_PENDING = {
  status: 'not-instrumented',
  tasks24h: 0,
  resolved: 0,
  health: null,
  lastAction: 'No live telemetry has been recorded for this agent yet.',
  metrics: {},
};

function defineAgent(config) {
  return {
    ...LIVE_TELEMETRY_PENDING,
    ...config,
    aliases: config.aliases || [],
  };
}

export const INTERNAL_AGENT_REGISTRY = [
  defineAgent({
    id: 'cea',
    abbr: 'C.E.A.',
    name: 'Chief Executive Agent',
    codeName: 'ARIA-1',
    department: 'executive',
    icon: 'Crown',
    description: 'Executive command, strategy arbitration, KPI governance, and cross-agent accountability.',
    aliases: ['chief-executive', 'executive', 'ceo'],
  }),
  defineAgent({
    id: 'coa',
    abbr: 'C.O.A.',
    name: 'Chief Operating Agent',
    codeName: 'OPS-CORE',
    department: 'operations',
    icon: 'Activity',
    description: 'Operational cadence, SOP enforcement, capacity planning, and process optimization.',
    aliases: ['operations', 'chief-of-staff', 'support', 'analytics'],
  }),
  defineAgent({
    id: 'cfa',
    abbr: 'C.F.A.',
    name: 'Chief Financial Agent',
    codeName: 'FIN-OPS',
    department: 'finance',
    icon: 'DollarSign',
    description: 'Revenue quality, billing operations, cash-flow forecasting, and spend monitoring.',
    aliases: ['finance', 'billing-ops', 'revenue-ops'],
  }),
  defineAgent({
    id: 'cta',
    abbr: 'C.T.A.',
    name: 'Chief Technology Agent',
    codeName: 'FORGE',
    department: 'engineering',
    icon: 'Server',
    description: 'Application health, delivery systems, model routing, and engineering execution.',
    aliases: ['technology', 'devops', 'forge', 'engineering'],
  }),
  defineAgent({
    id: 'cma',
    abbr: 'C.M.A.',
    name: 'Chief Marketing Agent',
    codeName: 'SIGNAL',
    department: 'gtm',
    icon: 'Megaphone',
    description: 'Brand signal, social publishing, campaign testing, and demand generation.',
    aliases: ['marketing', 'cmo', 'content', 'growth-marketing'],
  }),
  defineAgent({
    id: 'cra',
    abbr: 'C.R.A.',
    name: 'Chief Revenue Agent',
    codeName: 'SDR-AUTO',
    department: 'gtm',
    icon: 'TrendingUp',
    description: 'Prospecting, pipeline generation, outreach orchestration, and conversion strategy.',
    aliases: ['sales', 'sdr', 'lifecycle-manager', 'sales-pipeline'],
  }),
  defineAgent({
    id: 'cpa',
    abbr: 'C.P.A.',
    name: 'Chief Product Agent',
    codeName: 'PRODUCT-LAB',
    department: 'product',
    icon: 'Sparkles',
    description: 'Product discovery, UX quality, experiment design, and roadmap prioritization.',
    aliases: ['product', 'prompt-engineer', 'qa', 'content-kb'],
  }),
  defineAgent({
    id: 'csa',
    abbr: 'C.S.A.',
    name: 'Chief Security Agent',
    codeName: 'SHIELD',
    department: 'security',
    icon: 'Shield',
    description: 'Security posture, policy checks, compliance monitoring, and incident response.',
    aliases: ['security', 'security-audit', 'compliance'],
  }),
  defineAgent({
    id: 'csoa',
    abbr: 'C.S.O.A.',
    name: 'Chief Success Officer Agent',
    codeName: 'SUCCESS',
    department: 'customer-success',
    icon: 'Users',
    description: 'Client onboarding, retention health, lifecycle touchpoints, and renewal readiness.',
    aliases: ['customer-success', 'success', 'onboarding-monitor'],
  }),
  defineAgent({
    id: 'cca',
    abbr: 'C.C.A.',
    name: 'Chief Culture Agent',
    codeName: 'CULTURE',
    department: 'people',
    icon: 'UserCog',
    description: 'Team rhythm, training loops, internal enablement, and operating culture.',
    aliases: ['culture', 'people', 'hr'],
  }),
  defineAgent({
    id: 'cia',
    abbr: 'C.I.A.',
    name: 'Chief Infrastructure Agent',
    codeName: 'INFRA',
    department: 'engineering',
    icon: 'Globe',
    description: 'Cloud resources, sandbox provisioning, environment reliability, and scaling controls.',
    aliases: ['infrastructure', 'sandbox-provisioner', 'infra'],
  }),
  defineAgent({
    id: 'cla',
    abbr: 'C.L.A.',
    name: 'Chief Legal Agent',
    codeName: 'LEGAL',
    department: 'legal',
    icon: 'Scale',
    description: 'Legal review, policy alignment, risk language, and compliance documentation.',
    aliases: ['legal', 'policy'],
  }),
  defineAgent({
    id: 'cosa',
    abbr: 'C.O.S.A.',
    name: 'Chief of Staff Agent',
    codeName: 'STAFF',
    department: 'executive',
    icon: 'Bot',
    description: 'Executive follow-through, meeting hygiene, decision tracking, and agent coordination.',
    aliases: ['chief-of-staff-agent', 'staff', 'waitlist-manager'],
  }),
];

export const INTERNAL_AGENTS = Object.fromEntries(
  INTERNAL_AGENT_REGISTRY.map((agent) => [agent.id, agent])
);

export const INTERNAL_AGENT_ALIASES = INTERNAL_AGENT_REGISTRY.reduce((aliases, agent) => {
  agent.aliases.forEach((alias) => {
    aliases[alias] = agent.id;
  });
  return aliases;
}, {});

export function resolveInternalAgentId(agentId = 'cea') {
  const normalized = String(agentId || 'cea').trim().toLowerCase();
  return INTERNAL_AGENTS[normalized] ? normalized : INTERNAL_AGENT_ALIASES[normalized] || 'cea';
}

export function getInternalAgentById(agentId = 'cea') {
  return INTERNAL_AGENTS[resolveInternalAgentId(agentId)];
}

export function getInternalAgentState(states = {}, agentOrId = 'cea') {
  const agent = typeof agentOrId === 'string' ? getInternalAgentById(agentOrId) : agentOrId;
  if (!agent) return null;

  return (
    states[agent.id] ||
    agent.aliases.map((alias) => states[alias]).find(Boolean) ||
    null
  );
}

export function normalizeInternalAgentActivity(entry = {}) {
  const agent = getInternalAgentById(entry.agentId || entry.agent || 'cea');
  return {
    ...entry,
    agentId: agent.id,
    agent: agent.abbr,
    agentName: agent.name,
  };
}
