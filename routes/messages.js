// ══════════════════════════════════════════
// ROUTES MESSAGES (MongoDB)
// ══════════════════════════════════════════
const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// POST /api/messages — envoyer un message (public, formulaire de contact)
router.post('/', async (req, res) => {
    const { nom, email, sujet, message, artiste, emailArtiste } = req.body;
    if (!nom || !email || !message) {
        return res.status(400).json({ erreur: 'Remplissez tous les champs obligatoires.' });
    }
    try {
        const msg = await Message.create({
            nom, email, sujet: sujet || '', message,
            artiste: artiste || '', emailArtiste: emailArtiste || '',
            date: new Date().toLocaleDateString('fr-FR')
        });
        res.status(201).json({ id: msg.id });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// GET /api/messages — liste complète (admin uniquement)
router.get('/', requireAuth, requireAdmin, async (req, res) => {
    try {
        const messages = await Message.find({});
        res.json(messages);
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// DELETE /api/messages/:id — admin uniquement
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        await Message.findByIdAndDelete(req.params.id);
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

module.exports = router;
