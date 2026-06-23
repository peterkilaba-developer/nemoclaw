// ═══════════════════════════════════════════════════════════════
//  PRACTICE AREA CONFIG — Solo Attorney Contextual Workflow Engine
//  Drives: matter workflow stages, agent quick actions, welcome
//  copy, command center KPIs, and sub-agent prioritization.
// ═══════════════════════════════════════════════════════════════

export const PRACTICE_AREA_CONFIG = {
  'Personal Injury': {
    workflowStages: ['Intake', 'Investigation', 'Demand', 'Negotiation', 'Settlement', 'Close'],
    quickActions: [
      { label: 'Draft demand letter', prompt: 'Draft a demand letter for a personal injury case with soft tissue injuries and $45,000 in medical bills.' },
      { label: 'Calculate SOL', prompt: 'What is the statute of limitations for a personal injury claim in my jurisdiction? Walk me through any discovery rule exceptions.' },
      { label: 'Request medical records', prompt: 'Draft a medical records authorization and HIPAA-compliant request letter for a PI client.' },
      { label: 'Evaluate case value', prompt: 'Help me evaluate the settlement value of a PI case with liability established, soft tissue injuries, and 6 months of treatment.' },
    ],
    welcomeSuffix: 'I\'m fully versed in personal injury workflow — from incident investigation through settlement negotiation and trial prep.',
    agentFocus: ['legal-research', 'drafting', 'billing-time', 'deadline-tracker', 'communication-drafter'],
    kpiLabels: ['Active PI Files', 'Demands Pending', 'In Negotiation', 'Settled This Month'],
  },

  'Family Law': {
    workflowStages: ['Intake', 'Conflict Check', 'Discovery', 'Mediation', 'Hearing', 'Order Entry', 'Close'],
    quickActions: [
      { label: 'Draft parenting plan', prompt: 'Draft a standard parenting plan for a contested custody matter with two school-age children.' },
      { label: 'Property division memo', prompt: 'Summarize the equitable distribution rules in my state for a contested divorce involving a marital home and 401(k).' },
      { label: 'Support calculation', prompt: 'Help me calculate child support and alimony estimates for a divorce matter with income information I\'ll provide.' },
      { label: 'Client checklist', prompt: 'Generate a comprehensive document checklist for a new divorce client to gather financial records.' },
    ],
    welcomeSuffix: 'I handle the full family law workflow — custody, support, asset division, protective orders, and court preparation.',
    agentFocus: ['legal-research', 'drafting', 'scheduling', 'deadline-tracker', 'communication-drafter'],
    kpiLabels: ['Active Family Files', 'Pending Hearings', 'Mediation Scheduled', 'Orders Finalized'],
  },

  'Divorce & Separation': {
    workflowStages: ['Intake', 'Conflict Check', 'Discovery', 'Mediation', 'Hearing', 'Order Entry', 'Close'],
    quickActions: [
      { label: 'Draft settlement agreement', prompt: 'Draft a comprehensive marital settlement agreement framework for an uncontested divorce.' },
      { label: 'Property division checklist', prompt: 'Create a complete marital asset inventory checklist for a divorce client.' },
      { label: 'Support calculation memo', prompt: 'Explain the alimony and child support calculation methodology in my state.' },
      { label: 'QDRO overview', prompt: 'Explain what a QDRO is and when it\'s needed in a divorce with retirement assets.' },
    ],
    welcomeSuffix: 'I\'m your AI co-counsel for divorce and separation matters — from initial consultation through final decree.',
    agentFocus: ['legal-research', 'drafting', 'scheduling', 'deadline-tracker', 'communication-drafter'],
    kpiLabels: ['Active Divorce Files', 'Pending Hearings', 'Settlements Reached', 'Orders Entered'],
  },

  'Criminal Defense': {
    workflowStages: ['Intake', 'Arraignment', 'Discovery', 'Pre-Trial Motions', 'Plea / Trial', 'Sentencing', 'Close'],
    quickActions: [
      { label: 'Draft suppression motion', prompt: 'Draft a motion to suppress evidence based on a Fourth Amendment unlawful search and seizure.' },
      { label: 'Discovery demand letter', prompt: 'Draft a formal Brady/Giglio discovery demand letter to the prosecution.' },
      { label: 'Sentencing memo', prompt: 'Draft a sentencing memorandum arguing for a downward departure based on mitigating factors.' },
      { label: 'Plea vs. trial analysis', prompt: 'Walk me through the framework for advising a client on whether to accept a plea offer or proceed to trial.' },
    ],
    welcomeSuffix: 'I\'m prepared for the full criminal defense workflow — from arraignment through trial or plea negotiation.',
    agentFocus: ['legal-research', 'drafting', 'deadline-tracker', 'deposition-prep', 'knowledge-search'],
    kpiLabels: ['Active Criminal Files', 'Upcoming Hearings', 'Plea Negotiations', 'Motions Pending'],
  },

  'DUI / DWI': {
    workflowStages: ['Intake', 'License Hearing', 'Discovery', 'Pre-Trial Motions', 'Plea / Trial', 'Sentencing', 'Close'],
    quickActions: [
      { label: 'Challenge field sobriety test', prompt: 'Draft a motion challenging the validity of field sobriety tests administered during my client\'s DUI arrest.' },
      { label: 'DMV hearing prep', prompt: 'Prepare talking points and arguments for a DMV administrative license suspension hearing.' },
      { label: 'Suppression motion', prompt: 'Draft a motion to suppress breathalyzer results based on improper calibration.' },
      { label: 'Client intake questions', prompt: 'Generate a comprehensive DUI intake questionnaire covering the arrest, field tests, and chemical tests.' },
    ],
    welcomeSuffix: 'I handle DUI/DWI defense from arrest through trial — license hearings, suppression motions, and plea negotiations.',
    agentFocus: ['legal-research', 'drafting', 'deadline-tracker', 'knowledge-search'],
    kpiLabels: ['Active DUI Files', 'License Hearings', 'Trial Settings', 'Pleas Negotiated'],
  },

  'Estate Planning & Probate': {
    workflowStages: ['Intake', 'Asset Review', 'Plan Design', 'Drafting', 'Execution', 'Funding', 'Close'],
    quickActions: [
      { label: 'Draft revocable trust', prompt: 'Draft a revocable living trust framework for a married couple with two adult children and a primary residence.' },
      { label: 'Pour-over will', prompt: 'Draft a pour-over will to accompany a revocable living trust.' },
      { label: 'Power of attorney', prompt: 'Draft a durable financial power of attorney and health care proxy for estate planning clients.' },
      { label: 'Probate timeline', prompt: 'Walk me through the standard probate timeline and required steps in my state for a decedent with a will.' },
    ],
    welcomeSuffix: 'I assist with the full estate planning lifecycle — wills, trusts, powers of attorney, probate, and asset protection.',
    agentFocus: ['drafting', 'legal-research', 'knowledge-search', 'deadline-tracker', 'communication-drafter'],
    kpiLabels: ['Active Estate Plans', 'Probate Files', 'Documents Drafted', 'Trusts Funded'],
  },

  'Trusts & Wills': {
    workflowStages: ['Intake', 'Asset Review', 'Plan Design', 'Drafting', 'Execution', 'Funding', 'Close'],
    quickActions: [
      { label: 'Draft last will & testament', prompt: 'Draft a comprehensive last will and testament for a client with a spouse, two minor children, and an estate under $2M.' },
      { label: 'Testamentary trust', prompt: 'Draft a testamentary trust provision within a will for minor beneficiaries.' },
      { label: 'Asset inventory', prompt: 'Create a comprehensive asset inventory checklist for a new estate planning client.' },
      { label: 'Beneficiary designations memo', prompt: 'Explain why beneficiary designations override will provisions and how to review them.' },
    ],
    welcomeSuffix: 'I handle wills, trusts, and estate administration — drafting to execution and probate guidance.',
    agentFocus: ['drafting', 'legal-research', 'knowledge-search', 'deadline-tracker'],
    kpiLabels: ['Active Estate Plans', 'Wills Drafted', 'Trusts Executed', 'Probate Pending'],
  },

  'Immigration': {
    workflowStages: ['Intake', 'Eligibility Assessment', 'Documentation', 'USCIS Filing', 'Adjudication', 'RFE Response', 'Close'],
    quickActions: [
      { label: 'I-130 filing checklist', prompt: 'Generate a complete I-130 petition filing checklist for a U.S. citizen petitioning for a spouse.' },
      { label: 'RFE response letter', prompt: 'Draft a response to a USCIS Request for Evidence (RFE) regarding insufficient evidence of bona fide marriage.' },
      { label: 'DACA renewal prep', prompt: 'Generate a DACA renewal documentation checklist and timeline for a client.' },
      { label: 'Asylum overview', prompt: 'Explain the asylum application process including credible fear interviews and one-year filing bar.' },
    ],
    welcomeSuffix: 'I assist with all immigration matters — family petitions, employment visas, naturalization, deportation defense, and asylum.',
    agentFocus: ['legal-research', 'drafting', 'deadline-tracker', 'communication-drafter', 'knowledge-search'],
    kpiLabels: ['Active Immigration Files', 'USCIS Filings Pending', 'RFEs Outstanding', 'Cases Approved'],
  },

  'Bankruptcy (Personal)': {
    workflowStages: ['Intake', 'Means Test', 'Petition Drafting', 'Filing', '341 Meeting', 'Confirmation', 'Discharge', 'Close'],
    quickActions: [
      { label: 'Chapter 7 means test', prompt: 'Walk me through the Chapter 7 means test calculation framework and how to determine eligibility.' },
      { label: 'Exempt property analysis', prompt: 'Summarize the bankruptcy exemptions available to individual debtors in my state.' },
      { label: 'Debtor intake checklist', prompt: 'Generate a comprehensive bankruptcy client intake checklist covering all assets, debts, and income sources.' },
      { label: 'Chapter 13 plan', prompt: 'Explain how to structure a Chapter 13 repayment plan and calculate the plan payment.' },
    ],
    welcomeSuffix: 'I handle Chapter 7 and Chapter 13 bankruptcy matters — from intake through discharge.',
    agentFocus: ['legal-research', 'drafting', 'deadline-tracker', 'billing-time'],
    kpiLabels: ['Active Bankruptcy Files', 'Ch. 7 Cases', 'Ch. 13 Cases', 'Meetings of Creditors'],
  },

  'Real Estate (Residential)': {
    workflowStages: ['Intake', 'Contract Review', 'Title Search', 'Due Diligence', 'Closing Prep', 'Closing', 'Close'],
    quickActions: [
      { label: 'Review purchase agreement', prompt: 'Review a standard residential purchase and sale agreement and flag any buyer-unfavorable provisions.' },
      { label: 'Title issues memo', prompt: 'Explain the most common title defects that can delay or kill a residential real estate closing.' },
      { label: 'Closing checklist', prompt: 'Generate a comprehensive residential real estate closing checklist for the buyer\'s attorney.' },
      { label: 'Lease review', prompt: 'Review a residential lease and identify tenant-unfavorable provisions.' },
    ],
    welcomeSuffix: 'I assist with residential real estate transactions — contract review, title, closings, and landlord-tenant matters.',
    agentFocus: ['contract-review', 'legal-research', 'drafting', 'deadline-tracker'],
    kpiLabels: ['Active RE Files', 'Closings Scheduled', 'Contracts Under Review', 'Closed This Month'],
  },

  'Business Formation & LLC': {
    workflowStages: ['Intake', 'Entity Selection', 'State Filing', 'Operating Agreement', 'EIN & Banking', 'Compliance', 'Close'],
    quickActions: [
      { label: 'LLC vs. S-Corp memo', prompt: 'Draft a client memo explaining the tax and liability differences between an LLC and S-Corporation.' },
      { label: 'Operating agreement', prompt: 'Draft a single-member LLC operating agreement for a professional services business.' },
      { label: 'State filing checklist', prompt: 'What are the required steps and state filings to form an LLC in my jurisdiction?' },
      { label: 'Buy-sell agreement', prompt: 'Draft a buy-sell agreement framework for a two-member LLC.' },
    ],
    welcomeSuffix: 'I assist with entity formation, operating agreements, compliance, and business transactions.',
    agentFocus: ['legal-research', 'drafting', 'contract-review', 'compliance-monitor'],
    kpiLabels: ['Active Business Files', 'Entities Formed', 'Agreements Drafted', 'Compliance Reviews'],
  },

  'Employment (Employee Side)': {
    workflowStages: ['Intake', 'Claim Evaluation', 'EEOC / Agency Filing', 'Investigation', 'Mediation', 'Litigation', 'Close'],
    quickActions: [
      { label: 'Wrongful termination memo', prompt: 'Analyze a potential wrongful termination claim based on age discrimination under the ADEA.' },
      { label: 'EEOC charge draft', prompt: 'Draft an EEOC charge of discrimination for a hostile work environment claim based on sex.' },
      { label: 'Severance review', prompt: 'Review a severance agreement and identify any problematic provisions, particularly around ADEA waivers.' },
      { label: 'Demand letter to employer', prompt: 'Draft a pre-litigation demand letter to an employer regarding unpaid overtime wages under the FLSA.' },
    ],
    welcomeSuffix: 'I handle employment matters on the employee side — discrimination, harassment, retaliation, and wage claims.',
    agentFocus: ['legal-research', 'drafting', 'deadline-tracker', 'communication-drafter'],
    kpiLabels: ['Active Employment Files', 'EEOC Filings', 'Pending Mediations', 'Cases in Litigation'],
  },

  'Workers\' Compensation': {
    workflowStages: ['Intake', 'Claim Filing', 'Investigation', 'IME / Medical', 'Hearing', 'Settlement', 'Close'],
    quickActions: [
      { label: 'Workers comp intake', prompt: 'Generate a comprehensive workers\' compensation intake questionnaire for an injured worker.' },
      { label: 'IME rebuttal memo', prompt: 'Draft a memo rebutting an Independent Medical Examination (IME) report that contradicts treating physician opinions.' },
      { label: 'Settlement demand', prompt: 'Draft a workers\' compensation settlement demand letter with supporting medical and wage loss documentation.' },
      { label: 'Hearing preparation', prompt: 'Prepare a workers\' compensation hearing outline for a disputed permanent disability rating.' },
    ],
    welcomeSuffix: 'I handle workers\' compensation claims from first report of injury through settlement or hearing.',
    agentFocus: ['legal-research', 'drafting', 'deadline-tracker', 'communication-drafter'],
    kpiLabels: ['Active WC Files', 'Claims Filed', 'Hearings Scheduled', 'Settlements Pending'],
  },

  'Landlord-Tenant (Tenant Side)': {
    workflowStages: ['Intake', 'Notice Review', 'Response / Demand', 'Negotiation', 'Hearing', 'Close'],
    quickActions: [
      { label: 'Eviction defense response', prompt: 'Draft an answer to an eviction complaint raising habitability defenses.' },
      { label: 'Security deposit demand', prompt: 'Draft a security deposit demand letter citing state statutory treble damages for wrongful withholding.' },
      { label: 'Habitability conditions letter', prompt: 'Draft a repair and deduct notice to a landlord for failure to repair uninhabitable conditions.' },
      { label: 'ERAP application guidance', prompt: 'Explain emergency rental assistance programs and how to help a tenant apply.' },
    ],
    welcomeSuffix: 'I handle tenant-side landlord-tenant matters — eviction defense, habitability, security deposits, and lease disputes.',
    agentFocus: ['legal-research', 'drafting', 'deadline-tracker', 'communication-drafter'],
    kpiLabels: ['Active Tenant Files', 'Evictions Defended', 'Hearings Pending', 'Cases Resolved'],
  },

  'Landlord-Tenant (Landlord Side)': {
    workflowStages: ['Intake', 'Notice Drafting', 'Filing', 'Hearing', 'Judgment', 'Collection / Enforcement', 'Close'],
    quickActions: [
      { label: 'Pay or quit notice', prompt: 'Draft a Pay or Quit notice for a tenant 30 days past due on rent.' },
      { label: 'Eviction complaint', prompt: 'Draft an unlawful detainer complaint for a non-paying tenant after proper notice was served.' },
      { label: 'Lease review', prompt: 'Review a residential lease and identify provisions that may be unenforceable in my jurisdiction.' },
      { label: 'Post-judgment collection', prompt: 'Explain the options available to a landlord to collect on a judgment for unpaid rent.' },
    ],
    welcomeSuffix: 'I handle landlord-side matters — evictions, leases, security deposits, and property disputes.',
    agentFocus: ['legal-research', 'drafting', 'deadline-tracker', 'communication-drafter'],
    kpiLabels: ['Active Landlord Files', 'Evictions Filed', 'Judgments Entered', 'Hearings Pending'],
  },

  'Contracts & Agreements': {
    workflowStages: ['Intake', 'Contract Review', 'Negotiation', 'Revision', 'Execution', 'Close'],
    quickActions: [
      { label: 'Review and redline contract', prompt: 'Review this contract and provide a marked-up redline with risk flags and suggested revisions.' },
      { label: 'NDA review', prompt: 'Review a mutual NDA and flag any one-sided provisions or missing protections.' },
      { label: 'Service agreement', prompt: 'Draft a professional services agreement for a consultant providing monthly retainer services.' },
      { label: 'Force majeure analysis', prompt: 'Analyze whether a force majeure clause would excuse performance under a commercial contract.' },
    ],
    welcomeSuffix: 'I handle contract review, drafting, negotiation support, and dispute analysis.',
    agentFocus: ['contract-review', 'legal-research', 'drafting', 'due-diligence'],
    kpiLabels: ['Contracts Under Review', 'In Negotiation', 'Executed This Month', 'Disputes Active'],
  },

  'Intellectual Property / Patent': {
    workflowStages: ['Intake', 'IP Audit', 'Application Drafting', 'Filing', 'Prosecution', 'Grant / Registration', 'Close'],
    quickActions: [
      { label: 'IP audit checklist', prompt: 'Generate a comprehensive intellectual property audit checklist for a technology startup.' },
      { label: 'Trademark clearance search', prompt: 'Walk me through conducting a trademark clearance search and evaluating likelihood of confusion.' },
      { label: 'DMCA takedown notice', prompt: 'Draft a DMCA takedown notice for copyright infringement of original written content.' },
      { label: 'IP assignment agreement', prompt: 'Draft an IP assignment agreement for a company acquiring all IP from a founding employee.' },
    ],
    welcomeSuffix: 'I handle IP matters — patents, trademarks, copyrights, trade secrets, and licensing.',
    agentFocus: ['legal-research', 'drafting', 'deadline-tracker', 'knowledge-search'],
    kpiLabels: ['Active IP Files', 'Applications Pending', 'In Prosecution', 'Registrations Secured'],
  },

  'Social Security Disability': {
    workflowStages: ['Intake', 'Initial Application', 'Reconsideration', 'ALJ Hearing', 'Appeals Council', 'Federal Court', 'Close'],
    quickActions: [
      { label: 'RFC assessment review', prompt: 'Analyze a Social Security Residual Functional Capacity (RFC) assessment and identify favorable findings for a disability claim.' },
      { label: 'ALJ hearing prep', prompt: 'Prepare an outline for a Social Security disability hearing before an Administrative Law Judge.' },
      { label: 'Medical evidence memo', prompt: 'Draft a brief on how to develop medical evidence for a Social Security disability claim involving chronic pain.' },
      { label: 'Five-step analysis', prompt: 'Walk me through the Social Security five-step sequential evaluation for determining disability.' },
    ],
    welcomeSuffix: 'I handle Social Security disability claims from initial application through ALJ hearings and federal court.',
    agentFocus: ['legal-research', 'drafting', 'deadline-tracker', 'communication-drafter'],
    kpiLabels: ['Active SSDI Files', 'Hearings Scheduled', 'Reconsideration Pending', 'Appeals Pending'],
  },
};

