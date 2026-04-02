/**
 * Generates a complete, customizable law firm website with optional AI chat agent.
 * Now supports rich config from firmContentEngine for truly unique, firm-specific sites.
 */
export function generateCustomWebsite(config, domain) {
  const {
    firmName, tagline, phone, email, address, city, description,
    attorneys = [], practiceAreas = [], colors = {}, chatAgent = {},
    hero = null, stats = null, testimonials = null, practiceAreasWithDesc = null,
    yearEstablished = null, googleReviews = null, serviceAreas = [],
  } = config;

  const { primary = '#1a365d', accent = '#76b900', bg = '#ffffff', warm = '#faf8f5' } = colors;
  const primaryLight = adjustBrightness(primary, 30);
  const accentDark = adjustBrightness(accent, -20);
  const initials = firmName.slice(0, 2).toUpperCase();

  // Hero — use custom content if available
  const heroMain = hero?.main || 'Protecting Your Rights.';
  const heroEm = hero?.em || 'Future';
  const heroStats = stats || [
    { value: '500+', label: 'Cases Won' },
    { value: '25+', label: 'Years Experience' },
    { value: '98%', label: 'Client Satisfaction' },
  ];

  // Practice areas — use descriptions if available
  const practiceCards = practiceAreasWithDesc || practiceAreas.map(a => ({
    name: a,
    description: `Expert counsel and strategic representation in ${a.toLowerCase()} matters.`,
  }));

  // Testimonials — use custom if available
  const tData = testimonials || [
    { text: `"${firmName} guided us through a complex matter with exceptional strategic thinking."`, name: 'James Mitchell', initials: 'JM', role: 'CEO, Mitchell Industries' },
    { text: `"Professional, thorough, and genuinely invested in achieving the best possible outcome."`, name: 'Sarah Rodriguez', initials: 'SR', role: 'VP of HR, TechCorp' },
    { text: `"Outstanding representation. Their expertise saved us from several potential pitfalls."`, name: 'David Kim', initials: 'DK', role: 'Managing Partner, Apex Realty' },
  ];

  const chatWidgetHtml = chatAgent.enabled ? generateChatWidget(chatAgent, firmName, { phone, email, address, city }, practiceAreas) : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${firmName} — ${tagline}</title>
<meta name="description" content="${description?.slice(0, 160) || ''}">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@600;700;800&display=swap" rel="stylesheet">
<style>
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
:root {
  --primary: ${primary};
  --primary-light: ${primaryLight};
  --accent: ${accent};
  --accent-dark: ${accentDark};
  --gold: #b59f6b;
  --text: #1e293b;
  --text-light: #64748b;
  --bg: ${bg};
  --bg-warm: ${warm};
  --border: #e2e8f0;
  --font: 'Inter', -apple-system, sans-serif;
  --font-serif: 'Playfair Display', Georgia, serif;
}
body { font-family: var(--font); color: var(--text); line-height: 1.6; background: var(--bg); -webkit-font-smoothing: antialiased; overflow-x: hidden; }
*, *::before, *::after { max-width: 100%; }
a { text-decoration: none; color: inherit; }
.header { position: sticky; top: 0; z-index: 100; background: rgba(255,255,255,0.95); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border); padding: 0 40px; }
.header-inner { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; height: 72px; }
.logo { font-family: var(--font-serif); font-size: 1.5rem; font-weight: 800; color: var(--primary); display: flex; align-items: center; gap: 10px; }
.logo-mark { width: 36px; height: 36px; background: var(--primary); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-family: var(--font); font-size: 0.875rem; font-weight: 700; }
.nav { display: flex; gap: 32px; align-items: center; }
.nav a { font-size: 0.875rem; font-weight: 500; color: var(--text-light); transition: color 0.2s; }
.nav a:hover { color: var(--primary); }
.nav-cta { padding: 10px 24px; background: var(--primary); color: #fff !important; border-radius: 8px; font-weight: 600; font-size: 0.875rem; transition: background 0.2s; }
.nav-cta:hover { background: var(--primary-light); }
.hero { background: linear-gradient(160deg, var(--primary) 0%, ${adjustBrightness(primary, -20)} 50%, ${adjustBrightness(primary, -35)} 100%); color: #fff; padding: 100px 40px 120px; position: relative; overflow: hidden; }
.hero::before { content: ''; position: absolute; top: -50%; right: -30%; width: 800px; height: 800px; background: radial-gradient(circle, ${accent}14 0%, transparent 70%); border-radius: 50%; }
.hero-inner { max-width: 1200px; margin: 0 auto; position: relative; z-index: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; }
.hero-label { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; background: ${accent}26; border: 1px solid ${accent}40; border-radius: 99px; font-size: 0.75rem; font-weight: 600; color: var(--accent); margin-bottom: 20px; text-transform: uppercase; letter-spacing: 0.04em; }
.hero h1 { font-family: var(--font-serif); font-size: 3.25rem; font-weight: 800; line-height: 1.15; margin-bottom: 20px; }
.hero h1 em { font-style: normal; color: var(--accent); }
.hero p { font-size: 1.125rem; color: rgba(255,255,255,0.7); line-height: 1.7; margin-bottom: 32px; max-width: 520px; }
.hero-btns { display: flex; gap: 12px; flex-wrap: wrap; }
.btn-primary { padding: 14px 32px; background: var(--accent); color: #fff; border: none; border-radius: 8px; font-size: 0.9375rem; font-weight: 700; cursor: pointer; transition: background 0.2s; font-family: var(--font); }
.btn-primary:hover { background: var(--accent-dark); }
.btn-outline { padding: 14px 32px; background: transparent; color: #fff; border: 1.5px solid rgba(255,255,255,0.3); border-radius: 8px; font-size: 0.9375rem; font-weight: 600; cursor: pointer; transition: all 0.2s; font-family: var(--font); }
.btn-outline:hover { border-color: #fff; background: rgba(255,255,255,0.05); }
.hero-stats { display: flex; gap: 40px; margin-top: 40px; padding-top: 32px; border-top: 1px solid rgba(255,255,255,0.1); }
.hero-stat-val { font-size: 2rem; font-weight: 800; color: var(--accent); }
.hero-stat-label { font-size: 0.8125rem; color: rgba(255,255,255,0.5); margin-top: 4px; }
.hero-card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 32px; backdrop-filter: blur(10px); }
.hero-card h3 { font-size: 1.125rem; font-weight: 700; margin-bottom: 16px; }
.hero-card-item { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 0.875rem; color: rgba(255,255,255,0.8); }
.hero-card-item:last-child { border-bottom: none; }
.hero-card-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); flex-shrink: 0; }
.practice { padding: 100px 40px; background: var(--bg-warm); }
.practice-inner { max-width: 1200px; margin: 0 auto; }
.section-label { text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.75rem; font-weight: 700; color: var(--accent); margin-bottom: 12px; }
.section-title { font-family: var(--font-serif); font-size: 2.25rem; font-weight: 700; color: var(--primary); margin-bottom: 12px; }
.section-desc { font-size: 1rem; color: var(--text-light); max-width: 560px; margin-bottom: 48px; }
.practice-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
.practice-card { background: var(--bg); border: 1px solid var(--border); border-radius: 12px; padding: 32px; transition: all 0.3s ease; }
.practice-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.06); border-color: var(--accent); }
.practice-name { font-size: 1.0625rem; font-weight: 700; color: var(--primary); margin-bottom: 8px; margin-top: 16px; }
.practice-desc { font-size: 0.875rem; color: var(--text-light); line-height: 1.6; }
.practice-icon { width: 48px; height: 48px; background: ${primary}0F; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: var(--primary); font-weight: 700; font-size: 1.25rem; }
.team { padding: 100px 40px; }
.team-inner { max-width: 1200px; margin: 0 auto; }
.team-grid { display: grid; grid-template-columns: repeat(${Math.min(attorneys.length || 3, 4)}, 1fr); gap: 32px; }
.team-card { text-align: center; }
.team-avatar { width: 120px; height: 120px; border-radius: 50%; background: var(--primary); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 2rem; font-weight: 700; margin: 0 auto 16px; border: 4px solid var(--bg-warm); }
.team-name { font-size: 1.125rem; font-weight: 700; color: var(--primary); }
.team-title { font-size: 0.875rem; color: var(--text-light); }
.team-bio { font-size: 0.8125rem; color: var(--text-light); margin-top: 8px; line-height: 1.5; max-width: 280px; margin-left: auto; margin-right: auto; }
.testimonials { padding: 100px 40px; background: var(--bg-warm); }
.testimonials-inner { max-width: 1200px; margin: 0 auto; }
.testimonials-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
.testimonial-card { background: var(--bg); border: 1px solid var(--border); border-radius: 12px; padding: 32px; }
.testimonial-stars { color: #b59f6b; font-size: 1rem; margin-bottom: 16px; letter-spacing: 2px; }
.testimonial-text { font-size: 0.9375rem; color: var(--text); line-height: 1.7; margin-bottom: 20px; font-style: italic; }
.testimonial-author { display: flex; align-items: center; gap: 12px; padding-top: 16px; border-top: 1px solid var(--border); }
.testimonial-avatar { width: 40px; height: 40px; background: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 0.75rem; font-weight: 700; }
.testimonial-name { font-size: 0.875rem; font-weight: 600; }
.testimonial-role { font-size: 0.75rem; color: var(--text-light); }
.contact { padding: 100px 40px; }
.contact-inner { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 60px; }
.contact h2 { font-family: var(--font-serif); font-size: 2.25rem; font-weight: 700; color: var(--primary); margin-bottom: 16px; }
.contact p { font-size: 1rem; color: var(--text-light); margin-bottom: 32px; }
.contact-info { display: flex; flex-direction: column; gap: 16px; }
.contact-info-item { display: flex; align-items: center; gap: 12px; font-size: 0.9375rem; }
.contact-info-icon { width: 40px; height: 40px; background: ${primary}0F; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: var(--primary); font-weight: 700; }
.contact-form { display: flex; flex-direction: column; gap: 16px; }
.contact-form input, .contact-form textarea { padding: 14px 16px; border: 1.5px solid var(--border); border-radius: 8px; font-size: 0.875rem; font-family: var(--font); color: var(--text); outline: none; transition: border-color 0.2s; }
.contact-form input:focus, .contact-form textarea:focus { border-color: var(--primary); }
.contact-form textarea { min-height: 120px; resize: vertical; }
.contact-form .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.contact-submit { padding: 14px 32px; background: var(--primary); color: #fff; border: none; border-radius: 8px; font-size: 0.9375rem; font-weight: 700; cursor: pointer; font-family: var(--font); }
.footer { background: var(--primary); color: rgba(255,255,255,0.7); padding: 60px 40px 32px; }
.footer-inner { max-width: 1200px; margin: 0 auto; }
.footer-top { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 40px; padding-bottom: 40px; border-bottom: 1px solid rgba(255,255,255,0.1); }
.footer-brand { font-family: var(--font-serif); font-size: 1.5rem; font-weight: 800; color: #fff; margin-bottom: 12px; }
.footer-desc { font-size: 0.875rem; line-height: 1.7; max-width: 320px; }
.footer-heading { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(255,255,255,0.4); margin-bottom: 16px; }
.footer-links { display: flex; flex-direction: column; gap: 10px; }
.footer-links a { font-size: 0.875rem; transition: color 0.2s; }
.footer-links a:hover { color: #fff; }
.footer-bottom { display: flex; justify-content: space-between; align-items: center; padding-top: 24px; margin-top: 24px; font-size: 0.8125rem; color: rgba(255,255,255,0.4); }
.google-reviews { padding: 80px 40px; background: var(--bg); }
.google-reviews-inner { max-width: 1200px; margin: 0 auto; }
.google-header { display: flex; align-items: center; gap: 24px; margin-bottom: 40px; flex-wrap: wrap; }
.google-logo { display: flex; align-items: center; gap: 10px; }
.google-logo svg { width: 28px; height: 28px; }
.google-logo-text { font-size: 1.125rem; font-weight: 600; color: var(--text); }
.google-rating-big { display: flex; align-items: center; gap: 12px; }
.google-score { font-size: 2.5rem; font-weight: 800; color: var(--text); }
.google-stars-big { color: #f59e0b; font-size: 1.25rem; letter-spacing: 2px; }
.google-count { font-size: 0.875rem; color: var(--text-light); }
.google-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }
.google-card { background: var(--bg-warm); border: 1px solid var(--border); border-radius: 12px; padding: 24px; }
.google-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.google-card-author { display: flex; align-items: center; gap: 10px; }
.google-card-avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--primary); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 0.75rem; font-weight: 700; }
.google-card-name { font-size: 0.8125rem; font-weight: 600; color: var(--text); }
.google-card-date { font-size: 0.6875rem; color: var(--text-light); }
.google-card-stars { color: #f59e0b; font-size: 0.875rem; letter-spacing: 1px; }
.google-card-text { font-size: 0.8125rem; color: var(--text); line-height: 1.6; }
.google-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; background: #4285f40F; border: 1px solid #4285f430; border-radius: 99px; font-size: 0.75rem; font-weight: 600; color: #4285f4; }
.service-areas { padding: 40px; background: var(--primary); }
.service-areas-inner { max-width: 1200px; margin: 0 auto; text-align: center; }
.service-areas-title { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(255,255,255,0.5); margin-bottom: 12px; }
.service-areas-list { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }
.service-area-tag { padding: 6px 16px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); border-radius: 99px; font-size: 0.75rem; color: rgba(255,255,255,0.8); font-weight: 500; }
@media (max-width: 768px) {
  .hero-inner, .contact-inner { grid-template-columns: 1fr; gap: 40px; }
  .practice-grid, .testimonials-grid, .team-grid { grid-template-columns: 1fr; }
  .hero h1 { font-size: 2.25rem; }
  .hero { padding: 60px 20px 80px; }
  .header { padding: 0 20px; }
  .nav a:not(.nav-cta) { display: none; }
  .footer-top { grid-template-columns: 1fr 1fr; gap: 24px; }
  .hero-card { display: none; }
}
</style>
</head>
<body>

<header class="header">
  <div class="header-inner">
    <div class="logo"><div class="logo-mark">${initials}</div>${firmName}</div>
    <nav class="nav">
      <a href="#practice">Practice Areas</a>
      <a href="#team">Our Team</a>
      <a href="#testimonials">Testimonials</a>
      <a href="#contact">Contact</a>
      <a href="#contact" class="nav-cta">Free Consultation</a>
    </nav>
  </div>
</header>

<section class="hero">
  <div class="hero-inner">
    <div>
      <div class="hero-label">✧ ${tagline}</div>
      <h1>${heroMain}<br><em>${heroEm}</em></h1>
      <p>${description}</p>
      <div class="hero-btns">
        <button class="btn-primary">Schedule Free Consultation</button>
        <button class="btn-outline">Our Practice Areas</button>
      </div>
      <div class="hero-stats">
        ${heroStats.map(s => `<div><div class="hero-stat-val">${s.value}</div><div class="hero-stat-label">${s.label}</div></div>`).join('')}
      </div>
    </div>
    <div class="hero-card">
      <h3>Why Clients Choose ${firmName}</h3>
      <div class="hero-card-item"><div class="hero-card-dot"></div> Personalized legal strategy for every case</div>
      <div class="hero-card-item"><div class="hero-card-dot"></div> Transparent billing with no hidden fees</div>
      <div class="hero-card-item"><div class="hero-card-dot"></div> Available 24/7 for urgent matters</div>
      <div class="hero-card-item"><div class="hero-card-dot"></div> ${attorneys[0] ? `Led by ${attorneys[0].name}, ${attorneys[0].title}` : 'Results-driven approach'}</div>
      <div class="hero-card-item"><div class="hero-card-dot"></div> Free initial case evaluation</div>
    </div>
  </div>
</section>

<section class="practice" id="practice">
  <div class="practice-inner">
    <div class="section-label">What We Do</div>
    <div class="section-title">Our Practice Areas</div>
    <div class="section-desc">Comprehensive legal services tailored to your needs in ${city || 'your area'}.</div>
    <div class="practice-grid">
      ${practiceCards.map((area, i) => `
      <div class="practice-card">
        <div class="practice-icon">${['⚖️','🏢','📝','🏠','👥','🛡️'][i % 6]}</div>
        <div class="practice-name">${typeof area === 'string' ? area : area.name}</div>
        <div class="practice-desc">${typeof area === 'string' ? `Expert counsel in ${area.toLowerCase()}.` : area.description}</div>
      </div>`).join('')}
    </div>
  </div>
</section>

<section class="team" id="team">
  <div class="team-inner">
    <div class="section-label">Our Team</div>
    <div class="section-title" style="margin-bottom: 48px;">Meet Our Attorneys</div>
    <div class="team-grid">
      ${attorneys.map(a => `
      <div class="team-card">
        <div class="team-avatar">${a.initials}</div>
        <div class="team-name">${a.name}</div>
        <div class="team-title">${a.title}</div>
        ${a.bio ? `<div class="team-bio">${a.bio.length > 140 ? a.bio.slice(0, 140) + '...' : a.bio}</div>` : ''}
      </div>`).join('')}
    </div>
  </div>
</section>

<section class="testimonials" id="testimonials">
  <div class="testimonials-inner">
    <div class="section-label">Client Testimonials</div>
    <div class="section-title" style="margin-bottom: 48px;">What Our Clients Say</div>
    <div class="testimonials-grid">
      ${tData.map(t => `
      <div class="testimonial-card">
        <div class="testimonial-stars">★★★★★</div>
        <div class="testimonial-text">${t.text}</div>
        <div class="testimonial-author"><div class="testimonial-avatar">${t.initials}</div><div><div class="testimonial-name">${t.name}</div><div class="testimonial-role">${t.role}</div></div></div>
      </div>`).join('')}
    </div>
  </div>
</section>

${googleReviews ? `
<section class="google-reviews" id="reviews">
  <div class="google-reviews-inner">
    <div class="google-header">
      <div class="google-logo">
        <svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
        <span class="google-logo-text">Google Reviews</span>
      </div>
      <div class="google-rating-big">
        <span class="google-score">${googleReviews.rating}</span>
        <div>
          <div class="google-stars-big">${'★'.repeat(Math.round(googleReviews.rating))}${'☆'.repeat(5 - Math.round(googleReviews.rating))}</div>
          <div class="google-count">${googleReviews.totalReviews.toLocaleString()} reviews</div>
        </div>
      </div>
      <a href="#" class="google-badge">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        View all on Google
      </a>
    </div>
    <div class="google-grid">
      ${googleReviews.reviews.map(r => `
      <div class="google-card">
        <div class="google-card-header">
          <div class="google-card-author">
            <div class="google-card-avatar">${r.author.split(/[\s.]/).filter(s => s).map(w => w[0]).join('').toUpperCase().slice(0, 2)}</div>
            <div>
              <div class="google-card-name">${r.author}</div>
              <div class="google-card-date">${r.date}</div>
            </div>
          </div>
          <div class="google-card-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
        </div>
        <div class="google-card-text">${r.text}</div>
      </div>`).join('')}
    </div>
  </div>
</section>` : ''}

${serviceAreas.length > 0 ? `
<section class="service-areas">
  <div class="service-areas-inner">
    <div class="service-areas-title">Proudly Serving</div>
    <div class="service-areas-list">
      ${serviceAreas.map(area => `<span class="service-area-tag">${area}</span>`).join('')}
      <span class="service-area-tag">${city || 'Metro Area'}</span>
    </div>
  </div>
</section>` : ''}

<section class="contact" id="contact">
  <div class="contact-inner">
    <div>
      <div class="section-label">Get in Touch</div>
      <h2>Schedule Your Free Consultation</h2>
      <p>Contact ${firmName} today for a confidential, no-obligation consultation.</p>
      <div class="contact-info">
        <div class="contact-info-item"><div class="contact-info-icon">T</div><div><strong>${phone}</strong><br>Mon–Fri, 8am–6pm</div></div>
        <div class="contact-info-item"><div class="contact-info-icon">@</div><div><strong>${email}</strong><br>We respond within 24 hours</div></div>
        <div class="contact-info-item"><div class="contact-info-icon">P</div><div><strong>${address}</strong><br>${city}</div></div>
      </div>
    </div>
    <div class="contact-form">
      <div class="form-row"><input placeholder="First Name" /><input placeholder="Last Name" /></div>
      <input placeholder="Email Address" />
      <input placeholder="Phone Number" />
      <textarea placeholder="Tell us about your legal matter..."></textarea>
      <button class="contact-submit">Request Free Consultation</button>
    </div>
  </div>
</section>

<footer class="footer">
  <div class="footer-inner">
    <div class="footer-top">
      <div><div class="footer-brand">${firmName}</div><div class="footer-desc">${description?.slice(0, 120) || 'Dedicated to exceptional legal counsel.'}...</div></div>
      <div><div class="footer-heading">Practice Areas</div><div class="footer-links">${practiceCards.slice(0, 4).map(a => `<a href="#">${typeof a === 'string' ? a : a.name}</a>`).join('')}</div></div>
      <div><div class="footer-heading">The Firm</div><div class="footer-links"><a href="#">About Us</a><a href="#">Our Team</a><a href="#">Testimonials</a><a href="#">Careers</a></div></div>
      <div><div class="footer-heading">Contact</div><div class="footer-links"><a href="#">${phone}</a><a href="#">${email}</a><a href="#">${city}</a></div></div>
    </div>
    <div class="footer-bottom"><span>&copy; ${yearEstablished ? yearEstablished + '–' : ''}2026 ${firmName}. All Rights Reserved.</span><span>Privacy Policy &middot; Terms of Service</span></div>
  </div>
</footer>

${chatWidgetHtml}

</body>
</html>`;
}

function generateChatWidget(agent, firmName, contactInfo, practiceAreas = []) {
  const { name, greeting, primaryColor, position, capabilities } = agent;
  const { phone, address, city } = contactInfo;
  const pos = position === 'left' ? 'left: 24px;' : 'right: 24px;';
  const posBtn = position === 'left' ? 'left: 24px;' : 'right: 24px;';
  const hasVoice = capabilities.includes('voice');
  const hasScheduling = capabilities.includes('scheduling');
  const hasDocs = capabilities.includes('documents');

  // Build contextual bot replies using firm-specific data
  const areasStr = practiceAreas.slice(0, 4).join(', ') || 'various legal matters';

  return `
<style>
  .chat-fab {
    position: fixed; bottom: 24px; ${posBtn} z-index: 9999;
    width: 60px; height: 60px; border-radius: 50%;
    background: ${primaryColor}; color: #fff; border: none;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 24px rgba(0,0,0,0.2); transition: all 0.3s ease;
    font-size: 1.5rem;
  }
  .chat-fab:hover { transform: scale(1.08); box-shadow: 0 6px 32px rgba(0,0,0,0.25); }
  .chat-fab .pulse { position: absolute; width: 100%; height: 100%; border-radius: 50%; background: ${primaryColor}; animation: fab-pulse 2s infinite; opacity: 0; }
  @keyframes fab-pulse { 0% { transform: scale(1); opacity: 0.4; } 100% { transform: scale(1.6); opacity: 0; } }
  .chat-window {
    position: fixed; bottom: 96px; ${pos} z-index: 9999;
    width: 380px; max-height: 520px; border-radius: 16px;
    background: #fff; box-shadow: 0 12px 48px rgba(0,0,0,0.15);
    display: none; flex-direction: column; overflow: hidden;
    animation: chat-slide-in 0.3s ease;
  }
  .chat-window.open { display: flex; }
  @keyframes chat-slide-in { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  .chat-header { padding: 16px 20px; background: ${primaryColor}; color: #fff; display: flex; align-items: center; gap: 12px; }
  .chat-avatar { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center; font-size: 1.125rem; }
  .chat-header-info h4 { font-size: 0.9375rem; font-weight: 700; margin: 0; }
  .chat-header-info span { font-size: 0.75rem; opacity: 0.7; display: flex; align-items: center; gap: 4px; }
  .chat-online-dot { width: 6px; height: 6px; border-radius: 50%; background: #4ade80; display: inline-block; }
  .chat-close { margin-left: auto; background: none; border: none; color: #fff; cursor: pointer; font-size: 1.25rem; opacity: 0.7; }
  .chat-close:hover { opacity: 1; }
  .chat-messages { flex: 1; padding: 16px 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; max-height: 320px; }
  .chat-msg { padding: 10px 14px; border-radius: 12px; max-width: 85%; font-size: 0.8125rem; line-height: 1.5; animation: msg-in 0.3s ease; }
  @keyframes msg-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  .chat-msg.bot { background: #f1f5f9; color: #1e293b; align-self: flex-start; border-bottom-left-radius: 4px; }
  .chat-msg.user { background: ${primaryColor}; color: #fff; align-self: flex-end; border-bottom-right-radius: 4px; }
  .chat-msg .typing-dots { display: inline-flex; gap: 4px; }
  .chat-msg .typing-dots span { width: 6px; height: 6px; border-radius: 50%; background: #94a3b8; animation: dot-bounce 1.4s infinite; }
  .chat-msg .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
  .chat-msg .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes dot-bounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-6px); } }
  .chat-input-area { padding: 12px 16px; border-top: 1px solid #e2e8f0; display: flex; gap: 8px; align-items: center; }
  .chat-input { flex: 1; padding: 10px 14px; border: 1.5px solid #e2e8f0; border-radius: 24px; font-size: 0.8125rem; font-family: var(--font); outline: none; transition: border-color 0.2s; }
  .chat-input:focus { border-color: ${primaryColor}; }
  .chat-send { width: 36px; height: 36px; border: none; border-radius: 50%; background: ${primaryColor}; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1rem; transition: background 0.2s; }
  .chat-send:hover { filter: brightness(1.15); }
  .chat-tools { display: flex; gap: 6px; padding: 0 16px 10px; }
  .chat-tool-btn { padding: 4px 10px; border: 1px solid #e2e8f0; border-radius: 16px; background: #fff; font-size: 0.6875rem; color: #64748b; cursor: pointer; display: flex; align-items: center; gap: 4px; transition: all 0.15s; }
  .chat-tool-btn:hover { border-color: ${primaryColor}; color: ${primaryColor}; }
  .chat-quick-actions { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 20px 12px; }
  .chat-quick-btn { padding: 6px 12px; border: 1px solid #e2e8f0; border-radius: 20px; background: #fff; font-size: 0.75rem; color: #475569; cursor: pointer; transition: all 0.2s; }
  .chat-quick-btn:hover { border-color: ${primaryColor}; color: ${primaryColor}; background: ${primaryColor}0A; }
</style>

<div class="chat-window" id="chatWindow">
  <div class="chat-header">
    <div class="chat-avatar">🤖</div>
    <div class="chat-header-info">
      <h4>${name}</h4>
      <span><span class="chat-online-dot"></span> Online now</span>
    </div>
    <button class="chat-close" onclick="toggleChat()">✕</button>
  </div>
  <div class="chat-messages" id="chatMessages">
    <div class="chat-msg bot">${greeting}</div>
  </div>
  <div class="chat-quick-actions">
    <button class="chat-quick-btn" onclick="sendQuick('What are your practice areas?')">Practice Areas</button>
    ${hasScheduling ? '<button class="chat-quick-btn" onclick="sendQuick(\'I need to schedule a consultation\')">Book Consultation</button>' : ''}
    <button class="chat-quick-btn" onclick="sendQuick('What are your fees?')">Fees & Pricing</button>
    <button class="chat-quick-btn" onclick="sendQuick('I need legal help')">Get Help</button>
  </div>
  <div class="chat-tools">
    ${hasVoice ? '<button class="chat-tool-btn">🎙 Voice</button>' : ''}
    ${hasDocs ? '<button class="chat-tool-btn">📎 Upload</button>' : ''}
  </div>
  <div class="chat-input-area">
    <input class="chat-input" id="chatInput" placeholder="Type your message..." onkeydown="if(event.key==='Enter')sendMessage()" />
    <button class="chat-send" onclick="sendMessage()">➤</button>
  </div>
</div>

<button class="chat-fab" onclick="toggleChat()" id="chatFab">
  <div class="pulse"></div>
  💬
</button>

<script>
function toggleChat() {
  var w = document.getElementById('chatWindow');
  w.classList.toggle('open');
}
function sendMessage() {
  var input = document.getElementById('chatInput');
  var msg = input.value.trim();
  if (!msg) return;
  addMessage(msg, 'user');
  input.value = '';
  showTyping();
  setTimeout(function() { removeTyping(); addMessage(getBotReply(msg), 'bot'); }, 1200 + Math.random() * 800);
}
function sendQuick(msg) {
  addMessage(msg, 'user');
  showTyping();
  setTimeout(function() { removeTyping(); addMessage(getBotReply(msg), 'bot'); }, 1000 + Math.random() * 600);
}
function addMessage(text, type) {
  var div = document.createElement('div');
  div.className = 'chat-msg ' + type;
  div.textContent = text;
  var c = document.getElementById('chatMessages');
  c.appendChild(div);
  c.scrollTop = c.scrollHeight;
}
function showTyping() {
  var div = document.createElement('div');
  div.className = 'chat-msg bot';
  div.id = 'typingIndicator';
  div.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
  var c = document.getElementById('chatMessages');
  c.appendChild(div);
  c.scrollTop = c.scrollHeight;
}
function removeTyping() {
  var el = document.getElementById('typingIndicator');
  if (el) el.remove();
}
function getBotReply(msg) {
  var m = msg.toLowerCase();
  if (m.includes('practice') || m.includes('area')) return 'We specialize in ${areasStr}. Which area are you interested in?';
  if (m.includes('fee') || m.includes('cost') || m.includes('price')) return 'We offer a free initial consultation. Our fees depend on the nature and complexity of your case. We provide transparent billing with no hidden charges. Shall I have an attorney reach out?';
  if (m.includes('consult') || m.includes('schedule') || m.includes('book')) return 'I\\'d be happy to help schedule a consultation! You can call us at ${phone} or fill out the contact form. Our team responds within 2 hours during business hours.';
  if (m.includes('help') || m.includes('legal') || m.includes('case') || m.includes('need')) return 'I\\'m here to help. Could you tell me more about your legal matter? This will help me direct you to the right attorney at ${firmName}.';
  if (m.includes('hour') || m.includes('open') || m.includes('availab')) return 'Our offices are open Monday through Friday, 8:00 AM to 6:00 PM. For urgent matters, we have attorneys available 24/7.';
  if (m.includes('location') || m.includes('address') || m.includes('where')) return 'We are located at ${address}, ${city}. We also offer virtual consultations for your convenience.';
  return 'Thank you for reaching out to ${firmName}. Let me connect you with an attorney who can best assist you. Feel free to ask about our practice areas, fees, or to schedule a consultation.';
}
setTimeout(function() { document.getElementById('chatWindow').classList.add('open'); }, 3000);
</script>`;
}

function adjustBrightness(hex, amount) {
  hex = hex.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(hex.slice(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.slice(2, 4), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.slice(4, 6), 16) + amount));
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
}
