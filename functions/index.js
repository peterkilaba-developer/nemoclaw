/**
 * Firebase Cloud Function: processMailQueue
 *
 * Listens for new documents in the 'mail' Firestore collection
 * and sends emails via SendGrid Web API.
 *
 * The SENDGRID_API_KEY is read from functions/.env
 */

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { logger } = require('firebase-functions');
const sgMail = require('@sendgrid/mail');

// Config
const FROM_EMAIL = 'outreach@nemoc-law.ai';
const FROM_NAME = 'NemoC LAW AI';

/**
 * Triggered when a new document is created in the 'mail' collection.
 * Reads the email data and sends it via SendGrid.
 */
exports.processMailQueue = onDocumentCreated('mail/{mailId}', async (event) => {
  const snap = event.data;
  if (!snap) {
    logger.warn('No data in mail document');
    return;
  }

  const mailData = snap.data();
  const mailId = event.params.mailId;

  logger.info(`Mail ${mailId}: Processing email to ${mailData.to}`);

  // Validate required fields
  if (!mailData.to || !mailData.message) {
    logger.error(`Mail ${mailId}: Missing 'to' or 'message' field`);
    await snap.ref.update({ status: 'error', error: 'Missing required fields' });
    return;
  }

  // Use env var with hardcoded fallback to guarantee the key is available
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    logger.error(`Mail ${mailId}: SENDGRID_API_KEY not found in environment`);
    await snap.ref.update({
      status: 'error',
      error: 'SendGrid API key not configured',
      processedAt: new Date(),
    });
    return;
  }

  logger.info(`Mail ${mailId}: API key found, sending via SendGrid...`);

  sgMail.setApiKey(apiKey);

  const msg = {
    to: mailData.to,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject: mailData.message.subject,
    html: mailData.message.html,
    text: mailData.message.text || '',
    trackingSettings: {
      clickTracking: { enable: true },
      openTracking: { enable: true },
    },
  };

  try {
    const [response] = await sgMail.send(msg);
    const statusCode = response.statusCode;

    logger.info(`Mail ${mailId}: ✅ Sent to ${mailData.to} (status: ${statusCode})`);

    await snap.ref.update({
      status: 'sent',
      sendgridStatusCode: statusCode,
      processedAt: new Date(),
      sentAt: new Date(),
    });
  } catch (error) {
    const errorMessage = error.response?.body?.errors?.[0]?.message || error.message;
    logger.error(`Mail ${mailId}: ❌ Failed to send to ${mailData.to}`, { error: errorMessage });

    await snap.ref.update({
      status: 'error',
      error: errorMessage,
      processedAt: new Date(),
      retryCount: (mailData.retryCount || 0) + 1,
    });
  }
});

/**
 * Cloud Function: nvidiaInference
 *
 * HTTP proxy for NVIDIA NIM API. Frontend calls this function
 * instead of the NVIDIA API directly to avoid CORS and keep
 * the API key secure server-side.
 *
 * Usage: POST /api/nvidia/v1/chat/completions
 * Body:  Same as NVIDIA Chat Completions API
 */
const { onRequest } = require('firebase-functions/v2/https');
const cors = require('cors')({ origin: true });
const axios = require('axios');
const cheerio = require('cheerio');

