import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, FileText, UserCheck, PenTool, FolderSearch, Scale, Mic,
  DollarSign, ScanSearch, Clock, ShieldCheck, Lock, ClipboardList,
  Gavel, MapPin, FileCheck, Upload, File, Lightbulb, Infinity as InfinityIcon, Check,
  Plus, Phone, Bot, ArrowRight, ChevronRight, AlertCircle, Globe, Users, Zap, Loader2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { completeOnboarding } from '../lib/firestore';
import { scrapeFirmWebsite } from '../lib/prospectService';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

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

const PRACTICE_AREA_ALIASES = [
  { area: 'Personal Injury', terms: ['personal injury', 'car accident', 'auto accident', 'truck accident', 'slip and fall', 'injury claim'] },
  { area: 'Wrongful Death', terms: ['wrongful death'] },
  { area: 'Medical Malpractice', terms: ['medical malpractice', 'medical negligence'] },
  { area: 'Nursing Home Abuse', terms: ['nursing home abuse', 'elder abuse'] },
  { area: 'Workers\' Compensation', terms: ['workers compensation', 'workers comp', 'work injury', 'workplace injury'] },
  { area: 'Criminal Defense', terms: ['criminal defense', 'criminal law', 'defense lawyer', 'felony', 'misdemeanor'] },
  { area: 'DUI / DWI', terms: ['dui', 'dwi', 'drunk driving', 'impaired driving'] },
  { area: 'Family Law', terms: ['family law', 'custody', 'child support', 'spousal support'] },
  { area: 'Divorce & Separation', terms: ['divorce', 'separation', 'dissolution'] },
  { area: 'Child Custody & Support', terms: ['child custody', 'child support'] },
  { area: 'Immigration', terms: ['immigration', 'visa', 'green card', 'deportation', 'asylum'] },
  { area: 'Estate Planning & Probate', terms: ['estate planning', 'probate', 'estate administration'] },
  { area: 'Trusts & Wills', terms: ['trusts', 'wills', 'will contest', 'living trust'] },
  { area: 'Bankruptcy (Personal)', terms: ['personal bankruptcy', 'chapter 7', 'chapter 13', 'debt relief'] },
  { area: 'Bankruptcy (Business)', terms: ['business bankruptcy', 'chapter 11', 'reorganization'] },
  { area: 'Employment (Employee Side)', terms: ['employee rights', 'wrongful termination', 'workplace discrimination', 'unpaid wages'] },
  { area: 'Employment (Employer Side)', terms: ['employment defense', 'employer counsel', 'labor and employment'] },
  { area: 'Business Formation & LLC', terms: ['business formation', 'llc formation', 'startup counsel'] },
  { area: 'Contracts & Agreements', terms: ['contract law', 'contracts', 'agreements'] },
  { area: 'Commercial Litigation', terms: ['commercial litigation', 'business litigation'] },
  { area: 'Corporate / M&A', terms: ['corporate law', 'mergers and acquisitions', 'm&a'] },
  { area: 'Real Estate (Residential)', terms: ['residential real estate', 'home closing'] },
  { area: 'Real Estate (Commercial)', terms: ['commercial real estate'] },
  { area: 'Landlord-Tenant (Tenant Side)', terms: ['tenant rights', 'eviction defense'] },
  { area: 'Landlord-Tenant (Landlord Side)', terms: ['landlord tenant', 'landlord representation', 'evictions'] },
  { area: 'Intellectual Property / Patent', terms: ['intellectual property', 'patent', 'trademark', 'copyright'] },
  { area: 'Tax (Individual)', terms: ['individual tax', 'irs tax', 'tax controversy'] },
  { area: 'Tax (Business)', terms: ['business tax', 'corporate tax'] },
  { area: 'Civil Rights', terms: ['civil rights', 'police misconduct', 'constitutional rights'] },
  { area: 'Consumer Protection', terms: ['consumer protection', 'lemon law', 'fair debt'] },
  { area: 'Insurance Claims', terms: ['insurance claim', 'bad faith insurance'] },
  { area: 'Construction Law', terms: ['construction law', 'mechanic lien'] },
  { area: 'Healthcare & HIPAA', terms: ['healthcare law', 'hipaa'] },
  { area: 'Cybersecurity & Data Privacy', terms: ['data privacy', 'cybersecurity', 'privacy law'] },
  { area: 'White Collar Crime', terms: ['white collar', 'fraud defense', 'government investigation'] },
];

