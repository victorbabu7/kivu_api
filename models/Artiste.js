const mongoose = require('mongoose');

const artisteSchema = new mongoose.Schema({
    nom: String,
    filiere: String,
    ville: String,
    tel: String,
    email: String,
    bio: String,
    photo: String,        // stocké en base64, comme avant
    compteId: String,
    date: String,
    likes: { type: Number, default: 0 }
}, {
    collection: 'artistes',   // nom de la collection MongoDB (différent de Firebase pour éviter confusion, mais tu peux mettre 'kivu-artistes' si tu préfères garder le nom)
    timestamps: true
});

module.exports = mongoose.model('Artiste', artisteSchema);
