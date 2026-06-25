import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, writeBatch } from 'firebase/firestore';
import { readFileSync, writeFileSync } from 'fs';

// Read .env file manually
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
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchCollection(firmId, collectionName) {
  const colRef = collection(db, 'firms', firmId, collectionName);
  const snap = await getDocs(colRef);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function exportFirm(firmId, outFile) {
  console.log(`\n⏳ Exporting firm: ${firmId}`);
  
  const firmSnap = await getDoc(doc(db, 'firms', firmId));
  if (!firmSnap.exists()) {
    console.error(`❌ Firm ${firmId} not found.`);
    process.exit(1);
  }

  const exportData = {
    firmConfig: firmSnap.data(),
    clients: await fetchCollection(firmId, 'clients'),
    matters: await fetchCollection(firmId, 'matters'),
    agents: await fetchCollection(firmId, 'agents'),
    billableActivities: await fetchCollection(firmId, 'billableActivities'),
    knowledgeBase: await fetchCollection(firmId, 'knowledgeBase')
  };

  writeFileSync(outFile, JSON.stringify(exportData, null, 2));
  console.log(`✅ Firm exported successfully to ${outFile} (${Object.keys(exportData).length} tree nodes)`);
}

async function importFirm(firmId, inFile) {
  console.log(`\n⏳ Importing firm data into: ${firmId}`);
  
  let rawData;
  try {
    rawData = readFileSync(inFile, 'utf8');
  } catch(e) {
    console.error(`❌ Could not read file ${inFile}`);
    process.exit(1);
  }

  const data = JSON.parse(rawData);

  // Write base firm config
  if (data.firmConfig) {
      await setDoc(doc(db, 'firms', firmId), data.firmConfig, { merge: true });
      console.log(`✅ Firm Config restored.`);
  }

  const subCollections = ['clients', 'matters', 'agents', 'billableActivities', 'knowledgeBase'];
  
  for (const subcol of subCollections) {
    if (data[subcol] && data[subcol].length > 0) {
      const items = data[subcol];
      // Use batch writing
      const batch = writeBatch(db);
      for (const item of items) {
        const id = item.id;
        const itemData = { ...item };
        delete itemData.id; // Don't write id into document fields
        
        const docRef = doc(db, 'firms', firmId, subcol, id);
        batch.set(docRef, itemData, { merge: true });
      }
      await batch.commit();
      console.log(`✅ Restored ${items.length} records to ${subcol}`);
    }
  }

  console.log(`🎉 Import completed for firm: ${firmId}`);
}

async function main() {
  const args = process.argv.slice(2);
  const actionObj = args.indexOf('--action');
  const firmIdObj = args.indexOf('--firmId');
  const fileObj = args.indexOf('--file');

  if (actionObj === -1 || firmIdObj === -1 || fileObj === -1) {
    console.log(`
NemoC LAW AI - IT Migration Tool
Usage:
  node firm_migration_tool.mjs --action [export|import] --firmId <firm_id> --file <path_to_json>
    `);
    process.exit(1);
  }

  const action = args[actionObj + 1];
  const firmId = args[firmIdObj + 1];
  const file = args[fileObj + 1];

  try {
    if (action === 'export') {
      await exportFirm(firmId, file);
    } else if (action === 'import') {
      await importFirm(firmId, file);
    } else {
      console.error(`❌ Action must be either 'export' or 'import'`);
    }
  } catch(err) {
    console.error('Migration failed:', err);
  }
  process.exit(0);
}

main();
