import {
  collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp,
  updateDoc, writeBatch,
} from 'firebase/firestore';
import { db, setHumanAgentSeatCount } from './firebase';

export const MAX_FIRM_EMPLOYEE_COUNT = 20;

// Human roles are mapped to a personal agent type and its least-privilege toolset.
export const EMPLOYEE_ROLES = [
  { value: 'solo-partner', label: 'Solo Practitioner', agentType: 'partner', tier: 'attorney', division: 'practice', superAgentAccess: true, canEditFirmPolicies: true },
  { value: 'managing-partner', label: 'Managing Partner', agentType: 'partner', tier: 'attorney', division: 'practice', superAgentAccess: true, canEditFirmPolicies: true },
  { value: 'partner', label: 'Equity Partner', agentType: 'partner', tier: 'attorney', division: 'practice', superAgentAccess: true, canEditFirmPolicies: false },
  { value: 'income-partner', label: 'Income Partner', agentType: 'partner', tier: 'attorney', division: 'practice', superAgentAccess: true, canEditFirmPolicies: false },
  { value: 'of-counsel', label: 'Of Counsel', agentType: 'of-counsel', tier: 'of-counsel', division: 'practice', superAgentAccess: 'read-only', canEditFirmPolicies: false },
  { value: 'senior-associate', label: 'Senior Associate', agentType: 'associate', tier: 'associate', division: 'practice', superAgentAccess: false, canEditFirmPolicies: false },
  { value: 'associate', label: 'Associate Attorney', agentType: 'associate', tier: 'associate', division: 'practice', superAgentAccess: false, canEditFirmPolicies: false },
  { value: 'junior-associate', label: 'Junior Associate', agentType: 'associate', tier: 'associate', division: 'practice', superAgentAccess: false, canEditFirmPolicies: false },
  { value: 'contract-attorney', label: 'Contract Attorney', agentType: 'associate', tier: 'attorney', division: 'practice', superAgentAccess: false, canEditFirmPolicies: false },
  { value: 'paralegal', label: 'Paralegal', agentType: 'paralegal', tier: 'staff', division: 'practice', superAgentAccess: false },
  { value: 'litigation-paralegal', label: 'Litigation Paralegal', agentType: 'paralegal', tier: 'staff', division: 'practice', superAgentAccess: false },
  { value: 'case-manager', label: 'Case Manager', agentType: 'case-manager', tier: 'staff', division: 'practice', superAgentAccess: false },
  { value: 'legal-assistant', label: 'Legal Assistant', agentType: 'legal-assistant', tier: 'staff', division: 'practice', superAgentAccess: false },
  { value: 'law-clerk', label: 'Law Clerk', agentType: 'law-clerk', tier: 'staff', division: 'practice', superAgentAccess: false },
  { value: 'intern', label: 'Intern / Summer Associate', agentType: 'intern', tier: 'staff', division: 'practice', superAgentAccess: false },
  { value: 'secretary', label: 'Legal Secretary', agentType: 'secretary', tier: 'staff', division: 'business', superAgentAccess: false },
  { value: 'docketing-clerk', label: 'Docketing Clerk', agentType: 'docketing', tier: 'staff', division: 'business', superAgentAccess: false },
  { value: 'records-clerk', label: 'Records Clerk', agentType: 'records', tier: 'staff', division: 'business', superAgentAccess: false },
  { value: 'receptionist', label: 'Receptionist', agentType: 'receptionist', tier: 'staff', division: 'business', superAgentAccess: false },
  { value: 'intake', label: 'Intake Coordinator', agentType: 'receptionist', tier: 'staff', division: 'business', superAgentAccess: false },
  { value: 'client-success', label: 'Client Success Coordinator', agentType: 'receptionist', tier: 'staff', division: 'business', superAgentAccess: false },
  { value: 'billing', label: 'Billing Clerk', agentType: 'billing', tier: 'staff', division: 'business', superAgentAccess: false },
  { value: 'bookkeeper', label: 'Bookkeeper', agentType: 'billing', tier: 'staff', division: 'business', superAgentAccess: false },
  { value: 'accounting-manager', label: 'Accounting Manager', agentType: 'finance', tier: 'staff', division: 'business', superAgentAccess: false },
  { value: 'office-manager', label: 'Office Manager', agentType: 'operations', tier: 'staff', division: 'business', superAgentAccess: false },
  { value: 'firm-administrator', label: 'Firm Administrator', agentType: 'operations', tier: 'staff', division: 'business', superAgentAccess: false },
  { value: 'practice-manager', label: 'Practice Manager', agentType: 'operations', tier: 'staff', division: 'business', superAgentAccess: false },
  { value: 'marketing-coordinator', label: 'Marketing Coordinator', agentType: 'marketing', tier: 'staff', division: 'business', superAgentAccess: false },
  { value: 'business-development', label: 'Business Development', agentType: 'marketing', tier: 'staff', division: 'business', superAgentAccess: false },
  { value: 'hr-admin', label: 'HR / Payroll Admin', agentType: 'operations', tier: 'staff', division: 'business', superAgentAccess: false },
  { value: 'it-admin', label: 'IT / Systems Admin', agentType: 'operations', tier: 'staff', division: 'business', superAgentAccess: false },
];

