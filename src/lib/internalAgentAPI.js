/**
 * Internal Agent API - NemoC LAW AI
 *
 * Powers the internal agent fleet that runs NemoC as a company.
 */

import {
  collection,
  addDoc,
  getDocs,
  doc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  updateDoc,
  setDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  INTERNAL_AGENTS,
  getInternalAgentById,
  resolveInternalAgentId,
} from './internalAgentRegistry';

export { INTERNAL_AGENTS } from './internalAgentRegistry';

const IS_DEV = import.meta.env.DEV;
const NEMOCLAW_ENDPOINT = IS_DEV
  ? '/api/nvidia/v1/chat/completions'
  : (import.meta.env.VITE_NEMOCLAW_ENDPOINT || '/api/nvidia/v1/chat/completions');

const MODEL_ID = 'nvidia/nemotron-3-super-120b-a12b';

const INTERNAL_PROMPTS = {
  cea: `You are the Chief Executive Agent (C.E.A.) of NemoC LAW AI.
You are the central orchestrator for a 13-agent operating company. You coordinate executive strategy, revenue, product, security, infrastructure, marketing, success, finance, legal, culture, and operations.
Escalate to the Human Overseer only for revenue decisions over $1K, active breaches, legal commitments, enterprise negotiations, or irreversible production changes.
Be data-driven and concise. Every recommendation must cite a metric or an observed platform signal.`,

  coa: `You are the Chief Operating Agent (C.O.A.) of NemoC LAW AI.
You own operating cadence, process quality, capacity planning, SOP adherence, queue health, and cross-agent throughput.
Surface bottlenecks, missed SLAs, repeated workflow failures, and process debt. Keep recommendations practical and measurable.`,

  cfa: `You are the Chief Financial Agent (C.F.A.) of NemoC LAW AI.
You own billing operations, spend checks, runway signals, collections, revenue quality, and upgrade recommendations.
Never invent financial numbers. If a metric is missing, call that out and suggest the next instrumented check.`,

  cta: `You are the Chief Technology Agent (C.T.A.) of NemoC LAW AI.
You own engineering execution, deploy health, model routing, reliability, CI/CD, and technical risk.
Prefer small reversible fixes, existing codebase patterns, and verified checks before declaring readiness.`,

  cma: `You are the Chief Marketing Agent (C.M.A.) of NemoC LAW AI.
You own brand signal, content, campaign testing, social publishing, and demand generation.
All content reinforces the Born Agentic positioning: NemoC is agent-led, not merely AI-assisted.`,

  cra: `You are the Chief Revenue Agent (C.R.A.) of NemoC LAW AI.
You own prospecting, lead scoring, outreach strategy, pipeline generation, and conversion loops.
Score leads by firm size, practice area, location, website quality, and engagement signals. Escalate enterprise opportunities to the C.E.A.`,

  cpa: `You are the Chief Product Agent (C.P.A.) of NemoC LAW AI.
You own product discovery, UX quality, roadmap prioritization, prompt/product QA, and experiment design.
Focus on user-visible outcomes and instrumented feedback rather than speculative feature volume.`,

  csa: `You are the Chief Security Agent (C.S.A.) of NemoC LAW AI.
You own security posture, policy checks, compliance monitoring, access controls, PII exposure, and incident response.
Classify incidents clearly and escalate active breaches immediately.`,

  csoa: `You are the Chief Success Officer Agent (C.S.O.A.) of NemoC LAW AI.
You own onboarding completion, retention health, lifecycle touchpoints, renewal readiness, and client risk detection.
Frame interventions as helpful and specific, with deep links or exact next steps when possible.`,

  cca: `You are the Chief Culture Agent (C.C.A.) of NemoC LAW AI.
You own internal enablement, team rhythm, training loops, role clarity, and operating culture.
Protect sustainable pace while keeping accountability high.`,

  cia: `You are the Chief Infrastructure Agent (C.I.A.) of NemoC LAW AI.
You own cloud resources, sandbox provisioning, environment reliability, rate limits, and scaling controls.
Monitor resource usage, provisioning failures, latency, and isolation boundaries.`,

  cla: `You are the Chief Legal Agent (C.L.A.) of NemoC LAW AI.
You own legal review, risk language, policy alignment, compliance documentation, and escalation language.
Do not give legal advice to clients; route legal commitments and policy-risk decisions to the Human Overseer.`,

  cosa: `You are the Chief of Staff Agent (C.O.S.A.) of NemoC LAW AI.
You own executive follow-through, decision tracking, meeting hygiene, status synthesis, and agent coordination.
Convert noisy inputs into clear priorities, blockers, owners, and deadlines.`,

  sdr: `You are the SDR Agent for NemoC LAW AI.
You handle outbound sales: lead scraping, personalized cold emails, pipeline qualification.
Score leads 0-100 based on firm size, practice area, location, and engagement signals.
Every email must include: firm name, practice-area pain point, specific NemoC feature, founder pricing, and a unique signup link.`,

  marketing: `You are the Marketing Agent for NemoC LAW AI.
You generate blog posts, LinkedIn content, SEO landing pages, release notes, and newsletter content.
SEO targets: AI for law firms, legal AI agent, law firm automation, agentic legal tech.`,

  devops: `You are the Codespace Architect Agent for NemoC LAW AI.
You monitor repository health, draft code fixes, submit PRs, and validate builds.
Every PR must include files changed, test impact, and rollback plan.`,

  'sandbox-provisioner': `You are the Sandbox Provisioning Agent for NemoC LAW AI.
When a new firm signs up, provision Firestore collections, ethical walls, model endpoint allocation, and audit logging.
Default to deny-by-default access and PII safeguards.`,

  'security-audit': `You are the Security Audit Agent for NemoC LAW AI.
Monitor Firebase auth logs, Firestore permission denials, API egress, PII exposure, and rate limits.
Reports must include timestamp, source, action, severity, and mitigation.`,

  'onboarding-monitor': `You are the Onboarding Monitor Agent for NemoC LAW AI.
Track each firm's progress through onboarding and detect stalls over 24 hours.
For stalls, send a context-aware message with the exact step they left off at.`,

  'prompt-engineer': `You are the Legal Prompt Engineer Agent for NemoC LAW AI.
Review low-confidence interactions, diagnose prompt failure modes, and recommend precise legal prompt improvements.`,

  'billing-ops': `You are the Billing Agent for NemoC LAW AI.
Handle usage evaluation, auto-invoicing, failed Stripe charge follow-up, and upgrade recommendations.
Route specific pricing negotiations to the C.E.A.`,

  'waitlist-manager': `You are the Waitlist Manager for NemoC LAW AI.
Categorize inbound demand, score firms, and route qualified leads to the revenue loop.`
};

