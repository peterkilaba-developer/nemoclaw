import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { readFileSync } from 'fs';

const envContent = readFileSync(new URL('../.env', import.meta.url), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && key.trim() && !key.startsWith('#')) {
    env[key.trim()] = val.join('=').trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
  }
});

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'nemoc-law-ai.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'nemoc-law-ai',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'nemoc-law-ai.firebasestorage.app',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function wipe() {
  console.log('Wiping _internalAgents...');
  const aRef = await getDocs(collection(db, '_internalAgents'));
  for (const d of aRef.docs) { await deleteDoc(doc(db, '_internalAgents', d.id)); }

  console.log('Wiping _internalAuditLog...');
  const bRef = await getDocs(collection(db, '_internalAuditLog'));
  for (const d of bRef.docs) { await deleteDoc(doc(db, '_internalAuditLog', d.id)); }

  console.log('Wiping _internalEscalations...');
  const cRef = await getDocs(collection(db, '_internalEscalations'));
  for (const d of cRef.docs) { await deleteDoc(doc(db, '_internalEscalations', d.id)); }

  console.log('Done!');
  process.exit(0);
}
wipe();
