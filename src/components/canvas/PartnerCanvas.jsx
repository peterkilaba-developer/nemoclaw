import { useState } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { CheckCircle, Eye, Target, TrendingUp } from 'lucide-react';
import { db } from '../../lib/firebase';

export default function PartnerCanvas({ firmId, user, billableActivities = [], matters = [] }) {
  const [verifiedIds, setVerifiedIds] = useState(new Set());
  const [pendingId, setPendingId] = useState('');
  const [approvalError, setApprovalError] = useState('');
  // Aggregate real WIP
  const unbilledActivities = billableActivities.filter(a => !['approved', 'invoiced'].includes(a.status));
  const wipRevenue = unbilledActivities.reduce((total, activity) => {
    const explicitValue = Number(activity.value);
    if (Number.isFinite(explicitValue)) return total + explicitValue;

    const hours = Number.parseFloat(activity.hours ?? activity.duration);
    return total + (Number.isFinite(hours) ? hours * 350 : 0);
  }, 0);
  
  // Find at-risk matters
  const criticalCases = matters.filter(m => m.status === 'urgent' || m.stage === 'trial');

  const handleVerify = async (activity) => {
    if (!firmId || !activity?.id || pendingId) return;
    setPendingId(activity.id);
    setApprovalError('');
    try {
      await updateDoc(doc(db, 'firms', firmId, 'billableActivities', activity.id), {
        status: 'approved',
        approvedAt: serverTimestamp(),
        approvedBy: user?.email || user?.uid || null,
      });
      setVerifiedIds(prev => new Set(prev).add(activity.id));
    } catch (error) {
      setApprovalError(error.message || 'Could not approve this billing activity.');
    } finally {
      setPendingId('');
    }
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', minHeight: 0, overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--db-text-primary)' }}>Partner Overwatch</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--db-text-muted)', margin: '4px 0 0 0' }}>Strategic view of all active matters, unbilled WIP, and firm-wide risk metrics.</p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="db-stats-grid" style={{ marginBottom: 0 }}>
        <div className="db-stat-card">
          <div className="db-stat-label">Unbilled WIP Revenue</div>
          <div className="db-stat-value nvidia" style={{ fontSize: '1.5rem' }}>${wipRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          <div className="db-stat-meta">Pending invoice approval ({unbilledActivities.length} items)</div>
        </div>
        <div className="db-stat-card">
          <div className="db-stat-label">Matter Risk Alert</div>
          <div className="db-stat-value accent" style={{ fontSize: '1.5rem', color: criticalCases.length > 0 ? '#ef4444' : 'var(--db-text-muted)' }}>{criticalCases.length} Critical</div>
          <div className="db-stat-meta">Upcoming statute or trial deadlines</div>
        </div>
        <div className="db-stat-card">
          <div className="db-stat-label">Active Cases</div>
          <div className="db-stat-value" style={{ fontSize: '1.5rem' }}>{matters.length}</div>
          <div className="db-stat-meta">Total open firm matters</div>
        </div>
      </div>

      <div className="db-two-col" style={{ alignItems: 'flex-start' }}>
        {/* Approvals Queue */}
        <div className="db-card" style={{ flex: 2 }}>
          <div className="db-card-header">
            <div className="db-card-title"><Target size={16} style={{ marginRight: '8px' }} /> Workflow Approvals</div>
          </div>
          <div style={{ padding: '16px' }}>
            {unbilledActivities.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', background: 'var(--db-bg)', borderRadius: '8px', border: '1px dashed var(--db-border)' }}>
                  <TrendingUp size={24} style={{ color: 'var(--db-text-muted)', marginBottom: '12px' }} />
                  <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>All Clear</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)', marginTop: '4px' }}>No pending motions or invoices require partner sign-off.</div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {unbilledActivities.slice(0, 5).map(act => (
                    <div key={act.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--db-bg)', borderRadius: '6px', borderLeft: '3px solid #f59e0b' }}>
                        <div>
                           <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Pre-bill Authorization: {act.clientName || 'General Client'}</div>
                           <div style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)', marginTop: '4px' }}>{act.hours || act.duration || '0h'} · {act.performerName || act.agentRole || 'Associate'}</div>
                        </div>
                        <button className="db-btn db-btn-secondary db-btn-sm" style={{ padding: '4px 10px' }} onClick={() => handleVerify(act)} disabled={pendingId === act.id || verifiedIds.has(act.id)}><CheckCircle size={14} style={{ marginRight: '6px' }}/> {verifiedIds.has(act.id) ? 'Verified' : pendingId === act.id ? 'Verifying...' : 'Verify'}</button>
                    </div>
                  ))}
                  {approvalError && <div role="alert" style={{ color: '#ef4444', fontSize: '0.75rem' }}>{approvalError}</div>}
                </div>
            )}
          </div>
        </div>

        {/* Audit Log Overview */}
        <div className="db-card" style={{ flex: 1 }}>
          <div className="db-card-header">
            <div className="db-card-title"><Eye size={16} style={{ marginRight: '8px' }} /> Live Telemetry Log</div>
          </div>
          <div style={{ padding: '16px' }}>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '0.8125rem' }}>
                   <strong style={{ color: 'var(--db-text-primary)' }}>Nemo AI</strong> auto-drafted <em>Motion for Continuance</em>.
                   <div style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)' }}>Moments ago</div>
                </div>
                <div style={{ fontSize: '0.8125rem' }}>
                   <strong style={{ color: 'var(--db-text-primary)' }}>Billing Agent</strong> flagged <em>0.5h entry</em> as non-billable clerical.
                   <div style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)' }}>1 hour ago</div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
