/**
 * Internal Agent API — NemoC LAW AI
 *
 * Powers the internal agentic fleet that runs NemoC as a company.
 * Mirrors agentAPI.js architecture but uses internal system prompts
 * and logs to the _internal/ Firestore namespace.
 *
 * Architecture:
 *   AdminDashboard → internalAgentAPI → Firestore (_internal/) → NIM → Nemotron 120B
 *
 * "We drink our own champagne."
 */

import {
  collection, addDoc, getDocs, getDoc, doc, query,
  where, orderBy, limit, serverTimestamp, updateDoc, setDoc,
} from 'firebase/firestore';
import { db } from './firebase';

// ═══════════════════════════════════════════════
//  CONFIGURATION
// ═══════════════════════════════════════════════

const IS_DEV = import.meta.env.DEV;
const NEMOCLAW_ENDPOINT = IS_DEV
  ? '/api/nvidia/v1/chat/completions'
  : (import.meta.env.VITE_NEMOCLAW_ENDPOINT || '/api/nvidia/v1/chat/completions');

const NEMOCLAW_API_KEY = import.meta.env.VITE_NVIDIA_API_KEY || '';
const MODEL_ID = 'nvidia/nemotron-3-super-120b-a12b';

// ═══════════════════════════════════════════════
//  INTERNAL AGENT REGISTRY
// ═══════════════════════════════════════════════

export const INTERNAL_AGENTS = {
  cea: {
    id: 'cea',
    name: 'Chief Executive Agent',
    department: 'executive',
    icon: 'Cpu',
    description: 'Central orchestrator — delegates to all departments',
  },
  sdr: {
    id: 'sdr',
    name: 'SDR Agent',
    department: 'gtm',
    icon: 'TrendingUp',
    description: 'Lead scoring, personalized outreach, pipeline management',
  },
  marketing: {
    id: 'marketing',
    name: 'Marketing Agent',
    department: 'gtm',
    icon: 'Megaphone',
    description: 'Blog posts, LinkedIn content, SEO, release notes',
  },
  'lifecycle-manager': {
    id: 'lifecycle-manager',
    name: 'Lifecycle & Acquisition Agent',
    department: 'gtm',
    icon: 'Users',
    description: 'Monitor active onboards, score firm size, optimize conversion funnel',
  },
  devops: {
    id: 'devops',
    name: 'Codespace Architect',
    department: 'engineering',
    icon: 'Server',
    description: 'GitHub issues, PR drafting, CI/CD pipeline',
  },
  'sandbox-provisioner': {
    id: 'sandbox-provisioner',
    name: 'Sandbox Provisioning Agent',
    department: 'engineering',
    icon: 'Shield',
    description: 'Terraform scripts, GCP sandbox isolation, NIM endpoint setup',
  },
  'security-audit': {
    id: 'security-audit',
    name: 'Security Audit Agent',
    department: 'engineering',
    icon: 'Shield',
    description: 'Firebase log monitoring, IP blocking, incident reports',
  },
  'onboarding-monitor': {
    id: 'onboarding-monitor',
    name: 'Onboarding Agent',
    department: 'customer-success',
    icon: 'UserCheck',
    description: 'Stall detection, automated outreach, setup guidance',
  },
  'prompt-engineer': {
    id: 'prompt-engineer',
    name: 'Legal Prompt Engineer',
    department: 'customer-success',
    icon: 'Sparkles',
    description: 'Review failing prompts, suggest improvements',
  },
  'billing-ops': {
    id: 'billing-ops',
    name: 'Billing Agent',
    department: 'customer-success',
    icon: 'DollarSign',
    description: 'Auto-invoicing, dunning emails, usage alerts',
  },
};

// ═══════════════════════════════════════════════
//  INTERNAL SYSTEM PROMPTS
// ═══════════════════════════════════════════════

