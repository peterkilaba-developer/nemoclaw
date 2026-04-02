import { useState, useEffect } from 'react';
import './Navbar.css';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`} id="navbar">
      <div className="navbar-inner container">
        <a href="/" className="navbar-brand" id="nav-logo">
          <img src="/logos/claw-64-transparent.png" alt="" className="brand-icon" />
          <img src="/logos/wordmark.svg" alt="NemoC LAW AI" className="brand-wordmark" />
        </a>

        <div className={`navbar-links ${mobileOpen ? 'open' : ''}`}>
          <a href="/#workforce" onClick={() => setMobileOpen(false)}>AI Workforce</a>
          <a href="/#security" onClick={() => setMobileOpen(false)}>Security</a>
          <a href="/#born-agentic" onClick={() => setMobileOpen(false)}>Why Us</a>
          <a href="/#pricing" onClick={() => setMobileOpen(false)}>Pricing</a>
        </div>

        <div className="navbar-actions">
          <a href="/login" className="btn btn-secondary btn-sm" id="nav-login">Login</a>
          <a href="/login" className="btn btn-primary btn-sm" id="nav-cta">Get Started</a>
        </div>

        <button 
          className={`navbar-toggle ${mobileOpen ? 'open' : ''}`}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
          id="nav-toggle"
        >
          <span></span><span></span><span></span>
        </button>
      </div>
    </nav>
  );
}