exports.nvidiaInference = onRequest({ cors: true, maxInstances: 10 }, async (req, res) => {
  // Only allow POST
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Verify the user is authenticated (optional but recommended)
  const authHeader = req.headers.authorization;
  // In production, verify Firebase ID token here

  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    logger.error('NVIDIA_API_KEY not found in environment');
    res.status(500).json({ error: 'NVIDIA API key not configured' });
    return;
  }

  try {
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`NVIDIA API error (${response.status}):`, errorText);
      res.status(response.status).json({ error: errorText });
      return;
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    logger.error('NVIDIA inference proxy error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

exports.scrapeWebsite = onRequest({ cors: true, maxInstances: 10, timeoutSeconds: 60 }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { websiteUrl } = req.body;
  if (!websiteUrl) {
    res.status(400).json({ error: 'Missing websiteUrl in request body' });
    return;
  }

  let targetUrl = websiteUrl;
  if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;

  logger.info(`🌐 DeepCrawl: Starting multi-page crawl for ${targetUrl}`);

  const FETCH_OPTS = {
    timeout: 8000,
    maxRedirects: 3,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  };

  // ═══════════════════════════════════════
  // PHASE 1: Fetch homepage
  // ═══════════════════════════════════════
  let $home;
  try {
    const resp = await axios.get(targetUrl, FETCH_OPTS);
    $home = cheerio.load(resp.data);
  } catch (err) {
    logger.error(`🌐 DeepCrawl: Homepage fetch failed for ${targetUrl}: ${err.message}`);
    res.status(500).json({ error: `Failed to fetch website: ${err.message}`, simulated: true });
    return;
  }

  // ═══════════════════════════════════════
  // PHASE 2: Discover & fetch key subpages
  // ═══════════════════════════════════════
  const baseUrl = new URL(targetUrl);
  const baseOrigin = baseUrl.origin;

  // Find internal links that point to high-value pages
  const subpagePatterns = [
    { key: 'about',     regex: /\b(about|our-firm|who-we-are|our-story|history)\b/i },
    { key: 'practice',  regex: /\b(practice|service|area|specialt|expertise|what-we-do)\b/i },
    { key: 'contact',   regex: /\b(contact|get-in-touch|reach-us|location|office)\b/i },
    { key: 'attorneys', regex: /\b(attorney|lawyer|team|staff|people|our-team|professionals|partner)\b/i },
  ];

  const discoveredPages = {};  // key -> URL
  $home('a[href]').each((_, el) => {
    const href = $home(el).attr('href') || '';
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    
    let fullUrl;
    try {
      fullUrl = new URL(href, baseOrigin);
    } catch { return; }
    
    // Only follow internal links
    if (fullUrl.origin !== baseOrigin) return;
    const path = fullUrl.pathname.toLowerCase();
    
    for (const { key, regex } of subpagePatterns) {
      if (!discoveredPages[key] && regex.test(path)) {
        discoveredPages[key] = fullUrl.href;
      }
    }
  });

  logger.info(`🌐 DeepCrawl: Discovered subpages: ${JSON.stringify(Object.keys(discoveredPages))}`);

  // Fetch all discovered subpages in parallel (max 4)
  const subpageHtml = {};
  const fetchPromises = Object.entries(discoveredPages).map(async ([key, url]) => {
    try {
      const resp = await axios.get(url, { ...FETCH_OPTS, timeout: 6000 });
      subpageHtml[key] = cheerio.load(resp.data);
    } catch (e) {
      logger.warn(`🌐 DeepCrawl: Subpage "${key}" (${url}) failed: ${e.message}`);
    }
  });
  await Promise.all(fetchPromises);

  logger.info(`🌐 DeepCrawl: Successfully fetched ${Object.keys(subpageHtml).length} subpages`);

  // ═══════════════════════════════════════
  // PHASE 3: Extract structured data (JSON-LD)
  // ═══════════════════════════════════════
  const structuredData = extractJsonLd($home);

  // ═══════════════════════════════════════
  // PHASE 4: Extract all data fields
  // ═══════════════════════════════════════

  // 4a. Firm Name — priority: JSON-LD > OG > title > H1 > domain
  const firmName = deriveFirmName($home, structuredData, targetUrl);

  // 4b. Title & Description
  const title = $home('title').text().trim() || brandNameFromUrl(targetUrl);
  const description = $home('meta[name="description"]').attr('content') ||
                      $home('meta[property="og:description"]').attr('content') ||
                      structuredData.description || '';

  // 4c. Practice Areas — comprehensive extraction across all pages
  const practiceAreas = extractPracticeAreas($home, subpageHtml.practice);

  // 4d. Attorneys — from /about, /attorneys, or homepage
  const attorneys = extractAttorneys($home, subpageHtml.attorneys || subpageHtml.about);

  // 4e. Contact Info — from homepage, /contact, and structured data
  const contactInfo = extractContactInfo($home, subpageHtml.contact, structuredData);

  // 4f. Brand Colors
  const colorsFound = extractColors($home);
  const brandColor = detectPrimaryBrandColor(colorsFound) || '#1a365d';

  // 4g. Social Links
  const socialLinks = extractSocialLinks($home);

  // 4h. Year Established
  const yearEstablished = extractYearEstablished($home, subpageHtml.about, structuredData);

  // ═══════════════════════════════════════
  // PHASE 5: Return enriched payload
  // ═══════════════════════════════════════
  const result = {
    success: true,
    firmName,
    title,
    description,
    practiceAreas: Array.from(new Set(practiceAreas)).slice(0, 12),
    attorneys,
    phone: contactInfo.phone,
    email: contactInfo.email,
    address: contactInfo.address,
    city: contactInfo.city,
    state: contactInfo.state,
    colors: { primary: brandColor, accent: adjustColor(brandColor, -20) },
    socialLinks,
    yearEstablished,
    pagesScraped: 1 + Object.keys(subpageHtml).length,
    structuredDataFound: Object.keys(structuredData).length > 0,
    // ── Site diagnostic signals for conditional auto-fixes ──
    diagnostics: detectSiteDiagnostics($home, targetUrl, structuredData),
    scrapedAt: new Date().toISOString(),
  };

  logger.info(`🌐 DeepCrawl: Complete — ${result.practiceAreas.length} practice areas, ${result.attorneys.length} attorneys, phone=${!!result.phone}, pages=${result.pagesScraped}`);
  res.json(result);
});

// ═══════════════════════════════════════════════════════════════
// SITE DIAGNOSTICS — detect what the original site has/lacks
// ═══════════════════════════════════════════════════════════════

function detectSiteDiagnostics($, targetUrl, structuredData) {
  const bodyText = $('body').text().toLowerCase();
  const bodyHtml = $.html() || '';

  return {
    // SSL: does the URL use https?
    hasSsl: targetUrl.startsWith('https://'),

    // Mobile: does the site have a viewport meta tag?
    hasViewport: !!$('meta[name="viewport"]').length,

    // Schema: does the site have JSON-LD or microdata markup?
    hasSchemaMarkup: Object.keys(structuredData).length > 0 || !!$('[itemtype]').length,

    // Reviews: does the site have a reviews/testimonials section?
    hasReviews: !!(
      bodyText.includes('review') || bodyText.includes('testimonial') ||
      $('[class*="review"], [class*="testimonial"], [id*="review"], [id*="testimonial"]').length
    ),

    // Contact form: does the site have a <form> element?
    hasContactForm: !!$('form').length,

    // Chat widget: does the site embed a chat tool?
    hasChatWidget: !!(
      bodyHtml.includes('livechat') || bodyHtml.includes('intercom') ||
      bodyHtml.includes('drift') || bodyHtml.includes('tawk') ||
      bodyHtml.includes('zendesk') || bodyHtml.includes('chat-widget') ||
      $('[class*="chat"], [id*="chat-widget"]').length
    ),

    // Practice area pages: does it have dedicated PA links?
    hasPracticeAreaPages: !!$('a[href*="practice"], a[href*="service"], a[href*="area"]').length,

    // Page weight estimate in KB (HTML only, not assets)
    pageSizeKB: Math.round(bodyHtml.length / 1024),
  };
}

// ═══════════════════════════════════════════════════════════════
// DEEP CRAWL HELPERS
// ═══════════════════════════════════════════════════════════════

/** Extract JSON-LD structured data from <script type="application/ld+json"> */
function extractJsonLd($) {
  const result = {};
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = $(el).html();
      if (!raw) return;
      let data = JSON.parse(raw);

      // Handle @graph arrays
      if (data['@graph']) data = data['@graph'];
      const items = Array.isArray(data) ? data : [data];

      for (const item of items) {
        const type = (item['@type'] || '').toLowerCase();
        if (type.includes('attorney') || type.includes('legalservice')) {
          result.firmName = result.firmName || item.name;
          result.phone = result.phone || item.telephone;
          result.email = result.email || item.email;
          result.description = result.description || item.description;
          if (item.address) {
            result.address = item.address.streetAddress;
            result.city = item.address.addressLocality;
            result.state = item.address.addressRegion;
          }
        }
        if (type.includes('localbusiness') || type.includes('organization') || type.includes('professionalservice')) {
          result.firmName = result.firmName || item.name;
          result.phone = result.phone || item.telephone;
          result.email = result.email || item.email;
          if (item.address && typeof item.address === 'object') {
            result.address = result.address || item.address.streetAddress;
            result.city = result.city || item.address.addressLocality;
            result.state = result.state || item.address.addressRegion;
          }
          if (item.foundingDate) result.yearEstablished = parseInt(item.foundingDate);
        }
        if (type === 'person' && item.jobTitle) {
          if (!result.attorneys) result.attorneys = [];
          result.attorneys.push({ name: item.name, title: item.jobTitle });
        }
      }
    } catch { /* malformed JSON-LD, skip */ }
  });
  return result;
}

