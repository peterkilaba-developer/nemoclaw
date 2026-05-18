import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
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
getDoc(doc(db, '_internalConfig', 'linkedin')).then(snapshot => {
  console.log(snapshot.data());
  process.exit(0);
}).catch(console.error);
