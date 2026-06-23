import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FirmContext } from '../contexts/FirmContext';
import { redirectToCheckout } from '../lib/stripeService';
import './Pricing.css';

import { useLocation } from '../hooks/useLocation';
import { Check, Infinity as InfinityIcon, Lock, ShieldCheck, TrendingUp, Zap } from 'lucide-react';

const tiers = [
  {
    id: 'seat',
    name: 'Human Role + Agent',
    price: '149',
    futurePrice: '297',
    desc: 'Map each additional person at the firm to a dedicated, role-aware personal agent, up to 20 total humans.',
    features: [
      { text: 'Solo, attorney, of counsel, associate, paralegal, and operations mappings', included: true },
      { text: 'Dedicated AI Chief of Staff for the named human', included: true },
      { text: 'Least-privilege matter and financial access', included: true },
      { text: 'Supervising-partner relationship', included: true },
      { text: 'Role-specific specialist-agent toolkit for practice and business operations', included: true },
      { text: 'Human approval, escalation, and override controls', included: true },
    ],
    target: 'Per Additional Human Role',
    roiPitch: 'A dedicated, role-aware agent for each person as the firm grows.',
    cta: 'Start with Agentic OS',
    popular: false,
  },
  {
    id: 'base',
    name: 'Agentic OS',
    price: '297',
    futurePrice: '497',
    desc: 'The secure HITL operating system for your firm, including the onboarding partner\'s agent.',
    features: [
      { text: 'Onboarding partner and dedicated partner agent included', included: true, highlight: true },
      { text: 'Supports solo firms growing into small firms up to 20 humans', included: true, highlight: true },
      { text: 'AI Chief of Staff — firm-wide orchestration and intelligence', included: true, highlight: true },
      { text: 'AI Contract Review — redlining, risk flagging, clause comparison', included: true },
      { text: 'AI eDiscovery — document review, privilege tagging, Bates numbering', included: true },
      { text: 'AI Deposition Prep — outlines, exhibit identification, question drafts', included: true },
      { text: 'AI Case Analytics — outcome prediction and judge tendencies', included: true },
      { text: 'AI Compliance Monitor — regulatory tracking and filing alerts', included: true },
      { text: 'AI Communication Drafter — client letters and engagement letters', included: true },
      { text: 'AI Business Intelligence — revenue trends and pipeline analysis', included: true },
      { text: 'AI Due Diligence — data room analysis and risk assessment', included: true },
      { text: 'AI Trust Accounting — IOLTA reconciliation and bar compliance', included: true },
      { text: 'AI Court Filing — ECF/PACER preparation and service calculation', included: true },
      { text: 'AI Firm Knowledge Base (100 MB) and audit retention', included: true },
      { text: '100% NVIDIA NemoClaw Secure Sandbox', included: true, highlight: true },
      { text: 'Full Agentic Dashboard with 1-year audit logs', included: true },
    ],
    target: 'Per Firm — Partner Agent Included',
    roiPitch: 'Your HITL control plane.',
    cta: 'Start Free Trial',
    popular: true,
  },
];

