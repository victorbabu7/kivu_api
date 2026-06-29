const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    nom: String,
    email: String,
    sujet: String,
    message: String,
    artiste: String,
    emailArtiste: String,
    date: String
}, {
    collection: 'messages',
    timestamps: true
});

module.exports = mongoose.model('Message', messageSchema);