// ─────────────────────────────────────────────────────────────────────
//  DEFAULT CONFIG — for practice areas without specific configuration
// ─────────────────────────────────────────────────────────────────────
const DEFAULT_CONFIG = {
  workflowStages: ['Intake', 'Conflict Check', 'Engagement', 'Work', 'Resolution', 'Close'],
  quickActions: [
    { label: 'Research case law', prompt: 'Research recent case law relevant to my practice area and current matters.' },
    { label: 'Draft document', prompt: 'Help me draft a legal document for a client matter.' },
    { label: 'Client communication', prompt: 'Draft a client status update letter for an active matter.' },
    { label: 'Billing review', prompt: 'Review my unbilled time entries for this month and flag any issues.' },
  ],
  welcomeSuffix: 'I can assist you with legal research, document drafting, client communications, and matter management.',
  agentFocus: ['legal-research', 'drafting', 'communication-drafter', 'billing-time'],
  kpiLabels: ['Active Matters', 'Tasks Today', 'Unbilled Time', 'Sandbox Status'],
};

// ─────────────────────────────────────────────────────────────────────
//  UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────

/**
 * Get the merged config for a firm's practice areas.
 * Uses the first recognized practice area as primary, merges quick actions
 * from up to two additional areas.
 */
export function getPracticeAreaConfig(practiceAreas = []) {
  if (!practiceAreas || practiceAreas.length === 0) return DEFAULT_CONFIG;

  const primary = practiceAreas.find(pa => PRACTICE_AREA_CONFIG[pa]);
  if (!primary) return DEFAULT_CONFIG;

  const primaryConfig = PRACTICE_AREA_CONFIG[primary];

  // Merge quick actions from secondary practice area if present
  const secondary = practiceAreas.slice(1).find(pa => PRACTICE_AREA_CONFIG[pa] && pa !== primary);
  if (secondary) {
    const secondaryConfig = PRACTICE_AREA_CONFIG[secondary];
    return {
      ...primaryConfig,
      quickActions: [
        ...primaryConfig.quickActions.slice(0, 3),
        secondaryConfig.quickActions[0],
      ],
      welcomeSuffix: `${primaryConfig.welcomeSuffix} I also handle ${secondary.toLowerCase()} matters.`,
    };
  }

  return primaryConfig;
}

