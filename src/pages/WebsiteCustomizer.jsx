import { useState, useMemo, useCallback } from 'react';
import {
  Globe, Monitor, Tablet, Smartphone, User, Palette, Image, MessageSquare,
  ChevronRight, Save, Eye, Phone, Mail, MapPin, Type, Building2,
  CheckCircle2, Sparkles, Bot, ToggleLeft, ToggleRight, X
} from 'lucide-react';
import { generateCustomWebsite } from '../lib/websiteGenerator';

const COLOR_PRESETS = [
  { name: 'Navy Classic', primary: '#1a365d', accent: '#76b900', bg: '#ffffff', warm: '#faf8f5' },
  { name: 'Charcoal Gold', primary: '#1f2937', accent: '#d4a843', bg: '#ffffff', warm: '#faf7f2' },
  { name: 'Oxford Blue', primary: '#002147', accent: '#c5a55a', bg: '#ffffff', warm: '#f8f6f3' },
  { name: 'Forest Green', primary: '#1b4332', accent: '#95d5b2', bg: '#ffffff', warm: '#f5faf7' },
  { name: 'Burgundy', primary: '#5c1a1b', accent: '#c9a96e', bg: '#ffffff', warm: '#faf5f2' },
  { name: 'Slate Modern', primary: '#334155', accent: '#3b82f6', bg: '#ffffff', warm: '#f8fafc' },
  { name: 'Deep Purple', primary: '#3b0764', accent: '#a78bfa', bg: '#ffffff', warm: '#faf5ff' },
  { name: 'Black Tie', primary: '#0a0a0a', accent: '#76b900', bg: '#ffffff', warm: '#fafafa' },
];

const DEFAULT_CONFIG = {
  firmName: '',
  tagline: 'Trusted Legal Counsel',
  phone: '(555) 123-4567',
  email: '',
  address: '123 Main Street, Suite 400',
  city: 'New York, NY 10001',
  description: '',
  attorneys: [
    { name: 'James Anderson', title: 'Managing Partner', initials: 'JA' },
    { name: 'Sarah Chen', title: 'Senior Associate', initials: 'SC' },
    { name: 'Michael Torres', title: 'Of Counsel', initials: 'MT' },
  ],
  practiceAreas: ['Business Litigation', 'Corporate Law', 'Contract Law', 'Real Estate', 'Employment Law', 'Intellectual Property'],
  colors: { ...COLOR_PRESETS[0] },
  chatAgent: {
    enabled: true,
    name: 'Legal Assistant',
    greeting: 'Hello! How can I help you today? I can answer questions about our services, schedule consultations, or connect you with an attorney.',
    avatar: 'bot',
    position: 'right',
    primaryColor: '#1a365d',
    capabilities: ['text', 'voice'],
  },
};

const TABS = [
  { id: 'profile', Icon: User, label: 'Profile' },
  { id: 'colors', Icon: Palette, label: 'Colors' },
  { id: 'photos', Icon: Image, label: 'Photos' },
  { id: 'agent', Icon: MessageSquare, label: 'AI Agent' },
];

