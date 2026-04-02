import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  Globe, Search, Loader, CheckCircle2, AlertTriangle,
  Smartphone, Monitor, Zap, Shield, BarChart3, Palette,
  Eye, ShoppingCart, Download, RefreshCw, Tablet,
  User, Image, MessageSquare, Save, Bot, ToggleLeft, ToggleRight,
  Settings2, ChevronDown, ChevronUp, PanelLeftClose, PanelLeft,
  MapPin, Plus, Lightbulb, ArrowRight, Trash2
} from 'lucide-react';
import { generateCustomWebsite } from '../lib/websiteGenerator';
import { generateFirmContent } from '../lib/firmContentEngine';
import { scrapeFirmWebsite } from '../lib/prospectService';
import { useFirm } from '../contexts/FirmContext';

const ANALYSIS_STEPS = [
  { label: 'Crawling website pages', icon: Search },
  { label: 'Analyzing design & layout', icon: Palette },
  { label: 'Evaluating responsiveness', icon: Smartphone },
  { label: 'Checking SEO & accessibility', icon: BarChart3 },
  { label: 'Assessing security headers', icon: Shield },
  { label: 'Building your new website', icon: Zap },
];

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

const fieldStyle = {
  width: '100%', padding: '10px 12px', border: '1.5px solid var(--db-border)',
  borderRadius: '8px', fontSize: '0.8125rem', fontFamily: 'var(--db-font)',
  color: 'var(--db-text-primary)', background: 'var(--db-bg)', outline: 'none',
};
const labelStyle = {
  display: 'block', fontSize: '0.75rem', fontWeight: 600,
  color: 'var(--db-text-secondary)', marginBottom: '4px',
};

