
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!SECRET) {
    throw new Error('JWT_SECRET manquant dans les variables d\'environnement.');
}

/**
 * Crée un token signé contenant les infos minimales nécessaires.
 * payload attendu: { id, role, type } où type = 'admin' | 'artiste'
 */
function creerToken(payload) {
    return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

function verifierToken(token) {
    return jwt.verify(token, SECRET); 
}

module.exports = { creerToken, verifierToken };