function normalizePracticeText(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(law|lawyer|lawyers|attorney|attorneys|practice|practices|services|service)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function canonicalPracticeArea(value) {
  const normalized = normalizePracticeText(value);
  if (!normalized) return null;

  const exact = PRACTICE_AREAS.find(area => normalizePracticeText(area) === normalized);
  if (exact) return exact;

  const contains = PRACTICE_AREAS.find(area => {
    const areaText = normalizePracticeText(area);
    return normalized.includes(areaText) || areaText.includes(normalized);
  });
  if (contains) return contains;

  const alias = PRACTICE_AREA_ALIASES.find(item =>
    item.terms.some(term => normalized.includes(normalizePracticeText(term)))
  );
  return alias?.area || null;
}

function normalizePracticeAreaMatches(values = []) {
  return [...new Set(values.flatMap(value => {
    if (!value) return [];
    const direct = canonicalPracticeArea(value);
    const aliases = PRACTICE_AREA_ALIASES
      .filter(item => item.terms.some(term => normalizePracticeText(value).includes(normalizePracticeText(term))))
      .map(item => item.area);
    return direct ? [direct, ...aliases] : aliases;
  }))];
}

function websiteDomain(website = '') {
  try {
    return new URL(website).hostname.replace(/^www\./, '');
  } catch (_err) {
    return String(website).replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] || 'website';
  }
}

function buildWebsiteKnowledgeContent({ place, website, liveData, practiceAreas }) {
  const attorneys = (liveData?.attorneys || []).map(a => [a.name, a.title].filter(Boolean).join(' - ')).filter(Boolean);
  return [
    `Firm Name: ${place.name || liveData?.firmName || ''}`,
    `Google Place ID: ${place.place_id || ''}`,
    `Website: ${website || ''}`,
    `Address: ${place.formatted_address || liveData?.address || ''}`,
    `Phone: ${place.formatted_phone_number || liveData?.phone || ''}`,
    `Email: ${liveData?.email || ''}`,
    `Detected Practice Areas: ${practiceAreas.join(', ') || 'None detected'}`,
    `Website Title: ${liveData?.title || ''}`,
    `Website Summary: ${liveData?.description || ''}`,
    `Attorneys Detected: ${attorneys.join('; ') || 'None detected'}`,
    `Pages Scraped: ${liveData?.pagesScraped || 0}`,
    `Source: Google Places selection + NemoC LAW AI website crawl`,
    `Captured At: ${new Date().toISOString()}`,
  ].join('\n');
}

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

// ═══════════════════════════════════════════════════════════════
//  FEDERAL CIRCUIT JURISDICTION
// ═══════════════════════════════════════════════════════════════

const FEDERAL_CIRCUITS = [
  { value: '1st', label: 'First Circuit', states: ['Maine', 'Massachusetts', 'New Hampshire', 'Rhode Island'] },
  { value: '2nd', label: 'Second Circuit', states: ['Connecticut', 'New York', 'Vermont'] },
  { value: '3rd', label: 'Third Circuit', states: ['Delaware', 'New Jersey', 'Pennsylvania'] },
  { value: '4th', label: 'Fourth Circuit', states: ['Maryland', 'North Carolina', 'South Carolina', 'Virginia', 'West Virginia'] },
  { value: '5th', label: 'Fifth Circuit', states: ['Louisiana', 'Mississippi', 'Texas'] },
  { value: '6th', label: 'Sixth Circuit', states: ['Kentucky', 'Michigan', 'Ohio', 'Tennessee'] },
  { value: '7th', label: 'Seventh Circuit', states: ['Illinois', 'Indiana', 'Wisconsin'] },
  { value: '8th', label: 'Eighth Circuit', states: ['Arkansas', 'Iowa', 'Minnesota', 'Missouri', 'Nebraska', 'North Dakota', 'South Dakota'] },
  { value: '9th', label: 'Ninth Circuit', states: ['Alaska', 'Arizona', 'California', 'Hawaii', 'Idaho', 'Montana', 'Nevada', 'Oregon', 'Washington'] },
  { value: '10th', label: 'Tenth Circuit', states: ['Colorado', 'Kansas', 'New Mexico', 'Oklahoma', 'Utah', 'Wyoming'] },
  { value: '11th', label: 'Eleventh Circuit', states: ['Alabama', 'Florida', 'Georgia'] },
  { value: 'DC', label: 'D.C. Circuit', states: ['District of Columbia'] },
  { value: 'Federal', label: 'Federal Circuit', states: [] },
];

