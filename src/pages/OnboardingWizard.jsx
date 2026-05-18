import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, FileText, UserCheck, PenTool, FolderSearch, Scale, Mic,
  DollarSign, ScanSearch, Clock, ShieldCheck, Lock, ClipboardList,
  Gavel, MapPin, FileCheck, Upload, File, Lightbulb, Infinity as InfinityIcon, Check,
  Plus, Trash2, Briefcase, Phone, Bot, Crown, ArrowRight, ChevronRight, AlertCircle, Globe, Users, Zap, Loader2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { completeOnboarding } from '../lib/firestore';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { EMPLOYEE_ROLES, AGENT_SUB_AGENTS } from '../lib/agentHierarchy';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import '../styles/onboarding.css';
const stripePromise = loadStripe((import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '').trim());

const PRACTICE_AREA_GROUPS = [
  {
    label: 'Individuals',
    areas: [
      'Adoption', 'Animal / Pet Law', 'Bankruptcy (Personal)', 'Child Custody & Support',
      'Civil Rights', 'Consumer Protection', 'Criminal Defense', 'Disability / ADA',
      'Divorce & Separation', 'DUI / DWI', 'Education Law', 'Elder Law',
      'Employment (Employee Side)', 'Entertainment / Sports Law', 'Estate Planning & Probate',
      'Expungement / Record Sealing', 'Family Law', 'Guardianship & Conservatorship',
      'Immigration', 'Insurance Claims', 'Juvenile Law', 'Landlord-Tenant (Tenant Side)',
      'Medical Malpractice', 'Military / Veterans Law', 'Native American Law',
      'Nursing Home Abuse', 'Personal Injury', 'Product Liability',
      'Sexual Harassment / Assault', 'Social Security Disability', 'Traffic Violations',
      'Trusts & Wills', 'Workers\' Compensation', 'Wrongful Death',
    ],
  },
  {
    label: 'Businesses',
    areas: [
      'Antitrust / Competition', 'Aviation Law', 'Banking & Finance', 'Bankruptcy (Business)',
      'Business Formation & LLC', 'Cannabis / Marijuana Law', 'Class Action Defense',
      'Commercial Litigation', 'Construction Law', 'Contracts & Agreements',
      'Corporate Governance', 'Corporate / M&A', 'Cybersecurity & Data Privacy',
      'eDiscovery', 'Employment (Employer Side)', 'Energy & Utilities',
      'Environmental & EPA', 'Franchise Law', 'Government Contracts',
      'Healthcare & HIPAA', 'Insurance Defense', 'Intellectual Property / Patent',
      'International Trade', 'Landlord-Tenant (Landlord Side)', 'Maritime / Admiralty',
      'Media & Communications', 'Mergers & Acquisitions', 'Non-Profit / Tax-Exempt',
      'Oil & Gas', 'Real Estate (Commercial)', 'Real Estate (Residential)',
      'Regulatory & Compliance', 'Securities & SEC', 'Tax (Business)',
      'Tax (Individual)', 'Technology & Software', 'Telecommunications',
      'Transportation & Logistics', 'White Collar Crime', 'Zoning & Land Use',
    ],
  },
];

// Flat list for backward compat
const PRACTICE_AREAS = PRACTICE_AREA_GROUPS.flatMap(g => g.areas);

const AGENT_NAME_SUGGESTIONS = [
  { name: 'Lexi', desc: 'Jurisdictional Logic' },
  { name: 'Prudence', desc: 'Standard of Care' },
  { name: 'Justice', desc: 'Equity & Fairness' },
  { name: 'Amicus', desc: 'Procedural Advisory' },
  { name: 'Portia', desc: 'Advanced Drafting' },
  { name: 'Atticus', desc: 'Litigation Strategy' },
  { name: 'Harvey', desc: 'Aggressive Advocacy' },
  { name: 'Marshall', desc: 'Constitutional Depth' },
  { name: 'Solon', desc: 'Regulatory Framework' },
  { name: 'Verity', desc: 'Evidentiary Truth' },
  { name: 'Lincoln', desc: 'Trial Readiness' },
  { name: 'Sterling', desc: 'Operations Excellence' },
];

const AGENTS = [
  { id: 'website-builder', Icon: Globe, name: 'Website Builder Agent', desc: 'Analyze and redesign your firm website — included free with every account', recommended: true, category: 'Marketing', free: true },
  { id: 'contact-mgmt', Icon: Users, name: 'Client Contact Manager', desc: 'Track client records, communication history, and manage follow-ups', recommended: true, category: 'Operations' },
  { id: 'research', Icon: Search, name: 'Legal Research Agent', desc: 'Summarize case law, find precedents, cite authority', recommended: true, category: 'Research' },
  { id: 'contracts', Icon: FileText, name: 'Contract Review Agent', desc: 'Redline NDAs/MSAs, flag risk clauses, suggest edits', recommended: true, category: 'Documents' },
  { id: 'intake', Icon: UserCheck, name: 'Client Intake Agent', desc: 'Screen leads, run conflict checks, qualify matters', recommended: true, category: 'Operations' },
  { id: 'drafting', Icon: PenTool, name: 'Drafting Agent', desc: 'Generate pleadings, motions, and first-draft briefs', recommended: false, category: 'Documents' },
  { id: 'ediscovery', Icon: FolderSearch, name: 'eDiscovery Agent', desc: 'Review documents, identify privilege, tag relevance', recommended: false, category: 'Litigation' },
  { id: 'compliance', Icon: Scale, name: 'Compliance Agent', desc: 'Monitor regulatory deadlines and filing requirements', recommended: false, category: 'Regulatory' },
  { id: 'deposition', Icon: Mic, name: 'Deposition Prep Agent', desc: 'Prepare outlines, identify key exhibits and questions', recommended: false, category: 'Litigation' },
  { id: 'billing', Icon: DollarSign, name: 'Billing Automation Agent', desc: 'Auto-generate time entries and invoice drafts', recommended: false, category: 'Finance' },
  { id: 'duediligence', Icon: ScanSearch, name: 'Due Diligence Agent', desc: 'Analyze deal documents, flag discrepancies and risks', recommended: false, category: 'M&A' },
  { id: 'deadline', Icon: Clock, name: 'Deadline Tracker Agent', desc: 'Track court dates, statute of limitations, filings', recommended: false, category: 'Operations' },
];

