import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

/**
 * Admin access check.
 *
 * Two layers:
 *  1. user.isAdmin — set via Firestore /users/{uid}.isAdmin: true
 *     Add new admins by writing that field in Firestore; no redeploy needed.
 *  2. Hardcoded fallback for the initial platform owner so the admin panel
 *     is accessible before any Firestore admin documents exist.
 *
 * To add a new admin without redeployment:
 *   firebase firestore:update users/<uid> --data '{"isAdmin": true}'
 */
const BOOTSTRAP_ADMIN_EMAILS = [
  'peterkilaba@gmail.com',
  'peterkilaba@nemoc-law.ai',
  'peterkilaba@nemo-law.ai',
  'peterkilaba.developer@gmail.com',
];

export function isAdminUser(user) {
  if (!user?.email) return false;
  if (!user.emailVerified) return false;
  // Firestore-driven flag (no redeploy needed)
  if (user.isAdmin === true) return true;
  // Bootstrap fallback for initial setup
  return BOOTSTRAP_ADMIN_EMAILS.includes(user.email.toLowerCase());
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

  if (!user) return <Navigate to="/login" replace />;

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
          background: 'rgba(239,68,68,0.12)',
          border: '1px solid rgba(239,68,68,0.25)',
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
          This area is restricted to NemoC LAW AI platform administrators.
          You are signed in as{' '}
          <strong style={{ color: '#76b900' }}>{user.email}</strong>,
          which does not have admin access.
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
