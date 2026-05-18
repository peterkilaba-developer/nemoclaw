import DocumentBundler from './DocumentBundler';
import { ChevronRight, FileText, Layers } from 'lucide-react';

export default function ParalegalCanvas({ _firmId, _user, _activeMatter }) {
  // DocumentBundler owns live bundle generation.

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--db-text-primary)' }}>Paralegal Workbench</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--db-text-muted)', margin: '4px 0 0 0' }}>Review Nemo's automated Exhibit bundling, autofilled court templates, and docket checks.</p>
        </div>
      </div>

      <div className="db-two-col" style={{ alignItems: 'flex-start' }}>
        {/* Document Bundler Module */}
        <div className="db-card" style={{ flex: 1.5 }}>
          <div className="db-card-header">
            <div className="db-card-title"><Layers size={16} style={{ marginRight: '8px' }} /> Nemo Document Bundler</div>
          </div>
          <div style={{ padding: '16px' }}>
            <DocumentBundler />
          </div>
        </div>

        {/* Court Forms Module */}
        <div className="db-card" style={{ flex: 1 }}>
          <div className="db-card-header">
            <div className="db-card-title"><FileText size={16} style={{ marginRight: '8px' }} /> AI Auto-Drafted Forms</div>
          </div>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
             <p style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)', margin: '0 0 8px 0' }}>Nemo AI has proactively populated these templates based on global firm context. Review prior to filing.</p>
             <button className="db-btn db-btn-secondary" style={{ width: '100%', justifyContent: 'space-between' }}>
               <span>Review Subpoena Duces Tecum</span> <ChevronRight size={14} />
             </button>
             <button className="db-btn db-btn-secondary" style={{ width: '100%', justifyContent: 'space-between' }}>
               <span>Review Summons & Complaint</span> <ChevronRight size={14} />
             </button>
             <button className="db-btn db-btn-secondary" style={{ width: '100%', justifyContent: 'space-between' }}>
               <span>Review Divorce Petition</span> <ChevronRight size={14} />
             </button>
             <button className="db-btn db-btn-secondary" style={{ width: '100%', justifyContent: 'space-between' }}>
               <span>Review Notice of Appearance</span> <ChevronRight size={14} />
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
