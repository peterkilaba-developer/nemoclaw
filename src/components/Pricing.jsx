import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Zap, ShieldCheck, Infinity, Check, Minus, TrendingUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { FirmContext } from '../contexts/FirmContext';
import { redirectToCheckout } from '../lib/stripeService';
import './Pricing.css';

const tiers = [
  {
    id: 'base',
    name: 'Agentic OS',
    price: '297',
    futurePrice: '997',
    desc: 'The Agentic Operating System. Includes 1 Managing Partner agent.',
    features: [
      { text: '1 Managing Partner Agent included', included: true, highlight: true },
      { text: 'Unlimited Human Resources (Invites)', included: true },
      { text: 'Firm Knowledge Base (100 MB)', included: true },
      { text: '100% NVIDIA NemoClaw Secure', included: true, highlight: true },
      { text: 'Access to Firm Dashboard', included: true },
      { text: '1-Year Audit Logs', included: true },
      { text: 'Fully Autonomous Roles', included: false },
    ],
    target: 'Any Size Firm',
    roiPitch: 'Sign up with Managing Partner credentials. Your first agent is included.',
    cta: 'Start Onboarding',
    popular: false,
  },
  {
    id: 'seat',
    name: '10x Output Seat',
    price: '149',
    futurePrice: '497',
    desc: 'Pair any Human Role in your firm with a dedicated Agentic Resource.',
    features: [
      { text: '1 Dedicated Agent per Human', included: true, highlight: true },
      { text: 'Unlimited Inference Tokens', included: true, highlight: true },
      { text: 'Personalized Drafting & Research', included: true },
      { text: 'Increases KB limit to 500 MB', included: true },
      { text: 'Agents learn your personal style', included: true },
      { text: 'Auto-Time Capture Widget', included: true },
      { text: 'Runs fully autonomously 24/7', included: false },
    ],
    target: 'Per Human Role',
    roiPitch: 'Turn one associate into a partner-level producer.',
    cta: 'Add to Plan',
    popular: true,
  },
  {
    id: 'autonomous',
    name: 'Autonomous Role',
    price: '2,497',
    futurePrice: '4,997',
    desc: 'Deploy a fully autonomous agent to replace an entire firm role.',
    features: [
      { text: 'Runs 24/7 without human input', included: true, highlight: true },
      { text: 'Unlimited Inference Tokens', included: true, highlight: true },
      { text: 'Replaces Intake, Billing, or Paralegal', included: true },
      { text: 'Custom 2 GB Knowledge Base limits', included: true },
      { text: 'Direct integration with Clio/Slack', included: true },
      { text: 'Advanced API access', included: true },
      { text: 'Automated external client emails', included: true, highlight: true },
    ],
    target: 'Per Firm Role',
    roiPitch: 'Replace a $60k/yr salary for $2,497/mo.',
    cta: 'Deploy Role',
    popular: false,
  },
];

