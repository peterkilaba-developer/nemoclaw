const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

// Load service account securely
let serviceAccount;
try {
  serviceAccount = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'functions', 'debug_sub.json'), 'utf-8')
  );
  console.log("Found custom service account file.");
} catch (e) {
  console.log("Could not find debug_sub.json. Relying on default.");
}

if (!process.env.FIREBASE_CONFIG && serviceAccount) {
  initializeApp({
    credential: cert(serviceAccount),
    projectId: "nemoc-law-ai"
  });
} else if (serviceAccount) {
  initializeApp({
    credential: cert(serviceAccount),
    projectId: "nemoc-law-ai"
  });
} else {
  initializeApp({ projectId: "nemoc-law-ai" });
}

const db = getFirestore();

async function seed() {
  const qnaData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src', 'data', 'qna_seed.json'), 'utf-8'));
  for (const item of qnaData) {
    await db.collection('_publicQnA').doc(item.slug).set({
      question: item.question,
      answer: item.answer,
      slug: item.slug,
      category: item.category,
      createdAt: FieldValue.serverTimestamp()
    });
    console.log(`Seeded: ${item.slug}`);
  }
}

seed().then(() => console.log('Done')).catch(console.error);
