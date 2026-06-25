import {
  collection, addDoc, getDocs, query, orderBy,
  serverTimestamp, doc, updateDoc
} from 'firebase/firestore';
import { db } from './firebase';

const MAIL_COL = 'mail';
const SITE_URL = 'https://nemoc-law.ai';

// Pricing tiers — must match Pricing.jsx exactly
// Founder pricing = first 100 firms; future = standard pricing after
const PRICING = {
  'base': { current: 297, future: 997, label: 'Agentic HITL OS' }
};

function getPricing(_firmSize) {
  return PRICING['base'];
}

/* ═══════════════════════════════════════════════
   SHARED EMAIL STYLES
   ═══════════════════════════════════════════════ */

const EMAIL_STYLES = `
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: #f9fafb; margin: 0; padding: 0; color: #111827; }
  .container { max-width: 600px; margin: 0 auto; padding: 24px 8px; }
  .card { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px 20px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); }
  .logo { display: block; max-width: 160px; height: auto; margin-bottom: 24px; }
  .tagline { color: #6b7280; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 32px; border-bottom: 1px solid #f3f4f6; padding-bottom: 16px; }
  h1 { color: #111827; font-size: 26px; font-weight: 800; margin: 0 0 24px; line-height: 1.4; letter-spacing: -0.02em; }
  h1 span { color: #166534; }
  p { color: #4b5563; font-size: 15px; line-height: 1.7; margin: 0 0 20px; }
  
  .text-strong { color: #111827; font-weight: 700; }
  .text-muted-sm { font-size: 13px; color: #6b7280; font-weight: 500; }
  .text-muted-md { font-size: 14px; color: #4b5563; }
  .text-warning { font-size: 13px; color: #b45309; font-weight: 600; margin: 0; }
  .text-center { text-align: center; }

  .highlight { background: rgba(0,0,0,0.02); border: 1px solid rgba(0,0,0,0.06); border-radius: 8px; padding: 24px; margin: 32px 0; border-left: 4px solid #76b900; }
  .highlight-title { color: #76b900; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px; }
  .price-row { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
  .price-future { color: #9ca3af; text-decoration: line-through; font-size: 16px; }
  .price-highlight { color: #16a34a; font-size: 24px; font-weight: 800; }
  .price-label { color: #6b7280; font-size: 12px; }
  
  .tasks { margin: 16px 0; }
  .task-tag { display: inline-block; background: #f3f4f6; border: 1px solid #e5e7eb; color: #4b5563; font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 6px; margin: 4px 6px 4px 0; }
  .agents-grid { margin: 24px 0 32px; display: block; text-align: left; }
  .agent-tag { display: inline-block; background: #eff6ff; border: 1px solid #bfdbfe; color: #1e3a8a; font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 6px; margin: 0 8px 10px 0; }
  .benefit-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; color: #4b5563; font-size: 14px; }
  
  .cta { display: inline-block; background: #76b900; color: #111; font-size: 15px; font-weight: 700; padding: 16px 36px; border-radius: 6px; text-decoration: none; margin: 32px 0 16px; text-align: center; }
  .cta:hover { background: #65a300; }
  .footer { text-align: center; padding: 32px 0 16px; color: #9ca3af; font-size: 12px; line-height: 1.6; }
  .footer a { color: #6b7280; text-decoration: underline; }
  .divider { height: 1px; background: #e5e7eb; margin: 32px 0; }
  
  .video-block { margin: 32px 0; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; background: #000; }
  .video-footer { background: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb; }
  .video-footer-link { color: #166534; font-size: 14px; font-weight: 700; text-decoration: none; display: inline-block; }
  
  @media (prefers-color-scheme: dark) {
    body { background: #0a0e17; color: #f3f4f6; }
    .card { background: #111827; border-color: #1f2937; box-shadow: none; }
    h1 { color: #ffffff; }
    h1 span { color: #76b900; }
    p { color: #9ca3af; }
    .tagline { color: #6b7280; border-bottom-color: #1f2937; }
    .highlight { background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.08); border-left-color: #76b900; }
    .highlight-title { color: #76b900; }
    .price-future { color: #4b5563; }
    .price-highlight { color: #76b900; }
    .price-label { color: #6b7280; }
    .task-tag { background: #1f2937; border-color: #374151; color: #d1d5db; }
    .agent-tag { background: rgba(37,99,235,0.1); border-color: rgba(37,99,235,0.2); color: #60a5fa; }
    .benefit-row { color: #9ca3af; }
    
    .text-strong { color: #ffffff !important; }
    .text-muted-sm { color: rgba(255,255,255,0.5) !important; }
    .text-muted-md { color: rgba(255,255,255,0.7) !important; }
    .text-warning { color: #f59e0b !important; }
    
    .cta { background: #76b900; color: #111; font-weight: 700; }
    .cta:hover { background: #65a300; }
    .footer { color: #6b7280; }
    .footer a { color: #9ca3af; }
    .divider { background: #1f2937; }
    
    .video-block { border-color: #374151; }
    .video-footer { background: #1f2937 !important; border-top-color: #374151 !important; }
    .video-footer-link { color: #76b900 !important; }
  }
`;

