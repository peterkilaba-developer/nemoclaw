import { Database, ShieldAlert, Sparkles, Zap } from 'lucide-react';

export default function V2Results() {
  return (
    <section className="section v2-results-section" style={{ borderTop: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-gradient-start)' }}>
      <div className="container">
        <div className="section-header" style={{ textAlign: 'center', marginBottom: '48px' }}>
          <span className="section-label text-success">The Result</span>
          <h2 className="section-title">
            The <span className="text-nvidia">Human-In-The-Loop</span> Advantage.
          </h2>
          <p className="section-subtitle" style={{ maxWidth: '800px', margin: '0 auto' }}>
            Fully autonomous law firms will eventually go out of business when unregulated AI hits an edge case and fails. The true competitive advantage is <strong>augmenting</strong> your capable human experts, not replacing them.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="glass-card animate-fade-in-up" style={{ display: 'flex', gap: '24px', alignItems: 'center', padding: '32px' }}>
            <div style={{ flex: '0 0 80px', height: '80px', borderRadius: '50%', background: 'rgba(118,185,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={40} className="text-nvidia" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '12px', color: 'var(--text-primary)' }}>Zero Learning Curve</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: '1.6' }}>
                Stop forcing your partners to learn new software menus. If they want to know the status of a case or draft a motion, they just ask their AI Chief of Staff in plain English. The interface dynamically configures itself around their intent.
              </p>
            </div>
          </div>

          <div className="glass-card animate-fade-in-up" style={{ animationDelay: '0.1s', display: 'flex', gap: '24px', alignItems: 'center', padding: '32px' }}>
            <div style={{ flex: '0 0 80px', height: '80px', borderRadius: '50%', background: 'rgba(118,185,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Database size={40} className="text-nvidia" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '12px', color: 'var(--text-primary)' }}>Autonomous ETL Migration</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: '1.6' }}>
                The <span className="text-nvidia">"Data Dumpster"</span> Architecture: You don't spend 40 hours mapping CSV columns to switch providers. Just drag-and-drop your messy Clio or PracticePanther export zips. Your agents automatically parse, structure, and route everything into the new system.
              </p>
            </div>
          </div>

          <div className="glass-card animate-fade-in-up" style={{ animationDelay: '0.2s', display: 'flex', gap: '24px', alignItems: 'center', padding: '32px' }}>
            <div style={{ flex: '0 0 80px', height: '80px', borderRadius: '50%', background: 'rgba(118,185,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={40} className="text-nvidia" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '12px', color: 'var(--text-primary)' }}>The HITL Output Multiplier</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: '1.6' }}>
                A great paralegal making $70,000/yr might produce $100,000 in billable value. By equipping them with a $11,964/yr Agentic OS, that <strong>same human</strong> can orchestrate $1M+ worth of output. You scale your revenue exponentially, and you can afford to pay your augmented team substantially more.
              </p>
            </div>
          </div>

          <div className="glass-card animate-fade-in-up" style={{ animationDelay: '0.3s', display: 'flex', gap: '24px', alignItems: 'center', padding: '32px' }}>
            <div style={{ flex: '0 0 80px', height: '80px', borderRadius: '50%', background: 'rgba(118,185,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldAlert size={40} className="text-nvidia" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '12px', color: 'var(--text-primary)' }}>The Ultimate Safety Net</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: '1.6' }}>
                If you fully automate and the AI inevitably halts on an edge case, you fail. By utilizing an Agentic OS built around Human-In-The-Loop (HITL) workflows, your firm gains infinite scale while retaining the one thing AI cannot replicate: capable human experts ready to take the wheel when judgment is required.
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
