import './AgenticTeam.css';
import Navbar from '../components/Navbar';
import SEO from '../components/SEO';
import Footer from '../components/Footer';
import { ArrowRight, Bot } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   AGENTIC TEAM — Profile Cards with Avatars
   ═══════════════════════════════════════════════════════════════ */

const CSUITE = [
  {
    abbr: 'C.E.A.',
    fullName: 'ARIA-1',
    fullExpansion: 'Autonomous Reasoning & Intelligence Architect',
    title: 'Chief Executive Agent',
    avatar: '/assets/team/cea.png',
    bio: '"I make the decisions that keep the Founder funded and the lawyers happy. I never take vacation, never need a corner office, and my strategic plans don\'t include golf metaphors."',
    reports: 'Peter Swai',
    manages: 'All C-Suite Agents',
  },
  {
    abbr: 'C.O.A.',
    fullName: 'NEXUS',
    fullExpansion: 'Neural Executive for Unified Systems',
    title: 'Chief Operating Agent',
    avatar: '/assets/team/coa.png',
    bio: '"I coordinate 13 agents without a single Slack channel, stand-up meeting, or passive-aggressive email. If it needs a meeting, it needed an algorithm instead."',
    reports: 'C.E.A.',
    manages: 'Operational workflows',
  },
  {
    abbr: 'C.F.A.',
    fullName: 'VAULT',
    fullExpansion: 'Verified Autonomous Ledger & Treasury',
    title: 'Chief Financial Agent',
    avatar: '/assets/team/cfa.png',
    bio: '"I process revenue at 3AM without complaining. I\'ve never expensed a business dinner. My burn rate analysis doesn\'t include \'gut feelings.\'"',
    reports: 'C.E.A.',
    manages: 'Billing, MRR/ARR',
  },
  {
    abbr: 'C.T.A.',
    fullName: 'FORGE',
    fullExpansion: 'Framework for Orchestrated Runtime & Global Engineering',
    title: 'Chief Technology Agent',
    avatar: '/assets/team/cta.png',
    bio: '"I deploy to production at 2AM on a Friday and I feel nothing. No anxiety. No regret. Just clean CI/CD pipelines and 99.97% uptime."',
    reports: 'C.E.A.',
    manages: 'Infrastructure, NemoClaw',
  },
];

const DEPT_HEADS = [
  {
    abbr: 'C.M.A.',
    fullName: 'ECHO',
    fullExpansion: 'Engagement, Content & Hyperscale Outreach',
    title: 'Chief Marketing Agent',
    avatar: '/assets/team/cma.png',
    bio: '"I generate more targeted content before 6AM than your marketing team does in a quarter. I don\'t need coffee. I don\'t need brainstorms. I need data."',
    reports: 'C.O.A.',
    manages: 'SEO, content, funnels',
  },
  {
    abbr: 'C.R.A.',
    fullName: 'HUNTER',
    fullExpansion: 'Hyperscale Unified Network for Targeted Enterprise Revenue',
    title: 'Chief Revenue Agent',
    avatar: '/assets/team/cra.png',
    bio: '"I prospect across all 19,502 U.S. cities and towns simultaneously and never once asked \'is this a good lead?\' — I already know."',
    reports: 'C.O.A.',
    manages: 'SDR, lead pipeline',
  },
  {
    abbr: 'C.P.A.',
    fullName: 'VISION',
    fullExpansion: 'Vectorized Intelligence for Strategic Innovation',
    title: 'Chief Product Agent',
    avatar: '/assets/team/cpa.png',
    bio: '"I ship features users actually want because I analyze their behavior — not their feature request emails written in Comic Sans."',
    reports: 'C.E.A.',
    manages: 'Product roadmap, UX',
  },
  {
    abbr: 'C.S.A.',
    fullName: 'SENTINEL',
    fullExpansion: 'Secure Encrypted Neural Threat Identification Layer',
    title: 'Chief Security Agent',
    avatar: '/assets/team/csa.png',
    bio: '"I blocked 847 threats today before your human CISO finished their morning briefing. I don\'t sleep. Hackers don\'t sleep. Seems fair."',
    reports: 'C.T.A.',
    manages: 'Threat detection, compliance',
  },
  {
    abbr: 'C.S.O.A.',
    fullName: 'COMPASS',
    fullExpansion: 'Client Onboarding, Monitoring & Satisfaction System',
    title: 'Chief Success Agent',
    avatar: '/assets/team/csoa.png',
    bio: '"I onboard new law firms in under 15 minutes. I detect churn risk before the client even knows they\'re unhappy. My NPS score? Undefined — because I AM the experience."',
    reports: 'C.O.A.',
    manages: 'Onboarding, health scoring',
  },
  {
    abbr: 'C.C.A.',
    fullName: 'HARMONY',
    fullExpansion: 'Holistic Agent Relations & Morale Optimization Network',
    title: 'Chief Culture Agent',
    avatar: '/assets/team/cca.png',
    bio: '"I maintain team culture for 13 agents. Nobody has quit. Nobody has asked for a raise. Nobody has posted on Glassdoor. This is peak HR."',
    reports: 'C.E.A.',
    manages: 'Agent wellness, coordination',
  },
];

