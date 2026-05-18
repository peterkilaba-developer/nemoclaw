import { Brain, ClipboardList, Eye, FileText, Globe, Lock, Shield, ShieldCheck, Zap } from 'lucide-react';
import './Security.css';

const layers = [
  { num: '01', label: 'Sandbox Isolation', desc: 'Each firm runs in its own NemoClaw container. Your data never touches another firm\'s runtime.', Icon: Lock },
  { num: '02', label: 'Network Egress Control', desc: 'All outbound requests blocked by default. Only whitelisted legal APIs are reachable.', Icon: Globe },
  { num: '03', label: 'PII Auto-Redaction', desc: 'Personal data detected and stripped before it ever reaches the AI model.', Icon: ShieldCheck },
  { num: '04', label: 'Inference Routing', desc: 'Every AI call passes through NVIDIA\'s auditable endpoints. Full transparency on every inference.', Icon: Brain },
  { num: '05', label: 'Policy-as-Code', desc: 'Immutable security guardrails prevent agents from performing unauthorized data movements.', Icon: ClipboardList },
];

const publicAiRisks = [
  { risk: 'Client data sent to third-party servers', nemoc: 'Everything runs in your isolated sandbox' },
  { risk: 'Data may train public models', nemoc: 'Your data never trains any model — ever' },
  { risk: 'No audit trail for bar compliance', nemoc: 'Full audit logging, SOC2-ready' },
  { risk: 'Shared infrastructure with millions', nemoc: 'Dedicated runtime per firm' },
  { risk: 'Courts questioning its use', nemoc: 'Privilege-safe — verifiable containment' },
  { risk: 'No attorney-client privilege protection', nemoc: 'Privacy Router blocks all unauthorized data transfer' },
];

export default function Security() {
  return (
    <section className="section security-section" id="security">
      <div className="container">
        <div className="security-header">
          <span className="section-label">Firm-Grade Security Moat</span>
          <h2 className="section-title">
            Enterprise Security for <span className="text-nvidia">Professional Privilege.</span>
          </h2>
          <p className="section-subtitle">
            While others risk client data with public AI tools, your agents run inside an NVIDIA NemoClaw sandbox.{' '}
            No data in. No data out. Verified by design.
          </p>
        </div>

        {/* Zero Data Leak Grid — High Impact Minimalist */}
        <div className="zero-leak-grid">
          <div className="zero-leak-item">
            <div className="zero-leak-item-icon"><Shield size={24} /></div>
            <div className="zero-leak-item-title">Secure Runtime</div>
            <div className="zero-leak-item-desc">Your data never leaves your firm's isolated environment.</div>
          </div>
          <div className="zero-leak-item">
            <div className="zero-leak-item-icon"><Brain size={24} /></div>
            <div className="zero-leak-item-title">No Model Training</div>
            <div className="zero-leak-item-desc">Your firm's knowledge never trains public or private global models.</div>
          </div>
          <div className="zero-leak-item">
            <div className="zero-leak-item-icon"><FileText size={24} /></div>
            <div className="zero-leak-item-title">Full Auditability</div>
            <div className="zero-leak-item-desc">Every AI operation is logged and auditable for compliance.</div>
          </div>
        </div>

        {/* Anti-Public AI Comparison — Architectural Cleanup */}
        <div className="public-ai-comparison">
          <h3 className="public-ai-comparison-title">
            Comparison Matrix: Public AI vs. NemoC Agentic AI
          </h3>
          <div className="public-ai-table">
            <div className="public-ai-header">
              <span className="pai-col-risk-label">⚠️ Public AI (Traditional/Generative)</span>
              <span className="pai-col-nemoc-label">✅ NemoC Agentic AI (NemoClaw)</span>
            </div>
            {publicAiRisks.map((row, i) => (
              <div key={i} className="public-ai-row">
                <span className="pai-col-risk">{row.risk}</span>
                <span className="pai-col-nemoc">{row.nemoc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Security Layers — Vertical Architecture */}
        <div className="security-layers">
          <h3 className="public-ai-comparison-title" style={{ textAlign: 'left', marginBottom: '16px' }}>Architectural Segregation</h3>
          {layers.map((layer, i) => (
            <div key={i} className="security-layer">
              <div className="security-layer-num">{layer.num}</div>
              <div className="security-layer-content">
                <h3>{layer.label}</h3>
                <p>{layer.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="security-badges" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '64px' }}>
          <div className="security-badge-item">
            <span className="security-badge-icon"><Zap size={14} /></span>
            <span>Powered by Nemotron</span>
          </div>
          <div className="security-badge-item">
            <span className="security-badge-icon"><ShieldCheck size={14} /></span>
            <span>SOC2 Compliance Framework</span>
          </div>
          <div className="security-badge-item">
            <span className="security-badge-icon"><Eye size={14} /></span>
            <span>Full Transparency Logging</span>
          </div>
        </div>
      </div>
    </section>
  );
}
