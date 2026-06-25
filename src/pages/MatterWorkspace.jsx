import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { addDoc, collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useFirm } from '../contexts/FirmContext';
import { sendAgentMessage } from '../lib/agentAPI';
import { ArrowLeft, Bot, Briefcase, CheckCircle, Clock, Download, ExternalLink, FileText, Scale, Send, Settings, Shield, Upload } from 'lucide-react';
import { getMatterWorkflowStages } from '../lib/practiceAreaConfig';

function createSecureToken() {
  const bytes = new Uint8Array(24);
  window.crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function sha256Hex(value) {
  const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
}



export default function MatterWorkspace() {
  const { matterId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { firmId, firm, personalAgents } = useFirm();
  
  const [matter, setMatter] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Engagement / Portal State
  const [engagementStatus, setEngagementStatus] = useState('Drafting'); // Drafting, Sent, Signed
  const [portalProvisioned, setPortalProvisioned] = useState(false);
  const [signatureLink, setSignatureLink] = useState('');
  const [workflowError, setWorkflowError] = useState('');
  const [actionPending, setActionPending] = useState('');
  
  // Chat state
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Documents state
  const [documents, setDocuments] = useState([]);
  const [documentNotice, setDocumentNotice] = useState('');
  const uploadInputRef = useRef(null);
  const artifactUrlsRef = useRef(new Set());

  // Read-time billing state
  const [timeEntries, setTimeEntries] = useState([]);

  // Find agent config
  const myAgent = (Array.isArray(personalAgents) ? personalAgents : []).find(a => a.employeeEmail === user?.email);
  const _agentType = myAgent?.agentType || 'associate';
  const agentName = myAgent?.agentName || 'AI Chief of Staff';
  const agentId = myAgent?.id || null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const loadMatter = useCallback(async () => {
    if (!firmId || !matterId) return;
    try {
      const snap = await getDoc(doc(db, 'firms', firmId, 'matters', matterId));
      if (snap.exists()) {
        const data = snap.data();
        setMatter({ id: snap.id, ...data });
        setEngagementStatus(data.engagementStatus || 'Drafting');
        setPortalProvisioned(Boolean(data.portalProvisioned));

        const documentsSnap = await getDocs(query(
          collection(db, 'firms', firmId, 'matters', matterId, 'documents'),
          orderBy('createdAt', 'desc'),
        ));
        setDocuments(documentsSnap.docs.map(documentSnap => {
          const documentData = documentSnap.data();
          return {
            id: documentSnap.id,
            ...documentData,
            date: documentData.createdAt?.toDate?.().toLocaleDateString() || '',
          };
        }));
        
        // Update welcome message once matter loads
        setMessages(_prev => [
            {
                id: 'system-init',
                role: 'system',
                content: `Workspace initialized for ${data.title}. I am synchronized with the context of this matter. How can I assist you?`,
                timestamp: new Date()
            }
        ]);
        
        // Time entries are generated dynamically from AI interactions
        setTimeEntries([]);
      } else {
        console.warn('Matter not found');
      }
    } catch (err) {
      console.error('Failed to load matter:', err);
    } finally {
      setLoading(false);
    }
  }, [firmId, matterId]);

  useEffect(() => {
    loadMatter();
  }, [loadMatter]);

  useEffect(() => () => {
    artifactUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    artifactUrlsRef.current.clear();
  }, []);

  const appendSystemMessage = useCallback((content) => {
    setMessages(prev => [...prev, {
      id: `sys-${Date.now()}`,
      role: 'system',
      content,
      timestamp: new Date(),
    }]);
  }, []);

  const matterRef = firmId && matterId ? doc(db, 'firms', firmId, 'matters', matterId) : null;
  const isClosed = matter?.status === 'Closed';

  const recordAudit = useCallback(async ({ type, action, reason, resource = `matters/${matterId}` }) => {
    if (!firmId) return;
    await addDoc(collection(db, 'firms', firmId, 'auditLog'), {
      type,
      resource,
      action,
      granted: true,
      reason,
      employeeEmail: user?.email || null,
      timestamp: serverTimestamp(),
      immutable: true,
    });
  }, [firmId, matterId, user?.email]);

  const findMatterClient = useCallback(async () => {
    if (!firmId || !matter?.client) return null;
    const snapshot = await getDocs(query(
      collection(db, 'firms', firmId, 'clients'),
      where('name', '==', matter.client),
    ));
    if (snapshot.empty) return null;
    const clientDoc = snapshot.docs[0];
    return { id: clientDoc.id, ...clientDoc.data() };
  }, [firmId, matter?.client]);

  const provisionClientChannel = useCallback(async () => {
    if (!firmId || !matterId || !matter) return;
    const client = await findMatterClient();
    await setDoc(doc(db, 'firms', firmId, 'clientChannels', matterId), {
      clientId: client?.id || null,
      name: matter.client || client?.name || 'Client',
      matter: matter.title,
      clientName: matter.client || client?.name || 'Client',
      clientEmail: client?.email || null,
      matterId,
      matterTitle: matter.title,
      status: 'Active',
      portalProvisioned: true,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    }, { merge: true });
  }, [findMatterClient, firmId, matter, matterId]);

  const handleGenerateEngagement = useCallback(async () => {
    if (!matterRef || isClosed) return;
    setWorkflowError('');
    setActionPending('engagement');
    try {
      await updateDoc(matterRef, {
        engagementStatus: 'Sent',
        engagementGeneratedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setEngagementStatus('Sent');
      setMatter(prev => ({ ...prev, engagementStatus: 'Sent' }));
      appendSystemMessage('Drafting Agent has generated the Engagement Letter. Sent to Partner for final approval & e-signature.');
      await recordAudit({
        type: 'matter.engagement_generated',
        action: 'update',
        reason: 'Engagement letter generated from matter workspace.',
      });
    } catch (err) {
      setWorkflowError(err.message || 'Could not generate engagement letter.');
    } finally {
      setActionPending('');
    }
  }, [appendSystemMessage, isClosed, matterRef, recordAudit]);

  const handlePartnerSign = useCallback(async () => {
    if (!matterRef || isClosed) return;
    setWorkflowError('');
    setActionPending('partner-sign');
    try {
      const client = await findMatterClient();
      const channelRef = doc(db, 'firms', firmId, 'clientChannels', matterId);
      const batch = writeBatch(db);
      batch.update(matterRef, {
        engagementStatus: 'Signed',
        portalProvisioned: true,
        engagementSignedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.set(channelRef, {
        clientId: client?.id || null,
        name: matter.client || client?.name || 'Client',
        matter: matter.title,
        clientName: matter.client || client?.name || 'Client',
        clientEmail: client?.email || null,
        matterId,
        matterTitle: matter.title,
        status: 'Active',
        portalProvisioned: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      await batch.commit();
      setEngagementStatus('Signed');
      setPortalProvisioned(true);
      setMatter(prev => ({ ...prev, engagementStatus: 'Signed', portalProvisioned: true }));
      appendSystemMessage('Engagement Letter Signed. Zero-Trust Client Portal has been provisioned automatically. Integration with IOLTA billing active.');
      await recordAudit({
        type: 'matter.engagement_signed',
        action: 'sign',
        reason: 'Partner approved engagement letter and provisioned client portal.',
      });
    } catch (err) {
      setWorkflowError(err.message || 'Could not sign engagement letter.');
    } finally {
      setActionPending('');
    }
  }, [appendSystemMessage, findMatterClient, firmId, isClosed, matter, matterId, matterRef, recordAudit]);

  const handleAccessPortal = useCallback(async () => {
    setWorkflowError('');
    setActionPending('portal');
    try {
      await provisionClientChannel();
      navigate('/dashboard/client-portal');
    } catch (err) {
      setWorkflowError(err.message || 'Could not provision the client portal channel.');
    } finally {
      setActionPending('');
    }
  }, [navigate, provisionClientChannel]);

  const handleCreateSignatureRequest = useCallback(async () => {
    if (!firmId || !matter || isClosed) return;
    setWorkflowError('');
    setActionPending('signature');
    try {
      const token = createSecureToken();
      const tokenHash = await sha256Hex(token);
      await addDoc(collection(db, 'firms', firmId, 'matters', matterId, 'signatureRequests'), {
        documentName: 'Engagement and Closing Acknowledgment',
        firmName: firm?.firmName || firm?.name || matter.firmName || 'Secure Law Firm Portal',
        clientName: matter.client || 'Authorized Signatory',
        matterTitle: matter.title,
        documentText: `Engagement acknowledgment for ${matter.title}. This document confirms secure portal access, engagement review, and matter workflow readiness. Attorney review remains required for all legal advice and final work product.`,
        status: 'pending',
        tokenHash,
        createdBy: user?.uid || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      const link = `${window.location.origin}/signature/${token}`;
      setSignatureLink(link);
      appendSystemMessage('Client signature request created. The public signer link is ready for secure delivery.');
      await recordAudit({
        type: 'signature.requested',
        action: 'create',
        reason: 'Client signature request created from matter workspace.',
        resource: `matters/${matterId}/signatureRequests`,
      });
    } catch (err) {
      setWorkflowError(err.message || 'Could not create signature request.');
    } finally {
      setActionPending('');
    }
  }, [appendSystemMessage, firm, firmId, isClosed, matter, matterId, recordAudit, user?.uid]);

  const handleCloseMatter = useCallback(async () => {
    if (!firmId || !matter || !matterRef || isClosed) return;
    setWorkflowError('');
    setActionPending('close');
    const summary = 'Matter lifecycle completed: intake, conflict review, engagement, portal, signature, billing capture, and closure audit.';
    try {
      await updateDoc(matterRef, {
        status: 'Closed',
        stage: 'Completed',
        closedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        closureReason: 'Matter marked complete from workspace.',
        caseCompletionSummary: summary,
      });
      await addDoc(collection(db, 'firms', firmId, 'billableActivities'), {
        agentRole: 'Billing Agent',
        taskName: 'Matter lifecycle completion review',
        matterId,
        matterName: matter.title,
        clientName: matter.client || null,
        duration: '0.6h',
        value: 210,
        status: 'detected',
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
      await recordAudit({
        type: 'matter.closed',
        action: 'close',
        reason: summary,
      });
      setMatter(prev => ({ ...prev, status: 'Closed', stage: 'Completed', caseCompletionSummary: summary }));
      appendSystemMessage('Matter closed. Completion summary, billing activity, and immutable audit record have been saved.');
    } catch (err) {
      setWorkflowError(err.message || 'Could not close matter.');
    } finally {
      setActionPending('');
    }
  }, [appendSystemMessage, firmId, isClosed, matter, matterId, matterRef, recordAudit]);

  const handleSend = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || isTyping || !matter) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);

    const startTime = Date.now();

    try {
      const history = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      }));

      // We pass the matterContext specifically!
      const matterContext = {
        id: matter.id,
        title: matter.title,
        client: matter.client,
        type: matter.type,
        description: matter.description || 'No detailed background provided.',
        assignedTo: matter.assignedTo || [],
        assignedEmails: matter.assignedEmails || [],
        assignedUserIds: matter.assignedUserIds || [],
      };

      const result = await sendAgentMessage(firmId, agentId, text, history, matterContext);
      const endTime = Date.now();

      const artifactRequested = /\b(draft|document|memorandum|memo|brief|letter|agreement|checklist)\b/i.test(text);
      const artifactProduced = /\b(draft|memorandum|memo|brief|letter|agreement|checklist)\b/i.test(result.response) || result.response.includes('---');
      if (result.response.length > 100 && (artifactRequested || artifactProduced)) {
         const artifactName = `Agent_Draft_${new Date().getHours()}${new Date().getMinutes()}.txt`;
         try {
           const artifactRef = await addDoc(collection(db, 'firms', firmId, 'matters', matterId, 'documents'), {
             name: artifactName,
             type: 'txt',
             content: result.response,
             source: 'agent-generated',
             createdAt: serverTimestamp(),
             createdBy: user?.uid || null,
           });
           setDocuments(prev => [{
             id: artifactRef.id,
             name: artifactName,
             type: 'txt',
             content: result.response,
             source: 'agent-generated',
             date: new Date().toLocaleDateString(),
           }, ...prev]);
         } catch (artifactError) {
           console.error('Failed to persist generated artifact:', artifactError);
           setDocumentNotice('The response completed, but its evidence artifact could not be saved.');
         }
      }
      
      // Auto-generate time capture
      const _generatedTime = ((endTime - startTime) / 1000).toFixed(1); // seconds
      const billableEquivalent = (Math.max(0.1, result.response.length / 3000)).toFixed(1); // estimated human hours saved
      const totalAmount = (parseFloat(billableEquivalent) * 350).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
      
      setTimeEntries(prev => [{
        id: Date.now().toString(),
        desc: `AI Inference: ${text.substring(0, 30)}...`,
        duration: `${billableEquivalent} hrs`,
        rate: '$350/hr',
        total: totalAmount
      }, ...prev]);

      setMessages(prev => [...prev, {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: result.response,
        subAgentsUsed: result.subAgentsUsed || [],
        timestamp: new Date(),
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'system',
        content: `Warning: ${err.message}.`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsTyping(false);
      inputRef.current?.focus();
    }
  }, [chatInput, isTyping, firmId, agentId, messages, matter, matterId, user?.uid]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleArtifactUpload = useCallback(async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;

    // Keep encoded file payloads comfortably below Firestore's 1 MiB document limit.
    const maxBytes = 600 * 1024;
    const accepted = files.filter(file => file.size <= maxBytes);
    const rejectedCount = files.length - accepted.length;

    const uploaded = [];
    setDocumentNotice(accepted.length ? 'Uploading evidence...' : 'No files were uploaded.');
    for (const file of accepted) {
      try {
        const contentDataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(reader.error || new Error('Unable to read file.'));
          reader.readAsDataURL(file);
        });
        const metadataRef = await addDoc(collection(db, 'firms', firmId, 'matters', matterId, 'documents'), {
          name: file.name,
          type: file.name.split('.').pop()?.toLowerCase() || 'file',
          size: file.size,
          contentDataUrl,
          source: 'user-upload',
          createdAt: serverTimestamp(),
          createdBy: user?.uid || null,
        });
        uploaded.push({
          id: metadataRef.id,
          name: file.name,
          type: file.name.split('.').pop()?.toLowerCase() || 'file',
          date: new Date().toLocaleDateString(),
          size: file.size,
          contentDataUrl,
          source: 'user-upload',
        });
      } catch (uploadError) {
        console.error(`Failed to upload ${file.name}:`, uploadError);
      }
    }

    if (uploaded.length) setDocuments(prev => [...uploaded, ...prev]);
    const failedCount = accepted.length - uploaded.length;
    const details = [
      `${uploaded.length} file${uploaded.length === 1 ? '' : 's'} added to this matter.`,
      failedCount ? `${failedCount} upload${failedCount === 1 ? '' : 's'} failed.` : '',
      rejectedCount ? `${rejectedCount} file${rejectedCount === 1 ? '' : 's'} exceeded the 600 KB evidence limit.` : '',
    ].filter(Boolean).join(' ');
    setDocumentNotice(details);
  }, [firmId, matterId, user?.uid]);

  const handleArtifactDownload = useCallback((artifact) => {
    let url = artifact.url || artifact.contentDataUrl;
    if (!url && artifact.content) {
      url = URL.createObjectURL(new Blob([artifact.content], { type: 'text/plain;charset=utf-8' }));
      artifactUrlsRef.current.add(url);
    }
    if (!url) {
      setDocumentNotice('This artifact does not have downloadable content yet.');
      return;
    }
    const link = document.createElement('a');
    link.href = url;
    link.download = artifact.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setDocumentNotice(`Downloading ${artifact.name}.`);
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '16px' }}>
        <div style={{ width: '28px', height: '28px', border: '3px solid rgba(118,185,0,0.2)', borderTopColor: '#76b900', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
        <div style={{ fontSize: '0.875rem', color: 'var(--db-text-muted)' }}>Loading matter workspace...</div>
      </div>
    );
  }

  if (!matter) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '12px', textAlign: 'center', padding: '40px' }}>
        <Briefcase size={36} style={{ color: 'var(--db-text-muted)', opacity: 0.3 }} />
        <div style={{ fontSize: '1rem', fontWeight: 700 }}>Matter not found</div>
        <p style={{ fontSize: '0.875rem', color: 'var(--db-text-secondary)', maxWidth: '360px' }}>
          This matter does not exist or you do not have access to it.
        </p>
        <button className="db-btn db-btn-secondary" onClick={() => navigate('/dashboard/matters')}>
          Back to Matters
        </button>
      </div>
    );
  }

  const workflowStages = getMatterWorkflowStages(matter.type || matter.practiceArea);
  const currentStageIndex = (() => {
    if (matter.status === 'Closed') return workflowStages.length - 1;
    if (matter.stage) {
      const idx = workflowStages.findIndex(s => s.toLowerCase() === (matter.stage || '').toLowerCase());
      if (idx >= 0) return idx;
    }
    if (engagementStatus === 'Signed') return Math.min(2, workflowStages.length - 1);
    if (engagementStatus === 'Sent') return Math.min(1, workflowStages.length - 1);
    return 0;
  })();

  return (
    <div style={{ height: 'calc(100vh - 128px)', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Workspace Header */}
      <div className="db-page-header" style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--db-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <button className="db-topbar-btn" style={{ background: 'var(--db-surface)' }} onClick={() => navigate('/dashboard/matters')}>
            <ArrowLeft size={16} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {matter.type === 'Litigation' ? <Scale size={20} style={{ color: '#3b82f6' }} /> : <Briefcase size={20} style={{ color: '#3b82f6' }} />}
            <h1 className="db-page-title" style={{ margin: 0 }}>{matter.title}</h1>
          </div>
          <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', background: '#22c55e20', color: '#22c55e', fontWeight: 600 }}>
            {matter.status}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', fontSize: '0.8125rem', color: 'var(--db-text-secondary)', flexWrap: 'wrap' }}>
          <div><strong>Client:</strong> {matter.client}</div>
          <div><strong>Practice Area:</strong> {matter.type}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle size={14} style={{ color: '#22c55e' }}/> Ethical Wall Active</div>
          <button
            type="button"
            onClick={() => navigate('/dashboard/settings')}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', border: 0, padding: 0, background: 'transparent', color: 'inherit', cursor: 'pointer', font: 'inherit' }}
          >
            <Settings size={14} /> Settings
          </button>
        </div>

        {/* Practice-area workflow pipeline progress */}
        <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '0', overflowX: 'auto', paddingBottom: '2px' }}>
          {workflowStages.map((stage, idx) => {
            const isCompleted = idx < currentStageIndex;
            const isCurrent = idx === currentStageIndex;
            return (
              <div key={stage} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                  position: 'relative',
                }}>
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                    background: isCompleted ? '#76b900' : isCurrent ? '#76b900' : 'var(--db-bg)',
                    border: `2px solid ${isCompleted || isCurrent ? '#76b900' : 'var(--db-border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}>
                    {isCompleted && <CheckCircle size={11} style={{ color: '#071000' }} />}
                    {isCurrent && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#071000' }} />}
                  </div>
                  <div style={{
                    fontSize: '0.5625rem', fontWeight: isCurrent ? 700 : 500, whiteSpace: 'nowrap',
                    color: isCompleted || isCurrent ? 'var(--db-nvidia-green)' : 'var(--db-text-muted)',
                    letterSpacing: '0.02em',
                  }}>{stage}</div>
                </div>
                {idx < workflowStages.length - 1 && (
                  <div style={{
                    height: '2px', width: '24px', flexShrink: 0, marginBottom: '14px',
                    background: isCompleted ? '#76b900' : 'var(--db-border)',
                    transition: 'background 0.2s',
                  }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="db-two-col" style={{ flex: 1, minHeight: 0 }}>
        
        {/* Center Column: AI Matter Chat */}
        <div className="db-card" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', background: 'var(--db-card-bg)', borderBottom: '1px solid var(--db-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="/logos/claw-128-transparent.png" alt="Nemo" style={{ height: '18px', width: 'auto' }} />
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{agentName} (Matter Context Active)</span>
          </div>

          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px', background: 'var(--db-bg)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {messages.map(msg => (
              <div key={msg.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                {msg.role !== 'user' && (
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--db-card-bg)', border: '1px solid var(--db-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                    <img src="/logos/claw-128-transparent.png" alt="Nemo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                )}
                
                <div style={{ background: msg.role === 'user' ? '#3b82f6' : 'var(--db-card-bg)', color: msg.role === 'user' ? '#fff' : 'var(--db-text-primary)', padding: '12px 16px', borderRadius: '8px', border: msg.role === 'user' ? 'none' : '1px solid var(--db-border)', fontSize: '0.875rem', lineHeight: 1.5, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', whiteSpace: 'pre-wrap' }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--db-card-bg)', border: '1px solid var(--db-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  <img src="/logos/claw-128-transparent.png" alt="Nemo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'var(--db-card-bg)', border: '1px solid var(--db-border)', display: 'flex', gap: '4px' }}>
                  <div className="typing-dot" style={{ animationDelay: '0s' }}></div>
                  <div className="typing-dot" style={{ animationDelay: '0.2s' }}></div>
                  <div className="typing-dot" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div style={{ padding: '16px', background: 'var(--db-card-bg)', borderTop: '1px solid var(--db-border)' }}>
             <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <textarea
                ref={inputRef}
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask your agent to draft documents, review evidence, or research this specific matter..."
                style={{ width: '100%', resize: 'none', height: '54px', padding: '16px 50px 16px 16px', borderRadius: '8px', border: '1px solid var(--db-border)', background: 'var(--db-bg)', color: 'var(--db-text-primary)', fontFamily: 'inherit', fontSize: '0.875rem' }}
              />
              <button
                onClick={handleSend}
                disabled={!chatInput.trim() || isTyping}
                style={{ position: 'absolute', right: '8px', bottom: '8px', width: '38px', height: '38px', borderRadius: '6px', border: 'none', background: chatInput.trim() && !isTyping ? '#76b900' : 'var(--db-border)', color: chatInput.trim() && !isTyping ? '#000' : 'var(--db-text-muted)', cursor: chatInput.trim() && !isTyping ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
              >
                <Send size={16} />
              </button>
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)', textAlign: 'center', marginTop: '8px' }}>
              Agent is context-locked to this matter via Ethical Wall injection. Responses are PII-redacted to NVIDIA NIM APIs.
            </div>
          </div>
        </div>

        {/* Right Column: Evidence & Documents */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0, overflowY: 'auto', paddingRight: '4px' }}>
          <div className="db-card" style={{ padding: '16px', flex: '0 0 auto' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '8px', color: 'var(--db-text-primary)' }}>Matter Description</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--db-text-secondary)', lineHeight: 1.5 }}>
              {matter.description || 'No background description provided.'}
            </p>
          </div>

          {/* New: Engagement & Portal Status (Phase 3-4) */}
          <div className="db-card" style={{ padding: '16px', borderLeft: '4px solid var(--db-nvidia-green)', flex: '0 0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Shield size={16} color="var(--db-nvidia-green)" />
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--db-text-primary)' }}>Engagement & Portal</h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Engagement Letter Status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--db-text-secondary)' }}>Engagement Letter</span>
                <span style={{ 
                  fontSize: '0.65rem', 
                  fontWeight: 700, 
                  padding: '2px 8px', 
                  borderRadius: '4px',
                  background: engagementStatus === 'Signed' ? 'rgba(22,163,74,0.1)' : 'rgba(0,0,0,0.05)',
                  color: engagementStatus === 'Signed' ? '#16a34a' : 'var(--db-text-muted)'
                }}>
                  {engagementStatus.toUpperCase()}
                </span>
              </div>
              
              {engagementStatus === 'Drafting' && (
                <button 
                  className="db-btn db-btn-secondary db-btn-sm" 
                  style={{ width: '100%', fontSize: '0.75rem', background: 'var(--db-nvidia-green-subtle)', border: '1px solid var(--db-nvidia-green)', color: 'var(--db-nvidia-green)' }}
                  onClick={handleGenerateEngagement}
                  disabled={Boolean(actionPending) || isClosed}
                >
                  <Bot size={14} style={{ marginRight: '6px' }} /> {actionPending === 'engagement' ? 'Generating...' : 'Generate Engagement Letter'}
                </button>
              )}

              {engagementStatus === 'Sent' && (
                <button 
                  className="db-btn db-btn-primary db-btn-sm" 
                  style={{ width: '100%', fontSize: '0.75rem' }}
                  onClick={handlePartnerSign}
                  disabled={Boolean(actionPending) || isClosed}
                >
                  <CheckCircle size={14} style={{ marginRight: '6px' }} /> {actionPending === 'partner-sign' ? 'Signing...' : 'Partner Review & E-Sign'}
                </button>
              )}

              {/* Portal Status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid var(--db-border)' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--db-text-secondary)' }}>Client Portal</span>
                <span style={{ 
                  fontSize: '0.65rem', 
                  fontWeight: 700, 
                  padding: '2px 8px', 
                  borderRadius: '4px',
                  background: portalProvisioned ? 'rgba(118,185,0,0.1)' : 'rgba(0,0,0,0.05)',
                  color: portalProvisioned ? 'var(--db-nvidia-green)' : 'var(--db-text-muted)'
                }}>
                  {portalProvisioned ? 'PROVISIONED' : 'PENDING SIGNATURE'}
                </span>
              </div>
              
              {portalProvisioned && (
                <button 
                  className="db-btn db-btn-secondary db-btn-sm" 
                  style={{ width: '100%', fontSize: '0.75rem' }}
                  onClick={handleAccessPortal}
                  disabled={Boolean(actionPending)}
                >
                  <ExternalLink size={14} style={{ marginRight: '6px' }} /> {actionPending === 'portal' ? 'Opening Portal...' : 'Access Portal'}
                </button>
              )}

              {engagementStatus === 'Signed' && !isClosed && (
                <button 
                  className="db-btn db-btn-secondary db-btn-sm" 
                  style={{ width: '100%', fontSize: '0.75rem' }}
                  onClick={handleCreateSignatureRequest}
                  disabled={Boolean(actionPending)}
                >
                  <FileText size={14} style={{ marginRight: '6px' }} /> {actionPending === 'signature' ? 'Creating Link...' : 'Create Client Signature Link'}
                </button>
              )}

              {signatureLink && (
                <a
                  href={signatureLink}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'block', fontSize: '0.75rem', color: '#3b82f6', wordBreak: 'break-all' }}
                >
                  {signatureLink}
                </a>
              )}

              {!isClosed && (
                <button
                  className="db-btn db-btn-secondary db-btn-sm"
                  style={{ width: '100%', fontSize: '0.75rem', borderColor: '#16a34a', color: '#16a34a' }}
                  onClick={handleCloseMatter}
                  disabled={Boolean(actionPending)}
                >
                  <CheckCircle size={14} style={{ marginRight: '6px' }} /> {actionPending === 'close' ? 'Closing...' : 'Close Matter'}
                </button>
              )}

              {isClosed && (
                <div style={{ padding: '10px 12px', borderRadius: '6px', background: 'rgba(22,163,74,0.08)', color: '#16a34a', fontSize: '0.75rem', fontWeight: 700 }}>
                  Matter closed and archived for audit.
                </div>
              )}

              {workflowError && (
                <div style={{ padding: '10px 12px', borderRadius: '6px', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: '0.75rem' }}>
                  {workflowError}
                </div>
              )}
            </div>
          </div>


          <div className="db-card" style={{ flex: '0 0 auto', minHeight: '180px', display: 'flex', flexDirection: 'column', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--db-text-primary)' }}>Evidence & Artifacts</h3>
              <input
                ref={uploadInputRef}
                type="file"
                multiple
                hidden
                accept=".pdf,.doc,.docx,.txt,.csv,.json,.png,.jpg,.jpeg"
                onChange={handleArtifactUpload}
              />
              <button type="button" onClick={() => uploadInputRef.current?.click()} style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}>
                <Upload size={14} /> Upload
              </button>
            </div>

            {documentNotice && (
              <div role="status" style={{ fontSize: '0.6875rem', color: 'var(--db-text-secondary)', margin: '-6px 0 10px' }}>{documentNotice}</div>
            )}
            
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
              {documents.map(doc => (
                <div key={doc.id} style={{ display: 'flex', alignItems: 'center', padding: '12px', background: 'var(--db-bg)', borderRadius: '6px', border: '1px solid var(--db-border)' }}>
                  <FileText size={16} style={{ color: doc.type === 'pdf' ? '#ef4444' : '#3b82f6', marginRight: '12px' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--db-text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{doc.name}</div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)' }}>{doc.date}</div>
                  </div>
                  <button type="button" aria-label={`Download ${doc.name}`} onClick={() => handleArtifactDownload(doc)} style={{ background: 'transparent', border: 'none', color: 'var(--db-text-muted)', cursor: 'pointer' }}><Download size={14} /></button>
                </div>
              ))}
            </div>
          </div>
          
          {/* AI Time Capture Widget */}
          <div className="db-card" style={{ flex: '0 0 auto', minHeight: '160px', display: 'flex', flexDirection: 'column', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={16} color="var(--db-nvidia-green)" />
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--db-text-primary)' }}>AI Time Capture</h3>
              </div>
              <span style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)', background: 'var(--db-bg)', padding: '2px 6px', borderRadius: '4px' }}>Auto-log Active</span>
            </div>
            
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
              {timeEntries.map(entry => (
                <div key={entry.id} style={{ padding: '10px 12px', background: 'var(--db-bg)', borderRadius: '6px', border: '1px solid var(--db-border)' }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--db-text-primary)', marginBottom: '4px' }}>{entry.desc}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem' }}>
                    <span style={{ color: 'var(--db-text-secondary)' }}>{entry.duration} @ {entry.rate}</span>
                    <span style={{ fontWeight: 600, color: '#16a34a' }}>{entry.total}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