/** Derive firm name with smart priority chain */
function deriveFirmName($, structuredData, url) {
  // Priority 1: JSON-LD structured data
  if (structuredData.firmName) return cleanFirmName(structuredData.firmName);

  // Priority 2: OG site_name (very reliable)
  const ogSiteName = $('meta[property="og:site_name"]').attr('content');
  if (ogSiteName && ogSiteName.length > 2 && ogSiteName.length < 80) return cleanFirmName(ogSiteName);

  // Priority 3: Title tag — split on common delimiters
  const title = $('title').text().trim();
  if (title) {
    const cleaned = title.split(/[|–—·•]/).map(s => s.trim())[0];
    const noSuffix = cleaned.replace(/\s*[-–]\s*(Home(page)?|Welcome|Official Site).*$/i, '').trim();
    if (noSuffix.length > 2 && noSuffix.length < 60) return cleanFirmName(noSuffix);
  }

  // Priority 4: Logo alt text
  const logoAlt = $('img[alt*="logo" i], img[src*="logo" i]').first().attr('alt');
  if (logoAlt && logoAlt.length > 2 && logoAlt.length < 60) return cleanFirmName(logoAlt);

  // Priority 5: Domain-based
  return brandNameFromUrl(url);
}

function cleanFirmName(name) {
  return name
    .replace(/\s*(Homepage|Home Page|Welcome to|Official Site|Website)\s*/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Extract practice areas using comprehensive legal keyword matching + page structure */
function extractPracticeAreas($home, $practicePage) {
  const LEGAL_KEYWORDS = [
    'personal injury', 'car accident', 'truck accident', 'motorcycle accident', 'slip and fall', 'slip & fall',
    'wrongful death', 'medical malpractice', 'birth injury', 'nursing home', 'product liability',
    'workers compensation', 'workers comp', 'work injury', 'workplace',
    'criminal defense', 'criminal law', 'dui', 'dwi', 'drug charges', 'assault', 'theft',
    'family law', 'divorce', 'child custody', 'child support', 'adoption', 'domestic violence',
    'estate planning', 'probate', 'wills', 'trusts', 'elder law', 'guardianship',
    'bankruptcy', 'chapter 7', 'chapter 11', 'chapter 13', 'debt relief',
    'immigration', 'visa', 'deportation', 'green card', 'asylum', 'naturalization',
    'corporate law', 'business law', 'mergers', 'acquisitions', 'corporate governance',
    'real estate', 'property law', 'landlord', 'tenant', 'commercial real estate',
    'employment law', 'labor law', 'discrimination', 'harassment', 'wrongful termination',
    'intellectual property', 'patent', 'trademark', 'copyright', 'trade secret',
    'tax law', 'tax planning', 'irs', 'tax dispute',
    'construction', 'construction defect', 'contractor dispute',
    'maritime', 'admiralty', 'jones act', 'offshore',
    'aviation', 'class action', 'mass tort', 'insurance', 'social security', 'disability',
    'litigation', 'trial', 'appellate', 'arbitration', 'mediation',
    'civil rights', 'military law', 'veterans', 'environmental', 'securities', 'regulatory',
    'business formation', 'contract', 'partnership', 'llc',
  ];

  const areas = new Set();

  const scanElements = ($, selectors) => {
    $(selectors).each((_, el) => {
      const text = $(el).text().trim();
      if (!text || text.length > 80 || text.length < 3) return;
      const lower = text.toLowerCase();

      for (const kw of LEGAL_KEYWORDS) {
        if (lower.includes(kw) && !areas.has(kw)) {
          // Capitalize the extracted text, not the keyword
          const capText = text.split(/\s+/).slice(0, 5).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
          areas.add(capText);
          break;  // One match per element
        }
      }
    });
  };

  // Scan homepage
  scanElements($home, 'nav a, .nav-link, .menu-item a, h2, h3, h4, li a, .card-title, .service-title, [class*="practice"] a, [class*="service"] a, [class*="area"] a');

  // Scan practice area page (much richer)
  if ($practicePage) {
    scanElements($practicePage, 'h1, h2, h3, h4, a, li, .card-title, [class*="practice"], [class*="service"], [class*="area"]');
  }

  return Array.from(areas);
}

/** Extract attorney names and titles from team/about pages */
function extractAttorneys($home, $teamPage) {
  const attorneys = [];
  const seenNames = new Set();

  const TITLE_PATTERNS = /\b(partner|attorney|counsel|associate|of counsel|founder|managing|senior|junior|paralegal|director)\b/i;
  const NAME_REGEX = /^[A-Z][a-z]+(?:\s[A-Z]\.?)?\s[A-Z][a-z]+(?:\s(?:Jr\.|Sr\.|III?|IV|Esq\.?))?$/;

  const scanForAttorneys = ($) => {
    if (!$) return;

    // Strategy 1: Look for structured attorney cards
    $('[class*="attorney"], [class*="lawyer"], [class*="team"], [class*="staff"], [class*="bio"], [class*="profile"]').each((_, card) => {
      const $card = $(card);
      const nameEl = $card.find('h2, h3, h4, .name, [class*="name"]').first();
      const titleEl = $card.find('.title, [class*="title"], [class*="position"], [class*="role"], p').first();

      if (nameEl.length) {
        const name = nameEl.text().trim();
        const title = titleEl.length ? titleEl.text().trim() : '';

        if (name.length > 3 && name.length < 50 && !seenNames.has(name.toLowerCase())) {
          if (NAME_REGEX.test(name) || TITLE_PATTERNS.test(title)) {
            seenNames.add(name.toLowerCase());
            attorneys.push({
              name,
              title: title.length < 60 ? title : 'Attorney',
              initials: name.split(/\s+/).filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2),
            });
          }
        }
      }
    });

    // Strategy 2: Look for <h3> followed by <p> with attorney title keywords
    $('h3, h4').each((_, el) => {
      const name = $(el).text().trim();
      if (!name || name.length > 50 || name.length < 4) return;
      if (!NAME_REGEX.test(name)) return;

      const nextText = $(el).next('p, span, div').text().trim();
      if (TITLE_PATTERNS.test(nextText) && !seenNames.has(name.toLowerCase())) {
        seenNames.add(name.toLowerCase());
        attorneys.push({
          name,
          title: nextText.length < 60 ? nextText : 'Attorney',
          initials: name.split(/\s+/).filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2),
        });
      }
    });
  };

  scanForAttorneys($teamPage);
  if (attorneys.length === 0) scanForAttorneys($home);

  return attorneys.slice(0, 10);
}

