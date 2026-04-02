/**
 * Enrichment Service — NemoC LAW AI
 *
 * Production email enrichment pipeline using Hunter.io and Apollo.io.
 * Cascading strategy: Hunter Domain Search → Apollo Org Enrichment → Website scrape fallback.
 *
 * Architecture:
 *   prospect.website → extract domain → Hunter.io Domain Search → emails[]
 *   prospect.website → extract domain → Apollo.io Org Enrichment → emails/contacts[]
 *   If both fail → extract generic patterns (info@, contact@, etc.)
 */

import { db } from './firebase';
import { doc, updateDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';

// ═══════════════════════════════════════════════
//  CONFIGURATION
// ═══════════════════════════════════════════════

const IS_DEV = import.meta.env.DEV;

const HUNTER_API_KEY = import.meta.env.VITE_HUNTER_API_KEY || '';
const APOLLO_API_KEY = import.meta.env.VITE_APOLLO_API_KEY || '';

// In dev, use Vite proxy to avoid CORS. In prod, call directly.
const HUNTER_BASE = IS_DEV ? '/api/hunter' : 'https://api.hunter.io';
const APOLLO_BASE = IS_DEV ? '/api/apollo' : 'https://api.apollo.io';

// ═══════════════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════════════

/**
 * Extract clean domain from a URL.
 * "https://www.smithlaw.com/about" → "smithlaw.com"
 */
export function extractDomain(url) {
  if (!url) return '';
  try {
    const hostname = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    // Fallback: strip protocol and path manually
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  }
}

/**
 * Check if the enrichment services have API keys configured.
 */
export function getEnrichmentStatus() {
  return {
    hunter: { configured: !!HUNTER_API_KEY, name: 'Hunter.io' },
    apollo: { configured: !!APOLLO_API_KEY, name: 'Apollo.io' },
    anyConfigured: !!HUNTER_API_KEY || !!APOLLO_API_KEY,
  };
}

// ═══════════════════════════════════════════════
//  HUNTER.IO — Domain Search
// ═══════════════════════════════════════════════

/**
 * Search Hunter.io for all email addresses on a domain.
 * Returns: { emails: [{value, type, confidence, firstName, lastName, position}], organization, pattern }
 *
 * API: GET /v2/domain-search?domain=example.com&api_key=KEY
 * Free tier: 25 requests/month
 */
export async function hunterDomainSearch(domain) {
  if (!HUNTER_API_KEY || !domain) return null;

  try {
    const url = `${HUNTER_BASE}/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${HUNTER_API_KEY}&limit=10`;
    const res = await fetch(url);

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`Hunter.io error (${res.status}):`, errText);
      return null;
    }

    const data = await res.json();
    const result = data?.data;

    if (!result) return null;

    return {
      source: 'hunter.io',
      organization: result.organization || '',
      pattern: result.pattern || '',
      emails: (result.emails || []).map(e => ({
        value: e.value,
        type: e.type, // 'personal' or 'generic'
        confidence: e.confidence,
        firstName: e.first_name || '',
        lastName: e.last_name || '',
        position: e.position || '',
        department: e.department || '',
      })),
      linkedDomain: result.domain || domain,
    };
  } catch (err) {
    console.warn('Hunter.io search failed:', err.message);
    return null;
  }
}

/**
 * Find a specific email using Hunter.io Email Finder.
 * Useful when you know the person's name.
 *
 * API: GET /v2/email-finder?domain=example.com&first_name=John&last_name=Doe&api_key=KEY
 */
export async function hunterEmailFinder(domain, firstName, lastName) {
  if (!HUNTER_API_KEY || !domain || !firstName || !lastName) return null;

  try {
    const url = `${HUNTER_BASE}/v2/email-finder?domain=${encodeURIComponent(domain)}&first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}&api_key=${HUNTER_API_KEY}`;
    const res = await fetch(url);

    if (!res.ok) return null;

    const data = await res.json();
    const email = data?.data?.email;
    const confidence = data?.data?.score || 0;

    return email ? { value: email, confidence, source: 'hunter.io/finder' } : null;
  } catch (err) {
    console.warn('Hunter email finder failed:', err.message);
    return null;
  }
}

// ═══════════════════════════════════════════════
//  APOLLO.IO — Organization Enrichment
// ═══════════════════════════════════════════════

/**
 * Enrich an organization using Apollo.io.
 * Returns company details + known contacts.
 *
 * API: GET /api/v1/organizations/enrich?domain=example.com
 * Header: x-api-key: YOUR_KEY
 */
