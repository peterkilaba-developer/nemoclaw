import { useState } from 'react';
import DocumentBundler from './DocumentBundler';
import { ChevronRight, FileText, Layers } from 'lucide-react';

const COURT_FORMS = [
  'Subpoena Duces Tecum',
  'Summons & Complaint',
  'Divorce Petition',
  'Notice of Appearance',
];

export default function ParalegalCanvas({ _firmId, _user, _activeMatter }) {
  // DocumentBundler owns live bundle generation.
  const [selectedForm, setSelectedForm] = useState('');

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', minHeight: 0, overflowY: 'auto' }}>
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
             {COURT_FORMS.map(form => (
               <button key={form} className="db-btn db-btn-secondary" style={{ width: '100%', justifyContent: 'space-between' }} onClick={() => setSelectedForm(current => current === form ? '' : form)}>
                 <span>Review {form}</span> <ChevronRight size={14} />
               </button>
             ))}
             {selectedForm && (
               <div style={{ padding: '12px', borderRadius: '6px', border: '1px solid var(--db-border)', background: 'var(--db-bg)' }}>
                 <div style={{ fontSize: '0.8125rem', fontWeight: 700, marginBottom: '6px' }}>{selectedForm}</div>
                 <div style={{ fontSize: '0.75rem', lineHeight: 1.5, color: 'var(--db-text-secondary)' }}>AI-prepared template opened for attorney review. Confirm caption, parties, jurisdiction, service details, and filing requirements before use.</div>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
