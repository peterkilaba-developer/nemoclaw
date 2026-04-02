import SEO, { structuredDataTemplates } from '../components/SEO';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import ParadigmShift from '../components/ParadigmShift';
import Agents from '../components/Agents';
import Security from '../components/Security';
import BornAgentic from '../components/BornAgentic';
import Pricing from '../components/Pricing';
import Waitlist from '../components/Waitlist';
import Footer from '../components/Footer';

export default function LandingPage() {
  return (
    <>
      <SEO
        description="Your firm's private AI workforce. 10 AI agents that 10x your team or fill roles you haven't hired yet. Secured by NVIDIA NemoClaw. Zero data leak guarantee. Founder pricing from $297/mo — locked for life."
        structuredData={[
          structuredDataTemplates.organization(),
          structuredDataTemplates.softwareApplication(),
        ]}
      />
      <Navbar />
      <Hero />
      <ParadigmShift />
      <Agents />
      <Security />
      <BornAgentic />
      <Pricing />
      <Waitlist />
      <Footer />
    </>
  );
}