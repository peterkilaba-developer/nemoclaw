import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Check, Globe, ShieldCheck, Users, User,
  ChevronRight, Loader2, Lock, ArrowRight, Zap, MapPin,
  FileText, Briefcase, Crown, Building, AlertCircle, ExternalLink, CreditCard
} from 'lucide-react';
import { completeOnboarding } from '../lib/firestore';
import { PRICING } from '../lib/stripeService';
import { useAuth } from '../contexts/AuthContext';
import { useFirm } from '../contexts/FirmContext';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe((import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '').trim());

/*
 * Inline Payment Form Sub-component (CardElement Classic)
 */
function InlinePaymentForm({ clientSecret, firmId, onSuccess, onError, launching, setLaunching }) {
  const stripe = useStripe();
  const elements = useElements();
  const [btnText, setBtnText] = useState('Submit Payment');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements || !clientSecret) return;

    setLaunching(true);
    setBtnText('Confirming...');
    
    try {
      const cardElement = elements.getElement(CardElement);
      const isSetupIntent = clientSecret.startsWith('seti_');
      let submitResult;

      if (isSetupIntent) {
        submitResult = await stripe.confirmCardSetup(clientSecret, {
          payment_method: { card: cardElement },
        });
      } else {
        submitResult = await stripe.confirmCardPayment(clientSecret, {
          payment_method: { card: cardElement },
        });
      }

      const { error, paymentIntent, setupIntent } = submitResult;

      if (error) {
        onError(error.message);
        setLaunching(false);
        setBtnText('Retry Payment');
      } else if ((paymentIntent?.status === 'succeeded') || (setupIntent?.status === 'succeeded')) {
        setBtnText('Success!');
        const intentId = paymentIntent?.id || setupIntent?.id;
        try {
          await fetch('https://finalizepaymentsetup-2sejsgollq-uc.a.run.app', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              firmId: firmId,
              intentId: intentId,
              type: isSetupIntent ? 'setup' : 'payment'
            })
          });
        } catch (e) {
          console.error('Finalize sync failed:', e);
        }
        setTimeout(() => onSuccess(), 1000);
      } else {
        onSuccess();
      }
    } catch (err) {
      console.error(err);
      onError('Payment processing failed. Please try again.');
      setLaunching(false);
      setBtnText('Retry Payment');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
      <div style={{ padding: '12px 14px', background: '#1a1d23', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}>
        <CardElement options={{
          hidePostalCode: true,
          style: {
            base: {
              fontSize: '14px',
              color: '#e2e8f0',
              fontFamily: "'Inter', system-ui, sans-serif",
              '::placeholder': { color: '#64748b' },
              iconColor: '#76b900'
            },
            invalid: { color: '#ef4444', iconColor: '#ef4444' }
          }
        }} />
      </div>
      
      <button
        type="submit"
        className="db-btn db-btn-primary"
        style={{ width: '100%', padding: '12px', fontSize: '0.875rem', height: '42px' }}
        disabled={!stripe || launching}
      >
        {launching ? (
          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
        ) : (
          <><Zap size={16} /> {btnText}</>
        )}
      </button>
    </form>
  );
}

/*
 * Frictionless Onboarding — Context Panel  
 * Flow: Search Firm → Review Profile (partners/associates) → Continue →
 *       [If no website: offer Build My Site] → [If website: show scraped KB] →
 *       Continue → Credit Card → Launch
 */
