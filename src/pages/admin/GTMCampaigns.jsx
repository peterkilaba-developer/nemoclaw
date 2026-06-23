import { useState, useEffect } from 'react';
import {
  Send, Mail, Users, CheckCircle2, AlertCircle,
  Eye, Megaphone, RefreshCw, Loader, Phone, PhoneCall,
  PhoneOff, Globe, Volume2, FileText, Clock
} from 'lucide-react';
import { getProspects, updateProspect } from '../../lib/prospectService';
import {
  sendColdOutreach, sendBulkOutreach, getColdOutreachTemplate,
  getFollowUpTemplate
} from '../../lib/emailService';
import {
  makeOutboundCall, makeBulkCalls, getCallStatus, generateCallScript
} from '../../lib/voiceOutreachService';
const STATUS_COLORS = {
  researched: { color: '#3b82f6', label: 'Researched' },
  outreach_sent: { color: '#f59e0b', label: 'Outreach Sent' },
  followed_up: { color: '#a78bfa', label: 'Followed Up' },
  responded: { color: '#16a34a', label: 'Responded' },
  waitlist_signed: { color: '#76b900', label: 'Signed Up' },
  not_interested: { color: '#64748b', label: 'Not Interested' },
};

const CONTACT_FILTERS = [
  { id: 'all', label: 'All Contacts', icon: Users },
  { id: 'both', label: 'Phone + Email', icon: Globe },
  { id: 'email_only', label: 'Email Only', icon: Mail },
  { id: 'phone_only', label: 'Phone Only', icon: Phone },
];

