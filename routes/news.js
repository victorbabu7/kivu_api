// ══════════════════════════════════════════
// ROUTES NEWS / ACTUALITÉS (collection kivu-news)
// ══════════════════════════════════════════
const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const COL = 'kivu-news';

// GET /api/news — liste publique
router.get('/', async (req, res) => {
    try {
        const snap = await db.collection(COL).get();
        const news = [];
        snap.forEach(doc => news.push({ id: doc.id, ...doc.data() }));
        res.json(news);
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// GET /api/news/:id
router.get('/:id', async (req, res) => {
    try {
        const snap = await db.collection(COL).doc(req.params.id).get();
        if (!snap.exists) return res.status(404).json({ erreur: 'Article introuvable.' });
        res.json({ id: snap.id, ...snap.data() });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// POST /api/news — créer (admin uniquement)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
    const { titre, cat, texte } = req.body;
    if (!titre || !texte) return res.status(400).json({ erreur: 'Titre et texte obligatoires.' });
    try {
        const ref = await db.collection(COL).add({
            titre, cat: cat || 'artiste', texte,
            date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
        });
        res.status(201).json({ id: ref.id });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// PUT /api/news/:id — modifier (admin uniquement)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
    const { titre, cat, texte } = req.body;
    if (!titre || !texte) return res.status(400).json({ erreur: 'Titre et texte obligatoires.' });
    try {
        await db.collection(COL).doc(req.params.id).update({ titre, cat: cat || 'artiste', texte });
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// DELETE /api/news/:id — admin uniquement
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        await db.collection(COL).doc(req.params.id).delete();
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

module.exports = router;
