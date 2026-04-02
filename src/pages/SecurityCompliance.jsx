import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import './LegalPage.css';

export default function SecurityCompliance() {
  return (
    <>
      <Navbar />
      <SEO
        title="Security & Compliance"
        path="/security-compliance"
        description="NemoC Law AI security overview. SOC 2 compliance, NVIDIA NemoClaw 5-layer security, ABA ethics compliance, encryption standards, and penetration testing."
      />
      <main className="legal-page">
        <div className="container">
          <h1>Security & Compliance</h1>
          <p className="legal-updated">Last updated: March 25, 2026</p>

          <section>
            <h2>SOC 2 Type II Compliance</h2>
            <p>NemoC Law AI is committed to achieving SOC 2 Type II certification. Our security program is built on five trust principles: Security, Availability, Confidentiality, Processing Integrity, and Privacy.</p>
            <p>Current status: <strong>SOC 2 audit in progress</strong>. Expected completion: Q3 2026.</p>
          </section>

          <section>
            <h2>NVIDIA NemoClaw Architecture</h2>
            <p>Our security foundation is built on NVIDIA's NemoClaw infrastructure, providing:</p>
            <ul>
              <li><strong>5-Layer Security Model:</strong> Sandbox Isolation → Network Egress Control → Inference Routing → PII Auto-Redaction → Operator Approval</li>
              <li><strong>OpenShell Runtime:</strong> Each firm's AI agents run in an isolated container with no shared resources</li>
              <li><strong>Zero Data Leak Guarantee:</strong> Architecture makes data exfiltration technically impossible</li>
            </ul>
          </section>

          <section>
            <h2>ABA Ethics Compliance</h2>
            <p>NemoC Law AI is designed to comply with ABA Model Rules regarding technology competence (Rule 1.1), confidentiality (Rule 1.6), and supervision of AI tools (Rules 5.1–5.3). Our Agentic OS:</p>
            <ul>
              <li>Never sends client data to public AI models</li>
              <li>Provides human-in-the-loop approval for sensitive operations</li>
              <li>Maintains complete audit trails for bar compliance</li>
              <li>Supports AI disclosure requirements for court filings</li>
            </ul>
          </section>

          <section>
            <h2>Encryption Standards</h2>
            <ul>
              <li><strong>At Rest:</strong> AES-256 encryption for all stored data</li>
              <li><strong>In Transit:</strong> TLS 1.3 for all data transmission</li>
              <li><strong>Key Management:</strong> Hardware Security Module (HSM) backed key management</li>
            </ul>
          </section>

          <section>
            <h2>Penetration Testing</h2>
            <p>NemoC Law AI conducts regular third-party penetration testing. Results and remediation reports are available to Enterprise customers upon request.</p>
          </section>

          <section>
            <h2>Contact Security Team</h2>
            <p>To report a vulnerability or for security inquiries: <a href="mailto:security@nemoc-law.ai">security@nemoc-law.ai</a></p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
