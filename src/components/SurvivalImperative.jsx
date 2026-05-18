import { AlertTriangle } from 'lucide-react';

export default function SurvivalImperative() {
  return (
    <section className="section" style={{ backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border-subtle)', padding: '100px 0 80px' }}>
      <div className="container">
        <div className="section-header" style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--text-error)', borderRadius: '100px', fontSize: '0.875rem', fontWeight: 600, marginBottom: '24px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <AlertTriangle size={16} /> Survival Imperative
          </div>
          <h2 className="section-title" style={{ fontSize: '3.5rem', lineHeight: '1.2', marginBottom: '24px' }}>
            The Legal Market is facing an <span className="text-error">Extinction Event.</span>
          </h2>
          <p className="section-subtitle" style={{ maxWidth: '900px', margin: '0 auto', fontSize: '1.25rem', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
            Within 36 months, the market will permanently bifurcate into two categories: Agentic Firms, and obsolete firms. A legacy firm billing hundreds of dollars an hour for rote associate tasks cannot survive against an Agentic competitor delivering instantaneous, flawless execution at a flat fee with massive profit margins. Adopting an Agentic OS is no longer a growth strategy; it is a fundamental requirement for survival.
          </p>
        </div>
      </div>
    </section>
  );
}
