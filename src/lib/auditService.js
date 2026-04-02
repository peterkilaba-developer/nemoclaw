/**
 * Audit Trail Service — NemoC LAW AI
 *
 * Immutable logging of all agent interactions, data access events,
 * policy changes, and security-relevant actions.
 * Only firm owners / managing partners can view audit logs.
 */

import {
  collection, addDoc, getDocs, getDoc, doc, query,
  where, orderBy, limit, startAfter, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

// ═══════════════════════════════════════════════
//  AUDIT EVENT TYPES
// ═══════════════════════════════════════════════

export const AUDIT_EVENTS = {
  // Agent interactions
  AGENT_MESSAGE: 'agent.message',
  AGENT_SUB_DISPATCH: 'agent.sub_dispatch',
  AGENT_ERROR: 'agent.error',

  // Data access
  DATA_MATTER_ACCESS: 'data.matter_access',
  DATA_CLIENT_ACCESS: 'data.client_access',
  DATA_FINANCIAL_ACCESS: 'data.financial_access',
  DATA_EXPORT: 'data.export',

  // Security events
  SECURITY_PII_REDACTED: 'security.pii_redacted',
  SECURITY_UPL_FLAGGED: 'security.upl_flagged',
  SECURITY_ETHICAL_WALL: 'security.ethical_wall_violation',
  SECURITY_PRIVILEGE_BLOCK: 'security.privilege_block',
  SECURITY_ACCESS_DENIED: 'security.access_denied',

  // Policy events
  POLICY_UPDATED: 'policy.updated',
  POLICY_AGENT_RENAMED: 'policy.agent_renamed',
  POLICY_EMPLOYEE_ADDED: 'policy.employee_added',
  POLICY_EMPLOYEE_REMOVED: 'policy.employee_removed',

  // Authentication
  AUTH_LOGIN: 'auth.login',
  AUTH_LOGOUT: 'auth.logout',
  AUTH_ROLE_CHANGE: 'auth.role_change',
};

// ═══════════════════════════════════════════════
//  LOG FUNCTIONS
// ═══════════════════════════════════════════════

/**
 * Log an agent interaction to the audit trail.
 */
export async function logAgentInteraction(firmId, {
  agentId,
  employeeEmail,
  employeeName,
  agentType,
  userMessage,
  agentResponse,
  subAgentsUsed = [],
  piiRedactions = [],
  uplFlagged = false,
  responseTimeMs = 0,
}) {
  return addDoc(collection(db, 'firms', firmId, 'auditLog'), {
    type: AUDIT_EVENTS.AGENT_MESSAGE,
    agentId,
    employeeEmail,
    employeeName,
    agentType,
    userMessage: truncate(userMessage, 500),
    agentResponse: truncate(agentResponse, 500),
    subAgentsUsed,
    piiRedactions,
    uplFlagged,
    responseTimeMs,
    timestamp: serverTimestamp(),
    immutable: true,
  });
}

/**
 * Log a data access event.
 */
export async function logDataAccess(firmId, {
  agentId,
  employeeEmail,
  eventType,
  resource,       // e.g., "matters/abc123"
  action,         // "read" | "write"
  granted,        // true | false
  reason = '',    // why denied, if applicable
}) {
  return addDoc(collection(db, 'firms', firmId, 'auditLog'), {
    type: eventType,
    agentId,
    employeeEmail,
    resource,
    action,
    granted,
    reason,
    timestamp: serverTimestamp(),
    immutable: true,
  });
}

/**
 * Log a security event (PII redaction, UPL flag, ethical wall violation).
 */
export async function logSecurityEvent(firmId, {
  agentId,
  employeeEmail,
  eventType,
  details = {},
  severity = 'info', // 'info' | 'warning' | 'critical'
}) {
  return addDoc(collection(db, 'firms', firmId, 'auditLog'), {
    type: eventType,
    agentId,
    employeeEmail,
    ...details,
    severity,
    timestamp: serverTimestamp(),
    immutable: true,
  });
}

/**
 * Log a policy change event.
 */
export async function logPolicyChange(firmId, {
  changedBy,       // email of the managing partner who made the change
  eventType,
  description,
  before = null,   // previous state
  after = null,    // new state
}) {
  return addDoc(collection(db, 'firms', firmId, 'auditLog'), {
    type: eventType,
    changedBy,
    description,
    before,
    after,
    timestamp: serverTimestamp(),
    immutable: true,
  });
}

// ═══════════════════════════════════════════════
//  QUERY FUNCTIONS
// ═══════════════════════════════════════════════

/**
 * Get audit log entries with optional filters.
 *
 * @param {string} firmId
 * @param {Object} filters - { type, agentId, severity, startDate, endDate }
 * @param {number} pageSize
 * @param {Object} lastDoc - Last document for pagination
 */
export async function getAuditLog(firmId, filters = {}, pageSize = 50, lastDoc = null) {
  let q = collection(db, 'firms', firmId, 'auditLog');
  const constraints = [orderBy('timestamp', 'desc')];

  if (filters.type) {
    constraints.unshift(where('type', '==', filters.type));
  }
  if (filters.agentId) {
    constraints.unshift(where('agentId', '==', filters.agentId));
  }
  if (filters.severity) {
    constraints.unshift(where('severity', '==', filters.severity));
  }
  if (filters.employeeEmail) {
    constraints.unshift(where('employeeEmail', '==', filters.employeeEmail));
  }

  constraints.push(limit(pageSize));

  if (lastDoc) {
    constraints.push(startAfter(lastDoc));
  }

  const snap = await getDocs(query(q, ...constraints));
  return {
    entries: snap.docs.map(d => ({ id: d.id, ...d.data() })),
    lastDoc: snap.docs[snap.docs.length - 1] || null,
    hasMore: snap.docs.length === pageSize,
  };
}

/**
 * Get security events summary (for dashboard widget).
 */
export async function getSecuritySummary(firmId, lastNDays = 7) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - lastNDays);

  const snap = await getDocs(query(
    collection(db, 'firms', firmId, 'auditLog'),
    where('type', '>=', 'security.'),
    where('type', '<=', 'security.\uf8ff'),
    orderBy('type'),
    orderBy('timestamp', 'desc'),
    limit(200),
  ));

  const events = snap.docs.map(d => d.data());

  return {
    totalEvents: events.length,
    piiRedactions: events.filter(e => e.type === AUDIT_EVENTS.SECURITY_PII_REDACTED).length,
    uplFlags: events.filter(e => e.type === AUDIT_EVENTS.SECURITY_UPL_FLAGGED).length,
    ethicalWallBlocks: events.filter(e => e.type === AUDIT_EVENTS.SECURITY_ETHICAL_WALL).length,
    privilegeBlocks: events.filter(e => e.type === AUDIT_EVENTS.SECURITY_PRIVILEGE_BLOCK).length,
    accessDenials: events.filter(e => e.type === AUDIT_EVENTS.SECURITY_ACCESS_DENIED).length,
    criticalCount: events.filter(e => e.severity === 'critical').length,
  };
}

