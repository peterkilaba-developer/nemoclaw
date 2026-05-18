import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, getDocs, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useFirm } from '../contexts/FirmContext';
import { ArrowRight, Bot, Briefcase, Filter, MoreHorizontal, RefreshCw, Search, Settings, Shield, X, Zap } from 'lucide-react';


export default function Matters() {
  const { user } = useAuth();
  const { firm } = useFirm();
  const navigate = useNavigate();
  const [matters, setMatters] = useState([]);
  const [_loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const firmId = firm?.id || user?.firmId;

  // Pending agentic intake proposals (populated by Intake Agent)
  const [pendingIntakes, _setPendingIntakes] = useState([]);

  const [provisionStep, setProvisionStep] = useState(1);
  const [newMatter, setNewMatter] = useState({
    title: '',
    client: '',
    type: 'Adoption',
    status: 'Active',
    description: '',
    feeStructure: 'Hourly',
    rate: '350',
    provisionClientPortal: true
  });

  const loadMatters = useCallback(async () => {
    if (!firmId) return;
    try {
      setLoading(true);
      const q = query(collection(db, 'firms', firmId, 'matters'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const mList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMatters(mList);
    } catch (err) {
      console.warn('Failed to load matters', err);
    } finally {
      setLoading(false);
    }
  }, [firmId]);

  useEffect(() => {
    loadMatters();
  }, [loadMatters]);

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
    }, 2000);
  };

  async function handleCreateMatter(e) {
    if (e) e.preventDefault();
    if (!firmId) return;
    try {
      const docRef = await addDoc(collection(db, 'firms', firmId, 'matters'), {
        ...newMatter,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.uid,
        createdByEmail: user.email || null,
        assignedTo: [user.email].filter(Boolean),
        assignedEmails: [user.email].filter(Boolean),
        assignedUserIds: [user.uid].filter(Boolean),
        ethicalWall: {
          ownerUid: user.uid,
          assignedUserIds: [user.uid].filter(Boolean),
          assignedEmails: [user.email].filter(Boolean),
        },
      });
      setShowNewModal(false);
      setNewMatter({ title: '', client: '', type: 'Litigation', status: 'Active', description: '', feeStructure: 'Hourly', rate: '350', provisionClientPortal: true });
      setProvisionStep(1);
      navigate(`/dashboard/matters/${docRef.id}`);
    } catch (err) {
      console.error('Error creating matter:', err);
    }
  }

  return (
    <div className="db-viewport-workspace" style={{ overflow: 'auto' }}>
      {/* 70% MAIN CONTENT AREA */}
      <div className="db-chat-container">
        {/* Sub-Header / Action Track */}
        <div style={{ padding: '8px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--db-border-light)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)', fontWeight: 500 }}>
            Management / Firm Matters
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="db-btn db-btn-secondary db-btn-sm" onClick={handleSync} disabled={isSyncing}>
              <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} /> {isSyncing ? 'Intake Agent Syncing...' : 'Sync Intake Agent'}
            </button>
            {/* Manual Override — edge cases only, not the primary workflow */}
            <button
              onClick={() => {
                setNewMatter({ title: '', client: '', type: 'Litigation', status: 'Active', description: '', feeStructure: 'Hourly', rate: '350', provisionClientPortal: true });
                setProvisionStep(1);
                setShowNewModal(true);
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.7rem', color: 'var(--db-text-muted)', textDecoration: 'underline', padding: '4px' }}
            >
              Manual Override
            </button>
          </div>
        </div>

        <div className="db-chat-messages" style={{ padding: '24px 32px' }}>
          {/* Main Title */}
          <div style={{ marginBottom: '20px' }}>
            <h1 className="db-page-title" style={{ fontSize: '1.25rem' }}>Matter Workspaces</h1>
          </div>

          {/* Agentic Philosophy Banner */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '12px',
            background: 'rgba(118,185,0,0.06)', border: '1px solid rgba(118,185,0,0.2)',
            borderRadius: '10px', padding: '14px 18px', marginBottom: '28px',
          }}>
            <Bot size={16} color="var(--db-nvidia-green)" style={{ marginTop: '1px', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--db-text-primary)', marginBottom: '3px' }}>Intake Agent is monitoring all channels</div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)', lineHeight: 1.5 }}>
                New matters are identified automatically from calls, emails, web forms, and texts. Review AI proposals below to provision a workspace — no manual data entry required.
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Bot size={14} color="var(--db-nvidia-green)" />
              <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--db-text-secondary)' }}>
                Pending Agentic Proposals
              </span>
            </div>
            {pendingIntakes.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '16px' }}>
                {pendingIntakes.map(pi => (
                  <div key={pi.id} className="db-card" style={{ padding: '20px', borderLeft: '3px solid var(--db-nvidia-green)', background: 'var(--db-surface)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 750 }}>{pi.client}</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--db-nvidia-green)', fontWeight: 800 }}>{Math.round(pi.confidence * 100)}% Confidence</span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>{pi.summary}</p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="db-btn db-btn-primary db-btn-sm" 
                        style={{ padding: '6px 12px', fontSize: '0.7rem' }}
                        onClick={() => {
                          setNewMatter({ ...newMatter, title: pi.summary, client: pi.client, type: pi.type });
                          setProvisionStep(1);
                          setShowNewModal(true);
                        }}
                      >
                        Review & Provision
                      </button>
                      <button className="db-btn db-btn-secondary db-btn-sm" style={{ padding: '6px 12px', fontSize: '0.7rem' }}>Dismiss</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '24px', border: '1px dashed var(--db-border)', borderRadius: '10px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--db-text-muted)' }}>
                No case proposals pending. The Intake Agent is currently monitoring.
              </div>
            )}
          </div>

          {/* Active Matters Table */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Briefcase size={14} color="var(--db-text-muted)" />
              <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--db-text-secondary)' }}>
                Active Firm Matters
              </span>
            </div>
            
            <div className="db-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--db-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa' }}>
                <div style={{ position: 'relative', width: '300px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--db-text-muted)' }} />
                  <input 
                    type="text" 
                    placeholder="Search workspaces..." 
                    style={{ width: '100%', background: '#fff', border: '1px solid var(--db-border)', borderRadius: '6px', padding: '6px 12px 6px 36px', fontSize: '0.8rem', color: 'var(--db-text-primary)' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="db-btn db-btn-secondary db-btn-sm" style={{ padding: '6px 12px' }}><Filter size={14} /></button>
                  <button className="db-btn db-btn-secondary db-btn-sm" style={{ padding: '6px 12px' }}><Settings size={14} /></button>
                </div>
              </div>
              
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: 'var(--db-bg)', borderBottom: '1px solid var(--db-border)' }}>
                    {['Matter / Client', 'Category', 'System Status', 'Active Agents', ''].map(h => (
                      <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontWeight: 600, color: 'var(--db-text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matters.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ padding: '60px 20px', textAlign: 'center' }}>
                        <div style={{ marginBottom: '16px', opacity: 0.1 }}>
                          <Briefcase size={48} style={{ margin: '0 auto' }} />
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--db-text-primary)', marginBottom: '4px' }}>No Matters Found</div>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--db-text-muted)', maxWidth: '300px', margin: '0 auto' }}>
                          {firm?.isConfigured 
                            ? "Once the Intake Agent identifies new matters, they will appear here or as pending proposals above."
                            : "Deploy your firm sandbox in the Command Center to activate your Intake Agent."}
                        </p>
                      </td>
                    </tr>
                  ) : matters.map(m => (
                    <tr key={m.id} className="db-table-row" onClick={() => navigate(`/dashboard/matters/${m.id}`)}>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ fontWeight: 750, color: 'var(--db-text-primary)', fontSize: '0.85rem' }}>{m.title}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--db-text-muted)', marginTop: '2px' }}>{m.client}</div>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--db-text-secondary)', background: 'var(--db-bg)', padding: '4px 8px', borderRadius: '4px' }}>
                          {m.type}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700, color: m.status === 'Active' ? '#16a34a' : (m.status === 'Closed' ? 'var(--db-text-muted)' : '#f59e0b') }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: m.status === 'Active' ? '#16a34a' : (m.status === 'Closed' ? 'var(--db-text-muted)' : '#f59e0b') }} />
                          {m.status.toUpperCase()}
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Bot size={12} color="var(--db-text-muted)" />
                          <span style={{ fontSize: '0.7rem', color: 'var(--db-text-secondary)', fontWeight: 600 }}>{m.assignedTo?.length || 1} Agents deployed</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <MoreHorizontal size={14} color="var(--db-text-muted)" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* 30% INTELLIGENCE SIDEBAR */}
      <div className="db-context-sidebar" style={{ background: '#f8f9fa' }}>
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <Shield size={16} color="var(--db-text-primary)" />
            <h3 style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Governance</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="db-card" style={{ padding: '20px', background: '#fff' }}>
              <div style={{ color: 'var(--db-text-muted)', fontSize: '0.65rem', marginBottom: '4px', fontWeight: 700, textTransform: 'uppercase' }}>Active Pipelines</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{matters.length}</div>
              <div style={{ height: '4px', width: '100%', background: 'var(--db-bg)', borderRadius: '2px', marginTop: '16px' }}>
                <div style={{ height: '100%', width: matters.length > 0 ? '70%' : '0%', background: 'var(--db-nvidia-green)', borderRadius: '2px' }} />
              </div>
            </div>

            <div className="db-card" style={{ padding: '20px', background: '#fff' }}>
              <div style={{ color: 'var(--db-text-muted)', fontSize: '0.65rem', marginBottom: '12px', fontWeight: 700, textTransform: 'uppercase' }}>Expertise Distribution</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {matters.length === 0 ? (
                  <div style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)', textAlign: 'center', padding: '10px 0' }}>No data to distribute.</div>
                ) : (
                  Object.entries(matters.reduce((acc, m) => {
                    acc[m.type] = (acc[m.type] || 0) + 1;
                    return acc;
                  }, {})).map(([label, count]) => {
                    const pct = Math.round((count / matters.length) * 100);
                    const color = label === 'Litigation' ? '#3b82f6' : (label === 'Corporate' ? '#10b981' : '#f59e0b');
                    return (
                      <div key={label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '4px', fontWeight: 600 }}>
                          <span>{label}</span>
                          <span>{pct}%</span>
                        </div>
                        <div style={{ height: '3px', width: '100%', background: 'var(--db-bg)', borderRadius: '2px' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '2px' }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div style={{ background: 'rgba(118,185,0,0.05)', padding: '20px', borderRadius: '12px', border: '1px dashed var(--db-nvidia-green)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Zap size={14} color="var(--db-nvidia-green)" />
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--db-text-primary)' }}>System Health</span>
              </div>
              <p style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)', lineHeight: 1.6 }}>
                All agentic nodes are reporting optimal latency. Ethical walls are enforced across {matters.length} active pipelines.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Spacious Review Modal */}
      {showNewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--modal-backdrop)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="db-card" style={{ 
            width: '100%', 
            maxWidth: '700px', 
            margin: '20px', 
            padding: '0', 
            background: 'var(--modal-bg)', 
            border: '1px solid var(--modal-border)',
            color: 'var(--modal-text)',
            overflow: 'hidden',
            animation: 'fadeIn 0.2s ease-out' 
          }}>
            {/* Modal Header */}
            <div style={{ padding: '32px 40px', borderBottom: '1px solid var(--db-border)', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <Bot size={16} color="var(--db-nvidia-green)" />
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--db-nvidia-green)' }}>Intake Agent Proposal</span>
                  </div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--modal-text)' }}>{provisionStep === 1 ? 'Step 1: Intelligence Review' : 'Step 2: Business & Engagement'}</h2>
                </div>
                <button 
                  onClick={() => setShowNewModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--modal-text-muted)' }}
                >
                  <X size={20} />
                </button>
              </div>
              
              {/* Stepper */}
              <div style={{ display: 'flex', gap: '4px', marginTop: '20px' }}>
                <div style={{ height: '4px', flex: 1, background: 'var(--db-nvidia-green)', borderRadius: '2px' }} />
                <div style={{ height: '4px', flex: 1, background: provisionStep === 2 ? 'var(--db-nvidia-green)' : 'rgba(0,0,0,0.1)', borderRadius: '2px', transition: 'background 0.3s' }} />
              </div>
            </div>
            
            <div style={{ padding: '32px 40px' }}>
              {provisionStep === 1 ? (
                /* STEP 1: Intelligence */
                <div style={{ animation: 'fadeIn 0.3s' }}>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--modal-text-muted)', marginBottom: '24px', lineHeight: 1.6 }}>AI has extracted the following payload. Please verify for technical accuracy.</p>
                  
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--modal-text-muted)', marginBottom: '8px' }}>Matter Name / Reference *</label>
                    <input required type="text" className="ob-form-input" style={{ width: '100%', marginBottom: 0, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--modal-border)', color: 'var(--modal-text)' }} value={newMatter.title} onChange={e => setNewMatter({...newMatter, title: e.target.value})} placeholder="e.g. Smith v. Jones, Project Apollo" />
                  </div>
                  
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--modal-text-muted)', marginBottom: '8px' }}>Client Name *</label>
                    <input required type="text" className="ob-form-input" style={{ width: '100%', marginBottom: 0, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--modal-border)', color: 'var(--modal-text)' }} value={newMatter.client} onChange={e => setNewMatter({...newMatter, client: e.target.value})} placeholder="Client or Entity Name" />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--modal-text-muted)', marginBottom: '8px' }}>Practice Category</label>
                      <select className="ob-form-select" style={{ width: '100%', marginBottom: 0 }} value={newMatter.type} onChange={e => setNewMatter({...newMatter, type: e.target.value})}>
                        <optgroup label="Individuals">
                          <option>Adoption</option>
                          <option>Animal / Pet Law</option>
                          <option>Bankruptcy (Personal)</option>
                          <option>Child Custody & Support</option>
                          <option>Civil Rights</option>
                          <option>Consumer Protection</option>
                          <option>Criminal Defense</option>
                          <option>Disability / ADA</option>
                          <option>Divorce & Separation</option>
                          <option>DUI / DWI</option>
                          <option>Education Law</option>
                          <option>Elder Law</option>
                          <option>Employment (Employee Side)</option>
                          <option>Entertainment / Sports Law</option>
                          <option>Estate Planning & Probate</option>
                          <option>Expungement / Record Sealing</option>
                          <option>Family Law</option>
                          <option>Guardianship & Conservatorship</option>
                          <option>Immigration</option>
                          <option>Insurance Claims</option>
                          <option>Juvenile Law</option>
                          <option>Landlord-Tenant (Tenant Side)</option>
                          <option>Medical Malpractice</option>
                          <option>Military / Veterans Law</option>
                          <option>Native American Law</option>
                          <option>Nursing Home Abuse</option>
                          <option>Personal Injury</option>
                          <option>Product Liability</option>
                          <option>Sexual Harassment / Assault</option>
                          <option>Social Security Disability</option>
                          <option>Traffic Violations</option>
                          <option>Trusts & Wills</option>
                          <option>Workers' Compensation</option>
                          <option>Wrongful Death</option>
                        </optgroup>
                        <optgroup label="Businesses">
                          <option>Antitrust / Competition</option>
                          <option>Aviation Law</option>
                          <option>Banking & Finance</option>
                          <option>Bankruptcy (Business)</option>
                          <option>Business Formation & LLC</option>
                          <option>Cannabis / Marijuana Law</option>
                          <option>Class Action Defense</option>
                          <option>Commercial Litigation</option>
                          <option>Construction Law</option>
                          <option>Contracts & Agreements</option>
                          <option>Corporate Governance</option>
                          <option>Corporate / M&A</option>
                          <option>Cybersecurity & Data Privacy</option>
                          <option>eDiscovery</option>
                          <option>Employment (Employer Side)</option>
                          <option>Energy & Utilities</option>
                          <option>Environmental & EPA</option>
                          <option>Franchise Law</option>
                          <option>Government Contracts</option>
                          <option>Healthcare & HIPAA</option>
                          <option>Insurance Defense</option>
                          <option>Intellectual Property / Patent</option>
                          <option>International Trade</option>
                          <option>Landlord-Tenant (Landlord Side)</option>
                          <option>Maritime / Admiralty</option>
                          <option>Media & Communications</option>
                          <option>Mergers & Acquisitions</option>
                          <option>Non-Profit / Tax-Exempt</option>
                          <option>Oil & Gas</option>
                          <option>Real Estate (Commercial)</option>
                          <option>Real Estate (Residential)</option>
                          <option>Regulatory & Compliance</option>
                          <option>Securities & SEC</option>
                          <option>Tax (Business)</option>
                          <option>Tax (Individual)</option>
                          <option>Technology & Software</option>
                          <option>Telecommunications</option>
                          <option>Transportation & Logistics</option>
                          <option>White Collar Crime</option>
                          <option>Zoning & Land Use</option>
                        </optgroup>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--db-text-muted)', marginBottom: '8px' }}>Deployment Status</label>
                      <select className="ob-form-select" style={{ width: '100%', marginBottom: 0 }} value={newMatter.status} onChange={e => setNewMatter({...newMatter, status: e.target.value})}>
                        <option>Active</option>
                        <option>Pending Intake</option>
                        <option>Closed</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginBottom: '0' }}>
                    <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--db-text-muted)', marginBottom: '8px' }}>Intelligence Baseline / Objective</label>
                    <textarea className="ob-form-input" style={{ width: '100%', marginBottom: 0, minHeight: '80px', resize: 'vertical' }} rows={4} value={newMatter.description} onChange={e => setNewMatter({...newMatter, description: e.target.value})} placeholder="Context for the AI baseline prompt..."></textarea>
                  </div>
                </div>
              ) : (
                /* STEP 2: Business */
                <div style={{ animation: 'fadeIn 0.3s' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--db-text-muted)', marginBottom: '24px' }}>Finalize the commercial and engagement parameters for this matter.</p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--db-text-muted)', marginBottom: '8px' }}>Fee Arrangement</label>
                      <select className="ob-form-select" style={{ width: '100%', marginBottom: 0 }} value={newMatter.feeStructure} onChange={e => setNewMatter({...newMatter, feeStructure: e.target.value})}>
                        <option>Hourly</option>
                        <option>Fixed Fee</option>
                        <option>Contingency</option>
                        <option>Hybrid</option>
                        <option>Pro Bono</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--db-text-muted)', marginBottom: '8px' }}>Billable Rate ($/hr)</label>
                      <input required type="number" className="ob-form-input" style={{ width: '100%', marginBottom: 0 }} value={newMatter.rate} onChange={e => setNewMatter({...newMatter, rate: e.target.value})} placeholder="350" disabled={newMatter.feeStructure === 'Pro Bono'} />
                    </div>
                  </div>

                  <div style={{ background: 'var(--db-bg)', padding: '20px', borderRadius: '10px', border: '1px solid var(--db-border)', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--db-text-primary)' }}>Agentic Provisioning Chain</span>
                      <Zap size={14} color="var(--db-nvidia-green)" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={newMatter.provisionClientPortal} onChange={e => setNewMatter({...newMatter, provisionClientPortal: e.target.checked})} style={{ accentColor: 'var(--db-nvidia-green)' }} />
                        <span style={{ fontSize: '0.8125rem', color: 'var(--db-text-secondary)' }}>Auto-provision Secure Client Portal & Mobile App</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', opacity: 0.7 }}>
                        <input type="checkbox" checked readOnly style={{ accentColor: 'var(--db-nvidia-green)' }} />
                        <span style={{ fontSize: '0.8125rem', color: 'var(--db-text-secondary)' }}>Trigger Phase 3: Drafting Agent Engagement Letter</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', opacity: 0.7 }}>
                        <input type="checkbox" checked readOnly style={{ accentColor: 'var(--db-nvidia-green)' }} />
                        <span style={{ fontSize: '0.8125rem', color: 'var(--db-text-secondary)' }}>Deploy Practice-Specific Sub-Agents (Research, Drafting)</span>
                      </label>
                    </div>
                  </div>
                  
                  <div style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)', fontStyle: 'italic', background: 'rgba(217, 119, 6, 0.05)', padding: '12px', borderRadius: '6px', borderLeft: '3px solid var(--db-warning)' }}>
                    Note: Workspace is protected by Enterprise Ethical Wall. No human access outside assigned team members.
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--modal-border)', marginTop: '32px', paddingTop: '32px' }}>
                <button type="button" className="db-btn db-btn-secondary" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--modal-text)', border: '1px solid var(--modal-border)' }} onClick={() => setShowNewModal(false)}>Cancel</button>
                {provisionStep === 1 ? (
                  <button type="button" className="db-btn db-btn-primary" style={{ padding: '10px 24px', background: 'var(--modal-text)', color: 'var(--modal-bg)' }} onClick={() => setProvisionStep(2)}>
                    Next: Business Details <ArrowRight size={14} />
                  </button>
                ) : (
                  <button 
                    type="button" 
                    className="db-btn db-btn-primary" 
                    style={{ padding: '10px 24px', background: 'var(--db-nvidia-green)', color: '#000' }} 
                    onClick={handleCreateMatter}
                  >
                    Confirm & Provision Workspace
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