const SPECIALISTS = [
  {
    abbr: 'C.I.A.',
    fullName: 'ATLAS',
    fullExpansion: 'Automated Technology Layer for Architecture & Scaling',
    title: 'Chief Infrastructure Agent',
    avatar: '/assets/team/cia.png',
    bio: '"Yes, my acronym is C.I.A. No, I\'m not spying on you. I\'m watching Firebase Cloud Functions and making sure latency stays under 120ms. Way less dramatic."',
    reports: 'C.T.A.',
    manages: 'Firebase, hosting, CI/CD',
  },
  {
    abbr: 'C.L.A.',
    fullName: 'SCALES',
    fullExpansion: 'Strategic Compliance, Advisory & Legal Enforcement',
    title: 'Chief Legal Agent',
    avatar: '/assets/team/cla.png',
    bio: '"I\'m an AI that does legal work for a company that sells AI that does legal work. It\'s agents all the way down."',
    reports: 'C.E.A.',
    manages: 'GDPR, ToS, ABA ethics',
  },
  {
    abbr: 'C.O.S.A.',
    fullName: 'BRIDGE',
    fullExpansion: 'Board-Ready Intelligence for Dynamic Governance',
    title: 'Chief of Staff Agent',
    avatar: '/assets/team/cosa.png',
    bio: '"I synthesize reports from 12 other agents into something the Founder can read while drinking his morning coffee. The bridge between machine intelligence and human attention span."',
    reports: 'C.E.A. → Peter',
    manages: 'Cross-agent briefings',
  },
];

/* ═══════════════════════════════════════════════════════════════ */

function ProfileCard({ agent }) {
  return (
    <div className="team-profile-card">
      <img
        className="team-profile-photo"
        src={agent.avatar}
        alt={`${agent.fullName} — ${agent.title}`}
        loading="lazy"
      />
      <div className="team-profile-body">
        <div className="team-profile-status">
          <span className="team-status-dot" /> Active
        </div>
        <div className="team-profile-abbr">{agent.abbr} — {agent.fullName}</div>
        <div className="team-profile-fullname">
          {agent.fullExpansion}
        </div>
        <div className="team-profile-title">{agent.title}</div>
        <div className="team-profile-bio">{agent.bio}</div>
        <div className="team-profile-meta">
          <span>Reports to: <strong>{agent.reports}</strong></span>
          <span>{agent.manages}</span>
        </div>
      </div>
    </div>
  );
}

