// ══════════════════════════════════════════
// ROUTES AUTH — login unifié, inscription, récupération mdp (MongoDB)
// ══════════════════════════════════════════
const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const CompteArtiste = require('../models/CompteArtiste');
const { hashSimple } = require('../utils/hash');
const { creerToken } = require('../utils/jwt');

// Crée le super admin par défaut si la collection admins est vide.
async function creerSuperAdminSiAbsent() {
    const count = await Admin.countDocuments();
    if (count > 0) return;
    await Admin.create({
        nom: 'Super Admin',
        email: 'adminhubkivu@gmail.com',
        username: 'superadmin',
        motDePasse: hashSimple('Rubona2003@'),
        motSecurite: hashSimple('Bukavu'),
        role: 'super',
        dateCreation: new Date().toLocaleDateString('fr-FR')
    });
    console.log('✅ Super admin créé par défaut.');
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const identifiant = (req.body.identifiant || '').trim().toLowerCase();
    const motDePasse = req.body.motDePasse || '';

    if (!identifiant || !motDePasse) {
        return res.status(400).json({ erreur: 'Remplissez tous les champs.' });
    }

    try {
        const admins = await Admin.find({});
        let admin = null;
        admins.forEach(a => {
            const emailMatch = (a.email || '').toLowerCase() === identifiant;
            const usernameMatch = (a.username || '').toLowerCase() === identifiant;
            const passMatch = a.motDePasse === hashSimple(motDePasse);
            if ((emailMatch || usernameMatch) && passMatch) admin = a;
        });

        if (admin) {
            const token = creerToken({ id: admin.id, type: 'admin', role: admin.role });
            return res.json({
                token,
                type: 'admin',
                profil: { id: admin.id, nom: admin.nom, role: admin.role, email: admin.email }
            });
        }

        const artistes = await CompteArtiste.find({});
        let artiste = null;
        artistes.forEach(a => {
            if ((a.email || '') === identifiant && a.motDePasse === hashSimple(motDePasse)) {
                artiste = a;
            }
        });

        if (artiste) {
            if (artiste.statut !== 'approuve') {
                return res.status(403).json({
                    erreur: "⏳ Votre compte est en attente d'approbation par l'administrateur."
                });
            }
            const token = creerToken({ id: artiste.id, type: 'artiste', role: 'artiste' });
            return res.json({
                token,
                type: 'artiste',
                profil: { id: artiste.id, nom: artiste.nomArtiste || (artiste.prenom + ' ' + artiste.nom) }
            });
        }

        return res.status(401).json({ erreur: 'Email/username ou mot de passe incorrect.' });

    } catch (e) {
        console.error('Erreur login:', e);
        return res.status(500).json({ erreur: 'Erreur serveur : ' + e.message });
    }
});

// POST /api/auth/inscription
router.post('/inscription', async (req, res) => {
    const { prenom, nom, tel, naiss, adresse, filiere, description, motDePasse } = req.body;
    const email = (req.body.email || '').trim().toLowerCase();

    if (!prenom || !nom || !email || !tel || !naiss || !adresse || !filiere || !description || !motDePasse) {
        return res.status(400).json({ erreur: 'Tous les champs obligatoires doivent être remplis.' });
    }
    if (motDePasse.length < 6) {
        return res.status(400).json({ erreur: 'Mot de passe trop court (min. 6 caractères).' });
    }

    try {
        const existant = await CompteArtiste.findOne({ email });
        if (existant) {
            return res.status(409).json({ erreur: 'Cet email est déjà utilisé.' });
        }

        await CompteArtiste.create({
            prenom, nom, email, tel, naiss, adresse, filiere, description,
            motDePasse: hashSimple(motDePasse),
            statut: 'en_attente',
            profilPublie: false,
            dateInscription: new Date().toLocaleDateString('fr-FR')
        });

        return res.json({ ok: true, message: 'Demande envoyée, en attente d\'approbation.' });
    } catch (e) {
        console.error('Erreur inscription:', e);
        return res.status(500).json({ erreur: 'Erreur serveur : ' + e.message });
    }
});

// POST /api/auth/verifier-recuperation
router.post('/verifier-recuperation', async (req, res) => {
    const email = (req.body.email || '').trim().toLowerCase();
    const motSecurite = req.body.motSecurite || '';

    if (!email || !motSecurite) {
        return res.status(400).json({ erreur: 'Remplissez email et mot de sécurité.' });
    }

    try {
        let trouve = null;
        let type = null;

        const admins = await Admin.find({});
        admins.forEach(a => {
            if ((a.email || '').toLowerCase() === email && a.motSecurite === hashSimple(motSecurite)) {
                trouve = { id: a.id };
                type = 'admin';
            }
        });

        if (!trouve) {
            const artistes = await CompteArtiste.find({});
            artistes.forEach(a => {
                if ((a.email || '').toLowerCase() === email && a.motSecurite === hashSimple(motSecurite)) {
                    trouve = { id: a.id };
                    type = 'artiste';
                }
            });
        }

        if (!trouve) {
            return res.status(401).json({ erreur: 'Email ou mot de sécurité incorrect.' });
        }

        const resetToken = creerToken({ id: trouve.id, type: 'reset', resetType: type });
        return res.json({ ok: true, resetToken, type });
    } catch (e) {
        console.error('Erreur verif récupération:', e);
        return res.status(500).json({ erreur: 'Erreur serveur : ' + e.message });
    }
});

// POST /api/auth/reinitialiser-mot-de-passe
router.post('/reinitialiser-mot-de-passe', async (req, res) => {
    const { resetToken, nouveauMotDePasse } = req.body;
    const { verifierToken } = require('../utils/jwt');

    if (!resetToken || !nouveauMotDePasse || nouveauMotDePasse.length < 6) {
        return res.status(400).json({ erreur: 'Mot de passe trop court (min. 6 caractères).' });
    }

    try {
        const decoded = verifierToken(resetToken);
        if (decoded.type !== 'reset') {
            return res.status(400).json({ erreur: 'Token de réinitialisation invalide.' });
        }
        const Model = decoded.resetType === 'admin' ? Admin : CompteArtiste;
        await Model.findByIdAndUpdate(decoded.id, {
            motDePasse: hashSimple(nouveauMotDePasse)
        });
        return res.json({ ok: true, message: 'Mot de passe réinitialisé.' });
    } catch (e) {
        return res.status(400).json({ erreur: 'Lien de réinitialisation invalide ou expiré.' });
    }
});

module.exports = { router, creerSuperAdminSiAbsent };
