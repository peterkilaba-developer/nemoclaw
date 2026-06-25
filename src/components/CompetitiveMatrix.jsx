import './CompetitiveMatrix.css';
import { Check, X } from 'lucide-react';

const matrixData = [
  { 
    feature: 'Core Paradigm', 
    nemoc: 'Agentic OS (Runs the Firm)', 
    harvey: 'Legal Workflow Admin', 
    cocounsel: 'Legal Research Engine', 
    spellbook: 'MS Word Copilot' 
  },
  { 
    feature: 'Data Migration / ETL', 
    nemoc: 'Autonomous "Data Dumpster"', 
    harvey: 'Manual IT Implementation', 
    cocounsel: 'Manual CSV Mapping', 
    spellbook: 'N/A' 
  },
  { 
    feature: 'Implementation', 
    nemoc: 'Zero Learning Curve', 
    harvey: 'Massive Change Management', 
    cocounsel: 'High Learning Curve', 
    spellbook: 'Requires Workflow Changes' 
  },
  { 
    feature: 'SDR / Outbound GTM', 
    nemoc: true, 
    harvey: false, 
    cocounsel: false, 
    spellbook: false 
  },
  { 
    feature: 'Pricing Model', 
    nemoc: '$297/mo Fixed (Unlimited Tokens)', 
    harvey: 'Opaque / Enterprise Quoted', 
    cocounsel: 'Tiered + Database Fees', 
    spellbook: 'Seat Based (Quoted)' 
  },
  { 
    feature: 'Client Portals', 
    nemoc: true, 
    harvey: false, 
    cocounsel: false, 
    spellbook: false 
  },
  { 
    feature: 'Security Layer', 
    nemoc: 'NVIDIA Private Network', 
    harvey: 'Enterprise Cloud', 
    cocounsel: 'Enterprise Cloud', 
    spellbook: 'Cloud API' 
  }
];

export default function CompetitiveMatrix() {
  return (
    <section className="section competitive-matrix-section">
      <div className="container">
        <div className="section-header" style={{ textAlign: 'center', marginBottom: '48px' }}>
          <span className="section-label text-nvidia">The Anti-SaaS Moat</span>
          <h2 className="section-title" style={{ fontSize: '2.5rem', marginBottom: '16px' }}>
            How We Compare to the <span className="text-nvidia">"Market Leaders"</span>
          </h2>
          <p className="section-subtitle" style={{ maxWidth: '800px', margin: '0 auto', color: 'var(--text-secondary)' }}>
            Traditional Legal AI focuses on building tools for lawyers. We built an entire autonomous workforce. 
          </p>
        </div>

        <div className="matrix-table-wrapper glass-card">
          <table className="matrix-table">
            <thead>
              <tr>
                <th>Feature / Capability</th>
                <th className="matrix-highlight">NemoC LAW AI</th>
                <th>Harvey AI</th>
                <th>CoCounsel (TR)</th>
                <th>Spellbook</th>
              </tr>
            </thead>
            <tbody>
              {matrixData.map((row, i) => (
                <tr key={i}>
                  <td className="matrix-feature">{row.feature}</td>
                  <td className="matrix-highlight-cell">
                    {typeof row.nemoc === 'boolean' ? (
                      row.nemoc ? <Check size={20} className="text-nvidia mx-auto" style={{ margin: '0 auto' }} /> : <X size={20} className="text-error mx-auto" style={{ margin: '0 auto' }} />
                    ) : (
                      <strong>{row.nemoc}</strong>
                    )}
                  </td>
                  <td>
                    {typeof row.harvey === 'boolean' ? (
                      row.harvey ? <Check size={20} className="text-success mx-auto" style={{ margin: '0 auto' }} /> : <X size={20} className="text-error mx-auto" style={{ margin: '0 auto' }} />
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>{row.harvey}</span>
                    )}
                  </td>
                  <td>
                    {typeof row.cocounsel === 'boolean' ? (
                      row.cocounsel ? <Check size={20} className="text-success mx-auto" style={{ margin: '0 auto' }} /> : <X size={20} className="text-error mx-auto" style={{ margin: '0 auto' }} />
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>{row.cocounsel}</span>
                    )}
                  </td>
                  <td>
                    {typeof row.spellbook === 'boolean' ? (
                      row.spellbook ? <Check size={20} className="text-success mx-auto" style={{ margin: '0 auto' }} /> : <X size={20} className="text-error mx-auto" style={{ margin: '0 auto' }} />
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>{row.spellbook}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          *Competitor names are trademarks of their respective owners. Comparison based on publicly available functionality architectures as of 2026.
        </div>
      </div>
    </section>
  );
}
