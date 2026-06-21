// ══════════════════════════════════════════
// MIDDLEWARE D'AUTHENTIFICATION
// ══════════════════════════════════════════
const { verifierToken } = require('../utils/jwt');

/**
 * Lit le header "Authorization: Bearer <token>", vérifie le JWT,
 * et attache les infos décodées à req.user si valide.
 * Bloque la requête avec 401 si absent/invalide.
 */
function requireAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
        return res.status(401).json({ erreur: 'Authentification requise.' });
    }

    try {
        req.user = verifierToken(token); // { id, role, type, iat, exp }
        next();
    } catch (e) {
        return res.status(401).json({ erreur: 'Token invalide ou expiré.' });
    }
}

/**
 * À utiliser après requireAuth. Vérifie que l'utilisateur connecté
 * est bien de type "admin" (admin ou super admin).
 */
function requireAdmin(req, res, next) {
    if (!req.user || req.user.type !== 'admin') {
        return res.status(403).json({ erreur: 'Accès réservé aux administrateurs.' });
    }
    next();
}

/**
 * À utiliser après requireAuth. Vérifie que l'utilisateur connecté
 * est bien un super admin.
 */
function requireSuperAdmin(req, res, next) {
    if (!req.user || req.user.type !== 'admin' || req.user.role !== 'super') {
        return res.status(403).json({ erreur: 'Accès réservé au super admin.' });
    }
    next();
}

/**
 * À utiliser après requireAuth. Vérifie que l'utilisateur connecté
 * est bien de type "artiste".
 */
function requireArtiste(req, res, next) {
    if (!req.user || req.user.type !== 'artiste') {
        return res.status(403).json({ erreur: 'Accès réservé aux artistes connectés.' });
    }
    next();
}

module.exports = { requireAuth, requireAdmin, requireSuperAdmin, requireArtiste };
