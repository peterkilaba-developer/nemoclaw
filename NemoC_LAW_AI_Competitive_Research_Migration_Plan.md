# NemoC LAW AI Competitive Research and Migration Plan

Date: 2026-05-18

## Current product baseline from code review

NemoC LAW AI is already positioned as an agentic law-firm operating system, not a narrow matter tracker. The current React/Firebase codebase includes:

- Public funnel, onboarding, Stripe subscription, and trial flow.
- Dashboard routes for `my-agent`, `matters`, `client-portal`, `crm`, `team`, `agents`, `security`, `super-agent`, `settings`, `billing`, and `website-builder`.
- Matter workspace with scoped AI chat, engagement letter workflow, client signature link creation, portal provisioning, matter closure audit, and AI time capture.
- Role-aware agent hierarchy with partner, associate, paralegal, receptionist, secretary, billing, operations, law clerk, intern, and super-agent access patterns.
- Agent API with PII redaction, prompt injection checks, role-specific system prompts, matter access checks, sub-agent routing, audit logging, and conversation history.
- Cloud Functions for NVIDIA inference, website scraping, prospecting/outreach, Stripe, Twilio, conflict checks, signature requests, SDR automation, and internal agent operations.
- A basic `scripts/firm_migration_tool.mjs` that exports/imports NemoC Firestore firm data only.

The key gap: the repo has an internal migration utility, but not a user-facing one-click migration product, provider adapters, canonical migration schema, import preview, or validation/rollback workflow.

## Top 10 small-firm systems to beat

These are the most relevant migration targets for solo to 10-attorney firms. They combine legacy SaaS practice management, newer AI add-ons, and AI-native legal operations positioning.

| Rank | Provider | Small-firm fit | What they sell | AI posture | Pricing signal | Migration signal | NemoC wedge |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Clio Manage + Manage AI | Broad default for solos and small firms | Matter management, billing, docs, client portal, intake/CRM add-ons | Manage AI plans/schedules/drafts/bills as add-on | Public base tiers plus sales-priced add-ons | Self-serve/guided migration; migration limitations around historical accounting and documents | Beat Clio on fixed AI-inclusive operating system, no add-on sprawl, and instant AI staff |
| 2 | MyCase + 8am IQ | Strong solo/small general practice | Cases, billing, trust, client portal, texting, intake, accounting add-on | 8am IQ writing, document, translation, and case assistant | $39/$89/$109 annually; $49/$99/$119 monthly | Concierge migration and template imports; Open API only on Advanced | Beat on cheaper AI-inclusive team OS and migration from MyCase without CSV gymnastics |
| 3 | PracticePanther | Solo to small firms wanting simple LPM | Contacts, matters, billing, portal, texting, e-signature, accounting tier | Mostly automation/API rather than native agentic AI | $49-$114 annually; $59-$124 monthly | Dedicated account manager; export anytime; API/Zapier | Beat on AI-native work execution, not just forms, workflows, and billing |
| 4 | Smokeball + Smokeball AI | Small document-heavy practices | Desktop/cloud practice management, document automation, billing, AutoTime | Archie.ai, AutoTime.ai, Intake.ai | Often quote/add-on driven; third-party sources report high starting costs | ProStart migration can take 5-8 weeks and still needs manual cleanup | Beat on browser-first, faster onboarding, less lock-in, and migration confidence report |
| 5 | CosmoLex | Accounting-heavy solos/small firms | Practice management plus full trust/business accounting | Limited visible AI compared with newer entrants | Quote/tiered; CRM and website add-ons published | DIY or turn-key migration; broad legacy source experience | Beat with accounting-aware agent plus lower cognitive load |
| 6 | Rocket Matter | Price-sensitive small firms | Matter management, billing, workflows, CRM/website add-ons | Automation-heavy, not strongly AI-native | Starts around $49/user/month annually | Free data migration claim; some add-on import costs | Beat by bundling AI, website, intake, and agent work without modular add-on maze |
| 7 | Lawcus + Nova AI | Solo/small workflow-centric firms | Visual matter pipelines, CRM, billing, automation, client portal | Nova AI writing suggestions; no-code workflow automation | $39/$59/$79 annually; $49/$69/$89 monthly | Free migration/support for annual users; API access and Zapier | Beat on deeper legal-agent orchestration plus trust/security/audit as defaults |
| 8 | CARET Legal | Smaller to mid-sized firms, especially admin/accounting heavy | Case management, accounting, docs, client portal, analytics | AI-generated document summaries on higher plan | $79/$99/$119 annually plus implementation fees | Expert migration included; one-time implementation | Beat on no implementation drag and AI doing work across the firm |
| 9 | Actionstep + Actionstep Intelligence | Workflow-heavy small/mid firms | Practice management, accounting, workflows, document automation | AI focused on business of law, admin, data quality, profitability | Quote per user plus implementation fees | Certified partner implementation; typical 6-12 weeks | Beat on setup speed, solo friendliness, and out-of-box legal roles |
| 10 | Filevine + LOIS | PI/immigration/litigation boutiques with budget | Case management, intake, docs, signatures, depositions, AI intelligence | Explicit agentic legal workspace with LOIS, DemandsAI, ImmigrationAI, Depo Copilot | Custom quote; AI is metered/tiered | Custom/partner implementation; DataBridge/export route | Beat for small firms with transparent pricing and a lighter AI-native OS |