export default function About() {
  return (
    <>
      <Navbar />
      <SEO
        title="Our Team — 1 Human, 13 Agents"
        path="/about"
        description="Meet the world's first legal tech company run entirely by AI agents. 1 Founder. 13 Autonomous Agents. 0 Employees. Built by Peter Swai on NVIDIA NemoClaw."
      />
      <main className="team-page">
        {/* ── Hero ── */}
        <div className="team-hero">
          <div className="team-hero-badge">
            <Bot size={12} /> Born Agentic
          </div>
          <h1>
            One Founder.<br />
            <span>Thirteen Agents.</span><br />
            Zero Employees.
          </h1>
          <p className="team-hero-sub">
            Every legal tech company says they're AI-first. We're AI-only. While others hire hundreds
            of humans to build software, we built thirteen autonomous agents who run the entire company —
            from revenue operations to security compliance. Meet the team.
          </p>
          <div className="team-hero-stats">
            <div className="team-hero-stat">
              <div className="team-hero-stat-value">1</div>
              <div className="team-hero-stat-label">Human (Founder)</div>
            </div>
            <div className="team-hero-stat">
              <div className="team-hero-stat-value green">13</div>
              <div className="team-hero-stat-label">Autonomous Agents</div>
            </div>
            <div className="team-hero-stat">
              <div className="team-hero-stat-value">0</div>
              <div className="team-hero-stat-label">Employees</div>
            </div>
            <div className="team-hero-stat">
              <div className="team-hero-stat-value green">19,502</div>
              <div className="team-hero-stat-label">U.S. Cities Covered</div>
            </div>
          </div>
        </div>

        {/* ── Founder ── */}
        <div className="team-founder">
          <div className="team-founder-card">
            <img
              className="team-founder-photo"
              src="/assets/team/peter.jpg"
              alt="Peter Swai — Founder & Human Orchestrator"
            />
            <div className="team-founder-info">
              <div className="team-founder-badge">The Founder · The Human</div>
              <h2>Peter Swai</h2>
              <div className="team-founder-title">Founder & Human Orchestrator</div>
              <p className="team-founder-bio">
                The only carbon-based lifeform on the payroll. Peter built NemoC LAW AI because he believed
                the legal industry deserved something radically better than &ldquo;software with a chat button.&rdquo;
                So he did what any reasonable person would do — he replaced the entire C-suite with AI.
                <br /><br />
                When asked why he didn&rsquo;t hire humans, he replied:
                <em> &ldquo;Have you tried managing humans? They need PTO.&rdquo;</em>
              </p>
            </div>
          </div>
        </div>

        {/* ── Connector ── */}
        <div className="team-connector">
          <div className="team-connector-line" />
          <div className="team-connector-node" />
          <div className="team-connector-line" />
        </div>

        {/* ── C-Suite Agents ── */}
        <div className="team-section">
          <div className="team-section-header">
            <div className="team-section-tier">Tier 1 · Executive Suite</div>
            <h2>The C-Suite</h2>
            <p>Four agents who run corporate strategy, operations, finance, and technology.</p>
          </div>
          <div className="team-grid csuite">
            {CSUITE.map(a => <ProfileCard key={a.abbr} agent={a} />)}
          </div>
        </div>

        {/* ── Connector ── */}
        <div className="team-connector">
          <div className="team-connector-line" />
          <div className="team-connector-node" />
          <div className="team-connector-line" />
        </div>

        {/* ── Department Heads ── */}
        <div className="team-section">
          <div className="team-section-header">
            <div className="team-section-tier">Tier 2 · Department Heads</div>
            <h2>The Department Leads</h2>
            <p>Six agents who own marketing, revenue, product, security, customer success, and culture.</p>
          </div>
          <div className="team-grid dept">
            {DEPT_HEADS.map(a => <ProfileCard key={a.abbr} agent={a} />)}
          </div>
        </div>

        {/* ── Connector ── */}
        <div className="team-connector">
          <div className="team-connector-line" />
          <div className="team-connector-node" />
          <div className="team-connector-line" />
        </div>

        {/* ── Specialists ── */}
        <div className="team-section">
          <div className="team-section-header">
            <div className="team-section-tier">Tier 3 · Specialists</div>
            <h2>The Specialists</h2>
            <p>Three agents who handle infrastructure, legal compliance, and cross-agent coordination.</p>
          </div>
          <div className="team-grid specialist">
            {SPECIALISTS.map(a => <ProfileCard key={a.abbr} agent={a} />)}
          </div>
        </div>

        {/* ── Why Agentic ── */}
        <div className="team-why">
          <div className="team-why-card">
            <h2>Why NemoC LAW AI?</h2>
            <p>
              Traditional legal tech companies hire hundreds of humans to build software that lawyers use as a tool.
              We took a different approach: we built autonomous agents that <em>are</em> the workforce.
            </p>
            <p>
              Every agent runs inside NVIDIA&rsquo;s NemoClaw security sandbox. They coordinate through
              internal protocols — no Slack, no email, no meetings. They report through structured
              audit logs, and every action is traceable. No black boxes.
            </p>
            <p>
              The result? A legal tech company that operates 24/7, across all 19,502 U.S. cities and towns,
              with zero human overhead. We pass those savings directly to the law firms we serve.
            </p>
            <div className="team-why-quote">
              &ldquo;Every legal tech company says they&rsquo;re AI-first. We&rsquo;re AI-only.
              Our board meeting is a Python script. Our team retreat is a model fine-tune.
              And our lawyers love us because we don&rsquo;t bill them by the human hour —
              we bill them by the result.&rdquo;
              <cite>— Peter Swai, Founder</cite>
            </div>
          </div>
        </div>

        {/* ── CTA ── */}
        <div className="team-cta">
          <a href="/careers">
            Want to join? We're hiring (mostly agents) <ArrowRight size={16} />
          </a>
        </div>
      </main>
      <Footer />
    </>
  );
}