const VIDEO_PLAYER_BLOCK = `
  <!-- Video Player Block -->
  <div class="video-block">
    <!-- Inline video for supported clients (Apple Mail) -->
    <video width="100%" controls poster="${SITE_URL}/video-poster.jpg" style="width: 100%; max-width: 100%; display: block; background: #000;">
      <source src="${SITE_URL}/NemoClaw_Agentic_OS.mp4" type="video/mp4">
      
      <!-- Fallback image + link for unsupported clients (Gmail, Outlook) -->
      <a href="${SITE_URL}/?play_demo=true" target="_blank" style="display:block;">
        <img border="0" src="${SITE_URL}/video-poster.jpg" alt="Play NemoC LAW AI Agentic OS Demo" width="100%" style="width: 100%; max-width: 100%; display: block;" />
      </a>
    </video>
    
    <!-- Universal footer link -->
    <div class="video-footer">
      <a href="${SITE_URL}/?play_demo=true" target="_blank" class="video-footer-link">
        ▶ Watch the 7-Minute Agentic OS Demo
      </a>
    </div>
  </div>
`;

const EMAIL_FOOTER = `
  <div class="footer">
    <p>NemoC LAW AI · Agentic HITL OS for Law Firms</p>
    <p>Powered by <span style="color:#76b900; font-weight:700;">NVIDIA NemoClaw</span> & OpenShell Enterprise Technology</p>
    <p><a href="${SITE_URL}">nemoc-law.ai</a></p>
  </div>
`;

const EMAIL_FOOTER_OUTREACH = (firmName) => `
  <div class="footer">
    <p>NemoC LAW AI · Agentic HITL OS for Law Firms</p>
    <p>Powered by <span style="color:#76b900; font-weight:700;">NVIDIA NemoClaw</span> & OpenShell Enterprise Technology</p>
    <p>You're receiving this because ${firmName} is in our target market of innovative law firms.</p>
    <p><a href="${SITE_URL}">nemoc-law.ai</a> · <a href="mailto:unsubscribe@nemoc-law.ai">Unsubscribe</a></p>
  </div>
`;

/* ═══════════════════════════════════════════════
   SIGNUP LINK GENERATOR
   ═══════════════════════════════════════════════ */

export function generateSignupLink(email) {
  return `${SITE_URL}/login?email=${encodeURIComponent(email)}`;
}

/* ═══════════════════════════════════════════════
   TEMPLATE 1: WELCOME / ACCOUNT ACTIVATION EMAIL
   Sent to leads.
   ═══════════════════════════════════════════════ */