## Competitive pattern

The incumbents mostly compete on "all-in-one" feature coverage. Their weak points are predictable:

- AI is usually a paid add-on, limited assistant, or feature layer inside an older workflow.
- Migration is a project, not a product. It requires templates, consultants, final data pulls, freezes, manual QA, or weeks of implementation.
- The user still has to operate the software. Automations trigger tasks, but they rarely own outcomes end to end.
- Accounting, intake, client communication, documents, and marketing often splinter into add-ons or partner apps.
- Small firms face enterprise-style friction: sales calls, implementation fees, tier-gated APIs, and hidden configuration burden.

NemoC should not claim "we have more features." The winning claim is:

> Your old system stores your firm. NemoC runs your firm.

## No-brainer product strategy

### 1. Make migration the front door

Add `Move to NemoC in one click` as a primary onboarding path:

1. Choose current provider.
2. Connect account or upload export ZIP/CSV/Documents folder.
3. NemoC runs ATLAS Migration Agent.
4. User sees a migration health score, unmapped-field queue, duplicate warnings, and estimated launch time.
5. User clicks `Launch Firm OS`.
6. NemoC provisions agents, matters, clients, knowledge base, portal, billing guardrails, and audit logs.

For small firms, the migration experience is the sale. The promise should be "business continuity by tonight" for API-supported firms and "first usable workspace in 30 minutes" for upload-based firms.

### 2. Price against the whole stack, not the seat

Current code and marketing already mention a $297/mo founder price-lock and $149/mo extra seats. Keep the small-firm offer simple:

- Solo: $297/mo all-in founder plan.
- 2-10 attorneys: $297/mo base + $149/mo per additional human role.
- Included: AI chief of staff, sub-agents, client portal, matter workspaces, website builder, intake CRM, trust-aware billing capture, audit/security layer, migration.
- Excluded or metered only when unavoidable: high-volume storage, third-party court/legal data fees, SMS/voice pass-through, advanced accounting ledger in later phase.

The core battle is not cheaper than every plan. It is cheaper than Clio/MyCase/PracticePanther plus AI, intake, website, texting, document automation, calendar rules, and consultants.

### 3. Own "agentic HITL" instead of "AI lawyer"

NemoC should loudly avoid the replacement trap:

- AI never replaces attorney judgment.
- Every legal work product routes through role-based attorney approval.
- Every action logs to immutable audit.
- Non-attorney roles get UPL warnings and restricted context.
- Matter access obeys ethical walls.
- AI handles the work around the law: intake, drafts, summaries, reminders, billing narratives, client updates, evidence organization, website/marketing ops, and firm analytics.

### 4. Make the product feel alive

Legacy systems feel like databases. NemoC should feel like a working team:

- Partner Agent: "Here are the 6 matters that need attention today."
- Intake Agent: qualifies leads, runs conflict checks, drafts engagement letters.
- Billing Agent: captures time, drafts invoices, flags trust replenishment.
- Client Agent: sends portal updates and translates client-facing summaries.
- Deadline Agent: extracts dates from documents and creates risk-ranked tasks.
- Website/GTM Agent: updates landing pages and creates local SEO/intake campaigns.
- Super Agent: firm-wide risk, profitability, capacity, and growth view.

