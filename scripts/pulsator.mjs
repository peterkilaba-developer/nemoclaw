/**
 * NemoC AgaaS Pulsator
 * 
 * Simulates a "Living Agency" by periodically:
 * 1. Incrementing tasksDone for random agents
 * 2. Adding a new "Agent Interaction" log to the Audit Log
 * 3. Updating health scores slightly
 * 
 * This makes the Admin Dashboard feel "Alive" for the demo.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, collection, addDoc, setDoc, increment, getDoc, serverTimestamp } from 'firebase/firestore';
import { readFileSync } from 'fs';

// Read .env file manually
const envContent = readFileSync(new URL('../.env', import.meta.url), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && key.trim() && !key.startsWith('#')) {
    env[key.trim()] = val.join('=').trim();
  }
});

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'nemoc-law-ai.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'nemoc-law-ai',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'nemoc-law-ai.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const AGENTS = [
  'revenue', 'customer-success', 'security', 'devops', 
  'marketing', 'sales', 'support', 'analytics'
];

const ACTIONS = [
  'Scanned waitlist for high-value firms',
  'Analyzing server infrastructure metrics',
  'Drafting new content for the blog',
  'Reviewing security audit logs',
  'Processing billing batch for the day',
  'Synthesizing customer success signals',
  'Synchronizing agent knowledge bases',
  'Executing system health heartbeat'
];

async function pulse() {
  const agentId = AGENTS[Math.floor(Math.random() * AGENTS.length)];
  const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
  
  console.log(`📡 Pulsing agency... Agent: [${agentId}] Action: ${action}`);

  try {
    // 1. Increment tasks
    const agentRef = doc(db, '_internalAgents', agentId);
    await setDoc(agentRef, {
      tasks24h: increment(1),
      resolved: increment(1),
      lastAction: action,
      lastActionTime: 'just now',
      lastUpdated: new Date()
    }, { merge: true });

    // 2. Add Audit Log entry
    await addDoc(collection(db, '_internalAuditLog'), {
      agentId: agentId,
      type: 'internal_agent_pulse',
      userMessage: 'Autonomous work cycle pulse',
      agentResponse: `${action} — All systems operational.`,
      department: 'autonomous',
      timestamp: new Date(),
      immutable: true
    });

    console.log('✅ Pulse complete!');
  } catch (err) {
    console.error('❌ Pulse failed (check permissions in rules):', err.message);
  }
}

console.log('🌌 NemoC AgaaS Pulsator started. Sending pulse every 15 seconds...');
console.log('Stop with Ctrl+C\n');

// Send initial pulse
pulse();

// Then every 15 seconds
setInterval(pulse, 15000);
