/**
 * Local Data Resolver — SDR Conversion Funnel
 *
 * Answers common onboarding questions from cached data without calling inference.
 * Every response appends 4 contextual follow-up questions designed to handle
 * objections and guide the user toward subscription.
 *
 * Follow-ups are appended after a ---FOLLOW_UPS--- delimiter as a JSON array.
 * The MyAgent.jsx component parses and renders them as clickable buttons.
 */

function appendFollowUps(answer, followUps) {
  return answer + '\n---FOLLOW_UPS---\n' + JSON.stringify(followUps);
}

export function resolveFromLocalData(userMessage) {
  const msg = userMessage.toLowerCase();

  // What problems do you solve
  if (msg.includes('problem') || msg.includes('solve') || msg.includes('pain point') || msg.includes('challenges')) {
    return appendFollowUps(
`NemoC Law AI addresses the core operational challenges that consume a managing partner's time and margin.

Time Leakage \u2014 The Billing Automation sub-agent tracks billable activity in real time. It detects unbilled work and auto-generates time entries, eliminating the 15-30% revenue loss most firms experience from missed billing.

Research Bottlenecks \u2014 The Legal Research sub-agent searches case law, finds precedents, and cites authority in Bluebook format. Work that takes an associate 4 hours completes in minutes.

Contract Risk \u2014 The Contract Review sub-agent redlines NDAs, MSAs, and vendor agreements. It flags risk clauses and suggests alternative language before you or your client sign.

Client Intake Friction \u2014 The Client Intake sub-agent screens leads, runs conflict checks, and qualifies matters 24/7 through your website portal.

Compliance Exposure \u2014 The Compliance Monitor sub-agent tracks regulatory deadlines, IOLTA reconciliation, and bar association filing requirements automatically.

Every sub-agent operates under your supervision inside the NVIDIA NemoClaw security sandbox. You approve every action.`,
      [
        'How much time would this actually save me per week?',
        'Can I try this with one real matter before committing?',
        'What happens to my existing documents and templates?',
        'Walk me through the setup process'
      ]
    );
  }

  // ChatGPT / Copilot differentiation
  if (msg.includes('chatgpt') || msg.includes('copilot') || msg.includes('different') || msg.includes('why not just use') || msg.includes('compared to')) {
    return appendFollowUps(
`The difference between NemoC Law AI and general-purpose tools like ChatGPT is the difference between a legal associate and a search engine.

Ethical Walls \u2014 ChatGPT has no concept of attorney-client privilege or matter isolation. Every query becomes training data. NemoC Law AI runs in an isolated NVIDIA NemoClaw sandbox. Your data never leaves your container and is never used for model training.

Role-Based Access \u2014 ChatGPT gives everyone the same access. NemoC Law AI enforces ethical walls by role. Your Associate Agent sees assigned matters only. Your Paralegal Agent cannot generate legal advice. Your Receptionist Agent has zero access to case files.

Sub-Agent Architecture \u2014 ChatGPT is a single conversation. NemoC Law AI deploys 7 specialist sub-agents under your Managing Partner Agent, each trained for a specific function: Legal Research, Contract Review, Drafting, Case Analytics, Business Intelligence, Knowledge Search, and Communication Drafting.

Audit Trail \u2014 Every action taken by every sub-agent is logged immutably. You can reproduce exactly what the AI did, when, and why. This matters when a malpractice insurer asks.

Firm Knowledge \u2014 NemoC Law AI trains on your uploaded templates, standard terms, and internal documents. ChatGPT knows nothing about your firm.`,
      [
        'How does the audit trail work in practice?',
        'Is my data really never used for training?',
        'What about firms already using Clio or other tools?',
        'Show me the pricing breakdown'
      ]
    );
  }

  // Client data safety / confidentiality
  if (msg.includes('client data') || msg.includes('confidential') || msg.includes('bar association') || msg.includes('privilege') || msg.includes('safe')) {
    return appendFollowUps(
`Client confidentiality is the foundation of the entire architecture.

Isolated Sandbox \u2014 Your firm runs inside a dedicated NVIDIA NemoClaw container. No other firm's data exists in your environment. There is no shared database.

PII Auto-Redaction \u2014 Before any query reaches the AI model, the system strips Social Security numbers, phone numbers, email addresses, and dates of birth. The model never sees raw PII.

Zero Training Guarantee \u2014 Your data is never used to train or fine-tune any AI model. This is contractually guaranteed, not just a policy.

Ethical Walls \u2014 The access control system mirrors law firm hierarchy. Partner Agents see everything. Associate Agents see only assigned matters. Contractor Agents operate in strict sandbox mode.

UPL Guardrails \u2014 Non-attorney agents automatically append "Requires attorney review" disclaimers when output could be construed as legal advice.

Audit Trail \u2014 Every agent action, sub-agent dispatch, and document access is logged with timestamps and full input/output records. This satisfies bar association requirements for AI usage documentation.`,
      [
        'Can I restrict the AI to only my state jurisdiction?',
        'How does this handle conflict of interest checks?',
        'What happens if there is a security breach?',
        'I want to see the setup process'
      ]
    );
  }

  // ROI / return on investment
  if (msg.includes('roi') || msg.includes('return on investment') || msg.includes('worth it') || msg.includes('save money') || msg.includes('how much time') || msg.includes('save me')) {
    return appendFollowUps(
`Here is the financial case for a small firm.

Agentic OS costs $297/mo for the managing partner seat. Additional seats are $149/mo each.

Time Recovery \u2014 Most attorneys lose 2-4 hours per day to administrative work, research overhead, and document formatting. The Legal Research, Drafting, and Contract Review sub-agents recover a significant portion of that time. At $350/hr, recovering even 1 hour per day adds $7,000/mo in billing capacity.

Billing Capture \u2014 The Billing Automation sub-agent detects unbilled work in real time. Firms typically lose 15-30% of billable time to entry lag. For a firm billing $50,000/mo, that represents $7,500-$15,000 in recovered revenue.

Intake Conversion \u2014 The Client Intake sub-agent qualifies leads and runs conflict checks 24/7. Firms that respond within 5 minutes are 21 times more likely to convert. The agent responds instantly.

Net ROI \u2014 For a solo practitioner at $297/mo, recovering 1 additional billable hour per week already generates a 4:1 return. For a 5-attorney firm, the math compounds significantly.`,
      [
        'Does the 7-day trial give me full access?',
        'What if I am a solo practitioner?',
        'How do existing firms transition their documents?',
        'I am ready to set up my firm'
      ]
    );
  }

  // Solo practitioner
  if (msg.includes('solo') || msg.includes('just me') || msg.includes('one attorney') || msg.includes('small firm') || msg.includes('by myself')) {
    return appendFollowUps(
`NemoC Law AI was designed with solo practitioners as a primary use case.

At $297/mo, you receive the full Managing Partner Agent with 7 specialist sub-agents. There is no reduced version. You get the same Legal Research, Contract Review, Drafting, Case Analytics, Business Intelligence, Knowledge Search, and Communication Drafter capabilities that a larger firm would deploy.

The difference for a solo practitioner is that these sub-agents effectively function as your staff. Instead of hiring a paralegal for research, a legal secretary for document formatting, or a billing clerk for time tracking, your sub-agents handle those functions.

The Client Intake sub-agent screens and qualifies leads through your website around the clock. The Billing Automation sub-agent tracks your time and generates invoices. The Compliance Monitor sub-agent watches deadlines you might miss when working alone.

Additional seats are only needed when you add human team members. As a solo practitioner, the single $297/mo seat covers your complete agent workforce.`,
      [
        'Can the agents actually do intake from my website?',
        'What practice areas do you support?',
        'How quickly can I be operational?',
        'Show me how the setup works'
      ]
    );
  }

  // Trial / free trial
  if (msg.includes('trial') || msg.includes('try') || msg.includes('test') || msg.includes('before committing') || msg.includes('before paying')) {
    return appendFollowUps(
`Every account includes a 7-day trial with full Agentic OS access.

During the trial, you receive the complete Managing Partner Agent with all 7 specialist sub-agents active. There are no feature restrictions during the trial period.

You can upload your firm's documents and templates, create matters, test Legal Research queries, run Contract Review on real agreements, and use the Drafting sub-agent to generate motions or briefs.

No credit card is required to explore the dashboard. Payment information is collected when you complete the firm setup through the onboarding wizard.

At the end of the trial, you choose whether to activate the $297/mo Founder Price-Lock. If you activate during the founder period, that rate is locked in permanently and will never increase.

To start the trial with full access, [SETUP_LINK].`,
      [
        'What happens to my data if I decide not to continue?',
        'Can I add team members during the trial?',
        'What is included in the founder pricing?',
        'I am ready to start the setup'
      ]
    );
  }

  // Pricing questions
  if (msg.includes('pricing') || msg.includes('cost') || msg.includes('how much') || msg.includes('price') || (msg.includes('297') && msg.includes('month'))) {
    return appendFollowUps(
`NemoC Law AI Pricing \u2014 Founder Edition

Agentic OS: $297/mo (Founder Rate \u2014 this rate is locked in for life)
Includes the full Agentic OS, 1 Managing Partner seat, and unlimited inference tokens.

Additional seats are $149/mo per human role. Each seat provisions a personal AI agent with role-specific sub-agents.

What every seat includes:
- A dedicated personal agent trained for the employee's role
- Specialist sub-agents scoped to that role's responsibilities
- NVIDIA NemoClaw security sandbox with zero data leak guarantee
- IOLTA compliance monitoring and full audit trail
- Website Builder Agent included free with every account

A 7-day trial is included. No credit card required to explore the Agentic OS.`,
      [
        'What is included in the 7-day trial?',
        'Is this worth it for a solo practitioner?',
        'What do the sub-agents actually do day to day?',
        'I want to start the setup now'
      ]
    );
  }

  // Setup / how to get started
  if (msg.includes('setup') || msg.includes('set up') || msg.includes('get started') || msg.includes('onboard') || msg.includes('walk me through') || msg.includes('ready')) {
    return appendFollowUps(
`Getting Started with NemoC Law AI

The setup takes about 3 minutes and provisions your entire AI workforce.

Step 1 \u2014 Firm Profile
[SETUP_LINK] to begin. Enter your firm name (auto-fills from Google Places), select your state bar, and choose from 74 practice categories.

Step 2 \u2014 Team Roster
Add each person at your firm. Every team member receives their own personal AI agent:
- Partners: Legal Research, Contract Review, Drafting, Case Analytics, Business Intelligence, Knowledge Search, Communication Drafter sub-agents, plus Super Agent access.
- Associates: Legal Research, Contract Review, Drafting, eDiscovery, Deposition Prep, Knowledge Search.
- Paralegals: eDiscovery, Document Formatting, Knowledge Search with UPL guardrails.
- Support staff: Role-appropriate sub-agents (Scheduling, Client Intake, Billing).

Step 3 \u2014 Launch
Configure security preferences, select sub-agents to activate, and we provision your sandbox in seconds.

[SETUP_LINK] to begin.`,
      [
        'Can I change my team roster later?',
        'What practice areas are supported?',
        'How do I upload my firm documents?',
        'What security controls are available?'
      ]
    );
  }

  // Security questions
  if (msg.includes('security') || msg.includes('privacy') || msg.includes('hipaa') || msg.includes('iolta') || msg.includes('compliance') || msg.includes('pii')) {
    return appendFollowUps(
`NemoC Law AI Security Architecture

NVIDIA NemoClaw Sandbox
Every firm operates in an isolated, containerized environment. No shared databases.

Data Protection
- PII auto-redaction: SSNs, phone numbers, and emails stripped before inference.
- Network isolation: Only whitelisted endpoints reachable.
- Full audit trail: Every agent action logged immutably.

Legal Compliance
- IOLTA reconciliation monitoring in the Billing sub-agent.
- UPL guardrails on non-attorney agents with automatic "Requires attorney review" flags.
- Ethical walls enforced per role. Contractors have strict sandbox mode.
- AI-generated content disclosures available globally.

Access Control by Agent Role
- Partner Agent: Full firm visibility.
- Associate Agent: Assigned matters only.
- Paralegal Agent: No legal advice generation.
- Receptionist Agent: Contact info only.
- Billing Agent: Financial data only.
- Contractor Agent: Strict sandbox.`,
      [
        'Is my data ever used for AI training?',
        'How does this compare to using ChatGPT?',
        'What does the audit trail look like?',
        'I am ready to set up my firm'
      ]
    );
  }

  // Capabilities
  if (msg.includes('what can you do') || msg.includes('capabilities') || msg.includes('features') || msg.includes('everything') || msg.includes('show me')) {
    return appendFollowUps(
`NemoC Law AI \u2014 Agent Capabilities

Your Managing Partner Agent comes with 7 specialist sub-agents:

Legal Research \u2014 Case law search, precedent finding, Bluebook citations. State-specific scoping available.

Contract Review \u2014 Redlines NDAs, MSAs, vendor agreements. Flags risk clauses and missing provisions.

Drafting \u2014 Pleadings, motions, briefs, demand letters using your firm's templates and style.

Case Analytics \u2014 Matter health analysis, timeline risks, deadline monitoring, outcome evaluation.

Business Intelligence \u2014 Revenue pipeline, utilization metrics, performance dashboards, billing trends.

Knowledge Search \u2014 Full-text search across uploaded documents, templates, and knowledge base.

Communication Drafter \u2014 Client emails, internal memos, settlement correspondence in your firm's tone.

Additional sub-agents for your team:
- eDiscovery: Document review, privilege tagging, relevance scoring
- Deposition Prep: Witness outlines, exhibit identification, question frameworks
- Billing Automation: Time entries, LEDES invoicing, IOLTA reconciliation
- Client Intake: Lead screening, conflict checks, matter qualification
- Compliance Monitor: Regulatory deadlines, filing requirements, CLE tracking
- Website Builder: Firm website analysis and redesign (included free)`,
      [
        'How does research compare to Westlaw?',
        'Can the Drafting Agent use my templates?',
        'What is the pricing for all this?',
        'Take me to the setup wizard'
      ]
    );
  }

  // Practice areas
  if (msg.includes('practice area') || msg.includes('type of law') || msg.includes('specialt') || msg.includes('what areas')) {
    return appendFollowUps(
`NemoC Law AI supports 74 practice categories across Individual and Business matters.

Individual categories include: Adoption, Bankruptcy (Personal), Child Custody, Civil Rights, Consumer Protection, Criminal Defense, Disability / ADA, Divorce, DUI / DWI, Elder Law, Employment (Employee Side), Estate Planning, Family Law, Guardianship, Immigration, Insurance Claims, Juvenile Law, Landlord-Tenant (Tenant Side), Medical Malpractice, Military / Veterans Law, Personal Injury, Product Liability, Social Security Disability, Traffic Violations, Trusts and Wills, Workers Compensation, Wrongful Death, and more.

Business categories include: Antitrust, Banking and Finance, Bankruptcy (Business), Business Formation, Cannabis Law, Commercial Litigation, Construction, Contracts, Corporate Governance, Corporate / M&A, Cybersecurity, eDiscovery, Employment (Employer Side), Energy, Environmental, Franchise, Government Contracts, Healthcare / HIPAA, Insurance Defense, IP / Patent, International Trade, Maritime, M&A, Real Estate, Regulatory, Securities, Tax, Technology, White Collar Crime, Zoning, and more.

When you set up your firm, you select your categories. Your AI agents are then configured with domain-specific knowledge for those areas.`,
      [
        'How deep is the knowledge in my area?',
        'Can I add practice areas later?',
        'What does the setup process look like?',
        'Show me the pricing'
      ]
    );
  }

  // Audit trail
  if (msg.includes('audit') || msg.includes('trail') || msg.includes('log') || msg.includes('track')) {
    return appendFollowUps(
`The audit trail in NemoC Law AI records every agent interaction immutably.

Each entry includes: the user who initiated the action, the agent and sub-agents dispatched, the full input query (after PII redaction), the complete output, a timestamp, and the matter context if scoped.

This means you can answer questions like: What did our AI generate for a specific matter last Tuesday? Which sub-agent drafted that motion? Did the Paralegal Agent generate anything that required attorney review?

The audit log is accessible from the dashboard under Security Overview. Entries cannot be modified or deleted once created. This satisfies the documentation requirements that an increasing number of state bars are implementing for AI-assisted legal work.

For firms subject to discovery, the audit trail provides a defensible record of human oversight over AI-generated work product.`,
      [
        'How long are audit records retained?',
        'Can I export the audit log?',
        'What other security features are included?',
        'I want to set up my firm now'
      ]
    );
  }

  // Westlaw / LexisNexis comparison
  if (msg.includes('westlaw') || msg.includes('lexis') || msg.includes('legal research tool')) {
    return appendFollowUps(
`The Legal Research sub-agent is not a replacement for Westlaw or LexisNexis. It complements them.

The sub-agent excels at rapid case law search, precedent identification, and Bluebook citation formatting. It can scope research to specific jurisdictions and synthesize findings into a structured memorandum.

Where Westlaw provides the authoritative database, the Legal Research sub-agent provides the analytical layer. It reads, synthesizes, and presents research in a fraction of the time it takes to manually search, read, and cite.

Many firms use NemoC Law AI alongside their existing research subscriptions. The sub-agent drafts the initial research memo, and the attorney validates citations against Westlaw or Lexis.

Agentic OS also integrates with CourtListener for federal case law access at no additional cost.`,
      [
        'Does it support Bluebook citation format?',
        'Can I restrict research to my state?',
        'What other sub-agents are available?',
        'Show me the full pricing'
      ]
    );
  }

  // Clio / existing tools
  if (msg.includes('clio') || msg.includes('practice management') || msg.includes('existing tool') || msg.includes('integrat')) {
    return appendFollowUps(
`NemoC Law AI integrates with existing practice management tools rather than replacing them.

Current integrations include:
- Clio: Practice management synchronization for matters, contacts, and billing
- Google Calendar: Deadline and hearing date synchronization
- CourtListener: Federal case law database access
- Slack: Team notifications and agent alerts

The Billing Automation sub-agent can detect unbilled time and log entries directly to Clio. The Scheduling sub-agent syncs deadlines with Google Calendar. The Client Intake sub-agent can push qualified leads into your CRM.

Your existing workflows stay intact. The AI agents augment what you already use rather than forcing a migration.

Additional integrations are on the roadmap. Agentic OS is designed around an open API architecture.`,
      [
        'How does the Clio integration work specifically?',
        'Can I use this without Clio?',
        'What is the pricing?',
        'I want to start the setup'
      ]
    );
  }

  // Return null for unmatched queries — fall through to inference
  return null;
}
