const admin = require('firebase-admin');

// Ensure we don't initialize twice if this script is run multiple times
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'nemoc-law-ai'
    });
}

const firestore = admin.firestore();

async function flushResearched() {
    console.log("Locating 'researched' prospects...");
    const snapshot = await firestore.collection('prospects')
        .where('status', '==', 'researched')
        .get();

    if (snapshot.empty) {
        console.log("No prospects found in 'researched' state.");
        return;
    }

    console.log(`Found ${snapshot.size} prospects. Enqueueing them for outreach...`);

    let processedCount = 0;

    for (const doc of snapshot.docs) {
        const prospect = doc.data();
        const prospectId = doc.id;
        const firmName = prospect.firmName || prospect.name || 'Law Firm Partner';
        const enrichedEmail = prospect.email;

        if (!enrichedEmail) {
            console.log(`Skipping prospect ${prospectId} - No email found.`);
            continue;
        }

        // We use the exact same template the autonomous orchestrator uses
        const decisionMakerName = 'Managing Partner';
        
        const emailHtml = `
          <div style="font-family: sans-serif; font-size: 15px; color: #111;">
            <p>Hi ${decisionMakerName},</p>
            <p>I'm Peter Kilaba, Founder of <strong>NemoC LAW AI</strong>.</p>
            <p>We analyzed <strong>${firmName}</strong> and discovered a fundamental inefficiency in how traditional firms scale.</p>
            <p>Autonomous AI isn't just a gimmick, it's malpractice waiting to happen. The winning model is <strong>Agentic HITL</strong> (Human-in-the-Loop)—upgraded, not replaced.</p>
            <p>I deployed my Chief Executive Agent to organically find your firm today. It executed this research, validated your practice, and pushed this outreach perfectly with zero human intervention.</p>
            <p>You can equip your entire staff with perfectly architected AI paralegals starting at $297/mo.</p>
            <p><strong><a href="https://nemoc-law.ai/login" style="color: #76b900; font-weight: bold; text-decoration: none;">Click here to claim your firm's Agentic OS workspace & start onboarding immediately.</a></strong></p>
            <br/>
            <p>Best regards,<br/>Peter Kilaba<br/>Founder, NemoC LAW AI</p>
            <p style="font-size: 11px; color: #999; margin-top: 24px; border-top: 1px solid #eee; padding-top: 12px;">
              NemoC LAW AI &middot; 609 7th St NW, Nora Springs, IA 50458<br/>
              <a href="https://nemoc-law.ai" style="color: #999;">nemoc-law.ai</a> &middot;
              If you no longer wish to receive these emails, simply reply with "unsubscribe".
            </p>
          </div>
        `;

        // 1. Queue mail
        await firestore.collection('mail').add({
            to: enrichedEmail,
            message: {
                subject: `${firmName} — Autonomous Infrastructure (NemoC LAW AI)`,
                html: emailHtml
            },
            prospectId: prospectId,
            status: 'queued',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // 2. Update status to match orchestrator flow
        await firestore.collection('prospects').doc(prospectId).update({
            status: 'outreach_sent',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        processedCount++;
        console.log(`Queued email for: ${firmName} (${enrichedEmail})`);
    }

    console.log(`\nSuccessfully processed ${processedCount} prospects.`);
}

flushResearched().catch(console.error).finally(() => process.exit(0));
