import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import './LegalPage.css';

export default function PrivacyPolicy() {
  return (
    <>
      <Navbar />
      <SEO
        title="Privacy Policy"
        path="/privacy"
        description="NemoC Law AI's Privacy Policy. Learn how we protect your data with our Zero Data Leak Guarantee, NVIDIA NemoClaw sandbox isolation, and AES-256 encryption."
      />
      <main className="legal-page">
        <div className="container">
          <h1>Privacy Policy</h1>
          <p className="legal-updated">Last updated: March 25, 2026</p>

          <section>
            <h2>1. Introduction</h2>
            <p>NemoC Law AI ("Company," "we," "us," or "our") is committed to protecting the privacy and security of your personal information. This Privacy Policy describes how we collect, use, and share information in connection with your use of our Agentic Operating System (AgaaS).</p>
          </section>

          <section>
            <h2>2. Information We Collect</h2>
            <h3>Account Information</h3>
            <p>When you create an account, we collect your name, email address, and profile information.</p>
            <h3>Usage Data</h3>
            <p>We collect information about how you interact with our Agentic OS, including features used, agent interactions, and session data.</p>
            <h3>Firm Data</h3>
            <p>Documents, contracts, and other materials you upload to be processed by our AI agents are stored exclusively within your firm's private NemoClaw sandbox environment.</p>
          </section>

          <section>
            <h2>3. Zero Data Leak Guarantee</h2>
            <p>All firm data processed by NemoC LAW AI agents runs inside an isolated NVIDIA NemoClaw sandbox. Your firm data:</p>
            <ul>
              <li>Never leaves your designated runtime environment</li>
              <li>Is never used to train any AI model</li>
              <li>Is fully encrypted at rest (AES-256) and in transit (TLS 1.3)</li>
              <li>Is never shared with third parties</li>
              <li>Is subject to complete audit logging</li>
            </ul>
          </section>

          <section>
            <h2>4. How We Use Information</h2>
            <ul>
              <li>To provide and improve our Agentic OS</li>
              <li>To communicate with you about your account and services</li>
              <li>To comply with legal obligations</li>
              <li>To protect the security of our Agentic OS</li>
            </ul>
          </section>

          <section>
            <h2>5. Data Retention</h2>
            <p>We retain your account information for the duration of your subscription. Firm data in your NemoClaw sandbox is retained according to your firm's configured retention policy and can be exported or deleted at any time.</p>
          </section>

          <section>
            <h2>6. Your Rights</h2>
            <p>You have the right to access, correct, delete, or export your personal data at any time. Contact us at <a href="mailto:privacy@nemoc-law.ai">privacy@nemoc-law.ai</a> to exercise these rights.</p>
          </section>

          <section>
            <h2>7. Contact</h2>
            <p>For questions about this Privacy Policy, contact our Data Protection Officer at <a href="mailto:privacy@nemoc-law.ai">privacy@nemoc-law.ai</a>.</p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
