import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer" id="footer">
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="footer-logo">
              <img src="/logos/claw-64-transparent.png" alt="" className="footer-icon" />
              <img src="/logos/wordmark.svg" alt="NemoC Law AI" className="footer-wordmark" />
            </div>
            <p className="footer-tagline">
              The first Agentic OS for law firms.<br/>
              Built on OpenClaw. Secured by NVIDIA NemoClaw.
            </p>
          </div>

          <div className="footer-links-grid">
            <div className="footer-col">
              <h4>Platform</h4>
              <a href="/#workforce">AI Workforce</a>
              <a href="/#security">Security</a>
              <a href="/#pricing">Pricing</a>
              <a href="/login">Get Access</a>
            </div>
            <div className="footer-col">
              <h4>Technology</h4>
              <a href="https://openclaw.ai/" target="_blank" rel="noopener">OpenClaw</a>
              <a href="https://www.nvidia.com/en-us/ai/nemoclaw/?ncid=pa-srch-goog-788853" target="_blank" rel="noopener">NemoClaw</a>
              <a href="https://www.nvidia.com/en-us/ai-data-science/foundation-models/nemotron/" target="_blank" rel="noopener">Nemotron</a>
              <a href="https://docs.nvidia.com/openshell/latest/about/overview.html" target="_blank" rel="noopener">OpenShell Runtime</a>
            </div>
            <div className="footer-col">
              <h4>Company</h4>
              <a href="/about">About</a>
              <a href="/blog">Blog</a>
              <a href="/careers">Careers</a>
              <a href="mailto:contact@nemoc-law.ai">Contact</a>
            </div>
            <div className="footer-col">
              <h4>Legal</h4>
              <a href="/privacy">Privacy Policy</a>
              <a href="/terms">Terms of Service</a>
              <a href="/data-processing">Data Processing</a>
              <a href="/security-compliance">SOC 2 Compliance</a>
            </div>
          </div>
        </div>

        <div className="divider"></div>

        <div className="footer-bottom">
          <p>© 2026 NemoC Law AI. Agentic-as-a-Service. All rights reserved.</p>
          <div className="footer-powered">
            <span>Powered by</span>
            <span className="footer-nvidia">NVIDIA</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
