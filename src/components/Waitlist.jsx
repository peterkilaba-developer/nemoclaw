import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './Waitlist.css';

export default function Waitlist() {
  const navigate = useNavigate();
  const { loginWithGoogle, loginWithApple } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Google sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApple = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithApple();
      navigate('/dashboard');
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Apple sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="section waitlist-section" id="waitlist">
      <div className="container">
        <div className="waitlist-inner glass-card" style={{ padding: '64px 32px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)' }}>
          {/* Glow removed for restrained design */}
          
          <div className="waitlist-header">
            <span className="section-label text-nvidia">Get Started</span>
            <h2 className="section-title">
              Deploy Your <span className="text-nvidia">AI</span> Workforce
            </h2>
            <p className="section-subtitle">
              Sign up and lock in founder pricing before the first 100 firms per state are filled.
              Your <span className="text-nvidia">price stays the same forever</span> — even as we add new agents and capabilities.
            </p>
          </div>

          <div className="waitlist-auth-buttons" style={{ maxWidth: '480px', margin: '0 auto', display: 'flex', flexDirection: 'row', gap: '16px', position: 'relative', zIndex: 10 }}>
            {/* Error Message Container (absolute or full width wrapper could be tricky so let's put it above the flex row if needed, but since it's inside the flex row, let's fix it) */}
          </div>
          <div style={{ maxWidth: '480px', margin: '0 auto' }}>
             {error && (
              <div style={{ color: '#ef4444', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', marginBottom: '16px' }}>
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}
            
            <div style={{ display: 'flex', gap: '16px', flexDirection: 'row' }}>
              {/* Google Sign-in */}
              <button
                type="button"
                onClick={handleGoogle}
                disabled={loading}
                style={{
                  flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: '14px',
                background: '#fff',
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.background = '#f9fafb'; } }}
              onMouseLeave={(e) => { if (!loading) { e.currentTarget.style.background = '#fff'; } }}
            >
              <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            {/* Apple Sign-in */}
            <button
              type="button"
              onClick={handleApple}
              disabled={loading}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: '14px',
                background: '#000',
                color: '#fff',
                border: '1px solid #333',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.background = '#111'; } }}
              onMouseLeave={(e) => { if (!loading) { e.currentTarget.style.background = '#000'; } }}
            >
              <svg width="20" height="20" viewBox="0 0 18 18" fill="currentColor">
                <path d="M13.71 5.04c-.08.06-1.5.87-1.5 2.66 0 2.08 1.82 2.81 1.87 2.83-.01.05-.29 1-.96 1.98-.59.87-1.2 1.73-2.15 1.73s-1.18-.55-2.27-.55c-1.06 0-1.43.57-2.31.57s-1.47-.8-2.15-1.78C3.36 11.16 2.7 9.2 2.7 7.35c0-2.97 1.93-4.54 3.83-4.54.99 0 1.82.65 2.44.65.6 0 1.53-.69 2.65-.69.43 0 1.96.04 2.97 1.47l.12.11zM11.24.81c.44-.52.75-1.25.75-1.98 0-.1-.01-.2-.02-.28-.72.03-1.57.48-2.08 1.07-.4.45-.78 1.18-.78 1.92 0 .11.02.22.03.26.05.01.13.02.21.02.65 0 1.45-.44 1.89-1.01z"/>
              </svg>
              Continue with Apple
            </button>
            </div>
            
            <p className="waitlist-note" style={{ marginTop: '20px' }}>
              <Lock size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
              Your data is secured by NVIDIA NemoClaw.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
