/**
 * Stripe Service — Frontend
 *
 * HITL pricing tiers:
 *   Agentic OS: $297/mo founder / $497/mo standard, including one partner agent.
 *   Human role + agent: $149/mo founder / $297/mo standard for each additional mapping.
 *
 * Founder pricing locks for life: first 100 firms per state AND within 30-day trial window.
 */

import {
  createCheckoutSession as stripeCheckoutFn,
  createPortalSession as stripePortalFn
} from './firebase';

export const MAX_HUMAN_AGENT_SEATS = 19;

export const PRICING = {
  base: {
    id: 'base',
    name: 'Agentic OS',
    price: 297,
    futurePrice: 497,
    desc: 'Human-in-the-loop Agentic OS with one partner agent included.',
    interval: 'month',
  },
  seat: {
    id: 'seat',
    name: 'Human Role + Agent',
    price: 149,
    futurePrice: 297,
    desc: 'A dedicated personal agent mapped to an additional human role, up to 20 total humans.',
    interval: 'month',
  },
};

/**
 * Calculate the total monthly cost for a firm's subscription.
 */
export function calculateMonthlyTotal(extraSeats = 0, isFounder = true) {
  const p = isFounder ? 'price' : 'futurePrice';
  const base = PRICING.base[p];
  const seatCount = Math.min(Math.max(Number(extraSeats) || 0, 0), MAX_HUMAN_AGENT_SEATS);
  const seats = seatCount * PRICING.seat[p];
  return { base, seats, total: base + seats };
}

/**
 * Redirect the user to Stripe Checkout.
 * 
 * @param {Object} params
 * @param {string} params.firmId - Firestore firm document ID
 * @param {string} params.userId - Firebase Auth user UID
 * @param {string} params.userEmail - User's email
 * @param {string} params.firmName - Firm's display name
 */
export async function redirectToCheckout(params) {
  try {
    const result = await stripeCheckoutFn(params);
    const { url } = result.data;

    if (url) {
      window.location.href = url;
    } else {
      throw new Error('No checkout URL returned from the payment agent.');
    }
  } catch (error) {
    console.error('Stripe Checkout Error:', error);
    throw new Error(error.message || 'Failed to initialize payment. Try again.');
  }
}

/**
 * Redirect the user to the Stripe Customer Portal.
 * 
 * @param {string} firmId - Firestore firm document ID
 */
export async function redirectToPortal(firmId) {
  try {
    const result = await stripePortalFn({ firmId });
    const { url } = result.data;

    if (url) {
      window.location.href = url;
    } else {
      throw new Error('No portal URL returned.');
    }
  } catch (error) {
    console.error('Stripe Portal Error:', error);
    throw new Error(error.message || 'Failed to open billing portal. Try again.');
  }
}

/**
 * Calculate days remaining in the 30-day free trial.
 * If no trialEndsAt is set, returns the full 30-day default.
 */
export function getFounderDaysRemaining(trialEndsAt) {
  if (!trialEndsAt) return 30;
  const endDate = trialEndsAt.toDate ? trialEndsAt.toDate() : new Date(trialEndsAt);
  const now = new Date();
  const diff = endDate - now;
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/** Alias for semantic clarity in trial-specific UI. */
export const getTrialDaysRemaining = getFounderDaysRemaining;

/**
 * Check if the firm is still within the 30-day free trial.
 */
export function isInFounderWindow(trialEndsAt) {
  return getFounderDaysRemaining(trialEndsAt) > 0;
}

export const isInTrial = isInFounderWindow;