### 5. Win by practice-area bundles

Start with high-value solo/small firm bundles:

- Personal Injury: intake, medical chronology, demand package, lien/LOP tracking, settlement calculator, client updates.
- Immigration: multilingual intake, USCIS packet checklist, document collection, status reminders.
- Family Law: financial affidavit checklist, discovery tracker, court deadlines, client communication.
- Estate Planning: questionnaire to draft package, asset inventory, signing workflow, annual review reminders.
- Criminal Defense: intake, deadlines, discovery review, plea/offers tracker, hearing prep.
- Small Business/Contracts: contract review, clause library, entity docs, reminders, client portal.

Each bundle should ship with matter schema, workflow automations, document templates, agent prompts, intake forms, and dashboard widgets.

## One-click migration architecture

### Canonical NemoC data model

Create a migration schema that is provider-neutral:

- `firms`
- `users`
- `employees`
- `agents`
- `clients`
- `contacts`
- `companies`
- `matters`
- `matterParticipants`
- `tasks`
- `calendarEvents`
- `notes`
- `communications`
- `documents`
- `folders`
- `timeEntries`
- `expenses`
- `invoices`
- `payments`
- `trustBalances`
- `trustLedgerEntries`
- `leads`
- `intakeForms`
- `customFields`
- `tags`
- `auditLog`
- `legacySourceMap`

Every migrated record should keep:

- `legacyProvider`
- `legacyId`
- `legacyUrl`
- `legacyRawHash`
- `migrationBatchId`
- `confidence`
- `mappingWarnings`
- `createdByMigration`

### Adapter strategy

Build every adapter behind the same interface:

```js
export class MigrationAdapter {
  providerId = 'clio';
  async authenticate(input) {}
  async discover(input) {}
  async extract(scope) {}
  async normalize(rawRecord) {}
  async validate(normalizedRecord) {}
}
```

Provider routes:

- Clio: OAuth/API first; CSV/export fallback.
- MyCase: Advanced Open API when available; export/import templates fallback.
- PracticePanther: API/Zapier/API partnership plus export fallback.
- Smokeball: export ZIP/CSV/docs fallback first; API/partner path only if available.
- CosmoLex: export and accounting migration workbook support first.
- Rocket Matter: export/API/Zapier fallback.
- Lawcus: API key and Zapier-compatible exports.
- CARET: export package and SOW-compatible fields.
- Actionstep: API where approved; implementation export fallback.
- Filevine: DataBridge/API/export package where available.

### Migration pipeline

1. `Source Detect`: identify provider from uploaded files, headers, folder names, and sample records.
2. `Extract`: pull API pages or parse uploads.
3. `Normalize`: convert into NemoC canonical schema.
4. `Entity Resolve`: de-duplicate contacts, companies, related parties, and matters.
5. `Conflict and Ethics Preflight`: run conflict checks against contacts, related parties, adverse parties, aliases, and companies.
6. `Financial Preflight`: separate historical invoices/payments/trust from active balances; never fake trust ledgers.
7. `Document Ingest`: preserve original folder paths, OCR/index PDFs/DOCX, attach to matters, store hashes.
8. `Preview`: show counts, samples, warnings, confidence, and "will not import" items.
9. `Import`: batch write to Firestore/Storage with resumable checkpoints.
10. `Verify`: record counts, random record samples, balance checks, and document hash checks.
11. `Cutover`: freeze old system, run delta import, send launch checklist.
12. `Rollback`: delete a migration batch safely by `migrationBatchId`.

### User-facing migration UX

Add `/dashboard/migration` and an onboarding step:

- Provider picker with logos.
- Connect/upload panel.
- Real-time migration console.
- Counts by entity type.
- Confidence score.
- Exceptions inbox: "12 contacts need type confirmation", "4 matters missing responsible attorney".
- Launch button.
- Downloadable migration audit certificate.

The UX promise:

> You do not map columns. ATLAS maps them, explains uncertain rows, and asks only for attorney decisions.

### Backend work required

Recommended new files/modules:

