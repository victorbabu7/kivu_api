const mongoose = require('mongoose');

const compteArtisteSchema = new mongoose.Schema({
    prenom: String,
    nom: String,
    email: String,
    tel: String,
    naiss: String,
    adresse: String,
    filiere: String,
    description: String,
    motDePasse: String,
    motSecurite: String,
    profilPublie: { type: Boolean, default: false },
    dateInscription: String,
    statut: { type: String, default: 'approuve' },
    ville: String,
    bio: String,
    photo: String,
    emailContact: String,
    nomArtiste: String,
   artisteId: String
}, {
    collection: 'artistes_comptes',
    timestamps: true
});

module.exports = mongoose.model('CompteArtiste', compteArtisteSchema);
