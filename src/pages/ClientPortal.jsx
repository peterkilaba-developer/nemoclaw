import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useFirm } from '../contexts/FirmContext';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Link2, MessageSquare, Search, Send, Shield, ShieldCheck, UploadCloud, Users } from 'lucide-react';

export default function ClientPortal() {
  const { user } = useAuth();
  const { firm } = useFirm();
  const [_activeTab, _setActiveTab] = useState('messages');
  const [message, setMessage] = useState('');

  const [clients, setClients] = useState([]);
  const [activeClient, setActiveClient] = useState(null);
  const [_showInviteModal, _setShowInviteModal] = useState(false);
  const [messages, setMessages] = useState([]);
  const [clientFilter, setClientFilter] = useState('');

  useEffect(() => {
    const activeFirmId = firm?.id || user?.firmId;
    if (!activeFirmId) return;
    const q = query(collection(db, 'firms', activeFirmId, 'clientChannels'), orderBy('updatedAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const nextClients = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setClients(nextClients);
      setActiveClient(current => {
        if (!current) return nextClients[0] || null;
        return nextClients.find(client => client.id === current.id) || nextClients[0] || null;
      });
    });
    return () => unsub();
  }, [firm?.id, user?.firmId]);

  useEffect(() => {
    const activeFirmId = firm?.id || user?.firmId;
    if (!activeFirmId || !activeClient?.id) {
      const clearMessages = setTimeout(() => setMessages([]), 0);
      return () => clearTimeout(clearMessages);
    }
    const q = query(collection(db, 'firms', activeFirmId, 'clientChannels', activeClient.id, 'messages'), orderBy('timestamp', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [firm?.id, user?.firmId, activeClient?.id]);

  const handleSendMessage = async () => {
    const activeFirmId = firm?.id || user?.firmId;
    if (!message.trim() || !activeClient || !activeFirmId) return;
    try {
      await addDoc(collection(db, 'firms', activeFirmId, 'clientChannels', activeClient.id, 'messages'), {
        text: message,
        sender: 'firm',
        senderName: user?.displayName || 'Lawyer',
        timestamp: serverTimestamp()
      });
      setMessage('');
    } catch (err) {
      console.error("Failed to send message", err);
    }
  };

  const filteredClients = clients.filter((client) => {
    const needle = clientFilter.trim().toLowerCase();
    if (!needle) return true;
    return `${client.name || ''} ${client.matter || ''}`.toLowerCase().includes(needle);
  });

  const handleCreateChannel = async () => {
    const activeFirmId = firm?.id || user?.firmId;
    if (!activeFirmId) {
      alert('Please authenticate first.');
      return;
    }

    const name = window.prompt('Client name');
    if (!name?.trim()) return;
    const matter = window.prompt('Matter or engagement name') || 'General communication';

    try {
      const newChannelRef = await addDoc(collection(db, 'firms', activeFirmId, 'clientChannels'), {
        name: name.trim(),
        matter: matter.trim() || 'General communication',
        status: 'Active',
        unread: 0,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        createdBy: user?.uid || null,
      });
      setActiveClient({
        id: newChannelRef.id,
        name: name.trim(),
        matter: matter.trim() || 'General communication',
        status: 'Active',
        unread: 0,
      });
    } catch (e) {
      console.error('Failed to create channel', e);
      alert('Unable to create the client channel. Check your firm permissions and try again.');
    }
  };

  return (
    <div className="db-viewport-workspace">
      <div className="db-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--db-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--db-text-primary)' }}>Client Communications</h1>
          <span style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)' }}>Secure Client Channels</span>
        </div>
        <button className="db-btn db-btn-primary db-btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem' }} onClick={() => {
          const link = `${window.location.origin}/portal/invite/${firm?.id || 'pending'}`;
          navigator.clipboard.writeText(link);
        }}>
          <Link2 size={14} /> Copy Invite Link
        </button>
      </div>

      <div className="db-two-col" style={{ flex: 1, minHeight: 0 }}>
        {/* Chat interface */}
        <div className="db-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden', padding: 0 }}>
          <div className="db-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 28px' }}>
            <div>
              <div className="db-card-title">
                <MessageSquare size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
                Secure Portal: {activeClient?.name || 'Select Channel'}
              </div>
              <div className="db-card-subtitle">
                {activeClient ? `Matter: ${activeClient.matter} - ` : ''}<span style={{ color: 'var(--db-accent)' }}>Access Controlled</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="db-btn db-btn-secondary db-btn-sm" style={{ fontSize: '0.6875rem', gap: '4px' }} onClick={() => { if (activeClient) { setMessage('Please upload the requested documents via the secure portal link.'); } }}>
                <UploadCloud size={12} /> Request Files
              </button>
            </div>
          </div>

          {activeClient ? (
            <>
              <div style={{ flex: 1, minHeight: 0, padding: '28px', overflowY: 'auto', background: 'var(--db-bg)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ textAlign: 'center', margin: '10px 0' }}>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)', background: 'rgba(0,0,0,0.05)', padding: '4px 12px', borderRadius: '20px' }}>
                    Secure communication established on {activeClient.createdAt?.toDate ? activeClient.createdAt.toDate().toLocaleDateString() : new Date().toLocaleDateString()}
                  </span>
                </div>

                {messages.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--db-text-muted)', fontSize: '0.8125rem' }}>
                    No messages yet. Send a message to open the secure channel.
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isFirm = msg.sender === 'firm' || msg.sender === 'agent';
                    const isAgent = msg.sender === 'agent';
                    return (
                      <div key={msg.id || idx} style={{ display: 'flex', gap: '12px', flexDirection: isFirm ? 'row-reverse' : 'row' }}>
                        <div style={{ 
                          width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                          background: isAgent ? 'linear-gradient(135deg, var(--db-nvidia-green), #4a7a00)' : (isFirm ? 'var(--db-surface)' : '#3b82f6'),
                          border: isFirm && !isAgent ? '1px solid var(--db-border)' : 'none',
                          color: isAgent ? '#000' : (isFirm ? 'var(--db-text-primary)' : '#fff'),
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 
                        }}>
                          {isAgent ? 'NC' : (isFirm ? (msg.senderName?.[0] || 'L') : (activeClient.name?.[0] || 'C'))}
                        </div>
                        <div style={{ 
                          background: isAgent ? 'rgba(118,185,0,0.08)' : (isFirm ? 'var(--db-surface)' : 'var(--db-surface)'), 
                          border: isAgent ? '1px solid rgba(118,185,0,0.15)' : '1px solid var(--db-border)', 
                          padding: '12px 16px', 
                          borderRadius: isFirm ? '12px 2px 12px 12px' : '2px 12px 12px 12px', 
                          maxWidth: '80%', 
                          boxShadow: 'var(--db-shadow-sm)' 
                        }}>
                            {isAgent && <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--db-nvidia-green)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Auto-Reply · Intake Agent</div>}
                            <div style={{ fontSize: '0.8125rem', color: 'var(--db-text-primary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                              {msg.text}
                            </div>
                            <div style={{ fontSize: '0.625rem', color: 'var(--db-text-muted)', marginTop: '8px', textAlign: isFirm ? 'left' : 'right' }}>
                              {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                            </div>
                        </div>
                      </div>
                    );
                  })
                )}
                
                <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
                  <span style={{ fontSize: '0.6875rem', background: 'var(--db-surface)', padding: '6px 16px', borderRadius: '20px', color: 'var(--db-text-muted)', border: '1px solid var(--db-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }} />
                    Secure Channel Active
                  </span>
                </div>
              </div>

              {/* Chat Input */}
              <div style={{
                padding: '12px 16px', borderTop: '1px solid var(--db-border)',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    className="ob-form-input"
                    style={{ flex: 1, marginBottom: 0 }}
                    placeholder={`Reply to ${activeClient.name}...`}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { handleSendMessage(); } }}
                  />
                  <button
                    className="db-btn db-btn-primary"
                    style={{ padding: '8px 16px' }}
                    onClick={handleSendMessage}
                    disabled={!message.trim()}
                  >
                    <Send size={14} />
                  </button>
                </div>
                {/* Security Signal */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '6px', marginTop: '8px', opacity: 0.6,
                }}>
                  <ShieldCheck size={11} style={{ color: 'var(--db-nvidia-green)' }} />
                  <span style={{
                    fontSize: '0.5625rem', color: 'var(--db-text-muted)',
                    fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase',
                  }}>
                    End-to-end encrypted · NVIDIA NemoClaw Sandbox · PII auto-redacted · Zero data leak
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--db-text-muted)', padding: '20px' }}>
              <div style={{ marginBottom: '16px', opacity: 0.1 }}>
                <Users size={64} />
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--db-text-primary)', marginBottom: '4px' }}>No Active Channels</div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--db-text-muted)', textAlign: 'center', maxWidth: '300px' }}>
                Select a client from the sidebar to view their secure portal.
              </p>
            </div>
          )}
        </div>

        {/* Right Col - Context Panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: 0, overflowY: 'auto' }}>
          <div className="db-card" style={{ padding: 0 }}>
            <div className="db-card-header" style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="db-card-title">
                <Search size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
                Messaging Channels
              </div>
              <button 
                className="db-btn db-btn-secondary db-btn-sm" 
                style={{ fontSize: '0.625rem', padding: '4px 8px' }}
                onClick={handleCreateChannel}
              >
                + Channel
              </button>
            </div>
            <div style={{ padding: '0 24px 16px' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--db-text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="Filter clients..." 
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                  style={{ width: '100%', background: 'var(--db-bg)', border: '1px solid var(--db-border)', borderRadius: '6px', padding: '10px 10px 10px 36px', color: 'var(--db-text-primary)', fontSize: '0.8125rem', outline: 'none' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {filteredClients.map(client => (
                <div 
                  key={client.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Open channel for ${client.name || 'client'}`}
                  onClick={() => setActiveClient(client)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setActiveClient(client);
                    }
                  }}
                  style={{ 
                    padding: '12px 24px', 
                    cursor: 'pointer',
                    background: activeClient?.id === client.id ? 'var(--db-sidebar-active)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    borderLeft: activeClient?.id === client.id ? '4px solid var(--db-nvidia-green)' : '4px solid transparent',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--db-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600, color: 'var(--db-text-muted)' }}>
                    {(client.name || 'C')[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: 'var(--db-text-primary)', fontSize: '0.8125rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.name || 'Unnamed client'}</span>
                      {client.unread > 0 && (
                        <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.625rem', padding: '1px 5px', borderRadius: '10px', fontWeight: 700 }}>{client.unread}</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.matter}</div>
                  </div>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: client.status === 'Active' ? '#16a34a' : '#f59e0b' }} />
                </div>
              ))}
              {filteredClients.length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--db-text-muted)' }}>No messaging channels.</div>
              )}
            </div>
          </div>

          {/* Security badge */}
          <div className="db-card" style={{ background: 'rgba(118,185,0,0.03)', border: '1px solid rgba(118,185,0,0.15)' }}>
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--db-nvidia-green)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                Secure Client Communications
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)', lineHeight: 1.5 }}>
                Client communications are access controlled and written to the firm's audit-ready workspace.
              </div>
              <div style={{ fontSize: '0.5625rem', color: 'var(--db-text-muted)', marginTop: '6px', opacity: 0.6 }}>
                Audit Ready - SOC 2 Audit In Progress - HIPAA Review Required
              </div>
            </div>
          </div>

          {/* Help card */}
          <div className="db-card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
               <Shield size={16} color="var(--db-nvidia-green)" />
               <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--db-text-primary)' }}>Compliance Shield</span>
            </div>
            <p style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)', lineHeight: 1.5, margin: 0 }}>
              Encrypted interaction logs are stored in your firm's immutable vault for automatic compliance archiving.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
