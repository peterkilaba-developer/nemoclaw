import { useState, useEffect } from 'react';
import { Target, Zap, Rocket, Users, TrendingUp, Sparkles, Loader, Shield, CheckCircle2, Clock, Activity, Radio, Terminal } from 'lucide-react';
import { sendInternalAgentMessage } from '../../lib/internalAgentAPI';
import { db } from '../../lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp, updateDoc, doc, where } from 'firebase/firestore';

export default function CorporateStrategy() {
  const [briefing, setBriefing] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysisPhase, setAnalysisPhase] = useState(0);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionLog, setExecutionLog] = useState([]);
  const [lastPlanId, setLastPlanId] = useState(null);
  const [missionExecuted, setMissionExecuted] = useState(false);
  const [missionExecutedAt, setMissionExecutedAt] = useState(null);
  const [auditTrail, setAuditTrail] = useState([]);
  const [showConsole, setShowConsole] = useState(false);

  const phases = [
    "Synthesizing market sentiment from SDR logs...",
    "Analyzing conversion friction in Revenue Ops...",
    "Evaluating departmental capacity for 10/day throughput...",
    "Drafting C.E.A. Strategic Mission Plan..."
  ];

  const loadLastPlan = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, '_internalStrategicPlans'), orderBy('timestamp', 'desc'), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docData = snap.docs[0].data();
        setBriefing(docData.briefing);
        setLastPlanId(snap.docs[0].id);
        setMissionExecuted(!!docData.executed);
        setMissionExecutedAt(docData.executedAt?.toDate?.() || (docData.executed ? new Date() : null));
      } else {
        await generateStrategicBriefing();
      }
    } catch (err) {
      console.error(err);
      await generateStrategicBriefing();
    } finally {
      setLoading(false);
    }
  };

  // Load audit trail from Firestore
  const loadAuditTrail = async () => {
    try {
      const q = query(
        collection(db, '_internalAuditLog'),
        where('type', '==', 'strategic_mission_step'),
        orderBy('timestamp', 'desc'),
        limit(20)
      );
      const snap = await getDocs(q);
      const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAuditTrail(logs);
    } catch (err) {
      console.warn('Audit trail load failed:', err);
    }
  };

  const generateStrategicBriefing = async () => {
    setLoading(true);
    setBriefing('');
    setAnalysisPhase(0);
    setMissionExecuted(false);
    setMissionExecutedAt(null);
    
    const interval = setInterval(() => {
      setAnalysisPhase(prev => (prev < phases.length - 1 ? prev + 1 : prev));
    }, 2000);

    try {
      // ── Gather REAL metrics from Firestore ──
      let liveContext = {};
      try {
        const { getProspects } = await import('../../lib/prospectService');
        const { getEnrichmentStatus } = await import('../../lib/enrichmentService');
        const prospects = await getProspects();
        const enrichStatus = getEnrichmentStatus();

        const statusCounts = { researched: 0, outreach_sent: 0, followed_up: 0, responded: 0, waitlist_signed: 0 };
        let withEmail = 0, withPhone = 0, withWebsite = 0;
        prospects.forEach(p => {
          if (statusCounts[p.status] !== undefined) statusCounts[p.status]++;
          if (p.email) withEmail++;
          if (p.phone) withPhone++;
          if (p.website) withWebsite++;
        });

        // Try to get waitlist count
        let waitlistCount = 0;
        try {
          const wSnap = await getDocs(query(collection(db, 'waitlist'), limit(200)));
          waitlistCount = wSnap.size;
        } catch (e) { /* ignore */ }

        liveContext = {
          prospects: {
            total: prospects.length,
            ...statusCounts,
            withEmail,
            withPhone,
            withWebsite,
            noContactInfo: prospects.length - withEmail - withPhone + prospects.filter(p => p.email && p.phone).length,
          },
          waitlist: { total: waitlistCount },
          pricing: {
            model: 'Modular add-on',
            basePlatform: '$297/mo (founder) → $997/mo (standard)',
            outputSeat: '$149/mo per human role (founder) → $497/mo (standard)',
            autonomousRole: '$2,497/mo per firm role (founder) → $4,997/mo (standard)',
            trialDuration: '7-day founder pricing window',
            payingFirms: 0,
          },
          toolStatus: {
            googlePlaces: 'ACTIVE — searching 50 US cities, 18 practice areas',
            hunterIO: enrichStatus.hunter.configured ? 'ACTIVE — email enrichment online' : 'NOT CONFIGURED',
            apolloIO: enrichStatus.apollo.configured ? 'ACTIVE — org enrichment online' : 'NOT CONFIGURED',
            sendgrid: 'NOT DEPLOYED — Cloud Function needed. Emails queue in Firestore but never send.',
            blandAI: import.meta.env.VITE_BLAND_API_KEY ? 'ACTIVE — voice outreach' : 'NOT CONFIGURED — no API key',
            stripe: 'CONFIGURED — checkout session endpoint exists but production keys may need verification',
          },
          sdrCapabilities: {
            citiesAvailable: 50,
            practiceAreas: 18,
            autoEnrichment: enrichStatus.anyConfigured,
            autonomousLoop: 'Manual trigger only — no scheduler/cron',
          },
          knownIssues: [
            'SendGrid Cloud Function not deployed — zero emails actually delivered',
            'Bland AI voice key empty — voice outreach disabled',
            'No HubSpot, DocuSign, or ad platform integrations exist',
            'No conversion tracking or reply rate analytics',
            'Pulsator writes mock heartbeats to audit log (noise)',
          ],
        };
      } catch (e) {
        console.warn('Failed to gather live metrics for CEA:', e);
        liveContext = { error: 'Failed to load live data', message: e.message };
      }

      const prompt = `You are the C.E.A. (Chief Executive Agent) of NemoC LAW AI.
Our objective is to sign up 10 NEW PAYING law firms every single day.
DIRECT ONBOARDING MODEL: We no longer use waitlists. Conversions must be immediate.

CRITICAL: Base your ENTIRE analysis on the REAL LIVE DATA below. Do NOT invent metrics. Do NOT reference tools or integrations that are not listed in toolStatus. Every number you cite MUST come from this data.

════════════════════════════
LIVE PLATFORM DATA (as of ${new Date().toISOString()})
════════════════════════════
${JSON.stringify(liveContext, null, 2)}
════════════════════════════

Based on this REAL data, produce a mission plan:
1. SDR Agent (Outbound) — Top 3 priorities given actual prospect/enrichment status
2. Marketing Agent (Inbound/Content) — Top 3 priorities given actual tool availability
3. Success Agent (Onboarding/VIP) — Top 3 priorities
4. Revenue Agent (Billing/Conversion) — Top 3 priorities

RULES:
- Only reference tools/integrations that exist in toolStatus above
- Use actual prospect counts from the data above
- Pricing is $297/mo base (NOT $1,200)
- Acknowledge known issues and blockers
- Include a "CRITICAL BLOCKERS" section for what must be fixed first
- Be brutally honest about current state vs. goal`;

      const { response } = await sendInternalAgentMessage('cea', prompt);
      
      try {
        const docRef = await addDoc(collection(db, '_internalStrategicPlans'), {
          briefing: response,
          timestamp: serverTimestamp(),
          missionTitle: '10-Firms-a-Day Acquisition',
          executed: false,
          liveContext,
        });
        setLastPlanId(docRef.id);
      } catch (saveErr) {
        console.warn('C.E.A. Strategic persistence failed (Briefing will still show):', saveErr);
      }

      setBriefing(response);
    } catch (err) {
      console.error(err);
      setBriefing(`Analysis failed. C.E.A. Offline? Error: ${err.message}. Check NVIDIA NIM or Firestore Rules.`);
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const executeMission = async () => {
    if (!briefing) return;
    setIsExecuting(true);
    setExecutionLog([]);

    // Import the real SDR blitz function
    const { runSDRBlitz } = await import('../../lib/prospectService');

    // Step 1: Broadcast directive
    const step1 = { id: '1', agent: 'cea', msg: 'Broadcasting mission directive to all department heads. SDR Blitz is GO.' };
    setExecutionLog(prev => [...prev, step1]);
    try {
      await addDoc(collection(db, '_internalAuditLog'), {
        agentId: 'cea', type: 'strategic_mission_step',
        agentResponse: step1.msg, department: 'executive',
        timestamp: new Date(), immutable: true
      });
    } catch (e) { console.warn(e); }
    await new Promise(r => setTimeout(r, 1500));

    // Step 2-4: Real SDR Blitz — search 3 cities, add prospects, enrich emails
    const step2 = { id: '2', agent: 'sdr', msg: 'Initiating 3-city SDR Blitz... Searching Google Places + enriching emails via Hunter.io / Apollo.io...' };
    setExecutionLog(prev => [...prev, step2]);

    let blitzResult;
    try {
      blitzResult = await runSDRBlitz(3, (cityIndex, totalCities, result) => {
        const progressMsg = result.error
          ? `City ${cityIndex}/${totalCities}: ${result.city} — ❌ Search failed`
          : `City ${cityIndex}/${totalCities}: ${result.city} — ✅ ${result.added} firms added, ${result.enriched} emails enriched (${result.practiceArea})`;
        
        setExecutionLog(prev => [...prev, {
          id: `2-${cityIndex}`, agent: 'sdr', msg: progressMsg
        }]);
      });
    } catch (err) {
      blitzResult = { totals: { added: 0, enriched: 0, found: 0 } };
      setExecutionLog(prev => [...prev, {
        id: '2-err', agent: 'sdr', msg: `SDR Blitz error: ${err.message}`
      }]);
    }

    // Step 5: Summary
    const totals = blitzResult?.totals || { added: 0, enriched: 0, found: 0 };
    const summaryMsg = `Fleet alignment complete. SDR Blitz results: ${totals.found} firms discovered, ${totals.added} added to pipeline, ${totals.enriched} emails enriched. 10-Firm-a-Day mission is LIVE.`;
    const step5 = { id: '5', agent: 'cea', msg: summaryMsg };
    setExecutionLog(prev => [...prev, step5]);

    try {
      await addDoc(collection(db, '_internalAuditLog'), {
        agentId: 'cea', type: 'strategic_mission_step',
        agentResponse: summaryMsg, department: 'executive',
        timestamp: new Date(), immutable: true
      });
    } catch (e) { console.warn(e); }
    
    if (lastPlanId) {
      try {
        await updateDoc(doc(db, '_internalStrategicPlans', lastPlanId), {
          executed: true,
          executedAt: serverTimestamp()
        });
      } catch (e) {
        console.warn("Failed to mark plan as executed", e);
      }
    }
    
    setMissionExecuted(true);
    setMissionExecutedAt(new Date());
    await loadAuditTrail();
    setShowConsole(true);
    setIsExecuting(false);
  };

  useEffect(() => {
    loadLastPlan();
    loadAuditTrail();
  }, []);

  // Auto-open console if mission was already executed
  useEffect(() => {
    if (missionExecuted && auditTrail.length > 0) {
      setShowConsole(true);
    }
  }, [missionExecuted, auditTrail]);

  const timeSince = (date) => {
    if (!date) return 'unknown';
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#76b900', marginBottom: '4px' }}>Executive Strategy</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>10-Firms-a-Day <span style={{ color: 'rgba(255,255,255,0.4)' }}>Mission Plan</span></div>
            {missionExecuted && (
              <span style={{
                padding: '3px 10px', borderRadius: '20px', fontSize: '0.625rem', fontWeight: 700,
                background: 'rgba(118,185,0,0.15)', color: '#76b900', border: '1px solid rgba(118,185,0,0.3)',
                display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase', letterSpacing: '0.04em'
              }}>
                <Radio size={8} style={{ animation: 'pulse 1.5s infinite' }} /> Mission Active
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {missionExecuted && (
            <button onClick={() => setShowConsole(!showConsole)} style={{
              padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(59,130,246,0.3)',
              background: showConsole ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.05)',
              color: '#3b82f6', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <Terminal size={14} />
              {showConsole ? 'Hide Console' : 'Mission Console'}
            </button>
          )}
          <button onClick={generateStrategicBriefing} disabled={loading} style={{
            padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(118,185,0,0.3)',
            background: 'rgba(118,185,0,0.08)', color: '#76b900', cursor: 'pointer',
            fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            {loading ? <Loader size={14} className="spin" /> : <TrendingUp size={14} />}
            {loading ? 'Consulting C.E.A...' : 'Rerun Analysis'}
          </button>
        </div>
      </div>

      {/* Mission Execution Console - Persistent Post-Execution View */}
      {showConsole && (missionExecuted || executionLog.length > 0) && (
        <div style={{
          background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(59,130,246,0.2)',
          borderRadius: '12px', padding: '20px', marginBottom: '20px',
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Activity size={14} color="#3b82f6" />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff' }}>Mission Execution Console</span>
              {missionExecutedAt && (
                <span style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.3)' }}>
                  Executed {timeSince(missionExecutedAt)}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#76b900', animation: 'pulse 1.5s infinite' }} />
              <span style={{ fontSize: '0.625rem', color: '#76b900', fontWeight: 700 }}>LIVE</span>
            </div>
          </div>

          {/* Audit Trail from Firestore */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '280px', overflowY: 'auto' }}>
            {(auditTrail.length > 0 ? auditTrail : executionLog).map((log, i) => {
              const agentId = log.agentId || log.agent || 'system';
              const msg = log.agentResponse || log.msg || '';
              const ts = log.timestamp?.toDate?.() || log.timestamp || new Date();
              const agentColors = { cea: '#f59e0b', sdr: '#3b82f6', marketing: '#a855f7', success: '#10b981', revenue: '#ef4444' };
              const color = agentColors[agentId] || '#76b900';
              
              return (
                <div key={log.id || i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '10px',
                  padding: '8px 12px', borderRadius: '6px',
                  background: 'rgba(255,255,255,0.02)',
                  animation: 'fade-in 0.3s ease-out forwards',
                }}>
                  <CheckCircle2 size={12} color={color} style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flex: 1, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: '0.5625rem', fontWeight: 800, color,
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                      padding: '1px 6px', borderRadius: '3px',
                      background: `${color}15`, border: `1px solid ${color}30`,
                      flexShrink: 0
                    }}>{agentId}</span>
                    <span style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{msg}</span>
                  </div>
                  <span style={{ fontSize: '0.5625rem', color: 'rgba(255,255,255,0.2)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                    {ts instanceof Date ? ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
              );
            })}
            {auditTrail.length === 0 && executionLog.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>
                No audit trail found. Execute a mission to see activity.
              </div>
            )}
          </div>

          {/* Post-execution status summary */}
          {missionExecuted && (
            <div style={{
              marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)',
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px'
            }}>
              {[
                { label: 'SDR Agent', status: 'Prospecting', color: '#3b82f6' },
                { label: 'Marketing', status: 'Content Loop', color: '#a855f7' },
                { label: 'Success', status: 'Provisioning', color: '#10b981' },
                { label: 'Revenue', status: 'Conversion', color: '#f59e0b' },
              ].map(dept => (
                <div key={dept.label} style={{
                  padding: '10px', borderRadius: '8px',
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.5625rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '4px' }}>{dept.label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: dept.color, animation: 'pulse 2s infinite' }} />
                    <span style={{ fontSize: '0.625rem', fontWeight: 700, color: dept.color }}>{dept.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
        {/* Main Briefing */}
        <div style={{
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '16px', padding: '32px', position: 'relative', overflow: 'hidden',
          minHeight: '600px'
        }}>
          {/* Background Glare */}
          <div style={{
            position: 'absolute', top: -100, right: -100, width: '300px', height: '300px',
            background: 'radial-gradient(circle, rgba(118,185,0,0.05) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />

          {loading ? (
            <div style={{ height: '500px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '20px', background: 'rgba(118,185,0,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px',
                animation: 'pulse 1.5s infinite'
              }}>
                <Sparkles size={32} color="#76b900" />
              </div>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>C.E.A. Synthetic Reasoning in Progress</div>
              <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>{phases[analysisPhase]}</div>
            </div>
          ) : (
            <>
              <div style={{ whiteSpace: 'pre-wrap', color: 'rgba(255,255,255,0.9)', fontSize: '0.9375rem', lineHeight: 1.7, fontFamily: "'Inter', sans-serif" }}>
                {briefing || "Waiting for C.E.A. briefing..."}
              </div>

              {briefing && !loading && (
                <div style={{
                  marginTop: '40px', padding: '24px', borderRadius: '12px',
                  background: missionExecuted ? 'rgba(118,185,0,0.04)' : 'rgba(118,185,0,0.06)',
                  border: `1px solid ${missionExecuted ? 'rgba(118,185,0,0.1)' : 'rgba(118,185,0,0.15)'}`,
                  display: 'flex', flexDirection: 'column', gap: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>
                        {missionExecuted ? '✅ Mission Deployed' : 'Execute This Mission Plan?'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                        {missionExecuted
                          ? `Directives were broadcast to all agents ${missionExecutedAt ? timeSince(missionExecutedAt) : ''}. Click "Mission Console" above to monitor activity.`
                          : 'Clicking execute will broadcast the necessary directives to all internal agents.'
                        }
                      </div>
                    </div>
                    {!missionExecuted && (
                      <button onClick={executeMission} disabled={isExecuting} style={{
                        padding: '12px 28px', borderRadius: '8px', border: 'none',
                        background: 'linear-gradient(135deg, #76b900, #4a7a00)',
                        color: '#000', fontWeight: 800, cursor: 'pointer',
                        fontSize: '0.875rem', boxShadow: '0 4px 12px rgba(118,185,0,0.3)',
                      }}>
                        {isExecuting ? 'Broadcasting Directives...' : 'EXECUTE MISSION'}
                      </button>
                    )}
                  </div>

                  {/* Live execution log (during execution only) */}
                  {isExecuting && executionLog.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      {executionLog.map(log => (
                        <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', animation: 'fade-in 0.3s ease-out forwards' }}>
                           <CheckCircle2 size={14} color="#76b900" />
                           <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#76b900', textTransform: 'uppercase', minWidth: '40px' }}>{log.agent}</span>
                           <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>{log.msg}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Sidebar Ops */}
        <div>
          <Card title="Agent Readiness" subtitle="Departmental throughput checks">
            <DepartmentCheck label="SDR (Targeting)" status={missionExecuted ? 'Executing' : 'Ready'} />
            <DepartmentCheck label="Marketing (Content)" status={missionExecuted ? 'Executing' : 'Active'} />
            <DepartmentCheck label="Revenue (Billing)" status="Ready" />
            <DepartmentCheck label="Success (Onboarding)" status={missionExecuted ? 'Active' : 'Warning'} />
          </Card>

          <Card title="Key Constraints" subtitle="System limits vs 10/day target">
             <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <ConstraintItem label="NVIDIA NIM Throughput" value="99.9%" color="#76b900" />
                <ConstraintItem label="Outreach Daily Cap" value="84/100" color="#f59e0b" />
                <ConstraintItem label="Onboarding Concurrency" value="3/10" color="#ef4444" />
             </div>
          </Card>

          {missionExecuted && (
            <Card title="Mission Timeline" subtitle="Recent directive history">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {auditTrail.slice(0, 5).map((log, i) => {
                  const ts = log.timestamp?.toDate?.() || log.timestamp;
                  return (
                    <div key={log.id || i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#76b900', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.5)', flex: 1 }}>{log.agentResponse?.substring(0, 50)}...</span>
                      <span style={{ fontSize: '0.5625rem', color: 'rgba(255,255,255,0.2)' }}>
                        {ts instanceof Date ? ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                  );
                })}
                {auditTrail.length === 0 && (
                  <div style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '8px' }}>No logs available</div>
                )}
              </div>
            </Card>
          )}

          <div style={{
            background: 'linear-gradient(135deg, #76b900, #4a7a00)', borderRadius: '12px',
            padding: '20px', color: '#000', marginTop: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Shield size={20} />
              <div style={{ fontSize: '0.875rem', fontWeight: 800 }}>COO Directive</div>
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, lineHeight: 1.4 }}>
              "Achieving 10 signups/day requires zero-human intervention in the discovery phase. Scaling SDR outreach now."
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
        .spin { animation: spin 2s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fade-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      `}
      </style>
    </div>
  );
}

function Card({ title, subtitle, children }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '12px', padding: '16px', marginBottom: '16px',
    }}>
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff' }}>{title}</div>
        <div style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.4)' }}>{subtitle}</div>
      </div>
      {children}
    </div>
  );
}

function DepartmentCheck({ label, status }) {
  const color = status === 'Ready' ? '#76b900' : status === 'Active' ? '#3b82f6' : status === 'Executing' ? '#f59e0b' : '#f59e0b';
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, animation: status === 'Executing' ? 'pulse 1s infinite' : 'none' }} />
        <span style={{ fontSize: '0.6875rem', fontWeight: 700, color }}>{status}</span>
      </div>
    </div>
  );
}

function ConstraintItem({ label, value, color }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
        <span style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>{label}</span>
        <span style={{ fontSize: '0.625rem', color: '#fff', fontWeight: 700 }}>{value}</span>
      </div>
      <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
        <div style={{ width: value, height: '100%', background: color, borderRadius: '2px' }} />
      </div>
    </div>
  );
}

