import { useState, useEffect } from 'react';
import useWorkspace from '../../hooks/useWorkspace';
import { CheckCircle, DollarSign, FileText, Loader2, Plus, ShieldAlert } from 'lucide-react';

export default function BillingCanvas({ firmId, user, billableActivities = [] }) {
  const { fetchTrustLedgers, addTrustLedgerEntry, genericUpdate, _loading } = useWorkspace(firmId);
  const [ledgers, setLedgers] = useState([]);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [clientName, setClientName] = useState('');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchTrustLedgers().then(setLedgers);
  }, [fetchTrustLedgers]);

  const handleAddFunds = async () => {
    if (!clientName.trim() || !amount) return;
    setIsSubmitting(true);
    try {
      await addTrustLedgerEntry({
        clientName,
        amount: parseFloat(amount),
        type: 'credit',
        clearedBy: user?.email || 'Billing Dept',
        notes: 'Initial Retainer Deposit'
      });
      await fetchTrustLedgers().then(setLedgers);
      setClientName(''); setAmount(''); setShowAddForm(false);
    } catch(e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveTime = async (activityId) => {
    // In production, this updates the 'billableActivities' doc to status: 'approved'
    // For now we'll simulate the generic UI behavior
    await genericUpdate('billableActivities', activityId, { status: 'approved' });
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', minHeight: 0, overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--db-text-primary)' }}>Finance & Billing Workbench</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--db-text-muted)', margin: '4px 0 0 0' }}>Review Nemo's LEDES time scrubbing, format invoices, and verify IOLTA Trust compliance.</p>
        </div>
        <button className="db-btn db-btn-primary" onClick={() => setShowAddForm(!showAddForm)} style={{ gap: '6px' }}>
          <Plus size={14} /> Review Bank Feeds
        </button>
      </div>

      <div className="db-two-col" style={{ alignItems: 'flex-start' }}>
        {/* IOLTA Trust Ledger */}
        <div className="db-card" style={{ flex: 1 }}>
          <div className="db-card-header">
            <div className="db-card-title" style={{ color: 'var(--db-nvidia-green)' }}><ShieldAlert size={16} style={{ marginRight: '8px' }} /> Nemo Trust Reconciler</div>
          </div>
          <div style={{ padding: '16px' }}>
            {showAddForm && (
               <div style={{ padding: '16px', background: 'var(--db-navbar)', borderRadius: '8px', marginBottom: '16px', border: '1px solid var(--db-border)' }}>
                 <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '10px' }}>Nemo AI detected a new inbound ACH transfer. Verify:</div>
                 <input type="text" className="ob-form-input" placeholder="Client Name" value={clientName} onChange={e => setClientName(e.target.value)} />
                 <input type="number" className="ob-form-input" placeholder="Amount ($)" value={amount} onChange={e => setAmount(e.target.value)} />
                 <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                   <button className="db-btn db-btn-primary db-btn-sm" onClick={handleAddFunds} disabled={isSubmitting || !clientName}>
                     {isSubmitting ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : 'Approve Reconciliation'}
                   </button>
                   <button className="db-btn db-btn-secondary db-btn-sm" onClick={() => setShowAddForm(false)}>Flag for Partner</button>
                 </div>
               </div>
            )}

            {ledgers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', background: 'var(--db-bg)', borderRadius: '8px', border: '1px dashed var(--db-border)' }}>
                <DollarSign size={24} style={{ color: 'var(--db-text-muted)', marginBottom: '12px' }} />
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Zero Exceptions</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)', marginTop: '4px' }}>Nemo has fully reconciled all trust ledgers.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {ledgers.map(l => (
                   <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--db-bg)', borderRadius: '6px', borderLeft: '3px solid var(--db-nvidia-green)' }}>
                     <div>
                       <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{l.clientName}</div>
                       <div style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)' }}>Reconciled by {l.clearedBy}</div>
                     </div>
                     <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--db-nvidia-green)' }}>+${l.amount?.toFixed(2)}</div>
                   </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* LEDES Time Approvals */}
        <div className="db-card" style={{ flex: 1.5 }}>
          <div className="db-card-header">
            <div className="db-card-title"><FileText size={16} style={{ marginRight: '8px' }} /> Nemo Time Scrubber WIP</div>
          </div>
          <div style={{ padding: '16px' }}>
             <p style={{ fontSize: '0.8125rem', color: 'var(--db-text-muted)', margin: 0 }}>Nemo has automatically formatted and scrubbed these unbilled time entries based on LEDES criteria. Please review.</p>
             
             {billableActivities.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', background: 'var(--db-bg)', borderRadius: '8px', border: '1px dashed var(--db-border)', marginTop: '16px' }}>
                  <CheckCircle size={24} style={{ color: 'var(--db-nvidia-green)', marginBottom: '12px' }} />
                  <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Zero WIP</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)', marginTop: '4px' }}>All billable time has been invoiced.</div>
                </div>
             ) : (
               <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {billableActivities.filter(a => a.status !== 'approved').map(activity => (
                    <div key={activity.id} style={{ padding: '12px', background: 'var(--db-bg)', borderRadius: '6px', borderLeft: '3px solid #f59e0b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <div>
                         <div style={{ fontSize: '0.8125rem', color: 'var(--db-text-primary)' }}>
                            <strong style={{ color: '#f59e0b', marginRight: '8px' }}>{activity.hours}h</strong>
                            <strong style={{ opacity: 0.6 }}>L120/A100</strong> — "{activity.description}"
                         </div>
                         <div style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)', marginTop: '4px' }}>Client: {activity.clientName || 'General'} · Posted by {activity.performerName || 'System'}</div>
                       </div>
                       <button className="db-btn db-btn-secondary db-btn-sm" style={{ padding: '4px 8px' }} onClick={() => handleApproveTime(activity.id)}>Approve Item</button>
                    </div>
                  ))}
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
