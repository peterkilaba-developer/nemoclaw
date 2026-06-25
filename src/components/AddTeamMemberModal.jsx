import { useState, useRef } from 'react';
import { EMPLOYEE_ROLES, AGENT_SUB_AGENTS, PARTNER_ROLES } from '../lib/agentHierarchy';
import { capitalizeWords } from '../utils/formatters';
import { Bot, Check, CheckCircle, Plus, Trash2, X } from 'lucide-react';

export default /* ─────────────────────────────────────────────── */
/*  ADD TEAM MEMBER MODAL                          */
/* ─────────────────────────────────────────────── */

function AddTeamMemberModal({ partners, onClose, onAdded, onUpdated, onRemoved, initialData }) {
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState(initialData || {
    name: '', email: '', role: 'associate',
    supervisingPartnerId: null, agentName: '', photoURL: '',
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 200;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.7);
          setFormData(prev => ({ ...prev, photoURL: compressed }));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const update = (k, v) => setFormData(prev => ({ ...prev, [k]: v }));

  const roleConfig = EMPLOYEE_ROLES.find(r => r.value === formData.role);
  const agentType = roleConfig?.agentType || 'associate';
  const subAgentCount = AGENT_SUB_AGENTS[agentType]?.length || 0;
  const isManagingPartner = initialData && ['managing-partner', 'solo-partner'].includes(initialData.role);

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.email.trim()) return;
    setSaving(true);
    setError('');
    try {
      if (initialData?.id) {
        await onUpdated(initialData.id, formData);
      } else {
        await onAdded(formData);
      }
      setSuccess(true);
      setTimeout(() => { onClose(); }, 1200);
    } catch (err) {
      console.error('Failed to add team member:', err);
      setError(err.message || 'Could not save this human role mapping.');
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await onRemoved(initialData.id);
      onClose();
    } catch (err) {
      console.error('Failed to remove team member:', err);
      setRemoving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 9999, padding: '20px',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--db-surface)', borderRadius: 'var(--db-radius-lg)',
        border: '1px solid var(--db-border)', width: '100%', maxWidth: '650px',
        boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--db-border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--db-text-primary)' }}>
              {initialData ? 'Edit Human Role Mapping' : 'Add Human Role + Agent'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)', marginTop: '2px' }}>
              A dedicated Personal Agent will be provisioned automatically with role-aware permissions.
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--db-text-muted)', padding: '4px',
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {success ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'rgba(22,163,106,0.1)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
              }}>
                <Check size={28} color="#16a34a" />
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--db-text-primary)' }}>
                {formData.name} has been added!
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--db-text-muted)', marginTop: '4px', marginBottom: '20px' }}>
                {initialData ? 'Profile updated successfully.' : 'Agentic resources provisioned and subscription automatically updated.'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left', background: 'var(--db-bg)', padding: '16px', borderRadius: '8px', border: '1px solid var(--db-border)' }}>
                {(initialData ? [
                  { label: 'Profile Info', detail: 'Updated successfully' },
                  { label: 'Agent Identity', detail: formData.agentName || `${formData.name.split(' ')[0]}'s AI Agent` },
                ] : [
                  { label: 'Agentic Role Payment', detail: 'Payment Method will be billed', color: 'var(--db-nvidia-green)' },
                  { label: 'Personal Agent Created', detail: `${formData.name.split(' ')[0]}'s AI ${agentType}` },
                  { label: 'Sub-Agents Deployed', detail: `${subAgentCount} specialists auto-assigned` },
                  { label: 'Ethical Wall Configured', detail: 'Matter-level access control active' },
                  { label: 'NVIDIA NemoClaw Sandbox', detail: 'Isolated runtime provisioned' },
                ]).map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <CheckCircle size={14} color="#16a34a" />
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--db-text-primary)' }}>{item.label}</span>
                    <span style={{ fontSize: '0.6875rem', color: item.color || 'var(--db-text-muted)', marginLeft: 'auto', fontWeight: item.color ? 600 : 400 }}>{item.detail}</span>
                  </div>
                ))}
              </div>
            </div>

          ) : (
            <>
              {error && (
                <div style={{
                  padding: '10px 12px', borderRadius: '8px',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444',
                  fontSize: '0.75rem', marginBottom: '16px', fontWeight: 600,
                }}>
                  {error}
                </div>
              )}

              {/* Row 1: Name + Email */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--db-text-muted)', marginBottom: '6px' }}>
                    Full Name *
                  </label>
                  <input
                    className="ob-form-input"
                    style={{ marginBottom: 0, width: '100%', opacity: isManagingPartner ? 0.6 : 1 }}
                    placeholder="Jane Doe"
                    value={formData.name}
                    onChange={e => update('name', capitalizeWords(e.target.value))}
                    disabled={isManagingPartner}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--db-text-muted)', marginBottom: '6px' }}>
                    Email *
                  </label>
                  <input
                    className="ob-form-input"
                    style={{ marginBottom: 0, width: '100%', opacity: isManagingPartner ? 0.6 : 1 }}
                    type="email"
                    placeholder="jane@firm.com"
                    value={formData.email}
                    onChange={e => update('email', e.target.value)}
                    disabled={isManagingPartner}
                  />
                </div>
              </div>

              {/* Row 2: Role + Supervising Partner */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--db-text-muted)', marginBottom: '6px' }}>
                    Role
                  </label>
                  <select
                    className="ob-form-select"
                    style={{ marginBottom: 0, width: '100%', opacity: isManagingPartner ? 0.6 : 1 }}
                    value={formData.role}
                    onChange={e => update('role', e.target.value)}
                    disabled={isManagingPartner}
                  >
                    {formData.role === 'solo-partner' && <option value="solo-partner">Solo Practitioner</option>}
                    <optgroup label="Practice of Law">
                      {EMPLOYEE_ROLES.filter(r => r.division === 'practice' && r.value !== 'solo-partner').map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Business of Law">
                      {EMPLOYEE_ROLES.filter(r => r.division === 'business').map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                {!PARTNER_ROLES.includes(formData.role) && partners.length > 0 && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--db-text-muted)', marginBottom: '6px' }}>
                      Supervising Partner
                    </label>
                    <select
                      className="ob-form-select"
                      style={{ marginBottom: 0, width: '100%', opacity: isManagingPartner ? 0.6 : 1 }}
                      value={formData.supervisingPartnerId || ''}
                      onChange={e => update('supervisingPartnerId', e.target.value || null)}
                      disabled={isManagingPartner}
                    >
                      <option value="">Select partner...</option>
                      {partners.map((p, pi) => (
                        <option key={pi} value={p.email}>{p.name || `Partner ${pi + 1}`}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

            {/* Row 4: Photo Management */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--db-text-muted)', marginBottom: '6px' }}>
                Profile Photo
              </label>
              
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  style={{ 
                    width: '64px', height: '64px', borderRadius: '12px', 
                    background: 'var(--db-bg)', border: '2px dashed var(--db-border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', overflow: 'hidden', position: 'relative'
                  }}
                >
                  {formData.photoURL ? (
                    <img src={formData.photoURL} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Plus size={20} color="var(--db-text-muted)" />
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    style={{ display: 'none' }} 
                    accept="image/*" 
                  />
                </div>
                
                <div style={{ flex: 1 }}>
                  <button 
                    className="db-btn db-btn-secondary db-btn-sm" 
                    onClick={() => fileInputRef.current?.click()}
                    style={{ marginBottom: '8px', width: '100%' }}
                  >
                    Upload Local Photo
                  </button>
                  <input
                    className="ob-form-input"
                    style={{ marginBottom: 0, width: '100%', fontSize: '0.6875rem', padding: '6px 10px' }}
                    placeholder="Or paste image URL..."
                    value={formData.photoURL?.startsWith('data:') ? '' : formData.photoURL}
                    onChange={e => update('photoURL', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Row 5: Agent Name */}
            {initialData && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--db-text-muted)', marginBottom: '6px' }}>
                  Personal Agent Name
                </label>
                <input
                  className="ob-form-input"
                  style={{ marginBottom: 0, width: '100%' }}
                  placeholder={`${formData.name.split(' ')[0]}'s AI Agent`}
                  value={formData.agentName || ''}
                  onChange={e => update('agentName', e.target.value)}
                />
              </div>
            )}

            {/* Agent Auto-Provisioning Summary */}
            <div style={{
              padding: '16px', background: 'rgba(118,185,0,0.05)',
              border: '1px solid rgba(118,185,0,0.15)', borderRadius: '10px',
              marginBottom: '20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Bot size={14} color="var(--db-nvidia-green)" />
                <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--db-nvidia-green)' }}>Agent Auto-Provisioning</span>
                <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: 'var(--db-text-muted)' }}>No configuration required</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--db-text-muted)', marginBottom: '3px' }}>Agent Identity</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--db-text-primary)' }}>
                    {formData.agentName || (formData.name ? `${formData.name.split(' ')[0]}'s AI Agent` : 'Auto-named on save')}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--db-text-muted)', marginBottom: '3px' }}>Agent Type</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--db-text-primary)' }}>{agentType}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--db-text-muted)', marginBottom: '3px' }}>Sub-Agents</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--db-text-primary)' }}>{subAgentCount} auto-assigned</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--db-text-muted)', marginBottom: '3px' }}>Status</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#16a34a' }}>Ready on save</span>
                  </div>
                </div>
              </div>
            </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
                {initialData?.id && !isManagingPartner && (
                  <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isConfirmingDelete ? (
                      <>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#ef4444' }}>Are you sure?</span>
                        <button className="db-btn db-btn-secondary db-btn-sm" onClick={() => setIsConfirmingDelete(false)} disabled={removing}>No, Cancel</button>
                        <button className="db-btn db-btn-sm" style={{ background: '#ef4444', color: '#fff', borderColor: '#ef4444' }} onClick={handleRemove} disabled={removing}>
                          {removing ? 'Removing...' : 'Yes, Remove'}
                        </button>
                      </>
                    ) : (
                      <button className="db-btn db-btn-secondary" style={{ color: '#ef4444', borderColor: 'transparent', padding: '0 8px' }} onClick={() => setIsConfirmingDelete(true)}>
                        <Trash2 size={16} style={{ marginRight: '6px' }} /> Remove Resource
                      </button>
                    )}
                  </div>
                )}
                <button className="db-btn db-btn-secondary" onClick={onClose} disabled={saving || removing}>Cancel</button>
                <button
                  className="db-btn db-btn-primary"
                  onClick={handleSave}
                  disabled={saving || removing || !formData.name.trim() || !formData.email.trim()}
                >
                  {saving 
                    ? (initialData?.id ? 'Saving Changes...' : 'Authorizing Payment & Provisioning...') 
                    : (initialData?.id ? 'Save Changes' : 'Authorize & Provision AI')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
