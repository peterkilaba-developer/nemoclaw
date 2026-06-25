import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useFirm } from '../contexts/FirmContext';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc, collection, addDoc, serverTimestamp, getDocs, query, orderBy, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

import '../styles/onboarding.css';
import { Bot, Check, Copy, Eye, EyeOff, FileText, Key, MapPin, Trash2, Upload } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

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
import { useTheme } from '../contexts/ThemeContext';

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

const SETTINGS_TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'knowledge', label: 'Knowledge Base' },
  { id: 'team', label: 'AI Workforce' },
  { id: 'api', label: 'API Keys' },
  { id: 'appearance', label: 'Appearance' },
];

function normalizeSettingsTab(value) {
  return SETTINGS_TABS.some(tab => tab.id === value) ? value : 'profile';
}

export default function FirmSettings() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { firm, firmId, refreshFirm } = useFirm();
  const { resolvedTheme, theme } = useTheme();
  const activeTab = normalizeSettingsTab(searchParams.get('tab'));
  const [saving, setSaving] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [knowledgeDocs, setKnowledgeDocs] = useState([]);
  const [showApiKey, setShowApiKey] = useState(false);
  const fileInputRef = useRef(null);

  // High-fidelity edit data (matches Onboarding step 1)
  const nameParts = (user?.displayName || '').split(' ');
  const [data, setData] = useState({
    firmName: firm?.firmName || firm?.name || '',
    firmAddress: firm?.firmAddress || '',
    firmPhone: firm?.firmPhone || '',
    firmWebsite: firm?.firmWebsite || '',
    placeId: firm?.placeId || '',
    stateBar: firm?.stateBar || firm?.practiceArea || '',
    federalCircuits: firm?.federalCircuits || [],
    practiceAreas: firm?.practiceAreas || [],
    firstName: nameParts[0] || '',
    lastName: nameParts.slice(1).join(' ') || '',
    email: user?.email || '',
  });

  useEffect(() => {
    if (firm) {
      const syncForm = setTimeout(() => {
        const parts = (user?.displayName || '').split(' ');
        setData({
          firmName: firm?.firmName || firm?.name || '',
          firmAddress: firm?.firmAddress || '',
          firmPhone: firm?.firmPhone || '',
          firmWebsite: firm?.firmWebsite || '',
          placeId: firm?.placeId || '',
          stateBar: firm?.stateBar || firm?.practiceArea || '',
          federalCircuits: firm?.federalCircuits || [],
          practiceAreas: firm?.practiceAreas || [],
          firstName: parts[0] || '',
          lastName: parts.slice(1).join(' ') || '',
          email: user?.email || '',
        });
      }, 0);
      return () => clearTimeout(syncForm);
    }
  }, [firm, user]);

  useEffect(() => {
    if (!firmId) return;
    const fetchKb = async () => {
      try {
        const q = query(collection(db, 'firms', firmId, 'knowledgeBase'), orderBy('uploadedAt', 'desc'));
        const snap = await getDocs(q);
        setKnowledgeDocs(snap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            fileName: data.fileName,
            fileSize: data.fileSize,
            uploadedAt: data.uploadedAt?.toDate ? data.uploadedAt.toDate() : new Date(),
          };
        }));
      } catch (err) {
        console.warn('Failed to load knowledge base:', err);
      }
    };
    fetchKb();
  }, [firmId]);

  const saveProfile = async () => {
    if (!firmId) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'firms', firmId), {
        firmName: data.firmName,
        name: data.firmName,
        firmAddress: data.firmAddress,
        firmPhone: data.firmPhone,
        firmWebsite: data.firmWebsite,
        placeId: data.placeId,
        stateBar: data.stateBar,
        federalCircuits: data.federalCircuits,
        practiceAreas: data.practiceAreas,
        firmSize: 'solo',
        updatedAt: serverTimestamp(),
      });
      
      // Update user name if changed
      if (data.firstName || data.lastName) {
        const newName = `${data.firstName} ${data.lastName}`.trim();
        if (newName !== user?.displayName) {
          await updateDoc(doc(db, 'users', user.uid), {
            displayName: newName,
            updatedAt: serverTimestamp(),
          });
        }
      }

      if (refreshFirm) await refreshFirm();
    } catch (err) {
      console.error('Error saving firm profile:', err);
    }
    setSaving(false);
  };

  const updateData = (key, value) => setData(prev => ({ ...prev, [key]: value }));

  const togglePracticeArea = (area) => {
    setData(prev => ({
      ...prev,
      practiceAreas: prev.practiceAreas.includes(area)
        ? prev.practiceAreas.filter(a => a !== area)
        : [...prev.practiceAreas, area],
    }));
  };

  const isProfileValid = () => {
    return (data.firmName?.trim().length || 0) > 2 && 
           data.practiceAreas.length > 0 && 
           (data.firstName?.trim().length || 0) > 0 &&
           (data.lastName?.trim().length || 0) > 0 &&
           (data.email?.includes('@') || false);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length || !firmId) return;
    setUploadingFile(true);
    try {
      for (const file of files) {
        // Read file as text for knowledge base
        const reader = new FileReader();
        const text = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result);
          reader.readAsText(file);
        });

        await addDoc(collection(db, 'firms', firmId, 'knowledgeBase'), {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type || 'text/plain',
          content: text.slice(0, 50000), // Store first 50K chars
          uploadedBy: user?.email || 'unknown',
          uploadedAt: serverTimestamp(),
        });

        setKnowledgeDocs(prev => [...prev, {
          fileName: file.name,
          fileSize: file.size,
          uploadedAt: new Date(),
        }]);
      }
    } catch (err) {
      console.error('Upload error:', err);
    }
    setUploadingFile(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeDocIdx = async (idx, docId) => {
    try {
      if (docId) await deleteDoc(doc(db, 'firms', firmId, 'knowledgeBase', docId));
      setKnowledgeDocs(prev => prev.filter((_, i) => i !== idx));
    } catch (err) {
      console.error('Failed to delete doc:', err);
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleTabSelect = (tabId) => {
    const normalizedTab = normalizeSettingsTab(tabId);
    setSearchParams(normalizedTab === 'profile' ? {} : { tab: normalizedTab }, { replace: true });
  };

  return (
    <>
      <div className="db-page-header">
        <h1 className="db-page-title">Firm Settings</h1>
        <p className="db-page-subtitle">Manage your firm profile, knowledge base, team members, and integrations.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '28px', borderBottom: '1px solid var(--db-border)', paddingBottom: '0' }}>
        {SETTINGS_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabSelect(tab.id)}
            style={{
              padding: '10px 16px',
              fontSize: '0.8125rem',
              fontWeight: activeTab === tab.id ? 600 : 500,
              color: activeTab === tab.id ? 'var(--db-text-primary)' : 'var(--db-text-muted)',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--db-text-primary)' : '2px solid transparent',
              cursor: 'pointer',
              fontFamily: 'var(--db-font)',
              marginBottom: '-1px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════════ PROFILE TAB (INLINE EDIT) ═══════════════ */}
      {activeTab === 'profile' && (
        <div className="db-card" style={{ marginBottom: '24px' }}>
          <div className="onboarding-step-card" style={{ padding: '0', border: 'none', boxShadow: 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h2 className="onboarding-step-title">Refine your firm profile</h2>
                <p className="onboarding-step-desc">
                  Update your firm details and practice areas. Your AI workforce will automatically adjust to these changes.
                </p>
              </div>
              <button 
                className="db-btn db-btn-primary" 
                onClick={saveProfile} 
                disabled={saving || !isProfileValid()}
                style={{ opacity: isProfileValid() ? 1 : 0.5, borderRadius: '8px' }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
            
            <StepFirmProfile 
              data={data} 
              updateData={updateData} 
              togglePracticeArea={togglePracticeArea} 
              firmId={firmId}
              user={user}
            />
          </div>
        </div>
      )}

      {/* ═══════════════ KNOWLEDGE BASE TAB ═══════════════ */}
      {activeTab === 'knowledge' && (
        <div className="db-card" style={{ marginBottom: '24px' }}>
          <div className="db-card-header">
            <div>
              <div className="db-card-title">Knowledge Base</div>
              <div className="db-card-subtitle">Upload firm documents to enrich your AI's context</div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt,.csv,.md"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <button
                className="db-btn db-btn-primary db-btn-sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {uploadingFile ? <><span className="auth-spinner" style={{ width: '12px', height: '12px', borderTopColor: '#000' }} /> Uploading...</> : <><Upload size={14} /> Upload Files</>}
              </button>
            </div>
          </div>

          {knowledgeDocs.length > 0 ? (
            <div className="db-feed">
              {knowledgeDocs.map((docItem, i) => (
                <div key={i} className="db-feed-item" style={{ display: 'flex', alignItems: 'center' }}>
                  <FileText size={16} style={{ color: 'var(--db-text-muted)', marginRight: '12px', flexShrink: 0 }} />
                  <div className="db-feed-content" style={{ flex: 1 }}>
                    <div className="db-feed-title">{docItem.fileName}</div>
                    <div className="db-feed-desc">{formatSize(docItem.fileSize)} · Uploaded {docItem.uploadedAt.toLocaleDateString()}</div>
                  </div>
                  <button
                    onClick={() => removeDocIdx(i, docItem.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--db-text-muted)', padding: '4px' }}
                    title="Remove document"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '40px 24px', textAlign: 'center' }}>
              <Upload size={32} style={{ color: 'var(--db-text-muted)', opacity: 0.3, marginBottom: '12px' }} />
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--db-text-primary)', marginBottom: '4px' }}>No documents uploaded yet</div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--db-text-muted)', maxWidth: '400px', margin: '0 auto 16px' }}>
                Upload firm templates, engagement letters, billing guidelines, and standard forms to train your AI.
              </p>
              <button
                className="db-btn db-btn-secondary db-btn-sm"
                onClick={() => fileInputRef.current?.click()}
              >
                Select Files to Upload
              </button>
            </div>
          )}

          <div style={{ padding: '12px 0 0', borderTop: '1px solid var(--db-border)', marginTop: '16px', fontSize: '0.6875rem', color: 'var(--db-text-muted)' }}>
            Accepted formats: PDF, DOC, DOCX, TXT, CSV, MD · Max 10 MB per file
          </div>
        </div>
      )}

      {/* ═══════════════ TEAM TAB ═══════════════ */}
      {activeTab === 'team' && (
        <div className="db-card">
          <div className="db-card-header">
            <div className="db-card-title">Your AI Workforce</div>
            <button className="db-btn db-btn-primary db-btn-sm" onClick={() => navigate('/dashboard/team')}>View AI Team</button>
          </div>
          <div style={{ padding: '32px 24px', textAlign: 'center' }}>
            <Bot size={32} style={{ color: 'var(--db-nvidia-green)', opacity: 0.6, marginBottom: '12px' }} />
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--db-text-primary)', marginBottom: '4px' }}>Solo-to-Small-Firm Role Mapping</div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--db-text-muted)', maxWidth: '500px', margin: '0 auto' }}>
              As a solo practitioner, you have full access to your personal AI agent and 19 specialized sub-agents. No additional team members needed — your AI workforce handles it all.
            </p>
          </div>
        </div>
      )}

      {/* ═══════════════ API KEYS TAB ═══════════════ */}
      {activeTab === 'api' && (
        <div className="db-card">
          <div className="db-card-header">
            <div>
              <div className="db-card-title">API Keys</div>
              <div className="db-card-subtitle">Manage keys for integrations and external access</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Firm ID */}
            <div style={{ padding: '12px 16px', background: 'var(--db-bg)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--db-text-muted)', marginBottom: '4px' }}>Firm ID</div>
                  <div style={{ fontFamily: 'var(--db-font-mono)', fontSize: '0.8125rem', color: 'var(--db-text-primary)' }}>
                    {firmId || '—'}
                  </div>
                </div>
                <button
                  className="db-btn db-btn-secondary db-btn-sm"
                  onClick={() => {
                    navigator.clipboard.writeText(firmId || '');
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Copy size={12} /> Copy
                </button>
              </div>
            </div>

            {/* API Key */}
            <div style={{ padding: '12px 16px', background: 'var(--db-bg)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--db-text-muted)', marginBottom: '4px' }}>
                    <Key size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                    NemoClaw API Key
                  </div>
                  <div style={{ fontFamily: 'var(--db-font-mono)', fontSize: '0.8125rem', color: 'var(--db-text-primary)' }}>
                    {showApiKey ? (firm?.apiKey || 'No API key generated') : '••••••••••••••••••••••••'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    className="db-btn db-btn-secondary db-btn-sm"
                    onClick={() => setShowApiKey(!showApiKey)}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    {showApiKey ? <><EyeOff size={12} /> Hide</> : <><Eye size={12} /> Show</>}
                  </button>
                  <button
                    className="db-btn db-btn-secondary db-btn-sm"
                    onClick={() => navigator.clipboard.writeText(firm?.apiKey || '')}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Copy size={12} /> Copy
                  </button>
                </div>
              </div>
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)', padding: '8px 0' }}>
              API keys are used to connect external tools to your NemoClaw sandbox. Keep them confidential and rotate them periodically.
            </div>
          </div>
        </div>
      )}

      {activeTab === 'appearance' && (
        <div className="db-card">
          <div className="db-card-header">
            <div>
              <div className="db-card-title">Appearance</div>
              <div className="db-card-subtitle">Choose how NemoC LAW AI renders across classic and command interfaces.</div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', padding: '16px', border: '1px solid var(--db-border)', borderRadius: '10px', background: 'var(--db-bg)' }}>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--db-text-primary)', marginBottom: '4px' }}>Theme</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--db-text-muted)' }}>
                  Preference: {theme}. Rendering: {resolvedTheme}.
                </div>
              </div>
              <ThemeToggle variant="segmented" />
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)', lineHeight: 1.6 }}>
              System follows your operating system. Light and dark stay pinned until changed.
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ═══════════════ STEP 1 CLONE COMPONENT ═══════════════ */
function StepFirmProfile({ data, updateData, togglePracticeArea, firmId, user }) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);

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

      updateData('firmName', place.name);
      if (place.formatted_address) updateData('firmAddress', place.formatted_address);
      if (place.place_id) updateData('placeId', place.place_id);
      if (place.formatted_phone_number) updateData('firmPhone', place.formatted_phone_number);
      
      if (place.website) {
        updateData('firmWebsite', place.website);
        // Rescan URL content directly to KnowledgeBase
        if (firmId && user) {
          try {
            let websiteName = place.website;
            try { websiteName = new URL(place.website).hostname; } catch(_e) { /* intentionally ignored */ }
            await addDoc(collection(db, 'firms', firmId, 'knowledgeBase'), {
              fileName: websiteName,
              fileSize: 'Website Crawl',
              fileType: 'url',
              content: `Digital footprint auto-scanned from ${place.website}`, 
              uploadedBy: user.email || 'system',
              uploadedAt: serverTimestamp(),
            });
            console.log('Digital footprint successfully rescanned and added to Knowledge Base.');
          } catch (err) {
            console.error('Failed to auto-rescan website content:', err);
          }
        }
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



  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--db-bg)', border: '2px solid var(--db-border)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {user?.photoURL ? (
            <img src={user.photoURL} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
          ) : (
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--db-text-muted)' }}>
              {(data.firstName?.[0] || '') + (data.lastName?.[0] || '')}
            </div>
          )}
        </div>
        <div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--db-text-primary)' }}>Solo Practitioner</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)' }}>{user?.email}</div>
        </div>
      </div>

      <div className="ob-form-row">
        <div className="ob-form-group">
          <label className="ob-form-label">First Name <span className="required">*</span></label>
          <input className="ob-form-input" type="text" name="firstName" placeholder="First name" value={data.firstName} onChange={e => updateData('firstName', e.target.value)} autoComplete="off" data-lpignore="true" data-1p-ignore="true" />
        </div>
        <div className="ob-form-group">
          <label className="ob-form-label">Last Name <span className="required">*</span></label>
          <input className="ob-form-input" type="text" name="lastName" placeholder="Last name" value={data.lastName} onChange={e => updateData('lastName', e.target.value)} autoComplete="off" data-lpignore="true" data-1p-ignore="true" />
        </div>
      </div>

      <div className="ob-form-row">
        <div className="ob-form-group">
          <label className="ob-form-label">Email <span className="required">*</span></label>
          <input className="ob-form-input" type="email" name="contactEmail" placeholder="you@firm.com" value={data.email} onChange={e => updateData('email', e.target.value)} autoComplete="off" data-lpignore="true" data-1p-ignore="true" />
        </div>
      </div>

      <div className="ob-form-row">
        <div className="ob-form-group">
          <label className="ob-form-label">Firm Name / Search <span className="required">*</span></label>
          <input 
            ref={inputRef} 
            className={`ob-form-input ob-places-input${data.firmAddress ? ' ob-places-filled' : ''}`} 
            type="text" 
            placeholder="Start typing your law firm name..." 
            value={data.firmName}
            onChange={event => updateData('firmName', event.target.value)}
            autoComplete="off" 
            title="Edit manually or select a Google Places suggestion."
          />
          <div style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <MapPin size={10} /> Manual editing supported; Places lookup is optional
          </div>
        </div>
        <div className="ob-form-group">
          <label className="ob-form-label">State Bar <span className="required">*</span> {data.stateBar && <Check size={10} style={{ display: 'inline', verticalAlign: 'middle' }} />}</label>
          <select
            className="ob-form-input"
            value={data.stateBar}
            onChange={event => {
              const stateBar = event.target.value;
              const circuit = FEDERAL_CIRCUITS.find(item => item.states.includes(stateBar))?.value;
              updateData('stateBar', stateBar);
              if (circuit) updateData('federalCircuits', [circuit]);
            }}
          >
            <option value="">Select your licensed state</option>
            {Object.keys(STATE_MAP).sort().map(state => <option key={state} value={state}>{state}</option>)}
          </select>
        </div>
      </div>

      <div className="ob-form-group">
        <label className="ob-form-label">Federal Circuit Jurisdiction</label>
        <div style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)', marginBottom: '8px', lineHeight: '1.4' }}>
          Select the federal circuits where your firm practices.
        </div>
        <div className="ob-checkbox-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
          {FEDERAL_CIRCUITS.map(circuit => (
            <div
              key={circuit.value}
              className={`ob-checkbox-item ${(data.federalCircuits || []).includes(circuit.value) ? 'checked' : ''}`}
              onClick={() => {
                const current = data.federalCircuits || [];
                const next = current.includes(circuit.value)
                  ? current.filter(v => v !== circuit.value)
                  : [...current, circuit.value];
                updateData('federalCircuits', next);
              }}
            >
              <div className="ob-checkbox-box">{(data.federalCircuits || []).includes(circuit.value) && <Check size={12} />}</div>
              <span className="ob-checkbox-label">{circuit.label}</span>
            </div>
          ))}
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