const STATE_TO_CIRCUIT = {};
FEDERAL_CIRCUITS.forEach(c => {
  c.states.forEach(s => { STATE_TO_CIRCUIT[s] = c.value; });
});

function getDefaultCircuits(stateBar) {
  const circuit = STATE_TO_CIRCUIT[stateBar];
  return circuit ? [circuit] : ['Federal'];
}

const STEP_LABELS = ['Firm Profile'];

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
    federalCircuits: [],
    practiceAreas: [],
    firmSize: 'solo',
    firstName: nameParts[0] || '',
    lastName: nameParts.slice(1).join(' ') || '',
    email: user?.email || '',
    employees: [
      { name: user?.displayName || '', email: user?.email || '', role: 'solo-partner', practiceAreas: [], supervisingPartnerId: null, agentName: '' },
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
             (data.stateBar?.trim().length || 0) > 0 &&
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
            // Solo practitioner — no extra seats
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
  const [detectedPracticeCount, setDetectedPracticeCount] = useState(0);
  const [scrapeError, setScrapeError] = useState('');

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

    ac.addListener('place_changed', async () => {
      const place = ac.getPlace();
      if (!place?.name) return;

      const stateComponent = place.address_components?.find(c =>
        c.types.includes('administrative_area_level_1')
      );
      const stateBar = stateComponent?.long_name && STATE_MAP[stateComponent.long_name]
        ? STATE_MAP[stateComponent.long_name]
        : '';

      const defaultCircuits = getDefaultCircuits(stateBar);

      const placeFields = {
        firmName: place.name,
        ...(place.formatted_address && { firmAddress: place.formatted_address }),
        ...(place.place_id && { placeId: place.place_id }),
        ...(place.formatted_phone_number && { firmPhone: place.formatted_phone_number }),
        ...(place.website && { firmWebsite: place.website }),
        ...(stateBar && { stateBar }),
        federalCircuits: defaultCircuits,
      };

      setData(prev => ({ ...prev, ...placeFields }));
      setDetectedPracticeCount(0);
      setScrapeError('');
      setScrapeComplete(false);

      if (!place.website) return;

      const website = place.website;
      const domain = websiteDomain(website);
      setIsScraping(true);

      try {
        const liveData = await scrapeFirmWebsite(website);
        const detectedPracticeAreas = normalizePracticeAreaMatches([
          ...(liveData?.practiceAreas || []),
          liveData?.title,
          liveData?.description,
        ]);
        const content = buildWebsiteKnowledgeContent({
          place,
          website,
          liveData,
          practiceAreas: detectedPracticeAreas,
        });
        const websiteSeed = {
          firmName: liveData?.firmName || place.name,
          website,
          address: liveData?.address || place.formatted_address || '',
          phone: liveData?.phone || place.formatted_phone_number || '',
          email: liveData?.email || '',
          description: liveData?.description || '',
          title: liveData?.title || '',
          stateBar: liveData?.state || stateBar || '',
          practiceAreas: detectedPracticeAreas,
          attorneys: liveData?.attorneys || [],
          scrapedColors: liveData?.colors || null,
          diagnostics: liveData?.diagnostics || null,
          pagesScraped: liveData?.pagesScraped || 0,
          chatAgent: {
            enabled: true,
            name: `${liveData?.firmName || place.name} Reception`,
            role: 'AI receptionist',
            greeting: `Hello, this is ${liveData?.firmName || place.name}. I can help with intake, scheduling, practice-area questions, or connect you with the firm.`,
            capabilities: ['text', 'voice', 'scheduling', 'documents'],
            voiceEnabled: true,
            chatEnabled: true,
          },
          source: 'google_places_autocomplete',
          capturedAt: new Date().toISOString(),
        };
        const kbFile = {
          name: `${domain}_website_intelligence.txt`,
          size: `${(content.length / 1024).toFixed(1)} KB`,
          type: 'text/plain',
          status: 'indexed',
          role: 'company-wide',
          category: 'Digital Footprint',
          content,
          source: 'google_places_website_crawl',
          websiteUrl: website,
          practiceAreas: detectedPracticeAreas,
        };

        try {
          localStorage.removeItem('nemoc_built_site');
          localStorage.setItem('nemoc_website_seed', JSON.stringify(websiteSeed));
        } catch (_err) {
          // Browser storage is a convenience for the builder; onboarding still persists to Firestore.
        }

        const scrapedStateBar = websiteSeed.stateBar;
        setData(prev => ({
          ...prev,
          ...placeFields,
          firmName: websiteSeed.firmName,
          ...(websiteSeed.phone && { firmPhone: websiteSeed.phone }),
          ...(websiteSeed.address && { firmAddress: websiteSeed.address }),
          ...(scrapedStateBar && { stateBar: scrapedStateBar, federalCircuits: getDefaultCircuits(scrapedStateBar) }),
          practiceAreas: [...new Set([...(prev.practiceAreas || []), ...detectedPracticeAreas])],
          files: [
            ...(prev.files || []).filter(file => file.source !== 'google_places_website_crawl'),
            kbFile,
          ],
          websiteRedesign: {
            status: 'ready_to_build',
            source: 'google_places_autocomplete',
            sourceUrl: website,
            domain,
            seed: websiteSeed,
            chatReceptionist: websiteSeed.chatAgent,
            voiceReceptionist: { enabled: true, provider: 'browser-speech-recognition' },
            updatedAt: new Date().toISOString(),
          },
        }));
        setDetectedPracticeCount(detectedPracticeAreas.length);
      } catch (err) {
        console.error('Practice area auto-detect failed:', err);
        setScrapeError('Website crawl was unavailable. Firm details were captured from Google Places.');
        setData(prev => ({
          ...prev,
          ...placeFields,
          files: [
            ...(prev.files || []).filter(file => file.source !== 'google_places_website_crawl'),
            {
              name: `${domain}_google_places_profile.txt`,
              size: '1.0 KB',
              type: 'text/plain',
              status: 'indexed',
              role: 'company-wide',
              category: 'Digital Footprint',
              source: 'google_places_website_crawl',
              websiteUrl: website,
              content: buildWebsiteKnowledgeContent({ place, website, liveData: null, practiceAreas: [] }),
              practiceAreas: [],
            },
          ],
          websiteRedesign: {
            status: 'needs_crawl_retry',
            source: 'google_places_autocomplete',
            sourceUrl: website,
            domain,
            seed: {
              firmName: place.name,
              website,
              address: place.formatted_address || '',
              phone: place.formatted_phone_number || '',
              stateBar,
              practiceAreas: [],
              chatAgent: {
                enabled: true,
                name: `${place.name} Reception`,
                role: 'AI receptionist',
                capabilities: ['text', 'voice', 'scheduling', 'documents'],
                voiceEnabled: true,
                chatEnabled: true,
              },
            },
            chatReceptionist: {
              enabled: true,
              name: `${place.name} Reception`,
              capabilities: ['text', 'voice', 'scheduling', 'documents'],
            },
            voiceReceptionist: { enabled: true, provider: 'browser-speech-recognition' },
            updatedAt: new Date().toISOString(),
          },
        }));
      } finally {
        setIsScraping(false);
        setScrapeComplete(true);
      }
    });

    autocompleteRef.current = ac;
    // Google Places Autocomplete binds an external widget once for this input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  return (
    <>
      <h2 className="onboarding-step-title">Tell us about your firm</h2>
      <p className="onboarding-step-desc">
        Start typing your firm name — we'll auto-fill details from Google. Only verified law firms, attorneys, and legal businesses are returned.
      </p>

      {/* Attorney Name — First/Last */}
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
                  <Loader2 size={10} style={{ animation: 'auth-spin 1s linear infinite' }} /> Crawling website, filling practice areas, and queuing the receptionist site...
                </div>
              )}
              {scrapeComplete && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.6875rem', color: 'var(--db-nvidia-green)', fontWeight: 600, background: 'rgba(118,185,0,0.1)', padding: '2px 8px', borderRadius: '10px', animation: 'fadeIn 0.4s ease' }}>
                  <Check size={10} /> {detectedPracticeCount > 0 ? `${detectedPracticeCount} Practice Areas Detected` : 'Website Redesign Queued'} + Chat/Voice Receptionist
                </div>
              )}
            </div>
          )}
          {scrapeError && (
            <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--db-warning)', display: 'flex', gap: '6px', alignItems: 'center' }}>
              <AlertCircle size={12} /> {scrapeError}
            </div>
          )}
        </div>
      )}

      <div className="ob-form-row">
        <div className="ob-form-group">
          <label className="ob-form-label">State Bar <span className="required">*</span> {data.stateBar && <Check size={10} style={{ display: 'inline', verticalAlign: 'middle' }} />}</label>
          <select
            className="ob-form-input"
            value={data.stateBar}
            onChange={event => {
              const stateBar = event.target.value;
              setData(prev => ({ ...prev, stateBar, federalCircuits: getDefaultCircuits(stateBar) }));
            }}
          >
            <option value="">Select your licensed state</option>
            {Object.keys(STATE_TO_CIRCUIT).sort().map(state => <option key={state} value={state}>{state}</option>)}
          </select>
        </div>
      </div>

      <div className="ob-form-group">
        <label className="ob-form-label">Federal Circuit Jurisdiction</label>
        <div style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)', marginBottom: '8px', lineHeight: '1.4' }}>
          Auto-detected from your state bar. Select additional circuits where your firm practices.
        </div>
        <div className="ob-checkbox-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
          {FEDERAL_CIRCUITS.map(circuit => {
            const isDefault = getDefaultCircuits(data.stateBar).includes(circuit.value);
            const isSelected = data.federalCircuits.includes(circuit.value);
            return (
              <div
                key={circuit.value}
                className={`ob-checkbox-item ${isSelected ? 'checked' : ''}`}
                onClick={() => {
                  const next = isSelected
                    ? data.federalCircuits.filter(v => v !== circuit.value)
                    : [...data.federalCircuits, circuit.value];
                  updateData('federalCircuits', next);
                }}
                style={{ opacity: isDefault && !isSelected ? 0.85 : 1 }}
              >
                <div className="ob-checkbox-box">{isSelected && <Check size={12} />}</div>
                <span className="ob-checkbox-label">
                  {circuit.label}
                  {isDefault && <span style={{ fontSize: '0.625rem', marginLeft: '4px', color: 'var(--db-nvidia-green)', fontWeight: 600 }}>(auto)</span>}
                </span>
              </div>
            );
          })}
        </div>
      </div>

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
          <span style={{ marginLeft: '12px', color: 'var(--db-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <InfinityIcon size={14} /> Unlimited tokens included for solo-to-20 small-firm workspaces
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
              Everything looks good. You are about to launch your secure Agentic OS workspace, solo-first and ready for small-firm growth.
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
              <span className="ob-review-value" style={{ color: '#2563eb' }}>Solo Practitioner</span>
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
              <span className="ob-review-value">Agentic OS Partner Agent (Active)</span>
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
    `${firstName}, we're at the finish line! Your firm qualifies for the $297/mo Founder Price-Lock. Once you launch, I'll provision your AI agent and start indexing. As promised — here's your law joke. You've earned it. 🐠`
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
