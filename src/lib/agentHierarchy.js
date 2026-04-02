// ═══════════════════════════════════════════════════════════════
//  AGENT HIERARCHY — 4-Tier Architecture
//  Super Agent → Personal Agents → Sub-Agents
//  Tiers: Attorney | Of Counsel | Associate | Staff
// ═══════════════════════════════════════════════════════════════

import {
  doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc,
  collection, query, where, serverTimestamp, writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';

// ─────────────────────────────────────────────────────────
//  ROLE DEFINITIONS — maps employee roles to agent configs
// ─────────────────────────────────────────────────────────

export const EMPLOYEE_ROLES = [
  // ═══ PRACTICE OF LAW — Legal service delivery ═══
  // Tier 1 — Attorney (Full Legal Authority)
  { value: 'solo-partner', label: 'Solo Practitioner', agentType: 'partner', tier: 'attorney', division: 'practice', superAgentAccess: true, canEditFirmPolicies: true },
  { value: 'managing-partner', label: 'Managing Partner', agentType: 'partner', tier: 'attorney', division: 'practice', superAgentAccess: true, canEditFirmPolicies: true },
  { value: 'partner', label: 'Equity Partner', agentType: 'partner', tier: 'attorney', division: 'practice', superAgentAccess: true, canEditFirmPolicies: false },
  { value: 'income-partner', label: 'Income Partner', agentType: 'partner', tier: 'attorney', division: 'practice', superAgentAccess: true, canEditFirmPolicies: false },
  // Tier 2 — Of Counsel (Senior Advisory)
  { value: 'of-counsel', label: 'Of Counsel', agentType: 'of-counsel', tier: 'of-counsel', division: 'practice', superAgentAccess: 'read-only', canEditFirmPolicies: false },
  // Tier 3 — Associate (Licensed Attorney, Limited Scope)
  { value: 'senior-associate', label: 'Senior Associate', agentType: 'associate', tier: 'associate', division: 'practice', superAgentAccess: false, canEditFirmPolicies: false },
  { value: 'associate', label: 'Associate Attorney', agentType: 'associate', tier: 'associate', division: 'practice', superAgentAccess: false, canEditFirmPolicies: false },
  // Practice Support Staff
  { value: 'paralegal', label: 'Paralegal', agentType: 'paralegal', tier: 'staff', division: 'practice', superAgentAccess: false },
  { value: 'law-clerk', label: 'Law Clerk', agentType: 'law-clerk', tier: 'staff', division: 'practice', superAgentAccess: false },
  { value: 'intern', label: 'Intern / Summer Associate', agentType: 'intern', tier: 'staff', division: 'practice', superAgentAccess: false },

  // ═══ BUSINESS OF LAW — Firm operations & administration ═══
  { value: 'secretary', label: 'Legal Secretary', agentType: 'secretary', tier: 'staff', division: 'business', superAgentAccess: false },
  { value: 'receptionist', label: 'Receptionist', agentType: 'receptionist', tier: 'staff', division: 'business', superAgentAccess: false },
  { value: 'intake', label: 'Intake Coordinator', agentType: 'receptionist', tier: 'staff', division: 'business', superAgentAccess: false },
  { value: 'billing', label: 'Billing Clerk', agentType: 'billing', tier: 'staff', division: 'business', superAgentAccess: false },
  { value: 'bookkeeper', label: 'Bookkeeper', agentType: 'billing', tier: 'staff', division: 'business', superAgentAccess: false },
  { value: 'office-manager', label: 'Office Manager', agentType: 'operations', tier: 'staff', division: 'business', superAgentAccess: false },
];

// Which sub-agents are available to each agent type
export const AGENT_SUB_AGENTS = {
  partner: [
    'legal-research', 'contract-review', 'drafting', 'case-analytics',
    'business-intelligence', 'knowledge-search', 'communication-drafter',
  ],
  'of-counsel': [
    'legal-research', 'contract-review', 'drafting', 'ediscovery',
    'deposition-prep', 'case-analytics', 'knowledge-search', 'communication-drafter',
  ],
  associate: [
    'legal-research', 'contract-review', 'drafting', 'ediscovery',
    'deposition-prep', 'knowledge-search', 'communication-drafter',
  ],
  paralegal: [
    'legal-research', 'ediscovery', 'document-formatting', 'deposition-prep',
    'knowledge-search',
  ],
  'law-clerk': [
    'legal-research', 'drafting', 'knowledge-search',
  ],
  receptionist: [
    'client-intake', 'scheduling', 'lead-qualification', 'communication-drafter',
  ],
  secretary: [
    'scheduling', 'document-formatting', 'knowledge-search', 'communication-drafter',
  ],
  billing: [
    'billing-time', 'knowledge-search', 'communication-drafter',
  ],
  operations: [
    'compliance-monitor', 'knowledge-search', 'communication-drafter',
  ],

  intern: [
    'legal-research', 'knowledge-search',
  ],
};

// Access control matrix — what each agent type can see
export const ACCESS_MATRIX = {
  partner: {
    allClientMatters: true,
    financial: true,
    firmStrategy: true,
    caseWorkProduct: true,
    clientContacts: true,
    auditLogs: 'own-team',
    agentConfigs: 'own-and-reports',
  },
  'of-counsel': {
    allClientMatters: 'own-plus-research',
    financial: false,
    firmStrategy: false,
    caseWorkProduct: 'own-matters',
    clientContacts: 'own-matters',
    auditLogs: 'read-only',
    agentConfigs: 'own-only',
  },
  associate: {
    allClientMatters: false,
    financial: false,
    firmStrategy: false,
    caseWorkProduct: 'assigned-only',
    clientContacts: 'assigned-only',
    auditLogs: false,
    agentConfigs: 'own-only',
  },
  paralegal: {
    allClientMatters: false,
    financial: false,
    firmStrategy: false,
    caseWorkProduct: 'assigned-limited',
    clientContacts: 'assigned-only',
    auditLogs: false,
    agentConfigs: 'own-only',
  },
  'law-clerk': {
    allClientMatters: false,
    financial: false,
    firmStrategy: false,
    caseWorkProduct: 'research-only',
    clientContacts: false,
    auditLogs: false,
    agentConfigs: 'own-only',
  },
  receptionist: {
    allClientMatters: false,
    financial: false,
    firmStrategy: false,
    caseWorkProduct: false,
    clientContacts: true,
    auditLogs: false,
    agentConfigs: 'own-only',
  },
  secretary: {
    allClientMatters: false,
    financial: false,
    firmStrategy: false,
    caseWorkProduct: 'assigned-limited',
    clientContacts: 'assigned-only',
    auditLogs: false,
    agentConfigs: 'own-only',
  },
  billing: {
    allClientMatters: false,
    financial: true,
    firmStrategy: false,
    caseWorkProduct: false,
    clientContacts: 'billing-only',
    auditLogs: false,
    agentConfigs: 'own-only',
  },
  operations: {
    allClientMatters: false,
    financial: 'summary-only',
    firmStrategy: false,
    caseWorkProduct: false,
    clientContacts: false,
    auditLogs: true,
    agentConfigs: true,
  },

  intern: {
    allClientMatters: false,
    financial: false,
    firmStrategy: false,
    caseWorkProduct: 'sandboxed',
    clientContacts: false,
    auditLogs: false,
    agentConfigs: 'own-only',
  },
};

// Sub-agent definitions
export const SUB_AGENT_CATALOG = [
  { id: 'legal-research', name: 'Legal Research', desc: 'Case law search, precedent analysis, citation formatting', icon: 'Search' },
  { id: 'contract-review', name: 'Contract Review', desc: 'Redlining, risk flagging, clause comparison', icon: 'FileText' },
  { id: 'drafting', name: 'Drafting', desc: 'Motions, briefs, letters, memos', icon: 'PenTool' },
  { id: 'ediscovery', name: 'eDiscovery', desc: 'Document review, privilege tagging, Bates numbering', icon: 'FolderSearch' },
  { id: 'client-intake', name: 'Client Intake', desc: 'Conflict check, lead scoring, intake processing', icon: 'UserCheck' },
  { id: 'scheduling', name: 'Scheduling', desc: 'Calendar management, court dates, reminders', icon: 'Calendar' },
  { id: 'lead-qualification', name: 'Lead Qualification', desc: 'Score and qualify incoming leads', icon: 'TrendingUp' },
  { id: 'billing-time', name: 'Billing & Time', desc: 'Time entries, LEDES invoicing, IOLTA reconciliation', icon: 'DollarSign' },
  { id: 'document-formatting', name: 'Document Formatting', desc: 'Court-compliant formatting, TOA, Bates stamps', icon: 'FileCheck' },
  { id: 'compliance-monitor', name: 'Compliance Monitor', desc: 'Regulatory tracking, deadline alerts, filings', icon: 'Scale' },
  { id: 'deposition-prep', name: 'Deposition Prep', desc: 'Outlines, exhibit identification, question drafts', icon: 'Mic' },
  { id: 'knowledge-search', name: 'Knowledge Search', desc: 'Internal precedent lookup, work product retrieval', icon: 'Database' },
  { id: 'communication-drafter', name: 'Communication Drafter', desc: 'Email drafts, client letters, engagement letters', icon: 'Mail' },
  { id: 'case-analytics', name: 'Case Analytics', desc: 'Outcome prediction, judge tendencies, benchmarks', icon: 'TrendingUp' },
  { id: 'business-intelligence', name: 'Business Intelligence', desc: 'Revenue trends, pipeline analysis, market insights', icon: 'BarChart3' },
];


// ─────────────────────────────────────────────────────────
//  FIRESTORE OPERATIONS — Employees & Agents
// ─────────────────────────────────────────────────────────

/**
 * Save the firm's employee roster and create agents for each.
 * Called during onboarding Step 3 (Firm Roster).
 */
export async function saveRosterAndCreateAgents(firmId, employees) {
  const batch = writeBatch(db);

  // 1. Create Super Agent for the firm
  const superAgentRef = doc(db, 'firms', firmId, 'superAgent', 'config');
  const partnerIds = employees
    .filter(e => ['partner', 'managing-partner', 'solo-partner'].includes(e.role))
    .map(e => e.id || e.email);
  const managingPartnerIds = employees
    .filter(e => ['managing-partner', 'solo-partner'].includes(e.role))
    .map(e => e.id || e.email);

  batch.set(superAgentRef, {
    firmId,
    authorizedPartnerIds: partnerIds,
    managingPartnerIds, // Only these partners can edit firm policies
    firmPolicies: {},
    securityConfig: {},
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // 2. Create each employee + their personal agent
  for (const emp of employees) {
    // Use email-based deterministic ID to prevent duplicates if onboarding is re-run
    // Fallback to name-based deterministic ID if email is missing (for frictionless onboarding)
    const secureIdInput = emp.email || emp.name || Math.random().toString(36).substring(7);
    const safeId = secureIdInput.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
    const empRef = doc(db, 'firms', firmId, 'employees', safeId);
    const roleConfig = EMPLOYEE_ROLES.find(r => r.value === emp.role);
    const agentType = roleConfig?.agentType || 'associate';

    batch.set(empRef, {
      name: emp.name,
      email: emp.email,
      role: emp.role,
      practiceAreas: emp.practiceAreas || [],
      supervisingPartnerId: emp.supervisingPartnerId || null,
      createdAt: serverTimestamp(),
    }, { merge: true });

    // Create the personal agent for this employee (Deterministic ID matches employee)
    const agentRef = doc(db, 'firms', firmId, 'agents', safeId);
    batch.set(agentRef, {
      id: safeId,
      // Internal nomenclature: Human Resource (instead of Employee)
      humanId: safeId,
      humanName: emp.name,
      humanEmail: emp.email,
      // Legacy compatibility for the screenshot field
      employeeId: safeId,
      employeeName: emp.name,
      employeeEmail: emp.email,
      agentType,
      agentName: emp.agentName || `${emp.name}'s AI Chief of Staff`,
      firmId,
      permissions: ACCESS_MATRIX[agentType] || {},
      availableSubAgents: AGENT_SUB_AGENTS[agentType] || [],
      context: {
        preferences: {},
        writingStyle: null,
        caseload: [],
      },
      settings: {
        showSubAgentVisibility: false, // UI toggle for power users to see sub-agent dispatches
      },
      superAgentAccess: roleConfig?.superAgentAccess || false,
      canEditFirmPolicies: roleConfig?.canEditFirmPolicies || false,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }

  await batch.commit();
}

/**
 * Get all employees for a firm.
 */
export async function getEmployees(firmId) {
  const snap = await getDocs(collection(db, 'firms', firmId, 'employees'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Get all agents for a firm.
 */
export async function getAgents(firmId) {
  const snap = await getDocs(collection(db, 'firms', firmId, 'agents'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Get the Super Agent config for a firm.
 */
export async function getSuperAgent(firmId) {
  const snap = await getDoc(doc(db, 'firms', firmId, 'superAgent', 'config'));
  return snap.exists() ? snap.data() : null;
}

/**
 * Get a specific agent by employee ID.
 */
export async function getAgentForEmployee(firmId, employeeId) {
  const snap = await getDoc(doc(db, 'firms', firmId, 'agents', employeeId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Add an employee and create their agent after onboarding.
 */
export async function addEmployee(firmId, employeeData) {
  const empRef = doc(collection(db, 'firms', firmId, 'employees'));
  const roleConfig = EMPLOYEE_ROLES.find(r => r.value === employeeData.role);
  const agentType = roleConfig?.agentType || 'associate';

  await setDoc(empRef, {
    name: employeeData.name,
    email: employeeData.email,
    role: employeeData.role,
    photoURL: employeeData.photoURL || null,
    practiceAreas: employeeData.practiceAreas || [],
    supervisingPartnerId: employeeData.supervisingPartnerId || null,
    createdAt: serverTimestamp(),
  });

  // Create personal agent
  const agentRef = doc(db, 'firms', firmId, 'agents', empRef.id);
  await setDoc(agentRef, {
    employeeId: empRef.id,
    employeeName: employeeData.name,
    employeeEmail: employeeData.email,
    employeePhotoURL: employeeData.photoURL || null,
    agentType,
    agentName: employeeData.agentName || `${employeeData.name}'s AI Chief of Staff`,
    firmId,
    permissions: ACCESS_MATRIX[agentType] || {},
    availableSubAgents: AGENT_SUB_AGENTS[agentType] || [],
    context: { preferences: {}, writingStyle: null, caseload: [] },
    settings: { showSubAgentVisibility: false },
    superAgentAccess: roleConfig?.superAgentAccess || false,
    canEditFirmPolicies: roleConfig?.canEditFirmPolicies || false,
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return empRef.id;
}

/**
 * Update an employee's agent name (personalization).
 */
export async function renameAgent(firmId, agentId, newName) {
  await updateDoc(doc(db, 'firms', firmId, 'agents', agentId), {
    agentName: newName,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Update an existing employee and their personal agent.
 */
export async function updateEmployee(firmId, employeeId, employeeData) {
  const batch = writeBatch(db);
  const empRef = doc(db, 'firms', firmId, 'employees', employeeId);
  const agentRef = doc(db, 'firms', firmId, 'agents', employeeId);
  
  const roleConfig = EMPLOYEE_ROLES.find(r => r.value === employeeData.role);
  const agentType = roleConfig?.agentType || 'associate';

  // Update employee profile
  batch.update(empRef, {
    name: employeeData.name,
    email: employeeData.email,
    role: employeeData.role,
    photoURL: employeeData.photoURL || null,
    supervisingPartnerId: employeeData.supervisingPartnerId || null,
    updatedAt: serverTimestamp(),
  });

  // Update agent config
  batch.update(agentRef, {
    employeeName: employeeData.name,
    employeeEmail: employeeData.email,
    employeePhotoURL: employeeData.photoURL || null,
    agentType,
    agentName: employeeData.agentName || `${employeeData.name}'s AI Chief of Staff`,
    permissions: ACCESS_MATRIX[agentType] || {},
    availableSubAgents: AGENT_SUB_AGENTS[agentType] || [],
    superAgentAccess: roleConfig?.superAgentAccess || false,
    canEditFirmPolicies: roleConfig?.canEditFirmPolicies || false,
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
}

/**
 * Remove an employee and their agent.
 */
export async function removeEmployee(firmId, employeeId) {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'firms', firmId, 'employees', employeeId));
  batch.delete(doc(db, 'firms', firmId, 'agents', employeeId));
  await batch.commit();
}