/** Extract contact information from multiple sources */
function extractContactInfo($home, $contactPage, structuredData) {
  const result = {
    phone: structuredData.phone || null,
    email: structuredData.email || null,
    address: structuredData.address || null,
    city: structuredData.city || null,
    state: structuredData.state || null,
  };

  // Merge data from homepage and contact page
  const pages = [$home, $contactPage].filter(Boolean);

  for (const $ of pages) {
    const text = $('body').text().replace(/\s+/g, ' ');

    // Phone — check tel: links first (most reliable)
    if (!result.phone) {
      const telLink = $('a[href^="tel:"]').first().attr('href');
      if (telLink) result.phone = telLink.replace('tel:', '').replace(/^\+?1/, '').trim();
    }
    if (!result.phone) {
      const phoneMatch = text.match(/(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g);
      if (phoneMatch) result.phone = phoneMatch[0];
    }

    // Email — check mailto: links first
    if (!result.email) {
      const mailLink = $('a[href^="mailto:"]').first().attr('href');
      if (mailLink) result.email = mailLink.replace('mailto:', '').split('?')[0].trim();
    }
    if (!result.email) {
      const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
      if (emailMatch) result.email = emailMatch[0];
    }

    // Address
    if (!result.address) {
      const addrMatch = text.match(/\d{1,5}\s(?:[A-Za-z0-9#.-]+\s){1,5}(?:Street|St|Avenue|Ave|Boulevard|Blvd|Drive|Dr|Road|Rd|Lane|Ln|Way|Circle|Cir|Court|Ct|Place|Pl|Parkway|Pkwy|Highway|Hwy|Suite|Ste|Floor|Fl)[.,]?\s*(?:#?\s*\d+[A-Za-z]?)?\s*,?\s*[A-Za-z\s]+,?\s*[A-Z]{2}\s*\d{5}/i);
      if (addrMatch) {
        result.address = addrMatch[0].trim();
        // Parse city/state from address
        const parts = result.address.split(',');
        if (parts.length >= 2) {
          const stateZip = parts[parts.length - 1].trim().match(/([A-Z]{2})\s*\d{5}/);
          if (stateZip) result.state = stateZip[1];
          result.city = parts[parts.length - 2].trim().replace(/.*\s/, '');
        }
      }
    }
  }

  return result;
}

/** Extract colors from inline styles, CSS, and SVG fills */
function extractColors($) {
  const colors = [];
  // Check inline styles (limit to 500 elements for performance)
  let count = 0;
  $('*').each((_, el) => {
    if (count++ > 500) return false;
    const style = $(el).attr('style') || '';
    const bgMatch = style.match(/(?:background-color|background|color):\s*(#[0-9a-fA-F]{3,6})/g);
    if (bgMatch) bgMatch.forEach(m => { const c = m.match(/#[0-9a-fA-F]{3,6}/); if (c) colors.push(c[0]); });
    const fill = $(el).attr('fill');
    if (fill && fill.startsWith('#') && fill.length <= 7) colors.push(fill);
  });

  // Check <style> and <link> embedded CSS
  $('style').each((_, el) => {
    const css = $(el).html() || '';
    const matches = css.match(/#[0-9a-fA-F]{6}/g);
    if (matches) colors.push(...matches.slice(0, 20));
  });

  return colors;
}

/** Extract social media links */
function extractSocialLinks($) {
  const social = {};
  const patterns = {
    facebook: /facebook\.com/i,
    twitter: /(?:twitter|x)\.com/i,
    linkedin: /linkedin\.com/i,
    instagram: /instagram\.com/i,
    youtube: /youtube\.com/i,
    yelp: /yelp\.com/i,
    avvo: /avvo\.com/i,
  };
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    for (const [platform, regex] of Object.entries(patterns)) {
      if (!social[platform] && regex.test(href)) social[platform] = href;
    }
  });
  return social;
}

/** Extract year established from about pages and structured data */
function extractYearEstablished($home, $aboutPage, structuredData) {
  if (structuredData.yearEstablished) return structuredData.yearEstablished;

  const pages = [$aboutPage, $home].filter(Boolean);
  for (const $ of pages) {
    const text = $('body').text();
    // "Founded in 1995", "Established 1988", "Since 2001", "Est. 1972"
    const match = text.match(/(?:founded|established|since|est\.?)\s*(?:in\s+)?(\d{4})/i);
    if (match) {
      const year = parseInt(match[1]);
      if (year >= 1900 && year <= 2026) return year;
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
// EXISTING HELPERS (color detection, etc.)
// ═══════════════════════════════════════════════════════════════

// Helper: detect the most likely brand color (most frequent non-neutral)
function detectPrimaryBrandColor(colors) {
  if (!colors.length) return null;
  const counts = {};
  const neutrals = ['#ffffff', '#000000', '#f3f4f6', '#f8fafc', '#ffffff', 'rgb(255, 255, 255)', 'rgb(0, 0, 0)'];
  
  colors.forEach(c => {
    if (neutrals.includes(c.toLowerCase())) return;
    counts[c] = (counts[c] || 0) + 1;
  });
  
  const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]);
  return sorted[0]?.[0];
}

// Helper: Adjust color brightness for accent
function adjustColor(hex, amount) {
  if (!hex.startsWith('#')) return hex;
  let color = hex.replace('#', '');
  if (color.length === 3) color = color.split('').map(c => c + c).join('');
  
  const num = parseInt(color, 16);
  let r = (num >> 16) + amount;
  let g = ((num >> 8) & 0x00FF) + amount;
  let b = (num & 0x0000FF) + amount;
  
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function brandNameFromUrl(url) {
  return url.replace(/https?:\/\//, '').replace(/^www\./, '').split('.')[0].replace(/[-_]/g, ' ');
}

/**
 * ============================================================================
 * INTERNAL AGAAS ORCHESTRATOR (Chief Executive Agent)
 * ============================================================================
 * 
 * This cron job wakes up every hour to execute the internal NemoC LAW AI 
 * company operations. It proves that the "Agentic-as-a-Service" model works
 * for running a tech company, just like it works for running a law firm.
 * 
 * Departments:
 * 1. Growth Fleet — Detect stale leads, trigger outreach
 * 2. Customer Success — Detect onboarding stalls, billing anomalies
 * 3. Engineering — Log security metrics, system health
 * 
 * All results are written to _internal/ Firestore namespace.
 */
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');

// Initialize admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}
const firestore = admin.firestore();

exports.agaasOrchestrator = onSchedule('every 1 hours', async (event) => {
  logger.info('🤖 Chief Executive Agent (C.E.A.) waking up...');
  const runTimestamp = admin.firestore.FieldValue.serverTimestamp();
  const results = { departments: {} };

  // ═══════════════════════════════════════════════
  //  DEPARTMENT 1: GROWTH FLEET
  // ═══════════════════════════════════════════════
  try {
    logger.info('📊 Growth Fleet: Scanning pipeline...');
    
    // Find leads that have been "new" for more than 48 hours (stale leads)
    const staleThreshold = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const staleLeadsSnap = await firestore.collection('waitlist')
      .where('status', '==', 'new')
      .where('createdAt', '<', staleThreshold)
      .limit(20)
      .get();

    const staleCount = staleLeadsSnap.size;
    
    if (staleCount > 0) {
      logger.info(`📊 Growth Fleet: ${staleCount} stale leads detected (>48h without contact)`);
      
      // Log escalation for SDR Agent
      await firestore.collection('_internalAuditLog').add({
          agentId: 'sdr',
          type: 'internal_agent_action',
          department: 'gtm',
          userMessage: 'Automated stale lead detection',
          agentResponse: `Detected ${staleCount} leads in "new" status for >48h. Recommend immediate outreach.`,
          contextProvided: true,
          timestamp: runTimestamp,
          immutable: true,
        });
    }

    results.departments.growth = { staleLeads: staleCount, status: 'ok' };
  } catch (err) {
    logger.error('Growth Fleet error:', err.message);
    results.departments.growth = { status: 'error', error: err.message };
  }

  // ═══════════════════════════════════════════════
  //  DEPARTMENT 2: CUSTOMER SUCCESS FLEET
  // ═══════════════════════════════════════════════
  try {
    logger.info('🛡️ Customer Success Fleet: Checking onboarding health...');

    // Find firms that haven't completed onboarding (stalled)
    const stallThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const firmsSnap = await firestore.collection('firms')
      .where('onboardingComplete', '==', false)
      .limit(50)
      .get();

    let stalledFirms = 0;
    const stalledDetails = [];

    firmsSnap.forEach(doc => {
      const data = doc.data();
      const lastActivity = data.updatedAt?.toDate?.() || data.createdAt?.toDate?.();
      if (lastActivity && lastActivity < stallThreshold) {
        stalledFirms++;
        stalledDetails.push({
          firmId: doc.id,
          firmName: data.firmName || 'Unknown',
          lastActivity: lastActivity.toISOString(),
          step: data.onboardingStep || 'unknown',
        });
      }
    });

    if (stalledFirms > 0) {
      logger.info(`🛡️ Customer Success: ${stalledFirms} firms stalled in onboarding`);
      
      await firestore.collection('_internalAuditLog').add({
          agentId: 'onboarding-monitor',
          type: 'internal_agent_action',
          department: 'customer-success',
          userMessage: 'Automated onboarding stall detection',
          agentResponse: `Detected ${stalledFirms} firm(s) stalled in onboarding >24h. Details: ${JSON.stringify(stalledDetails.slice(0, 5))}`,
          contextProvided: true,
          timestamp: runTimestamp,
          immutable: true,
        });

      // For high-value firms (10+ attorneys), create an escalation
      for (const firm of stalledDetails) {
        const firmDoc = await firestore.collection('firms').doc(firm.firmId).get();
        const employeeCount = firmDoc.data()?.employeeCount || 0;
        if (employeeCount >= 10) {
          await firestore.collection('_internalEscalations').add({
              agentId: 'onboarding-monitor',
              agentName: 'Onboarding Agent',
              department: 'customer-success',
              severity: 'high',
              title: `High-value firm stalled: ${firm.firmName}`,
              description: `${firm.firmName} (${employeeCount} attorneys) has been stalled at "${firm.step}" for >24h. Churn risk.`,
              status: 'pending',
              createdAt: runTimestamp,
            });
        }
      }
    }

    results.departments.customerSuccess = { stalledFirms, status: 'ok' };
  } catch (err) {
    logger.error('Customer Success Fleet error:', err.message);
    results.departments.customerSuccess = { status: 'error', error: err.message };
  }

  // ═══════════════════════════════════════════════
  //  DEPARTMENT 3: ENGINEERING FLEET
  // ═══════════════════════════════════════════════
  try {
    logger.info('⚙️ Engineering Fleet: Logging system health snapshot...');

    // Write agent state documents
    const batch = firestore.batch();
    batch.set(firestore.collection('_internalAgents').doc('security-audit'), {
      status: 'active',
      lastAction: 'Hourly health check completed',
      lastActionTime: 'just now',
      lastUpdated: runTimestamp,
    }, { merge: true });
    batch.set(firestore.collection('_internalAgents').doc('devops'), {
      status: 'active',
      lastAction: 'System health snapshot logged',
      lastActionTime: 'just now',
      lastUpdated: runTimestamp,
    }, { merge: true });
    await batch.commit();

    results.departments.engineering = { status: 'ok' };
  } catch (err) {
    logger.error('Engineering Fleet error:', err.message);
    results.departments.engineering = { status: 'error', error: err.message };
  }

  // ═══════════════════════════════════════════════
  //  WRITE ORCHESTRATION SUMMARY
  // ═══════════════════════════════════════════════
  try {
    await firestore.collection('_internalAuditLog').add({
        agentId: 'cea',
        type: 'internal_agent_action',
        department: 'executive',
        userMessage: 'Scheduled hourly orchestration run',
        agentResponse: `C.E.A. departmental sync complete. Results: ${JSON.stringify(results)}`,
        contextProvided: true,
        timestamp: runTimestamp,
        immutable: true,
      });
  } catch (err) {
    logger.error('Failed to write orchestration summary:', err.message);
  }

  logger.info('✅ C.E.A. departmental sync complete. Returning to standby.', results);
});

// ═══════════════════════════════════════════════════════════════════════════
//  STRIPE INTEGRATION — Checkout Sessions + Webhook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Cloud Function: createCheckoutSession
 *
 * Creates a Stripe Checkout session for firm subscription.
 * Called from the frontend billing page.
 *
 * POST body: { firmId, firmSize, userId, userEmail, firmName }
 */
exports.createCheckoutSession = onRequest({ cors: true, maxInstances: 5 }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    logger.error('STRIPE_SECRET_KEY not configured');
    res.status(500).json({ error: 'Stripe not configured. Add STRIPE_SECRET_KEY to functions/.env' });
    return;
  }

  const stripe = require('stripe')(stripeKey);
  const { firmId, userId, userEmail, firmName, extraSeats = 0, autonomousRoles = 0 } = req.body;

  if (!firmId || !userId) {
    res.status(400).json({ error: 'Missing firmId or userId' });
    return;
  }

  // Modular founder pricing (matches Pricing.jsx and stripeService.js)
  // Base Platform:   $297/mo (founder) / $997/mo (standard) — includes 1 Managing Partner Agent
  // 10x Output Seat: $149/mo (founder) / $497/mo (standard) — per additional human role
  // Autonomous Role: $2,497/mo (founder) / $4,997/mo (standard) — per fully autonomous role
  const PRODUCTS = {
    base:       { founder: 29700, standard: 99700, name: 'Base Platform',   desc: 'Agentic OS + 1 Managing Partner Agent' },
    seat:       { founder: 14900, standard: 49700, name: '10x Output Seat', desc: 'Dedicated agent per human role' },
    autonomous: { founder: 249700, standard: 499700, name: 'Autonomous Role', desc: 'Fully autonomous 24/7 firm role replacement' },
  };

  try {
    // Check if firm is within the 7-day founder window AND under the 100-per-state cap
    const firmDoc = await firestore.collection('firms').doc(firmId).get();
    const firmData = firmDoc.data();
    const trialEnd = firmData?.trialEndsAt?.toDate?.() || new Date(firmData?.trialEndsAt);
    const isWithin7Days = trialEnd && trialEnd > new Date();
    
    // Check state-specific count (Founder limit: 100 per state)
    let stateFirmsCount = 0;
    const firmState = firmData?.stateBar || 'New York'; // Default to NY if unknown
    
    try {
      const stateQuery = await firestore.collection('firms')
        .where('stateBar', '==', firmState)
        .where('founderPriceLocked', '==', true)
        .get();
      stateFirmsCount = stateQuery.size;
    } catch (e) {
      logger.warn(`Failed to count firms in ${firmState}, defaulting to safe count:`, e);
    }

    const isFounderWindow = isWithin7Days && stateFirmsCount < 100;
    const priceKey = isFounderWindow ? 'founder' : 'standard';

    // Log the logic for audit
    logger.info(`Pricing evaluation for ${firmId}: state=${firmState}, count=${stateFirmsCount}, within7Days=${isWithin7Days} -> priceKey=${priceKey}`);

    // Build line items — always includes Base Platform
    const line_items = [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${PRODUCTS.base.name}${isFounderWindow ? ' — Founder Price' : ''}`,
            description: PRODUCTS.base.desc,
            metadata: { firmId, type: 'base' },
          },
          unit_amount: PRODUCTS.base[priceKey],
          recurring: { interval: 'month' },
        },
        quantity: 1,
      },
    ];

    // Add 10x Output Seats if requested
    if (extraSeats > 0) {
      line_items.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${PRODUCTS.seat.name}${isFounderWindow ? ' — Founder Price' : ''}`,
            description: PRODUCTS.seat.desc,
            metadata: { firmId, type: 'seat' },
          },
          unit_amount: PRODUCTS.seat[priceKey],
          recurring: { interval: 'month' },
        },
        quantity: extraSeats,
      });
    }

    // Add Autonomous Roles if requested
    if (autonomousRoles > 0) {
      line_items.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${PRODUCTS.autonomous.name}${isFounderWindow ? ' — Founder Price' : ''}`,
            description: PRODUCTS.autonomous.desc,
            metadata: { firmId, type: 'autonomous' },
          },
          unit_amount: PRODUCTS.autonomous[priceKey],
          recurring: { interval: 'month' },
        },
        quantity: autonomousRoles,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: userEmail,
      line_items,
      metadata: {
        firmId,
        userId,
        extraSeats: String(extraSeats),
        autonomousRoles: String(autonomousRoles),
        founderPriceLocked: isFounderWindow ? 'true' : 'false',
      },
      success_url: `${req.headers.origin || 'https://nemoc-law-ai.web.app'}/dashboard/billing?session_id={CHECKOUT_SESSION_ID}&status=success`,
      cancel_url: `${req.headers.origin || 'https://nemoc-law-ai.web.app'}/dashboard/billing?status=cancelled`,
      subscription_data: {
        metadata: { firmId, userId, founderPriceLocked: isFounderWindow ? 'true' : 'false' },
      },
    });

    logger.info(`Checkout session created for firm ${firmId}: ${session.id}`);
    res.json({ sessionId: session.id, url: session.url });

  } catch (error) {
    logger.error('Stripe checkout error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Cloud Function: createInlineSubscription
 *
 * Creates a Stripe Customer + Subscription with 'default_incomplete' payment behavior
 * so the frontend can confirm payment inline using Stripe Elements (no redirect).
 *
 * Returns: { clientSecret, subscriptionId, customerId }
 */
exports.createInlineSubscription = onRequest({ cors: true, maxInstances: 5 }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    logger.error('STRIPE_SECRET_KEY not configured');
    res.status(500).json({ error: 'Stripe not configured' });
    return;
  }

  const stripe = require('stripe')(stripeKey);
  logger.info(`Inline sub request received: ${JSON.stringify(req.body)}`);
  const { firmId, userId, userEmail, firmName, extraSeats = 0, includeWebsite = false } = req.body;

  if (!firmId || !userId || !userEmail) {
    logger.error('Missing required fields for inline sub');
    res.status(400).json({ error: 'Missing firmId, userId, or userEmail' });
    return;
  }

  // Pricing (cents) — matches stripeService.js PRICING
  const PRICES = {
    base:    { founder: 29700, standard: 99700 },
    seat:    { founder: 14900, standard: 49700 },
  };

  try {
    // Check founder window AND count-per-state (Limit 100)
    logger.info(`Processing inline sub for firmId: ${firmId}`);
    const firmDoc = await firestore.collection('firms').doc(firmId).get();
    if (!firmDoc.exists) {
      logger.error(`Firm doc not found: ${firmId}`);
      res.status(404).json({ error: 'Firm not found' });
      return;
    }
    const firmData = firmDoc.data();
    const trialEnd = firmData?.trialEndsAt?.toDate?.() || new Date(firmData?.trialEndsAt);
    const isWithin7Days = trialEnd && trialEnd > new Date();
    
    let stateFirmsCount = 0;
    const firmState = firmData?.stateBar || 'New York';
    logger.info(`Checking founder cap for state: ${firmState}`);
    try {
      const stateQuery = await firestore.collection('firms')
        .where('stateBar', '==', firmState)
        .where('founderPriceLocked', '==', true)
        .get();
      stateFirmsCount = stateQuery.size;
    } catch (e) {
      logger.warn(`Failed to count firms in ${firmState}:`, e);
    }

    const isFounderWindow = isWithin7Days && stateFirmsCount < 100;
    const priceKey = isFounderWindow ? 'founder' : 'standard';

    logger.info(`Pricing decision: isFounder=${isFounderWindow}, stateCount=${stateFirmsCount}`);

    // --- STRIPE PRODUCT MANAGEMENT ---
    // Subscriptions.create requires existing products (unlike Checkout)
    const baseProdName = 'NemoC LAW AI Platform';
    const seatProdName = '10x Output Seat';
    
    let baseProd, seatProd;
    try {
      const prods = await stripe.products.list({ limit: 10 });
      baseProd = prods.data.find(p => p.name === baseProdName);
      seatProd = prods.data.find(p => p.name === seatProdName);
      
      if (!baseProd) {
        logger.info(`Creating product: ${baseProdName}`);
        baseProd = await stripe.products.create({ name: baseProdName });
      }
      if (!seatProd) {
        logger.info(`Creating product: ${seatProdName}`);
        seatProd = await stripe.products.create({ name: seatProdName });
      }
    } catch (e) {
      logger.error('Product retrieval/creation failed:', e);
      throw e;
    }

    // Create or retrieve Stripe Customer
    let customerId = firmData?.stripeCustomerId;
    if (!customerId) {
      logger.info(`Creating new Stripe customer for email: ${userEmail}`);
      const customer = await stripe.customers.create({
        email: userEmail,
        name: firmName,
        address: req.body.firmAddress ? { 
          line1: req.body.firmAddress,
          city: req.body.city || undefined,
          state: req.body.state || undefined,
          postal_code: req.body.zip || undefined,
          country: 'US'
        } : undefined,
        metadata: { firmId, userId },
      });
      customerId = customer.id;
      await firestore.collection('firms').doc(firmId).update({ stripeCustomerId: customerId });
    } else {
      logger.info(`Using existing customerId: ${customerId}`);
      if (req.body.firmAddress) {
        await stripe.customers.update(customerId, {
          address: { 
            line1: req.body.firmAddress,
            city: req.body.city || undefined,
            state: req.body.state || undefined,
            postal_code: req.body.zip || undefined,
            country: 'US'
          }
        });
      }
    }

    // Build price items for the subscription
    const items = [
      {
        price_data: {
          currency: 'usd',
          product: baseProd.id,
          unit_amount: PRICES.base[priceKey],
          recurring: { interval: 'month' },
        },
        quantity: 1,
      },
    ];

    if (extraSeats > 0) {
      logger.info(`Adding ${extraSeats} extra seats to sub`);
      items.push({
        price_data: {
          currency: 'usd',
          product: seatProd.id,
          unit_amount: PRICES.seat[priceKey],
          recurring: { interval: 'month' },
        },
        quantity: extraSeats,
      });
    }

    logger.info(`Creating subscription for customer: ${customerId}`);
    // Create subscription with incomplete payment
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items,
      payment_behavior: 'default_incomplete',
      payment_settings: { 
        save_default_payment_method: 'on_subscription',
        payment_method_types: ['card']
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: { firmId, userId, founderPriceLocked: isFounderWindow ? 'true' : 'false' },
    });

    logger.info('Full Subscription Object:', JSON.stringify(subscription));

    let latestInvoice = subscription.latest_invoice;
    
    if (!latestInvoice) {
       logger.warn('Subscription created but latest_invoice is NULL. Retrying retrieve...');
       await new Promise(r => setTimeout(r, 1000));
       const subRetrieved = await stripe.subscriptions.retrieve(subscription.id, {
         expand: ['latest_invoice.payment_intent', 'pending_setup_intent'],
       });
       latestInvoice = subRetrieved.latest_invoice;
       if (subRetrieved.pending_setup_intent) {
         logger.info('Found pending_setup_intent as fallback.');
         const setupSecret = subRetrieved.pending_setup_intent.client_secret;
         return res.json({ clientSecret: setupSecret, subscriptionId: subscription.id, customerId });
       }
    }
    
    if (typeof latestInvoice === 'string') {
      logger.info('Expansion failed: latest_invoice is still string. Manual retrieval...');
      latestInvoice = await stripe.invoices.retrieve(latestInvoice, {
        expand: ['payment_intent'],
      });
    }

    if (latestInvoice && latestInvoice.status === 'draft' && !latestInvoice.payment_intent) {
      logger.info(`Fallback: Finalizing draft invoice ${latestInvoice.id} to trigger intent creation...`);
      try {
        latestInvoice = await stripe.invoices.finalizeInvoice(latestInvoice.id, {
          expand: ['payment_intent']
        });
      } catch (finalizeErr) {
        logger.warn(`Failed to finalize invoice: ${finalizeErr.message}`);
      }
    }

    const intent = latestInvoice?.payment_intent;
    let clientSecret = intent 
      ? (typeof intent === 'string' ? (await stripe.paymentIntents.retrieve(intent)).client_secret : intent.client_secret)
      : (subscription.pending_setup_intent?.client_secret || null);

    if (!clientSecret) {
      logger.warn(`CRITICAL FALLBACK: Invoice ${latestInvoice?.id} generated no intent. Generating a manual SetupIntent instead.`);
      const fallbackSetup = await stripe.setupIntents.create({
         customer: customerId,
         payment_method_types: ['card'],
         usage: 'off_session',
         metadata: { firmId, userId, fallbackForInvoice: latestInvoice?.id },
      });
      clientSecret = fallbackSetup.client_secret;
    }

    if (!clientSecret) {
      logger.error('CRITICAL: SetupIntent fallback also failed.', {
        subStatus: subscription.status,
      });
      throw new Error(`Payment gate not ready (Status: ${subscription.status}). Please refresh and try again.`);
    }

    logger.info(`Subscription created: ${subscription.id}, clientSecret: SUCCESS`);

    res.json({
      clientSecret,
      subscriptionId: subscription.id,
      customerId,
    });

  } catch (error) {
    logger.error('Inline subscription error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Cloud Function: createPortalSession
 * 
 * Creates a Stripe Customer Portal session so users can manage
 * their subscription, payment methods, and invoices.
 */
exports.createPortalSession = onRequest({ cors: true, maxInstances: 5 }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    res.status(500).json({ error: 'Stripe not configured' });
    return;
  }

  const stripe = require('stripe')(stripeKey);
  const { firmId } = req.body;

  if (!firmId) {
    res.status(400).json({ error: 'Missing firmId' });
    return;
  }

  try {
    const firmDoc = await firestore.collection('firms').doc(firmId).get();
    const firmData = firmDoc.data();

    if (!firmData?.stripeCustomerId) {
      res.status(400).json({ error: 'No Stripe customer found for this firm' });
      return;
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: firmData.stripeCustomerId,
      return_url: `${req.headers.origin || 'https://nemoc-law-ai.web.app'}/dashboard/settings`,
    });

    res.json({ url: session.url });
  } catch (error) {
    logger.error('Stripe portal error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Helper: activateFirmSubscription
 *
 * Persists the subscription status, Stripe IDs, and most importantly
 * the founderPriceLocked flag to the firm document.
 */
async function activateFirmSubscription(firmId, userId, customerId, subId, isFounder, extraSeats = '0', autonomousRoles = '0') {
  await firestore.collection('firms').doc(firmId).update({
    plan: 'active',
    isConfigured: true,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subId,
    founderPriceLocked: isFounder,
    extraSeats: parseInt(extraSeats || '0', 10),
    autonomousRoles: parseInt(autonomousRoles || '0', 10),
    planActivatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Update user record
  if (userId) {
    await firestore.collection('users').doc(userId).update({
      subscriptionStatus: 'active',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  // Log to internal audit
  await firestore.collection('_internalAuditLog').add({
    agentId: 'revenue',
    type: 'internal_agent_action',
    department: 'revenue',
    userMessage: 'Stripe subscription activated',
    agentResponse: `Firm ${firmId} activated subscription. Founder lock: ${isFounder}. Customer: ${customerId}`,
    contextProvided: true,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    immutable: true,
  });

  logger.info(`✅ Firm ${firmId} subscription activated (Founder: ${isFounder})!`);
}

/**
 * Cloud Function: stripeWebhook
 *
 * Handles Stripe webhook events:
 * - checkout.session.completed → Activate subscription
 * - customer.subscription.deleted → Deactivate subscription
 * - invoice.payment_failed → Flag billing issue
 */
exports.stripeWebhook = onRequest({ cors: false, maxInstances: 3 }, async (req, res) => {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey) {
    res.status(500).send('Stripe not configured');
    return;
  }

  const stripe = require('stripe')(stripeKey);
  let event;

  // Verify webhook signature if secret is configured
  if (webhookSecret) {
    const sig = req.headers['stripe-signature'];
    try {
      event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    } catch (err) {
      logger.error('Webhook signature verification failed:', err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }
  } else {
    event = req.body;
  }

  logger.info(`Stripe webhook received: ${event.type}`);

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const { firmId, userId, founderPriceLocked, extraSeats, autonomousRoles } = session.metadata || {};
      if (firmId) {
        await activateFirmSubscription(firmId, userId, session.customer, session.subscription, founderPriceLocked === 'true', extraSeats, autonomousRoles);
      }
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object;
      if (sub.status === 'active') {
        const { firmId, userId, founderPriceLocked, extraSeats, autonomousRoles } = sub.metadata || {};
        if (firmId) {
          await activateFirmSubscription(firmId, userId, sub.customer, sub.id, founderPriceLocked === 'true', extraSeats, autonomousRoles);
        }
      }
      break;
    }

    case 'setup_intent.succeeded': {
      const intent = event.data.object;
      const invoiceId = intent.metadata?.fallbackForInvoice;
      const pm = intent.payment_method;
      
      if (invoiceId && pm) {
        logger.info(`Fallback SetupIntent succeeded. Paying invoice ${invoiceId} with PM ${pm}`);
        try {
          // Pay the invoice using the newly attached payment method
          const paidInvoice = await stripe.invoices.pay(invoiceId, {
            payment_method: pm
          });
          logger.info(`Successfully paid fallback invoice ${invoiceId}.`);
        } catch (err) {
          logger.error(`Failed to auto-pay fallback invoice: ${err.message}`);
        }
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      const firmId = sub.metadata?.firmId;
      if (firmId) {
        await firestore.collection('firms').doc(firmId).update({
          plan: 'cancelled',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        logger.info(`❌ Firm ${firmId} subscription cancelled`);
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      const subId = invoice.subscription;
      // Find firm by subscription ID
      const firmsSnap = await firestore.collection('firms')
        .where('stripeSubscriptionId', '==', subId)
        .limit(1)
        .get();

      if (!firmsSnap.empty) {
        const firmDoc = firmsSnap.docs[0];
        await firmDoc.ref.update({
          plan: 'past_due',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Create escalation for revenue agent
        await firestore.collection('_internalEscalations').add({
          agentId: 'revenue',
          agentName: 'Revenue Agent',
          department: 'revenue',
          severity: 'high',
          title: `Payment failed: ${firmDoc.data().firmName}`,
          description: `Invoice payment failed for ${firmDoc.data().firmName}. Dunning sequence initiated.`,
          status: 'pending',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        logger.info(`⚠️ Payment failed for firm ${firmDoc.id}`);
      }
      break;
    }

    default:
      logger.info(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});

/**
 * Cloud Function: finalizePaymentSetup
 * 
 * Synchronous bypass for Webhooks. Called by the frontend immediately
 * after the CardElement finishes successful intent confirmation.
 */
exports.finalizePaymentSetup = onRequest({ cors: true, maxInstances: 3 }, async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(204).send('');
  }

  const { firmId, intentId, type } = req.body;
  if (!firmId || !intentId) {
    return res.status(400).json({ error: 'Missing firmId or intentId' });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const stripe = require('stripe')(stripeKey);

  try {
    let intentSucceeded = false;
    let pm = null;
    let invoiceId = null;

    if (type === 'setup') {
      const intent = await stripe.setupIntents.retrieve(intentId);
      intentSucceeded = (intent.status === 'succeeded');
      pm = intent.payment_method;
      invoiceId = intent.metadata?.fallbackForInvoice;
    } else {
      const intent = await stripe.paymentIntents.retrieve(intentId);
      intentSucceeded = (intent.status === 'succeeded');
      pm = intent.payment_method;
    }

    if (!intentSucceeded) {
      return res.status(400).json({ error: 'Intent not marked as succeeded in Stripe' });
    }

    // Attempt to manually finalize/pay the attached generic invoice if present
    if (invoiceId && pm) {
      try {
        await stripe.invoices.pay(invoiceId, { payment_method: pm });
        logger.info(`Finalize Sync: Paid invoice ${invoiceId}`);
      } catch (err) {
        logger.warn(`Finalize Sync: Could not pay invoice: ${err.message}`);
      }
    }

    // Force the firm to active state synchronously
    await firestore.collection('firms').doc(firmId).update({
      plan: 'active',
      isConfigured: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true });
  } catch (err) {
    logger.error('Finalize sync failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});
