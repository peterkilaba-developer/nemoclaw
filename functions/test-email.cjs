/**
 * Test Email Script — Writes to the 'mail' Firestore collection.
 * The processMailQueue Cloud Function will pick it up and send via SendGrid.
 *
 * Usage: node scripts/test-email.js <recipient-email>
 * Example: node scripts/test-email.js peter@nemoc-law.ai
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

// Initialize Firebase Admin (uses default credentials or service account)
const app = initializeApp({ projectId: 'nemoc-law-ai' });
const db = getFirestore(app);

const recipientEmail = process.argv[2];

if (!recipientEmail) {
  console.error('❌ Usage: node scripts/test-email.js <recipient-email>');
  console.error('   Example: node scripts/test-email.js peter@nemoc-law.ai');
  process.exit(1);
}

async function sendTestEmail() {
  console.log(`\n📧 Sending test email to: ${recipientEmail}`);
  console.log('   Writing to Firestore "mail" collection...\n');

  const mailDoc = {
    to: recipientEmail,
    message: {
      subject: '✅ NemoClaw AI — Email System Test',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Inter', -apple-system, sans-serif; background: #0a0e17; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 24px; }
    .card { background: #111827; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 40px 32px; }
    .logo { color: #76b900; font-size: 24px; font-weight: 800; margin-bottom: 8px; }
    .tagline { color: rgba(255,255,255,0.4); font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 32px; }
    h1 { color: #fff; font-size: 24px; font-weight: 800; margin: 0 0 16px; }
    h1 span { color: #76b900; }
    p { color: rgba(255,255,255,0.65); font-size: 14px; line-height: 1.7; margin: 0 0 16px; }
    .success { background: rgba(22,163,106,0.1); border: 1px solid rgba(22,163,106,0.3); border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center; }
    .success-icon { font-size: 48px; margin-bottom: 12px; }
    .success-text { color: #16a34a; font-size: 18px; font-weight: 700; }
    .footer { text-align: center; padding: 24px 0; color: rgba(255,255,255,0.2); font-size: 11px; }
    .footer a { color: rgba(255,255,255,0.3); text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">NemoClaw AI</div>
      <div class="tagline">Agentic as a Service for Lawyers</div>

      <h1>Email System <span>Verified</span> ✅</h1>

      <div class="success">
        <div class="success-icon">🎉</div>
        <div class="success-text">Your email pipeline is working!</div>
      </div>

      <p>This is a test email sent through the NemoClaw AI email infrastructure:</p>

      <p style="font-size:12px; color:rgba(255,255,255,0.4);">
        <strong style="color:rgba(255,255,255,0.6);">Pipeline:</strong><br/>
        1. ✅ Firestore "mail" collection write<br/>
        2. ✅ processMailQueue Cloud Function triggered<br/>
        3. ✅ SendGrid API call executed<br/>
        4. ✅ Email delivered to ${recipientEmail}<br/>
        <br/>
        <strong style="color:rgba(255,255,255,0.6);">Sent at:</strong> ${new Date().toISOString()}<br/>
        <strong style="color:rgba(255,255,255,0.6);">From:</strong> outreach@nemoc-law.ai
      </p>
    </div>

    <div class="footer">
      <p>NemoClaw AI · Agentic as a Service for Lawyers</p>
      <p>Secured by NVIDIA NemoClaw</p>
      <p><a href="https://nemoc-law.ai">nemoc-law.ai</a></p>
    </div>
  </div>
</body>
</html>`,
      text: `NemoClaw AI — Email System Test\n\nThis is a test email confirming your email pipeline is working.\n\nPipeline: Firestore → Cloud Function → SendGrid → ${recipientEmail}\n\nSent at: ${new Date().toISOString()}\nFrom: outreach@nemoc-law.ai`,
    },
    status: 'queued',
    type: 'test',
    createdAt: FieldValue.serverTimestamp(),
  };

  try {
    const ref = await db.collection('mail').add(mailDoc);
    console.log(`✅ Mail document created: ${ref.id}`);
    console.log('   The processMailQueue Cloud Function should pick this up within seconds.');
    console.log(`\n   Check delivery at: https://console.firebase.google.com/project/nemoc-law-ai/firestore/databases/-default-/data/~2Fmail~2F${ref.id}`);
    console.log('\n   Check Cloud Function logs: npx firebase functions:log --only processMailQueue\n');
  } catch (err) {
    console.error('❌ Failed to write to Firestore:', err.message);
    process.exit(1);
  }
}

sendTestEmail().then(() => process.exit(0));