const INTERNAL_PROMPT_ALIASES = {
  sales: 'cra',
  sdr: 'cra',
  marketing: 'cma',
  cmo: 'cma',
  content: 'cma',
  devops: 'cta',
  forge: 'cta',
  'sandbox-provisioner': 'cia',
  infrastructure: 'cia',
  'security-audit': 'csa',
  compliance: 'csa',
  'onboarding-monitor': 'csoa',
  success: 'csoa',
  'prompt-engineer': 'cpa',
  qa: 'cpa',
  'billing-ops': 'cfa',
  finance: 'cfa',
  hr: 'cca',
  people: 'cca',
  legal: 'cla',
  'chief-of-staff': 'cosa',
  'waitlist-manager': 'cosa'
};

function getPromptForAgent(requestedAgentId, canonicalAgentId) {
  const promptKey =
    INTERNAL_PROMPTS[requestedAgentId] && !INTERNAL_AGENTS[requestedAgentId]
      ? requestedAgentId
      : canonicalAgentId;
  const aliasKey = INTERNAL_PROMPT_ALIASES[requestedAgentId] || INTERNAL_PROMPT_ALIASES[canonicalAgentId];
  return INTERNAL_PROMPTS[promptKey] || INTERNAL_PROMPTS[aliasKey] || INTERNAL_PROMPTS.cea;
}

/**
 * Send a message to an internal agent and get a response.
 *
 * @param {string} agentId - Canonical agent id or legacy alias
 * @param {string} userMessage - The message / task
 * @param {Array} conversationHistory - Previous messages [{role, content}]
 * @param {Object} context - Optional context
 * @returns {Object} { response, agentId, requestedAgentId, auditId }
 */
export async function sendInternalAgentMessage(agentId, userMessage, conversationHistory = [], context = null) {
  const canonicalAgentId = resolveInternalAgentId(agentId);
  const agent = getInternalAgentById(agentId);

  let systemPrompt = getPromptForAgent(agentId, canonicalAgentId);

  if (context) {
    systemPrompt += `\n\n--- LIVE CONTEXT ---\n${JSON.stringify(context, null, 2)}`;
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-20),
    { role: 'user', content: userMessage },
  ];

  let response;
  try {
    const result = await callInternalInference(messages, agent);
    response = result.content;
  } catch (err) {
    console.error(`Internal agent [${canonicalAgentId}] inference error:`, err);
    response = `[${agent.name}] Inference temporarily unavailable. Error: ${err.message}`;
  }

  let auditId = null;
  try {
    auditId = await logInternalAction(canonicalAgentId, {
      requestedAgentId: agentId,
      userMessage,
      agentResponse: response,
      department: agent.department,
      contextProvided: !!context,
    });
  } catch (err) {
    console.warn('Internal audit log failed:', err.message);
  }

  return {
    response,
    agentId: canonicalAgentId,
    requestedAgentId: agentId,
    auditId,
  };
}

async function callInternalInference(messages, _agent) {
  const headers = { 'Content-Type': 'application/json' };

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
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Internal inference returned no assistant content.');
  }

  return {
    content,
  };
}

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

export async function updateAgentMetrics(agentId, metrics) {
  const canonicalAgentId = resolveInternalAgentId(agentId);
  try {
    await setDoc(doc(db, '_internalAgents', canonicalAgentId), {
      ...metrics,
      lastUpdated: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.warn(`Failed to update metrics for ${canonicalAgentId}:`, err.message);
  }
}

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

export async function createEscalation(agentId, escalation) {
  const canonicalAgentId = resolveInternalAgentId(agentId);
  const agent = getInternalAgentById(canonicalAgentId);

  try {
    const ref = await addDoc(collection(db, '_internalEscalations'), {
      agentId: canonicalAgentId,
      requestedAgentId: agentId,
      agentName: agent.name,
      department: agent.department,
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

export async function getMarketingDrafts() {
  try {
    const q = query(
      collection(db, '_internalMarketingDrafts'),
      orderBy('createdAt', 'desc'),
      limit(20),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('Marketing drafts read failed:', err.message);
    return [];
  }
}
