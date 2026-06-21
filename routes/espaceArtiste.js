// ══════════════════════════════════════════
// ROUTES ESPACE ARTISTE — profil, publication, œuvres, suppression compte
// ══════════════════════════════════════════
const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { requireAuth, requireArtiste } = require('../middleware/auth');

const COL_COMPTES = 'kivu-artistes-comptes';
const COL_ARTISTES = 'kivu-artistes';
const COL_OEUVRES = 'kivu-oeuvres';

// Toutes les routes ci-dessous nécessitent d'être connecté en tant qu'artiste.
router.use(requireAuth, requireArtiste);

// GET /api/espace-artiste/moi — récupère les infos du compte connecté
router.get('/moi', async (req, res) => {
    try {
        const snap = await db.collection(COL_COMPTES).doc(req.user.id).get();
        if (!snap.exists) return res.status(404).json({ erreur: 'Compte introuvable.' });
        const d = snap.data();
        delete d.motDePasse;
        delete d.motSecurite;
        res.json({ id: snap.id, ...d });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// PUT /api/espace-artiste/profil — met à jour le profil (sans publier)
router.put('/profil', async (req, res) => {
    const { nom, filiere, ville, tel, emailContact, bio, photo } = req.body;
    if (!nom || !filiere) return res.status(400).json({ erreur: 'Nom et filière obligatoires.' });
    try {
        const compteId = req.user.id;
        await db.collection(COL_COMPTES).doc(compteId).update({
            nomArtiste: nom, filiere,
            ville: ville || '', tel: tel || '', emailContact: emailContact || '',
            bio: bio || '', photo: photo || ''
        });

        const compteSnap = await db.collection(COL_COMPTES).doc(compteId).get();
        const compte = compteSnap.data();
        if (compte.artisteId) {
            await db.collection(COL_ARTISTES).doc(compte.artisteId).update({
                nom, filiere, ville: ville || '', tel: tel || '',
                email: emailContact || '', bio: bio || '', photo: photo || ''
            });
        }
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// POST /api/espace-artiste/publier — publie le profil sur la plateforme publique
router.post('/publier', async (req, res) => {
    try {
        const compteId = req.user.id;
        const compteSnap = await db.collection(COL_COMPTES).doc(compteId).get();
        if (!compteSnap.exists) return res.status(404).json({ erreur: 'Compte introuvable.' });
        const d = compteSnap.data();

        const nom = d.nomArtiste || (d.prenom + ' ' + d.nom);
        let artisteId = d.artisteId;

        if (!artisteId) {
            const ref = await db.collection(COL_ARTISTES).add({
                nom, filiere: d.filiere,
                ville: d.ville || 'Kivu',
                tel: d.tel || '', email: d.emailContact || d.email || '',
                bio: d.bio || d.description || '', photo: d.photo || '',
                likes: 0, compteId, date: new Date().toLocaleDateString('fr-FR')
            });
            artisteId = ref.id;
        }

        await db.collection(COL_COMPTES).doc(compteId).update({ profilPublie: true, artisteId });
        res.json({ ok: true, artisteId });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// POST /api/espace-artiste/depublier — retire le profil de la plateforme publique
router.post('/depublier', async (req, res) => {
    try {
        const compteId = req.user.id;
        const compteSnap = await db.collection(COL_COMPTES).doc(compteId).get();
        if (!compteSnap.exists) return res.status(404).json({ erreur: 'Compte introuvable.' });
        const d = compteSnap.data();

        if (d.artisteId) {
            await db.collection(COL_ARTISTES).doc(d.artisteId).delete();
        }
        await db.collection(COL_COMPTES).doc(compteId).update({ profilPublie: false, artisteId: null });
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// GET /api/espace-artiste/oeuvres — liste des œuvres de l'artiste connecté
router.get('/oeuvres', async (req, res) => {
    try {
        const compteId = req.user.id;
        const compteSnap = await db.collection(COL_COMPTES).doc(compteId).get();
        const d = compteSnap.data();
        const nomArt = (d.nomArtiste || (d.prenom + ' ' + d.nom)).toLowerCase().trim();

        const snap = await db.collection(COL_OEUVRES).get();
        const miennes = [];
        snap.forEach(doc => {
            const o = doc.data();
            if (o.compteId === compteId || (o.artiste || '').toLowerCase().trim() === nomArt) {
                miennes.push({ id: doc.id, ...o });
            }
        });
        res.json(miennes);
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// POST /api/espace-artiste/oeuvres — ajoute une œuvre pour l'artiste connecté
router.post('/oeuvres', async (req, res) => {
    const { titre, type, annee, url, desc } = req.body;
    if (!titre || !type) return res.status(400).json({ erreur: 'Titre et type obligatoires.' });
    try {
        const compteId = req.user.id;
        const compteSnap = await db.collection(COL_COMPTES).doc(compteId).get();
        const d = compteSnap.data();
        const nomArt = d.nomArtiste || (d.prenom + ' ' + d.nom);

        const ref = await db.collection(COL_OEUVRES).add({
            titre, type, annee: annee || '', url: url || '', desc: desc || '',
            artiste: nomArt, compteId, likes: 0, date: new Date().toLocaleDateString('fr-FR')
        });
        res.status(201).json({ id: ref.id });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// PUT /api/espace-artiste/oeuvres/:id — modifie une œuvre (vérifie qu'elle appartient au compte)
router.put('/oeuvres/:id', async (req, res) => {
    const { titre, type, annee, url, desc } = req.body;
    if (!titre || !type) return res.status(400).json({ erreur: 'Titre et type obligatoires.' });
    try {
        const ref = db.collection(COL_OEUVRES).doc(req.params.id);
        const snap = await ref.get();
        if (!snap.exists) return res.status(404).json({ erreur: 'Œuvre introuvable.' });
        if (snap.data().compteId !== req.user.id) {
            return res.status(403).json({ erreur: 'Cette œuvre ne vous appartient pas.' });
        }
        await ref.update({ titre, type, annee: annee || '', url: url || '', desc: desc || '' });
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// DELETE /api/espace-artiste/oeuvres/:id — supprime une œuvre (vérifie l'appartenance)
router.delete('/oeuvres/:id', async (req, res) => {
    try {
        const ref = db.collection(COL_OEUVRES).doc(req.params.id);
        const snap = await ref.get();
        if (!snap.exists) return res.status(404).json({ erreur: 'Œuvre introuvable.' });
        if (snap.data().compteId !== req.user.id) {
            return res.status(403).json({ erreur: 'Cette œuvre ne vous appartient pas.' });
        }
        await ref.delete();
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// DELETE /api/espace-artiste/mon-compte — supprime définitivement le compte + œuvres + profil public
router.delete('/mon-compte', async (req, res) => {
    try {
        const compteId = req.user.id;
        const compteSnap = await db.collection(COL_COMPTES).doc(compteId).get();
        if (!compteSnap.exists) return res.status(404).json({ erreur: 'Compte introuvable.' });
        const d = compteSnap.data();

        // 1. Supprimer toutes les œuvres liées
        const snapOeu = await db.collection(COL_OEUVRES).get();
        const suppressions = [];
        snapOeu.forEach(doc => {
            if (doc.data().compteId === compteId) {
                suppressions.push(db.collection(COL_OEUVRES).doc(doc.id).delete());
            }
        });
        await Promise.all(suppressions);

        // 2. Supprimer le profil public si publié
        if (d.artisteId) {
            await db.collection(COL_ARTISTES).doc(d.artisteId).delete();
        }

        // 3. Supprimer le compte
        await db.collection(COL_COMPTES).doc(compteId).delete();

        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

module.exports = router;