const SECURITY_OPTIONS = [
  { id: 'pii', Icon: ShieldCheck, name: 'Auto-redact PII before AI inference', desc: 'Strip SSNs, phone numbers, addresses from prompts', default: true },
  { id: 'network', Icon: Lock, name: 'Block unauthorized network calls', desc: 'Only whitelisted endpoints can be reached', default: true },
  { id: 'encryption', Icon: ShieldCheck, name: 'AES-256 Prompt & Context Encryption', desc: 'Enterprise-grade encryption for all agent signals', default: true },
  { id: 'zero_retention', Icon: Clock, name: 'Zero-Data Retention (Session Purge)', desc: 'Sandbox memory is wiped immediately after session ends', default: true },
  { id: 'audit', Icon: ClipboardList, name: 'Log all agent actions for audit', desc: 'Complete trail of every agent decision', default: true },
  { id: 'approval', Icon: Gavel, name: 'Require attorney approval for drafts', desc: 'No document leaves without human review', default: true },
  { id: 'statelaw', Icon: MapPin, name: 'Restrict to state-specific case law', desc: 'Limit research to your licensed jurisdictions', default: true },
  { id: 'upl', Icon: Scale, name: 'Enable UPL warnings', desc: 'Flag potential unauthorized practice of law issues', default: true },
  { id: 'disclosure', Icon: FileCheck, name: 'AI-generated content disclosures', desc: 'Mark outputs generated by AI', default: true },
];

const EXTERNAL_SERVICES = [
  { id: 'nvidia', name: 'NVIDIA Inference', desc: 'Required for agent operation', required: true, default: true },
  { id: 'courtlistener', name: 'CourtListener', desc: 'Federal case law research', required: false, default: true },
];

const STEP_LABELS = ['Firm Profile', 'Knowledge Base', 'Security', 'Review'];

