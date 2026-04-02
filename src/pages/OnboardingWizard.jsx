import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, FileText, UserCheck, PenTool, FolderSearch, Scale, Mic,
  DollarSign, ScanSearch, Clock, ShieldCheck, Lock, ClipboardList,
  Gavel, MapPin, FileCheck, Rocket, Upload, File, Lightbulb, Infinity, Check,
  Plus, Trash2, Briefcase, Phone, Bot, Crown, CreditCard, ArrowLeft, ArrowRight,
  ChevronLeft, ChevronRight, AlertCircle, Globe, Users
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { completeOnboarding } from '../lib/firestore';
import { createCheckoutSession } from '../lib/firebase';
import { EMPLOYEE_ROLES, AGENT_SUB_AGENTS } from '../lib/agentHierarchy';
import '../styles/onboarding.css';

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
  { name: 'Lexi', desc: 'Latin for Law' },
  { name: 'Prudence', desc: 'Jurisprudence' },
  { name: 'Justice', desc: 'Fairness' },
  { name: 'Amicus', desc: 'Friend of the Court' },
  { name: 'Portia', desc: 'Merchant of Venice' },
  { name: 'Atticus', desc: 'To Kill a Mockingbird' },
  { name: 'Harvey', desc: 'Suits' },
  { name: 'Marshall', desc: 'Supreme Court' },
  { name: 'Solon', desc: 'Ancient Lawmaker' },
  { name: 'Verity', desc: 'Latin for Truth' },
  { name: 'Lincoln', desc: 'The Lincoln Lawyer' },
  { name: 'Sterling', desc: 'High Quality' },
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
  const [data, setData] = useState({
    firmName: '',
    firmAddress: '',
    firmPhone: '',
    firmWebsite: '',
    placeId: '',
    stateBar: 'California',
    practiceAreas: [],
    firmSize: 'solo',
    contactName: user?.displayName || '',
    email: user?.email || '',
    employees: [
      { name: user?.displayName || '', email: user?.email || '', role: 'managing-partner', practiceAreas: [], supervisingPartnerId: null, agentName: '' },
    ],
    files: [],
    security: SECURITY_OPTIONS.reduce((acc, opt) => ({ ...acc, [opt.id]: opt.default }), {}),
    services: EXTERNAL_SERVICES.reduce((acc, svc) => ({ ...acc, [svc.id]: svc.default }), {}),
  });

  const updateData = (key, value) => setData(prev => ({ ...prev, [key]: value }));

  const togglePracticeArea = (area) => {
    setData(prev => ({
      ...prev,
      practiceAreas: prev.practiceAreas.includes(area)
        ? prev.practiceAreas.filter(a => a !== area)
        : [...prev.practiceAreas, area],
    }));
  };

  const toggleAgent = (id) => {
    setData(prev => ({
      ...prev,
      selectedAgents: prev.selectedAgents.includes(id)
        ? prev.selectedAgents.filter(a => a !== id)
        : [...prev.selectedAgents, id],
    }));
  };

  const toggleSecurity = (id) => {
    setData(prev => ({
      ...prev,
      security: { ...prev.security, [id]: !prev.security[id] },
    }));
  };

  const toggleService = (id) => {
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
             (data.contactName?.trim().length || 0) > 1 && 
             (data.email?.includes('@') || false);
    }
    if (step === 1) {
      return data.files.length > 0;
    }
    return true;
  };

  const handleLaunch = async () => {
    setLaunching(true);
    setError('');
    try {
      // 1. Save onboarding data and create firm
      const firmId = await completeOnboarding(user.uid, data);
      
      // 2. Initialize Stripe Checkout for the $297/mo Agentic OS
      // We pass the number of employees for seat calculation (first one included)
      const result = await createCheckoutSession({
        firmId,
        userId: user.uid,
        userEmail: user.email,
        firmName: data.firmName,
        extraSeats: Math.max(0, data.employees.length - 1),
      });

      if (result.data?.url) {
        // Redirect to Stripe
        window.location.href = result.data.url;
      } else {
        // Fallback to dashboard if checkout creation fails but firm is saved
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Onboarding/Checkout error:', err);
      setError('Failed to create your workspace. Please try again.');
      setLaunching(false);
    }
  };

  const totalSteps = STEP_LABELS.length - 1;
  const next = () => step < totalSteps ? setStep(step + 1) : handleLaunch();
  const back = () => step > 0 && setStep(step - 1);

  return (
    <div className="onboarding-layout">
      <div className="onboarding-topbar">
        <a href="/" className="onboarding-topbar-logo">
          <div className="onboarding-topbar-logo-icon">NC</div>
          <span className="onboarding-topbar-logo-text">NemoC Law AI</span>
        </a>
        <div className="onboarding-topbar-right">
          <span className="onboarding-topbar-help">Need help?</span>
        </div>
      </div>

      <div className="onboarding-body">
        <div className="onboarding-container">
          {/* Progress */}
          <div className="onboarding-progress">
            <div className="onboarding-steps-bar">
              {STEP_LABELS.map((label, i) => (
                <div key={i} className={`onboarding-step-indicator ${i < step ? 'completed' : ''} ${i === step ? 'active' : ''}`}>
                  <div className="onboarding-step-dot">
                    {i < step ? <Check size={14} /> : i + 1}
                  </div>
                  {i < STEP_LABELS.length - 1 && <div className="onboarding-step-line" />}
                </div>
              ))}
            </div>
            <div className="onboarding-step-labels">
              {STEP_LABELS.map((label, i) => (
                <span key={i} className={`onboarding-step-label ${i === step ? 'active' : ''} ${i < step ? 'completed' : ''}`}>
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="onboarding-step-card" key={step}>
            {step === 0 && <StepFirmProfile data={data} updateData={updateData} togglePracticeArea={togglePracticeArea} />}
            {step === 1 && <StepKnowledgeBase data={data} updateData={updateData} />}
            {step === 2 && <StepSecurity data={data} toggleSecurity={toggleSecurity} toggleService={toggleService} />}
            {step === 3 && <StepReview data={data} onLaunch={handleLaunch} launching={launching} />}

            {error && (
              <div style={{ margin: '0 0 16px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '0.8125rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={14} /> {error}
              </div>
            )}

            {step === 3 ? (
              <div style={{ marginTop: '32px', borderTop: '1px solid var(--db-border)', paddingTop: '24px' }}>
                <button className="db-btn db-btn-secondary" onClick={back} disabled={launching}>
                  <ArrowLeft size={14} /> Back to Security
                </button>
              </div>
            ) : (
              <div className="onboarding-actions">
                <div>
                  {step > 0 && (
                    <button className="db-btn db-btn-secondary" onClick={back} disabled={launching}>
                      <ArrowLeft size={14} /> Back
                    </button>
                  )}
                </div>
                <div className="onboarding-actions-right">
                  {/* Skip only allowed on Step 2 (Security) if needed; Step 1 Knowledge Base is now REQUIRED */}
                  {step === 2 && (
                    <button className="ob-skip-btn" onClick={next} disabled={launching}>Skip for now</button>
                  )}
                  <button 
                    className="db-btn db-btn-primary" 
                    onClick={next} 
                    disabled={launching || !isStepValid()}
                    style={{ opacity: isStepValid() ? 1 : 0.5, cursor: isStepValid() ? 'pointer' : 'not-allowed' }}
                  >
                    {launching ? (
                      <span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'auth-spin 0.6s linear infinite', display: 'inline-block' }} />
                    ) : (
                      <>Continue <ArrowRight size={14} /></>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Step 1: Firm Profile — with Google Places Autocomplete */
function StepFirmProfile({ data, updateData, togglePracticeArea }) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);

  // State-to-abbreviation map for auto-detecting state bar
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
      types: ['establishment'],
      componentRestrictions: { country: 'us' },
      fields: ['name', 'formatted_address', 'address_components', 'place_id', 'formatted_phone_number', 'website', 'types'],
    });

    ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      if (!place?.name) return;

      // Auto-fill firm name
      updateData('firmName', place.name);
      if (place.formatted_address) updateData('firmAddress', place.formatted_address);
      if (place.place_id) updateData('placeId', place.place_id);
      if (place.formatted_phone_number) updateData('firmPhone', place.formatted_phone_number);
      if (place.website) updateData('firmWebsite', place.website);

      // Auto-detect state bar from address
      const stateComponent = place.address_components?.find(c =>
        c.types.includes('administrative_area_level_1')
      );
      if (stateComponent?.long_name && STATE_MAP[stateComponent.long_name]) {
        updateData('stateBar', STATE_MAP[stateComponent.long_name]);
      }
    });

    autocompleteRef.current = ac;
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
        Start typing your firm name — we'll auto-fill details from Google. We'll use this to configure your AI agents with the right jurisdictional knowledge.
      </p>

      <div className="ob-form-group">
        <label className="ob-form-label">Firm Name <span className="required">*</span></label>
        <input
          ref={inputRef}
          className="ob-form-input"
          type="text"
          placeholder="Start typing your firm name..."
          defaultValue={data.firmName}
          onChange={e => updateData('firmName', e.target.value)}
          autoComplete="off"
        />
        <div style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <MapPin size={10} /> Powered by Google Places — address & state bar auto-detected
        </div>
      </div>

      {data.firmAddress && (
        <div style={{ padding: '10px 14px', background: 'rgba(118,185,0,0.02)', border: '1px solid rgba(118,185,0,0.03)', borderRadius: '8px', marginBottom: '16px', fontSize: '0.8125rem', color: 'var(--db-text-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <Check size={12} color="#76b900" />
            <strong style={{ color: '#76b900' }}>Auto-filled from Google</strong>
          </div>
          <div>{data.firmAddress}</div>
          {data.firmPhone && <div style={{ marginTop: '2px' }}>📞 {data.firmPhone}</div>}
          {data.firmWebsite && <div style={{ marginTop: '2px' }}>🌐 {data.firmWebsite}</div>}
        </div>
      )}

      <div className="ob-form-row">
        <div className="ob-form-group">
          <label className="ob-form-label">State Bar <span className="required">*</span></label>
          <select className="ob-form-select" value={data.stateBar} onChange={e => updateData('stateBar', e.target.value)}>
            {['California', 'New York', 'Texas', 'Florida', 'Illinois', 'Pennsylvania', 'Ohio', 'Georgia', 'North Carolina', 'Michigan', 'New Jersey', 'Virginia', 'Washington', 'Arizona', 'Massachusetts', 'Tennessee', 'Indiana', 'Missouri', 'Maryland', 'Wisconsin', 'Colorado', 'Minnesota', 'South Carolina', 'Alabama', 'Louisiana', 'Kentucky', 'Oregon', 'Oklahoma', 'Connecticut', 'Utah', 'Iowa', 'Nevada', 'Arkansas', 'Mississippi', 'Kansas', 'New Mexico', 'Nebraska', 'Idaho', 'West Virginia', 'Hawaii', 'New Hampshire', 'Maine', 'Montana', 'Rhode Island', 'Delaware', 'South Dakota', 'North Dakota', 'Alaska', 'Vermont', 'Wyoming', 'District of Columbia'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="ob-form-group">
          <label className="ob-form-label">Firm Size</label>
          <select className="ob-form-select" value={data.firmSize} onChange={e => updateData('firmSize', e.target.value)}>
            {FIRM_SIZE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <div style={{ fontSize: '0.6875rem', marginTop: '4px', color: data.firmSize === '10+' ? '#f59e0b' : 'var(--db-text-muted)' }}>
            {FIRM_SIZE_OPTIONS.find(o => o.value === data.firmSize)?.desc}
          </div>
        </div>
      </div>

      {data.firmSize === '10+' && (
        <div style={{
          padding: '12px 16px', marginBottom: '16px',
          background: 'rgba(245, 158, 11, 0.02)', border: '1px solid rgba(245, 158, 11, 0.03)',
          borderRadius: '8px', fontSize: '0.8125rem', color: '#f59e0b',
          display: 'flex', alignItems: 'flex-start', gap: '10px',
        }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>Enterprise Token Pricing</strong>
            <div style={{ color: 'var(--db-text-secondary)', marginTop: '2px', fontSize: '0.75rem' }}>
              Firms with 10+ attorneys use significantly more AI tokens. Your plan includes a generous base allocation, with additional tokens billed at cost ($0.002/1K tokens). Most firms stay well under the base limit.
            </div>
          </div>
        </div>
      )}

      <div className="ob-form-group">
        <label className="ob-form-label">Practice Areas <span className="required">*</span></label>
        {PRACTICE_AREA_GROUPS.map(group => (
          <div key={group.label} style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--db-text-muted)', marginBottom: '8px', paddingBottom: '4px', borderBottom: '1px solid var(--db-border)' }}>
              {group.label}
            </div>
            <div className="ob-checkbox-grid">
              {group.areas.map(area => (
                <div
                  key={area}
                  className={`ob-checkbox-item ${data.practiceAreas.includes(area) ? 'checked' : ''}`}
                  onClick={() => togglePracticeArea(area)}
                >
                  <div className="ob-checkbox-box">
                    {data.practiceAreas.includes(area) && <Check size={12} />}
                  </div>
                  <span className="ob-checkbox-label">{area}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="ob-form-row">
        <div className="ob-form-group">
          <label className="ob-form-label">Primary Contact</label>
          <input
            className="ob-form-input"
            type="text"
            placeholder="Full name"
            value={data.contactName}
            onChange={e => updateData('contactName', e.target.value)}
          />
        </div>
        <div className="ob-form-group">
          <label className="ob-form-label">Email</label>
          <input
            className="ob-form-input"
            type="email"
            placeholder="you@firm.com"
            value={data.email}
            onChange={e => updateData('email', e.target.value)}
          />
        </div>
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
          padding: '8px 14px', background: 'rgba(118,185,0,0.02)',
          border: '1px solid rgba(118,185,0,0.03)', borderRadius: '8px',
          fontSize: '0.8125rem', fontWeight: 600, color: '#4d7a00',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <Bot size={14} /> {totalAgents} Agent{totalAgents !== 1 ? 's' : ''} will be created
        </div>
        {partners.length > 0 && (
          <div style={{
            padding: '8px 14px', background: 'rgba(37,99,235,0.02)',
            border: '1px solid rgba(37,99,235,0.03)', borderRadius: '8px',
            fontSize: '0.8125rem', fontWeight: 600, color: '#2563eb',
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
                      padding: '2px 6px', background: 'rgba(37,99,235,0.02)',
                      borderRadius: '4px', border: '1px solid rgba(37,99,235,0.03)', fontSize: '0.5625rem', fontWeight: 700,
                      color: '#2563eb', textTransform: 'uppercase',
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

    // Map files to the internal representation
    const newFiles = selected.map(f => ({
      name: f.name,
      size: (f.size / (1024 * 1024)).toFixed(1) + ' MB',
      status: 'done'
    }));

    updateData('files', [...data.files, ...newFiles]);
  };

  return (
    <>
      <h2 className="onboarding-step-title">Upload your firm's knowledge base</h2>
      <p className="onboarding-step-desc">
        Upload templates, standards, and internal documents. These train your agents to work the way your firm works — using your language, your formatting, your standards.
      </p>

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
            <div key={i} className="ob-upload-file">
              <span className="ob-upload-file-icon"><File size={16} /></span>
              <span className="ob-upload-file-name">{f.name}</span>
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
              <><Infinity size={14} /> Unlimited tokens included</>
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
function StepReview({ data, onLaunch, launching }) {
  const activeSecurityFeatures = SECURITY_OPTIONS.filter(s => data.security[s.id]);
  const [card, setCard] = useState({
    name: data.contactName || '',
    number: '',
    expiry: '',
    cvc: ''
  });

  // Card detection
  const getCardType = (number) => {
    const raw = number.replace(/\s/g, '');
    if (/^4/.test(raw)) return 'visa';
    if (/^5[1-5]/.test(raw)) return 'mastercard';
    if (/^3[47]/.test(raw)) return 'amex';
    if (/^6(?:011|5)/.test(raw)) return 'discover';
    return 'default';
  };

  const cardType = getCardType(card.number);

  // Simple formatters
  const formatNumber = (val) => val.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim().slice(0, 19);
  const formatExpiry = (val) => val.replace(/\D/g, '').replace(/(.{2})/, '$1/').trim().slice(0, 5);

  const isReady = card.name.length > 2 && card.number.length >= (cardType === 'amex' ? 17 : 19) && card.expiry.length === 5 && card.cvc.length >= 3;

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

          {/* Payment Form */}
          <div className="ob-form-group">
            <label className="ob-form-label">Cardholder Name</label>
            <input
              className="ob-form-input"
              type="text"
              value={card.name}
              onChange={e => setCard({ ...card, name: e.target.value })}
              placeholder="Name on card"
            />
          </div>

          <div className="ob-form-group">
            <label className="ob-form-label">Card Number</label>
            <div style={{ position: 'relative' }}>
              <input
                className="ob-form-input"
                type="text"
                value={card.number}
                onChange={e => setCard({ ...card, number: formatNumber(e.target.value) })}
                placeholder="0000 0000 0000 0000"
              />
              <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                {cardType !== 'default' && (
                   <span style={{ fontSize: '0.625rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--db-nvidia-green)', background: 'rgba(118,185,0,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                     {cardType}
                   </span>
                )}
                <CreditCard size={16} color={cardType !== 'default' ? 'var(--db-nvidia-green)' : 'var(--db-text-muted)'} />
              </div>
            </div>
          </div>

          <div className="ob-form-row">
            <div className="ob-form-group">
              <label className="ob-form-label">Expiry</label>
              <input
                className="ob-form-input"
                type="text"
                value={card.expiry}
                onChange={e => setCard({ ...card, expiry: formatExpiry(e.target.value) })}
                placeholder="MM/YY"
              />
            </div>
            <div className="ob-form-group">
              <label className="ob-form-label">CVC</label>
              <input
                className="ob-form-input"
                type="text"
                value={card.cvc}
                onChange={e => setCard({ ...card, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                placeholder="123"
              />
            </div>
          </div>

          <button
            className="db-btn db-btn-primary"
            style={{ width: '100%', padding: '14px', marginTop: '12px', fontSize: '1rem', opacity: isReady ? 1 : 0.5, transition: 'all 0.2s' }}
            onClick={onLaunch}
            disabled={launching || !isReady}
          >
            {launching ? (
               <span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'auth-spin 0.6s linear infinite', display: 'inline-block' }} />
            ) : (
              <>Launch My Workspace <ChevronRight size={18} /></>
            )}
          </button>

          <p style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)', marginTop: '16px', textAlign: 'center', lineHeight: '1.4' }}>
            By clicking Launch, you agree to the $297/mo price-lock. Monthly billing starting today. Cancel anytime.
          </p>
        </div>
      </div>
    </>
  );
}
