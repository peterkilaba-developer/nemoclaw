import { Helmet } from 'react-helmet-async';

const SITE_URL = 'https://nemoc-law.ai';
const SITE_NAME = 'NemoC LAW AI';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

/**
 * SEO Head component — sets per-page title, meta, OG, Twitter, and JSON-LD structured data.
 * Usage: <SEO title="About" description="..." />
 */
export default function SEO({
  title,
  description = "We built an Agentic AI Operating System and secured an entire law firm inside it. Experience the ultimate HITL OS powered by NVIDIA NemoClaw with a zero data leak guarantee. Pricing at $297/mo.",
  path = '',
  ogImage = DEFAULT_OG_IMAGE,
  ogType = 'website',
  noindex = false,
  structuredData,
}) {
  const fullTitle = title
    ? `${title} | ${SITE_NAME}`
    : `${SITE_NAME} — Agentic HITL OS | Secured by NVIDIA NemoClaw`;
  const canonicalUrl = `${SITE_URL}${path}`;

  return (
    <Helmet>
      {/* Core */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_US" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* JSON-LD Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
}

/**
 * Pre-built structured data generators
 */
export const structuredDataTemplates = {
  organization: () => ({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'NemoC LAW AI',
    url: SITE_URL,
    logo: `${SITE_URL}/logos/wordmark.svg`,
    description: "The first Agentic-as-a-Service (AgaaS) platform for law firms. An Agentic HITL OS secured by NVIDIA NemoClaw.",
    foundingDate: '2026',
    sameAs: [],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'contact@nemoc-law.ai',
      contactType: 'sales',
    },
  }),

  softwareApplication: () => ({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'NemoC LAW AI',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: "We built an Agentic AI Operating System and secured an entire law firm inside it.",
    offers: {
      '@type': 'AggregateOffer',
      lowPrice: '297',
      highPrice: '999',
      priceCurrency: 'USD',
      offerCount: '3',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      reviewCount: '1',
      bestRating: '5',
    },
  }),

  faqPage: (faqs) => ({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }),

  breadcrumb: (items) => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  }),
};
