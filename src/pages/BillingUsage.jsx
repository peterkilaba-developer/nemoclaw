import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ShieldCheck, CheckCircle, XCircle, AlertTriangle, Search, FileText, UserCheck, Check, Infinity, FolderOpen, Users, Mail, Bot, DollarSign, Clock, TrendingUp, Zap, ArrowRight, Lock, Timer, Crown, Plus, Minus as MinusIcon, CreditCard, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useFirm } from '../contexts/FirmContext';
import { redirectToCheckout, redirectToPortal, PRICING, calculateMonthlyTotal, getFounderDaysRemaining, isInFounderWindow } from '../lib/stripeService';

export default function BillingUsage() {
  const location = useLocation();
  const { user } = useAuth();
  const { firm, firmId } = useFirm();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [extraSeats, setExtraSeats] = useState(0);
  const [autonomousRoles, setAutonomousRoles] = useState(0);

  // Success/Cancel state from URL
  const [status, setStatus] = useState(null);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const s = params.get('status');
    if (s) setStatus(s);
  }, [location]);

  const isTrialPlan = !firm?.plan || firm.plan === 'trial';
  const founderDays = getFounderDaysRemaining(firm?.trialEndsAt);
  const inFounderWindow = isInFounderWindow(firm?.trialEndsAt);
  const totals = calculateMonthlyTotal(extraSeats, autonomousRoles, inFounderWindow);

  const handleSubscribe = async () => {
    if (!firmId || !user) return;
    setCheckoutLoading(true);
    setCheckoutError('');
    try {
      await redirectToCheckout({
        firmId,
        userId: user.uid,
        userEmail: user.email,
        firmName: firm?.firmName || firm?.name || '',
        extraSeats,
        autonomousRoles,
      });
    } catch (err) {
      console.error('Checkout error:', err);
      setCheckoutError(err.message);
      setCheckoutLoading(false);
    }
  };

  const handleOpenPortal = async () => {
    if (!firmId) return;
    setCheckoutLoading(true);
    try {
      await redirectToPortal(firmId);
    } catch (err) {
      setCheckoutError(err.message);
      setCheckoutLoading(false);
    }
  };

  const [unbilledItems, setUnbilledItems] = useState([]);

  const logTimeEntry = (id) => {
    setUnbilledItems(prev => prev.map(item => item.id === id ? { ...item, logged: true } : item));
  };

  const logAllEntries = () => {
    setUnbilledItems(prev => prev.map(item => ({ ...item, logged: true })));
  };

  const pendingItems = unbilledItems.filter(i => !i.logged);
  const loggedItems = unbilledItems.filter(i => i.logged);
  const pendingRevenue = pendingItems.reduce((sum, i) => sum + (i.hours * i.rate), 0);

  return (
    <>
      <div className="db-page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="db-page-title">Billing & Usage</h1>
          <p className="db-page-subtitle">Monitor your plan, token usage, and AI-detected revenue opportunities.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {!isTrialPlan && (
            <button className="db-btn db-btn-primary" onClick={handleOpenPortal} disabled={checkoutLoading}>
              <CreditCard size={14} /> Manage Billing
            </button>
          )}
          <button className="db-btn db-btn-secondary" onClick={() => {
            const csvRows = ['Date,Description,Amount,Status'];
            if (firm?.plan && firm?.plan !== 'trial') {
              const startDate = firm?.subscriptionStart?.toDate?.() || new Date();
              for (let i = 0; i < 3; i++) {
                const d = new Date(startDate);
                d.setMonth(d.getMonth() + i);
                if (d > new Date()) break;
                csvRows.push(`${d.toLocaleDateString()},"NemoC LAW AI — Agentic OS",$297.00,Paid`);
              }
            }
            if (csvRows.length === 1) csvRows.push(`${new Date().toLocaleDateString()},"No billing records yet",$0.00,—`);
            const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `nemoc-billing-history-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}>Download History</button>
        </div>
      </div>

      {status === 'success' && (
        <div style={{
          marginBottom: '24px', padding: '16px 20px', background: 'rgba(22, 163, 74, 0.05)',
          border: '1px solid rgba(22, 163, 74, 0.2)', borderRadius: '12px',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <CheckCircle size={20} color="#16a34a" />
          <div>
            <div style={{ fontWeight: 700, color: 'var(--db-text-primary)' }}>Subscription Activated!</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--db-text-secondary)' }}>Welcome to the founder fleet. Your lifetime price-lock is now active.</div>
          </div>
        </div>
      )}

      {status === 'cancelled' && (
        <div style={{
          marginBottom: '24px', padding: '16px 20px', background: 'rgba(239, 68, 68, 0.05)',
          border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <AlertTriangle size={20} color="#ef4444" />
          <div>
            <div style={{ fontWeight: 700, color: 'var(--db-text-primary)' }}>Checkout Cancelled</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--db-text-secondary)' }}>No charges were made. You can resume your upgrade whenever you are ready.</div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          FOUNDER PRICING URGENCY BANNER — Only visible during trial
         ════════════════════════════════════════════════════════════════ */}
      {isTrialPlan && (
        <div className="db-card" style={{
          marginBottom: '24px',
          border: '1px solid rgba(255,255,255,0.03)',
          background: 'rgba(255,255,255,0.02)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Subtle top accent — 2px, not 3px */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
            background: inFounderWindow ? '#76b900' : '#ef4444',
            opacity: 0.5,
          }} />

          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', paddingTop: '8px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px',
              background: 'rgba(255,255,255,0.03)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Crown size={24} color="rgba(255,255,255,0.15)" />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <span style={{
                  fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.05em', color: inFounderWindow ? '#76b900' : '#ef4444',
                  padding: '0',
                }}>
                  {inFounderWindow ? '🔒 Founder Lock Available' : '⏰ Founder Window Expired'}
                </span>
                {inFounderWindow && (
                  <span style={{
                    fontSize: '0.6875rem', fontWeight: 700, color: '#f59e0b',
                    display: 'flex', alignItems: 'center', gap: '4px',
                  }}>
                    <Timer size={12} /> {founderDays} day{founderDays !== 1 ? 's' : ''} remaining
                  </span>
                )}
              </div>

              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--db-text-primary)', marginBottom: '6px' }}>
                Lock Your Price — Forever.
              </h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--db-text-secondary)', marginBottom: '16px', lineHeight: 1.6 }}>
                The price you sign up at is the price you keep — forever. As we add agents toward 100% of law firm tasks, your membership grows in value.
                {inFounderWindow && (
                  <> After <strong>{founderDays} day{founderDays !== 1 ? 's' : ''}</strong> or once <strong>100 firms in your state</strong> have subscribed,
                  founder pricing is no longer guaranteed.</>
                )}
              </p>

              {/* Product Cards — Modular Pricing */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                {/* Agentic OS — Always included */}
                <div style={{
                  padding: '14px 16px', borderRadius: '10px',
                  border: '1px solid rgba(118,185,0,0.06)',
                  background: 'rgba(118,185,0,0.02)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--db-nvidia-green)', marginBottom: '2px' }}>
                      INCLUDED — {PRICING.base.target}
                    </div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--db-text-primary)' }}>{PRICING.base.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--db-text-secondary)' }}>{PRICING.base.desc}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--db-nvidia-green)' }}>${PRICING.base.price}</div>
                    <div style={{ fontSize: '0.625rem', color: 'var(--db-text-muted)' }}>/month · <s style={{ color: '#ef4444' }}>${PRICING.base.futurePrice}</s> after</div>
                  </div>
                </div>

                {/* 10x Output Seat — Quantity selector */}
                <div style={{
                  padding: '14px 16px', borderRadius: '10px',
                  border: extraSeats > 0 ? '1px solid rgba(118,185,0,0.06)' : '1px solid rgba(255,255,255,0.03)',
                  background: extraSeats > 0 ? 'rgba(118,185,0,0.02)' : 'rgba(255,255,255,0.02)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--db-text-muted)', marginBottom: '2px' }}>
                      ADD-ON — {PRICING.seat.target}
                    </div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--db-text-primary)' }}>{PRICING.seat.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--db-text-secondary)' }}>{PRICING.seat.desc}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button onClick={() => setExtraSeats(Math.max(0, extraSeats - 1))} style={{
                        width: '28px', height: '28px', borderRadius: '6px', border: '1px solid var(--db-border)',
                        background: 'var(--db-surface)', color: 'var(--db-text-primary)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}><MinusIcon size={14} /></button>
                      <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--db-text-primary)', minWidth: '20px', textAlign: 'center' }}>{extraSeats}</span>
                      <button onClick={() => setExtraSeats(extraSeats + 1)} style={{
                        width: '28px', height: '28px', borderRadius: '6px', border: '1px solid var(--db-border)',
                        background: 'var(--db-surface)', color: 'var(--db-text-primary)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}><Plus size={14} /></button>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: '85px' }}>
                      <div style={{ fontSize: '1.125rem', fontWeight: 800, color: extraSeats > 0 ? 'var(--db-nvidia-green)' : 'var(--db-text-muted)' }}>
                        ${PRICING.seat.price}
                      </div>
                      <div style={{ fontSize: '0.625rem', color: 'var(--db-text-muted)' }}>/seat/mo · <s style={{ color: '#ef4444' }}>${PRICING.seat.futurePrice}</s></div>
                    </div>
                  </div>
                </div>

                {/* Autonomous Role — Quantity selector */}
                <div style={{
                  padding: '14px 16px', borderRadius: '10px',
                  border: autonomousRoles > 0 ? '1px solid rgba(118,185,0,0.06)' : '1px solid rgba(255,255,255,0.03)',
                  background: autonomousRoles > 0 ? 'rgba(118,185,0,0.02)' : 'rgba(255,255,255,0.02)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--db-text-muted)', marginBottom: '2px' }}>
                      ADD-ON — {PRICING.autonomous.target}
                    </div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--db-text-primary)' }}>{PRICING.autonomous.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--db-text-secondary)' }}>{PRICING.autonomous.desc}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button onClick={() => setAutonomousRoles(Math.max(0, autonomousRoles - 1))} style={{
                        width: '28px', height: '28px', borderRadius: '6px', border: '1px solid var(--db-border)',
                        background: 'var(--db-surface)', color: 'var(--db-text-primary)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}><MinusIcon size={14} /></button>
                      <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--db-text-primary)', minWidth: '20px', textAlign: 'center' }}>{autonomousRoles}</span>
                      <button onClick={() => setAutonomousRoles(autonomousRoles + 1)} style={{
                        width: '28px', height: '28px', borderRadius: '6px', border: '1px solid var(--db-border)',
                        background: 'var(--db-surface)', color: 'var(--db-text-primary)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}><Plus size={14} /></button>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: '85px' }}>
                      <div style={{ fontSize: '1.125rem', fontWeight: 800, color: autonomousRoles > 0 ? 'var(--db-nvidia-green)' : 'var(--db-text-muted)' }}>
                        ${PRICING.autonomous.price}
                      </div>
                      <div style={{ fontSize: '0.625rem', color: 'var(--db-text-muted)' }}>/role/mo · <s style={{ color: '#ef4444' }}>${PRICING.autonomous.futurePrice}</s></div>
                    </div>
                  </div>
                </div>

                {/* Token Compute — Informational only */}
                <div style={{
                  padding: '14px 16px', borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.03)',
                  background: 'rgba(255,255,255,0.02)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--db-text-muted)', marginBottom: '2px' }}>
                      ENGINE — UNLIMITED COMPUTE
                    </div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--db-text-primary)' }}>NVIDIA Inference Infrastructure</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--db-text-secondary)' }}>Zero-lag token compute. PII auto-redaction enabled.</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--db-nvidia-green)' }}>$0</div>
                    <div style={{ fontSize: '0.625rem', color: 'var(--db-text-muted)' }}>INCLUDED / FREE</div>
                  </div>
                </div>
              </div>

              {/* Dynamic Total */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', borderRadius: '8px',
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)',
                marginBottom: '12px',
              }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--db-text-secondary)' }}>Monthly Total</span>
                <span style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--db-nvidia-green)' }}>${totals.total}/mo</span>
              </div>

              {checkoutError && (
                <div style={{
                  padding: '8px 12px', background: 'rgba(239,68,68,0.02)', border: '1px solid rgba(239,68,68,0.03)',
                  borderRadius: '6px', fontSize: '0.75rem', color: '#ef4444', marginBottom: '12px',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                  <XCircle size={14} /> {checkoutError}
                </div>
              )}

              <button
                onClick={handleSubscribe}
                disabled={checkoutLoading}
                style={{
                  width: '100%', padding: '14px 20px',
                  background: '#76b900',
                  border: 'none', borderRadius: '8px', color: '#000',
                  fontWeight: 700, fontSize: '0.875rem',
                  cursor: checkoutLoading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  transition: 'all 0.2s',
                  opacity: checkoutLoading ? 0.7 : 1,
                }}
              >
                {checkoutLoading ? (
                  <><span style={{ width: '16px', height: '16px', border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', borderRadius: '50%', animation: 'auth-spin 0.6s linear infinite', display: 'inline-block' }} /> Processing...</>
                ) : (
                  <><Lock size={16} /> Lock Founder Price — ${totals.total}/mo</>
                )}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '10px' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={10} /> 256-bit SSL
                </span>
                <span style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Lock size={10} /> Powered by Stripe
                </span>
                <span style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)' }}>
                  Cancel anytime
                </span>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* AI Revenue Intelligence Banner */}
      {pendingItems.length > 0 && (
        <div className="db-card" style={{ marginBottom: '24px', border: '1px solid rgba(255,255,255,0.03)', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <DollarSign size={24} color="rgba(255,255,255,0.1)" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Bot size={14} color="rgba(255,255,255,0.15)" />
                <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.15)' }}>AI Revenue Intelligence</span>
              </div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--db-text-primary)', marginBottom: '4px' }}>
                ${pendingRevenue.toFixed(2)} in Unbilled Time Detected
              </h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--db-text-secondary)', marginBottom: '16px' }}>
                Your Personal Agent detected <strong>{pendingItems.length} billable activities</strong> across active workspaces that haven't been logged. Approve to sync to your billing system.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                {pendingItems.map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', background: 'var(--db-surface)', border: '1px solid var(--db-border)', borderRadius: '8px' }}>
                    <Clock size={14} color="var(--db-text-muted)" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--db-text-primary)' }}>{item.matter}</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)' }}>{item.desc}</div>
                    </div>
                    <div style={{ textAlign: 'right', marginRight: '12px' }}>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--db-text-primary)' }}>{item.hours} hrs</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)' }}>@ ${item.rate}/hr</div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#16a34a', minWidth: '60px', textAlign: 'right' }}>
                      ${(item.hours * item.rate).toFixed(2)}
                    </div>
                    <button 
                      className="db-btn db-btn-primary db-btn-sm" 
                      style={{ padding: '4px 10px', fontSize: '0.6875rem', background: '#16a34a' }}
                      onClick={() => logTimeEntry(item.id)}
                    >
                      Log
                    </button>
                  </div>
                ))}
              </div>
              
              <button 
                className="db-btn db-btn-accent" 
                style={{ fontSize: '0.8125rem' }}
                onClick={logAllEntries}
              >
                <Zap size={14} /> Approve & Log All ({pendingItems.length} entries · ${pendingRevenue.toFixed(2)})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logged confirmation */}
      {loggedItems.length > 0 && pendingItems.length === 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 20px', background: 'rgba(22,163,74,0.02)', border: '1px solid rgba(22,163,74,0.03)', borderRadius: '10px', marginBottom: '24px' }}>
          <CheckCircle size={16} color="#16a34a" />
          <span style={{ fontSize: '0.8125rem', color: '#16a34a', fontWeight: 600 }}>
            All {loggedItems.length} time entries synced to billing. ${loggedItems.reduce((s, i) => s + i.hours * i.rate, 0).toFixed(2)} in revenue captured.
          </span>
        </div>
      )}

      {/* Current Plan */}
      <div className="db-card" style={{ marginBottom: '24px' }}>
        <div className="db-card-header">
          <div>
            <div className="db-card-title">Current Plan</div>
            <div className="db-card-subtitle">{firm?.founderPriceLocked ? 'Locked in at founder pricing — forever' : 'Usage-based enterprise plan'}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '16px' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--db-text-primary)' }}>
                {isTrialPlan ? 'Founders Trial (7-Day)' : `Agentic OS + ${firm?.extraSeats || 0} Seats`}
              </span>
              <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--db-nvidia-green)' }}>
                ${isTrialPlan ? '0' : calculateMonthlyTotal(firm?.extraSeats || 0, firm?.autonomousRoles || 0, firm?.founderPriceLocked).total}/mo
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)' }}>{isTrialPlan ? 'Founders Window' : (firm?.founderPriceLocked ? 'Founder Rate' : 'Standard Rate')}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              {[
                { Icon: Check, text: 'Agentic OS + Managing Partner Agent', show: true },
                { Icon: Check, text: `${firm?.extraSeats || 0} Additional 10x Output Seats`, show: (firm?.extraSeats > 0) },
                { Icon: Crown, text: `${firm?.autonomousRoles || 0} Autonomous Roles`, show: (firm?.autonomousRoles > 0) },
                { Icon: Infinity, text: 'Unlimited compute tokens', show: true },
                { Icon: FolderOpen, text: `${firm?.extraSeats > 0 ? '500 MB' : '100 MB'} knowledge base`, show: true },
                { Icon: ShieldCheck, text: 'NemoClaw security sandbox', show: true },
              ].map((item, i) => item.show && (
                <div key={i} style={{ fontSize: '0.8125rem', color: 'var(--db-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <item.Icon size={14} /> {item.text}
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button className="db-btn db-btn-secondary db-btn-sm" onClick={isTrialPlan ? handleSubscribe : handleOpenPortal}>
              {isTrialPlan ? 'Upgrade Plan' : 'Manage Subscription'}
            </button>
            {!isTrialPlan && (
              <button 
                className="db-btn db-btn-secondary db-btn-sm" 
                style={{ color: 'var(--db-text-muted)', fontSize: '0.6875rem' }} 
                onClick={handleOpenPortal}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="db-two-col">
        {/* Usage by Agent */}
        <div className="db-card">
          <div className="db-card-header">
            <div>
              <div className="db-card-title">Usage by Agent — {new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}</div>
              <div className="db-card-subtitle"><Infinity size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />Unlimited tokens · No overage charges</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--db-text-muted)' }}>
              <div style={{ marginBottom: '12px' }}><Infinity size={32} style={{ opacity: 0.1, margin: '0 auto' }} /></div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--db-text-primary)' }}>No usage data recorded yet</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)', marginTop: '4px' }}>Token metrics will appear once your agents begin processing tasks.</div>
            </div>
          </div>

          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--db-border-light)', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--db-text-primary)' }}>Total This Month</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--db-text-primary)' }}>0 tokens</span>
          </div>
        </div>

        {/* Invoice History + Payment + IOLTA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="db-card" style={{ border: '1px solid rgba(217,119,6,0.03)', background: 'rgba(217,119,6,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <AlertTriangle size={18} color="#d97706" style={{ marginTop: '2px', flexShrink: 0, opacity: 0.5 }} />
              <div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--db-text-primary)', marginBottom: '4px' }}>IOLTA Reconciliation</div>
                {firm?.isConfigured ? (
                  <>
                    <div style={{ fontSize: '0.75rem', color: 'var(--db-text-secondary)', lineHeight: 1.5 }}>
                      Connect your trust accounts to enable automated IOLTA reconciliation and deadline tracking.
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)', lineHeight: 1.5 }}>
                    Connect your trust accounts to enable automated IOLTA reconciliation and compliance monitoring.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="db-card">
            <div className="db-card-header">
              <div className="db-card-title">Invoice History</div>
            </div>
            <div className="db-feed">
              {[]?.length > 0 ? (
                [].map((inv, i) => (
                  <div key={i} className="db-feed-item">
                    <div className="db-feed-content">
                      <div className="db-feed-title">{inv.date} — {inv.plan}</div>
                      <div className="db-feed-desc">{inv.amount}</div>
                    </div>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: inv.statusColor }}>{inv.status}</span>
                  </div>
                ))
              ) : (
                <div style={{ padding: '24px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--db-text-muted)' }}>
                  No billing history available yet.
                </div>
              )}
            </div>
          </div>

          <div className="db-card">
            <div className="db-card-header">
              <div className="db-card-title">Payment Method</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {firm?.hasPaymentMethod ? (
                <>
                  <div style={{
                    padding: '8px 14px', background: 'var(--db-bg)', borderRadius: 'var(--db-radius)',
                    fontFamily: 'var(--db-font-mono)', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--db-text-primary)',
                  }}>
                    Visa •••• {firm?.last4 || '——'}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)' }}>Exp {firm?.expDate || '—'}</span>
                </>
              ) : (
                <div style={{ fontSize: '0.8125rem', color: 'var(--db-text-muted)' }}>No payment method on file</div>
              )}
              <button className="db-btn db-btn-secondary db-btn-sm" style={{ marginLeft: 'auto' }} onClick={() => isTrialPlan ? handleSubscribe() : handleOpenPortal()}>
                {firm?.hasPaymentMethod ? 'Update' : 'Add Card'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
