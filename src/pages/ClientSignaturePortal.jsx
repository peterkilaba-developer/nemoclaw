import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, FileText, Lock, PenTool, Shield, ShieldCheck } from 'lucide-react';
import { getSignatureRequest, signSignatureRequest } from '../lib/lawFirmOSService';

export default function ClientSignaturePortal() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [docData, setDocData] = useState(null);
  
  // Signature state
  const [signature, setSignature] = useState('');
  const [isSigned, setIsSigned] = useState(false);
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    async function loadSecureDoc() {
      try {
        const data = await getSignatureRequest(token);
        setDocData({
          title: data.title || 'Secure Legal Document',
          firmName: data.firmName || 'Secure Law Firm Portal',
          clientName: data.clientName || 'Authorized Signatory',
          content: data.content || 'Document preview is unavailable. Please contact your attorney.',
          dateSent: data.dateSent ? new Date(data.dateSent).toLocaleDateString() : new Date().toLocaleDateString(),
          status: data.status || 'pending',
          signedAt: data.signedAt || null,
          signatureName: data.signatureName || null,
        });

        if (data.status === 'signed') {
          setIsSigned(true);
          if (data.signatureName) {
            setSignature(data.signatureName);
          }
        }
      } catch (err) {
        console.error("Failed to load secure document", err);
      } finally {
        setLoading(false);
      }
    }
    loadSecureDoc();
  }, [token]);

  const handleSign = async () => {
    if (!signature.trim() || !docData) return;
    setSigning(true);
    
    try {
      const result = await signSignatureRequest({
        token,
        signatureName: signature.trim(),
        consentAccepted: true,
      });
      setDocData(prev => ({
        ...prev,
        status: result.status,
        signedAt: result.signedAt,
        signatureName: result.signatureName,
      }));
      setIsSigned(true);
      setSigning(false);
    } catch (err) {
      console.error(err);
      alert('Failed to securely sign document. Please try again.');
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}>
        <div style={{ textAlign: 'center', color: '#6b7280' }}>
          <img src="/logos/claw-128-transparent.png" alt="NemoC LAW AI" style={{ width: '48px', height: '48px', opacity: 0.5, marginBottom: '16px' }} />
          <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>Decrypting Secure Document...</div>
        </div>
      </div>
    );
  }

  if (!docData) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}>
         <div style={{ textAlign: 'center', padding: '40px', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
            <h2 style={{ margin: 0, color: '#ef4444' }}>Link Expired or Invalid</h2>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '8px' }}>This magic link is no longer valid. Please request a new one from your attorney.</p>
         </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Shield color="#16a34a" size={24} />
          <div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#111827' }}>{docData.firmName}</div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Secure Client Portal</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#16a34a', fontSize: '0.75rem', fontWeight: 600, background: '#f0fdf4', padding: '6px 12px', borderRadius: '20px' }}>
          <Lock size={12} /> End-to-End Encrypted
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '32px 16px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Status Bar */}
          {!isSigned ? (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '16px 20px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e3a8a', margin: '0 0 4px' }}>Action Required</h2>
                <p style={{ fontSize: '0.8125rem', color: '#3b82f6', margin: 0 }}>Please review and sign the document below.</p>
              </div>
              <button 
                onClick={() => document.getElementById('signature-section').scrollIntoView({ behavior: 'smooth' })}
                style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Scroll to Sign
              </button>
            </div>
          ) : (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '20px', borderRadius: '8px', display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <CheckCircle color="#16a34a" size={28} />
              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#166534', margin: '0 0 4px' }}>Document Signed Successfully</h2>
                <p style={{ fontSize: '0.875rem', color: '#15803d', margin: 0 }}>A legally binding copy has been saved to your secure matter vault and your attorney has been notified.</p>
              </div>
            </div>
          )}

          {/* Document Viewer */}
          <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.01)', overflow: 'hidden' }}>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FileText color="#9ca3af" size={24} />
              <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', margin: 0 }}>{docData.title}</h1>
            </div>
            
            <div style={{ padding: '40px 48px', minHeight: '400px', fontSize: '0.9375rem', color: '#374151', lineHeight: 1.8, whiteSpace: 'pre-wrap', fontFamily: 'Times New Roman, serif' }}>
              {docData.content}
            </div>

            {/* Signature Section */}
            <div id="signature-section" style={{ background: '#f9fafb', padding: '32px 48px', borderTop: '1px solid #e5e7eb' }}>
              {!isSigned ? (
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <PenTool size={18} /> Electronic Signature
                  </h3>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#4b5563', marginBottom: '8px' }}>Type your full legal name to sign</label>
                    <input 
                      type="text" 
                      value={signature}
                      onChange={(e) => setSignature(e.target.value)}
                      placeholder="e.g. John A. Doe"
                      style={{ width: '100%', maxWidth: '400px', padding: '12px 16px', fontSize: '1rem', border: '1px solid #d1d5db', borderRadius: '8px', outline: 'none', fontFamily: signature ? "'Caveat', 'Dancing Script', cursive" : 'inherit' }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button 
                      onClick={handleSign}
                      disabled={!signature.trim() || signing}
                      style={{ 
                        background: signature.trim() ? '#16a34a' : '#d1d5db', 
                        color: signature.trim() ? '#fff' : '#9ca3af', 
                        border: 'none', padding: '12px 32px', borderRadius: '6px', fontSize: '1rem', fontWeight: 600, cursor: signature.trim() ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s'
                      }}
                    >
                      {signing ? 'Applying Signature...' : 'Click to Sign Legal Document'}
                    </button>
                    <span style={{ fontSize: '0.75rem', color: '#6b7280', maxWidth: '300px' }}>
                      By clicking this button, you agree to the <a href="#" style={{ color: '#2563eb' }}>eSign Terms & Conditions</a> and consent to using electronic records.
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: '16px' }}>Signed by {docData.clientName}</h3>
                  <div style={{ 
                    fontFamily: "'Caveat', cursive", 
                    fontSize: '2rem', 
                    color: '#1e3a8a', 
                    borderBottom: '1px solid #1e3a8a', 
                    display: 'inline-block', 
                    paddingBottom: '4px',
                    minWidth: '250px'
                  }}>
                    {signature}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '12px' }}>
                    <strong>Signed on:</strong> {docData.signedAt ? new Date(docData.signedAt).toLocaleString() : new Date().toLocaleString()}<br/>
                    <strong>Audit:</strong> Signature event recorded in the firm's immutable audit log.
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            Powered by <ShieldCheck size={12} color="#16a34a" /> NemoClaw Secure Vault
          </div>
        </div>
      </main>
    </div>
  );
}
