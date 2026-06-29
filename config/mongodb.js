
// CONFIG MONGODB 
const mongoose = require('mongoose');

async function connectMongo() {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/kivuculturehub';

    try {
        await mongoose.connect(uri);
        console.log('✅ MongoDB connecté:', uri);
    } catch (err) {
        console.error('❌ Erreur connexion MongoDB:', err);
        process.exit(1);
    }
}

module.exports = { connectMongo, mongoose };
