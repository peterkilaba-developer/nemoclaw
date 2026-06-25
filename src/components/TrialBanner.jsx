import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Zap } from 'lucide-react';

/**
 * Trial countdown banner shown at the top of the dashboard during the 30-day free trial.
 * Dismissible per session (reappears on next page load).
 */
export default function TrialBanner({ trialEndsAt, hasPaymentMethod }) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || hasPaymentMethod) return null;

  const daysLeft = getDaysLeft(trialEndsAt);
  if (daysLeft <= 0) return null;

  const isUrgent = daysLeft <= 7;
  const isCritical = daysLeft <= 3;

  const bg = isCritical
    ? 'rgba(239,68,68,0.08)'
    : isUrgent
    ? 'rgba(245,158,11,0.08)'
    : 'rgba(118,185,0,0.06)';

  const borderColor = isCritical
    ? 'rgba(239,68,68,0.5)'
    : isUrgent
    ? 'rgba(245,158,11,0.5)'
    : 'rgba(118,185,0,0.45)';

  const accentColor = isCritical ? '#ef4444' : isUrgent ? '#f59e0b' : '#76b900';

  return (
    <div style={{
      background: bg,
      border: `1px solid ${borderColor}`,
      borderRadius: '8px',
      margin: '0 0 16px 0',
      padding: '14px 16px 16px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
    }}>
      <Zap size={14} style={{ color: accentColor, flexShrink: 0, marginTop: '3px' }} />
      <div style={{ flex: 1, fontSize: '0.8125rem', color: 'var(--db-text-primary)', lineHeight: '1.6' }}>
        <span style={{ fontWeight: 700, color: accentColor }}>
          {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left in your free trial.
        </span>
        {' '}
        {isCritical
          ? 'Add a payment method now to keep your firm running without interruption.'
          : isUrgent
          ? 'Activate your subscription before your trial expires.'
          : 'No charge until your 30-day trial ends. Add a card anytime to ensure continuity.'}
      </div>
      <button
        onClick={() => navigate('/dashboard/billing')}
        style={{
          background: accentColor,
          color: isCritical ? '#fff' : '#071000',
          border: 'none',
          borderRadius: '6px',
          padding: '6px 14px',
          fontSize: '0.75rem',
          fontWeight: 700,
          cursor: 'pointer',
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
      >
        {isCritical ? 'Add Card Now' : 'Activate'}
      </button>
      <button
        onClick={() => setDismissed(true)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--db-text-muted)', padding: '2px', flexShrink: 0 }}
        title="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}

function getDaysLeft(trialEndsAt) {
  if (!trialEndsAt) return 30;
  const end = trialEndsAt.toDate ? trialEndsAt.toDate() : new Date(trialEndsAt);
  const diff = end - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
