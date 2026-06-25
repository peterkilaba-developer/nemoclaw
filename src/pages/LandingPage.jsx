import { structuredDataTemplates } from '../components/SEO';
import SEO from '../components/SEO';
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
        description="The Agentic OS for solo attorneys. 19 AI specialists handle drafting, research, intake, billing, and scheduling — while you practice law. Secured by NVIDIA NemoClaw. Zero data leak guarantee. $297/mo locked for life."
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
