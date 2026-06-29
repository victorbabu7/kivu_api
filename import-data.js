const data = require('./firebase-export.json');
const Admin = require('./models/Admin');
const Artiste = require('./models/Artiste');
const CompteArtiste = require('./models/CompteArtiste');
const Message = require('./models/Message');
const News = require('./models/News');
const Oeuvre = require('./models/Oeuvre');

async function importerSiVide() {
    const count = await Artiste.countDocuments();
    if (count > 0) { console.log('✅ DB déjà peuplée, import ignoré.'); return; }
    await Admin.insertMany(data['kivu-admins']);
    await Artiste.insertMany(data['kivu-artistes']);
    await CompteArtiste.insertMany(data['kivu-artistes-comptes']);
    await Message.insertMany(data['kivu-messages']);
    await News.insertMany(data['kivu-news']);
    await Oeuvre.insertMany(data['kivu-oeuvres']);
    console.log('✅ Import terminé !');
}

module.exports = { importerSiVide };
