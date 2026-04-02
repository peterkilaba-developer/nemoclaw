import {
  collection, addDoc, getDocs, query, where, orderBy,
  serverTimestamp, doc, updateDoc
} from 'firebase/firestore';
import { db } from './firebase';

const MAIL_COL = 'mail';
const SITE_URL = 'https://nemoc-law.ai';

// Pricing tiers — must match Pricing.jsx exactly
// Founder pricing = first 100 firms; future = standard pricing after
const PRICING = {
  'base': { current: 297, future: 497, label: 'Agentic OS' }
};

function getPricing(firmSize) {
  return PRICING['base'];
}

/* ═══════════════════════════════════════════════
   SHARED EMAIL STYLES
   ═══════════════════════════════════════════════ */

const EMAIL_STYLES = `
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: #0a0e17; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 0 auto; padding: 40px 24px; }
  .card { background: #111827; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 40px 32px; }
  .logo { color: #76b900; font-size: 24px; font-weight: 800; margin-bottom: 8px; letter-spacing: -0.5px; }
  .tagline { color: rgba(255,255,255,0.4); font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 32px; }
  h1 { color: #fff; font-size: 28px; font-weight: 800; margin: 0 0 16px; line-height: 1.2; }
  h1 span { color: #76b900; }
  p { color: rgba(255,255,255,0.65); font-size: 14px; line-height: 1.7; margin: 0 0 16px; }
  .highlight { background: rgba(118,185,0,0.08); border: 1px solid rgba(118,185,0,0.2); border-radius: 12px; padding: 20px; margin: 24px 0; }
  .highlight-title { color: #76b900; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; }
  .price-row { display: flex; align-items: center; gap: 12px; margin-bottom: 4px; }
  .price-future { color: rgba(255,255,255,0.3); text-decoration: line-through; font-size: 16px; }
  .price-highlight { color: #76b900; font-size: 28px; font-weight: 800; }
  .price-label { color: rgba(255,255,255,0.4); font-size: 12px; }
  .tasks { margin: 16px 0; }
  .task-tag { display: inline-block; background: rgba(118,185,0,0.1); border: 1px solid rgba(118,185,0,0.2); color: #76b900; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 6px; margin: 3px 4px 3px 0; }
  .agents-grid { display: flex; flex-wrap: wrap; gap: 8px; margin: 20px 0 24px; }
  .agent-tag { display: inline-block; background: rgba(118,185,0,0.08); border: 1px solid rgba(118,185,0,0.2); color: #76b900; font-size: 11px; font-weight: 600; padding: 5px 12px; border-radius: 6px; }
  .benefit-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; color: rgba(255,255,255,0.6); font-size: 13px; }
  .cta { display: inline-block; background: #76b900; color: #000; font-size: 16px; font-weight: 800; padding: 16px 40px; border-radius: 12px; text-decoration: none; margin: 24px 0 16px; text-align: center; }
  .cta:hover { background: #8fd400; }
  .footer { text-align: center; padding: 24px 0; color: rgba(255,255,255,0.25); font-size: 11px; }
  .footer a { color: rgba(255,255,255,0.35); text-decoration: underline; }
  .divider { height: 1px; background: rgba(255,255,255,0.06); margin: 24px 0; }
  .security-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; color: rgba(255,255,255,0.5); font-size: 11px; font-weight: 600; margin-top: 4px; }
  .audio-player-email { display: block; text-decoration: none; background: rgba(118,185,0,0.06); border: 1px solid rgba(118,185,0,0.2); border-radius: 12px; padding: 16px 20px; margin: 24px 0; }
  .audio-player-row { display: flex; align-items: center; gap: 14px; }
  .audio-play-btn { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, #76b900, #4a7a00); flex-shrink: 0; }
  .audio-play-icon { width: 0; height: 0; border-style: solid; border-width: 8px 0 8px 14px; border-color: transparent transparent transparent #000; margin-left: 2px; }
  .audio-info { flex: 1; }
  .audio-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #76b900; margin-bottom: 3px; }
  .audio-title { font-size: 14px; font-weight: 700; color: #fff; margin-bottom: 2px; }
  .audio-duration { font-size: 11px; color: rgba(255,255,255,0.35); }
  .audio-eq { display: flex; align-items: flex-end; gap: 3px; height: 20px; flex-shrink: 0; }
  .audio-eq-bar { width: 3px; border-radius: 1.5px; background: #76b900; }
`;

