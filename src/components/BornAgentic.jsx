import './BornAgentic.css';
import { Bot, Database, Infinity as InfinityIcon, Layout, ShieldCheck, Wrench } from 'lucide-react';

const comparisons = [
  { label: 'Architecture', legacy: 'AI squeezed into 10-year-old codebases', nemoc: 'AI IS the codebase — built on OpenClaw' },
  { label: 'Firm Management', legacy: 'Manage 3+ apps: Clio, MyCase, Outlook', nemoc: 'Agentic PMI replaces legacy SaaS entirely' },
  { label: 'Client Comms', legacy: 'Unsecure emails or clunky 3rd party portals', nemoc: 'Access-controlled client portals built in' },
  { label: 'Capability', legacy: '"Copilot" — suggests, you still do the work', nemoc: 'Autonomous — agents execute end-to-end' },
  { label: 'Security', legacy: 'Cloud security added retrospectively', nemoc: 'NVIDIA NemoClaw sandbox from foundation' },
  { label: 'Learning', legacy: 'Same generic output every time', nemoc: 'Agents learn your style, templates — improve daily' },
];

export default function BornAgentic() {
  return (
    <section className="section born-agentic-section" id="born-agentic">
      <div className="container">
        <div className="born-header">
          <span className="section-label">Architecture Moat</span>
          <h2 className="section-title">
            Born Agentic. <span className="text-nvidia">Not Bolted On.</span>
          </h2>
          <p className="section-subtitle">
            Every competitor was built as traditional software years ago — then scrambled to add AI. 
            We started with AI as the OS. There is no legacy debt.
          </p>
        </div>

        <div className="born-comparison">
          {/* Legacy Platform */}
          <div className="born-col born-col-legacy">
            <div className="born-col-header born-legacy-header">
              <span className="born-col-year">Legacy Stack — circa 2008</span>
              <h3>SaaS Bolted-on AI</h3>
              <p>Clio · Thomson Reuters · LexisNexis · Litify</p>
            </div>
            
            <div className="born-diagram">
              <div className="born-pillar">
                <div className="born-pillar-icon"><Layout size={16} /></div>
                <div className="born-pillar-content">
                  <div className="born-pillar-title">10-Year Old Shell</div>
                  <div className="born-pillar-desc">Built for manual data entry, not for agentic automation.</div>
                </div>
              </div>
              <div className="born-pillar">
                <div className="born-pillar-icon"><Database size={16} /></div>
                <div className="born-pillar-content">
                  <div className="born-pillar-title">Legacy Databases</div>
                  <div className="born-pillar-desc">Static schemas that slow down AI reasoning.</div>
                </div>
              </div>
              <div className="born-pillar">
                <div className="born-pillar-icon"><Wrench size={16} /></div>
                <div className="born-pillar-content">
                  <div className="born-pillar-title"><span className="strikethrough-red">Generative</span> AI Bolt-on</div>
                  <div className="born-pillar-desc">An API call duct-taped to an old interface.</div>
                </div>
              </div>
            </div>
            
            <p className="born-result born-result-bad">
              AI as an <strong>afterthought</strong>. It assists you, but it can't execute meaningful legal work.
            </p>
          </div>

          <div className="born-vs">
            <span>VS</span>
          </div>

          {/* NemoC LAW AI Platform */}
          <div className="born-col born-col-nemoc">
            <div className="born-col-header born-nemoc-header">
              <span className="born-col-year">Modern Stack — 2026 Ready</span>
              <h3>Agentic First Foundation</h3>
              <p>Built on OpenClaw & NVIDIA NemoClaw</p>
            </div>
            
            <div className="born-diagram">
              <div className="born-pillar">
                <div className="born-pillar-icon"><ShieldCheck size={16} /></div>
                <div className="born-pillar-content">
                  <div className="born-pillar-title">NVIDIA NemoClaw Secure Runtime</div>
                  <div className="born-pillar-desc">Hardened security sandbox where agents live and work.</div>
                </div>
              </div>
              <div className="born-pillar">
                <div className="born-pillar-icon"><Bot size={16} /></div>
                <div className="born-pillar-content">
                  <div className="born-pillar-title">Agentic AI Orchestration</div>
                  <div className="born-pillar-desc">Orchestrates your entire AI workforce — 19 specialist agents on demand.</div>
                </div>
              </div>
              <div className="born-pillar">
                <div className="born-pillar-icon"><InfinityIcon size={16} /></div>
                <div className="born-pillar-content">
                  <div className="born-pillar-title">Infinity Context Layer</div>
                  <div className="born-pillar-desc">Natively built for 2M+ token reasoning across entire cases.</div>
                </div>
              </div>
            </div>
            
            <p className="born-result born-result-good">
              Agentic AI <strong>IS</strong> the core. Our agents don't assist you — <span className="text-nvidia">they <strong>work</strong> for you.</span>
            </p>
          </div>
        </div>

        <div className="born-table-wrapper">
          <table className="born-table">
            <thead>
              <tr>
                <th>Feature Comparison</th>
                <th className="born-th-legacy">Legacy + AI Bolted On</th>
                <th className="born-th-nemoc">NemoC LAW AI</th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((row, i) => (
                <tr key={i}>
                  <td className="born-td-label">{row.label}</td>
                  <td className="born-td-legacy">{row.legacy}</td>
                  <td className="born-td-nemoc">{row.nemoc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="born-quote-box glass-card">
          <blockquote className="born-quote">
            "They built software and added <span className="strikethrough-red">Generative</span> AI. We built <span className="text-nvidia">Agentic AI</span> Operating System and secured an entire law firm inside it."
          </blockquote>
        </div>
      </div>
    </section>
  );
}
