/**
 * Firm Content Intelligence Engine
 *
 * This module builds website content from live scrape/user-provided facts only.
 * It must not invent reviews, attorneys, phone numbers, success rates, years in
 * business, office locations, or case outcomes.
 */

const DEFAULT_COLORS = {
  primary: '#1f2937',
  accent: '#76b900',
  bg: '#ffffff',
  warm: '#f8fafc',
  text: '#111827',
};

function normalizeDomain(website = '') {
  if (!website) return '';
  try {
    const url = website.startsWith('http') ? new URL(website) : new URL(`https://${website}`);
    return url.hostname.replace(/^www\./, '').toLowerCase();
  } catch (_err) {
    return String(website).replace(/https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '').toLowerCase();
  }
}

function domainToFirmName(domain = '') {
  const base = domain.split('.')[0] || 'Law Firm';
  return base
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function initialsFromName(name = '') {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'LF';
}

function normalizePracticeArea(entry) {
  if (!entry) return null;
  if (typeof entry === 'string') {
    const name = entry.trim();
    return name ? { name, description: 'Practice details not detected from the live crawl.' } : null;
  }
  if (typeof entry === 'object' && entry.name) {
    return {
      name: String(entry.name).trim(),
      description: entry.description || 'Practice details not detected from the live crawl.',
    };
  }
  return null;
}

function normalizeAttorney(entry) {
  if (!entry?.name) return null;
  const name = String(entry.name).trim();
  if (!name) return null;
  return {
    name,
    title: entry.title || 'Attorney',
    initials: entry.initials || initialsFromName(name),
    bio: entry.bio || '',
  };
}

function normalizeReview(entry) {
  if (!entry?.text || !entry?.author) return null;
  const rating = Number(entry.rating);
  return {
    author: String(entry.author),
    rating: Number.isFinite(rating) ? Math.max(1, Math.min(5, Math.round(rating))) : 5,
    text: String(entry.text),
    date: entry.date || '',
  };
}

function buildContactMethods(seed) {
  const methods = [];
  if (seed.phone) methods.push({ value: seed.phone, label: 'Phone' });
  if (seed.email) methods.push({ value: seed.email, label: 'Email' });
  if (seed.address) methods.push({ value: seed.address, label: 'Office' });
  return methods;
}

function buildStats(seed, practiceAreas, attorneys, contactMethods) {
  const stats = [];
  if (practiceAreas.length) stats.push({ value: String(practiceAreas.length), label: 'Practice areas detected' });
  if (attorneys.length) stats.push({ value: String(attorneys.length), label: 'Attorneys detected' });
  if (contactMethods.length) stats.push({ value: String(contactMethods.length), label: 'Contact methods detected' });
  if (seed.yearEstablished) stats.push({ value: String(seed.yearEstablished), label: 'Year established' });
  return stats;
}

function buildTestimonials(seed) {
  const explicitReviews = Array.isArray(seed.reviews) ? seed.reviews : [];
  const googleReviews = Array.isArray(seed.googleReviews?.reviews) ? seed.googleReviews.reviews : [];
  return [...explicitReviews, ...googleReviews]
    .map(normalizeReview)
    .filter(Boolean)
    .slice(0, 3)
    .map(review => ({
      text: `"${review.text}"`,
      name: review.author,
      initials: initialsFromName(review.author),
      role: review.date ? `Verified review - ${review.date}` : 'Verified review',
      isGenerated: false,
    }));
}

function buildGoogleReviews(seed) {
  const rawReviews = Array.isArray(seed.googleReviews?.reviews) ? seed.googleReviews.reviews : [];
  const reviews = rawReviews.map(normalizeReview).filter(Boolean);
  const rating = Number(seed.googleReviews?.rating);
  const totalReviews = Number(seed.googleReviews?.totalReviews);

  if (!reviews.length && !Number.isFinite(rating) && !Number.isFinite(totalReviews)) return null;

  return {
    rating: Number.isFinite(rating) ? rating : null,
    totalReviews: Number.isFinite(totalReviews) ? totalReviews : reviews.length,
    reviews,
  };
}

function buildServiceAreas(seed) {
  const explicit = Array.isArray(seed.serviceAreas) ? seed.serviceAreas : [];
  return explicit.map(area => String(area).trim()).filter(Boolean);
}

function buildContentGaps(seed, practiceAreas, attorneys, testimonials, contactMethods) {
  const diagnostics = seed.diagnostics || {};
  const gaps = [];

  const addGap = (id, category, severity, title, description, autoFixed = false) => {
    gaps.push({ id, category, severity, title, description, autoFixed });
  };

  if (!practiceAreas.length) {
    addGap(
      'practice_areas_missing',
      'Content',
      'high',
      'Practice areas not detected',
      'The live crawl did not find a reliable practice-area list. Add verified practice areas before publishing.'
    );
  }

  if (!attorneys.length) {
    addGap(
      'attorneys_missing',
      'Trust',
      'medium',
      'Attorney roster not detected',
      'No attorney names or bios were detected from the crawl. Add verified team data before publishing.'
    );
  }

  if (!testimonials.length) {
    addGap(
      'reviews_missing',
      'Social Proof',
      'medium',
      'Verified reviews not detected',
      'No verified reviews were available in the live data. The generated site will not display fabricated reviews.'
    );
  }

  if (!contactMethods.length) {
    addGap(
      'contact_missing',
      'Conversion',
      'high',
      'Contact details not detected',
      'No phone, email, or office address was detected. Add verified contact information before launch.'
    );
  }

  if (diagnostics.hasViewport === false) {
    addGap(
      'mobile_viewport_missing',
      'Technical SEO',
      'high',
      'Mobile viewport missing on source site',
      'The source site appears to lack a mobile viewport tag. The generated site includes responsive viewport markup.',
      true
    );
  }

  if (diagnostics.hasSchemaMarkup === false) {
    addGap(
      'schema_missing',
      'Technical SEO',
      'medium',
      'Structured data missing on source site',
      'The source site did not expose structured data. Add verified firm fields before publishing schema.',
      false
    );
  }

  if (diagnostics.hasContactForm === false) {
    addGap(
      'contact_form_missing',
      'Conversion',
      'medium',
      'Contact form missing on source site',
      'The generated site includes a contact form shell, but lead delivery must be connected before publishing.',
      false
    );
  }

  return gaps;
}

export function generateFirmContent(websiteOrSeed, maybeSeed = null) {
  const isUrl = typeof websiteOrSeed === 'string';
  const website = isUrl ? websiteOrSeed : (websiteOrSeed?.website || '');
  const seedData = (isUrl ? maybeSeed : websiteOrSeed) || {};

  const domain = normalizeDomain(website || seedData.website || '');
  const firmName = seedData.firmName || seedData.name || domainToFirmName(domain);
  const practiceAreas = (seedData.practiceAreas || []).map(normalizePracticeArea).filter(Boolean);
  const practiceAreaNames = practiceAreas.map(area => area.name);
  const attorneys = (seedData.attorneys || []).map(normalizeAttorney).filter(Boolean);
  const testimonials = buildTestimonials(seedData);
  const googleReviews = buildGoogleReviews(seedData);
  const contactMethods = buildContactMethods(seedData);
  const serviceAreas = buildServiceAreas(seedData);
  const stats = buildStats(seedData, practiceAreas, attorneys, contactMethods);
  const contentGaps = buildContentGaps(seedData, practiceAreas, attorneys, testimonials, contactMethods);

  const primaryPractice = practiceAreaNames[0] || 'Legal Services';
  const description =
    seedData.description ||
    seedData.summary ||
    `Verified website content for ${firmName} is incomplete. Add approved firm copy before publishing.`;

  return {
    firmName,
    tagline: seedData.tagline || primaryPractice,
    description,
    hero: {
      main: firmName,
      em: primaryPractice,
    },
    stats,
    practiceAreas,
    practiceAreaNames,
    attorneys,
    testimonials,
    googleReviews,
    yearEstablished: seedData.yearEstablished || null,
    stateContext: { nickname: seedData.stateBar || seedData.state || '' },
    colors: seedData.scrapedColors || seedData._scrapedColors || DEFAULT_COLORS,
    matchedCategory: primaryPractice,
    contentGaps,
    serviceAreas,
    phone: seedData.phone || '',
    email: seedData.email || '',
    address: seedData.address || '',
    city: seedData.city && (seedData.stateBar || seedData.state)
      ? `${seedData.city}, ${seedData.stateBar || seedData.state}`
      : (seedData.city || seedData.stateBar || seedData.state || ''),
    isKnownFirm: false,
    dataCompleteness: {
      hasPracticeAreas: practiceAreas.length > 0,
      hasAttorneys: attorneys.length > 0,
      hasContact: contactMethods.length > 0,
      hasReviews: testimonials.length > 0 || !!googleReviews,
    },
  };
}
