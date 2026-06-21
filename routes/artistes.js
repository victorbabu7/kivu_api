// ══════════════════════════════════════════
// ROUTES ARTISTES (collection kivu-artistes)
// ══════════════════════════════════════════
const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const COL = 'kivu-artistes';

// GET /api/artistes — liste publique de tous les artistes
router.get('/', async (req, res) => {
    try {
        const snap = await db.collection(COL).get();
        const artistes = [];
        snap.forEach(doc => artistes.push({ id: doc.id, ...doc.data() }));
        res.json(artistes);
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// GET /api/artistes/:id — profil public d'un artiste
router.get('/:id', async (req, res) => {
    try {
        const snap = await db.collection(COL).doc(req.params.id).get();
        if (!snap.exists) return res.status(404).json({ erreur: 'Artiste introuvable.' });
        res.json({ id: snap.id, ...snap.data() });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// POST /api/artistes/:id/like — incrémente les likes (public, pas besoin d'auth)
router.post('/:id/like', async (req, res) => {
    try {
        const ref = db.collection(COL).doc(req.params.id);
        const snap = await ref.get();
        if (!snap.exists) return res.status(404).json({ erreur: 'Artiste introuvable.' });
        const nouveauLikes = (snap.data().likes || 0) + 1;
        await ref.update({ likes: nouveauLikes });
        res.json({ likes: nouveauLikes });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// POST /api/artistes — créer un artiste (admin uniquement)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
    const { nom, filiere, bio, tel, email, ville, photo } = req.body;
    if (!nom || !filiere) return res.status(400).json({ erreur: 'Nom et filière obligatoires.' });
    try {
        const ref = await db.collection(COL).add({
            nom, filiere, bio: bio || '', tel: tel || '', email: email || '',
            ville: ville || 'Bukavu, Sud-Kivu', photo: photo || '', likes: 0,
            date: new Date().toLocaleDateString('fr-FR')
        });
        res.status(201).json({ id: ref.id });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// PUT /api/artistes/:id — modifier un artiste (admin uniquement)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
    const { nom, filiere, bio, tel, email, ville, photo } = req.body;
    if (!nom || !filiere) return res.status(400).json({ erreur: 'Nom et filière obligatoires.' });
    try {
        await db.collection(COL).doc(req.params.id).update({
            nom, filiere, bio: bio || '', tel: tel || '', email: email || '',
            ville: ville || 'Bukavu, Sud-Kivu', photo: photo || ''
        });
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// DELETE /api/artistes/:id — supprimer un artiste (admin uniquement)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        await db.collection(COL).doc(req.params.id).delete();
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

module.exports = router;
