// ══════════════════════════════════════════
// ROUTES AUTH — login unifié, inscription, récupération mdp
// ══════════════════════════════════════════
const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { hashSimple } = require('../utils/hash');
const { creerToken } = require('../utils/jwt');

const COL_ADMINS = 'kivu-admins';
const COL_COMPTES_ARTISTES = 'kivu-artistes-comptes';

// Crée le super admin par défaut si la collection admins est vide.
// Appelé une fois au démarrage du serveur (voir server.js).
async function creerSuperAdminSiAbsent() {
    const snap = await db.collection(COL_ADMINS).get();
    if (!snap.empty) return;
    await db.collection(COL_ADMINS).add({
        nom: 'Super Admin',
        email: 'adminhubkivu@gmail.com',
        username: 'superadmin',
        motDePasse: hashSimple('Rubona2003@'),
        motSecurite: hashSimple('Bukavu'),
        role: 'super',
        dateCreation: new Date().toLocaleDateString('fr-FR')
    });
    console.log('✅ Super admin créé par défaut.');
}

// POST /api/auth/login
// Body: { identifiant, motDePasse }
// Cherche d'abord dans les admins, puis dans les comptes artistes.
router.post('/login', async (req, res) => {
    const identifiant = (req.body.identifiant || '').trim().toLowerCase();
    const motDePasse = req.body.motDePasse || '';

    if (!identifiant || !motDePasse) {
        return res.status(400).json({ erreur: 'Remplissez tous les champs.' });
    }

    try {
        // 1. Chercher dans les admins (email OU username)
        const snapAdmins = await db.collection(COL_ADMINS).get();
        let admin = null;
        snapAdmins.forEach(doc => {
            const a = doc.data();
            const emailMatch = (a.email || '').toLowerCase() === identifiant;
            const usernameMatch = (a.username || '').toLowerCase() === identifiant;
            const passMatch = a.motDePasse === hashSimple(motDePasse);
            if ((emailMatch || usernameMatch) && passMatch) admin = { id: doc.id, ...a };
        });

        if (admin) {
            const token = creerToken({ id: admin.id, type: 'admin', role: admin.role });
            return res.json({
                token,
                type: 'admin',
                profil: { id: admin.id, nom: admin.nom, role: admin.role, email: admin.email }
            });
        }

        // 2. Chercher dans les comptes artistes (email uniquement)
        const snapArtistes = await db.collection(COL_COMPTES_ARTISTES).get();
        let artiste = null;
        snapArtistes.forEach(doc => {
            const a = doc.data();
            if ((a.email || '') === identifiant && a.motDePasse === hashSimple(motDePasse)) {
                artiste = { id: doc.id, ...a };
            }
        });

        if (artiste) {
            if (artiste.statut !== 'approuve') {
                return res.status(403).json({
                    erreur: "⏳ Votre compte est en attente d'approbation par l'administrateur."
                });
            }
            const token = creerToken({ id: artiste.id, type: 'artiste', role: 'artiste' });
            return res.json({
                token,
                type: 'artiste',
                profil: { id: artiste.id, nom: artiste.nomArtiste || (artiste.prenom + ' ' + artiste.nom) }
            });
        }

        // 3. Rien trouvé
        return res.status(401).json({ erreur: 'Email/username ou mot de passe incorrect.' });

    } catch (e) {
        console.error('Erreur login:', e);
        return res.status(500).json({ erreur: 'Erreur serveur : ' + e.message });
    }
});

