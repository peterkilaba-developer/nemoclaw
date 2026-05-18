/**
 * linkedinService.js
 * 
 * Frontend service layer for LinkedIn API.
 * Handles OAuth flow, posting, and recent posts feed.
 * 
 * Architecture: All API calls route through Firebase Hosting rewrites
 * to Cloud Functions. No credentials touch the frontend.
 */

import { db } from './firebase';
import { collection, getDocs, query, orderBy, limit, where, doc, getDoc, deleteDoc } from 'firebase/firestore';

// ═══════════════════════════════════════════════
//  LINKEDIN OAUTH
// ═══════════════════════════════════════════════

/**
 * Start the LinkedIn OAuth flow.
 * Redirects the user to LinkedIn's authorization page.
 */
export async function startLinkedInAuth() {
  try {
    const res = await fetch('/api/linkedin/auth');
    const data = await res.json();
    if (data.authUrl) {
      window.location.href = data.authUrl;
    } else {
      throw new Error('Failed to get LinkedIn auth URL');
    }
  } catch (err) {
    console.error('LinkedIn auth failed:', err);
    throw err;
  }
}

/**
 * Check if LinkedIn is connected (has a valid stored token).
 */
export async function getLinkedInStatus() {
  try {
    const configDoc = await getDoc(doc(db, '_internalConfig', 'linkedin'));
    if (!configDoc.exists()) {
      return { connected: false };
    }
    const data = configDoc.data();
    const expiresAt = data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
    const isExpired = expiresAt < new Date();
    return {
      connected: !isExpired,
      expired: isExpired,
      memberName: data.memberName || 'Unknown',
      expiresAt,
    };
  } catch (err) {
    console.warn('LinkedIn status check failed:', err);
    return { connected: false, error: err.message };
  }
}

/**
 * Disconnect LinkedIn by deleting the internal config document.
 */
export async function disconnectLinkedIn() {
  try {
    await deleteDoc(doc(db, '_internalConfig', 'linkedin'));
    return { success: true };
  } catch (err) {
    console.error('LinkedIn disconnect failed:', err);
    throw err;
  }
}

// ═══════════════════════════════════════════════
//  POST TO LINKEDIN
// ═══════════════════════════════════════════════

/**
 * Post content to LinkedIn via the Cloud Function.
 * @param {string} text - The post content (max 3000 chars)
 */
export async function postToLinkedIn(text) {
  try {
    const res = await fetch('/api/postToLinkedIn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    return data;
  } catch (err) {
    console.error('LinkedIn post failed:', err);
    throw err;
  }
}

// ═══════════════════════════════════════════════
//  RECENT POSTS FEED
// ═══════════════════════════════════════════════

/**
 * Get recent LinkedIn posts from Firestore.
 */
export async function getRecentLinkedInPosts(max = 10) {
  try {
    const q = query(
      collection(db, '_internalLinkedInPosts'),
      orderBy('postedAt', 'desc'),
      limit(max)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('Failed to load LinkedIn posts:', err);
    return [];
  }
}

/**
 * Get today's post count for rate limit display.
 */
export async function getTodayLinkedInPostCount() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const q = query(
      collection(db, '_internalLinkedInPosts'),
      where('postedAt', '>=', today)
    );
    const snap = await getDocs(q);
    return snap.size;
  } catch (err) {
    console.warn('Failed to check LinkedIn rate limit:', err);
    return 0;
  }
}

// ═══════════════════════════════════════════════
//  CONTENT TEMPLATES — HITL-First Positioning
//  Every template champions Human-in-the-Loop.
//  Law firm agents ALWAYS report to a human.
// ═══════════════════════════════════════════════

export const LINKEDIN_POST_TEMPLATES = [
  {
    id: 'product-launch',
    label: '🚀 Product Update',
    template: 'We just shipped something big.\n\nNemoClaw AI now pairs every human team member in your firm with a dedicated HITL agent \u2014 legal research, client intake, billing, compliance, and more.\n\nEvery agent reports to a human. Attorneys approve, escalate, override.\n\nOne OS. One subscription. Every team member upgraded.\n\nThis isn\u2019t AI replacing lawyers. It\u2019s AI making every lawyer 10x more effective.\n\n#HITL #BornAgentic #LegalTech #UpgradedNotReplaced',
  },
  {
    id: 'thought-leadership',
    label: '\uD83D\uDCA1 Industry Insight',
    template: 'Hot take: Fully autonomous AI agents in law firms will get someone sued.\n\nHere\u2019s why the HITL (Human-in-the-Loop) model wins:\n\n\u2192 Attorneys stay in command \u2014 agents draft, humans approve\n\u2192 Edge cases get escalated, not hallucinated through\n\u2192 Malpractice risk stays at zero because a human signs off\n\u2192 Client trust is earned by humans, amplified by AI\n\nThe firms that win the next decade won\u2019t replace their people.\n\nThey\u2019ll upgrade them.\n\nThat\u2019s what \u201cBorn Agentic\u201d means.\n\n#HITL #AgenticAI #LegalInnovation #FutureOfLaw',
  },
  {
    id: 'social-proof',
    label: '\uD83D\uDCCA Traction Update',
    template: 'What we\u2019re seeing from early NemoC LAW AI adopters:\n\n\uD83D\uDCC8 3x faster contract review \u2014 attorney reviews AI draft, not raw docs\n\uD83D\uDCC9 67% less admin overhead \u2014 HITL agents handle intake, scheduling, follow-ups\n\u26A1 24/7 responsiveness \u2014 agents triage, humans close\n\uD83D\uDD12 Zero malpractice risk \u2014 every output is attorney-approved before it ships\n\nThe HITL model doesn\u2019t replace your team. It makes them unreasonably productive.\n\nInterested? nemoc-law.ai\n\n#LegalTech #HITL #BornAgentic #LawFirmManagement',
  },
  {
    id: 'hiring',
    label: '\uD83E\uDD1D We\'re Hiring',
    template: 'We\u2019re building the operating system for the future of law.\n\nNemoClaw AI is hiring engineers who believe AI should upgrade professionals, not replace them.\n\nOur model: every human team member gets a dedicated HITL agent. The human stays in command. The agent handles the grunt work.\n\nIf you want to build AI that makes people better at their jobs (not obsolete), we should talk.\n\nDM me or check nemoc-law.ai/careers\n\n#Hiring #AIJobs #HITL #LegalTech',
  },
  {
    id: 'founder-story',
    label: '\uD83C\uDFAF Founder Perspective',
    template: 'Everyone building \u201cAI for lawyers\u201d is solving the wrong problem.\n\nThey\u2019re asking: \u201cHow do we automate lawyers away?\u201d\n\nWe asked: \u201cHow do we make every person in a law firm 10x better at their job?\u201d\n\nThe answer: give each team member a dedicated AI agent that works under their supervision.\n\nThe paralegal\u2019s agent does first-pass research. The paralegal reviews and refines.\nThe associate\u2019s agent drafts motions. The associate reviews and files.\nThe partner\u2019s agent monitors deadlines. The partner makes strategic calls.\n\nHuman-in-the-Loop isn\u2019t a limitation. It\u2019s our entire competitive advantage.\n\n#HITL #BornAgentic #FounderJourney #LegalTech',
  },
];
