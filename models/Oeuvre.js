const mongoose = require('mongoose');

const oeuvreSchema = new mongoose.Schema({
    titre: String,
    type: String,
    artiste: String,
    annee: String,
    url: String,
    desc: String,
    date: String,
    likes: { type: Number, default: 0 }
}, {
    collection: 'oeuvres',
    timestamps: true
});

module.exports = mongoose.model('Oeuvre', oeuvreSchema);
