/**
 * Quick test: Write a test email to Firestore 'mail' collection.
 * This triggers the processMailQueue Cloud Function.
 * 
 * Usage: node scripts/test-email.mjs
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAUVqd_aKlqSqk-vI4Agdv3HrswyyoAqgo",
  authDomain: "nemoc-law-ai.firebaseapp.com",
  projectId: "nemoc-law-ai",
  storageBucket: "nemoc-law-ai.firebasestorage.app",
  messagingSenderId: "1053452266223",
  appId: "1:1053452266223:web:579d49368a2a076dc9091a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const TEST_EMAIL = 'peterkilaba@gmail.com';

async function sendTestEmail() {
  console.log(`Sending test email to ${TEST_EMAIL}...`);
  
  const mailDoc = {
    to: TEST_EMAIL,
    message: {
      subject: '✅ NemoC LAW AI — Email System Test',
      html: `
        <div style="font-family:sans-serif; background:#0a0e17; color:#fff; padding:40px;">
          <div style="max-width:500px; margin:0 auto; background:#111827; border-radius:16px; padding:32px; border:1px solid rgba(255,255,255,0.08);">
            <h1 style="color:#76b900; font-size:24px;">✅ Email System Working!</h1>
            <p style="color:rgba(255,255,255,0.65); line-height:1.7;">
              This is a test email from <strong style="color:#fff">NemoC LAW AI</strong>. 
              If you received this, the SendGrid integration via Firebase Cloud Functions is working correctly.
            </p>
            <p style="color:rgba(255,255,255,0.4); font-size:12px; margin-top:24px;">
              Sent at: ${new Date().toISOString()}<br/>
              Via: processMailQueue Cloud Function → SendGrid
            </p>
          </div>
        </div>`,
      text: `NemoC LAW AI - Email System Test\n\nThis is a test email. If you received this, the SendGrid integration is working correctly.\n\nSent at: ${new Date().toISOString()}`,
    },
    status: 'queued',
    createdAt: serverTimestamp(),
  };

  try {
    const ref = await addDoc(collection(db, 'mail'), mailDoc);
    console.log(`✅ Mail doc created: ${ref.id}`);
    console.log(`Waiting for Cloud Function to process...`);
    console.log(`Check your inbox at ${TEST_EMAIL} in 30-60 seconds.`);
    console.log(`Also check Firebase Console > Firestore > mail > ${ref.id} for status update.`);
    
    // Wait a moment then exit
    setTimeout(() => process.exit(0), 3000);
  } catch (err) {
    console.error('❌ Failed:', err.message);
    process.exit(1);
  }
}

sendTestEmail();
