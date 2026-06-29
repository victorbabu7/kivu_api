// ══════════════════════════════════════════
// ROUTES ESPACE ARTISTE — profil, publication, œuvres, suppression compte (MongoDB)
// ══════════════════════════════════════════
const express = require('express');
const router = express.Router();
const CompteArtiste = require('../models/CompteArtiste');
const Artiste = require('../models/Artiste');
const Oeuvre = require('../models/Oeuvre');
const { requireAuth, requireArtiste } = require('../middleware/auth');

router.use(requireAuth, requireArtiste);

// GET /api/espace-artiste/moi
router.get('/moi', async (req, res) => {
    try {
        const compte = await CompteArtiste.findById(req.user.id).select('-motDePasse -motSecurite');
        if (!compte) return res.status(404).json({ erreur: 'Compte introuvable.' });
        res.json(compte);
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// PUT /api/espace-artiste/profil
router.put('/profil', async (req, res) => {
    const { nom, filiere, ville, tel, emailContact, bio, photo } = req.body;
    if (!nom || !filiere) return res.status(400).json({ erreur: 'Nom et filière obligatoires.' });
    try {
        const compteId = req.user.id;
        const compte = await CompteArtiste.findById(compteId);
        if (!compte) return res.status(404).json({ erreur: 'Compte introuvable.' });

        compte.nomArtiste = nom;
        compte.filiere = filiere;
        compte.ville = ville || '';
        compte.tel = tel || '';
        compte.emailContact = emailContact || '';
        compte.bio = bio || '';
        compte.photo = photo || '';
        await compte.save();

        if (compte.artisteId) {
            await Artiste.findByIdAndUpdate(compte.artisteId, {
                nom, filiere, ville: ville || '', tel: tel || '',
                email: emailContact || '', bio: bio || '', photo: photo || ''
            });
        }
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// POST /api/espace-artiste/publier
router.post('/publier', async (req, res) => {
    try {
        const compteId = req.user.id;
        const d = await CompteArtiste.findById(compteId);
        if (!d) return res.status(404).json({ erreur: 'Compte introuvable.' });

        const nom = d.nomArtiste || (d.prenom + ' ' + d.nom);
        let artisteId = d.artisteId;

        if (!artisteId) {
            const artiste = await Artiste.create({
                nom, filiere: d.filiere,
                ville: d.ville || 'Kivu',
                tel: d.tel || '', email: d.emailContact || d.email || '',
                bio: d.bio || d.description || '', photo: d.photo || '',
                likes: 0, compteId, date: new Date().toLocaleDateString('fr-FR')
            });
            artisteId = artiste.id;
        }

        d.profilPublie = true;
        d.artisteId = artisteId;
        await d.save();
        res.json({ ok: true, artisteId });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// POST /api/espace-artiste/depublier
router.post('/depublier', async (req, res) => {
    try {
        const compteId = req.user.id;
        const d = await CompteArtiste.findById(compteId);
        if (!d) return res.status(404).json({ erreur: 'Compte introuvable.' });

        if (d.artisteId) {
            await Artiste.findByIdAndDelete(d.artisteId);
        }
        d.profilPublie = false;
        d.artisteId = null;
        await d.save();
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// GET /api/espace-artiste/oeuvres
router.get('/oeuvres', async (req, res) => {
    try {
        const compteId = req.user.id;
        const d = await CompteArtiste.findById(compteId);
        const nomArt = (d.nomArtiste || (d.prenom + ' ' + d.nom)).toLowerCase().trim();

        const toutes = await Oeuvre.find({});
        const miennes = toutes.filter(o =>
            o.compteId === compteId || (o.artiste || '').toLowerCase().trim() === nomArt
        );
        res.json(miennes);
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// POST /api/espace-artiste/oeuvres
router.post('/oeuvres', async (req, res) => {
    const { titre, type, annee, url, desc } = req.body;
    if (!titre || !type) return res.status(400).json({ erreur: 'Titre et type obligatoires.' });
    try {
        const compteId = req.user.id;
        const d = await CompteArtiste.findById(compteId);
        const nomArt = d.nomArtiste || (d.prenom + ' ' + d.nom);

        const oeuvre = await Oeuvre.create({
            titre, type, annee: annee || '', url: url || '', desc: desc || '',
            artiste: nomArt, compteId, likes: 0, date: new Date().toLocaleDateString('fr-FR')
        });
        res.status(201).json({ id: oeuvre.id });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// PUT /api/espace-artiste/oeuvres/:id
router.put('/oeuvres/:id', async (req, res) => {
    const { titre, type, annee, url, desc } = req.body;
    if (!titre || !type) return res.status(400).json({ erreur: 'Titre et type obligatoires.' });
    try {
        const oeuvre = await Oeuvre.findById(req.params.id);
        if (!oeuvre) return res.status(404).json({ erreur: 'Œuvre introuvable.' });
        if (oeuvre.compteId !== req.user.id) {
            return res.status(403).json({ erreur: 'Cette œuvre ne vous appartient pas.' });
        }
        oeuvre.titre = titre;
        oeuvre.type = type;
        oeuvre.annee = annee || '';
        oeuvre.url = url || '';
        oeuvre.desc = desc || '';
        await oeuvre.save();
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// DELETE /api/espace-artiste/oeuvres/:id
router.delete('/oeuvres/:id', async (req, res) => {
    try {
        const oeuvre = await Oeuvre.findById(req.params.id);
        if (!oeuvre) return res.status(404).json({ erreur: 'Œuvre introuvable.' });
        if (oeuvre.compteId !== req.user.id) {
            return res.status(403).json({ erreur: 'Cette œuvre ne vous appartient pas.' });
        }
        await Oeuvre.findByIdAndDelete(req.params.id);
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

// DELETE /api/espace-artiste/mon-compte
router.delete('/mon-compte', async (req, res) => {
    try {
        const compteId = req.user.id;
        const d = await CompteArtiste.findById(compteId);
        if (!d) return res.status(404).json({ erreur: 'Compte introuvable.' });

        await Oeuvre.deleteMany({ compteId });

        if (d.artisteId) {
            await Artiste.findByIdAndDelete(d.artisteId);
        }

        await CompteArtiste.findByIdAndDelete(compteId);

        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ erreur: e.message });
    }
});

module.exports = router;
