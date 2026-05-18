import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { functions } from '../lib/firebase';
import { httpsCallable as getHttpsCallable } from 'firebase/functions';
import '../styles/auth.css';
import { AlertCircle, ArrowRight, CheckCircle, Lock, Mail, User } from 'lucide-react';

export default function JoinFirm() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const firmId = params.get('firmId');
  const token = params.get('token');
  const invitedEmail = params.get('email');

  const { _user, loginWithEmail, signupWithEmail, loginWithGoogle } = useAuth();
  
  const [isSignup, setIsSignup] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const [form, setForm] = useState({ 
    name: '', 
    email: invitedEmail || '', 
    password: '' 
  });

  // Basic validation that link is well formed
  useEffect(() => {
    if (!firmId || !token || !invitedEmail) {
      setError('Invalid invite link. Missing firm string or token. Please check your email and try again.');
    }
  }, [firmId, token, invitedEmail]);

  // Prevent early redirect if we are actively accepting the token
  // If user is already logged in, we should just let them accept team invite right away if it matches?
  // Let's handle auth success explicitly inside handleSubmit, then manually redirect.
  // Actually, AuthContext's onAuthStateChanged might suddenly provide `user`. Let's rely on explicit state.

  const executeJoin = async (_currentUser) => {
    try {
      const acceptInvite = getHttpsCallable(functions, 'acceptTeamInvite');
      await acceptInvite({
        firmId,
        token,
        email: invitedEmail
      });
      setSuccess(true);
      setTimeout(() => {
        navigate('/pmi');
      }, 1500);
    } catch (err) {
      console.error('Accept invite error:', err);
      setError(err.message || 'Failed to accept invitation. The link may have expired or belongs to an invalid firm.');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!firmId || !token || !invitedEmail) return;

    setError('');
    setLoading(true);

    try {
      if (isSignup) {
        if (!form.name.trim()) throw new Error('Please enter your full name.');
        await signupWithEmail(form.email, form.password, form.name);
      } else {
        await loginWithEmail(form.email, form.password);
      }
      // Auth success, now accept token
      await executeJoin();
    } catch (err) {
      console.error('Auth Error during join:', err);
      const code = err.code || '';
      if (code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please switch to Sign In.');
      } else if (code === 'auth/wrong-password' || code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
        setError('Invalid password.');
      } else if (code === 'auth/weak-password') {
        setError('Password must be at least 6 characters.');
      } else {
        setError(err.message || 'An unexpected error occurred.');
      }
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (!firmId || !token || !invitedEmail) return;
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
      await executeJoin();
    } catch (err) {
      console.error('Google Auth Error:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Google sign-in failed. Please try again.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      {/* Left Panel — Branding */}
      <div className="auth-brand-panel">
        <div className="auth-brand-content">
          <Link to="/" className="auth-brand-logo">
            <img src="/logos/claw-64-transparent.png" alt="" style={{ height: '40px', width: '40px', objectFit: 'contain', marginRight: '8px' }} />
            <img src="/logos/wordmark.svg" alt="NemoC LAW AI" className="auth-brand-wordmark" />
          </Link>
          <h1 className="auth-brand-title">
            Your Firm's Private<br />
            <span className="auth-brand-highlight">AI Workforce.</span>
          </h1>
          <p className="auth-brand-desc">
            You've been invited to join your firm on NemoC LAW AI. Accept your invitation to activate your personal AI Co-Pilot.
          </p>
          <div className="auth-brand-stats" style={{marginTop: '2em'}}>
            <div className="auth-brand-stat">
               <span className="auth-brand-stat-label">Zero Learning Curve</span>
            </div>
            <div className="auth-brand-stat-divider" />
            <div className="auth-brand-stat">
               <span className="auth-brand-stat-label">ABA Ethics Compliant</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="auth-form-panel">
        <div className="auth-form-container">
          <div className="auth-form-header">
            <h2 className="auth-form-title">
              Accept Team Invitation
            </h2>
            <p className="auth-form-subtitle">
              {firmId ? 'Create your password to securely join your firm workspace and access your AI agents.' : 'Invalid link.'}
            </p>
          </div>

          {!firmId || !token ? (
            <div className="auth-error">
              <AlertCircle size={14} />
              <span>{error || 'Invalid or missing invitation link parameters.'}</span>
            </div>
          ) : success ? (
            <div style={{ backgroundColor: '#f0fdf4', color: '#166534', padding: '24px', borderRadius: '8px', textAlign: 'center', border: '1px solid #bbf7d0'}}>
              <CheckCircle size={32} style={{margin: '0 auto 16px'}} />
              <h3 style={{fontWeight: 600, marginBottom: '8px'}}>Invitation Accepted!</h3>
              <p style={{fontSize: '14px', color: '#15803d'}}>Redirecting you to your AI Command Center...</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="auth-error">
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              )}

              {/* Form */}
              <form className="auth-form" onSubmit={handleSubmit}>
                <div className="auth-field" style={{ opacity: 0.7 }}>
                  <label htmlFor="auth-email">Invited Email</label>
                  <div className="auth-input-wrapper">
                    <Mail size={16} className="auth-input-icon" />
                    <input
                      id="auth-email"
                      type="email"
                      value={form.email}
                      disabled
                      title="Email is locked to the invitation"
                      style={{ cursor: 'not-allowed', backgroundColor: '#f9fafb' }}
                    />
                  </div>
                </div>

                {isSignup && (
                  <div className="auth-field">
                    <label htmlFor="auth-name">Your Full Name</label>
                    <div className="auth-input-wrapper">
                      <User size={16} className="auth-input-icon" />
                      <input
                        id="auth-name"
                        type="text"
                        placeholder="e.g. Sarah Smith"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required
                        autoComplete="name"
                      />
                    </div>
                  </div>
                )}

                <div className="auth-field">
                  <label htmlFor="auth-password">{isSignup ? 'Set Password' : 'Password'}</label>
                  <div className="auth-input-wrapper">
                    <Lock size={16} className="auth-input-icon" />
                    <input
                      id="auth-password"
                      type="password"
                      placeholder={isSignup ? 'Min. 6 characters' : 'Enter your password'}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <button type="submit" className="auth-submit-btn" disabled={loading}>
                  {loading ? (
                    <span className="auth-spinner" />
                  ) : (
                    <>
                      {isSignup ? 'Accept & Join Firm' : 'Sign In & Join'}
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

              <div className="auth-divider">
                <span>or</span>
              </div>

              <button
                type="button"
                className="auth-google-btn"
                onClick={handleGoogle}
                disabled={loading}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              <div className="auth-switch">
                {isSignup ? (
                  <p>Already have an account? <button type="button" onClick={() => { setIsSignup(false); setError(''); }}>Sign in</button></p>
                ) : (
                  <p>Don't have an account? <button type="button" onClick={() => { setIsSignup(true); setError(''); }}>Create one</button></p>
                )}
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
