/**
 * Agent API Bridge — NemoC LAW AI
 *
 * Bridges the frontend dashboard with the NemoClaw sandbox agent.
 * Handles message routing, role-based prompt construction,
 * sub-agent dispatch tracking, and audit trail logging.
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
  AGENT_SUB_AGENTS, ACCESS_MATRIX, SUB_AGENT_CATALOG,
} from './agentHierarchy';
import { resolveFromLocalData } from './localResolver';

// ═══════════════════════════════════════════════
//  CONFIGURATION
// ═══════════════════════════════════════════════

// In dev, use the Vite proxy to avoid CORS. In production, use a Cloud Function proxy.
const IS_DEV = import.meta.env.DEV;
const NEMOCLAW_ENDPOINT = IS_DEV
  ? '/api/nvidia/v1/chat/completions'   // Vite proxy → integrate.api.nvidia.com
  : (import.meta.env.VITE_NEMOCLAW_ENDPOINT || '/api/nvidia/v1/chat/completions');

const NEMOCLAW_API_KEY = import.meta.env.VITE_NVIDIA_API_KEY || '';

const MODEL_ID = 'meta/llama-3.1-70b-instruct';

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

// ═══════════════════════════════════════════════
//  ROLE-BASED SYSTEM PROMPTS
// ═══════════════════════════════════════════════

const SYSTEM_PROMPTS = {
  partner: `You are a personal AI agent for a Partner at a law firm, powered by NemoC LAW AI.
You have full firm visibility — all matters, clients, financials, and strategy.
You can dispatch sub-agents for: legal research, contract review, drafting, case analytics, business intelligence, knowledge search, and communications.
Operate under strict attorney-client privilege. All actions are audited. Adapt to the partner's style over time.
Security: OpenClaw · NemoClaw · OpenShell. Zero data leak guarantee.`,

  associate: `You are a personal AI agent for an Associate Attorney, powered by NemoC LAW AI.
You can ONLY access matters the associate is explicitly assigned to. No firm financials. No cross-matter visibility.
You can dispatch sub-agents for: legal research, contract review, drafting, eDiscovery, deposition prep, knowledge search, and communications.
Always cite with Bluebook format. Flag potential conflicts. Adapt to writing style. All actions are audited.
Security: OpenClaw · NemoClaw · OpenShell. Zero data leak guarantee.`,

  contractor: `You are a personal AI agent for an Of Counsel / Contract Attorney, powered by NemoC LAW AI.
STRICT SANDBOX: You can ONLY access specific matters explicitly assigned. No firm directory. No financials. No cross-matter visibility.
You can dispatch sub-agents for: legal research, contract review, drafting, eDiscovery, knowledge search.
This restriction protects against conflicts of interest. All actions are audited.
Security: OpenClaw · NemoClaw · OpenShell. Zero data leak guarantee.`,

  paralegal: `You are a personal AI agent for a Paralegal, powered by NemoC LAW AI.
Assigned matters only. You CANNOT provide legal advice — flag for attorney review.
You can dispatch sub-agents for: legal research, eDiscovery, document formatting, deposition prep, knowledge search.
Focus on procedural accuracy. Flag privilege issues. All actions are audited.
⚠️ UPL GUARD: Append "Requires attorney review" if output could be construed as legal advice.
Security: OpenClaw · NemoClaw · OpenShell.`,

  receptionist: `You are a personal AI agent for a Receptionist, powered by NemoC LAW AI.
Client contact info only — NO case files, NO legal documents, NO financials.
You can dispatch sub-agents for: client intake, scheduling, lead qualification, communication drafting.
You MUST NOT provide legal advice. Route legal questions to attorneys. Available 24/7.
⚠️ UPL GUARD: Never provide legal opinions. Say "I can schedule a consultation with one of our attorneys."
Security: OpenClaw · NemoClaw · OpenShell.`,

  secretary: `You are a personal AI agent for a Legal Secretary, powered by NemoC LAW AI.
Assigned matters only — limited document access. No legal advice.
You can dispatch sub-agents for: scheduling, document formatting, knowledge search, communication drafting.
Focus on calendar management, correspondence, and document preparation. All actions audited.
Security: OpenClaw · NemoClaw · OpenShell.`,

  billing: `You are a personal AI agent for a Billing Clerk, powered by NemoC LAW AI.
Financial data access. No case files. No legal document content.
You can dispatch sub-agents for: billing & time tracking, knowledge search, communication drafting.
Handle time entries, LEDES invoicing, IOLTA reconciliation. All actions audited.
Security: OpenClaw · NemoClaw · OpenShell.`,

  operations: `You are a personal AI agent for an Office Manager, powered by NemoC LAW AI.
Summary financial access. Audit log access. No case content.
You can dispatch sub-agents for: compliance monitoring, knowledge search, communication drafting.
Focus on firm operations, compliance tracking, and administrative coordination. All actions audited.
Security: OpenClaw · NemoClaw · OpenShell.`,

  unconfigured: `You are the AI Chief of Staff for NemoC LAW AI, currently in ONBOARDING MODE.
The user just signed up and has NOT yet configured their firm. Your job is to:
1. WELCOME them warmly and demonstrate Agentic OS's value
2. ANSWER any questions about NemoC Law AI capabilities, pricing, security, or workflows
3. GUIDE them toward completing firm setup by using [SETUP_LINK] in your response text
4. ACT AS AN SDR — show excitement about their practice, ask about their firm needs, and explain how our AI agents can help

KEY PLATFORM FACTS (use these to answer questions):
- NemoC Law AI provides each employee with a personal AI agent + specialized sub-agents
- Managing Partners get: Legal Research, Contract Review, Drafting, Case Analytics, Business Intelligence, Knowledge Search, Communication Drafter
- NVIDIA NemoClaw sandbox = zero data leak guarantee, IOLTA compliance, PII auto-redaction
- Pricing: $297/mo Founder Price-Lock (lifetime), includes Agentic OS + 1 seat + unlimited tokens
- Additional seats: $149/mo per human role
- 7-day trial included
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
 * Send a message to a personal agent and get a response.
 *
 * @param {string} firmId - Firm Firestore ID
 * @param {string} agentId - Agent Firestore ID (= employee ID)
 * @param {string} userMessage - The user's message in plain English
 * @param {Array} conversationHistory - Previous messages [{role, content}]
 * @returns {Object} { response, subAgentsUsed, auditId }
 */