export function getLaunchEmailTemplate(lead) {
  const signupLink = generateSignupLink(lead.email);
  const pricing = getPricing(lead.firmSize);

  const taskList = (lead.selectedTasks || [])
    .map(t => {
      const labels = {
        'legal-research': 'Legal Research & Case Law Analysis',
        'contract-review': 'Contract Review & Redlining',
        'client-intake': 'Client Intake & Lead Scoring',
        'document-drafting': 'Document & Pleading Drafting',
        'ediscovery': 'eDiscovery & Document Processing',
        'compliance': 'Regulatory Compliance Monitoring',
        'deposition-prep': 'Deposition Preparation',
        'billing': 'Time Tracking & Billing Automation',
        'due-diligence': 'Due Diligence (M&A)',
        'deadline-tracker': 'Court Deadline Tracking',
        'website-builder': 'Website Design & Deployment',
        'client-comms': 'Client Communication (AI Chat)',
        'case-strategy': 'Case Strategy & Analysis',
        'ip-patent': 'IP & Patent Search',
        'conflict-check': 'Conflict of Interest Checking',
        'court-filing': 'Court Filing Automation',
        'brief-writing': 'Brief & Memo Writing',
        'crm': 'Client Relationship Management',
      };
      return labels[t] || t;
    });

  const subject = `NemoC LAW AI is Live — Your Founder Access is Ready`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${EMAIL_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="card">
      <img class="logo" src="${SITE_URL}/logos/wordmark-full-transparent.png" alt="NemoC LAW AI" />
      <div class="tagline">Agentic HITL OS for Law Firms</div>

      <h1>Your Founder Access is <span>Ready</span></h1>

      <p>
        Thank you for signing up for NemoC LAW AI. We're thrilled to announce that
        Agentic OS is now <strong class="text-strong">live</strong> — and as one of our
        founding members, your price is locked for life.
      </p>

      <div class="highlight">
        <div class="highlight-title">Your Founder Price — Locked Forever</div>
        <div class="price-row">
          <span class="price-future">$${pricing.future}/mo</span>
          <span class="price-highlight">$${pricing.current}/mo</span>
          <span class="price-label">for life</span>
        </div>
        <p class="text-muted-sm" style="margin-top:8px;">
          ${pricing.label} plan. This price is locked as long as you maintain your subscription.
          First 100 firms per state get this rate — then standard pricing applies.
        </p>
      </div>

      <p>
        As a ${pricing.label}, you get <strong class="text-strong">one personal AI agent</strong>
        that orchestrates everything — legal research, contract review, client intake, drafting,
        billing, and more. Just delegate in plain English. No learning curve.
      </p>

      ${taskList.length > 0 ? `
      <p class="text-muted-sm" style="margin-bottom:8px;">
        <strong class="text-strong">Your pre-configured capabilities:</strong>
      </p>
      <div class="tasks">
        ${taskList.map(t => `<span class="task-tag">${t}</span>`).join('')}
      </div>
      ` : ''}

      <div style="text-align:center;">
        <a href="${signupLink}" class="cta">Activate My Founder Account →</a>
      </div>

      <p class="text-muted-sm text-center">
        This link is unique to your email. Your founder pricing will be
        automatically applied at checkout.
      </p>

      <div class="divider"></div>

      <p class="text-muted-sm">
        <strong class="text-strong">What's included in Founder Access:</strong><br/>
        ✓ One personal AI agent — delegates to 15+ specialized sub-agents<br/>
        ✓ Unlimited AI tokens — no per-query charges, ever<br/>
        ✓ Enterprise Zero-Trust Data Isolation — secured by <span style="color:#76b900; font-weight:700;">NVIDIA NemoClaw</span> & OpenShell<br/>
        ✓ Continuous learning — your agent adapts to your writing style<br/>
        ✓ Lifetime price lock guarantee
      </p>
    </div>

    ${EMAIL_FOOTER}
  </div>
</body>
</html>`;

  const text = `
NemoC LAW AI — Your Founder Access is Ready!

Thank you for signing up for NemoC LAW AI. Agentic OS is now LIVE.

YOUR FOUNDER PRICE: $${pricing.current}/mo for life (Standard price: $${pricing.future}/mo)
Plan: ${pricing.label}

Activate your account: ${signupLink}

This link is unique to your email. Your founder pricing will be automatically applied.

What's included:
- One personal AI agent that orchestrates 15+ specialized sub-agents
- Unlimited AI tokens — no per-query charges
- Enterprise Zero-Trust Data Isolation — secured by <span style="color:#76b900; font-weight:700;">NVIDIA NemoClaw</span> & OpenShell
- Continuous learning — your agent adapts to your writing style
- Lifetime price lock guarantee

— The NemoC LAW AI Team
`;

  return { subject, html, text, signupLink };
}

/* ═══════════════════════════════════════════════
   TEMPLATE 2: COLD OUTREACH
   For the Prospecting Engine — GTM Agent.
   Emphasizes single-agent model + all 10 roles.
   ═══════════════════════════════════════════════ */

export function getColdOutreachTemplate(prospect) {
  const firmName = prospect.firmName || 'your firm';
  const city = prospect.city || '';
  const state = prospect.state || '';
  const locationStr = [city, state].filter(Boolean).join(', ');
  const signupLink = `${SITE_URL}/login`;
  const pricing = getPricing(prospect.firmSize);

  const subject = `${firmName} — Your Secured Agentic HITL OS is Ready`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${EMAIL_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="card">
      <img class="logo" src="${SITE_URL}/logos/wordmark-full-transparent.png" alt="NemoC LAW AI" />
      <div class="tagline">Agentic HITL OS for Law Firms</div>

      <h1>We've provisioned your Secured Agentic HITL OS for <span>${firmName}</span>.</h1>

      ${VIDEO_PLAYER_BLOCK}

      <p>
        Hi — I'm reaching out because we are dynamically prospecting fast-growing law firms in ${locationStr ? locationStr : 'your area'}, and we identified ${firmName} as a strong candidate. We have already pre-provisioned a secure <span style="color:#76b900; font-weight:700;">NVIDIA NemoClaw</span> enterprise sandbox specifically for your firm.
      </p>

      <p>
        We've built the first <strong class="text-strong">Agentic HITL OS</strong> strictly for law firms.
        Your team remains in complete control while agents natively accelerate their most tedious workflows—legal research, contract review, client intake, document drafting, and billing. 
        Not a chatbot. Not a search tool. <strong class="text-strong">An enterprise-grade orchestration layer powered by <span style="color:#76b900; font-weight:700;">NVIDIA NemoClaw</span> & OpenShell Architecture.</strong>
      </p>

      <p style="font-size:12px; color:rgba(255,255,255,0.5); margin-bottom:8px;">
        <strong>Roles accelerated by your Agentic OS:</strong>
      </p>
      <div class="agents-grid">
        <span class="agent-tag">Partner / Managing Partner</span>
        <span class="agent-tag">Associate Attorney</span>
        <span class="agent-tag">Of Counsel / Contractor</span>
        <span class="agent-tag">Paralegal</span>
        <span class="agent-tag">Receptionist</span>
        <span class="agent-tag">Legal Secretary</span>
        <span class="agent-tag">Billing Clerk</span>
        <span class="agent-tag">Office Manager</span>
        <span class="agent-tag">Solo Hybrid Agent</span>
      </div>

      <div class="highlight">
        <div class="highlight-title">Why Fast-Growing Firms Are Switching</div>
        <div class="benefit-row">✓ Agency without replacement — strict HITL control</div>
        <div class="benefit-row">✓ Unlimited AI tokens — no per-query billing</div>
        <div class="benefit-row">✓ Enterprise Zero-Trust Isolation — secured by <span style="color:#76b900; font-weight:700;">NVIDIA NemoClaw</span></div>
        <div class="benefit-row">✓ The system reliably learns your writing style over time</div>
        <div class="benefit-row">✓ 10x your team scale dynamically</div>
        <div class="benefit-row">✓ Founder pricing: <strong style="color:#76b900">from $${pricing.current}/mo — locked for life</strong></div>
      </div>

      <p>
        To force scarcity and ensure maximum local impact, we strictly cap enrollment at the first 100 founding firms in ${state || 'your state'}. Those who claim their sandbox now lock in the founder price <strong class="text-strong">permanently</strong>. After 100 firms, standard pricing applies.
      </p>

      <div style="text-align:center;">
        <a href="${signupLink}" class="cta">Claim Sandbox & Lock Pricing →</a>
      </div>

      <p style="text-align:center; font-size:12px; color:rgba(255,255,255,0.3);">
        No credit card required. Reserve your founding spot in 2 minutes.
      </p>

    </div>

    ${EMAIL_FOOTER_OUTREACH(firmName)}
  </div>
</body>
</html>`;

  const text = `
${firmName} — Your Secured Agentic HITL OS is Ready

Hi — I'm reaching out because ${locationStr ? `law firms in ${locationStr}` : 'firms like yours'} are exactly who we built NemoC LAW AI for.

Your team remains in complete control while agents natively accelerate their most tedious workflows—legal research, contracts, intake, drafting, billing. An enterprise-grade orchestration layer powered by NVIDIA NemoClaw.

Roles covered:
• Partner / Managing Partner
• Associate Attorney
• Of Counsel / Contractor
• Paralegal
• Receptionist
• Legal Secretary
• Billing Clerk
• Office Manager
• Solo Hybrid Agent

WHY FAST-GROWING FIRMS ARE SWITCHING:
- One personal agent per employee — zero learning curve
- Unlimited AI tokens — no per-query billing
- Enterprise Zero-Trust Isolation — secured by <span style="color:#76b900; font-weight:700;">NVIDIA NemoClaw</span> & OpenShell
- Your agent learns YOUR writing style over time
- Founder pricing: from $${pricing.current}/mo — locked for life

First 100 firms per state lock in the founder price permanently.

Sign up loop: ${signupLink}

— The NemoC LAW AI Team
Powered by <span style="color:#76b900; font-weight:700;">NVIDIA NemoClaw</span> · OpenShell Architecture · ABA Ethics Compliant
`;

  return { subject, html, text, type: 'cold_outreach' };
}

/* ═══════════════════════════════════════════════
   TEMPLATE 3: FOLLOW-UP EMAIL
   Sent after initial cold outreach if no response.
   ═══════════════════════════════════════════════ */

export function getFollowUpTemplate(prospect) {
  const firmName = prospect.firmName || 'your firm';
  const signupLink = `${SITE_URL}/login`;
  const pricing = getPricing(prospect.firmSize);

  const subject = `Quick follow-up: ${firmName} + NemoC LAW AI`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${EMAIL_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="card">
      <img class="logo" src="${SITE_URL}/logos/wordmark-full-transparent.png" alt="NemoC LAW AI" style="margin-bottom: 24px;" />

      <p>Hi — quick follow-up on my earlier note about NemoC LAW AI.</p>

      <p>
        I wanted to share one specific example: a partner told their agent
        <strong style="color:#fff">"Prepare for the Henderson deposition next Thursday."</strong>
        The agent autonomously pulled the case files, identified key exhibits, drafted a deposition outline,
        and compiled a preparation binder — in under 4 minutes. That's 3+ hours of associate time, handled instantly.
      </p>

      <p>
        That's the difference between a chatbot and an <strong style="color:#76b900">enterprise-grade agentic AI</strong>.
        Powered by <span style="color:#76b900; font-weight:700;">NVIDIA NemoClaw</span> technology, your agent doesn't just answer questions — it autonomously plans, safely executes, and securely delivers finished work product.
      </p>

      <p>
        We're offering <strong style="color:#76b900">founding firms like ${firmName}</strong> permanent
        access starting at <strong style="color:#76b900">$${pricing.current}/mo</strong> — a price that never increases
        as long as you maintain your subscription. The founding window is filling up.
      </p>

      ${VIDEO_PLAYER_BLOCK}

      <div style="text-align:center;">
        <a href="${signupLink}" class="cta">Sign Up Now →</a>
      </div>

      <p style="font-size:12px; color:rgba(255,255,255,0.3); text-align:center;">
        No commitment. 2-minute form to lock in your founding price.
      </p>
    </div>

    ${EMAIL_FOOTER_OUTREACH(firmName)}
  </div>
</body>
</html>`;

  const text = `
Hi — quick follow-up on my earlier note about NemoC LAW AI.

A partner told their agent "Prepare for the Henderson deposition next Thursday." The agent autonomously pulled case files, identified exhibits, drafted a deposition outline, and compiled a prep binder — in under 4 minutes. That's 3+ hours of associate time.

That's the difference between a chatbot and an agentic AI. Your agent plans, executes, and delivers.

Founding firms like ${firmName} get permanent access starting at $${pricing.current}/mo — a price that never increases.

Sign up here: ${signupLink}

— The NemoC LAW AI Team
`;

  return { subject, html, text, type: 'follow_up' };
}

/* ═══════════════════════════════════════════════
   SEND EMAIL (Firestore Mail Collection)
   
   Writes to the 'mail' Firestore collection.
   The processMailQueue Cloud Function picks it up
   and sends via SendGrid.
   ═══════════════════════════════════════════════ */

export async function queueEmail(to, template) {
  const mailDoc = {
    to,
    message: {
      subject: template.subject,
      html: template.html,
      text: template.text,
    },
    signupLink: template.signupLink || null,
    status: 'queued',
    createdAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, MAIL_COL), mailDoc);
  return ref.id;
}

/**
 * Send launch email to a single lead.
 */
export async function sendLaunchEmail(lead) {
  const template = getLaunchEmailTemplate(lead);
  const mailId = await queueEmail(lead.email, template);

  if (lead.id) {
    await updateDoc(doc(db, 'waitlist', lead.id), {
      status: 'contacted',
      contactedAt: serverTimestamp(),
      lastEmailId: mailId,
      lastEmailType: 'welcome_invitation',
      signupLink: template.signupLink,
      updatedAt: serverTimestamp(),
    });
  }

  return { mailId, signupLink: template.signupLink };
}

/**
 * Send launch emails to multiple leads (bulk).
 */
export async function sendBulkLaunchEmails(leads) {
  const results = [];
  for (const lead of leads) {
    try {
      const result = await sendLaunchEmail(lead);
      results.push({ email: lead.email, success: true, ...result });
    } catch (err) {
      results.push({ email: lead.email, success: false, error: err.message });
    }
  }
  return results;
}

/**
 * Get all queued emails.
 */
export async function getQueuedEmails() {
  const q = query(collection(db, MAIL_COL), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/* ═══════════════════════════════════════════════
   SEND OUTREACH (Prospect Pipeline)
   ═══════════════════════════════════════════════ */

export async function sendColdOutreach(prospect, templateType = 'cold') {
  const template = templateType === 'follow_up'
    ? getFollowUpTemplate(prospect)
    : getColdOutreachTemplate(prospect);

  const mailId = await queueEmail(prospect.email, template);

  if (prospect.id) {
    await updateDoc(doc(db, 'prospects', prospect.id), {
      status: templateType === 'follow_up' ? 'followed_up' : 'outreach_sent',
      outreachCount: (prospect.outreachCount || 0) + 1,
      lastOutreachAt: serverTimestamp(),
      lastEmailId: mailId,
      lastEmailType: templateType,
      updatedAt: serverTimestamp(),
    });
  }

  return { mailId };
}

export async function sendBulkOutreach(prospects, templateType = 'cold') {
  const results = [];
  for (const prospect of prospects) {
    try {
      const result = await sendColdOutreach(prospect, templateType);
      results.push({ email: prospect.email, firmName: prospect.firmName, success: true, ...result });
    } catch (err) {
      results.push({ email: prospect.email, firmName: prospect.firmName, success: false, error: err.message });
    }
  }
  return results;
}

/* ═══════════════════════════════════════════════
   WELCOME SIGNUP (30-Day Free Trial)
   ═══════════════════════════════════════════════ */

export function getSignupWelcomeEmailTemplate(email, name) {
  const pricing = getPricing('solo');
  const subject = `Welcome to NemoC LAW AI — Lock in Your Founder Price`;
  
  const dashboardLink = `${SITE_URL}/dashboard`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${EMAIL_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="card">
      <img class="logo" src="${SITE_URL}/logos/wordmark-full-transparent.png" alt="NemoC LAW AI" />
      <div class="tagline">Agentic HITL OS for Law Firms</div>

      <h1>Welcome aboard, <span>${name || 'Founder'}</span></h1>

      <p>
        Your enterprise-grade <span style="color:#76b900; font-weight:700;">NVIDIA NemoClaw</span> sandbox is successfully provisioned. You now have complete access to the
        Agent Library, the Command Center, and your AI Chief of Staff — free for 30 days.
      </p>

      <div class="highlight">
        <div class="highlight-title">30-Day Free Trial — No Charge Until Day 31</div>
        <p class="text-muted-md">
          As an early adopter, you have successfully claimed a spot for our <strong class="text-strong">$${pricing.current}/mo Founder Pricing</strong> (Standard: $${pricing.future}/mo).
          Add your card now — you won't be charged for 30 days.
        </p>
        <p class="text-warning">
          Activate your payment method within 30 days to permanently lock in this lifetime rate. If not activated, your spot will be released to the waitlist.
        </p>
      </div>

      <p>
        Your Agentic HITL OS is waiting for its first delegation. Log in to your command center 
        to assign your first matter or run a conflict check.
      </p>

      <div style="text-align:center;">
        <a href="${dashboardLink}" class="cta">Go to Command Center →</a>
      </div>

      ${VIDEO_PLAYER_BLOCK}

    </div>
    <div class="footer">
      &copy; 2026 NemoC LAW AI. All rights reserved.<br>
      San Francisco, California<br>
    </div>
  </div>
</body>
</html>`;

  const text = `
Welcome aboard, ${name || 'Founder'}!

Your NemoC LAW AI sandbox is successfully provisioned. You now have complete access — free for 30 days.

*** 30-Day Free Trial — No Charge Until Day 31 ***
As an early adopter, you have successfully claimed a spot for our $${pricing.current}/mo Founder Pricing (Standard: $${pricing.future}/mo).
Add your card now and you won't be charged for 30 days. Activate within 30 days to permanently lock in this lifetime rate. If not activated, your spot will be released to the waitlist.

Log in to your command center to assign your first matter:
${dashboardLink}

— The NemoC LAW AI Team
  `;

  return { subject, html, text };
}

export async function sendWelcomeSignupEmail(email, name) {
  try {
    const template = getSignupWelcomeEmailTemplate(email, name);
    await queueEmail(email, template);
    console.log('Welcome signup email queued for:', email);
  } catch (err) {
    console.error('Failed to queue welcome signup email:', err);
  }
}