export default function WebsiteCustomizer() {
  const [activeTab, setActiveTab] = useState('profile');
  const [previewMode, setPreviewMode] = useState('desktop');
  const [config, setConfig] = useState(null);
  const [domain, setDomain] = useState('');
  const [saved, setSaved] = useState(false);

  // Initialize from URL params or firm data
  const initFromDomain = useCallback((d) => {
    const firmName = d
      .replace(/^www\./, '')
      .replace(/\.(com|net|org|law|legal|attorney|lawyer)$/i, '')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
    const displayName = firmName.includes('Law') ? firmName : firmName + ' Law';
    setDomain(d);
    setConfig({
      firmName: displayName,
      tagline: DEFAULT_CONFIG.tagline,
      phone: DEFAULT_CONFIG.phone,
      email: `contact@${d}`,
      address: DEFAULT_CONFIG.address,
      city: DEFAULT_CONFIG.city,
      description: `With decades of combined experience, ${displayName} delivers strategic legal representation that achieves results. From complex litigation to corporate transactions, we fight for what matters.`,
      attorneys: DEFAULT_CONFIG.attorneys.map(a => ({ ...a })),
      practiceAreas: [...DEFAULT_CONFIG.practiceAreas],
      colors: { ...DEFAULT_CONFIG.colors },
      chatAgent: { ...DEFAULT_CONFIG.chatAgent, primaryColor: DEFAULT_CONFIG.colors.primary, capabilities: [...DEFAULT_CONFIG.chatAgent.capabilities] },
    });
  }, []);

  const updateConfig = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };
  const updateColors = (colors) => {
    setConfig(prev => ({
      ...prev,
      colors: { ...prev.colors, ...colors },
      chatAgent: { ...prev.chatAgent, primaryColor: colors.primary || prev.chatAgent.primaryColor },
    }));
    setSaved(false);
  };
  const updateAgent = (key, value) => {
    setConfig(prev => ({ ...prev, chatAgent: { ...prev.chatAgent, [key]: value } }));
    setSaved(false);
  };
  const updateAttorney = (idx, key, value) => {
    setConfig(prev => {
      const attorneys = [...prev.attorneys];
      attorneys[idx] = { ...attorneys[idx], [key]: value };
      if (key === 'name' && value.trim()) {
        attorneys[idx].initials = value.trim().split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);
      }
      return { ...prev, attorneys };
    });
    setSaved(false);
  };

  const generatedHtml = useMemo(() => {
    if (!config || !domain) return '';
    try {
      return generateCustomWebsite(config, domain);
    } catch (e) {
      console.error('Website generation error:', e);
      return '<html><body style="font-family:sans-serif;padding:40px;color:#666"><h2>Preview loading...</h2><p>There was an issue generating the preview. Please try updating a field.</p></body></html>';
    }
  }, [config, domain]);

  const previewWidth = previewMode === 'desktop' ? '100%' : previewMode === 'tablet' ? '768px' : '375px';

  const handleSave = () => setSaved(true);

  // Show domain input if not initialized
  if (!config) {
    return (
      <>
        <div className="db-page-header">
          <h1 className="db-page-title">Website Customizer</h1>
          <p className="db-page-subtitle">
            Customize every aspect of your law firm website — profile, colors, photos, and AI chat agent.
          </p>
        </div>
        <div className="db-card" style={{ maxWidth: '560px', margin: '0 auto', textAlign: 'center', padding: '48px 32px' }}>
          <Globe size={48} color="var(--db-text-muted)" style={{ opacity: 0.3, marginBottom: '16px' }} />
          <div style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '8px' }}>Enter your website domain</div>
          <p style={{ fontSize: '0.875rem', color: 'var(--db-text-secondary)', marginBottom: '24px' }}>
            We'll generate a base website you can fully customize.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input
              type="text"
              placeholder="e.g. www.smithlaw.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && domain.trim() && initFromDomain(domain.trim())}
              style={{
                flex: 1, padding: '12px 16px', border: '1.5px solid var(--db-border)',
                borderRadius: 'var(--db-radius)', fontSize: '0.875rem', fontFamily: 'var(--db-font)',
                color: 'var(--db-text-primary)', background: 'var(--db-surface)', outline: 'none',
              }}
            />
            <button
              className="db-btn db-btn-accent"
              onClick={() => domain.trim() && initFromDomain(domain.trim())}
              disabled={!domain.trim()}
            >
              Build Website
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '0', margin: '-24px', height: 'calc(100vh - 60px)' }}>
      {/* ═══ LEFT: CUSTOMIZATION PANEL ═══ */}
      <div style={{
        width: '340px', minWidth: '340px', background: 'var(--db-surface)',
        borderRight: '1px solid var(--db-border)', display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Panel Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--db-border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--db-text-primary)' }}>Customize Website</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)' }}>{domain}</div>
          </div>
          <button onClick={handleSave} className="db-btn db-btn-accent db-btn-sm" style={{ gap: '4px' }}>
            {saved ? <><CheckCircle2 size={12} /> Saved</> : <><Save size={12} /> Save</>}
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', borderBottom: '1px solid var(--db-border)', padding: '0 8px',
        }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1, padding: '10px 4px', border: 'none', background: 'none',
                cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: '4px', fontSize: '0.6875rem', fontWeight: 600,
                color: activeTab === tab.id ? 'var(--db-nvidia-green)' : 'var(--db-text-muted)',
                borderBottom: activeTab === tab.id ? '2px solid var(--db-nvidia-green)' : '2px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              <tab.Icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
          {activeTab === 'profile' && <ProfileTab config={config} updateConfig={updateConfig} updateAttorney={updateAttorney} />}
          {activeTab === 'colors' && <ColorsTab config={config} updateColors={updateColors} />}
          {activeTab === 'photos' && <PhotosTab config={config} />}
          {activeTab === 'agent' && <AgentTab config={config} updateAgent={updateAgent} />}
        </div>
      </div>

      {/* ═══ RIGHT: LIVE PREVIEW ═══ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#e5e7eb' }}>
        {/* Preview Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 20px', background: 'var(--db-sidebar-bg)',
          borderBottom: '1px solid var(--db-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff5f57' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#febc2e' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#28c840' }} />
            </div>
            <div style={{
              padding: '4px 14px', background: 'rgba(255,255,255,0.06)',
              borderRadius: '6px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)',
              fontFamily: 'monospace',
            }}>
              <Globe size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
              {domain}
            </div>
            <span style={{
              padding: '2px 8px', background: 'rgba(118,185,0,0.2)',
              borderRadius: '4px', fontSize: '0.625rem', fontWeight: 700,
              color: '#76b900', textTransform: 'uppercase',
            }}>
              Live Preview
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {[
              { mode: 'desktop', Icon: Monitor },
              { mode: 'tablet', Icon: Tablet },
              { mode: 'mobile', Icon: Smartphone },
            ].map(({ mode, Icon }) => (
              <button
                key={mode}
                onClick={() => setPreviewMode(mode)}
                style={{
                  padding: '6px 10px', border: 'none', borderRadius: '6px',
                  background: previewMode === mode ? 'rgba(118,185,0,0.2)' : 'transparent',
                  color: previewMode === mode ? '#76b900' : 'rgba(255,255,255,0.4)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  transition: 'all 0.15s',
                }}
              >
                <Icon size={14} />
              </button>
            ))}
          </div>
        </div>

        {/* Iframe */}
        <div style={{
          flex: 1, padding: previewMode === 'desktop' ? 0 : '20px',
          display: 'flex', justifyContent: 'center', overflow: 'auto',
        }}>
          <div style={{
            width: previewWidth, maxWidth: '100%', transition: 'width 0.4s ease',
            boxShadow: previewMode !== 'desktop' ? '0 8px 40px rgba(0,0,0,0.15)' : 'none',
            borderRadius: previewMode !== 'desktop' ? '12px' : 0, overflow: 'hidden',
            background: '#fff', height: previewMode === 'desktop' ? '100%' : 'fit-content',
          }}>
            <iframe
              srcDoc={generatedHtml}
              title="Website Preview"
              style={{ width: '100%', height: '100%', minHeight: '600px', border: 'none', display: 'block' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ TAB COMPONENTS ═══════════════════════════════════════ */

const fieldStyle = {
  width: '100%', padding: '10px 12px', border: '1.5px solid var(--db-border)',
  borderRadius: '8px', fontSize: '0.8125rem', fontFamily: 'var(--db-font)',
  color: 'var(--db-text-primary)', background: 'var(--db-bg)', outline: 'none',
};
const labelStyle = {
  display: 'block', fontSize: '0.75rem', fontWeight: 600,
  color: 'var(--db-text-secondary)', marginBottom: '4px',
};

function ProfileTab({ config, updateConfig, updateAttorney }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--db-text-muted)' }}>
        Firm Information
      </div>
      <div>
        <label style={labelStyle}>Firm Name</label>
        <input style={fieldStyle} value={config.firmName} onChange={e => updateConfig('firmName', e.target.value)} />
      </div>
      <div>
        <label style={labelStyle}>Tagline</label>
        <input style={fieldStyle} value={config.tagline} onChange={e => updateConfig('tagline', e.target.value)} />
      </div>
      <div>
        <label style={labelStyle}>About / Description</label>
        <textarea style={{ ...fieldStyle, minHeight: '80px', resize: 'vertical' }} value={config.description} onChange={e => updateConfig('description', e.target.value)} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div>
          <label style={labelStyle}>Phone</label>
          <input style={fieldStyle} value={config.phone} onChange={e => updateConfig('phone', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Email</label>
          <input style={fieldStyle} value={config.email} onChange={e => updateConfig('email', e.target.value)} />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Address</label>
        <input style={fieldStyle} value={config.address} onChange={e => updateConfig('address', e.target.value)} />
      </div>
      <div>
        <label style={labelStyle}>City, State ZIP</label>
        <input style={fieldStyle} value={config.city} onChange={e => updateConfig('city', e.target.value)} />
      </div>

      {/* Attorneys */}
      <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--db-text-muted)', marginTop: '8px' }}>
        Attorneys
      </div>
      {config.attorneys.map((atty, i) => (
        <div key={i} style={{
          padding: '12px', background: 'var(--db-bg)', borderRadius: '8px',
          border: '1px solid var(--db-border)',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={labelStyle}>Name</label>
              <input style={fieldStyle} value={atty.name} onChange={e => updateAttorney(i, 'name', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Title</label>
              <input style={fieldStyle} value={atty.title} onChange={e => updateAttorney(i, 'title', e.target.value)} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ColorsTab({ config, updateColors }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--db-text-muted)' }}>
        Color Presets
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {COLOR_PRESETS.map(preset => (
          <button
            key={preset.name}
            onClick={() => updateColors(preset)}
            style={{
              padding: '10px', border: config.colors.name === preset.name ? '2px solid var(--db-nvidia-green)' : '1.5px solid var(--db-border)',
              borderRadius: '8px', background: 'var(--db-bg)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', gap: '3px' }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: preset.primary }} />
              <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: preset.accent }} />
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--db-text-primary)' }}>{preset.name}</span>
          </button>
        ))}
      </div>

      <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--db-text-muted)', marginTop: '8px' }}>
        Custom Colors
      </div>
      {[
        { key: 'primary', label: 'Primary Color' },
        { key: 'accent', label: 'Accent Color' },
        { key: 'bg', label: 'Background' },
        { key: 'warm', label: 'Section Background' },
      ].map(({ key, label }) => (
        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="color"
            value={config.colors[key]}
            onChange={e => updateColors({ [key]: e.target.value })}
            style={{ width: '36px', height: '36px', border: '1.5px solid var(--db-border)', borderRadius: '8px', cursor: 'pointer', padding: '2px' }}
          />
          <div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--db-text-primary)' }}>{label}</div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)', fontFamily: 'monospace' }}>{config.colors[key]}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PhotosTab({ config }) {
  const photoSlots = [
    { id: 'hero', label: 'Hero Background', desc: 'Recommended: 1920x800px', current: null },
    { id: 'about', label: 'About Section', desc: 'Recommended: 800x600px', current: null },
    { id: 'office', label: 'Office Photo', desc: 'Recommended: 1200x600px', current: null },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--db-text-muted)' }}>
        Website Photos
      </div>
      {photoSlots.map(slot => (
        <div key={slot.id} style={{
          padding: '16px', background: 'var(--db-bg)', borderRadius: '8px',
          border: '1.5px dashed var(--db-border)', textAlign: 'center', cursor: 'pointer',
          transition: 'border-color 0.2s',
        }}>
          <Image size={24} color="var(--db-text-muted)" style={{ opacity: 0.4, marginBottom: '8px' }} />
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--db-text-primary)' }}>{slot.label}</div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)', marginBottom: '8px' }}>{slot.desc}</div>
          <button className="db-btn db-btn-secondary db-btn-sm">Upload Photo</button>
        </div>
      ))}

      <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--db-text-muted)', marginTop: '8px' }}>
        Attorney Headshots
      </div>
      {config.attorneys.map((atty, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '12px', background: 'var(--db-bg)', borderRadius: '8px',
          border: '1px solid var(--db-border)',
        }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            background: config.colors.primary, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: '0.875rem', fontWeight: 700, flexShrink: 0,
          }}>
            {atty.initials}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{atty.name}</div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)' }}>{atty.title}</div>
          </div>
          <button className="db-btn db-btn-secondary db-btn-sm">Upload</button>
        </div>
      ))}
    </div>
  );
}

