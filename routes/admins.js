// ══════════════════════════════════════════
// ROUTES ADMIN — gestion comptes admin + demandes artistes (MongoDB)
// ══════════════════════════════════════════
const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const CompteArtiste = require('../models/CompteArtiste');
const { hashSimple } = require('../utils/hash');
const { requireAuth, requireAdmin, requireSuperAdmin } = require('../middleware/auth');

// ── Comptes admin ──

// GET /api/admin/comptes — liste des comptes admin (super admin uniquement)
router.get('/comptes', requireAuth, requireSuperAdmin, async (req, res) => {
    try {
        const admins = await Admin.find({});
        const comptes = admins.map(a => ({
            id: a.id, nom: a.nom, email: a.email, username: a.username, role: a.role
        }));
        res.json(comptes);
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// POST /api/admin/comptes — créer un nouvel admin (super admin uniquement)
router.post('/comptes', requireAuth, requireSuperAdmin, async (req, res) => {
    const nom = (req.body.nom || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const username = (req.body.username || '').trim().toLowerCase();
    const motDePasse = req.body.motDePasse || '';
    const motSecurite = (req.body.motSecurite || '').trim();

    if (!nom || !email || !username || !motDePasse || !motSecurite) {
        return res.status(400).json({ erreur: 'Tous les champs sont obligatoires.' });
    }
    if (motDePasse.length < 6) {
        return res.status(400).json({ erreur: 'Mot de passe trop court (min. 6 caractères).' });
    }

    try {
        const admins = await Admin.find({});
        let doublon = false;
        admins.forEach(a => {
            if ((a.email || '') === email || (a.username || '') === username) doublon = true;
        });
        if (doublon) return res.status(409).json({ erreur: 'Email ou username  deja ' });

        const admin = await Admin.create({
            nom, email, username,
            motDePasse: hashSimple(motDePasse),
            motSecurite: hashSimple(motSecurite),
            role: 'admin',
            dateCreation: new Date().toLocaleDateString('fr-FR')
        });
        res.status(201).json({ id: admin.id });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// DELETE /api/admin/comptes/:id — supprimer un admin (super admin uniquement)
router.delete('/comptes/:id', requireAuth, requireSuperAdmin, async (req, res) => {
    try {
        const admin = await Admin.findById(req.params.id);
        if (admin && admin.role === 'super') {
            return res.status(403).json({ erreur: 'Impossible tu ne  peut pas.' });
        }
        await Admin.findByIdAndDelete(req.params.id);
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// PUT /api/admin/mon-compte/email — l'admin connecté change son propre email
router.put('/mon-compte/email', requireAuth, requireAdmin, async (req, res) => {
    const newEmail = (req.body.email || '').trim().toLowerCase();
    const motDePasse = req.body.motDePasse || '';
    if (!newEmail || !motDePasse) return res.status(400).json({ erreur: 'Remplissez tous les champs.' });
    try {
        const admin = await Admin.findById(req.user.id);
        if (!admin || admin.motDePasse !== hashSimple(motDePasse)) {
            return res.status(401).json({ erreur: 'Mot de passe incorrect.' });
        }
        admin.email = newEmail;
        await admin.save();
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// PUT /api/admin/mon-compte/mot-de-passe — l'admin connecté change son mdp
router.put('/mon-compte/mot-de-passe', requireAuth, requireAdmin, async (req, res) => {
    const ancienMotDePasse = req.body.ancienMotDePasse || '';
    const nouveauMotDePasse = req.body.nouveauMotDePasse || '';
    if (!ancienMotDePasse || !nouveauMotDePasse) {
        return res.status(400).json({ erreur: 'Remplissez tous les champs.' });
    }
    if (nouveauMotDePasse.length < 6) {
        return res.status(400).json({ erreur: 'Mot de passe trop court.' });
    }
    try {
        const admin = await Admin.findById(req.user.id);
        if (!admin || admin.motDePasse !== hashSimple(ancienMotDePasse)) {
            return res.status(401).json({ erreur: 'Mot de passe actuel incorrect.' });
        }
        admin.motDePasse = hashSimple(nouveauMotDePasse);
        await admin.save();
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// ── Demandes / comptes artistes ──

// GET /api/admin/demandes — liste des comptes artistes + statut (admin uniquement)
router.get('/demandes', requireAuth, requireAdmin, async (req, res) => {
    try {
        const comptes = await CompteArtiste.find({});
        const demandes = comptes.map(d => ({
            id: d.id, prenom: d.prenom, nom: d.nom, email: d.email, tel: d.tel,
            filiere: d.filiere, description: d.description, statut: d.statut,
            dateInscription: d.dateInscription
        }));
        res.json(demandes);
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// PUT /api/admin/demandes/:id/approuver — approuve un compte artiste (admin uniquement)
router.put('/demandes/:id/approuver', requireAuth, requireAdmin, async (req, res) => {
    try {
        const d = await CompteArtiste.findById(req.params.id);
        if (!d) return res.status(404).json({ erreur: 'Demande introuvable.' });
        d.statut = 'approuve';
        await d.save();
        res.json({ ok: true, email: d.email, nom: (d.prenom || '') + ' ' + (d.nom || '') });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// PUT /api/admin/demandes/:id/refuser — refuse un compte artiste (admin uniquement)
router.put('/demandes/:id/refuser', requireAuth, requireAdmin, async (req, res) => {
    try {
        await CompteArtiste.findByIdAndUpdate(req.params.id, { statut: 'refuse' });
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// DELETE /api/admin/demandes/:id — supprime définitivement une demande (admin uniquement)
router.delete('/demandes/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        await CompteArtiste.findByIdAndDelete(req.params.id);
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

module.exports = router;