/**
 * Get agent activity stats (for team management dashboard).
 */
export async function getAgentActivityStats(firmId) {
  const snap = await getDocs(query(
    collection(db, 'firms', firmId, 'auditLog'),
    where('type', '==', AUDIT_EVENTS.AGENT_MESSAGE),
    orderBy('timestamp', 'desc'),
    limit(500),
  ));

  const events = snap.docs.map(d => d.data());

  // Group by agent
  const byAgent = {};
  for (const e of events) {
    const key = e.agentId || 'unknown';
    if (!byAgent[key]) {
      byAgent[key] = {
        agentId: key,
        employeeName: e.employeeName || 'Unknown',
        employeeEmail: e.employeeEmail || '',
        agentType: e.agentType || '',
        messageCount: 0,
        subAgentDispatches: 0,
        uplFlags: 0,
        avgResponseMs: 0,
        totalResponseMs: 0,
      };
    }
    byAgent[key].messageCount++;
    byAgent[key].subAgentDispatches += (e.subAgentsUsed?.length || 0);
    byAgent[key].uplFlags += (e.uplFlagged ? 1 : 0);
    byAgent[key].totalResponseMs += (e.responseTimeMs || 0);
  }

  // Calc averages
  for (const agent of Object.values(byAgent)) {
    agent.avgResponseMs = agent.messageCount > 0
      ? Math.round(agent.totalResponseMs / agent.messageCount)
      : 0;
    delete agent.totalResponseMs;
  }

  return Object.values(byAgent);
}

// ═══════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════

function truncate(str, maxLen) {
  if (!str) return '';
  return str.length > maxLen ? str.substring(0, maxLen) + '...' : str;
}
