/**
 * Generates a law firm website from verified configuration data.
 * Optimized for Answer Engine Optimization (AEO) and Generative Engine Optimization (GEO).
 */

export function generateCustomWebsite(config = {}, domain) {
  const firmName = text(config.firmName || 'Law Firm');
  const tagline = text(config.tagline || 'Legal Services');
  const description = text(config.description || 'Verified firm content has not been provided yet.');
  const phone = text(config.phone || '');
  const email = text(config.email || '');
  const address = text(config.address || '');
  const city = text(config.city || '');
  const heroImage = validImageUrl(config.heroImage);
  const attorneys = normalizeList(config.attorneys);
  const practiceCards = normalizePracticeAreas(config.practiceAreasWithDesc || config.practiceAreas);
  const stats = normalizeStats(config.stats);
  const testimonials = normalizeTestimonials(config.testimonials);
  const googleReviews = normalizeGoogleReviews(config.googleReviews);
  const serviceAreas = normalizeList(config.serviceAreas).map(area => text(area));
  const yearEstablished = config.yearEstablished ? text(config.yearEstablished) : '';
  const colors = config.colors || {};
  const primary = validHex(colors.primary) || '#0f172a'; // Deep Navy default
  const accent = validHex(colors.accent) || '#d4af37'; // Gold default
  const bg = validHex(colors.bg) || '#ffffff';
  const warm = validHex(colors.warm) || '#f8fafc';
  const primaryLight = adjustBrightness(primary, 28);
  const heroDeep = adjustBrightness(primary, -42);
  const heroBackground = heroImage
    ? `linear-gradient(120deg, rgba(8,14,26,.92) 0%, rgba(8,14,26,.72) 52%, rgba(8,14,26,.56) 100%), url('${heroImage}') center/cover no-repeat`
    : `radial-gradient(115% 120% at 82% 8%, ${adjustBrightness(primary, 22)} 0%, rgba(0,0,0,0) 52%), linear-gradient(135deg, ${primary} 0%, ${heroDeep} 60%, #060b15 100%)`;
  const initials = initialsFromName(firmName);
  const contactLinks = buildContactLinks({ phone, email, address, city });
  const hasContact = Boolean(phone || email || address);
  const canonicalDomain = text(domain || '').replace(/https?:\/\//, '').split('/')[0];
  const canonicalUrl = canonicalDomain ? `https://${canonicalDomain}` : '';
  const jsonLd = generateJsonLd(config, canonicalDomain, { firmName, phone, email, address, city, serviceAreas, practiceCards });
  const authorityStats = buildAuthorityStats({ stats, yearEstablished, practiceCards, attorneys, googleReviews });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(firmName)} — ${escapeHtml(tagline)}</title>
<meta name="description" content="${escapeHtml(description.slice(0, 160))}">
<meta name="robots" content="index, follow">
<meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtml(firmName)}">
<meta property="og:description" content="${escapeHtml(description.slice(0, 160))}">
${canonicalUrl ? `<meta property="og:url" content="${escapeAttr(canonicalUrl)}">` : ''}
${canonicalUrl ? `<link rel="canonical" href="${escapeAttr(canonicalUrl)}">` : ''}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap" rel="stylesheet">
${jsonLd}
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--primary:${primary};--primary-light:${primaryLight};--accent:${accent};--text:#3f4754;--heading:#0f172a;--muted:#64748b;--bg:${bg};--warm:${warm};--border:#e7e3da;--ink:#0b1626;font-family:'Inter',sans-serif}
html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--text);line-height:1.75;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
h1,h2,h3,h4,h5,h6{font-family:'Playfair Display',serif;color:var(--heading);line-height:1.15;font-weight:700;letter-spacing:-.01em}
p{text-wrap:pretty}
a{color:inherit;text-decoration:none;transition:color .2s ease}
img{max-width:100%;display:block}
.eyebrow-rule{display:inline-flex;align-items:center;gap:12px;color:var(--accent);font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.16em;margin-bottom:18px}
.eyebrow-rule::before{content:"";width:32px;height:1px;background:var(--accent)}
/* Header */
.header{position:sticky;top:0;z-index:30;background:rgba(255,255,255,.86);border-bottom:1px solid var(--border);backdrop-filter:saturate(140%) blur(12px)}
.header-inner{max-width:1180px;margin:0 auto;height:78px;display:flex;align-items:center;justify-content:space-between;padding:0 24px}
.logo{display:flex;align-items:center;gap:14px;font-weight:700;font-size:1.3rem;color:var(--heading);font-family:'Playfair Display',serif;letter-spacing:-.02em}
.logo-mark{width:42px;height:42px;background:var(--primary);color:var(--accent);display:grid;place-items:center;font-size:.95rem;font-family:'Inter',sans-serif;font-weight:800;letter-spacing:.02em;box-shadow:0 6px 18px rgba(15,23,42,.18)}
.nav{display:flex;align-items:center;gap:34px;font-size:.92rem;color:var(--text);font-weight:500}
.nav a:not(.nav-cta){position:relative}
.nav a:not(.nav-cta)::after{content:"";position:absolute;left:0;bottom:-6px;width:0;height:2px;background:var(--accent);transition:width .25s ease}
.nav a:not(.nav-cta):hover{color:var(--heading)}
.nav a:not(.nav-cta):hover::after{width:100%}
.nav-cta{padding:11px 22px;background:var(--primary);color:#fff;font-weight:600;border:1px solid var(--primary);border-radius:2px;transition:all .2s}
.nav-cta:hover{background:var(--primary-light);color:#fff;transform:translateY(-1px)}
.nav-toggle{display:none;background:none;border:none;cursor:pointer;color:var(--heading);padding:8px}
/* Hero */
.hero{position:relative;color:#fff;padding:148px 24px 132px;overflow:hidden;background:${heroBackground}}
.hero::before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px);background-size:100% 56px;opacity:.5;pointer-events:none}
.hero::after{content:"";position:absolute;inset:0;background:radial-gradient(120% 80% at 80% 0%, transparent 40%, rgba(6,11,21,.5) 100%);pointer-events:none}
.hero-inner{position:relative;z-index:2;max-width:1180px;margin:0 auto;display:grid;grid-template-columns:minmax(0,1fr);gap:40px}
.hero-copy{max-width:760px}
.hero .eyebrow{display:inline-flex;align-items:center;gap:10px;margin-bottom:26px;padding:7px 16px;border:1px solid rgba(255,255,255,.22);border-radius:999px;color:var(--accent);font-size:.74rem;font-weight:700;text-transform:uppercase;letter-spacing:.14em;background:rgba(255,255,255,.04)}
.hero h1{font-size:clamp(2.6rem,5.4vw,4.4rem);color:#fff;margin-bottom:22px;line-height:1.06}
.hero p{font-size:1.18rem;max-width:620px;margin:0 0 36px;color:rgba(255,255,255,.82)}
.hero-actions{display:flex;flex-wrap:wrap;gap:14px}
.hero-trust{display:flex;flex-wrap:wrap;gap:26px;margin-top:40px;padding-top:30px;border-top:1px solid rgba(255,255,255,.14)}
.hero-trust .ht{display:flex;flex-direction:column;gap:2px}
.hero-trust .ht b{font-family:'Playfair Display',serif;font-size:1.7rem;color:#fff;font-weight:700}
.hero-trust .ht span{font-size:.78rem;text-transform:uppercase;letter-spacing:.06em;color:rgba(255,255,255,.6)}
.stars{color:var(--accent);letter-spacing:2px;font-size:1rem}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:54px;padding:0 30px;border:1px solid rgba(255,255,255,.32);font-weight:600;font-size:1rem;border-radius:2px;transition:all .2s;background:transparent;color:#fff}
.btn:hover{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.6)}
.btn.primary{background:var(--accent);border-color:var(--accent);color:var(--ink)}
.btn.primary:hover{filter:brightness(1.08);transform:translateY(-1px)}
.btn.disabled{opacity:.5;cursor:not-allowed}
/* Sections */
.section{padding:104px 24px}
.section.warm{background:var(--warm)}
.section.ink{background:var(--ink);color:rgba(255,255,255,.78)}
.section-inner{max-width:1180px;margin:0 auto}
.section-head{max-width:720px;margin-bottom:56px}
.label{color:var(--accent);font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.16em;margin-bottom:14px;display:inline-flex;align-items:center;gap:12px}
.label::before{content:"";width:28px;height:1px;background:var(--accent)}
.title{font-size:clamp(2rem,3.6vw,2.9rem);margin-bottom:20px}
.desc{color:var(--muted);max-width:680px;font-size:1.08rem}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:26px}
/* Practice cards */
.card{position:relative;background:#fff;border:1px solid var(--border);padding:34px 32px;transition:transform .25s ease,box-shadow .25s ease,border-color .25s ease;overflow:hidden}
.card::before{content:"";position:absolute;left:0;top:0;height:3px;width:100%;background:var(--accent);transform:scaleX(0);transform-origin:left;transition:transform .3s ease}
.card:hover{transform:translateY(-6px);box-shadow:0 20px 44px rgba(15,23,42,.1);border-color:transparent}
.card:hover::before{transform:scaleX(1)}
.card .idx{font-family:'Playfair Display',serif;font-size:.95rem;color:var(--accent);font-weight:700;letter-spacing:.04em;margin-bottom:14px;display:block}
.card h3{font-size:1.32rem;margin-bottom:12px}
.card p{color:var(--muted);font-size:.98rem}
.card .more{margin-top:18px;display:inline-flex;align-items:center;gap:6px;color:var(--primary);font-weight:600;font-size:.86rem;text-transform:uppercase;letter-spacing:.05em}
/* Team */
.team-card{text-align:left;border:1px solid var(--border);background:#fff;padding:0;overflow:hidden;transition:transform .25s ease,box-shadow .25s ease}
.team-card:hover{transform:translateY(-6px);box-shadow:0 20px 44px rgba(15,23,42,.1)}
.team-photo{width:100%;aspect-ratio:4/5;object-fit:cover;object-position:top;background:var(--primary);display:block}
.avatar{width:100%;aspect-ratio:4/5;background:linear-gradient(160deg,var(--primary),var(--ink));color:var(--accent);display:grid;place-items:center;font-weight:700;font-size:3.2rem;font-family:'Playfair Display',serif}
.team-content{padding:24px 26px 28px}
.team-card h3{margin-bottom:4px;font-size:1.25rem}
.team-card .small{color:var(--accent);font-weight:700;text-transform:uppercase;font-size:.72rem;letter-spacing:.08em;margin-bottom:14px;display:block}
.team-card p{color:var(--muted);font-size:.94rem}
/* Authority stats */
.authority-wrap{padding:0 24px;margin-top:-58px;position:relative;z-index:10}
.authority-panel{max-width:1180px;margin:0 auto;background:#fff;border:1px solid var(--border);padding:44px 32px;box-shadow:0 28px 60px rgba(15,23,42,.12);display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:24px;text-align:center}
.authority-panel .stat{position:relative;padding:6px 12px}
.authority-panel .stat:not(:last-child)::after{content:"";position:absolute;right:0;top:50%;transform:translateY(-50%);height:46px;width:1px;background:var(--border)}
.stat-value{font-size:2.5rem;font-family:'Playfair Display',serif;color:var(--primary);font-weight:700;margin-bottom:6px;line-height:1}
.stat-label{font-size:.8rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;font-weight:600}
/* FAQ */
.faq-grid{display:grid;gap:16px;max-width:860px}
.faq-card{background:#fff;border:1px solid var(--border);padding:26px 28px;border-left:3px solid var(--accent);transition:box-shadow .2s ease}
.faq-card:hover{box-shadow:0 12px 30px rgba(15,23,42,.07)}
.faq-card h3{font-size:1.12rem;margin-bottom:10px;font-family:'Inter',sans-serif;font-weight:700;color:var(--heading)}
.faq-card p{color:var(--muted);font-size:.98rem}
/* Reviews */
.reviews-summary{display:inline-flex;align-items:center;gap:16px;background:#fff;border:1px solid var(--border);padding:16px 24px;margin-bottom:40px}
.reviews-summary .rs-score{font-family:'Playfair Display',serif;font-size:2rem;color:var(--primary);font-weight:700;line-height:1}
.reviews-summary .rs-meta{font-size:.86rem;color:var(--muted)}
.review-card{background:#fff;border:1px solid var(--border);padding:30px 30px 26px;display:flex;flex-direction:column;gap:16px}
.review-card .quote{font-size:1.04rem;color:var(--heading);line-height:1.6;font-style:italic}
.review-card .who{display:flex;align-items:center;gap:12px;margin-top:auto}
.review-card .who-avatar{width:42px;height:42px;border-radius:50%;background:var(--primary);color:var(--accent);display:grid;place-items:center;font-weight:700;font-size:.9rem;flex-shrink:0}
.review-card .who b{display:block;color:var(--heading);font-size:.92rem}
.review-card .who span{font-size:.78rem;color:var(--muted)}
/* Contact */
.contact-grid{display:grid;grid-template-columns:1fr 1fr;gap:40px}
.contact-item{padding:24px 26px;border:1px solid var(--border);background:#fff;display:flex;flex-direction:column;gap:6px;transition:border-color .2s ease,transform .2s ease}
a.contact-item:hover{border-color:var(--accent);transform:translateX(4px)}
.contact-item strong{color:var(--accent);font-size:.74rem;text-transform:uppercase;letter-spacing:.1em;font-weight:700}
.contact-item span{font-size:1.06rem;font-weight:500;color:var(--heading)}
.form-note{padding:38px;background:linear-gradient(165deg,var(--primary),var(--ink));color:#fff;display:flex;flex-direction:column;justify-content:center;position:relative;overflow:hidden}
.form-note::before{content:"";position:absolute;top:-40px;right:-40px;width:160px;height:160px;border:1px solid rgba(255,255,255,.08);border-radius:50%}
.form-note h3{color:var(--accent);margin-bottom:14px;font-size:1.4rem}
.form-note p{color:rgba(255,255,255,.82)}
/* CTA band */
.cta-band{background:linear-gradient(120deg,var(--primary),var(--ink));color:#fff;padding:80px 24px;text-align:center}
.cta-band .cta-inner{max-width:760px;margin:0 auto}
.cta-band h2{color:#fff;font-size:clamp(1.9rem,3.4vw,2.7rem);margin-bottom:18px}
.cta-band p{color:rgba(255,255,255,.8);font-size:1.1rem;margin-bottom:34px}
.cta-band .hero-actions{justify-content:center}
/* Footer */
.footer{background:#070d18;color:rgba(255,255,255,.6);padding:72px 24px 36px}
.footer-inner{max-width:1180px;margin:0 auto;display:grid;grid-template-columns:1.6fr 1fr 1fr;gap:40px}
.footer-brand .logo{color:#fff;margin-bottom:16px}
.footer-brand p{font-size:.9rem;max-width:340px}
.footer-col strong{color:#fff;display:block;margin-bottom:16px;font-family:'Inter',sans-serif;font-size:.8rem;text-transform:uppercase;letter-spacing:.1em}
.footer-col a,.footer-col span{display:block;font-size:.9rem;color:rgba(255,255,255,.58);margin-bottom:10px}
.footer-col a:hover{color:var(--accent)}
.footer-bottom{max-width:1180px;margin:48px auto 0;padding-top:24px;border-top:1px solid rgba(255,255,255,.1);display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;font-size:.8rem;color:rgba(255,255,255,.45)}
@media(max-width:860px){.footer-inner{grid-template-columns:1fr 1fr}.footer-brand{grid-column:1/-1}}
@media(max-width:768px){
  .nav{position:fixed;inset:78px 0 auto 0;flex-direction:column;align-items:stretch;gap:0;background:#fff;border-bottom:1px solid var(--border);padding:8px 0;box-shadow:0 16px 40px rgba(15,23,42,.12);transform:translateY(-12px);opacity:0;pointer-events:none;transition:all .22s ease}
  .nav.open{transform:translateY(0);opacity:1;pointer-events:auto}
  .nav a:not(.nav-cta){padding:14px 24px;border-bottom:1px solid var(--border)}
  .nav .nav-cta{margin:12px 24px;text-align:center}
  .nav-toggle{display:block}
  .contact-grid{grid-template-columns:1fr}
  .authority-wrap{margin-top:0;padding:0}
  .authority-panel{padding:32px 20px}
  .authority-panel .stat:not(:last-child)::after{display:none}
  .section{padding:68px 22px}
  .hero{padding:120px 22px 96px}
  .footer-inner{grid-template-columns:1fr}
}
</style>
</head>
<body>
<header class="header">
  <div class="header-inner">
    <a class="logo" href="#"><span class="logo-mark">${escapeHtml(initials)}</span>${escapeHtml(firmName)}</a>
    <button class="nav-toggle" id="nav-toggle" aria-label="Toggle navigation" aria-expanded="false">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
    </button>
    <nav class="nav" id="primary-nav">
      ${practiceCards.length ? '<a href="#practice">Practice Areas</a>' : ''}
      ${attorneys.length ? '<a href="#team">Attorneys</a>' : ''}
      ${testimonials.length || googleReviews ? '<a href="#reviews">Testimonials</a>' : ''}
      <a class="nav-cta" href="#contact">Contact Firm</a>
    </nav>
  </div>
</header>

<main>
  <section class="hero" id="speakable-content">
    <div class="hero-inner">
      <div class="hero-copy">
        <span class="eyebrow">${escapeHtml(tagline)}</span>
        <h1>${escapeHtml(firmName)}</h1>
        <p>${escapeHtml(description)}</p>
        <div class="hero-actions">
          ${phone ? `<a class="btn primary" href="tel:${escapeAttr(phone.replace(/[^+\d]/g, ''))}">Call ${escapeHtml(phone)}</a>` : ''}
          ${email ? `<a class="btn" href="mailto:${escapeAttr(email)}">Email the Firm</a>` : '<a class="btn" href="#contact">Request a Consultation</a>'}
          ${!hasContact ? '<span class="btn disabled">Contact details pending</span>' : ''}
        </div>
        ${renderHeroTrust({ yearEstablished, attorneys, googleReviews, serviceAreas })}
      </div>
    </div>
  </section>

  ${authorityStats.length >= 2 ? `
  <div class="authority-wrap">
    <aside class="authority-panel" aria-label="Firm Authority Statistics">
      ${authorityStats.map(renderStat).join('')}
    </aside>
  </div>` : ''}

  ${practiceCards.length ? `
  <section class="section" id="practice">
    <div class="section-inner">
      <div class="section-head">
        <span class="label">Legal Services</span>
        <h2 class="title">Our Practice Areas</h2>
        <p class="desc">We provide experienced legal representation across the areas below. Our attorneys are dedicated to achieving the best possible outcomes for every client we serve.</p>
      </div>
      <div class="grid">${practiceCards.map(renderPractice).join('')}</div>
    </div>
  </section>` : ''}

  ${attorneys.length ? `
  <section class="section warm" id="team">
    <div class="section-inner">
      <div class="section-head">
        <span class="label">Our Professionals</span>
        <h2 class="title">Meet the Attorneys</h2>
        <p class="desc">Experienced advocates committed to your case. Get to know the people who will represent you.</p>
      </div>
      <div class="grid">${attorneys.map(renderAttorney).join('')}</div>
    </div>
  </section>` : ''}

  ${renderReviewsSection(testimonials, googleReviews)}

  ${practiceCards.length ? `
  <section class="section ${attorneys.length && !(testimonials.length || googleReviews) ? '' : 'warm'}" id="faq">
    <div class="section-inner">
      <div class="section-head">
        <span class="label">Common Questions</span>
        <h2 class="title">Answers to Your Legal Questions</h2>
        <p class="desc">Clear, direct answers about the services provided by ${escapeHtml(firmName)}.</p>
      </div>
      <div class="faq-grid">
        ${practiceCards.slice(0, 6).map(p => `
          <article class="faq-card">
            <h3>Does ${escapeHtml(firmName)} handle ${escapeHtml(text(p.name))}?</h3>
            <p>Yes, ${escapeHtml(firmName)} provides experienced legal representation for ${escapeHtml(text(p.name))}. Contact our office to discuss your specific situation with an attorney.</p>
          </article>
        `).join('')}
      </div>
    </div>
  </section>` : ''}

  <section class="cta-band">
    <div class="cta-inner">
      <h2>Ready to discuss your case?</h2>
      <p>Your first conversation is confidential. Reach ${escapeHtml(firmName)} today and speak with someone who can help.</p>
      <div class="hero-actions">
        ${phone ? `<a class="btn primary" href="tel:${escapeAttr(phone.replace(/[^+\d]/g, ''))}">Call ${escapeHtml(phone)}</a>` : ''}
        <a class="btn" href="#contact">Request a Consultation</a>
      </div>
    </div>
  </section>

  <section class="section ${testimonials.length || googleReviews ? '' : 'warm'}" id="contact">
    <div class="section-inner">
      <span class="label">Contact</span>
      <h2 class="title">Reach ${escapeHtml(firmName)}</h2>
      <p class="desc">${hasContact ? 'Get in touch with our office using the verified contact details below.' : 'Verified contact details have not been provided yet.'}</p>
      <div class="contact-grid">
        <div style="display:flex;flex-direction:column;gap:16px;">
          ${contactLinks.map(renderContact).join('') || '<div class="contact-item">No verified contact method available.</div>'}
        </div>
        <aside class="form-note">
          <h3>24/7 AI Receptionist</h3>
          <p style="margin-bottom:24px;line-height:1.6">Our intelligent receptionist is available right now to answer basic questions, collect your intake information, and securely route your inquiry directly to our attorneys.</p>
          <p>Click the <strong>AI Receptionist</strong> button in the corner of your screen to begin.</p>
        </aside>
      </div>
    </div>
  </section>
</main>

<footer class="footer">
  <div class="footer-inner">
    <div class="footer-brand">
      <a class="logo" href="#"><span class="logo-mark">${escapeHtml(initials)}</span>${escapeHtml(firmName)}</a>
      <p>${escapeHtml(description.slice(0, 160))}</p>
    </div>
    ${practiceCards.length ? `
    <div class="footer-col">
      <strong>Practice Areas</strong>
      ${practiceCards.slice(0, 5).map(p => `<a href="#practice">${escapeHtml(text(p.name))}</a>`).join('')}
    </div>` : ''}
    <div class="footer-col">
      <strong>Contact</strong>
      ${phone ? `<a href="tel:${escapeAttr(phone.replace(/[^+\d]/g, ''))}">${escapeHtml(phone)}</a>` : ''}
      ${email ? `<a href="mailto:${escapeAttr(email)}">${escapeHtml(email)}</a>` : ''}
      ${(address || city) ? `<span>${escapeHtml([address, city].filter(Boolean).join(', '))}</span>` : ''}
    </div>
  </div>
  <div class="footer-bottom">
    <span>© ${new Date().getFullYear()} ${escapeHtml(firmName)}. All rights reserved.</span>
    <span>This website is for informational purposes only and does not constitute legal advice.</span>
  </div>
</footer>

<script>
(function(){
  var t=document.getElementById('nav-toggle'),n=document.getElementById('primary-nav');
  if(t&&n){
    t.addEventListener('click',function(){var o=n.classList.toggle('open');t.setAttribute('aria-expanded',o?'true':'false');});
    n.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){n.classList.remove('open');t.setAttribute('aria-expanded','false');});});
  }
})();
</script>

${generateIntakeWidget(config.chatAgent || {}, { firmName, phone, email }, practiceCards, config)}
</body>
</html>`;
}

function normalizeList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function normalizePracticeAreas(value) {
  return normalizeList(value)
    .map(area => {
      if (typeof area === 'string') return { name: area, description: 'Details not yet provided.' };
      return {
        name: area.name || '',
        description: area.description || 'Details not yet provided.',
      };
    })
    .filter(area => area.name);
}

function normalizeStats(value) {
  return normalizeList(value)
    .map(stat => ({ value: stat.value || '', label: stat.label || '' }))
    .filter(stat => stat.value && stat.label);
}

function normalizeTestimonials(value) {
  return normalizeList(value)
    .map(item => ({
      text: item.text || '',
      name: item.name || item.author || '',
      initials: item.initials || initialsFromName(item.name || item.author || ''),
      role: item.role || 'Verified review',
    }))
    .filter(item => item.text && item.name);
}

function normalizeGoogleReviews(value) {
  if (!value) return null;
  const reviews = normalizeList(value.reviews)
    .map(review => ({
      author: review.author || '',
      rating: Number(review.rating) || 5,
      text: review.text || '',
      date: review.date || '',
    }))
    .filter(review => review.author && review.text);
  const rating = Number(value.rating);
  const totalReviews = Number(value.totalReviews);
  if (!reviews.length && !Number.isFinite(rating) && !Number.isFinite(totalReviews)) return null;
  return {
    rating: Number.isFinite(rating) ? rating : null,
    totalReviews: Number.isFinite(totalReviews) ? totalReviews : reviews.length,
    reviews,
  };
}

function buildContactLinks({ phone, email, address, city }) {
  const links = [];
  if (phone) links.push({ label: 'Phone', value: phone, href: `tel:${phone.replace(/[^+\d]/g, '')}` });
  if (email) links.push({ label: 'Email', value: email, href: `mailto:${email}` });
  if (address || city) links.push({ label: 'Office', value: [address, city].filter(Boolean).join(', '), href: '' });
  return links;
}

function renderStat(stat) {
  return `<div class="stat"><div class="stat-value">${escapeHtml(text(stat.value))}</div><div class="stat-label">${escapeHtml(text(stat.label))}</div></div>`;
}

function renderPractice(area, index = 0) {
  const num = String(index + 1).padStart(2, '0');
  return `<article class="card"><span class="idx">${num}</span><h3>${escapeHtml(text(area.name))}</h3><p>${escapeHtml(text(area.description))}</p><a class="more" href="#contact">Discuss your matter →</a></article>`;
}

function starRow(rating = 5) {
  const r = Math.max(0, Math.min(5, Math.round(Number(rating) || 5)));
  return `<span class="stars" aria-label="${r} out of 5 stars">${'★'.repeat(r)}${'☆'.repeat(5 - r)}</span>`;
}

function renderHeroTrust({ yearEstablished, attorneys, googleReviews, serviceAreas }) {
  const items = [];
  if (googleReviews && (googleReviews.rating || googleReviews.totalReviews)) {
    items.push(`<div class="ht"><b>${starRow(googleReviews.rating || 5)}</b><span>${googleReviews.totalReviews ? `${escapeHtml(String(googleReviews.totalReviews))} client reviews` : 'Verified reviews'}</span></div>`);
  }
  if (yearEstablished) {
    const years = new Date().getFullYear() - Number(yearEstablished);
    if (Number.isFinite(years) && years > 0) {
      items.push(`<div class="ht"><b>${years}+</b><span>Years of practice</span></div>`);
    }
  }
  if (attorneys.length) {
    items.push(`<div class="ht"><b>${attorneys.length}</b><span>${attorneys.length === 1 ? 'Dedicated attorney' : 'Dedicated attorneys'}</span></div>`);
  }
  if (serviceAreas.length) {
    items.push(`<div class="ht"><b>${serviceAreas.length}</b><span>Communities served</span></div>`);
  }
  if (!items.length) return '';
  return `<div class="hero-trust">${items.slice(0, 4).join('')}</div>`;
}

function buildAuthorityStats({ stats, yearEstablished, practiceCards, attorneys, googleReviews }) {
  // Prefer verified, high-impact stats from firm content when available.
  if (stats && stats.length) return stats.slice(0, 4);
  // Honest fallback: never invent counts the firm did not provide.
  const fallback = [];
  if (yearEstablished) {
    const years = new Date().getFullYear() - Number(yearEstablished);
    if (Number.isFinite(years) && years > 0) fallback.push({ value: `${years}+`, label: 'Years of Practice' });
    fallback.push({ value: text(yearEstablished), label: 'Year Established' });
  }
  if (practiceCards.length) fallback.push({ value: `${practiceCards.length}`, label: practiceCards.length === 1 ? 'Practice Area' : 'Practice Areas' });
  if (attorneys.length) fallback.push({ value: String(attorneys.length), label: attorneys.length === 1 ? 'Attorney' : 'Attorneys' });
  if (googleReviews && googleReviews.rating) fallback.push({ value: text(String(googleReviews.rating)), label: 'Client Rating' });
  return fallback.slice(0, 4);
}

function renderAttorney(attorney) {
  const name = text(attorney.name);
  const photo = attorney.photoUrl 
    ? `<img src="${escapeAttr(attorney.photoUrl)}" alt="${escapeAttr(name)}" class="team-photo" loading="lazy" />` 
    : `<div class="avatar">${escapeHtml(attorney.initials || initialsFromName(name))}</div>`;
    
  return `<article class="card team-card">
    ${photo}
    <div class="team-content">
      <h3>${escapeHtml(name)}</h3>
      <p class="small">${escapeHtml(text(attorney.title || 'Attorney'))}</p>
      ${attorney.bio ? `<p>${escapeHtml(text(attorney.bio))}</p>` : ''}
    </div>
  </article>`;
}

function renderReviewsSection(testimonials, googleReviews) {
  const cards = testimonials.map(t => ({
    text: t.text,
    name: t.name,
    role: t.role || 'Verified review',
    rating: t.rating || 5,
    initials: t.initials || initialsFromName(t.name),
  }));
  if (googleReviews?.reviews?.length) {
    cards.push(...googleReviews.reviews.map(review => ({
      text: review.text,
      name: review.author,
      role: review.date ? `Google review · ${review.date}` : 'Google review',
      rating: review.rating || 5,
      initials: initialsFromName(review.author),
    })));
  }
  if (!cards.length && !googleReviews) return '';

  const summary = googleReviews && (googleReviews.rating || googleReviews.totalReviews)
    ? `<div class="reviews-summary">
        <div class="rs-score">${escapeHtml(String(googleReviews.rating || 5.0))}</div>
        <div>
          ${starRow(googleReviews.rating || 5)}
          <div class="rs-meta">${googleReviews.totalReviews ? `Based on ${escapeHtml(String(googleReviews.totalReviews))} verified reviews` : 'Verified client reviews'}</div>
        </div>
      </div>`
    : '';

  return `
  <section class="section" id="reviews">
    <div class="section-inner">
      <div class="section-head">
        <span class="label">Client Reviews</span>
        <h2 class="title">What Our Clients Say</h2>
      </div>
      ${summary}
      ${cards.length ? `<div class="grid">${cards.slice(0, 6).map(renderTestimonial).join('')}</div>` : ''}
    </div>
  </section>`;
}

function renderTestimonial(item) {
  const quote = text(item.text).replace(/^["“]|["”]$/g, '');
  return `<article class="review-card">
    ${starRow(item.rating)}
    <p class="quote">“${escapeHtml(quote)}”</p>
    <div class="who">
      <span class="who-avatar">${escapeHtml(item.initials || initialsFromName(item.name))}</span>
      <div><b>${escapeHtml(text(item.name))}</b><span>${escapeHtml(text(item.role))}</span></div>
    </div>
  </article>`;
}

function renderContact(item) {
  const value = escapeHtml(text(item.value));
  const inner = `<strong>${escapeHtml(text(item.label))}</strong><span>${value}</span>`;
  return item.href
    ? `<a class="contact-item" href="${escapeAttr(item.href)}">${inner}</a>`
    : `<div class="contact-item">${inner}</div>`;
}

function generateJsonLd(config = {}, canonicalDomain = '', content = {}) {
  const firmName = text(config.firmName || content.firmName || 'Law Firm');
  const siteUrl = canonicalDomain ? `https://${canonicalDomain}` : '';
  const phone = text(config.phone || content.phone || '');
  const email = text(config.email || content.email || '');
  const address = text(config.address || content.address || '');
  const city = text(config.city || content.city || '');
  const practiceNames = (content.practiceCards || []).map(a => text(a.name)).filter(Boolean);
  const serviceAreaList = (content.serviceAreas || []).filter(Boolean);
  const attorneys = normalizeList(config.attorneys).filter(a => a.name);

  const legalServiceSchema = {
    '@context': 'https://schema.org',
    '@type': 'LegalService',
    name: firmName,
    ...(siteUrl && { url: siteUrl }),
    ...(phone && { telephone: phone }),
    ...(email && { email }),
    ...((address || city) && {
      address: {
        '@type': 'PostalAddress',
        ...(address && { streetAddress: address }),
        ...(city && { addressLocality: city }),
        addressCountry: 'US',
      },
    }),
    ...(serviceAreaList.length && { areaServed: serviceAreaList }),
    ...(practiceNames.length && { knowsAbout: practiceNames, serviceType: practiceNames }),
    ...(practiceNames.length && {
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Legal Services',
        itemListElement: practiceNames.map(p => ({
          '@type': 'Offer',
          itemOffered: { '@type': 'Service', name: p },
        })),
      },
    }),
  };

  const faqEntries = practiceNames.slice(0, 6).map(p => ({
    '@type': 'Question',
    name: `Does ${firmName} handle ${p}?`,
    acceptedAnswer: {
      '@type': 'Answer',
      text: `Yes, ${firmName} provides legal services for ${p}. Contact us to discuss your specific situation and whether we can help.`,
    },
  }));

  const faqSchema = faqEntries.length ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqEntries,
  } : null;

  const webPageSchema = siteUrl ? {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: firmName,
    url: siteUrl,
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['#speakable-content h1', '#speakable-content p'],
    },
  } : null;

  const attorneySchemas = attorneys.slice(0, 3).map(a => ({
    '@context': 'https://schema.org',
    '@type': 'Attorney',
    name: text(a.name),
    jobTitle: text(a.title || 'Attorney'),
    worksFor: { '@type': 'LegalService', name: firmName },
  }));

  const schemas = [legalServiceSchema, ...attorneySchemas];
  if (faqSchema) schemas.push(faqSchema);
  if (webPageSchema) schemas.push(webPageSchema);

  return schemas.map(s => `<script type="application/ld+json">\n${JSON.stringify(s, null, 2)}\n</script>`).join('\n');
}

function generateIntakeWidget(agent = {}, contact = {}, practiceCards = [], config = {}) {
  const agentName = text(agent.name || 'AI Receptionist');
  const primaryColor = validHex(agent.primaryColor) || '#1f2937';
  const pos = agent.position === 'left' ? 'left:24px' : 'right:24px';
  const firmName = text(contact.firmName || config.firmName || 'the firm');
  const phone = text(contact.phone || '');
  const email = text(contact.email || '');
  const firmId = text(config.firmId || '');
  const greeting = text(agent.greeting || `Hello! I'm the AI receptionist for ${firmName}. How can I help you today?`);
  const practiceNames = practiceCards.map(a => text(a.name)).filter(Boolean).slice(0, 8);
  const practiceOptions = practiceNames.map(p => `<option value="${escapeAttr(p)}">${escapeHtml(p)}</option>`).join('');
  const phoneLink = phone ? `href="tel:${escapeAttr(phone.replace(/[^+\d]/g, ''))}"` : '';
  const emailLink = email ? `href="mailto:${escapeAttr(email)}"` : '';
  const wid = `ni-${Math.random().toString(36).slice(2, 8)}`;
  const systemPrompt = `You are the professional AI receptionist for ${firmName}. Help potential clients understand if the firm can help them and collect intake information. The firm handles: ${practiceNames.join(', ') || 'legal matters'}. You do NOT provide legal advice. You do NOT discuss attorney fees. You do NOT create an attorney-client relationship. Keep responses under 80 words. Ask questions ONE by ONE to collect their name, legal issue, and contact info (don't overwhelm them). Once you have their info, encourage them to click the 'Send Chat to Firm' button below to save the record so an attorney can review it.`;

  return `
<style>
.ni-fab{position:fixed;bottom:24px;${pos};z-index:9000;display:flex;align-items:center;gap:10px;background:${primaryColor};color:#fff;border:none;border-radius:999px;padding:13px 20px;font-size:.875rem;font-weight:700;cursor:pointer;box-shadow:0 8px 32px rgba(0,0,0,.3);transition:transform .15s;font-family:inherit}
.ni-fab:hover{transform:scale(1.05)}
.ni-fab-dot{width:9px;height:9px;border-radius:50%;background:#4ade80;flex-shrink:0;animation:ni-pulse 2s infinite}
@keyframes ni-pulse{0%,100%{opacity:1}50%{opacity:.4}}
.ni-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9001;display:none;align-items:flex-end;justify-content:${agent.position === 'left' ? 'flex-start' : 'flex-end'};padding:24px}
.ni-overlay.ni-open{display:flex}
.ni-panel{background:#fff;border-radius:16px;width:min(420px,calc(100vw - 32px));max-height:min(640px,calc(100vh - 80px));display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,.28)}
.ni-header{background:${primaryColor};color:#fff;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.ni-header-text h3{margin:0;font-size:.95rem;font-weight:700}
.ni-header-text small{display:block;margin-top:2px;opacity:.72;font-size:.72rem}
.ni-close{background:none;border:none;color:#fff;cursor:pointer;font-size:1.25rem;line-height:1;padding:4px 6px;opacity:.7}
.ni-close:hover{opacity:1}
.ni-tabs{display:flex;border-bottom:1px solid #e2e8f0;background:#f8fafc;flex-shrink:0}
.ni-tab{flex:1;padding:10px 4px;border:none;background:none;font-size:.72rem;font-weight:700;color:#64748b;cursor:pointer;border-bottom:2px solid transparent;text-transform:uppercase;letter-spacing:.04em;font-family:inherit}
.ni-tab.ni-active{color:${primaryColor};border-bottom-color:${primaryColor}}
.ni-body{flex:1;overflow:hidden;display:flex;flex-direction:column}
.ni-pane{display:none;flex-direction:column;flex:1;overflow:hidden}
.ni-pane.ni-active{display:flex}
.ni-chat-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:8px}
.ni-msg{max-width:84%;padding:10px 13px;border-radius:12px;font-size:.82rem;line-height:1.5;word-break:break-word}
.ni-msg.ni-bot{background:#f1f5f9;color:#1e293b;align-self:flex-start;border-bottom-left-radius:3px}
.ni-msg.ni-user{background:${primaryColor};color:#fff;align-self:flex-end;border-bottom-right-radius:3px}
.ni-msg.ni-thinking{opacity:.55;font-style:italic}
.ni-chat-form{padding:10px 12px;border-top:1px solid #e2e8f0;display:flex;gap:8px;flex-shrink:0}
.ni-chat-form input{flex:1;border:1px solid #cbd5e1;border-radius:8px;padding:9px 12px;font-size:.82rem;font-family:inherit;outline:none}
.ni-chat-form input:focus{border-color:${primaryColor}}
.ni-chat-send{border:none;border-radius:8px;padding:0 14px;background:${primaryColor};color:#fff;font-weight:700;cursor:pointer;font-size:.8rem;font-family:inherit}
.ni-chat-submit-btn{margin:12px 14px;background:#10b981;color:#fff;border:none;border-radius:8px;padding:10px;font-weight:700;font-size:.8rem;cursor:pointer;font-family:inherit;flex-shrink:0}
.ni-chat-submit-btn:hover{background:#059669}
.ni-form-scroll{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px}
.ni-field label{display:block;font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#64748b;margin-bottom:4px}
.ni-field input,.ni-field textarea,.ni-field select{width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:9px 12px;font-size:.82rem;font-family:inherit;outline:none;color:#1e293b}
.ni-field input:focus,.ni-field textarea:focus,.ni-field select:focus{border-color:${primaryColor}}
.ni-field textarea{resize:vertical;min-height:68px}
.ni-submit-btn{background:${primaryColor};color:#fff;border:none;border-radius:8px;padding:12px;font-weight:700;font-size:.875rem;cursor:pointer;font-family:inherit;width:100%}
.ni-submit-btn:hover{opacity:.9}
.ni-submit-btn:disabled{opacity:.5;cursor:not-allowed}
.ni-status{display:none;padding:10px 12px;border-radius:8px;font-size:.8rem;font-weight:600}
.ni-status.ni-ok{background:#f0fdf4;color:#16a34a;display:block}
.ni-status.ni-err{background:#fef2f2;color:#dc2626;display:block}
.ni-note{font-size:.68rem;color:#94a3b8;padding:10px 16px;border-top:1px solid #e2e8f0;line-height:1.45;flex-shrink:0}
.ni-contact-row{display:flex;gap:10px;padding:12px 16px;border-top:1px solid #e2e8f0;flex-shrink:0}
.ni-contact-row a{font-size:.78rem;font-weight:700;color:${primaryColor};text-decoration:none}
.ni-contact-row a:hover{text-decoration:underline}
</style>

<button class="ni-fab" id="${wid}-fab" aria-label="Open AI Receptionist">
  <span class="ni-fab-dot"></span>
  ${escapeHtml(agentName)}
</button>

<div class="ni-overlay" id="${wid}-overlay" role="dialog" aria-modal="true" aria-label="AI Receptionist">
  <div class="ni-panel">
    <div class="ni-header">
      <div class="ni-header-text">
        <h3>${escapeHtml(agentName)}</h3>
        <small>${escapeHtml(firmName)} · Online 24/7</small>
      </div>
      <button class="ni-close" id="${wid}-close" aria-label="Close">✕</button>
    </div>

    <nav class="ni-tabs" role="tablist">
      <button class="ni-tab ni-active" role="tab" data-pane="chat">Chat</button>
      <button class="ni-tab" role="tab" data-pane="form">Intake Form</button>
      <button class="ni-tab" role="tab" data-pane="voice">Request Call</button>
    </nav>

    <div class="ni-body">

      <!-- Chat Tab -->
      <div class="ni-pane ni-active" id="${wid}-chat">
        <div class="ni-chat-msgs" id="${wid}-msgs">
        </div>
        <button class="ni-chat-submit-btn" id="${wid}-csubmit">Send Chat to Firm</button>
        <div class="ni-status" id="${wid}-cerr" style="margin:0 14px"></div>
        <div class="ni-status ni-ok" id="${wid}-cok" style="display:none;margin:0 14px">✅ Chat saved! ${escapeHtml(firmName)} will be in touch.</div>
        <form class="ni-chat-form" id="${wid}-cform" autocomplete="off">
          <input type="text" id="${wid}-cinput" placeholder="Ask a question..." aria-label="Message" />
          <button type="submit" class="ni-chat-send">Send</button>
        </form>
        <p class="ni-note">No attorney-client relationship is formed by this chat. Do not share confidential details until the firm confirms representation.</p>
      </div>

      <!-- Intake Form Tab -->
      <div class="ni-pane" id="${wid}-form">
        <div class="ni-form-scroll">
          <div class="ni-field"><label>Full Name *</label><input id="${wid}-fname" type="text" placeholder="Jane Smith" autocomplete="name"></div>
          <div class="ni-field"><label>Email Address *</label><input id="${wid}-femail" type="email" placeholder="jane@example.com" autocomplete="email"></div>
          <div class="ni-field"><label>Phone Number</label><input id="${wid}-fphone" type="tel" placeholder="(555) 000-0000" autocomplete="tel"></div>
          <div class="ni-field"><label>Describe Your Legal Matter *</label><textarea id="${wid}-fissue" placeholder="Briefly describe the situation you need help with..."></textarea></div>
          ${practiceOptions ? `<div class="ni-field"><label>Practice Area</label><select id="${wid}-farea"><option value="">Select (optional)</option>${practiceOptions}</select></div>` : ''}
          <div class="ni-field"><label>Preferred Contact Method</label><select id="${wid}-fcontact"><option value="email">Email</option><option value="phone">Phone</option><option value="either">Either</option></select></div>
          <button class="ni-submit-btn" id="${wid}-fsubmit">Submit Intake Request</button>
          <div class="ni-status" id="${wid}-ferr"></div>
          <div class="ni-status ni-ok" id="${wid}-fok" style="display:none">✅ Received! ${escapeHtml(firmName)} will be in touch shortly.</div>
        </div>
        <p class="ni-note">Submitting this form does not create an attorney-client relationship.</p>
      </div>

      <!-- Voice Tab -->
      <div class="ni-pane" id="${wid}-voice">
        <div class="ni-form-scroll">
          <p style="font-size:.84rem;color:#475569;margin:0 0 12px;line-height:1.5">Our AI receptionist will call you within seconds to collect your intake information.</p>
          <div class="ni-field"><label>Your Name</label><input id="${wid}-vname" type="text" placeholder="Jane Smith" autocomplete="name"></div>
          <div class="ni-field"><label>Your Phone Number *</label><input id="${wid}-vphone" type="tel" placeholder="(555) 000-0000" autocomplete="tel"></div>
          <button class="ni-submit-btn" id="${wid}-vsubmit">Call Me Now</button>
          <div class="ni-status" id="${wid}-verr"></div>
          <div class="ni-status ni-ok" id="${wid}-vok" style="display:none">📞 Calling you now! Our AI receptionist will connect in seconds.</div>
        </div>
        <p class="ni-note">By requesting a call you consent to receiving an AI-initiated call. No attorney-client relationship is created.</p>
      </div>

    </div>

    ${(phoneLink || emailLink) ? `<div class="ni-contact-row">${phoneLink ? `<a ${phoneLink}>Call ${escapeHtml(phone)}</a>` : ''}${emailLink ? `<a ${emailLink}>Email ${escapeHtml(firmName)}</a>` : ''}</div>` : ''}
  </div>
</div>

<script>
(function(){
  var FIRM_ID=${JSON.stringify(firmId)};
  var FIRM_NAME=${JSON.stringify(firmName)};
  var ORIGIN='https://nemoc-law.ai';
  var SYS=${JSON.stringify(systemPrompt)};
  var GREETING=${JSON.stringify(greeting)};
  var storageKey='ni_chat_'+FIRM_ID;
  var saved=localStorage.getItem(storageKey);
  var history=saved ? JSON.parse(saved) : [{role:'system',content:SYS}];
  function q(id){return document.getElementById(id);}
  var fab=q('${wid}-fab'),overlay=q('${wid}-overlay'),closeBtn=q('${wid}-close');
  var msgs=q('${wid}-msgs'),cform=q('${wid}-cform'),cinput=q('${wid}-cinput');
  fab.onclick=function(){overlay.classList.add('ni-open');};
  closeBtn.onclick=function(){overlay.classList.remove('ni-open');};
  overlay.onclick=function(e){if(e.target===overlay)overlay.classList.remove('ni-open');};
  
  function addMsg(t,cls){var d=document.createElement('div');d.className='ni-msg '+cls;d.textContent=t;msgs.appendChild(d);msgs.scrollTop=msgs.scrollHeight;return d;}
  
  if(saved){
    history.forEach(function(m){
      if(m.role==='user') addMsg(m.content,'ni-user');
      if(m.role==='assistant') addMsg(m.content,'ni-bot');
    });
  } else {
    addMsg(GREETING,'ni-bot');
    history.push({role:'assistant',content:GREETING});
    localStorage.setItem(storageKey,JSON.stringify(history));
  }

  // Tabs
  var tabs=overlay.querySelectorAll('.ni-tab'),panes=overlay.querySelectorAll('.ni-pane');
  tabs.forEach(function(tab){
    tab.onclick=function(){
      tabs.forEach(function(t){t.classList.remove('ni-active');});
      panes.forEach(function(p){p.classList.remove('ni-active');});
      tab.classList.add('ni-active');
      var target=q('${wid}-'+tab.getAttribute('data-pane'));
      if(target)target.classList.add('ni-active');
    };
  });
  // Chat
  cform&&cform.addEventListener('submit',function(e){
    e.preventDefault();
    var val=(cinput.value||'').trim();if(!val)return;
    cinput.value='';addMsg(val,'ni-user');
    history.push({role:'user',content:val});
    localStorage.setItem(storageKey,JSON.stringify(history));
    var thinking=addMsg('Thinking…','ni-bot ni-thinking');
    fetch(ORIGIN+'/api/nvidia/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:history,max_tokens:220,temperature:0.7})})
    .then(function(r){return r.json();})
    .then(function(d){
      var reply=d&&d.choices&&d.choices[0]&&d.choices[0].message&&d.choices[0].message.content||d&&d.content||'Thank you — the firm will be in touch shortly.';
      thinking.textContent=reply;thinking.className='ni-msg ni-bot';
      history.push({role:'assistant',content:reply});
      localStorage.setItem(storageKey,JSON.stringify(history));
    })
    .catch(function(){thinking.textContent='Having trouble connecting. Please use the intake form or call us directly.';thinking.className='ni-msg ni-bot';});
  });

  var csubmit=q('${wid}-csubmit'),cerr=q('${wid}-cerr'),cok=q('${wid}-cok');
  if(csubmit){csubmit.onclick=function(){
    cerr.className='ni-status';cerr.style.display='none';
    csubmit.disabled=true;csubmit.textContent='Sending…';
    fetch(ORIGIN+'/api/submitChatRecord',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({firmId:FIRM_ID,history:history})})
    .then(function(r){return r.json();})
    .then(function(d){if(d.success){cok.style.display='block';csubmit.style.display='none';}else{throw new Error(d.error||'Submission failed');}})
    .catch(function(err){cerr.textContent=err.message||'Submission failed. Please try again.';cerr.className='ni-status ni-err';cerr.style.display='block';csubmit.disabled=false;csubmit.textContent='Send Chat to Firm';});
  };}
  // Intake form
  var fsubmit=q('${wid}-fsubmit'),ferr=q('${wid}-ferr'),fok=q('${wid}-fok');
  if(fsubmit){fsubmit.onclick=function(){
    var name=(q('${wid}-fname').value||'').trim();
    var email=(q('${wid}-femail').value||'').trim();
    var issue=(q('${wid}-fissue').value||'').trim();
    var phone=(q('${wid}-fphone')?q('${wid}-fphone').value||'':'').trim();
    var area=(q('${wid}-farea')?q('${wid}-farea').value||'':'').trim();
    var contact=(q('${wid}-fcontact')?q('${wid}-fcontact').value||'email':'email');
    ferr.className='ni-status';ferr.style.display='none';
    if(!name||!email||!issue){ferr.textContent='Please fill in all required fields.';ferr.className='ni-status ni-err';ferr.style.display='block';return;}
    fsubmit.disabled=true;fsubmit.textContent='Submitting…';
    fetch(ORIGIN+'/api/submitIntakeLead',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({firmId:FIRM_ID,name:name,email:email,phone:phone,legalIssue:issue,practiceArea:area,preferredContact:contact})})
    .then(function(r){return r.json();})
    .then(function(d){if(d.success){fok.style.display='block';fsubmit.style.display='none';}else{throw new Error(d.error||'Submission failed');}})
    .catch(function(err){ferr.textContent=err.message||'Submission failed. Please try again.';ferr.className='ni-status ni-err';ferr.style.display='block';fsubmit.disabled=false;fsubmit.textContent='Submit Intake Request';});
  };}
  // Voice callback
  var vsubmit=q('${wid}-vsubmit'),verr=q('${wid}-verr'),vok=q('${wid}-vok');
  if(vsubmit){vsubmit.onclick=function(){
    var phone=(q('${wid}-vphone').value||'').trim();
    var name=(q('${wid}-vname').value||'').trim();
    verr.className='ni-status';verr.style.display='none';
    if(!phone){verr.textContent='Please enter your phone number.';verr.className='ni-status ni-err';verr.style.display='block';return;}
    vsubmit.disabled=true;vsubmit.textContent='Initiating call…';
    fetch(ORIGIN+'/api/submitVoiceIntakeCallback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({firmId:FIRM_ID,callerPhone:phone,callerName:name})})
    .then(function(r){return r.json();})
    .then(function(d){if(d.success){vok.style.display='block';vsubmit.style.display='none';}else{throw new Error(d.error||'Could not initiate call');}})
    .catch(function(err){verr.textContent=err.message||'Could not initiate call. Please use the form.';verr.className='ni-status ni-err';verr.style.display='block';vsubmit.disabled=false;vsubmit.textContent='Call Me Now';});
  };}
})();
</script>`;
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

function initialsFromName(name = '') {
  return text(name)
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'LF';
}

function text(value) {
  return String(value ?? '').trim();
}

function escapeHtml(value) {
  return text(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function validHex(value) {
  return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : null;
}

// Only accept clean http(s) image URLs (no quotes/parens) to keep them safe
// inside the CSS url() context and avoid broken portrait placeholders.
function validImageUrl(value) {
  const url = String(value || '').trim();
  if (!/^https?:\/\/[^\s'"()]+$/i.test(url)) return '';
  return url;
}

function adjustBrightness(hex, amount) {
  const clean = String(hex || '').replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(clean.slice(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(clean.slice(2, 4), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(clean.slice(4, 6), 16) + amount));
  return `#${[r, g, b].map(channel => channel.toString(16).padStart(2, '0')).join('')}`;
}
