import { Clock, DollarSign, Layers, ShieldAlert } from 'lucide-react';

export default function V2Problem() {
  return (
    <section className="section v2-problem-section" style={{ backgroundColor: 'var(--bg-lighter)', borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="container">
        <div className="section-header" style={{ textAlign: 'center', marginBottom: '48px' }}>
          <span className="section-label">The Problem</span>
          <h2 className="section-title">
            The Modern Law Firm is <span className="text-error">Drowning in Overhead.</span>
          </h2>
          <p className="section-subtitle" style={{ maxWidth: '800px', margin: '0 auto' }}>
            You didn't go to law school to manage five different SaaS subscriptions, wrestle with clunky portals, or lose billable hours to manual data entry. We get it.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          <div className="glass-card" style={{ padding: '32px' }}>
            <Layers size={32} className="text-error" style={{ marginBottom: '20px' }} />
            <h4 style={{ marginBottom: '12px', fontSize: '1.25rem', color: 'var(--text-primary)' }}>SaaS Fatigue</h4>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>You're paying for Clio, Outlook, MyCase, and DocuSign, but they don't talk to each other. Your team spends hours just moving data between tabs.</p>
          </div>
          <div className="glass-card" style={{ padding: '32px' }}>
            <DollarSign size={32} className="text-error" style={{ marginBottom: '20px' }} />
            <h4 style={{ marginBottom: '12px', fontSize: '1.25rem', color: 'var(--text-primary)' }}>The Capacity Ceiling</h4>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>Your best people are tapped out. A great paralegal or associate can only bill so many hours. To grow revenue today, you're forced to multiply headcount and overhead linearly.</p>
          </div>
          <div className="glass-card" style={{ padding: '32px' }}>
            <Clock size={32} className="text-error" style={{ marginBottom: '20px' }} />
            <h4 style={{ marginBottom: '12px', fontSize: '1.25rem', color: 'var(--text-primary)' }}>The "Copilot" Lie</h4>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>You bought legal AI tools hoping for automation, but got a "Copilot". It suggests things, but you still have to execute and write the actual briefs yourself.</p>
          </div>
          <div className="glass-card" style={{ padding: '32px' }}>
            <ShieldAlert size={32} className="text-error" style={{ marginBottom: '20px' }} />
            <h4 style={{ marginBottom: '12px', fontSize: '1.25rem', color: 'var(--text-primary)' }}>Unsecure Comms</h4>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>Clients email sensitive files randomly. You lie awake hoping you don't leak PII or break ethical walls because of a misrouted unencrypted attachment.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
