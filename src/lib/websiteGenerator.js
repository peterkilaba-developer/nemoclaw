/**
 * Generates a law firm website from verified configuration data.
 *
 * This generator is intentionally truth-preserving: it does not invent reviews,
 * case results, attorney bios, phone numbers, office hours, or success metrics.
 */

export function generateCustomWebsite(config = {}, _domain) {
  const firmName = text(config.firmName || 'Law Firm');
  const tagline = text(config.tagline || 'Legal Services');
  const description = text(config.description || 'Verified firm content has not been provided yet.');
  const phone = text(config.phone || '');
  const email = text(config.email || '');
  const address = text(config.address || '');
  const city = text(config.city || '');
  const attorneys = normalizeList(config.attorneys);
  const practiceCards = normalizePracticeAreas(config.practiceAreasWithDesc || config.practiceAreas);
  const stats = normalizeStats(config.stats);
  const testimonials = normalizeTestimonials(config.testimonials);
  const googleReviews = normalizeGoogleReviews(config.googleReviews);
  const serviceAreas = normalizeList(config.serviceAreas).map(area => text(area));
  const yearEstablished = config.yearEstablished ? text(config.yearEstablished) : '';
  const colors = config.colors || {};
  const primary = validHex(colors.primary) || '#1f2937';
  const accent = validHex(colors.accent) || '#76b900';
  const bg = validHex(colors.bg) || '#ffffff';
  const warm = validHex(colors.warm) || '#f8fafc';
  const primaryLight = adjustBrightness(primary, 28);
  const initials = initialsFromName(firmName);
  const contactLinks = buildContactLinks({ phone, email, address, city });
  const hasContact = Boolean(phone || email || address);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(firmName)} - ${escapeHtml(tagline)}</title>
