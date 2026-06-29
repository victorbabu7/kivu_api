// ══════════════════════════════════════════
// CONFIG FIREBASE ADMIN SDK
// ══════════════════════════════════════════
// L'Admin SDK a TOUS les droits sur Firestore, peu importe les règles
// de sécurité (security rules). C'est pour ça qu'il ne doit JAMAIS être
// utilisé côté frontend — seulement ici, sur le serveur.

const admin = require('firebase-admin');

function initFirebase() {
    if (admin.apps.length > 0) return admin.app();

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  
    const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error(
            'Variables Firebase manquantes. Vérifie FIREBASE_PROJECT_ID, ' +
            'FIREBASE_CLIENT_EMAIL et FIREBASE_PRIVATE_KEY dans ton .env / Render.'
        );
    }

    return admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey })
    });
}

const app = initFirebase();
const db = admin.firestore();

module.exports = { admin, db };
