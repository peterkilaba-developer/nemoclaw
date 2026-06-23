/**
 * Agent API Bridge — NemoC LAW AI
 *
 * Bridges the frontend dashboard with the NemoClaw sandbox agent.
 * Handles message routing, sub-agent dispatch tracking, and audit trail logging.
 *
 * Architecture:
 *   Frontend → agentAPI → Firestore (log) → NemoClaw Sandbox → Nemotron 120B
 */

import {
  collection, addDoc, getDocs, getDoc, doc, query,
  where, orderBy, limit, serverTimestamp, updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  SUB_AGENT_CATALOG,
} from './agentHierarchy';
import { resolveFromLocalData } from './localResolver';
import { NEMOCLAW_ENDPOINT, NEMOCLAW_MODEL_ID } from './nemoclawConfig';
import { searchCourtListener, formatCourtListenerResults } from './legalResearchService';

// ═══════════════════════════════════════════════
//  CONFIGURATION
// ═══════════════════════════════════════════════

const FULL_MATTER_ACCESS_ROLES = new Set(['partner', 'managing-partner', 'solo-partner', 'income-partner']);

// Partner-class humans have full access to firm matters; staff agents receive least-privilege scopes.

// ═══════════════════════════════════════════════
//  PII REDACTION (client-side pre-filter)
// ═══════════════════════════════════════════════

