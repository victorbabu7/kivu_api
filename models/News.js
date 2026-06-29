const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
    date: String,
    titre: String,
    cat: String,
    texte: String
}, {
    collection: 'news',
    timestamps: true
});

module.exports = mongoose.model('News', newsSchema);
