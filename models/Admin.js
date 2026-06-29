const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    nom: String,
    email: String,
    username: String,
    motDePasse: String,
    motSecurite: String,
    role: { type: String, default: 'admin' },
    dateCreation: String
}, {
    collection: 'admins',
    timestamps: true
});

module.exports = mongoose.model('Admin', adminSchema);

