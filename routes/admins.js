// ══════════════════════════════════════════
// ROUTES ADMIN — gestion comptes admin + demandes artistes
// ══════════════════════════════════════════
const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { hashSimple } = require('../utils/hash');
const { requireAuth, requireAdmin, requireSuperAdmin } = require('../middleware/auth');

const COL_ADMINS = 'kivu-admins';
const COL_COMPTES_ARTISTES = 'kivu-artistes-comptes';
const COL_ARTISTES = 'kivu-artistes';

// ── Comptes admin ──

// GET /api/admin/comptes — liste des comptes admin (super admin uniquement)
router.get('/comptes', requireAuth, requireSuperAdmin, async (req, res) => {
    try {
        const snap = await db.collection(COL_ADMINS).get();
        const comptes = [];
        snap.forEach(doc => {
            const a = doc.data();
            comptes.push({ id: doc.id, nom: a.nom, email: a.email, username: a.username, role: a.role });
        });
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
        const snap = await db.collection(COL_ADMINS).get();
        let doublon = false;
        snap.forEach(doc => {
            const a = doc.data();
            if ((a.email || '') === email || (a.username || '') === username) doublon = true;
        });
        if (doublon) return res.status(409).json({ erreur: 'Email ou username déjà utilisé.' });

        const ref = await db.collection(COL_ADMINS).add({
            nom, email, username,
            motDePasse: hashSimple(motDePasse),
            motSecurite: hashSimple(motSecurite),
            role: 'admin',
            dateCreation: new Date().toLocaleDateString('fr-FR')
        });
        res.status(201).json({ id: ref.id });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// DELETE /api/admin/comptes/:id — supprimer un admin (super admin uniquement)
router.delete('/comptes/:id', requireAuth, requireSuperAdmin, async (req, res) => {
    try {
        const snap = await db.collection(COL_ADMINS).doc(req.params.id).get();
        if (snap.exists && snap.data().role === 'super') {
            return res.status(403).json({ erreur: 'Impossible de supprimer le super admin.' });
        }
        await db.collection(COL_ADMINS).doc(req.params.id).delete();
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
        const snap = await db.collection(COL_ADMINS).doc(req.user.id).get();
        if (!snap.exists || snap.data().motDePasse !== hashSimple(motDePasse)) {
            return res.status(401).json({ erreur: 'Mot de passe incorrect.' });
        }
        await db.collection(COL_ADMINS).doc(req.user.id).update({ email: newEmail });
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
        const snap = await db.collection(COL_ADMINS).doc(req.user.id).get();
        if (!snap.exists || snap.data().motDePasse !== hashSimple(ancienMotDePasse)) {
            return res.status(401).json({ erreur: 'Mot de passe actuel incorrect.' });
        }
        await db.collection(COL_ADMINS).doc(req.user.id).update({ motDePasse: hashSimple(nouveauMotDePasse) });
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// ── Demandes / comptes artistes ──

// GET /api/admin/demandes — liste des comptes artistes + statut (admin uniquement)
router.get('/demandes', requireAuth, requireAdmin, async (req, res) => {
    try {
        const snap = await db.collection(COL_COMPTES_ARTISTES).get();
        const demandes = [];
        snap.forEach(doc => {
            const d = doc.data();
            demandes.push({
                id: doc.id, prenom: d.prenom, nom: d.nom, email: d.email, tel: d.tel,
                filiere: d.filiere, description: d.description, statut: d.statut,
                dateInscription: d.dateInscription
            });
        });
        res.json(demandes);
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// PUT /api/admin/demandes/:id/approuver — approuve un compte artiste (admin uniquement)
router.put('/demandes/:id/approuver', requireAuth, requireAdmin, async (req, res) => {
    try {
        const ref = db.collection(COL_COMPTES_ARTISTES).doc(req.params.id);
        const snap = await ref.get();
        if (!snap.exists) return res.status(404).json({ erreur: 'Demande introuvable.' });
        await ref.update({ statut: 'approuve' });
        const d = snap.data();
        // L'envoi d'email (EmailJS) reste géré côté frontend ou pourra être
        // déplacé ici plus tard avec un service d'emailing serveur.
        res.json({ ok: true, email: d.email, nom: (d.prenom || '') + ' ' + (d.nom || '') });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// PUT /api/admin/demandes/:id/refuser — refuse un compte artiste (admin uniquement)
router.put('/demandes/:id/refuser', requireAuth, requireAdmin, async (req, res) => {
    try {
        await db.collection(COL_COMPTES_ARTISTES).doc(req.params.id).update({ statut: 'refuse' });
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// DELETE /api/admin/demandes/:id — supprime définitivement une demande (admin uniquement)
router.delete('/demandes/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        await db.collection(COL_COMPTES_ARTISTES).doc(req.params.id).delete();
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

module.exports = router;
