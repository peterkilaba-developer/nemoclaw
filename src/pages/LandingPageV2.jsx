import { structuredDataTemplates } from '../components/SEO';
import SEO from '../components/SEO';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import V2Narrative from '../components/V2Narrative';
import Pricing from '../components/Pricing';
import Footer from '../components/Footer';


export default function LandingPageV2() {
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
      <V2Narrative />
      <Pricing />
      <Footer />
    </>
  );
}
