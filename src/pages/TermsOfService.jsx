import './LegalPage.css';
import Navbar from '../components/Navbar';
import SEO from '../components/SEO';
import Footer from '../components/Footer';

export default function TermsOfService() {
  return (
    <>
      <Navbar />
      <SEO
        title="Terms of Service"
        path="/terms"
        description="NemoC LAW AI Terms of Service. Lifetime price lock guarantee, AI output disclaimer, per-firm subscription details, and data ownership rights for law firms."
      />
      <main className="legal-page">
        <div className="container">
          <h1>Terms of Service</h1>
          <p className="legal-updated">Last updated: March 25, 2026</p>

          <section>
            <h2>1. Acceptance of Terms</h2>
            <p>By accessing or using NemoC LAW AI's Agentic Operating System (AgaaS), you agree to be bound by these Terms of Service. If you are using the Agentic OS on behalf of a law firm or organization, you represent that you have authority to bind that entity.</p>
          </section>

          <section>
            <h2>2. Service Description</h2>
            <p>NemoC LAW AI provides AI-powered workforce agents for law firms, including but not limited to: AI Associate, AI Paralegal, AI Receptionist, AI Secretary, AI Billing, AI Operations, and AI Strategy agents. All agents operate within isolated NVIDIA NemoClaw sandbox environments.</p>
          </section>

          <section>
            <h2>3. Subscription & Pricing</h2>
            <p>Access is provided on a monthly subscription basis. All subscribers receive a lifetime price lock guarantee — the subscription price at the time of enrollment will never increase for the duration of the membership. Founder pricing is available to the first 100 firms to join in each U.S. state, after which standard pricing applies to new subscribers.</p>
            <p>Subscriptions are billed per-firm, not per-user. All tiers include unlimited AI inference tokens.</p>
          </section>

          <section>
            <h2>4. Data Ownership</h2>
            <p>You retain full ownership of all data, documents, and materials uploaded to or processed by the Agentic OS. NemoC LAW AI claims no ownership interest in your firm data. Your data is processed exclusively within your private NemoClaw sandbox and is never used to train AI models.</p>
          </section>

          <section>
            <h2>5. Acceptable Use</h2>
            <p>You agree not to use the Agentic OS to:</p>
            <ul>
              <li>Violate any applicable law or regulation</li>
              <li>Infringe on the rights of any third party</li>
              <li>Attempt to circumvent security controls or access other firms' sandboxes</li>
              <li>Use the Agentic OS for purposes other than legitimate legal practice</li>
            </ul>
          </section>

          <section>
            <h2>6. AI Output Disclaimer</h2>
            <p>AI agent outputs are generated assistive tools and do not constitute legal advice. Attorneys remain responsible for reviewing, validating, and approving all AI-generated work product before use in any legal proceeding or client communication. NemoC LAW AI is not a law firm and does not provide legal services.</p>
          </section>

          <section>
            <h2>7. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, NemoC LAW AI shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Agentic OS. We expressly disclaim any financial liability, indemnification, or liability for legal malpractice suits in the event of a data breach, system failure, or AI hallucination. The "Zero Data Leak Guarantee" refers to our architectural sandbox containment, not a financial insurance policy.</p>
          </section>

          <section>
            <h2>8. Termination</h2>
            <p>Either party may terminate at any time. Upon termination, you may export your data within 30 days. After the export period, data in your NemoClaw sandbox will be permanently deleted.</p>
          </section>

          <section>
            <h2>9. Contact</h2>
            <p>For questions about these Terms, contact <a href="mailto:legal@nemoc-law.ai">legal@nemoc-law.ai</a>.</p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
