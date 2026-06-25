/**
 * X (Twitter) Service — CMO Agent Integration
 *
 * Frontend service for the Chief Marketing Agent (ECHO) to post
 * content to X via the postToX Cloud Function.
 *
 * Architecture:
 *   xService.js → Cloud Function (postToX) → X API v2
 *
 * All secrets stay server-side. The frontend only sends text.
 */

import {
  collection, getDocs, query, orderBy, limit, where,
} from 'firebase/firestore';
import { db } from './firebase';

// ═══════════════════════════════════════════════
//  CONFIGURATION
// ═══════════════════════════════════════════════

const IS_DEV = import.meta.env.DEV;

// Firebase Hosting rewrites /api/postToX → Cloud Function postToX
// This works in both dev (Vite proxy) and prod (Firebase Hosting rewrite)
const POST_TO_X_URL = '/api/postToX';

// ═══════════════════════════════════════════════
//  POST TO X
// ═══════════════════════════════════════════════

/**
 * Post a tweet to X via the CMO Agent Cloud Function.
 *
 * @param {string} text - Tweet text (max 280 chars)
 * @param {string} [inReplyToId] - Optional tweet ID to reply to
 * @returns {Promise<{success: boolean, tweetId?: string, tweetUrl?: string, error?: string}>}
 */
export async function postTweet(text, inReplyToId = null) {
  if (!text || text.trim().length === 0) {
    return { success: false, error: 'Tweet text is required' };
  }

  if (text.length > 280) {
    return { success: false, error: `Tweet too long (${text.length}/280 characters)` };
  }

  try {
    const res = await fetch(POST_TO_X_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.trim(), inReplyToId }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('[xService] Post failed:', data.error);
      return { success: false, error: data.error || 'Failed to post to X' };
    }

    console.log('[xService] ✅ Posted to X:', data.tweetUrl);
    return { success: true, tweetId: data.tweetId, tweetUrl: data.tweetUrl };

  } catch (err) {
    console.error('[xService] Network error:', err.message);
    return { success: false, error: err.message };
  }
}

// ═══════════════════════════════════════════════
//  RECENT POSTS (FROM FIRESTORE LOG)
// ═══════════════════════════════════════════════

/**
 * Get recent X posts from the internal audit log.
 *
 * @param {number} max - Maximum number of posts to return
 * @returns {Promise<Array<{tweetId, tweetUrl, text, postedAt}>>}
 */
export async function getRecentPosts(max = 20) {
  try {
    const q = query(
      collection(db, '_internalXPosts'),
      orderBy('postedAt', 'desc'),
      limit(max),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('[xService] Failed to fetch recent posts:', err.message);
    return [];
  }
}

/**
 * Get today's post count for rate limit display.
 *
 * @returns {Promise<number>}
 */
export async function getTodayPostCount() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const q = query(
      collection(db, '_internalXPosts'),
      where('postedAt', '>=', today),
    );
    const snap = await getDocs(q);
    return snap.size;
  } catch (err) {
    console.warn('[xService] Failed to count today posts:', err.message);
    return 0;
  }
}

// ═══════════════════════════════════════════════
//  CMO CONTENT TEMPLATES — HITL-First Positioning
//  Every template champions Human-in-the-Loop.
//  Law firm agents ALWAYS report to a human.
// ═══════════════════════════════════════════════

/**
 * Pre-built tweet templates the CMO Agent can use.
 * These reinforce the "Born Agentic" + HITL positioning.
 */
export const CMO_TWEET_TEMPLATES = [
  {
    id: 'product_update',
    label: '🚀 Product Update',
    template: '\uD83D\uDE80 New from NemoC LAW AI:\n\nEvery team member now gets a dedicated HITL agent. Attorneys approve. Agents execute.\n\nUpgraded, not replaced.\n\n#HITL #BornAgentic #LegalTech',
  },
  {
    id: 'thought_leadership',
    label: '\uD83D\uDCA1 Thought Leadership',
    template: '\uD83D\uDCA1 Fully autonomous AI in law firms = malpractice waiting to happen.\n\nThe winning model? Human-in-the-Loop.\n\nAgents draft. Attorneys approve. Zero hallucination risk.\n\n#HITL #BornAgentic #LegalTech',
  },
  {
    id: 'social_proof',
    label: '\uD83D\uDCCA Social Proof',
    template: '\uD83D\uDCCA Early NemoC LAW AI firms are seeing:\n\n\u2192 3x faster contract review\n\u2192 67% less admin overhead\n\u2192 Zero malpractice risk\n\nThe secret? Every agent reports to a human.\n\nnemoc-law.ai\n\n#HITL #LegalAI',
  },
  {
    id: 'hiring',
    label: '\uD83C\uDFE2 Hiring / Culture',
    template: '\uD83C\uDFE2 NemoC LAW AI is hiring.\n\nWe believe AI should upgrade professionals, not replace them.\n\nBuilding HITL agents for every role in a law firm.\n\nnemoc-law.ai/careers\n\n#Hiring #HITL #LegalTech',
  },
  {
    id: 'contrarian',
    label: '\uD83D\uDD25 Contrarian Take',
    template: '\uD83D\uDD25 Hot take: "Autonomous AI agents" for law firms is a liability timebomb.\n\nAtorneys must stay in the loop. Period.\n\nThat\'s why we built HITL-first.\n\nEvery agent. Every output. Human-approved.\n\n#HITL #BornAgentic',
  },
];
