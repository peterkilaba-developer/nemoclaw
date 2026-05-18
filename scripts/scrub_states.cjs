const path = require('path');
const admin = require(path.resolve(__dirname, '../functions/node_modules/firebase-admin'));

async function scrubStates() {
    admin.initializeApp({ projectId: 'nemoc-law-ai' });
    const db = admin.firestore();

    console.log('🚀 Starting State Scrubber...');

    const collections = ['prospects', 'firms'];
    let totalUpdated = 0;

    for (const collName of collections) {
        const snap = await db.collection(collName).get();
        console.log(`Processing ${collName} (${snap.size} docs)...`);

        for (const d of snap.docs) {
            const data = d.data();
            const location = data.location || data.firmAddress || '';
            
            if (location && !data.stateBar) {
                // Extract state (e.g. "San Diego, CA" or "Nashville, TN 37203")
                const match = location.match(/,\s*([A-Z]{2})(\s+\d{5})?/);
                const state = match ? match[1] : null;

                if (state) {
                    await d.ref.update({ stateBar: state });
                    totalUpdated++;
                }
            }
        }
    }

    console.log(`✅ Scrub complete. Updated ${totalUpdated} records.`);
    process.exit(0);
}

scrubStates().catch(console.error);
