import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useFirm } from '../contexts/FirmContext';
import { capitalizeWords } from '../utils/formatters';
import { ChevronRight, Mail, Phone, Plus, Search, UserPlus, Users } from 'lucide-react';

export default function ClientCRM({ hideHeader }) {
  const { firmId } = useFirm();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClient, setNewClient] = useState({ firstName: '', lastName: '', email: '', phone: '', company: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchClients() {
      if (!firmId) return;
      try {
        const q = query(collection(db, 'firms', firmId, 'clients'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        setClients(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        console.error("Failed to fetch clients:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchClients();
  }, [firmId, showAddModal]);

  const handleAddClient = async (e) => {
    e.preventDefault();
    if (!newClient.firstName || !newClient.lastName) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'firms', firmId, 'clients'), {
        ...newClient,
        name: `${newClient.firstName} ${newClient.lastName}`.trim(),
        status: 'Active',
        createdAt: serverTimestamp()
      });
      setShowAddModal(false);
      setNewClient({ firstName: '', lastName: '', email: '', phone: '', company: '' });
    } catch (e) {
      console.error("Error creating client:", e);
    } finally {
      setSaving(false);
    }
  };

  const filteredClients = clients.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div style={{ padding: '24px', color: 'var(--db-text-muted)' }}>Loading CRM...</div>;
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header */}
      {!hideHeader && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--db-text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={24} style={{ color: 'var(--db-nvidia-green)' }} />
              Firm Client Roster
            </h1>
            <p style={{ color: 'var(--db-text-muted)', fontSize: '0.875rem' }}>
              Centralized database for all firm contacts. Updating details here orchestrates across Portals & Matters automatically.
            </p>
          </div>
          <button 
            className="db-btn db-btn-primary" 
            onClick={() => setShowAddModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} /> New Client
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="db-card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ position: 'relative', maxWidth: '400px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--db-text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search by name, company, or email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '10px 10px 10px 36px', background: 'var(--db-bg)', border: '1px solid var(--db-border)', borderRadius: '6px', color: 'var(--db-text-primary)' }}
          />
        </div>
      </div>

      {/* Roster Table */}
      <div className="db-card">
        {clients.length === 0 ? (
          <div style={{ padding: '64px 20px', textAlign: 'center' }}>
            <Users size={48} style={{ color: 'var(--db-text-muted)', opacity: 0.2, margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '1.125rem', color: 'var(--db-text-primary)', marginBottom: '8px' }}>Your CRM is Empty</h3>
            <p style={{ color: 'var(--db-text-muted)', fontSize: '0.875rem', marginBottom: '24px' }}>Add your first client to start linking matters and deploying secure AI portals.</p>
            <button className="db-btn db-btn-primary" onClick={() => setShowAddModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}>
              <UserPlus size={18} /> Add Your First Client
            </button>
          </div>
        ) : (
          <div>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--db-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--db-text-primary)' }}>Client Directory</div>
              <button 
                className="db-btn db-btn-primary db-btn-sm" 
                onClick={() => setShowAddModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={14} /> New Client
              </button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--db-border)', textAlign: 'left', color: 'var(--db-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '16px 24px', fontWeight: 600 }}>Client Name</th>
                <th style={{ padding: '16px 24px', fontWeight: 600 }}>Contact Info</th>
                <th style={{ padding: '16px 24px', fontWeight: 600 }}>Company/Entity</th>
                <th style={{ padding: '16px 24px', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '16px 24px', textAlign: 'right' }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map(client => (
                <tr key={client.id} style={{ borderBottom: '1px solid var(--db-border)', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--db-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--db-text-primary)' }}>{client.name}</div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--db-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={12} /> {client.email || '--'}</span>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--db-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={12} /> {client.phone || '--'}</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--db-text-primary)' }}>{client.company || 'Individual'}</div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ display: 'inline-block', padding: '4px 8px', background: 'rgba(22, 163, 74, 0.1)', color: '#16a34a', borderRadius: '4px', fontSize: '0.6875rem', fontWeight: 600 }}>
                      {client.status || 'Active'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right', color: 'var(--db-text-muted)' }}>
                    <ChevronRight size={16} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Add Client Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="db-card" style={{ 
            width: '100%', 
            maxWidth: '500px', 
            margin: '20px', 
            padding: '0',
            background: 'var(--modal-bg)', 
            border: '1px solid var(--modal-border)',
            color: 'var(--modal-text)',
            overflow: 'hidden',
            animation: 'fadeIn 0.2s ease-out' 
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--modal-border)', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.125rem', color: 'var(--modal-text)' }}>Add New Client</h2>
              <button 
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--modal-text-muted)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddClient} style={{ padding: '24px' }}>
              
              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--modal-text-muted)', marginBottom: '6px', fontWeight: 600 }}>First Name *</label>
                  <input 
                    type="text" 
                    required
                    value={newClient.firstName}
                    onChange={e => setNewClient({ ...newClient, firstName: capitalizeWords(e.target.value) })}
                    className="ob-form-input"
                    style={{ width: '100%', marginBottom: 0, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--modal-border)', color: 'var(--modal-text)' }}
                    placeholder="e.g. John"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--modal-text-muted)', marginBottom: '6px', fontWeight: 600 }}>Last Name *</label>
                  <input 
                    type="text" 
                    required
                    value={newClient.lastName}
                    onChange={e => setNewClient({ ...newClient, lastName: capitalizeWords(e.target.value) })}
                    className="ob-form-input"
                    style={{ width: '100%', marginBottom: 0, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--modal-border)', color: 'var(--modal-text)' }}
                    placeholder="e.g. Doe"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--modal-text-muted)', marginBottom: '6px', fontWeight: 600 }}>Company / Entity</label>
                <input 
                  type="text" 
                  value={newClient.company}
                  onChange={e => setNewClient({ ...newClient, company: capitalizeWords(e.target.value) })}
                  className="ob-form-input"
                  style={{ width: '100%', marginBottom: 0, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--modal-border)', color: 'var(--modal-text)' }}
                  placeholder="e.g. Acme Corp (optional)"
                />
              </div>

              <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--modal-text-muted)', marginBottom: '6px', fontWeight: 600 }}>Email Address</label>
                <input 
                    type="email" 
                    value={newClient.email}
                    onChange={e => setNewClient({ ...newClient, email: e.target.value })}
                    className="ob-form-input"
                    style={{ width: '100%', marginBottom: 0, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--modal-border)', color: 'var(--modal-text)' }}
                    placeholder="client@example.com"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--modal-text-muted)', marginBottom: '6px', fontWeight: 600 }}>Phone Number</label>
                  <input 
                    type="tel" 
                    value={newClient.phone}
                    onChange={e => setNewClient({ ...newClient, phone: e.target.value })}
                    className="ob-form-input"
                    style={{ width: '100%', marginBottom: 0, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--modal-border)', color: 'var(--modal-text)' }}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--modal-border)', marginTop: '24px', paddingTop: '24px' }}>
                <button 
                  type="button" 
                  className="db-btn db-btn-secondary" 
                  onClick={() => setShowAddModal(false)}
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--modal-text)', border: '1px solid var(--modal-border)' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="db-btn db-btn-primary" 
                  disabled={saving || !newClient.firstName || !newClient.lastName}
                  style={{ background: 'var(--db-nvidia-green)', color: '#000' }}
                >
                  {saving ? 'Saving...' : 'Save Client Database Record'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