const AUDIO_PLAYER_BLOCK = `
  <!-- Audio Player — progressive enhancement:
       Apple Mail & Thunderbird: native <audio> controls render inline.
       Gmail, Outlook, Yahoo: <audio> is stripped, fallback link + styled card remains. -->
  <div style="background:rgba(118,185,0,0.06); border:1px solid rgba(118,185,0,0.2); border-radius:12px; padding:20px; margin:24px 0;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td style="vertical-align:middle;">
        <div style="font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#76b900; margin-bottom:6px;">🎧 Listen Now — 25 min Deep Dive</div>
        <div style="font-size:15px; font-weight:800; color:#fff; margin-bottom:3px;">AI and the Agentic Legal Revolution</div>
        <div style="font-size:11px; color:rgba(255,255,255,0.35); margin-bottom:14px;">How NemoC LAW AI is reshaping legal work with autonomous agents</div>
      </td>
    </tr></table>

    <!-- Native player for Apple Mail / Thunderbird (stripped by Gmail/Outlook) -->
    <audio controls preload="none" style="width:100%; height:40px; border-radius:8px; outline:none;" src="${SITE_URL}/nemoc-law-ai-deep-dive.mp3">
      Your email client does not support audio playback.
    </audio>

    <!-- Fallback link — always visible, works in all clients -->
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:12px;"><tr>
      <td width="44" style="vertical-align:middle;">
        <a href="${SITE_URL}/nemoc-law-ai-deep-dive.mp3" target="_blank" style="text-decoration:none;">
          <div style="display:inline-block; width:44px; height:44px; border-radius:50%; background:linear-gradient(135deg,#76b900,#4a7a00); text-align:center; line-height:44px;">
            <span style="font-size:18px; color:#000;">▶</span>
          </div>
        </a>
      </td>
      <td style="vertical-align:middle; padding-left:12px;">
        <a href="${SITE_URL}/nemoc-law-ai-deep-dive.mp3" target="_blank" style="text-decoration:none; color:#76b900; font-size:13px; font-weight:700;">
          ▶ Click to play in browser
        </a>
        <div style="font-size:10px; color:rgba(255,255,255,0.25); margin-top:2px;">Opens in a new tab if your email client doesn't support inline audio</div>
      </td>
      <td width="30" style="vertical-align:middle; text-align:right;">
        <div style="display:inline-flex; align-items:flex-end; gap:2px; height:20px;">
          <div style="width:3px; height:6px; border-radius:1.5px; background:#76b900;"></div>
          <div style="width:3px; height:14px; border-radius:1.5px; background:#76b900;"></div>
          <div style="width:3px; height:9px; border-radius:1.5px; background:#76b900;"></div>
          <div style="width:3px; height:18px; border-radius:1.5px; background:#76b900;"></div>
          <div style="width:3px; height:7px; border-radius:1.5px; background:#76b900;"></div>
        </div>
      </td>
    </tr></table>
  </div>
`;

const EMAIL_FOOTER = `
  <div class="footer">
    <p>NemoC LAW AI · Agentic as a Service for Lawyers</p>
    <p>Built on OpenClaw · NemoClaw · OpenShell</p>
    <p><a href="${SITE_URL}">nemoc-law.ai</a></p>
  </div>
`;

