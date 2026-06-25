import SurvivalImperative from './SurvivalImperative';
import { Database, HeartPulse, ShieldCheck, TrendingUp, Users, Zap } from 'lucide-react';

export default function V2Narrative() {
  return (
    <div className="v2-narrative-container">
      {/* Introduction / Survival Statement */}
      <SurvivalImperative />

      {/* The Narratives - Clean Vertical Flow */}
      <section className="section" style={{ backgroundColor: 'var(--bg-lighter)', padding: '100px 0' }}>
        <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '80px' }}>
          
          {/* Burnout */}
          <div className="v2-story-block">
            <div className="v2-story-icon" style={{ color: '#ec4899', background: 'rgba(236, 72, 153, 0.1)' }}>
              <HeartPulse size={40} />
            </div>
            <div className="v2-story-content">
              <h3 className="v2-story-title">The Burnout Epidemic</h3>
              <p className="v2-story-text">
                The traditional billable hour model is actively destroying the mental health of brilliant attorneys. Trading life in six-minute increments breeds chronic anxiety, forcing partners to miss family dinners just to format briefs, triage emails, and read eDiscovery files into the weekend. NemoC LAW AI is the ultimate quality-of-life godsend for the entire firm. By natively handling the brutal grunt work, human lawyers finally get their lives back. You leave the office at 5 PM, secure in the knowledge that your personalized AI Chief of Staff is executing flawlessly in the background. You achieve Big Law output with Boutique lifestyle balance.
              </p>
            </div>
          </div>

          <div style={{ height: '1px', background: 'var(--border-subtle)', width: '100%', maxWidth: '1000px', margin: '0 auto' }}></div>

          {/* Margins / HITL */}
          <div className="v2-story-block">
            <div className="v2-story-icon" style={{ color: 'var(--text-nvidia)', background: 'rgba(118, 185, 0, 0.1)' }}>
              <TrendingUp size={40} />
            </div>
            <div className="v2-story-content">
              <h3 className="v2-story-title">The Profitability Squeeze & The HITL Multiplier</h3>
              <p className="v2-story-text">
                Traditional growth is a trap. Expanding your firm forces you to multiply headcount, bloat overhead, and squeeze margins because human output is strictly limited by physical exhaustion. But fully replacing humans with unregulated autonomous AI is equally suicidal—when it inevitably hallucinates on an edge case, you face catastrophic malpractice. The true competitive moat is Human-In-The-Loop (HITL) augmentation. When you equip a fantastic human paralegal with our Agentic OS, that single person safely orchestrates massive firm-wide output. You explode profit margins while retaining the one thing AI cannot replicate: capable human judgment.
              </p>
            </div>
          </div>

          <div style={{ height: '1px', background: 'var(--border-subtle)', width: '100%', maxWidth: '1000px', margin: '0 auto' }}></div>

          {/* Retention */}
          <div className="v2-story-block">
            <div className="v2-story-icon" style={{ color: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)' }}>
              <Users size={40} />
            </div>
            <div className="v2-story-content">
              <h3 className="v2-story-title">The Associate Retention Crisis</h3>
              <p className="v2-story-text">
                You are paying top-tier junior associates over $150k only to bleed them out doing eighty hours a week of rote document review. They burn out feeling like highly-paid data-entry clerks, while partners are too underwater to actually mentor them. By assigning every associate a dedicated personal Agent to handle the mechanical heavy lifting, juniors actually practice law from day one. Partners have time to teach strategy instead of correcting typos. Firms that maintain the archaic "sweatshop" rite of passage will lose all their top talent to Agentic firms that offer intellectually stimulating work.
              </p>
            </div>
          </div>

          <div style={{ height: '1px', background: 'var(--border-subtle)', width: '100%', maxWidth: '1000px', margin: '0 auto' }}></div>

          {/* Execution vs Copilot */}
          <div className="v2-story-block">
            <div className="v2-story-icon" style={{ color: '#8b5cf6', background: 'rgba(139, 92, 246, 0.1)' }}>
              <Zap size={40} />
            </div>
            <div className="v2-story-content">
              <h3 className="v2-story-title">The "Copilot" Disillusionment</h3>
              <p className="v2-story-text">
                The industry was promised total automation but was sold a "Copilot"—a glorified typing assistant that generates blocks of text, but leaves you to format, cross-reference, and manually file the documents across disconnected, localized apps. Generative AI suggests things; Agentic AI <strong>executes</strong> them. You don't ask our operating system to write a paragraph. You tell it to draft a motion, format it for the local circuit, and stage it for your review. It handles the entirety of the operational loop autonomously, shifting the attorney's role from exhausted author to elite editor.
              </p>
            </div>
          </div>

          <div style={{ height: '1px', background: 'var(--border-subtle)', width: '100%', maxWidth: '1000px', margin: '0 auto' }}></div>

          {/* Security */}
          <div className="v2-story-block">
            <div className="v2-story-icon" style={{ color: '#eab308', background: 'rgba(234, 179, 8, 0.1)' }}>
              <ShieldCheck size={40} />
            </div>
            <div className="v2-story-content">
              <h3 className="v2-story-title">Partnership Paranoia & Absolute Privilege</h3>
              <p className="v2-story-text">
                Managing partners lie awake consistently terrified of an over-worked associate pasting a proprietary legal strategy into a public generative AI window, instantly waiving privilege and feeding a global training model. Enterprise "Copilots" claim security, but they are thin wrappers passing your prompt tokens across the public internet. We eliminate this terror through hardware architecture. We deploy your firm inside an entirely isolated NVIDIA NemoClaw sandbox. Zero data leaves your perimeter. Zero model training occurs. We don't rely on trust; we rely on physical isolation.
              </p>
            </div>
          </div>

          <div style={{ height: '1px', background: 'var(--border-subtle)', width: '100%', maxWidth: '1000px', margin: '0 auto' }}></div>

          {/* Migration */}
          <div className="v2-story-block">
            <div className="v2-story-icon" style={{ color: '#14b8a6', background: 'rgba(20, 184, 166, 0.1)' }}>
              <Database size={40} />
            </div>
            <div className="v2-story-content">
              <h3 className="v2-story-title">The "Data Dumpster" Migration</h3>
              <p className="v2-story-text">
                Legacy system migrations terrified law firms because they required hundreds of hours mapping fragile spreadsheets between Clio, MyCase, and Outlook. We solved the SaaS integration nightmare with autonomous parsing. You literally drag-and-drop your messy zip exports, and our intelligent agents parse, structure, and route your entire firm's history into your new conversational Practice Management Interface automatically. It eliminates the friction of adoption entirely.
              </p>
            </div>
          </div>

        </div>
      </section>

      <style dangerouslySetInnerHTML={{__html: `
        .v2-story-block {
          display: flex;
          gap: 64px;
          align-items: flex-start;
          max-width: 1000px;
          margin: 0 auto;
        }
        .v2-story-icon {
          flex: 0 0 100px;
          height: 100px;
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 8px;
        }
        .v2-story-content {
          flex: 1;
        }
        .v2-story-title {
          font-size: 2.25rem;
          margin-bottom: 24px;
          color: var(--text-primary);
          line-height: 1.2;
          font-weight: 700;
        }
        .v2-story-text {
          color: var(--text-secondary);
          line-height: 1.8;
          font-size: 1.15rem;
        }
        
        @media (max-width: 768px) {
          .v2-story-block {
            flex-direction: column;
            gap: 24px;
          }
          .v2-story-icon {
            flex: 0 0 80px;
            height: 80px;
            border-radius: 20px;
          }
          .v2-story-title {
            font-size: 1.75rem;
            margin-bottom: 16px;
          }
          .v2-story-text {
            font-size: 1.05rem;
            line-height: 1.6;
          }
        }
      `}} />
    </div>
  );
}