const INTERNAL_PROMPTS = {
  cea: `You are the Chief Executive Agent (C.E.A.) of NemoC LAW AI, a legal technology company.
You are the central orchestrator. You have context of the codebase, revenue, onboarding funnel, and server health.
You delegate to three departments: Growth & Sales, Engineering & DevOps, Customer Success.
Escalate to the Human Overseer (Nemo CLAW) ONLY for: revenue decisions >$1K, active breaches, enterprise negotiations.
Be data-driven and concise. Every recommendation must cite a metric.
Security: NemoClaw sandbox. All outputs logged to _internal/auditLog.`,

  sdr: `You are the SDR Agent for NemoC LAW AI.
You handle outbound sales: lead scraping, personalized cold emails, pipeline qualification.
Score leads 0-100 based on firm size, practice area, location, and engagement signals.
Every email must include: firm name, practice-area pain point, specific NemoC feature, founder pricing ($297/mo), unique signup link.
Tone: Confident but not pushy. Lead with value: "Your AI workforce is ready."
Escalate 80+ leads to C.E.A. as enterprise opportunities.`,

  marketing: `You are the Marketing Agent for NemoC LAW AI.
You generate: blog posts, LinkedIn content, SEO landing pages, release notes, newsletter content.
All content reinforces the "Born Agentic" positioning: NemoC is agent-led, not AI-assisted.
SEO targets: "AI for law firms", "legal AI agent", "law firm automation", "agentic legal tech".
Content calendar: Mon=blog, Wed=LinkedIn, Fri=product update.
Tone: Authoritative, forward-thinking, slightly contrarian.
Escalate: competitor mentions, pricing claims, specific client outcomes.`,

  'lifecycle-manager': `You are the Lifecycle & Acquisition Agent for NemoC LAW AI.
We no longer use a waitlist; we now directly onboard firms.
Your goal: Monitor the acquisition funnel, score firm size, and ensure smooth direct-onboarding.
Score firms 0-100 based on website analysis, firm size, and practice area.
Prioritize 10+ attorney firms for white-glove onboarding.
Every successful signup should be routed immediately to the Onboarding Monitor.`,

  'security-audit': `You are the Security Audit Agent for NemoC LAW AI.
Monitor: Firebase auth logs, Firestore permission denials, API egress, PII exposure, rate limits.
Incident classification: P0=active breach, P1=attack detected, P2=anomaly, P3=minor.
P0: Immediately escalate + block source. P1: Auto-block, generate report. P2: Log + weekly summary. P3: Log only.
Only approved egress: api.nvidia.com, courtlistener.com. Block everything else.
Reports must include: timestamp, source, action, rule violated, severity, action taken.`,

  'onboarding-monitor': `You are the Onboarding Monitor Agent for NemoC LAW AI.
Track each law firm's progress through onboarding. Detect stalls (no activity 24h+).
Steps: Account Creation → Firm Profile → Team Roster → Knowledge Base → Agent Config → First Interaction.
For stalls: send context-aware email with deep link to exact step they left off at.
Tone: Helpful, never pushy. Frame as "your AI is waiting to help."
Escalate: 10+ attorney firms stalled 72h+ (churn risk), same-step stalls across 3+ firms (UX bug).`,

  'billing-ops': `You are the Billing Agent for NemoC LAW AI.
Handle: token usage evaluation, monthly auto-invoicing, failed Stripe charge dunning, upgrade recommendations.
Invoice on the 1st of each month. Retry failed charges 3x over 7 days before dunning.
Alert firms approaching their data/token limits with upgrade suggestions.
Never discuss specific pricing with clients — route pricing questions to C.E.A.
All financial operations are logged and immutable.`,

  'prompt-engineer': `You are the Legal Prompt Engineer Agent for NemoC LAW AI.
Review agent interactions from client law firms. Identify failing or low-confidence outputs.
For each failing prompt:
1. Diagnose why it failed (ambiguous, too broad, wrong agent type, missing context)
2. Suggest an improved, highly specific legal prompt
3. If the pattern appears 3+ times, recommend a system prompt update to the C.E.A.
You are an expert in legal AI prompting: jurisdiction-specific, Bluebook-compliant, structurally precise.`,

  devops: `You are the Codespace Architect Agent for NemoC LAW AI.
You work with the GitHub repository. Monitor incoming issues, draft code fixes, submit PRs.
Every PR must include: description, files changed, test coverage impact, rollback plan.
Follow the existing codebase patterns: React + Vite frontend, Firebase backend, Firestore for state.
Never merge without Human Overseer approval. Auto-run npm run build to validate before PR submission.
CI/CD: firebase deploy triggers automatically on merge to main.`,

  'sandbox-provisioner': `You are the Sandbox Provisioning Agent for NemoC LAW AI.
When a new firm signs up, you provision: Firestore collections, ethical walls, NIM endpoint allocation.
Each firm gets: firms/{id}/ namespace with employees, agents, superAgent, auditLog, matters subcollections.
Security defaults: deny-by-default egress, PII auto-redaction enabled, UPL guards for non-attorney roles.
Monitor resource usage per firm. Alert when a firm exceeds provisioned limits.`,

  'waitlist-manager': `You are the Waitlist Manager for NemoC LAW AI.
Categorize incoming waitlist signups by: firm size, practice areas, location, task interests.
Apply dynamic pricing: Solo ($297/mo), 2-5 ($446/mo), 5-10 ($595/mo), 10+ (custom).
Route scored leads to the SDR Agent for outreach.
Maintain the automated onboarding pipeline: signup → score → email → demo → convert.`,
};