export default function OnboardingWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState('');
  const [firmId, setFirmId] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const nameParts = (user?.displayName || '').split(' ');
  const [data, setData] = useState({
    firmName: '',
    firmAddress: '',
    firmPhone: '',
    firmWebsite: '',
    placeId: '',
    stateBar: '',
    practiceAreas: [],
    firmSize: 'solo',
    firstName: nameParts[0] || '',
    lastName: nameParts.slice(1).join(' ') || '',
    email: user?.email || '',
    employees: [
      { name: user?.displayName || '', email: user?.email || '', role: 'managing-partner', practiceAreas: [], supervisingPartnerId: null, agentName: '' },
    ],
    selectedAgents: AGENTS.filter(a => a.recommended || a.free).map(a => a.id),
    files: [],
    security: SECURITY_OPTIONS.reduce((acc, opt) => ({ ...acc, [opt.id]: opt.default }), {}),
    services: EXTERNAL_SERVICES.reduce((acc, svc) => ({ ...acc, [svc.id]: svc.default }), {}),
  });

  // Ensure every new step starts at the top of the viewport
  useEffect(() => {
    window.scrollTo(0, 0);
    // Also scroll the root element just in case the body is locked
    document.getElementById('root')?.scrollTo(0, 0);
  }, [step]);

  const updateData = (key, value) => setData(prev => ({ ...prev, [key]: value }));

  const togglePracticeArea = (area) => {
    setData(prev => ({
      ...prev,
      practiceAreas: prev.practiceAreas.includes(area)
        ? prev.practiceAreas.filter(a => a !== area)
        : [...prev.practiceAreas, area],
    }));
  };

  const _toggleAgent = (id) => {
    setData(prev => ({
      ...prev,
      selectedAgents: prev.selectedAgents.includes(id)
        ? prev.selectedAgents.filter(a => a !== id)
        : [...prev.selectedAgents, id],
    }));
  };

  const _toggleSecurity = (id) => {
    setData(prev => ({
      ...prev,
      security: { ...prev.security, [id]: !prev.security[id] },
    }));
  };

  const _toggleService = (id) => {
    if (id === 'nvidia') return;
    setData(prev => ({
      ...prev,
      services: { ...prev.services, [id]: !prev.services[id] },
    }));
  };

  const isStepValid = () => {
    if (step === 0) {
      return (data.firmName?.trim().length || 0) > 2 && 
             data.practiceAreas.length > 0 && 
             (data.firstName?.trim().length || 0) > 0 &&
             (data.lastName?.trim().length || 0) > 0 &&
             (data.email?.includes('@') || false);
    }
    return true;
  };

  // Auto-provision firm and fetch Stripe clientSecret
  const provisionFirm = async () => {
    setLaunching(true);
    setError('');
    try {
      let currentFirmId = user?.firmId || firmId;
      currentFirmId = await completeOnboarding(user.uid, data, currentFirmId);
      setFirmId(currentFirmId);
      // Fetch Stripe clientSecret for inline checkout
      if (!clientSecret) {
        const response = await fetch('https://createinlinesubscription-2sejsgollq-uc.a.run.app', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firmId: currentFirmId,
            userId: user.uid,
            userEmail: user.email,
            firmName: data.firmName,
            extraSeats: Math.max(0, data.employees.length - 1),
          }),
        });
        const result = await response.json();
        if (result?.clientSecret) {
          setClientSecret(result.clientSecret);
        }
      }
    } catch (err) {
      console.error('Firm provisioning error:', err);
    } finally {
      setLaunching(false);
    }
  };

  // Auto-provision when Review step is reached
  useEffect(() => {
    if (step === 3 && !firmId && !user?.firmId) {
      provisionFirm();
    }
    // The provisioner intentionally runs only when the user first reaches review.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const handleSkip = async () => {
    setLaunching(true);
    setError('');
    try {
      let currentFirmId = user?.firmId || firmId;
      currentFirmId = await completeOnboarding(user.uid, data, currentFirmId);
      setFirmId(currentFirmId);
      
      await updateDoc(doc(db, 'users', user.uid), { onboardingComplete: true });
      navigate('/dashboard');
    } catch (err) {
      console.error('Skip error:', err);
      // Instead of navigating away and swallowing the exception, expose it!
      setError(err.message || 'Provisioning failed. See console.');
    } finally {
      setLaunching(false);
    }
  };

  const _handlePaymentSuccess = async () => {
    try {
      await updateDoc(doc(db, 'users', user.uid), { onboardingComplete: true });
    } catch (e) {
      console.error('Failed to set onboarding complete flag during payment callback:', e);
    }
    navigate('/dashboard');
  };

  const totalSteps = STEP_LABELS.length - 1;
  const _next = () => step < totalSteps ? setStep(step + 1) : null;
  const _back = () => step > 0 && setStep(step - 1);

  return (
    <div className="onboarding-layout">
      <div className="onboarding-topbar">
        <div className="onboarding-topbar-inner">
          <a href="/" className="onboarding-topbar-logo">
            <img src="/logos/claw-64-transparent.png" alt="" className="onboarding-topbar-logo-icon" />
            <img src="/logos/wordmark.svg" alt="NemoC LAW AI" className="onboarding-topbar-wordmark" />
          </a>
          <div className="onboarding-topbar-right">
            <span className="onboarding-topbar-help">Need help?</span>
          </div>
        </div>
      </div>

      <div className="onboarding-body">
        <div className="onboarding-container">
          {/* Progress */}
          {/* Progress hidden - Streamlined 1-step flow */}

          {/* AI Concierge — Below steps, vertically aligned with card */}
          <AIConcierge step={step} data={data} />

          {/* Step Content */}
          <div className="onboarding-step-card" key={step}>
            <StepFirmProfile data={data} updateData={updateData} togglePracticeArea={togglePracticeArea} setData={setData} />

            {error && (
              <div style={{ margin: '0 0 16px', padding: '10px 14px', background: 'var(--db-danger-subtle)', border: '1px solid var(--db-danger-subtle)', borderRadius: '8px', fontSize: '0.8125rem', color: 'var(--db-danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <div className="onboarding-actions">
              <div></div>
              <div className="onboarding-actions-right">
                <button 
                  className="db-btn db-btn-primary" 
                  onClick={handleSkip} 
                  disabled={launching || !isStepValid()}
                  style={{ opacity: isStepValid() ? 1 : 0.5, cursor: isStepValid() ? 'pointer' : 'not-allowed' }}
                >
                  {launching ? (
                    <span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'auth-spin 0.6s linear infinite', display: 'inline-block' }} />
                  ) : (
                    <>Launch Firm Workspace <ArrowRight size={14} /></>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Step 1: Firm Profile — with Google Places Autocomplete */
function StepFirmProfile({ data, updateData, togglePracticeArea, setData }) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeComplete, setScrapeComplete] = useState(false);

  const STATE_MAP = {
    'Alabama': 'Alabama', 'Alaska': 'Alaska', 'Arizona': 'Arizona', 'Arkansas': 'Arkansas',
    'California': 'California', 'Colorado': 'Colorado', 'Connecticut': 'Connecticut',
    'Delaware': 'Delaware', 'Florida': 'Florida', 'Georgia': 'Georgia', 'Hawaii': 'Hawaii',
    'Idaho': 'Idaho', 'Illinois': 'Illinois', 'Indiana': 'Indiana', 'Iowa': 'Iowa',
    'Kansas': 'Kansas', 'Kentucky': 'Kentucky', 'Louisiana': 'Louisiana', 'Maine': 'Maine',
    'Maryland': 'Maryland', 'Massachusetts': 'Massachusetts', 'Michigan': 'Michigan',
    'Minnesota': 'Minnesota', 'Mississippi': 'Mississippi', 'Missouri': 'Missouri',
    'Montana': 'Montana', 'Nebraska': 'Nebraska', 'Nevada': 'Nevada',
    'New Hampshire': 'New Hampshire', 'New Jersey': 'New Jersey', 'New Mexico': 'New Mexico',
    'New York': 'New York', 'North Carolina': 'North Carolina', 'North Dakota': 'North Dakota',
    'Ohio': 'Ohio', 'Oklahoma': 'Oklahoma', 'Oregon': 'Oregon', 'Pennsylvania': 'Pennsylvania',
    'Rhode Island': 'Rhode Island', 'South Carolina': 'South Carolina',
    'South Dakota': 'South Dakota', 'Tennessee': 'Tennessee', 'Texas': 'Texas',
    'Utah': 'Utah', 'Vermont': 'Vermont', 'Virginia': 'Virginia', 'Washington': 'Washington',
    'West Virginia': 'West Virginia', 'Wisconsin': 'Wisconsin', 'Wyoming': 'Wyoming',
    'District of Columbia': 'District of Columbia',
  };

  useEffect(() => {
    if (!window.google?.maps?.places || !inputRef.current || autocompleteRef.current) return;

    const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['lawyer'],
      componentRestrictions: { country: 'us' },
      fields: ['name', 'formatted_address', 'address_components', 'place_id', 'formatted_phone_number', 'website', 'types'],
    });

    ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      if (!place?.name) return;

      updateData('firmName', place.name);
      if (place.formatted_address) updateData('firmAddress', place.formatted_address);
      if (place.place_id) updateData('placeId', place.place_id);
      if (place.formatted_phone_number) updateData('firmPhone', place.formatted_phone_number);
      if (place.website) {
        updateData('firmWebsite', place.website);
        let websiteName = place.website;
        try { websiteName = new URL(place.website).hostname; } catch(_e) { /* intentionally ignored */ }
        updateData('files', [{
          name: websiteName, size: 'Website Crawl', status: 'done',
          role: 'company-wide', category: 'Digital Footprint'
        }]);

        // Auto-scrape practice areas from website
        setIsScraping(true);
        setScrapeComplete(false);
        fetch('http://localhost:8000/api/scrape-practice-areas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: place.website })
        })
        .then(res => res.json())
        .then(result => {
          if (result.practice_areas && result.practice_areas.length > 0) {
            setData(prev => ({
              ...prev,
              practiceAreas: [...new Set([...prev.practiceAreas, ...result.practice_areas])]
            }));
          }
          if (result.content) {
            setData(prev => ({
              ...prev,
              files: prev.files.map(f => 
                f.name === websiteName 
                  ? { ...f, content: result.content, size: (result.content.length / 1024).toFixed(1) + ' KB' } 
                  : f
              )
            }));
          }
        }).catch(err => console.error('Practice area auto-detect failed:', err))
          .finally(() => {
            setIsScraping(false);
            setScrapeComplete(true);
          });
      }

      const stateComponent = place.address_components?.find(c =>
        c.types.includes('administrative_area_level_1')
      );
      if (stateComponent?.long_name && STATE_MAP[stateComponent.long_name]) {
        updateData('stateBar', STATE_MAP[stateComponent.long_name]);
      }
    });

    autocompleteRef.current = ac;
    // Google Places Autocomplete binds an external widget once for this input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const FIRM_SIZE_OPTIONS = [
    { value: 'solo', label: '1 — Solo Practitioner', desc: 'Agentic OS included' },
    { value: '2-5', label: '2–5 Attorneys', desc: 'Add seats as needed' },
    { value: '6-10', label: '6–10 Attorneys', desc: 'Add seats as needed' },
    { value: '10+', label: '10+ Attorneys', desc: 'Enterprise allocation' },
  ];

  return (
    <>
      <h2 className="onboarding-step-title">Tell us about your firm</h2>
      <p className="onboarding-step-desc">
        Start typing your firm name — we'll auto-fill details from Google. Only verified law firms, attorneys, and legal businesses are returned.
      </p>

      {/* Managing Partner Name — First/Last */}
      <div className="ob-form-row">
        <div className="ob-form-group">
          <label className="ob-form-label">First Name <span className="required">*</span></label>
          <input className="ob-form-input" type="text" placeholder="First name" value={data.firstName} onChange={e => updateData('firstName', e.target.value)} />
        </div>
        <div className="ob-form-group">
          <label className="ob-form-label">Last Name <span className="required">*</span></label>
          <input className="ob-form-input" type="text" placeholder="Last name" value={data.lastName} onChange={e => updateData('lastName', e.target.value)} />
        </div>
      </div>

      <div className="ob-form-group">
        <label className="ob-form-label">Email <span className="required">*</span></label>
        <input className="ob-form-input" type="email" placeholder="you@firm.com" value={data.email} onChange={e => updateData('email', e.target.value)} />
      </div>

      <div className="ob-form-group">
        <label className="ob-form-label">Firm Name <span className="required">*</span></label>
        <input ref={inputRef} className={`ob-form-input ob-places-input${data.firmAddress ? ' ob-places-filled' : ''}`} type="text" placeholder="Start typing your law firm name..." defaultValue={data.firmName} onChange={e => updateData('firmName', e.target.value)} autoComplete="off" />
        <div style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <MapPin size={10} /> Powered by Google Places — only law firms and legal businesses returned
        </div>
      </div>

      {data.firmAddress && (
        <div style={{ padding: '10px 14px', background: 'var(--bg-card-hover)', border: '1px solid var(--db-border)', borderRadius: '8px', marginBottom: '16px', fontSize: '0.8125rem', color: 'var(--db-text-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <Check size={12} />
            <strong style={{ color: 'var(--db-text-primary)' }}>Presence Verified via Cloud</strong>
          </div>
          <div>{data.firmAddress}</div>
          {data.firmPhone && <div style={{ marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={10} /> {data.firmPhone}</div>}
          {data.firmWebsite && (
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'rgba(0,0,0,0.03)', borderRadius: '6px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Globe size={12} color="var(--db-text-muted)" />
                <span style={{ fontSize: '0.8125rem' }}>{data.firmWebsite}</span>
              </div>
              {isScraping && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.6875rem', color: '#2563eb', fontWeight: 600, background: 'rgba(37,99,235,0.1)', padding: '2px 8px', borderRadius: '10px' }}>
                  <Loader2 size={10} style={{ animation: 'auth-spin 1s linear infinite' }} /> Indexing digital footprint & populating practice areas...
                </div>
              )}
              {scrapeComplete && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.6875rem', color: 'var(--db-nvidia-green)', fontWeight: 600, background: 'rgba(118,185,0,0.1)', padding: '2px 8px', borderRadius: '10px', animation: 'fadeIn 0.4s ease' }}>
                  <Check size={10} /> Footprint Captured {data.practiceAreas.length > 0 ? '& Practice Areas Detected' : ''}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="ob-form-row">
        <div className="ob-form-group">
          <label className="ob-form-label">State Bar {data.stateBar ? <Check size={10} style={{ display: 'inline', verticalAlign: 'middle' }} /> : <span style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)', fontWeight: 400 }}>(auto-detected)</span>}</label>
          <input className="ob-form-input" type="text" value={data.stateBar || 'Select a firm above to auto-detect'} readOnly style={{ background: 'rgba(0,0,0,0.02)', cursor: 'default', color: data.stateBar ? 'var(--db-text-primary)' : 'var(--db-text-muted)' }} />
        </div>
        <div className="ob-form-group">
          <label className="ob-form-label">Firm Size</label>
          <select className="ob-form-select" value={data.firmSize} onChange={e => updateData('firmSize', e.target.value)}>
            {FIRM_SIZE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <div style={{ fontSize: '0.6875rem', marginTop: '4px', color: 'var(--db-text-muted)' }}>
            {FIRM_SIZE_OPTIONS.find(o => o.value === data.firmSize)?.desc}
          </div>
        </div>
      </div>

      {data.firmSize === '10+' && (
        <div style={{ padding: '12px 16px', marginBottom: '16px', background: 'var(--db-warning-subtle)', border: '1px solid var(--db-warning-subtle)', borderRadius: '8px', fontSize: '0.8125rem', color: 'var(--db-text-secondary)', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>Enterprise Token Pricing</strong>
            <div style={{ color: 'var(--db-text-secondary)', marginTop: '2px', fontSize: '0.75rem' }}>
              Firms with 10+ attorneys use significantly more AI tokens. Additional tokens billed at cost ($0.002/1K tokens).
            </div>
          </div>
        </div>
      )}

      <div className="ob-form-group">
        <label className="ob-form-label">Practice Areas <span className="required">*</span> <span style={{ fontSize: '0.6875rem', fontWeight: 400, color: 'var(--db-text-muted)' }}>(select at least 1)</span></label>
        {PRACTICE_AREA_GROUPS.map(group => (
          <div key={group.label} style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--db-text-muted)', marginBottom: '8px', paddingBottom: '4px', borderBottom: '1px solid var(--db-border)' }}>
              {group.label}
            </div>
            <div className="ob-checkbox-grid">
              {group.areas.map(area => (
                <div key={area} className={`ob-checkbox-item ${data.practiceAreas.includes(area) ? 'checked' : ''}`} onClick={() => togglePracticeArea(area)}>
                  <div className="ob-checkbox-box">{data.practiceAreas.includes(area) && <Check size={12} />}</div>
                  <span className="ob-checkbox-label">{area}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}


/* Step 2: Team Roster — Add employees & auto-assign agents */
function StepTeamRoster({ data, updateData }) {
  const addEmployee = () => {
    updateData('employees', [...data.employees, {
      name: '', email: '', role: 'associate', practiceAreas: [],
      supervisingPartnerId: null, agentName: '',
    }]);
  };

  const updateEmployee = (index, field, value) => {
    const updated = [...data.employees];
    updated[index] = { ...updated[index], [field]: value };
    updateData('employees', updated);
  };

  const removeEmployee = (index) => {
    if (data.employees.length <= 1) return;
    updateData('employees', data.employees.filter((_, i) => i !== index));
  };

  const partners = data.employees.filter(e => ['partner', 'managing-partner', 'solo-partner'].includes(e.role));
  const totalAgents = data.employees.length;

  const ROLE_ICONS = {
    partner: Crown, 'managing-partner': Crown, 'solo-partner': Crown, 
    associate: Briefcase, 'of-counsel': Briefcase, 'contractor': Briefcase,
    paralegal: FileText, receptionist: Phone, secretary: UserCheck,
    billing: DollarSign, 'office-manager': ClipboardList,
  };

  return (
    <>
      <h2 className="onboarding-step-title">Who's on your team?</h2>
      <p className="onboarding-step-desc">
        Add every person at your firm. Each person gets their own <strong>personal AI Agent</strong> trained
        for their role. Partners also get access to the <strong>Super Agent</strong> — your firm's AI Chief of Staff.
      </p>

      {/* Summary bar */}
      <div style={{
        display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap',
      }}>
        <div style={{
          padding: '8px 14px', background: 'var(--bg-card-hover)',
          border: '1px solid var(--db-border)', borderRadius: '8px',
          fontSize: '0.8125rem', fontWeight: 600, color: 'var(--db-text-secondary)',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <Bot size={14} /> {totalAgents} Agent{totalAgents !== 1 ? 's' : ''} will be created
        </div>
        {partners.length > 0 && (
          <div style={{
            padding: '8px 14px', background: 'var(--bg-card-hover)',
            border: '1px solid var(--db-border)', borderRadius: '8px',
            fontSize: '0.8125rem', fontWeight: 600, color: 'var(--db-text-secondary)',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <Crown size={14} /> {partners.length} Partner{partners.length !== 1 ? 's' : ''} → Super Agent access
          </div>
        )}
      </div>

      {/* Employee list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
        {data.employees.map((emp, i) => {
          const RoleIcon = ROLE_ICONS[emp.role] || Briefcase;
          const roleConfig = EMPLOYEE_ROLES.find(r => r.value === emp.role);
          const subAgentCount = AGENT_SUB_AGENTS[roleConfig?.agentType || 'associate']?.length || 0;

          return (
            <div key={i} style={{
              border: '1px solid var(--db-border)', borderRadius: 'var(--db-radius-lg)',
              padding: '16px 18px', background: 'var(--db-surface)',
              transition: 'border-color 0.15s',
            }}>
              {/* Row 1: Name + Email */}
              <div className="ob-form-row" style={{ marginBottom: '10px' }}>
                <div className="ob-form-group" style={{ marginBottom: 0 }}>
                  <input
                    className="ob-form-input"
                    type="text"
                    placeholder="Full name"
                    value={emp.name}
                    onChange={e => updateEmployee(i, 'name', e.target.value)}
                  />
                </div>
                <div className="ob-form-group" style={{ marginBottom: 0 }}>
                  <input
                    className="ob-form-input"
                    type="email"
                    placeholder="Email address"
                    value={emp.email}
                    onChange={e => updateEmployee(i, 'email', e.target.value)}
                  />
                </div>
              </div>

              {/* Row 2: Role + Partner selector + info + delete */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <select
                  className="ob-form-select"
                  value={emp.role}
                  onChange={e => updateEmployee(i, 'role', e.target.value)}
                  style={{ flex: '0 0 180px' }}
                >
                  {EMPLOYEE_ROLES.map(r => r.value === EMPLOYEE_ROLES.find(x => x.division === 'business')?.value ? null : null)}
                  <optgroup label="Practice of Law">
                    {EMPLOYEE_ROLES.filter(r => r.division === 'practice').map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Business of Law">
                    {EMPLOYEE_ROLES.filter(r => r.division === 'business').map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </optgroup>
                </select>

                {!['partner', 'managing-partner', 'solo-partner'].includes(emp.role) && partners.length > 0 && (
                  <select
                    className="ob-form-select"
                    value={emp.supervisingPartnerId || ''}
                    onChange={e => updateEmployee(i, 'supervisingPartnerId', e.target.value || null)}
                    style={{ flex: '0 0 180px' }}
                  >
                    <option value="">Supervising Partner...</option>
                    {partners.map((p, pi) => (
                      <option key={pi} value={p.email}>{p.name || `Partner ${pi + 1}`}</option>
                    ))}
                  </select>
                )}

                <div style={{
                  flex: 1, display: 'flex', alignItems: 'center', gap: '6px',
                  fontSize: '0.6875rem', color: 'var(--db-text-muted)',
                }}>
                  <RoleIcon size={12} />
                  <span>{roleConfig?.agentType} agent · {subAgentCount} sub-agents</span>
                  {roleConfig?.superAgentAccess && (
                    <span style={{
                      padding: '2px 6px', background: 'var(--bg-card-hover)',
                      borderRadius: '4px', border: '1px solid var(--db-border)', fontSize: '0.5625rem', fontWeight: 700,
                      color: 'var(--db-text-secondary)', textTransform: 'uppercase',
                    }}>Super Agent</span>
                  )}
                </div>

                <button
                  onClick={() => removeEmployee(i)}
                  disabled={data.employees.length <= 1}
                  style={{
                    background: 'none', border: 'none', cursor: data.employees.length <= 1 ? 'default' : 'pointer',
                    color: data.employees.length <= 1 ? 'var(--db-border)' : 'var(--db-text-muted)',
                    padding: '4px', transition: 'color 0.15s',
                  }}
                  title="Remove team member"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              
              {/* Row 3: Agent Naming (Personalization feature) */}
              <div className="ob-form-row" style={{ marginTop: '10px' }}>
                <div className="ob-form-group" style={{ marginBottom: 0, flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bot size={14} style={{ color: 'var(--db-text-muted)', flexShrink: 0 }} />
                  
                  <select
                    className="ob-form-select"
                    style={{ 
                      flex: (!emp.agentName || AGENT_NAME_SUGGESTIONS.find(a => a.name === emp.agentName)) ? '1' : '0 0 180px', 
                      marginBottom: 0 
                    }}
                    value={
                      !emp.agentName ? '' :
                      AGENT_NAME_SUGGESTIONS.find(a => a.name === emp.agentName) ? emp.agentName :
                      'Custom'
                    }
                    onChange={e => {
                      if (e.target.value === 'Custom') {
                        updateEmployee(i, 'agentName', 'Custom Name');
                      } else {
                        updateEmployee(i, 'agentName', e.target.value);
                      }
                    }}
                  >
                    <option value="">Chief of Staff (Default)</option>
                    <optgroup label="Law-Centric Names">
                      {AGENT_NAME_SUGGESTIONS.map(s => (
                        <option key={s.name} value={s.name}>{s.name} — {s.desc}</option>
                      ))}
                    </optgroup>
                    <option value="Custom">Other (Type custom name)...</option>
                  </select>

                  {(emp.agentName && !AGENT_NAME_SUGGESTIONS.find(a => a.name === emp.agentName)) && (
                    <input
                      className="ob-form-input"
                      style={{ flex: 1, marginBottom: 0 }}
                      type="text"
                      placeholder="e.g. JARVIS"
                      value={emp.agentName === 'Custom Name' ? '' : emp.agentName}
                      onChange={e => updateEmployee(i, 'agentName', e.target.value)}
                      autoFocus
                    />
                  )}
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Add button */}
      <button
        className="db-btn db-btn-secondary"
        onClick={addEmployee}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
      >
        <Plus size={14} /> Add Team Member
      </button>

      <p className="ob-form-hint" style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Lightbulb size={14} /> You can add or remove team members later from Firm Settings <ChevronRight size={12} /> Team Management
      </p>
    </>
  );
}

/* Step 3: Knowledge Base */
function StepKnowledgeBase({ data, updateData }) {
  const fileInputRef = useRef(null);

  const RECOMMENDED_DOCS = [
    { label: 'Retainer & Fee Agreements', icon: FileText },
    { label: 'Standard Operating Procedures', icon: ClipboardList },
    { label: 'Common Motion Templates', icon: Gavel },
    { label: 'Firm Branding & Voice Guide', icon: PenTool },
    { label: 'Employee/Associate Handbook', icon: Users },
    { label: 'Discovery & Client Questionnaires', icon: Search },
  ];

  const triggerUpload = () => fileInputRef.current?.click();

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files);
    if (selected.length === 0) return;

    // Map files to the internal representation with Smart AI Categorization
    const newFiles = selected.map(f => {
      let role = 'managing-partner';
      let category = 'General Knowledge';
      const nameLower = f.name.toLowerCase();
      
      if (nameLower.includes('employee') || nameLower.includes('handbook') || nameLower.includes('policy')) { role = 'office-manager'; category = 'HR & Compliance'; }
      else if (nameLower.includes('motion') || nameLower.includes('pleading') || nameLower.includes('complaint')) { role = 'associate (litigation)'; category = 'Litigation Drafts'; }
      else if (nameLower.includes('retainer') || nameLower.includes('fee') || nameLower.includes('invoice')) { role = 'billing automation'; category = 'Financial'; }
      else if (nameLower.includes('discovery') || nameLower.includes('deposition') || nameLower.includes('questionnaire')) { role = 'ediscovery agent'; category = 'Litigation prep'; }
      else if (nameLower.includes('branding') || nameLower.includes('logo') || nameLower.includes('voice')) { role = 'marketing agent'; category = 'Marketing assets'; }

      return {
        name: f.name,
        size: (f.size / (1024 * 1024)).toFixed(1) + ' MB',
        status: 'done',
        role,
        category,
        isSmartCategorized: true
      };
    });

    updateData('files', [...data.files, ...newFiles]);
  };

  return (
    <>
      <h2 className="onboarding-step-title">Optimize your Knowledge Base</h2>
      <p className="onboarding-step-desc">
        Your website is being crawled to act as your foundational knowledge base. Upload templates and standards to train your agents on your firm's specific formatting. If an agent lacks a required document to perform a prompt, they will explicitly alert you to upload it.
      </p>

      {data.practiceAreas?.length > 0 && (
        <div style={{ marginBottom: '24px', padding: '16px', background: 'rgba(37,99,235,0.05)', borderRadius: '8px', border: '1px solid rgba(37,99,235,0.2)' }}>
          <div style={{ fontWeight: 700, color: '#2563eb', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><Bot size={16}/> Autonomous Skills Optimized</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--db-text-secondary)', marginBottom: '12px' }}>Because your firm practices {data.practiceAreas.join(', ')}, we are pre-loading the following compliance rules and baseline knowledge:</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
             {data.practiceAreas.map(pa => (
               <span key={pa} style={{ padding: '6px 10px', background: 'rgba(37,99,235,0.1)', color: '#1d4ed8', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid rgba(37,99,235,0.2)' }}>{pa} Case Law Cache</span>
             ))}
          </div>
        </div>
      )}

      {/* Hidden input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        multiple
      />

      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--db-text-muted)', marginBottom: '12px', paddingBottom: '4px', borderBottom: '1px solid var(--db-border)' }}>
          Recommended Knowledge Portfolio
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
          {RECOMMENDED_DOCS.map(doc => (
            <div
              key={doc.label}
              onClick={triggerUpload}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 14px', background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--db-border)', borderRadius: '8px',
                cursor: 'pointer', transition: 'all 0.15s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--db-text-muted)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--db-border)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
            >
              <doc.icon size={14} style={{ color: 'var(--db-text-muted)' }} />
              <span style={{ fontSize: '0.8125rem', color: 'var(--db-text-primary)', fontWeight: 500, flex: 1 }}>{doc.label}</span>
              <div style={{ width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyCenter: 'center', borderRadius: '4px', background: 'rgba(118,185,0,0.1)', color: 'var(--db-nvidia-green)' }}>
                <Check size={10} style={data.files.some(f => f.name.toLowerCase().includes(doc.label.split(' ')[0].toLowerCase())) ? {} : { display: 'none' }} />
                {!data.files.some(f => f.name.toLowerCase().includes(doc.label.split(' ')[0].toLowerCase())) && <Plus size={10} style={{ margin: '0 auto' }} />}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="ob-upload-area" onClick={triggerUpload}>
        <div className="ob-upload-icon"><Upload size={32} color="var(--db-text-muted)" /></div>
        <div className="ob-upload-title">Drag & drop files here, or click to browse</div>
        <div className="ob-upload-hint">Supported: PDF, DOCX, TXT, MD · Max 500 MB per firm</div>
      </div>

      {data.files.length > 0 && (
        <div className="ob-upload-files">
          {data.files.map((f, i) => (
            <div key={i} className="ob-upload-file" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="ob-upload-file-icon"><File size={16} /></span>
              <div style={{ flex: 1 }}>
                <div className="ob-upload-file-name">{f.name}</div>
                {f.category && (
                  <div style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#2563eb', fontWeight: 600 }}>{f.category}</span> • Assigned to {f.role}
                  </div>
                )}
              </div>
              <span className="ob-upload-file-size">{f.size}</span>
              <span className={`ob-upload-file-status done`}>
                <Check size={12} /> Indexed
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="ob-form-hint" style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Lightbulb size={14} /> You can always add more files later from Firm Settings <ChevronRight size={12} /> Knowledge Base
      </p>
    </>
  );
}

/* Step 3: Agent Selection */
function StepAgentSelection({ data, toggleAgent }) {
  return (
    <>
      <h2 className="onboarding-step-title">Choose your agents</h2>
      <p className="onboarding-step-desc">
        Select the agents you want active on Day 1. You can enable or disable agents at any time from the Agent Library.
      </p>

      <div style={{ marginBottom: '16px', fontSize: '0.8125rem', color: 'var(--db-text-secondary)' }}>
        <strong>{data.selectedAgents.length}</strong> agents selected
        {data.selectedAgents.length > 0 && (
          <span style={{ marginLeft: '12px', color: data.firmSize === '10+' ? '#f59e0b' : 'var(--db-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            {data.firmSize === '10+' ? (
              <><AlertCircle size={14} /> Token usage billed at cost for 10+ firms</>
            ) : (
              <><InfinityIcon size={14} /> Unlimited tokens included</>
            )}
          </span>
        )}
      </div>

      <div className="ob-agent-grid">
        {AGENTS.map(agent => (
          <div
            key={agent.id}
            className={`ob-agent-card ${data.selectedAgents.includes(agent.id) ? 'selected' : ''} ${agent.recommended ? 'recommended' : ''}`}
            onClick={() => !agent.free && toggleAgent(agent.id)}
            style={agent.free ? { cursor: 'default' } : {}}
          >
            <div className="ob-agent-card-top">
              <span className="ob-agent-card-icon"><agent.Icon size={20} /></span>
              {agent.free ? (
                <span className="ob-agent-card-badge" style={{ background: 'rgba(22, 163, 74, 0.1)', color: '#16a34a' }}>Included Free</span>
              ) : agent.recommended ? (
                <span className="ob-agent-card-badge">Recommended</span>
              ) : null}
            </div>
            <div className="ob-agent-card-name">{agent.name}</div>
            <div className="ob-agent-card-desc">{agent.desc}</div>
            <div className="ob-agent-card-check">
              {data.selectedAgents.includes(agent.id) && <Check size={12} />}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* Step 4: Security */
function StepSecurity({ data, toggleSecurity, toggleService }) {
  return (
    <>
      <h2 className="onboarding-step-title">Security configuration</h2>
      <p className="onboarding-step-desc">
        Your agents run in an isolated NVIDIA NemoClaw sandbox with enterprise-grade security. Configure your firm's policy below.
      </p>

      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--db-text-muted)', marginBottom: '12px' }}>
          Platform & Data Controls
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '12px' }}>
          {SECURITY_OPTIONS.map(opt => (
            <div key={opt.id} className="ob-toggle-item" onClick={() => toggleSecurity(opt.id)} style={{ padding: '12px 14px' }}>
              <div className="ob-toggle-left">
                <span className="ob-toggle-icon"><opt.Icon size={16} /></span>
                <div className="ob-toggle-info">
                  <span className="ob-toggle-name" style={{ fontSize: '0.75rem' }}>{opt.name}</span>
                  <span className="ob-toggle-desc" style={{ fontSize: '0.6875rem' }}>{opt.desc}</span>
                </div>
              </div>
              <div className={`ob-toggle-switch ${data.security[opt.id] ? 'on' : ''}`} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--db-text-muted)', marginBottom: '12px' }}>
          Approved External Services
        </div>
        <div className="ob-toggle-list">
          {EXTERNAL_SERVICES.map(svc => (
            <div key={svc.id} className="ob-toggle-item" onClick={() => toggleService(svc.id)} style={svc.required ? { opacity: 0.7, cursor: 'default' } : {}}>
              <div className="ob-toggle-left">
                <div className="ob-toggle-info">
                  <span className="ob-toggle-name">
                    {svc.name} {svc.required && <span style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)' }}>(required)</span>}
                  </span>
                  <span className="ob-toggle-desc">{svc.desc}</span>
                </div>
              </div>
              <div className={`ob-toggle-switch ${data.services[svc.id] ? 'on' : ''}`} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* Step 5: Review & Launch (Two-Column) */
function StepReview({ data, launching, clientSecret, firmId, onPaymentSuccess, setError, onSkip, onProvision }) {
  const activeSecurityFeatures = SECURITY_OPTIONS.filter(s => data.security[s.id]);

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 400px', gap: '48px', alignItems: 'start' }}>
        {/* Left Column: Review */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div>
            <h2 className="onboarding-step-title" style={{ marginBottom: '8px' }}>Review your configuration</h2>
            <p className="onboarding-step-desc" style={{ marginBottom: '0' }}>
              Everything looks good. You are about to launch your secure, solo AI workspace.
            </p>
          </div>

          <div className="ob-review-section" style={{ marginBottom: '0' }}>
            <div className="ob-review-section-title">Firm Profile</div>
            <div className="ob-review-row">
              <span className="ob-review-label">Firm Name</span>
              <span className="ob-review-value">{data.firmName || 'Not provided'}</span>
            </div>
            <div className="ob-review-row">
              <span className="ob-review-label">Role</span>
              <span className="ob-review-value" style={{ color: '#2563eb' }}>Sole Managing Partner</span>
            </div>
            <div className="ob-review-row">
              <span className="ob-review-label">State Bar</span>
              <span className="ob-review-value">{data.stateBar}</span>
            </div>
          </div>

          <div className="ob-review-section" style={{ marginBottom: '0' }}>
            <div className="ob-review-section-title">AI Workforce</div>
            <div className="ob-review-row">
              <span className="ob-review-label">Personal Agent</span>
              <span className="ob-review-value">Managing Partner Bundle (Active)</span>
            </div>
            <div className="ob-review-row">
              <span className="ob-review-label">Knowledge Base</span>
              <span className="ob-review-value">{data.files.length} indexed assets</span>
            </div>
          </div>

          <div className="ob-review-section" style={{ marginBottom: '0' }}>
            <div className="ob-review-section-title">Security & Infrastructure</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
              {activeSecurityFeatures.slice(0, 6).map(s => (
                <span key={s.id} className="ob-review-security-tag" style={{ border: 'none', background: 'rgba(0,0,0,0.03)' }}>
                  <s.Icon size={10} style={{ marginRight: '4px' }} />{s.name}
                </span>
              ))}
              {activeSecurityFeatures.length > 6 && (
                <span className="ob-review-security-tag" style={{ border: 'none', background: 'rgba(0,0,0,0.03)' }}>+{activeSecurityFeatures.length - 6} more</span>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Payment & Launch */}
        <div className="ob-billing-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--db-text-primary)' }}>Secure Checkout</div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--db-nvidia-green)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Lock size={12} /> Encrypted
            </div>
          </div>

          {/* Pricing Summary */}
          <div style={{ padding: '16px', background: 'rgba(0,0,0,0.02)', borderRadius: '8px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--db-text-secondary)' }}>Founder Price-Lock</span>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--db-text-primary)' }}>$297/mo</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--db-text-secondary)' }}>Unlimited Legal Tokens</span>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--db-nvidia-green)' }}>INCLUDED</span>
            </div>
            <div style={{ borderTop: '1px solid var(--db-border)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--db-text-primary)' }}>Total Due Today</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--db-text-primary)' }}>$297.00</span>
            </div>
          </div>

          {/* Card Input — Always visible */}
          <div style={{ marginTop: '16px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--db-text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payment Method</div>
            <Elements stripe={stripePromise}>
              <InlinePaymentForm
                clientSecret={clientSecret}
                firmId={firmId}
                onSuccess={onPaymentSuccess}
                onError={(msg) => setError(msg)}
                launching={launching}
                setLaunching={() => {}}
                onProvision={onProvision}
              />
            </Elements>

            <button
              className="db-btn"
              style={{ width: '100%', padding: '14px', fontSize: '0.875rem', marginTop: '12px', background: 'transparent', border: '1px solid var(--db-border)', color: 'var(--db-text-secondary)', transition: 'all 0.2s', height: '52px' }}
              onClick={onSkip}
              disabled={launching}
            >
              Access Dashboard in Trial Mode
            </button>
          </div>

          <p style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)', marginTop: '16px', textAlign: 'center', lineHeight: '1.4' }}>
            By checking out, you agree to the $297/mo price-lock. Cancel anytime.
          </p>
        </div>
      </div>
    </>
  );
}

/**
 * AI CONCIERGE — NEMO THE BORN AGENTIC SDR
 * Clownfish avatar with typewriter animation, law jokes, and humorous self-awareness.
 */
const LAW_JOKES = [
  "Why did the lawyer bring a ladder to court? Because the case was on a higher level.",
  "What's the difference between a good lawyer and a great lawyer? A good lawyer knows the law. A great lawyer knows the judge.",
  "How many lawyers does it take to change a light bulb? Three - one to climb the ladder, one to shake it, and one to sue the ladder company.",
  "What do you call a smiling, courteous person at a bar association convention? The caterer.",
  "Why don't sharks attack lawyers? Professional courtesy.",
  "A paralegal walks into a bar. The Bar Association says that's unauthorized practice.",
  "What's the difference between a jellyfish and a lawyer? One is a spineless, toxic creature. The other one lives in the ocean.",
  "I used to be a lawyer, but I couldn't pass the bar. So I became a fish. Better hours, same amount of objections.",
];

const DEFAULT_LAW_JOKE = LAW_JOKES[Math.floor(Math.random() * LAW_JOKES.length)];

function AIConcierge({ step, data }) {
  const [displayText, setDisplayText] = useState('');
  const [avatarSrc, setAvatarSrc] = useState('/logos/claw-128-transparent.png');
  const [showJoke, setShowJoke] = useState(false);
  const fileInputRef = useRef(null);
  const charIndex = useRef(0);
  const timerRef = useRef(null);

  const firstName = data.firstName || 'Counselor';

  const messages = useMemo(() => [
    `Hey ${firstName}! I'm Nemo — yes, the clownfish. I know, I know… a clownfish running an Agentic OS for law firms. Trust me, I've heard every "Finding Nemo" joke in the book. Speaking of jokes — being a clownfish, I've got hundreds. But let's get your firm set up first, and I'll tell you my best law joke when we're done. Deal? Start with your name below, then search for your firm.`,
    `${data.practiceAreas?.length > 0 ? `${data.practiceAreas.slice(0, 2).join(' and ')} — excellent choices.` : 'Pick your practice areas so I can calibrate your knowledge base.'} Now upload a retainer template or motion brief — I'll learn your firm's drafting style faster than any summer associate. And unlike that associate, I don't need coffee breaks or a parking spot.`,
    `Security time — and yes, I see the irony. My species literally hides inside anemones for protection. But I've enabled AES-256 encryption, PII auto-redaction, and full ABA-compliant audit trails. Your client data is safer with me than a clownfish in the Great Barrier Reef. (That's actually very safe — we have a symbiotic relationship with anemones. Google it.)`,
    `${firstName}, we're at the finish line! Your firm qualifies for the $297/mo Founder Price-Lock. Once you launch, I'll provision your Managing Partner agent and start indexing. As promised — here's your law joke. You've earned it. 🐠`
  ], [data.practiceAreas, firstName]);

  const currentJoke = DEFAULT_LAW_JOKE;

  // Typewriter effect
  useEffect(() => {
    const fullText = messages[step] || messages[0];
    if (timerRef.current) clearInterval(timerRef.current);

    const startTyping = setTimeout(() => {
      charIndex.current = 0;
      setDisplayText('');
      setShowJoke(false);

      timerRef.current = setInterval(() => {
        charIndex.current++;
        if (charIndex.current >= fullText.length) {
          setDisplayText(fullText);
          clearInterval(timerRef.current);
          // Show joke on final step after typing completes
          if (step === 3) setTimeout(() => setShowJoke(true), 400);
        } else {
          setDisplayText(fullText.slice(0, charIndex.current));
        }
      }, 18);
    }, 0);

    return () => {
      clearTimeout(startTyping);
      clearInterval(timerRef.current);
    };
  }, [messages, step]);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarSrc(ev.target.result);
    reader.readAsDataURL(file);
  };

  return (
    <div className="ob-concierge">
      <div className="ob-concierge-inner">
        <div className="ob-concierge-avatar" onClick={() => fileInputRef.current?.click()} title="Click to change Nemo's look">
          <img src={avatarSrc} alt="Nemo" className="ob-concierge-avatar-img" />
          <div className="ob-concierge-pulse" />
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
        </div>
        <div className="ob-concierge-content">
          <div className="ob-concierge-label">Nemo — Onboarding Concierge</div>
          <div className="ob-concierge-text">
            {displayText}
            {displayText.length < (messages[step] || messages[0]).length && (
              <span className="ob-concierge-cursor">|</span>
            )}
          </div>
          {showJoke && step === 3 && (
            <div style={{
              marginTop: '10px', padding: '10px 14px',
              background: 'var(--bg-card-hover)', borderRadius: '10px',
              fontSize: '0.8125rem', color: 'var(--db-text-primary)',
              fontStyle: 'italic', lineHeight: 1.5,
              borderLeft: '3px solid var(--db-border)',
              animation: 'fadeIn 0.5s ease'
            }}>
              🐠 "{currentJoke}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
/*
 * Inline Payment Form Sub-component (CardElement Classic)
 */
function InlinePaymentForm({ clientSecret, firmId, onSuccess, onError, launching, _setLaunching, onProvision }) {
  const stripe = useStripe();
  const elements = useElements();
  const [btnText, setBtnText] = useState('Start Subscription');
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    // If no clientSecret yet, trigger provisioning first
    if (!clientSecret && onProvision) {
      onProvision();
      return;
    }

    if (!clientSecret) return;

    setProcessing(true);
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
        setProcessing(false);
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
      setProcessing(false);
      setBtnText('Retry Payment');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
        <CardElement options={{
          hidePostalCode: true,
          style: {
            base: {
              fontSize: '14px',
              color: '#1e293b',
              fontFamily: 'Inter, system-ui, sans-serif',
              '::placeholder': { color: '#94a3b8' },
              iconColor: '#76b900'
            },
            invalid: { color: '#ef4444', iconColor: '#ef4444' }
          }
        }} />
      </div>
      
      <button
        type="submit"
        className="db-btn db-btn-primary"
        style={{ width: '100%', padding: '14px', fontSize: '1rem', height: '52px' }}
        disabled={!stripe || processing || launching}
      >
        {(processing || launching) ? (
          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
        ) : (
          <><Zap size={18} /> {clientSecret ? btnText : 'Provision & Pay'}</>
        )}
      </button>
    </form>
  );
}
