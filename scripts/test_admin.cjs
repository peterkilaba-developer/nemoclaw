const admin = require('firebase-admin');

try {
    admin.initializeApp({
        projectId: 'nemoc-law-ai'
    });
    const db = admin.firestore();
    db.collection('prospects').limit(1).get()
        .then(snap => {
            console.log('✅ Connection Successful. Found:', snap.size);
            process.exit(0);
        })
        .catch(err => {
            console.error('❌ Connection Failed:', err.message);
            process.exit(1);
        });
} catch (e) {
    console.error('❌ Initialization Failed:', e.message);
    process.exit(1);
}