export default function GTMCampaigns() {
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [sending, setSending] = useState({});
  const [calling, setCalling] = useState({});
  const [bulkSending, setBulkSending] = useState(false);
  const [campaignResults, setCampaignResults] = useState(null);
  const [emailPreview, setEmailPreview] = useState(null);
  const [callScriptPreview, setCallScriptPreview] = useState(null);
  const [templateType, setTemplateType] = useState('cold');
  const [channel, setChannel] = useState('email'); // email | voice
  const [contactFilter, setContactFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('ready');
  const [callStatuses, setCallStatuses] = useState({});

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getProspects();
      setProspects(data);
    } catch (err) {
      console.error('Failed to load prospects', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Categorize prospects by contact info
  const hasBoth = p => p.email && p.phone;
  const hasEmailOnly = p => p.email && !p.phone;
  const hasPhoneOnly = p => !p.email && p.phone;
  const hasAny = p => p.email || p.phone;

  const contactCounts = {
    all: prospects.filter(hasAny).length,
    both: prospects.filter(hasBoth).length,
    email_only: prospects.filter(hasEmailOnly).length,
    phone_only: prospects.filter(hasPhoneOnly).length,
    no_contact: prospects.filter(p => !p.email && !p.phone).length,
  };

  // Apply contact filter
  const contactFiltered = prospects.filter(p => {
    if (contactFilter === 'both') return hasBoth(p);
    if (contactFilter === 'email_only') return hasEmailOnly(p);
    if (contactFilter === 'phone_only') return hasPhoneOnly(p);
    return hasAny(p);
  });

  // Apply status filter
  const readyForEmail = contactFiltered.filter(p => p.email && p.status === 'researched');
  const readyForFollowUp = contactFiltered.filter(p => p.email && p.status === 'outreach_sent');
  const readyForCall = contactFiltered.filter(p => p.phone && ['researched', 'outreach_sent'].includes(p.status));
  const sentProspects = contactFiltered.filter(p => ['outreach_sent', 'followed_up'].includes(p.status));

  const displayProspects = (() => {
    if (channel === 'voice') {
      if (statusFilter === 'ready') return readyForCall;
      if (statusFilter === 'sent') return contactFiltered.filter(p => p.lastCallId);
      return contactFiltered.filter(p => p.phone);
    }
    if (statusFilter === 'ready') return templateType === 'follow_up' ? readyForFollowUp : readyForEmail;
    if (statusFilter === 'sent') return sentProspects;
    return contactFiltered.filter(p => p.email);
  })();

  const toggleSelect = id => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds(prev =>
      prev.size === displayProspects.length
        ? new Set()
        : new Set(displayProspects.map(p => p.id))
    );
  };

  // ── EMAIL HANDLERS ──
  const handleSendEmail = async (prospect) => {
    if (!prospect.email) return alert('No email set');
    setSending(prev => ({ ...prev, [prospect.id]: true }));
    try {
      await sendColdOutreach(prospect, templateType);
      await loadData();
    } catch (err) {
      alert('Send failed: ' + err.message);
    } finally {
      setSending(prev => ({ ...prev, [prospect.id]: false }));
    }
  };

  const handleBulkEmail = async () => {
    const toSend = displayProspects.filter(p => selectedIds.has(p.id) && p.email);
    if (!toSend.length) return;
    if (!confirm(`Send ${templateType === 'follow_up' ? 'follow-up' : 'cold outreach'} to ${toSend.length} prospects?`)) return;
    setBulkSending(true);
    setCampaignResults(null);
    try {
      const results = await sendBulkOutreach(toSend, templateType);
      setCampaignResults({ type: 'email', results });
      setSelectedIds(new Set());
      await loadData();
    } catch (err) {
      console.error('Bulk email failed', err);
    } finally {
      setBulkSending(false);
    }
  };

  // ── VOICE HANDLERS ──
  const handleCall = async (prospect) => {
    if (!prospect.phone) return alert('No phone number');
    setCalling(prev => ({ ...prev, [prospect.id]: true }));
    try {
      const result = await makeOutboundCall(prospect);
      setCallStatuses(prev => ({ ...prev, [prospect.id]: { ...result, status: 'initiated' } }));
      await loadData();
    } catch (err) {
      alert('Call failed: ' + err.message);
    } finally {
      setCalling(prev => ({ ...prev, [prospect.id]: false }));
    }
  };

  const handleBulkCall = async () => {
    const toCall = displayProspects.filter(p => selectedIds.has(p.id) && p.phone);
    if (!toCall.length) return;
    if (!confirm(`Initiate AI voice calls to ${toCall.length} prospects? Calls will be staggered.`)) return;
    setBulkSending(true);
    setCampaignResults(null);
    try {
      const results = await makeBulkCalls(toCall);
      setCampaignResults({ type: 'voice', results });
      setSelectedIds(new Set());
      await loadData();
    } catch (err) {
      console.error('Bulk calls failed', err);
    } finally {
      setBulkSending(false);
    }
  };

  const handleCheckCallStatus = async (prospect) => {
    if (!prospect.lastCallId) return;
    try {
      const status = await getCallStatus(prospect.lastCallId);
      setCallStatuses(prev => ({ ...prev, [prospect.id]: status }));
    } catch (err) {
      console.error('Failed to check call status', err);
    }
  };

  const handlePreviewEmail = (prospect) => {
    const template = templateType === 'follow_up'
      ? getFollowUpTemplate(prospect)
      : getColdOutreachTemplate(prospect);
    setEmailPreview({ prospect, template });
  };

  const handlePreviewCallScript = (prospect) => {
    const script = generateCallScript(prospect);
    setCallScriptPreview({ prospect, script });
  };

  const handleMarkResponded = async (id) => {
    try {
      await updateProspect(id, { status: 'responded' });
      await loadData();
    } catch (err) { console.error(err); }
  };

  const handleBulkAction = channel === 'voice' ? handleBulkCall : handleBulkEmail;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'rgba(255,255,255,0.4)' }}>
        <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite', marginRight: '8px' }} /> Loading...
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  return (
    <>
      {/* Contact Type KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px', marginBottom: '20px' }}>
        <KpiCard label="Both Phone + Email" value={contactCounts.both} icon={Globe} color="#76b900" sub="Full contact" />
        <KpiCard label="Email Only" value={contactCounts.email_only} icon={Mail} color="#3b82f6" sub="Can email" />
        <KpiCard label="Phone Only" value={contactCounts.phone_only} icon={Phone} color="#f59e0b" sub="Can call" />
        <KpiCard label="No Contact Info" value={contactCounts.no_contact} icon={AlertCircle} color="#ef4444" sub="Needs enrichment" />
        <KpiCard label="Total Reachable" value={contactCounts.all} icon={Users} color="#8b5cf6" sub="All channels" />
      </div>

      {/* Contact Filter */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', padding: '3px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
        {CONTACT_FILTERS.map(f => (
          <button key={f.id} onClick={() => { setContactFilter(f.id); setSelectedIds(new Set()); }} style={{
            flex: 1, padding: '7px 12px', border: 'none', borderRadius: '7px',
            background: contactFilter === f.id ? 'rgba(118,185,0,0.12)' : 'transparent',
            color: contactFilter === f.id ? '#76b900' : 'rgba(255,255,255,0.35)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            fontSize: '0.6875rem', fontWeight: 700, transition: 'all 0.15s',
          }}>
            <f.icon size={13} /> {f.label}
            <span style={{ opacity: 0.5, fontSize: '0.5625rem' }}>({contactCounts[f.id]})</span>
          </button>
        ))}
      </div>

      {/* Channel + Template Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.5625rem', fontWeight: 700, color: 'rgba(255,255,255,0.25)', marginRight: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>CHANNEL:</span>
          {[
            { id: 'email', label: 'Email', icon: Mail, color: '#3b82f6' },
            { id: 'voice', label: 'AI Voice Call', icon: PhoneCall, color: '#76b900' },
          ].map(ch => (
            <button key={ch.id} onClick={() => { setChannel(ch.id); setSelectedIds(new Set()); }} style={{
              padding: '6px 14px', border: `1px solid ${channel === ch.id ? ch.color + '40' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: '8px', background: channel === ch.id ? ch.color + '15' : 'transparent',
              color: channel === ch.id ? ch.color : 'rgba(255,255,255,0.4)',
              cursor: 'pointer', fontSize: '0.6875rem', fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: '5px',
            }}>
              <ch.icon size={13} /> {ch.label}
            </button>
          ))}
          {channel === 'email' && (
            <div style={{ display: 'flex', gap: '4px', marginLeft: '12px' }}>
              {[{ id: 'cold', label: 'Cold Outreach' }, { id: 'follow_up', label: 'Follow-up' }].map(t => (
                <button key={t.id} onClick={() => { setTemplateType(t.id); setSelectedIds(new Set()); }} style={{
                  padding: '5px 10px', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px',
                  background: templateType === t.id ? 'rgba(59,130,246,0.1)' : 'transparent',
                  color: templateType === t.id ? '#3b82f6' : 'rgba(255,255,255,0.3)',
                  cursor: 'pointer', fontSize: '0.5625rem', fontWeight: 700,
                }}>{t.label}</button>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '4px' }}>
          {[{ id: 'ready', label: 'Ready' }, { id: 'sent', label: 'Sent' }, { id: 'all', label: 'All' }].map(f => (
            <button key={f.id} onClick={() => setStatusFilter(f.id)} style={{
              padding: '4px 10px', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px',
              background: statusFilter === f.id ? 'rgba(255,255,255,0.06)' : 'transparent',
              color: statusFilter === f.id ? '#fff' : 'rgba(255,255,255,0.3)',
              cursor: 'pointer', fontSize: '0.5625rem', fontWeight: 700,
            }}>{f.label}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px' }}>
        {/* Queue */}
        <Card
          title={channel === 'voice' ? 'Voice Call Queue' : `${templateType === 'follow_up' ? 'Follow-up' : 'Outreach'} Queue`}
          subtitle={`${displayProspects.length} prospects · ${selectedIds.size} selected`}
          action={
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={toggleAll} style={{
                padding: '4px 10px', borderRadius: '6px', fontSize: '0.5625rem', fontWeight: 700,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
              }}>{selectedIds.size === displayProspects.length ? 'Deselect All' : 'Select All'}</button>
              <button onClick={handleBulkAction}
                disabled={bulkSending || selectedIds.size === 0}
                style={{
                  padding: '6px 14px', borderRadius: '8px', fontSize: '0.6875rem', fontWeight: 700,
                  background: bulkSending ? 'rgba(118,185,0,0.06)' : channel === 'voice'
                    ? 'linear-gradient(135deg, #76b900, #4a7a00)' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  border: 'none', color: bulkSending ? '#76b900' : '#fff', cursor: selectedIds.size === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '5px',
                  opacity: selectedIds.size === 0 ? 0.4 : 1,
                }}>
                {bulkSending
                  ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} />
                  : channel === 'voice' ? <PhoneCall size={12} /> : <Megaphone size={12} />
                }
                {bulkSending ? 'Processing...' : channel === 'voice' ? `Call (${selectedIds.size})` : `Send (${selectedIds.size})`}
              </button>
            </div>
          }
        >
          {displayProspects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.25)' }}>
              {channel === 'voice' ? <PhoneOff size={28} style={{ marginBottom: '8px', opacity: 0.3 }} /> : <Mail size={28} style={{ marginBottom: '8px', opacity: 0.3 }} />}
              <div style={{ fontSize: '0.8125rem' }}>
                {channel === 'voice' ? 'No prospects with phone numbers ready for calls' : 'No prospects ready for email outreach'}
              </div>
              <div style={{ fontSize: '0.6875rem', marginTop: '4px' }}>
                {channel === 'voice' ? 'Phone numbers come from Google Places details' : 'Add emails in the Prospecting tab'}
              </div>
            </div>
          ) : (
            <div style={{ maxHeight: '480px', overflow: 'auto' }}>
              {displayProspects.map(p => {
                const isSelected = selectedIds.has(p.id);
                const canAct = channel === 'voice'
                  ? p.phone && ['researched', 'outreach_sent'].includes(p.status)
                  : p.email && (templateType === 'cold' ? p.status === 'researched' : p.status === 'outreach_sent');
                const _callStatus = callStatuses[p.id];

                return (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    background: isSelected ? 'rgba(118,185,0,0.04)' : 'transparent',
                  }}>
                    <div onClick={() => canAct && toggleSelect(p.id)} style={{
                      width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0,
                      border: `2px solid ${isSelected ? '#76b900' : 'rgba(255,255,255,0.15)'}`,
                      background: isSelected ? 'rgba(118,185,0,0.2)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: canAct ? 'pointer' : 'not-allowed', opacity: canAct ? 1 : 0.3,
                    }}>
                      {isSelected && <CheckCircle2 size={12} color="#76b900" />}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fff' }}>{p.firmName}</div>
                      <div style={{ fontSize: '0.5625rem', color: 'rgba(255,255,255,0.35)', display: 'flex', gap: '8px' }}>
                        {p.email && <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Mail size={8} />{p.email}</span>}
                        {p.phone && <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Phone size={8} />{p.phone}</span>}
                        {!p.email && !p.phone && <span>No contact info</span>}
                      </div>
                    </div>

                    {/* Contact badges */}
                    <div style={{ display: 'flex', gap: '3px' }}>
                      {p.email && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6' }} title="Has email" />}
                      {p.phone && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#76b900' }} title="Has phone" />}
                    </div>

                    <StatusBadge status={p.status} />

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {channel === 'email' ? (
                        <>
                          <button onClick={() => handlePreviewEmail(p)} style={sBtnStyle}>
                            <Eye size={11} />
                          </button>
                          {canAct && (
                            <button onClick={() => handleSendEmail(p)} disabled={sending[p.id]} style={{
                              ...sBtnStyle, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#3b82f6',
                            }}>
                              {sending[p.id] ? '...' : <Send size={10} />}
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          <button onClick={() => handlePreviewCallScript(p)} style={sBtnStyle}>
                            <FileText size={11} />
                          </button>
                          {canAct && (
                            <button onClick={() => handleCall(p)} disabled={calling[p.id]} style={{
                              ...sBtnStyle, background: 'rgba(118,185,0,0.1)', border: '1px solid rgba(118,185,0,0.2)', color: '#76b900',
                            }}>
                              {calling[p.id] ? <Loader size={10} style={{ animation: 'spin 1s linear infinite' }} /> : <PhoneCall size={10} />}
                            </button>
                          )}
                          {p.lastCallId && (
                            <button onClick={() => handleCheckCallStatus(p)} style={{
                              ...sBtnStyle, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', color: '#8b5cf6',
                            }}>
                              <Clock size={10} />
                            </button>
                          )}
                        </>
                      )}
                      {p.status === 'outreach_sent' && (
                        <button onClick={() => handleMarkResponded(p.id)} style={{
                          ...sBtnStyle, background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.2)', color: '#16a34a',
                          fontSize: '0.5625rem', fontWeight: 700, padding: '3px 8px',
                        }}>✓</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Right Sidebar */}
        <div>
          {/* Campaign Results */}
          {campaignResults && (
            <Card title="Campaign Results" subtitle={`${campaignResults.type === 'voice' ? 'Voice calls' : 'Emails'} — last batch`}>
              <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.15)', marginBottom: '12px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <CheckCircle2 size={14} /> {campaignResults.type === 'voice' ? 'Calls Initiated' : 'Emails Sent'}
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.5)' }}>
                  {campaignResults.results.filter(r => r.success).length} succeeded · {campaignResults.results.filter(r => !r.success).length} failed
                </div>
              </div>
              <div style={{ maxHeight: '140px', overflow: 'auto' }}>
                {campaignResults.results.map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    {r.success ? <CheckCircle2 size={10} color="#16a34a" /> : <AlertCircle size={10} color="#ef4444" />}
                    <span style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.6)', flex: 1 }}>{r.firmName}</span>
                    <span style={{ fontSize: '0.5625rem', color: r.success ? '#16a34a' : '#ef4444' }}>{r.success ? 'OK' : 'Fail'}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Call Status Details */}
          {channel === 'voice' && Object.keys(callStatuses).length > 0 && (
            <Card title="Call Status" subtitle="Recent call results">
              {Object.entries(callStatuses).slice(0, 5).map(([pid, cs]) => (
                <div key={pid} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#fff' }}>{cs.firmName || pid}</span>
                    <CallStatusBadge status={cs.status} />
                  </div>
                  {cs.duration && <div style={{ fontSize: '0.5625rem', color: 'rgba(255,255,255,0.3)' }}>Duration: {cs.duration}s</div>}
                  {cs.answeredBy && <div style={{ fontSize: '0.5625rem', color: 'rgba(255,255,255,0.3)' }}>Answered by: {cs.answeredBy}</div>}
                  {/* Email collected from call */}
                  {cs.collectedEmail && (
                    <div style={{ marginTop: '6px', padding: '8px 10px', borderRadius: '8px', background: 'rgba(118,185,0,0.08)', border: '1px solid rgba(118,185,0,0.2)' }}>
                      <div style={{ fontSize: '0.5625rem', fontWeight: 700, color: '#76b900', textTransform: 'uppercase', marginBottom: '3px' }}>📧 Email Collected</div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fff' }}>{cs.collectedEmail}</div>
                      <button onClick={async () => {
                        try {
                          await updateProspect(pid, { email: cs.collectedEmail });
                          await loadData();
                          alert(`✅ Email saved to prospect!`);
                        } catch (e) { alert('Failed: ' + e.message); }
                      }} style={{
                        marginTop: '6px', padding: '4px 10px', borderRadius: '6px', fontSize: '0.5625rem', fontWeight: 700,
                        background: 'linear-gradient(135deg, #76b900, #4a7a00)', border: 'none', color: '#fff', cursor: 'pointer',
                      }}>Save to Prospect</button>
                    </div>
                  )}
                  {cs.summary && <div style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.5)', marginTop: '4px', fontStyle: 'italic' }}>"{cs.summary}"</div>}
                  {cs.transcript && (
                    <details style={{ marginTop: '6px' }}>
                      <summary style={{ fontSize: '0.5625rem', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}>View Transcript</summary>
                      <pre style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginTop: '4px', whiteSpace: 'pre-wrap', fontFamily: "'Inter', sans-serif", maxHeight: '120px', overflow: 'auto', padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                        {cs.transcript}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </Card>
          )}

          {/* Channel Info */}
          {channel === 'voice' ? (
            <Card title="AI Voice Agent" subtitle="Powered by Bland AI">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #76b900, #4a7a00)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Volume2 size={20} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff' }}>Alex — NemoC LAW AI BDR</div>
                  <div style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.4)' }}>AI Voice Agent · Maya voice · Enhanced model</div>
                </div>
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginBottom: '12px' }}>
                Autonomous AI agent that calls prospects, introduces NemoC LAW AI,
                pitches the Agentic OS in under 90 seconds, and asks for signup interest.
                Calls are recorded and transcribed.
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <Tag color="#76b900">Autonomous</Tag>
                <Tag color="#3b82f6">Recorded</Tag>
                <Tag color="#f59e0b">Transcribed</Tag>
                <Tag color="#a78bfa">{'< 3 min calls'}</Tag>
              </div>
              <div style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '8px', background: 'rgba(118,185,0,0.06)', border: '1px solid rgba(118,185,0,0.15)', fontSize: '0.6875rem', color: '#76b900' }}>
                Voice calls run through the server-side Bland proxy with admin authentication.
              </div>
            </Card>
          ) : (
            <Card title={templateType === 'follow_up' ? 'Follow-up Template' : 'Cold Outreach Template'} subtitle="Personalized per prospect">
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>
                {templateType === 'follow_up' ? '📩 Quick follow-up: [FirmName]' : '🚀 [FirmName] — 10 AI agents that practice law'}
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginBottom: '12px' }}>
                {templateType === 'follow_up'
                  ? 'Shorter follow-up referencing Legal Research Agent performance. Reinforces founder pricing urgency.'
                  : 'Full introduction with all agents, NemoClaw security, founder pricing ($297/mo for life), and sign-up CTA.'}
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <Tag color="#76b900">Personalized</Tag>
                <Tag color="#3b82f6">HTML + Text</Tag>
                <Tag color="#f59e0b">Sign Up Link</Tag>
                <Tag color="#a78bfa">CAN-SPAM</Tag>
              </div>
            </Card>
          )}

          {/* Outreach Funnel */}
          <Card title="Outreach Funnel" subtitle="Full pipeline">
            {[
              { label: 'No Contact Info', count: contactCounts.no_contact, color: '#64748b' },
              { label: 'Researched (ready)', count: prospects.filter(p => p.status === 'researched' && hasAny(p)).length, color: '#3b82f6' },
              { label: 'Outreach Sent', count: prospects.filter(p => p.status === 'outreach_sent').length, color: '#f59e0b' },
              { label: 'Followed Up', count: prospects.filter(p => p.status === 'followed_up').length, color: '#a78bfa' },
              { label: 'Responded', count: prospects.filter(p => p.status === 'responded').length, color: '#16a34a' },
              { label: 'Signed Up', count: prospects.filter(p => p.status === 'waitlist_signed').length, color: '#76b900' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '5px 0', borderBottom: i < 5 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>{s.label}</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: s.color }}>{s.count}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>

      {/* Email Preview Modal */}
      {emailPreview && (
        <Modal onClose={() => setEmailPreview(null)} title={`Email Preview — ${templateType === 'follow_up' ? 'Follow-up' : 'Cold Outreach'}`}
          subtitle={`To: ${emailPreview.prospect.email || 'No email'} · ${emailPreview.prospect.firmName}`}>
          <div dangerouslySetInnerHTML={{ __html: emailPreview.template.html }} />
        </Modal>
      )}

      {/* Call Script Preview Modal */}
      {callScriptPreview && (
        <Modal onClose={() => setCallScriptPreview(null)} title="AI Voice Call Script"
          subtitle={`Calling: ${callScriptPreview.prospect.phone} · ${callScriptPreview.prospect.firmName}`}>
          <div style={{ padding: '24px', background: '#0a0e17' }}>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.625rem', fontWeight: 700, color: '#76b900', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Opening Line</div>
              <div style={{ fontSize: '0.875rem', color: '#fff', fontStyle: 'italic', lineHeight: 1.6, padding: '12px', background: 'rgba(118,185,0,0.06)', border: '1px solid rgba(118,185,0,0.15)', borderRadius: '8px' }}>
                "{callScriptPreview.script.firstSentence}"
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Full Task Prompt</div>
              <pre style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: "'Inter', sans-serif", margin: 0, padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', maxHeight: '300px', overflow: 'auto' }}>
                {callScriptPreview.script.task}
              </pre>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
              <Tag color="#76b900">Voice: {callScriptPreview.script.voice}</Tag>
              <Tag color="#3b82f6">Max: {callScriptPreview.script.maxDuration} min</Tag>
              <Tag color="#f59e0b">Wait for greeting</Tag>
              <Tag color="#a78bfa">Temp: {callScriptPreview.script.temperature}</Tag>
            </div>
          </div>
        </Modal>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </>
  );
}

/* ── Shared Styles ── */
const sBtnStyle = {
  padding: '3px 6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.08)',
  background: 'transparent', color: 'rgba(255,255,255,0.3)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

/* ── Sub-components ── */
function Card({ title, subtitle, action, children }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff' }}>{title}</div>
            {subtitle && <div style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)' }}>{subtitle}</div>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontSize: '0.5625rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
        <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={14} color={color} />
        </div>
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginBottom: '2px' }}>{value}</div>
      <div style={{ fontSize: '0.5625rem', color: 'rgba(255,255,255,0.3)' }}>{sub}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const cfg = STATUS_COLORS[status] || STATUS_COLORS.researched;
  return (
    <span style={{
      padding: '2px 8px', borderRadius: '6px', fontSize: '0.5625rem', fontWeight: 700,
      background: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}30`,
    }}>{cfg.label}</span>
  );
}

function CallStatusBadge({ status }) {
  const map = {
    initiated: { color: '#f59e0b', label: 'Initiated' },
    queued: { color: '#f59e0b', label: 'Queued' },
    'in-progress': { color: '#3b82f6', label: 'In Progress' },
    completed: { color: '#16a34a', label: 'Completed' },
    failed: { color: '#ef4444', label: 'Failed' },
    'no-answer': { color: '#64748b', label: 'No Answer' },
  };
  const cfg = map[status] || map.initiated;
  return (
    <span style={{
      padding: '2px 8px', borderRadius: '6px', fontSize: '0.5625rem', fontWeight: 700,
      background: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}30`,
    }}>{cfg.label}</span>
  );
}

function Tag({ color, children }) {
  return (
    <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.5625rem', fontWeight: 600, background: `${color}15`, color }}>{children}</span>
  );
}

function Modal({ onClose, title, subtitle, children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        width: '660px', maxHeight: '80vh', overflow: 'auto',
        borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          padding: '16px 20px', background: '#1a1f2e', borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff' }}>{title}</div>
            {subtitle && <div style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.4)' }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} style={{
            padding: '4px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.75rem',
          }}>Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}
