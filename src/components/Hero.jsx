import './Hero.css';
import AudioPlayer from './AudioPlayer';
import { Infinity as InfinityIcon, Lock, ShieldCheck } from 'lucide-react';

export default function Hero() {
  return (
    <section className="hero" id="hero">
      <div className="hero-bg">
        <div className="hero-grid"></div>
        <div className="hero-glow hero-glow-1"></div>
        <div className="hero-glow hero-glow-2"></div>
      </div>
      
      <div className="hero-content container">
        <div className="hero-video-container animate-fade-in-up">
          <video 
            controls 
            playsInline
            className="hero-video-inline"
          >
            <source src="/NemoClaw_Agentic_OS.mp4" type="video/mp4" />
          </video>
        </div>

        <div className="hero-badges animate-fade-in-up delay-1">
          <span className="badge badge-fort-knox">
            <Lock size={14} className="text-nvidia" /> Zero Data Leak Guarantee
          </span>
          <span className="badge">
            <ShieldCheck size={14} /> Secured by <span className="text-nvidia">NVIDIA</span> <span className="text-nvidia">NemoClaw</span>
          </span>
        </div>

        <h1 className="hero-title animate-fade-in-up delay-2">
          Your Firm's Private<br/>
          <span className="gradient-text"><span className="text-nvidia">Agentic</span> HITL OS.</span>
        </h1>

        <p className="hero-subtitle animate-fade-in-up delay-3">
          <strong>Scale your entire operational engine</strong> — without losing the human touch.{' '}
          Your operations run natively inside your firm's own <span className="text-nvidia">NVIDIA</span> security sandbox.{' '}
          No client data ever leaves your environment.{' '}
          <strong>Your price? Locked forever.</strong>
        </p>

        <div className="hero-anti-public animate-fade-in-up delay-3">
          <span className="hero-anti-icon">⚠️</span>
          <span>Stop risking client data with ChatGPT. Your firm deserves Fort Knox — not an open window.</span>
        </div>

        <div className="hero-actions animate-fade-in-up delay-4">
          <a href="/login" className="btn btn-primary btn-lg" id="hero-cta">
            Start Onboarding →
          </a>
          <a href="/#hitl-os" className="btn btn-secondary btn-lg" id="hero-explore">
            Explore Capabilities
          </a>
        </div>

        <div className="hero-audio animate-fade-in-up delay-4">
          <AudioPlayer />
        </div>

        <div className="hero-stats animate-fade-in-up delay-5">
          <div className="hero-stat">
            <span className="hero-stat-value">0</span>
            <span className="hero-stat-label">Legacy SaaS Needed</span>
          </div>
          <div className="hero-stat-divider"></div>
          <div className="hero-stat">
            <span className="hero-stat-value">1</span>
            <span className="hero-stat-label"><span className="text-nvidia">Agentic</span> PMI</span>
          </div>
          <div className="hero-stat-divider"></div>
          <div className="hero-stat">
            <span className="hero-stat-value gradient-text">100%</span>
            <span className="hero-stat-label"><span className="text-nvidia">NVIDIA</span> <span className="text-nvidia">NemoClaw</span> Secure</span>
          </div>
          <div className="hero-stat-divider"></div>
          <div className="hero-stat">
            <span className="hero-stat-value"><InfinityIcon size={28} /></span>
            <span className="hero-stat-label">Unlimited Tokens</span>
          </div>
        </div>
      </div>

      <div className="hero-scroll-indicator animate-fade-in delay-6">
        <div className="scroll-line"></div>
      </div>
    </section>
  );
}
