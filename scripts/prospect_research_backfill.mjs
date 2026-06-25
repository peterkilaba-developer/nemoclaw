import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDocs, updateDoc, query, where, serverTimestamp, addDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';
import crypto from 'crypto';

// 1. Load Environment Configuration
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

// 2. Helper Components
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getEnrichedEmail(domain) {
    const hunterKey = env.HUNTER_API_KEY || env.VITE_HUNTER_API_KEY;
    if (!hunterKey) return null;
    try {
        const res = await fetch(`https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${hunterKey}`);
        const data = await res.json();
        if (data.data && data.data.emails && data.data.emails.length > 0) {
             console.log(`   ✅ Resolved: ${data.data.emails[0].value}`);
             return data.data.emails[0].value;
        }
    } catch(e) {
        console.warn(`   ⚠️ Hunter API failure for ${domain}:`, e.message);
    }
    return null;
}

const TEMPLATE_HTML = (firm, claimUrl) => `
<div style="font-family: Arial, sans-serif; font-size: 15px; color: #111;">
  <h2 style="color: #1a365d;">Your Pre-Provisioned Agentic OS</h2>
  <p>Hi Managing Partner,</p>
  <p>We've fully architected and legally locked an NVIDIA-powered NemoClaw instance specifically for <strong>${firm.name || firm.firmName}</strong>.</p>
  <p>Our Chief Executive Agent discovered your practice in ${firm.location} and pre-populated your shadow environment.</p>
  <div style="margin: 24px 0; background: #f8fafc; border-left: 4px solid #76b900; padding: 16px;">
    <p style="margin: 0;"><strong>Architecture Secure:</strong> Dedicated tenant isolation initialized.</p>
  </div>
  <a href="${claimUrl}" style="display:inline-block; padding: 12px 24px; background: #76b900; color: #111; text-decoration: none; font-weight: bold; border-radius: 4px;">Claim Your Sandbox Here</a>
  <br/><br/><br/>
  <hr style="border: none; border-top: 1px solid #eee; margin-bottom: 20px;"/>
  <p style="font-size: 11px; color: #666; font-family: monospace;">
     NemoC LAW AI HQ<br/>
     123 Agentic Way, Tech Valley<br/>
     You're receiving this because we identified ${firm.name || firm.firmName} as a leading firm in the area. 
     <a href="https://nemoc-law.ai/opt-out" style="color: #666;">Unsubscribe</a> from legal-tech updates.
  </p>
</div>
`;

// 3. Main Execution
async function runBackfill() {
    console.log("🚀 [C.R.A. Backfill] Synchronizing lead list...");
    
    // Fetch prospects needing research
    const q = query(collection(db, 'prospects'), where('status', '==', 'researched'));
    const snap = await getDocs(q);
    const prospects = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    console.log(`📊 Found ${prospects.length} targets for comprehensive research.`);
    
    let processed = 0;
    let provisionedCount = 0;

    for (let prospect of prospects) {
        processed++;
        const name = prospect.firmName || prospect.name || 'Unknown Firm';
        const website = prospect.website || '';
        
        console.log(`\n[${processed}/${prospects.length}] Processing: ${name}`);

        if (!website) {
            console.log(`   ⏭️ Skipped: No website available.`);
            continue;
        }

        const domain = website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
        let email = prospect.email || null;

        // Stage 1: Research / Enrichment
        if (!email) {
            console.log(`   🔎 Researching domain: ${domain}...`);
            email = await getEnrichedEmail(domain);
            // Throttle to respect Hunter rates (1.5s interval)
            await sleep(1500);
        }

        if (!email) {
            console.log(`   ⏭️ Skipped: No email found.`);
            continue;
        }

        // Stage 2: Provisioning
        const claimToken = crypto.randomUUID();
        const firmRef = doc(collection(db, 'firms'));
        const sandboxFirmId = firmRef.id;

        console.log(`   🏗️  Provisioning Shadow Sandbox [${sandboxFirmId}]...`);
        
        // A. Create shadow firm doc
        await setDoc(firmRef, {
            status: 'sandbox_unclaimed',
            firmName: name,
            firmAddress: prospect.location || prospect.address || '',
            firmWebsite: website,
            unclaimedEmail: email,
            claimToken: claimToken,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            source: 'backfill-research'
        });

        // B. Provision Knowledge Base
        const kbContent = `Firm Name: ${name}\nLocation: ${prospect.location || ''}\nPhone: ${prospect.phone || ''}\nWebsite: ${website}\nResearch Date: ${new Date().toISOString()}\n`;
        await setDoc(doc(db, 'firms', sandboxFirmId, 'knowledgeBase', 'public_profile_initial'), {
            fileName: 'public_profile_initial',
            fileSize: `${kbContent.length} bytes`,
            fileType: 'text/plain',
            content: kbContent,
            uploadedAt: serverTimestamp()
        });

        // C. Update Prospect Status
        await updateDoc(doc(db, 'prospects', prospect.id), {
            status: 'provisioned',
            email: email,
            sandboxFirmId: sandboxFirmId,
            claimToken: claimToken,
            updatedAt: serverTimestamp()
        });

        // Stage 3: Outreach Queuing (Deferred for Nightly Dispatcher)
        const SITE_URL = 'https://nemoc-law-ai.web.app';
        const claimUrl = `${SITE_URL}/claim?firmId=${encodeURIComponent(sandboxFirmId)}&token=${encodeURIComponent(claimToken)}&email=${encodeURIComponent(email)}`;
        
        await addDoc(collection(db, 'mail'), {
            to: email,
            message: {
                subject: `[Agentic OS Ready] ${name}`,
                html: TEMPLATE_HTML(prospect, claimUrl)
            },
            purpose: 'unclaimed_outreach',
            status: 'deferred',
            prospectId: prospect.id,
            createdAt: serverTimestamp()
        });

        provisionedCount++;
        console.log(`   ✅ Pipeline Secure: Sandboxed and Queued for Dispatcher.`);
    }

    // 4. Audit Reporting
    await addDoc(collection(db, '_internalAuditLog'), {
        agentId: 'cra-hunter',
        department: 'gtm',
        type: 'internal_agent_action',
        userMessage: 'Comprehensive Lead Backfill',
        agentResponse: `Backfill synchronized. Found ${prospects.length} targets. Successfully provisioned ${provisionedCount} sandboxes and queued outreach emails for nightly dispatch.`,
        contextProvided: true,
        timestamp: serverTimestamp(),
        immutable: true
    });

    console.log(`\n🎉 [Mission Complete] Provisioned ${provisionedCount} firms. Outreach queued.`);
}

runBackfill().catch(err => {
    console.error("❌ Backfill critical failure:", err);
    process.exit(1);
});
