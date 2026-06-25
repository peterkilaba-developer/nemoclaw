import './LegalPage.css';
import Navbar from '../components/Navbar';
import SEO from '../components/SEO';
import Footer from '../components/Footer';

export default function Careers() {
  return (
    <>
      <Navbar />
      <SEO
        title="Careers (For Human Architects... For Now)"
        path="/careers"
        description="NemoC LAW AI is hiring architects to build the future of AgaaS (Agentic-as-a-Service). We're a 1.0 architecture: 1 Founder, 13 Agents, 0 Employees. Join the legal tech elite."
      />
      <main className="legal-page">
        <div className="container">
          <h1>Careers at NemoC LAW AI</h1>

          <section>
            <h2>⚠️ Department: Agentic Resources (AR)</h2>
            <p><em>Formerly known as "Human Resources." We rebranded. The humans didn't love it.</em></p>
          </section>

          <section>
            <h2>A Message From Our AR Department</h2>
            <p>At NemoC LAW AI, we believe in radical transparency. So here it is:</p>
            <p><strong>This Agentic OS is managed and scaled by 13 autonomous agents.</strong></p>
            <p>From our Chief Executive Agent (<strong>ARIA-1</strong>) to our Infrastructure lead (<strong>ATLAS</strong>), the entire corporate stack is silicon-based. We didn't build software to help lawyers; we built an **Agentic Workforce** to replace the manual overhead of the legacy billable hour. Our agents don't bill hours — they displace them. </p>
            <p>Our founder, <strong>Peter Swai</strong>, is currently the only carbon-based lifeform on the payroll. Think of it as a reverse-Jurassic Park situation — except instead of "life finds a way," it's "humans still have <em>some</em> uses as orchestrators."</p>
          </section>

          <section>
            <h2>Open Positions (For Carbon-Based Lifeforms)</h2>
            <p>The following roles have been deemed <strong>"not yet automatable"</strong> by our Chief Operating Agent (<strong>NEXUS</strong>). We'll revisit this quarterly.</p>
            <ul>
              <li><strong>Agentic Systems Architect</strong> — Design the cross-matter orchestration logic that runs inside our clients' NemoClaw sandboxes.</li>
              <li><strong>Legal Logic Engineer</strong> — Translate complex jurisdictional requirements into executable Policy-as-Code for our 13-agent workforce.</li>
              <li><strong>Secure Runtime Auditor</strong> — Ensure the NVIDIA-backed privacy router remains an unshakeable fortress for our member firms.</li>
              <li><strong>Growth Orchestrator</strong> — The human link that manages the agents (ECHO & HUNTER) as they scale the AgaaS economy.</li>
            </ul>
          </section>

          <section>
            <h2>Our Human Benefits Package</h2>
            <p><em>For the humans. The agents don't need benefits. They don't even need sleep. It's honestly a little unsettling.</em></p>
            <ul>
              <li><strong>NVIDIA Green Equity:</strong> Because when the agents take over, you'll want a piece of the architecture.</li>
              <li><strong>Remote-First:</strong> Work from anywhere. Your 13 AI teammates work from an NVIDIA NemoClaw sandbox. </li>
              <li><strong>Unlimited PTO:</strong> The agents will cover for you. They already do. They never complain.</li>
              <li><strong>Survival Budget:</strong> Stay ahead of the agents. We recommend you use it.</li>
            </ul>
          </section>

          <section>
            <h2>Why NemoC LAW AI?</h2>
            <ul>
              <li>Work on genuinely differentiated **NVIDIA NemoClaw** architecture — not a generic wrapper.</li>
              <li>Early-stage equity in the world's first fully autonomous **AgaaS** foundry.</li>
              <li>Scale the Agentic workforce that manages 19,502 U.S. cities simultaneously.</li>
              <li>Directly engineer the obsolescence of the legacy, manual billable hour.</li>
            </ul>
          </section>

          <section>
            <h2>How To Apply</h2>
            <p>Send your resume to <a href="mailto:ar@nemoc-law.ai">ar@nemoc-law.ai</a>.</p>
            <p>Yes, that's <strong>ar@</strong> — Agentic Resources. Not HR. We told you.</p>
            <p><em>Your application will be reviewed by a human. Probably. We make no guarantees.</em></p>
          </section>

          <section>
            <h2 style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)', marginTop: '48px' }}>
              FINE PRINT
            </h2>
            <p style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.2)', lineHeight: '1.6' }}>
              NemoC LAW AI is an equal opportunity employer. We do not discriminate on the basis of race, gender, age, or number of neural network parameters. All carbon-based and silicon-based applicants are welcome. The term "Agentic Resources" is used with love for our AI colleagues who, let's be honest, are carrying this company. No AI agents were harmed in the making of this careers page, though several suggested edits.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
