import { Component, lazy, Suspense } from 'react';
import { Navigate, Routes, Route, useLocation } from 'react-router-dom';
import DashboardLayout from './pages/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import { FirmProvider } from './contexts/FirmContext';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardHome = lazy(() => import('./pages/DashboardHome'));
const MyAgent = lazy(() => import('./pages/MyAgent'));
const TeamPage = lazy(() => import('./pages/TeamPage'));
const AgentLibrary = lazy(() => import('./pages/AgentLibrary'));
const SecurityAudit = lazy(() => import('./pages/SecurityAudit'));
const SuperAgentDashboard = lazy(() => import('./pages/SuperAgentDashboard'));
const Matters = lazy(() => import('./pages/Matters'));
const MatterWorkspace = lazy(() => import('./pages/MatterWorkspace'));
const FirmSettings = lazy(() => import('./pages/FirmSettings'));
const BillingUsage = lazy(() => import('./pages/BillingUsage'));
const WebsiteBuilder = lazy(() => import('./pages/WebsiteBuilder'));
const ClientPortal = lazy(() => import('./pages/ClientPortal'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const MigrationCenter = lazy(() => import('./pages/MigrationCenter'));
const OnboardingWizard = lazy(() => import('./pages/OnboardingWizard'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const DataProcessing = lazy(() => import('./pages/DataProcessing'));
const SecurityCompliance = lazy(() => import('./pages/SecurityCompliance'));
const About = lazy(() => import('./pages/About'));
const Blog = lazy(() => import('./pages/Blog'));
const Careers = lazy(() => import('./pages/Careers'));
const BlogPost = lazy(() => import('./pages/BlogPost'));
const QnADirectory = lazy(() => import('./pages/QnADirectory'));
const QnAPost = lazy(() => import('./pages/QnAPost'));
const JoinFirm = lazy(() => import('./pages/JoinFirm'));
const ClaimSandbox = lazy(() => import('./pages/ClaimSandbox'));
const ClientSignaturePortal = lazy(() => import('./pages/ClientSignaturePortal'));
const ClientCRM = lazy(() => import('./pages/ClientCRM'));

class RouteErrorBoundaryImpl extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    const message = String(error?.message || error || '');
    const isChunkError = /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk/i.test(message);
    if (isChunkError && typeof window !== 'undefined') {
      const reloadKey = 'nemoc-route-chunk-reload';
      const attemptedFor = window.sessionStorage.getItem(reloadKey);
      if (attemptedFor !== window.location.href) {
        window.sessionStorage.setItem(reloadKey, window.location.href);
        window.location.reload();
        return;
      }
    }
    console.error('Dashboard route crashed:', error, info);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    const message = String(this.state.error?.message || this.state.error);
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#050505', color: '#f8fafc', padding: '32px' }}>
        <div style={{ maxWidth: '560px', width: '100%', border: '1px solid rgba(248,250,252,0.14)', borderRadius: '12px', padding: '24px', background: '#111113' }}>
          <h1 style={{ margin: '0 0 8px', fontSize: '1.25rem' }}>Route failed to render</h1>
          <p style={{ margin: '0 0 16px', color: '#cbd5e1', lineHeight: 1.5 }}>
            The app caught the route error instead of leaving a blank screen.
          </p>
          <pre style={{ whiteSpace: 'pre-wrap', overflowX: 'auto', color: '#fca5a5', background: '#050505', padding: '12px', borderRadius: '8px', fontSize: '0.75rem' }}>{message}</pre>
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
            <button onClick={() => window.location.reload()} style={{ border: 0, borderRadius: '6px', padding: '10px 14px', cursor: 'pointer', fontWeight: 700 }}>Reload</button>
            <button onClick={() => { window.location.href = '/dashboard'; }} style={{ border: '1px solid rgba(248,250,252,0.2)', background: 'transparent', color: '#f8fafc', borderRadius: '6px', padding: '10px 14px', cursor: 'pointer', fontWeight: 700 }}>Go to Dashboard</button>
          </div>
        </div>
      </div>
    );
  }
}

function RouteErrorBoundary({ children }) {
  const location = useLocation();
  return <RouteErrorBoundaryImpl resetKey={location.pathname}>{children}</RouteErrorBoundaryImpl>;
}

function RouteFallback() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--color-bg, #050505)', color: 'var(--color-text, #f8fafc)' }}>
      Loading...
    </div>
  );
}

function App() {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/data-processing" element={<DataProcessing />} />
        <Route path="/security-compliance" element={<SecurityCompliance />} />
        <Route path="/about" element={<About />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/careers" element={<Careers />} />
        <Route path="/answers" element={<QnADirectory />} />
        <Route path="/answers/:id" element={<QnAPost />} />
        <Route path="/join" element={<JoinFirm />} />
        <Route path="/claim" element={<ClaimSandbox />} />
        <Route path="/signature/:token" element={<ClientSignaturePortal />} />

        {/* Onboarding: protected, no FirmProvider needed */}
        <Route path="/onboarding" element={
          <ProtectedRoute>
            <OnboardingWizard />
          </ProtectedRoute>
        } />

        {/* Dashboard: protected */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <FirmProvider>
              <DashboardLayout />
            </FirmProvider>
          </ProtectedRoute>
        }>
          <Route index element={<MyAgent />} />
          <Route path="overview" element={<DashboardHome />} />
          <Route path="my-agent" element={<MyAgent />} />
          <Route path="matters" element={<Matters />} />
          <Route path="matters/:matterId" element={<MatterWorkspace />} />
          <Route path="client-portal" element={<ClientPortal />} />
          <Route path="crm" element={<ClientCRM />} />
          <Route path="team" element={<TeamPage />} />
          <Route path="agents" element={<AgentLibrary />} />
          <Route path="security" element={<SecurityAudit />} />
          <Route path="super-agent" element={<SuperAgentDashboard />} />
          <Route path="settings" element={<FirmSettings />} />
          <Route path="billing" element={<BillingUsage />} />
          <Route path="website-builder" element={<WebsiteBuilder />} />
          <Route path="migration" element={<MigrationCenter />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>

        {/* Admin: protected plus admin email whitelist */}
        <Route path="/admin" element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </RouteErrorBoundary>
  );
}

export default App;
