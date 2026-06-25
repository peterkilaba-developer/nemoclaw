import './ParadigmShift.css';
import { BarChart2, Clock, MessageSquare, RefreshCw, Shield, Zap } from 'lucide-react';

export default function ParadigmShift() {
  return (
    <section className="section paradigm-section">
      <div className="container">
        <div className="paradigm-grid">
          
          {/* Left Block: Ease of Use */}
          <div className="paradigm-card glass-card animate-fade-in-up">
            <div className="paradigm-card-header">
              <span className="section-label">Ease of Use</span>
              <h2 className="paradigm-title">Zero Learning Curve.</h2>
              <p className="paradigm-subtitle">Stop juggling five different apps solo. NemoC LAW AI isn't a tool you operate — it's an AI workforce you delegate to in plain English.</p>
            </div>
            <div className="paradigm-features">
              <div className="p-feature">
                <div className="pf-icon"><MessageSquare size={20}/></div>
                <div>
                  <h4>No Manuals. Just Conversations.</h4>
                  <p>You don't need prompt engineering courses. Just type or speak: "Draft a motion to dismiss based on Smith v. Jones and format it for the 9th Circuit", and consider it done.</p>
                </div>
              </div>
              <div className="p-feature">
                <div className="pf-icon"><Clock size={20}/></div>
                <div>
                  <h4>Replace Legacy Software</h4>
                  <p>Migrate effortlessly. NemoClaw isn't just a research tool—it's an Agentic Practice Management Interface (Agentic PMI). Upload your Clio or MyCase exports and run your entire firm natively with AI.</p>
                </div>
              </div>
              <div className="p-feature">
                <div className="pf-icon"><Zap size={20}/></div>
                <div>
                  <h4>Frictionless Orchestration</h4>
                  <p>You set the high-level goal. Your Personal Agent automatically translates your request into a multi-step execution plan, dispatching specialized sub-agents behind the scenes.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Block: Continuous Learning */}
          <div className="paradigm-card glass-card animate-fade-in-up delay-2">
            <div className="paradigm-card-header">
              <span className="section-label accent">Continuous Learning</span>
              <h2 className="paradigm-title"><span className="text-nvidia">Agents</span> That Evolve.</h2>
              <p className="paradigm-subtitle">Powered by <span className="text-nvidia">NVIDIA NeMo</span>™, your <span className="text-nvidia">AI</span> utilizes a continuous Data Flywheel to adapt to your style, improving with every interaction.</p>
            </div>
            <div className="paradigm-features">
              <div className="p-feature">
                <div className="pf-icon accent"><RefreshCw size={20}/></div>
                <div>
                  <h4>Continuous Reinforcement (NeMo Curator™)</h4>
                  <p>Every edit you make to a drafted document acts as feedback. The system curates this real-world interaction data to dynamically refine the <span className="text-nvidia">agent's</span> understanding.</p>
                </div>
              </div>
              <div className="p-feature">
                <div className="pf-icon accent"><BarChart2 size={20}/></div>
                <div>
                  <h4>Automated Quality Benchmarking (NeMo Evaluator™)</h4>
                  <p>As your <span className="text-nvidia">agent</span> learns, its performance is continuously tested against your firm's standards. "LLM-as-a-judge" evaluation ensures reasoning only ever improves.</p>
                </div>
              </div>
              <div className="p-feature">
                <div className="pf-icon accent"><Shield size={20}/></div>
                <div>
                  <h4>Unshakeable Safety (NeMo Guardrails™)</h4>
                  <p>No matter how autonomously the <span className="text-nvidia">agent</span> adapts to your style, it remains strictly bounded by firm policy, ethical walls, and UPL compliance protocols.</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
