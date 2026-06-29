require('dotenv').config();
const { connectMongo, mongoose } = require('./config/mongodb');
const data = require('./firebase-export.json');

const Admin = require('./models/Admin');
const Artiste = require('./models/Artiste');
const CompteArtiste = require('./models/CompteArtiste');
const Message = require('./models/Message');
const News = require('./models/News');
const Oeuvre = require('./models/Oeuvre');

async function run() {
    await connectMongo();

    await Admin.insertMany(data['kivu-admins']);
    console.log(' Admins importés:', data['kivu-admins'].length);

    await Artiste.insertMany(data['kivu-artistes']);
    console.log(' Artistes importés:', data['kivu-artistes'].length);

    await CompteArtiste.insertMany(data['kivu-artistes-comptes']);
    console.log(' Comptes artistes importés:', data['kivu-artistes-comptes'].length);

    await Message.insertMany(data['kivu-messages']);
    console.log(' Messages importés:', data['kivu-messages'].length);

    await News.insertMany(data['kivu-news']);
    console.log(' News importées:', data['kivu-news'].length);

    await Oeuvre.insertMany(data['kivu-oeuvres']);
    console.log(' Oeuvres importées:', data['kivu-oeuvres'].length);

    console.log(' Import terminé !');
    process.exit(0);
}

run().catch(e => {
    console.error(' Erreur import:', e);
    process.exit(1);
});

