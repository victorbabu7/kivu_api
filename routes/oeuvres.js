// ══════════════════════════════════════════
// ROUTES ŒUVRES (collection kivu-oeuvres)
// ══════════════════════════════════════════
const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const COL = 'kivu-oeuvres';

// GET /api/oeuvres — liste publique
router.get('/', async (req, res) => {
    try {
        const snap = await db.collection(COL).get();
        const oeuvres = [];
        snap.forEach(doc => oeuvres.push({ id: doc.id, ...doc.data() }));
        res.json(oeuvres);
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// GET /api/oeuvres/:id
router.get('/:id', async (req, res) => {
    try {
        const snap = await db.collection(COL).doc(req.params.id).get();
        if (!snap.exists) return res.status(404).json({ erreur: 'Œuvre introuvable.' });
        res.json({ id: snap.id, ...snap.data() });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// POST /api/oeuvres/:id/like — public
router.post('/:id/like', async (req, res) => {
    try {
        const ref = db.collection(COL).doc(req.params.id);
        const snap = await ref.get();
        if (!snap.exists) return res.status(404).json({ erreur: 'Œuvre introuvable.' });
        const nouveauLikes = (snap.data().likes || 0) + 1;
        await ref.update({ likes: nouveauLikes });
        res.json({ likes: nouveauLikes });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// POST /api/oeuvres — créer (admin uniquement ; les artistes utilisent /api/espace-artiste/oeuvres)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
    const { titre, type, artiste, annee, url, desc } = req.body;
    if (!titre || !type || !artiste) {
        return res.status(400).json({ erreur: 'Titre, type et artiste obligatoires.' });
    }
    try {
        const ref = await db.collection(COL).add({
            titre, type, artiste, annee: annee || '', url: url || '', desc: desc || '',
            likes: 0, date: new Date().toLocaleDateString('fr-FR')
        });
        res.status(201).json({ id: ref.id });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// PUT /api/oeuvres/:id — modifier (admin uniquement)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
    const { titre, type, artiste, annee, url, desc } = req.body;
    if (!titre || !type || !artiste) {
        return res.status(400).json({ erreur: 'Titre, type et artiste obligatoires.' });
    }
    try {
        await db.collection(COL).doc(req.params.id).update({
            titre, type, artiste, annee: annee || '', url: url || '', desc: desc || ''
        });
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// DELETE /api/oeuvres/:id — admin uniquement
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        await db.collection(COL).doc(req.params.id).delete();
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

module.exports = router;
