import { useState, useEffect } from 'react';
import { 
  Sparkles, FileText, Send, Eye, Clock, CheckCircle2, BarChart3, MessageSquare,
  Globe, Share2, MoreVertical, RefreshCw, Layers
} from 'lucide-react';
import { getMarketingDrafts } from '../../lib/internalAgentAPI';
const TYPE_CONFIG = {
  blog: { icon: FileText, color: '#3b82f6', label: 'Blog Post' },
  linkedin: { icon: MessageSquare, color: '#0077b5', label: 'LinkedIn' },
  changelog: { icon: Layers, color: '#a78bfa', label: 'Changelog' },
  newsletter: { icon: Globe, color: '#16a34a', label: 'Newsletter' },
};

const STATUS_CONFIG = {
  draft: { color: '#64748b', label: 'Draft' },
  pending_approval: { color: '#f59e0b', label: 'Pending Approval' },
  approved: { color: '#16a34a', label: 'Approved' },
  published: { color: '#76b900', label: 'Published' },
};

export default function GTMContentDrafts() {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDraft, setSelectedDraft] = useState(null);

  const loadDrafts = async () => {
    setLoading(true);
    try {
      const data = await getMarketingDrafts();
      setDrafts(data);
    } catch (err) {
      console.error('Failed to load drafts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrafts();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'rgba(255,255,255,0.4)' }}>
        <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite', marginRight: '8px' }} />
        Loading AI drafts...
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        <KpiCard label="Drafts Pending" value={drafts.filter(d => d.status === 'pending_approval').length} icon={Clock} color="#f59e0b" sub="Needs review" />
        <KpiCard label="Approved Today" value={drafts.filter(d => d.status === 'approved').length} icon={CheckCircle2} color="#16a34a" sub="Ready to ship" />
        <KpiCard label="Avg SEO Score" value="84/100" icon={BarChart3} color="#3b82f6" sub="Agent-optimized" />
        <KpiCard label="Last Publish" value="2h ago" icon={Share2} color="#76b900" sub="LinkedIn post" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '20px' }}>
        {/* Left: Draft List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {drafts.length === 0 ? (
            <div style={{ padding: '40px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', textAlign: 'center', color: 'rgba(255,255,255,0.2)' }}>
              <FileText size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
              <div>No drafts generated yet. Trigger the Marketing Agent to start.</div>
            </div>
          ) : (
            drafts.map(draft => (
              <div 
                key={draft.id} 
                onClick={() => setSelectedDraft(draft)}
                style={{
                  padding: '16px 20px', borderRadius: '12px', 
                  background: selectedDraft?.id === draft.id ? 'rgba(118,185,0,0.06)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${selectedDraft?.id === draft.id ? '#76b90040' : 'rgba(255,255,255,0.06)'}`,
                  cursor: 'pointer', transition: 'all 0.2s', position: 'relative', overflow: 'hidden'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <TypeBadge type={draft.type} />
                  <StatusBadge status={draft.status} />
                  <div style={{ flex: 1 }} />
                  <div style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.3)' }}>{formatDate(draft.createdAt)}</div>
                </div>
                
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>{draft.title}</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {draft.content}
                </div>

                <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
                  {draft.keywords?.map((k, i) => (
                    <span key={i} style={{ fontSize: '0.5625rem', color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>#{k}</span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right: Preview & Action */}
        <div>
          {selectedDraft ? (
            <div style={{ 
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', 
              borderRadius: '16px', padding: '24px', position: 'sticky', top: '24px',
              animation: 'slideInRight 0.3s ease-out'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  <TypeBadge type={selectedDraft.type} />
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginTop: '8px' }}>{selectedDraft.title}</div>
                  <div style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Generated by Marketing Agent · {formatDate(selectedDraft.createdAt)}</div>
                </div>
                <button style={{ padding: '4px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}>
                  <MoreVertical size={16} />
                </button>
              </div>

              <div style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', marginBottom: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '0.5625rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '4px' }}>Target Audience</div>
                    <div style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 600 }}>{selectedDraft.targetAudience}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.5625rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '4px' }}>SEO Score</div>
                    <div style={{ fontSize: '0.75rem', color: '#76b900', fontWeight: 800 }}>{selectedDraft.seoScore}/100</div>
                  </div>
                </div>
              </div>

              <div style={{ 
                fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, 
                maxHeight: '300px', overflow: 'auto', paddingRight: '8px', marginBottom: '24px',
                whiteSpace: 'pre-wrap'
              }}>
                {selectedDraft.content}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button style={{ 
                  padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', 
                  border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.8125rem',
                  fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}>
                  <Eye size={16} /> Preview Mode
                </button>
                <button style={{ 
                  padding: '12px', borderRadius: '10px', background: 'linear-gradient(135deg, #76b900, #4a7a00)', 
                  border: 'none', color: '#fff', fontSize: '0.8125rem',
                  fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}>
                  <Send size={16} /> Approve & Publish
                </button>
              </div>
            </div>
          ) : (
            <div style={{ 
              height: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              border: '2px dashed rgba(255,255,255,0.06)', borderRadius: '16px', color: 'rgba(255,255,255,0.2)'
            }}>
              <Sparkles size={40} style={{ marginBottom: '12px', opacity: 0.2 }} />
              <div style={{ fontSize: '0.875rem' }}>Select a draft to preview and approve</div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '0.5625rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>{label}</span>
        <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={12} color={color} />
        </div>
      </div>
      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>{value}</div>
      <div style={{ fontSize: '0.5625rem', color: 'rgba(255,255,255,0.3)' }}>{sub}</div>
    </div>
  );
}

function TypeBadge({ type }) {
  const cfg = TYPE_CONFIG[type] || { icon: FileText, color: '#64748b', label: 'Other' };
  const Icon = cfg.icon;
  return (
    <span style={{ 
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '2px 8px', borderRadius: '6px', fontSize: '0.5625rem', fontWeight: 700,
      background: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}30`
    }}>
      <Icon size={10} /> {cfg.label}
    </span>
  );
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { color: '#64748b', label: 'Unknown' };
  return (
    <span style={{ 
      padding: '2px 8px', borderRadius: '6px', fontSize: '0.5625rem', fontWeight: 700,
      background: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}30`
    }}>{cfg.label}</span>
  );
}

function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
