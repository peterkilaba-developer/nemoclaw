import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './pages/DashboardLayout';
import DashboardHome from './pages/DashboardHome';
import MyAgent from './pages/MyAgent';
import TeamPage from './pages/TeamPage';
import AgentLibrary from './pages/AgentLibrary';
import SecurityAudit from './pages/SecurityAudit';
import SuperAgentDashboard from './pages/SuperAgentDashboard';
import Matters from './pages/Matters';
import MatterWorkspace from './pages/MatterWorkspace';
import FirmSettings from './pages/FirmSettings';
import BillingUsage from './pages/BillingUsage';
import WebsiteBuilder from './pages/WebsiteBuilder';
import ClientPortal from './pages/ClientPortal';
import AdminDashboard from './pages/AdminDashboard';
import OnboardingWizard from './pages/OnboardingWizard';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import { FirmProvider } from './contexts/FirmContext';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import DataProcessing from './pages/DataProcessing';
import SecurityCompliance from './pages/SecurityCompliance';
import About from './pages/About';
import Blog from './pages/Blog';
import Careers from './pages/Careers';

function App() {
  return (
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
      <Route path="/careers" element={<Careers />} />

      {/* Onboarding — protected, no FirmProvider needed */}
      <Route path="/onboarding" element={
        <ProtectedRoute>
          <OnboardingWizard />
        </ProtectedRoute>
      } />
      
      {/* Dashboard — protected */}
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
        <Route path="team" element={<TeamPage />} />
        <Route path="agents" element={<AgentLibrary />} />
        <Route path="security" element={<SecurityAudit />} />
        <Route path="super-agent" element={<SuperAgentDashboard />} />
        <Route path="settings" element={<FirmSettings />} />
        <Route path="billing" element={<BillingUsage />} />
        <Route path="website-builder" element={<WebsiteBuilder />} />
      </Route>

      {/* Admin — protected + admin email whitelist */}
      <Route path="/admin" element={
        <AdminRoute>
          <AdminDashboard />
        </AdminRoute>
      } />
    </Routes>
  );
}

export default App;