function AgentTab({ config, updateAgent }) {
  const agent = config.chatAgent;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Enable Toggle */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', background: agent.enabled ? 'var(--db-accent-subtle)' : 'var(--db-bg)',
        borderRadius: '8px', border: `1px solid ${agent.enabled ? 'var(--db-accent)' : 'var(--db-border)'}`,
        cursor: 'pointer',
      }} onClick={() => updateAgent('enabled', !agent.enabled)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Bot size={20} color={agent.enabled ? 'var(--db-accent)' : 'var(--db-text-muted)'} />
          <div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--db-text-primary)' }}>
              AI Chat Agent
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)' }}>
              GoHighLevel-style multimodal assistant
            </div>
          </div>
        </div>
        {agent.enabled ? (
          <ToggleRight size={28} color="var(--db-accent)" />
        ) : (
          <ToggleLeft size={28} color="var(--db-text-muted)" />
        )}
      </div>

      {agent.enabled && (
        <>
          <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--db-text-muted)' }}>
            Agent Configuration
          </div>
          <div>
            <label style={labelStyle}>Agent Name</label>
            <input style={fieldStyle} value={agent.name} onChange={e => updateAgent('name', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Greeting Message</label>
            <textarea
              style={{ ...fieldStyle, minHeight: '72px', resize: 'vertical' }}
              value={agent.greeting}
              onChange={e => updateAgent('greeting', e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Widget Position</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['left', 'right'].map(pos => (
                <button
                  key={pos}
                  onClick={() => updateAgent('position', pos)}
                  style={{
                    flex: 1, padding: '8px', border: agent.position === pos ? '2px solid var(--db-nvidia-green)' : '1.5px solid var(--db-border)',
                    borderRadius: '8px', background: 'var(--db-bg)', cursor: 'pointer',
                    fontSize: '0.8125rem', fontWeight: 600, color: 'var(--db-text-primary)',
                    textTransform: 'capitalize',
                  }}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={labelStyle}>Agent Color</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="color"
                value={agent.primaryColor}
                onChange={e => updateAgent('primaryColor', e.target.value)}
                style={{ width: '36px', height: '36px', border: '1.5px solid var(--db-border)', borderRadius: '8px', cursor: 'pointer', padding: '2px' }}
              />
              <div style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)', fontFamily: 'monospace' }}>{agent.primaryColor}</div>
            </div>
          </div>

          <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--db-text-muted)', marginTop: '4px' }}>
            Capabilities
          </div>
          {[
            { id: 'text', label: 'Text Chat', desc: 'Respond to visitor messages in real-time' },
            { id: 'voice', label: 'Voice Input', desc: 'Allow visitors to send voice messages' },
            { id: 'scheduling', label: 'Appointment Booking', desc: 'Schedule consultations directly in chat' },
            { id: 'documents', label: 'Document Upload', desc: 'Accept case documents from visitors' },
          ].map(cap => {
            const isOn = agent.capabilities.includes(cap.id);
            return (
              <div
                key={cap.id}
                onClick={() => {
                  updateAgent('capabilities',
                    isOn ? agent.capabilities.filter(c => c !== cap.id) : [...agent.capabilities, cap.id]
                  );
                }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', background: isOn ? 'var(--db-accent-subtle)' : 'var(--db-bg)',
                  borderRadius: '8px', border: `1px solid ${isOn ? 'var(--db-accent)' : 'var(--db-border)'}`,
                  cursor: 'pointer',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--db-text-primary)' }}>{cap.label}</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)' }}>{cap.desc}</div>
                </div>
                {isOn ? <CheckCircle2 size={16} color="var(--db-accent)" /> : <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid var(--db-border)' }} />}
              </div>
            );
          })}

          {/* Preview Widget */}
          <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--db-text-muted)', marginTop: '4px' }}>
            Widget Preview
          </div>
          <div style={{
            background: 'var(--db-bg)', borderRadius: '12px', padding: '16px',
            border: '1px solid var(--db-border)', position: 'relative',
          }}>
            {/* Mini chat widget preview */}
            <div style={{
              background: agent.primaryColor, borderRadius: '12px', padding: '14px 16px',
              color: '#fff', maxWidth: '260px', marginLeft: agent.position === 'right' ? 'auto' : 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: 'rgba(255,255,255,0.15)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Bot size={14} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>{agent.name}</div>
                  <div style={{ fontSize: '0.625rem', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#4ade80' }} /> Online
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', lineHeight: 1.5, opacity: 0.9 }}>
                {agent.greeting.length > 100 ? agent.greeting.slice(0, 100) + '...' : agent.greeting}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
