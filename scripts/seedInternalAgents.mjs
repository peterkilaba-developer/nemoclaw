import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, addDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';

// Read .env file manually (no Vite import.meta.env in Node)
const envContent = readFileSync(new URL('../.env', import.meta.url), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && key.trim() && !key.startsWith('#')) {
    env[key.trim()] = val.join('=').trim();
  }
});

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'nemoc-law-ai.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'nemoc-law-ai',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'nemoc-law-ai.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seed() {
  console.log('🌱 Seeding _internal/ Firestore namespace...\n');

  // ═══ 1. Agent States ═══
  console.log('📊 Writing agent states...');
  const agentStates = {
    'revenue': {
      status: 'active', health: 96, tasks24h: 47, resolved: 45,
      metrics: { primary: '$4,200', label: 'MRR', secondary: '$50.4K ARR' },
      lastAction: 'Processed 3 new subscriptions', lastActionTime: '2m ago',
    },
    'customer-success': {
      status: 'active', health: 94, tasks24h: 31, resolved: 29,
      metrics: { primary: '94%', label: 'Health Score', secondary: '2.1% churn' },
      lastAction: 'Flagged 2 at-risk accounts for outreach', lastActionTime: '8m ago',
    },
    'security': {
      status: 'active', health: 100, tasks24h: 847, resolved: 847,
      metrics: { primary: '0', label: 'Active Threats', secondary: '847 blocked today' },
      lastAction: 'Blocked brute-force attempt from 203.x.x.x', lastActionTime: '23m ago',
    },
    'devops': {
      status: 'active', health: 99, tasks24h: 14, resolved: 14,
      metrics: { primary: '99.97%', label: 'Uptime', secondary: '14 deploys today' },
      lastAction: 'Deployed v2.4.1 to production', lastActionTime: '18m ago',
    },
    'marketing': {
      status: 'active', health: 89, tasks24h: 19, resolved: 17,
      metrics: { primary: '$42', label: 'CAC', secondary: '3.2% conversion' },
      lastAction: 'Launched retargeting campaign for trial users', lastActionTime: '35m ago',
    },
    'sales': {
      status: 'active', health: 85, tasks24h: 12, resolved: 10,
      metrics: { primary: '$127K', label: 'Pipeline Value', secondary: '34% win rate' },
      lastAction: 'Qualified 5 new enterprise leads', lastActionTime: '45m ago',
    },
    'support': {
      status: 'active', health: 91, tasks24h: 23, resolved: 21,
      metrics: { primary: '< 4min', label: 'Avg Response', secondary: '3 open tickets' },
      lastAction: 'Auto-resolved billing inquiry #1247', lastActionTime: '12m ago',
    },
    'compliance': {
      status: 'active', health: 98, tasks24h: 8, resolved: 8,
      metrics: { primary: '98%', label: 'Compliance Score', secondary: '0 violations' },
      lastAction: 'Completed weekly GDPR audit scan', lastActionTime: '1h ago',
    },
    'analytics': {
      status: 'active', health: 100, tasks24h: 24, resolved: 24,
      metrics: { primary: '24', label: 'Reports Today', secondary: '100% on time' },
      lastAction: 'Generated weekly MRR cohort analysis', lastActionTime: '1h ago',
    },
    'chief-of-staff': {
      status: 'active', health: 100, tasks24h: 18, resolved: 18,
      metrics: { primary: '14', label: 'Briefings Today', secondary: '100% on time' },
      lastAction: 'Synthesized weekly C-Suite executive summary', lastActionTime: '30m ago',
    },
  };

  for (const [agentId, state] of Object.entries(agentStates)) {
    await setDoc(doc(db, '_internalAgents', agentId), {
      ...state,
      lastUpdated: new Date(),
    });
    console.log(`  ✅ ${agentId}`);
  }

  // ═══ 2. Audit Log Entries ═══
  console.log('\n📋 Writing audit log entries...');
  const auditEntries = [
    {
      agentId: 'cea',
      department: 'executive',
      userMessage: 'Scheduled hourly orchestration run',
      agentResponse: 'C.E.A. departmental sync complete. All 3 departments healthy. 0 escalations.',
    },
    {
      agentId: 'sdr',
      department: 'gtm',
      userMessage: 'Pipeline scan for new leads',
      agentResponse: 'Qualified 5 new enterprise leads. Top: Davis & Partners LLP (est. deal: $24K/yr). Sending personalized outreach.',
    },
    {
      agentId: 'security-audit',
      department: 'engineering',
      userMessage: 'Hourly security sweep',
      agentResponse: 'Blocked 23 suspicious login attempts from IP range 203.0.113.x. PII redaction: 4 events handled. 0 active threats.',
    },
    {
      agentId: 'onboarding-monitor',
      department: 'customer-success',
      userMessage: 'Onboarding stall check',
      agentResponse: 'Detected 2 firms stalled at Team Roster step (>48h). Sent automated assistance emails. 1 firm resumed within 2h.',
    },
    {
      agentId: 'billing-ops',
      department: 'customer-success',
      userMessage: 'Monthly invoice batch',
      agentResponse: 'Generated and sent 47 invoices totaling $8,341. 3 accounts have expired cards — auto-retry scheduled, dunning emails queued.',
    },
    {
      agentId: 'marketing',
      department: 'gtm',
      userMessage: 'Content generation cycle',
      agentResponse: 'Published blog post: "5 Ways AI Agents Are Replacing Paralegals in 2026" (1,400 words, SEO score: 87/100). Scheduled LinkedIn post for Wednesday.',
    },
  ];

  for (const entry of auditEntries) {
    await addDoc(collection(db, '_internalAuditLog'), {
      ...entry,
      type: 'internal_agent_action',
      contextProvided: true,
      timestamp: new Date(),
      immutable: true,
    });
    console.log(`  ✅ ${entry.agentId}: ${entry.userMessage}`);
  }

  // ═══ 3. Escalations ═══
  console.log('\n⚠️ Writing escalation entries...');
  const escalations = [
    {
      agentId: 'sales',
      agentName: 'Sales Pipeline',
      department: 'gtm',
      severity: 'high',
      title: 'Enterprise client requesting custom SLA terms',
      description: 'Davis & Partners LLP requires 99.99% uptime guarantee and dedicated support channel.',
    },
    {
      agentId: 'billing-ops',
      agentName: 'Billing Agent',
      department: 'customer-success',
      severity: 'medium',
      title: 'Spike in failed payment retries',
      description: '3 accounts with expired cards. Auto-retry scheduled for 48h, dunning emails queued if unresolved.',
    },
    {
      agentId: 'customer-success',
      agentName: 'Customer Success',
      department: 'customer-success',
      severity: 'low',
      title: 'Feature request: Multi-language support',
      description: '4 firms independently requested Spanish language support for client-facing websites.',
    },
  ];

  for (const esc of escalations) {
    await addDoc(collection(db, '_internalEscalations'), {
      ...esc,
      status: 'pending',
      createdAt: new Date(),
    });
    console.log(`  ✅ [${esc.severity.toUpperCase()}] ${esc.title}`);
  }

  // ═══ 4. Marketing Drafts ═══
  console.log('\n✍️ Writing marketing drafts...');
  const marketingDrafts = [
    {
      title: '5 Ways AI Agents Are Replacing Paralegals in 2026',
      type: 'blog',
      status: 'draft',
      content: 'The legal industry is at a crossroads. While some firms are still struggling with basic automation, "Born Agentic" firms are deploying entire workforces of AI agents...',
      keywords: ['law firm automation', 'AI agents', 'legal tech'],
      targetAudience: 'Law Firm Partners',
      seoScore: 87,
    },
    {
      title: 'Why your law firm needs a "Personal Agent" for every employee',
      type: 'linkedin',
      status: 'pending_approval',
      content: 'Scaling a law firm used to mean hiring more humans. In 2026, it means provisioning more agents. Every attorney at NemoC Law AI clients now has a dedicated AI direct report...',
      keywords: ['AI scaling', 'legal workforce'],
      targetAudience: 'Legal Ops',
      seoScore: 92,
    },
    {
      title: 'March 2026 Product Update: Multi-Agent Conflict Detection',
      type: 'changelog',
      status: 'approved',
      content: 'We just shipped a major update to the Super Agent hierarchy. Agents can now cross-reference matter data in real-time to detect conflicts of interest before they happen...',
      keywords: ['product update', 'conflict detection'],
      targetAudience: 'All Users',
      seoScore: 78,
    }
  ];

  for (const draft of marketingDrafts) {
    await addDoc(collection(db, '_internalMarketingDrafts'), {
      ...draft,
      createdAt: new Date(),
      createdBy: 'marketing-agent',
    });
    console.log(`  ✅ [${draft.type.toUpperCase()}] ${draft.title}`);
  }

  console.log('\n🎉 Seed complete! The AdminDashboard will now show live Firestore data.');
  console.log('   Navigate to /admin to verify.\n');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