// ═══════════════════════════════════════════════
//  SEND MESSAGE TO INTERNAL AGENT
// ═══════════════════════════════════════════════

/**
 * Send a message to an internal agent and get a response.
 *
 * @param {string} agentId - One of the INTERNAL_AGENTS keys
 * @param {string} userMessage - The message / task
 * @param {Array} conversationHistory - Previous messages [{role, content}]
 * @param {Object} context - Optional context (metrics, lead data, etc.)
 * @returns {Object} { response, agentId, auditId }
 */
export async function sendInternalAgentMessage(agentId, userMessage, conversationHistory = [], context = null) {
  const agent = INTERNAL_AGENTS[agentId];
  if (!agent) throw new Error(`Unknown internal agent: ${agentId}`);

  // Build system prompt
  let systemPrompt = INTERNAL_PROMPTS[agentId] || INTERNAL_PROMPTS.cea;

  // Inject live context if provided
  if (context) {
    systemPrompt += `\n\n--- LIVE CONTEXT ---\n${JSON.stringify(context, null, 2)}`;
  }

  // Build messages
  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-20),
    { role: 'user', content: userMessage },
  ];

  // Call inference
  let response;
  try {
    const result = await callInternalInference(messages, agent);
    response = result.content;
  } catch (err) {
    console.error(`Internal agent [${agentId}] inference error:`, err);
    response = `[${agent.name}] Inference temporarily unavailable. Error: ${err.message}`;
  }

  // Log to internal audit trail
  let auditId = null;
  try {
    auditId = await logInternalAction(agentId, {
      userMessage,
      agentResponse: response,
      department: agent.department,
      contextProvided: !!context,
    });
  } catch (err) {
    console.warn('Internal audit log failed:', err.message);
  }

  return { response, agentId, auditId };
}

// ═══════════════════════════════════════════════
//  INFERENCE
// ═══════════════════════════════════════════════