// POST /api/auth/inscription
// Body: { prenom, nom, email, tel, naiss, adresse, filiere, description, motDePasse }
router.post('/inscription', async (req, res) => {
    const { prenom, nom, tel, naiss, adresse, filiere, description, motDePasse } = req.body;
    const email = (req.body.email || '').trim().toLowerCase();

    if (!prenom || !nom || !email || !tel || !naiss || !adresse || !filiere || !description || !motDePasse) {
        return res.status(400).json({ erreur: 'Tous les champs obligatoires doivent être remplis.' });
    }
    if (motDePasse.length < 6) {
        return res.status(400).json({ erreur: 'Mot de passe trop court (min. 6 caractères).' });
    }

    try {
        const snap = await db.collection(COL_COMPTES_ARTISTES).get();
        let doublon = false;
        snap.forEach(doc => { if ((doc.data().email || '') === email) doublon = true; });
        if (doublon) {
            return res.status(409).json({ erreur: 'Cet email est déjà utilisé.' });
        }

        await db.collection(COL_COMPTES_ARTISTES).add({
            prenom, nom, email, tel, naiss, adresse, filiere, description,
            motDePasse: hashSimple(motDePasse),
            statut: 'en_attente',
            profilPublie: false,
            dateInscription: new Date().toLocaleDateString('fr-FR')
        });

        return res.json({ ok: true, message: 'Demande envoyée, en attente d\'approbation.' });
    } catch (e) {
        console.error('Erreur inscription:', e);
        return res.status(500).json({ erreur: 'Erreur serveur : ' + e.message });
    }
});

// POST /api/auth/verifier-recuperation
// Body: { email, motSecurite } -> vérifie l'identité avant reset
router.post('/verifier-recuperation', async (req, res) => {
    const email = (req.body.email || '').trim().toLowerCase();
    const motSecurite = req.body.motSecurite || '';

    if (!email || !motSecurite) {
        return res.status(400).json({ erreur: 'Remplissez email et mot de sécurité.' });
    }

    try {
        let trouve = null;
        let type = null;

        const snapA = await db.collection(COL_ADMINS).get();
        snapA.forEach(doc => {
            const a = doc.data();
            if ((a.email || '').toLowerCase() === email && a.motSecurite === hashSimple(motSecurite)) {
                trouve = { id: doc.id };
                type = 'admin';
            }
        });

        if (!trouve) {
            const snapE = await db.collection(COL_COMPTES_ARTISTES).get();
            snapE.forEach(doc => {
                const a = doc.data();
                if ((a.email || '').toLowerCase() === email && a.motSecurite === hashSimple(motSecurite)) {
                    trouve = { id: doc.id };
                    type = 'artiste';
                }
            });
        }

        if (!trouve) {
            return res.status(401).json({ erreur: 'Email ou mot de sécurité incorrect.' });
        }

        // Token courte durée juste pour autoriser le reset qui suit
        const resetToken = creerToken({ id: trouve.id, type: 'reset', resetType: type });
        return res.json({ ok: true, resetToken, type });
    } catch (e) {
        console.error('Erreur verif récupération:', e);
        return res.status(500).json({ erreur: 'Erreur serveur : ' + e.message });
    }
});

// POST /api/auth/reinitialiser-mot-de-passe
// Body: { resetToken, nouveauMotDePasse }
router.post('/reinitialiser-mot-de-passe', async (req, res) => {
    const { resetToken, nouveauMotDePasse } = req.body;
    const { verifierToken } = require('../utils/jwt');

    if (!resetToken || !nouveauMotDePasse || nouveauMotDePasse.length < 6) {
        return res.status(400).json({ erreur: 'Mot de passe trop court (min. 6 caractères).' });
    }

    try {
        const decoded = verifierToken(resetToken);
        if (decoded.type !== 'reset') {
            return res.status(400).json({ erreur: 'Token de réinitialisation invalide.' });
        }
        const collection = decoded.resetType === 'admin' ? COL_ADMINS : COL_COMPTES_ARTISTES;
        await db.collection(collection).doc(decoded.id).update({
            motDePasse: hashSimple(nouveauMotDePasse)
        });
        return res.json({ ok: true, message: 'Mot de passe réinitialisé.' });
    } catch (e) {
        return res.status(400).json({ erreur: 'Lien de réinitialisation invalide ou expiré.' });
    }
});

module.exports = { router, creerSuperAdminSiAbsent };
