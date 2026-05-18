import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';

const envContent = readFileSync(new URL('../.env', import.meta.url), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && key.trim()) {
    env[key.trim()] = val.join('=').trim().replace(/^['"]|['"]$/g, '');
  }
});

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: 'nemoc-law-ai.firebaseapp.com',
  projectId: 'nemoc-law-ai'
});

const db = getFirestore(app);

async function run() {
  console.log('Writing to queue...');
  await addDoc(collection(db, '_linkedinQueue'), {
    text: 'Just deployed the new HITL-first CMO Agent (ECHO) 🚀\n\nNemoC LAW AI now safely equips your law firm team with dedicated agents. We never replace human expertise, we amplify it with secure, sandboxed Agentic OS.\n\n#HITL #AgenticAI #LegalTech',
    status: 'queued',
    createdAt: new Date()
  });
  console.log('Added post to queue.');
  process.exit(0);
}

run().catch(console.error);
