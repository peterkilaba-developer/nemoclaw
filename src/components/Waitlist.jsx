import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useLocation } from '../hooks/useLocation';
import './Waitlist.css';
import { AlertCircle, Lock } from 'lucide-react';

export default function Waitlist() {
  const navigate = useNavigate();
  const { loginWithGoogle } = useAuth();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [intlEmail, setIntlEmail] = useState('');
  const [intlSuccess, setIntlSuccess] = useState(false);

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

  const handleIntlSubmit = async (e) => {
    e.preventDefault();
    if (!intlEmail || !intlEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await addDoc(collection(db, 'international_waitlist'), {
        email: intlEmail,
        country: location.country,
        createdAt: serverTimestamp(),
      });
      setIntlSuccess(true);
    } catch (err) {
      console.error(err);
      setError('Failed to submit. Please try again later.');
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
            <span className="section-label text-nvidia">Solo Attorneys — Get Started</span>
            <h2 className="section-title">
              Start Your <span className="text-nvidia">30-Day Free Trial</span>
            </h2>
            <p className="section-subtitle">
              {location.isUS || location.loading
                ? `Lock in founder pricing before the first 100 firms in ${location.state} are filled. No charge until day 31.`
                : `We are currently rolling out state-by-state in the US before expanding to ${location.country}.`}
              <br />
              <br />
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
            
            
            {location.isUS || location.loading ? (
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
              </div>
            ) : (
              <div>
                {intlSuccess ? (
                  <div style={{ background: 'rgba(118, 185, 0, 0.1)', border: '1px solid #76b900', color: '#76b900', padding: '16px', borderRadius: '8px', textAlign: 'center', fontWeight: '600' }}>
                    You're on the list! We will notify you when NemoC LAW AI launches in {location.country}.
                  </div>
                ) : (
                  <form onSubmit={handleIntlSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input 
                      type="email" 
                      placeholder="Enter your email address" 
                      value={intlEmail}
                      onChange={(e) => setIntlEmail(e.target.value)}
                      required
                      style={{ padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: '1rem', outline: 'none' }}
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      style={{ 
                        padding: '16px', 
                        borderRadius: '8px', 
                        border: 'none', 
                        background: '#76b900', 
                        color: '#000', 
                        fontWeight: '700', 
                        fontSize: '1rem', 
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.8 : 1
                      }}
                    >
                      {loading ? 'Submitting...' : `Notify me when available in ${location.country}`}
                    </button>
                  </form>
                )}
              </div>
            )}
            
            <p className="waitlist-note" style={{ marginTop: '20px' }}>
              <Lock size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
              30-day free trial · Card required · No charge until day 31 · Secured by NVIDIA NemoClaw
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