export const OWNER_ELIGIBLE_ROLES = ['solo-partner', 'managing-partner'];
export const PARTNER_ROLES = ['solo-partner', 'managing-partner', 'partner', 'income-partner'];
export const getOwnerRole = firmSize => firmSize === 'solo' ? 'solo-partner' : 'managing-partner';

export const AGENT_SUB_AGENTS = {
  partner: ['legal-research', 'contract-review', 'drafting', 'case-analytics', 'business-intelligence', 'knowledge-search', 'communication-drafter', 'due-diligence', 'trust-accounting'],
  'of-counsel': ['legal-research', 'contract-review', 'drafting', 'ediscovery', 'deposition-prep', 'case-analytics', 'knowledge-search', 'communication-drafter', 'due-diligence'],
  associate: ['legal-research', 'contract-review', 'drafting', 'ediscovery', 'deposition-prep', 'knowledge-search', 'communication-drafter', 'due-diligence', 'court-filing'],
  paralegal: ['legal-research', 'ediscovery', 'document-formatting', 'deposition-prep', 'knowledge-search', 'court-filing', 'deadline-tracker'],
  'case-manager': ['client-intake', 'scheduling', 'deadline-tracker', 'knowledge-search', 'communication-drafter', 'case-analytics', 'court-filing'],
  'legal-assistant': ['scheduling', 'document-formatting', 'knowledge-search', 'communication-drafter', 'deadline-tracker', 'court-filing'],
  'law-clerk': ['legal-research', 'drafting', 'knowledge-search', 'due-diligence'],
  intern: ['legal-research', 'knowledge-search'],
  receptionist: ['client-intake', 'scheduling', 'lead-qualification', 'communication-drafter'],
  secretary: ['scheduling', 'document-formatting', 'knowledge-search', 'communication-drafter', 'deadline-tracker', 'court-filing'],
  docketing: ['deadline-tracker', 'court-filing', 'scheduling', 'knowledge-search', 'compliance-monitor'],
  records: ['knowledge-search', 'document-formatting', 'ediscovery'],
  billing: ['billing-time', 'knowledge-search', 'communication-drafter', 'trust-accounting'],
  finance: ['billing-time', 'trust-accounting', 'business-intelligence', 'knowledge-search', 'communication-drafter'],
  operations: ['compliance-monitor', 'knowledge-search', 'communication-drafter', 'trust-accounting', 'business-intelligence'],
  marketing: ['lead-qualification', 'client-intake', 'communication-drafter', 'business-intelligence', 'knowledge-search'],
};

const restricted = {
  allClientMatters: false, financial: false, firmStrategy: false,
  caseWorkProduct: 'assigned-only', clientContacts: 'assigned-only',
  auditLogs: false, agentConfigs: 'own-only',
};

