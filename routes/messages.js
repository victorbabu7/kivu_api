// ══════════════════════════════════════════
// ROUTES MESSAGES (collection kivu-messages)
// ══════════════════════════════════════════
const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const COL = 'kivu-messages';

// POST /api/messages — envoyer un message (public, formulaire de contact)
// Body: { nom, email, sujet, message, artiste?, emailArtiste? }
router.post('/', async (req, res) => {
    const { nom, email, sujet, message, artiste, emailArtiste } = req.body;
    if (!nom || !email || !message) {
        return res.status(400).json({ erreur: 'Remplissez tous les champs obligatoires.' });
    }
    try {
        const ref = await db.collection(COL).add({
            nom, email, sujet: sujet || '', message,
            artiste: artiste || '', emailArtiste: emailArtiste || '',
            date: new Date().toLocaleDateString('fr-FR')
        });
        res.status(201).json({ id: ref.id });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// GET /api/messages — liste complète (admin uniquement)
router.get('/', requireAuth, requireAdmin, async (req, res) => {
    try {
        const snap = await db.collection(COL).get();
        const messages = [];
        snap.forEach(doc => messages.push({ id: doc.id, ...doc.data() }));
        res.json(messages);
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// DELETE /api/messages/:id — admin uniquement
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        await db.collection(COL).doc(req.params.id).delete();
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

module.exports = router;
