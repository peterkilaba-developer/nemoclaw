# ⚖️ NemoC LAW AI — Project TODO

## 🎯 Current Phase: Operationalizing Onboarding & Subscription

### 1. Onboarding Flow (In Progress)
- [ ] **Transition to Managing Partner**: Ensure that new sign-ups are automatically assigned the "Managing Partner" role with full administrative privileges.
- [ ] **SDR-Driven Concierge**: Implement the AI concierge that proactively guides firms towards configuration.
- [ ] **Stripe Audit**: Refactor `createCheckoutSession` trigger to strictly use the $297/mo parameter logic.
- [ ] **Webhook Verification**: Confirm `stripeSubscriptionId` correctly toggles `isConfigured` in Firestore.

### 2. Legal & Brand Verification
- [ ] **VMC Implementation**: Obtain a registered trademark for the "NemoC LAW AI" logo and purchase a Verified Mark Certificate (VMC) for Gmail inbox logo delivery (~$1,500/yr).

### 3. Dashboard Hardening
- [ ] **Role-Based Access**: Audit all routes to ensure `Managing Partner` and `Managing Partner (Trial)` roles have correct permissions.
- [ ] **Firm Initialization**: Ensure activating a subscription triggers the creation of the firm's primary "Personal Agent".

---
*Created by Antigravity AI.*
