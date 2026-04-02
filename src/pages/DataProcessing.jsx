import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import './LegalPage.css';

export default function DataProcessing() {
  return (
    <>
      <Navbar />
      <SEO
        title="Data Processing Agreement"
        path="/data-processing"
        description="NemoC Law AI DPA. How we process firm data inside NVIDIA NemoClaw sandboxes — isolation architecture, sub-processors, PII redaction, and breach notification policy."
      />
      <main className="legal-page">
        <div className="container">
          <h1>Data Processing Agreement</h1>
          <p className="legal-updated">Last updated: March 25, 2026</p>

          <section>
            <h2>1. Scope</h2>
            <p>This Data Processing Agreement (DPA) governs the processing of personal data by NemoC Law AI on behalf of your law firm ("Data Controller") in connection with the Agentic OS.</p>
          </section>

          <section>
            <h2>2. Processing Architecture</h2>
            <p>All data processing occurs within your firm's dedicated NVIDIA NemoClaw sandbox. The architecture ensures:</p>
            <ul>
              <li><strong>Isolation:</strong> Each firm's sandbox is fully isolated — no shared compute, storage, or memory with other tenants</li>
              <li><strong>Egress Control:</strong> All outbound network requests are blocked by default; only whitelisted legal data APIs are permitted</li>
              <li><strong>PII Redaction:</strong> Automatic detection and redaction of personally identifiable information before AI model inference</li>
              <li><strong>Audit Trail:</strong> Complete, immutable logging of all data access and processing operations</li>
            </ul>
          </section>

          <section>
            <h2>3. Sub-processors</h2>
            <p>NemoC Law AI uses the following sub-processors:</p>
            <ul>
              <li><strong>NVIDIA (NemoClaw/OpenShell):</strong> Infrastructure provider for sandboxed AI runtime</li>
              <li><strong>Google Cloud Platform:</strong> Authentication and account management</li>
              <li><strong>Stripe:</strong> Payment processing (no firm data is shared with Stripe)</li>
            </ul>
          </section>

          <section>
            <h2>4. Data Subject Rights</h2>
            <p>NemoC Law AI will assist the Data Controller in responding to data subject requests, including access, rectification, erasure, and data portability requests, within 30 days of receipt.</p>
          </section>

          <section>
            <h2>5. Security Measures</h2>
            <ul>
              <li>AES-256 encryption at rest</li>
              <li>TLS 1.3 encryption in transit</li>
              <li>NVIDIA NemoClaw sandbox isolation per firm</li>
              <li>Multi-factor authentication</li>
              <li>Regular penetration testing</li>
              <li>SOC 2 Type II audit (in progress)</li>
            </ul>
          </section>

          <section>
            <h2>6. Breach Notification & Limitation of Liability</h2>
            <p>In the unlikely event of a data breach affecting your firm's data, NemoC Law AI will notify the Data Controller within 72 hours of discovery, in accordance with applicable privacy regulations.</p>
            <p><strong>Important Disclaimer:</strong> While we guarantee that our architecture is designed to prevent data leaks (via isolated NemoClaw sandboxes), NemoC Law AI expressly disclaims any financial liability, indemnification, or liability for legal malpractice suits arising from a data breach, unauthorized access, or AI-generated output. Security and legal compliance ultimately remain the responsibility of the Data Controller (the law firm).</p>
          </section>

          <section>
            <h2>7. Contact</h2>
            <p>For DPA inquiries, contact our Data Protection Officer at <a href="mailto:dpo@nemoc-law.ai">dpo@nemoc-law.ai</a>.</p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
