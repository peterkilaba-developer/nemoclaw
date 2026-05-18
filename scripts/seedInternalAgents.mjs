import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { INTERNAL_AGENT_REGISTRY } from '../src/lib/internalAgentRegistry.js';

function readEnv() {
  const envContent = readFileSync(new URL('../.env', import.meta.url), 'utf-8');
  const env = {};

  envContent.split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && key.trim() && !key.trim().startsWith('#')) {
      env[key.trim()] = val.join('=').trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    }
  });

  return env;
}

const env = readEnv();
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

async function seed() {
  console.log('Seeding canonical 13-agent internal Firestore namespace...\n');

  console.log('Writing _internalAgents states...');
  for (const agent of INTERNAL_AGENT_REGISTRY) {
    await setDoc(doc(db, '_internalAgents', agent.id), {
      status: agent.status,
      health: agent.health,
      tasks24h: agent.tasks24h,
      resolved: agent.resolved,
      metrics: agent.metrics,
      lastAction: agent.lastAction,
      lastActionTime: 'seeded',
      name: agent.name,
      abbr: agent.abbr,
      department: agent.department,
      lastUpdated: new Date(),
    }, { merge: true });
    console.log(`  OK ${agent.id} - ${agent.name}`);
  }

  console.log('\nBootstrap complete. Agent topology is initialized without synthetic audit, escalation, or marketing data.');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
