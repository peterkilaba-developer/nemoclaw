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
        description="The Agentic OS for solo attorneys. 19 AI specialists handle drafting, research, intake, billing, and scheduling — while you practice law. Secured by NVIDIA NemoClaw. Zero data leak guarantee. $297/mo locked for life."
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