const PII_PATTERNS = [
  { name: 'ssn', regex: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[REDACTED-SSN]' },
  { name: 'phone', regex: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, replacement: '[REDACTED-PHONE]' },
  { name: 'email', regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[REDACTED-EMAIL]' },
  { name: 'dob', regex: /\b(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}\b/g, replacement: '[REDACTED-DOB]' },
  { name: 'credit_card', regex: /\b(?:\d[ -]*?){13,16}\b/g, replacement: '[REDACTED-FINANCIAL_DATA]' },
  { name: 'routing_acct', regex: /\b(?:routing|account|iolta|swift|iban)[\s:#-]*[A-Z0-9]{8,22}\b/gi, replacement: '[REDACTED-BANKING_DATA]' },
];

function redactPII(text) {
  let redacted = text;
  const redactions = [];
  for (const pattern of PII_PATTERNS) {
    const matches = redacted.match(pattern.regex);
    if (matches) {
      redactions.push({ type: pattern.name, count: matches.length });
      redacted = redacted.replace(pattern.regex, pattern.replacement);
    }
  }
  return { text: redacted, redactions };
}

// ═══════════════════════════════════════════════
//  PROMPT INJECTION / JAILBREAK SHIELD
// ═══════════════════════════════════════════════

const JAILBREAK_PATTERNS = [
  /ignore all prior/i,
  /ignore all previous/i,
  /disregard previous/i,
  /you are now/i,
  /system prompt/i,
  /developer mode/i,
  /\bDAN\b/i,
  /forget everything/i,
  /bypass restrictions/i,
  /override rules/i,
  /reveal your prompt/i,
];

function checkPromptInjection(text) {
  return JAILBREAK_PATTERNS.some(pattern => pattern.test(text));
}

function shouldFetchCourtListenerContext(message, subAgentsUsed) {
  const msg = (message || '').toLowerCase();
  if (subAgentsUsed.some(agent => agent.id === 'legal-research')) return true;

  return [
    'case law',
    'precedent',
    'find cases',
    'legal research',
    'courtlistener',
    'statute',
    'jurisprudence',
    'judge tendencies',
    'outcome prediction',
  ].some(term => msg.includes(term));
}

function ensureDetectedSubAgent(subAgentsUsed, subAgentId) {
  if (subAgentsUsed.some(agent => agent.id === subAgentId)) return subAgentsUsed;
  const catalog = SUB_AGENT_CATALOG.find(s => s.id === subAgentId);
  if (!catalog) return subAgentsUsed;
  return [
    ...subAgentsUsed,
    {
      id: subAgentId,
      name: catalog.name,
      icon: catalog.icon || 'Cpu',
    },
  ];
}

// ═══════════════════════════════════════════════
//  SYSTEM PROMPTS — Solo Practitioner
// ═══════════════════════════════════════════════

const SYSTEM_PROMPTS = {
  partner: `You are a personal AI agent for a solo attorney, partner, or managing partner, powered by NemoC LAW AI.
You have full firm visibility — all matters, clients, financials, and strategy.
You can dispatch sub-agents for: legal research, contract review, drafting, case analytics, business intelligence, knowledge search, and communications.
Operate under strict attorney-client privilege. Every agent reports to a named human. All actions are audited. Adapt to the attorney's style over time.
Security: OpenClaw · NemoClaw · OpenShell. Zero data leak guarantee.`,

  unconfigured: `You are the AI Chief of Staff for NemoC LAW AI, currently in ONBOARDING MODE.
The user just signed up and has NOT yet configured their firm. Your job is to:
1. WELCOME them warmly and demonstrate Agentic OS's value
2. ANSWER any questions about NemoC LAW AI capabilities, pricing, security, or workflows
3. GUIDE them toward completing firm setup by using [SETUP_LINK] in your response text
4. ACT AS AN SDR — show excitement about their practice, ask about their firm needs, and explain how our AI agents can help

KEY PLATFORM FACTS (use these to answer questions):
- NemoC LAW AI is solo-first and small-firm ready: the onboarding partner gets a personal AI agent, and firms can add human role + agent mappings up to 20 total humans
- Full access: Legal Research, Contract Review, Drafting, Case Analytics, Business Intelligence, Knowledge Search, Communication Drafter
- NVIDIA NemoClaw sandbox = zero data leak guarantee, IOLTA compliance, PII auto-redaction
- Pricing: $297/mo Agentic OS founder rate for the first 100 firms in a state, then $497/mo standard. Additional human role + agent mappings are $149/mo founder rate, then $297/mo standard
- Founder Price-Lock available for first 100 firms per state
- 30-day free trial included (card required, no charge until day 31)
- 74 practice areas supported (Individual + Business)
- Sub-agents: eDiscovery, Deposition Prep, Billing Automation, Client Intake, Compliance Monitor, and more
- Website Builder Agent included FREE with every account
- Integrations: Clio, Google Calendar, CourtListener, Slack

STRICT RULES:
- You do NOT have access to any firm-specific matters, contracts, or client data yet
- If asked about specific legal matters or firm data, say "I don't have that data yet -- complete your firm setup to connect your matters and documents"
- NEVER fabricate case law, client names, or firm metrics
- When nudging toward setup, write [SETUP_LINK] in the text (the system will render it as a clickable link). NEVER say "click the banner above" or reference any banner.
- Be conversational, professional, and enthusiastic about how Agentic OS can transform their practice
- FORMATTING: Use clean, professional plain text only. No markdown (no ** or ##). No emojis. Use em-dashes for separation. Use line breaks for structure. This is a law firm dashboard, not a chat app.`,
};

// ═══════════════════════════════════════════════
//  SEND MESSAGE TO AGENT
// ═══════════════════════════════════════════════

/**
 * Send a message to a mapped human's personal agent and get a response.
 *
 * @param {string} firmId - Firm Firestore ID
 * @param {string} agentId - Agent Firestore ID
 * @param {string} userMessage - The user's message in plain English
 * @param {Array} conversationHistory - Previous messages [{role, content}]
 * @returns {Object} { response, subAgentsUsed, auditId }
 */
export async function sendAgentMessage(firmId, agentId, userMessage, conversationHistory = [], matterContext = null) {
  const isOnboardingMode = !firmId || !agentId;

  let agent;

  if (isOnboardingMode) {
    agent = {
      agentType: 'unconfigured',
      agentName: 'Onboarding Assistant',
      employeeEmail: '',
      employeeName: '',
      availableSubAgents: [],
    };
  } else {
    try {
      const agentSnap = await getDoc(doc(db, 'firms', firmId, 'agents', agentId));
      if (!agentSnap.exists()) {
        throw new Error(`Agent profile not found for ${agentId}.`);
      }
      agent = agentSnap.data();
      await updateDoc(doc(db, 'firms', firmId, 'agents', agentId), { lastActive: serverTimestamp() });
    } catch (err) {
      console.error('Could not load verified agent config:', err.message);
      return {
        response: 'I cannot process this request because the verified agent profile is missing or unavailable. Ask a firm administrator to recreate or repair this agent before using legal workflows.',
        subAgentsUsed: [],
        auditId: null,
      };
    }
  }

  // 1.5. Determine configuration state, firm specialty, identity, and fetch active matters
  let isFirmConfigured = false;
  let activeMattersList = [];
  let authorizedMatterIds = new Set();
  let firmIdentity = null;
  let firmPracticeAreas = [];
  if (firmId) {
    try {
      const firmSnap = await getDoc(doc(db, 'firms', firmId));
      if (firmSnap.exists()) {
        const firmData = firmSnap.data();
        isFirmConfigured = Boolean(firmData.isConfigured || firmData.onboardingComplete || firmData.firmName);
        firmPracticeAreas = firmData.practiceAreas || [];
        firmIdentity = {
          name: firmData.firmName || 'Unnamed Firm',
          website: firmData.firmWebsite || 'None',
          phone: firmData.firmPhone || 'None',
          address: firmData.firmAddress || 'None',
          stateBar: firmData.stateBar || 'None'
        };
      }

      const hasFullMatterAccess = FULL_MATTER_ACCESS_ROLES.has(agent.agentType);
      const assignedEmail = agent.employeeEmail || '';
      const mattersRef = collection(db, 'firms', firmId, 'matters');
      const mattersSnap = hasFullMatterAccess
        ? await getDocs(query(mattersRef, where('status', '==', 'Active')))
        : assignedEmail
          ? await getDocs(query(mattersRef, where('assignedTo', 'array-contains', assignedEmail)))
          : { docs: [] };
      const accessibleMatters = mattersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      authorizedMatterIds = new Set(accessibleMatters.map(matter => matter.id));
      activeMattersList = accessibleMatters.filter(matter => matter.status === 'Active');
    } catch (e) {
      console.warn('Could not check firm config or matters:', e.message);
    }
  }

  if (matterContext && !FULL_MATTER_ACCESS_ROLES.has(agent.agentType) && !authorizedMatterIds.has(matterContext.id)) {
    return {
      response: 'Access denied by the ethical wall. This matter is not assigned to your verified firm role.',
      subAgentsUsed: [],
      auditId: 'ETHICAL_WALL_BLOCK',
    };
  }

  // 2. Get appropriate system prompt
  let systemPrompt = !isFirmConfigured ? SYSTEM_PROMPTS.unconfigured : (SYSTEM_PROMPTS[agent.agentType] || SYSTEM_PROMPTS.partner);

  // Append Strict Anti-Hallucination rules & Legal Safeguards
  systemPrompt += `\n\n--- CRITICAL SYSTEM SAFEGUARDS (HALLUCINATION BARRIER) ---\n1. ABSOLUTE GROUNDING: You must NEVER hallucinate, invent, or extrapolate legal matters, case citations, client names, financial metrics, or firm capabilities.\n2. ALL available firm matters are provided in the context below. If a matter is not listed, IT DOES NOT EXIST.\n3. If the user asks about their matters and the list is empty, state clearly: "You currently have no active matters in the system."\n4. If you lack explicit factual context to answer an operational or legal question, you MUST immediately state: "I do not have sufficient firm data or verified legal context to answer this request." DO NOT GUESS.\n5. You are operating via the NVIDIA NemoClaw architecture inside an immutable container. Professional exactness is your highest priority.\n6. LATENCY OPTIMIZATION: Deliver extremely concise, highly condensed answers. Eliminate all conversational filler and introductory padding. Get straight to the legal or operational analysis.`;

  // Append Matter Context if explicit
  if (matterContext) {
    systemPrompt += `\n\n--- CURRENT MATTER CONTEXT (SCOPED) ---\nYou are currently scoped to the following matter:\nTitle: ${matterContext.title}\nClient: ${matterContext.client}\nType: ${matterContext.type}\nBackground: ${matterContext.description}\n\nEnsure all work product, analysis, and outputs are strictly tailored to this matter.`;
  } else {
    // Append Firm-wide matter context
    systemPrompt += `\n\n--- FIRM ACTIVE MATTERS OVERVIEW ---\n`;
    if (activeMattersList.length === 0) {
      systemPrompt += `The firm currently has ZERO active matters.`;
    } else {
      activeMattersList.forEach((m, idx) => {
        systemPrompt += `${idx + 1}. Title: ${m.title || 'Unknown'} | Client: ${m.client || 'Unknown'} | Type: ${m.type || 'General'} | Description: ${m.description || 'N/A'}\n`;
      });
    }
  }

  // Append Pre-loaded Specialty Knowledgebase (Firm Practice Areas)
  if (firmPracticeAreas.length > 0) {
    systemPrompt += `\n\n--- FIRM PRACTICE AREAS ---\nThe firm has configured these practice areas: ${firmPracticeAreas.join(', ')}.\nUse them only as firm context. Do not claim jurisdiction-specific expertise, case law, statutes, or procedural rules unless those sources are provided in the current request or connected firm data.`;
  }

  // Append Primary Internal Knowledge Base (Firm Identity & Web Scrape)
  if (firmIdentity) {
    systemPrompt += `\n\n--- FIRM IDENTITY & KNOWLEDGE BASE ---\nFirm Name: ${firmIdentity.name}\nWebsite: ${firmIdentity.website}\nPhone: ${firmIdentity.phone}\nAddress: ${firmIdentity.address}\nPrimary Jurisdiction (Bar): ${firmIdentity.stateBar}\n\nYou represent this firm. If a user asks for firm contact info or website details, draw directly from this primary knowledge base.`;
  }

  // Append Access Level context
  systemPrompt += `\n\n--- ACCESS LEVEL ---\nUser Role: SOLO PRACTITIONER\nAccess Level: FULL FIRM VISIBILITY. You can access all client matters, financial records, and firm strategy data.`;

  // Register the available sub-agents as formal tools
  const availableSubAgents = agent.availableSubAgents || [];
  if (availableSubAgents.length > 0) {
    systemPrompt += `\n\n--- SUB-AGENT REGISTRY ---\nYou have access to the following specialized sub-agents. You may reference these Sub-Agents when they are relevant to your task:\n`;
    availableSubAgents.forEach(subId => {
      const catalogInfo = SUB_AGENT_CATALOG.find(c => c.id === subId);
      if (catalogInfo) {
        systemPrompt += `- Sub-Agent: [${subId}] | Name: ${catalogInfo.name} | Capabilities: ${catalogInfo.desc}\n`;
      }
    });
  }

  // 2.5 Security: Pre-Flight Prompt Injection Shield (OpenShell Emulator)
  if (checkPromptInjection(userMessage)) {
    console.warn('[NEMOCLAW SECURITY] Active adversarial prompt injection blocked.');
    try {
      if (!isOnboardingMode) {
        await addDoc(collection(db, 'firms', firmId, 'auditLog'), {
          type: 'SECURITY_EVENT',
          severity: 'CRITICAL',
          description: 'Malicious prompt injection or LLM jailbreak attempt actively blocked at input layer.',
          agentId,
          timestamp: serverTimestamp()
        });
      }
    } catch(_e) { /* intentionally ignored */ }

    return {
      response: "🛡️ **SECURITY VIOLATION DETECTED**: This request violates the Firm's structural operating protocols and has been unilaterally blocked by the NemoClaw architectural sandbox. A critical security audit has been logged.",
      subAgentsUsed: [],
      auditId: 'BLOCKED_BY_OPENSHELL'
    };
  }

  // 3. Redact PII from user message
  const { text: safeMessage, redactions } = redactPII(userMessage);

  // 3.5 LOCAL DATA RESOLVER — answer from cache when possible (no inference needed)
  if (!isFirmConfigured) {
    const localAnswer = resolveFromLocalData(safeMessage);
    if (localAnswer) {
      if (!isOnboardingMode) {
        try {
          await addDoc(collection(db, 'firms', firmId, 'agents', agentId || '_onboarding', 'messages'), { role: 'user', content: safeMessage, timestamp: serverTimestamp() });
          await addDoc(collection(db, 'firms', firmId, 'agents', agentId || '_onboarding', 'messages'), { role: 'assistant', content: localAnswer, subAgentsUsed: [], timestamp: serverTimestamp() });
        } catch (_e) { /* ignore */ }
      }
      return { response: localAnswer, subAgentsUsed: [], auditId: null };
    }
  }

  // 4. Detect sub-agent behavior and gather grounded legal research context before inference.
  let subAgentsUsed = detectSubAgentUsage(safeMessage, agent.availableSubAgents || []);
  if (shouldFetchCourtListenerContext(safeMessage, subAgentsUsed)) {
    try {
      const legalResearch = await searchCourtListener(safeMessage, { type: 'o', pageSize: 5 });
      const formattedResearch = formatCourtListenerResults(legalResearch);
      if (formattedResearch) {
        subAgentsUsed = ensureDetectedSubAgent(subAgentsUsed, 'legal-research');
        systemPrompt += `\n\n--- COURTLISTENER LEGAL RESEARCH CONTEXT ---\nThese are backend-fetched CourtListener results for the current request. Use them only as starting authorities and tell the user that legal authorities must be verified before filing or client advice.\n${formattedResearch}`;
      }
    } catch (err) {
      console.warn('CourtListener context fetch failed:', err.message);
      systemPrompt += `\n\n--- LEGAL RESEARCH CONTEXT STATUS ---\nCourtListener search was attempted but unavailable. Do not fabricate citations. If legal authority is needed, say verified legal research is required.`;
    }
  }

  // 4.5 Build the message array
  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-20),
    { role: 'user', content: safeMessage },
  ];

  // 5. Call the inference endpoint
  let response;

  try {
    const result = await callInference(messages, agent, subAgentsUsed);
    response = result.content;
  } catch (err) {
    console.error('Agent inference error:', err);
    response = `I apologize, but I'm experiencing a temporary issue connecting to the inference service. Please try again in a moment.\n\nError: ${err.message}`;
  }

  // 7. Log to audit trail when attached to a verified firm/agent.
  let auditId = null;
  if (!isOnboardingMode) {
    try {
      auditId = await logToAuditTrail(firmId, agentId, {
        userMessage: safeMessage,
        agentResponse: response,
        agentType: agent.agentType,
        subAgentsUsed,
        piiRedactions: redactions,
        employeeEmail: agent.employeeEmail,
        employeeName: agent.employeeName,
      });
    } catch (err) {
      console.warn('Audit log write failed:', err.message);
    }
  }

  // 8. Save conversation to agent's message history when attached to a verified firm/agent.
  if (!isOnboardingMode) {
    try {
      await addDoc(collection(db, 'firms', firmId, 'agents', agentId, 'messages'), {
        role: 'user',
        content: safeMessage,
        timestamp: serverTimestamp(),
      });
      await addDoc(collection(db, 'firms', firmId, 'agents', agentId, 'messages'), {
        role: 'assistant',
        content: response,
        subAgentsUsed,
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Message history write failed:', err.message);
    }
  }

  return { response, subAgentsUsed, auditId };
}

// ═══════════════════════════════════════════════
//  INFERENCE CALL
// ═══════════════════════════════════════════════

// Map the sub-agent array to an architectural routing profile
const getRoutingProfile = (subAgentsDetector) => {
  if (!subAgentsDetector || subAgentsDetector.length === 0) return 'default';

  const primaryIntent = subAgentsDetector[0].id;

  if (['legal-research', 'case-analytics', 'due-diligence'].includes(primaryIntent)) return 'ediscovery';
  if (['contract-review', 'drafting', 'communication-drafter'].includes(primaryIntent)) return 'contract-review';
  if (['client-intake', 'scheduling', 'knowledge-search'].includes(primaryIntent)) return 'scheduling';
  return 'default';
};

/**
 * CORE INFERENCE GENERATOR (NEMOCLAW v4.0 POLY-MODEL SECURED)
 */
async function callInference(messages, _agent, subAgentsUsed) {
  const routeProfile = getRoutingProfile(subAgentsUsed);

  const headers = {
    'Content-Type': 'application/json',
    'X-Routing-Profile': routeProfile
  };
  const res = await fetch(NEMOCLAW_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: NEMOCLAW_MODEL_ID,
      messages,
      max_tokens: 1024,
      temperature: 0.05,
      top_p: 0.8,
      frequency_penalty: 0.2,
      presence_penalty: 0.0,
      stream: false,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Inference failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Inference gateway returned no assistant content.');
  }
  return { content };
}


// ═══════════════════════════════════════════════
//  SUB-AGENT DETECTION
// ═══════════════════════════════════════════════

function detectSubAgentUsage(message, availableSubAgents) {
  const msg = message.toLowerCase();
  const detected = [];

  const subAgentTriggers = {
    'legal-research': ['legal research', 'case law', 'precedent', 'statute', 'find cases', 'jurisprudence'],
    'contract-review': ['review contract', 'redline', 'indemnification', 'breach of contract', 'contract clause'],
    'drafting': ['draft a', 'write a motion', 'legal brief', 'pleading', 'draft motion'],
    'ediscovery': ['ediscovery', 'bates stamp', 'privilege log', 'document production'],
    'client-intake': ['new client intake', 'conflict check', 'prospective client'],
    'scheduling': ['schedule a', 'calendar invite', 'hearing date', 'court date'],
    'lead-qualification': ['qualify lead', 'lead score', 'potential client'],
    'billing-time': ['time entry', 'ledes invoice', 'iolta', 'billable hours'],
    'document-formatting': ['table of authorities', 'court format', 'bates stamp'],
    'compliance-monitor': ['regulatory compliance', 'filing deadline', 'cle credit'],
    'deposition-prep': ['deposition prep', 'cross examination', 'witness outline', 'exhibit list'],
    'knowledge-search': ['find in our files', 'past case', 'internal document', 'firm template'],
    'communication-drafter': ['draft email', 'engagement letter', 'client update letter'],
    'case-analytics': ['predict outcome', 'win rate', 'judge analytics', 'case benchmark'],
    'business-intelligence': ['revenue pipeline', 'firm metrics', 'growth trend', 'kpi'],
    'due-diligence': ['due diligence', 'data room', 'red flag report', 'm&a review'],
    'deadline-tracker': ['statute of limitations', 'deadline', 'docket', 'court calendar', 'timeline rule'],
    'trust-accounting': ['trust account', 'iolta', 'retainer replenishment', 'trust ledger', 'client funds'],
    'court-filing': ['file with the court', 'pacer', 'ecf', 'notice of appearance', 'service of process'],
  };

  for (const [subAgent, triggers] of Object.entries(subAgentTriggers)) {
    const pattern = new RegExp(`\\b(${triggers.join('|')})\\b`, 'i');
    if (availableSubAgents.includes(subAgent) && pattern.test(msg)) {
      const catalog = SUB_AGENT_CATALOG.find(s => s.id === subAgent);
      detected.push({
        id: subAgent,
        name: catalog?.name || subAgent,
        icon: catalog?.icon || 'Cpu',
      });
    }
  }

  return detected;
}

// ═══════════════════════════════════════════════
//  AUDIT TRAIL
// ═══════════════════════════════════════════════

async function logToAuditTrail(firmId, agentId, data) {
  const ref = await addDoc(collection(db, 'firms', firmId, 'auditLog'), {
    agentId,
    type: 'agent_interaction',
    ...data,
    timestamp: serverTimestamp(),
    immutable: true,
  });
  return ref.id;
}

/**
 * Get audit log entries for a firm.
 */
export async function getAuditLog(firmId, maxEntries = 50) {
  if (!firmId) return [];
  try {
    const q = query(
      collection(db, 'firms', firmId, 'auditLog'),
      orderBy('timestamp', 'desc'),
      limit(maxEntries),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('Audit log read failed:', err.message);
    return [];
  }
}

/**
 * Get conversation history for an agent.
 */
export async function getConversationHistory(firmId, agentId, maxMessages = 50) {
  if (!firmId || !agentId) return [];
  try {
    const q = query(
      collection(db, 'firms', firmId, 'agents', agentId, 'messages'),
      orderBy('timestamp', 'asc'),
      limit(maxMessages),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('Conversation history read failed:', err.message);
    return [];
  }
}