const competitors = [
  { name: 'Harvey Generative AI (10 Seats)', solo: 'N/A', five: '$6,000+', ten: '$12,000+' },
  { name: 'Traditional Paralegal', solo: '$60k/yr', five: '$120k/yr', ten: '$240k/yr' },
  { name: 'NemoC Agentic AI', solo: '$297', five: '$893', ten: '$1,638', highlight: true },
];

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const firmContext = useContext(FirmContext);
  const firmId = firmContext?.firmId;
  const firm = firmContext?.firm;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubscribe = async (tier) => {
    if (!user) {
      navigate('/login?redirect=/pricing');
      return;
    }

    if (!firmId) {
      navigate('/onboarding');
      return;
    }

    setLoading(true);
    setError('');
    try {
      // For landing page clicks, we assume they want 0 extra seats initially
      // unless it's a specific seat addition tier
      await redirectToCheckout({
        firmId,
        userId: user.uid,
        userEmail: user.email,
        firmName: firm?.firmName || firm?.name || '',
        extraSeats: tier.id === 'seat' ? 1 : 0,
        autonomousRoles: tier.id === 'autonomous' ? 1 : 0,
      });
    } catch (err) {
      console.error('Landing page checkout error:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <section className="section pricing-section" id="pricing">
      <div className="container">
        <div className="pricing-header">
          <span className="section-label text-nvidia">AgaaS Pricing</span>
          <h2 className="section-title">
            Your Price. <span className="text-nvidia">For Life.</span> Forever.
          </h2>
          <p className="section-subtitle">
            The price you sign up at is the price you keep — forever. 
            As we add agents toward 100% of law firm tasks, your membership grows in value. Your price doesn't.
          </p>
        </div>

        <div className="pricing-guarantee" style={{ gap: '12px' }}>
          <span className="pricing-guarantee-icon"><Lock size={16} className="text-nvidia" /></span>
          <span>Lifetime Price Lock Guarantee (First 100 Firms Per State) — Unlimited Tokens on Every Tier — Per-Firm, Not Per-User</span>
        </div>

        <div className="pricing-grid">
          {tiers.map((tier, i) => (
            <div 
              key={i} 
              className={`pricing-card glass-card ${tier.popular ? 'pricing-card-popular' : ''}`}
              id={`pricing-${tier.name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {tier.popular && <div className="pricing-popular-badge">Best Value</div>}
              <div className="pricing-card-header">
                <span className="pricing-target">{tier.target}</span>
                <h3 className="pricing-name">{tier.name}</h3>
                <div className="pricing-future-price">
                  <span className="pricing-future-label">After 100 firms:</span>
                  <span className="pricing-future-amount">${tier.futurePrice}/mo</span>
                </div>
                <div className="pricing-price">
                  <span className="pricing-currency">$</span>
                  <span className="pricing-amount">{tier.price}</span>
                  <span className="pricing-period">/mo<br/>for life</span>
                </div>
                <div className="pricing-founder-badge">
                  <Lock size={10} className="text-nvidia" />
                  Founder Pricing — First 100 Firms Per State
                </div>
                <p className="pricing-desc">{tier.desc}</p>
                {tier.roiPitch && (
                  <div className="pricing-roi">
                    <TrendingUp size={12} />
                    <span>{tier.roiPitch}</span>
                  </div>
                )}
              </div>
              
              <ul className="pricing-features">
                {tier.features.map((f, j) => (
                  <li key={j} className={`pricing-feature ${!f.included ? 'pricing-feature-disabled' : ''} ${f.highlight ? 'pricing-feature-highlight' : ''}`}>
                    <span className="pricing-check">{f.included ? <Check size={12} /> : <Minus size={12} />}</span>
                    <span dangerouslySetInnerHTML={{ __html: f.text.replace(/NVIDIA/g, '<span class="text-nvidia">NVIDIA</span>').replace(/NemoClaw/g, '<span class="text-nvidia">NemoClaw</span>') }} />
                  </li>
                ))}
              </ul>

              <button 
                onClick={() => handleSubscribe(tier)}
                disabled={loading}
                className={`btn ${tier.popular ? 'btn-primary' : 'btn-secondary'} pricing-cta`}
                style={{ width: '100%', cursor: loading ? 'not-allowed' : 'pointer' }}
              >
                {loading ? 'Processing...' : tier.cta}
              </button>
              <p className="pricing-trial">Founder pricing · First 100 firms per state</p>
            </div>
          ))}
        </div>

        {/* Competitor Comparison */}
        <div className="pricing-comparison glass-card">
          <h3 className="pricing-comparison-title">
            <TrendingUp size={16} />
            Monthly Cost Comparison (per entire firm)
          </h3>
          <div className="pricing-comp-table">
            <div className="pricing-comp-header">
              <span>Platform</span>
              <span>Solo (1)</span>
              <span>5 Lawyers</span>
              <span>10 Lawyers</span>
            </div>
            {competitors.map((c, i) => (
              <div key={i} className={`pricing-comp-row ${c.highlight ? 'pricing-comp-highlight' : ''}`}>
                <span className="pricing-comp-name" dangerouslySetInnerHTML={{ __html: c.name.replace(/Generative/g, '<span class="strikethrough-red">Generative</span>').replace(/Agentic AI/g, '<span class="text-nvidia">Agentic AI</span>') }} />
                <span>{c.solo}</span>
                <span>{c.five}</span>
                <span>{c.ten}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="pricing-footnote">
          <p><Zap size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />Powered by OpenClaw · <ShieldCheck size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />Secured by <span className="text-nvidia">NVIDIA</span> <span className="text-nvidia">NemoClaw</span> · <Infinity size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />Unlimited <span className="text-nvidia">Nemotron</span> Inference</p>
        </div>
      </div>
    </section>
  );
}
