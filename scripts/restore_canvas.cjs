const fs = require('fs');
let c = fs.readFileSync('src/pages/MyAgent.jsx', 'utf8');

c = c.replace(/const \[showSubAgents\(?, setShowSubAgents\] = useState\(false\);/, 
  'const [showSubAgents, setShowSubAgents] = useState(false);\n  const [activeView, setActiveView] = useState(\'canvas\');');

// Prepend the canvas imports
const imports = `
import ParalegalCanvas from '../components/canvas/ParalegalCanvas';
import PartnerCanvas from '../components/canvas/PartnerCanvas';
import AssociateCanvas from '../components/canvas/AssociateCanvas';
import BillingCanvas from '../components/canvas/BillingCanvas';
import IntakeCanvas from '../components/canvas/IntakeCanvas';
`;
c = c.replace(/import React from 'react';/, imports + '\nimport React from \'react\';');

const tabToggle = `
        <div className="db-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: activeView === 'canvas' ? 0 : 24 }}>
          <div className="db-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: activeView === 'canvas' ? 0 : '20px', paddingBottom: activeView === 'canvas' ? 0 : 0, borderBottom: activeView === 'canvas' ? 'none' : 'none' }}>
            {activeView === 'canvas' ? null : (
            <div>
              <div className="db-card-title"><MessageSquare size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />Active Session</div>
              <div className="db-card-subtitle">Natural language commands will auto-dispatch specialist sub-agents.</div>
            </div>
            )}
            
            <div style={{ display: 'flex', gap: '8px', marginLeft: activeView === 'canvas' ? 'auto' : 0, marginBottom: activeView === 'canvas' ? 'auto' : 0, padding: activeView === 'canvas' ? '12px 16px' : 0, borderBottom: activeView === 'canvas' ? '1px solid var(--db-border)' : 'none', width: activeView === 'canvas' ? '100%' : 'auto', background: activeView === 'canvas' ? 'var(--db-surface)' : 'transparent', zIndex: 10 }}>
              <button onClick={() => setActiveView('chat')} className={\`db-btn \${activeView === 'chat' ? 'db-btn-primary' : 'db-btn-secondary'}\`} style={{ borderRadius: '20px', padding: '6px 16px', fontSize: '0.8125rem' }}><MessageSquare size={14} style={{ marginRight: '6px' }} /> Discuss with AI</button>
              <button onClick={() => setActiveView('canvas')} className={\`db-btn \${activeView === 'canvas' ? 'db-btn-primary' : 'db-btn-secondary'}\`} style={{ borderRadius: '20px', padding: '6px 16px', fontSize: '0.8125rem' }}><Cpu size={14} style={{ marginRight: '6px' }} /> Workspace Canvas</button>
            </div>
          </div>
`;

c = c.replace(/<div className="db-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>\s*<div className="db-card-header".*?>[\s\S]*?<\/div>\s*<\/div>\s*<button[\s\S]*?<\/button>\s*<\/div>/, tabToggle);

const activeViewBlock = `
          {activeView === 'canvas' ? (
            <div style={{ height: '100%', overflow: 'hidden', padding: 0 }}>
              {agentType === 'paralegal' || agentType === 'secretary' ? <ParalegalCanvas firmId={firmId} user={user} activeMatter={matters[0]} /> :
               agentType === 'billing' || agentType === 'operations' || agentType === 'bookkeeper' ? <BillingCanvas firmId={firmId} user={user} billableActivities={[]} /> :
               agentType === 'associate' || agentType === 'of-counsel' || agentType === 'law-clerk' || agentType === 'intern' ? <AssociateCanvas firmId={firmId} user={user} activeMatter={matters[0]} /> :
               agentType === 'intake' || agentType === 'receptionist' ? <IntakeCanvas firmId={firmId} user={user} leads={[]} /> :
               <PartnerCanvas firmId={firmId} user={user} billableActivities={[]} matters={matters} />}
            </div>
          ) : (
            <>
              <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
`;

c = c.replace(/<div style={{\s*flex: 1, padding: '16px', display: 'flex', flexDirection: 'column',\s*gap: '14px', overflowY: 'auto'\s*}}>/, activeViewBlock);

c = c.replace(/<div style={{\s*padding: '12px 16px', borderTop: '1px solid var\(--db-border\)',\s*position: 'relative'\s*}}>/, '</>\n          )}\n          <div style={{ padding: \'12px 16px\', borderTop: \'1px solid var(--db-border)\', position: \'relative\', display: activeView === \'chat\' ? \'block\' : \'none\' }}>');

fs.writeFileSync('src/pages/MyAgent.jsx', c);
console.log('Restored Workspace Canvas into MyAgent.jsx!');
