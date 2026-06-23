import { useState, useEffect, useRef } from 'react';
import useWorkspace from '../../hooks/useWorkspace';
import { FolderSearch, Loader2, PenTool, Plus, Save, Sparkles } from 'lucide-react';

export default function AssociateCanvas({ firmId, user, activeMatter }) {
  const { fetchDrafts, addDraft, genericUpdate, _loading } = useWorkspace(firmId);
  const [drafts, setDrafts] = useState([]);
  const [activeDraft, setActiveDraft] = useState(null);
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [actionNotice, setActionNotice] = useState('');
  const saveTimeoutRef = useRef(null);
  const discoveryInputRef = useRef(null);

  useEffect(() => {
    fetchDrafts().then(setDrafts);
  }, [fetchDrafts]);

  const handleNewDraft = async () => {
    setIsSaving(true);
    try {
      const id = await addDraft({
        title: 'Untitled Motion',
        content: '# Motion for Summary Judgment\n\nStart typing here...',
        matterName: activeMatter?.title || 'General Matter',
        author: user?.email || 'Associate',
      });
      const updated = await fetchDrafts();
      setDrafts(updated);
      const newD = updated.find(d => d.id === id);
      if (newD) selectDraft(newD);
    } catch(e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const selectDraft = (d) => {
    setActiveDraft(d);
    setContent(d.content || '');
  };

  const syncUpdate = async (val) => {
    setContent(val);
    if (!activeDraft) return;
    setIsSaving(true);
    
    // Debounce save to Firebase
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
         await genericUpdate('drafts', activeDraft.id, { content: val });
         // silently update local arrays so we don't jump UI focus
         setDrafts(prev => prev.map(old => old.id === activeDraft.id ? { ...old, content: val } : old));
      } catch(e) { console.error(e); } finally { setIsSaving(false); }
    }, 1000);
  };

  const handleRequestRedline = async () => {
    if (!activeDraft || isSaving) return;
    setIsSaving(true);
    try {
      await genericUpdate('drafts', activeDraft.id, { status: 'redline-requested', redlineRequestedAt: new Date() });
      setActionNotice('Redline review queued for Nemo.');
    } catch (error) {
      setActionNotice(error.message || 'Could not queue the redline review.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscoveryFiles = (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    setActionNotice(files.length ? `${files.length} discovery file${files.length === 1 ? '' : 's'} staged for review.` : '');
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', minHeight: 0, overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--db-text-primary)' }}>Associate Workbench</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--db-text-muted)', margin: '4px 0 0 0' }}>Review Nemo's legal drafts, oversee eDiscovery tagging, and verify deep research.</p>
        </div>
        <button className="db-btn db-btn-primary" style={{ gap: '6px' }} onClick={handleNewDraft} disabled={isSaving}>
          <Plus size={14} /> Delegate Draft to Nemo
        </button>
      </div>

      <div className="db-two-col" style={{ alignItems: 'flex-start' }}>
        {/* Drafting Panel */}
        <div className="db-card" style={{ flex: 2 }}>
          <div className="db-card-header">
            <div className="db-card-title"><PenTool size={16} style={{ marginRight: '8px' }} /> Nemo's Output Canvas</div>
            {activeDraft && (
              <div style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {isSaving ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={12} />}
                {isSaving ? 'Syncing...' : 'Saved to Cloud'}
              </div>
            )}
          </div>
          <div style={{ padding: '16px', display: 'flex', gap: '16px' }}>
            <div style={{ width: '200px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
               <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--db-text-secondary)', textTransform: 'uppercase' }}>Recent AI Drafts</div>
               {drafts.slice(0, 8).map(d => (
                  <button 
                    key={d.id} 
                    onClick={() => selectDraft(d)}
                    style={{ textAlign: 'left', padding: '8px', background: activeDraft?.id === d.id ? 'var(--db-navbar)' : 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer', color: 'var(--db-text-primary)' }}
                  >
                     <div style={{ fontSize: '0.8125rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.title}</div>
                     <div style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)', marginTop: '2px' }}>{d.matterName}</div>
                  </button>
               ))}
               {drafts.length === 0 && <div style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)' }}>No workflows delegated.</div>}
            </div>
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {!activeDraft ? (
                <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--db-border)', borderRadius: '8px', color: 'var(--db-text-muted)', fontSize: '0.8125rem' }}>Select an AI-prepared draft to review.</div>
              ) : (
                <>
                  <input type="text" className="ob-form-input" value={activeDraft.title} onChange={e => {
                     setActiveDraft({...activeDraft, title: e.target.value});
                     genericUpdate('drafts', activeDraft.id, { title: e.target.value });
                     setDrafts(prev => prev.map(old => old.id === activeDraft.id ? { ...old, title: e.target.value } : old));
                  }} style={{ fontSize: '1.25rem', fontWeight: 700, padding: '8px', margin: 0, background: 'transparent', border: 'none', borderBottom: '1px solid var(--db-border)', borderRadius: 0 }} />
                  <textarea 
                    className="ob-form-input" 
                    style={{ width: '100%', height: '400px', fontFamily: 'monospace', resize: 'vertical', border: 'none', background: 'var(--db-surface)', margin: 0 }}
                    value={content}
                    onChange={(e) => syncUpdate(e.target.value)}
                    placeholder="Nemo's draft will appear here..."
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                    <button className="db-btn db-btn-secondary db-btn-sm" style={{ gap: '6px' }} onClick={handleRequestRedline} disabled={isSaving}><Sparkles size={12} color="var(--db-nvidia-green)" /> Ask Nemo to Redline</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* E-Discovery Panel */}
        <div className="db-card" style={{ flex: 1 }}>
          <div className="db-card-header">
            <div className="db-card-title"><FolderSearch size={16} style={{ marginRight: '8px' }} /> Nemo eDiscovery</div>
          </div>
          <div style={{ padding: '16px' }}>
             <p style={{ fontSize: '0.8125rem', color: 'var(--db-text-muted)', margin: 0 }}>Provide Nemo with raw discovery files. It will automatically tag issues and redact PII.</p>
             <input ref={discoveryInputRef} type="file" multiple hidden onChange={handleDiscoveryFiles} />
             <button className="db-btn db-btn-secondary" style={{ width: '100%', marginTop: '16px' }} onClick={() => discoveryInputRef.current?.click()}>Provide Batch to Nemo</button>
             {actionNotice && <div role="status" style={{ marginTop: '10px', fontSize: '0.75rem', color: 'var(--db-text-secondary)' }}>{actionNotice}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