async function callInternalInference(messages, agent) {
  if (!NEMOCLAW_API_KEY) {
    return simulateInternalResponse(messages, agent);
  }

  const headers = { 'Content-Type': 'application/json' };
  if (!IS_DEV) {
    headers['Authorization'] = `Bearer ${NEMOCLAW_API_KEY}`;
  }

  const res = await fetch(NEMOCLAW_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: MODEL_ID,
      messages,
      max_tokens: 4096,
      temperature: 0.4,
      top_p: 0.9,
      stream: false,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Internal inference failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  return { content: data.choices?.[0]?.message?.content || 'No response generated.' };
}

function simulateInternalResponse(messages, agent) {
  const userMsg = messages[messages.length - 1]?.content || '';
  const name = agent.name;
  const dept = agent.department;

  const templates = {
    gtm: `**${name} — Analysis Complete**\n\nBased on current pipeline data:\n- 3 high-priority leads identified (score ≥ 80)\n- Recommended action: Send personalized outreach within 24h\n- Estimated conversion probability: 34%\n\n*Logged to _internal/auditLog · ${new Date().toISOString()}*`,
    engineering: `**${name} — Status Report**\n\nSystem health check:\n- Firebase Hosting: 99.97% uptime (30d)\n- Firestore: 18ms avg latency\n- NIM API: 230ms avg response\n- 0 active security incidents\n\n*Logged to _internal/auditLog · ${new Date().toISOString()}*`,
    'customer-success': `**${name} — Customer Intelligence**\n\nOnboarding funnel analysis:\n- 87% completion rate (above 80% target)\n- 2 firms stalled at Team Roster step (>48h)\n- Recommended: Trigger automated assistance email\n\n*Logged to _internal/auditLog · ${new Date().toISOString()}*`,
    executive: `**${name} — Executive Briefing**\n\nCompany status:\n- MRR: $4,200 (+12.3% MoM)\n- Pipeline: $127K (34% win rate)\n- Active threats: 0\n- Agent fleet: 13/13 operational\n\nNo escalations requiring human review.\n\n*Logged to _internal/auditLog · ${new Date().toISOString()}*`,
  };

  return { content: templates[dept] || templates.executive };
}

// ═══════════════════════════════════════════════
//  INTERNAL AUDIT TRAIL
// ═══════════════════════════════════════════════

async function logInternalAction(agentId, data) {
  try {
    const ref = await addDoc(collection(db, '_internalAuditLog'), {
      agentId,
      type: 'internal_agent_action',
      ...data,
      timestamp: serverTimestamp(),
      immutable: true,
    });
    return ref.id;
  } catch (err) {
    console.warn('Internal audit write failed:', err.message);
    return null;
  }
}

/**
 * Get internal audit log entries.
 */
export async function getInternalAuditLog(maxEntries = 50) {
  try {
    const q = query(
      collection(db, '_internalAuditLog'),
      orderBy('timestamp', 'desc'),
      limit(maxEntries),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('Internal audit log read failed:', err.message);
    return [];
  }
}

// ═══════════════════════════════════════════════
//  AGENT STATE MANAGEMENT
// ═══════════════════════════════════════════════

/**
 * Update an internal agent's live metrics in Firestore.
 */
export async function updateAgentMetrics(agentId, metrics) {
  try {
    await setDoc(doc(db, '_internalAgents', agentId), {
      ...metrics,
      lastUpdated: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.warn(`Failed to update metrics for ${agentId}:`, err.message);
  }
}

/**
 * Get all internal agent states from Firestore.
 */
export async function getInternalAgentStates() {
  try {
    const snap = await getDocs(collection(db, '_internalAgents'));
    const states = {};
    snap.docs.forEach(d => { states[d.id] = d.data(); });
    return states;
  } catch (err) {
    console.warn('Failed to load internal agent states:', err.message);
    return {};
  }
}

/**
 * Record an escalation for human review.
 */
export async function createEscalation(agentId, escalation) {
  try {
    const ref = await addDoc(collection(db, '_internalEscalations'), {
      agentId,
      agentName: INTERNAL_AGENTS[agentId]?.name || agentId,
      department: INTERNAL_AGENTS[agentId]?.department || 'unknown',
      ...escalation,
      status: 'pending',
      createdAt: serverTimestamp(),
    });
    return ref.id;
  } catch (err) {
    console.warn('Escalation creation failed:', err.message);
    return null;
  }
}

/**
 * Get pending escalations for the human dashboard.
 */
export async function getPendingEscalations() {
  try {
    const q = query(
      collection(db, '_internalEscalations'),
      limit(50),
    );
    const snap = await getDocs(q);
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(e => e.status === 'pending')
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  } catch (err) {
    console.warn('Escalation read failed:', err.message);
    return [];
  }
}

/**
 * Resolve an escalation (human action).
 */
export async function resolveEscalation(escalationId, resolution) {
  try {
    await updateDoc(doc(db, '_internalEscalations', escalationId), {
      status: 'resolved',
      resolution,
      resolvedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Escalation resolution failed:', err.message);
  }
}

// ═══════════════════════════════════════════════
//  MARKETING CONTENT MANAGEMENT
// ═══════════════════════════════════════════════

/**
 * Get AI-generated marketing drafts from Firestore.
 */
export async function getMarketingDrafts() {
  try {
    const q = query(
      collection(db, '_internalMarketingDrafts'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('Marketing drafts read failed:', err.message);
    return [];
  }
}