<meta name="description" content="${escapeHtml(description.slice(0, 160))}">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--primary:${primary};--primary-light:${primaryLight};--accent:${accent};--text:#172033;--muted:#64748b;--bg:${bg};--warm:${warm};--border:#e2e8f0;font-family:Inter,Arial,sans-serif}
body{background:var(--bg);color:var(--text);line-height:1.6;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
.header{position:sticky;top:0;z-index:20;background:rgba(255,255,255,.96);border-bottom:1px solid var(--border)}
.header-inner{max-width:1180px;margin:0 auto;height:72px;display:flex;align-items:center;justify-content:space-between;padding:0 24px}
.logo{display:flex;align-items:center;gap:12px;font-weight:800;font-size:1.2rem;color:var(--primary)}
.logo-mark{width:38px;height:38px;border-radius:8px;background:var(--primary);color:#fff;display:grid;place-items:center;font-size:.8rem}
.nav{display:flex;align-items:center;gap:24px;font-size:.9rem;color:var(--muted)}
.nav a:hover{color:var(--primary)}
.nav-cta{padding:10px 18px;border-radius:8px;background:var(--primary);color:#fff}
.hero{background:linear-gradient(145deg,var(--primary),#0f172a);color:#fff;padding:96px 24px}
.hero-inner{max-width:1180px;margin:0 auto;display:grid;grid-template-columns:minmax(0,1.15fr) minmax(280px,.85fr);gap:56px;align-items:center}
.eyebrow{display:inline-block;margin-bottom:16px;padding:6px 12px;border:1px solid rgba(255,255,255,.16);border-radius:999px;color:#d9f99d;font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em}
h1{font-size:clamp(2.2rem,5vw,4rem);line-height:1.05;margin-bottom:20px}
.hero p{font-size:1.05rem;max-width:650px;color:rgba(255,255,255,.78);margin-bottom:28px}
.hero-actions{display:flex;flex-wrap:wrap;gap:12px}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:46px;padding:0 22px;border-radius:8px;border:1px solid rgba(255,255,255,.24);font-weight:700}
.btn.primary{background:var(--accent);border-color:var(--accent);color:#0b1017}
.btn.disabled{opacity:.72;cursor:not-allowed}
.fact-panel{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);border-radius:12px;padding:28px}
.fact-panel h2{font-size:1rem;margin-bottom:16px}
.fact-list{display:grid;gap:12px}
.fact{padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,.08);font-size:.92rem;color:rgba(255,255,255,.82)}
.fact:last-child{border-bottom:0;padding-bottom:0}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px;margin-top:32px}
.stat{padding:18px;border:1px solid rgba(255,255,255,.12);border-radius:10px;background:rgba(255,255,255,.05)}
.stat-value{font-size:1.7rem;font-weight:800;color:#d9f99d}
.stat-label{font-size:.82rem;color:rgba(255,255,255,.66)}
.section{padding:80px 24px}
.section.warm{background:var(--warm)}
.section-inner{max-width:1180px;margin:0 auto}
.label{color:var(--accent);font-size:.76rem;font-weight:800;text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px}
.title{font-size:clamp(1.8rem,3vw,2.5rem);line-height:1.15;color:var(--primary);margin-bottom:14px}
.desc{color:var(--muted);max-width:680px;margin-bottom:34px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px}
.card{background:#fff;border:1px solid var(--border);border-radius:10px;padding:24px}
.card h3{font-size:1rem;color:var(--primary);margin-bottom:8px}
.card p{color:var(--muted);font-size:.92rem}
.team-card{text-align:center}
.avatar{width:84px;height:84px;border-radius:50%;background:var(--primary);color:#fff;margin:0 auto 14px;display:grid;place-items:center;font-weight:800}
.small{font-size:.82rem;color:var(--muted)}
.contact-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,.85fr);gap:38px}
.contact-list{display:grid;gap:12px;margin-top:18px}
.contact-item{padding:14px 16px;border:1px solid var(--border);border-radius:8px;background:#fff}
.contact-item strong{display:block;color:var(--primary);font-size:.82rem;text-transform:uppercase;letter-spacing:.05em}
.form-note{padding:18px;border:1px solid var(--border);border-radius:10px;background:#fff;color:var(--muted)}
.footer{background:var(--primary);color:rgba(255,255,255,.76);padding:38px 24px}
.footer-inner{max-width:1180px;margin:0 auto;display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;font-size:.86rem}
@media(max-width:760px){.hero-inner,.contact-grid{grid-template-columns:1fr}.nav a:not(.nav-cta){display:none}.hero{padding:64px 20px}.section{padding:58px 20px}}
</style>
</head>
<body>
<header class="header">
  <div class="header-inner">
    <a class="logo" href="#"><span class="logo-mark">${escapeHtml(initials)}</span>${escapeHtml(firmName)}</a>
    <nav class="nav">
      ${practiceCards.length ? '<a href="#practice">Practice Areas</a>' : ''}
      ${attorneys.length ? '<a href="#team">Team</a>' : ''}
      ${testimonials.length || googleReviews ? '<a href="#reviews">Reviews</a>' : ''}
      <a class="nav-cta" href="#contact">Contact</a>
    </nav>
  </div>
</header>

<main>
  <section class="hero">
    <div class="hero-inner">
      <div>
        <span class="eyebrow">${escapeHtml(tagline)}</span>
        <h1>${escapeHtml(firmName)}</h1>
        <p>${escapeHtml(description)}</p>
        <div class="hero-actions">
          ${phone ? `<a class="btn primary" href="tel:${escapeAttr(phone.replace(/[^+\d]/g, ''))}">Call ${escapeHtml(phone)}</a>` : ''}
          ${email ? `<a class="btn" href="mailto:${escapeAttr(email)}">Email the Firm</a>` : ''}
          ${!hasContact ? '<span class="btn disabled">Contact details pending</span>' : ''}
        </div>
        ${stats.length ? `<div class="stats">${stats.map(renderStat).join('')}</div>` : ''}
      </div>
      <aside class="fact-panel">
        <h2>Verified Site Data</h2>
        <div class="fact-list">
          <div class="fact">${practiceCards.length ? `${practiceCards.length} practice areas detected` : 'Practice areas not yet verified'}</div>
          <div class="fact">${attorneys.length ? `${attorneys.length} attorneys detected` : 'Attorney roster not yet verified'}</div>
          <div class="fact">${hasContact ? 'Contact data available' : 'Contact data missing'}</div>
          <div class="fact">${testimonials.length || googleReviews ? 'Verified review data available' : 'No verified review data detected'}</div>
        </div>
      </aside>
    </div>
  </section>

  ${practiceCards.length ? `
  <section class="section warm" id="practice">
    <div class="section-inner">
      <div class="label">Practice Areas</div>
      <h2 class="title">Legal Services</h2>
      <p class="desc">The following services were detected from verified firm data. Review and approve all copy before publishing.</p>
      <div class="grid">${practiceCards.map(renderPractice).join('')}</div>
    </div>
  </section>` : ''}

  ${attorneys.length ? `
  <section class="section" id="team">
    <div class="section-inner">
      <div class="label">Team</div>
      <h2 class="title">Attorneys</h2>
      <div class="grid">${attorneys.map(renderAttorney).join('')}</div>
    </div>
  </section>` : ''}

  ${renderReviewsSection(testimonials, googleReviews)}

  ${serviceAreas.length ? `
  <section class="section warm">
    <div class="section-inner">
      <div class="label">Service Areas</div>
      <h2 class="title">Locations Served</h2>
      <div class="grid">${serviceAreas.map(area => `<div class="card"><h3>${escapeHtml(area)}</h3></div>`).join('')}</div>
    </div>
  </section>` : ''}

  <section class="section" id="contact">
    <div class="section-inner contact-grid">
      <div>
        <div class="label">Contact</div>
        <h2 class="title">Reach ${escapeHtml(firmName)}</h2>
        <p class="desc">${hasContact ? 'Use the verified contact details below.' : 'Verified contact details have not been provided yet.'}</p>
        <div class="contact-list">${contactLinks.map(renderContact).join('') || '<div class="contact-item">No verified contact method available.</div>'}</div>
      </div>
      <div class="form-note">
        Lead capture is disabled until a verified delivery endpoint is connected. Add a firm email, CRM, or intake webhook before publishing this form.
      </div>
    </div>
  </section>
</main>

<footer class="footer">
  <div class="footer-inner">
    <span>${escapeHtml(firmName)}</span>
    <span>${yearEstablished ? `Established ${escapeHtml(yearEstablished)}. ` : ''}Content should be reviewed by the firm before publication.</span>
  </div>
</footer>

${config.chatAgent?.enabled ? generateContactWidget(config.chatAgent, { firmName, phone, email }, practiceCards) : ''}
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

function renderPractice(area) {
  return `<article class="card"><h3>${escapeHtml(text(area.name))}</h3><p>${escapeHtml(text(area.description))}</p></article>`;
}

function renderAttorney(attorney) {
  const name = text(attorney.name);
  return `<article class="card team-card"><div class="avatar">${escapeHtml(attorney.initials || initialsFromName(name))}</div><h3>${escapeHtml(name)}</h3><p class="small">${escapeHtml(text(attorney.title || 'Attorney'))}</p>${attorney.bio ? `<p>${escapeHtml(text(attorney.bio))}</p>` : ''}</article>`;
}

function renderReviewsSection(testimonials, googleReviews) {
  const cards = [...testimonials];
  if (googleReviews?.reviews?.length) {
    cards.push(...googleReviews.reviews.map(review => ({
      text: review.text,
      name: review.author,
      role: review.date ? `Google review - ${review.date}` : 'Google review',
      initials: initialsFromName(review.author),
    })));
  }
  if (!cards.length && !googleReviews) return '';

  const summary = googleReviews
    ? `<p class="desc">${googleReviews.rating ? `Google rating: ${escapeHtml(String(googleReviews.rating))}. ` : ''}${googleReviews.totalReviews ? `${escapeHtml(String(googleReviews.totalReviews))} reviews detected.` : 'Review data detected.'}</p>`
    : '';

  return `
  <section class="section warm" id="reviews">
    <div class="section-inner">
      <div class="label">Reviews</div>
      <h2 class="title">Verified Client Feedback</h2>
      ${summary}
      ${cards.length ? `<div class="grid">${cards.slice(0, 6).map(renderTestimonial).join('')}</div>` : ''}
    </div>
  </section>`;
}

function renderTestimonial(item) {
  return `<article class="card"><p>${escapeHtml(text(item.text))}</p><p class="small">${escapeHtml(text(item.name))} - ${escapeHtml(text(item.role))}</p></article>`;
}

function renderContact(item) {
  const value = escapeHtml(text(item.value));
  const inner = `<strong>${escapeHtml(text(item.label))}</strong>${value}`;
  return item.href
    ? `<a class="contact-item" href="${escapeAttr(item.href)}">${inner}</a>`
    : `<div class="contact-item">${inner}</div>`;
}

function generateContactWidget(agent = {}, contact = {}, practiceCards = []) {
  const name = text(agent.name || 'Contact Assistant');
  const primaryColor = validHex(agent.primaryColor) || '#1f2937';
  const pos = agent.position === 'left' ? 'left:24px' : 'right:24px';
  const capabilities = Array.isArray(agent.capabilities) ? agent.capabilities.map(item => String(item).toLowerCase()) : [];
  const hasText = capabilities.length === 0 || capabilities.includes('text') || capabilities.some(item => item.includes('chat'));
  const hasVoice = agent.voiceEnabled !== false && (capabilities.includes('voice') || capabilities.some(item => item.includes('voice')));
  const hasScheduling = capabilities.includes('scheduling') || capabilities.some(item => item.includes('schedul'));
  const practiceNames = practiceCards.map(area => text(area.name)).filter(Boolean).slice(0, 6);
  const phoneLink = contact.phone ? `<a href="tel:${escapeAttr(contact.phone.replace(/[^+\d]/g, ''))}">Call ${escapeHtml(contact.phone)}</a>` : '';
  const emailLink = contact.email ? `<a href="mailto:${escapeAttr(contact.email)}">Email ${escapeHtml(contact.firmName)}</a>` : '';
  const greeting = text(agent.greeting || `Hello, this is ${contact.firmName}. How can I help?`);
  const widgetId = `reception-${Math.random().toString(36).slice(2, 8)}`;

  return `
<style>
.contact-widget{position:fixed;bottom:24px;${pos};z-index:50;width:min(360px,calc(100vw - 48px));background:#fff;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 18px 48px rgba(0,0,0,.18);overflow:hidden}
.contact-widget header{background:${primaryColor};color:#fff;padding:14px 16px}
.contact-widget h3{font-size:.95rem;margin:0}
.contact-widget small{display:block;margin-top:3px;opacity:.76}
.reception-body{padding:14px 16px;color:#64748b;font-size:.86rem}
.reception-messages{display:grid;gap:8px;max-height:170px;overflow:auto;margin-bottom:12px}
.reception-msg{padding:9px 11px;border-radius:10px;background:#f8fafc;color:#334155}
.reception-msg.user{background:${primaryColor};color:#fff;margin-left:30px}
.reception-quick{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}
.reception-quick button,.reception-actions button{border:1px solid #e2e8f0;background:#fff;border-radius:999px;padding:7px 10px;color:${primaryColor};font-weight:800;cursor:pointer;font-size:.72rem}
.reception-form{display:flex;gap:6px}
.reception-form input{flex:1;border:1px solid #e2e8f0;border-radius:8px;padding:9px 10px;font-size:.82rem}
.reception-form button{border:0;border-radius:8px;padding:0 11px;background:${primaryColor};color:#fff;font-weight:800;cursor:pointer}
.reception-actions{display:flex;justify-content:space-between;gap:8px;margin-top:10px;flex-wrap:wrap}
.reception-actions a{color:${primaryColor};font-weight:800}
</style>
<aside class="contact-widget" id="${escapeAttr(widgetId)}">
  <header>
    <h3>${escapeHtml(name)}</h3>
    <small>${hasVoice ? 'Chat and voice receptionist online' : 'Chat receptionist online'}</small>
  </header>
  <div class="reception-body">
    <div class="reception-messages" data-reception-messages>
      <div class="reception-msg">${escapeHtml(greeting)}</div>
    </div>
    <div class="reception-quick">
      ${practiceNames.length ? '<button type="button" data-reception-prompt="practice">Practice areas</button>' : ''}
      ${hasScheduling ? '<button type="button" data-reception-prompt="schedule">Schedule consult</button>' : ''}
      ${phoneLink ? '<button type="button" data-reception-prompt="call">Call firm</button>' : ''}
    </div>
    ${hasText ? `
    <form class="reception-form" data-reception-form>
      <input aria-label="Message receptionist" placeholder="Ask the receptionist..." />
      <button type="submit">Send</button>
      ${hasVoice ? '<button type="button" data-reception-voice aria-label="Use voice">Mic</button>' : ''}
    </form>` : ''}
    <div class="reception-actions">
      ${phoneLink}
      ${emailLink}
      ${!phoneLink && !emailLink ? '<span>No verified delivery method is connected yet.</span>' : ''}
    </div>
  </div>
</aside>
<script>
(function(){
  var widget = document.getElementById(${JSON.stringify(widgetId)});
  if (!widget) return;
  var messages = widget.querySelector('[data-reception-messages]');
  var form = widget.querySelector('[data-reception-form]');
  var input = form && form.querySelector('input');
  var practices = ${JSON.stringify(practiceNames)};
  var phone = ${JSON.stringify(contact.phone || '')};
  function add(text, kind) {
    var node = document.createElement('div');
    node.className = 'reception-msg' + (kind === 'user' ? ' user' : '');
    node.textContent = text;
    messages.appendChild(node);
    messages.scrollTop = messages.scrollHeight;
  }
  function reply(prompt) {
    var lower = String(prompt || '').toLowerCase();
    if (lower === 'practice' || lower.includes('practice')) {
      add(practices.length ? 'We can help with: ' + practices.join(', ') + '. Tell me what issue you are facing and I will prepare intake notes.' : 'Practice areas are still being verified. Tell me what legal issue you are facing and the firm can route it.');
      return;
    }
    if (lower === 'schedule' || lower.includes('appointment') || lower.includes('consult')) {
      add('I can collect your name, contact information, and matter type for a consultation request. A connected calendar or intake endpoint is required before this form can submit live leads.');
      return;
    }
    if (lower === 'call' || lower.includes('phone')) {
      add(phone ? 'You can call the firm at ' + phone + '.' : 'No verified phone number is connected yet.');
      return;
    }
    add('Thanks. I can help collect intake details, explain verified practice areas, or connect you with the firm. Please avoid sharing confidential details until an attorney-client relationship is confirmed.');
  }
  widget.querySelectorAll('[data-reception-prompt]').forEach(function(button){
    button.addEventListener('click', function(){ reply(button.getAttribute('data-reception-prompt')); });
  });
  if (form) {
    form.addEventListener('submit', function(event){
      event.preventDefault();
      var value = input.value.trim();
      if (!value) return;
      add(value, 'user');
      input.value = '';
      reply(value);
    });
  }
  var voiceButton = widget.querySelector('[data-reception-voice]');
  if (voiceButton) {
    voiceButton.addEventListener('click', function(){
      var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        reply('voice unavailable');
        return;
      }
      var recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.onresult = function(event) {
        var transcript = event.results[0][0].transcript;
        add(transcript, 'user');
        reply(transcript);
      };
      recognition.start();
    });
  }
})();
</script>`;
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

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

function validHex(value) {
  return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : null;
}

function adjustBrightness(hex, amount) {
  const clean = String(hex || '').replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(clean.slice(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(clean.slice(2, 4), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(clean.slice(4, 6), 16) + amount));
  return `#${[r, g, b].map(channel => channel.toString(16).padStart(2, '0')).join('')}`;
}
