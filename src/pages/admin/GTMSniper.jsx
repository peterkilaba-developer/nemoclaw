import { useState, useEffect } from 'react';
import { analyzeProspect, analyzeInboundComment, fetchInboundEngagements, markInboundEngagementReady } from '../../lib/socialSniperAPI';

import { CheckCircle2, Copy, MessageSquare, Radar, RefreshCw, RotateCw, Send, Target } from 'lucide-react';

export default function GTMSniper() {
  const [activeTab, setActiveTab] = useState('radar'); // 'radar' or 'manual'
  
  // Manual Targeting State
  const [prospectData, setProspectData] = useState('');
  const [objective, setObjective] = useState('contradict');
  const [manualLoading, setManualLoading] = useState(false);
  const [manualResult, setManualResult] = useState(null);
  const [copiedConnection, setCopiedConnection] = useState(false);
  const [copiedComment, setCopiedComment] = useState(false);
  const [manualError, setManualError] = useState(null);

  // Engagement Radar State
  const [engagements, setEngagements] = useState([]);
  const [radarLoading, setRadarLoading] = useState(true);
  const [selectedEngagement, setSelectedEngagement] = useState(null);
  const [analyzingComment, setAnalyzingComment] = useState(false);
  const [draftedReply, setDraftedReply] = useState(null);
  const [firingResponse, setFiringResponse] = useState(false);

  useEffect(() => {
    loadEngagements();
  }, []);

  const loadEngagements = async () => {
    setRadarLoading(true);
    try {
      const data = await fetchInboundEngagements();
      setEngagements(data);
    } catch (err) {
      console.error(err);
    } finally {
      setRadarLoading(false);
    }
  };

  const handleManualAnalyze = async () => {
    if (!prospectData.trim()) return;
    setManualLoading(true);
    setManualResult(null);
    setManualError(null);
    try {
      const data = await analyzeProspect(prospectData, objective);
      setManualResult(data);
    } catch (err) {
      setManualError(err.message);
    } finally {
      setManualLoading(false);
    }
  };

  const handleAnalyzeComment = async (engagement) => {
    setSelectedEngagement(engagement);
    setAnalyzingComment(true);
    setDraftedReply(null);
    try {
      const result = await analyzeInboundComment(engagement.originalPost, engagement.commentText, engagement.platform);
      setDraftedReply(result);
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzingComment(false);
    }
  };

  const handleFireResponse = async () => {
    if (!selectedEngagement || !draftedReply?.draftReply) return;
    setFiringResponse(true);
    try {
      await markInboundEngagementReady(selectedEngagement.id, draftedReply.draftReply);
      setEngagements(prev => prev.filter(e => e.id !== selectedEngagement.id));
      setSelectedEngagement(null);
      setDraftedReply(null);
    } catch (err) {
      console.error("Failed to save drafted response", err);
    } finally {
      setFiringResponse(false);
    }
  };

  const handleRegenerate = () => {
    if (selectedEngagement) {
      handleAnalyzeComment(selectedEngagement);
    }
  };

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'connection') {
      setCopiedConnection(true);
      setTimeout(() => setCopiedConnection(false), 2000);
    } else {
      setCopiedComment(true);
      setTimeout(() => setCopiedComment(false), 2000);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', color: '#fff' }}>
      <div style={{ marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Target color="#76b900" />
            GTM Sniper Console
          </h1>
          <p style={{ margin: '8px 0 0 0', color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>
            Hunt for target prospects manually or monitor inbound engagements to defend your thought leadership position. 
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <button 
          onClick={() => setActiveTab('radar')}
          style={{ 
            padding: '12px 24px', border: 'none', background: 'transparent', color: activeTab === 'radar' ? '#76b900' : 'rgba(255,255,255,0.5)',
            borderBottom: activeTab === 'radar' ? '2px solid #76b900' : '2px solid transparent',
            cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem'
          }}
        >
          <Radar size={16} /> Engagement Radar 
          {engagements.length > 0 && <span style={{ background: '#76b900', color: '#000', padding: '2px 6px', borderRadius: '12px', fontSize: '0.6875rem', fontWeight: 800 }}>{engagements.length}</span>}
        </button>
        <button 
          onClick={() => setActiveTab('manual')}
          style={{ 
            padding: '12px 24px', border: 'none', background: 'transparent', color: activeTab === 'manual' ? '#76b900' : 'rgba(255,255,255,0.5)',
            borderBottom: activeTab === 'manual' ? '2px solid #76b900' : '2px solid transparent',
            cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem'
          }}
        >
          <Target size={16} /> Manual Targeting
        </button>
      </div>

      {activeTab === 'radar' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 1fr) 1.5fr', gap: '24px', animation: 'fadeIn 0.3s ease-out' }}>
          {/* Left Col: Engagements List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>Inbound Comments</span>
              <button onClick={loadEngagements} style={{ background: 'transparent', border: 'none', color: '#76b900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}>
                <RefreshCw size={12} className={radarLoading ? 'animate-spin' : ''} /> Sync
              </button>
            </div>
            
            {radarLoading && engagements.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>Scanning feeds...</div>
            ) : engagements.length === 0 ? (
              <div style={{ padding: '40px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>No pending inbound engagements found.</div>
            ) : (
              engagements.map(eng => (
                <div 
                  key={eng.id}
                  onClick={() => handleAnalyzeComment(eng)}
                  style={{
                    padding: '16px', borderRadius: '12px', background: selectedEngagement?.id === eng.id ? 'rgba(118,185,0,0.05)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${selectedEngagement?.id === eng.id ? 'rgba(118,185,0,0.3)' : 'rgba(255,255,255,0.05)'}`,
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                    <span style={{ fontWeight: 700, color: '#fff' }}>{eng.author}</span>
                    <span>{eng.platform}</span>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#fff', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    "{eng.commentText}"
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right Col: Analysis & Response */}
          <div>
            {selectedEngagement ? (
              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '24px', animation: 'slideInRight 0.3s ease-out' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#76b900' }}>
                  <MessageSquare size={18} />
                  <span style={{ fontWeight: 800 }}>Engage Target: {selectedEngagement.author}</span>
                </div>
                
                <div style={{ marginBottom: '20px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                   <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', fontWeight: 700 }}>Your Original Post</div>
                   <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', borderLeft: '2px solid rgba(255,255,255,0.1)', paddingLeft: '12px' }}>
                     {selectedEngagement.originalPost}
                   </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                   <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', fontWeight: 700 }}>Target Comment</div>
                   <div style={{ fontSize: '0.9375rem', color: '#fff', lineHeight: 1.5 }}>
                     "{selectedEngagement.commentText}"
                   </div>
                </div>

                {analyzingComment ? (
                  <div style={{ padding: '40px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <RotateCw className="animate-spin" size={24} color="#76b900" style={{ margin: '0 auto 16px' }} />
                    <div style={{ color: '#76b900', fontWeight: 700 }}>Analyzing intent & drafting defense...</div>
                  </div>
                ) : draftedReply ? (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '24px' }}>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                      <div style={{ padding: '6px 12px', background: draftedReply.sentiment === 'Antagonistic' ? 'rgba(239,68,68,0.1)' : 'rgba(118,185,0,0.1)', color: draftedReply.sentiment === 'Antagonistic' ? '#ef4444' : '#76b900', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                        Intent: {draftedReply.sentiment}
                      </div>
                      <div style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', color: '#fff', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                        Strategy: {draftedReply.recommendedStrategy}
                      </div>
                    </div>
                    
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Drafted Response (Agentic HITL)</label>
                    <textarea 
                      defaultValue={draftedReply.draftReply} 
                      style={{ width: '100%', minHeight: '120px', padding: '16px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(118,185,0,0.3)', color: '#fff', borderRadius: '8px', fontSize: '0.875rem', lineHeight: 1.5, resize: 'vertical' }}
                    />
                    
                    <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                      <button 
                        onClick={handleRegenerate}
                        disabled={firingResponse}
                        style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', fontWeight: 700, cursor: firingResponse ? 'not-allowed' : 'pointer', opacity: firingResponse ? 0.5 : 1 }}>
                        Regenerate
                      </button>
                      <button 
                        onClick={handleFireResponse}
                        disabled={firingResponse}
                        style={{ flex: 2, padding: '12px', background: 'linear-gradient(135deg, #76b900, #4a7a00)', border: 'none', color: '#000', borderRadius: '8px', fontWeight: 800, cursor: firingResponse ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: firingResponse ? 0.7 : 1 }}>
                        {firingResponse ? <RotateCw className="animate-spin" size={16} /> : <Send size={16} />}
                        {firingResponse ? 'Saving...' : `Save Draft for ${selectedEngagement.platform}`}
                      </button>
                    </div>
                  </div>
                ) : null}

              </div>
            ) : (
              <div style={{ height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '16px' }}>
                 <Radar size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                 <p style={{ margin: 0, fontSize: '0.875rem' }}>Select a target engagement to draft reply</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'manual' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', animation: 'fadeIn 0.3s ease-out' }}>
          {/* Left Col: Input */}
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
               <button onClick={() => setObjective('contradict')} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8125rem', background: objective === 'contradict' ? 'rgba(239, 68, 68, 0.15)' : 'transparent', color: objective === 'contradict' ? '#ef4444' : 'rgba(255,255,255,0.5)', transition: 'all 0.2s' }}>
                  Attack / Contradict
               </button>
               <button onClick={() => setObjective('agree')} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8125rem', background: objective === 'agree' ? 'rgba(118, 185, 0, 0.15)' : 'transparent', color: objective === 'agree' ? '#76b900' : 'rgba(255,255,255,0.5)', transition: 'all 0.2s' }}>
                  Agree / Amplify
               </button>
            </div>

            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 600 }}>Raw Prospect Data (Bio/Posts)</label>
            <textarea
              value={prospectData}
              onChange={(e) => setProspectData(e.target.value)}
              placeholder="e.g. Managing Partner at Smith & Jones. Recent post: 'AI is a fad, human lawyers are forever...'"
              style={{
                width: '100%',
                minHeight: '200px',
                padding: '12px',
                borderRadius: '8px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                fontSize: '0.875rem',
                resize: 'vertical',
                fontFamily: 'monospace'
              }}
            />
            <button
              onClick={handleManualAnalyze}
              disabled={manualLoading || !prospectData.trim()}
              style={{
                marginTop: '12px',
                width: '100%',
                padding: '12px',
                background: 'linear-gradient(135deg, #76b900, #4a7a00)',
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 800,
                cursor: manualLoading ? 'not-allowed' : 'pointer',
                opacity: manualLoading || !prospectData.trim() ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {manualLoading ? <RotateCw className="animate-spin" size={16} /> : <Target size={16} />}
              {manualLoading ? 'Synthesizing Attack Vector...' : 'Analyze Target'}
            </button>
            
            {manualError && (
              <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(255,0,0,0.1)', color: '#ff4444', borderRadius: '8px', fontSize: '0.875rem' }}>
                {manualError}
              </div>
            )}
          </div>

          {/* Right Col: Output */}
          <div>
            {manualResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '0.875rem', color: '#76b900', textTransform: 'uppercase' }}>1. Trojan Horse Connection</h3>
                    <button onClick={() => handleCopy(manualResult.connectionDraft, 'connection')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                      {copiedConnection ? <CheckCircle2 size={16} color="#76b900" /> : <Copy size={16} />}
                    </button>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: '1.5' }}>{manualResult.connectionDraft}</p>
                </div>

                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '0.875rem', color: '#f59e0b', textTransform: 'uppercase' }}>2. "Hitman" Comment</h3>
                    <button onClick={() => handleCopy(manualResult.sniperComment, 'comment')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                      {copiedComment ? <CheckCircle2 size={16} color="#76b900" /> : <Copy size={16} />}
                    </button>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: '1.5' }}>{manualResult.sniperComment}</p>
                </div>
              </div>
            ) : (
               <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '8px' }}>
                  <Target size={32} style={{ marginBottom: '12px' }} />
                  <p style={{ margin: 0, fontSize: '0.875rem' }}>Awaiting Target Data</p>
               </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(15px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
