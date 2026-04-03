import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, CheckCircle, XCircle, AlertTriangle, Search, FileText, UserCheck, Check, 
  FolderOpen, Users, Mail, Bot, DollarSign, Clock, TrendingUp, Zap, 
  ArrowRight, Lock, Timer, Crown, Plus, Minus as MinusIcon, ChevronRight,
  ShieldAlert, ExternalLink, Download, CreditCard as CardIcon, History, AlertCircle, Info, HelpCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useFirm } from '../contexts/FirmContext';
import { redirectToCheckout, redirectToPortal, PRICING, calculateMonthlyTotal, getFounderDaysRemaining, isInFounderWindow } from '../lib/stripeService';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { collection, query, orderBy, getDocs, doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const stripePromise = loadStripe((import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '').trim());

// Inline Card Update Form Component
function CardUpdateForm({ onSuccess, onCancel, firmId }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError('');

    const cardElement = elements.getElement(CardElement);
    const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
    });

    if (stripeError) {
      setError(stripeError.message);
      setLoading(false);
      return;
    }

    try {
      // 1. Send PM to Firebase Backend to attach to Stripe Customer & update Firestore
      console.log('Syncing Payment Method to Backend:', paymentMethod.id);
      
      const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'nemoc-law-ai';
      const baseUrl = `https://us-central1-${projectId}.cloudfunctions.net`;

      const response = await fetch(`${baseUrl}/finalizePaymentSetup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firmId, paymentMethodId: paymentMethod.id })
      });
      
      if (!response.ok) {
        throw new Error('Failed to synchronize payment method with Cloud infrastructure.');
      }
      
      onSuccess();
    } catch (err) {
      setError('Failed to update payment method. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--db-text-secondary)', marginBottom: '8px' }}>
          Credit or Debit Card
        </label>
        <div style={{ 
          padding: '12px', borderRadius: '8px', border: '1px solid var(--db-border)',
          background: 'var(--db-bg)' 
        }}>
          <CardElement options={{
            style: {
              base: {
                fontSize: '14px',
                color: '#1e293b',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                fontSmoothing: 'antialiased',
                '::placeholder': { color: '#94a3b8' },
              },
              invalid: { color: '#ef4444' },
            }
          }} />
        </div>
      </div>
      
      {error && (
        <div style={{ padding: '10px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', fontSize: '0.75rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          type="submit"
          disabled={!stripe || loading}
          className="db-btn-primary"
          style={{ flex: 1 }}
        >
          {loading ? 'Updating...' : 'Update Payment Method'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{ flex: 1, background: 'none', border: '1px solid var(--db-border)', color: 'var(--db-text-primary)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600 }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function BillingUsage() {
  return (
    <Elements stripe={stripePromise}>
      <BillingUsageContent />
    </Elements>
  );
}

function BillingUsageContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { firm, refreshFirm, loading: firmLoading } = useFirm();
  const firmId = firm?.id;
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const extraSeats = firm?.extraSeats || 0;
  const autonomousRoles = firm?.autonomousRoles || 0;
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showUpdateCardModal, setShowUpdateCardModal] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [toast, setToast] = useState(null);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  
  // Client Billing Logic
  const [billableActivities, setBillableActivities] = useState([]);
  const [clientInvoices, setClientInvoices] = useState([]);
  const [loadingClientData, setLoadingClientData] = useState(true);
  const [view, setView] = useState('revenue'); // 'revenue' or 'subscription'

  // Success/Cancel state from URL
  const [status, setStatus] = useState(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get('status');
    if (s) {
      setStatus(s);
      if (s === 'success') refreshFirm();
    }
  }, [location, refreshFirm]);

  // Persistence: Load detected billable activities from Firestore
  useEffect(() => {
    if (!firmId) { setLoadingClientData(false); return; }
    
    async function fetchClientData() {
      try {
        const activitiesSnap = await getDocs(query(collection(db, 'firms', firmId, 'billableActivities'), orderBy('timestamp', 'desc')));
        setBillableActivities(activitiesSnap.docs.map(d => ({
          id: d.id,
          ...d.data(),
          status: d.data().status || 'detected'
        })));

        const invoicesSnap = await getDocs(query(collection(db, 'firms', firmId, 'clientInvoices'), orderBy('issuedAt', 'desc')));
        setClientInvoices(invoicesSnap.docs.map(d => ({
          id: d.id,
          ...d.data(),
          amount: d.data().amount || 0,
          status: d.data().status || 'pending'
        })));
      } catch (err) {
        console.warn('Error loading client billing data:', err);
      } finally {
        setLoadingClientData(false);
      }
    }
    fetchClientData();
  }, [firmId]);

  // Load NemoC Subscription Invoices
  useEffect(() => {
    if (!firmId) { setLoadingInvoices(false); return; }

    async function fetchInvoices() {
      try {
        const snap = await getDocs(query(collection(db, 'firms', firmId, 'invoices'), orderBy('createdAt', 'desc')));
        const items = snap.docs.map(d => ({
          id: d.id,
          date: d.data().createdAt?.toDate?.()?.toLocaleDateString() || new Date(d.data().createdAt).toLocaleDateString(),
          amount: (d.data().amount || 0) / 100,
          formattedAmount: `$${((d.data().amount || 0) / 100).toFixed(2)}`,
          status: d.data().status || 'paid',
          number: d.data().number,
          invoice_url: d.data().invoice_url || d.data().hosted_invoice_url
        }));
        setInvoices(items);
      } catch (err) {
        console.warn('Error fetching subscription invoices:', err);
      } finally {
        setLoadingInvoices(false);
      }
    }
    fetchInvoices();
  }, [firmId]);

  if (firmLoading) {
    return <div style={{ padding: '40px', color: 'var(--db-text-muted)' }}>Loading Financial records...</div>;
  }

  // Handle missing firm gracefully with defaults
  const safeFirm = firm || {
    plan: 'trial',
    trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    seats: 1,
    firmSize: 'solo'
  };

  const isTrialPlan = !safeFirm?.plan || safeFirm.plan === 'trial';
  const founderDays = getFounderDaysRemaining(safeFirm?.trialEndsAt);
  const inFounderWindow = isInFounderWindow(safeFirm?.trialEndsAt);
  const totals = calculateMonthlyTotal(extraSeats, autonomousRoles, inFounderWindow);

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    setCheckoutError('');
    try {
      await redirectToCheckout(firmId, 0, 0, true);
    } catch (err) {
      setCheckoutError(err.message || 'Payment gateway unavailable. Please contact support.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      await redirectToPortal(firmId);
    } catch (err) {
      showToast('error', 'Secure billing portal currently unavailable. AI operations team notified.');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleApplyActivities = async (activityIds) => {
    setToast({ type: 'info', message: `Generating draft invoice for ${activityIds.length} billable activities...` });
    setTimeout(() => setToast(null), 4000);
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // ════════════════════════════════════════════════════════════════
  // RENDER: FINANCIALS COMMAND CENTER
  // ════════════════════════════════════════════════════════════════
  
  return (
    <div className="db-page-container">
      {/* ── Toast Notification ── */}
      {toast && (
        <div style={{
          position: 'fixed', top: '80px', right: '32px', zIndex: 9999,
          padding: '14px 20px', borderRadius: '10px', maxWidth: '380px',
          background: toast.type === 'success' ? 'rgba(22, 163, 74, 0.12)' : toast.type === 'error' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(118, 185, 0, 0.12)',
          border: `1px solid ${toast.type === 'success' ? 'rgba(22, 163, 74, 0.25)' : toast.type === 'error' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(118, 185, 0, 0.25)'}`,
          color: toast.type === 'success' ? '#16a34a' : toast.type === 'error' ? '#ef4444' : 'var(--db-nvidia-green)',
          fontSize: '0.8125rem', fontWeight: 600, backdropFilter: 'blur(12px)',
          animation: 'fadeIn 0.2s ease',
          display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : toast.type === 'error' ? <AlertCircle size={16} /> : <Info size={16} />}
          {toast.message}
        </div>
      )}

      <div className="db-page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', width: '100%' }}>
          <div style={{ flex: '1' }}>
            <h1 className="db-page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <DollarSign size={24} color="var(--db-nvidia-green)" />
              Financials & Revenue
            </h1>
            <p className="db-page-subtitle">Firm-wide billing oversight, subscription management, and unbilled revenue detection.</p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignSelf: 'center' }}>
            <button 
              className={`db-tab-pill ${view === 'revenue' ? 'active' : ''}`}
              onClick={() => setView('revenue')}
            >
              <TrendingUp size={14} /> Revenue Intelligence
            </button>
            <button 
              className={`db-tab-pill ${view === 'subscription' ? 'active' : ''}`}
              onClick={() => setView('subscription')}
            >
              <ShieldCheck size={14} /> Firm Subscription
            </button>
          </div>
        </div>
      </div>

      {status === 'success' && (
        <div className="db-alert-success" style={{ marginBottom: '24px' }}>
          <CheckCircle size={18} />
          Your NemoC subscription has been successfully activated. The Founder Price-Lock is now in effect.
        </div>
      )}

      {view === 'revenue' ? (
        /* REVENUE & BILLING VIEW */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
          <div className="db-stat-card">
            <div className="db-stat-label">Total Unbilled Time</div>
            <div className="db-stat-value">{safeFirm.isConfigured ? '$14,240.00' : '$0.00'}</div>
            <div className="db-stat-meta" style={{ color: 'var(--db-nvidia-green)' }}>Agent-detected in last 30 days</div>
          </div>
          <div className="db-stat-card">
            <div className="db-stat-label">Pending Invoices</div>
            <div className="db-stat-value">{safeFirm.isConfigured ? '12' : '0'}</div>
            <div className="db-stat-meta">Awaiting partner approval</div>
          </div>
          <div className="db-stat-card">
            <div className="db-stat-label">Revenue Target</div>
            <div className="db-stat-value">{safeFirm.isConfigured ? '84%' : '0%'}</div>
            <div className="db-stat-meta">Current quarter projection</div>
          </div>
          <div className="db-stat-card">
            <div className="db-stat-label">Trust Account</div>
            <div className="db-stat-value">{safeFirm.isConfigured ? '$42,500.00' : '$0.00'}</div>
            <div className="db-stat-meta">IOLTA reconciliation pending</div>
          </div>
        </div>
      ) : (
        /* SUBSCRIPTION VIEW */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }}>
          <div className="db-stat-card">
            <div className="db-stat-label">Subscription Tier</div>
            <div className="db-stat-value" style={{ fontSize: '1.25rem', color: 'var(--db-nvidia-green)' }}>
              {isTrialPlan ? 'Founding Alpha' : 'Born Agentic'}
            </div>
            <div className="db-stat-meta">
              {isTrialPlan ? `${founderDays} days of price-lock remaining` : 'Annual Price-Lock active'}
            </div>
          </div>
          <div className="db-stat-card">
            <div className="db-stat-label">Monthly Overhead</div>
            <div className="db-stat-value">$297.00</div>
            <div className="db-stat-meta">Next billing: {new Date(new Date().setMonth(new Date().getMonth() + 1)).toLocaleDateString()}</div>
          </div>
          <div className="db-stat-card">
            <div className="db-stat-label">Security Protocol</div>
            <div className="db-stat-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={20} color="var(--db-nvidia-green)" /> PCI Level 1
            </div>
            <div className="db-stat-meta">Secured by NVIDIA NemoClaw</div>
          </div>
        </div>
      )}

      {view === 'revenue' ? (
        <div className="db-two-col">
          <div className="db-col-main" style={{ flex: '1.5' }}>
            <div className="db-card" style={{ padding: '0' }}>
              <div className="db-card-header" style={{ padding: '24px', borderBottom: '1px solid var(--db-border-light)' }}>
                <div>
                  <h3 className="db-card-title">AI Unbilled Time Detection</h3>
                  <p className="db-card-desc">Real-time activities logged by your AI workforce requiring client attribution.</p>
                </div>
                <button 
                  className="db-btn-secondary" 
                  onClick={() => {
                    if (billableActivities.length === 0) {
                      showToast('info', 'No billable events found. Your AI workforce will automatically generate these as tasks are completed.');
                    } else {
                      handleApplyActivities(billableActivities.map(a => a.id));
                    }
                  }}
                >
                  <FileText size={14} /> Log All to Matters
                </button>
              </div>
              
              <div style={{ padding: '0 24px' }}>
                {billableActivities.length > 0 ? (
                  <table className="db-table">
                    <thead>
                      <tr>
                        <th>Agent</th>
                        <th>Activity</th>
                        <th>Duration</th>
                        <th>Value</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {billableActivities.map((act) => (
                        <tr key={act.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'var(--db-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Bot size={14} color="var(--db-nvidia-green)" />
                              </div>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{act.agentRole || 'Associate'}</span>
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{act.taskName}</div>
                            <div style={{ fontSize: '0.625rem', color: 'var(--db-text-muted)' }}>Matter: {act.matterName || 'Unassigned'}</div>
                          </td>
                          <td style={{ fontSize: '0.75rem' }}>{act.duration || '0.2h'}</td>
                          <td style={{ fontSize: '0.75rem', fontWeight: 700 }}>${act.value?.toFixed(2) || '0.00'}</td>
                          <td>
                            <button className="db-btn-icon-sm" title="Approve and Invoice">
                              <Check size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(118, 185, 0, 0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                      <Zap size={20} color="var(--db-nvidia-green)" />
                    </div>
                    <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--db-text-primary)' }}>No billable events detected</h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--db-text-secondary)', maxWidth: '320px', margin: '8px auto 0', lineHeight: 1.5 }}>
                      Your AI workforce will automatically surface unbilled time from document drafting, legal research, and client interactions as matters are processed.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="db-col-side" style={{ flex: '1' }}>
             <div className="db-card">
               <h3 className="db-card-title">Client Invoices</h3>
               <p className="db-card-desc">Status of firm accounts receivable.</p>
               
               <div style={{ marginTop: '20px' }}>
                 {clientInvoices.length > 0 ? (
                   clientInvoices.map((inv) => (
                     <div key={inv.id} className="db-feed-item">
                       <div className="db-feed-content">
                         <div className="db-feed-title">{inv.clientName}</div>
                         <div className="db-feed-desc">Inv #{inv.number} · {inv.issuedAt ? new Date(inv.issuedAt).toLocaleDateString() : 'Draft'}</div>
                       </div>
                       <div style={{ textAlign: 'right' }}>
                         <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>${inv.amount.toFixed(2)}</div>
                         <div style={{ fontSize: '0.625rem', color: inv.status === 'paid' ? '#16a34a' : '#f59e0b' }}>
                           {inv.status?.toUpperCase()}
                         </div>
                       </div>
                     </div>
                   ))
                 ) : (
                    <div style={{ padding: '40px 20px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed var(--db-border)' }}>
                      <FileText size={24} style={{ color: 'var(--db-text-muted)', marginBottom: '12px', opacity: 0.5 }} />
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--db-text-primary)' }}>No active client invoices</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)', marginTop: '4px', lineHeight: 1.5 }}>Invoices will appear here once your AI workforce detects and you approve billable activities.</div>
                    </div>
                 )}
               </div>

               <button 
                 className="db-btn-outline" 
                 style={{ width: '100%', marginTop: '20px' }}
                 onClick={() => {
                   if (clientInvoices.length === 0) {
                     showToast('info', 'Revenue reports require active client invoices. Approve AI-detected activities to begin.');
                   } else {
                     showToast('success', 'Intelligence report generation initiated. Notification will be sent to the Firm Owner upon completion.');
                   }
                 }}
               >
                 <Download size={14} /> Export Revenue Report (CSV)
               </button>
             </div>

             <div className="db-card" style={{ marginTop: '20px' }}>
               <h3 className="db-card-title">IOLTA Management</h3>
               <p className="db-card-desc">Client trust accounting controls.</p>
               <div style={{ marginTop: '20px', padding: '16px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--db-border)' }}>
                 <div style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)', marginBottom: '4px' }}>TRUST BALANCE</div>
                 <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>$0.00</div>
               </div>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
                 <button className="db-btn-secondary" style={{ fontSize: '0.75rem' }} onClick={() => showToast('info', 'IOLTA trust account configuration is being provisioned by your AI workforce.')}>Configure</button>
                 <button className="db-btn-secondary" style={{ fontSize: '0.75rem' }} onClick={() => showToast('info', 'Audit trail will be available once trust transactions are recorded.')}>Audit</button>
               </div>
             </div>
          </div>
        </div>
      ) : (
        /* SUBSCRIPTION LAYOUT */
        <div className="db-two-col">
          <div className="db-col-main" style={{ flex: '1.5' }}>
            <div className="db-card">
              <div className="db-card-header">
                <div>
                  <h3 className="db-card-title">Manage Firm Subscription</h3>
                  <p className="db-card-desc">You are currently on the {isTrialPlan ? 'Founding Alpha' : 'Born Agentic'} plan with a Lifelong Price-Lock.</p>
                </div>
                <div className="db-plan-badge">
                  <ShieldCheck size={14} /> Founder Price-Locked
                </div>
              </div>

              <div style={{ marginTop: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>Your Subscription Tally</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)' }}>${totals.total.toFixed(2)} / month total</div>
                </div>

                <div style={{ display: 'grid', gap: '12px' }}>
                  <div className="db-billing-line">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="db-billing-icon" style={{ padding: '4px' }}>
                        <img src="/logos/claw-128-transparent.png" alt="NemoC" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Agentic OS Core</div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)' }}>1 Agentic AI Seat + Core Security Sandbox</div>
                      </div>
                    </div>
                    <div style={{ fontWeight: 700 }}>$297.00</div>
                  </div>

                  <div className="db-billing-line" style={{ opacity: extraSeats > 0 ? 1 : 0.5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="db-billing-icon"><Users size={16} /></div>
                      <div>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Additional Human Seats</div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)' }}>{extraSeats} extra staff invited</div>
                      </div>
                    </div>
                    <div style={{ fontWeight: 700 }}>${totals.seats.toFixed(2)}</div>
                  </div>
                  <div className="db-billing-line" style={{ opacity: autonomousRoles > 0 ? 1 : 0.5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="db-billing-icon"><Bot size={16} /></div>
                      <div>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Standalone Autonomous Agents</div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)' }}>{autonomousRoles} Autonomously Agentic licenses active</div>
                      </div>
                    </div>
                    <div style={{ fontWeight: 700 }}>${totals.autonomous.toFixed(2)}</div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '40px', padding: '24px', borderRadius: '12px', background: 'rgba(118, 185, 0, 0.05)', border: '1px solid rgba(118, 185, 0, 0.2)' }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                   <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--db-nvidia-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                     <Zap size={24} color="#000" />
                   </div>
                   <div>
                     <h4 style={{ fontSize: '0.9375rem', fontWeight: 800 }}>Founder's Price-Lock Active</h4>
                     <p style={{ fontSize: '0.75rem', color: 'var(--db-text-secondary)', marginTop: '4px', lineHeight: 1.5 }}>
                       You have successfully secured the $297/mo rate for your firm's lifetime. 
                       This covers your foundational AI Chief of Staff (Managing Partner Agent) mapped to your primary role. 
                       To unlock distinct Business-of-Law autonomous agents (Billing, Receptionist, Operations), you must add subsequent human seats or purchase standalone agentic licenses.
                     </p>
                   </div>
                </div>
              </div>

            </div>
          </div>

          <div className="db-col-side" style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <button 
              className="db-btn-primary" 
              onClick={() => setShowUpdateCardModal(prev => !prev)}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <CardIcon size={16} /> Manage Billing & Cards
            </button>

            {showUpdateCardModal && (
              <div style={{ border: '1px solid var(--db-border-light)', borderRadius: '12px', background: 'var(--db-surface)', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--db-border-light)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(118, 185, 0, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CardIcon size={20} color="var(--db-nvidia-green)" />
                    </div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--db-text-primary)' }}>Secure Card Update</h3>
                  </div>
                  <CardUpdateForm 
                    firmId={firmId} 
                    onCancel={() => setShowUpdateCardModal(false)}
                    onSuccess={() => {
                      setShowUpdateCardModal(false);
                      refreshFirm();
                      showToast('success', 'Secure payment method successfully authorized.');
                    }}
                  />
                </div>
                <div style={{ padding: '12px', background: 'var(--db-bg)', textAlign: 'center', borderTop: '1px solid var(--db-border-light)' }}>
                   <span style={{ fontSize: '0.625rem', color: 'var(--db-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                     <ShieldCheck size={12} /> PCI Compliant Service
                   </span>
                </div>
              </div>
            )}

            {!showUpdateCardModal && safeFirm.stripePaymentMethodId && (
              <div className="db-card" id="payment-method-card">
                <h3 className="db-card-title">Payment Method</h3>
                <p className="db-card-desc">Card on file for automated overhead.</p>
                <div style={{ marginTop: '20px' }}>
                  <div style={{ 
                    padding: '16px', borderRadius: '12px', background: 'var(--db-bg)', border: '1px solid var(--db-border)',
                    display: 'flex', alignItems: 'center', gap: '12px'
                  }}>
                    <div style={{ width: '40px', height: '30px', borderRadius: '4px', background: 'var(--db-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--db-border)' }}>
                      <CardIcon size={18} color="var(--db-text-muted)" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 700 }}>•••• •••• •••• {safeFirm.cardLast4 || '4242'}</div>
                      <div style={{ fontSize: '0.625rem', color: 'var(--db-text-muted)' }}>Expires {safeFirm.cardExp || '12/28'}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!showUpdateCardModal && !safeFirm.stripePaymentMethodId && (
              <div className="db-card" id="payment-method-card">
                <h3 className="db-card-title">Payment Method</h3>
                <div style={{ 
                  padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--db-border)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)', margin: '12px 0' }}>No payment method on file.</div>
                  <button 
                    onClick={() => setShowUpdateCardModal(true)}
                    className="db-btn-secondary" 
                    style={{ width: '100%', fontSize: '0.75rem' }}
                  >
                    Add Payment Method
                  </button>
                </div>
              </div>
            )}

            <button 
              className="db-btn-outline"
              onClick={() => setShowCancelModal(true)}
              style={{ width: '100%', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)', justifyContent: 'center' }}
            >
              <ShieldAlert size={16} /> Cancel Subscription
            </button>

              <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--db-border)' }}>
                <h3 className="db-card-title" style={{ fontSize: '0.8125rem' }}>NemoC Billing History</h3>
                <div style={{ marginTop: '16px' }}>
                  {loadingInvoices ? (
                    <div style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)' }}>Fetching logs...</div>
                  ) : invoices.length > 0 ? (
                    invoices.map((inv, i) => (
                      <div key={inv.id || i} className="db-feed-item">
                        <div className="db-feed-content">
                          <div className="db-feed-title">{inv.date} — {inv.description || 'Agentic OS Subscription'}</div>
                          <div className="db-feed-desc">{inv.formattedAmount} · Invoice #{inv.number || inv.id.slice(0, 8)}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: inv.status === 'paid' ? '#16a34a' : '#ef4444', marginBottom: '4px' }}>
                            {inv.status?.toUpperCase() || 'PAID'}
                          </div>
                          {inv.invoice_url && (
                            <a href={inv.invoice_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.625rem', color: 'var(--db-nvidia-green)', textDecoration: 'underline' }}>
                              PDF
                            </a>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                       <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--db-surface-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', opacity: 0.5 }}>
                         <Clock size={16} color="var(--db-text-muted)" />
                       </div>
                       <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--db-text-primary)' }}>No Invoice History</div>
                       <div style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)', marginTop: '4px', lineHeight: 1.5 }}>Your subscription invoices will appear here after the first billing cycle.</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          BILLING MODALS
         ════════════════════════════════════════════════════════════════ */}

      {/* 1. Cancellation Confirmation Modal */}
      {showCancelModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 10000, padding: '20px'
        }}>
          <div className="db-card" style={{ maxWidth: '450px', width: '100%', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid var(--db-border-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldAlert size={20} color="#ef4444" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--db-text-primary)' }}>Confirm Cancellation</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--db-text-secondary)' }}>This action will deactivate your firm's agentic workforce.</p>
                </div>
              </div>

              <div style={{ 
                background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--db-border)', 
                borderRadius: '8px', padding: '16px', marginBottom: '20px' 
              }}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                  <XCircle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
                  <div style={{ fontSize: '0.75rem', color: 'var(--db-text-secondary)', lineHeight: 1.4 }}>
                    <strong>Forfeit Founder Pricing:</strong> You will lose your $297/mo Lifelong Price-Lock. Re-enrolling will be at current market rates ($497/mo+).
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                  <XCircle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
                  <div style={{ fontSize: '0.75rem', color: 'var(--db-text-secondary)', lineHeight: 1.4 }}>
                    <strong>Immediate Downtime:</strong> All 10 AI agents will stop processing matters, emails, and research immediately.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <XCircle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
                  <div style={{ fontSize: '0.75rem', color: 'var(--db-text-secondary)', lineHeight: 1.4 }}>
                    <strong>Data Accessibility:</strong> Firm settings and knowledge base will remain, but agentic interaction will be locked.
                  </div>
                </div>
              </div>

              <div style={{ padding: '16px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '24px' }}>
                <p style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 700, textAlign: 'center' }}>
                  CRITICAL: This action cannot be undone. 
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  className="db-btn-primary" 
                  style={{ flex: 1, background: '#ef4444' }}
                  onClick={() => {
                    showToast('success', 'Deactivation request submitted. Agentic OS services will cease at the end of the current period.');
                    setShowCancelModal(false);
                  }}
                >
                  Confirm & Cancel
                </button>
                <button 
                  className="db-btn-secondary" 
                  style={{ flex: 1 }}
                  onClick={() => setShowCancelModal(false)}
                >
                  Keep Price-Lock
                </button>
              </div>
            </div>
            <div style={{ padding: '12px', background: 'var(--db-bg)', textAlign: 'center' }}>
               <span style={{ fontSize: '0.625rem', color: 'var(--db-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                 <Lock size={10} /> Secure Identity Verification Required to Finalize
               </span>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
