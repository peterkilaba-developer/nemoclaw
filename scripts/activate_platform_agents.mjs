import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, addDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { readFileSync } from 'fs';
import crypto from 'crypto';
import { INTERNAL_AGENT_REGISTRY } from '../src/lib/internalAgentRegistry.js';

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

const DAEMON_ID = 'nemoclaw-system-daemon-xyz';

const AGENT_ACTIONS = {
  cea: 'Synthesized executive metric roll-up and agent accountability.',
  coa: 'Synchronized cross-departmental operating queues.',
  cfa: 'Verified billing, cash-flow, and revenue-quality signals.',
  cta: 'Reviewed deploy, build, and inference routing health.',
  cma: 'Prepared brand, content, and demand-generation actions.',
  cra: 'Ran autonomous pipeline discovery and outreach readiness.',
  cpa: 'Triaged product feedback, QA signals, and roadmap risk.',
  csa: 'Reviewed security posture, rules, and external egress risk.',
  csoa: 'Checked onboarding health and client-success interventions.',
  cca: 'Reviewed enablement rhythm and internal operating culture.',
  cia: 'Verified sandbox provisioning and infrastructure capacity.',
  cla: 'Checked legal, compliance, and policy alignment.',
  cosa: 'Consolidated blockers, follow-ups, and executive decisions.',
};

const INTERNAL_AGENTS = Object.fromEntries(
  INTERNAL_AGENT_REGISTRY.map((agent) => [
    agent.id,
    {
      name: agent.abbr,
      department: agent.department,
      action: AGENT_ACTIONS[agent.id] || agent.lastAction,
    },
  ])
);

const US_STATES_ALPHA = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia",
  "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
  "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey",
  "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina",
  "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
];

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
             return data.data.emails[0].value;
        }
    } catch(_e) { /* intentionally ignored */ }
    return null;
}

const TEMPLATE_HTML = (firm, claimUrl) => `
<div style="font-family: Arial, sans-serif; font-size: 15px; color: #111;">
  <h2 style="color: #1a365d;">Your Pre-Provisioned Agentic OS</h2>
  <p>Hi Managing Partner,</p>
  <p>We've fully architected and legally locked an NVIDIA-powered NemoClaw instance specifically for <strong>${firm.name}</strong>.</p>
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
     You're receiving this because we identified ${firm.name} as a leading firm in the area. 
     <a href="https://nemoc-law.ai/opt-out" style="color: #666;">Unsubscribe</a> from legal-tech updates.
  </p>
</div>
`;

