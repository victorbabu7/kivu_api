// ══════════════════════════════════════════
// ROUTES ŒUVRES (MongoDB)
// ══════════════════════════════════════════
const express = require('express');
const router = express.Router();
const Oeuvre = require('../models/Oeuvre');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET /api/oeuvres — liste publique
router.get('/', async (req, res) => {
    try {
        const oeuvres = await Oeuvre.find({});
        res.json(oeuvres);
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// GET /api/oeuvres/:id
router.get('/:id', async (req, res) => {
    try {
        const oeuvre = await Oeuvre.findById(req.params.id);
        if (!oeuvre) return res.status(404).json({ erreur: 'Œuvre introuvable.' });
        res.json(oeuvre);
    } catch (e) {
        res.status(404).json({ erreur: 'Œuvre introuvable.' });
    }
});

// POST /api/oeuvres/:id/like — public
router.post('/:id/like', async (req, res) => {
    try {
        const oeuvre = await Oeuvre.findById(req.params.id);
        if (!oeuvre) return res.status(404).json({ erreur: 'Œuvre introuvable.' });
        oeuvre.likes = (oeuvre.likes || 0) + 1;
        await oeuvre.save();
        res.json({ likes: oeuvre.likes });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// POST /api/oeuvres — créer (admin uniquement)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
    const { titre, type, artiste, annee, url, desc } = req.body;
    if (!titre || !type || !artiste) {
        return res.status(400).json({ erreur: 'Titre, type et artiste obligatoires.' });
    }
    try {
        const oeuvre = await Oeuvre.create({
            titre, type, artiste, annee: annee || '', url: url || '', desc: desc || '',
            likes: 0, date: new Date().toLocaleDateString('fr-FR')
        });
        res.status(201).json({ id: oeuvre.id });
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
        await Oeuvre.findByIdAndUpdate(req.params.id, {
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
        await Oeuvre.findByIdAndDelete(req.params.id);
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

module.exports = router;
