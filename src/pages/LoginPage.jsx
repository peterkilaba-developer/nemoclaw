import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { isAdminUser } from '../components/AdminRoute';
import '../styles/auth.css';
export default function LoginPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, loginWithEmail, signupWithEmail, loginWithGoogle } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  // Handle auth redirection via effect to avoid "two-click" issues
  useEffect(() => {
    if (user && !authLoading) {
      if (isAdminUser(user)) {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignup) {
        if (!form.name.trim()) {
          setError('Please enter your full name.');
          setLoading(false);
          return;
        }
        await signupWithEmail(form.email, form.password, form.name);
        // Navigation handled by useEffect
      } else {
        const _u = await loginWithEmail(form.email, form.password);
        // Navigation handled by useEffect
      }
    } catch (err) {
      console.error('Auth Error:', err);
      const code = err.code || '';
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else if (code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.');
      } else if (code === 'auth/weak-password') {
        setError('Password must be at least 6 characters.');
      } else if (code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        setError(err.message || 'An unexpected error occurred.');
      }
      setLoading(false); // Important: only set loading false if we errored, otherwise useEffect takes over
    }
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      const u = await loginWithGoogle();
      if (isAdminUser(u)) {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Google sign-in failed. Please try again.');
      }
    } finally {
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
            Solo Attorney.<br />
            <span className="auth-brand-highlight">Full AI Workforce.</span>
          </h1>
          <p className="auth-brand-desc">
            19 AI specialists. Zero data leak. Secured by NVIDIA NemoClaw.
            Your complete AI workforce — no hiring required.
          </p>
          <div className="auth-brand-stats">
            <div className="auth-brand-stat">
              <span className="auth-brand-stat-value">19</span>
              <span className="auth-brand-stat-label">AI Specialists</span>
            </div>
            <div className="auth-brand-stat-divider" />
            <div className="auth-brand-stat">
              <span className="auth-brand-stat-value">24/7</span>
              <span className="auth-brand-stat-label">Always On</span>
            </div>
            <div className="auth-brand-stat-divider" />
            <div className="auth-brand-stat">
              <span className="auth-brand-stat-value">0</span>
              <span className="auth-brand-stat-label">Data Leaks</span>
            </div>
          </div>
        </div>
        <div className="auth-brand-footer">
          <span>Powered by NVIDIA NemoClaw</span>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="auth-form-panel">
        <div className="auth-form-container">
          <div className="auth-form-header">
            <h2 className="auth-form-title">
              {isSignup ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="auth-form-subtitle">
              {isSignup
                ? 'Start your 30-day free trial. No charge until day 31.'
                : 'Sign in to access your AI workforce.'}
            </p>
          </div>



          {/* Google Sign-in */}
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



          <div className="auth-divider">
            <span>or</span>
          </div>

          {/* Error */}
          {error && (
            <div className="auth-error">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form className="auth-form" onSubmit={handleSubmit}>
            {isSignup && (
              <div className="auth-field">
                <label htmlFor="auth-name">Full Name</label>
                <div className="auth-input-wrapper">
                  <User size={16} className="auth-input-icon" />
                  <input
                    id="auth-name"
                    type="text"
                    placeholder="e.g. Sarah Smith"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    autoComplete="name"
                  />
                </div>
              </div>
            )}

            <div className="auth-field">
              <label htmlFor="auth-email">Email</label>
              <div className="auth-input-wrapper">
                <Mail size={16} className="auth-input-icon" />
                <input
                  id="auth-email"
                  type="email"
                  placeholder="you@lawfirm.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="auth-password">Password</label>
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
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                />
              </div>
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <span className="auth-spinner" />
              ) : (
                <>
                  {isSignup ? 'Create Account' : 'Sign In'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="auth-switch">
            {isSignup ? (
              <p>Already have an account? <button type="button" onClick={() => { setIsSignup(false); setError(''); }}>Sign in</button></p>
            ) : (
              <p>Don't have an account? <button type="button" onClick={() => { setIsSignup(true); setError(''); }}>Create one</button></p>
            )}
          </div>

          <p className="auth-terms">
            By continuing, you agree to our <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