async function executeAutonomousSDRBlitz() {
    console.log("📍 [SDR Agent] Initializing Autonomous State Blitz...");
    const stateRef = doc(db, '_internalStrategicPlans', 'sdrDaemonState');
    
    let currentIndex = 0;
    let dailyEmailsQueued = 0;
    let lastResetDate = new Date().toISOString().split('T')[0];

    try {
        const stateDoc = await getDoc(stateRef);
        if (stateDoc.exists()) {
            const data = stateDoc.data();
            currentIndex = typeof data.stateIndex === 'number' ? data.stateIndex % US_STATES_ALPHA.length : 0;
            const todayStr = new Date().toISOString().split('T')[0];
            
            if (data.lastResetDate === todayStr) {
                dailyEmailsQueued = data.dailyEmailsQueued || 0;
                lastResetDate = todayStr;
            } else {
                dailyEmailsQueued = 0; // It's a new day!
                lastResetDate = todayStr;
            }
        }
    } catch (_e) { /* intentionally ignored */ }

    const targetState = US_STATES_ALPHA[currentIndex];
    console.log(`📍 [SDR Agent] Targeting: ${targetState} (Daily SDR Progress: ${dailyEmailsQueued}/100)`);

    // Update cursor
    await setDoc(stateRef, { 
      stateIndex: currentIndex + 1, 
      dailyEmailsQueued, 
      lastResetDate 
    }, { merge: true });

    if (!env.VITE_GOOGLE_MAPS_API_KEY) {
         console.warn("⚠️ API Key missing. Skipping SDR execution.");
         return;
    }

    try {
        const queryInfo = `Law firm in ${targetState}`;
        const res = await fetch(`https://places.googleapis.com/v1/places:searchText`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': env.VITE_GOOGLE_MAPS_API_KEY,
                'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.websiteUri,places.nationalPhoneNumber,places.editorialSummary'
            },
            body: JSON.stringify({ textQuery: queryInfo, pageSize: 8 }) // Keeping chunks small for autonomous pacing
        });
        const data = await res.json();
        
        if (!data.places) {
            console.log("⚠️ [SDR Agent] No places returned for state:", targetState);
            return;
        }

        for (let place of data.places) {
            const name = place.displayName?.text || 'Unknown Firm';
            const location = place.formattedAddress || targetState;
            const phone = place.nationalPhoneNumber || '';
            let website = place.websiteUri || '';
            const summary = place.editorialSummary?.text || 'No public summary available.';
            
            console.log(`🔎 [SDR Agent] Found: ${name}`);

            let email = null;
            if (website) {
                try {
                   const domain = new URL(website).hostname.replace('www.', '');
                   email = await getEnrichedEmail(domain);
                } catch(_e) { /* intentionally ignored */ }
            }

            // Provision Shadow Organization exactly like force_test flow
            let claimToken = null;
            let sandboxFirmId = null;
            
            if (email) {
                claimToken = crypto.randomUUID();
                const firmRef = doc(collection(db, 'firms'));
                sandboxFirmId = firmRef.id;

                // 1. Create Firm Object
                await setDoc(firmRef, {
                    status: 'sandbox_unclaimed', 
                    firmName: name, 
                    firmAddress: location,
                    firmWebsite: website,
                    unclaimedEmail: email, 
                    claimToken: claimToken, 
                    createdAt: serverTimestamp(), 
                    updatedAt: serverTimestamp(),
                });

                // 2. Provision Default Public Domain KB Docs
                const kbContent = `Firm Name: ${name}\nLocation: ${location}\nPhone: ${phone}\nWebsite: ${website}\nPublic AI Summary: ${summary}\n`;
                await setDoc(doc(db, 'firms', sandboxFirmId, 'knowledgeBase', 'public_profile_initial'), {
                  fileName: 'public_profile_initial',
                  fileSize: `${kbContent.length} bytes`,
                  fileType: 'text/plain',
                  content: kbContent,
                  uploadedAt: serverTimestamp()
                });
                
                console.log(`🏗️  [SDR Agent] Provisioned Shadow Sandbox for: ${name}`);
            }

            const prospectData = {
                name, location, phone, website,
                source: 'daemon-blitz',
                email: email || '',
                status: email ? 'provisioned' : 'researched',
                sandboxFirmId: sandboxFirmId,
                claimToken: claimToken,
                createdAt: serverTimestamp(),
            };

            const pRef = await addDoc(collection(db, 'prospects'), prospectData);

            if (email) {
                const SITE_URL = 'https://nemoc-law-ai.web.app';
                const claimUrl = `${SITE_URL}/claim?firmId=${encodeURIComponent(sandboxFirmId)}&token=${encodeURIComponent(claimToken)}&email=${encodeURIComponent(email)}`;
                
                let outMailStatus = 'queued';
                
                // --- LIMIT ENFORCEMENT logic ---
                dailyEmailsQueued++; 
                if (dailyEmailsQueued > 100) {
                    outMailStatus = 'deferred';
                    console.log(`⚠️ [SDR Agent] Daily cap reached! Deflecting to nightly deferral queue.`);
                } else {
                    console.log(`✅ [SDR Agent] Enriched Email: ${email}. Queuing CAN-SPAM Outreach.`);
                }

                await addDoc(collection(db, 'mail'), {
                     to: email,
                     message: {
                         subject: `[Agentic OS Ready] ${name}`,
                         html: TEMPLATE_HTML(prospectData, claimUrl)
                     },
                     purpose: 'unclaimed_outreach',
                     status: outMailStatus,
                     prospectId: pRef.id,
                     createdAt: serverTimestamp()
                });

                // Update cursor count!
                await setDoc(stateRef, { dailyEmailsQueued }, { merge: true });
            } else {
                console.log(`⏭️ [SDR Agent] Walked: No email resolved for ${name}. Skipped outreach.`);
            }
        }
    } catch (e) {
         console.error('SDR API Error:', e.message);
    }
}


const DAEMON_INTERVAL_MS = 60000;

async function startAutonomousAgentLoop() {
  console.log(`\n🚀 [NemoC LAW AI] Starting Autonomous Platform Agents Daemon...`);
  console.log(`SDR loop cadence: ${DAEMON_INTERVAL_MS / 1000} seconds.`);
  console.log(`Daemon writer id: ${DAEMON_ID}`);
  console.log(`${Object.keys(INTERNAL_AGENTS).length} canonical agents loaded. No synthetic heartbeat data will be written.\n`);

  while(true) {
      await sleep(DAEMON_INTERVAL_MS);
      await executeAutonomousSDRBlitz();
  }
}

startAutonomousAgentLoop().catch(console.error);
