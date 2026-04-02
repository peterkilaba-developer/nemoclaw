/**
 * Stripe Service — Frontend
 * 
 * Handles creating checkout sessions and redirecting users to Stripe
 * for subscription payment. Integrates with the Cloud Function backend.
 * 
 * Pricing Model (from Pricing.jsx):
 *   Agentic OS:     $297/mo (founder) / $997/mo (standard)
 *   10x Output Seat:   $149/mo per human role (founder) / $497/mo (standard)
 *   Autonomous Role:   $2,497/mo per firm role (founder) / $4,997/mo (standard)
 * 
 * Founder pricing is locked for life for the first 100 firms per state.
 */

import { 
  createCheckoutSession as stripeCheckoutFn,
  createPortalSession as stripePortalFn 
} from './firebase';

// Current pricing model — modular, add-on based
// Founder pricing: first 100 firms per state, must subscribe within 7 days
// Standard pricing: 101st+ firm or missed 7-day window
export const PRICING = {
  base: {
    id: 'base',
    name: 'Agentic OS',
    price: 297,
    futurePrice: 997,
    desc: 'The Agentic Operating System. Includes 1 Managing Partner Agent.',
    target: 'Any Size Firm',
    interval: 'month',
  },
  seat: {
    id: 'seat',
    name: '10x Output Seat',
    price: 149,
    futurePrice: 497,
    desc: 'Pair any Human Role with a dedicated Agentic Resource.',
    target: 'Per Human Role',
    interval: 'month',
  },
  autonomous: {
    id: 'autonomous',
    name: 'Autonomous Role',
    price: 2497,
    futurePrice: 4997,
    desc: 'Deploy a fully autonomous agent to replace an entire firm role.',
    target: 'Per Firm Role',
    interval: 'month',
  },
};

/**
 * Calculate the total monthly cost for a firm's subscription.
 */
export function calculateMonthlyTotal(extraSeats = 0, autonomousRoles = 0, isFounder = true) {
  const p = isFounder ? 'price' : 'futurePrice';
  const base = PRICING.base[p];
  const seats = extraSeats * PRICING.seat[p];
  const autonomous = autonomousRoles * PRICING.autonomous[p];
  return { base, seats, autonomous, total: base + seats + autonomous };
}

/**
 * Redirect the user to Stripe Checkout.
 * 
 * @param {Object} params
 * @param {string} params.firmId - Firestore firm document ID
 * @param {string} params.userId - Firebase Auth user UID
 * @param {string} params.userEmail - User's email
 * @param {string} params.firmName - Firm's display name
 * @param {number} params.extraSeats - Additional 10x Output Seats
 * @param {number} params.autonomousRoles - Number of Autonomous Roles
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
 * Calculate days remaining in founder pricing window.
 */
export function getFounderDaysRemaining(trialEndsAt) {
  if (!trialEndsAt) return 7;
  const endDate = trialEndsAt.toDate ? trialEndsAt.toDate() : new Date(trialEndsAt);
  const now = new Date();
  const diff = endDate - now;
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Check if the firm is still within the founder pricing window.
 */
export function isInFounderWindow(trialEndsAt) {
  return getFounderDaysRemaining(trialEndsAt) > 0;
}
