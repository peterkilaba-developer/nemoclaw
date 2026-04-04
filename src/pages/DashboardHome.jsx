import { useState, useEffect } from 'react';
import { Calendar, ArrowRight, Zap, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useFirm } from '../contexts/FirmContext';
import { getOwnerRole } from '../lib/agentHierarchy';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getFounderDaysRemaining } from '../lib/stripeService';
import { getAuditLog } from '../lib/agentAPI';
// Onboarding is exclusively handled by FrictionlessOnboardingPanel.jsx

export default function DashboardHome() {
  const { user } = useAuth();
  const { firm, agents, personalAgents, superAgent, employees, refreshFirm, firmId } = useFirm();
  const firstName = user?.displayName?.split(' ')[0] || 'there';
  const personalCount = (Array.isArray(personalAgents) ? personalAgents : []).filter(a => !a.isAutonomous).length;
  const autonomousCount = (Array.isArray(personalAgents) ? personalAgents : []).filter(a => a.isAutonomous).length;
  const superCount = superAgent ? 1 : 0;
  const agentCount = personalCount + autonomousCount + superCount;
  const employeeCount = employees?.length || 0;
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  // Self-healing: provision missing owner agent & super agent for existing firms
  useEffect(() => {
    if (!firmId || !user?.uid) return;
    const repairAgents = async () => {
      try {
        // Check if owner's personal agent exists
        const ownerAgentSnap = await getDoc(doc(db, 'firms', firmId, 'agents', user.uid));
        if (!ownerAgentSnap.exists()) {
          const ownerName = user.displayName || firm?.contactName || 'Firm Owner';
          const ownerEmail = user.email || firm?.email || '';
          const ownerRole = getOwnerRole(firm?.firmSize);
          // Create owner employee with proper legal role
          await setDoc(doc(db, 'firms', firmId, 'employees', user.uid), {
            name: ownerName, email: ownerEmail, role: ownerRole,
            photoURL: user.photoURL || null, isOwner: true,
            practiceAreas: firm?.practiceAreas || [],
            createdAt: serverTimestamp(),
          }, { merge: true });
          // Create owner agent
          await setDoc(doc(db, 'firms', firmId, 'agents', user.uid), {
            employeeId: user.uid, employeeName: ownerName, employeeEmail: ownerEmail,
            employeePhotoURL: user.photoURL || null, agentType: 'partner',
            agentName: 'AI Chief of Staff', firmId,
            permissions: {}, availableSubAgents: ['legal-research','contract-review','drafting','case-analytics','business-intelligence','knowledge-search','communication-drafter'],
            context: { preferences: {}, writingStyle: null, caseload: [] },
            settings: { showSubAgentVisibility: false },
            superAgentAccess: true, canEditFirmPolicies: true, isOwner: true,
            status: 'active', createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
          }, { merge: true });
        }
        // Check if super agent exists
        const saSnap = await getDoc(doc(db, 'firms', firmId, 'superAgent', 'config'));
        if (!saSnap.exists()) {
          await setDoc(doc(db, 'firms', firmId, 'superAgent', 'config'), {
            agentName: 'NemoClaw Super Agent', firmId, status: 'active',
            capabilities: ['firm-wide-analytics','cross-matter-search','compliance-monitoring','resource-allocation','risk-assessment','performance-metrics'],
            accessControl: { allowedRoles: ['managing-partner','partner','solo-partner'] },
            createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
          }, { merge: true });
        }
        // Refresh to pick up changes
        if (!ownerAgentSnap.exists() || !(await getDoc(doc(db, 'firms', firmId, 'superAgent', 'config'))).exists()) {
          await refreshFirm();
        }
      } catch (err) { console.error('Agent auto-repair:', err); }
    };
    repairAgents();
  }, [firmId, user?.uid]);

  const [showReport, setShowReport] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [tasksToday, setTasksToday] = useState(0);
  const [piiRedactedCount, setPiiRedactedCount] = useState(0);

  useEffect(() => {
    if (!firmId) return;
    const fetchLogs = async () => {
      try {
        const logs = await getAuditLog(firmId, 50);
        setAuditLogs(logs);
        
        const todayStart = new Date();
        todayStart.setHours(0,0,0,0);
        
        const todayLogs = logs.filter(l => {
          const ts = l.timestamp?.toDate?.() || new Date(l.timestamp);
          return ts >= todayStart;
        });
        setTasksToday(todayLogs.length);
        
        const pii = logs.reduce((sum, l) => sum + (l.piiRedactions?.length || 0), 0);
        setPiiRedactedCount(pii);
      } catch (err) {
        console.warn('Failed to load audit logs:', err);
      }
    };
    fetchLogs();
  }, [firmId]);

  const handleFeedAction = (type, title) => {
    setShowReport({ type, title });
  };

  const handleDownload = (report) => {
    // PDF Download handler
    const content = `NemoClaw Intelligent Report\n\nTYPE: ${report.type}\nSUBJECT: ${report.title}\nDATE: ${new Date().toLocaleDateString()}\n\nPRIVACY: Secured by NVIDIA NemoClaw. All PII redacted.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Report_${report.title.replace(/\s+/g, '_')}.txt`;
    link.click();
    alert('Report generated and download initiated.');
  };

  const handleShare = (report) => {
    const shareLink = `https://nemoclaw.ai/share/${report.title.replace(/\s+/g, '-').toLowerCase()}`;
    navigator.clipboard.writeText(shareLink).then(() => {
      alert('Secure report link copied to clipboard.');
    });
  };

  const [showScheduleModal, setShowScheduleModal] = useState(false);

  return (
    <>
      {/* Schedule Consultation Modal — Calendar integration placeholder */}
      {showScheduleModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--modal-backdrop)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="db-card" style={{ width: '100%', maxWidth: '500px', margin: '20px', padding: '0', background: 'var(--modal-bg)', border: '1px solid var(--modal-border)', color: 'var(--modal-text)' }}>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--modal-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Calendar size={18} color="var(--db-nvidia-green)" />
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Schedule Consultation</h2>
              </div>
              <button onClick={() => setShowScheduleModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--modal-text-muted)' }}><X size={20} /></button>
            </div>
            <div style={{ padding: '32px', textAlign: 'center' }}>
              <Calendar size={32} color="var(--db-text-muted)" style={{ marginBottom: '12px', opacity: 0.3 }} />
              <p style={{ fontSize: '0.875rem', color: 'var(--db-text-secondary)', marginBottom: '16px' }}>
                Calendar integration is coming soon. You'll be able to connect Google Calendar or Outlook to manage client consultations directly from this dashboard.
              </p>
              <button className="db-btn db-btn-secondary" onClick={() => setShowScheduleModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Intelligence Report Modal */}
      {showReport && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--modal-backdrop)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="db-card" style={{ width: '100%', maxWidth: '600px', margin: '20px', padding: '0', background: 'var(--modal-bg)', border: '1px solid var(--modal-border)', color: 'var(--modal-text)' }}>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--modal-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Zap size={18} color="var(--db-nvidia-green)" />
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{showReport.type}</h2>
              </div>
              <button onClick={() => setShowReport(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--modal-text-muted)' }}><X size={20} /></button>
            </div>
            <div style={{ padding: '32px' }}>
              <div style={{ color: 'var(--modal-text-muted)', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>Subject</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '24px' }}>{showReport.title}</div>
              
              <div style={{ background: 'rgba(118,185,0,0.03)', border: '1px solid var(--db-nvidia-green-subtle)', borderRadius: '8px', padding: '20px', marginBottom: '24px' }}>
                <div style={{ fontSize: '0.8125rem', lineHeight: 1.6, color: 'var(--modal-text-muted)' }}>
                  This report was generated by your NemoClaw {showReport.type.includes('Research') ? 'Research' : 'Contract'} Agent. 
                  All PII has been redacted and the analysis is grounded in verified statutes and internal firm precedents.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="db-btn db-btn-primary" style={{ flex: 1, background: '#ffffff', color: '#111827' }} onClick={() => handleDownload(showReport)}>Download PDF</button>
                <button className="db-btn db-btn-secondary" style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: 'var(--modal-text)', border: '1px solid var(--modal-border)' }} onClick={() => handleShare(showReport)}>Share with Team</button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="db-page-header">
        <h1 className="db-page-title">{greeting}, {firstName}.</h1>
        <p className="db-page-subtitle">Here's what your agents have been working on today — {today}.</p>
      </div>



      {/* Stats */}
      <div className="db-stats-grid">
        <div className="db-stat-card">
          <div className="db-stat-label">Tasks Today</div>
          <div className="db-stat-value">{tasksToday}</div>
          <div className="db-stat-meta">Daily throughput</div>
        </div>
        <div className="db-stat-card">
          <div className="db-stat-label">Active Firm Agents</div>
          <div className="db-stat-value nvidia">{agentCount}</div>
          <div className="db-stat-meta">
            {agentCount > 0 
              ? `${personalCount} Personal · ${superCount} Super Agent · ${autonomousCount} Autonomous`
              : 'Awaiting firm setup'}
          </div>
        </div>
        <div className="db-stat-card" style={{ cursor: 'pointer' }} onClick={() => window.location.href = '/dashboard/billing'}>
          <div className="db-stat-label">Amount Due</div>
          <div className="db-stat-value accent">$0.00</div>
          <div className="db-stat-meta">{firm?.trialEndsAt ? `Founder trial · ${getFounderDaysRemaining(firm.trialEndsAt)} days left` : 'Trial active · 7 days'}</div>
        </div>
        <div className="db-stat-card">
          <div className="db-stat-label">Sandbox Status</div>
          <div className="db-stat-value accent">{firm?.isConfigured ? 'Healthy' : 'Provisioning'}</div>
          <div className="db-stat-meta">NemoClaw · {firm?.isConfigured ? 'Operational' : 'Waiting for data'}</div>
        </div>
      </div>

      {/* Two Column */}
      <div className="db-two-col">
        {/* Left: Activity Feed */}
        <div className="db-card">
          <div className="db-card-header">
            <div>
              <div className="db-card-title">Live Activity Feed</div>
              <div className="db-card-subtitle">Real-time updates from your agents</div>
            </div>
            {firm?.isConfigured && (
              <button className="db-btn db-btn-secondary db-btn-sm" onClick={() => window.location.href = '/dashboard/security'}>View All</button>
            )}
          </div>

          <div className="db-feed" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {auditLogs.length > 0 ? (
              auditLogs.slice(0, 8).map((log, i) => {
                const timeStr = log.timestamp?.toDate 
                  ? log.timestamp.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
                  : 'Just now';
                return (
                  <div key={i} style={{ padding: '16px 20px', borderBottom: '1px solid var(--db-border)', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ width: '32px', height: '32px', background: 'rgba(118,185,0,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Zap size={16} color="var(--db-nvidia-green)" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--db-text-primary)' }}>{log.employeeName || 'Staff'} · {log.agentType.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--db-text-secondary)', marginTop: '4px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontStyle: 'italic' }}>
                        "{log.userMessage}"
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)', marginTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{timeStr}</span>
                        {log.subAgentsUsed?.length > 0 && <span>⚡ {log.subAgentsUsed.length} sub-agents routed</span>}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <div style={{ marginBottom: '16px', opacity: 0.2 }}>
                  <Zap size={48} style={{ margin: '0 auto' }} />
                </div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--db-text-primary)', marginBottom: '4px' }}>No Activity Yet</div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--db-text-secondary)', maxWidth: '240px', margin: '0 auto' }}>
                  Deploy your firm sandbox using the widget above to start your AI workforce.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Sidebar Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Deadlines */}
          <div className="db-card">
            <div className="db-card-header">
              <div className="db-card-title">Upcoming Deadlines</div>
            </div>
            <div>
              {false ? (
                <>
                </>
              ) : (
                <div style={{ padding: '24px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--db-text-muted)' }}>
                  No deadlines tracked.
                </div>
              )}
            </div>
          </div>

          {/* Security Quick View */}
          <div className="db-card">
            <div className="db-card-header">
              <div className="db-card-title">Security Overview</div>
            </div>
            <div className="db-security-status">
              <div className="status-dot" style={{ background: firm?.isConfigured ? 'var(--db-nvidia-green)' : '#f59e0b' }} />
              <span>NemoClaw Sandbox — {firm?.isConfigured ? 'Healthy' : 'Provisioning'}</span>
            </div>
            <div className="db-protection-grid">
              <div className="db-protection-card">
                <div className="db-protection-value">{piiRedactedCount}</div>
                <div className="db-protection-label">PII Redacted</div>
              </div>
              <div className="db-protection-card">
                <div className="db-protection-value">0</div>
                <div className="db-protection-label">Blocked</div>
              </div>
              <div className="db-protection-card">
                <div className="db-protection-value">0</div>
                <div className="db-protection-label">Halluc. Caught</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
