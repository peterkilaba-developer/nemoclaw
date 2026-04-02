import { useState, useRef } from 'react';
import { useFirm } from '../contexts/FirmContext';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Upload, FileText, Trash2, Check, X, Key, Copy, Eye, EyeOff } from 'lucide-react';

export default function FirmSettings() {
  const { user } = useAuth();
  const { firm, firmId, employees, refreshFirm } = useFirm();
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [knowledgeDocs, setKnowledgeDocs] = useState([]);
  const [showApiKey, setShowApiKey] = useState(false);
  const fileInputRef = useRef(null);

  // Editable fields
  const [editFields, setEditFields] = useState({
    firmName: '',
    stateBar: '',
    practiceAreas: '',
    contactName: '',
    contactEmail: '',
  });

  const firmName = firm?.firmName || firm?.name || 'Not configured';
  const stateBar = firm?.stateBar || firm?.practiceArea || '—';
  const practiceAreas = firm?.practiceAreas?.join(', ') || firm?.practiceArea || '—';
  const firmSize = employees?.length ? `${employees.length} team member${employees.length > 1 ? 's' : ''}` : '—';
  const primaryContact = user?.displayName || '—';
  const email = user?.email || '—';

  const startEditing = () => {
    setEditFields({
      firmName: firm?.firmName || firm?.name || '',
      stateBar: firm?.stateBar || firm?.practiceArea || '',
      practiceAreas: (firm?.practiceAreas || []).join(', ') || firm?.practiceArea || '',
      contactName: user?.displayName || '',
      contactEmail: user?.email || '',
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const saveProfile = async () => {
    if (!firmId) return;
    setSaving(true);
    try {
      const areas = editFields.practiceAreas
        .split(',').map(a => a.trim()).filter(Boolean);
      await updateDoc(doc(db, 'firms', firmId), {
        firmName: editFields.firmName,
        name: editFields.firmName,
        stateBar: editFields.stateBar,
        practiceAreas: areas,
        practiceArea: editFields.stateBar,
        updatedAt: serverTimestamp(),
      });
      if (refreshFirm) await refreshFirm();
      setIsEditing(false);
    } catch (err) {
      console.error('Error saving firm profile:', err);
    }
    setSaving(false);
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

  const removeDoc = (idx) => {
    setKnowledgeDocs(prev => prev.filter((_, i) => i !== idx));
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'knowledge', label: 'Knowledge Base' },
    { id: 'team', label: 'Team' },
    { id: 'api', label: 'API Keys' },
  ];

  return (
    <>
      <div className="db-page-header">
        <h1 className="db-page-title">Firm Settings</h1>
        <p className="db-page-subtitle">Manage your firm profile, knowledge base, team members, and integrations.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '28px', borderBottom: '1px solid var(--db-border)', paddingBottom: '0' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
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

      {/* ═══════════════ PROFILE TAB ═══════════════ */}
      {activeTab === 'profile' && (
        <div className="db-card" style={{ marginBottom: '24px' }}>
          <div className="db-card-header">
            <div className="db-card-title">Firm Profile</div>
            {!isEditing ? (
              <button className="db-btn db-btn-secondary db-btn-sm" onClick={startEditing}>Edit</button>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="db-btn db-btn-primary db-btn-sm"
                  onClick={saveProfile}
                  disabled={saving}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  {saving ? <><span className="auth-spinner" style={{ width: '12px', height: '12px', borderTopColor: '#000' }} /> Saving...</> : <><Check size={14} /> Save</>}
                </button>
                <button className="db-btn db-btn-secondary db-btn-sm" onClick={cancelEditing} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <X size={14} /> Cancel
                </button>
              </div>
            )}
          </div>

          {!isEditing ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {[
                { label: 'Firm Name', value: firmName },
                { label: 'State Bar / Jurisdiction', value: stateBar },
                { label: 'Practice Areas', value: practiceAreas },
                { label: 'Firm Size', value: firmSize },
                { label: 'Primary Contact', value: primaryContact },
                { label: 'Email', value: email },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--db-text-muted)', marginBottom: '4px' }}>{item.label}</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--db-text-primary)' }}>{item.value}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--db-text-muted)', marginBottom: '4px' }}>Firm Name</label>
                <input
                  type="text"
                  value={editFields.firmName}
                  onChange={(e) => setEditFields(prev => ({ ...prev, firmName: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--db-bg)', border: '1px solid var(--db-border)', borderRadius: '6px', fontSize: '0.875rem', color: 'var(--db-text-primary)', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--db-text-muted)', marginBottom: '4px' }}>State Bar / Jurisdiction</label>
                <input
                  type="text"
                  value={editFields.stateBar}
                  onChange={(e) => setEditFields(prev => ({ ...prev, stateBar: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--db-bg)', border: '1px solid var(--db-border)', borderRadius: '6px', fontSize: '0.875rem', color: 'var(--db-text-primary)', outline: 'none' }}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--db-text-muted)', marginBottom: '4px' }}>Practice Areas (comma-separated)</label>
                <input
                  type="text"
                  value={editFields.practiceAreas}
                  onChange={(e) => setEditFields(prev => ({ ...prev, practiceAreas: e.target.value }))}
                  placeholder="e.g. Corporate Law, Real Estate, Employment"
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--db-bg)', border: '1px solid var(--db-border)', borderRadius: '6px', fontSize: '0.875rem', color: 'var(--db-text-primary)', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--db-text-muted)', marginBottom: '4px' }}>Firm Size</label>
                <div style={{ padding: '8px 12px', fontSize: '0.875rem', color: 'var(--db-text-secondary)' }}>{firmSize}</div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--db-text-muted)', marginBottom: '4px' }}>Primary Contact</label>
                <div style={{ padding: '8px 12px', fontSize: '0.875rem', color: 'var(--db-text-secondary)' }}>{primaryContact}</div>
              </div>
            </div>
          )}
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
                    onClick={() => removeDoc(i)}
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
            <div className="db-card-title">Team Members</div>
            <button className="db-btn db-btn-primary db-btn-sm" onClick={() => window.location.href = '/dashboard/team'}>Manage in HR & AR</button>
          </div>
          <div className="db-feed">
            {employees?.length > 0 ? employees.map((member, i) => (
              <div key={member.id || i} className="db-feed-item">
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%', background: 'var(--db-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: 700, color: 'var(--db-text-secondary)', flexShrink: 0
                }}>
                  {(member.name || '?').split(' ').map(n => n[0]).join('')}
                </div>
                <div className="db-feed-content">
                  <div className="db-feed-title">{member.name} · <span style={{ fontWeight: 400, color: 'var(--db-text-muted)' }}>{member.role || 'Team Member'}</span></div>
                  <div className="db-feed-desc">{member.email}</div>
                </div>
              </div>
            )) : (
              <div style={{ padding: '24px', textAlign: 'center', fontSize: '0.8125rem', color: 'var(--db-text-muted)' }}>
                No team members configured. Add your team in <a href="/dashboard/team" style={{ color: 'var(--db-nvidia-green)' }}>HR & AR</a>.
              </div>
            )}
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
    </>
  );
}
