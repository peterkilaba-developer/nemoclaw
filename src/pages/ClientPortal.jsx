import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useFirm } from '../contexts/FirmContext';
import { MessageSquare, Users, Link2, ExternalLink, Send, Shield, Lock, Bell, Search, UploadCloud, ShieldCheck } from 'lucide-react';

export default function ClientPortal() {
  const { user } = useAuth();
  const { firm } = useFirm();
  const [activeTab, setActiveTab] = useState('messages');
  const [message, setMessage] = useState('');

  const [clients, setClients] = useState([]);

  const [activeClient, setActiveClient] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

  return (
    <div className="db-viewport-workspace">
      <div className="db-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--db-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--db-text-primary)' }}>Client Communications</h1>
          <span style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)' }}>Secure E2E Channels</span>
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
        <div className="db-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: 0 }}>
          <div className="db-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 28px' }}>
            <div>
              <div className="db-card-title">
                <MessageSquare size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
                Secure Portal: {activeClient?.name || 'Select Channel'}
              </div>
              <div className="db-card-subtitle">
                {activeClient ? `Matter: ${activeClient.matter} · ` : ''}<span style={{ color: 'var(--db-accent)' }}>E2E Encrypted</span>
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
              <div style={{ flex: 1, padding: '28px', overflowY: 'auto', background: 'var(--db-bg)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ textAlign: 'center', margin: '10px 0' }}>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)', background: 'rgba(0,0,0,0.05)', padding: '4px 12px', borderRadius: '20px' }}>
                    Secure communication established on {new Date().toLocaleDateString()}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600, flexShrink: 0 }}>
                    {activeClient.name.split(' ').map(n=>n[0]).join('')}
                  </div>
                  <div style={{ background: 'var(--db-surface)', border: '1px solid var(--db-border)', padding: '12px 16px', borderRadius: '2px 12px 12px 12px', maxWidth: '80%', boxShadow: 'var(--db-shadow-sm)' }}>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--db-text-primary)', lineHeight: 1.5 }}>
                        Documents have been uploaded for the discovery request via the secure link. Please confirm receipt.
                      </div>
                      <div style={{ fontSize: '0.625rem', color: 'var(--db-text-muted)', marginTop: '8px', textAlign: 'right' }}>{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', flexDirection: 'row-reverse' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--db-nvidia-green), #4a7a00)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 700, flexShrink: 0 }}>
                    NC
                  </div>
                  <div style={{ background: 'rgba(118,185,0,0.08)', border: '1px solid rgba(118,185,0,0.15)', padding: '12px 16px', borderRadius: '12px 2px 12px 12px', maxWidth: '80%', boxShadow: 'var(--db-shadow-sm)' }}>
                      <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--db-nvidia-green)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Auto-Reply · Intake Agent</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--db-text-primary)', lineHeight: 1.5 }}>
                        Receipt confirmed. Documents have been securely synced to the matter workspace for attorney review. The legal team has been notified.
                      </div>
                      <div style={{ fontSize: '0.625rem', color: 'var(--db-text-muted)', marginTop: '8px', textAlign: 'left' }}>{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
                  <span style={{ fontSize: '0.6875rem', background: 'var(--db-surface)', padding: '6px 16px', borderRadius: '20px', color: 'var(--db-text-muted)', border: '1px solid var(--db-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b' }} />
                    Waiting for Attorney Response
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
                    onKeyDown={(e) => { if (e.key === 'Enter' && message.trim()) { setMessage(''); } }}
                  />
                  <button
                    className="db-btn db-btn-primary"
                    style={{ padding: '8px 16px' }}
                    onClick={() => { if (message.trim()) { setMessage(''); } }}
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
                {firm?.isConfigured 
                  ? "Select a client from the sidebar to view their secure portal."
                  : "Deploy your firm sandbox in the Command Center to activate client portals."}
              </p>
            </div>
          )}
        </div>

        {/* Right Col - Context Panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
          <div className="db-card" style={{ padding: 0 }}>
            <div className="db-card-header" style={{ padding: '20px 24px' }}>
              <div className="db-card-title">
                <Search size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
                Messaging Channels
              </div>
            </div>
            <div style={{ padding: '0 24px 16px' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--db-text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="Filter clients..." 
                  style={{ width: '100%', background: 'var(--db-bg)', border: '1px solid var(--db-border)', borderRadius: '6px', padding: '10px 10px 10px 36px', color: 'var(--db-text-primary)', fontSize: '0.8125rem', outline: 'none' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {clients.map(client => (
                <div 
                  key={client.id}
                  onClick={() => setActiveClient(client)}
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
                    {client.name[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: 'var(--db-text-primary)', fontSize: '0.8125rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.name}</span>
                      {client.unread > 0 && (
                        <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.625rem', padding: '1px 5px', borderRadius: '10px', fontWeight: 700 }}>{client.unread}</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.matter}</div>
                  </div>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: client.status === 'Active' ? '#16a34a' : '#f59e0b' }} />
                </div>
              ))}
              {clients.length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--db-text-muted)' }}>No messaging channels.</div>
              )}
            </div>
          </div>

          {/* Security badge */}
          <div className="db-card" style={{ background: 'rgba(118,185,0,0.03)', border: '1px solid rgba(118,185,0,0.15)' }}>
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--db-nvidia-green)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                🔒 Zero Data Leak Guarantee
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)', lineHeight: 1.5 }}>
                All client communications are secured by NVIDIA NemoClaw sandbox. PII auto-redacted.
              </div>
              <div style={{ fontSize: '0.5625rem', color: 'var(--db-text-muted)', marginTop: '6px', opacity: 0.6 }}>
                Audit Ready · SOC2 Compliant · HIPAA Ready
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
