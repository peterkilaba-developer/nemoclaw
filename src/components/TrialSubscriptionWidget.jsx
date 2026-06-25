import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useAuth } from '../contexts/AuthContext';
import { useFirm } from '../contexts/FirmContext';
import { ShieldCheck, Zap, Loader2, X } from 'lucide-react';
const stripePromise = loadStripe((import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '').trim());

function InlineStripeForm({ clientSecret, firmId, onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [launching, setLaunching] = useState(false);
  const [btnText, setBtnText] = useState('Start Subscription');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements || !clientSecret) return;

    setLaunching(true);
    setBtnText('Confirming...');
    
    try {
      const cardElement = elements.getElement(CardElement);
      const isSetupIntent = clientSecret.startsWith('seti_');
      let submitResult;

      if (isSetupIntent) {
        submitResult = await stripe.confirmCardSetup(clientSecret, {
          payment_method: { card: cardElement },
        });
      } else {
        submitResult = await stripe.confirmCardPayment(clientSecret, {
          payment_method: { card: cardElement },
        });
      }

      const { error, paymentIntent, setupIntent } = submitResult;

      if (error) {
        onError(error.message);
        setLaunching(false);
        setBtnText('Retry Payment');
      } else if ((paymentIntent?.status === 'succeeded') || (setupIntent?.status === 'succeeded')) {
        setBtnText('Success!');
        const intentId = paymentIntent?.id || setupIntent?.id;
        try {
          await fetch('https://finalizepaymentsetup-2sejsgollq-uc.a.run.app', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              firmId: firmId,
              intentId: intentId,
              type: isSetupIntent ? 'setup' : 'payment'
            })
          });
        } catch (e) {
          console.error('Finalize sync failed:', e);
        }
        setTimeout(() => onSuccess(), 1000);
      } else {
        onSuccess();
      }
    } catch (err) {
      console.error(err);
      onError('Payment processing failed. Please try again.');
      setLaunching(false);
      setBtnText('Retry Payment');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ padding: '10px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--db-border)', borderRadius: '8px' }}>
        <CardElement options={{
          hidePostalCode: true,
          style: {
            base: {
              fontSize: '13px',
              color: '#e2e8f0',
              fontFamily: 'Inter, system-ui, sans-serif',
              '::placeholder': { color: '#64748b' },
              iconColor: '#76b900'
            },
            invalid: { color: '#ef4444', iconColor: '#ef4444' }
          }
        }} />
      </div>
      
      <button
        type="submit"
        className="db-btn db-btn-primary"
        style={{ width: '100%', padding: '10px', fontSize: '0.875rem', height: '40px' }}
        disabled={!stripe || launching}
      >
        {launching ? (
          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
        ) : (
          <><Zap size={16} /> {btnText}</>
        )}
      </button>
    </form>
  );
}

export default function TrialSubscriptionWidget() {
  const { user } = useAuth();
  const { firm } = useFirm();
  const [clientSecret, setClientSecret] = useState(null);
  const [error, setError] = useState('');
  const [minimized, setMinimized] = useState(false);

  // Check if we should render
  const shouldRender = firm && firm.status === 'trial';

  useEffect(() => {
    if (!shouldRender || clientSecret) return;

    // Fetch inline subscription intent
    const fetchIntent = async () => {
      try {
        const response = await fetch('https://createinlinesubscription-2sejsgollq-uc.a.run.app', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firmId: firm.id,
            userId: user.uid,
            userEmail: user.email,
            firmName: firm.firmName,
            extraSeats: Math.max(0, (firm.members?.length || 1) - 1),
          }),
        });
        const result = await response.json();
        if (result?.clientSecret) {
          setClientSecret(result.clientSecret);
        }
      } catch (err) {
        console.error('Failed to init trial subscription widget', err);
      }
    };
    
    fetchIntent();
  }, [shouldRender, clientSecret, firm, user]);

  if (!shouldRender) return null;

  if (minimized) {
    return (
      <div 
        onClick={() => setMinimized(false)}
        style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 50,
          background: 'var(--db-nvidia-green)', padding: '12px 20px', borderRadius: '30px',
          color: '#000', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
          boxShadow: '0 10px 25px rgba(118, 185, 0, 0.4)', display: 'flex', alignItems: 'center', gap: '8px'
        }}
      >
        <Zap size={16} /> Upgrade to Full AI Workforce
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px', zIndex: 50,
      width: '320px', background: 'var(--db-card-bg)', borderRadius: '12px',
      border: '1px solid var(--db-border)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
      overflow: 'hidden', animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--db-border)', background: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--db-nvidia-green)', fontWeight: 600, fontSize: '0.8125rem' }}>
          <ShieldCheck size={16} /> Subscription Configuration
        </div>
        <button onClick={() => setMinimized(true)} style={{ background: 'none', border: 'none', color: 'var(--db-text-muted)', cursor: 'pointer' }}>
          <X size={16} />
        </button>
      </div>

      <div style={{ padding: '16px' }}>
        <p style={{ fontSize: '0.8125rem', color: 'var(--db-text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
          Your trial will expire soon. Secure your <strong style={{ color: 'var(--db-text-primary)' }}>$297/mo Founder Price-Lock</strong>.
        </p>

        {error && <div style={{ fontSize: '0.75rem', color: '#ef4444', marginBottom: '12px' }}>{error}</div>}

        {clientSecret ? (
          <Elements stripe={stripePromise}>
            <InlineStripeForm 
              clientSecret={clientSecret} 
              firmId={firm.id}
              onError={setError}
              onSuccess={() => window.location.reload()}
            />
          </Elements>
        ) : (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', margin: '0 auto', color: 'var(--db-text-muted)' }} />
          </div>
        )}
      </div>
    </div>
  );
}