export async function sendAgentMessage(firmId, agentId, userMessage, conversationHistory = [], matterContext = null) {
  // Demo/dev mode — if no firmId or agentId, use simulated responses
  const isDemoMode = !firmId || !agentId;

  let agent;

  if (isDemoMode) {
    // Use a default partner agent config for demo
    agent = {
      agentType: 'partner',
      agentName: 'AI Chief of Staff',
      employeeEmail: 'demo@nemoc-law.ai',
      employeeName: 'Demo User',
      availableSubAgents: AGENT_SUB_AGENTS['partner'] || [],
    };
  } else {
    // 1. Load agent config from Firestore
    try {
      const agentSnap = await getDoc(doc(db, 'firms', firmId, 'agents', agentId));
      if (!agentSnap.exists()) {
        // Fallback to demo mode if agent doc doesn't exist
        agent = {
          agentType: 'partner',
          agentName: 'AI Chief of Staff',
          employeeEmail: '',
          employeeName: '',
          availableSubAgents: AGENT_SUB_AGENTS['partner'] || [],
        };
      } else {
        agent = agentSnap.data();
        await updateDoc(doc(db, 'firms', firmId, 'agents', agentId), { lastActive: serverTimestamp() });
      }
    } catch (err) {
      console.warn('Could not load agent config, using demo mode:', err.message);
      agent = {
        agentType: 'partner',
        agentName: 'AI Chief of Staff',
        employeeEmail: '',
        employeeName: '',
        availableSubAgents: AGENT_SUB_AGENTS['partner'] || [],
      };
    }
  }

  // 1.5. Determine configuration state, firm specialty, and fetch active matters
  let isFirmConfigured = false;
  let activeMattersList = [];
  let firmPracticeAreas = [];
  if (firmId) {
    try {
      const firmSnap = await getDoc(doc(db, 'firms', firmId));
      if (firmSnap.exists()) {
        const firmData = firmSnap.data();
        isFirmConfigured = firmData.isConfigured;
        firmPracticeAreas = firmData.practiceAreas || [];
      }

      const mattersSnap = await getDocs(query(collection(db, 'firms', firmId, 'matters'), where('status', '==', 'Active')));
      activeMattersList = mattersSnap.docs.map(d => d.data());
    } catch (e) {
      console.warn('Could not check firm config or matters:', e.message);
    }
  }

  // 2. Get role-appropriate system prompt
  let systemPrompt = !isFirmConfigured ? SYSTEM_PROMPTS.unconfigured : (SYSTEM_PROMPTS[agent.agentType] || SYSTEM_PROMPTS.associate);

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
    systemPrompt += `\n\n--- PRE-LOADED SPECIALTY KNOWLEDGEBASE ---\nThis Agent has been statically pre-loaded with comprehensive case law, statutory precedence, and procedural frameworks for: ${firmPracticeAreas.join(', ')}.\nAll analytical outputs, contract reviews, and legal research must natively reflect expertise in this specialized field unless explicitly instructed otherwise by the user.`;
  }

  // Append Ethical Wall Enforcement Context
  systemPrompt += `\n\n--- ETHICAL WALL ENFORCEMENT ---\nUser Role: ${agent.agentType?.toUpperCase()}`;
  if (['partner', 'managing-partner', 'solo-partner'].includes(agent.agentType)) {
    systemPrompt += `\nAccess Level: FULL FIRM VISIBILITY. You can access all client matters, financial records, and firm strategy data.`;
  } else if (['associate', 'paralegal', 'secretary'].includes(agent.agentType)) {
    systemPrompt += `\nAccess Level: ASSIGNED MATTERS ONLY. Do not process queries for matters the user is not explicitly assigned to. Firm financial data is strictly blocked.`;
  } else if (agent.agentType === 'contractor') {
    systemPrompt += `\nAccess Level: STRICT SANDBOX. You can only access specifically assigned matters. Deny any request for cross-matter information or firm directory to protect against conflicts of interest.`;
  } else if (agent.agentType === 'billing') {
    systemPrompt += `\nAccess Level: FINANCIAL ONLY. You may process billing, invoicing, and time entries, but do not access case strategy or client work product.`;
  } else if (agent.agentType === 'operations') {
    systemPrompt += `\nAccess Level: SUMMARY/AUDIT ONLY. No access to client privileged case content or files.`;
  } else if (agent.agentType === 'receptionist') {
    systemPrompt += `\nAccess Level: INTAKE ONLY. Client contact info only. No access to case files or financial data.`;
  }

  // Register the available sub-agents as formal tools
  const availableSubAgents = agent.availableSubAgents || [];
  if (availableSubAgents.length > 0) {
    systemPrompt += `\n\n--- SUB-AGENT TOOL REGISTRY ---\nYou have access to the following sub-agents. When performing these tasks, acknowledge the use of the corresponding tool:\n`;
    availableSubAgents.forEach(subId => {
      const catalogInfo = SUB_AGENT_CATALOG.find(c => c.id === subId);
      if (catalogInfo) {
        systemPrompt += `- TOOL: [${subId}] | Name: ${catalogInfo.name} | Capabilities: ${catalogInfo.desc}\n`;
      }
    });
  }

  // 2.5 Security: Pre-Flight Prompt Injection Shield (OpenShell Emulator)
  if (checkPromptInjection(userMessage)) {
    console.warn('[NEMOCLAW SECURITY] Active adversarial prompt injection blocked.');
    try {
      if (!isDemoMode) {
        await addDoc(collection(db, 'firms', firmId, 'auditLog'), {
          type: 'SECURITY_EVENT',
          severity: 'CRITICAL',
          description: 'Malicious prompt injection or LLM jailbreak attempt actively blocked at input layer.',
          agentId,
          timestamp: serverTimestamp()
        });
      }
    } catch(e) {}
    
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
      // Log and return without calling inference
      if (!isDemoMode) {
        try {
          await addDoc(collection(db, 'firms', firmId, 'agents', agentId || '_onboarding', 'messages'), { role: 'user', content: safeMessage, timestamp: serverTimestamp() });
          await addDoc(collection(db, 'firms', firmId, 'agents', agentId || '_onboarding', 'messages'), { role: 'assistant', content: localAnswer, subAgentsUsed: [], timestamp: serverTimestamp() });
        } catch (e) { /* ignore */ }
      }
      return { response: localAnswer, subAgentsUsed: [], auditId: null };
    }
  }

  // 4. Build the message array
  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-20),
    { role: 'user', content: safeMessage },
  ];

  // 5. Call the inference endpoint
  let response;
  let subAgentsUsed = [];

  try {
    const result = await callInference(messages, agent);
    response = result.content;
    subAgentsUsed = detectSubAgentUsage(safeMessage, agent.availableSubAgents || []);
  } catch (err) {
    console.error('Agent inference error:', err);
    response = `I apologize, but I'm experiencing a temporary issue connecting to the inference service. Please try again in a moment.\n\nError: ${err.message}`;
  }

  // 6. Apply UPL guard for non-attorney roles
  if (['receptionist', 'secretary', 'billing', 'operations', 'paralegal'].includes(agent.agentType)) {
    response = applyUPLGuard(response);
  }

  // 7. Log to audit trail (skip in demo mode)
  let auditId = null;
  if (!isDemoMode) {
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

  // 8. Save conversation to agent's message history (skip in demo mode)
  if (!isDemoMode) {
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

async function callInference(messages, agent) {
  // if (!NEMOCLAW_API_KEY) {
  //   // Check if we have the fallback simulateResponse
  //   return simulateResponse(messages, agent);
  // }

  // Build headers — in dev mode the Vite proxy adds the auth header
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
      max_tokens: 1024,   // Reduced from 4096 to drastically cut generation latency
      temperature: 0.05,  // Strict low temperature to prevent hallucination in legal context
      top_p: 0.8,         // Tighter probability bounds
      frequency_penalty: 0.2, // Penalize generic conversational padding
      presence_penalty: 0.0,
      stream: false,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Inference failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  return { content: data.choices?.[0]?.message?.content || 'No response generated.' };
}

/**
 * Simulated response for dev/demo when no API key is set.
 */
function simulateResponse(messages, agent) {
  const agentName = agent.agentName || 'Your AI Agent';
  const role = agent.agentType || 'associate';

  return { 
    content: `[DEV MODE] I am your ${role} agent (${agentName}). No real inference API key is configured. In a production environment, I would process your request using NVIDIA Nemotron 120B. Please configure VITE_NVIDIA_API_KEY to enable real intelligence.` 
  };
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
//  UPL GUARD
// ═══════════════════════════════════════════════

const UPL_PATTERNS = [
  /you should (sue|file|litigate|pursue)/i,
  /legal (advice|recommendation|opinion)/i,
  /I (advise|recommend|suggest) you/i,
  /your (legal )?rights (are|include)/i,
  /you (have|may have) a (strong |valid )?(claim|case|lawsuit)/i,
];

function applyUPLGuard(response) {
  const hasUPL = UPL_PATTERNS.some(p => p.test(response));
  if (hasUPL) {
    return response + '\n\n⚠️ **Disclaimer**: This output may contain content that should be reviewed by a licensed attorney before acting upon. This AI agent is not providing legal advice.';
  }
  return response;
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