- `src/pages/MigrationCenter.jsx`
- `src/lib/migration/providers.js`
- `src/lib/migration/schema.js`
- `src/lib/migration/client.js`
- `functions/migration/index.js`
- `functions/migration/adapters/clio.js`
- `functions/migration/adapters/mycase.js`
- `functions/migration/adapters/practicePanther.js`
- `functions/migration/adapters/smokeball.js`
- `functions/migration/adapters/cosmolex.js`
- `functions/migration/adapters/rocketMatter.js`
- `functions/migration/adapters/lawcus.js`
- `functions/migration/adapters/caret.js`
- `functions/migration/adapters/actionstep.js`
- `functions/migration/adapters/filevine.js`
- `scripts/migration_fixture_builder.mjs`

Do not run provider credentials through the browser. Use Firebase callable/HTTP functions, encrypted secrets, short-lived OAuth tokens, and storage signed uploads.

## Provider-specific migration notes

### Clio

- API: Clio Manage API v4 supports objects like activities, contacts, documents, and matters.
- Migration opportunity: Clio itself notes historical accounting/financial history and some document migrations have limitations or extra scoping.
- NemoC plan: API pull for contacts/matters/tasks/activities/documents; CSV fallback; preserve Clio IDs; import historical accounting as read-only records plus active balance checkpoints.

### MyCase

- API: Open API is available on Advanced plan; lower tiers likely need CSV/template exports.
- Import scope signal: MyCase migration docs mention cases, contacts, companies, unbilled time/expenses, notes, leads, tasks, calendar events, balances, and trust balances.
- NemoC plan: Support API where available; otherwise guide user through export bundle upload and parse MyCase templates.

### PracticePanther

- API/Zapier available; strong export/import ecosystem.
- Migration docs list exports from many prior systems, which suggests users are familiar with CSV transitions.
- NemoC plan: Build parser for contacts, matters, tasks, time entries, expenses, invoices, trust accounting, and docs; use API when enabled.

### Smokeball

- Migration is a supported service but can take weeks and requires manual cleanup.
- AI exists as embedded features: Archie.ai, AutoTime.ai, Intake.ai.
- NemoC plan: Win on speed. Accept Smokeball exports, matter folders, document automation templates where available, and manual field review after automatic mapping.

### CosmoLex

- Strength: legal accounting and trust/business accounting.
- Migration docs cover both DIY and turn-key, with broad source-system experience.
- NemoC plan: Treat financials carefully. Import historical data as read-only ledgers and active balances separately until NemoC accounting is production-grade.

### Rocket Matter

- Strength: simple pricing, support, free migration claim, billing/workflows.
- NemoC plan: API/export support for contacts, matters, activities, billing, notes, and docs. Compete by eliminating add-on stacking and making AI included.

### Lawcus

- Strength: visual pipeline, automation, API access, Nova AI, fair small-firm pricing.
- NemoC plan: Lawcus is closest to "workflow-friendly." Beat it with legal-role agents, stronger audit/security defaults, and a migration that preserves pipelines as NemoC matter stages.

### CARET Legal

- Strength: accounting, document management, analytics, support, migration services.
- Weakness: implementation fees and enterprise posture for a small firm.
- NemoC plan: Import contacts/matters/docs/billing/accounts as a simpler, faster launch. Preserve CARET custom permissions where mappable to NemoC roles.

### Actionstep

- Strength: deep configurable workflows and API.
- Weakness: implementation complexity and partner dependence.
- NemoC plan: Convert Actionstep workflows into recommended NemoC templates rather than reproducing every custom workflow on day one.

### Filevine

- Strength: LOIS/AI, PI/immigration/deposition specialization, DataBridge, powerful customization.
- Weakness: custom pricing and implementation weight.
- NemoC plan: For 1-10 attorney PI/immigration boutiques, offer transparent pricing, Demands/Immigration-lite bundles, and a safer migration preview.

## Product roadmap to outcompete

### Phase 1: Migration moat, 30 days

- Add Migration Center UI.
- Add canonical migration schema.
- Add upload-based parser for CSV/XLSX/ZIP/PDF/DOCX.
- Add Clio, MyCase, PracticePanther, Lawcus CSV/template adapters.
- Add `migrationBatchId`, rollback, and audit certificate.
- Add sample fixture tests for each adapter.

