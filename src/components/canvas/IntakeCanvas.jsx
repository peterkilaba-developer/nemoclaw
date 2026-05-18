import { useState, useEffect } from 'react';
import useWorkspace from '../../hooks/useWorkspace';
import { CheckSquare, Loader2, Mail, RefreshCw, ShieldCheck, UserCheck } from 'lucide-react';
import { runConflictCheck } from '../../lib/lawFirmOSService';

export default function IntakeCanvas({ firmId, leads = [] }) {
  const { fetchConflictChecks, loading } = useWorkspace(firmId);
  const [conflictChecks, setConflictChecks] = useState([]);
  const [partyName, setPartyName] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [checkError, setCheckError] = useState('');

  useEffect(() => {
    fetchConflictChecks().then(setConflictChecks);
  }, [fetchConflictChecks]);

  const handleRunCheck = async () => {
    if (!partyName.trim()) return;
    setIsChecking(true);
    setCheckError('');
    try {
      await runConflictCheck({ firmId, partyName: partyName.trim() });
      await fetchConflictChecks().then(setConflictChecks);
      setPartyName('');
    } catch(e) {
      console.error("Failed conflict check:", e);
      setCheckError(e.message || 'Conflict check failed.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--db-text-primary)' }}>Intake & Reception Workbench</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--db-text-muted)', margin: '4px 0 0 0' }}>Manage the inbound lead funnel, run bar-compliant conflict checks, and dispatch engagement letters.</p>
        </div>
      </div>

      <div className="db-two-col" style={{ alignItems: 'flex-start' }}>
        {/* Conflict Check Wizard */}
        <div className="db-card" style={{ flex: 1 }}>
          <div className="db-card-header">
            <div className="db-card-title" style={{ color: 'var(--db-nvidia-green)' }}><ShieldCheck size={16} style={{ marginRight: '8px' }} /> Conflict Check Wizard</div>
          </div>
          <div style={{ padding: '16px' }}>
            <p style={{ fontSize: '0.8125rem', color: 'var(--db-text-muted)', marginTop: 0 }}>Nemo automatically scans all historical clients, adverse parties, and witnesses. You can also manually trigger a deep scan.</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                className="ob-form-input" 
                placeholder="Delegate deep scan to Nemo..." 
                style={{ flex: 1, marginBottom: 0 }} 
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                disabled={isChecking}
              />
              <button 
                className="db-btn db-btn-primary" 
                onClick={handleRunCheck}
                disabled={isChecking || !partyName.trim()}
              >
                {isChecking ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Ask Nemo to Scan'}
              </button>
            </div>
            {checkError && (
              <div style={{ marginTop: '10px', fontSize: '0.75rem', color: '#ef4444' }}>{checkError}</div>
            )}
            
            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--db-text-muted)' }}>Nemo's Continuous Checks</div>
              
              {loading && conflictChecks.length === 0 ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                  <RefreshCw size={16} style={{ color: 'var(--db-text-muted)', animation: 'spin 1s linear infinite' }} />
                </div>
              ) : conflictChecks.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', fontSize: '0.8125rem', color: 'var(--db-text-muted)' }}>
                  Nemo AI has not detected any recent conflicts.
                </div>
              ) : (
                conflictChecks.slice(0, 10).map((chk) => (
                  <div key={chk.id || Math.random()} style={{ padding: '10px 12px', background: 'var(--db-bg)', borderRadius: '6px', borderLeft: `3px solid ${chk.status === 'Clear' ? 'var(--db-nvidia-green)' : '#ef4444'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '0.8125rem', color: 'var(--db-text-primary)' }}>{chk.partyName}</strong>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: chk.status === 'Clear' ? 'var(--db-nvidia-green)' : '#ef4444', background: chk.status === 'Clear' ? 'rgba(118,185,0,0.1)' : 'rgba(239,68,68,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                        {chk.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)' }}>
                      Verified by {chk.clearedBy}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Lead Funnel Container */}
        <div className="db-card" style={{ flex: 1 }}>
          <div className="db-card-header">
            <div className="db-card-title"><UserCheck size={16} style={{ marginRight: '8px' }} /> Nemo's Lead Triage</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)' }}>{leads?.length || 0} awaiting review</div>
          </div>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(!leads || leads.length === 0) ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', background: 'var(--db-bg)', borderRadius: '8px', border: '1px dashed var(--db-border)' }}>
                <div style={{ fontSize: '0.8125rem', color: 'var(--db-text-muted)' }}>Nemo AI has processed all inbound leads.</div>
              </div>
            ) : (
              leads.map(lead => (
                <div key={lead.id} style={{ padding: '12px', borderLeft: lead.status === 'won' ? '3px solid var(--db-nvidia-green)' : '3px solid #3b82f6', background: 'var(--db-bg)', borderRadius: '6px', transition: 'transform 0.1s', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--db-text-primary)' }}>{lead.name}</div>
                    {lead.value && <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--db-nvidia-green)' }}>${lead.value}</div>}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)', marginTop: '4px' }}>{lead.practiceArea || 'General Inquiry'}</div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button className="db-btn db-btn-secondary db-btn-sm" style={{ padding: '4px 10px', fontSize: '0.6875rem' }}><CheckSquare size={12} style={{ marginRight: '6px' }} /> Approve Lead</button>
                    <button className="db-btn db-btn-secondary db-btn-sm" style={{ padding: '4px 10px', fontSize: '0.6875rem' }}><Mail size={12} style={{ marginRight: '6px' }} /> Review AI Draft</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
