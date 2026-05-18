import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

/**
 * Admin email whitelist.
 * Only these emails can access /admin routes.
 * Add your email(s) here.
 */
const ADMIN_EMAILS = [
  'peterkilaba@gmail.com',
  'peterkilaba@nemoc-law.ai',
  'peterkilaba@nemo-law.ai',
  'partners@davislegal.com',
  // Add more admin emails as needed
];

export function isAdminUser(user) {
  if (!user?.email) return false;
  return user.emailVerified === true && ADMIN_EMAILS.includes(user.email.toLowerCase());
}

export default function AdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#0a0a0f',
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '3px solid rgba(118, 185, 0, 0.2)',
          borderTopColor: '#76b900',
          borderRadius: '50%',
          animation: 'spin 0.6s linear infinite',
        }} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdminUser(user)) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#0a0e17',
        color: '#fff',
        fontFamily: "'Inter', sans-serif",
        padding: '24px',
      }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '16px',
          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '28px', marginBottom: '20px',
        }}>🔒</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px' }}>
          Admin Access Required
        </h1>
        <p style={{
          fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)',
          textAlign: 'center', maxWidth: '400px', lineHeight: 1.6, marginBottom: '24px',
        }}>
          This area is restricted to NemoC platform administrators.
          You're signed in as <strong style={{ color: '#76b900' }}>{user.email}</strong>,
          which is not a verified authorized admin account.
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <a href="/dashboard" style={{
            padding: '10px 20px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #76b900, #4a7a00)',
            color: '#000', fontSize: '0.875rem', fontWeight: 700,
            textDecoration: 'none',
          }}>Go to Dashboard</a>
          <a href="/" style={{
            padding: '10px 20px', borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.04)',
            color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', fontWeight: 600,
            textDecoration: 'none',
          }}>Back to Home</a>
        </div>
      </div>
    );
  }

  return children;
}