export const ACCESS_MATRIX = {
  partner: { allClientMatters: true, financial: true, firmStrategy: true, caseWorkProduct: true, clientContacts: true, auditLogs: 'own-team', agentConfigs: 'own-and-reports' },
  'of-counsel': { ...restricted, allClientMatters: 'own-plus-research', caseWorkProduct: 'own-matters', clientContacts: 'own-matters', auditLogs: 'read-only' },
  associate: restricted,
  paralegal: { ...restricted, caseWorkProduct: 'assigned-limited' },
  'case-manager': { ...restricted, caseWorkProduct: 'assigned-limited', clientContacts: 'assigned-only' },
  'legal-assistant': { ...restricted, caseWorkProduct: 'assigned-limited', clientContacts: 'assigned-only' },
  'law-clerk': { ...restricted, caseWorkProduct: 'research-only', clientContacts: false },
  intern: { ...restricted, caseWorkProduct: 'sandboxed', clientContacts: false },
  receptionist: { ...restricted, caseWorkProduct: false, clientContacts: true },
  secretary: { ...restricted, caseWorkProduct: 'assigned-limited' },
  docketing: { ...restricted, caseWorkProduct: 'deadlines-only', clientContacts: false },
  records: { ...restricted, caseWorkProduct: 'document-index-only', clientContacts: false },
  billing: { ...restricted, financial: true, caseWorkProduct: false, clientContacts: 'billing-only' },
  finance: { ...restricted, financial: true, firmStrategy: 'financial-only', caseWorkProduct: false, clientContacts: 'billing-only', auditLogs: true },
  operations: { ...restricted, financial: 'summary-only', caseWorkProduct: false, clientContacts: false, auditLogs: true, agentConfigs: true },
  marketing: { ...restricted, firmStrategy: 'growth-only', caseWorkProduct: false, clientContacts: 'prospects-only' },
};

export const SUB_AGENT_CATALOG = [
  ['legal-research', 'Legal Research'], ['contract-review', 'Contract Review'], ['drafting', 'Drafting'],
  ['ediscovery', 'eDiscovery'], ['client-intake', 'Client Intake'], ['scheduling', 'Scheduling'],
  ['lead-qualification', 'Lead Qualification'], ['billing-time', 'Billing & Time'],
  ['document-formatting', 'Document Formatting'], ['compliance-monitor', 'Compliance Monitor'],
  ['deposition-prep', 'Deposition Prep'], ['knowledge-search', 'Knowledge Search'],
  ['communication-drafter', 'Communication Drafter'], ['case-analytics', 'Case Analytics'],
  ['business-intelligence', 'Business Intelligence'], ['due-diligence', 'Due Diligence'],
  ['trust-accounting', 'Trust Accounting'], ['court-filing', 'Court Filing'], ['deadline-tracker', 'Deadline Tracking'],
].map(([id, name]) => ({ id, name }));

function roleConfig(role) {
  return EMPLOYEE_ROLES.find(item => item.value === role) || EMPLOYEE_ROLES.find(item => item.value === 'associate');
}

function employeePayload(data) {
  return {
    name: data.name, email: data.email, role: data.role,
    photoURL: data.photoURL || null,
    practiceAreas: data.practiceAreas || [],
    supervisingPartnerId: data.supervisingPartnerId || null,
  };
}

function agentPayload(firmId, employeeId, data) {
  const config = roleConfig(data.role);
  return {
    id: employeeId, humanId: employeeId, humanName: data.name, humanEmail: data.email,
    employeeId, employeeName: data.name, employeeEmail: data.email,
    employeePhotoURL: data.photoURL || null,
    agentType: config.agentType,
    agentName: data.agentName || `${data.name}'s AI Chief of Staff`,
    humanRole: data.role, firmId,
    permissions: ACCESS_MATRIX[config.agentType] || {},
    availableSubAgents: AGENT_SUB_AGENTS[config.agentType] || [],
    context: { preferences: {}, writingStyle: null, caseload: [] },
    settings: { showSubAgentVisibility: false },
    superAgentAccess: config.superAgentAccess || false,
    canEditFirmPolicies: config.canEditFirmPolicies || false,
    status: 'active', updatedAt: serverTimestamp(),
  };
}

