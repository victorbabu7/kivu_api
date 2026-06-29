require('dotenv').config();
const { db } = require('./config/firebase');
const fs = require('fs');

const collections = [
    'kivu-admins',
    'kivu-artistes', 
    'kivu-artistes-comptes',
    'kivu-messages',
    'kivu-news',
    'kivu-oeuvres'
];

async function exportAll() {
    const data = {};
    for (const col of collections) {
        const snapshot = await db.collection(col).get();
        data[col] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`✅ ${col}: ${data[col].length} documents`);
    }
    fs.writeFileSync('firebase-export.json', JSON.stringify(data, null, 2));
    console.log('✅ Export terminé → firebase-export.json');
    process.exit(0);
}

exportAll().catch(e => {
    console.error('Erreur:', e);
    process.exit(1);
});