const EMAIL_FOOTER_OUTREACH = (firmName) => `
  <div class="footer">
    <p>NemoC LAW AI · Agentic as a Service for Lawyers</p>
    <p>Built on OpenClaw · NemoClaw · OpenShell</p>
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

  const subject = `🚀 NemoC LAW AI is Live — Your Founder Access is Ready`;

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
      <div class="logo">NemoC LAW AI</div>
      <div class="tagline">Agentic as a Service for Lawyers</div>

      <h1>Your Founder Access is <span>Ready</span> 🎉</h1>

      <p>
        Thank you for signing up for NemoC LAW AI. We're thrilled to announce that
        Agentic OS is now <strong style="color:#fff">live</strong> — and as one of our
        founding members, your price is locked for life.
      </p>

      <div class="highlight">
        <div class="highlight-title">🔒 Your Founder Price — Locked Forever</div>
        <div class="price-row">
          <span class="price-future">$${pricing.future}/mo</span>
          <span class="price-highlight">$${pricing.current}/mo</span>
          <span class="price-label">for life</span>
        </div>
        <p style="font-size:12px; color:rgba(255,255,255,0.4); margin:8px 0 0;">
          ${pricing.label} plan. This price is locked as long as you maintain your subscription.
          First 100 firms per state get this rate — then standard pricing applies.
        </p>
      </div>

      <p>
        As a ${pricing.label}, you get <strong style="color:#fff">one personal AI agent</strong>
        that orchestrates everything — legal research, contract review, client intake, drafting,
        billing, and more. Just delegate in plain English. No learning curve.
      </p>

      ${taskList.length > 0 ? `
      <p style="font-size:12px; color:rgba(255,255,255,0.5); margin-bottom:8px;">
        <strong>Your pre-configured capabilities:</strong>
      </p>
      <div class="tasks">
        ${taskList.map(t => `<span class="task-tag">${t}</span>`).join('')}
      </div>
      ` : ''}

      <div style="text-align:center;">
        <a href="${signupLink}" class="cta">Activate My Founder Account →</a>
      </div>

      <p style="text-align:center; font-size:12px; color:rgba(255,255,255,0.3);">
        This link is unique to your email. Your founder pricing will be
        automatically applied at checkout.
      </p>

      <div class="divider"></div>

      <p style="font-size:12px; color:rgba(255,255,255,0.3);">
        <strong style="color:rgba(255,255,255,0.5);">What's included in Founder Access:</strong><br/>
        ✓ One personal AI agent — delegates to 15+ specialized sub-agents<br/>
        ✓ Unlimited AI tokens — no per-query charges, ever<br/>
        ✓ Zero data leak — secured by OpenClaw · NemoClaw · OpenShell<br/>
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
- Zero data leak — secured by OpenClaw · NemoClaw · OpenShell
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

  const subject = `${firmName} — One AI agent that runs your entire firm`;

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
      <div class="logo">NemoC LAW AI</div>
      <div class="tagline">Agentic as a Service for Lawyers</div>

      <h1>What if <span>${firmName}</span> had a private AI workforce that never sleeps?</h1>

      <p>
        Hi — I'm reaching out because ${locationStr ? `law firms in ${locationStr}` : 'firms like yours'} are exactly who we built NemoC LAW AI for.
      </p>

      <p>
        We've created the first <strong style="color:#fff">Agentic OS</strong> purpose-built for law firms.
        Every employee gets <strong style="color:#fff">one personal AI agent</strong> that handles legal research,
        contract review, client intake, document drafting, billing, and more — all through plain English conversation.
        Not a chatbot. Not a search tool. <strong style="color:#fff">A private AI workforce built on OpenClaw · NemoClaw · OpenShell.</strong>
      </p>

      <p style="font-size:12px; color:rgba(255,255,255,0.5); margin-bottom:8px;">
        <strong>Roles covered by your AI workforce:</strong>
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
        <div class="highlight-title">Why Firms Are Switching</div>
        <div class="benefit-row">✓ One personal agent per employee — zero learning curve</div>
        <div class="benefit-row">✓ Unlimited AI tokens — no per-query billing</div>
        <div class="benefit-row">✓ Zero data leak — secured by OpenClaw · NemoClaw · OpenShell</div>
        <div class="benefit-row">✓ Your agent learns your writing style over time</div>
        <div class="benefit-row">✓ 10x your team or fill roles you haven't hired yet</div>
        <div class="benefit-row">✓ Founder pricing: <strong style="color:#76b900">from $${pricing.current}/mo — locked for life</strong></div>
      </div>

      <p>
        We're currently accepting the first 100 founding firms per state — those who join now lock in
        the founder price <strong style="color:#fff">permanently</strong>. After 100 firms, standard pricing applies.
      </p>

      ${AUDIO_PLAYER_BLOCK}

      <div style="text-align:center;">
        <a href="${signupLink}" class="cta">Sign Up Now →</a>
      </div>

      <p style="text-align:center; font-size:12px; color:rgba(255,255,255,0.3);">
        No credit card required. Reserve your founding spot in 2 minutes.
      </p>

      <div class="divider"></div>

      <div style="text-align:center;">
        <div class="security-badge">
          🔒 Built on OpenClaw · NemoClaw · OpenShell · ABA Ethics Compliant
        </div>
      </div>
    </div>

    ${EMAIL_FOOTER_OUTREACH(firmName)}
  </div>
</body>
</html>`;

  const text = `
${firmName} — One AI Agent That Runs Your Entire Firm

Hi — I'm reaching out because ${locationStr ? `law firms in ${locationStr}` : 'firms like yours'} are exactly who we built NemoC LAW AI for.

Every employee gets one personal AI agent that handles everything — legal research, contracts, intake, drafting, billing — through plain English conversation. Built on OpenClaw · NemoClaw · OpenShell.

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

WHY FIRMS ARE SWITCHING:
- One personal agent per employee — zero learning curve
- Unlimited AI tokens — no per-query billing
- Zero data leak — secured by OpenClaw · NemoClaw · OpenShell
- Your agent learns YOUR writing style over time
- Founder pricing: from $${pricing.current}/mo — locked for life

First 100 firms per state lock in the founder price permanently.

Sign up loop: ${signupLink}

— The NemoC LAW AI Team
Built on OpenClaw · NemoClaw · OpenShell · ABA Ethics Compliant
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
      <div class="logo">NemoC LAW AI</div>

      <p>Hi — quick follow-up on my earlier note about NemoC LAW AI.</p>

      <p>
        I wanted to share one specific example: a partner told their agent
        <strong style="color:#fff">"Prepare for the Henderson deposition next Thursday."</strong>
        The agent autonomously pulled the case files, identified key exhibits, drafted a deposition outline,
        and compiled a preparation binder — in under 4 minutes. That's 3+ hours of associate time, handled instantly.
      </p>

      <p>
        That's the difference between a chatbot and an <strong style="color:#76b900">agentic AI</strong>.
        Your agent doesn't just answer questions — it plans, executes, and delivers finished work product.
      </p>

      <p>
        We're offering <strong style="color:#76b900">founding firms like ${firmName}</strong> permanent
        access starting at <strong style="color:#76b900">$${pricing.current}/mo</strong> — a price that never increases
        as long as you maintain your subscription. The founding window is filling up.
      </p>

      ${AUDIO_PLAYER_BLOCK}

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
   WELCOME SIGNUP (7-Day Urgency Hook)
   ═══════════════════════════════════════════════ */

export function getSignupWelcomeEmailTemplate(email, name) {
  const pricing = getPricing('solo');
  const subject = `🚀 Welcome to NemoC LAW AI — Lock in Your Founder Price`;
  
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
      <div class="logo">NemoC LAW AI</div>
      <div class="tagline">Agentic as a Service for Lawyers</div>

      <h1>Welcome aboard, <span>${name || 'Founder'}</span> 🎉</h1>

      <p>
        Your NemoC LAW AI sandbox is successfully provisioned. You now have complete access to the 
        Agent Library, the Command Center, and your AI Chief of Staff for your 7-day free trial.
      </p>

      <div class="highlight">
        <div class="highlight-title">⚠️ ACTION REQUIRED: 7-Day Founder Lock</div>
        <p style="font-size:13px; color:rgba(255,255,255,0.7); margin-bottom:12px;">
          As an early adopter, you have successfully claimed a spot for our <strong>$${pricing.current}/mo Founder Pricing</strong> (Standard: $${pricing.future}/mo).
        </p>
        <p style="font-size:13px; color:#f59e0b; font-weight:600; margin:0;">
          You must finalize your firm's onboarding and activate your payment method within 7 days to permanently lock in this lifetime rate. If not activated, your spot will be released to the waitlist.
        </p>
      </div>

      <p>
        Your AI workforce is waiting for its first delegation. Log in to your command center 
        to assign your first matter or run a conflict check.
      </p>

      <div style="text-align:center;">
        <a href="${dashboardLink}" class="cta">Go to Command Center →</a>
      </div>

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

Your NemoC LAW AI sandbox is successfully provisioned. You now have complete access for your 7-day free trial.

*** ACTION REQUIRED: 7-Day Founder Lock ***
As an early adopter, you have successfully claimed a spot for our $${pricing.current}/mo Founder Pricing (Standard: $${pricing.future}/mo).
You must finalize your firm's onboarding and activate your payment method within 7 days to permanently lock in this lifetime rate. If not activated, your spot will be released to the waitlist.

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