Success metric: user can upload a Clio/MyCase/PracticePanther/Lawcus export and get a usable NemoC workspace with clients, matters, contacts, notes, tasks, and documents.

### Phase 2: API connectors, 60 days

- OAuth/API connectors for Clio and Actionstep.
- API-key connector for Lawcus.
- MyCase Advanced Open API connector.
- Filevine DataBridge/export path.
- Background queue with progress checkpoints.
- Document OCR/indexing and matter attachment.

Success metric: under-60-minute migration for 80% of firms under 10 attorneys.

### Phase 3: Practice-area no-brainer bundles, 90 days

- PI, immigration, family, estate planning, criminal defense, and business/contracts bundles.
- Intake forms, matter templates, agent prompts, dashboards, client update templates, and document checklists.
- "First 10 matters reviewed by AI" migration bonus.

Success metric: migrated firms see value on day one, not after configuration.

### Phase 4: Trust/accounting and billing depth, 120 days

- Trust balance import and reconciliation checklist.
- Billing narrative generation.
- Invoice draft pipeline.
- Read-only historical accounting archive.
- QuickBooks/Xero sync or native ledger design.

Success metric: solos can trust NemoC as the operational source of truth without accounting anxiety.

## Positioning copy

Homepage hero:

> The AI law firm OS that migrates from Clio, MyCase, PracticePanther, Smokeball, and more in one click.

Subhead:

> NemoC does not just store contacts and matters. It provisions your AI staff, rebuilds your workflows, indexes your documents, protects privileged data, and gets your firm working the same day.

Migration CTA:

> Bring your firm with you. No consultants. No spreadsheet mapping. No lost weekends.

Sales proof points:

- "Migration included."
- "AI included."
- "Client portal included."
- "Website builder included."
- "Audit trail included."
- "Attorney approval required."
- "Your old system stays as read-only backup until you are confident."

## Source links

- Clio pricing and Manage AI: https://www.clio.com/pricing/
- Clio migration process: https://help.clio.com/hc/en-us/articles/9813884849947-Understand-Data-Migration-Processes-in-Clio-Manage
- Clio API documentation: https://docs.developers.clio.com/clio-manage/api-reference/
- MyCase pricing and 8am IQ: https://www.mycase.com/pricing/
- MyCase migration docs: https://supportcenter.mycase.com/en/articles/9370355-migrating-data-from-a-previous-system-into-mycase
- MyCase contact import docs: https://supportcenter.mycase.com/en/articles/9370354-importing-contacts-companies
- PracticePanther pricing: https://www.practicepanther.com/pricing/
- PracticePanther imports: https://support.practicepanther.com/import
- Smokeball AI: https://www.smokeball.com/smokeball-ai
- Smokeball migration overview: https://support.smokeball.com/hc/en-us/articles/9232906903447-Migrations-How-does-data-migration-service-work-at-Smokeball
- Smokeball migration FAQ: https://support.smokeball.com/hc/en-us/articles/9234746122775-Frequently-asked-questions-about-Smokeball-s-data-migration-services
- CosmoLex pricing: https://www.cosmolex.com/pricing/
- CosmoLex migration process: https://support.cosmolex.com/knowledge-base/how-data-migration-process-works/
- Rocket Matter pricing: https://www.rocketmatter.com/pricing/
- Lawcus product and migration signal: https://lawcus.com/
- Lawcus pricing: https://lawcus.com/pricing/
- Lawcus Zapier/API setup: https://support.lawcus.com/en/articles/5010110-how-to-set-up-zapier-with-lawcus
- CARET Legal pricing: https://caretlegal.com/pricing/
- CARET migration SOW: https://caretlegal.com/lite-migration-sow/
- Actionstep pricing: https://www.actionstep.com/pricing/
- Actionstep AI: https://www.actionstep.com/artificial-intelligence/
- Actionstep implementation: https://www.actionstep.com/case-management/implementation/
- Actionstep API: https://docs.actionstep.com/
- Filevine pricing/LOIS: https://www.filevine.com/pricing/
- Filevine AI: https://www.filevine.com/platform/ai-features-and-solutions/
- Filevine product specifications: https://www.filevine.com/legal/product-specifications/