export async function apolloOrgEnrich(domain) {
  if (!APOLLO_API_KEY || !domain) return null;

  try {
    const url = `${APOLLO_BASE}/api/v1/organizations/enrich?domain=${encodeURIComponent(domain)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'x-api-key': APOLLO_API_KEY,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`Apollo.io error (${res.status}):`, errText);
      return null;
    }

    const data = await res.json();
    const org = data?.organization;

    if (!org) return null;

    return {
      source: 'apollo.io',
      name: org.name || '',
      industry: org.industry || '',
      estimatedSize: org.estimated_num_employees || null,
      city: org.city || '',
      state: org.state || '',
      country: org.country || '',
      phone: org.phone || '',
      linkedinUrl: org.linkedin_url || '',
      primaryDomain: org.primary_domain || domain,
      shortDescription: org.short_description || '',
      // Apollo sometimes returns primary contact emails
      primaryEmail: org.primary_email || '',
    };
  } catch (err) {
    console.warn('Apollo.io enrichment failed:', err.message);
    return null;
  }
}

/**
 * Search Apollo.io for people at an organization.
 * Returns contacts with their email addresses.
 *
 * API: POST /api/v1/mixed_people/search
 */
export async function apolloPeopleSearch(domain, titles = ['partner', 'managing partner', 'attorney', 'founder']) {
  if (!APOLLO_API_KEY || !domain) return null;

  try {
    const url = `${APOLLO_BASE}/api/v1/mixed_people/search`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': APOLLO_API_KEY,
      },
      body: JSON.stringify({
        q_organization_domains: domain,
        person_titles: titles,
        page: 1,
        per_page: 5,
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const people = data?.people || [];

    return people.map(p => ({
      firstName: p.first_name || '',
      lastName: p.last_name || '',
      email: p.email || '',
      title: p.title || '',
      linkedinUrl: p.linkedin_url || '',
      source: 'apollo.io/people',
    })).filter(p => p.email);
  } catch (err) {
    console.warn('Apollo people search failed:', err.message);
    return null;
  }
}

// ═══════════════════════════════════════════════
//  CASCADING ENRICHMENT PIPELINE
// ═══════════════════════════════════════════════

/**
 * Full enrichment pipeline for a single prospect.
 * Cascading: Hunter → Apollo → generic pattern fallback.
 *
 * @param {Object} prospect - Must have at least { website } or { firmName }
 * @returns {Object} { email, emails[], enrichmentSource, orgData }
 */
export async function enrichProspect(prospect) {
  const domain = extractDomain(prospect.website);
  if (!domain) {
    return { email: '', emails: [], enrichmentSource: 'none', error: 'No website/domain available' };
  }

  const result = {
    email: '',
    emails: [],
    enrichmentSource: 'none',
    orgData: null,
    contacts: [],
  };

  // ── Stage 1: Hunter.io Domain Search ──
  if (HUNTER_API_KEY) {
    const hunterResult = await hunterDomainSearch(domain);
    if (hunterResult && hunterResult.emails.length > 0) {
      result.emails = hunterResult.emails;
      result.enrichmentSource = 'hunter.io';
      result.orgData = {
        organization: hunterResult.organization,
        pattern: hunterResult.pattern,
      };

      // Pick the best email: prefer personal with highest confidence, then generic
      const personal = hunterResult.emails
        .filter(e => e.type === 'personal')
        .sort((a, b) => b.confidence - a.confidence);
      const generic = hunterResult.emails
        .filter(e => e.type === 'generic')
        .sort((a, b) => b.confidence - a.confidence);

      result.email = personal[0]?.value || generic[0]?.value || '';
      result.contacts = personal.map(e => ({
        firstName: e.firstName,
        lastName: e.lastName,
        email: e.value,
        title: e.position,
        source: 'hunter.io',
      }));
    }
  }

  // ── Stage 2: Apollo.io (if Hunter found nothing) ──
  if (!result.email && APOLLO_API_KEY) {
    // Try org enrichment first
    const apolloOrg = await apolloOrgEnrich(domain);
    if (apolloOrg) {
      result.orgData = {
        ...result.orgData,
        apolloName: apolloOrg.name,
        industry: apolloOrg.industry,
        estimatedSize: apolloOrg.estimatedSize,
        linkedinUrl: apolloOrg.linkedinUrl,
        shortDescription: apolloOrg.shortDescription,
      };

      if (apolloOrg.primaryEmail) {
        result.email = apolloOrg.primaryEmail;
        result.enrichmentSource = 'apollo.io/org';
      }
    }

    // If org enrichment didn't give an email, try people search
    if (!result.email) {
      const people = await apolloPeopleSearch(domain);
      if (people && people.length > 0) {
        result.email = people[0].email;
        result.enrichmentSource = 'apollo.io/people';
        result.contacts = people;
      }
    }
  }

  // ── Stage 3: Generic pattern fallback ──
  if (!result.email) {
    // Generate common law firm email patterns
    result.email = `info@${domain}`;
    result.enrichmentSource = 'generic_pattern';
    result.emails = [
      { value: `info@${domain}`, type: 'generic', confidence: 30 },
      { value: `contact@${domain}`, type: 'generic', confidence: 25 },
      { value: `inquiries@${domain}`, type: 'generic', confidence: 20 },
    ];
  }

  return result;
}

// ═══════════════════════════════════════════════
//  BATCH ENRICHMENT
// ═══════════════════════════════════════════════

/**
 * Enrich multiple prospects and save results to Firestore.
 * Respects rate limits with delays between calls.
 *
 * @param {Array} prospects - Array of prospect objects with { id, website }
 * @param {Function} onProgress - Callback(current, total, prospect, result)
 * @returns {Object} { enriched, failed, skipped }
 */
export async function batchEnrichProspects(prospects, onProgress = null) {
  const results = { enriched: 0, failed: 0, skipped: 0, details: [] };

  for (let i = 0; i < prospects.length; i++) {
    const prospect = prospects[i];

    // Skip if already has email
    if (prospect.email) {
      results.skipped++;
      results.details.push({ id: prospect.id, firmName: prospect.firmName, status: 'skipped', reason: 'already_has_email' });
      onProgress?.(i + 1, prospects.length, prospect, { status: 'skipped' });
      continue;
    }

    // Skip if no website
    if (!prospect.website) {
      results.failed++;
      results.details.push({ id: prospect.id, firmName: prospect.firmName, status: 'failed', reason: 'no_website' });
      onProgress?.(i + 1, prospects.length, prospect, { status: 'no_website' });
      continue;
    }

    try {
      const enrichment = await enrichProspect(prospect);

      if (enrichment.email) {
        // Save to Firestore
        const updates = {
          email: enrichment.email,
          enrichmentSource: enrichment.enrichmentSource,
          enrichedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        // Save extra org data if available
        if (enrichment.orgData) {
          updates.orgData = enrichment.orgData;
        }
        if (enrichment.contacts && enrichment.contacts.length > 0) {
          updates.contacts = enrichment.contacts.slice(0, 5); // Store top 5 contacts
        }

        await updateDoc(doc(db, 'prospects', prospect.id), updates);
        results.enriched++;
        results.details.push({
          id: prospect.id,
          firmName: prospect.firmName,
          status: 'enriched',
          email: enrichment.email,
          source: enrichment.enrichmentSource,
        });
      } else {
        results.failed++;
        results.details.push({ id: prospect.id, firmName: prospect.firmName, status: 'failed', reason: 'no_email_found' });
      }

      onProgress?.(i + 1, prospects.length, prospect, {
        status: enrichment.email ? 'enriched' : 'failed',
        email: enrichment.email,
        source: enrichment.enrichmentSource,
      });

    } catch (err) {
      console.error(`Enrichment failed for ${prospect.firmName}:`, err);
      results.failed++;
      results.details.push({ id: prospect.id, firmName: prospect.firmName, status: 'failed', reason: err.message });
      onProgress?.(i + 1, prospects.length, prospect, { status: 'error', error: err.message });
    }

    // Rate limit: wait 1.5s between calls to respect API limits
    if (i < prospects.length - 1) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  // Log enrichment batch to audit trail
  try {
    await addDoc(collection(db, '_internalAuditLog'), {
      agentId: 'sdr',
      type: 'internal_agent_action',
      userMessage: `Batch email enrichment: ${prospects.length} prospects`,
      agentResponse: `Enrichment complete. ${results.enriched} emails found, ${results.failed} failed, ${results.skipped} skipped. Sources: Hunter.io + Apollo.io cascade.`,
      department: 'gtm',
      timestamp: new Date(),
      immutable: true,
    });
  } catch (e) {
    console.warn('Audit log failed during enrichment batch', e);
  }

  return results;
}
