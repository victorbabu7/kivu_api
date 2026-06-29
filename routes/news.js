// ══════════════════════════════════════════
// ROUTES NEWS / ACTUALITÉS (MongoDB)
// ══════════════════════════════════════════
const express = require('express');
const router = express.Router();
const News = require('../models/News');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET /api/news — liste publique
router.get('/', async (req, res) => {
    try {
        const news = await News.find({});
        res.json(news);
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// GET /api/news/:id
router.get('/:id', async (req, res) => {
    try {
        const article = await News.findById(req.params.id);
        if (!article) return res.status(404).json({ erreur: 'Article introuvable.' });
        res.json(article);
    } catch (e) {
        res.status(404).json({ erreur: 'Article introuvable.' });
    }
});

// POST /api/news — créer (admin uniquement)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
    const { titre, cat, texte } = req.body;
    if (!titre || !texte) return res.status(400).json({ erreur: 'Titre et texte obligatoires.' });
    try {
        const article = await News.create({
            titre, cat: cat || 'artiste', texte,
            date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
        });
        res.status(201).json({ id: article.id });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// PUT /api/news/:id — modifier (admin uniquement)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
    const { titre, cat, texte } = req.body;
    if (!titre || !texte) return res.status(400).json({ erreur: 'Titre et texte obligatoires.' });
    try {
        await News.findByIdAndUpdate(req.params.id, { titre, cat: cat || 'artiste', texte });
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// DELETE /api/news/:id — admin uniquement
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        await News.findByIdAndDelete(req.params.id);
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

module.exports = router;