/**
 * Get workflow stages for a specific matter practice area string.
 * Falls back to default stages if not found.
 */
export function getMatterWorkflowStages(practiceArea) {
  if (!practiceArea) return DEFAULT_CONFIG.workflowStages;

  // Direct match
  if (PRACTICE_AREA_CONFIG[practiceArea]) {
    return PRACTICE_AREA_CONFIG[practiceArea].workflowStages;
  }

  // Fuzzy match — find a config whose key is contained in the practice area string
  const match = Object.keys(PRACTICE_AREA_CONFIG).find(key =>
    practiceArea.toLowerCase().includes(key.toLowerCase()) ||
    key.toLowerCase().includes(practiceArea.toLowerCase())
  );

  return match ? PRACTICE_AREA_CONFIG[match].workflowStages : DEFAULT_CONFIG.workflowStages;
}

/**
 * Get a short, human-readable practice area label for display.
 */
export function getPracticeAreaLabel(practiceAreas = []) {
  if (!practiceAreas || practiceAreas.length === 0) return 'General Practice';
  if (practiceAreas.length === 1) return practiceAreas[0];
  if (practiceAreas.length === 2) return `${practiceAreas[0]} & ${practiceAreas[1]}`;
  return `${practiceAreas[0]} +${practiceAreas.length - 1} more`;
}

/**
 * Get the primary display welcome message for the AI Chief of Staff,
 * contextualized to the attorney's practice areas.
 */
export function getAgentWelcomeMessage(firstName, practiceAreas = [], _firmName = '') {
  const config = getPracticeAreaConfig(practiceAreas);
  const greeting = `I'm your AI Chief of Staff — your private AI co-counsel secured by NVIDIA NemoClaw.`;
  const context = practiceAreas.length > 0
    ? `${config.welcomeSuffix}`
    : `I can assist with legal research, drafting, client communications, billing, and practice management.`;

  return `${greeting}\n\n${context}\n\nWhat would you like to work on, ${firstName}?`;
}
