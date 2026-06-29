// ══════════════════════════════════════════
// ROUTES ARTISTES (MongoDB)
// ══════════════════════════════════════════
const express = require('express');
const router = express.Router();
const Artiste = require('../models/Artiste');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET /api/artistes — liste publique de tous les artistes
router.get('/', async (req, res) => {
    try {
        const artistes = await Artiste.find({});
        res.json(artistes);
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// GET /api/artistes/:id — profil public d'un artiste
router.get('/:id', async (req, res) => {
    try {
        const artiste = await Artiste.findById(req.params.id);
        if (!artiste) return res.status(404).json({ erreur: 'Artiste introuvable.' });
        res.json(artiste);
    } catch (e) {
        res.status(404).json({ erreur: 'Artiste introuvable.' });
    }
});

// POST /api/artistes/:id/like — incrémente les likes (public, pas besoin d'auth)
router.post('/:id/like', async (req, res) => {
    try {
        const artiste = await Artiste.findById(req.params.id);
        if (!artiste) return res.status(404).json({ erreur: 'Artiste introuvable.' });
        artiste.likes = (artiste.likes || 0) + 1;
        await artiste.save();
        res.json({ likes: artiste.likes });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// POST /api/artistes — créer un artiste (admin uniquement)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
    const { nom, filiere, bio, tel, email, ville, photo } = req.body;
    if (!nom || !filiere) return res.status(400).json({ erreur: 'Nom et filière obligatoires.' });
    try {
        const artiste = await Artiste.create({
            nom, filiere, bio: bio || '', tel: tel || '', email: email || '',
            ville: ville || 'Bukavu, Sud-Kivu', photo: photo || '', likes: 0,
            date: new Date().toLocaleDateString('fr-FR')
        });
        res.status(201).json({ id: artiste.id });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// PUT /api/artistes/:id — modifier un artiste (admin uniquement)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
    const { nom, filiere, bio, tel, email, ville, photo } = req.body;
    if (!nom || !filiere) return res.status(400).json({ erreur: 'Nom et filière obligatoires.' });
    try {
        await Artiste.findByIdAndUpdate(req.params.id, {
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
        await Artiste.findByIdAndDelete(req.params.id);
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

module.exports = router;