const competitors = [
  { name: 'Traditional Paralegal (W-2)', monthly: '~$5,000/mo', annual: '~$60,000/yr' },
  { name: 'Harvey AI (10-seat minimum required)', monthly: '$1,000+/mo', annual: '$12,000+/yr' },
  { name: 'NemoC LAW AI — Agentic OS', monthly: '$297/mo', annual: '$3,564/yr', highlight: true },
];

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const location = useLocation();
  const firmContext = useContext(FirmContext);
  const firmId = firmContext?.firmId;
  const firm = firmContext?.firm;
  const [loadingTier, setLoadingTier] = useState(null);
  const [_error, setError] = useState('');

  const handleSubscribe = async (tier) => {
    if (!user) {
      navigate('/login?redirect=/#pricing');
      return;
    }

    if (!firmId) {
      navigate('/onboarding');
      return;
    }

    setLoadingTier(tier.id);
    setError('');
    try {
      await redirectToCheckout({
        firmId,
        userId: user.uid,
        userEmail: user.email,
        firmName: firm?.firmName || firm?.name || '',
        extraSeats: tier.id === 'seat' ? 1 : Number(firm?.extraSeats || 0),
      });
    } catch (err) {
      console.error('Landing page checkout error:', err);
      setError(err.message);
      setLoadingTier(null);
    }
  };

  return (
    <section className="section pricing-section" id="pricing">
      <div className="container">
        <div className="pricing-header">
          <span className="section-label text-nvidia">Human-In-The-Loop Pricing</span>
          <h2 className="section-title">
            Your Price. <span className="text-nvidia">For Life.</span> Forever.
          </h2>
          <p className="section-subtitle">
            The first 100 firms in each state lock in $297/month for the Agentic OS and
            $149/month for each additional human role + agent mapping.
          </p>
        </div>

        <div className="pricing-guarantee" style={{ gap: '12px' }}>
          <span className="pricing-guarantee-icon"><Lock size={16} className="text-nvidia" /></span>
          <span>
            Founder Price Lock — First 100 Firms in {location.isUS || location.loading ? location.state : location.country} — Partner-Led HITL — Cancel Anytime
          </span>
        </div>

        <div className="pricing-grid">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className={`pricing-card glass-card ${tier.popular ? 'pricing-card-popular' : ''}`}
              id={`pricing-${tier.id}`}
            >
              {tier.popular && <div className="pricing-popular-badge">Most Popular</div>}
              <div className="pricing-card-header">
                <span className="pricing-target">{tier.target}</span>
                <h3 className="pricing-name">{tier.name}</h3>
                <div className="pricing-future-price">
                  <span className="pricing-future-label">
                    Standard rate after 100 {location.isUS || location.loading ? location.state : location.country} founders:
                  </span>
                  <span className="pricing-future-amount">${tier.futurePrice}/mo</span>
                </div>
                <div className="pricing-price">
                  <span className="pricing-currency">$</span>
                  <span className="pricing-amount">{tier.price}</span>
                  <span className="pricing-period">/mo<br/>for life</span>
                </div>
                <div className="pricing-founder-badge">
                  <Lock size={10} className="text-nvidia" />
                  Founder Rate — First 100 Firms in {location.isUS || location.loading ? location.state : location.country}
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
                  <li key={j} className={`pricing-feature ${f.highlight ? 'pricing-feature-highlight' : ''}`}>
                    <span className="pricing-check"><Check size={12} /></span>
                    <span dangerouslySetInnerHTML={{ __html: f.text.replace(/NVIDIA/g, '<span class="text-nvidia">NVIDIA</span>').replace(/NemoClaw/g, '<span class="text-nvidia">NemoClaw</span>') }} />
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(tier)}
                disabled={!!loadingTier}
                className={`btn ${tier.popular ? 'btn-primary' : 'btn-secondary'} pricing-cta`}
                style={{ width: '100%', cursor: loadingTier ? 'not-allowed' : 'pointer' }}
              >
                {loadingTier === tier.id ? 'Redirecting to Stripe...' : tier.cta}
              </button>
              <p className="pricing-trial">
                30-day free trial · No charge until day 31 · Cancel anytime
              </p>
            </div>
          ))}
        </div>

        {/* Competitor Comparison */}
        <div className="pricing-comparison glass-card">
          <h3 className="pricing-comparison-title">
            <TrendingUp size={16} />
            What solo and small-firm teams pay for the alternatives
          </h3>
          <div className="pricing-comp-table">
            <div className="pricing-comp-header">
              <span>Alternative</span>
              <span>Monthly</span>
              <span>Annual</span>
            </div>
            {competitors.map((c, i) => (
              <div key={i} className={`pricing-comp-row ${c.highlight ? 'pricing-comp-highlight' : ''}`}>
                <span className="pricing-comp-name" dangerouslySetInnerHTML={{ __html: c.name.replace(/Generative/g, '<span class="strikethrough-red">Generative</span>').replace(/Agentic AI/g, '<span class="text-nvidia">Agentic AI</span>') }} />
                <span>{c.monthly}</span>
                <span>{c.annual}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="pricing-footnote">
          <p><Zap size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />Powered by OpenClaw · <ShieldCheck size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />Secured by <span className="text-nvidia">NVIDIA</span> <span className="text-nvidia">NemoClaw</span> · <InfinityIcon size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />Unlimited <span className="text-nvidia">Nemotron</span> Inference</p>
        </div>
      </div>
    </section>
  );
}