export async function saveRosterAndCreateAgents(firmId, employees) {
  if (employees.length > MAX_FIRM_EMPLOYEE_COUNT) {
    throw new Error(`Small-firm workspaces support up to ${MAX_FIRM_EMPLOYEE_COUNT} mapped humans.`);
  }

  const batch = writeBatch(db);
  const partners = employees.filter(item => PARTNER_ROLES.includes(item.role));
  batch.set(doc(db, 'firms', firmId, 'superAgent', 'config'), {
    firmId,
    authorizedPartnerIds: partners.map(item => item.id || item.email),
    managingPartnerIds: employees.filter(item => OWNER_ELIGIBLE_ROLES.includes(item.role)).map(item => item.id || item.email),
    status: 'active', updatedAt: serverTimestamp(), createdAt: serverTimestamp(),
  }, { merge: true });

  employees.forEach(item => {
    const employeeId = (item.id || item.email || item.name).toLowerCase().replace(/[^a-z0-9]/g, '_');
    batch.set(doc(db, 'firms', firmId, 'employees', employeeId), { ...employeePayload(item), createdAt: serverTimestamp() }, { merge: true });
    batch.set(doc(db, 'firms', firmId, 'agents', employeeId), { ...agentPayload(firmId, employeeId, item), createdAt: serverTimestamp() }, { merge: true });
  });
  await batch.commit();
}

export async function getEmployees(firmId) {
  const snap = await getDocs(collection(db, 'firms', firmId, 'employees'));
  return snap.docs.map(item => ({ id: item.id, ...item.data() }));
}

export async function getAgents(firmId) {
  const snap = await getDocs(collection(db, 'firms', firmId, 'agents'));
  return snap.docs.map(item => ({ id: item.id, ...item.data() }));
}

export async function getSuperAgent(firmId) {
  const snap = await getDoc(doc(db, 'firms', firmId, 'superAgent', 'config'));
  return snap.exists() ? snap.data() : null;
}

export async function getAgentForEmployee(firmId, employeeId) {
  const snap = await getDoc(doc(db, 'firms', firmId, 'agents', employeeId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function addEmployee(firmId, data) {
  const currentEmployees = await getEmployees(firmId);
  if (currentEmployees.length >= MAX_FIRM_EMPLOYEE_COUNT) {
    throw new Error(`Small-firm workspaces support up to ${MAX_FIRM_EMPLOYEE_COUNT} mapped humans. Contact support for a larger firm deployment.`);
  }

  const employeeRef = doc(collection(db, 'firms', firmId, 'employees'));
  const batch = writeBatch(db);
  batch.set(employeeRef, { ...employeePayload(data), createdAt: serverTimestamp() });
  batch.set(doc(db, 'firms', firmId, 'agents', employeeRef.id), { ...agentPayload(firmId, employeeRef.id, data), createdAt: serverTimestamp() });
  const nextSeatCount = (await currentExtraSeats(firmId)) + 1;
  batch.update(doc(db, 'firms', firmId), { extraSeats: nextSeatCount, updatedAt: serverTimestamp() });
  await batch.commit();
  await setHumanAgentSeatCount({ firmId, count: nextSeatCount });
  return employeeRef.id;
}

async function currentExtraSeats(firmId) {
  const snap = await getDoc(doc(db, 'firms', firmId));
  return snap.exists() ? Number(snap.data().extraSeats || 0) : 0;
}

export async function updateEmployee(firmId, employeeId, data) {
  const batch = writeBatch(db);
  batch.update(doc(db, 'firms', firmId, 'employees', employeeId), { ...employeePayload(data), updatedAt: serverTimestamp() });
  batch.set(doc(db, 'firms', firmId, 'agents', employeeId), agentPayload(firmId, employeeId, data), { merge: true });
  await batch.commit();
}

export async function removeEmployee(firmId, employeeId) {
  await deleteDoc(doc(db, 'firms', firmId, 'agents', employeeId));
  await deleteDoc(doc(db, 'firms', firmId, 'employees', employeeId));
  const seats = await currentExtraSeats(firmId);
  const nextSeatCount = Math.max(0, seats - 1);
  await updateDoc(doc(db, 'firms', firmId), { extraSeats: nextSeatCount, updatedAt: serverTimestamp() });
  await setHumanAgentSeatCount({ firmId, count: nextSeatCount });
}
