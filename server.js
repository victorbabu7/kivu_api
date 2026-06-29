
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const { creerSuperAdminSiAbsent } = require('./routes/auth');
const { connectMongo } = require('./config/mongodb');
const { importerSiVide } = require('./import-data');

const app = express();

// ── Middlewares globaux ──
const origines = (process.env.FRONTEND_ORIGIN || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

app.use(cors({
    origin: origines.length > 0 ? origines : '*',
}));
app.use(express.json({ limit: '12mb' })); // limite généreuse pour les photos en base64

// ── Routes ──
app.get('/', (req, res) => {
    res.json({ statut: 'ok', message: 'Kivu-API en ligne.' });
});

app.use('/api/auth', require('./routes/auth').router);
app.use('/api/artistes', require('./routes/artistes'));
app.use('/api/oeuvres', require('./routes/oeuvres'));
app.use('/api/news', require('./routes/news'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/admin', require('./routes/admins'));
app.use('/api/espace-artiste', require('./routes/espaceArtiste'));

// ── Gestion des routes inconnues ──
app.use((req, res) => {
    res.status(404).json({ erreur: 'Route inconnue.' });
});

// ── Gestion d'erreurs globale (filet de sécurité) ──
app.use((err, req, res, next) => {
    console.error('Erreur non gérée:', err);
    res.status(500).json({ erreur: 'Erreor .' });
});

// ── Démarrage ──
const PORT = process.env.PORT || 4000;

connectMongo()
    .then(async () => {
        await importerSiVide();
        app.listen(PORT, () => {
            console.log(`yes , ca marche ${PORT}`);
        });
    })
    .catch(e => console.error('Erreur démarrage:', e));
