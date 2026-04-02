import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import './LegalPage.css';

export default function Blog() {
  return (
    <>
      <Navbar />
      <SEO
        title="Blog"
        path="/blog"
        description="NemoC Law AI blog — insights on legal AI strategy, data privacy for law firms, agentic AI workflows, and the future of AI-powered legal practice."
      />
      <main className="legal-page">
        <div className="container">
          <h1>Blog</h1>

          <section>
            <h2>Coming Soon</h2>
            <p>We're preparing our first posts on legal AI strategy, data privacy, and how agentic AI is transforming law firm operations. <a href="/login">Create a free account</a> to be notified when we publish.</p>
          </section>

          <section>
            <h2>Topics We'll Cover</h2>
            <ul>
              <li>Why law firms can't afford to use public AI tools</li>
              <li>The Fort Knox approach to legal AI security</li>
              <li>How AI agents learn your firm's style over time</li>
              <li>10x your paralegal's output with AI augmentation</li>
              <li>The economics of AgaaS: per-firm vs per-user pricing</li>
            </ul>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