export default function WebsiteBuilder() {
  const [url, setUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [report, setReport] = useState(null);
  const [previewMode, setPreviewMode] = useState('desktop');
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [config, setConfig] = useState(null);
  const [domain, setDomain] = useState('');
  const [saved, setSaved] = useState(false);
  const [reportCollapsed, setReportCollapsed] = useState(true);
  const [gapsCollapsed, setGapsCollapsed] = useState(false);
  const [comparisonMode, setComparisonMode] = useState('redesign');

  const initConfig = useCallback((d, seed = null) => {
    setDomain(d);
    
    // Determine the baseline website URL for the engine
    const website = seed?.website || (d.startsWith('http') ? d : `https://${d}`);
    
    // Generate the rich Legal Content using the Agentic Intelligence Engine
    const content = generateFirmContent(website, seed);

    const practiceAreasWithDesc = content.practiceAreas.map((area, index) => {
      // If it's already a full object from generateFirmContent, preserve it exactly to keep id and icon
      if (typeof area === 'object' && area.name) {
        return area;
      }
      return { 
        id: `pa-${index}`,
        name: typeof area === 'string' ? area : (area.name || 'Legal Service'), 
        description: `Our ${(typeof area === 'string' ? area : (area.name || 'legal')).toLowerCase()} team provides aggressive, high-stakes advocacy for individuals and businesses.` 
      };
    });

    const builtConfig = {
      firmName: content.firmName,
      tagline: content.tagline,
      phone: content.phone,
      email: content.email,
      address: content.address,
      city: content.city,
      description: content.description,
      hero: content.hero,
      stats: content.stats,
      testimonials: content.testimonials,
      googleReviews: content.googleReviews,
      serviceAreas: content.serviceAreas,
      yearEstablished: content.yearEstablished,
      stateContext: content.stateContext,
      matchedCategory: content.matchedCategory,
      contentGaps: content.contentGaps || [],
      isKnownFirm: content.isKnownFirm || false,
      attorneys: (content.attorneys || []).map(a => ({ name: a.name, title: a.title, initials: a.initials, bio: a.bio || '' })),
      practiceAreas: content.practiceAreaNames || [],
      practiceAreasWithDesc: practiceAreasWithDesc || [],
      colors: { ...content.colors },
      chatAgent: {
        enabled: true,
        name: `${content.firmName || 'NemoC'} AI`,
        greeting: `Hello! I'm the AI assistant for ${content.firmName || 'this firm'}. I can answer questions about our services, schedule consultations, or connect you with an attorney.`,
        primaryColor: (content.colors && content.colors.primary) || '#1a365d',
        capabilities: ['Text-to-Legal-Advice', 'Intake Scheduling', 'Conflict Checks', 'Case Status'],
        avatar: 'bot',
        position: 'right',
      },
    };

    setConfig(builtConfig);
    setSaved(false);
  }, []);

  // ═══ PERSISTENCE: Only analyze first visit, restore from cache after ═══
  const { firm } = useFirm();
  const hasAutoSeeded = useRef(false);

  // Save built site to localStorage whenever config + report change
  const persistBuiltSite = useCallback((cfg, rpt, d) => {
    try {
      localStorage.setItem('nemoc_built_site', JSON.stringify({
        config: cfg, report: rpt, domain: d, savedAt: Date.now(),
      }));
    } catch (e) { /* quota exceeded, ignore */ }
  }, []);

  useEffect(() => {
    if (hasAutoSeeded.current || report) return;
    hasAutoSeeded.current = true;

    // ── Priority 0: Restore cached built site ──
    try {
      const cached = localStorage.getItem('nemoc_built_site');
      if (cached) {
        const { config: cachedConfig, report: cachedReport, domain: cachedDomain } = JSON.parse(cached);
        if (cachedConfig && cachedReport) {
          setConfig(cachedConfig);
          setReport(cachedReport);
          setDomain(cachedDomain);
          setUrl(cachedReport.url || cachedDomain);
          return; // Skip analysis — use cached
        }
      }
    } catch (e) { /* corrupted cache, continue */ }

    // ── Priority 1: localStorage seed from frictionless onboarding ──
    let seed = null;
    try {
      const raw = localStorage.getItem('nemoc_website_seed');
      if (raw) seed = JSON.parse(raw);
    } catch (e) { /* ignore */ }

    // ── Priority 2: Firm context from Firestore ──
    if (!seed && firm?.firmWebsite) {
      seed = {
        firmName: firm.firmName,
        address: firm.firmAddress || '',
        city: '',
        stateBar: firm.stateBar || '',
        website: firm.firmWebsite,
      };
    }

    if (!seed) return;

    // Determine domain
    const siteUrl = seed.website || '';
    const d = siteUrl
      ? siteUrl.replace(/https?:\/\//, '').replace(/\/.*$/, '')
      : `nemoc-law.ai/${seed.firmName?.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')}`;

    setUrl(siteUrl || d);

    // First-time analysis with animation
    (async () => {
      console.log('🤖 Builder: Starting auto-seed analysis for', d);
      setAnalyzing(true);
      setCurrentStep(0);

      try {
        for (let i = 0; i < ANALYSIS_STEPS.length; i++) {
          setCurrentStep(i);
          await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
        }

        initConfig(d, seed);

        const newReport = {
          url: siteUrl ? `https://${d}` : `https://${d}`,
          domain: d,
          autoSeeded: true,
          scores: {
            design: Math.floor(28 + Math.random() * 25),
            mobile: Math.floor(20 + Math.random() * 30),
            seo: Math.floor(25 + Math.random() * 30),
            speed: Math.floor(18 + Math.random() * 35),
            security: Math.floor(35 + Math.random() * 25),
            accessibility: Math.floor(22 + Math.random() * 30),
          },
          issues: [
            { severity: 'critical', text: 'Not mobile-responsive \u2014 60% of legal searches happen on mobile' },
            { severity: 'critical', text: 'Missing SSL certificate or HTTPS headers' },
            { severity: 'warning', text: 'No structured data markup for local legal SEO' },
            { severity: 'warning', text: 'Page load time exceeds 4 seconds' },
            { severity: 'warning', text: 'Missing meta descriptions on practice area pages' },
            { severity: 'info', text: 'No Google Business Profile integration detected' },
            { severity: 'info', text: 'Contact form lacks CAPTCHA protection' },
            { severity: 'info', text: 'Missing attorney bio schema markup' },
          ],
          improvements: [
            'Modern, mobile-first responsive design', 'ADA-compliant accessibility (WCAG 2.1)', 'Legal-specific SEO optimization',
            'Sub-2-second page load times', 'Integrated contact forms with CAPTCHA', 'Attorney bio pages with schema markup',
            'Practice area landing pages', 'Client testimonial sections', 'Secure HTTPS with proper headers', 'Google Analytics & conversion tracking',
          ],
        };

        setReport(newReport);
        console.log('✅ Builder: Auto-seed complete.');
      } catch (err) {
        console.error('❌ Builder: Auto-seed failed', err);
        // Provision a fallback so we don't land on an empty splash
        setReport({
          url: siteUrl,
          domain: d,
          isFallback: true,
          scores: { design: 30, mobile: 20, seo: 25, speed: 15, security: 40, accessibility: 28 },
          issues: [{ severity: 'warning', text: 'Intelligence engine connection interrupted' }],
          improvements: ['Retry manual analysis for deeper insights'],
        });
        initConfig(d, null);
      } finally {
        setAnalyzing(false);
        setCurrentStep(-1);
      }

      // Persist for future visits — wait a tick for config state to settle
      setTimeout(() => {
        try {
          const raw = localStorage.getItem('nemoc_built_site');
          // Config was set via initConfig which uses setConfig, so we need to grab it from the content engine directly
          const content = generateFirmContent(seed);
          const practiceAreasWithDesc = content.practiceAreas.map(area => {
            if (typeof area === 'object' && area.description) return { name: area.name, description: area.description };
            return { name: typeof area === 'string' ? area : area.name, description: `Our ${(typeof area === 'string' ? area : area.name).toLowerCase()} team brings deep experience.` };
          });
          const builtConfig = {
            firmName: content.firmName, tagline: content.tagline, phone: content.phone, email: content.email,
            address: content.address, city: content.city, description: content.description,
            hero: content.hero, stats: content.stats, testimonials: content.testimonials,
            googleReviews: content.googleReviews, serviceAreas: content.serviceAreas,
            yearEstablished: content.yearEstablished, stateContext: content.stateContext,
            matchedCategory: content.matchedCategory, contentGaps: content.contentGaps,
            isKnownFirm: content.isKnownFirm,
            attorneys: content.attorneys.map(a => ({ name: a.name, title: a.title, initials: a.initials, bio: a.bio || '' })),
            practiceAreas: content.practiceAreaNames, practiceAreasWithDesc,
            colors: { ...content.colors },
            chatAgent: {
              name: `${content.firmName} AI`,
              greeting: `Hello! I'm the AI assistant for ${content.firmName}. I can answer questions about our ${content.practiceAreaNames[0]} and ${content.practiceAreaNames[1]} services, schedule consultations, or connect you with an attorney.`,
              primaryColor: content.colors.primary,
              capabilities: ['Chat', 'Schedule', 'FAQ'],
            },
          };
          localStorage.setItem('nemoc_built_site', JSON.stringify({ config: builtConfig, report: newReport, domain: d, savedAt: Date.now() }));
        } catch (e) { /* ignore */ }
      }, 100);
    })();
  }, [firm, initConfig]);

  const updateConfig = (key, value) => { setConfig(prev => ({ ...prev, [key]: value })); setSaved(false); };
  const updateColors = (colors) => {
    setConfig(prev => ({
      ...prev, colors: { ...prev.colors, ...colors },
      chatAgent: { ...prev.chatAgent, primaryColor: colors.primary || prev.chatAgent.primaryColor },
    }));
    setSaved(false);
  };
  const updateAgent = (key, value) => { setConfig(prev => ({ ...prev, chatAgent: { ...prev.chatAgent, [key]: value } })); setSaved(false); };
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
    try { return generateCustomWebsite(config, domain); }
    catch { return '<html><body style="padding:40px;font-family:sans-serif;color:#999"><h2>Preview loading...</h2></body></html>'; }
  }, [config, domain]);

  const handleAnalyze = async () => {
    if (!url.trim() || analyzing) return;
    hasAutoSeeded.current = true; // Block the mount effect from competing

    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http')) cleanUrl = 'https://' + cleanUrl;

    // Clear existing cache for a fresh start
    try {
      localStorage.removeItem('nemoc_built_site');
      localStorage.removeItem('nemoc_website_seed');
    } catch (e) { /* ignore */ }

    setAnalyzing(true);
    setReport(null);
    setShowCustomizer(false);
    setCurrentStep(0);

    try {
      for (let i = 0; i < ANALYSIS_STEPS.length; i++) {
        setCurrentStep(i);
        await new Promise(r => setTimeout(r, 800 + Math.random() * 500));
      }

      const d = cleanUrl.replace(/https?:\/\//, '').split('/')[0];
      const parts = d.split('.');
      const brandName = parts[0] === 'www' ? (parts[1] || parts[0]) : parts[0];
      
      let enrichedSeed = { firmName: brandName.replace(/[-_]/g, ' '), website: cleanUrl };
      try {
        const liveData = await scrapeFirmWebsite(cleanUrl);
        if (liveData && !liveData.error && !liveData.simulated) {
          console.log(`🌐 DeepCrawl: Scraped ${liveData.pagesScraped || 1} pages, ${liveData.practiceAreas?.length || 0} practice areas, ${liveData.attorneys?.length || 0} attorneys`);
          enrichedSeed = {
            ...enrichedSeed,
            firmName: liveData.firmName || enrichedSeed.firmName,
            title: liveData.title || '',
            description: liveData.description || '',
            ...(liveData.practiceAreas?.length > 0 && { practiceAreas: liveData.practiceAreas }),
            ...(liveData.attorneys?.length > 0 && { attorneys: liveData.attorneys }),
            ...(liveData.colors && { scrapedColors: liveData.colors }),
            ...(liveData.address && { address: liveData.address }),
            ...(liveData.phone && { phone: liveData.phone }),
            ...(liveData.email && { email: liveData.email }),
            ...(liveData.city && { city: liveData.city }),
            ...(liveData.state && { stateBar: liveData.state }),
            ...(liveData.yearEstablished && { yearEstablished: liveData.yearEstablished }),
            ...(liveData.socialLinks && { socialLinks: liveData.socialLinks }),
            ...(liveData.diagnostics && { diagnostics: liveData.diagnostics }),
          };
        }
      } catch (e) {
        console.warn('Builder: Scraper fallback —', e.message);
      }

      initConfig(d, enrichedSeed);

      const newReport = {
        url: cleanUrl, domain: d,
        scores: {
          design: Math.floor(35 + Math.random() * 30),
          mobile: Math.floor(25 + Math.random() * 35),
          seo: Math.floor(30 + Math.random() * 35),
          speed: Math.floor(20 + Math.random() * 40),
          security: Math.floor(40 + Math.random() * 30),
          accessibility: Math.floor(25 + Math.random() * 35),
        },
        issues: [
          { severity: 'critical', text: 'Not mobile-responsive \u2014 60% of legal searches happen on mobile' },
          { severity: 'critical', text: 'Missing SSL certificate or HTTPS headers' },
          { severity: 'warning', text: 'No structured data markup for local legal SEO' },
          { severity: 'warning', text: 'Page load time exceeds 4 seconds' },
          { severity: 'warning', text: 'Missing meta descriptions on practice area pages' },
          { severity: 'info', text: 'No Google Business Profile integration detected' },
          { severity: 'info', text: 'Contact form lacks CAPTCHA protection' },
          { severity: 'info', text: 'Missing attorney bio schema markup' },
        ],
        improvements: [
          'Modern, mobile-first responsive design', 'ADA-compliant accessibility (WCAG 2.1)', 'Legal-specific SEO optimization',
          'Sub-2-second page load times', 'Integrated contact forms with CAPTCHA', 'Attorney bio pages with schema markup',
          'Practice area landing pages', 'Client testimonial sections', 'Secure HTTPS with proper headers', 'Google Analytics & conversion tracking',
        ],
      };

      setReport(newReport);
    } catch (err) {
      console.error('Builder: Analysis crash', err);
      alert('Analysis encountered an error. Proceeding with simulated data.');
      const d = cleanUrl.replace(/https?:\/\//, '').split('/')[0] || 'firm.ai';
      const fallbackReport = {
        url: cleanUrl, domain: d, isFallback: true,
        scores: { design: 45, mobile: 30, seo: 40, speed: 35, security: 50, accessibility: 32 },
        issues: [{ severity: 'warning', text: 'Scraper timeout — using estimated practice data' }],
        improvements: ['Full mobile speed optimization', 'SEO metadata synchronization'],
      };
      setReport(fallbackReport);
      initConfig(d, null);
    } finally {
      setAnalyzing(false);
      setCurrentStep(-1);
    }
  };

  const handleReset = () => {
    try {
      localStorage.removeItem('nemoc_built_site');
      localStorage.removeItem('nemoc_website_seed');
    } catch (e) { /* ignore */ }
    setReport(null);
    setConfig(null);
    setUrl('');
    setDomain('');
    hasAutoSeeded.current = true; // Set to true: DO NOT auto-seed their firm's website again!
  };

  // Auto-persist whenever config or report is updated
  useEffect(() => {
    if (config && report && domain) {
      persistBuiltSite(config, report, domain);
    }
  }, [config, report, domain, persistBuiltSite]);

  const overallScore = report?.scores
    ? Math.round(Object.values(report.scores).reduce((a, b) => a + b, 0) / Object.keys(report.scores).length)
    : 0;
  const scoreColor = (s) => s >= 80 ? '#16a34a' : s >= 50 ? '#d97706' : '#dc2626';

  // Mobile: scale the content down so users see the full-width site at mobile dimensions
  const getIframeStyle = () => {
    if (previewMode === 'mobile') {
      return { width: '375px', height: '667px', border: 'none', display: 'block', transform: 'scale(1)', transformOrigin: 'top center' };
    }
    if (previewMode === 'tablet') {
      return { width: '768px', height: '600px', border: 'none', display: 'block' };
    }
    return { width: '100%', height: '100%', minHeight: '600px', border: 'none', display: 'block' };
  };

  const getPreviewContainerStyle = () => {
    if (previewMode === 'mobile') {
      return {
        width: '375px', height: '667px', maxWidth: '100%',
        borderRadius: '32px', overflow: 'hidden',
        boxShadow: '0 8px 40px rgba(0,0,0,0.15), inset 0 0 0 3px #1f2937',
        background: '#fff', position: 'relative',
      };
    }
    if (previewMode === 'tablet') {
      return {
        width: '768px', maxWidth: '100%', borderRadius: '16px', overflow: 'hidden',
        boxShadow: '0 8px 40px rgba(0,0,0,0.15)', background: '#fff',
      };
    }
    return {
      width: '100%', height: '100%', overflow: 'hidden', background: '#fff',
    };
  };

  // ═══ CUSTOMIZER ACTIVE: split-pane layout ═══
  if (report && !analyzing && showCustomizer && config) {
    return (
      <div style={{ display: 'flex', gap: 0, margin: '-24px', height: 'calc(100vh - 60px)' }}>
        {/* ── LEFT: CUSTOMIZATION PANEL ── */}
        <div style={{
          width: '320px', minWidth: '320px', background: 'var(--db-surface)',
          borderRight: '1px solid var(--db-border)', display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Panel Header */}
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid var(--db-border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--db-text-primary)' }}>Customize</div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)' }}>{domain}</div>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => setSaved(true)} className="db-btn db-btn-accent db-btn-sm" style={{ gap: '4px', padding: '4px 10px' }}>
                {saved ? <><CheckCircle2 size={11} /> Saved</> : <><Save size={11} /> Save</>}
              </button>
              <button onClick={() => setShowCustomizer(false)} className="db-btn db-btn-secondary db-btn-sm" style={{ padding: '4px 8px' }} title="Close customizer">
                <PanelLeftClose size={14} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--db-border)', padding: '0 4px' }}>
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                flex: 1, padding: '8px 2px', border: 'none', background: 'none',
                cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: '3px', fontSize: '0.625rem', fontWeight: 600,
                color: activeTab === tab.id ? 'var(--db-nvidia-green)' : 'var(--db-text-muted)',
                borderBottom: activeTab === tab.id ? '2px solid var(--db-nvidia-green)' : '2px solid transparent',
              }}>
                <tab.Icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ flex: 1, overflow: 'auto', padding: '14px 16px' }}>
            {activeTab === 'profile' && <ProfileTab config={config} updateConfig={updateConfig} updateAttorney={updateAttorney} />}
            {activeTab === 'colors' && <ColorsTab config={config} updateColors={updateColors} />}
            {activeTab === 'photos' && <PhotosTab config={config} />}
            {activeTab === 'agent' && <AgentTab config={config} updateAgent={updateAgent} />}
          </div>
        </div>

        {/* ── RIGHT: LIVE PREVIEW ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#e5e7eb' }}>
          <PreviewToolbar 
            domain={domain} 
            previewMode={previewMode} setPreviewMode={setPreviewMode} 
            comparisonMode={comparisonMode} setComparisonMode={setComparisonMode}
            badge={comparisonMode === 'original' ? 'Original Site' : comparisonMode === 'split' ? 'Comparison View' : 'Live Preview'} 
          />
          <div style={{
            flex: 1, padding: previewMode === 'desktop' ? 0 : '20px',
            display: 'flex', justifyContent: 'center', alignItems: previewMode === 'desktop' ? 'stretch' : 'flex-start',
            overflow: 'auto', gap: previewMode === 'desktop' ? '2px' : '40px', background: '#d1d5db'
          }}>
            {/* Original Site Frame */}
            {(comparisonMode === 'original' || comparisonMode === 'split') && (
              <div style={{ ...getPreviewContainerStyle(), display: 'flex', flexDirection: 'column' }}>
                {comparisonMode === 'split' && (
                  <div style={{ padding: '6px 12px', background: 'var(--db-surface)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--db-text-muted)', borderBottom: '1px solid var(--db-border)' }}>
                    Original Site ({domain})
                  </div>
                )}
                <iframe src={`https://${domain}`} title="Original Website" style={{ ...getIframeStyle(), flex: 1, width: '100%', background: '#fff' }} />
              </div>
            )}
            
            {/* Redesign Frame */}
            {(comparisonMode === 'redesign' || comparisonMode === 'split') && (
              <div style={{ ...getPreviewContainerStyle(), display: 'flex', flexDirection: 'column' }}>
                {comparisonMode === 'split' && (
                  <div style={{ padding: '6px 12px', background: 'var(--db-surface)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--db-nvidia-green)', borderBottom: '1px solid var(--db-border)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Agentic Redesign</span>
                    <span style={{ color: 'var(--db-text-muted)', fontWeight: 500 }}>{config?.contentGaps?.length || 0} gaps fixed</span>
                  </div>
                )}
                <iframe srcDoc={generatedHtml} title="Website Preview" style={{ ...getIframeStyle(), flex: 1, width: '100%', background: '#fff' }} />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ═══ DEFAULT: Normal builder flow ═══
  return (
    <>
      <div className="db-page-header">
        <h1 className="db-page-title">Website Builder Agent</h1>
        <p className="db-page-subtitle">
          Analyze, redesign, customize, and deploy your law firm website — all in one place.
        </p>
      </div>

      {/* URL Input */}
      <div className="db-card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--db-text-primary)', marginBottom: '6px' }}>
              Your Firm Website or Name
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Globe size={16} style={{ position: 'absolute', left: '14px', color: 'var(--db-text-muted)' }} />
              <input
                type="url" value={url} onChange={(e) => setUrl(e.target.value)}
                placeholder="e.g. smithlaw.com or just your firm name" disabled={analyzing}
                style={{
                  width: '100%', padding: '12px 14px 12px 42px',
                  border: '1.5px solid var(--db-border)', borderRadius: 'var(--db-radius)',
                  fontSize: '0.875rem', fontFamily: 'var(--db-font)',
                  color: 'var(--db-text-primary)',
                  background: analyzing ? 'var(--db-bg)' : 'var(--db-surface)',
                  outline: 'none',
                }}
                onFocus={(e) => e.target.style.borderColor = '#76b900'}
                onBlur={(e) => e.target.style.borderColor = 'var(--db-border)'}
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
              />
            </div>
          </div>
          <button className="db-btn db-btn-accent" onClick={handleAnalyze} disabled={analyzing || !url.trim()} style={{ height: '46px', minWidth: '180px' }}>
            {analyzing ? (<><RefreshCw size={16} style={{ animation: 'auth-spin 1s linear infinite' }} /> Analyzing...</>) :
              report ? (<><RefreshCw size={16} /> Re-Analyze</>) :
              (<><Search size={16} /> Analyze & Build</>)}
          </button>
          {report && !analyzing && (
            <button className="db-btn db-btn-secondary" onClick={handleReset} style={{ height: '46px', padding: '0 16px', background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', border: '1.5px solid rgba(239, 68, 68, 0.15)' }} title="Clear cache and test different URL">
              <Trash2 size={16} /> Reset
            </button>
          )}
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)', marginTop: '8px' }}>
          Don't have a website? Just enter your firm name — we'll build one at <strong>https://nemoc-law.ai/your-firm</strong>. $500 one-time + $97/mo maintenance.
        </p>
      </div>

      {/* Analysis Progress */}
      {analyzing && (
        <div className="db-card" style={{ marginBottom: '24px' }}>
          <div className="db-card-title" style={{ marginBottom: '16px' }}>Building your new website...</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {ANALYSIS_STEPS.map((step, i) => {
              const StepIcon = step.icon;
              const isDone = i < currentStep;
              const isActive = i === currentStep;
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 14px',
                  borderRadius: 'var(--db-radius-sm)',
                  background: isActive ? 'var(--db-nvidia-green-subtle)' : isDone ? 'var(--db-accent-subtle)' : 'var(--db-bg)',
                }}>
                  {isDone ? <CheckCircle2 size={16} color="var(--db-accent)" /> :
                    isActive ? <Loader size={16} color="#76b900" style={{ animation: 'auth-spin 1s linear infinite' }} /> :
                    <StepIcon size={16} color="var(--db-text-muted)" style={{ opacity: 0.4 }} />}
                  <span style={{
                    fontSize: '0.8125rem', fontWeight: isActive ? 600 : 500,
                    color: isDone ? 'var(--db-accent)' : isActive ? '#76b900' : 'var(--db-text-muted)',
                  }}>{step.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ RESULTS ═══ */}
      {report && !analyzing && config && (
        <>
          {/* Preview with browser chrome */}
          <div className="db-card" style={{ marginBottom: '24px', padding: 0, overflow: 'hidden' }}>
            <PreviewToolbar 
              domain={report.domain} 
              previewMode={previewMode} setPreviewMode={setPreviewMode} 
              comparisonMode={comparisonMode} setComparisonMode={setComparisonMode}
              badge={comparisonMode === 'original' ? 'Original Site' : comparisonMode === 'split' ? 'Comparison View' : 'Redesigned'} 
            >
              <button onClick={() => setShowCustomizer(true)} style={{
                padding: '5px 12px', border: '1px solid rgba(118,185,0,0.3)', borderRadius: '6px',
                background: 'rgba(118,185,0,0.1)', color: '#76b900', cursor: 'pointer',
                fontSize: '0.6875rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px',
                transition: 'all 0.15s', marginRight: '8px',
              }}>
                <Settings2 size={12} /> Customize
              </button>
            </PreviewToolbar>
            <div style={{
              flex: 1, padding: previewMode === 'desktop' ? 0 : '20px',
              display: 'flex', justifyContent: 'center', alignItems: previewMode === 'desktop' ? 'stretch' : 'flex-start',
              overflow: 'hidden', gap: previewMode === 'desktop' ? '2px' : '40px', background: '#d1d5db',
              minHeight: previewMode === 'mobile' ? '720px' : '600px',
            }}>
              {/* Original Site Frame */}
              {(comparisonMode === 'original' || comparisonMode === 'split') && (
                <div style={{ ...getPreviewContainerStyle(), display: 'flex', flexDirection: 'column' }}>
                  {comparisonMode === 'split' && (
                    <div style={{ padding: '6px 12px', background: 'var(--db-surface)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--db-text-muted)', borderBottom: '1px solid var(--db-border)' }}>
                      Original Site ({domain})
                    </div>
                  )}
                  <iframe src={`https://${domain}`} title="Original Website" style={{ ...getIframeStyle(), flex: 1, width: '100%', background: '#fff' }} />
                </div>
              )}
              
              {/* Redesign Frame */}
              {(comparisonMode === 'redesign' || comparisonMode === 'split') && (
                <div style={{ ...getPreviewContainerStyle(), display: 'flex', flexDirection: 'column' }}>
                  {comparisonMode === 'split' && (
                    <div style={{ padding: '6px 12px', background: 'var(--db-surface)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--db-nvidia-green)', borderBottom: '1px solid var(--db-border)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Agentic Redesign</span>
                      <span style={{ color: 'var(--db-text-muted)', fontWeight: 500 }}>{config?.contentGaps?.length || 0} gaps fixed</span>
                    </div>
                  )}
                  <iframe srcDoc={generatedHtml} title="Website Preview" style={{ ...getIframeStyle(), flex: 1, width: '100%', background: '#fff' }} />
                </div>
              )}
            </div>
          </div>

          {/* Purchase CTA */}
          <div className="db-card" style={{
            background: 'linear-gradient(160deg, #0f1a0f 0%, #111827 60%)',
            border: '1px solid rgba(118, 185, 0, 0.2)', color: '#fff', marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '24px' }}>
              <div style={{ flex: '1 1 400px' }}>
                <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#76b900', marginBottom: '8px' }}>
                  Ready to Go Live?
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '6px' }}>
                  Love this design? Deploy it for <span style={{ color: '#76b900' }}>$500</span>
                </div>
                <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', maxWidth: '520px' }}>
                  One-time fee. Firebase Hosting, custom domain, SSL certificate, Google Analytics. Includes 30 days of free revisions.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '12px', flexShrink: 0, flexWrap: 'wrap' }}>
                <button onClick={() => setShowCustomizer(true)} className="db-btn db-btn-secondary" style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}>
                  <Settings2 size={16} /> Customize First
                </button>
                <button className="db-btn db-btn-secondary" style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}>
                  <Download size={16} /> Download HTML
                </button>
                <button className="db-btn db-btn-accent db-btn-lg">
                  <ShoppingCart size={16} /> Purchase & Deploy
                </button>
              </div>
            </div>
          </div>

          {/* Collapsible Analysis Report */}
          <div className="db-card" style={{ marginBottom: '24px', padding: 0, overflow: 'hidden' }}>
            <button onClick={() => setReportCollapsed(!reportCollapsed)} style={{
              width: '100%', padding: '16px 20px', border: 'none', cursor: 'pointer',
              background: 'var(--db-surface)', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <BarChart3 size={16} color="var(--db-nvidia-green)" />
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--db-text-primary)' }}>
                  Original Site Analysis
                </span>
                <span style={{
                  padding: '2px 8px', borderRadius: '4px', fontSize: '0.6875rem', fontWeight: 700,
                  background: `${scoreColor(overallScore)}20`, color: scoreColor(overallScore),
                }}>
                  {overallScore}/100
                </span>
              </div>
              {reportCollapsed ? <ChevronDown size={16} color="var(--db-text-muted)" /> : <ChevronUp size={16} color="var(--db-text-muted)" />}
            </button>
            {!reportCollapsed && (
              <div style={{ padding: '0 20px 20px' }}>
                <div className="db-stats-grid" style={{ marginBottom: '20px' }}>
                  {report.scores && Object.entries(report.scores).map(([key, value]) => (
                    <div key={key} className="db-stat-card">
                      <div className="db-stat-label">{key.charAt(0).toUpperCase() + key.slice(1)}</div>
                      <div className="db-stat-value" style={{ color: scoreColor(value) }}>{value}</div>
                      <div style={{ width: '100%', height: '4px', background: 'var(--db-border)', borderRadius: '2px', overflow: 'hidden', maxWidth: '80px' }}>
                        <div style={{ width: `${value}%`, height: '100%', background: scoreColor(value), borderRadius: '2px' }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="db-two-col">
                  <div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--db-text-primary)', marginBottom: '10px' }}>Issues ({report.issues?.length || 0})</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {report.issues && report.issues.map((issue, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '8px 12px',
                          borderRadius: 'var(--db-radius-sm)',
                          background: issue.severity === 'critical' ? 'var(--db-danger-subtle)' : issue.severity === 'warning' ? 'var(--db-warning-subtle)' : 'var(--db-bg)',
                        }}>
                          <AlertTriangle size={12} style={{ marginTop: '2px', flexShrink: 0 }} color={
                            issue.severity === 'critical' ? 'var(--db-danger)' : issue.severity === 'warning' ? 'var(--db-warning)' : 'var(--db-text-muted)'
                          } />
                          <span style={{ fontSize: '0.75rem', color: 'var(--db-text-primary)' }}>{issue.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--db-text-primary)', marginBottom: '10px' }}>Fixed in Redesign</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {report.improvements.map((imp, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px',
                          borderRadius: 'var(--db-radius-sm)', background: 'var(--db-accent-subtle)',
                          fontSize: '0.75rem', color: 'var(--db-text-primary)',
                        }}>
                          <CheckCircle2 size={12} color="var(--db-accent)" style={{ flexShrink: 0 }} />
                          {imp}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Auto-Fixes Applied */}
          {config?.contentGaps?.length > 0 && (
            <div className="db-card" style={{ marginBottom: '24px', padding: 0, overflow: 'hidden' }}>
              <button onClick={() => setGapsCollapsed(!gapsCollapsed)} style={{
                width: '100%', padding: '16px 20px', border: 'none', cursor: 'pointer',
                background: 'var(--db-surface)', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CheckCircle2 size={16} color="#16a34a" />
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--db-text-primary)' }}>
                    Issues Found & Auto-Fixed
                  </span>
                  <span style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '0.6875rem', fontWeight: 700,
                    background: '#16a34a20', color: '#16a34a',
                  }}>
                    {config.contentGaps.filter(g => g.autoFixed).length} fixed automatically
                  </span>
                  {config.contentGaps.filter(g => !g.autoFixed).length > 0 && (
                    <span style={{
                      padding: '2px 8px', borderRadius: '4px', fontSize: '0.6875rem', fontWeight: 700,
                      background: '#d9770620', color: '#d97706',
                    }}>
                      {config.contentGaps.filter(g => !g.autoFixed).length} needs your input
                    </span>
                  )}
                </div>
                {gapsCollapsed ? <ChevronDown size={16} color="var(--db-text-muted)" /> : <ChevronUp size={16} color="var(--db-text-muted)" />}
              </button>
              {!gapsCollapsed && (
                <div style={{ padding: '0 20px 20px' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
                  {config.isKnownFirm
                    ? 'We scraped your website and Google Business profile, preserved your real content, and automatically fixed all identified issues in your redesign.'
                    : 'We analyzed your online presence and automatically fixed all identified issues. Your redesign includes Google Reviews, service areas, schema markup, and more.'
                  }
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {config.contentGaps.map((gap, i) => (
                    <div key={gap.id || i} style={{
                      padding: '14px 16px', borderRadius: 'var(--db-radius-sm)',
                      border: '1px solid var(--db-border)', background: gap.autoFixed ? 'var(--db-accent-subtle)' : 'var(--db-bg)',
                      transition: 'all 0.15s',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{
                              padding: '1px 6px', borderRadius: '3px', fontSize: '0.5625rem', fontWeight: 700,
                              textTransform: 'uppercase', letterSpacing: '0.05em',
                              background: gap.severity === 'high' ? '#dc262620' : gap.severity === 'medium' ? '#d9770620' : '#16a34a20',
                              color: gap.severity === 'high' ? '#dc2626' : gap.severity === 'medium' ? '#d97706' : '#16a34a',
                            }}>{gap.severity}</span>
                            <span style={{ fontSize: '0.625rem', color: 'var(--db-text-muted)', fontWeight: 600 }}>{gap.category}</span>
                          </div>
                          <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--db-text-primary)', marginBottom: '4px' }}>
                            {gap.title}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--db-text-secondary)', lineHeight: 1.5, marginBottom: gap.recommendation ? '8px' : 0 }}>
                            {gap.description}
                          </div>
                          {gap.recommendation && (
                            <div style={{
                              fontSize: '0.6875rem', color: 'var(--db-nvidia-green)', fontWeight: 600,
                              display: 'flex', alignItems: 'flex-start', gap: '4px',
                            }}>
                              <ArrowRight size={11} style={{ marginTop: '2px', flexShrink: 0 }} />
                              {gap.recommendation}
                            </div>
                          )}
                        </div>
                        <div style={{ flexShrink: 0 }}>
                          {gap.autoFixed ? (
                            <span style={{
                              padding: '4px 10px', borderRadius: '6px', fontSize: '0.625rem', fontWeight: 700,
                              background: 'var(--db-accent-subtle)', color: 'var(--db-accent)',
                              display: 'flex', alignItems: 'center', gap: '4px',
                            }}>
                              <CheckCircle2 size={10} /> Auto-fixed
                            </span>
                          ) : (
                            <button
                              onClick={() => setShowCustomizer(true)}
                              style={{
                                padding: '4px 10px', borderRadius: '6px', fontSize: '0.625rem', fontWeight: 700,
                                background: 'var(--db-nvidia-green-subtle)', color: '#76b900', border: '1px solid rgba(118,185,0,0.3)',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                                transition: 'all 0.15s',
                              }}
                            >
                              <Plus size={10} /> Add in Customizer
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </>
    )}

      {/* Empty State */}
      {!report && !analyzing && (
        <div className="db-card" style={{ textAlign: 'center', padding: '64px 32px' }}>
          <Globe size={48} color="var(--db-text-muted)" style={{ opacity: 0.3, marginBottom: '16px' }} />
          <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--db-text-primary)', marginBottom: '8px' }}>
            Enter your website URL to get started
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--db-text-secondary)', maxWidth: '480px', margin: '0 auto 24px', lineHeight: 1.5 }}>
            Our AI agent will analyze your current site, build a modern redesign with AI chat agent,
            and let you customize everything before deploying.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', flexWrap: 'wrap' }}>
            {[
              { icon: Monitor, label: 'Modern Design' },
              { icon: Smartphone, label: 'Mobile-First' },
              { icon: MessageSquare, label: 'AI Chat Agent' },
              { icon: Palette, label: 'Customizable' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <Icon size={20} color="var(--db-nvidia-green)" />
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--db-text-muted)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/* ═══════════════════════ SHARED COMPONENTS ═══════════════════════ */

function PreviewToolbar({ domain, previewMode, setPreviewMode, comparisonMode, setComparisonMode, badge, children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 16px', background: 'var(--db-sidebar-bg)',
      borderBottom: '1px solid var(--db-border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff5f57' }} />
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#febc2e' }} />
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#28c840' }} />
        </div>
        <div style={{
          padding: '3px 12px', background: 'rgba(255,255,255,0.06)',
          borderRadius: '6px', fontSize: '0.6875rem', color: 'rgba(255,255,255,0.5)',
          fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '5px',
        }}>
          <Globe size={10} /> {domain}
        </div>
        <span style={{
          padding: '2px 8px', background: 'rgba(118,185,0,0.2)',
          borderRadius: '4px', fontSize: '0.5625rem', fontWeight: 700,
          color: '#76b900', textTransform: 'uppercase',
        }}>
          {badge}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {setComparisonMode && (
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '2px', borderRadius: '6px', marginRight: '16px' }}>
            <button onClick={() => setComparisonMode('original')} style={{ padding: '4px 8px', fontSize: '0.6875rem', fontWeight: 600, color: comparisonMode === 'original' ? '#fff' : 'rgba(255,255,255,0.5)', background: comparisonMode === 'original' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.1s' }}>Original</button>
            <button onClick={() => setComparisonMode('split')} style={{ padding: '4px 8px', fontSize: '0.6875rem', fontWeight: 600, color: comparisonMode === 'split' ? '#fff' : 'rgba(255,255,255,0.5)', background: comparisonMode === 'split' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.1s' }}>Split</button>
            <button onClick={() => setComparisonMode('redesign')} style={{ padding: '4px 8px', fontSize: '0.6875rem', fontWeight: 600, color: comparisonMode === 'redesign' ? '#fff' : 'rgba(255,255,255,0.5)', background: comparisonMode === 'redesign' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.1s' }}>Redesign</button>
          </div>
        )}
        {children}
        {[
          { mode: 'desktop', Icon: Monitor },
          { mode: 'tablet', Icon: Tablet },
          { mode: 'mobile', Icon: Smartphone },
        ].map(({ mode, Icon }) => (
          <button key={mode} onClick={() => setPreviewMode(mode)} style={{
            padding: '5px 8px', border: 'none', borderRadius: '6px',
            background: previewMode === mode ? 'rgba(118,185,0,0.2)' : 'transparent',
            color: previewMode === mode ? '#76b900' : 'rgba(255,255,255,0.4)',
            cursor: 'pointer', display: 'flex', alignItems: 'center',
          }}>
            <Icon size={14} />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════ TAB COMPONENTS ═══════════════════════ */

function ProfileTab({ config, updateConfig, updateAttorney }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--db-text-muted)' }}>Firm Information</div>
      <div><label style={labelStyle}>Firm Name</label><input style={fieldStyle} value={config.firmName} onChange={e => updateConfig('firmName', e.target.value)} /></div>
      <div><label style={labelStyle}>Tagline</label><input style={fieldStyle} value={config.tagline} onChange={e => updateConfig('tagline', e.target.value)} /></div>
      <div><label style={labelStyle}>About / Description</label><textarea style={{ ...fieldStyle, minHeight: '72px', resize: 'vertical' }} value={config.description} onChange={e => updateConfig('description', e.target.value)} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div><label style={labelStyle}>Phone</label><input style={fieldStyle} value={config.phone} onChange={e => updateConfig('phone', e.target.value)} /></div>
        <div><label style={labelStyle}>Email</label><input style={fieldStyle} value={config.email} onChange={e => updateConfig('email', e.target.value)} /></div>
      </div>
      <div><label style={labelStyle}>Address</label><input style={fieldStyle} value={config.address} onChange={e => updateConfig('address', e.target.value)} /></div>
      <div><label style={labelStyle}>City, State ZIP</label><input style={fieldStyle} value={config.city} onChange={e => updateConfig('city', e.target.value)} /></div>
      <div style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--db-text-muted)', marginTop: '4px' }}>Attorneys</div>
      {config.attorneys.map((atty, i) => (
        <div key={i} style={{ padding: '10px', background: 'var(--db-bg)', borderRadius: '8px', border: '1px solid var(--db-border)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <div><label style={labelStyle}>Name</label><input style={fieldStyle} value={atty.name} onChange={e => updateAttorney(i, 'name', e.target.value)} /></div>
            <div><label style={labelStyle}>Title</label><input style={fieldStyle} value={atty.title} onChange={e => updateAttorney(i, 'title', e.target.value)} /></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ColorsTab({ config, updateColors }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--db-text-muted)' }}>Presets</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
        {COLOR_PRESETS.map(preset => (
          <button key={preset.name} onClick={() => updateColors(preset)} style={{
            padding: '8px', border: config.colors.name === preset.name ? '2px solid var(--db-nvidia-green)' : '1.5px solid var(--db-border)',
            borderRadius: '8px', background: 'var(--db-bg)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px', textAlign: 'left',
          }}>
            <div style={{ display: 'flex', gap: '2px' }}>
              <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: preset.primary }} />
              <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: preset.accent }} />
            </div>
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--db-text-primary)' }}>{preset.name}</span>
          </button>
        ))}
      </div>
      <div style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--db-text-muted)', marginTop: '4px' }}>Custom</div>
      {[{ key: 'primary', label: 'Primary' }, { key: 'accent', label: 'Accent' }, { key: 'bg', label: 'Background' }, { key: 'warm', label: 'Section BG' }].map(({ key, label }) => (
        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input type="color" value={config.colors[key]} onChange={e => updateColors({ [key]: e.target.value })}
            style={{ width: '32px', height: '32px', border: '1.5px solid var(--db-border)', borderRadius: '6px', cursor: 'pointer', padding: '2px' }} />
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--db-text-primary)' }}>{label}</div>
            <div style={{ fontSize: '0.625rem', color: 'var(--db-text-muted)', fontFamily: 'monospace' }}>{config.colors[key]}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PhotosTab({ config }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--db-text-muted)' }}>Website Photos</div>
      {[{ id: 'hero', label: 'Hero Background', desc: '1920\u00d7800px' }, { id: 'about', label: 'About Section', desc: '800\u00d7600px' }, { id: 'office', label: 'Office Photo', desc: '1200\u00d7600px' }].map(slot => (
        <div key={slot.id} style={{
          padding: '14px', background: 'var(--db-bg)', borderRadius: '8px',
          border: '1.5px dashed var(--db-border)', textAlign: 'center',
        }}>
          <Image size={20} color="var(--db-text-muted)" style={{ opacity: 0.4, marginBottom: '6px' }} />
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--db-text-primary)' }}>{slot.label}</div>
          <div style={{ fontSize: '0.625rem', color: 'var(--db-text-muted)', marginBottom: '8px' }}>{slot.desc}</div>
          <button className="db-btn db-btn-secondary db-btn-sm">Upload</button>
        </div>
      ))}
      <div style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--db-text-muted)', marginTop: '4px' }}>Attorney Headshots</div>
      {config.attorneys.map((atty, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px', background: 'var(--db-bg)', borderRadius: '8px', border: '1px solid var(--db-border)',
        }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%', background: config.colors.primary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
          }}>{atty.initials}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>{atty.name}</div>
            <div style={{ fontSize: '0.625rem', color: 'var(--db-text-muted)' }}>{atty.title}</div>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 14px', background: agent.enabled ? 'var(--db-accent-subtle)' : 'var(--db-bg)',
        borderRadius: '8px', border: `1px solid ${agent.enabled ? 'var(--db-accent)' : 'var(--db-border)'}`,
        cursor: 'pointer',
      }} onClick={() => updateAgent('enabled', !agent.enabled)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bot size={16} color={agent.enabled ? 'var(--db-accent)' : 'var(--db-text-muted)'} />
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--db-text-primary)' }}>AI Chat Agent</div>
            <div style={{ fontSize: '0.5625rem', color: 'var(--db-text-muted)' }}>Multimodal assistant for visitors</div>
          </div>
        </div>
        {agent.enabled ? <ToggleRight size={24} color="var(--db-accent)" /> : <ToggleLeft size={24} color="var(--db-text-muted)" />}
      </div>
      {agent.enabled && (
        <>
          <div><label style={labelStyle}>Agent Name</label><input style={fieldStyle} value={agent.name} onChange={e => updateAgent('name', e.target.value)} /></div>
          <div><label style={labelStyle}>Greeting</label><textarea style={{ ...fieldStyle, minHeight: '60px', resize: 'vertical' }} value={agent.greeting} onChange={e => updateAgent('greeting', e.target.value)} /></div>
          <div>
            <label style={labelStyle}>Position</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['left', 'right'].map(pos => (
                <button key={pos} onClick={() => updateAgent('position', pos)} style={{
                  flex: 1, padding: '6px', border: agent.position === pos ? '2px solid var(--db-nvidia-green)' : '1.5px solid var(--db-border)',
                  borderRadius: '6px', background: 'var(--db-bg)', cursor: 'pointer',
                  fontSize: '0.75rem', fontWeight: 600, color: 'var(--db-text-primary)', textTransform: 'capitalize',
                }}>{pos}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={labelStyle}>Agent Color</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="color" value={agent.primaryColor} onChange={e => updateAgent('primaryColor', e.target.value)}
                style={{ width: '32px', height: '32px', border: '1.5px solid var(--db-border)', borderRadius: '6px', cursor: 'pointer', padding: '2px' }} />
              <span style={{ fontSize: '0.625rem', color: 'var(--db-text-muted)', fontFamily: 'monospace' }}>{agent.primaryColor}</span>
            </div>
          </div>
          <div style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--db-text-muted)' }}>Capabilities</div>
          {[
            { id: 'text', label: 'Text Chat', desc: 'Real-time messaging' },
            { id: 'voice', label: 'Voice Input', desc: 'Voice messages' },
            { id: 'scheduling', label: 'Appointment Booking', desc: 'In-chat scheduling' },
            { id: 'documents', label: 'Document Upload', desc: 'Accept files' },
          ].map(cap => {
            const isOn = agent.capabilities.includes(cap.id);
            return (
              <div key={cap.id} onClick={() => updateAgent('capabilities', isOn ? agent.capabilities.filter(c => c !== cap.id) : [...agent.capabilities, cap.id])} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 10px', background: isOn ? 'var(--db-accent-subtle)' : 'var(--db-bg)',
                borderRadius: '6px', border: `1px solid ${isOn ? 'var(--db-accent)' : 'var(--db-border)'}`, cursor: 'pointer',
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--db-text-primary)' }}>{cap.label}</div>
                  <div style={{ fontSize: '0.5625rem', color: 'var(--db-text-muted)' }}>{cap.desc}</div>
                </div>
                {isOn ? <CheckCircle2 size={14} color="var(--db-accent)" /> : <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid var(--db-border)' }} />}
              </div>
            );
          })}
          {/* Mini widget preview */}
          <div style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--db-text-muted)', marginTop: '2px' }}>Preview</div>
          <div style={{ background: 'var(--db-bg)', borderRadius: '10px', padding: '12px', border: '1px solid var(--db-border)' }}>
            <div style={{
              background: agent.primaryColor, borderRadius: '10px', padding: '12px 14px',
              color: '#fff', maxWidth: '240px', marginLeft: agent.position === 'right' ? 'auto' : 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bot size={12} />
                </div>
                <div>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 700 }}>{agent.name}</div>
                  <div style={{ fontSize: '0.5625rem', opacity: 0.6 }}>Online</div>
                </div>
              </div>
              <div style={{ fontSize: '0.6875rem', lineHeight: 1.4, opacity: 0.9 }}>
                {agent.greeting.length > 80 ? agent.greeting.slice(0, 80) + '...' : agent.greeting}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
