
import { initializeApp } from 'firebase/app';
import { getFirestore, deleteDoc, doc } from 'firebase/firestore';
import { readFileSync } from 'fs';

const envContent = readFileSync(new URL('../.env', import.meta.url), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && key.trim()) {
    env[key.trim()] = val.join('=').trim().replace(/^[\"']|[\"']$/g, '');
  }
});

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: 'nemoc-law-ai.firebaseapp.com',
  projectId: 'nemoc-law-ai'
});

const db = getFirestore(app);
deleteDoc(doc(db, 'published_content', 'how-to-deploy-an-autonomous-24-7-legal-web-intake-agent'))
  .then(() => { console.log('Deleted legacy post'); process.exit(0); })
  .catch(console.error);