export default function FrictionlessOnboardingPanel({ onComplete }) {
  const { user } = useAuth();
  const { firm } = useFirm();
  const navigate = useNavigate();
  
  // Flow state: 'search' → 'profile' → 'payment'
  const [phase, setPhase] = useState('search');
  const [search, setSearch] = useState('');
  const [selectedFirm, setSelectedFirm] = useState(null);
  
  // Firm profile extracted from Google
  const [firmProfile, setFirmProfile] = useState({
    partners: 1,
    associates: 0,
    practiceAreas: [],
    hasWebsite: false,
    website: '',
  });
  
  // Scraping
  const [isScraping, setIsScraping] = useState(false);
  const [scrapedAssets, setScrapedAssets] = useState([]);
  
  // Website builder offer
  const [wantsWebsite, setWantsWebsite] = useState(null); // null = undecided, true/false
  
  // Payment
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState('');
  const [clientSecret, setClientSecret] = useState(null);
  const [paymentReady, setPaymentReady] = useState(false);
  
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);

  // Persistence: Check if we already have a firmId on mount
  useEffect(() => {
    if (user?.firmId && !firm?.isConfigured) {
      console.log('Restoring onboarding for existing firm:', user.firmId);
      setSelectedFirm({
        name: firm?.firmName || firm?.name || 'Your Firm',
        address: firm?.firmAddress || firm?.address || '',
        website: firm?.firmWebsite || firm?.website || '',
        type: firm?.practiceArea || 'Law Practice'
      });
      setPhase('payment');
      preparePayment(user.firmId);
    }
  }, [user?.firmId, firm?.id]);

  // ─── Google Places ───
  useEffect(() => {
    if (!window.google?.maps?.places || !inputRef.current || autocompleteRef.current) return;
    const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['establishment'],
      componentRestrictions: { country: 'us' },
      fields: ['name', 'formatted_address', 'address_components', 'website', 'place_id', 'types'],
    });
    ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      if (!place?.name) return;
      const stateComp = place.address_components?.find(c => c.types.includes('administrative_area_level_1'));
      const cityComp = place.address_components?.find(c => c.types.includes('locality'));
      const zipComp = place.address_components?.find(c => c.types.includes('postal_code'));
      const state = stateComp?.short_name || 'NY';
      const city = cityComp?.long_name || '';
      const zip = zipComp?.long_name || '';

      const firmObj = {
        name: place.name,
        address: place.formatted_address,
        website: place.website || '',
        stateBar: state,
        city,
        zip,
        placeId: place.place_id,
      };
      setSelectedFirm(firmObj);

      // Start with neutral defaults — the deep crawl will provide real attorney counts
      setFirmProfile({
        partners: 1,
        associates: 0,
        practiceAreas: [],
        hasWebsite: !!place.website,
        website: place.website || '',
      });

      // Auto-scrape if website exists
      if (place.website) {
        triggerScrape(firmObj);
      } else {
        // Still persist for Website Builder even without a website
        try {
          localStorage.setItem('nemoc_website_seed', JSON.stringify({
            firmName: place.name,
            address: place.formatted_address,
            city: city,
            stateBar: state,
            website: '',
            scrapedAt: Date.now(),
          }));
        } catch (e) { /* ignore */ }
      }
    });
    autocompleteRef.current = ac;
  }, []);

  const triggerScrape = async (firm) => {
    setIsScraping(true);
    setScrapedAssets([]);

    try {
      const { scrapeFirmWebsite } = await import('../lib/prospectService');
      const liveData = await scrapeFirmWebsite(firm.website);

      if (liveData && !liveData.error && !liveData.simulated) {
        const assets = [];
        if (liveData.firmName || liveData.title) {
          assets.push({ name: `Firm Identity: ${liveData.firmName || liveData.title}`, type: 'web', size: '4 KB', status: 'indexed' });
        }
        if (liveData.practiceAreas?.length > 0) {
          assets.push({ name: `${liveData.practiceAreas.length} Practice Areas Detected`, type: 'web', size: `${liveData.practiceAreas.length * 6} KB`, status: 'indexed' });
          setFirmProfile(p => ({ ...p, practiceAreas: liveData.practiceAreas }));
        }
        if (liveData.attorneys?.length > 0) {
          assets.push({ name: `${liveData.attorneys.length} Attorney Profiles Found`, type: 'web', size: `${liveData.attorneys.length * 8} KB`, status: 'indexed' });
          // No longer assigning to partners/associates state — we add them post-subscription
        }
        if (liveData.phone || liveData.email) {
          assets.push({ name: 'Contact Info & Fee Schedule', type: 'web', size: '6 KB', status: 'indexed' });
        }
        if (liveData.description) {
          assets.push({ name: 'About Us & Firm Mission', type: 'web', size: '12 KB', status: 'indexed' });
        }
        assets.push({ name: `${firm.stateBar || 'State'} Jurisdictional Context`, type: 'web', size: '8 KB', status: 'indexed' });
        if (assets.length === 0) {
          assets.push({ name: 'Homepage Content Indexed', type: 'web', size: '15 KB', status: 'indexed' });
        }
        setScrapedAssets(assets);

        try {
          localStorage.setItem('nemoc_website_seed', JSON.stringify({
            firmName: liveData.firmName || firm.name,
            address: liveData.address || firm.address,
            city: liveData.city || firm.city,
            stateBar: liveData.state || firm.stateBar,
            website: firm.website,
            practiceAreas: liveData.practiceAreas || [],
            attorneys: liveData.attorneys || [],
            phone: liveData.phone || '',
            email: liveData.email || '',
            scrapedColors: liveData.colors || null,
            yearEstablished: liveData.yearEstablished || null,
            pagesScraped: liveData.pagesScraped || 1,
            scrapedAt: Date.now(),
          }));
        } catch (e) { /* ignore */ }
      } else {
        setScrapedAssets([
          { name: 'About Us & Firm Mission', type: 'web', size: '12 KB', status: 'estimated' },
          { name: 'Practice Area Pages', type: 'web', size: '45 KB', status: 'estimated' },
          { name: `${firm.stateBar || 'State'} Jurisdictional Context`, type: 'web', size: '8 KB', status: 'indexed' },
        ]);
        try {
          localStorage.setItem('nemoc_website_seed', JSON.stringify({
            firmName: firm.name, address: firm.address, city: firm.city,
            stateBar: firm.stateBar, website: firm.website, scrapedAt: Date.now(),
          }));
        } catch (e) { /* ignore */ }
      }
    } catch (err) {
      console.warn('Onboarding scrape failed:', err.message);
      setScrapedAssets([
        { name: 'About Us & Firm Mission', type: 'web', size: '12 KB', status: 'estimated' },
        { name: `${firm.stateBar || 'State'} Jurisdictional Context`, type: 'web', size: '8 KB', status: 'indexed' },
      ]);
      try {
        localStorage.setItem('nemoc_website_seed', JSON.stringify({
          firmName: firm.name, address: firm.address, city: firm.city,
          stateBar: firm.stateBar, website: firm.website, scrapedAt: Date.now(),
        }));
      } catch (e) { /* ignore */ }
    } finally {
      setIsScraping(false);
    }
  };

   const handleContinueToPayment = () => {
     if (launching || phase === 'payment') return;
     setLaunching(true);
     setError('');
     setPhase('payment');
     preparePayment(user?.firmId || null);
   };

  // ─── Prepare Payment (called when entering payment phase) ───
  const preparePayment = async (existingId = null) => {
    setLaunching(true);
    setError('');
    try {
      let currentFirmId = existingId;

      if (!currentFirmId) {
        const employees = [];
        employees.push({ name: user.displayName || 'Managing Partner', email: user.email, role: 'solo-partner', agentName: 'AI Chief of Staff' });
        // Extra roles are added by the human managing partner after subscription

        const firmSize = (firmProfile.partners + firmProfile.associates) <= 1 ? 'solo' 
          : (firmProfile.partners + firmProfile.associates) <= 5 ? '2-5' 
          : (firmProfile.partners + firmProfile.associates) <= 10 ? '6-10' : '10+';

        const onboardingData = {
          firmName: selectedFirm.name,
          firmAddress: selectedFirm.address,
          firmWebsite: firmProfile.website,
          stateBar: selectedFirm.stateBar,
          firmSize,
          contactName: user.displayName || selectedFirm.name,
          email: user.email,
          selectedAgents: ['partner', 'legal-research', 'drafting', 'billing-time', 'contract-review'],
          security: {
            approvals: true, blockNetwork: true, encryption: true, dataRetention: true,
            auditLogs: true, restrictedCaseLaw: true, piiRedaction: true, sandbox: true,
            attorneyVerification: true
          },
          services: { clio: false, slack: false, outlook: true },
          files: scrapedAssets.map(a => ({ name: a.name, size: a.size, status: 'indexed', type: 'web' })),
          employees,
          websiteBuilder: wantsWebsite ? { requested: true, price: 500, maintenance: 97 } : null,
        };

        // Save firm to Firestore
        currentFirmId = await completeOnboarding(user.uid, onboardingData);
      }

      // Step 2: Create inline subscription to get clientSecret
      const SUB_URL = 'https://createinlinesubscription-2sejsgollq-uc.a.run.app';
      const response = await fetch(SUB_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firmId: currentFirmId,
          userId: user.uid,
          userEmail: user.email,
          firmName: selectedFirm.name,
          firmAddress: selectedFirm.address,
          city: selectedFirm.city,
          state: selectedFirm.stateBar,
          zip: selectedFirm.zip,
          extraSeats: Math.max(0, (firmProfile?.partners + firmProfile?.associates || 1) - 1),
          includeWebsite: wantsWebsite || false,
        }),
      });

      const result = await response.json();

      if (result.clientSecret) {
        setClientSecret(result.clientSecret);
        setPhase('payment');
      } else {
        console.error('Stripe inline sub error:', result.error);
        setError(result.error || 'Could not verify your subscription details.');
        setPhase('payment');
      }
    } catch (err) {
      console.error('Payment prep error:', err);
      setError('Payment setup failed. You can add payment later in Billing.');
      setPhase('payment');
    } finally {
      setLaunching(false);
    }
  };

  // ─── Pricing (from stripeService.js single source of truth) ───
  const basePlatform = PRICING.base.price;
  const seatPrice = PRICING.seat.price;
  const extraSeats = Math.max(0, (firmProfile.partners + firmProfile.associates) - 1);
  const seatCost = extraSeats * seatPrice;
  const websiteCost = wantsWebsite ? 97 : 0;
  const websiteOneTime = wantsWebsite ? 500 : 0;
  const monthlyTotal = basePlatform + seatCost + websiteCost;

  // ════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px', overflowY: 'auto' }}>
      
      {/* Header */}
      <div>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--db-text-primary)', margin: 0 }}>
          {phase === 'search' ? 'Find Your Firm' : phase === 'profile' ? 'Confirm Profile' : 'Secure Checkout'}
        </h3>
        <p style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)', margin: '4px 0 0', lineHeight: 1.4 }}>
          {phase === 'search' 
            ? 'Search your firm — we auto-provision everything.' 
            : phase === 'profile' 
            ? 'Review your firm details before checkout.' 
            : 'Enter payment to activate your AI workforce.'}
        </p>
      </div>

      {/* ═══ PHASE: SEARCH ═══ */}
      {phase === 'search' && (
        <>
          {/* Search Input */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--db-text-muted)', zIndex: 1 }} />
            <input
              ref={inputRef}
              className="ob-form-input"
              style={{ paddingLeft: '36px', fontSize: '0.8125rem' }}
              placeholder="Search your law firm..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Selected Firm Card */}
          {selectedFirm && (
            <div style={{ padding: '12px', background: 'rgba(118,185,0,0.03)', border: '1px solid rgba(118,185,0,0.12)', borderRadius: '8px', animation: 'fadeSlideUp 0.3s ease-out' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <MapPin size={12} color="var(--db-nvidia-green)" />
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--db-text-primary)' }}>{selectedFirm.name}</span>
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)' }}>{selectedFirm.address}</div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)', marginTop: '2px' }}>State Bar: <strong>{selectedFirm.stateBar}</strong></div>
              {firmProfile.website && (
                <div style={{ fontSize: '0.6875rem', color: 'var(--db-nvidia-green)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
                  <Globe size={10} style={{ flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{firmProfile.website}</span>
                </div>
              )}
            </div>
          )}



          {/* Scraping Progress / Results */}
          {selectedFirm && firmProfile.hasWebsite && (
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--db-text-muted)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Knowledge Base Scan</span>
                {isScraping && <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />}
                {!isScraping && scrapedAssets.length > 0 && <span style={{ color: 'var(--db-nvidia-green)' }}>{scrapedAssets.length} assets</span>}
              </div>
              {isScraping ? (
                <div style={{ padding: '16px', textAlign: 'center', background: 'var(--db-bg)', borderRadius: '8px', border: '1px dashed var(--db-border)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--db-text-secondary)', marginBottom: '6px' }}>Scanning {firmProfile.website}...</div>
                  <div style={{ width: '100%', height: '3px', background: 'var(--db-border)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: '60%', height: '100%', background: 'var(--db-nvidia-green)', animation: 'progress 2s ease-in-out infinite' }} />
                  </div>
                </div>
              ) : scrapedAssets.length > 0 && (
                <div style={{ padding: '12px', background: 'rgba(118,185,0,0.03)', border: '1px solid rgba(118,185,0,0.12)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--db-nvidia-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000' }}>
                    <Check size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--db-text-primary)' }}>Indexing Successful</div>
                    <div style={{ fontSize: '0.625rem', color: 'var(--db-text-muted)' }}>{scrapedAssets.length} knowledge assets synced to sandbox.</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* No Website — Offer Builder */}
          {selectedFirm && !firmProfile.hasWebsite && (
            <div style={{ padding: '14px', background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <AlertCircle size={14} color="#f59e0b" />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--db-text-primary)' }}>No website detected</span>
              </div>
              <p style={{ fontSize: '0.6875rem', color: 'var(--db-text-secondary)', lineHeight: 1.5, margin: '0 0 12px' }}>
                We can build a professional, AI-powered website for your firm at <strong>nemoc-law.ai/{selectedFirm.name?.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')}</strong>
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => { setWantsWebsite(true); }}
                  className="db-btn db-btn-primary db-btn-sm"
                  style={{ fontSize: '0.6875rem', padding: '6px 12px', flex: 1, background: wantsWebsite === true ? 'var(--db-nvidia-green)' : undefined }}
                >
                  <Globe size={12} /> Build My Site — $500 + $97/mo
                </button>
                <button 
                  onClick={() => setWantsWebsite(false)}
                  className="db-btn db-btn-secondary db-btn-sm"
                  style={{ fontSize: '0.6875rem', padding: '6px 12px' }}
                >
                  Skip
                </button>
              </div>
              {wantsWebsite && (
                <button 
                  onClick={() => navigate('/dashboard/website')}
                  className="db-btn db-btn-secondary db-btn-sm"
                  style={{ width: '100%', marginTop: '8px', fontSize: '0.625rem', gap: '4px' }}
                >
                  <ExternalLink size={10} /> Preview at nemoc-law.ai — enter your firm name
                </button>
              )}
            </div>
          )}

          {/* Security Badge */}
          <div style={{ padding: '10px 12px', background: 'rgba(59,130,246,0.03)', border: '1px solid rgba(59,130,246,0.08)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck size={14} color="#3b82f6" />
            <div>
              <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--db-text-primary)' }}>9/9 Safety Controls Active</div>
              <div style={{ fontSize: '0.5625rem', color: 'var(--db-text-muted)' }}>PII redaction, sandbox, audit logs · Update anytime in Settings</div>
            </div>
          </div>

          {/* Continue Button */}
          {selectedFirm && (!firmProfile.hasWebsite ? wantsWebsite !== null : (!isScraping && scrapedAssets.length > 0)) && (
            <button 
              className="db-btn db-btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: '0.875rem' }}
              onClick={handleContinueToPayment}
              disabled={launching}
            >
              {launching ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Preparing...</> : <>Continue <ChevronRight size={16} /></>}
            </button>
          )}
        </>
      )}

      {/* ═══ PHASE: PAYMENT ═══ */}
      {phase === 'payment' && (
        <>
          {/* Summary strip */}
          <div style={{ padding: '10px 12px', background: 'rgba(118,185,0,0.03)', border: '1px solid rgba(118,185,0,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--db-text-primary)' }}>{selectedFirm.name}</div>
              <div style={{ fontSize: '0.5625rem', color: 'var(--db-text-muted)' }}>{firmProfile.partners}P · {firmProfile.associates}A · {selectedFirm.stateBar}</div>
            </div>
            <button onClick={() => setPhase('search')} style={{ fontSize: '0.625rem', color: 'var(--db-nvidia-green)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Edit</button>
          </div>

          {/* Pricing Breakdown */}
          <div className="ob-billing-card" style={{ padding: '16px', animation: 'fadeSlideUp 0.3s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700 }}>Pricing</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.625rem', color: 'var(--db-nvidia-green)', fontWeight: 600 }}>
                <Lock size={10} /> Encrypted
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--db-text-secondary)' }}>Founder Price-Lock</span>
                <span style={{ fontWeight: 700 }}>$297/mo</span>
              </div>
              {extraSeats > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--db-text-secondary)' }}>{extraSeats} Additional Seat{extraSeats > 1 ? 's' : ''} × ${seatPrice}</span>
                  <span style={{ fontWeight: 700 }}>${seatCost}/mo</span>
                </div>
              )}
              {wantsWebsite && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--db-text-secondary)' }}>Website Build (one-time)</span>
                    <span style={{ fontWeight: 700 }}>$500</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--db-text-secondary)' }}>Website Maintenance</span>
                    <span style={{ fontWeight: 700 }}>$97/mo</span>
                  </div>
                </>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--db-border)', paddingTop: '8px', marginTop: '4px' }}>
                <span style={{ fontWeight: 700, color: 'var(--db-text-primary)' }}>Monthly Total</span>
                <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--db-text-primary)' }}>${monthlyTotal}/mo</span>
              </div>
              {websiteOneTime > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600, color: 'var(--db-text-secondary)', fontSize: '0.6875rem' }}>Due Today (incl. website build)</span>
                  <span style={{ fontWeight: 800, color: 'var(--db-nvidia-green)' }}>${monthlyTotal + websiteOneTime}</span>
                </div>
              )}
            </div>

            {/* Inline Stripe Payment Form */}
            {clientSecret ? (
              <Elements stripe={stripePromise}>
                <InlinePaymentForm
                  clientSecret={clientSecret}
                  firmId={user?.firmId || firm?.id}
                  onSuccess={() => onComplete()}
                  onError={(msg) => setError(msg)}
                  launching={launching}
                  setLaunching={setLaunching}
                />
              </Elements>
            ) : (
              <div style={{ padding: '20px', textAlign: 'center' }}>
                {launching ? (
                  <>
                    <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} color="var(--db-nvidia-green)" />
                    <div style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)' }}>Setting up secure payment...</div>
                  </>
                ) : (
                  <>
                    <CreditCard size={20} style={{ margin: '0 auto 8px' }} color="var(--db-text-muted)" />
                    <div style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)' }}>Payment form loading...</div>
                  </>
                )}
              </div>
            )}
            
            {/* Address Pre-fill */}
            {selectedFirm?.address && (
              <div style={{ padding: '8px 10px', background: 'rgba(118,185,0,0.03)', borderRadius: '6px', fontSize: '0.625rem', color: 'var(--db-text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px' }}>
                <MapPin size={10} color="var(--db-nvidia-green)" />
                Billing: {selectedFirm.address}
              </div>
            )}

            <div style={{ fontSize: '0.5rem', color: 'var(--db-text-muted)', textAlign: 'center', marginTop: '10px', lineHeight: 1.4 }}>
              Founder pricing locked for life. Cancel anytime. Powered by Stripe.
            </div>
          </div>

          {/* Back */}
          <button onClick={() => setPhase('search')} style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center', marginTop: '4px' }}>
            ← Back to firm details
          </button>
        </>
      )}

      {error && (
        <div style={{ padding: '10px', borderRadius: '6px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.6875rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={12} /> <span>{error}</span>
          </div>
          <button 
            onClick={async () => {
              try {
                localStorage.removeItem('nemoc_website_seed');
                if (user?.uid) {
                  const { updateDoc, doc } = await import('firebase/firestore');
                  const { db } = await import('../lib/firebase');
                  await updateDoc(doc(db, 'users', user.uid), { firmId: null });
                }
              } catch (e) { console.error('Cache clear failed', e); }
              window.location.reload();
            }}
            style={{ fontWeight: 600, background: 'none', border: '1px solid #fca5a5', color: '#dc2626', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.625rem', width: 'fit-content' }}
          >
            Clear Cache & Restart
          </button>
        </div>
      )}

      <style>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
